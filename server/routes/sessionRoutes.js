import express from 'express';
import { getSessions, revokeSession } from '../controllers/sessionController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

router.route('/')
  .get(getSessions);

router.route('/:id')
  .delete(revokeSession);

export default router;
