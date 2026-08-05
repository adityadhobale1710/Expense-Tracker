import express from 'express';
import { getChatHistory, sendMessage, getAIInsights, getMonthlyReport } from '../controllers/aiController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

router.get('/history', getChatHistory);
router.post('/chat', sendMessage);
router.get('/insights', getAIInsights);
router.get('/report', getMonthlyReport);

export default router;

