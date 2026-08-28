import mongoose from 'mongoose';
import asyncHandler from 'express-async-handler';
import Loan from '../models/Loan.js';
import Expense from '../models/Expense.js';
import Wallet from '../models/Wallet.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { invalidateAICache, CACHE_MODULES } from '../utils/CacheInvalidator.js';
import { awardBusinessXP } from '../services/gamificationService.js';

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
    throw new Error('Total Amount must be greater than 0');
  }

  const numInterestRate = Number(interestRate);
  if (isNaN(numInterestRate) || numInterestRate < 0) {
    res.status(400);
    throw new Error('Interest Rate must be greater than or equal to 0');
  }

  const numDuration = Number(durationMonths);
  if (!Number.isInteger(numDuration) || numDuration <= 0) {
    res.status(400);
    throw new Error('Duration must be a positive number of months');
  }

  const numEmi = Number(emiAmount);
  if (isNaN(numEmi) || numEmi <= 0) {
    res.status(400);
    throw new Error('EMI must be greater than 0');
  }

  const numRemaining = remainingBalance !== undefined ? Number(remainingBalance) : numAmount;
  if (isNaN(numRemaining) || numRemaining < 0) {
    res.status(400);
    throw new Error('Remaining Balance must be greater than or equal to 0');
  }
  if (numRemaining > numAmount) {
    res.status(400);
    throw new Error('Remaining Balance cannot be greater than Total Amount');
  }

  if (!nextEmiDate) {
    res.status(400);
    throw new Error('Next EMI Date is required');
  }
  const d = new Date(nextEmiDate);
  if (isNaN(d.getTime())) {
    res.status(400);
    throw new Error('Next EMI Date must be a valid date');
  }

  const loan = await Loan.create({
    user: req.user._id,
    name: name.trim(),
    type: type.trim(),
    amount: numAmount,
    interestRate: numInterestRate,
    durationMonths: numDuration,
    emiAmount: numEmi,
    remainingBalance: numRemaining,
    nextEmiDate: d,
  });
  await invalidateAICache(req.user._id, CACHE_MODULES.LOANS);

  try {
    await awardBusinessXP({ userId: req.user._id, actionId: 'ADD_LOAN', entityId: loan._id.toString() });
  } catch (err) {
    console.error('Gamification Add Loan failed:', err);
  }

  sendSuccess(res, 201, 'Loan logged successfully', loan);
});

