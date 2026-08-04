/**
 * ToolRegistry.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure, deterministic financial calculation functions.
 *
 * Rules:
 *   • Zero MongoDB access.
 *   • Zero Gemini calls.
 *   • No side effects.
 *   • Never return formatted strings — always return structured objects.
 *   • Gemini's role is to *explain* these numbers; this module *computes* them.
 *
 * All functions are named exports so they can be tree-shaken / imported selectively.
 */

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/**
 * Safe divide — returns 0 when denominator is 0.
 */
const safeDivide = (num, den) => (den === 0 ? 0 : num / den);

/**
 * Round to 2 decimal places.
 */
const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Clamp a number between min and max.
 */
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

// ─── WALLET ───────────────────────────────────────────────────────────────────

/**
 * Calculate total wallet balance and per-wallet breakdown.
 *
 * @param {Array<{ name: string, type: string, balance: number, currency: string }>} wallets
 * @returns {{
 *   total: number,
 *   breakdown: Array<{ name: string, type: string, balance: number, currency: string }>,
 *   count: number
 * }}
 */
export const calculateWalletBalance = (wallets = []) => {
  const total = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);
  const breakdown = wallets.map((w) => ({
    name: w.name,
    type: w.type,
    balance: r2(w.balance || 0),
    currency: w.currency || 'INR',
  }));
  return { total: r2(total), breakdown, count: wallets.length };
};

// ─── EXPENSES ─────────────────────────────────────────────────────────────────

/**
 * Calculate monthly expense totals and category breakdown.
 *
 * @param {Array<{ amount: number, category: { name: string } | null, date: Date }>} expenses
 * @returns {{
 *   total: number,
 *   count: number,
 *   byCategory: Array<{ category: string, total: number, count: number, percent: number }>,
 *   topCategory: string | null,
 *   average: number,
 *   recent: Array<{ title: string, category: string, amount: number, date: Date }>
 * }}
 */
export const calculateMonthlyExpense = (expenses = []) => {
  const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const categoryMap = {};

  for (const e of expenses) {
    const cat = (e.category && e.category.name) ? e.category.name : 'Uncategorized';
    if (!categoryMap[cat]) categoryMap[cat] = { total: 0, count: 0 };
    categoryMap[cat].total += e.amount || 0;
    categoryMap[cat].count += 1;
  }

  const byCategory = Object.entries(categoryMap)
    .map(([category, { total: catTotal, count }]) => ({
      category,
      total: r2(catTotal),
      count,
      percent: r2(safeDivide(catTotal, total) * 100),
    }))
    .sort((a, b) => b.total - a.total);

  const topCategory = byCategory.length > 0 ? byCategory[0].category : null;
  const recent = expenses
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5)
    .map((e) => ({
      title: e.title,
      category: (e.category && e.category.name) ? e.category.name : 'Uncategorized',
      amount: r2(e.amount || 0),
      date: e.date,
    }));

  return {
    total: r2(total),
    count: expenses.length,
    byCategory,
    topCategory,
    average: r2(safeDivide(total, expenses.length || 1)),
    recent,
  };
};

// ─── INCOME ───────────────────────────────────────────────────────────────────

/**
 * Calculate monthly income totals and source breakdown.
 *
 * @param {Array<{ amount: number, category: string, source: string, date: Date, title: string }>} incomes
 * @returns {{
 *   total: number,
 *   count: number,
 *   bySource: Array<{ source: string, total: number, count: number, percent: number }>,
 *   average: number
 * }}
 */
export const calculateMonthlyIncome = (incomes = []) => {
  const total = incomes.reduce((sum, i) => sum + (i.amount || 0), 0);
  const sourceMap = {};

  for (const i of incomes) {
    const src = i.category || i.source || 'Other';
    if (!sourceMap[src]) sourceMap[src] = { total: 0, count: 0 };
    sourceMap[src].total += i.amount || 0;
    sourceMap[src].count += 1;
  }

  const bySource = Object.entries(sourceMap)
    .map(([source, { total: srcTotal, count }]) => ({
      source,
      total: r2(srcTotal),
      count,
      percent: r2(safeDivide(srcTotal, total) * 100),
    }))
    .sort((a, b) => b.total - a.total);

  return {
    total: r2(total),
    count: incomes.length,
    bySource,
    average: r2(safeDivide(total, incomes.length || 1)),
  };
};

// ─── SAVINGS ──────────────────────────────────────────────────────────────────

/**
 * Calculate savings and savings rate.
 *
 * @param {number} monthlyIncome
 * @param {number} monthlyExpense
 * @returns {{
 *   amount: number,
 *   rate: number,
 *   isPositive: boolean,
 *   deficit: number
 * }}
 */
