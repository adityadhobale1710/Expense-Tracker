import express from 'express';
import { getInvestments, createInvestment, updateInvestment, deleteInvestment, getInvestmentStats } from '../controllers/investmentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

router.route('/')
  .get(getInvestments)
  .post(createInvestment);

router.get('/stats', getInvestmentStats);

router.route('/:id')
  .put(updateInvestment)
  .delete(deleteInvestment);

export default router;
