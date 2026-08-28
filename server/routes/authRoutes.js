import express from 'express';
import rateLimit from 'express-rate-limit';
import { 
  register, 
  login, 
  logout, 
  refreshToken, 
  forgotPassword, 
  resetPassword,
  googleAuth,
  googleCallback,
  verifyEmail,
  resendVerification
} from '../controllers/authController.js';

import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema
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

// Specific rate limiter for Google Auth to handle redirects properly
const googleLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.GOOGLE_RATE_LIMIT || '20', 10),
  handler: (req, res) => {
    const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim().replace(/\/$/, '');
    res.redirect(`${clientUrl}/login?googleAuth=error&message=${encodeURIComponent('Too many Google authentication attempts. Please try again later.')}`);
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// MASTER-035 (updated): The original single otpLimiter was shared across all OTP
// endpoints. This meant that testing /forgot-password or /resend-verification
// would consume the /verify-email quota, causing legitimate email verification
// attempts to receive 429 even though the user had not abused the verify endpoint.
//
// Each OTP surface now has its own independent limiter so exhausting one cannot
// block another. The per-account emailVerificationOtpAttempts >= 5 check in the
// controller remains the authoritative brute-force guard for /verify-email.

// A. Email OTP verification — /auth/verify-email
//    The controller already enforces a hard 5-attempt-per-OTP cap per account.
//    This IP limiter is a secondary backstop: 20 attempts per IP per 15 minutes
//    is enough for any single legitimate user (each OTP only needs 1 correct entry)
//    without blocking shared networks unfairly.
const emailVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.EMAIL_VERIFY_RATE_LIMIT || '20', 10),
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many verification attempts from this IP. Please try again after 15 minutes.'
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// B. Resend verification OTP — /auth/resend-verification
//    The controller enforces a 30-second per-account cooldown.
//    This IP limiter prevents bulk resend spam: 10 resend requests per IP per
//    15 minutes is generous for legitimate use while blocking abuse.
const verificationResendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RESEND_RATE_LIMIT || '10', 10),
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many resend requests from this IP. Please try again after 15 minutes.'
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// C. Password reset — /auth/forgot-password and /auth/reset-password
//    These have their own quota completely independent of email verification.
//    5 requests per 10 minutes per IP is strict enough to block brute-force OTP
//    guessing on the 6-digit reset token.
const passwordResetLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: parseInt(process.env.PASSWORD_RESET_RATE_LIMIT || '5', 10),
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many password reset attempts. Please try again after 10 minutes.'
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', validate(registerSchema), register);
router.post('/login', loginLimiter, validate(loginSchema), login);
router.post('/logout', protect, logout);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', passwordResetLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', passwordResetLimiter, validate(resetPasswordSchema), resetPassword);

// Email Verification endpoints
router.post('/verify-email', emailVerificationLimiter, validate(verifyEmailSchema), verifyEmail);
router.post('/resend-verification', verificationResendLimiter, validate(resendVerificationSchema), resendVerification);

// Google OAuth endpoints
router.get('/google', googleLimiter, googleAuth);
router.get('/google/callback', googleLimiter, googleCallback);

export default router;
