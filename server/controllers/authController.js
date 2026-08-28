import asyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import Wallet from '../models/Wallet.js';
import Category from '../models/Category.js';
import Session from '../models/Session.js';
import SecurityLog from '../models/SecurityLog.js';
import bcrypt from 'bcryptjs';

const getOAuth2Client = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callbackUrl = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) are not configured.');
  }

  return new OAuth2Client(clientId, clientSecret, callbackUrl);
};

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
import { sendEmail, getHtmlTemplate, escapeHtml } from '../utils/sendEmail.js';
import logger from '../utils/logger.js';

export const createAuthenticatedSession = async (user, req, res, authMethod = 'Password') => {
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  user.refreshToken = refreshToken;
  await user.save();

  await createSessionRecord(user._id, accessToken, req);

  // Security Log
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    await SecurityLog.create({
      user: user._id,
      action: `${authMethod} Login Success`,
      ipAddress,
      details: req.headers['user-agent'] || ''
    });
  } catch (err) {
    logger.error(`Failed to record login security log: ${err.message}`);
  }

  // Set the HttpOnly refresh cookie — this is the session carrier for all auth paths.
  // The access token is returned in the JSON payload for email/password login and
  // retrieved via /auth/refresh-token for the OAuth redirect path. It is NEVER
  // placed in a URL query parameter or redirect URL.
  res.cookie('refreshToken', refreshToken, getRefreshCookieOptions());

  // SEC-001: accessToken is NOT included in userData to prevent it from being
  // accidentally serialized into URLs, logs, or localStorage in contexts where
  // only the user profile is needed (e.g. OAuth callback redirect).
  // The email/password login path receives accessToken separately from userData.
  const userData = {
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
  };

  return { accessToken, refreshToken, userData };
};

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
      isEmailVerified: false, 
      isVerified: false,
      otpVerified: false
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
    try {
      if (session.inTransaction()) await session.abortTransaction();
    } catch (abortErr) {
      logger.error(`[register] Failed to abort transaction: ${abortErr.message}`);
    }
    session.endSession();
    throw error;
  }
  session.endSession();

  // Generate OTP
  const otp = crypto.randomInt(100000, 999999).toString();
  const salt = await bcrypt.genSalt(10);
  const otpHash = await bcrypt.hash(otp, salt);

  user.emailVerificationOtpHash = otpHash;
  user.emailVerificationOtpExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  user.emailVerificationOtpAttempts = 0;
  user.emailVerificationLastSentAt = Date.now();
  await user.save();

  // Send Email
  const emailHtml = getHtmlTemplate({
    title: 'Verify your Expense Tracker email',
    greeting: `Hello ${escapeHtml(user.name)}`,
    body: 'Welcome to Expense Tracker! Please use the 6-digit verification code below to verify your email address. This code is valid for 10 minutes.',
    code: otp,
    footerText: 'If you did not create this account, you can safely ignore this email.',
  });

  const emailResult = await sendEmail({
    to: user.email,
    subject: 'Verify your Expense Tracker email',
    html: emailHtml,
    text: `Hello ${user.name},\n\nWelcome to Expense Tracker! Your 6-digit verification code is:\n\n${otp}\n\nThis code will expire in 10 minutes.\n\nIf you did not create this account, please ignore this email.`,
  });

  if (!emailResult.success && (!emailResult.mocked || emailResult.deliveryFailed)) {
    user.emailVerificationOtpHash = null;
    user.emailVerificationOtpExpire = null;
    user.emailVerificationOtpAttempts = 0;
    user.emailVerificationLastSentAt = null;
    await user.save();
    res.status(502);
    throw new Error('Failed to send verification email. Please try again later.');
  }

  return sendSuccess(res, 201, 'Account created successfully. Please verify your email.', { email: user.email });
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

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    res.status(401);
    return res.json({
      success: false,
      // AUDIT-AUTH-004: Same generic message — don't reveal whether email or password is wrong
      message: 'Invalid email or password'
    });
  }

  // Verification guard for local accounts
  if (user.authProvider === 'local' && user.isEmailVerified === false && user.isVerified === false) {
    res.status(403);
    return res.json({
      success: false,
      message: 'Your email address is not verified.',
      requiresVerification: true,
      email: user.email
    });
  }

  const sessionData = await createAuthenticatedSession(user, req, res, 'Password');

  // SEC-001: Return the access token separately from userData so AuthContext can
  // store it in localStorage while keeping userData clean of bearer tokens.
  sendSuccess(res, 200, 'Login successful', {
    ...sessionData.userData,
    accessToken: sessionData.accessToken,
  });
});