export const calculateSavings = (monthlyIncome = 0, monthlyExpense = 0) => {
  const amount = monthlyIncome - monthlyExpense;
  const rate = r2(safeDivide(amount, monthlyIncome) * 100);
  return {
    amount: r2(amount),
    rate: clamp(rate, -100, 100),
    isPositive: amount >= 0,
    deficit: amount < 0 ? r2(Math.abs(amount)) : 0,
  };
};

// ─── BUDGET ───────────────────────────────────────────────────────────────────

/**
 * Calculate budget usage for each budget.
 *
 * @param {Array<{
 *   category: { name: string } | null,
 *   limit: number,
 *   spent: number,
 *   period: string,
 *   alertThreshold: number
 * }>} budgets
 * @returns {{
 *   budgets: Array<{
 *     category: string, limit: number, spent: number,
 *     remaining: number, usagePercent: number, status: string
 *   }>,
 *   warnings: string[],
 *   exceededCount: number,
 *   nearLimitCount: number,
 *   totalLimit: number,
 *   totalSpent: number
 * }}
 */
export const calculateBudgetUsage = (budgets = []) => {
  const warnings = [];
  let exceededCount = 0;
  let nearLimitCount = 0;
  let totalLimit = 0;
  let totalSpent = 0;

  const processed = budgets.map((b) => {
    const categoryName = (b.category && b.category.name) ? b.category.name : 'Unknown';
    const limit = b.limit || 0;
    const spent = b.spent || 0;
    const remaining = Math.max(0, limit - spent);
    const usagePercent = r2(safeDivide(spent, limit) * 100);
    const threshold = b.alertThreshold || 80;

    let status = 'safe';
    if (spent > limit) {
      status = 'exceeded';
      exceededCount++;
      warnings.push(`${categoryName} budget exceeded by ₹${r2(spent - limit)}`);
    } else if (usagePercent >= threshold) {
      status = 'warning';
      nearLimitCount++;
      warnings.push(`${categoryName} budget at ${usagePercent}% (threshold: ${threshold}%)`);
    }

    totalLimit += limit;
    totalSpent += spent;

    return { category: categoryName, limit, spent, remaining, usagePercent, status, period: b.period };
  });

  return {
    budgets: processed,
    warnings,
    exceededCount,
    nearLimitCount,
    totalLimit: r2(totalLimit),
    totalSpent: r2(totalSpent),
  };
};

// ─── GOALS ────────────────────────────────────────────────────────────────────

/**
 * Calculate goal progress metrics.
 *
 * @param {Array<{
 *   title: string,
 *   targetAmount: number,
 *   savedAmount: number,
 *   progressPct: number,
 *   status: string,
 *   targetDate: Date,
 *   suggestedMonthlySaving: number
 * }>} goals
 * @returns {{
 *   goals: Array<{...}>,
 *   nearCompletion: string[],
 *   atRisk: string[],
 *   activeCount: number,
 *   completedCount: number
 * }}
 */
export const calculateGoalProgress = (goals = []) => {
  const nearCompletion = [];
  const atRisk = [];
  let activeCount = 0;
  let completedCount = 0;

  const processed = goals.map((g) => {
    const pct = g.progressPct ?? r2(safeDivide(g.savedAmount, g.targetAmount) * 100);
    const remaining = r2(Math.max(0, g.targetAmount - g.savedAmount));
    const daysLeft = g.targetDate
      ? Math.ceil((new Date(g.targetDate) - new Date()) / (1000 * 60 * 60 * 24))
      : null;

    if (g.status === 'Completed') completedCount++;
    else if (g.status === 'Active') activeCount++;

    if (pct >= 80 && g.status !== 'Completed') nearCompletion.push(g.title);
    if (daysLeft !== null && daysLeft <= 30 && pct < 80) atRisk.push(g.title);

    return {
      title: g.title,
      targetAmount: r2(g.targetAmount || 0),
      savedAmount: r2(g.savedAmount || 0),
      remaining,
      progressPct: Math.min(100, pct),
      status: g.status,
      daysLeft,
      suggestedMonthlySaving: r2(g.suggestedMonthlySaving || 0),
    };
  });

  return { goals: processed, nearCompletion, atRisk, activeCount, completedCount };
};

// ─── LOANS ────────────────────────────────────────────────────────────────────

