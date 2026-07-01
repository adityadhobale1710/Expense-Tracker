import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import Expense from '../models/Expense.js';
import Feedback from '../models/Feedback.js';
import { sendSuccess } from '../utils/apiResponse.js';

// @desc    Get Admin Panel statistics
// @route   GET /api/admin/stats
export const getAdminStats = asyncHandler(async (req, res) => {
  // Confirm caller is admin
  if (req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized as an admin');
  }

  const [totalUsers, premiumUsers, totalTransactions, totalFeedback] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ role: 'premium' }),
    Expense.countDocuments({}),
    Feedback.countDocuments({}),
  ]);

  // Compute aggregate system volume
  const sumRevenue = await Expense.aggregate([
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  const rawVol = sumRevenue[0]?.total || 0;

  // Mock CPU, RAM, & Request Count for diagnostic presentation
  const diagnostics = {
    cpuUsage: Math.floor(Math.random() * 25) + 5, // 5% - 30%
    ramUsage: Math.floor(Math.random() * 30) + 40, // 40% - 70%
    uptime: Math.floor(process.uptime()),
    activeConnections: Math.floor(Math.random() * 15) + 3,
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
export const getUsersList = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized as an admin');
  }

  const users = await User.find({}).select('-password -refreshToken').sort({ createdAt: -1 });
  sendSuccess(res, 200, 'User list retrieved', users);
});

// @desc    Get user-submitted feedbacks
// @route   GET /api/admin/feedback
export const getFeedbackList = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized as an admin');
  }

  const feedback = await Feedback.find({}).populate('user', 'name email').sort({ createdAt: -1 });
  sendSuccess(res, 200, 'Feedback lists retrieved', feedback);
});

// @desc    Update feedback status
// @route   PUT /api/admin/feedback/:id
export const updateFeedbackStatus = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized as an admin');
  }

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
