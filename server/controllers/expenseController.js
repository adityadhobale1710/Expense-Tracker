import asyncHandler from 'express-async-handler';
import Expense from '../models/Expense.js';
import Budget from '../models/Budget.js';
import Wallet from '../models/Wallet.js';
import { sendSuccess } from '../utils/apiResponse.js';

// ---------------------------------------------------------------------------
// Helper: Recalculate Budget.spent by summing all Expense amounts for a given
// user + category. This guarantees Budget.spent can never drift out of sync
// regardless of whether an expense is added, edited, or deleted.
// Only updates an EXISTING Budget document — never creates one (avoids
// incomplete documents missing required fields like `limit`).
// ---------------------------------------------------------------------------
const recalcBudgetSpent = async (userId, categoryId) => {
  if (!categoryId) return;
  // categoryId may be a raw ObjectId or a populated sub-document — normalise.
  const catId = categoryId._id ?? categoryId;

  const [result] = await Expense.aggregate([
    { $match: { user: userId, category: catId } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  const spent = result ? result.total : 0;

  await Budget.updateOne(
    { user: userId, category: catId },
    { $set: { spent } }
  );
};

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
  const { walletId, ...rest } = req.body;
  const payload = { ...rest, user: req.user._id };

  // Link to wallet and deduct balance
  if (walletId) {
    const wallet = await Wallet.findOne({ _id: walletId, user: req.user._id });
    if (!wallet) {
      res.status(404);
      throw new Error('Wallet not found');
    }
    if (wallet.balance < Number(rest.amount)) {
      res.status(400);
      throw new Error('Insufficient wallet balance');
    }
    payload.wallet = wallet._id;
    wallet.balance -= Number(rest.amount);
    await wallet.save();
  }

  const expense = await Expense.create(payload);

  // Recalculate budget spent from source of truth
  if (expense.category) {
    await recalcBudgetSpent(req.user._id, expense.category);
  }

  await expense.populate('category', 'name icon color');
  sendSuccess(res, 201, 'Expense added', expense);
});

// @desc  Get expense by ID
// @route GET /api/expenses/:id
export const getExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findOne({ _id: req.params.id, user: req.user._id })
    .populate('category', 'name icon color');
  if (!expense) { res.status(404); throw new Error('Expense not found'); }
  sendSuccess(res, 200, 'Expense fetched', expense);
});

// @desc  Update expense
// @route PUT /api/expenses/:id
export const updateExpense = asyncHandler(async (req, res) => {
  // Fetch the old record BEFORE applying updates so we can capture the original
  // category (needed when the category changes during editing).
  const oldExpense = await Expense.findOne({ _id: req.params.id, user: req.user._id });
  if (!oldExpense) { res.status(404); throw new Error('Expense not found'); }

  const oldCategoryId = oldExpense.category; // raw ObjectId or null

  const updatedExpense = await Expense.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    req.body,
    { new: true, runValidators: true }
  ).populate('category', 'name icon color');

  // Always recalculate the old category's budget
  if (oldCategoryId) {
    await recalcBudgetSpent(req.user._id, oldCategoryId);
  }

  // If the category changed, also recalculate the new category's budget
  const newCatId = updatedExpense.category?._id ?? updatedExpense.category;
  if (newCatId && String(oldCategoryId) !== String(newCatId)) {
    await recalcBudgetSpent(req.user._id, newCatId);
  }

  sendSuccess(res, 200, 'Expense updated', updatedExpense);
});

// @desc  Delete expense
// @route DELETE /api/expenses/:id
export const deleteExpense = asyncHandler(async (req, res) => {
  // findOneAndDelete returns the deleted document, giving us its category
  const expense = await Expense.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!expense) { res.status(404); throw new Error('Expense not found'); }

  // Recalculate budget spent for the deleted expense's category
  if (expense.category) {
    await recalcBudgetSpent(req.user._id, expense.category);
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
