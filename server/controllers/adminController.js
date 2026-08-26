import crypto from 'crypto';
import mongoose from 'mongoose';
import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import Expense from '../models/Expense.js';
import Income from '../models/Income.js';
import Budget from '../models/Budget.js';
import Goal from '../models/Goal.js';
import Subscription from '../models/Subscription.js';
import Loan from '../models/Loan.js';
import Wallet from '../models/Wallet.js';
import Feedback from '../models/Feedback.js';
import SecurityLog from '../models/SecurityLog.js';
import Session from '../models/Session.js';
import { sendSuccess } from '../utils/apiResponse.js';

// ─── Helper: constant-time string comparison ────────────────────────────────
const timingSafeEqual = (a, b) => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, Buffer.alloc(bufA.length));
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
};

// ─── Helper: convert process.memoryUsage() bytes to MB ──────────────────────
const toMB = (bytes) => +(bytes / 1024 / 1024).toFixed(2);

// ─── Helper: get IP from request ────────────────────────────────────────────
const getIp = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || '127.0.0.1';

// ─── Helper: write SecurityLog — best-effort, never throws ──────────────────
const auditLog = async (adminId, action, details, req) => {
  try {
    await SecurityLog.create({
      user: adminId,
      action,
      ipAddress: getIp(req),
      details,
    });
  } catch (err) {
    console.error(`[AdminAudit] Failed to write '${action}': ${err.message}`);
  }
};

// ─── Helper: safe user projection — NEVER returns secrets ───────────────────
// Explicitly listed to ensure new fields never accidentally leak.
const SAFE_USER_SELECT =
  '-password -refreshToken -twoFactorSecret -backupCodes -resetPasswordToken -resetPasswordExpire';

