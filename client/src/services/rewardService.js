// rewardService.js — Pure JS, zero React imports.
// Computes rewards for actions and returns a plain object.
// GamificationContext consumes this and dispatches the result.

import { REWARD_ACTIONS, getActiveMultiplier, CHEST_REWARDS } from '../constants/rewardConstants.js';
import { PROGRESSION_LEVELS } from '../pages/Achievements/achievementsData.js';

// ─── LEVEL CALCULATION HELPERS ───────────────────────────────────────────────

/**
 * Calculate the current level based on XP.
 * @param {number} xp
 * @returns {{ currentLvl, nextLvl, level: number }}
 */
export function calculateLevel(xp = 0) {
  let currentLvl = PROGRESSION_LEVELS[0];
  let nextLvl = PROGRESSION_LEVELS[1] || PROGRESSION_LEVELS[0];

  for (let i = 0; i < PROGRESSION_LEVELS.length; i++) {
    if (xp >= PROGRESSION_LEVELS[i].xpRequired) {
      currentLvl = PROGRESSION_LEVELS[i];
      nextLvl = PROGRESSION_LEVELS[i + 1] || PROGRESSION_LEVELS[i];
    } else {
      break;
    }
  }
  return { currentLvl, nextLvl, level: currentLvl.level };
}

/**
 * Calculate XP progress percentage within the current level.
 * @param {number} xp
 * @returns {number} 0–100
 */
export function calculateXPProgress(xp = 0) {
  const { currentLvl, nextLvl } = calculateLevel(xp);
  if (currentLvl.level === PROGRESSION_LEVELS[PROGRESSION_LEVELS.length - 1].level) return 100;
  const base = currentLvl.xpRequired;
  const target = nextLvl.xpRequired;
  return Math.min(Math.round(((xp - base) / (target - base)) * 100), 100);
}

/**
 * XP required for the next level.
 * @param {number} xp
 * @returns {number}
 */
export function calculateNextLevelXP(xp = 0) {
  const { nextLvl } = calculateLevel(xp);
  return nextLvl.xpRequired;
}

// ─── ACHIEVEMENT CHECKS ──────────────────────────────────────────────────────

/**
 * Check if any achievements are newly unlocked by this action.
 * Returns array of achievement IDs that should now be unlocked.
 * @param {string} actionId
 * @param {Array} achievements — current achievements state
 * @returns {string[]} IDs of newly unlocked achievements
 */
function checkAchievements(actionId, achievements = []) {
  const actionToAchievementMap = {
    ADD_INCOME:             ['c1'],
    ADD_EXPENSE:            [],
    UPLOAD_RECEIPT:         ['p4'],
    CATEGORIZE_EXPENSE:     [],
    EXPORT_REPORTS:         ['p1', 'p2', 'p3'],
    CREATE_BUDGET:          ['b1'],
    ADD_GOAL:               ['s2'],
    GOAL_COMPLETED:         ['s4'],
    REACH_GOAL:             ['s4'],
    GOAL_CONTRIBUTION:      [],
    ADD_INVESTMENT:         ['i1'],
    ADD_LOAN:               ['loan1'],
    MAKE_LOAN_PAYMENT:      ['loan2'],
    PAY_EMI:                ['loan2'],
    PAYOFF_LOAN:            ['loan5'],
    PAY_LOAN_ON_TIME:       [],
    ADD_WALLET:             ['wal1'],
    WALLET_TRANSFER:        ['wal3', 'p8'],
    TRANSFER:               ['wal3', 'p8'],
    DIVERSE_WALLETS:        ['wal6'],
    WALLET_MILESTONE:       [],
    WALLET_BALANCE_30D:     [],
    ADD_SUBSCRIPTION:       ['sub1', 'p9'],
    VIEW_SUBSCRIPTIONS:     ['sub3'],
    CANCEL_SUBSCRIPTION:    ['sub4'],
    SWITCH_ANNUAL_PLAN:     ['sub6'],
    SUBSCRIPTION_RENEWED:   [],
    REVIEW_SUB_BUDGET:      [],
    VIEW_ANALYTICS:         [],
    COMPLETE_REVIEW:        [],
    TRACK_BILLS:            [],
    PAY_BILLS_ON_TIME:      [],
    CREATE_FAMILY:          ['fam1'],
    INVITE_FAMILY_MEMBER:   ['fam2'],
    LOG_FAMILY_EXPENSE:     ['fam4'],
    SET_FAMILY_BUDGET:      ['fam5'],
    FAMILY_ACTIVE_30D:      [],
    CREATE_SPLIT_BILL:      ['p10'],
    SETTLE_SPLIT_BILL:      ['fam6', 'p11'],
    DAILY_LOGIN:            ['c1'],
    MAINTAIN_STREAK:        [],
    BACKUP_DATA:            [],
    COMPLETE_CHALLENGE:     [],
    INVITE_FRIENDS:         [],
  };

  const candidateIds = actionToAchievementMap[actionId] || [];
  return candidateIds.filter(id => {
    const ach = achievements.find(a => a.id === id);
    return ach && !ach.unlocked;
  });
}

