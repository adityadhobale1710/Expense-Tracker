import asyncHandler from 'express-async-handler';
import Goal from '../models/Goal.js';
import Expense from '../models/Expense.js';
import Wallet from '../models/Wallet.js';
import { sendSuccess } from '../utils/apiResponse.js';


// @desc    Get all savings goals
// @route   GET /api/goals
export const getGoals = asyncHandler(async (req, res) => {
  const goals = await Goal.find({ user: req.user._id });
  sendSuccess(res, 200, 'Goals retrieved successfully', goals);
});

// @desc    Create a new goal
// @route   POST /api/goals
export const createGoal = asyncHandler(async (req, res) => {
  const { name, targetAmount, deadline, category } = req.body;
  const goal = await Goal.create({
    user: req.user._id,
    name,
    targetAmount,
    deadline,
    category,
  });
  sendSuccess(res, 201, 'Goal created successfully', goal);
});

// @desc    Update a goal
// @route   PUT /api/goals/:id
export const updateGoal = asyncHandler(async (req, res) => {
  const { name, targetAmount, currentSaved, deadline, category, status } = req.body;
  const goal = await Goal.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { name, targetAmount, currentSaved, deadline, category, status },
    { new: true, runValidators: true }
  );
  if (!goal) {
    res.status(404);
    throw new Error('Goal not found');
  }
  sendSuccess(res, 200, 'Goal updated successfully', goal);
});

// @desc    Delete a goal
// @route   DELETE /api/goals/:id
export const deleteGoal = asyncHandler(async (req, res) => {
  const goal = await Goal.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!goal) {
    res.status(404);
    throw new Error('Goal not found');
  }
  sendSuccess(res, 200, 'Goal deleted successfully');
});

// @desc    Deposit funds into a savings goal
// @route   POST /api/goals/:id/deposit
export const depositToGoal = asyncHandler(async (req, res) => {
  const { amount, walletId, sourceWalletName } = req.body;

  if (amount <= 0) {
    res.status(400);
    throw new Error('Deposit amount must be positive');
  }

  const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });
  if (!goal) {
    res.status(404);
    throw new Error('Goal not found');
  }

  // Issue #4 fix: deduct deposit amount from wallet balance if walletId is provided
  let walletName = sourceWalletName || 'Primary Balance';
  if (walletId) {
    const wallet = await Wallet.findOne({ _id: walletId, user: req.user._id });
    if (!wallet) {
      res.status(404);
      throw new Error('Wallet not found');
    }
    if (wallet.balance < amount) {
      res.status(400);
      throw new Error('Insufficient wallet balance for this goal deposit');
    }
    wallet.balance = Math.max(0, wallet.balance - amount);
    await wallet.save();
    walletName = wallet.name;
  }

  goal.currentSaved += amount;
  if (goal.currentSaved >= goal.targetAmount) {
    goal.status = 'completed';
  }

  await goal.save();

  // Create an expense record for the savings allocation
  await Expense.create({
    user: req.user._id,
    title: `Allocation to goal: ${goal.name}`,
    amount,
    date: new Date(),
    paymentMethod: 'other',
    description: `Funds allocated from ${walletName}`,
  });

  sendSuccess(res, 200, 'Deposit registered successfully', goal);
});

