import mongoose from 'mongoose';
import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import Expense from '../models/Expense.js';
import Income from '../models/Income.js';
import Budget from '../models/Budget.js';
import Wallet from '../models/Wallet.js';
import Goal from '../models/Goal.js';
import Loan from '../models/Loan.js';
import Subscription from '../models/Subscription.js';
import Notification from '../models/Notification.js';
import Category from '../models/Category.js';
import Bill from '../models/Bill.js';
import SplitExpense from '../models/SplitExpense.js';
import Family from '../models/Family.js';
import AIChat from '../models/AIChat.js';
import Session from '../models/Session.js';
import { sendSuccess } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';
import { getRefreshCookieOptions } from './authController.js';

// @desc  Get current user profile
// @route GET /api/users/me
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select(
    '-password -refreshToken -resetPasswordToken -resetPasswordExpire ' +
    '-emailVerificationOtpHash -emailVerificationOtpExpire -emailVerificationOtpAttempts -emailVerificationLastSentAt ' +
    '-backupCodes -twoFactorSecret'
  );
  sendSuccess(res, 200, 'Profile fetched', user);
});

// @desc  Update profile
// @route PUT /api/users/me
export const updateMe = asyncHandler(async (req, res) => {
  // Issue #3 fix: only allow safe, user-writable fields.
  // Sensitive fields (role) and all gamification data
  // (xp, coins, level, streak, achievements, etc.) are NEVER user-writable.
  // twoFactorEnabled and alertSettings are whitelisted for update.
  const { name, avatar, currency, phone, company, twoFactorEnabled, alertSettings } = req.body;

  const updateFields = {};
  if (name !== undefined)             updateFields.name             = name;
  if (avatar !== undefined)           updateFields.avatar           = avatar;
  if (currency !== undefined)         updateFields.currency         = currency;
  if (phone !== undefined)            updateFields.phone            = phone;
  if (company !== undefined)          updateFields.company          = company;
  if (twoFactorEnabled !== undefined) updateFields.twoFactorEnabled = twoFactorEnabled;
  if (alertSettings !== undefined)    updateFields.alertSettings    = alertSettings;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    updateFields,
    { new: true, runValidators: true }
  ).select(
    '-password -refreshToken -resetPasswordToken -resetPasswordExpire ' +
    '-emailVerificationOtpHash -emailVerificationOtpExpire -emailVerificationOtpAttempts -emailVerificationLastSentAt ' +
    '-backupCodes -twoFactorSecret'
  );
  sendSuccess(res, 200, 'Profile updated', user);
});

const ACHIEVEMENT_PROGRESS_LIMITS = {
  s1: 1, s2: 1, s3: 2000, s4: 1, s5: 5, s6: 1, s7: 50, s8: 10000, s9: 50000, s10: 200000, s11: 2,
  b1: 1, b2: 1, b3: 7, b4: 14, b5: 30, b6: 5, b7: 30, b8: 1, b9: 1, b10: 90, b11: 1,
  i1: 1, i2: 1, i3: 1, i4: 1, i5: 1, i6: 3, i7: 10000, i8: 50000, i9: 250000, i10: 1, i11: 30,
  c1: 1, c2: 3, c3: 7, c4: 30, c5: 100, c6: 5, c7: 2, c8: 1, c9: 180, c10: 365, c11: 3,
  a1: 1, a2: 1, a3: 1, a4: 1, a5: 1, a6: 10, a7: 5, a8: 1, a9: 1, a10: 5, a11: 1,
  sec1: 1, sec2: 1, sec3: 1, sec4: 1, sec5: 1, sec6: 1, sec7: 1, sec8: 1, sec9: 1, sec10: 90, sec11: 1,
  p1: 1, p2: 1, p3: 1, p4: 1, p6: 1, p7: 3, p8: 1, p9: 1, p10: 1, p11: 1,
  sp1: 1, sp2: 1, sp3: 1, sp4: 1, sp5: 1, sp6: 1, sp7: 1000, sp8: 1, sp9: 1, sp10: 10, sp11: 20,
  l1: 500000, l2: 1000000, l3: 10, l4: 12, l5: 15, l6: 1, l7: 1, l8: 1, l9: 50, l10: 1, l11: 150,
  se1: 1, se2: 1, se3: 1, se4: 1, se5: 1, se6: 1, se7: 1, se8: 1, se9: 1, se10: 1, se11: 5,

  // New Categories
  fam1: 1, fam2: 1, fam3: 3, fam4: 1, fam5: 1, fam6: 1, fam7: 10, fam8: 30,
  loan1: 1, loan2: 1, loan3: 5, loan4: 10, loan5: 1, loan6: 3, loan7: 5, loan8: 2,
  sub1: 1, sub2: 3, sub3: 1, sub4: 1, sub5: 1, sub6: 1, sub7: 5,
  wal1: 1, wal2: 3, wal3: 1, wal4: 5, wal5: 30, wal6: 1, wal7: 100000
};

