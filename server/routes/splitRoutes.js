import express from 'express';
import { getSplits, createSplit, settleMember, updateSplit, deleteSplit } from '../controllers/splitController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { splitCreateSchema, splitUpdateSchema, splitSettleSchema } from '../middleware/schemas.js';

const router = express.Router();
router.use(protect);

router.route('/')
  .get(getSplits)
  .post(validate(splitCreateSchema), createSplit);

router.route('/:id')
  .put(validate(splitUpdateSchema), updateSplit)
  .delete(deleteSplit);

router.post('/:id/settle', validate(splitSettleSchema), settleMember);

export default router;
