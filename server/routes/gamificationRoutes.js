import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getGamificationProfile,
  getGamificationStats,
  getGamificationHistory,
  applyGamificationReward,
  getDailyChallenges,
  getLeaderboard,
  updatePinnedBadges,
  syncAchievements,
} from '../controllers/gamificationController.js';

const router = express.Router();

// All gamification routes require authentication
router.use(protect);

router.get('/profile',     getGamificationProfile);
router.get('/stats',       getGamificationStats);
router.get('/history',     getGamificationHistory);
router.get('/challenges',  getDailyChallenges);
router.get('/leaderboard', getLeaderboard);

router.post('/reward',         applyGamificationReward);
router.patch('/pins',          updatePinnedBadges);
router.patch('/achievements',  syncAchievements);

export default router;
