import asyncHandler from 'express-async-handler';
import Wallet from '../models/Wallet.js';
import Expense from '../models/Expense.js';
import Income from '../models/Income.js';
import Loan from '../models/Loan.js';
import { sendSuccess } from '../utils/apiResponse.js';

// @desc    Get all wallets for user
// @route   GET /api/wallets
export const getWallets = asyncHandler(async (req, res) => {
  const wallets = await Wallet.find({ user: req.user._id }).sort({ isPrimary: -1, updatedAt: -1 });
  sendSuccess(res, 200, 'Wallets retrieved successfully', wallets);
});

// @desc    Get single wallet by ID
// @route   GET /api/wallets/:id
export const getWalletById = asyncHandler(async (req, res) => {
  const wallet = await Wallet.findOne({ _id: req.params.id, user: req.user._id });
  if (!wallet) {
    res.status(404);
    throw new Error('Wallet not found');
  }
  sendSuccess(res, 200, 'Wallet retrieved successfully', wallet);
});

// @desc    Create a new wallet
// @route   POST /api/wallets
export const createWallet = asyncHandler(async (req, res) => {
  const { name, type, balance, currency, color, icon, isPrimary } = req.body;

  // Check duplicate name for this user
  const existing = await Wallet.findOne({ user: req.user._id, name: { $regex: new RegExp(`^${name}$`, 'i') } });
  if (existing) {
    res.status(400);
    throw new Error('A wallet with this name already exists');
  }

  // If setting as primary, unset other primary wallets
  if (isPrimary) {
    await Wallet.updateMany({ user: req.user._id, isPrimary: true }, { isPrimary: false });
  }

  const wallet = await Wallet.create({
    user: req.user._id,
    name,
    type,
    balance: balance || 0,
    currency: currency || 'INR',
    color,
    icon,
    isPrimary: isPrimary || false,
  });
  sendSuccess(res, 201, 'Wallet created successfully', wallet);
});

// @desc    Update a wallet
// @route   PUT /api/wallets/:id
export const updateWallet = asyncHandler(async (req, res) => {
  const { name, type, balance, currency, color, icon, isPrimary } = req.body;

  const wallet = await Wallet.findOne({ _id: req.params.id, user: req.user._id });
  if (!wallet) {
    res.status(404);
    throw new Error('Wallet not found');
  }

  // Check duplicate name (exclude current wallet)
  if (name && name !== wallet.name) {
    const existing = await Wallet.findOne({
      user: req.user._id,
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      _id: { $ne: wallet._id },
    });
    if (existing) {
      res.status(400);
      throw new Error('A wallet with this name already exists');
    }
  }

  // If setting as primary, unset other primary wallets
  if (isPrimary && !wallet.isPrimary) {
    await Wallet.updateMany({ user: req.user._id, isPrimary: true }, { isPrimary: false });
  }

  wallet.name = name ?? wallet.name;
  wallet.type = type ?? wallet.type;
  wallet.balance = balance !== undefined ? balance : wallet.balance;
  wallet.currency = currency ?? wallet.currency;
  wallet.color = color ?? wallet.color;
  wallet.icon = icon ?? wallet.icon;
  wallet.isPrimary = isPrimary !== undefined ? isPrimary : wallet.isPrimary;

  await wallet.save();
  sendSuccess(res, 200, 'Wallet updated successfully', wallet);
});

// @desc    Delete a wallet
// @route   DELETE /api/wallets/:id
export const deleteWallet = asyncHandler(async (req, res) => {
  const wallet = await Wallet.findOne({ _id: req.params.id, user: req.user._id });
  if (!wallet) {
    res.status(404);
    throw new Error('Wallet not found');
  }

  // Prevent deleting primary wallet
  if (wallet.isPrimary) {
    res.status(400);
    throw new Error('Cannot delete the primary wallet. Set another wallet as primary first.');
  }

  // Check for active loans with remaining balance
  const activeLoans = await Loan.countDocuments({ user: req.user._id, remainingBalance: { $gt: 0 } });
  if (activeLoans > 0) {
    // Check if wallet has linked expenses from loan EMI payments
    const linkedEmiExpenses = await Expense.countDocuments({ user: req.user._id, wallet: wallet._id, title: { $regex: /^EMI Payment:/ } });
    if (linkedEmiExpenses > 0) {
      res.status(400);
      throw new Error('Cannot delete wallet linked with active EMI payments. Clear pending loans first.');
    }
  }

  // Check for linked transactions
  const [linkedExpenses, linkedIncomes] = await Promise.all([
    Expense.countDocuments({ user: req.user._id, wallet: wallet._id }),
    Income.countDocuments({ user: req.user._id, wallet: wallet._id }),
  ]);

  if (linkedExpenses > 0 || linkedIncomes > 0) {
    res.status(400);
    throw new Error(`Cannot delete wallet with ${linkedExpenses + linkedIncomes} linked transactions. Remove or reassign them first.`);
  }

  await Wallet.findByIdAndDelete(wallet._id);
  sendSuccess(res, 200, 'Wallet deleted successfully');
});

