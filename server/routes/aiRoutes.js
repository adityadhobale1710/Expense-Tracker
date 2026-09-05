import express from 'express';
import { getChatHistory, sendMessage, clearHistory } from '../controllers/aiController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { aiChatSchema } from '../middleware/schemas.js';

const router = express.Router();
router.use(protect);

router.get('/history', getChatHistory);
// AUDIT-ARCH-007: DELETE /history clears backend conversation history on "New Chat"
router.delete('/history', clearHistory);
router.post('/chat', validate(aiChatSchema), sendMessage);

export default router;
