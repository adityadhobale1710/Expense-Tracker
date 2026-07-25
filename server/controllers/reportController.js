import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Income from '../models/Income.js';
import Expense from '../models/Expense.js';
import { sendSuccess } from '../utils/apiResponse.js';

// @desc  Overall summary: total income, expense, balance
// @route GET /api/reports/summary
export const getSummary = asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  const now = new Date();
  const y = year ? Number(year) : now.getFullYear();
  const m = month !== undefined ? Number(month) : now.getMonth();
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0, 23, 59, 59);

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

  const { startDate, endDate } = req.query;
  const match = { user: new mongoose.Types.ObjectId(req.user._id) };
  if (startDate || endDate) {
    match.date = {};
    if (startDate && startDate !== 'undefined' && startDate !== 'null') {
      const parsedStart = new Date(startDate);
      if (!isNaN(parsedStart.getTime())) {
        match.date.$gte = parsedStart;
      }
    }
    if (endDate && endDate !== 'undefined' && endDate !== 'null') {
      const parsedEnd = new Date(endDate);
      if (!isNaN(parsedEnd.getTime())) {
        match.date.$lte = parsedEnd;
      }
    }
    if (Object.keys(match.date).length === 0) {
      delete match.date;
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
    { $unwind: { path: '$cat', preserveNullAndEmpty: true } },
    {
      $group: {
        _id: '$cat._id',
        name: { $first: '$cat.name' },
        icon: { $first: '$cat.icon' },
        color: { $first: '$cat.color' },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 1,
        name: { $ifNull: ['$name', 'Uncategorized'] },
        icon: { $ifNull: ['$icon', '📁'] },
        color: { $ifNull: ['$color', '#6b7280'] },
        total: 1,
        count: 1
      }
    },
    { $sort: { total: -1 } },
  ]);

  sendSuccess(res, 200, 'Category report fetched', breakdown || []);
});
