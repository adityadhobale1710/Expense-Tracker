import asyncHandler from 'express-async-handler';
import Loan from '../models/Loan.js';
import Expense from '../models/Expense.js';
import Wallet from '../models/Wallet.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { invalidateAICache, CACHE_MODULES } from '../utils/CacheInvalidator.js';

// @desc    Get all loans
// @route   GET /api/loans
export const getLoans = asyncHandler(async (req, res) => {
  const loans = await Loan.find({ user: req.user._id });
  sendSuccess(res, 200, 'Loans retrieved successfully', loans);
});

// @desc    Create a new loan log
// @route   POST /api/loans
export const createLoan = asyncHandler(async (req, res) => {
  const { name, type, amount, interestRate, durationMonths, emiAmount, remainingBalance, nextEmiDate } = req.body;

  // D1 fix: validate required numeric fields at controller level
  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400);
    throw new Error('Loan name is required');
  }
  if (!type || typeof type !== 'string' || !type.trim()) {
    res.status(400);
    throw new Error('Loan type is required');
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    res.status(400);
    throw new Error('Loan amount must be a positive number');
  }

  const numInterestRate = Number(interestRate);
  if (isNaN(numInterestRate) || numInterestRate < 0 || numInterestRate > 100) {
    res.status(400);
    throw new Error('Interest rate must be between 0 and 100');
  }

  const numDuration = Number(durationMonths);
  if (!Number.isInteger(numDuration) || numDuration < 1) {
    res.status(400);
    throw new Error('Duration must be a positive integer (months)');
  }

  const numEmi = Number(emiAmount);
  if (isNaN(numEmi) || numEmi <= 0) {
    res.status(400);
    throw new Error('EMI amount must be a positive number');
  }

  const loan = await Loan.create({
    user: req.user._id,
    name: name.trim(),
    type: type.trim(),
    amount: numAmount,
    interestRate: numInterestRate,
    durationMonths: numDuration,
    emiAmount: numEmi,
    remainingBalance: remainingBalance !== undefined ? Number(remainingBalance) : numAmount,
    nextEmiDate: nextEmiDate || new Date(new Date().setMonth(new Date().getMonth() + 1)),
  });
  invalidateAICache(req.user._id, CACHE_MODULES.LOANS);
  sendSuccess(res, 201, 'Loan logged successfully', loan);
});

// @desc    Update loan terms or balance
// @route   PUT /api/loans/:id
export const updateLoan = asyncHandler(async (req, res) => {
  const { name, type, amount, interestRate, durationMonths, emiAmount, remainingBalance, nextEmiDate, paymentStatus } = req.body;

  // D2 fix: only include fields that were actually provided in the request body
  // Previously, all fields including undefined ones were spread into the update
  // causing existing DB values to be overwritten with undefined.
  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (type !== undefined) updateData.type = type;
  if (amount !== undefined) updateData.amount = Number(amount);
  if (interestRate !== undefined) updateData.interestRate = Number(interestRate);
  if (durationMonths !== undefined) updateData.durationMonths = Number(durationMonths);
  if (emiAmount !== undefined) updateData.emiAmount = Number(emiAmount);
  if (remainingBalance !== undefined) updateData.remainingBalance = Number(remainingBalance);
  if (nextEmiDate !== undefined) updateData.nextEmiDate = nextEmiDate;
  if (paymentStatus !== undefined) updateData.paymentStatus = paymentStatus;

  const loan = await Loan.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    updateData,
    { new: true, runValidators: true }
  );
  if (!loan) {
    res.status(404);
    throw new Error('Loan not found');
  }
  invalidateAICache(req.user._id, CACHE_MODULES.LOANS);
  sendSuccess(res, 200, 'Loan terms updated successfully', loan);
});

// @desc    Delete a loan
// @route   DELETE /api/loans/:id
export const deleteLoan = asyncHandler(async (req, res) => {
  const loan = await Loan.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!loan) {
    res.status(404);
    throw new Error('Loan not found');
  }
  invalidateAICache(req.user._id, CACHE_MODULES.LOANS);
  sendSuccess(res, 200, 'Loan log deleted successfully');
});

// @desc    Record an EMI payment towards loan
// @route   POST /api/loans/:id/pay-emi
export const payEmi = asyncHandler(async (req, res) => {
  const { walletId } = req.body;
  const loan = await Loan.findOne({ _id: req.params.id, user: req.user._id });

  if (!loan) {
    res.status(404);
    throw new Error('Loan not found');
  }

  if (loan.remainingBalance <= 0) {
    res.status(400);
    throw new Error('Loan is already fully repaid');
  }

  const emiPaid = Math.min(loan.emiAmount, loan.remainingBalance);

  // Deduct from wallet if provided
  let wallet = null;
  if (walletId) {
    wallet = await Wallet.findOne({ _id: walletId, user: req.user._id });
    if (!wallet) {
      res.status(404);
      throw new Error('Wallet not found');
    }
    if (wallet.balance < emiPaid) {
      res.status(400);
      throw new Error('Insufficient wallet balance for EMI payment');
    }
    wallet.balance -= emiPaid;
    await wallet.save();
  }

  loan.remainingBalance -= emiPaid;

  // Calculate next EMI date (plus 1 month)
  const currentNext = new Date(loan.nextEmiDate);
  currentNext.setMonth(currentNext.getMonth() + 1);
  loan.nextEmiDate = currentNext;

  if (loan.remainingBalance <= 0) {
    loan.paymentStatus = 'paid';
  }

  await loan.save();

  // Create an expense for the EMI
  await Expense.create({
    user: req.user._id,
    title: `EMI Payment: ${loan.name}`,
    amount: emiPaid,
    date: new Date(),
    paymentMethod: 'bank',
    wallet: wallet ? wallet._id : undefined,
    description: `Monthly EMI repayment. Remaining loan balance is ₹${loan.remainingBalance}`,
  });

  sendSuccess(res, 200, 'EMI payment registered successfully', loan);
});