// ─── Helper: allowed sort fields allowlist ──────────────────────────────────
const ALLOWED_SORT_FIELDS = new Set(['createdAt', 'name', 'email']);

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get Admin Panel statistics
// @route   GET /api/admin/stats
// @access  Admin only
// ─────────────────────────────────────────────────────────────────────────────
export const getAdminStats = asyncHandler(async (req, res) => {
  // ── UTC time boundaries ────────────────────────────────────────────────────
  // All "New Today / This Week / This Month" metrics use UTC boundaries.
  // The server runs on Node.js (Render, UTC). Timezone basis: UTC.
  const now = new Date();

  // Today: UTC midnight
  const startOfToday = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()
  ));

  // This week: last Sunday 00:00 UTC (ISO week starts Sunday for UX clarity)
  const dayOfWeek = now.getUTCDay(); // 0 = Sunday
  const startOfWeek = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - dayOfWeek
  ));

  // This month: 1st of current month 00:00 UTC
  const startOfMonth = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), 1
  ));

  // ── User status counts — mutually exclusive categories ─────────────────────
  // Correction #1: Four non-overlapping groups.
  //   active   = isBlocked NOT true AND isDisabled NOT true  (neither flag)
  //   blocked  = isBlocked true AND isDisabled NOT true      (blocked only)
  //   disabled = isDisabled true AND isBlocked NOT true      (disabled only)
  //   both     = isBlocked true AND isDisabled true          (both flags)
  // These four are mutually exclusive: active + blocked + disabled + both = total.
  const [
    totalUsers,
    activeUsers,
    blockedOnly,
    disabledOnly,
    bothFlags,
    adminUsers,
    newToday,
    newThisWeek,
    newThisMonth,
  ] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ isBlocked: { $ne: true }, isDisabled: { $ne: true } }),
    User.countDocuments({ isBlocked: true,          isDisabled: { $ne: true } }),
    User.countDocuments({ isDisabled: true,         isBlocked: { $ne: true } }),
    User.countDocuments({ isBlocked: true,          isDisabled: true }),
    User.countDocuments({ role: 'admin' }),
    User.countDocuments({ createdAt: { $gte: startOfToday } }),
    User.countDocuments({ createdAt: { $gte: startOfWeek } }),
    User.countDocuments({ createdAt: { $gte: startOfMonth } }),
  ]);

  // ── Financial aggregates — all parallel, no full-collection loads ──────────
  const [
    expenseStats,
    incomeStats,
    totalBudgets,
    totalGoals,
    totalSubscriptions,
    totalLoans,
    totalWallets,
    totalFeedback,
  ] = await Promise.all([
    Expense.aggregate([
      { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$amount' } } },
    ]),
    Income.aggregate([
      { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$amount' } } },
    ]),
    Budget.countDocuments({}),
    Goal.countDocuments({}),
    Subscription.countDocuments({}),
    Loan.countDocuments({}),
    Wallet.countDocuments({}),
    Feedback.countDocuments({}),
  ]);

  const totalExpenses    = expenseStats[0]?.count ?? 0;
  const expenseVolume    = expenseStats[0]?.total ?? 0;
  const totalIncomes     = incomeStats[0]?.count  ?? 0;
  const incomeVolume     = incomeStats[0]?.total  ?? 0;

  // ── Recent admin audit activity (last 5 — safe fields only) ─────────────────
  const recentAdminActivity = await SecurityLog.find({
    action: { $regex: /^Admin /i },
  })
    .sort({ timestamp: -1 })
    .limit(5)
    .select('action details timestamp ipAddress')
    .populate('user', 'name email');

  // ── Real Node process metrics ───────────────────────────────────────────────
  const mem = process.memoryUsage();
  const diagnostics = {
    nodeMemory: {
      rss:       toMB(mem.rss),
      heapUsed:  toMB(mem.heapUsed),
      heapTotal: toMB(mem.heapTotal),
      external:  toMB(mem.external),
      unit: 'MB',
    },
    uptimeSeconds: Math.floor(process.uptime()),
    nodeVersion: process.version,
  };

  sendSuccess(res, 200, 'Admin metrics aggregated', {
    userMetrics: {
      total:       totalUsers,
      active:      activeUsers,      // neither isBlocked nor isDisabled
      blockedOnly,                   // isBlocked=true, isDisabled=false
      disabledOnly,                  // isDisabled=true, isBlocked=false
      bothFlags,                     // both flags set simultaneously
      adminUsers,
      newToday,
      newThisWeek,
      newThisMonth,
    },
    financialMetrics: {
      expenses:      totalExpenses,
      expenseVolume,
      incomes:       totalIncomes,
      incomeVolume,
      budgets:       totalBudgets,
      goals:         totalGoals,
      subscriptions: totalSubscriptions,
      loans:         totalLoans,
      wallets:       totalWallets,
    },
    feedback: { total: totalFeedback },
    recentAdminActivity,
    diagnostics,
    // Kept for backward-compatibility with any Phase 1 UI still reading these
    overview: {
      totalUsers,
      premiumUsers: await User.countDocuments({ role: 'premium' }),
      totalTransactions: totalExpenses,
      totalFeedback,
      systemVolume: expenseVolume,
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get paginated, searchable, filterable user list
// @route   GET /api/admin/users?page=1&limit=20&search=&role=&status=&verified=&sortBy=createdAt&sortOrder=desc
// @access  Admin only
// ─────────────────────────────────────────────────────────────────────────────
export const getUsersList = asyncHandler(async (req, res) => {
  // ── Query params ─────────────────────────────────────────────────────────
  const page     = Math.max(1, parseInt(req.query.page,  10) || 1);
  const rawLimit = parseInt(req.query.limit, 10) || 20;
  const limit    = Math.min(Math.max(1, rawLimit), 100); // enforce 1–100
  const skip     = (page - 1) * limit;

  const search    = (req.query.search    || '').trim();
  const roleFilter= (req.query.role      || '').trim();
  const status    = (req.query.status    || '').trim();
  const verified  = (req.query.verified  || '').trim();

  // Allowlist sort fields — never allow arbitrary client-controlled field names
  const rawSort    = req.query.sortBy    || 'createdAt';
  const sortBy     = ALLOWED_SORT_FIELDS.has(rawSort) ? rawSort : 'createdAt';
  const sortOrder  = req.query.sortOrder === 'asc' ? 1 : -1;

  // ── Build filter ─────────────────────────────────────────────────────────
  const filter = {};

  if (search) {
    // Case-insensitive search on name and email only (no credential fields)
    filter.$or = [
      { name:  { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  if (roleFilter && ['user', 'premium', 'admin'].includes(roleFilter)) {
    filter.role = roleFilter;
  }

  if (status === 'active') {
    filter.isBlocked  = { $ne: true };
    filter.isDisabled = { $ne: true };
  } else if (status === 'blocked') {
    filter.isBlocked  = true;
    filter.isDisabled = { $ne: true };
  } else if (status === 'disabled') {
    filter.isDisabled = true;
    filter.isBlocked  = { $ne: true };
  } else if (status === 'both') {
    filter.isBlocked  = true;
    filter.isDisabled = true;
  }

  if (verified === 'verified') {
    // Add isEmailVerified filter directly; $or for search is already in filter
    filter.isEmailVerified = true;
  } else if (verified === 'unverified') {
    filter.isEmailVerified = false;
  }

  // ── Fetch page + total count in parallel ──────────────────────────────────
  const [users, total] = await Promise.all([
    User.find(filter)
      .select(SAFE_USER_SELECT)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  if (users.length === 0) {
    return sendSuccess(res, 200, 'User list retrieved', {
      users: [],
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }

  // ── Batch aggregations — NO N+1 queries ─────────────────────────────────
  const userIds = users.map((u) => u._id);

  // Expense counts per user (current page only)
  const [expenseCounts, incomeCounts, sessionActivity] = await Promise.all([
    Expense.aggregate([
      { $match: { user: { $in: userIds } } },
      { $group: { _id: '$user', count: { $sum: 1 } } },
    ]),
    Income.aggregate([
      { $match: { user: { $in: userIds } } },
      { $group: { _id: '$user', count: { $sum: 1 } } },
    ]),
    // Correction #2: Last Seen from Session.lastActive (most recent active session)
    Session.aggregate([
      { $match: { user: { $in: userIds } } },
      { $group: { _id: '$user', lastSeen: { $max: '$lastActive' } } },
    ]),
  ]);

  // Build lookup maps for O(1) joins
  const expenseMap = Object.fromEntries(expenseCounts.map((e) => [e._id.toString(), e.count]));
  const incomeMap  = Object.fromEntries(incomeCounts.map((e)  => [e._id.toString(), e.count]));
  const sessionMap = Object.fromEntries(sessionActivity.map((s) => [s._id.toString(), s.lastSeen]));

  // ── Compose safe DTOs — never expose secrets ─────────────────────────────
  const safeUsers = users.map((u) => ({
    _id:            u._id,
    name:           u.name,
    email:          u.email,
    role:           u.role,
    isBlocked:      u.isBlocked  || false,
    isDisabled:     u.isDisabled || false,
    isEmailVerified:u.isEmailVerified,
    currency:       u.currency,
    phone:          u.phone || '',
    createdAt:      u.createdAt,
    updatedAt:      u.updatedAt,
    // Correction #2: lastSeen from Session.lastActive; null if no sessions recorded
    lastSeen:       sessionMap[u._id.toString()] || null,
    expenseCount:   expenseMap[u._id.toString()] || 0,
    incomeCount:    incomeMap[u._id.toString()]  || 0,
  }));

  sendSuccess(res, 200, 'User list retrieved', {
    users: safeUsers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get single user details with financial summary
// @route   GET /api/admin/users/:id
// @access  Admin only
// ─────────────────────────────────────────────────────────────────────────────
export const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400);
    throw new Error('Invalid user ID format');
  }

  const user = await User.findById(id).select(SAFE_USER_SELECT).lean();
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // ── Parallel aggregations — never load full collections ───────────────────
  const uid = user._id;
  const [
    expenseAgg,
    incomeAgg,
    budgetCount,
    goalCount,
    subscriptionCount,
    loanCount,
    walletCount,
    feedbackCount,
    sessionCount,
    lastSessionAgg,
  ] = await Promise.all([
    Expense.aggregate([
      { $match: { user: uid } },
      { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$amount' } } },
    ]),
    Income.aggregate([
      { $match: { user: uid } },
      { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$amount' } } },
    ]),
    Budget.countDocuments({ user: uid }),
    Goal.countDocuments({ user: uid }),
    Subscription.countDocuments({ user: uid }),
    Loan.countDocuments({ user: uid }),
    Wallet.countDocuments({ user: uid }),
    Feedback.countDocuments({ user: uid }),
    Session.countDocuments({ user: uid, isActive: true }),
    // Most recent session activity
    Session.findOne({ user: uid }).sort({ lastActive: -1 }).select('lastActive').lean(),
  ]);

  // ── Audit: admin viewed user ──────────────────────────────────────────────
  await auditLog(
    req.user._id,
    'Admin Viewed User',
    `Admin ${req.user.email} viewed profile of user ${user.email} (ID: ${user._id})`,
    req
  );

  // ── Safe DTO — no secrets ─────────────────────────────────────────────────
  const safeProfile = {
    _id:             user._id,
    name:            user.name,
    email:           user.email,
    phone:           user.phone || '',
    company:         user.company || '',
    role:            user.role,
    isBlocked:       user.isBlocked  || false,
    isDisabled:      user.isDisabled || false,
    isEmailVerified: user.isEmailVerified,
    isVerified:      user.isVerified,
    currency:        user.currency,
    avatar:          user.avatar || '',
    createdAt:       user.createdAt,
    updatedAt:       user.updatedAt,
    // Correction #2: lastSeen from Session.lastActive (not updatedAt)
    lastSeen:        lastSessionAgg?.lastActive || null,
    twoFactorEnabled: user.twoFactorEnabled || false,
  };

  sendSuccess(res, 200, 'User details retrieved', {
    user: safeProfile,
    financialSummary: {
      expenseCount:    expenseAgg[0]?.count ?? 0,
      totalExpenses:   expenseAgg[0]?.total ?? 0,
      incomeCount:     incomeAgg[0]?.count  ?? 0,
      totalIncome:     incomeAgg[0]?.total  ?? 0,
      budgets:         budgetCount,
      goals:           goalCount,
      subscriptions:   subscriptionCount,
      loans:           loanCount,
      wallets:         walletCount,
    },
    engagement: {
      xp:           user.xp           || 0,
      coins:        user.coins         || 0,
      level:        user.level         || 1,
      streak:       user.streak        || 0,
      longestStreak:user.longestStreak || 0,
      rank:         user.rank          || 'Bronze',
      feedbackCount,
    },
    sessions: {
      activeSessions: sessionCount,
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Update user account status (block/unblock/disable/enable)
// @route   PATCH /api/admin/users/:id/status
// @access  Admin only
// ─────────────────────────────────────────────────────────────────────────────
export const updateUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;

  // ── Validate ID ───────────────────────────────────────────────────────────
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400);
    throw new Error('Invalid user ID format');
  }

  // ── Validate action ────────────────────────────────────────────────────────
  // Correction #4: no role editing — only status actions
  const allowedActions = ['block', 'unblock', 'disable', 'enable'];
  if (!allowedActions.includes(action)) {
    res.status(400);
    throw new Error(`Invalid action. Allowed: ${allowedActions.join(', ')}`);
  }

  const user = await User.findById(id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // ── Self-lockout prevention ───────────────────────────────────────────────
  if (user._id.toString() === req.user._id.toString()) {
    res.status(400);
    throw new Error('You cannot disable or block your own admin account.');
  }

  // ── Apply status change ───────────────────────────────────────────────────
  let auditAction, auditDetails;
  let shouldRevokeSessions = false;

  switch (action) {
    case 'block':
      user.isBlocked = true;
      shouldRevokeSessions = true;
      auditAction  = 'Admin Blocked User';
      auditDetails = `Admin ${req.user.email} blocked user ${user.email} (ID: ${user._id})`;
      break;
    case 'unblock':
      user.isBlocked = false;
      auditAction  = 'Admin Unblocked User';
      auditDetails = `Admin ${req.user.email} unblocked user ${user.email} (ID: ${user._id})`;
      break;
    case 'disable':
      user.isDisabled = true;
      shouldRevokeSessions = true;
      auditAction  = 'Admin Disabled User';
      auditDetails = `Admin ${req.user.email} disabled user ${user.email} (ID: ${user._id})`;
      break;
    case 'enable':
      user.isDisabled = false;
      auditAction  = 'Admin Enabled User';
      auditDetails = `Admin ${req.user.email} re-enabled user ${user.email} (ID: ${user._id})`;
      break;
  }

  // Phase 3: atomic increment tokenVersion on block/disable, plus clear refresh token and mark sessions inactive
  if (shouldRevokeSessions) {
    await Session.updateMany({ user: user._id }, { isActive: false });
    user.refreshToken = null;
    await User.updateOne({ _id: user._id }, { $inc: { tokenVersion: 1 } });
    // Reload user to get updated tokenVersion for the response, although we don't strictly need it in response
  }

  await user.save();

  // ── Audit log ─────────────────────────────────────────────────────────────
  await auditLog(req.user._id, auditAction, auditDetails, req);

  sendSuccess(res, 200, `User ${action}ed successfully`, {
    _id:        user._id,
    isBlocked:  user.isBlocked,
    isDisabled: user.isDisabled,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Revoke all sessions for a user
// @route   POST /api/admin/users/:id/revoke-sessions
// @access  Admin only
// ─────────────────────────────────────────────────────────────────────────────
export const revokeUserSessions = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400);
    throw new Error('Invalid user ID format');
  }

  const user = await User.findById(id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // ── Self-lockout prevention ───────────────────────────────────────────────
  if (user._id.toString() === req.user._id.toString()) {
    res.status(400);
    throw new Error('You cannot revoke your own admin sessions via this endpoint.');
  }

  // ── Full revocation (Correction #5) ───────────────────────────────────────
  // Step 1: Mark all Session records inactive (blocks session listing)
  const sessionResult = await Session.updateMany(
    { user: user._id },
    { isActive: false }
  );

  // Step 2: Null out User.refreshToken — this is the critical step.
  // The /auth/refresh-token endpoint checks: user.refreshToken !== token
  // Nullifying it means ALL existing refresh tokens become invalid immediately.
  user.refreshToken = null;
  await user.save();

  // Phase 3: atomic tokenVersion increment
  await User.updateOne({ _id: user._id }, { $inc: { tokenVersion: 1 } });

  // ── Audit log ─────────────────────────────────────────────────────────────
  await auditLog(
    req.user._id,
    'Admin Revoked User Sessions',
    `Admin ${req.user.email} revoked all sessions for user ${user.email} (ID: ${user._id}). ` +
    `Sessions deactivated: ${sessionResult.modifiedCount}. RefreshToken invalidated.`,
    req
  );

  sendSuccess(res, 200, 'All sessions revoked successfully', {
    sessionsDeactivated: sessionResult.modifiedCount,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get user-submitted feedbacks
// @route   GET /api/admin/feedback
// @access  Admin only
// ─────────────────────────────────────────────────────────────────────────────
export const getFeedbackList = asyncHandler(async (req, res) => {
  const feedback = await Feedback.find({})
    .populate('user', 'name email')
    .sort({ createdAt: -1 });

  sendSuccess(res, 200, 'Feedback lists retrieved', feedback);
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Update feedback status
// @route   PUT /api/admin/feedback/:id
// @access  Admin only
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// @desc    One-time admin bootstrap
// @route   POST /api/admin/bootstrap
// @access  Public (intentionally — only usable when zero admins exist)
// ─────────────────────────────────────────────────────────────────────────────
export const bootstrapAdmin = asyncHandler(async (req, res) => {
  const bootstrapEmail  = process.env.ADMIN_BOOTSTRAP_EMAIL;
  const bootstrapSecret = process.env.ADMIN_BOOTSTRAP_SECRET;

  if (!bootstrapEmail || !bootstrapSecret) {
    res.status(503);
    throw new Error(
      'Admin bootstrap is not configured. ' +
      'Set ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_SECRET in the server environment.'
    );
  }

  const adminCount = await User.countDocuments({ role: 'admin' });
  if (adminCount >= 1) {
    res.status(403);
    throw new Error('Admin bootstrap is no longer available.');
  }

  const providedSecret = req.headers['x-admin-bootstrap-secret'] || '';
  const secretValid = timingSafeEqual(providedSecret, bootstrapSecret);
  if (!secretValid) {
    res.status(401);
    throw new Error('Invalid bootstrap secret.');
  }

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

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    res.status(404);
    throw new Error('No registered account found for the bootstrap email.');
  }

  if (user.role === 'admin') {
    res.status(409);
    throw new Error('This account is already an admin.');
  }

  user.role = 'admin';
  await user.save();

  try {
    await SecurityLog.create({
      user:      user._id,
      action:    'Admin Bootstrap',
      ipAddress: getIp(req),
      details:   `User ${user.email} was promoted to admin via one-time bootstrap.`,
    });
  } catch (logErr) {
    console.error('[bootstrapAdmin] SecurityLog write failed:', logErr.message);
  }

  sendSuccess(res, 200, 'Admin account created successfully.', {
    message:
      'Bootstrap complete. Remove ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_SECRET ' +
      'from your server environment and redeploy to prevent future use.',
    userId: user._id,
    email:  user.email,
    role:   user.role,
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 3 — USER ACTIVITY, SESSION MANAGEMENT & SECURITY CENTER
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Helper: determine security severity deterministically ────────────────────
const getSeverity = (action, details = '') => {
  const act = action.toLowerCase();
  
  if (act.includes('failed') && act.includes('admin')) return 'CRITICAL';
  if (act.includes('access denied')) return 'CRITICAL';
  
  if (act.includes('admin blocked') || act.includes('admin disabled')) return 'HIGH';
  if (act.includes('revoke')) return 'HIGH';
  
  if (act.includes('password reset')) return 'MEDIUM';
  if (act.includes('admin enabled') || act.includes('admin unblocked')) return 'MEDIUM';
  if (act.includes('admin viewed user')) return 'MEDIUM';
  
  if (act.includes('success') || act.includes('logout') || act.includes('otp')) return 'LOW';
  
  return 'INFO';
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get user activity timeline
// @route   GET /api/admin/users/:id/activity
// @access  Admin only
// ─────────────────────────────────────────────────────────────────────────────
export const getUserActivity = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const skip = (page - 1) * limit;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400);
    throw new Error('Invalid user ID format');
  }

  const [logs, total] = await Promise.all([
    SecurityLog.find({ user: id })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    SecurityLog.countDocuments({ user: id }),
  ]);

  const enrichedLogs = logs.map(log => ({
    _id: log._id,
    action: log.action,
    details: log.details,
    ipAddress: log.ipAddress,
    timestamp: log.timestamp,
    severity: getSeverity(log.action, log.details),
  }));

  await auditLog(req.user._id, 'Admin Viewed User Activity', `Admin viewed activity for user ${id}`, req);

  sendSuccess(res, 200, 'User activity retrieved', {
    events: enrichedLogs,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get user sessions
// @route   GET /api/admin/users/:id/sessions
// @access  Admin only
// ─────────────────────────────────────────────────────────────────────────────
export const getUserSessions = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400);
    throw new Error('Invalid user ID format');
  }

  // Safe projection: never return the token
  const sessions = await Session.find({ user: id })
    .select('_id deviceName browser os ipAddress isActive lastActive createdAt')
    .sort({ lastActive: -1 })
    .lean();

  await auditLog(req.user._id, 'Admin Viewed User Sessions', `Admin viewed sessions for user ${id}`, req);

  sendSuccess(res, 200, 'User sessions retrieved', sessions);
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Revoke individual session
// @route   POST /api/admin/users/:id/sessions/:sessionId/revoke
// @access  Admin only
// ─────────────────────────────────────────────────────────────────────────────
export const revokeIndividualSession = asyncHandler(async (req, res) => {
  const { id, sessionId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(sessionId)) {
    res.status(400);
    throw new Error('Invalid ID format');
  }

  if (id === req.user._id.toString()) {
    res.status(400);
    throw new Error('You cannot revoke your own admin sessions via this endpoint.');
  }

  const session = await Session.findOneAndUpdate(
    { _id: sessionId, user: id, isActive: true },
    { isActive: false },
    { new: true }
  );

  if (!session) {
    res.status(404);
    throw new Error('Active session not found');
  }

  // Phase 3: atomic tokenVersion increment ensures corresponding JWT is invalidated
  await User.updateOne({ _id: id }, { $inc: { tokenVersion: 1 } });

  await auditLog(
    req.user._id,
    'Admin Revoked Individual Session',
    `Admin revoked session ${sessionId} for user ${id}`,
    req
  );

  sendSuccess(res, 200, 'Session revoked successfully');
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get paginated security events across all users
// @route   GET /api/admin/security/events
// @access  Admin only
// ─────────────────────────────────────────────────────────────────────────────
export const getSecurityEvents = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const skip = (page - 1) * limit;
  const { action, user, startDate, endDate } = req.query;

  const filter = {};

  if (action) {
    filter.action = { $regex: action, $options: 'i' };
  }
  if (startDate || endDate) {
    filter.timestamp = {};
    if (startDate) filter.timestamp.$gte = new Date(startDate);
    if (endDate) filter.timestamp.$lte = new Date(endDate);
  }

  // Handle user search (email/name) by first finding matching users
  if (user) {
    const matchingUsers = await User.find({
      $or: [
        { email: { $regex: user, $options: 'i' } },
        { name: { $regex: user, $options: 'i' } }
      ]
    }).select('_id').lean();
    filter.user = { $in: matchingUsers.map(u => u._id) };
  }

  const [logs, total] = await Promise.all([
    SecurityLog.find(filter)
      .populate('user', 'name email')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    SecurityLog.countDocuments(filter),
  ]);

  const enrichedLogs = logs.map(log => ({
    _id: log._id,
    action: log.action,
    details: log.details,
    ipAddress: log.ipAddress,
    timestamp: log.timestamp,
    user: log.user, // populated { _id, name, email }
    severity: getSeverity(log.action, log.details),
  }));

  // Only audit once per unique query, or skip if it's just standard browsing,
  // to avoid flooding the audit log with "viewed events" entries.
  if (action || user) {
    await auditLog(req.user._id, 'Admin Viewed Security Events', `Admin filtered security events`, req);
  }

  sendSuccess(res, 200, 'Security events retrieved', {
    events: enrichedLogs,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get high-level security overview KPIs
// @route   GET /api/admin/security/overview
// @access  Admin only
// ─────────────────────────────────────────────────────────────────────────────
export const getSecurityOverview = asyncHandler(async (req, res) => {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    failedLogins24h,
    activeSessions,
    blockedAccounts,
    disabledAccounts,
    recentEvents
  ] = await Promise.all([
    SecurityLog.countDocuments({ action: /login failed/i, timestamp: { $gte: twentyFourHoursAgo } }),
    Session.countDocuments({ isActive: true }),
    User.countDocuments({ isBlocked: true }),
    User.countDocuments({ isDisabled: true }),
    SecurityLog.find().populate('user', 'name email').sort({ timestamp: -1 }).limit(10).lean(),
  ]);

  const enrichedEvents = recentEvents.map(log => ({
    _id: log._id,
    action: log.action,
    details: log.details,
    ipAddress: log.ipAddress,
    timestamp: log.timestamp,
    user: log.user,
    severity: getSeverity(log.action, log.details),
  }));

  sendSuccess(res, 200, 'Security overview retrieved', {
    kpis: {
      failedLogins24h,
      activeSessions,
      blockedAccounts,
      disabledAccounts,
    },
    recentEvents: enrichedEvents,
  });
});

