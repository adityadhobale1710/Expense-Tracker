import express from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { getChatHistory, sendMessage, clearHistory } from '../controllers/aiController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { aiChatSchema } from '../middleware/schemas.js';

const router = express.Router();
router.use(protect);

// M6: Dedicated rate limiter for POST /chat only — 20 requests per 10 minutes.
// Keys by authenticated userId when available, falls back to IP so unauthenticated
// requests can't bypass by omitting credentials.
// TODO: This uses express-rate-limit's default in-memory store. Rate limits are single-instance 
// and will reset on server restarts. If this app is deployed across multiple instances, 
// rate-limit-redis (and redis) should be added to share quota state.
const chatRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20,
  keyGenerator: (req) => {
    if (req.user?._id) {
      return req.user._id.toString();
    }
    return ipKeyGenerator(req.ip);
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many AI requests. Please wait before trying again.',
  },
});

router.get('/history', getChatHistory);
// AUDIT-ARCH-007: DELETE /history clears backend conversation history on "New Chat"
router.delete('/history', clearHistory);
router.post('/chat', chatRateLimiter, validate(aiChatSchema), sendMessage);

export default router;
