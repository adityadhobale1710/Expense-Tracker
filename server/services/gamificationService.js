import User from '../models/User.js';
import GamificationLog from '../models/GamificationLog.js';
import DailyChallengeCompletion from '../models/DailyChallengeCompletion.js';
import { calculateLevel } from '../utils/levelUtils.js';
import {
  REWARD_ACTIONS,
  actionToAchievementMap,
  getActiveMultiplier,
  achievementToActionsMap
} from '../utils/rewardUtils.js';

// Rank configuration mirrored from rewardConstants
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

// Ensure the achievement map is available
function verifyEligibility(user, actionId, achId) {
  const allowedActions = achievementToActionsMap[achId] || [];
  if (allowedActions.length === 0) return false;
  // If the action triggering this check is one of the allowed actions, it's inherently eligible
  if (allowedActions.includes(actionId)) return true;
  
  const hasSimulated = (user.simulatedActions || []).some(a => allowedActions.includes(a));
  const hasHistory = (user.xpHistory || []).some(h => allowedActions.includes(h.action));
  return hasSimulated || hasHistory;
}

function getTodayStr() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

// Safe streak calculation
function evaluateStreak(user, todayStr) {
  const lastDate = user.lastActivityDate;
  if (!lastDate) {
    // Migration: First ever activity sets baseline, does not increment streak to 1 yet.
    // Or, start at 1 if they have 0.
    return {
      streak: Math.max(1, user.streak || 0),
      longestStreak: Math.max(1, user.longestStreak || 0),
      lastActivityDate: new Date(),
    };
  }

  const lastDateStr = `${lastDate.getUTCFullYear()}-${String(lastDate.getUTCMonth() + 1).padStart(2, '0')}-${String(lastDate.getUTCDate()).padStart(2, '0')}`;
  
  if (lastDateStr === todayStr) {
    // Same day, no changes
    return { streak: user.streak, longestStreak: user.longestStreak, lastActivityDate: user.lastActivityDate };
  }

  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayStr = `${yesterday.getUTCFullYear()}-${String(yesterday.getUTCMonth() + 1).padStart(2, '0')}-${String(yesterday.getUTCDate()).padStart(2, '0')}`;

  let newStreak = user.streak || 0;
  if (lastDateStr === yesterdayStr) {
    newStreak += 1; // Consecutive day
  } else {
    newStreak = 1; // Missed a day, reset
  }

  return {
    streak: newStreak,
    longestStreak: Math.max(newStreak, user.longestStreak || 0),
    lastActivityDate: new Date(),
  };
}

