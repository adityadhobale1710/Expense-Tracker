import asyncHandler from 'express-async-handler';
import Wallet from '../models/Wallet.js';
import Expense from '../models/Expense.js';
import Income from '../models/Income.js';
import { sendSuccess } from '../utils/apiResponse.js';

// @desc    Get all wallets for user
// @route   GET /api/wallets
export const getWallets = asyncHandler(async (req, res) => {
  const wallets = await Wallet.find({ user: req.user._id });
  sendSuccess(res, 200, 'Wallets retrieved successfully', wallets);
});

// @desc    Create a new wallet
// @route   POST /api/wallets
export const createWallet = asyncHandler(async (req, res) => {
  const { name, type, balance, color, icon } = req.body;
  const wallet = await Wallet.create({
    user: req.user._id,
    name,
    type,
    balance: balance || 0,
    color,
    icon,
  });
  sendSuccess(res, 201, 'Wallet created successfully', wallet);
});

// @desc    Update a wallet
// @route   PUT /api/wallets/:id
export const updateWallet = asyncHandler(async (req, res) => {
  const { name, type, balance, color, icon } = req.body;
  const wallet = await Wallet.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { name, type, balance, color, icon },
    { new: true, runValidators: true }
  );
  if (!wallet) {
    res.status(404);
    throw new Error('Wallet not found');
  }
  sendSuccess(res, 200, 'Wallet updated successfully', wallet);
});

// @desc    Delete a wallet
// @route   DELETE /api/wallets/:id
export const deleteWallet = asyncHandler(async (req, res) => {
  const wallet = await Wallet.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!wallet) {
    res.status(404);
    throw new Error('Wallet not found');
  }
  sendSuccess(res, 200, 'Wallet deleted successfully');
});

// @desc    Transfer funds between wallets
// @route   POST /api/wallets/transfer
export const transferFunds = asyncHandler(async (req, res) => {
  const { fromWalletId, toWalletId, amount, note } = req.body;

  if (amount <= 0) {
    res.status(400);
    throw new Error('Amount must be greater than zero');
  }

  const fromWallet = await Wallet.findOne({ _id: fromWalletId, user: req.user._id });
  const toWallet = await Wallet.findOne({ _id: toWalletId, user: req.user._id });

  if (!fromWallet || !toWallet) {
    res.status(404);
    throw new Error('One or both wallets not found');
  }

  if (fromWallet.balance < amount) {
    res.status(400);
    throw new Error('Insufficient balance in source wallet');
  }

  // Perform transfer
  fromWallet.balance -= amount;
  toWallet.balance += amount;

  await fromWallet.save();
  await toWallet.save();

  // Create an expense for the source wallet and an income for the target wallet
  await Expense.create({
    user: req.user._id,
    title: `Transfer to ${toWallet.name}`,
    amount,
    date: new Date(),
    paymentMethod: fromWallet.type === 'credit_card' ? 'card' : fromWallet.type === 'upi' ? 'upi' : 'other',
    description: note || `Transferred from ${fromWallet.name} to ${toWallet.name}`,
  });

  await Income.create({
    user: req.user._id,
    title: `Transfer from ${fromWallet.name}`,
    amount,
    date: new Date(),
    category: 'Other Income',
    source: toWallet.name,
    description: note || `Transferred from ${fromWallet.name} to ${toWallet.name}`,
  });

  sendSuccess(res, 200, 'Funds transferred successfully', { fromWallet, toWallet });
});