// @desc    Update wallet balance only
// @route   PATCH /api/wallets/:id/balance
export const updateBalance = asyncHandler(async (req, res) => {
  const { balance } = req.body;
  if (balance === undefined || balance === null) {
    res.status(400);
    throw new Error('Balance is required');
  }
  if (balance < 0) {
    res.status(400);
    throw new Error('Balance cannot be negative');
  }

  const wallet = await Wallet.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { balance },
    { new: true, runValidators: true }
  );
  if (!wallet) {
    res.status(404);
    throw new Error('Wallet not found');
  }
  sendSuccess(res, 200, 'Wallet balance updated successfully', wallet);
});

// @desc    Set wallet as primary
// @route   PATCH /api/wallets/:id/set-primary
export const setPrimary = asyncHandler(async (req, res) => {
  const wallet = await Wallet.findOne({ _id: req.params.id, user: req.user._id });
  if (!wallet) {
    res.status(404);
    throw new Error('Wallet not found');
  }

  // Unset all other primary wallets
  await Wallet.updateMany({ user: req.user._id, isPrimary: true }, { isPrimary: false });
  wallet.isPrimary = true;
  await wallet.save();

  sendSuccess(res, 200, 'Primary wallet updated successfully', wallet);
});

// @desc    Transfer funds between wallets
// @route   POST /api/wallets/transfer
export const transferFunds = asyncHandler(async (req, res) => {
  const { fromWalletId, toWalletId, amount, note } = req.body;

  if (!amount || amount <= 0) {
    res.status(400);
    throw new Error('Amount must be greater than zero');
  }

  if (fromWalletId === toWalletId) {
    res.status(400);
    throw new Error('Cannot transfer to the same wallet');
  }

  const [fromWallet, toWallet] = await Promise.all([
    Wallet.findOne({ _id: fromWalletId, user: req.user._id }),
    Wallet.findOne({ _id: toWalletId, user: req.user._id }),
  ]);

  if (!fromWallet || !toWallet) {
    res.status(404);
    throw new Error('One or both wallets not found');
  }

  if (fromWallet.balance < amount) {
    res.status(400);
    throw new Error('Insufficient wallet balance');
  }

  // Perform transfer
  fromWallet.balance -= amount;
  toWallet.balance += amount;

  await Promise.all([fromWallet.save(), toWallet.save()]);

  // Create transaction records
  const now = new Date();
  await Promise.all([
    Expense.create({
      user: req.user._id,
      title: `Transfer to ${toWallet.name}`,
      amount,
      date: now,
      wallet: fromWallet._id,
      paymentMethod: fromWallet.type === 'credit_card' ? 'card' : fromWallet.type === 'upi' ? 'upi' : 'other',
      description: note || `Transferred from ${fromWallet.name} to ${toWallet.name}`,
    }),
    Income.create({
      user: req.user._id,
      title: `Transfer from ${fromWallet.name}`,
      amount,
      date: now,
      wallet: toWallet._id,
      category: 'Other Income',
      source: toWallet.name,
      description: note || `Transferred from ${fromWallet.name} to ${toWallet.name}`,
    }),
  ]);

  sendSuccess(res, 200, 'Funds transferred successfully', { fromWallet, toWallet });
});

// @desc    Get wallet transaction history
// @route   GET /api/wallets/:id/history
export const getWalletHistory = asyncHandler(async (req, res) => {
  const wallet = await Wallet.findOne({ _id: req.params.id, user: req.user._id });
  if (!wallet) {
    res.status(404);
    throw new Error('Wallet not found');
  }

  const [expenses, incomes] = await Promise.all([
    Expense.find({ user: req.user._id, wallet: wallet._id }).sort({ date: -1 }).limit(50).lean(),
    Income.find({ user: req.user._id, wallet: wallet._id }).sort({ date: -1 }).limit(50).lean(),
  ]);

  const history = [
    ...expenses.map(e => ({ ...e, txType: 'expense' })),
    ...incomes.map(i => ({ ...i, txType: 'income' })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  sendSuccess(res, 200, 'Wallet history retrieved successfully', history);
});