const ACHIEVEMENT_REWARDS = {
  s1: { xp: 100, coins: 10 },
  s2: { xp: 150, coins: 15 },
  s3: { xp: 200, coins: 20 },
  s4: { xp: 500, coins: 50 },
  s5: { xp: 300, coins: 30 },
  s6: { xp: 200, coins: 20 },
  s7: { xp: 350, coins: 35 },
  s8: { xp: 600, coins: 60 },
  s9: { xp: 1200, coins: 120 },
  s10: { xp: 3000, coins: 300 },
  s11: { xp: 1000, coins: 100 },
  b1: { xp: 100, coins: 10 },
  b2: { xp: 150, coins: 15 },
  b3: { xp: 300, coins: 30 },
  b4: { xp: 500, coins: 50 },
  b5: { xp: 1000, coins: 100 },
  b6: { xp: 400, coins: 40 },
  b7: { xp: 300, coins: 30 },
  b8: { xp: 800, coins: 80 },
  b9: { xp: 1200, coins: 120 },
  b10: { xp: 2500, coins: 250 },
  b11: { xp: 200, coins: 20 },
  i1: { xp: 150, coins: 15 },
  i2: { xp: 200, coins: 20 },
  i3: { xp: 250, coins: 25 },
  i4: { xp: 200, coins: 20 },
  i5: { xp: 300, coins: 30 },
  i6: { xp: 500, coins: 50 },
  i7: { xp: 400, coins: 40 },
  i8: { xp: 1000, coins: 100 },
  i9: { xp: 2500, coins: 250 },
  i10: { xp: 600, coins: 60 },
  i11: { xp: 800, coins: 80 },
  c1: { xp: 50, coins: 5 },
  c2: { xp: 100, coins: 10 },
  c3: { xp: 300, coins: 30 },
  c4: { xp: 1000, coins: 100 },
  c5: { xp: 4000, coins: 400 },
  c6: { xp: 200, coins: 20 },
  c7: { xp: 200, coins: 20 },
  c8: { xp: 300, coins: 30 },
  c9: { xp: 2000, coins: 200 },
  c10: { xp: 5000, coins: 500 },
  c11: { xp: 150, coins: 15 },
  a1: { xp: 100, coins: 10 },
  a2: { xp: 200, coins: 20 },
  a3: { xp: 200, coins: 20 },
  a4: { xp: 200, coins: 20 },
  a5: { xp: 300, coins: 30 },
  a6: { xp: 300, coins: 30 },
  a7: { xp: 250, coins: 25 },
  a8: { xp: 300, coins: 30 },
  a9: { xp: 450, coins: 45 },
  a10: { xp: 1000, coins: 100 },
  a11: { xp: 500, coins: 50 },
  sec1: { xp: 100, coins: 10 },
  sec2: { xp: 500, coins: 50 },
  sec3: { xp: 300, coins: 30 },
  sec4: { xp: 200, coins: 20 },
  sec5: { xp: 150, coins: 15 },
  sec6: { xp: 300, coins: 30 },
  sec7: { xp: 200, coins: 20 },
  sec8: { xp: 100, coins: 10 },
  sec9: { xp: 400, coins: 40 },
  sec10: { xp: 1500, coins: 150 },
  sec11: { xp: 300, coins: 30 },
  p1: { xp: 150, coins: 15 },
  p2: { xp: 150, coins: 15 },
  p3: { xp: 150, coins: 15 },
  p4: { xp: 300, coins: 30 },
  p6: { xp: 100, coins: 10 },
  p7: { xp: 400, coins: 40 },
  p8: { xp: 200, coins: 20 },
  p9: { xp: 150, coins: 15 },
  p10: { xp: 300, coins: 30 },
  p11: { xp: 500, coins: 50 },
  sp1: { xp: 100, coins: 10 },
  sp2: { xp: 100, coins: 10 },
  sp3: { xp: 100, coins: 10 },
  sp4: { xp: 150, coins: 15 },
  sp5: { xp: 200, coins: 20 },
  sp6: { xp: 300, coins: 30 },
  sp7: { xp: 300, coins: 30 },
  sp8: { xp: 200, coins: 20 },
  sp9: { xp: 150, coins: 15 },
  sp10: { xp: 100, coins: 10 },
  sp11: { xp: 500, coins: 50 },
  l1: { xp: 2000, coins: 200 },
  l2: { xp: 5000, coins: 500 },
  l3: { xp: 1000, coins: 100 },
  l4: { xp: 2500, coins: 250 },
  l5: { xp: 10000, coins: 1000 },
  l6: { xp: 2000, coins: 200 },
  l7: { xp: 3000, coins: 300 },
  l8: { xp: 1500, coins: 150 },
  l9: { xp: 5000, coins: 500 },
  l10: { xp: 3000, coins: 300 },
  l11: { xp: 8000, coins: 800 },
  se1: { xp: 200, coins: 20 },
  se2: { xp: 200, coins: 20 },
  se3: { xp: 200, coins: 20 },
  se4: { xp: 200, coins: 20 },
  se5: { xp: 200, coins: 20 },
  se6: { xp: 200, coins: 20 },
  se7: { xp: 200, coins: 20 },
  se8: { xp: 300, coins: 30 },
  se9: { xp: 250, coins: 25 },
  se10: { xp: 150, coins: 15 },
  se11: { xp: 200, coins: 20 },

  // New Categories
  fam1: { xp: 150, coins: 15 },
  fam2: { xp: 200, coins: 20 },
  fam3: { xp: 350, coins: 35 },
  fam4: { xp: 200, coins: 20 },
  fam5: { xp: 300, coins: 30 },
  fam6: { xp: 400, coins: 40 },
  fam7: { xp: 600, coins: 60 },
  fam8: { xp: 1200, coins: 120 },
  loan1: { xp: 150, coins: 15 },
  loan2: { xp: 200, coins: 20 },
  loan3: { xp: 400, coins: 40 },
  loan4: { xp: 700, coins: 70 },
  loan5: { xp: 1000, coins: 100 },
  loan6: { xp: 600, coins: 60 },
  loan7: { xp: 800, coins: 80 },
  loan8: { xp: 2000, coins: 200 },
  sub1: { xp: 150, coins: 15 },
  sub2: { xp: 300, coins: 30 },
  sub3: { xp: 100, coins: 10 },
  sub4: { xp: 250, coins: 25 },
  sub5: { xp: 500, coins: 50 },
  sub6: { xp: 400, coins: 40 },
  sub7: { xp: 1000, coins: 100 },
  wal1: { xp: 100, coins: 10 },
  wal2: { xp: 400, coins: 40 },
  wal3: { xp: 150, coins: 15 },
  wal4: { xp: 450, coins: 45 },
  wal5: { xp: 1000, coins: 100 },
  wal6: { xp: 300, coins: 30 },
  wal7: { xp: 1500, coins: 150 }
};

