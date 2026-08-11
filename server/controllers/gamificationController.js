import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { calculateLevel } from '../utils/levelUtils.js';
import {
  REWARD_ACTIONS,
  actionToAchievementMap,
  getActiveMultiplier,
  verifyAchievementEligibility
} from '../utils/rewardUtils.js';

// ─── RANK TIER CONFIG (mirrors client constants) ────────────────────────────
const RANK_TIERS = [
  { name: 'Bronze',   minXP: 0       },
  { name: 'Silver',   minXP: 5000    },
  { name: 'Gold',     minXP: 15000   },
  { name: 'Platinum', minXP: 35000   },
  { name: 'Diamond',  minXP: 70000   },
  { name: 'Master',   minXP: 130000  },
  { name: 'Legend',   minXP: 250000  },
];

function getRankFromXP(lifetimeXP = 0) {
  let rank = RANK_TIERS[0];
  for (const tier of RANK_TIERS) {
    if (lifetimeXP >= tier.minXP) rank = tier;
    else break;
  }
  return rank.name;
}

// Season duration in days
const SEASON_DURATION_DAYS = 30;

function computeSeasonEndDate(startDate) {
  const end = new Date(startDate);
  end.setDate(end.getDate() + SEASON_DURATION_DAYS);
  return end;
}

// ─── GET PROFILE ─────────────────────────────────────────────────────────────
// @route GET /api/gamification/profile
export const getGamificationProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select(
    'name avatar xp coins level streak longestStreak lifetimeXP rank ' +
    'achievements simulatedActions pinnedBadges season rewardChests ' +
    'unlockedTitles unlockedThemes xpHistory'
  );

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Auto-initialise season if missing
  if (!user.season || !user.season.startDate) {
    user.season = {
      number: 1,
      name: 'Season 1: Foundation',
      startDate: new Date(),
      endDate: computeSeasonEndDate(new Date()),
      seasonalXP: user.xp || 0,
    };
    await user.save();
  }

  sendSuccess(res, 200, 'Gamification profile fetched', {
    xp: user.xp,
    coins: user.coins,
    level: user.level,
    streak: user.streak,
    longestStreak: user.longestStreak,
    lifetimeXP: user.lifetimeXP || user.xp,
    rank: user.rank || getRankFromXP(user.lifetimeXP || user.xp),
    achievements: user.achievements || [],
    simulatedActions: user.simulatedActions || [],
    pinnedBadges: user.pinnedBadges || [],
    season: user.season,
    rewardChests: user.rewardChests || [],
    unlockedTitles: user.unlockedTitles || [],
    unlockedThemes: user.unlockedThemes || ['light', 'dark'],
    name: user.name,
    avatar: user.avatar,
  });
});

// ─── GET STATS ───────────────────────────────────────────────────────────────
// @route GET /api/gamification/stats
export const getGamificationStats = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select(
    'xp coins level streak longestStreak lifetimeXP achievements xpHistory'
  );

  if (!user) { res.status(404); throw new Error('User not found'); }

  const history = user.xpHistory || [];
  const now = new Date();

  // XP earned this week
  const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
  const xpThisWeek = history
    .filter(h => new Date(h.timestamp) >= weekAgo)
    .reduce((sum, h) => sum + (h.xp || 0), 0);

  // XP earned this month
  const monthAgo = new Date(now); monthAgo.setDate(monthAgo.getDate() - 30);
  const xpThisMonth = history
    .filter(h => new Date(h.timestamp) >= monthAgo)
    .reduce((sum, h) => sum + (h.xp || 0), 0);

  // Top action category
  const actionCounts = {};
  history.forEach(h => {
    if (h.action) actionCounts[h.action] = (actionCounts[h.action] || 0) + 1;
  });
  const topAction = Object.keys(actionCounts).length > 0
    ? Object.entries(actionCounts).sort((a, b) => b[1] - a[1])[0][0]
    : null;

  const achievements = user.achievements || [];
  const unlocked = achievements.filter(a => a.unlocked).length;
  const badgeCompletionPct = achievements.length > 0
    ? Math.round((unlocked / achievements.length) * 100) : 0;

  // Streak trend last 7 days (simplified — uses xpHistory timestamps)
  const streakTrend = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(now); day.setUTCDate(day.getUTCDate() - i);
    const dayStr = day.toISOString().slice(0, 10);
    const hasActivity = history.some(h => h.timestamp && h.timestamp.toISOString?.()?.startsWith(dayStr));
    streakTrend.push(hasActivity ? 1 : 0);
  }

  // ── Real 49-day activity heatmap ────────────────────────────────────────────
  // Build a Set of YYYY-MM-DD strings from xpHistory for O(1) daily lookup.
  // Read-only: no writes to the User document. Derived purely from stored
  // xpHistory entries — existing data is never mutated.
  const activeDays = new Set();
  for (const entry of history) {
    if (entry.timestamp) {
      const ts = entry.timestamp instanceof Date
        ? entry.timestamp
        : new Date(entry.timestamp);
      if (!isNaN(ts.getTime())) {
        activeDays.add(ts.toISOString().slice(0, 10));
      }
    }
  }

  const todayStr = now.toISOString().slice(0, 10);
  const HEATMAP_DAYS = 49; // 7 weeks × 7 days
  const activityHeatmap = [];
  for (let i = HEATMAP_DAYS - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    activityHeatmap.push({
      date: dateStr,
      active: activeDays.has(dateStr),
      today: dateStr === todayStr,
    });
  }
  // ────────────────────────────────────────────────────────────────────────────

  sendSuccess(res, 200, 'Gamification stats fetched', {
    xpThisWeek,
    xpThisMonth,
    topAction,
    badgeCompletionPct,
    streakTrend,
    totalXP: user.xp,
    lifetimeXP: user.lifetimeXP || user.xp,
    currentLevel: user.level,
    longestStreak: user.longestStreak,
    currentStreak: user.streak,
    badgesUnlocked: unlocked,
    totalBadges: achievements.length,
    coinsEarned: user.coins,
    activityHeatmap,
  });
});

