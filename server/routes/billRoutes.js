import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import {
  billCreateSchema,
  billUpdateSchema,
  billPaySchema,
  billPostponeSchema,
  billDuplicateSchema,
} from '../middleware/schemas.js';
import {
  getBills,
  createBill,
  updateBill,
  deleteBill,
  markBillPaid,
  skipBill,
  postponeBill,
  duplicateBill,
  getBillStats,
} from '../controllers/billController.js';

const router = express.Router();
router.use(protect);

router.route('/')
  .get(getBills)
  .post(validate(billCreateSchema), createBill);

router.route('/stats')
  .get(getBillStats);

router.route('/:id')
  .put(validate(billUpdateSchema), updateBill)
  .delete(deleteBill);

router.route('/:id/pay')
  .post(validate(billPaySchema), markBillPaid);

router.route('/:id/skip')
  .post(skipBill);

router.route('/:id/postpone')
  .post(validate(billPostponeSchema), postponeBill);

router.route('/:id/duplicate')
  .post(validate(billDuplicateSchema), duplicateBill);

export default router;