// @desc  Initiate Google OAuth flow
// @route GET /api/auth/google
export const googleAuth = asyncHandler(async (req, res) => {
  try {
    const oauth2Client = getOAuth2Client();

    // Generate random CSRF state token
    const state = crypto.randomBytes(16).toString('hex');
    const isProd = process.env.NODE_ENV === 'production';

    res.cookie('oauth_state', state, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 10 * 60 * 1000, // 10 minutes
    });

    const authorizeUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
      state,
      prompt: 'select_account',
    });

    res.redirect(authorizeUrl);
  } catch (error) {
    logger.error(`Google auth initialization error: ${error.message}`);
    const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim().replace(/\/$/, '');
    res.redirect(`${clientUrl}/login?googleAuth=error&message=${encodeURIComponent(error.message || 'Google OAuth is not configured on the server.')}`);
  }
});

// @desc  Google OAuth Callback Handler
// @route GET /api/auth/google/callback
export const googleCallback = asyncHandler(async (req, res) => {
  const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim().replace(/\/$/, '');
  const isProd = process.env.NODE_ENV === 'production';
  const stateCookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
  };

  const { code, error, state } = req.query;

  // Clear CSRF cookie
  const savedState = req.cookies?.oauth_state;
  res.clearCookie('oauth_state', stateCookieOptions);

  if (error) {
    logger.warn(`Google OAuth response contained error: ${error}`);
    const msg = error === 'access_denied' ? 'Google Sign-In was cancelled.' : 'Google authentication failed.';
    return res.redirect(`${clientUrl}/login?googleAuth=error&message=${encodeURIComponent(msg)}`);
  }

  if (!code) {
    return res.redirect(`${clientUrl}/login?googleAuth=error&message=${encodeURIComponent('No authorization code received from Google.')}`);
  }

  // Verify OAuth state token.
  // SEC-003: Reject the callback if savedState is absent (cookie not sent — could
  // indicate SameSite blockage or a CSRF attempt without prior /google initiation)
  // or if it doesn't match the state returned by Google.
  if (!savedState || !state || savedState !== state) {
    logger.warn(`OAuth state validation failed — savedState: ${savedState ? 'present' : 'absent'}, state: ${state ? 'present' : 'absent'}, match: ${savedState === state}`);
    return res.redirect(`${clientUrl}/login?googleAuth=error&message=${encodeURIComponent('Security validation failed. Please try signing in again.')}`);
  }

  let googleUser;
  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    googleUser = ticket.getPayload();
  } catch (err) {
    logger.error(`Google token verification failed: ${err.message}`);
    return res.redirect(`${clientUrl}/login?googleAuth=error&message=${encodeURIComponent('Failed to verify Google identity. Please try again.')}`);
  }

  // SEC-004: Require a verified email from Google.
  // google-auth-library's verifyIdToken() already validates audience, issuer, and
  // expiration via Google's public keys. email_verified additionally confirms that
  // Google has verified the user owns this email address — only stable sub + verified
  // email are safe to use for account matching/linking.
  if (!googleUser || !googleUser.email || !googleUser.email_verified) {
    return res.redirect(`${clientUrl}/login?googleAuth=error&message=${encodeURIComponent('Google account email is not verified. Please verify your Google account email first.')}`);
  }

  // Only stable, Google-verified identity fields are used for account matching:
  //   - sub: permanent unique identifier assigned by Google (never changes)
  //   - email: verified by Google (email_verified = true enforced above)
  // name and picture are NOT used for matching — only for display/avatar.
  const { sub: googleId, email, name, picture } = googleUser;
  const normalizedEmail = email.toLowerCase().trim();


  // Find user by googleId or email
  let user = await User.findOne({
    $or: [{ googleId }, { email: normalizedEmail }]
  });

  if (user) {
    // Existing user: Link Google identity if not already linked.
    // Only googleId and authProvider are updated — existing password, transactions,
    // wallets, categories, security settings, and all data are preserved untouched.
    let needsSave = false;
    if (!user.googleId) {
      user.googleId = googleId;
      // ARCH-006: 'both' accurately represents a local account that has been linked
      // to Google. 'local' would be incorrect because the account now supports Google
      // sign-in in addition to its existing password.
      user.authProvider = user.authProvider === 'local' ? 'both' : user.authProvider;
      needsSave = true;
    }
    if (!user.avatar && picture) {
      user.avatar = picture;
      needsSave = true;
    }
    if (!user.isEmailVerified || !user.isVerified) {
      user.isEmailVerified = true;
      user.isVerified = true;
      needsSave = true;
    }
    if (needsSave) {
      await user.save();
    }
  } else {
    // New User: Create account and seed defaults
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const displayName = name || normalizedEmail.split('@')[0];
      [user] = await User.create([{
        name: displayName,
        email: normalizedEmail,
        googleId,
        authProvider: 'google',
        avatar: picture || '',
        isEmailVerified: true,
        isVerified: true
      }], { session });

      // Seed default categories
      const cats = DEFAULT_CATEGORIES.map((c) => ({ ...c, user: user._id }));
      await Category.insertMany(cats, { session });

      // Seed default primary wallet
      await Wallet.create([{
        user: user._id,
        name: `${displayName.split(' ')[0]}'s Bank Account`,
        type: 'bank',
        balance: 0,
        currency: 'INR',
        color: '#6366f1',
        icon: '🏦',
        isPrimary: true,
      }], { session });

      await session.commitTransaction();
    } catch (createErr) {
      try {
        if (session.inTransaction()) await session.abortTransaction();
      } catch (abortErr) {
        logger.error(`[googleCallback] Transaction abort failed: ${abortErr.message}`);
      }
      session.endSession();
      logger.error(`Failed to create Google user: ${createErr.message}`);
      return res.redirect(`${clientUrl}/login?googleAuth=error&message=${encodeURIComponent('Failed to create account with Google.')}`);
    }
    session.endSession();
  }

  // Account status check
  if (user.isDisabled || user.isBlocked || user.status === 'disabled' || user.status === 'blocked') {
    return res.redirect(`${clientUrl}/login?googleAuth=error&message=${encodeURIComponent('Your account has been temporarily disabled. Please contact support.')}`);
  }

  // Reuse existing session/token/cookie creation.
  // The HttpOnly refresh cookie is set inside createAuthenticatedSession.
  // SEC-001: The access token and user data are NOT placed in the redirect URL.
  // The frontend receives the authenticated session by calling /auth/refresh-token
  // using the HttpOnly refresh cookie that was just set on this response.
  await createAuthenticatedSession(user, req, res, 'Google');

  // Redirect directly to the dashboard — no token or user data in the URL.
  // The frontend's existing auth initialization will call /auth/refresh-token on
  // load, receive a fresh access token, and hydrate AuthContext normally.
  return res.redirect(`${clientUrl}/dashboard`);
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
    greeting: `Hello ${escapeHtml(user.name)}`,
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

  if (!emailResult.success && (!emailResult.mocked || emailResult.deliveryFailed)) {
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
    greeting: `Hello ${escapeHtml(user.name)}`,
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

// @desc  Verify Email OTP
// @route POST /api/auth/verify-email
export const verifyEmail = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    res.status(400);
    throw new Error('Email and OTP are required');
  }

  const user = await User.findOne({ email });
  if (!user) {
    res.status(400);
    throw new Error('Invalid verification request');
  }

  // If already verified
  if (user.isEmailVerified || user.isVerified) {
    return sendSuccess(res, 200, 'Your email is already verified. You can log in.');
  }

  if (!user.emailVerificationOtpHash) {
    res.status(400);
    throw new Error('No verification code requested. Please request a new code.');
  }

  if (user.emailVerificationOtpExpire < Date.now()) {
    res.status(400);
    throw new Error('This verification code has expired. Please request a new code.');
  }

  if (user.emailVerificationOtpAttempts >= 5) {
    user.emailVerificationOtpHash = null;
    user.emailVerificationOtpExpire = null;
    await user.save();
    res.status(429);
    throw new Error('Too many verification attempts. Please request a new code.');
  }

  const isMatch = await bcrypt.compare(otp, user.emailVerificationOtpHash);
  if (!isMatch) {
    user.emailVerificationOtpAttempts += 1;
    await user.save();
    res.status(400);
    throw new Error('Invalid verification code. Please check the code and try again.');
  }

  // Success
  user.isEmailVerified = true;
  user.isVerified = true;
  user.otpVerified = true;
  user.emailVerificationOtpHash = null;
  user.emailVerificationOtpExpire = null;
  user.emailVerificationOtpAttempts = 0;
  user.emailVerificationLastSentAt = null;
  await user.save();

  sendSuccess(res, 200, 'Email verified successfully. You can now log in.');
});