// ─── GET HISTORY (Timeline) ───────────────────────────────────────────────────
// @route GET /api/gamification/history
export const getGamificationHistory = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('xpHistory');
  if (!user) { res.status(404); throw new Error('User not found'); }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  const history = [...(user.xpHistory || [])].reverse();
  const total = history.length;
  const paginated = history.slice((page - 1) * limit, page * limit);

  sendSuccess(res, 200, 'XP history fetched', {
    history: paginated,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
});

// ─── POST REWARD ─────────────────────────────────────────────────────────────
// @route POST /api/gamification/reward
export const applyGamificationReward = asyncHandler(async (req, res) => {
  const { actionId, description, achievementsUnlocked = [], chestUnlocked } = req.body;

  if (!actionId) { res.status(400); throw new Error('actionId is required'); }

  const user = await User.findById(req.user._id);
  if (!user) { res.status(404); throw new Error('User not found'); }

  const knownAction = REWARD_ACTIONS[actionId];
  if (!knownAction) {
    res.status(400);
    throw new Error(`Invalid actionId: ${actionId}`);
  }

  // Enforce server-side multiplier using the server's own clock, ignoring any client inputs.
  const multiplier = getActiveMultiplier(new Date());

  // Ignore client-provided values and calculate earned XP and coins strictly server-side.
  const earnedXP = Math.round(knownAction.xp * multiplier);
  const earnedCoins = Math.round(knownAction.coins * multiplier);

  user.xp = (user.xp || 0) + earnedXP;
  user.coins = (user.coins || 0) + earnedCoins;
  user.lifetimeXP = (user.lifetimeXP || 0) + earnedXP;

  // Recompute level server-side rather than trusting the client payload
  user.level = calculateLevel(user.xp);

  // Update rank
  user.rank = getRankFromXP(user.lifetimeXP);

  // Update season XP
  if (user.season) {
    user.season.seasonalXP = (user.season.seasonalXP || 0) + earnedXP;
  }

  // Apply achievement unlocks with server-side justification check (Option A)
  if (Array.isArray(achievementsUnlocked) && achievementsUnlocked.length > 0) {
    const validCandidateIds = actionToAchievementMap[actionId] || [];
    for (const achId of achievementsUnlocked) {
      if (!validCandidateIds.includes(achId)) {
        continue; // skip if achievement does not correspond to the logged actionId
      }
      const isEligible = verifyAchievementEligibility(user, achId);
      if (!isEligible) {
        continue; // skip if eligibility criteria are not met on the server
      }

      const existing = user.achievements?.find(a => a.id === achId);
      if (existing && !existing.unlocked) {
        existing.unlocked = true;
        existing.unlockedAt = new Date();
        existing.currentProgress = existing.currentProgress || 1;
      } else if (!existing) {
        user.achievements.push({ id: achId, unlocked: true, unlockedAt: new Date(), currentProgress: 1 });
      }
    }
  }

  // Record reward chest if level-up triggered one
  if (chestUnlocked && chestUnlocked.level) {
    const alreadyOpened = (user.rewardChests || []).some(c => c.level === chestUnlocked.level);
    if (!alreadyOpened) {
      if (!user.rewardChests) user.rewardChests = [];
      user.rewardChests.push({
        level: chestUnlocked.level,
        openedAt: new Date(),
        rewards: chestUnlocked,
      });
      // Give chest coins bonus
      user.coins += (chestUnlocked.coins || 0);
    }
  }

  // Append to xpHistory (cap at 200 entries)
  if (!user.xpHistory) user.xpHistory = [];
  user.xpHistory.push({
    action: actionId,
    xp: earnedXP,
    coins: earnedCoins,
    description: description || actionId.replace(/_/g, ' ').toLowerCase(),
    timestamp: new Date(),
  });
  if (user.xpHistory.length > 200) {
    user.xpHistory = user.xpHistory.slice(-200);
  }

  // Track simulated action
  if (!user.simulatedActions) user.simulatedActions = [];
  if (!user.simulatedActions.includes(actionId)) {
    user.simulatedActions.push(actionId);
  }

  await user.save();

  sendSuccess(res, 200, 'Reward applied', {
    xp: user.xp,
    coins: user.coins,
    level: user.level,
    lifetimeXP: user.lifetimeXP,
    rank: user.rank,
    season: user.season,
    rewardChests: user.rewardChests,
  });
});

