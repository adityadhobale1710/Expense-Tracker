import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
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

  // Issue #4 fix: use a Mongoose session + transaction to prevent the TOCTOU race
  // condition where two concurrent transfers from the same wallet can both pass
  // the balance check but together overdraw it. Atomic $inc ensures correctness.
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // Atomically deduct — the query filter { balance: { $gte: amount } } ensures
    // we only deduct if there's enough balance (no overdraw possible).
    const fromWallet = await Wallet.findOneAndUpdate(
      { _id: fromWalletId, user: req.user._id, balance: { $gte: amount } },
      { $inc: { balance: -amount } },
      { new: true, session, runValidators: true }
    );

    if (!fromWallet) {
      await session.abortTransaction();
      res.status(400);
      throw new Error('Insufficient balance or source wallet not found');
    }

    const toWallet = await Wallet.findOneAndUpdate(
      { _id: toWalletId, user: req.user._id },
      { $inc: { balance: amount } },
      { new: true, session, runValidators: true }
    );

    if (!toWallet) {
      await session.abortTransaction();
      res.status(404);
      throw new Error('Destination wallet not found');
    }

    // Record expense and income within the same transaction
    await Expense.create([{
      user: req.user._id,
      title: `Transfer to ${toWallet.name}`,
      amount,
      date: new Date(),
      paymentMethod: fromWallet.type === 'credit_card' ? 'card' : fromWallet.type === 'upi' ? 'upi' : 'other',
      description: note || `Transferred from ${fromWallet.name} to ${toWallet.name}`,
    }], { session });

    await Income.create([{
      user: req.user._id,
      title: `Transfer from ${fromWallet.name}`,
      amount,
      date: new Date(),
      category: 'Other Income',
      source: toWallet.name,
      description: note || `Transferred from ${fromWallet.name} to ${toWallet.name}`,
    }], { session });

    await session.commitTransaction();
    sendSuccess(res, 200, 'Funds transferred successfully', { fromWallet, toWallet });
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
});
