import asyncHandler from 'express-async-handler';
import Expense from '../models/Expense.js';
import Budget from '../models/Budget.js';
import { sendSuccess } from '../utils/apiResponse.js';

// @desc  Get all expenses
// @route GET /api/expenses
export const getExpenses = asyncHandler(async (req, res) => {
  const { startDate, endDate, category, paymentMethod, page = 1, limit = 20 } = req.query;
  const filter = { user: req.user._id };
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }
  if (category) filter.category = category;
  if (paymentMethod) filter.paymentMethod = paymentMethod;

  const total = await Expense.countDocuments(filter);
  const expenses = await Expense.find(filter)
    .populate('category', 'name icon color')
    .sort({ date: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  sendSuccess(res, 200, 'Expenses fetched', { expenses, total, page: Number(page) });
});

// @desc  Add expense
// @route POST /api/expenses
export const addExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.create({ ...req.body, user: req.user._id });
  await expense.populate('category', 'name icon color');

  // Update budget spent amount
  if (expense.category) {
    const budget = await Budget.findOne({
      user: req.user._id,
      category: expense.category,
    });
    if (budget) {
      budget.spent += expense.amount;
      await budget.save();
    }
  }

  sendSuccess(res, 201, 'Expense added', expense);
});

// @desc  Get expense by ID
// @route GET /api/expenses/:id
export const getExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findOne({ _id: req.params.id, user: req.user._id }).populate('category', 'name icon color');
  if (!expense) { res.status(404); throw new Error('Expense not found'); }
  sendSuccess(res, 200, 'Expense fetched', expense);
});

// @desc  Update expense
// @route PUT /api/expenses/:id
export const updateExpense = asyncHandler(async (req, res) => {
  // Issue #4 fix: fetch old expense first to compute amount delta for budget
  const oldExpense = await Expense.findOne({ _id: req.params.id, user: req.user._id });
  if (!oldExpense) { res.status(404); throw new Error('Expense not found'); }

  const expense = await Expense.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    req.body,
    { new: true, runValidators: true }
  ).populate('category', 'name icon color');

  // Adjust budget.spent by the delta (new amount - old amount)
  const newCategoryId = expense.category?._id || expense.category;
  const oldCategoryId = oldExpense.category;

  if (oldCategoryId) {
    const oldBudget = await Budget.findOne({ user: req.user._id, category: oldCategoryId });
    if (oldBudget) {
      oldBudget.spent = Math.max(0, oldBudget.spent - oldExpense.amount);
      await oldBudget.save();
    }
  }
  if (newCategoryId) {
    const newBudget = await Budget.findOne({ user: req.user._id, category: newCategoryId });
    if (newBudget) {
      newBudget.spent = Math.max(0, newBudget.spent + expense.amount);
      await newBudget.save();
    }
  }

  sendSuccess(res, 200, 'Expense updated', expense);
});

// @desc  Delete expense
// @route DELETE /api/expenses/:id
export const deleteExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!expense) { res.status(404); throw new Error('Expense not found'); }

  // Issue #4 fix: decrement budget.spent when expense is deleted
  if (expense.category) {
    const budget = await Budget.findOne({ user: req.user._id, category: expense.category });
    if (budget) {
      budget.spent = Math.max(0, budget.spent - expense.amount);
      await budget.save();
    }
  }

  sendSuccess(res, 200, 'Expense deleted');
});

// @desc  Monthly summary
// @route GET /api/expenses/summary
export const getExpenseSummary = asyncHandler(async (req, res) => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const summary = await Expense.aggregate([
    { $match: { user: req.user._id, date: { $gte: start, $lte: end } } },
    { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
  ]);

  sendSuccess(res, 200, 'Summary fetched', summary);
});