/**
 * Calculate loan summary.
 *
 * @param {Array<{
 *   name: string, type: string, amount: number, remainingBalance: number,
 *   emiAmount: number, interestRate: number, nextEmiDate: Date
 * }>} loans
 * @returns {{
 *   totalPrincipal: number,
 *   totalRemaining: number,
 *   totalMonthlyEMI: number,
 *   loans: Array<{...}>,
 *   count: number,
 *   upcomingEMI: Array<{...}>
 * }}
 */
export const calculateLoanSummary = (loans = []) => {
  const totalPrincipal = loans.reduce((s, l) => s + (l.amount || 0), 0);
  const totalRemaining = loans.reduce((s, l) => s + (l.remainingBalance || 0), 0);
  const totalMonthlyEMI = loans.reduce((s, l) => s + (l.emiAmount || 0), 0);

  const now = new Date();
  const upcomingEMI = loans
    .filter((l) => l.nextEmiDate && new Date(l.nextEmiDate) > now)
    .sort((a, b) => new Date(a.nextEmiDate) - new Date(b.nextEmiDate))
    .slice(0, 3)
    .map((l) => ({
      name: l.name,
      emiAmount: r2(l.emiAmount || 0),
      dueDate: l.nextEmiDate,
    }));

  return {
    totalPrincipal: r2(totalPrincipal),
    totalRemaining: r2(totalRemaining),
    totalMonthlyEMI: r2(totalMonthlyEMI),
    count: loans.length,
    loans: loans.map((l) => ({
      name: l.name,
      type: l.type,
      principal: r2(l.amount || 0),
      remaining: r2(l.remainingBalance || 0),
      emiAmount: r2(l.emiAmount || 0),
      interestRate: l.interestRate || 0,
      nextEmiDate: l.nextEmiDate,
    })),
    upcomingEMI,
  };
};

// ─── SUBSCRIPTIONS ────────────────────────────────────────────────────────────

/**
 * Calculate subscription cost summary.
 *
 * @param {Array<{
 *   name: string, cost: number, billingCycle: string, renewalDate: Date
 * }>} subscriptions
 * @returns {{
 *   monthlyTotal: number,
 *   yearlyTotal: number,
 *   count: number,
 *   list: Array<{...}>,
 *   renewingSoon: Array<{...}>
 * }}
 */
export const calculateSubscriptionCost = (subscriptions = []) => {
  let monthlyTotal = 0;

  const list = subscriptions.map((s) => {
    const monthlyCost = s.billingCycle === 'yearly' ? r2(s.cost / 12) : s.cost;
    monthlyTotal += monthlyCost;
    return {
      name: s.name,
      cost: r2(s.cost || 0),
      billingCycle: s.billingCycle,
      monthlyCost: r2(monthlyCost),
      renewalDate: s.renewalDate,
    };
  });

  // Subscriptions renewing within 7 days
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const renewingSoon = list.filter(
    (s) => s.renewalDate && new Date(s.renewalDate) <= in7Days && new Date(s.renewalDate) >= now
  );

  return {
    monthlyTotal: r2(monthlyTotal),
    yearlyTotal: r2(monthlyTotal * 12),
    count: subscriptions.length,
    list,
    renewingSoon,
  };
};

// ─── CASH FLOW ────────────────────────────────────────────────────────────────

/**
 * Calculate cash flow and affordability.
 *
 * @param {{
 *   walletBalance: number,
 *   monthlyIncome: number,
 *   monthlyExpense: number,
 *   monthlyEMI: number,
 *   monthlySubscriptions: number,
 *   pendingGoalContributions: number
 * }} params
 * @returns {{
 *   availableSurplus: number,
 *   commitments: number,
 *   freeCash: number,
 *   savingsRate: number,
 *   canAfford: (amount: number) => { canAfford: boolean, shortfall: number, impact: string }
 * }}
 */
export const calculateCashFlow = ({
  walletBalance = 0,
  monthlyIncome = 0,
  monthlyExpense = 0,
  monthlyEMI = 0,
  monthlySubscriptions = 0,
  pendingGoalContributions = 0,
} = {}) => {
  const commitments = r2(monthlyExpense + monthlyEMI + monthlySubscriptions + pendingGoalContributions);
  const availableSurplus = r2(monthlyIncome - commitments);
  const freeCash = r2(walletBalance + availableSurplus);
  const savingsRate = r2(safeDivide(availableSurplus, monthlyIncome) * 100);

  const canAfford = (amount) => {
    const shortfall = Math.max(0, amount - freeCash);
    let impact = 'safe';
    if (amount > freeCash) impact = 'unaffordable';
    else if (amount > freeCash * 0.5) impact = 'significant';
    else if (amount > freeCash * 0.25) impact = 'moderate';
    return {
      canAfford: amount <= freeCash,
      shortfall: r2(shortfall),
      impact,
      percentOfFreeCash: r2(safeDivide(amount, freeCash) * 100),
    };
  };

  return { availableSurplus, commitments, freeCash, savingsRate, walletBalance, canAfford };
};

