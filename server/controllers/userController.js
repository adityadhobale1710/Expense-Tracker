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
  const { name, avatar, currency } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { name, avatar, currency },
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
