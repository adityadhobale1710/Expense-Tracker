import asyncHandler from 'express-async-handler';
import Budget from '../models/Budget.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const getBudgets = asyncHandler(async (req, res) => {
  const budgets = await Budget.find({ user: req.user._id }).populate('category', 'name icon color');
  sendSuccess(res, 200, 'Budgets fetched', budgets);
});

export const createBudget = asyncHandler(async (req, res) => {
  const { category, limit, period, startDate, endDate, alertThreshold } = req.body;

  // B9 fix: prevent duplicate budgets for the same category
  const existing = await Budget.findOne({ user: req.user._id, category });
  if (existing) {
    res.status(400);
    throw new Error('A budget for this category already exists. Please update the existing budget instead.');
  }

  const budget = await Budget.create({
    user: req.user._id,
    category,
    limit,
    period,
    startDate,
    endDate,
    alertThreshold,
  });
  await budget.populate('category', 'name icon color');
  sendSuccess(res, 201, 'Budget created', budget);
});

export const getBudget = asyncHandler(async (req, res) => {
  const budget = await Budget.findOne({ _id: req.params.id, user: req.user._id }).populate('category', 'name icon color');
  if (!budget) { res.status(404); throw new Error('Budget not found'); }
  sendSuccess(res, 200, 'Budget fetched', budget);
});

export const updateBudget = asyncHandler(async (req, res) => {
  // B10 fix: whitelist allowed update fields to prevent field injection
  const allowedFields = ['limit', 'period', 'startDate', 'endDate', 'alertThreshold'];
  const updateData = {};
  allowedFields.forEach((f) => { if (req.body[f] !== undefined) updateData[f] = req.body[f]; });

  const budget = await Budget.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    updateData,
    { new: true, runValidators: true }
  ).populate('category', 'name icon color');
  if (!budget) { res.status(404); throw new Error('Budget not found'); }
  sendSuccess(res, 200, 'Budget updated', budget);
});

export const deleteBudget = asyncHandler(async (req, res) => {
  const budget = await Budget.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!budget) { res.status(404); throw new Error('Budget not found'); }
  sendSuccess(res, 200, 'Budget deleted');
});
