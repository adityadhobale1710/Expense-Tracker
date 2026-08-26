import crypto from 'crypto';
import asyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Wallet from '../models/Wallet.js';
import Category from '../models/Category.js';
import Session from '../models/Session.js';
import SecurityLog from '../models/SecurityLog.js';

// Phase 3: returns created Session doc so sessionId can be embedded in the JWT.
// This replaces the fire-and-forget pattern — we need the _id before generating the token.
const createSessionRecord = async (userId, req) => {
  try {
    const userAgent = req.headers['user-agent'] || '';
    let os = 'Unknown OS';
    let browser = 'Unknown Browser';

    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Macintosh')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';

    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    let deviceName = `${os} PC (${browser} browser)`;
    if (os === 'Android' || os === 'iOS') {
      deviceName = `${os} Mobile Device`;
    }

    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

    // token field will be back-filled after JWT generation
    const session = await Session.create({
      user: userId,
      deviceName,
      browser,
      os,
      ipAddress,
      isActive: true,
      lastActive: new Date(),
    });
    return session;
  } catch (err) {
    logger.error(`Failed to create session record: ${err.message}`);
    return null;
  }
};

import { generateAccessToken, generateRefreshToken } from '../utils/generateToken.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { sendEmail, getHtmlTemplate } from '../utils/sendEmail.js';
import logger from '../utils/logger.js';

const DEFAULT_CATEGORIES = [
  { name: 'Food & Dining', icon: '🍔', color: '#f97316', type: 'expense' },
  { name: 'Transport', icon: '🚗', color: '#3b82f6', type: 'expense' },
  { name: 'Shopping', icon: '🛍️', color: '#ec4899', type: 'expense' },
  { name: 'Entertainment', icon: '🎬', color: '#8b5cf6', type: 'expense' },
  { name: 'Health', icon: '🏥', color: '#22c55e', type: 'expense' },
  { name: 'Utilities', icon: '💡', color: '#eab308', type: 'expense' },
  { name: 'Rent', icon: '🏠', color: '#14b8a6', type: 'expense' },
  { name: 'Education', icon: '📚', color: '#6366f1', type: 'expense' },
  { name: 'Other', icon: '📁', color: '#6b7280', type: 'expense' },
  { name: 'Salary', icon: '💼', color: '#22c55e', type: 'income' },
  { name: 'Freelance', icon: '💻', color: '#3b82f6', type: 'income' },
  { name: 'Investment', icon: '📈', color: '#f59e0b', type: 'income' },
  { name: 'Gift', icon: '🎁', color: '#ec4899', type: 'income' },
  { name: 'Award', icon: '🏆', color: '#eab308', type: 'income' },
  { name: 'Tips/Bonus', icon: '💵', color: '#10b981', type: 'income' },
  { name: 'Other Income', icon: '💰', color: '#6366f1', type: 'income' },
];

// OTP resend cooldown in milliseconds (30 seconds)
const OTP_RESEND_COOLDOWN_MS = 30 * 1000;

// C4 fix: refresh-token cookie options. The API (Render) and the SPA (Vercel)
// are different sites, so SameSite=Strict meant the browser never sent the
// refresh cookie cross-site → forced logout every 15 minutes. Production now
// uses SameSite=None (which requires Secure). SameSite=Strict stays for local
// dev where frontend/backend are same-site (localhost).
export const getRefreshCookieOptions = () => {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
};

// @desc  Register user
// @route POST /api/auth/register
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    res.status(400);
    throw new Error('User already exists with this email');
  }

  // Registration OTP flow
  const session = await mongoose.startSession();
  session.startTransaction();
  let user;
  try {
    [user] = await User.create([{ 
      name, 
      email, 
      password, 
      phone: phone || '', 
      isEmailVerified: true, 
      isVerified: true
    }], { session });

    // Seed default categories
    const cats = DEFAULT_CATEGORIES.map((c) => ({ ...c, user: user._id }));
    await Category.insertMany(cats, { session });

    // Seed default primary wallet
    await Wallet.create([{
      user: user._id,
      name: `${name.split(' ')[0]}'s Bank Account`,
      type: 'bank',
      balance: 0,
      currency: 'INR',
      color: '#6366f1',
      icon: '🏦',
      isPrimary: true,
    }], { session });

    await session.commitTransaction();
  } catch (error) {
    // C1 fix: never call abortTransaction() on a session whose transaction has
    // already been committed/ended — that throws MongoTransactionError and
    // masks the real failure with a leaked 502 stack trace.
    try {
      if (session.inTransaction()) await session.abortTransaction();
    } catch (abortErr) {
      logger.error(`[register] Failed to abort transaction: ${abortErr.message}`);
    }
    session.endSession();
    throw error;
  }
  session.endSession();

  return sendSuccess(res, 201, 'Account created successfully. You can now log in.', { email: user.email });
});

