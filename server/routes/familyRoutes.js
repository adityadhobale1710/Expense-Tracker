import express from 'express';
import { getFamily, inviteMember, createApprovalRequest, approveRequest, rejectRequest } from '../controllers/familyController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

router.route('/')
  .get(getFamily);

router.post('/invite', inviteMember);
router.post('/approval-request', createApprovalRequest);
router.post('/approve/:id', approveRequest);
router.post('/reject/:id', rejectRequest);

export default router;
