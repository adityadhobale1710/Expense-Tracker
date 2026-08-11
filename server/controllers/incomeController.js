import asyncHandler from 'express-async-handler';
import Income from '../models/Income.js';
import Wallet from '../models/Wallet.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { invalidateAICache, CACHE_MODULES } from '../utils/CacheInvalidator.js';
import { awardBusinessXP } from '../services/gamificationService.js';

// @desc  Get all incomes
// @route GET /api/income
export const getIncomes = asyncHandler(async (req, res) => {
  const { startDate, endDate, category } = req.query;
  // B3 fix: parseInt to prevent NaN
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  // Analytics requests limit: 1000 — allow it so
  // historical income beyond the first 100 rows is not silently truncated.
  const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit, 10) || 20));
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
    .limit(limit);

  sendSuccess(res, 200, 'Incomes fetched', { incomes, total, page });
});

// @desc  Add income
// @route POST /api/income
export const addIncome = asyncHandler(async (req, res) => {
  const { walletId, ...rest } = req.body;
  const payload = { ...rest, user: req.user._id };

  // Normalize: empty/missing paymentMethod falls back to the model default ('other')
  if (!payload.paymentMethod) delete payload.paymentMethod;

  // Link to wallet and update balance
  if (walletId) {
    const wallet = await Wallet.findOne({ _id: walletId, user: req.user._id });
    if (!wallet) {
      res.status(404);
      throw new Error('Wallet not found');
    }
    payload.wallet = wallet._id;
    wallet.balance += Number(rest.amount);
    await wallet.save();
  }

  const income = await Income.create(payload);

  await invalidateAICache(req.user._id, CACHE_MODULES.INCOME_ADD);
  
  // Gamification: Award XP securely
  try {
    await awardBusinessXP({ userId: req.user._id, actionId: 'ADD_INCOME', entityId: income._id.toString() });
  } catch (err) {
    console.error('Gamification Add Income failed:', err);
  }

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
  // Fetch the old record BEFORE applying updates so we can capture the original
  // wallet details and amount.
  const oldIncome = await Income.findOne({ _id: req.params.id, user: req.user._id });
  if (!oldIncome) {
    res.status(404);
    throw new Error('Income not found');
  }

  const oldWalletId = oldIncome.wallet;
  const oldAmount = Number(oldIncome.amount || 0);

  const newWalletId = req.body.walletId !== undefined
    ? (req.body.walletId || null)
    : (req.body.wallet !== undefined ? (req.body.wallet || null) : oldWalletId);

  const newAmount = req.body.amount !== undefined ? Number(req.body.amount) : oldAmount;

  // Map to target schema field 'wallet' for persistence
  req.body.wallet = newWalletId;
  delete req.body.walletId;

  if (newWalletId && String(oldWalletId) === String(newWalletId)) {
    // Case 1: Same wallet, amount changed
    if (newAmount !== oldAmount) {
      const wallet = await Wallet.findOne({ _id: newWalletId, user: req.user._id });
      if (!wallet) {
        res.status(404);
        throw new Error('Wallet not found');
      }
      if (newAmount > oldAmount) {
        wallet.balance += (newAmount - oldAmount);
      } else {
        // Tradeoff: Reducing income could theoretically push the balance below zero
        // if the user has already spent that money. We clamp at 0 rather than blocking.
        wallet.balance = Math.max(0, wallet.balance - (oldAmount - newAmount));
      }
      await wallet.save();
    }
  } else {
    // Case 2, 3, 4: Wallet changed, removed, or added
    if (oldWalletId) {
      const oldWallet = await Wallet.findOne({ _id: oldWalletId, user: req.user._id });
      if (oldWallet) {
        // Tradeoff: Reversing the old income subtracts from the wallet.
        // Clamp at 0 in case the balance is already spent.
        oldWallet.balance = Math.max(0, oldWallet.balance - oldAmount);
        await oldWallet.save();
      }
    }
    if (newWalletId) {
      const newWallet = await Wallet.findOne({ _id: newWalletId, user: req.user._id });
      if (!newWallet) {
        res.status(404);
        throw new Error('Wallet not found');
      }
      newWallet.balance += newAmount;
      await newWallet.save();
    }
  }

  // B4 fix: whitelist allowed update fields
  const allowedFields = ['title', 'amount', 'date', 'category', 'source', 'paymentMethod', 'description', 'wallet'];
  const updateData = {};
  allowedFields.forEach((f) => { if (req.body[f] !== undefined) updateData[f] = req.body[f]; });
  // Legacy incomes may have no paymentMethod. An empty value means "unchanged / not set"
  // and must NOT silently become 'other' — only an explicit user choice is stored.
  if (updateData.paymentMethod === '') delete updateData.paymentMethod;

  const income = await Income.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    updateData,
    { new: true, runValidators: true }
  );

  await invalidateAICache(req.user._id, CACHE_MODULES.INCOME_ADD);
  sendSuccess(res, 200, 'Income updated', income);
});


// @desc  Delete income
// @route DELETE /api/income/:id
export const deleteIncome = asyncHandler(async (req, res) => {
  const income = await Income.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!income) { res.status(404); throw new Error('Income not found'); }

  // Reverse the income addition on the wallet
  if (income.wallet) {
    const wallet = await Wallet.findOne({ _id: income.wallet, user: req.user._id });
    if (wallet) {
      // Tradeoff: Clamp balance at 0 to avoid negative numbers if the income was already spent.
      wallet.balance = Math.max(0, wallet.balance - Number(income.amount || 0));
      await wallet.save();
    }
  }

  await invalidateAICache(req.user._id, CACHE_MODULES.INCOME_ADD);
  sendSuccess(res, 200, 'Income deleted');
});
