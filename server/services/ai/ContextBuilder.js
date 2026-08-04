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
  const lines = [`Current Balance: ₹${fmt(data.total)} across ${data.count} wallet(s)`];
  for (const w of data.breakdown) {
    lines.push(`  • ${w.name} (${w.type}): ₹${fmt(w.balance)} ${w.currency}`);
  }
  return lines.join('\n');
};

const formatExpenses = (data, label = 'Last 30 Days') => {
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
  const lines = [`Income (${label}): ₹${fmt(data.total)} across ${data.count} entries`];
  for (const s of data.bySource.slice(0, 4)) {
    lines.push(`  • ${s.source}: ₹${fmt(s.total)} (${s.percent}%)`);
  }
  return lines.join('\n');
};

const formatSavings = (savings) =>
  `Savings: ₹${fmt(savings.amount)} | Rate: ${savings.rate}% | ${savings.isPositive ? 'Surplus' : `Deficit: ₹${fmt(savings.deficit)}`}`;

const formatBudgets = (data) => {
  const lines = [`Budgets: ${data.budgets.length} active | Total limit: ₹${fmt(data.totalLimit)} | Spent: ₹${fmt(data.totalSpent)}`];
  for (const b of data.budgets) {
    const icon = b.status === 'exceeded' ? '🔴' : b.status === 'warning' ? '🟡' : '🟢';
    lines.push(`  ${icon} ${b.category}: ₹${fmt(b.spent)}/₹${fmt(b.limit)} (${b.usagePercent}%)`);
  }
  if (data.warnings.length > 0) lines.push(`Warnings: ${data.warnings.join('; ')}`);
  return lines.join('\n');
};

const formatGoals = (data) => {
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
  const lines = [
    `Loans: ${data.count} active | Total remaining: ₹${fmt(data.totalRemaining)} | Monthly EMI: ₹${fmt(data.totalMonthlyEMI)}`,
  ];
  for (const l of data.loans) {
    lines.push(`  • ${l.name} (${l.type}): ₹${fmt(l.remaining)} remaining @ ${l.interestRate}% | EMI: ₹${fmt(l.emiAmount)}/mo`);
  }
  return lines.join('\n');
};

