import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  getAdminStats,
  getUsersList,
  getUserById,
  updateUserStatus,
  revokeUserSessions,
  getFeedbackList,
  updateFeedbackStatus,
  bootstrapAdmin,
  getUserActivity,
  getUserSessions,
  revokeIndividualSession,
  getSecurityEvents,
  getSecurityOverview,
  getAdminAnalytics,
  exportAdminAnalytics,
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

// Overview statistics
router.get('/stats', getAdminStats);

// User management — paginated, searchable, filterable
router.get('/users', getUsersList);

// User detail
router.get('/users/:id', getUserById);

// Account status actions: block / unblock / disable / enable
// Body: { action: 'block' | 'unblock' | 'disable' | 'enable' }
router.patch('/users/:id/status', updateUserStatus);

// Revoke all sessions for a user
router.post('/users/:id/revoke-sessions', revokeUserSessions);

// Phase 3: User Activity & Session Management
router.get('/users/:id/activity', getUserActivity);
router.get('/users/:id/sessions', getUserSessions);
router.post('/users/:id/sessions/:sessionId/revoke', revokeIndividualSession);

// Phase 3: Security Center
router.get('/security/events', getSecurityEvents);
router.get('/security/overview', getSecurityOverview);

// Phase 4: Admin Analytics & Exports
router.get('/analytics', getAdminAnalytics);
router.get('/analytics/export/:type', exportAdminAnalytics);

// Feedback management
router.get('/feedback', getFeedbackList);
router.put('/feedback/:id', updateFeedbackStatus);

export default router;
