import express from 'express';
import {
  getGoals,
  getGoalStats,
  getGoalTemplates,
  getGoalAnalytics,
  getGoalRecommendations,
  getGoalById,
  getGoalInsights,
  getSpecificGoalAnalytics,
  getGoalContributions,
  createGoal,
  contributeToGoal,
  updateGoal,
  updateGoalStatus,
  deleteGoal,
  deleteContribution
} from '../controllers/goalController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

// Precise Routing Precedence to avoid clash with parametric /:id matching
router.get('/stats', getGoalStats);
router.get('/templates', getGoalTemplates);
router.get('/analytics', getGoalAnalytics);
router.get('/recommendations', getGoalRecommendations);

router.route('/')
  .get(getGoals)
  .post(createGoal);

router.route('/:id')
  .get(getGoalById)
  .put(updateGoal)
  .delete(deleteGoal);

router.put('/:id/status', updateGoalStatus);
router.get('/:id/insights', getGoalInsights);
router.get('/:id/analytics', getSpecificGoalAnalytics);
router.get('/:id/contributions', getGoalContributions);
router.post('/:id/contribute', contributeToGoal);
router.delete('/:id/contributions/:contribId', deleteContribution);

// Legacy backward-compatibility alias
router.post('/:id/deposit', contributeToGoal);

export default router;
