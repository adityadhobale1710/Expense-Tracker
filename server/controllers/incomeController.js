import asyncHandler from 'express-async-handler';
import Income from '../models/Income.js';
import { sendSuccess } from '../utils/apiResponse.js';

// @desc  Get all incomes
// @route GET /api/income
export const getIncomes = asyncHandler(async (req, res) => {
  const { startDate, endDate, category, page = 1, limit = 20 } = req.query;
  const filter = { user: req.user._id };
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }
  if (category) filter.category = category;

  const total = await Income.countDocuments(filter);
  const incomes = await Income.find(filter)
    .sort({ date: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  sendSuccess(res, 200, 'Incomes fetched', { incomes, total, page: Number(page) });
});

// @desc  Add income
// @route POST /api/income
export const addIncome = asyncHandler(async (req, res) => {
  const income = await Income.create({ ...req.body, user: req.user._id });
  sendSuccess(res, 201, 'Income added', income);
});

// @desc  Get income by ID
// @route GET /api/income/:id
export const getIncome = asyncHandler(async (req, res) => {
  const income = await Income.findOne({ _id: req.params.id, user: req.user._id });
  if (!income) { res.status(404); throw new Error('Income not found'); }
  sendSuccess(res, 200, 'Income fetched', income);
});

// @desc  Update income
// @route PUT /api/income/:id
export const updateIncome = asyncHandler(async (req, res) => {
  const income = await Income.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    req.body,
    { new: true, runValidators: true }
  );
  if (!income) { res.status(404); throw new Error('Income not found'); }
  sendSuccess(res, 200, 'Income updated', income);
});

// @desc  Delete income
// @route DELETE /api/income/:id
export const deleteIncome = asyncHandler(async (req, res) => {
  const income = await Income.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!income) { res.status(404); throw new Error('Income not found'); }
  sendSuccess(res, 200, 'Income deleted');
});
