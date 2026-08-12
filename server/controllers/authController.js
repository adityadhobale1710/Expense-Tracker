import asyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Wallet from '../models/Wallet.js';
import Category from '../models/Category.js';
import Session from '../models/Session.js';

const createSessionRecord = async (userId, token, req) => {
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

    await Session.create({
      user: userId,
      token,
      deviceName,
      browser,
      os,
      ipAddress,
      isActive: true,
      lastActive: new Date()
    });
  } catch (err) {
    logger.error(`Failed to create active session log: ${err.message}`);
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
    if (existingUser.isEmailVerified === true || existingUser.isVerified === true) {
      res.status(400);
      throw new Error('User already exists with this email');
    }

    // AUDIT-AUTH-003: Reject re-registration of unverified emails.
    // Previously this path silently overwrote the user's password, allowing account hijacking.
    // Now we reject with 409 and direct the user to the resend-OTP flow.
    res.status(409);
    throw new Error('An account with this email is pending verification. Please check your inbox or use the resend OTP option.');
  }

  // Brand new user registration path
  const session = await mongoose.startSession();
  session.startTransaction();
  let user;
  let otp;
  try {
    [user] = await User.create([{ name, email, password, phone: phone || '', isEmailVerified: false }], { session });

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

    otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.registrationOtp = otp;
    user.registrationOtpExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save({ session });

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

  // ── Email is delivered AFTER commit (user record already persisted) ────────
  const emailHtml = getHtmlTemplate({
    title: 'Email Verification',
    greeting: `Welcome, ${user.name}`,
    body: 'Thank you for choosing us to track your expenses. To complete your registration and activate your account, please enter the 6-digit verification code below. This code is valid for 10 minutes.',
    code: otp,
    footerText: 'If you did not initiate this registration, you can safely ignore this email.',
  });

  const emailResult = await sendEmail({
    to: user.email,
    subject: 'Your verification code',
    html: emailHtml,
    text: `Hello ${user.name},\n\nThank you for registering with us. To activate your account, please use the following 6-digit verification code:\n\n${otp}\n\nThis code will expire in 10 minutes.\n\nIf you did not register, please ignore this email.`,
  });

  if (!emailResult.success && !emailResult.mocked) {
    // C1 fix: the account already exists in the DB — a 502 here only confuses the
    // client into showing "Network Error" and leaves an unverified account with no
    // actionable path. Respond 201 and direct the user to the resend-OTP flow.
    logger.error(`[register] SMTP delivery failed for ${user.email}: ${emailResult.error}`);
    return sendSuccess(res, 201,
      'Account created. We could not send the verification email right now — please use "Resend verification code".',
      { email: user.email, emailDelivered: false });
  }

  return sendSuccess(res, 201, 'Registration successful. Please verify the OTP sent to your email.', { email: user.email, emailDelivered: true });
});

// @desc  Login user
// @route POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    res.status(401);
    return res.json({
      success: false,
      // AUDIT-AUTH-004: Generic message to prevent user enumeration
      message: 'Invalid email or password'
    });
  }

  if (user.isDisabled || user.isBlocked || user.status === 'disabled' || user.status === 'blocked') {
    res.status(403);
    return res.json({
      success: false,
      message: 'Your account has been temporarily disabled. Please contact support.'
    });
  }

  // M17 fix: accept the legacy `isVerified` flag so pre-migration accounts that
  // were verified under the old field are not banned from login forever.
  const isVerified = user.isEmailVerified === true || user.isVerified === true;
  if (!isVerified) {
    res.status(403);
    return res.json({
      success: false,
      message: 'Please verify your email before logging in.',
      unverified: true
    });
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    res.status(401);
    return res.json({
      success: false,
      // AUDIT-AUTH-004: Same generic message — don't reveal whether email or password is wrong
      message: 'Invalid email or password'
    });
  }

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  user.refreshToken = refreshToken;
  await user.save();

  await createSessionRecord(user._id, accessToken, req);

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

  // Revoke current session
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer')) {
      const token = authHeader.split(' ')[1];
      await Session.findOneAndUpdate({ token, user: req.user._id }, { isActive: false });
    }
  } catch (err) {
    logger.error(`Failed to revoke session on logout: ${err.message}`);
  }

  // M-RC1 fix: clear with the SAME attributes the cookie was set with. In prod the
  // refresh cookie is Secure + SameSite=None (cross-site Vercel↔Render); a bare
  // clearCookie() writes a plain non-Secure Set-Cookie that browsers ignore when
  // overwriting a Secure cookie — leaving the stale refresh cookie on disk.
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
    // Re-throw the original JWT error so errorHandler classifies TokenExpiredError correctly
    throw err;
  }

  const user = await User.findById(decoded.id);

  if (!user || user.refreshToken !== token) {
    res.status(401);
    throw new Error('Invalid refresh token');
  }

  // MASTER-036: Blocked users must not be able to silently renew sessions
  if (user.isBlocked || user.isDisabled || user.status === 'disabled' || user.status === 'blocked') {
    res.status(403);
    throw new Error('Account has been disabled. Please contact support.');
  }

  const newAccessToken = generateAccessToken(user._id);
  const newRefreshToken = generateRefreshToken(user._id);
  user.refreshToken = newRefreshToken;
  await user.save();

  res.cookie('refreshToken', newRefreshToken, getRefreshCookieOptions());

  sendSuccess(res, 200, 'Token refreshed', {
    accessToken: newAccessToken,
  });
});

