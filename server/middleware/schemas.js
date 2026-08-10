/**
 * Joi validation schemas wired to key POST/PUT endpoints.
 * These schemas are consumed by the validate() middleware.
 */
import Joi from 'joi';

// ─── Auth schemas ─────────────────────────────────────────────────────────────

export const registerSchema = Joi.object({
  name: Joi.string().min(2).max(60).trim().required(),
  email: Joi.string().email().lowercase().required(),
  password: Joi.string().min(6).max(128).required(),
  phone: Joi.string().max(20).allow('').optional(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
  password: Joi.string().min(1).required(),
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
});

export const resetPasswordSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
  token: Joi.string().length(6).pattern(/^\d+$/).required(),
  newPassword: Joi.string().min(6).max(128).required(),
});

export const verifyRegistrationOtpSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
  otp: Joi.string().length(6).pattern(/^\d+$/).required(),
});

export const resendRegistrationOtpSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
});

// ─── Expense schemas ──────────────────────────────────────────────────────────

// I4 fix: add max(10_000_000) to amount to prevent absurdly large submissions
export const expenseSchema = Joi.object({
  title: Joi.string().min(1).max(200).trim().required(),
  amount: Joi.number().positive().max(10_000_000).required(),
  date: Joi.date().iso().required(),
  category: Joi.string().hex().length(24).required(),
  paymentMethod: Joi.string().max(50).required(),
  description: Joi.string().max(500).allow('').optional(),
  tags: Joi.array().items(Joi.string().max(50)).optional(),
  walletId: Joi.string().hex().length(24).allow(null, '').optional(),
  receipt: Joi.string().max(1000).allow('').optional(),
}).unknown(false);

// ─── Budget schemas ───────────────────────────────────────────────────────────

// I3 fix: changed min(0) → min(1) to prevent division-by-zero in percentSpent virtual
export const budgetSchema = Joi.object({
  category: Joi.string().hex().length(24).required(),
  limit: Joi.number().min(1).max(10_000_000).required(),
  period: Joi.string().valid('weekly', 'monthly', 'yearly').optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().allow(null, '').optional(),
  alertThreshold: Joi.number().min(0).max(100).optional(),
}).unknown(false);

// ─── Income schemas ───────────────────────────────────────────────────────────

export const incomeSchema = Joi.object({
  title: Joi.string().min(1).max(200).trim().required(),
  amount: Joi.number().positive().max(10_000_000).required(),
  date: Joi.date().iso().required(),
  category: Joi.string().max(100).allow('').optional(),
  source: Joi.string().max(100).allow('').optional(),
  paymentMethod: Joi.string().valid('cash', 'card', 'upi', 'bank', 'other').allow('').optional(),
  description: Joi.string().max(500).allow('').optional(),
  // MASTER-014: Allow walletId so income can be linked to a wallet for balance tracking
  walletId: Joi.string().hex().length(24).allow(null, '').optional(),
}).unknown(false);

// ─── Wallet schemas (I5 fix: new) ─────────────────────────────────────────────

export const walletSchema = Joi.object({
  name: Joi.string().min(1).max(100).trim().required(),
  type: Joi.string()
    .valid('cash', 'bank', 'upi', 'credit_card', 'debit_card', 'digital_wallet', 'business', 'crypto', 'gift_card')
    .required(),
  balance: Joi.number().min(0).max(100_000_000).optional(),
  currency: Joi.string().valid('INR', 'USD', 'EUR', 'GBP').optional(),
  color: Joi.string().max(20).optional(),
  icon: Joi.string().max(10).optional(),
  isPrimary: Joi.boolean().optional(),
}).unknown(false);

export const walletTransferSchema = Joi.object({
  fromWalletId: Joi.string().hex().length(24).required(),
  toWalletId: Joi.string().hex().length(24).required(),
  amount: Joi.number().positive().max(10_000_000).required(),
  note: Joi.string().max(200).allow('').optional(),
}).unknown(false);

// ─── Loan schemas (I5 fix: new) ───────────────────────────────────────────────

export const loanSchema = Joi.object({
  name: Joi.string().min(1).max(200).trim().required(),
  type: Joi.string().max(50).required(),
  amount: Joi.number().positive().max(100_000_000).required(),
  interestRate: Joi.number().min(0).max(100).required(),
  durationMonths: Joi.number().integer().min(1).max(600).required(),
  emiAmount: Joi.number().positive().max(10_000_000).required(),
  remainingBalance: Joi.number().min(0).optional(),
  nextEmiDate: Joi.date().iso().optional(),
}).unknown(false);

// ─── Subscription schemas (I5 fix: new) ──────────────────────────────────────

export const subscriptionSchema = Joi.object({
  name: Joi.string().min(1).max(200).trim().required(),
  cost: Joi.number().positive().max(1_000_000).required(),
  billingCycle: Joi.string().valid('monthly', 'yearly', 'weekly', 'quarterly').required(),
  renewalDate: Joi.date().iso().required(),
  reminder: Joi.boolean().optional(),
}).unknown(false);
