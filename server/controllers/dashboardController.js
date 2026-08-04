import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import Wallet from '../models/Wallet.js';
import Category from '../models/Category.js';
import Budget from '../models/Budget.js';
import Income from '../models/Income.js';
import Expense from '../models/Expense.js';
import Goal from '../models/Goal.js';
import Subscription from '../models/Subscription.js';
import Loan from '../models/Loan.js';
import Notification from '../models/Notification.js';
import { sendSuccess } from '../utils/apiResponse.js';

// @desc    Get aggregated dashboard data
// @route   GET /api/dashboard
export const getDashboardData = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0, 23, 59, 59);

  // Fetch all collections concurrently
  const [
    userProfile,
    wallets,
    categories,
    budgets,
    incomes,
    expenses,
    goals,
    subscriptions,
    loans,
    recentNotifications,
    incomeAgg,
    expenseAgg
  ] = await Promise.all([
    // F1 fix: use an explicit allowlist instead of '-password' alone.
    // Previously refreshToken, resetPasswordToken, registrationOtp, twoFactorSecret etc. were exposed.
    User.findById(userId).select(
      '_id name email phone avatar currency role company xp coins level streak longestStreak ' +
      'lifetimeXP rank achievements pinnedBadges season rewardChests unlockedTitles ' +
      'unlockedAvatars unlockedThemes simulatedActions twoFactorEnabled isEmailVerified'
    ),
    Wallet.find({ user: userId }),
    Category.find({ user: userId }).sort({ name: 1 }),
    Budget.find({ user: userId }),
    Income.find({ user: userId }).sort({ date: -1, createdAt: -1 }).limit(50),
    Expense.find({ user: userId }).sort({ date: -1, createdAt: -1 }).limit(50),
    Goal.find({ user: userId, isDeleted: { $ne: true } }),
    Subscription.find({ user: userId }),
    Loan.find({ user: userId }),
    Notification.find({ user: userId }).sort({ createdAt: -1 }).limit(3),
    Income.aggregate([
      { $match: { user: userId, date: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Expense.aggregate([
      { $match: { user: userId, date: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ])
  ]);

  // Compute summary metrics
  const totalIncome = incomeAgg[0]?.total || 0;
  const totalExpense = expenseAgg[0]?.total || 0;
  const balance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round((balance / totalIncome) * 100) : 0;

  sendSuccess(res, 200, 'Dashboard data aggregated successfully', {
    user: userProfile,
    wallets,
    categories,
    budgets,
    incomes: incomes || [],
    expenses: expenses || [],
    goals,
    subscriptions,
    loans,
    recentNotifications: recentNotifications.map(n => ({
      message: n.message,
      date: new Date(n.createdAt).toLocaleDateString('en-IN')
    })),
    summary: {
      totalIncome,
      totalExpense,
      balance,
      savingsRate
    }
  });
});
