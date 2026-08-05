import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import FinancialDataService from '../services/financial/FinancialDataService.js';
import { sendSuccess } from '../utils/apiResponse.js';

// @desc  Overall summary: total income, expense, balance
// @route GET /api/reports/summary
export const getSummary = asyncHandler(async (req, res) => {
  const { month, year, startDate, endDate } = req.query;
  let start, end;

  if (startDate || endDate) {
    if (startDate && startDate !== 'undefined' && startDate !== 'null') {
      const parsedStart = new Date(startDate);
      if (!isNaN(parsedStart.getTime())) start = parsedStart;
    }
    if (endDate && endDate !== 'undefined' && endDate !== 'null') {
      const parsedEnd = new Date(endDate);
      if (!isNaN(parsedEnd.getTime())) end = parsedEnd;
    }
  }

  // Fallback to month/year/current month if start/end are not set
  if (!start || !end) {
    const now = new Date();
    const y = year ? Number(year) : now.getFullYear();
    const m = month !== undefined ? Number(month) : now.getMonth();
    if (!start) start = new Date(y, m, 1);
    if (!end) end = new Date(y, m + 1, 0, 23, 59, 59);
  }

  const { incomes, expenses } = await FinancialDataService.getFinancialSnapshot(req.user._id, { startDate: start, endDate: end });

  const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);
  const totalExpense = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const balance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round((balance / totalIncome) * 100) : 0;

  sendSuccess(res, 200, 'Summary fetched', { totalIncome, totalExpense, balance, savingsRate });
});

// @desc  Monthly trend (last 6 months)
// @route GET /api/reports/monthly
export const getMonthlyReport = asyncHandler(async (req, res) => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const { incomes, expenses } = await FinancialDataService.getFinancialSnapshot(req.user._id, { startDate: start, endDate: now });

  // Compute monthly totals
  const monthlyIncomes = {};
  const monthlyExpenses = {};

  incomes.forEach(inc => {
    const d = new Date(inc.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyIncomes[key] = (monthlyIncomes[key] || 0) + inc.amount;
  });

  expenses.forEach(exp => {
    const d = new Date(exp.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyExpenses[key] = (monthlyExpenses[key] || 0) + exp.amount;
  });

  // Format back into arrays for the frontend
  const formatMonthly = (obj) => {
    return Object.keys(obj).sort().map(key => {
      const [year, month] = key.split('-');
      return { _id: { year: parseInt(year), month: parseInt(month) }, total: obj[key] };
    });
  };

  sendSuccess(res, 200, 'Monthly report fetched', {
    incomes: formatMonthly(monthlyIncomes),
    expenses: formatMonthly(monthlyExpenses)
  });
});

// @desc  Category breakdown
// @route GET /api/reports/by-category
export const getCategoryReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  
  let start, end;
  if (startDate && startDate !== 'undefined' && startDate !== 'null') {
    start = new Date(startDate);
  }
  if (endDate && endDate !== 'undefined' && endDate !== 'null') {
    end = new Date(endDate);
  }

  const { expenses } = await FinancialDataService.getFinancialSnapshot(req.user._id, { startDate: start, endDate: end });

  const categoryMap = {};
  let grandTotal = 0;

  expenses.forEach(exp => {
    const catId = exp.category?._id?.toString() || 'uncategorized';
    if (!categoryMap[catId]) {
      categoryMap[catId] = {
        _id: exp.category?._id || null,
        name: exp.category?.name || 'Uncategorized',
        icon: exp.category?.icon || '📁',
        color: exp.category?.color || '#6b7280',
        total: 0,
        count: 0
      };
    }
    categoryMap[catId].total += exp.amount;
    categoryMap[catId].count += 1;
    grandTotal += exp.amount;
  });

  const breakdown = Object.values(categoryMap).sort((a, b) => b.total - a.total);

  const sanitized = breakdown.map(item => ({
    ...item,
    percentage: grandTotal > 0 ? parseFloat(((item.total / grandTotal) * 100).toFixed(2)) : 0
  }));

  sendSuccess(res, 200, 'Category report fetched', sanitized);
});

