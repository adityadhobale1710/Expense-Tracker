/**
 * ContextBuilder.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Intelligent, intent-driven financial context builder.
 *
 * Responsibilities:
 *   1. Accept detected intents and resolve which DB modules are required.
 *   2. Check per-module cache on the AIChat document — skip queries for hits.
 *   3. Run only necessary MongoDB queries, in parallel.
 *   4. Pass raw documents through ToolRegistry to obtain calculated metrics.
 *   5. Serialise those metrics into compact, human-readable context sections.
 *   6. Return a structured ContextResult object with audit metadata.
 *
 * Rules:
 *   • Never calls Gemini.
 *   • Never builds prompts (that is PromptBuilder's job).
 *   • Logs every decision for observability.
 */

import logger from '../../utils/logger.js';
import FinancialDataService from '../financial/FinancialDataService.js';

import {
  calculateWalletBalance,
  calculateMonthlyExpense,
  calculateMonthlyIncome,
  calculateSavings,
  calculateBudgetUsage,
  calculateGoalProgress,
  calculateLoanSummary,
  calculateSubscriptionCost,
  calculateCashFlow,
  calculateComparison,
} from './ToolRegistry.js';
import { calculateFinancialHealth } from './InsightEngine.js';

// ─── MODULE TTLs (ms) ─────────────────────────────────────────────────────────

const MODULE_TTL = {
  wallets:       10 * 60 * 1000,   // 10 min
  budgets:        5 * 60 * 1000,   //  5 min
  expenses:       3 * 60 * 1000,   //  3 min
  incomes:        5 * 60 * 1000,   //  5 min
  goals:         10 * 60 * 1000,   // 10 min
  loans:         15 * 60 * 1000,   // 15 min
  subscriptions: 15 * 60 * 1000,   // 15 min
};

// ─── INTENT → MODULE ROUTING TABLE ───────────────────────────────────────────

/**
 * Returns the set of module names required for a given list of intents.
 * Order within the set does not matter — loading is always parallel.
 *
 * @param {string[]} intents
 * @returns {Set<string>}
 */
const resolveModules = (intents) => {
  const modules = new Set();

  const ROUTING = {
    balance:             ['wallets'],
    expense_analysis:    ['expenses'],
    income_analysis:     ['incomes'],
    budget_analysis:     ['budgets', 'expenses'],
    goal_progress:       ['goals'],
    loan_analysis:       ['loans'],
    subscription_review: ['subscriptions'],
    savings_advice:      ['wallets', 'incomes', 'expenses', 'goals'],
    cash_flow:           ['wallets', 'budgets', 'incomes', 'expenses', 'goals', 'loans', 'subscriptions'],
    comparison:          ['incomes', 'expenses'],
    financial_health:    ['wallets', 'incomes', 'expenses', 'budgets', 'goals'],
    spending_prediction: ['expenses'],
    general_advice:      ['wallets', 'incomes', 'expenses'],
    greeting:            [],
    unknown:             ['wallets', 'incomes', 'expenses'],
  };

  for (const intent of intents) {
    const required = ROUTING[intent] || ROUTING.unknown;
    for (const mod of required) modules.add(mod);
  }

  return modules;
};

// ─── CACHE HELPERS ────────────────────────────────────────────────────────────

/**
 * Check if a module cache entry is still valid.
 *
 * @param {object} chat - AIChat mongoose document
 * @param {string} moduleName
 * @returns {boolean}
 */
const isCacheValid = (chat, moduleName) => {
  const cache = chat.moduleCache?.[moduleName];
  if (!cache || !cache.cachedAt || !cache.data) return false;
  const age = Date.now() - new Date(cache.cachedAt).getTime();
  return age < (MODULE_TTL[moduleName] || 5 * 60 * 1000);
};

/**
 * Write a string payload into the module cache on the chat document (in memory).
 * The caller is responsible for persisting the document.
 *
 * @param {object} chat
 * @param {string} moduleName
 * @param {string} data
 */
