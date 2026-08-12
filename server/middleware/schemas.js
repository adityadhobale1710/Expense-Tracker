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

// ─── Expense schemas ──────────────────────────────────────────────────────────

// I4 fix: add max(10_000_000) to amount to prevent absurdly large submissions
export const expenseSchema = Joi.object({
  title: Joi.string().min(1).max(200).trim().required(),
  amount: Joi.number().positive().max(10_000_000).required(),
  date: Joi.date().iso().required(),
  category: Joi.string().hex().length(24).required(),
  // M5 fix: enforce the Expense model's paymentMethod enum up front. Previously
  // any arbitrary value (e.g. "UPI" uppercase, typo) sailed past Joi and hit the
  // Mongoose enum — wasted round-trip and, in the old order, the cause of a
  // wallet debit with no recorded expense. Client already sends lowercase.
  paymentMethod: Joi.string().valid('cash', 'card', 'upi', 'bank', 'other').required(),
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
  cost: Joi.number().min(0).max(1_000_000).required(),
  billingCycle: Joi.string().valid('monthly', 'yearly', 'weekly', 'quarterly').required(),
  renewalDate: Joi.date().iso().required(),
  reminder: Joi.boolean().optional(),
}).unknown(false);

// ─── Subscription update (M1: partial updates) ────────────────────────────────

export const subscriptionUpdateSchema = Joi.object({
  name: Joi.string().min(1).max(200).trim().optional(),
  cost: Joi.number().min(0).max(1_000_000).optional(),
  billingCycle: Joi.string().valid('monthly', 'yearly', 'weekly', 'quarterly').optional(),
  renewalDate: Joi.date().iso().optional(),
  reminder: Joi.boolean().optional(),
}).unknown(false);

// ─── Wallet update / balance (M1: PATCH + PUT) ────────────────────────────────

export const walletUpdateSchema = Joi.object({
  name: Joi.string().min(1).max(100).trim().optional(),
  type: Joi.string()
    .valid('cash', 'bank', 'upi', 'credit_card', 'debit_card', 'digital_wallet', 'business', 'crypto', 'gift_card')
    .optional(),
  balance: Joi.number().min(0).max(100_000_000).optional(),
  currency: Joi.string().valid('INR', 'USD', 'EUR', 'GBP').optional(),
  color: Joi.string().max(20).optional(),
  icon: Joi.string().max(10).optional(),
  isPrimary: Joi.boolean().optional(),
}).unknown(false);

export const walletBalanceSchema = Joi.object({
  balance: Joi.number().min(0).max(100_000_000).required(),
}).unknown(false);

// ─── Loan update / EMI (M1: partial updates + wallet deduction) ───────────────

export const loanUpdateSchema = Joi.object({
  name: Joi.string().min(1).max(200).trim().optional(),
  type: Joi.string().max(50).optional(),
  amount: Joi.number().positive().max(100_000_000).optional(),
  interestRate: Joi.number().min(0).max(100).optional(),
  durationMonths: Joi.number().integer().min(1).max(600).optional(),
  emiAmount: Joi.number().positive().max(10_000_000).optional(),
  remainingBalance: Joi.number().min(0).max(100_000_000).optional(),
  nextEmiDate: Joi.date().iso().optional(),
  paymentStatus: Joi.string().valid('paid', 'unpaid').optional(),
}).unknown(false);

export const payEmiSchema = Joi.object({
  walletId: Joi.string().hex().length(24).allow('').optional(),
}).unknown(false);

// ─── Goal schemas (M1: new) ───────────────────────────────────────────────────

export const goalCreateSchema = Joi.object({
  title: Joi.string().min(1).max(200).trim().required(),
  description: Joi.string().max(2000).allow('').optional(),
  category: Joi.string().max(100).allow('').optional(),
  targetAmount: Joi.number().positive().max(1_000_000_000).required(),
  savedAmount: Joi.number().min(0).max(1_000_000_000).optional(),
  targetDate: Joi.date().iso().required(),
  priority: Joi.string().valid('High', 'Medium', 'Low').optional(),
  color: Joi.string().max(20).allow('').optional(),
  icon: Joi.string().max(20).allow('').optional(),
  notes: Joi.string().max(2000).allow('').optional(),
}).unknown(false);

