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
  const { name, avatar, currency, phone, company } = req.body;
  const updateFields = { name, avatar, currency, phone, company };

  const user = await User.findByIdAndUpdate(
    req.user._id,
    updateFields,
    { new: true, runValidators: true }
  ).select('-password -refreshToken');
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
  se1: 1, se2: 1, se3: 1, se4: 1, se5: 1, se6: 1, se7: 1, se8: 1, se9: 1, se10: 1, se11: 5
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

  if (xp !== undefined) {
    if (xp < 0) {
      res.status(400);
      throw new Error('XP cannot be negative');
    }
    user.xp = xp;
  }

  if (coins !== undefined) {
    if (coins < 0) {
      res.status(400);
      throw new Error('Coins cannot be negative');
    }
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

  if (achievements !== undefined && Array.isArray(achievements)) {
    const existingMap = {};
    user.achievements.forEach(ach => {
      existingMap[ach.id] = ach;
    });

    const updatedAchievements = achievements.map(incoming => {
      const existing = existingMap[incoming.id];
      const limit = ACHIEVEMENT_PROGRESS_LIMITS[incoming.id] || 99999999;

      if (incoming.currentProgress > limit) {
        res.status(400);
        throw new Error(`Achievement progress for ${incoming.id} cannot exceed ${limit}`);
      }

      let unlocked = incoming.unlocked;
      if (existing && existing.unlocked && !incoming.unlocked) {
        unlocked = true;
      }

      const unlockedAt = (unlocked && !(existing && existing.unlocked))
        ? new Date()
        : (existing ? existing.unlockedAt : undefined);

      return {
        id: incoming.id,
        currentProgress: incoming.currentProgress,
        unlocked,
        unlockedAt
      };
    });

    user.achievements = updatedAchievements;
  }

  await user.save();
  sendSuccess(res, 200, 'Gamification progress updated', user);
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