// ─── GET CHALLENGES ───────────────────────────────────────────────────────────
// @route GET /api/gamification/challenges
// Returns today's date string so client can use its challengePool logic
export const getDailyChallenges = asyncHandler(async (req, res) => {
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  sendSuccess(res, 200, 'Daily challenges date', { dateStr });
});

// ─── GET LEADERBOARD ─────────────────────────────────────────────────────────
// @route GET /api/gamification/leaderboard
// Returns family members ranked by XP + the requesting user
export const getLeaderboard = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .select('xp coins level streak longestStreak lifetimeXP rank achievements name avatar');

  if (!user) { res.status(404); throw new Error('User not found'); }

  // Try to find family members
  let familyMembers = [];
  try {
    const { default: Family } = await import('../models/Family.js');
    const family = await Family.findOne({
      $or: [{ owner: req.user._id }, { 'members.user': req.user._id }]
    }).populate('members.user', 'xp coins level streak lifetimeXP rank achievements name avatar');

    if (family) {
      familyMembers = (family.members || [])
        .filter(m => m.user && m.user._id.toString() !== req.user._id.toString())
        .map(m => ({
          _id: m.user._id,
          name: m.user.name,
          avatar: m.user.avatar,
          xp: m.user.xp || 0,
          lifetimeXP: m.user.lifetimeXP || m.user.xp || 0,
          coins: m.user.coins || 0,
          level: m.user.level || 1,
          streak: m.user.streak || 0,
          rank: m.user.rank || 'Bronze',
          badgesCount: (m.user.achievements || []).filter(a => a.unlocked).length,
          isCurrentUser: false,
        }));
    }
  } catch {
    // Family module may not exist — gracefully ignore
  }

  const selfEntry = {
    _id: user._id,
    name: user.name,
    avatar: user.avatar,
    xp: user.xp || 0,
    lifetimeXP: user.lifetimeXP || user.xp || 0,
    coins: user.coins || 0,
    level: user.level || 1,
    streak: user.streak || 0,
    rank: user.rank || 'Bronze',
    badgesCount: (user.achievements || []).filter(a => a.unlocked).length,
    isCurrentUser: true,
  };

  const allEntries = [selfEntry, ...familyMembers]
    .sort((a, b) => (b.lifetimeXP || 0) - (a.lifetimeXP || 0))
    .map((entry, idx) => ({ ...entry, rank_position: idx + 1 }));

  sendSuccess(res, 200, 'Leaderboard fetched', { leaderboard: allEntries });
});

// ─── PATCH PINNED BADGES ─────────────────────────────────────────────────────
// @route PATCH /api/gamification/pins
export const updatePinnedBadges = asyncHandler(async (req, res) => {
  const { pinnedBadges } = req.body;

  if (!Array.isArray(pinnedBadges) || pinnedBadges.length > 3) {
    res.status(400);
    throw new Error('pinnedBadges must be an array of up to 3 badge IDs');
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { pinnedBadges },
    { new: true }
  ).select('pinnedBadges');

  sendSuccess(res, 200, 'Pinned badges updated', { pinnedBadges: user.pinnedBadges });
});

// ─── PATCH ACHIEVEMENTS (progress sync) ─────────────────────────────────────
// @route PATCH /api/gamification/achievements
export const syncAchievements = asyncHandler(async (req, res) => {
  const { achievements } = req.body;
  if (!Array.isArray(achievements)) {
    res.status(400);
    throw new Error('achievements must be an array');
  }

  const user = await User.findById(req.user._id);
  if (!user) { res.status(404); throw new Error('User not found'); }

  const existingMap = {};
  (user.achievements || []).forEach(a => { existingMap[a.id] = a; });

  for (const incoming of achievements) {
    const existing = existingMap[incoming.id];
    
    let shouldUnlock = false;
    if (incoming.unlocked) {
      const isEligible = verifyAchievementEligibility(user, incoming.id);
      if (isEligible) {
        shouldUnlock = true;
      }
    }

    if (existing) {
      // Never regress progress, never un-unlock
      existing.currentProgress = Math.max(existing.currentProgress || 0, incoming.currentProgress || 0);
      if (!existing.unlocked && shouldUnlock) {
        existing.unlocked = true;
        existing.unlockedAt = new Date();
      }
    } else {
      user.achievements.push({
        id: incoming.id,
        currentProgress: incoming.currentProgress || 0,
        unlocked: shouldUnlock,
        unlockedAt: shouldUnlock ? new Date() : undefined,
      });
    }
  }

  await user.save();
  sendSuccess(res, 200, 'Achievements synced', { achievements: user.achievements });
});
