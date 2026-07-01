import express from 'express';
import { getAdminStats, getUsersList, getFeedbackList, updateFeedbackStatus } from '../controllers/adminController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

router.get('/stats', getAdminStats);
router.get('/users', getUsersList);
router.get('/feedback', getFeedbackList);
router.put('/feedback/:id', updateFeedbackStatus);

export default router;
