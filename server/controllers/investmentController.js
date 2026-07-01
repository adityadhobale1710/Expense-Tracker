import asyncHandler from 'express-async-handler';
import Investment from '../models/Investment.js';
import { sendSuccess } from '../utils/apiResponse.js';

// @desc    Get all investments
// @route   GET /api/investments
export const getInvestments = asyncHandler(async (req, res) => {
  const investments = await Investment.find({ user: req.user._id });
  sendSuccess(res, 200, 'Investments retrieved successfully', investments);
});

// @desc    Create an investment
// @route   POST /api/investments
export const createInvestment = asyncHandler(async (req, res) => {
  const { name, type, investedAmount, currentValue, symbol, purchaseDate } = req.body;
  const investment = await Investment.create({
    user: req.user._id,
    name,
    type,
    investedAmount,
    currentValue: currentValue !== undefined ? currentValue : investedAmount,
    symbol,
    purchaseDate,
  });
  sendSuccess(res, 201, 'Investment logged successfully', investment);
});

// @desc    Update an investment
// @route   PUT /api/investments/:id
export const updateInvestment = asyncHandler(async (req, res) => {
  const { name, type, investedAmount, currentValue, symbol, purchaseDate } = req.body;
  const investment = await Investment.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { name, type, investedAmount, currentValue, symbol, purchaseDate },
    { new: true, runValidators: true }
  );
  if (!investment) {
    res.status(404);
    throw new Error('Investment not found');
  }
  sendSuccess(res, 200, 'Investment updated successfully', investment);
});

// @desc    Delete an investment
// @route   DELETE /api/investments/:id
export const deleteInvestment = asyncHandler(async (req, res) => {
  const investment = await Investment.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!investment) {
    res.status(404);
    throw new Error('Investment not found');
  }
  sendSuccess(res, 200, 'Investment deleted successfully');
});

// @desc    Get investment allocation and metrics
// @route   GET /api/investments/stats
export const getInvestmentStats = asyncHandler(async (req, res) => {
  const investments = await Investment.find({ user: req.user._id });

  let totalInvested = 0;
  let totalCurrentValue = 0;
  const allocation = {};

  investments.forEach((inv) => {
    totalInvested += inv.investedAmount;
    totalCurrentValue += inv.currentValue;
    allocation[inv.type] = (allocation[inv.type] || 0) + inv.currentValue;
  });

  const profitOrLoss = totalCurrentValue - totalInvested;
  const percentageReturn = totalInvested > 0 ? (profitOrLoss / totalInvested) * 100 : 0;

  // Format allocation to percentages
  const allocationPct = [];
  Object.keys(allocation).forEach((key) => {
    allocationPct.push({
      type: key,
      value: totalCurrentValue > 0 ? Math.round((allocation[key] / totalCurrentValue) * 100) : 0,
      amount: allocation[key],
    });
  });

  sendSuccess(res, 200, 'Investment statistics calculated', {
    totalInvested,
    totalCurrentValue,
    profitOrLoss,
    percentageReturn,
    allocation: allocationPct,
  });
});
