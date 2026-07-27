import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
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
  .post(createBill);

router.route('/stats')
  .get(getBillStats);

router.route('/:id')
  .put(updateBill)
  .delete(deleteBill);

router.route('/:id/pay')
  .post(markBillPaid);

router.route('/:id/skip')
  .post(skipBill);

router.route('/:id/postpone')
  .post(postponeBill);

router.route('/:id/duplicate')
  .post(duplicateBill);

export default router;