// @desc  Resend Verification OTP
// @route POST /api/auth/resend-verification
export const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400);
    throw new Error('Email is required');
  }

  const user = await User.findOne({ email });
  if (!user) {
    return sendSuccess(res, 200, 'If this email is registered, a new verification code has been sent.');
  }

  if (user.isEmailVerified || user.isVerified) {
    return sendSuccess(res, 200, 'Your email is already verified. You can log in.');
  }

  if (user.emailVerificationLastSentAt && (Date.now() - user.emailVerificationLastSentAt.getTime() < OTP_RESEND_COOLDOWN_MS)) {
    const waitSec = Math.ceil((OTP_RESEND_COOLDOWN_MS - (Date.now() - user.emailVerificationLastSentAt.getTime())) / 1000);
    res.status(429);
    throw new Error(`Please wait ${waitSec} seconds before requesting another verification code.`);
  }

  // Generate new OTP
  const otp = crypto.randomInt(100000, 999999).toString();
  const salt = await bcrypt.genSalt(10);
  const otpHash = await bcrypt.hash(otp, salt);

  user.emailVerificationOtpHash = otpHash;
  user.emailVerificationOtpExpire = Date.now() + 10 * 60 * 1000;
  user.emailVerificationOtpAttempts = 0;
  user.emailVerificationLastSentAt = Date.now();
  await user.save();

  // Send Email
  const emailHtml = getHtmlTemplate({
    title: 'Your new verification code',
    greeting: `Hello ${escapeHtml(user.name)}`,
    body: 'We received a request to resend your verification code. Please use the 6-digit code below to verify your email address. This code is valid for 10 minutes.',
    code: otp,
    footerText: 'If you did not request a new code, you can safely ignore this email.',
  });

  const emailResult = await sendEmail({
    to: user.email,
    subject: 'Your new verification code',
    html: emailHtml,
    text: `Hello ${user.name},\n\nWe received a request to resend your verification code. Your new 6-digit code is:\n\n${otp}\n\nThis code will expire in 10 minutes.\n\nIf you did not request this, please ignore this email.`,
  });

  if (!emailResult.success && (!emailResult.mocked || emailResult.deliveryFailed)) {
    user.emailVerificationOtpHash = null;
    user.emailVerificationOtpExpire = null;
    user.emailVerificationOtpAttempts = 0;
    user.emailVerificationLastSentAt = null;
    await user.save();
    res.status(502);
    throw new Error('Failed to send verification email. Please try again later.');
  }

  sendSuccess(res, 200, 'Verification code sent to email');
});

