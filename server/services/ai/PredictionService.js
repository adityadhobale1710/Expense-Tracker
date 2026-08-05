/**
 * PredictionService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Projects future cash flow, balance, and overspending risks across multiple
 * horizons (Month-end, Next Month, Next Quarter, Next 6 Months) including
 * statistical confidence bounds.
 */

import {
  calculateWalletBalance,
  calculateMonthlyExpense,
  calculateMonthlyIncome,
} from './ToolRegistry.js';
import logger from '../../utils/logger.js';

export const getPredictions = (snapshot = {}) => {
  const startTime = Date.now();

  const {
    wallets = [],
    expenses = [],
    incomes = [],
    budgets = [],
    goals = [],
    historicalTrends = { expenses: [], incomes: [] }
  } = snapshot;

  const walletSummary = calculateWalletBalance(wallets);
  const expenseSummary = calculateMonthlyExpense(expenses);
  const incomeSummary = calculateMonthlyIncome(incomes);

  const currentBalance = walletSummary.total || 0;
  const currentIncome = incomeSummary.total || 0;
  const currentExpense = expenseSummary.total || 0;

  // 1. CONFIDENCE CALCULATION
  // Calculate variance across historical incomes/expenses.
  // Less variance = higher projection confidence.
  const monthlyTotals = {};
  historicalTrends.expenses.forEach(e => {
    const d = new Date(e.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!monthlyTotals[key]) monthlyTotals[key] = 0;
    monthlyTotals[key] += e.amount || 0;
  });

  const totalsArray = Object.values(monthlyTotals);
  let confidence = 85; // Default baseline
  if (totalsArray.length >= 2) {
    const mean = totalsArray.reduce((a, b) => a + b, 0) / totalsArray.length;
    const variance = totalsArray.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / totalsArray.length;
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? stdDev / mean : 0;
    // cv ranges typically from 0 to 1. If CV is 0, confidence is 98. If CV is 0.5, confidence is 48.
    confidence = Math.round(Math.max(45, Math.min(98, 98 - cv * 100)));
  }

  // 2. DAILY VELOCITY FOR MONTH-END PROJECTING
  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemaining = daysInMonth - dayOfMonth;

  const dailySpend = dayOfMonth > 0 ? currentExpense / dayOfMonth : 0;
  const expectedSpendMonthEnd = Math.round(dailySpend * daysInMonth);
  const expectedSavingsMonthEnd = Math.round(Math.max(0, currentIncome - expectedSpendMonthEnd));
  const projectedBalanceMonthEnd = Math.round(currentBalance + (currentIncome - expectedSpendMonthEnd) * (daysRemaining / daysInMonth));

  // 3. HORIZONS PROJECTIONS
  // Uses historical 6-month baseline average if available, otherwise scales current month.
  let baselineIncome = currentIncome || 50000;
  let baselineExpense = expectedSpendMonthEnd || 40000;

  const priorIncomes = {};
  historicalTrends.incomes.forEach(i => {
    const d = new Date(i.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    priorIncomes[key] = (priorIncomes[key] || 0) + i.amount;
  });
  const priorIncomeValues = Object.values(priorIncomes);
  if (priorIncomeValues.length > 0) {
    baselineIncome = priorIncomeValues.reduce((a, b) => a + b, 0) / priorIncomeValues.length;
  }

  const priorExpenses = {};
  historicalTrends.expenses.forEach(e => {
    const d = new Date(e.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    priorExpenses[key] = (priorExpenses[key] || 0) + e.amount;
  });
  const priorExpenseValues = Object.values(priorExpenses);
  if (priorExpenseValues.length > 0) {
    baselineExpense = priorExpenseValues.reduce((a, b) => a + b, 0) / priorExpenseValues.length;
  }

  const monthlySavings = Math.max(0, baselineIncome - baselineExpense);

  // Month End Horizon
  const monthEnd = {
    balance: projectedBalanceMonthEnd,
    spending: expectedSpendMonthEnd,
    savings: expectedSavingsMonthEnd,
    confidence
  };

  // Next Month Horizon
  const nextMonth = {
    balance: Math.round(projectedBalanceMonthEnd + monthlySavings),
    spending: Math.round(baselineExpense),
    savings: Math.round(monthlySavings),
    confidence: Math.round(confidence * 0.95)
  };

  // Next Quarter (3 Months) Horizon
  const nextQuarter = {
    balance: Math.round(projectedBalanceMonthEnd + monthlySavings * 3),
    spending: Math.round(baselineExpense * 3),
    savings: Math.round(monthlySavings * 3),
    confidence: Math.round(confidence * 0.85)
  };

  // Next 6 Months Horizon
  const next6Months = {
    balance: Math.round(projectedBalanceMonthEnd + monthlySavings * 6),
    spending: Math.round(baselineExpense * 6),
    savings: Math.round(monthlySavings * 6),
    confidence: Math.round(confidence * 0.70)
  };

  // 4. OVERSPENDING RISK ESTIMATION
  let overspendingRisk = 'Low';
  const totalBudgetLimit = budgets.reduce((sum, b) => sum + (b.limit || 0), 0);
  if (totalBudgetLimit > 0) {
    const ratio = currentExpense / totalBudgetLimit;
    if (ratio > 0.95 || expectedSpendMonthEnd > totalBudgetLimit) {
      overspendingRisk = 'High';
    } else if (ratio > 0.75) {
      overspendingRisk = 'Medium';
    }
  }

  // 5. CASH FLOW FORECAST FOR RECHARTS CHART
  const cashFlowForecast = [];
  for (let i = 1; i <= 3; i++) {
    const forecastDate = new Date();
    forecastDate.setMonth(forecastDate.getMonth() + i);
    const label = forecastDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    cashFlowForecast.push({
      month: label,
      projectedIncome: Math.round(baselineIncome),
      projectedExpense: Math.round(baselineExpense),
      projectedSavings: Math.round(monthlySavings)
    });
  }

  // Projected Goal Completion Dates
  const goalPredictions = goals.map(g => {
    const remaining = Math.max(0, (g.targetAmount || 0) - (g.currentAmount || 0));
    let projectedDate = 'Achieved';
    if (remaining > 0) {
      const monthlyContribution = g.monthlyContribution || (monthlySavings / Math.max(1, goals.length)) || 1000;
      const monthsNeeded = remaining / Math.max(200, monthlyContribution);
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + Math.ceil(monthsNeeded));
      projectedDate = targetDate.toLocaleDateString('en-IN', { year: 'numeric', month: 'short' });
    }
    return {
      goalId: g._id,
      title: g.title,
      projectedDate,
      remainingAmount: remaining
    };
  });

  const duration = Date.now() - startTime;
  logger.info(`[PredictionService] Horizons calculated in ${duration}ms.`);

  return {
    monthEnd,
    nextMonth,
    nextQuarter,
    next6Months,
    overspendingRisk,
    cashFlowForecast,
    goalPredictions
  };
};
