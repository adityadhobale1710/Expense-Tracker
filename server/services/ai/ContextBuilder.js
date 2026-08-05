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

import Wallet from '../../models/Wallet.js';
import Budget from '../../models/Budget.js';
import Expense from '../../models/Expense.js';
import Income from '../../models/Income.js';
import Goal from '../../models/Goal.js';
import Loan from '../../models/Loan.js';
import Subscription from '../../models/Subscription.js';
import logger from '../../utils/logger.js';

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
  calculateFinancialHealthMetrics,
} from './ToolRegistry.js';

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
const writeCache = (chat, moduleName, data) => {
  if (!chat.moduleCache) chat.moduleCache = {};
  chat.moduleCache[moduleName] = { data, cachedAt: new Date() };
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
    return 'Wallets: There are currently no active wallets.';
  }
  const lines = [`Current Balance: ₹${fmt(data.total)} across ${data.count} wallet(s)`];
  for (const w of data.breakdown) {
    lines.push(`  • ${w.name} (${w.type}): ₹${fmt(w.balance)} ${w.currency}`);
  }
  return lines.join('\n');
};

const formatExpenses = (data, label = 'Last 30 Days') => {
  if (!data || !data.byCategory || data.byCategory.length === 0) {
    return `Expenses (${label}): There are currently no expenses logged.`;
  }
  const lines = [`Expenses (${label}): ₹${fmt(data.total)} across ${data.count} transactions`];
  if (data.topCategory) lines.push(`  Top Category: ${data.topCategory}`);
  for (const c of data.byCategory.slice(0, 5)) {
    lines.push(`  • ${c.category}: ₹${fmt(c.total)} (${c.percent}%)`);
  }
  if (data.recent.length > 0) {
    lines.push('Recent transactions:');
    for (const r of data.recent.slice(0, 4)) {
      lines.push(`  • ${r.title} (${r.category}): ₹${fmt(r.amount)}`);
    }
  }
  return lines.join('\n');
};

const formatIncomes = (data, label = 'Last 30 Days') => {
  if (!data || !data.bySource || data.bySource.length === 0) {
    return `Income (${label}): There are currently no incomes logged.`;
  }
  const lines = [`Income (${label}): ₹${fmt(data.total)} across ${data.count} entries`];
  for (const s of data.bySource.slice(0, 4)) {
    lines.push(`  • ${s.source}: ₹${fmt(s.total)} (${s.percent}%)`);
  }
  return lines.join('\n');
};

const formatSavings = (savings) =>
  `Savings: ₹${fmt(savings.amount)} | Rate: ${savings.rate}% | ${savings.isPositive ? 'Surplus' : `Deficit: ₹${fmt(savings.deficit)}`}`;

const formatBudgets = (data) => {
  if (!data || !data.budgets || data.budgets.length === 0) {
    return 'Budgets: There are currently no active budgets.';
  }
  const lines = [`Budgets: ${data.budgets.length} active | Total limit: ₹${fmt(data.totalLimit)} | Spent: ₹${fmt(data.totalSpent)}`];
  for (const b of data.budgets) {
    const icon = b.status === 'exceeded' ? '🔴' : b.status === 'warning' ? '🟡' : '🟢';
    lines.push(`  ${icon} ${b.category}: ₹${fmt(b.spent)}/₹${fmt(b.limit)} (${b.usagePercent}%)`);
  }
  if (data.warnings.length > 0) lines.push(`Warnings: ${data.warnings.join('; ')}`);
  return lines.join('\n');
};

const formatGoals = (data) => {
  if (!data || !data.goals || data.goals.length === 0) {
    return 'Goals: There are currently no active goals.';
  }
  const lines = [`Goals: ${data.activeCount} active, ${data.completedCount} completed`];
  for (const g of data.goals) {
    const days = g.daysLeft !== null ? ` | ${g.daysLeft}d left` : '';
    lines.push(`  • ${g.title}: ₹${fmt(g.savedAmount)}/₹${fmt(g.targetAmount)} (${g.progressPct}%${days})`);
    if (g.suggestedMonthlySaving > 0) {
      lines.push(`    Suggested monthly: ₹${fmt(g.suggestedMonthlySaving)}`);
    }
  }
  if (data.nearCompletion.length > 0) lines.push(`Near completion: ${data.nearCompletion.join(', ')}`);
  if (data.atRisk.length > 0) lines.push(`At risk: ${data.atRisk.join(', ')}`);
  return lines.join('\n');
};

const formatLoans = (data) => {
  if (!data || !data.loans || data.loans.length === 0) {
    return 'Loans: There are currently no active loans.';
  }
  const lines = [
    `Loans: ${data.count} active | Total remaining: ₹${fmt(data.totalRemaining)} | Monthly EMI: ₹${fmt(data.totalMonthlyEMI)}`,
  ];
  for (const l of data.loans) {
    lines.push(`  • ${l.name} (${l.type}): ₹${fmt(l.remaining)} remaining @ ${l.interestRate}% | EMI: ₹${fmt(l.emiAmount)}/mo`);
  }
  return lines.join('\n');
};

