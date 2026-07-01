import asyncHandler from 'express-async-handler';
import Notification from '../models/Notification.js';
import { sendSuccess } from '../utils/apiResponse.js';

// @desc    Get all notifications for user
// @route   GET /api/notifications
export const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(30);
  sendSuccess(res, 200, 'Notifications retrieved successfully', notifications);
});

// @desc    Mark single notification as read
// @route   PUT /api/notifications/:id/read
export const markNotificationRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { read: true },
    { new: true }
  );
  if (!notification) {
    res.status(404);
    throw new Error('Notification not found');
  }
  sendSuccess(res, 200, 'Notification marked as read', notification);
});

// @desc    Mark all user notifications as read
// @route   PUT /api/notifications/read-all
export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  sendSuccess(res, 200, 'All notifications marked as read');
});
