import express from 'express';
import { getSplits, createSplit, settleMember, updateSplit, deleteSplit } from '../controllers/splitController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

router.route('/')
  .get(getSplits)
  .post(createSplit);

router.route('/:id')
  .put(updateSplit)
  .delete(deleteSplit);

router.post('/:id/settle', settleMember);

export default router;
