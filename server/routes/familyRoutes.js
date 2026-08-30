import express from 'express';
import {
  getFamily,
  inviteMember,
  getInvitation,
  acceptInvitation,
  cancelInvitation,
  createApprovalRequest,
  approveRequest,
  rejectRequest,
} from '../controllers/familyController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { familyInviteSchema, familyApprovalRequestSchema } from '../middleware/schemas.js';

const router = express.Router();

// ── Public invitation lookup ──────────────────────────────────────────────────
// The Accept Invitation page calls this to preview the invitation before login.
// It must be BEFORE router.use(protect) so it does not require a Bearer token.
router.get('/invite/:token', getInvitation);

// ── All routes below require authentication ───────────────────────────────────
router.use(protect);

router.route('/').get(getFamily);

router.post('/invite', validate(familyInviteSchema), inviteMember);
router.delete('/invite/:id', cancelInvitation);

// Authenticated acceptance — user must be logged in as the invited email
router.post('/invite/accept', acceptInvitation);

router.post('/approval-request', validate(familyApprovalRequestSchema), createApprovalRequest);
router.post('/approve/:id', approveRequest);
router.post('/reject/:id', rejectRequest);

export default router;
