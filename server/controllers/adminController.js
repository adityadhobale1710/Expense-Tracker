import crypto from 'crypto';
import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import Expense from '../models/Expense.js';
import Feedback from '../models/Feedback.js';
import SecurityLog from '../models/SecurityLog.js';
import { sendSuccess } from '../utils/apiResponse.js';

// ─── Helper: constant-time string comparison ───────────────────────────────────
// crypto.timingSafeEqual requires two Buffers of the same byte length.
const timingSafeEqual = (a, b) => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Still run the comparison on same-length dummy to avoid length-leaking
    crypto.timingSafeEqual(bufA, Buffer.alloc(bufA.length));
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
};

// ─── Helper: convert process.memoryUsage() bytes to MB ────────────────────────
const toMB = (bytes) => +(bytes / 1024 / 1024).toFixed(2);

// @desc    Get Admin Panel statistics
// @route   GET /api/admin/stats
// @access  Admin only (enforced by router middleware)
export const getAdminStats = asyncHandler(async (req, res) => {
  const [totalUsers, premiumUsers, totalTransactions, totalFeedback] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ role: 'premium' }),
    Expense.countDocuments({}),
    Feedback.countDocuments({}),
  ]);

  // Real expense volume aggregation
  const sumRevenue = await Expense.aggregate([
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  const rawVol = sumRevenue[0]?.total || 0;

  // ─── Real Node process metrics ─────────────────────────────────────────────
  // These are Node.js process-level metrics, NOT full host CPU/RAM.
  // Labeled clearly so they are never misread as server-wide hardware stats.
  const mem = process.memoryUsage();
  const diagnostics = {
    // Node process memory (labeled accurately — not total server RAM)
    nodeMemory: {
      rss:       toMB(mem.rss),       // Resident Set Size — total allocated OS memory for this process
      heapUsed:  toMB(mem.heapUsed),  // V8 heap actually used by JS objects
      heapTotal: toMB(mem.heapTotal), // Total V8 heap allocated
      external:  toMB(mem.external),  // C++ objects bound to JS objects
      unit: 'MB',
    },
    // Server (process) uptime in seconds — NOT "active connections"
    uptimeSeconds: Math.floor(process.uptime()),
    // Node.js version for informational purposes
    nodeVersion: process.version,
  };

  sendSuccess(res, 200, 'Admin metrics aggregated', {
    overview: {
      totalUsers,
      premiumUsers,
      totalTransactions,
      totalFeedback,
      systemVolume: rawVol,
    },
    diagnostics,
  });
});

// @desc    Get user accounts details list
// @route   GET /api/admin/users
// @access  Admin only (enforced by router middleware)
export const getUsersList = asyncHandler(async (req, res) => {
  const users = await User.find({})
    .select(
      '-password -refreshToken -resetPasswordToken -resetPasswordExpire -twoFactorSecret -backupCodes'
    )
    .sort({ createdAt: -1 });

  sendSuccess(res, 200, 'User list retrieved', users);
});

// @desc    Get user-submitted feedbacks
// @route   GET /api/admin/feedback
// @access  Admin only (enforced by router middleware)
export const getFeedbackList = asyncHandler(async (req, res) => {
  const feedback = await Feedback.find({})
    .populate('user', 'name email')
    .sort({ createdAt: -1 });

  sendSuccess(res, 200, 'Feedback lists retrieved', feedback);
});

// @desc    Update feedback status
// @route   PUT /api/admin/feedback/:id
// @access  Admin only (enforced by router middleware)
export const updateFeedbackStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const item = await Feedback.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  ).populate('user', 'name email');

  if (!item) {
    res.status(404);
    throw new Error('Feedback not found');
  }

  sendSuccess(res, 200, 'Feedback status updated', item);
});

// @desc    One-time admin bootstrap — promotes a pre-existing user to admin role.
//          Becomes permanently unavailable once any admin already exists.
// @route   POST /api/admin/bootstrap
// @access  Public (intentionally — no admin exists yet at first call)
export const bootstrapAdmin = asyncHandler(async (req, res) => {
  const bootstrapEmail  = process.env.ADMIN_BOOTSTRAP_EMAIL;
  const bootstrapSecret = process.env.ADMIN_BOOTSTRAP_SECRET;

  // ── Guard: env vars must be configured ──────────────────────────────────────
  if (!bootstrapEmail || !bootstrapSecret) {
    res.status(503);
    throw new Error(
      'Admin bootstrap is not configured. ' +
      'Set ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_SECRET in the server environment.'
    );
  }

  // ── Guard: already have an admin — self-disable ──────────────────────────────
  const adminCount = await User.countDocuments({ role: 'admin' });
  if (adminCount >= 1) {
    res.status(403);
    throw new Error('Admin bootstrap is no longer available.');
  }

  // ── Validate the bootstrap secret from the request header ───────────────────
  // Secret is passed in X-Admin-Bootstrap-Secret header — NOT in the URL or
  // query string, which would leak into server logs.
  const providedSecret = req.headers['x-admin-bootstrap-secret'] || '';
  const secretValid = timingSafeEqual(providedSecret, bootstrapSecret);
  if (!secretValid) {
    res.status(401);
    throw new Error('Invalid bootstrap secret.');
  }

  // ── Validate that the requested email matches the env-configured target ──────
  const { email } = req.body;
  if (!email) {
    res.status(400);
    throw new Error('Email is required in the request body.');
  }

  const emailMatches = timingSafeEqual(
    email.toLowerCase().trim(),
    bootstrapEmail.toLowerCase().trim()
  );
  if (!emailMatches) {
    res.status(403);
    throw new Error('Provided email does not match the configured bootstrap target.');
  }

  // ── Find the existing registered user ───────────────────────────────────────
  // We require the user to already be registered — we never create a passwordless
  // admin account from here.
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    res.status(404);
    throw new Error('No registered account found for the bootstrap email.');
  }

  // ── Already an admin (race-condition safety net) ─────────────────────────────
  if (user.role === 'admin') {
    res.status(409);
    throw new Error('This account is already an admin.');
  }

  // ── Promote to admin ─────────────────────────────────────────────────────────
  user.role = 'admin';
  await user.save();

  // ── Write SecurityLog (best-effort — never fail the response on log error) ───
  try {
    const ipAddress =
      req.headers['x-forwarded-for']?.split(',')[0].trim() ||
      req.ip ||
      '127.0.0.1';

    await SecurityLog.create({
      user:      user._id,
      action:    'Admin Bootstrap',
      ipAddress,
      details:   `User ${user.email} was promoted to admin via one-time bootstrap.`,
    });
  } catch (logErr) {
    // Log to console — never let a logging failure break the bootstrap
    console.error('[bootstrapAdmin] SecurityLog write failed:', logErr.message);
  }

  // ── Return safe success — no tokens, no secrets, no sensitive fields ─────────
  sendSuccess(res, 200, 'Admin account created successfully.', {
    message:
      'Bootstrap complete. Remove ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_SECRET ' +
      'from your server environment and redeploy to prevent future use.',
    userId: user._id,
    email:  user.email,
    role:   user.role,
  });
});
