import asyncHandler from 'express-async-handler';
import Expense from '../models/Expense.js';
import Budget from '../models/Budget.js';
import Wallet from '../models/Wallet.js';
import Bill from '../models/Bill.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { invalidateAICache, CACHE_MODULES } from '../utils/CacheInvalidator.js';
import { awardBusinessXP } from '../services/gamificationService.js';

// ---------------------------------------------------------------------------
// Helper: Recalculate Budget.spent by summing all Expense amounts for a given
// user + category. This guarantees Budget.spent can never drift out of sync
// regardless of whether an expense is added, edited, or deleted.
// Only updates an EXISTING Budget document — never creates one (avoids
// incomplete documents missing required fields like `limit`).
// ---------------------------------------------------------------------------
const recalcBudgetSpent = async (userId, categoryId) => {
  // DEPRECATED: Budget spent is now dynamically aggregated based on active periods.
  // We no longer update a static `spent` field in the database.
  return;
};

// @desc  Get all expenses
// @route GET /api/expenses
export const getExpenses = asyncHandler(async (req, res) => {
  const { startDate, endDate, category, paymentMethod } = req.query;
  // B1 fix: parseInt to prevent NaN when string values are used in arithmetic
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  // Analytics (e.g. Payment Methods / Splits charts) requests limit: 1000 — allow
  // it so historical expenses beyond the first 100 rows are not silently truncated.
  const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const filter = { user: req.user._id, isTransfer: { $ne: true } };
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
    .limit(limit);

  // M10 fix: totalAmount is the sum across ALL matching expenses (not just the
  // paginated slice). The Expenses page previously summed only the loaded
  // 20-row slice, so the "Total Spent" card show a wrong lower number once a
  // user had more than one page of transactions.
  const [totalAmountAgg] = await Expense.aggregate([
    { $match: filter },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);

  // H8: tag expenses whose scheduled bill is due on that expense's own date.
  // A day-of-month match is used (anchored at "today's time = IST-date"), so a
  // monthly recurring bill surfaces on its anchor day regardless of how the
  // expense's date field is stored. Client surfaces these with a
  // "due today" badge on the via-Bill row.
  const billsForFlags = await Bill.find({ user: req.user._id, category: { $ne: null } });
  const billAnchorByCategory = new Map();
  billsForFlags.forEach((b) => {
    if (!billAnchorByCategory.has(String(b.category))) {
      billAnchorByCategory.set(String(b.category), new Date(b.dueDate));
    }
  });
  const expensesWithFlags = expenses.map((e) => {
    const doc = e.toObject ? e.toObject() : e;
    const catId = String(doc.category?._id ?? doc.category ?? '');
    const anchor = catId ? billAnchorByCategory.get(catId) : null;
    const d = doc.date ? new Date(doc.date) : null;
    let dueToday = false;
    if (anchor && d) {
      dueToday =
        anchor.getUTCDate() === d.getUTCDate() &&
        anchor.getUTCMonth() === d.getUTCMonth() &&
        anchor.getUTCFullYear() === d.getUTCFullYear();
    }
    return { ...doc, __billDue: !!anchor, __dueToday: dueToday };
  });

  sendSuccess(res, 200, 'Expenses fetched', {
    expenses: expensesWithFlags,
    total,
    totalAmount: totalAmountAgg ? totalAmountAgg.total : 0,
    page
  });
});

// @desc  Add expense
// @route POST /api/expenses
export const addExpense = asyncHandler(async (req, res) => {
  const { walletId, ...rest } = req.body;
  const payload = { ...rest, user: req.user._id };
  const amount = Number(rest.amount);

  // C5 fix: build the fully-validated document BEFORE touching any wallet.
  // Previously the wallet balance was deducted first and Expense.create() ran
  // afterwards — any validation/DB error (e.g. enum, CastError, transient
  // mongodb failure) left the wallet debited without the expense being
  // recorded: silent fund loss with no rollback. Now a wallet reference is
  // resolved/validated up front, the expense is created first, and the
  // deduction happens only after the expense is safely persisted. If the
  // deduct-step unexpectedly fails we refund the newly created expense.
  if (walletId) {
    const existing = await Wallet.findOne({ _id: walletId, user: req.user._id });
    if (!existing) {
      res.status(404);
      throw new Error('Wallet not found');
    }
    if (!(Number(existing.balance) >= amount)) {
      res.status(400);
      throw new Error('Insufficient wallet balance');
    }
    payload.wallet = walletId;
  }

  const expense = await Expense.create(payload);

  // Atomic deduct AFTER creation — funds only move once the expense exists.
  if (walletId) {
    const wallet = await Wallet.findOneAndUpdate(
      { _id: walletId, user: req.user._id, balance: { $gte: amount } },
      { $inc: { balance: -(Math.round(amount * 100) / 100) } },
      { new: true }
    );
    if (!wallet) {
      // Unexpected — refund the just-created expense and surface a clear error.
      await Expense.findByIdAndDelete(expense._id);
      res.status(400);
      throw new Error('Insufficient wallet balance');
    }
  }

  await expense.populate('category', 'name icon color');
  // Invalidate AI context caches affected by new expense (awaited so the next
  // AI/Insights read cannot consume the pre-mutation cache snapshot).
  await invalidateAICache(req.user._id, CACHE_MODULES.EXPENSE_ADD);
  
  // Gamification: Award XP securely
  try {
    const actionId = payload.receipt ? 'UPLOAD_RECEIPT' : 'ADD_EXPENSE';
    await awardBusinessXP({ userId: req.user._id, actionId, entityId: expense._id.toString() });
  } catch (err) {
    console.error('Gamification Add Expense failed:', err);
  }

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
  // category and wallet details (needed when the category or wallet changes during editing).
  const oldExpense = await Expense.findOne({ _id: req.params.id, user: req.user._id });
  if (!oldExpense) { res.status(404); throw new Error('Expense not found'); }

  const oldCategoryId = oldExpense.category; // raw ObjectId or null
  const oldWalletId = oldExpense.wallet;
  const oldAmount = Number(oldExpense.amount || 0);

  const newWalletId = req.body.walletId !== undefined
    ? (req.body.walletId || null)
    : (req.body.wallet !== undefined ? (req.body.wallet || null) : oldWalletId);

  const newAmount = req.body.amount !== undefined ? Number(req.body.amount) : oldAmount;

  // Map to target schema field 'wallet' for persistence
  req.body.wallet = newWalletId;
  delete req.body.walletId;

  // Atomic sequence for wallet balances
  if (newWalletId && String(oldWalletId) === String(newWalletId)) {
    // Case 1: Same wallet, amount changed
    if (newAmount !== oldAmount) {
      if (newAmount > oldAmount) {
        const diff = newAmount - oldAmount;
        const wallet = await Wallet.findOneAndUpdate(
          { _id: newWalletId, user: req.user._id, balance: { $gte: diff } },
          { $inc: { balance: -(Math.round(diff * 100) / 100) } }
        );
        if (!wallet) {
          const existing = await Wallet.findOne({ _id: newWalletId, user: req.user._id });
          if (!existing) { res.status(404); throw new Error('Wallet not found'); }
          res.status(400); throw new Error('Insufficient wallet balance');
        }
      } else {
        const diff = oldAmount - newAmount;
        await Wallet.findOneAndUpdate(
          { _id: newWalletId, user: req.user._id },
          { $inc: { balance: Math.round(diff * 100) / 100 } }
        );
      }
    }
  } else {
    // Case 2, 3, 4: Wallet changed, removed, or added
    if (newWalletId) {
      const existing = await Wallet.findOne({ _id: newWalletId, user: req.user._id });
      if (!existing) {
        res.status(404); throw new Error('Wallet not found');
      }
      if (existing.balance < newAmount) {
        res.status(400); throw new Error('Insufficient wallet balance');
      }
      // Deduct from new
      const deducted = await Wallet.findOneAndUpdate(
        { _id: newWalletId, user: req.user._id, balance: { $gte: newAmount } },
        { $inc: { balance: -(Math.round(newAmount * 100) / 100) } }
      );
      if (!deducted) {
        res.status(400); throw new Error('Insufficient wallet balance');
      }
    }

    if (oldWalletId) {
      // Refund old
      await Wallet.findOneAndUpdate(
        { _id: oldWalletId, user: req.user._id },
        { $inc: { balance: Math.round(oldAmount * 100) / 100 } }
      );
    }
  }

  // B2 fix: whitelist allowed update fields — prevents clients injecting 'user', '__v', etc.
  const allowedFields = ['title', 'amount', 'date', 'category', 'paymentMethod', 'description', 'tags', 'receipt', 'wallet'];
  const updateData = {};
  allowedFields.forEach((f) => { if (req.body[f] !== undefined) updateData[f] = req.body[f]; });

  const updatedExpense = await Expense.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    updateData,
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
    // Categorize reward
    if (!oldCategoryId) {
      try {
        await awardBusinessXP({ userId: req.user._id, actionId: 'CATEGORIZE_EXPENSE', entityId: updatedExpense._id.toString() });
      } catch (err) {
        console.error('Gamification Categorize Expense failed:', err);
      }
    }
  }

  await invalidateAICache(req.user._id, CACHE_MODULES.EXPENSE_ADD);
  sendSuccess(res, 200, 'Expense updated', updatedExpense);
});


