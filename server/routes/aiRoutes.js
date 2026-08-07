import express from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { getChatHistory, sendMessage } from '../controllers/aiController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

// M6: Dedicated rate limiter for POST /chat only — 15 requests per 15 minutes.
// Keys by authenticated userId when available, falls back to IP so unauthenticated
// requests can't bypass by omitting credentials.
// TODO: This uses express-rate-limit's default in-memory store. Rate limits are single-instance 
// and will reset on server restarts. If this app is deployed across multiple instances, 
// rate-limit-redis (and redis) should be added to share quota state.
const chatRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
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
    message: 'Too many messages sent. Please wait 15 minutes before sending more.',
  },
});

router.get('/history', getChatHistory);
router.post('/chat', chatRateLimiter, sendMessage);

export default router;