// ─── Helper: write a SecurityLog entry (best-effort, never throws) ─────────────
const writeSecurityLog = async (userId, action, req, details = '') => {
  try {
    const ipAddress =
      req.headers['x-forwarded-for']?.split(',')[0].trim() ||
      req.ip ||
      '127.0.0.1';
    await SecurityLog.create({ user: userId, action, ipAddress, details });
  } catch (err) {
    logger.error(`[SecurityLog] Failed to write '${action}': ${err.message}`);
  }
};

// @desc  Login user
// @route POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // X-Login-Mode: admin is an AUDIT SIGNAL ONLY — never used to grant access.
  // It tells the server the client intended admin login so we can log the outcome.
  const isAdminMode = req.headers['x-login-mode'] === 'admin';

  const user = await User.findOne({ email });
  if (!user) {
    res.status(401);
    return res.json({
      success: false,
      // AUDIT-AUTH-004: Generic message to prevent user enumeration
      message: 'Invalid email or password'
    });
  }

  if (user.isDisabled || user.isBlocked) {
    res.status(403);
    return res.json({
      success: false,
      message: 'Your account has been temporarily disabled. Please contact support.'
    });
  }

  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    // Phase 5: Burst detection (5+ fails in 1 hour)
    const recentFails = await SecurityLog.countDocuments({
      action: { $in: ['Admin Login Failed', 'Login Failed'] },
      ipAddress,
      timestamp: { $gte: new Date(Date.now() - 60 * 60 * 1000) }
    });
    const isBurst = recentFails >= 4;
    const burstTag = isBurst ? ' [BURST]' : '';

    const actionName = user.role === 'admin' ? 'Admin Login Failed' : 'Login Failed';
    await writeSecurityLog(
      user._id,
      actionName,
      req,
      `Invalid password supplied.${burstTag}`
    );

    res.status(401);
    return res.json({
      success: false,
      message: 'Invalid email or password'
    });
  }

  // ── Audit: valid non-admin account attempted admin login ─────────────────────
  // Only logged when the client explicitly indicated Admin Login mode AND
  // credentials are valid (so we've confirmed the account identity).
  if (isAdminMode && user.role !== 'admin') {
    await writeSecurityLog(
      user._id,
      'Admin Access Denied — Non-Admin Account',
      req,
      `Account ${user.email} attempted admin login but has role '${user.role}'.`
    );
  }

  // Phase 3: create session FIRST so we have the sessionId to embed in the JWT.
  // Session is created with placeholder token, then updated once the real token is generated.
  const sessionDoc = await createSessionRecord(user._id, req);

  const accessToken = generateAccessToken(user._id, {
    role: user.role,
    tokenVersion: user.tokenVersion || 0,
    sessionId: sessionDoc?._id || null,
  });
  const refreshToken = generateRefreshToken(user._id);
  user.refreshToken = refreshToken;
  await user.save();

  // ── Audit: successful admin login ────────────────────────────────────────────
  if (user.role === 'admin') {
    await writeSecurityLog(
      user._id,
      'Admin Login Success',
      req,
      `Admin account ${user.email} logged in successfully.`
    );
  }

  res.cookie('refreshToken', refreshToken, getRefreshCookieOptions());

  sendSuccess(res, 200, 'Login successful', {
    _id: user._id,
    name: user.name,
    email: user.email,
    currency: user.currency,
    avatar: user.avatar,
    role: user.role,
    phone: user.phone,
    company: user.company,
    twoFactorEnabled: user.twoFactorEnabled,
    xp: user.xp,
    coins: user.coins,
    level: user.level,
    streak: user.streak,
    longestStreak: user.longestStreak,
    // Issue 2 fix: include lifetimeXP and rank so AuthContext.user is fully
    // populated immediately after login — no fetchProfile() required to get these.
    lifetimeXP: user.lifetimeXP,
    rank: user.rank,
    unlockedTitles: user.unlockedTitles,
    unlockedAvatars: user.unlockedAvatars,
    unlockedThemes: user.unlockedThemes,
    simulatedActions: user.simulatedActions,
    achievements: user.achievements,
    accessToken,
  });
});