const writeCache = (chat, moduleName, data, count, validationData = null) => {
  if (!chat.moduleCache) chat.moduleCache = {};
  chat.moduleCache[moduleName] = { data, count, validationData, cachedAt: new Date() };
  // Mark the field as modified so Mongoose saves it (Mixed type)
  if (typeof chat.markModified === 'function') {
    chat.markModified(`moduleCache.${moduleName}`);
  }
};

// ─── DATE HELPERS ─────────────────────────────────────────────────────────────

const nDaysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

const startOfMonth = (offset = 0) => {
  const d = new Date();
  d.setMonth(d.getMonth() - offset, 1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfMonth = (offset = 0) => {
  const d = new Date();
  d.setMonth(d.getMonth() - offset + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
};

// ─── SECTION FORMATTERS ───────────────────────────────────────────────────────
// Each formatter takes the structured data from ToolRegistry and produces
// a compact, human-readable text section for inclusion in the final prompt.

const fmt = (n) => (n ?? 0).toLocaleString('en-IN');

const formatWallets = (data) => {
  if (!data || !data.breakdown || data.breakdown.length === 0) {
    return 'Wallets: No active wallets.';
  }
  
  // Intelligent Context Selection: Rank by Primary -> Balance -> Recently Updated
  const ranked = [...data.breakdown].sort((a, b) => {
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    if (b.balance !== a.balance) return b.balance - a.balance;
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });
  
  const selected = ranked.slice(0, 5); // Select highest-value context
  
  const lines = [
    `### Wallets (Total: ₹${fmt(data.total)} | Count: ${data.count} | Showing Top ${selected.length})`,
    '| Wallet | Type | Balance | Currency |',
    '|---|---|---|---|'
  ];
  for (const w of selected) {
    lines.push(`| ${w.name} | ${w.type} | ₹${fmt(w.balance)} | ${w.currency} |`);
  }
  return lines.join('\n');
};

const formatExpenses = (data, label = 'Last 30 Days') => {
  if (!data || !data.byCategory || data.byCategory.length === 0) {
    return `Expenses (${label}): No expenses logged.`;
  }
  const lines = [
    `### Expenses - ${label} (Total: ₹${fmt(data.total)} | Count: ${data.count})`,
    ...(data.topCategory ? [`Top Category: ${data.topCategory}`] : []),
    '| Category | Total | % of Expenses |',
    '|---|---|---|'
  ];
  for (const c of data.byCategory.slice(0, 5)) {
    lines.push(`| ${c.category} | ₹${fmt(c.total)} | ${c.percent}% |`);
  }
  if (data.recent.length > 0) {
    lines.push('\n**Recent Transactions:**');
    lines.push('| Title | Category | Amount |');
    lines.push('|---|---|---|');
    for (const r of data.recent.slice(0, 4)) {
      lines.push(`| ${r.title} | ${r.category} | ₹${fmt(r.amount)} |`);
    }
  }
  return lines.join('\n');
};

const formatIncomes = (data, label = 'Last 30 Days') => {
  if (!data || !data.bySource || data.bySource.length === 0) {
    return `Income (${label}): No incomes logged.`;
  }
  const lines = [
    `### Income - ${label} (Total: ₹${fmt(data.total)} | Count: ${data.count})`,
    '| Source | Total | % of Income |',
    '|---|---|---|'
  ];
  for (const s of data.bySource.slice(0, 4)) {
    lines.push(`| ${s.source} | ₹${fmt(s.total)} | ${s.percent}% |`);
  }
  return lines.join('\n');
};

const formatSavings = (savings) =>
  `Savings: ₹${fmt(savings.amount)} | Rate: ${savings.rate}% | ${savings.isPositive ? 'Surplus' : `Deficit: ₹${fmt(savings.deficit)}`}`;

const formatBudgets = (data) => {
  if (!data || !data.budgets || data.budgets.length === 0) {
    return 'Budgets: No active budgets.';
  }
  
  // Intelligent Context Selection: Rank by Exceeded -> Usage % -> Recently Updated
  const ranked = [...data.budgets].sort((a, b) => {
    if (a.status === 'exceeded' && b.status !== 'exceeded') return -1;
    if (b.status === 'exceeded' && a.status !== 'exceeded') return 1;
    if (b.usagePercent !== a.usagePercent) return b.usagePercent - a.usagePercent;
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });
  
  const selected = ranked.slice(0, 5);
  
  const lines = [
    `### Budgets (Total Limit: ₹${fmt(data.totalLimit)} | Spent: ₹${fmt(data.totalSpent)} | Showing Top ${selected.length})`,
    '| Category | Limit | Spent | Remaining | Status |',
    '|---|---|---|---|---|'
  ];
  for (const b of selected) {
    const icon = b.status === 'exceeded' ? '🔴' : b.status === 'warning' ? '🟡' : '🟢';
    lines.push(`| ${icon} ${b.category} | ₹${fmt(b.limit)} | ₹${fmt(b.spent)} | ₹${fmt(b.remaining)} | ${b.usagePercent}% |`);
  }
  if (data.warnings.length > 0) lines.push(`\n**Warnings:** ${data.warnings.slice(0, 3).join('; ')}`);
  return lines.join('\n');
};

const formatGoals = (data) => {
  if (!data || !data.goals || data.goals.length === 0) {
    return 'Goals: No active goals.';
  }
  
  // Intelligent Context Selection: Rank by Overdue -> Deadline approaching -> Largest progress
  const ranked = [...data.goals].sort((a, b) => {
    const aOverdue = a.daysLeft !== null && a.daysLeft < 0 && a.status !== 'Completed';
    const bOverdue = b.daysLeft !== null && b.daysLeft < 0 && b.status !== 'Completed';
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    
    if (a.daysLeft !== null && b.daysLeft !== null) {
      if (a.daysLeft !== b.daysLeft) return a.daysLeft - b.daysLeft;
    } else if (a.daysLeft !== null) return -1;
    else if (b.daysLeft !== null) return 1;
    
    return b.progressPct - a.progressPct;
  });
  
  const selected = ranked.slice(0, 5);

  const lines = [
    `### Goals (Active: ${data.activeCount} | Completed: ${data.completedCount} | Showing Top ${selected.length})`,
    '| Goal | Target | Saved | Progress | Monthly Sugg. |',
    '|---|---|---|---|---|'
  ];
  for (const g of selected) {
    const days = g.daysLeft !== null ? ` (${g.daysLeft}d left)` : '';
    lines.push(`| ${g.title} | ₹${fmt(g.targetAmount)} | ₹${fmt(g.savedAmount)} | ${g.progressPct}%${days} | ₹${fmt(g.suggestedMonthlySaving)} |`);
  }
  if (data.nearCompletion.length > 0) lines.push(`\n**Near completion:** ${data.nearCompletion.slice(0, 3).join(', ')}`);
  if (data.atRisk.length > 0) lines.push(`\n**At risk:** ${data.atRisk.slice(0, 3).join(', ')}`);
  return lines.join('\n');
};

const formatLoans = (data) => {
  if (!data || !data.loans || data.loans.length === 0) {
    return 'Loans: No active loans.';
  }
  
  // Intelligent Context Selection: Upcoming payment -> Highest EMI
  const ranked = [...data.loans].sort((a, b) => {
    if (a.nextEmiDate && b.nextEmiDate) {
      const diff = new Date(a.nextEmiDate) - new Date(b.nextEmiDate);
      if (diff !== 0) return diff;
    } else if (a.nextEmiDate) return -1;
    else if (b.nextEmiDate) return 1;
    
    return b.emiAmount - a.emiAmount;
  });
  
  const selected = ranked.slice(0, 5);

  const lines = [
    `### Loans (Total Remaining: ₹${fmt(data.totalRemaining)} | EMI/mo: ₹${fmt(data.totalMonthlyEMI)} | Showing Top ${selected.length})`,
    '| Loan | Type | Remaining | EMI/mo | Rate |',
    '|---|---|---|---|---|'
  ];
  for (const l of selected) {
    lines.push(`| ${l.name} | ${l.type} | ₹${fmt(l.remaining)} | ₹${fmt(l.emiAmount)} | ${l.interestRate}% |`);
  }
  return lines.join('\n');
};

const formatSubscriptions = (data) => {
  if (!data || !data.list || data.list.length === 0) {
    return 'Subscriptions: No active subscriptions.';
  }
  
  // Intelligent Context Selection: Renewing soon -> Highest cost
  const ranked = [...data.list].sort((a, b) => {
    if (a.renewalDate && b.renewalDate) {
      const diff = new Date(a.renewalDate) - new Date(b.renewalDate);
      if (diff !== 0) return diff;
    } else if (a.renewalDate) return -1;
    else if (b.renewalDate) return 1;
    
    return b.monthlyCost - a.monthlyCost;
  });
  
  const selected = ranked.slice(0, 5);

  const lines = [
    `### Subscriptions (Total: ₹${fmt(data.monthlyTotal)}/mo | ₹${fmt(data.yearlyTotal)}/yr | Showing Top ${selected.length})`,
    '| Name | Cost | Cycle | Est. Monthly |',
    '|---|---|---|---|'
  ];
  for (const s of selected) {
    lines.push(`| ${s.name} | ₹${fmt(s.cost)} | ${s.billingCycle} | ₹${fmt(s.monthlyCost)} |`);
  }
  if (data.renewingSoon.length > 0) {
    lines.push(`\n**Renewing soon:** ${data.renewingSoon.slice(0, 3).map((s) => s.name).join(', ')}`);
  }
  return lines.join('\n');
};

const formatComparison = (data) => {
  const arrow = (trend) => (trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→');
  return [
    'Month-over-Month Comparison:',
    `  Expenses: ₹${fmt(data.expense.previous)} → ₹${fmt(data.expense.current)} ${arrow(data.expense.trend)} ${data.expense.changePercent}%`,
    `  Income:   ₹${fmt(data.income.previous)} → ₹${fmt(data.income.current)} ${arrow(data.income.trend)} ${data.income.changePercent}%`,
    `  Savings:  ₹${fmt(data.savings.previous)} → ₹${fmt(data.savings.current)} ${arrow(data.savings.trend)} ${data.savings.changePercent}%`,
  ].join('\n');
};

const formatHealthMetrics = (data) => {
  const lines = [`Financial Health Score: ${data.score}/100 (${data.grade})`];
  const top2Strengths = (data.strengths || []).slice(0, 2);
  const top2Weaknesses = (data.weaknesses || []).slice(0, 2);
  if (top2Strengths.length > 0) {
    lines.push('Strengths:');
    top2Strengths.forEach((s) => lines.push(`  ✓ ${s}`));
  }
  if (top2Weaknesses.length > 0) {
    lines.push('Weaknesses:');
    top2Weaknesses.forEach((w) => lines.push(`  ✗ ${w}`));
  }
  return lines.join('\n');
};

const formatAchievements = (userProfile) => {
  if (!userProfile) return '';
  const lines = [
    `Gamification Profile:`,
    `  Level: ${userProfile.level} | XP: ${userProfile.xp} | Coins: ${userProfile.coins}`,
    `  Streak: ${userProfile.streak} days | Rank Tier: ${userProfile.rank || 'Bronze'}`
  ];
  if (userProfile.achievements && userProfile.achievements.length > 0) {
    const unlocked = userProfile.achievements.filter(a => a.unlocked);
    if (unlocked.length > 0) {
      lines.push('Unlocked Achievements:');
      for (const ach of unlocked) {
        lines.push(`  • ${ach.id}`);
      }
    }
  }
  return lines.join('\n');
};

// ─── DYNAMIC SIMULATION RUNNER ───────────────────────────────────────────────

import { runFinancialSimulation, parseDateRange } from './ToolRegistry.js';
import { collectFinancialData } from './DataCollector.js';

export const detectAndRunSimulation = (message, data) => {
  const norm = message.toLowerCase();

  // 1. Can I buy a phone/car worth X?
  const purchaseMatch = norm.match(/(?:buy|afford|purchase)\s+(?:a\s+)?(?:[a-z0-9\s]+?\s+)?(?:worth|for|of|costing)?\s*₹?\s*(\d+[\d,]*)(?:\s*(lakh|k))?/i);
  if (purchaseMatch) {
    let amount = parseFloat(purchaseMatch[1].replace(/,/g, ''));
    const multiplier = purchaseMatch[2]?.toLowerCase();
    if (multiplier === 'lakh') amount *= 100000;
    else if (multiplier === 'k') amount *= 1000;


    const walletBalance = data.wallets ? data.wallets.reduce((s, w) => s + w.balance, 0) : 0;
    const monthlyIncome = data.incomes ? data.incomes.reduce((s, i) => s + i.amount, 0) : 0;
    const monthlyExpense = data.expenses ? data.expenses.reduce((s, e) => s + e.amount, 0) : 0;
    const monthlyEMI = data.loans ? data.loans.reduce((s, l) => s + l.emiAmount, 0) : 0;
    const monthlySubscriptions = data.subscriptions ? data.subscriptions.reduce((s, sub) => s + sub.cost, 0) : 0;

    const sim = runFinancialSimulation('purchase', { amount }, {
      walletBalance,
      monthlyIncome,
      monthlyExpense,
      monthlyEMI,
      monthlySubscriptions
    });

    return `[FINANCIAL SIMULATION]
Action: Affordability Check for cost ₹${amount.toLocaleString('en-IN')}
Affordable: ${sim.canAfford ? 'Yes' : 'No'}
Immediate Shortfall: ₹${sim.shortfall.toLocaleString('en-IN')}
Remaining Balances: ₹${sim.remainingBalanceAfter.toLocaleString('en-IN')}
Recovery Time: ${sim.recoveryMonths} months of net savings
Impact: ${sim.impact}
Simulation Factors: ${sim.reasons.join(', ')}`;
  }

  // 2. If salary increases by X%
  const salaryMatch = norm.match(/(?:salary|income)\s+(?:increases|goes up|growth)\s+by\s*(\d+)\s*%/i);
  if (salaryMatch) {
    const percent = parseFloat(salaryMatch[1]);
    const monthlyIncome = data.incomes ? data.incomes.reduce((s, i) => s + i.amount, 0) : 0;
    const monthlyExpense = data.expenses ? data.expenses.reduce((s, e) => s + e.amount, 0) : 0;

    const sim = runFinancialSimulation('income_increase', { percent }, {
      monthlyIncome,
      monthlyExpense
    });

    return `[FINANCIAL SIMULATION]
Action: Income Growth Analysis by ${percent}%
Projected New Monthly Income: ₹${sim.newMonthlyIncome.toLocaleString('en-IN')}
Projected New Monthly Savings: ₹${sim.newMonthlySavings.toLocaleString('en-IN')}
Projected Savings Rate: ${sim.newSavingsRate}%
Simulation Factors: ${sim.reasons.join(', ')}`;
  }

  // 3. If I save X/month
  const savingsMatch = norm.match(/(?:save|savings)\s+(?:by\s+)?₹?\s*(\d+[\d,]*)/i);
  if (savingsMatch) {
    const monthlySavings = parseFloat(savingsMatch[1].replace(/,/g, ''));
    const monthlyIncome = data.incomes ? data.incomes.reduce((s, i) => s + i.amount, 0) : 0;
    const monthlyExpense = data.expenses ? data.expenses.reduce((s, e) => s + e.amount, 0) : 0;

    const sim = runFinancialSimulation('savings_plan', { monthlySavings }, {
      monthlyIncome,
      monthlyExpense
    });

    return `[FINANCIAL SIMULATION]
Action: Additional Monthly Savings target ₹${monthlySavings.toLocaleString('en-IN')}
Projected Monthly Total Savings: ₹${sim.projectedMonthlySavings.toLocaleString('en-IN')}
Projected 12-Month Accumulation: ₹${sim.projectedYearlySavings.toLocaleString('en-IN')}
Impact: ${sim.impact}
Simulation Factors: ${sim.reasons.join(', ')}`;
  }

  // 4. If I cancel subscription
  const cancelMatch = norm.match(/(?:cancel|deactivate)\s+([\w\s]+)/i);
  if (cancelMatch) {
    const subName = cancelMatch[1].trim().toLowerCase();
    const matchedSub = data.subscriptions?.find(s => s.name.toLowerCase().includes(subName));
    if (matchedSub) {
      const sim = runFinancialSimulation('cancel_subscription', { monthlyCost: matchedSub.cost }, {});
      return `[FINANCIAL SIMULATION]
Action: Cancel Subscription "${matchedSub.name}"
Monthly Savings: ₹${sim.monthlySavingsDelta.toLocaleString('en-IN')}
Yearly Savings: ₹${sim.yearlySavingsDelta.toLocaleString('en-IN')}
Impact: ${sim.impact}
Simulation Factors: ${sim.reasons.join(', ')}`;
    }
  }

  // 5. Early repayment simulation
  const earlyRepayMatch = norm.match(/(?:repay|pay off)\s+([\w\s]+)\s+early\s+with\s*₹?\s*(\d+[\d,]*)/i) ||
                          norm.match(/(?:repay|pay off|extra)\s*(?:loan)?\s*with\s*₹?\s*(\d+[\d,]*)/i);
  if (earlyRepayMatch) {
    const extraPayment = parseFloat(earlyRepayMatch[earlyRepayMatch.length - 1].replace(/,/g, ''));
    const primaryLoan = data.loans?.[0];
    if (primaryLoan) {
      const sim = runFinancialSimulation('early_repayment', {
        extraPayment,
        loanRemaining: primaryLoan.remainingBalance,
        loanEMI: primaryLoan.emiAmount
      }, {});
      return `[FINANCIAL SIMULATION]
Action: Early Loan Repayment on "${primaryLoan.name}"
Extra monthly contribution: ₹${sim.extraMonthlyPayment.toLocaleString('en-IN')}
Proposed Tenure Remaining: ${sim.remainingTenureMonths} months
Months Saved from original tenure: ${sim.monthsSaved} months
Impact: ${sim.impact}
Simulation Factors: ${sim.reasons.join(', ')}`;
    }
  }

  return null;
};

// ─── BUILD (main entry point) ─────────────────────────────────────────────────

/**
 * Build an optimised financial context for the given intents.
 *
 * @param {string | object} userId - MongoDB user ObjectId
 * @param {Array<{ intent: string, confidence: number }>} detectedIntents
 * @param {object} chat - AIChat mongoose document (for cache read/write)
 * @param {string} message - Raw message query
 * @returns {Promise<ContextResult>}
 */
const getCountFromRaw = (mod, rawData) => {
  if (!rawData || !rawData[mod]) return 0;
  if (mod === 'goals') {
    return rawData.goals.filter(g => g.isDeleted !== true).length;
  }
  return rawData[mod].length;
};

// ─── BUILD (main entry point) ─────────────────────────────────────────────────

/**
 * Build an optimised financial context for the given intents.
 *
 * @param {string | object} userId - MongoDB user ObjectId
 * @param {Array<{ intent: string, confidence: number }>} detectedIntents
 * @param {object} chat - AIChat mongoose document (for cache read/write)
 * @param {string} message - Raw message query
 * @returns {Promise<ContextResult>}
 */
export const buildContext = async (userId, detectedIntents, chat, message = '') => {
  const buildStart = Date.now();
  const intentNames = detectedIntents.map((d) => d.intent);
  const primaryIntent = intentNames[0] || 'unknown';

  // ── Greeting shortcut: zero DB queries ───────────────────────────────────
  if (primaryIntent === 'greeting' && intentNames.length === 1) {
    logger.info('[ContextBuilder] Greeting detected — skipping all DB queries.');
    return {
      contextSections: [],
      modulesFetched: [],
      queryCount: 0,
      cacheHits: [],
      cacheMisses: [],
      generatedAt: new Date(),
      counts: { wallets: 0, budgets: 0, expenses: 0, incomes: 0, goals: 0, loans: 0, subscriptions: 0, transactions: 0 },
      validationContext: {}
    };
  }

  // Parse custom date ranges
  const dateRange = parseDateRange(message);
  const isCustomTimeQuery = dateRange.label !== 'Last 30 Days';

  const requiredModules = resolveModules(intentNames);

  // Add user gamification properties if relevant
  if (intentNames.includes('financial_health') || intentNames.includes('general_advice') || intentNames.includes('unknown')) {
    requiredModules.add('user');
  }

  logger.info(`[ContextBuilder] Intents: [${intentNames.join(', ')}] → Modules: [${[...requiredModules].join(', ')}]`);

  const contextSections = [];
  const modulesFetched = [];
  const cacheHits = [];
  const cacheMisses = [];
  let counts = {};
  const validationContext = {};

  const ALL_MODULES = ['wallets', 'expenses', 'incomes', 'budgets', 'goals', 'loans', 'subscriptions'];
  
  // Determine if ALL modules are cached and valid
  const allCached = !isCustomTimeQuery && ALL_MODULES.every((mod) => {
    return isCacheValid(chat, mod);
  });

  if (allCached) {
    for (const mod of ALL_MODULES) {
      const cached = chat.moduleCache[mod];
      if (cached && cached.data) {
        contextSections.push(cached.data);
        modulesFetched.push(mod);
        cacheHits.push(mod);
        if (cached.validationData) {
          validationContext[mod] = cached.validationData;
        }
      }
    }
    // Add user achievements
    if (chat.moduleCache['user']?.data) {
      contextSections.push(chat.moduleCache['user'].data);
      modulesFetched.push('user');
      cacheHits.push('user');
      if (chat.moduleCache['user'].validationData) {
        validationContext['user'] = chat.moduleCache['user'].validationData;
      }
    }

    counts = {
      wallets: chat.moduleCache['wallets']?.count || 0,
      budgets: chat.moduleCache['budgets']?.count || 0,
      expenses: chat.moduleCache['expenses']?.count || 0,
      incomes: chat.moduleCache['incomes']?.count || 0,
      goals: chat.moduleCache['goals']?.count || 0,
      loans: chat.moduleCache['loans']?.count || 0,
      subscriptions: chat.moduleCache['subscriptions']?.count || 0,
      transactions: (chat.moduleCache['expenses']?.count || 0) + (chat.moduleCache['incomes']?.count || 0),
    };

    logger.info(`[ContextBuilder] served all required modules from verified CACHE snapshot.`);
  } else {
    logger.info(`[ContextBuilder] Cache MISS or temporal query detected. Fetching fresh snapshot from DB.`);
    
    // Load fresh data in parallel using standard collectFinancialData loader
    const rawData = await collectFinancialData(userId, {
      expensesStartDate: dateRange.start,
      expensesEndDate: dateRange.end,
      incomesStartDate: dateRange.start,
      incomesEndDate: dateRange.end
    });

    // Populate formatters and update cache
    const walletData = calculateWalletBalance(rawData.wallets);
    const expenseData = calculateMonthlyExpense(rawData.expenses);
    const incomeData = calculateMonthlyIncome(rawData.incomes);
    const budgetData = calculateBudgetUsage(rawData.budgets);
    const goalData = calculateGoalProgress(rawData.goals);
    const loanData = calculateLoanSummary(rawData.loans);
    const subData = calculateSubscriptionCost(rawData.subscriptions);
    const userData = rawData.user;

    const calculations = {
      wallets: { fmt: () => formatWallets(walletData), data: walletData },
      expenses: { fmt: () => formatExpenses(expenseData, dateRange.label), data: expenseData },
      incomes: { fmt: () => formatIncomes(incomeData, dateRange.label), data: incomeData },
      budgets: { fmt: () => formatBudgets(budgetData), data: budgetData },
      goals: { fmt: () => formatGoals(goalData), data: goalData },
      loans: { fmt: () => formatLoans(loanData), data: loanData },
      subscriptions: { fmt: () => formatSubscriptions(subData), data: subData },
      user: { fmt: () => formatAchievements(userData), data: userData }
    };

    counts = {
      wallets: rawData.wallets ? rawData.wallets.length : 0,
      budgets: rawData.budgets ? rawData.budgets.length : 0,
      expenses: rawData.expenses ? rawData.expenses.length : 0,
      incomes: rawData.incomes ? rawData.incomes.length : 0,
      goals: rawData.goals ? rawData.goals.filter(g => g.isDeleted !== true).length : 0,
      loans: rawData.loans ? rawData.loans.length : 0,
      subscriptions: rawData.subscriptions ? rawData.subscriptions.length : 0,
      transactions: (rawData.expenses ? rawData.expenses.length : 0) + (rawData.incomes ? rawData.incomes.length : 0),
    };

    // M1 fix: only run formatters for modules required by the detected intents.
    for (const mod of Object.keys(calculations)) {
      if (!requiredModules.has(mod)) continue;
      const section = calculations[mod].fmt();
      if (section) {
        contextSections.push(section);
        const valData = calculations[mod].data;
        validationContext[mod] = valData;
        if (!isCustomTimeQuery) {
          writeCache(chat, mod, section, getCountFromRaw(mod, rawData), valData);
        }
        modulesFetched.push(mod);
        cacheMisses.push(mod);
      }
    }

    // Derived savings calculation (if both expenses and incomes are available)
    const expData = expenseData || calculateMonthlyExpense(rawData.expenses);
    const incData = incomeData || calculateMonthlyIncome(rawData.incomes);
    const savings = calculateSavings(incData.total, expData.total);
    validationContext.savings = savings;
    contextSections.push(formatSavings(savings));

    // Derived comparison (if requested)
    if (intentNames.includes('comparison')) {
      const [prevExpenses, prevIncomes] = await Promise.all([
        FinancialDataService.getExpenses(userId, { startDate: nDaysAgo(60), endDate: nDaysAgo(30) }),
        FinancialDataService.getIncomes(userId, { startDate: nDaysAgo(60), endDate: nDaysAgo(30) })
      ]);
      const currExp = calculateMonthlyExpense(rawData.expenses);
      const currInc = calculateMonthlyIncome(rawData.incomes);
      const prevExp = calculateMonthlyExpense(prevExpenses);
      const prevInc = calculateMonthlyIncome(prevIncomes);

      const comp = calculateComparison({
        currentExpenses: currExp.total,
        previousExpenses: prevExp.total,
        currentIncome: currInc.total,
        previousIncome: prevInc.total
      });
      contextSections.push(formatComparison(comp));
    }

    // Derived health score — uses FinancialHealthService (6-factor, same algorithm as Dashboard/AI Insights)
    if (intentNames.includes('financial_health')) {
      const healthMetrics = calculateFinancialHealth({
        wallets: rawData.wallets,
        budgets: rawData.budgets,
        expenses: rawData.expenses,
        incomes: rawData.incomes,
        goals: rawData.goals,
        loans: rawData.loans,
        subscriptions: rawData.subscriptions,
      });
      contextSections.push(formatHealthMetrics(healthMetrics));
    }

    // Trigger simulation detection and run if matches
    const simSection = detectAndRunSimulation(message, rawData);
    if (simSection) {
      contextSections.push(simSection);
      logger.info(`[ContextBuilder] Affordability simulation generated and attached.`);
    }
  }

  const buildDuration = Date.now() - buildStart;
  logger.info(`[ContextBuilder] Built context in ${buildDuration}ms. Queries: ${cacheMisses.length}. Cache hits: ${cacheHits.length}`);

  return {
    contextSections,
    modulesFetched,
    queryCount: cacheMisses.length,
    cacheHits,
    cacheMisses,
    generatedAt: new Date(),
    counts,
    validationContext,
  };
};

// ─── CACHE INVALIDATION ───────────────────────────────────────────────────────

/**
 * Invalidate one or more module caches for a user.
 * Called by resource controllers when mutations occur (expense added, goal updated, etc.).
 *
 * @param {object} chat - AIChat mongoose document
 * @param {string[]} modules - Module names to invalidate
 */
export const invalidateModules = (chat, modules) => {
  if (!chat || !modules || modules.length === 0) return;
  if (!chat.moduleCache) chat.moduleCache = {};

  for (const mod of modules) {
    chat.moduleCache[mod] = { data: null, cachedAt: null };
    if (typeof chat.markModified === 'function') {
      chat.markModified(`moduleCache.${mod}`);
    }
    logger.debug(`[ContextBuilder] Cache INVALIDATED: ${mod}`);
  }
};