// @desc  Forgot Password - Send OTP
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
    return sendSuccess(res, 200, 'If that email is registered, a verification code has been sent');
  }

  // Generate 6-digit random token/OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Token expires in 15 minutes
  user.resetPasswordToken = otp;
  user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
  await user.save();

  // Send Email
  const emailHtml = getHtmlTemplate({
    title: 'Reset Password Code',
    greeting: `Hello ${user.name}`,
    body: 'We received a request to reset the password associated with your account. Please enter the verification code below to authorize the password change. This code is valid for 15 minutes.',
    code: otp,
    footerText: 'If you did not request a password reset, you can safely ignore this email or contact support if you have security concerns.',
  });

  // A4 fix: propagate SMTP failures — clear token so user must retry
  const emailResult = await sendEmail({
    to: user.email,
    subject: 'Your verification code',
    html: emailHtml,
    text: `Hello ${user.name},\n\nWe received a request to reset your password. Your 6-digit verification code is:\n\n${otp}\n\nThis code will expire in 15 minutes.\n\nIf you did not request this reset, please ignore this email.`,
  });

  if (!emailResult.success && !emailResult.mocked) {
    // Roll back the token so a stale OTP is not persisted without delivery
    user.resetPasswordToken = null;
    user.resetPasswordExpire = null;
    await user.save();
    logger.error(`[forgotPassword] SMTP delivery failed for ${user.email}: ${emailResult.error}`);
    res.status(502);
    throw new Error('Failed to send reset email. Please try again later.');
  }

  sendSuccess(res, 200, 'Verification code sent to email');
});

// @desc  Reset Password
// @route POST /api/auth/reset-password
export const resetPassword = asyncHandler(async (req, res) => {
  const { email, token, newPassword } = req.body;
  if (!email || !token || !newPassword) {
    res.status(400);
    throw new Error('Email, code, and new password are required');
  }

  const user = await User.findOne({
    email,
    resetPasswordToken: token,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    res.status(400);
    throw new Error('Invalid code/OTP or code has expired');
  }

  // Set new password
  user.password = newPassword;
  user.resetPasswordToken = null;
  user.resetPasswordExpire = null;
  await user.save();

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const confirmHtml = getHtmlTemplate({
    title: 'Password Updated',
    greeting: `Hello ${user.name}`,
    body: 'The password associated with your account has been successfully updated. You can now log in securely using your new credentials.',
    ctaText: 'Go to Login',
    ctaUrl: `${clientUrl}/login`,
    footerText: 'If you did not make this change, please contact support immediately to lock and secure your account.',
  });

  // Best-effort confirmation email — do not fail the reset if delivery fails
  await sendEmail({
    to: user.email,
    subject: 'Password successfully updated',
    html: confirmHtml,
    text: `Hello ${user.name},\n\nYour account password has been successfully updated. You can now log in using your new credentials at: ${clientUrl}/login\n\nIf you did not make this change, please contact support immediately.`,
  });

  sendSuccess(res, 200, 'Password has been reset successfully');
});

// @desc  Verify Registration OTP
// @route POST /api/auth/verify-registration-otp
export const verifyRegistrationOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  // A6 fix: validate inputs before querying DB
  if (!email || !otp) {
    res.status(400);
    throw new Error('Email and OTP are required');
  }

  const user = await User.findOne({
    email,
    registrationOtp: otp,
    registrationOtpExpire: { $gt: Date.now() },
  });

  if (!user) {
    res.status(400);
    throw new Error('Invalid or expired OTP');
  }

  user.isEmailVerified = true;
  user.isVerified = true;
  user.registrationOtp = null;
  user.registrationOtpExpire = null;

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  user.refreshToken = refreshToken;
  await user.save();

  await createSessionRecord(user._id, accessToken, req);

  res.cookie('refreshToken', refreshToken, getRefreshCookieOptions());

  sendSuccess(res, 200, 'Email verified successfully', {
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

// @desc  Resend Registration OTP
// @route POST /api/auth/resend-registration-otp
export const resendRegistrationOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (user.isEmailVerified || user.isVerified) {
    res.status(400);
    throw new Error('Email already verified, please log in');
  }

  // A5 fix: enforce 30-second cooldown between OTP resends
  if (user.registrationOtpExpire) {
    const otpAge = user.registrationOtpExpire.getTime() - (10 * 60 * 1000); // when it was generated
    const timeSinceGenerated = Date.now() - otpAge;
    if (timeSinceGenerated < OTP_RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - timeSinceGenerated) / 1000);
      res.status(429);
      throw new Error(`Please wait ${waitSeconds} second(s) before requesting a new code`);
    }
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.registrationOtp = otp;
  user.registrationOtpExpire = Date.now() + 10 * 60 * 1000;
  await user.save();

  const emailHtml = getHtmlTemplate({
    title: 'Email Verification',
    greeting: `Welcome, ${user.name}`,
    body: 'Thank you for choosing us to track your expenses. To complete your registration and activate your account, please enter the 6-digit verification code below. This code is valid for 10 minutes.',
    code: otp,
    footerText: 'If you did not initiate this registration, you can safely ignore this email.',
  });

  // A1 fix: propagate SMTP failures
  const emailResult = await sendEmail({
    to: user.email,
    subject: 'Your verification code',
    html: emailHtml,
    text: `Hello ${user.name},\n\nThank you for registering with us. To activate your account, please use the following 6-digit verification code:\n\n${otp}\n\nThis code will expire in 10 minutes.\n\nIf you did not register, please ignore this email.`,
  });

  if (!emailResult.success && !emailResult.mocked) {
    logger.error(`[resendRegistrationOtp] SMTP delivery failed for ${user.email}: ${emailResult.error}`);
    res.status(502);
    throw new Error('Failed to send verification email. Please try again later.');
  }

  sendSuccess(res, 200, 'A new verification code has been sent');
});