export const goalUpdateSchema = Joi.object({
  title: Joi.string().min(1).max(200).trim().optional(),
  description: Joi.string().max(2000).allow('').optional(),
  category: Joi.string().max(100).allow('').optional(),
  targetAmount: Joi.number().positive().max(1_000_000_000).optional(),
  savedAmount: Joi.number().min(0).max(1_000_000_000).optional(),
  targetDate: Joi.date().iso().optional(),
  priority: Joi.string().valid('High', 'Medium', 'Low').optional(),
  color: Joi.string().max(20).allow('').optional(),
  icon: Joi.string().max(20).allow('').optional(),
  uploadedIcon: Joi.string().max(500).allow('').optional(),
  notes: Joi.string().max(2000).allow('').optional(),
}).unknown(false);

export const goalStatusSchema = Joi.object({
  status: Joi.string().valid('Active', 'Paused', 'Archived', 'Completed').required(),
}).unknown(false);

export const goalContributionSchema = Joi.object({
  amount: Joi.number().positive().max(1_000_000_000).required(),
  walletId: Joi.string().hex().length(24).required(),
  note: Joi.string().max(500).allow('').optional(),
  date: Joi.date().iso().optional(),
  type: Joi.string().max(50).allow('').optional(),
}).unknown(false);

// ─── Bill schemas (M1: new) ───────────────────────────────────────────────────

