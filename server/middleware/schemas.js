/**
 * Issue #5 fix: Joi validation schemas wired to key POST/PUT endpoints.
 * These schemas are consumed by the validate() middleware.
 */
import Joi from 'joi';

// --- Auth schemas ---
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

// --- Expense schemas ---
export const expenseSchema = Joi.object({
  title: Joi.string().min(1).max(200).trim().required(),
  amount: Joi.number().positive().required(),
  date: Joi.date().iso().optional(),
  category: Joi.string().hex().length(24).optional(),
  paymentMethod: Joi.string().max(50).optional(),
  description: Joi.string().max(500).allow('').optional(),
  tags: Joi.array().items(Joi.string().max(50)).optional(),
}).unknown(false);

// --- Income schemas ---
export const incomeSchema = Joi.object({
  title: Joi.string().min(1).max(200).trim().required(),
  amount: Joi.number().positive().required(),
  date: Joi.date().iso().optional(),
  category: Joi.string().max(100).optional(),
  description: Joi.string().max(500).allow('').optional(),
}).unknown(false);

export const verifyRegistrationOtpSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
  otp: Joi.string().length(6).pattern(/^\d+$/).required(),
});

export const resendRegistrationOtpSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
});
