import express from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, logout, refreshToken, forgotPassword, resetPassword } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Rate limiter for login: max 5 requests per 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many failed login attempts. Please try again later.'
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for register: max 3 registrations per hour per IP (Issue #2)
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many registration attempts. Please try again later.'
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for forgot-password: max 1 per 60 seconds per IP (Issue #2)
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Please wait 60 seconds before requesting another reset code.'
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for reset-password: max 5 attempts per 15 minutes per IP (Issue #2)
const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many reset attempts. Please try again later.'
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);
router.post('/logout', protect, logout);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
router.post('/reset-password', resetPasswordLimiter, resetPassword);

export default router;
