import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  getAdminStats,
  getUsersList,
  getFeedbackList,
  updateFeedbackStatus,
  bootstrapAdmin,
} from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// ─── Bootstrap rate limiter ────────────────────────────────────────────────────
// The bootstrap route is intentionally public (no admin exists yet), so we
// protect it against brute-force with a very tight limit: 5 attempts / 15 min.
const bootstrapLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many bootstrap attempts. Please wait 15 minutes and try again.',
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Public route — must be declared BEFORE the protect+authorize middleware ───
// Only reachable when zero admins exist. Self-disables once an admin is created.
router.post('/bootstrap', bootstrapLimiter, bootstrapAdmin);

// ─── All routes below require: authenticated + admin role ─────────────────────
router.use(protect, authorize('admin'));

router.get('/stats', getAdminStats);
router.get('/users', getUsersList);
router.get('/feedback', getFeedbackList);
router.put('/feedback/:id', updateFeedbackStatus);

export default router;
