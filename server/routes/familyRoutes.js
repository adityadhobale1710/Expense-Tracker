import express from 'express';
import { getFamily, inviteMember, createApprovalRequest, approveRequest, rejectRequest } from '../controllers/familyController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { familyInviteSchema, familyApprovalRequestSchema } from '../middleware/schemas.js';

const router = express.Router();
router.use(protect);

router.route('/')
  .get(getFamily);

router.post('/invite', validate(familyInviteSchema), inviteMember);
router.post('/approval-request', validate(familyApprovalRequestSchema), createApprovalRequest);
router.post('/approve/:id', approveRequest);
router.post('/reject/:id', rejectRequest);

export default router;
