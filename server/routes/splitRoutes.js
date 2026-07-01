import express from 'express';
import { getSplits, createSplit, settleMember, updateSplit } from '../controllers/splitController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

router.route('/')
  .get(getSplits)
  .post(createSplit);

router.route('/:id')
  .put(updateSplit);

router.post('/:id/settle', settleMember);

export default router;
