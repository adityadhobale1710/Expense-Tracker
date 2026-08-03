import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Income from '../models/Income.js';
import Expense from '../models/Expense.js';
import { sendSuccess } from '../utils/apiResponse.js';

// @desc  Overall summary: total income, expense, balance
// @route GET /api/reports/summary
export const getSummary = asyncHandler(async (req, res) => {
  const { month, year, startDate, endDate } = req.query;
  let start, end;

  if (startDate || endDate) {
    if (startDate && startDate !== 'undefined' && startDate !== 'null') {
      const parsedStart = new Date(startDate);
      if (!isNaN(parsedStart.getTime())) {
        start = parsedStart;
      }
    }
    if (endDate && endDate !== 'undefined' && endDate !== 'null') {
      const parsedEnd = new Date(endDate);
      if (!isNaN(parsedEnd.getTime())) {
        end = parsedEnd;
      }
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

  const [incomeAgg, expenseAgg] = await Promise.all([
    Income.aggregate([
      { $match: { user: req.user._id, date: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Expense.aggregate([
      { $match: { user: req.user._id, date: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  const totalIncome = incomeAgg[0]?.total || 0;
  const totalExpense = expenseAgg[0]?.total || 0;
  const balance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round((balance / totalIncome) * 100) : 0;

  sendSuccess(res, 200, 'Summary fetched', { totalIncome, totalExpense, balance, savingsRate });
});

// @desc  Monthly trend (last 6 months)
// @route GET /api/reports/monthly
export const getMonthlyReport = asyncHandler(async (req, res) => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [incomes, expenses] = await Promise.all([
    Income.aggregate([
      { $match: { user: req.user._id, date: { $gte: start } } },
      { $group: { _id: { year: { $year: '$date' }, month: { $month: '$date' } }, total: { $sum: '$amount' } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
    Expense.aggregate([
      { $match: { user: req.user._id, date: { $gte: start } } },
      { $group: { _id: { year: { $year: '$date' }, month: { $month: '$date' } }, total: { $sum: '$amount' } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
  ]);

  sendSuccess(res, 200, 'Monthly report fetched', { incomes, expenses });
});

// @desc  Category breakdown
// @route GET /api/reports/by-category
export const getCategoryReport = asyncHandler(async (req, res) => {
  if (!req.user || !req.user._id) {
    res.status(401);
    throw new Error('Not authorized, user missing');
  }

  // Validate ObjectId before passing to aggregation — prevents CastError 500
  if (!mongoose.Types.ObjectId.isValid(req.user._id)) {
    res.status(401);
    throw new Error('Not authorized, invalid user id');
  }

  const { startDate, endDate } = req.query;
  const match = { user: new mongoose.Types.ObjectId(req.user._id) };

  // Build date filter — only add keys that parse to valid dates
  if (startDate || endDate) {
    const dateFilter = {};
    if (startDate && startDate !== 'undefined' && startDate !== 'null') {
      const parsedStart = new Date(startDate);
      if (!isNaN(parsedStart.getTime())) {
        dateFilter.$gte = parsedStart;
      }
    }
    if (endDate && endDate !== 'undefined' && endDate !== 'null') {
      const parsedEnd = new Date(endDate);
      if (!isNaN(parsedEnd.getTime())) {
        dateFilter.$lte = parsedEnd;
      }
    }
    if (Object.keys(dateFilter).length > 0) {
      match.date = dateFilter;
    }
  }

  const breakdown = await Expense.aggregate([
    { $match: match },
    {
      $lookup: {
        from: 'categories',
        localField: 'category',
        foreignField: '_id',
        as: 'cat',
      },
    },
    // ✅ FIX: was `preserveNullAndEmpty` (silent no-op) — must be `preserveNullAndEmptyArrays`
    // Without this, expenses with category:null are DROPPED from the pipeline entirely,
    // producing incorrect totals and potential 500s on downstream stages.
    { $unwind: { path: '$cat', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: { $ifNull: ['$cat._id', null] },
        name: { $first: { $ifNull: ['$cat.name', 'Uncategorized'] } },
        icon: { $first: { $ifNull: ['$cat.icon', '📁'] } },
        color: { $first: { $ifNull: ['$cat.color', '#6b7280'] } },
        total: { $sum: { $ifNull: ['$amount', 0] } },
        count: { $sum: 1 },
      },
    },
    { $sort: { total: -1 } },
  ]);

  // Compute grand total for percentage calculation
  const grandTotal = breakdown.reduce((sum, item) => sum + (item.total || 0), 0);

  // Defensive sanitization — guarantee every field is a valid, serializable value
  const sanitized = (breakdown || []).map((item) => ({
    _id: item._id ?? null,
    name: typeof item.name === 'string' && item.name.trim() !== '' ? item.name : 'Uncategorized',
    icon: typeof item.icon === 'string' && item.icon.trim() !== '' ? item.icon : '📁',
    color: typeof item.color === 'string' && item.color.trim() !== '' ? item.color : '#6b7280',
    total: typeof item.total === 'number' && !isNaN(item.total) ? item.total : 0,
    count: typeof item.count === 'number' && !isNaN(item.count) ? item.count : 0,
    percentage: grandTotal > 0 && typeof item.total === 'number' && !isNaN(item.total)
      ? parseFloat(((item.total / grandTotal) * 100).toFixed(2))
      : 0,
  }));

  sendSuccess(res, 200, 'Category report fetched', sanitized);
});

