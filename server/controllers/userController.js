import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import { sendSuccess } from '../utils/apiResponse.js';

// @desc  Get current user profile
// @route GET /api/users/me
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password -refreshToken');
  sendSuccess(res, 200, 'Profile fetched', user);
});

// @desc  Update profile
// @route PUT /api/users/me
export const updateMe = asyncHandler(async (req, res) => {
  // Issue #3 fix: only allow safe, user-writable fields.
  // Sensitive fields (role, twoFactorEnabled) and all gamification data
  // (xp, coins, level, streak, achievements, etc.) are NEVER user-writable.
  const { name, avatar, currency, phone, company } = req.body;

  const updateFields = {};
  if (name !== undefined)     updateFields.name     = name;
  if (avatar !== undefined)   updateFields.avatar   = avatar;
  if (currency !== undefined) updateFields.currency = currency;
  if (phone !== undefined)    updateFields.phone    = phone;
  if (company !== undefined)  updateFields.company  = company;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    updateFields,
    { new: true, runValidators: true }
  ).select('-password -refreshToken');
  sendSuccess(res, 200, 'Profile updated', user);
});

// @desc  Change password
// @route PUT /api/users/me/password
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id);

  if (!(await user.matchPassword(currentPassword))) {
    res.status(400);
    throw new Error('Current password is incorrect');
  }

  user.password = newPassword;
  await user.save();
  sendSuccess(res, 200, 'Password changed successfully');
});

// @desc  Delete account
// @route DELETE /api/users/me
export const deleteMe = asyncHandler(async (req, res) => {
  await User.findByIdAndDelete(req.user._id);
  sendSuccess(res, 200, 'Account deleted successfully');
});