// MASTER-024: Keys MUST be uppercase to match client action codes (ADD_INCOME, ADD_EXPENSE, etc.)
const ACTION_REWARDS = {
  LOGIN: { xp: 100, coins: 10 },
  ADD_EXPENSE: { xp: 50, coins: 5 },
  ADD_INCOME: { xp: 50, coins: 5 },
  UPLOAD_RECEIPT: { xp: 150, coins: 15 },
  CREATE_BUDGET: { xp: 200, coins: 20 },
  STAY_DAILY_BUDGET: { xp: 100, coins: 10 },
  STAY_WEEKLY_BUDGET: { xp: 300, coins: 30 },
  STAY_MONTHLY_BUDGET: { xp: 1000, coins: 100 },
  COMPLETE_REVIEW: { xp: 500, coins: 50 },
  ADD_GOAL: { xp: 150, coins: 15 },
  REACH_GOAL: { xp: 1000, coins: 100 },
  ADD_INVESTMENT: { xp: 300, coins: 30 },
  TRACK_BILLS: { xp: 100, coins: 10 },
  PAY_BILLS_ON_TIME: { xp: 250, coins: 25 },
  CATEGORIZE_EXPENSE: { xp: 40, coins: 4 },
  EXPORT_REPORTS: { xp: 200, coins: 20 },
  VIEW_ANALYTICS: { xp: 75, coins: 7 },
  MAINTAIN_STREAK: { xp: 150, coins: 15 },
  INVITE_FRIENDS: { xp: 500, coins: 50 },
  BACKUP_DATA: { xp: 100, coins: 10 },
  DAILY_LOGIN: { xp: 100, coins: 10 },

  // Family & Social
  CREATE_FAMILY: { xp: 150, coins: 15 },
  INVITE_FAMILY_MEMBER: { xp: 200, coins: 20 },
  LOG_FAMILY_EXPENSE: { xp: 200, coins: 20 },
  SET_FAMILY_BUDGET: { xp: 300, coins: 30 },
  FAMILY_ACTIVE_30D: { xp: 1000, coins: 100 },
  CREATE_SPLIT_BILL: { xp: 300, coins: 30 },
  SETTLE_SPLIT_BILL: { xp: 500, coins: 50 },

  // Loans & Subscriptions
  ADD_LOAN: { xp: 150, coins: 15 },
  MAKE_LOAN_PAYMENT: { xp: 200, coins: 20 },
  PAYOFF_LOAN: { xp: 1000, coins: 100 },
  PAY_LOAN_ON_TIME: { xp: 250, coins: 25 },
  ADD_SUBSCRIPTION: { xp: 150, coins: 15 },
  VIEW_SUBSCRIPTIONS: { xp: 75, coins: 7 },
  CANCEL_SUBSCRIPTION: { xp: 250, coins: 25 },
  REVIEW_SUB_BUDGET: { xp: 300, coins: 30 },
  SWITCH_ANNUAL_PLAN: { xp: 400, coins: 40 },

  // Wallets
  CREATE_WALLET: { xp: 150, coins: 15 },
  WALLET_TRANSFER: { xp: 200, coins: 20 },
  WALLET_BALANCE_30D: { xp: 1000, coins: 100 },
  DIVERSE_WALLETS: { xp: 300, coins: 30 },
  WALLET_MILESTONE: { xp: 1500, coins: 150 }
};

