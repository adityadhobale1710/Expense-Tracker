import { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { computeReward, calculateLevel } from '../services/rewardService';
import { getRankFromXP } from '../constants/rewardConstants';
import { INITIAL_ACHIEVEMENTS } from '../pages/Achievements/achievementsData';

// ─── INITIAL STATE ───────────────────────────────────────────────────────────
const initialState = {
  // Core stats (from MongoDB — source of truth)
  xp: 0,
  coins: 0,
  level: 1,
  streak: 0,
  longestStreak: 0,
  lifetimeXP: 0,
  rank: 'Bronze',

  // Achievements
  achievements: INITIAL_ACHIEVEMENTS,
  simulatedActions: [],
  pinnedBadges: [],

  // Season
  season: {
    number: 1,
    name: 'Season 1: Foundation',
    startDate: null,
    endDate: null,
    seasonalXP: 0,
  },

  // Reward chests
  rewardChests: [],
  openedChests: [],

  // UI state
  levelUpData: null,       // { from, to, levelInfo } — triggers LevelUpModal
  chestData: null,         // triggers RewardChestModal
  floatyTexts: [],         // [{ id, text, x, y }]
  notifications: [],       // Steam-style stacked toasts
  confettiActive: false,
  isLoaded: false,         // true after first backend fetch
};

// ─── REDUCER ─────────────────────────────────────────────────────────────────
function gamificationReducer(state, action) {
  switch (action.type) {

    case 'SET_PROFILE': {
      const profile = action.payload;
      // Merge backend data with local achievement definitions
      const mergedAchievements = INITIAL_ACHIEVEMENTS.map(def => {
        const backend = (profile.achievements || []).find(a => a.id === def.id);
        return backend
          ? { ...def, currentProgress: backend.currentProgress, unlocked: backend.unlocked, unlockedAt: backend.unlockedAt }
          : def;
      });
      return {
        ...state,
        xp: profile.xp ?? state.xp,
        coins: profile.coins ?? state.coins,
        level: profile.level ?? state.level,
        streak: profile.streak ?? state.streak,
        longestStreak: profile.longestStreak ?? state.longestStreak,
        lifetimeXP: profile.lifetimeXP ?? profile.xp ?? state.lifetimeXP,
        rank: profile.rank ?? state.rank,
        achievements: mergedAchievements,
        simulatedActions: profile.simulatedActions ?? state.simulatedActions,
        pinnedBadges: profile.pinnedBadges ?? state.pinnedBadges,
        season: profile.season ?? state.season,
        rewardChests: profile.rewardChests ?? state.rewardChests,
        openedChests: (profile.rewardChests || []).map(c => c.level),
        isLoaded: true,
      };
    }

    case 'APPLY_REWARD': {
      const { reward, actionId } = action.payload;
      if (!reward || !reward.valid) return state;

      const newXP = state.xp + reward.xp;
      const newCoins = state.coins + reward.coins;
      const newLifetimeXP = state.lifetimeXP + reward.xp;
      const newLevel = calculateLevel(newXP).level;
      const newRank = getRankFromXP(newLifetimeXP);

      // Update achievement progress
      let newAchievements = state.achievements.map(ach => {
        if (reward.achievementsUnlocked.includes(ach.id) && !ach.unlocked) {
          return { ...ach, unlocked: true, currentProgress: ach.progressNeeded, unlockedAt: new Date() };
        }
        return ach;
      });

      // Level-up data for modal
      const levelUpData = reward.levelUp
        ? { from: reward.levelUp.from, to: reward.levelUp.to }
        : state.levelUpData;

      // Chest data
      const chestData = reward.chestUnlocked || state.chestData;

      // Floaty text
      const floatyId = Date.now() + Math.random();
      const floatyText = { id: floatyId, text: `+${reward.xp} XP`, x: 0, y: 0 };
      const newFloatyTexts = [...state.floatyTexts, floatyText].slice(-5);

      // Achievement unlock notifications
      const achNotifications = reward.achievementsUnlocked.map(id => {
        const ach = state.achievements.find(a => a.id === id);
        return ach ? {
          id: `ach_${id}_${Date.now()}`,
          type: 'achievement',
          title: ach.title,
          icon: ach.icon,
          xp: ach.xpReward,
          timestamp: Date.now(),
        } : null;
      }).filter(Boolean);

      // Level-up notification
      const lvlNotification = reward.levelUp ? [{
        id: `lvl_${reward.levelUp.to}_${Date.now()}`,
        type: 'levelup',
        title: `Level ${reward.levelUp.to} Reached!`,
        icon: '⚡',
        xp: reward.xp,
        timestamp: Date.now(),
      }] : [];

      const newNotifications = [
        ...state.notifications,
        ...achNotifications,
        ...lvlNotification,
      ].slice(-5); // Max 5 stacked

      return {
        ...state,
        xp: newXP,
        coins: newCoins,
        lifetimeXP: newLifetimeXP,
        level: newLevel,
        rank: newRank,
        season: state.season ? { ...state.season, seasonalXP: (state.season.seasonalXP || 0) + reward.xp } : state.season,
        achievements: newAchievements,
        simulatedActions: state.simulatedActions.includes(actionId)
          ? state.simulatedActions
          : [...state.simulatedActions, actionId],
        levelUpData,
        chestData,
        floatyTexts: newFloatyTexts,
        notifications: newNotifications,
        confettiActive: !!(reward.levelUp || reward.achievementsUnlocked.length > 0),
      };
    }

    case 'SPAWN_FLOATY': {
      const { text, x, y } = action.payload;
      const id = Date.now() + Math.random();
      return {
        ...state,
        floatyTexts: [...state.floatyTexts, { id, text, x, y }].slice(-5),
      };
    }

    case 'REMOVE_FLOATY': {
      return {
        ...state,
        floatyTexts: state.floatyTexts.filter(f => f.id !== action.payload),
      };
    }

    case 'CLEAR_LEVEL_UP':
      return { ...state, levelUpData: null, confettiActive: false };

    case 'CLEAR_CHEST':
      return { ...state, chestData: null };

    case 'DISMISS_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload),
      };

    case 'SET_CONFETTI':
      return { ...state, confettiActive: action.payload };

    case 'SET_PINNED_BADGES':
      return { ...state, pinnedBadges: action.payload };

    case 'SET_STREAK':
      return {
        ...state,
        streak: action.payload.streak,
        longestStreak: Math.max(state.longestStreak, action.payload.streak),
      };

    case 'SYNC_ACHIEVEMENTS': {
      const incoming = action.payload;
      const merged = state.achievements.map(def => {
        const update = incoming.find(a => a.id === def.id);
        if (!update) return def;
        return {
          ...def,
          currentProgress: Math.max(def.currentProgress, update.currentProgress || 0),
          unlocked: def.unlocked || update.unlocked,
          unlockedAt: update.unlockedAt || def.unlockedAt,
        };
      });
      return { ...state, achievements: merged };
    }

    default:
      return state;
  }
}