const formatSubscriptions = (data) => {
  if (!data || !data.list || data.list.length === 0) {
    return 'Subscriptions: There are currently no active subscriptions.';
  }
  const lines = [
    `Subscriptions: ${data.count} active | ₹${fmt(data.monthlyTotal)}/mo | ₹${fmt(data.yearlyTotal)}/yr`,
  ];
  for (const s of data.list) {
    lines.push(`  • ${s.name}: ₹${fmt(s.cost)}/${s.billingCycle} (≈ ₹${fmt(s.monthlyCost)}/mo)`);
  }
  if (data.renewingSoon.length > 0) {
    lines.push(`Renewing soon: ${data.renewingSoon.map((s) => s.name).join(', ')}`);
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

const formatHealthMetrics = (data) => [
  `Financial Health Score: ${data.score}/100 (${data.grade})`,
  ...data.signals.map((s) => `  • ${s.signal}`),
].join('\n');

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

  const ALL_MODULES = ['wallets', 'expenses', 'incomes', 'budgets', 'goals', 'loans', 'subscriptions'];
  
  // Determine if ALL modules are cached and valid
  const allCached = !isCustomTimeQuery && ALL_MODULES.every((mod) => {
    return isCacheValid(chat, mod);
  });

  if (allCached) {
    for (const mod of ALL_MODULES) {
      const cachedSection = chat.moduleCache[mod]?.data;
      if (cachedSection) {
        contextSections.push(cachedSection);
        modulesFetched.push(mod);
        cacheHits.push(mod);
      }
    }
    // Add user achievements
    if (chat.moduleCache['user']?.data) {
      contextSections.push(chat.moduleCache['user'].data);
      modulesFetched.push('user');
      cacheHits.push('user');
    }
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
    const calculations = {
      wallets: () => formatWallets(calculateWalletBalance(rawData.wallets)),
      expenses: () => formatExpenses(calculateMonthlyExpense(rawData.expenses), dateRange.label),
      incomes: () => formatIncomes(calculateMonthlyIncome(rawData.incomes), dateRange.label),
      budgets: () => formatBudgets(calculateBudgetUsage(rawData.budgets)),
      goals: () => formatGoals(calculateGoalProgress(rawData.goals)),
      loans: () => formatLoans(calculateLoanSummary(rawData.loans)),
      subscriptions: () => formatSubscriptions(calculateSubscriptionCost(rawData.subscriptions)),
      user: () => formatAchievements(rawData.user)
    };

    // Include ALL modules unconditionally to ensure AI has complete context
    const allModuleKeys = Object.keys(calculations);
    for (const mod of allModuleKeys) {
      if (calculations[mod]) {
        const section = calculations[mod]();
        if (section) {
          contextSections.push(section);
          if (!isCustomTimeQuery) {
            writeCache(chat, mod, section);
          }
          modulesFetched.push(mod);
          cacheMisses.push(mod);
        }
      }
    }

    // Derived savings calculation (if both expenses and incomes are available)
    const expData = calculateMonthlyExpense(rawData.expenses);
    const incData = calculateMonthlyIncome(rawData.incomes);
    const savings = calculateSavings(incData.total, expData.total);
    contextSections.push(formatSavings(savings));

    // Derived comparison (if requested)
    if (intentNames.includes('comparison')) {
      const [prevExpenses, prevIncomes] = await Promise.all([
        Expense.find({ user: userId, date: { $gte: nDaysAgo(60), $lt: nDaysAgo(30) } }).populate('category', 'name').lean(),
        Income.find({ user: userId, date: { $gte: nDaysAgo(60), $lt: nDaysAgo(30) } }).lean()
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

    // Derived health score
    if (intentNames.includes('financial_health')) {
      const incData = calculateMonthlyIncome(rawData.incomes);
      const expData = calculateMonthlyExpense(rawData.expenses);
      const savings = calculateSavings(incData.total, expData.total);
      const budgetData = calculateBudgetUsage(rawData.budgets);
      const goalData = calculateGoalProgress(rawData.goals);
      const loanData = calculateLoanSummary(rawData.loans);

      const healthMetrics = calculateFinancialHealthMetrics({
        savingsRate: savings.rate,
        budgetExceededCount: budgetData.exceededCount,
        totalBudgets: Math.max(1, rawData.budgets.length),
        debtToIncomeRatio: incData.total > 0 ? loanData.totalMonthlyEMI / incData.total : 0,
        goalsOnTrack: goalData.goals.filter((g) => g.progressPct >= 50).length,
        totalGoals: Math.max(1, goalData.goals.length)
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