// @desc    Update loan terms or balance
// @route   PUT /api/loans/:id
export const updateLoan = asyncHandler(async (req, res) => {
  const { name, type, amount, interestRate, durationMonths, emiAmount, remainingBalance, nextEmiDate, paymentStatus } = req.body;

  const existingLoan = await Loan.findOne({ _id: req.params.id, user: req.user._id });
  if (!existingLoan) {
    res.status(404);
    throw new Error('Loan not found');
  }

  // Calculate prospective final fields by merging request payload fields with existing document values
  const finalAmount = amount !== undefined ? Number(amount) : existingLoan.amount;
  const finalInterest = interestRate !== undefined ? Number(interestRate) : existingLoan.interestRate;
  const finalDuration = durationMonths !== undefined ? Number(durationMonths) : existingLoan.durationMonths;
  const finalEmi = emiAmount !== undefined ? Number(emiAmount) : existingLoan.emiAmount;
  const finalRemaining = remainingBalance !== undefined ? Number(remainingBalance) : existingLoan.remainingBalance;
  const finalNextEmiDate = nextEmiDate !== undefined ? nextEmiDate : existingLoan.nextEmiDate;

  // Validation checks on merged values
  if (isNaN(finalAmount) || finalAmount <= 0) {
    res.status(400);
    throw new Error('Total Amount must be greater than 0');
  }
  if (isNaN(finalInterest) || finalInterest < 0) {
    res.status(400);
    throw new Error('Interest Rate must be greater than or equal to 0');
  }
  if (isNaN(finalDuration) || finalDuration <= 0 || !Number.isInteger(finalDuration)) {
    res.status(400);
    throw new Error('Duration must be a positive number of months');
  }
  if (isNaN(finalEmi) || finalEmi <= 0) {
    res.status(400);
    throw new Error('EMI must be greater than 0');
  }
  if (isNaN(finalRemaining) || finalRemaining < 0) {
    res.status(400);
    throw new Error('Remaining Balance must be greater than or equal to 0');
  }
  if (finalRemaining > finalAmount) {
    res.status(400);
    throw new Error('Remaining Balance cannot be greater than Total Amount');
  }
  if (finalNextEmiDate) {
    const d = new Date(finalNextEmiDate);
    if (isNaN(d.getTime())) {
      res.status(400);
      throw new Error('Next EMI Date must be a valid date');
    }
  }

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (type !== undefined) updateData.type = type;
  if (amount !== undefined) updateData.amount = finalAmount;
  if (interestRate !== undefined) updateData.interestRate = finalInterest;
  if (durationMonths !== undefined) updateData.durationMonths = finalDuration;
  if (emiAmount !== undefined) updateData.emiAmount = finalEmi;
  if (remainingBalance !== undefined) updateData.remainingBalance = finalRemaining;
  if (nextEmiDate !== undefined) updateData.nextEmiDate = new Date(finalNextEmiDate);
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
  await invalidateAICache(req.user._id, CACHE_MODULES.LOANS);
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
  await invalidateAICache(req.user._id, CACHE_MODULES.LOANS);
  sendSuccess(res, 200, 'Loan log deleted successfully');
});

// @desc    Record an EMI payment towards loan
// @route   POST /api/loans/:id/pay-emi
export const payEmi = asyncHandler(async (req, res) => {
  const { walletId } = req.body;
  const session = await mongoose.startSession();
  session.startTransaction();

  let expense;
  let loan;
  try {
    loan = await Loan.findOne({ _id: req.params.id, user: req.user._id }).session(session);

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
      wallet = await Wallet.findOne({ _id: walletId, user: req.user._id }).session(session);
      if (!wallet) {
        res.status(404);
        throw new Error('Wallet not found');
      }
      if (wallet.balance < emiPaid) {
        res.status(400);
        throw new Error('Insufficient wallet balance for EMI payment');
      }
      wallet.balance = Math.round((wallet.balance - emiPaid) * 100) / 100;
      await wallet.save({ session });
    }

    loan.remainingBalance -= emiPaid;

    // Calculate next EMI date (plus 1 month)
    const currentNext = new Date(loan.nextEmiDate);
    currentNext.setMonth(currentNext.getMonth() + 1);
    loan.nextEmiDate = currentNext;

    if (loan.remainingBalance <= 0) {
      loan.paymentStatus = 'paid';
    }

    await loan.save({ session });

    // Create an expense for the EMI
    [expense] = await Expense.create([{
      user: req.user._id,
      title: `EMI Payment: ${loan.name}`,
      amount: emiPaid,
      date: new Date(),
      paymentMethod: 'bank',
      wallet: wallet ? wallet._id : undefined,
      description: `Monthly EMI repayment. Remaining loan balance is ₹${loan.remainingBalance}`,
    }], { session });

    await session.commitTransaction();
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    session.endSession();
    throw error;
  }
  session.endSession();

  try {
    await awardBusinessXP({ userId: req.user._id, actionId: 'PAY_EMI', entityId: expense._id.toString() });
    if (loan.remainingBalance <= 0) {
      await awardBusinessXP({ userId: req.user._id, actionId: 'PAYOFF_LOAN', entityId: loan._id.toString() });
    }
  } catch (err) {
    console.error('Gamification Pay EMI failed:', err);
  }

  sendSuccess(res, 200, 'EMI payment registered successfully', loan);
});