// ─── CONTEXT ─────────────────────────────────────────────────────────────────
const GamificationContext = createContext(null);

export const GamificationProvider = ({ children }) => {
  const [state, dispatch] = useReducer(gamificationReducer, initialState);
  const syncTimerRef = useRef(null);
  const isLoadingRef = useRef(false);

  // ── Load profile from MongoDB on mount (backend = source of truth) ──────
  const loadProfile = useCallback(async () => {
    if (isLoadingRef.current) return;
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    isLoadingRef.current = true;
    try {
      const { data } = await api.get('/gamification/profile');
      if (data.success && data.data) {
        dispatch({ type: 'SET_PROFILE', payload: data.data });
        // Update localStorage cache (secondary)
        localStorage.setItem('gam_cache', JSON.stringify({ ...data.data, cachedAt: Date.now() }));
      }
    } catch {
      // Fallback: try localStorage cache
      try {
        const cached = localStorage.getItem('gam_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          dispatch({ type: 'SET_PROFILE', payload: parsed });
        }
      } catch {}
    } finally {
      isLoadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // ── Debounced backend sync after reward ──────────────────────────────────
  const syncToBackend = useCallback(async (reward, actionId) => {
    clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(async () => {
      try {
        await api.post('/gamification/reward', {
          actionId,
          xp: reward.xp,
          coins: reward.coins,
          description: actionId.replace(/_/g, ' ').toLowerCase(),
          achievementsUnlocked: reward.achievementsUnlocked,
          levelUp: reward.levelUp,
          chestUnlocked: reward.chestUnlocked,
        });
      } catch (err) {
        console.warn('[GamificationContext] Sync failed:', err.message);
      }
    }, 800);
  }, []);

  // ── Apply Reward (called from anywhere in the app) ───────────────────────
  const applyReward = useCallback((actionId, overrideState = null) => {
    const currentState = overrideState || {
      xp: state.xp,
      achievements: state.achievements,
      openedChests: state.openedChests,
    };

    const reward = computeReward(actionId, currentState);
    if (!reward.valid) return;

    dispatch({ type: 'APPLY_REWARD', payload: { reward, actionId } });
    syncToBackend(reward, actionId);

    return reward;
  }, [state.xp, state.achievements, state.openedChests, syncToBackend]);

  // ── Spawn floating XP text ───────────────────────────────────────────────
  const spawnFloaty = useCallback((text, x = 0, y = 0) => {
    dispatch({ type: 'SPAWN_FLOATY', payload: { text, x, y } });
  }, []);

  const removeFloaty = useCallback((id) => {
    dispatch({ type: 'REMOVE_FLOATY', payload: id });
  }, []);

  // ── Clear modals ─────────────────────────────────────────────────────────
  const clearLevelUp = useCallback(() => dispatch({ type: 'CLEAR_LEVEL_UP' }), []);
  const clearChest = useCallback(() => dispatch({ type: 'CLEAR_CHEST' }), []);
  const dismissNotification = useCallback((id) => dispatch({ type: 'DISMISS_NOTIFICATION', payload: id }), []);

  // ── Update pinned badges ─────────────────────────────────────────────────
  const updatePinnedBadges = useCallback(async (badges) => {
    try {
      await api.patch('/gamification/pins', { pinnedBadges: badges });
      dispatch({ type: 'SET_PINNED_BADGES', payload: badges });
    } catch {}
  }, []);

  // ── Sync achievements to backend ─────────────────────────────────────────
  const syncAchievements = useCallback(async (achievements) => {
    try {
      await api.patch('/gamification/achievements', { achievements });
      dispatch({ type: 'SYNC_ACHIEVEMENTS', payload: achievements });
    } catch {}
  }, []);

  // ── XP level helpers (passthrough from rewardService) ───────────────────
  const getLevelInfo = useCallback(() => calculateLevel(state.xp), [state.xp]);

  const value = {
    ...state,
    applyReward,
    spawnFloaty,
    removeFloaty,
    clearLevelUp,
    clearChest,
    dismissNotification,
    updatePinnedBadges,
    syncAchievements,
    loadProfile,
    getLevelInfo,
    dispatch,
  };

  return (
    <GamificationContext.Provider value={value}>
      {children}
    </GamificationContext.Provider>
  );
};

export const useGamification = () => {
  const ctx = useContext(GamificationContext);
  if (!ctx) throw new Error('useGamification must be used within GamificationProvider');
  return ctx;
};

export default GamificationContext;