const formatSubscriptions = (data) => {
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

// ─── MAIN MODULE LOADERS ──────────────────────────────────────────────────────

/**
 * Load raw data for a given module and return a formatted context section string.
 * This is what actually hits MongoDB — only called for cache misses.
 *
 * @param {string} moduleName
 * @param {string | object} userId
 * @param {object} options - Extra params (e.g. comparison date ranges)
 * @returns {Promise<string>}
 */
const loadModule = async (moduleName, userId, options = {}) => {
  const thirtyDaysAgo = nDaysAgo(30);
  const ninetyDaysAgo = nDaysAgo(90);

  switch (moduleName) {
    case 'wallets': {
      const wallets = await Wallet.find({ user: userId, isArchived: false }).lean();
      return formatWallets(calculateWalletBalance(wallets));
    }

    case 'expenses': {
      const [current, previous] = await Promise.all([
        Expense.find({ user: userId, date: { $gte: thirtyDaysAgo } })
          .populate('category', 'name')
          .lean(),
        options.includeComparison
          ? Expense.find({
              user: userId,
              date: { $gte: startOfMonth(1), $lte: endOfMonth(1) },
            })
            .populate('category', 'name')
            .lean()
          : Promise.resolve(null),
      ]);

      const expData = calculateMonthlyExpense(current);
      let section = formatExpenses(expData);

      if (options.includeComparison && previous !== null) {
        const prevData = calculateMonthlyExpense(previous);
        section += `\nPrevious Month Expenses: ₹${fmt(prevData.total)}`;
        // Stash previous for comparison tool in the options object (returned up the call stack)
        options._prevExpenseTotal = prevData.total;
        options._currExpenseTotal = expData.total;
      }

      if (options.includeNinetyDays) {
        const ninety = await Expense.find({ user: userId, date: { $gte: ninetyDaysAgo } })
          .populate('category', 'name')
          .lean();
        const ninData = calculateMonthlyExpense(ninety);
        section += `\n90-Day Expense Summary: ₹${fmt(ninData.total)} | Avg/month: ₹${fmt(ninData.average * 3)}`;
      }

      return section;
    }

    case 'incomes': {
      const [current, previous] = await Promise.all([
        Income.find({ user: userId, date: { $gte: thirtyDaysAgo } }).lean(),
        options.includeComparison
          ? Income.find({
              user: userId,
              date: { $gte: startOfMonth(1), $lte: endOfMonth(1) },
            }).lean()
          : Promise.resolve(null),
      ]);

      const incData = calculateMonthlyIncome(current);
      let section = formatIncomes(incData);

      if (options.includeComparison && previous !== null) {
        const prevData = calculateMonthlyIncome(previous);
        section += `\nPrevious Month Income: ₹${fmt(prevData.total)}`;
        options._prevIncomeTotal = prevData.total;
        options._currIncomeTotal = incData.total;
      }

      return section;
    }

    case 'budgets': {
      const budgets = await Budget.find({ user: userId }).populate('category', 'name').lean();
      return formatBudgets(calculateBudgetUsage(budgets));
    }

    case 'goals': {
      const goals = await Goal.find({ user: userId, isDeleted: false }).lean();
      return formatGoals(calculateGoalProgress(goals));
    }

    case 'loans': {
      const loans = await Loan.find({ user: userId }).lean();
      return formatLoans(calculateLoanSummary(loans));
    }

    case 'subscriptions': {
      const subs = await Subscription.find({ user: userId }).lean();
      return formatSubscriptions(calculateSubscriptionCost(subs));
    }

    default:
      return '';
  }
};

// ─── CONTEXT RESULT TYPE ──────────────────────────────────────────────────────

/**
 * @typedef {Object} ContextResult
 * @property {string[]} contextSections  - Array of compact text sections ready for prompt assembly
 * @property {string[]} modulesFetched   - Which modules had data loaded (cache miss or fresh)
 * @property {number}   queryCount       - How many DB round-trips were made
 * @property {string[]} cacheHits        - Modules served from cache
 * @property {string[]} cacheMisses      - Modules that required a DB query
 * @property {Date}     generatedAt      - Timestamp of context build
 */

// ─── BUILD (main entry point) ─────────────────────────────────────────────────

/**
 * Build an optimised financial context for the given intents.
 *
 * @param {string | object} userId - MongoDB user ObjectId
 * @param {Array<{ intent: string, confidence: number }>} detectedIntents
 * @param {object} chat - AIChat mongoose document (for cache read/write)
 * @returns {Promise<ContextResult>}
 */
export const buildContext = async (userId, detectedIntents, chat) => {
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

  // ── Determine required modules ────────────────────────────────────────────
  const requiredModules = resolveModules(intentNames);
  logger.info(`[ContextBuilder] Intents: [${intentNames.join(', ')}] → Modules: [${[...requiredModules].join(', ')}]`);

  // ── Options for cross-module signals ──────────────────────────────────────
  const options = {
    includeComparison: intentNames.includes('comparison'),
    includeNinetyDays: intentNames.includes('spending_prediction'),
  };

  const contextSections = [];
  const modulesFetched = [];
  const cacheHits = [];
  const cacheMisses = [];

  // ── Per-module cache check + parallel loading ─────────────────────────────
  // Split into hits (served from cache) vs misses (need DB query).
  const missModules = [];
  for (const mod of requiredModules) {
    if (isCacheValid(chat, mod)) {
      cacheHits.push(mod);
    } else {
      cacheMisses.push(mod);
      missModules.push(mod);
    }
  }

  // Serve cache hits immediately
  for (const mod of cacheHits) {
    const cachedSection = chat.moduleCache[mod].data;
    if (cachedSection) contextSections.push(cachedSection);
    modulesFetched.push(mod);
    logger.debug(`[ContextBuilder] Cache HIT: ${mod}`);
  }

  // Load all misses in parallel
  if (missModules.length > 0) {
    logger.info(`[ContextBuilder] Cache MISS for: [${missModules.join(', ')}]. Running ${missModules.length} DB query/queries.`);

    const loadResults = await Promise.allSettled(
      missModules.map((mod) => loadModule(mod, userId, options))
    );

    for (let i = 0; i < missModules.length; i++) {
      const mod = missModules[i];
      const result = loadResults[i];

      if (result.status === 'fulfilled') {
        const section = result.value;
        writeCache(chat, mod, section);
        if (section) contextSections.push(section);
        modulesFetched.push(mod);
      } else {
        logger.warn(`[ContextBuilder] Failed to load module "${mod}": ${result.reason?.message}`);
      }
    }
  }

  // ── Derived compound sections ─────────────────────────────────────────────

  // Savings summary (derived — no extra query)
  if (requiredModules.has('incomes') && requiredModules.has('expenses')) {
    try {
      // Extract totals from the already-fetched sections
      // We rely on the options object which is mutated by loadModule during comparison
      const incData = options._currIncomeTotal !== undefined
        ? { total: options._currIncomeTotal }
        : await (async () => {
            const thirtyDaysAgo = nDaysAgo(30);
            const incomes = await Income.find({ user: userId, date: { $gte: thirtyDaysAgo } }).lean();
            return calculateMonthlyIncome(incomes);
          })();
      const expData = options._currExpenseTotal !== undefined
        ? { total: options._currExpenseTotal }
        : await (async () => {
            const thirtyDaysAgo = nDaysAgo(30);
            const expenses = await Expense.find({ user: userId, date: { $gte: thirtyDaysAgo } })
              .populate('category', 'name').lean();
            return calculateMonthlyExpense(expenses);
          })();

      const savings = calculateSavings(incData.total, expData.total);
      contextSections.push(formatSavings(savings));
    } catch (err) {
      logger.warn(`[ContextBuilder] Could not compute savings section: ${err.message}`);
    }
  }

  // Comparison section (requires both incomes and expenses)
  if (intentNames.includes('comparison') &&
      options._currExpenseTotal !== undefined &&
      options._currIncomeTotal !== undefined) {
    const comp = calculateComparison({
      currentExpenses: options._currExpenseTotal,
      previousExpenses: options._prevExpenseTotal || 0,
      currentIncome: options._currIncomeTotal,
      previousIncome: options._prevIncomeTotal || 0,
    });
    contextSections.push(formatComparison(comp));
  }

  // Financial health score (derived — no extra query)
  if (intentNames.includes('financial_health')) {
    try {
      const thirtyDaysAgo = nDaysAgo(30);
      const [incomes, expenses, budgets, goals, loans] = await Promise.all([
        Income.find({ user: userId, date: { $gte: thirtyDaysAgo } }).lean(),
        Expense.find({ user: userId, date: { $gte: thirtyDaysAgo } }).populate('category', 'name').lean(),
        Budget.find({ user: userId }).populate('category', 'name').lean(),
        Goal.find({ user: userId, isDeleted: false }).lean(),
        Loan.find({ user: userId }).lean(),
      ]);

      const incData = calculateMonthlyIncome(incomes);
      const expData = calculateMonthlyExpense(expenses);
      const savings = calculateSavings(incData.total, expData.total);
      const budgetData = calculateBudgetUsage(budgets);
      const goalData = calculateGoalProgress(goals);
      const loanData = calculateLoanSummary(loans);

      const metrics = calculateFinancialHealthMetrics({
        savingsRate: savings.rate,
        budgetExceededCount: budgetData.exceededCount,
        totalBudgets: Math.max(1, budgets.length),
        debtToIncomeRatio: incData.total > 0 ? loanData.totalMonthlyEMI / incData.total : 0,
        goalsOnTrack: goalData.goals.filter((g) => g.progressPct >= 50).length,
        totalGoals: Math.max(1, goalData.goals.length),
      });

      contextSections.push(formatHealthMetrics(metrics));
    } catch (err) {
      logger.warn(`[ContextBuilder] Could not compute health metrics: ${err.message}`);
    }
  }

  const buildDuration = Date.now() - buildStart;
  const queryCount = missModules.length;

  logger.info(
    `[ContextBuilder] Built context in ${buildDuration}ms. ` +
    `DB queries: ${queryCount}. ` +
    `Cache hits: [${cacheHits.join(', ') || 'none'}]. ` +
    `Misses: [${cacheMisses.join(', ') || 'none'}]. ` +
    `Sections: ${contextSections.length}.`
  );

  return {
    contextSections,
    modulesFetched,
    queryCount,
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
    if (chat.moduleCache[mod]) {
      chat.moduleCache[mod] = { data: null, cachedAt: null };
      if (typeof chat.markModified === 'function') {
        chat.markModified(`moduleCache.${mod}`);
      }
      logger.debug(`[ContextBuilder] Cache INVALIDATED: ${mod}`);
    }
  }
};
