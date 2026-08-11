import express from 'express';
import { getInvestments, createInvestment, updateInvestment, deleteInvestment, getInvestmentStats } from '../controllers/investmentController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { investmentCreateSchema, investmentUpdateSchema } from '../middleware/schemas.js';

const router = express.Router();
router.use(protect);

router.route('/')
  .get(getInvestments)
  .post(validate(investmentCreateSchema), createInvestment);

router.get('/stats', getInvestmentStats);

router.route('/:id')
  .put(validate(investmentUpdateSchema), updateInvestment)
  .delete(deleteInvestment);

export default router;
