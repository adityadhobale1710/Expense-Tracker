import express from 'express';
import { getLoans, createLoan, updateLoan, deleteLoan, payEmi } from '../controllers/loanController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { loanSchema, loanUpdateSchema, payEmiSchema } from '../middleware/schemas.js';

const router = express.Router();
router.use(protect);

router.route('/')
  .get(getLoans)
  .post(validate(loanSchema), createLoan);

router.route('/:id')
  .put(validate(loanUpdateSchema), updateLoan)
  .delete(deleteLoan);

router.post('/:id/pay-emi', validate(payEmiSchema), payEmi);

export default router;
