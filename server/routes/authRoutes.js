import express from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, logout, refreshToken, forgotPassword, resetPassword } from '../controllers/authController.js';

import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} from '../middleware/schemas.js';

const router = express.Router();

// Rate limiter for login: max 5 requests per 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.LOGIN_RATE_LIMIT || '5', 10),
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many failed login attempts. Please try again later.'
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// MASTER-035: Strict rate limiter for all OTP/password-reset sensitive endpoints.
// Max 5 attempts per 10 minutes per IP to block brute-force on 6-digit OTP tokens.
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: parseInt(process.env.OTP_RATE_LIMIT || '5', 10),
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many verification attempts. Please try again after 10 minutes.'
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', validate(registerSchema), register);
router.post('/login', loginLimiter, validate(loginSchema), login);
router.post('/logout', protect, logout);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', otpLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', otpLimiter, validate(resetPasswordSchema), resetPassword);

export default router;