async function processRewardCore(userId, actionId, options = {}) {
  const { description = null } = options;
  const knownAction = REWARD_ACTIONS[actionId];
  if (!knownAction) throw new Error(`Invalid actionId: ${actionId}`);

  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  const todayStr = getTodayStr();
  const multiplier = getActiveMultiplier(new Date());
  const earnedXP = Math.round(knownAction.xp * multiplier);
  const earnedCoins = Math.round(knownAction.coins * multiplier);

  // 1. Calculate XP updates
  const newXP = (user.xp || 0) + earnedXP;
  const newLifetimeXP = (user.lifetimeXP || 0) + earnedXP;
  const newLevel = calculateLevel(newXP);
  const newRank = getRankFromXP(newLifetimeXP);

  // 2. Evaluate Season Reset
  let newSeason = user.season;
  if (user.season && user.season.endDate && new Date() > user.season.endDate) {
    const end = new Date();
    end.setDate(end.getDate() + 30); // Next season duration
    newSeason = {
      ...user.season,
      number: user.season.number + 1,
      name: `Season ${user.season.number + 1}`,
      startDate: new Date(),
      endDate: end,
      seasonalXP: earnedXP, // Reset to only this reward
    };
  } else if (newSeason) {
    newSeason.seasonalXP = (newSeason.seasonalXP || 0) + earnedXP;
  }

  // 3. Evaluate Streak
  const { streak, longestStreak, lastActivityDate } = evaluateStreak(user, todayStr);

  // 4. Evaluate Achievements
  let updatedAchievements = [...(user.achievements || [])];
  const validCandidateIds = actionToAchievementMap[actionId] || [];
  let achievementsUnlocked = [];

  for (const achId of validCandidateIds) {
    const isEligible = verifyEligibility(user, actionId, achId);
    if (!isEligible) continue;

    const existingIdx = updatedAchievements.findIndex(a => a.id === achId);
    if (existingIdx !== -1) {
      if (!updatedAchievements[existingIdx].unlocked) {
        updatedAchievements[existingIdx] = {
          ...updatedAchievements[existingIdx],
          unlocked: true,
          unlockedAt: new Date(),
          currentProgress: 1,
        };
        achievementsUnlocked.push(achId);
      }
    } else {
      updatedAchievements.push({ id: achId, unlocked: true, unlockedAt: new Date(), currentProgress: 1 });
      achievementsUnlocked.push(achId);
    }
  }

  // Track simulated actions (for future evaluations)
  const newSimulatedActions = [...new Set([...(user.simulatedActions || []), actionId])];

  // 5. Execute Atomic Update
  const updatePayload = {
    $inc: { coins: earnedCoins },
    $set: {
      xp: newXP, // using $set for derived values to maintain safety with calculations
      lifetimeXP: newLifetimeXP,
      level: newLevel,
      rank: newRank,
      season: newSeason,
      streak: streak,
      longestStreak: longestStreak,
      lastActivityDate: lastActivityDate,
      achievements: updatedAchievements,
      simulatedActions: newSimulatedActions,
    },
    $push: {
      xpHistory: {
        $each: [{
          action: actionId,
          xp: earnedXP,
          coins: earnedCoins,
          description: description || actionId.replace(/_/g, ' ').toLowerCase(),
          timestamp: new Date()
        }],
        $slice: -200 // Cap history
      }
    }
  };

  const updatedUser = await User.findByIdAndUpdate(userId, updatePayload, { new: true });
  
  return {
    actionId,
    xpAdded: earnedXP,
    coinsAdded: earnedCoins,
    level: newLevel,
    streak,
    achievementsUnlocked,
    gamificationData: {
      xp: updatedUser.xp,
      lifetimeXP: updatedUser.lifetimeXP,
      coins: updatedUser.coins,
      level: updatedUser.level,
      rank: updatedUser.rank,
      streak: updatedUser.streak,
      achievements: updatedUser.achievements,
      season: updatedUser.season
    }
  };
}

export const awardBusinessXP = async ({ userId, actionId, entityId }) => {
  // Idempotency: entity-based
  try {
    await GamificationLog.create({
      user: userId,
      actionId,
      entityId,
      status: 'PENDING'
    });
  } catch (err) {
    if (err.code === 11000) return null; // Already processed, perfectly safe
    throw err;
  }

  try {
    const result = await processRewardCore(userId, actionId);
    await GamificationLog.findOneAndUpdate(
      { user: userId, actionId, entityId },
      { $set: { status: 'COMPLETED' } }
    );
    return result;
  } catch (err) {
    console.error(`Gamification Business Reward Failed [${actionId}]:`, err);
    throw err; // Left as PENDING
  }
};

export const logEngagementXP = async ({ userId, actionId, dateString }) => {
  // Idempotency: daily-based
  try {
    await GamificationLog.create({
      user: userId,
      actionId,
      dateString,
      status: 'PENDING'
    });
  } catch (err) {
    if (err.code === 11000) return null; // Already processed today
    throw err;
  }

  try {
    const result = await processRewardCore(userId, actionId);
    await GamificationLog.findOneAndUpdate(
      { user: userId, actionId, dateString },
      { $set: { status: 'COMPLETED' } }
    );
    return result;
  } catch (err) {
    console.error(`Gamification Engagement Reward Failed [${actionId}]:`, err);
    throw err; 
  }
};

export const completeDailyChallenge = async ({ userId, challengeId, dateString, actionId }) => {
  try {
    await DailyChallengeCompletion.create({
      user: userId,
      challengeId,
      dateString,
    });
  } catch (err) {
    if (err.code === 11000) return null; // Already completed today
    throw err;
  }
  
  // Use COMPLETE_CHALLENGE action by default, or specific actionId if provided
  const targetAction = actionId || 'COMPLETE_CHALLENGE';
  
  try {
    // Can just call core reward, we rely on DailyChallengeCompletion for idempotency here
    return await processRewardCore(userId, targetAction, { description: `Completed challenge: ${challengeId}` });
  } catch(err) {
    console.error(`Gamification Challenge Failed [${challengeId}]:`, err);
    // Since completion was logged, we delete it if reward fails so user can retry
    await DailyChallengeCompletion.findOneAndDelete({ user: userId, challengeId, dateString });
    throw err;
  }
};