// @desc  Update gamification progress
// @route PUT /api/users/me/gamification
export const updateGamification = asyncHandler(async (req, res) => {
  const { xp, coins, level, streak, longestStreak, achievements, simulatedActions } = req.body;
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const existingMap = {};
  user.achievements.forEach(ach => {
    existingMap[ach.id] = ach;
  });

  let updatedAchievements = [];
  if (achievements !== undefined && Array.isArray(achievements)) {
    for (const incoming of achievements) {
      const existing = existingMap[incoming.id];
      const limit = ACHIEVEMENT_PROGRESS_LIMITS[incoming.id] || 99999999;

      if (incoming.currentProgress > limit) {
        res.status(400);
        throw new Error(`Achievement progress for ${incoming.id} cannot exceed ${limit}`);
      }

      let unlocked = incoming.unlocked;
      if (unlocked && incoming.currentProgress < limit) {
        res.status(400);
        throw new Error(`Achievement ${incoming.id} cannot be unlocked without reaching progress threshold ${limit}`);
      }

      if (existing && existing.unlocked) {
        unlocked = true;
      }

      const unlockedAt = (unlocked && !(existing && existing.unlocked))
        ? new Date()
        : (existing ? existing.unlockedAt : undefined);

      updatedAchievements.push({
        id: incoming.id,
        currentProgress: incoming.currentProgress,
        unlocked,
        unlockedAt
      });
    }
  } else {
    updatedAchievements = [...user.achievements];
  }

  const uniqueActions = Array.isArray(simulatedActions) ? [...new Set(simulatedActions)] : (user.simulatedActions ? [...new Set(user.simulatedActions)] : []);

  let calculatedXp = 0;
  let calculatedCoins = 0;

  uniqueActions.forEach(actId => {
    const reward = ACTION_REWARDS[actId];
    if (reward) {
      calculatedXp += reward.xp;
      calculatedCoins += reward.coins;
    }
  });

  updatedAchievements.forEach(ach => {
    if (ach.unlocked) {
      const reward = ACHIEVEMENT_REWARDS[ach.id];
      if (reward) {
        calculatedXp += reward.xp;
        calculatedCoins += reward.coins;
      }
    }
  });

  if (xp !== undefined && xp > calculatedXp) {
    res.status(400);
    throw new Error(`XP ${xp} exceeds maximum validated ceiling of ${calculatedXp}`);
  }

  if (coins !== undefined && coins > calculatedCoins) {
    res.status(400);
    throw new Error(`Coins ${coins} exceeds maximum validated ceiling of ${calculatedCoins}`);
  }

  if (xp !== undefined) {
    user.xp = xp;
  }

  if (coins !== undefined) {
    user.coins = coins;
  }

  if (level !== undefined) {
    user.level = level;
  }

  if (streak !== undefined) {
    user.streak = streak;
  }

  if (longestStreak !== undefined) {
    user.longestStreak = longestStreak;
  }

  if (simulatedActions !== undefined) {
    user.simulatedActions = simulatedActions;
  }

  user.achievements = updatedAchievements;

  await user.save();
  sendSuccess(res, 200, 'Gamification progress updated', {
    _id: user._id,
    name: user.name,
    avatar: user.avatar,
    xp: user.xp,
    coins: user.coins,
    level: user.level,
    streak: user.streak,
    longestStreak: user.longestStreak,
    lifetimeXP: user.lifetimeXP,
    rank: user.rank,
    achievements: user.achievements,
    simulatedActions: user.simulatedActions,
    pinnedBadges: user.pinnedBadges,
  });
});

