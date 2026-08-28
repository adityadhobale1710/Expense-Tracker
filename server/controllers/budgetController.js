import asyncHandler from 'express-async-handler';
import Budget from '../models/Budget.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { invalidateAICache, CACHE_MODULES } from '../utils/CacheInvalidator.js';
import { awardBusinessXP } from '../services/gamificationService.js';
import Expense from '../models/Expense.js';
import { getBudgetPeriodDates } from '../utils/budgetDates.js';

export const getBudgets = asyncHandler(async (req, res) => {
  const budgets = await Budget.find({ user: req.user._id }).populate('category', 'name icon color').lean();
  
  for (let b of budgets) {
    const { startDate, endDate } = getBudgetPeriodDates(b);
    const [result] = await Expense.aggregate([
      { $match: { user: req.user._id, category: b.category._id, date: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    b.spent = result ? result.total : 0;
    // M4 fix: `.lean()` skips the schema's percentSpent virtual getter, so the
    // API returned no percentage. Compute it explicitly here.
    b.percentSpent = b.limit > 0 ? Math.round((b.spent / b.limit) * 100) : 0;
  }
  
  sendSuccess(res, 200, 'Budgets fetched', budgets);
});

export const createBudget = asyncHandler(async (req, res) => {
  const { category, limit, period, startDate, endDate, alertThreshold } = req.body;

  // B9 fix: prevent duplicate budgets for the same category
  const existing = await Budget.findOne({ user: req.user._id, category, period });
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
  await invalidateAICache(req.user._id, CACHE_MODULES.BUDGETS);

  try {
    await awardBusinessXP({ userId: req.user._id, actionId: 'CREATE_BUDGET', entityId: budget._id.toString() });
  } catch (err) {
    console.error('Gamification Create Budget failed:', err);
  }

  sendSuccess(res, 201, 'Budget created', budget);
});

export const getBudget = asyncHandler(async (req, res) => {
  const budget = await Budget.findOne({ _id: req.params.id, user: req.user._id }).populate('category', 'name icon color').lean();
  if (!budget) { res.status(404); throw new Error('Budget not found'); }
  
  const { startDate, endDate } = getBudgetPeriodDates(budget);
  const [result] = await Expense.aggregate([
    { $match: { user: req.user._id, category: budget.category._id, date: { $gte: startDate, $lte: endDate } } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  budget.spent = result ? result.total : 0;
  // M4 fix: `.lean()` skips the schema's percentSpent virtual getter.
  budget.percentSpent = budget.limit > 0 ? Math.round((budget.spent / budget.limit) * 100) : 0;
  
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
  await invalidateAICache(req.user._id, CACHE_MODULES.BUDGETS);
  sendSuccess(res, 200, 'Budget updated', budget);
});

export const deleteBudget = asyncHandler(async (req, res) => {
  const budget = await Budget.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!budget) { res.status(404); throw new Error('Budget not found'); }
  await invalidateAICache(req.user._id, CACHE_MODULES.BUDGETS);
  sendSuccess(res, 200, 'Budget deleted');
});

export const getBudgetAnalytics = asyncHandler(async (req, res) => {
  const budget = await Budget.findOne({ _id: req.params.id, user: req.user._id }).populate('category', 'name icon color').lean();
  if (!budget) { res.status(404); throw new Error('Budget not found'); }

  const { startDate, endDate } = getBudgetPeriodDates(budget);

  const expenses = await Expense.find({
    user: req.user._id,
    category: budget.category._id,
    date: { $gte: startDate, $lte: endDate }
  }).sort({ date: -1 });

  const actualSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const remaining = budget.limit - actualSpent;
  const utilizationPercent = budget.limit > 0 ? (actualSpent / budget.limit) * 100 : 0;
  
  const daysInPeriod = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  const daysPassed = Math.max(1, Math.ceil((new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  
  const activeRunRate = actualSpent / Math.min(daysInPeriod, daysPassed);
  
  let projectedBurnDate = null;
  if (activeRunRate > 0 && remaining > 0) {
    const daysUntilBurn = remaining / activeRunRate;
    projectedBurnDate = new Date();
    projectedBurnDate.setDate(projectedBurnDate.getDate() + daysUntilBurn);
  }

  const payload = {
    budgetId: budget._id,
    category: budget.category,
    period: budget.period,
    limit: budget.limit,
    actualSpent,
    remaining,
    utilizationPercent,
    expenseCount: expenses.length,
    spendingHistory: expenses,
    activeRunRate,
    projectedBurnDate
  };

  sendSuccess(res, 200, 'Budget analytics fetched', payload);
});

export const getGlobalBudgetAnalytics = asyncHandler(async (req, res) => {
  const budgets = await Budget.find({ user: req.user._id }).populate('category', 'name icon color').lean();
  
  const now = new Date();
  
  // Historical Trend - last 6 months global spending vs limits
  const monthlyTrendData = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
    const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    
    // Sum limits of all budgets
    const totalLimit = budgets.reduce((sum, b) => sum + b.limit, 0);
    const catIds = budgets.map(b => b.category._id);
    
    let totalSpent = 0;
    if (catIds.length > 0) {
      const [result] = await Expense.aggregate([
        { $match: { user: req.user._id, category: { $in: catIds }, date: { $gte: startOfMonth, $lte: endOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      totalSpent = result ? result.total : 0;
    }
    
    monthlyTrendData.push({
      name: d.toLocaleString('default', { month: 'short' }),
      Limit: totalLimit,
      Spent: totalSpent
    });
  }

  // Weekly pacing - last 4 weeks global spending
  const weeklySpendingData = [];
  for (let i = 3; i >= 0; i--) {
    const endOfWeek = new Date();
    endOfWeek.setDate(now.getDate() - (i * 7));
    endOfWeek.setHours(23, 59, 59, 999);
    const startOfWeek = new Date(endOfWeek);
    startOfWeek.setDate(startOfWeek.getDate() - 6);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const catIds = budgets.map(b => b.category._id);
    let totalSpent = 0;
    if (catIds.length > 0) {
      const [result] = await Expense.aggregate([
        { $match: { user: req.user._id, category: { $in: catIds }, date: { $gte: startOfWeek, $lte: endOfWeek } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      totalSpent = result ? result.total : 0;
    }
    
    weeklySpendingData.push({
      name: `Week ${4 - i}`,
      Spent: totalSpent
    });
  }

  sendSuccess(res, 200, 'Global budget analytics fetched', {
    monthlyTrendData,
    weeklySpendingData
  });
});
