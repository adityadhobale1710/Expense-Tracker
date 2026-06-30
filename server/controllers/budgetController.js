import asyncHandler from 'express-async-handler';
import Budget from '../models/Budget.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const getBudgets = asyncHandler(async (req, res) => {
  const budgets = await Budget.find({ user: req.user._id }).populate('category', 'name icon color');
  sendSuccess(res, 200, 'Budgets fetched', budgets);
});

export const createBudget = asyncHandler(async (req, res) => {
  const budget = await Budget.create({ ...req.body, user: req.user._id });
  await budget.populate('category', 'name icon color');
  sendSuccess(res, 201, 'Budget created', budget);
});

export const getBudget = asyncHandler(async (req, res) => {
  const budget = await Budget.findOne({ _id: req.params.id, user: req.user._id }).populate('category', 'name icon color');
  if (!budget) { res.status(404); throw new Error('Budget not found'); }
  sendSuccess(res, 200, 'Budget fetched', budget);
});

export const updateBudget = asyncHandler(async (req, res) => {
  const budget = await Budget.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    req.body,
    { new: true }
  ).populate('category', 'name icon color');
  if (!budget) { res.status(404); throw new Error('Budget not found'); }
  sendSuccess(res, 200, 'Budget updated', budget);
});

export const deleteBudget = asyncHandler(async (req, res) => {
  const budget = await Budget.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!budget) { res.status(404); throw new Error('Budget not found'); }
  sendSuccess(res, 200, 'Budget deleted');
});