// @desc  Change password
// @route PUT /api/users/me/password
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Validate inputs before hitting bcrypt
  if (!currentPassword || !newPassword) {
    res.status(400);
    throw new Error('Current password and new password are required');
  }

  const user = await User.findById(req.user._id);

  if (!(await user.matchPassword(currentPassword))) {
    res.status(400);
    throw new Error('Current password is incorrect');
  }

  user.password = newPassword;
  user.refreshToken = null;
  await user.save();

  await Session.updateMany({ user: user._id }, { isActive: false });

  sendSuccess(res, 200, 'Password changed successfully');
});

// @desc  Delete account
// @route DELETE /api/users/me
export const deleteMe = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // MASTER-025 / SEC-PURGE-001: Cascading delete — remove all user-linked data sequentially
    // within the transaction to prevent multi-operation session concurrency conflicts on MongoDB.
    await Expense.deleteMany({ user: userId }, { session });
    await Income.deleteMany({ user: userId }, { session });
    await Budget.deleteMany({ user: userId }, { session });
    await Wallet.deleteMany({ user: userId }, { session });
    await Goal.deleteMany({ user: userId }, { session });
    await Loan.deleteMany({ user: userId }, { session });
    await Subscription.deleteMany({ user: userId }, { session });
    await Notification.deleteMany({ user: userId }, { session });
    await Category.deleteMany({ user: userId }, { session });
    await Bill.deleteMany({ user: userId }, { session });
    await SplitExpense.deleteMany({ creator: userId }, { session });
    await Family.deleteMany({ owner: userId }, { session });
    await AIChat.deleteMany({ user: userId }, { session });

    await User.findByIdAndDelete(userId, { session });

    await session.commitTransaction();

    // M-RC1 fix: clear the refresh cookie with the same Secure + SameSite=None
    // attributes it was set with, or browsers silently ignore the deletion.
    res.clearCookie('refreshToken', getRefreshCookieOptions());
    sendSuccess(res, 200, 'Account and all associated data deleted successfully');
  } catch (error) {
    // C1 fix (same bug class as register): never call abortTransaction() on a
    // session whose transaction was already committed/ended — that throws a
    // MongoTransactionError that masks the real failure with a leaked 502.
    try {
      if (session.inTransaction()) await session.abortTransaction();
    } catch (abortErr) {
      logger.error(`[deleteMe] Failed to abort transaction: ${abortErr.message}`);
    }
    throw error;
  } finally {
    session.endSession();
  }
});

// @desc    Get counts and summary statistics for profile page
// @route   GET /api/users/me/stats
export const getProfileStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const [
    walletsCount,
    budgetsCount,
    goalsCount,
    subscriptionsCount,
    billsCount,
    incomeCount,
    expenseCount,
    incomeAgg,
    expenseAgg
  ] = await Promise.all([
    Wallet.countDocuments({ user: userId, isArchived: { $ne: true } }),
    Budget.countDocuments({ user: userId }),
    Goal.countDocuments({ user: userId, isDeleted: { $ne: true } }),
    Subscription.countDocuments({ user: userId }),
    Bill.countDocuments({ user: userId, status: { $nin: ['paid', 'cancelled'] } }),
    Income.countDocuments({ user: userId, isTransfer: { $ne: true } }),
    Expense.countDocuments({ user: userId, isTransfer: { $ne: true } }),
    Income.aggregate([
      { $match: { user: userId, isTransfer: { $ne: true } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    Expense.aggregate([
      { $match: { user: userId, isTransfer: { $ne: true } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ])
  ]);

  const totalIncome = incomeAgg.length > 0 ? incomeAgg[0].total : 0;
  const totalExpense = expenseAgg.length > 0 ? expenseAgg[0].total : 0;
  const transactionCount = incomeCount + expenseCount;

  sendSuccess(res, 200, 'Profile statistics retrieved successfully', {
    totalIncome,
    totalExpense,
    transactionCount,
    walletsCount,
    budgetsCount,
    goalsCount,
    subscriptionsCount,
    billsCount
  });
});


