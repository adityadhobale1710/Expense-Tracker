/**
 * TrendAnalyzer.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Analyzes historical records to calculate monthly changes, percentage shifts,
 * and trend directions for income, expenses, savings, and category spending.
 */

import Income from '../../models/Income.js';
import Expense from '../../models/Expense.js';
import logger from '../../utils/logger.js';

export const analyzeTrends = async (userId) => {
  const startTime = Date.now();

  const now = new Date();
  // Get start date for 6 months ago
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5); // current month + 5 previous months
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  // Fetch 6 months of historical transactions in parallel
  const [expenses, incomes] = await Promise.all([
    Expense.find({ user: userId, date: { $gte: sixMonthsAgo } }).populate('category', 'name').lean(),
    Income.find({ user: userId, date: { $gte: sixMonthsAgo } }).lean()
  ]);

  // Group transactions by year-month keys
  const monthlyData = {};
  for (let i = 0; i < 6; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyData[key] = {
      income: 0,
      expense: 0,
      savings: 0,
      categories: {}
    };
  }

  // Populate incomes
  incomes.forEach(inc => {
    const d = new Date(inc.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (monthlyData[key]) {
      monthlyData[key].income += inc.amount || 0;
    }
  });

  // Populate expenses
  expenses.forEach(exp => {
    const d = new Date(exp.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (monthlyData[key]) {
      monthlyData[key].expense += exp.amount || 0;
      const cat = exp.category?.name || 'Uncategorized';
      monthlyData[key].categories[cat] = (monthlyData[key].categories[cat] || 0) + exp.amount;
    }
  });

  // Calculate savings for each month
  Object.keys(monthlyData).forEach(key => {
    monthlyData[key].savings = monthlyData[key].income - monthlyData[key].expense;
  });

  // Get keys sorted chronologically
  const sortedKeys = Object.keys(monthlyData).sort(); // oldest to newest
  const currentKey = sortedKeys[sortedKeys.length - 1];
  const previousKey = sortedKeys[sortedKeys.length - 2];

  const current = monthlyData[currentKey] || { income: 0, expense: 0, savings: 0, categories: {} };
  const previous = monthlyData[previousKey] || { income: 0, expense: 0, savings: 0, categories: {} };

  // Calculate 3-month and 6-month averages
  let sumIncome3 = 0, sumExpense3 = 0, sumSavings3 = 0;
  let count3 = 0;
  for (let i = sortedKeys.length - 3; i < sortedKeys.length; i++) {
    if (i >= 0 && sortedKeys[i]) {
      const data = monthlyData[sortedKeys[i]];
      sumIncome3 += data.income;
      sumExpense3 += data.expense;
      sumSavings3 += data.savings;
      count3++;
    }
  }
  const avgIncome3 = count3 > 0 ? sumIncome3 / count3 : 0;
  const avgExpense3 = count3 > 0 ? sumExpense3 / count3 : 0;
  const avgSavings3 = count3 > 0 ? sumSavings3 / count3 : 0;

  let sumIncome6 = 0, sumExpense6 = 0, sumSavings6 = 0;
  let count6 = 0;
  for (let i = 0; i < sortedKeys.length; i++) {
    if (sortedKeys[i]) {
      const data = monthlyData[sortedKeys[i]];
      sumIncome6 += data.income;
      sumExpense6 += data.expense;
      sumSavings6 += data.savings;
      count6++;
    }
  }
  const avgIncome6 = count6 > 0 ? sumIncome6 / count6 : 0;
  const avgExpense6 = count6 > 0 ? sumExpense6 / count6 : 0;
  const avgSavings6 = count6 > 0 ? sumSavings6 / count6 : 0;

  // Percentage Calculations helper
  const getPctChange = (curr, prev) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  // Build trend summaries
  const expenseMoM = getPctChange(current.expense, previous.expense);
  const incomeMoM = getPctChange(current.income, previous.income);
  const savingsMoM = getPctChange(current.savings, previous.savings);

  const summaries = [];
  if (expenseMoM > 10) {
    summaries.push(`Expenses increased by ${expenseMoM}% compared to last month.`);
  } else if (expenseMoM < -10) {
    summaries.push(`Expenses decreased by ${Math.abs(expenseMoM)}% compared to last month.`);
  } else {
    summaries.push('Your expenses remained stable compared to last month.');
  }

  if (incomeMoM > 5) {
    summaries.push(`Monthly income grew by ${incomeMoM}%.`);
  } else if (incomeMoM < -5) {
    summaries.push(`Income declined by ${Math.abs(incomeMoM)}% compared to last month.`);
  }

  // Category specific trends
  const categoryTrends = [];
  const currentCategories = Object.keys(current.categories);
  currentCategories.forEach(cat => {
    const currCatVal = current.categories[cat] || 0;
    const prevCatVal = previous.categories[cat] || 0;
    if (currCatVal > 0 && prevCatVal > 0) {
      const change = getPctChange(currCatVal, prevCatVal);
      if (Math.abs(change) >= 15) {
        categoryTrends.push({
          category: cat,
          pctChange: change,
          direction: change > 0 ? 'increasing' : 'decreasing'
        });
      }
    }
  });

  const duration = Date.now() - startTime;
  logger.info(`[TrendAnalyzer] Completed in ${duration}ms.`);

  return {
    current: {
      income: current.income,
      expense: current.expense,
      savings: current.savings
    },
    previous: {
      income: previous.income,
      expense: previous.expense,
      savings: previous.savings
    },
    averages: {
      threeMonth: {
        income: Math.round(avgIncome3),
        expense: Math.round(avgExpense3),
        savings: Math.round(avgSavings3)
      },
      sixMonth: {
        income: Math.round(avgIncome6),
        expense: Math.round(avgExpense6),
        savings: Math.round(avgSavings6)
      }
    },
    changes: {
      expensePct: expenseMoM,
      incomePct: incomeMoM,
      savingsPct: savingsMoM
    },
    categoryTrends,
    summaries,
    monthlyChartData: sortedKeys.map(k => ({
      month: k,
      income: Math.round(monthlyData[k].income),
      expense: Math.round(monthlyData[k].expense),
      savings: Math.round(monthlyData[k].savings)
    }))
  };
};
