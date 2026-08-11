import express from 'express';
import { getSubscriptions, createSubscription, updateSubscription, deleteSubscription } from '../controllers/subscriptionController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { subscriptionSchema, subscriptionUpdateSchema } from '../middleware/schemas.js';

const router = express.Router();
router.use(protect);

router.route('/')
  .get(getSubscriptions)
  .post(validate(subscriptionSchema), createSubscription);

router.route('/:id')
  .put(validate(subscriptionUpdateSchema), updateSubscription)
  .delete(deleteSubscription);

export default router;