// @desc  Logout user
// @route POST /api/auth/logout
export const logout = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user) {
    user.refreshToken = null;
    await user.save();
  }

  // Phase 3: prefer sessionId claim for precise session lookup.
  // Falls back to token string match for legacy tokens without sessionId.
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer')) {
      // Phase 5: token is no longer stored in Session. Rely entirely on sessionId from middleware.
      const sessionId = req.user._sessionId; // set by protect middleware (Phase 3)
      if (sessionId) {
        await Session.findOneAndUpdate(
          { _id: sessionId, user: req.user._id },
          { isActive: false }
        );
      }
    }
  } catch (err) {
    logger.error(`Failed to revoke session on logout: ${err.message}`);
  }

  // M-RC1 fix: clear with the SAME attributes the cookie was set with.
  res.clearCookie('refreshToken', getRefreshCookieOptions());
  sendSuccess(res, 200, 'Logged out successfully');
});

// @desc  Refresh access token
// @route POST /api/auth/refresh-token
export const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    res.status(401);
    throw new Error('No refresh token provided');
  }

  // A3 fix: wrap jwt.verify in try/catch so expired/invalid tokens are handled gracefully
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    res.status(401);
    throw err;
  }

  const user = await User.findById(decoded.id);

  if (!user || user.refreshToken !== token) {
    res.status(401);
    throw new Error('Invalid refresh token');
  }

  // MASTER-036: Blocked users must not be able to silently renew sessions
  if (user.isBlocked || user.isDisabled) {
    res.status(403);
    throw new Error('Account has been disabled. Please contact support.');
  }

  // Phase 3: create a new session record and embed sessionId + tokenVersion in the new access token.
  // This ensures every refreshed token is tied to a trackable session.
  const newSessionDoc = await createSessionRecord(user._id, req);

  const newAccessToken = generateAccessToken(user._id, {
    role: user.role,
    tokenVersion: user.tokenVersion || 0,
    sessionId: newSessionDoc?._id || null,
  });
  const newRefreshToken = generateRefreshToken(user._id);
  user.refreshToken = newRefreshToken;
  await user.save();

  res.cookie('refreshToken', newRefreshToken, getRefreshCookieOptions());

  sendSuccess(res, 200, 'Token refreshed', {
    accessToken: newAccessToken,
  });
});

// @desc  Forgot Password - Send OTP (temporarily replaced with direct token)
// @route POST /api/auth/forgot-password
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400);
    throw new Error('Email is required');
  }

  const user = await User.findOne({ email });
  if (!user) {
    // AUDIT-AUTH-004: Generic response — do not reveal whether email is registered
    return sendSuccess(res, 200, 'If that email is registered, you can proceed to reset your password');
  }

  // Temporary development password-reset flow without email verification.
  // Restore email-based verification before production deployment.
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  // Token expires in 15 minutes
  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
  await user.save();

  sendSuccess(res, 200, 'Temporary reset token generated', { resetToken });
});

// @desc  Reset Password
// @route POST /api/auth/reset-password
export const resetPassword = asyncHandler(async (req, res) => {
  const { email, token, newPassword } = req.body;
  if (!email || !token || !newPassword) {
    res.status(400);
    throw new Error('Email, token, and new password are required');
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    email,
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    res.status(400);
    throw new Error('Invalid or expired reset token');
  }

  // Set new password
  user.password = newPassword;
  user.resetPasswordToken = null;
  user.resetPasswordExpire = null;
  user.refreshToken = null; // Clear refresh token
  user.tokenVersion = (user.tokenVersion || 0) + 1; // Invalidate sessions
  await user.save();

  // Invalidate all existing sessions in the database for this user
  try {
    await Session.updateMany({ user: user._id }, { isActive: false });
  } catch (err) {
    logger.error(`Failed to revoke sessions on password reset: ${err.message}`);
  }

  sendSuccess(res, 200, 'Password has been reset successfully');
});