// @desc  Delete expense
// @route DELETE /api/expenses/:id
export const deleteExpense = asyncHandler(async (req, res) => {
  // findOneAndDelete returns the deleted document, giving us its category and wallet
  const expense = await Expense.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!expense) { res.status(404); throw new Error('Expense not found'); }

  // Refund the expense amount to the associated wallet
  if (expense.wallet) {
    const refundAmount = Number(expense.amount || 0);
    await Wallet.findOneAndUpdate(
      { _id: expense.wallet, user: req.user._id },
      { $inc: { balance: Math.round(refundAmount * 100) / 100 } }
    );
  }

  // Recalculate budget spent for the deleted expense's category
  if (expense.category) {
    await recalcBudgetSpent(req.user._id, expense.category);
  }

  // Invalidate AI context caches affected by deleted expense (awaited — see above)
  await invalidateAICache(req.user._id, CACHE_MODULES.EXPENSE_ADD);
  sendSuccess(res, 200, 'Expense deleted');
});

// @desc  Monthly summary
// @route GET /api/expenses/summary
export const getExpenseSummary = asyncHandler(async (req, res) => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const summary = await Expense.aggregate([
    { $match: { user: req.user._id, date: { $gte: start, $lte: end }, isTransfer: { $ne: true } } },
    { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
  ]);

  sendSuccess(res, 200, 'Summary fetched', summary);
});
