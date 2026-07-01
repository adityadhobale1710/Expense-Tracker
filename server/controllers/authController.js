import asyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Category from '../models/Category.js';
import { generateAccessToken, generateRefreshToken } from '../utils/generateToken.js';
import { sendSuccess } from '../utils/apiResponse.js';

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
  { name: 'Other Income', icon: '💰', color: '#6366f1', type: 'income' },
];

// @desc  Register user
// @route POST /api/auth/register
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error('User already exists with this email');
  }

  const user = await User.create({ name, email, password, phone: phone || '' });

  // Seed default categories
  const cats = DEFAULT_CATEGORIES.map((c) => ({ ...c, user: user._id }));
  await Category.insertMany(cats);

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  user.refreshToken = refreshToken;
  await user.save();

  sendSuccess(res, 201, 'Registration successful', {
    _id: user._id,
    name: user.name,
    email: user.email,
    currency: user.currency,
    role: user.role,
    phone: user.phone,
    company: user.company,
    twoFactorEnabled: user.twoFactorEnabled,
    xp: user.xp,
    coins: user.coins,
    level: user.level,
    streak: user.streak,
    longestStreak: user.longestStreak,
    unlockedTitles: user.unlockedTitles,
    unlockedAvatars: user.unlockedAvatars,
    unlockedThemes: user.unlockedThemes,
    achievements: user.achievements,
    accessToken,
    refreshToken,
  });
});

// @desc  Login user
// @route POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  user.refreshToken = refreshToken;
  await user.save();

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
    unlockedTitles: user.unlockedTitles,
    unlockedAvatars: user.unlockedAvatars,
    unlockedThemes: user.unlockedThemes,
    achievements: user.achievements,
    accessToken,
    refreshToken,
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
  sendSuccess(res, 200, 'Logged out successfully');
});

// @desc  Refresh access token
// @route POST /api/auth/refresh-token
export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;
  if (!token) {
    res.status(401);
    throw new Error('No refresh token provided');
  }

  const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  const user = await User.findById(decoded.id);

  if (!user || user.refreshToken !== token) {
    res.status(401);
    throw new Error('Invalid refresh token');
  }

  const newAccessToken = generateAccessToken(user._id);
  const newRefreshToken = generateRefreshToken(user._id);
  user.refreshToken = newRefreshToken;
  await user.save();

  sendSuccess(res, 200, 'Token refreshed', {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  });
});
