import express from 'express';
import { getLoans, createLoan, updateLoan, deleteLoan, payEmi } from '../controllers/loanController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

router.route('/')
  .get(getLoans)
  .post(createLoan);

router.route('/:id')
  .put(updateLoan)
  .delete(deleteLoan);

router.post('/:id/pay-emi', payEmi);

export default router;
