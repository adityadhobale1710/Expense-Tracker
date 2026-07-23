import asyncHandler from 'express-async-handler';
import Loan from '../models/Loan.js';
import Expense from '../models/Expense.js';
import Wallet from '../models/Wallet.js';
import { sendSuccess } from '../utils/apiResponse.js';

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
  const loan = await Loan.create({
    user: req.user._id,
    name,
    type,
    amount,
    interestRate,
    durationMonths,
    emiAmount,
    remainingBalance: remainingBalance !== undefined ? remainingBalance : amount,
    nextEmiDate: nextEmiDate || new Date(new Date().setMonth(new Date().getMonth() + 1)),
  });
  sendSuccess(res, 201, 'Loan logged successfully', loan);
});

// @desc    Update loan terms or balance
// @route   PUT /api/loans/:id
export const updateLoan = asyncHandler(async (req, res) => {
  const { name, type, amount, interestRate, durationMonths, emiAmount, remainingBalance, nextEmiDate, paymentStatus } = req.body;
  const loan = await Loan.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { name, type, amount, interestRate, durationMonths, emiAmount, remainingBalance, nextEmiDate, paymentStatus },
    { new: true, runValidators: true }
  );
  if (!loan) {
    res.status(404);
    throw new Error('Loan not found');
  }
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