export const billCreateSchema = Joi.object({
  title: Joi.string().min(1).max(200).trim().required(),
  amount: Joi.number().min(0).max(100_000_000).required(),
  category: Joi.string().min(1).max(100).trim().required(),
  dueDate: Joi.date().iso().required(),
  priority: Joi.string().valid('low', 'medium', 'high').optional(),
  recurring: Joi.boolean().optional(),
  frequency: Joi.string().valid('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'none').optional(),
  reminder: Joi.string()
    .valid('1_day_before', '2_days_before', '3_days_before', '1_week_before', 'none', 'custom')
    .optional(),
  customReminderDays: Joi.number().integer().min(0).max(365).optional(),
  paymentMethod: Joi.string().valid('cash', 'card', 'upi', 'bank', 'other').optional(),
  notes: Joi.string().max(2000).allow('').optional(),
  color: Joi.string().max(20).allow('').optional(),
  icon: Joi.string().max(20).allow('').optional(),
}).unknown(false);

export const billUpdateSchema = Joi.object({
  title: Joi.string().min(1).max(200).trim().optional(),
  amount: Joi.number().min(0).max(100_000_000).optional(),
  category: Joi.string().min(1).max(100).trim().optional(),
  dueDate: Joi.date().iso().optional(),
  priority: Joi.string().valid('low', 'medium', 'high').optional(),
  recurring: Joi.boolean().optional(),
  frequency: Joi.string().valid('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'none').optional(),
  reminder: Joi.string()
    .valid('1_day_before', '2_days_before', '3_days_before', '1_week_before', 'none', 'custom')
    .optional(),
  customReminderDays: Joi.number().integer().min(0).max(365).optional(),
  paymentMethod: Joi.string().valid('cash', 'card', 'upi', 'bank', 'other').optional(),
  notes: Joi.string().max(2000).allow('').optional(),
  color: Joi.string().max(20).allow('').optional(),
  icon: Joi.string().max(20).allow('').optional(),
}).unknown(false);

export const billPaySchema = Joi.object({
  notes: Joi.string().max(2000).allow('').optional(),
  walletId: Joi.string().hex().length(24).allow('').optional(),
}).unknown(false);

export const billPostponeSchema = Joi.object({
  days: Joi.number().integer().min(1).max(3650).optional(),
}).unknown(false);

export const billDuplicateSchema = Joi.object({
  newDueDate: Joi.date().iso().allow('').optional(),
}).unknown(false);

// ─── Investment schemas (M1: new) ─────────────────────────────────────────────

const investmentBase = {
  name: Joi.string().min(1).max(200).trim(),
  type: Joi.string().valid('stocks', 'mutual_funds', 'gold', 'crypto', 'fd', 'ppf', 'nps'),
  investedAmount: Joi.number().min(0).max(1_000_000_000),
  currentValue: Joi.number().min(0).max(1_000_000_000),
  symbol: Joi.string().max(50).allow(''),
  purchaseDate: Joi.date().iso(),
};

export const investmentCreateSchema = Joi.object({
  ...investmentBase,
  name: investmentBase.name.required(),
  type: investmentBase.type.required(),
  investedAmount: investmentBase.investedAmount.required(),
  purchaseDate: Joi.date().iso().optional(),
}).unknown(false);

export const investmentUpdateSchema = Joi.object(investmentBase).unknown(false);

// ─── Split-bill schemas (M1: new) ─────────────────────────────────────────────

export const splitCreateSchema = Joi.object({
  title: Joi.string().min(1).max(200).trim().required(),
  amount: Joi.number().min(0.01).max(100_000_000).required(),
  groupName: Joi.string().valid('Restaurant', 'Trip', 'Room Rent', 'Friends', 'Office').required(),
  members: Joi.array()
    .items(
      Joi.object({
        userEmail: Joi.string().email().max(200).required(),
        share: Joi.number().min(0).max(100_000_000),
        paid: Joi.boolean(),
        status: Joi.string().valid('pending', 'settled'),
      }).unknown(true)
    )
    .optional(),
}).unknown(false);

export const splitUpdateSchema = Joi.object({
  title: Joi.string().min(1).max(200).trim().optional(),
  amount: Joi.number().min(0.01).max(100_000_000).optional(),
  groupName: Joi.string().valid('Restaurant', 'Trip', 'Room Rent', 'Friends', 'Office').optional(),
  members: Joi.array()
    .items(
      Joi.object({
        userEmail: Joi.string().email().max(200).required(),
        share: Joi.number().min(0).max(100_000_000),
        paid: Joi.boolean(),
        status: Joi.string().valid('pending', 'settled'),
      }).unknown(true)
    )
    .optional(),
  status: Joi.string().valid('pending', 'settled').optional(),
}).unknown(false);

export const splitSettleSchema = Joi.object({
  memberEmail: Joi.string().email().max(200).required(),
}).unknown(false);

// ─── Family schemas (M1: new) ─────────────────────────────────────────────────

export const familyInviteSchema = Joi.object({
  email: Joi.string().email().max(200).required(),
  role: Joi.string().max(20).allow('').optional(),
}).unknown(false);

export const familyApprovalRequestSchema = Joi.object({
  title: Joi.string().min(1).max(200).trim().required(),
  amount: Joi.number().positive().max(1_000_000_000).required(),
  category: Joi.string().max(100).allow('').optional(),
}).unknown(false);

// ─── User profile schemas (M1: new) ───────────────────────────────────────────

export const updateMeSchema = Joi.object({
  name: Joi.string().min(2).max(60).trim().optional(),
  avatar: Joi.string().max(500).allow('').optional(),
  currency: Joi.string().valid('INR', 'USD', 'EUR', 'GBP').optional(),
  phone: Joi.string().max(20).allow('').optional(),
  company: Joi.string().max(100).allow('').optional(),
  twoFactorEnabled: Joi.boolean().optional(),
  alertSettings: Joi.object({
    lowBalance: Joi.boolean(),
    budgetExceeded: Joi.boolean(),
    weeklySummary: Joi.boolean(),
    monthlySummary: Joi.boolean(),
  }).unknown(true).optional(),
}).unknown(false);

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().min(1).max(128).required(),
  newPassword: Joi.string().min(6).max(128).required(),
}).unknown(false);

// ─── AI chat schema (M1: new — mirrors controller's 2000-char cap) ────────────

export const aiChatSchema = Joi.object({
  message: Joi.string().min(1).max(2000).required(),
}).unknown(false);