/**
 * Check if a reward chest should be unlocked on level transition.
 * @param {number} oldLevel
 * @param {number} newLevel
 * @param {Array} openedChests — levels already opened
 * @returns {object|null} chest reward or null
 */
function checkChest(oldLevel, newLevel, openedChests = []) {
  for (let lvl = oldLevel + 1; lvl <= newLevel; lvl++) {
    if (lvl % 5 === 0 && CHEST_REWARDS[lvl] && !openedChests.includes(lvl)) {
      return { level: lvl, ...CHEST_REWARDS[lvl] };
    }
  }
  return null;
}

// ─── CORE COMPUTE FUNCTION ───────────────────────────────────────────────────

/**
 * Pure reward computation — no React, no side effects.
 *
 * @param {string} actionId  — key from REWARD_ACTIONS
 * @param {object} currentState — { xp, coins, level, achievements, openedChests }
 * @returns {{
 *   xp: number,
 *   coins: number,
 *   baseXP: number,
 *   multiplier: number,
 *   multiplierInfo: object,
 *   achievementsUnlocked: string[],
 *   levelUp: { from: number, to: number } | null,
 *   chestUnlocked: object | null,
 *   valid: boolean,
 *   actionId: string,
 * }}
 */
export function computeReward(actionId, currentState = {}) {
  const action = REWARD_ACTIONS[actionId];
  if (!action) {
    return { valid: false, xp: 0, coins: 0, achievementsUnlocked: [], levelUp: null, chestUnlocked: null, actionId };
  }

  const {
    xp: currentXP = 0,
    achievements = [],
    openedChests = [],
  } = currentState;

  // Apply active multiplier
  const multiplierInfo = getActiveMultiplier();
  const multiplier = multiplierInfo.value;

  const earnedXP = Math.round(action.xp * multiplier);
  const earnedCoins = Math.round(action.coins * multiplier);

  const newXP = currentXP + earnedXP;

  // Level transition check
  const oldLevel = calculateLevel(currentXP).level;
  const newLevel = calculateLevel(newXP).level;
  const levelUp = newLevel > oldLevel ? { from: oldLevel, to: newLevel } : null;

  // Achievement unlocks triggered by this action
  const achievementsUnlocked = checkAchievements(actionId, achievements);

  // Chest unlock check on level-up
  const chestUnlocked = levelUp ? checkChest(oldLevel, newLevel, openedChests) : null;

  return {
    valid: true,
    actionId,
    xp: earnedXP,
    coins: earnedCoins,
    baseXP: action.xp,
    multiplier,
    multiplierInfo,
    achievementsUnlocked,
    levelUp,
    chestUnlocked,
  };
}

/**
 * Batch compute — for multiple actions at once (e.g. initial sync).
 * @param {string[]} actionIds
 * @param {object} currentState
 * @returns {object} aggregated reward
 */
export function computeBatchReward(actionIds = [], currentState = {}) {
  let state = { ...currentState };
  let totalXP = 0;
  let totalCoins = 0;
  let allAchievements = [];
  let finalLevelUp = null;
  let finalChest = null;

  for (const actionId of actionIds) {
    const reward = computeReward(actionId, state);
    if (!reward.valid) continue;

    totalXP += reward.xp;
    totalCoins += reward.coins;
    allAchievements = [...new Set([...allAchievements, ...reward.achievementsUnlocked])];

    if (reward.levelUp) finalLevelUp = reward.levelUp;
    if (reward.chestUnlocked) finalChest = reward.chestUnlocked;

    // Update intermediate state for next iteration
    state = { ...state, xp: (state.xp || 0) + reward.xp };
  }

  return {
    xp: totalXP,
    coins: totalCoins,
    achievementsUnlocked: allAchievements,
    levelUp: finalLevelUp,
    chestUnlocked: finalChest,
  };
}
