/**
 * InsightService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Aggregates structured financial indicators and runs spending anomaly detection
 * (large amounts, category spikes) on the normalized snapshot.
 */

import {
  calculateMonthlyExpense,
  calculateMonthlyIncome,
  calculateBudgetUsage,
  calculateGoalProgress,
  calculateLoanSummary,
  calculateSubscriptionCost,
} from './ToolRegistry.js';
import logger from '../../utils/logger.js';

export const getInsights = (snapshot = {}) => {
  const startTime = Date.now();

  const {
    expenses = [],
    incomes = [],
    budgets = [],
    goals = [],
    loans = [],
    subscriptions = [],
    historicalTrends = { expenses: [], incomes: [] }
  } = snapshot;

  // ─── 1. CORE MATH SUMMARIES ──────────────────────────────────────────────────
  const expenseSummary = calculateMonthlyExpense(expenses);
  const incomeSummary = calculateMonthlyIncome(incomes);
  const budgetSummary = calculateBudgetUsage(budgets);
  const goalSummary = calculateGoalProgress(goals);
  const loanSummary = calculateLoanSummary(loans);
  const subSummary = calculateSubscriptionCost(subscriptions);

  // ─── 2. SPENDING INSIGHTS & ANOMALIES ─────────────────────────────────────────
  const categoriesSorted = expenseSummary.byCategory || [];
  const highestCategory = categoriesSorted.length > 0 ? categoriesSorted[0].category : 'None';
  const lowestCategory = categoriesSorted.length > 1 ? categoriesSorted[categoriesSorted.length - 1].category : 'None';

  // Largest expense
  let largestExpense = null;
  if (expenses.length > 0) {
    const sorted = [...expenses].sort((a, b) => b.amount - a.amount);
    largestExpense = {
      title: sorted[0].title,
      amount: sorted[0].amount,
      category: sorted[0].category?.name || 'Uncategorized',
      date: sorted[0].date
    };
  }

  // Average daily spending
  const now = new Date();
  const dayOfMonth = now.getDate();
  const avgDaily = dayOfMonth > 0 ? expenseSummary.total / dayOfMonth : 0;

  // Weekend spending (Sat/Sun)
  let weekendSpent = 0;
  expenses.forEach(e => {
    const day = new Date(e.date).getDay();
    if (day === 0 || day === 6) {
      weekendSpent += e.amount || 0;
    }
  });

  // Category history averages (excluding current month)
  const historicalCatTotals = {};
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  historicalTrends.expenses.forEach(e => {
    const eDate = new Date(e.date);
    if (eDate.getMonth() === currentMonth && eDate.getFullYear() === currentYear) {
      return; // Skip current month in baseline calculation
    }
    const cat = e.category?.name || 'Uncategorized';
    if (!historicalCatTotals[cat]) {
      historicalCatTotals[cat] = { total: 0, count: 0 };
    }
    historicalCatTotals[cat].total += e.amount || 0;
    historicalCatTotals[cat].count += 1;
  });

  // Spending spikes & anomalies
  const anomalies = [];
  const monthlyBaselineCount = 5; // approximately 5 prior months

  // Category spike check
  categoriesSorted.forEach(catItem => {
    const cat = catItem.category;
    const currentSpent = catItem.total;
    const history = historicalCatTotals[cat];
    if (history) {
      const avgPriorMonth = history.total / monthlyBaselineCount;
      if (avgPriorMonth > 500 && currentSpent > avgPriorMonth * 2.5) {
        const excessPct = Math.round((currentSpent / (avgPriorMonth || 1)) * 100);
        anomalies.push({
          title: 'Category Spending Spike',
          amount: currentSpent,
          category: cat,
          description: `Spending on "${cat}" is ${excessPct}% above your 6-month historical monthly average of ₹${Math.round(avgPriorMonth).toLocaleString('en-IN')}.`
        });
      }
    }
  });

  // Single transaction anomaly checks
  const avgTxAmount = expenses.length > 0 ? expenseSummary.total / expenses.length : 0;
  expenses.forEach(e => {
    if (e.amount > 12000 && e.amount > avgTxAmount * 3) {
      anomalies.push({
        title: 'Unusually Large Transaction',
        amount: e.amount,
        category: e.category?.name || 'Uncategorized',
        description: `Single expense of ₹${e.amount.toLocaleString('en-IN')} for "${e.title}" is over 300% of your standard average transaction amount.`
      });
    }
  });

  // Fastest growing category detection
  let fastestGrowingCategory = 'None';
  let maxGrowthPct = 0;
  categoriesSorted.forEach(catItem => {
    const cat = catItem.category;
    const history = historicalCatTotals[cat];
    if (history) {
      const priorAvg = history.total / monthlyBaselineCount;
      if (priorAvg > 200) {
        const growth = ((catItem.total - priorAvg) / priorAvg) * 100;
        if (growth > maxGrowthPct) {
          maxGrowthPct = growth;
          fastestGrowingCategory = cat;
        }
      }
    }
  });

  const uncategorizedSpent = categoriesSorted.find(c => c.category === 'Uncategorized')?.total || 0;

  // ─── 3. BUDGET INSIGHTS ──────────────────────────────────────────────────────
  let remainingBudget = 0;
  let totalLimit = 0;
  let mostEfficient = null;
  let worstPerforming = null;

  budgets.forEach(b => {
    totalLimit += b.limit || 0;
    const spent = b.spent || 0;
    const limit = b.limit || 0;
    remainingBudget += Math.max(0, limit - spent);

    const utilization = limit > 0 ? (spent / limit) * 100 : 0;

    if (!mostEfficient || utilization < mostEfficient.utilization) {
      mostEfficient = { category: b.category?.name || 'Category', utilization };
    }
    if (!worstPerforming || utilization > worstPerforming.utilization) {
      worstPerforming = { category: b.category?.name || 'Category', utilization };
    }
  });

  const budgetHealthScore = budgets.length > 0 ? Math.round(((budgets.length - budgetSummary.exceededCount) / budgets.length) * 100) : 100;

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - dayOfMonth;

  // Projected budget overspend
  let projectedOverspend = 0;
  budgets.forEach(b => {
    if (b.spent > 0 && dayOfMonth > 0) {
      const projectedTotal = (b.spent / dayOfMonth) * daysInMonth;
      if (projectedTotal > b.limit) {
        projectedOverspend += Math.round(projectedTotal - b.limit);
      }
    }
  });

  // ─── 4. GOAL INSIGHTS ────────────────────────────────────────────────────────
  const totalGoals = goals.length;
  const completedGoals = goals.filter(g => g.currentAmount >= g.targetAmount).length;
  const activeGoalsCount = goals.filter(g => g.currentAmount < g.targetAmount).length;

  let totalTarget = 0;
  let totalSaved = 0;
  goals.forEach(g => {
    totalTarget += g.targetAmount || 0;
    totalSaved += g.currentAmount || 0;
  });

  const goalCompletionPct = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  const goalGranular = goals.map(g => {
    const remaining = Math.max(0, (g.targetAmount || 0) - (g.currentAmount || 0));
    const targetDate = new Date(g.targetDate);
    const monthsRemaining = (targetDate - now) / (1000 * 60 * 60 * 24 * 30.4);
    
    let isBehind = false;
    let neededPerMonth = 0;
    if (monthsRemaining > 0 && remaining > 0) {
      neededPerMonth = Math.round(remaining / monthsRemaining);
      isBehind = g.monthlyContribution < neededPerMonth;
    }

    return {
      id: g._id,
      title: g.title,
      progress: Math.round(g.progressPct || 0),
      isBehind,
      neededPerMonth,
      targetAmount: g.targetAmount,
      currentAmount: g.currentAmount,
      projectedCompletion: targetDate.toLocaleDateString('en-IN', { year: 'numeric', month: 'short' }),
      priority: g.priority || 'Medium'
    };
  });

  // ─── 5. SAVINGS INSIGHTS ─────────────────────────────────────────────────────
  const savingsSurplus = incomeSummary.total - expenseSummary.total;
  const savingsRate = incomeSummary.total > 0 ? (savingsSurplus / incomeSummary.total) * 100 : 0;

  // Calculate Streak
  let streak = 0;
  const monthlySavingsHistory = {};
  historicalTrends.incomes.forEach(inc => {
    const d = new Date(inc.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    monthlySavingsHistory[key] = (monthlySavingsHistory[key] || 0) + inc.amount;
  });
  historicalTrends.expenses.forEach(exp => {
    const d = new Date(exp.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    monthlySavingsHistory[key] = (monthlySavingsHistory[key] || 0) - exp.amount;
  });
  
  const sortedMonths = Object.keys(monthlySavingsHistory).sort();
  for (let i = sortedMonths.length - 1; i >= 0; i--) {
    if (monthlySavingsHistory[sortedMonths[i]] > 0) {
      streak += 1;
    } else {
      break;
    }
  }

  // ─── 6. LOAN INSIGHTS ────────────────────────────────────────────────────────
  const totalDebt = loans.reduce((sum, l) => sum + (l.totalAmount || 0), 0);
  const outstandingDebt = loans.reduce((sum, l) => sum + (l.remainingAmount || 0), 0);
  const monthlyEMI = loanSummary.totalMonthlyEMI || 0;
  const debtToIncome = incomeSummary.total > 0 ? (monthlyEMI / incomeSummary.total) * 100 : 0;

  // ─── 7. SUBSCRIPTION AUDIT ───────────────────────────────────────────────────
  const monthlySubs = subSummary.monthlyTotal || 0;
  const yearlySubs = monthlySubs * 12;

  // Detect duplicate subscriptions (same cost in same category or name matches)
  const duplicates = [];
  const costMap = {};
  subscriptions.forEach(s => {
    if (costMap[s.cost] && costMap[s.cost].category === s.category) {
      duplicates.push({
        title: 'Potential Duplicate Subscription',
        description: `"${s.name}" shares the exact price (₹${s.cost}) and category as "${costMap[s.cost].name}".`
      });
    } else {
      costMap[s.cost] = s;
    }
  });

  const duration = Date.now() - startTime;
  logger.info(`[InsightService] Structured insights generated in ${duration}ms.`);

  return {
    spending: {
      highestSpendingCategory: highestCategory,
      lowestSpendingCategory: lowestCategory,
      fastestGrowingCategory,
      largestExpense,
      avgDailySpending: Math.round(avgDaily),
      weekendSpending: Math.round(weekendSpent),
      uncategorizedExpenses: uncategorizedSpent,
      anomalies,
      categoryBreakdown: categoriesSorted
    },
    budget: {
      totalBudgets: budgets.length,
      exceededBudgets: budgetSummary.exceededCount,
      remainingBudget,
      mostEfficientBudget: mostEfficient ? mostEfficient.category : 'None',
      worstPerformingBudget: worstPerforming ? worstPerforming.category : 'None',
      budgetUtilization: Math.round(totalLimit > 0 ? (expenseSummary.total / totalLimit) * 100 : 0),
      budgetHealthScore,
      projectedOverspend,
      daysLeft
    },
    goals: {
      totalGoals,
      completedGoals,
      activeGoals: activeGoalsCount,
      goalCompletionPct: Math.round(goalCompletionPct),
      goalsList: goalGranular
    },
    savings: {
      savingsRate: Math.round(savingsRate),
      averageMonthlySavings: Math.round(savingsSurplus),
      projectedSavings: Math.round(savingsSurplus * 12),
      emergencyFund: walletSummary.total,
      monthsCovered: Math.round(coverRatio),
      savingStreak: streak
    },
    loans: {
      totalDebt: outstandingDebt || totalDebt,
      debtToIncomeRatio: Math.round(debtToIncome),
      monthlyEMI,
      interestBurden: loans.reduce((sum, l) => sum + (l.interestRate || 0), 0) / (loans.length || 1)
    },
    subscriptions: {
      monthlySubscriptionCost: monthlySubs,
      yearlyCost: yearlySubs,
      unusedSubscriptionsCount: subscriptions.filter(s => s.status === 'Inactive' || s.usageRating === 'Low').length,
      upcomingRenewalsCount: subscriptions.length,
      duplicates
    }
  };
};
