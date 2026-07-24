import express from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, logout, refreshToken, forgotPassword, resetPassword, verifyRegistrationOtp, resendRegistrationOtp } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { verifyRegistrationOtpSchema, resendRegistrationOtpSchema } from '../middleware/schemas.js';

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

// Rate limiter for OTP: max 5 requests per 10 minutes
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many verification attempts. Please try again after 10 minutes.'
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', register);
router.post('/login', loginLimiter, login);
router.post('/logout', protect, logout);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/verify-registration-otp', otpLimiter, validate(verifyRegistrationOtpSchema), verifyRegistrationOtp);
router.post('/resend-registration-otp', otpLimiter, validate(resendRegistrationOtpSchema), resendRegistrationOtp);

export default router;
