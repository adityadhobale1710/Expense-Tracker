import express from 'express';
import { getChatHistory, sendMessage } from '../controllers/aiController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

router.get('/history', getChatHistory);
router.post('/chat', sendMessage);

export default router;