// ─── COMPARISON ───────────────────────────────────────────────────────────────

/**
 * Compare two periods (e.g. current month vs previous month).
 *
 * @param {{
 *   currentExpenses: number, previousExpenses: number,
 *   currentIncome: number, previousIncome: number
 * }} params
 * @returns {{
 *   expense: { current, previous, delta, changePercent, trend },
 *   income:  { current, previous, delta, changePercent, trend },
 *   savings: { current, previous, delta, changePercent, trend }
 * }}
 */
export const calculateComparison = ({
  currentExpenses = 0,
  previousExpenses = 0,
  currentIncome = 0,
  previousIncome = 0,
} = {}) => {
  const trend = (delta) => (delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat');
  const pct = (curr, prev) => (prev === 0 ? (curr > 0 ? 100 : 0) : r2(((curr - prev) / prev) * 100));

  const currentSavings = currentIncome - currentExpenses;
  const previousSavings = previousIncome - previousExpenses;

  return {
    expense: {
      current: r2(currentExpenses),
      previous: r2(previousExpenses),
      delta: r2(currentExpenses - previousExpenses),
      changePercent: pct(currentExpenses, previousExpenses),
      trend: trend(currentExpenses - previousExpenses),
    },
    income: {
      current: r2(currentIncome),
      previous: r2(previousIncome),
      delta: r2(currentIncome - previousIncome),
      changePercent: pct(currentIncome, previousIncome),
      trend: trend(currentIncome - previousIncome),
    },
    savings: {
      current: r2(currentSavings),
      previous: r2(previousSavings),
      delta: r2(currentSavings - previousSavings),
      changePercent: pct(currentSavings, previousSavings),
      trend: trend(currentSavings - previousSavings),
    },
  };
};

// ─── FINANCIAL HEALTH ─────────────────────────────────────────────────────────

/**
 * Compute an overall financial health score (0–100) from multiple signals.
 *
 * @param {{
 *   savingsRate: number,
 *   budgetExceededCount: number,
 *   totalBudgets: number,
 *   debtToIncomeRatio: number,
 *   goalsOnTrack: number,
 *   totalGoals: number
 * }} params
 * @returns {{ score: number, grade: string, signals: Array<{ signal: string, status: string }> }}
 */
export const calculateFinancialHealthMetrics = ({
  savingsRate = 0,
  budgetExceededCount = 0,
  totalBudgets = 1,
  debtToIncomeRatio = 0,
  goalsOnTrack = 0,
  totalGoals = 1,
} = {}) => {
  // Savings rate: ideal ≥ 20%
  const savingsScore = clamp(savingsRate / 20, 0, 1) * 30;
  // Budget compliance: no exceeded budgets = full score
  const budgetScore = (1 - safeDivide(budgetExceededCount, totalBudgets)) * 30;
  // Debt-to-income: ideal < 0.36
  const debtScore = (1 - clamp(debtToIncomeRatio / 0.36, 0, 1)) * 20;
  // Goal progress: ideal = all goals on track
  const goalScore = safeDivide(goalsOnTrack, totalGoals) * 20;

  const score = Math.round(savingsScore + budgetScore + debtScore + goalScore);

  const grade =
    score >= 85 ? 'Excellent' :
    score >= 70 ? 'Good' :
    score >= 50 ? 'Fair' :
    'Needs Attention';

  const signals = [
    { signal: `Savings rate: ${r2(savingsRate)}%`, status: savingsRate >= 20 ? 'good' : savingsRate >= 10 ? 'fair' : 'poor' },
    { signal: `Budget compliance: ${budgetExceededCount}/${totalBudgets} exceeded`, status: budgetExceededCount === 0 ? 'good' : budgetExceededCount <= 1 ? 'fair' : 'poor' },
    { signal: `Debt-to-income: ${r2(debtToIncomeRatio * 100)}%`, status: debtToIncomeRatio < 0.20 ? 'good' : debtToIncomeRatio < 0.36 ? 'fair' : 'poor' },
    { signal: `Goals on track: ${goalsOnTrack}/${totalGoals}`, status: goalsOnTrack === totalGoals ? 'good' : goalsOnTrack > 0 ? 'fair' : 'poor' },
  ];

  return { score, grade, signals };
};
