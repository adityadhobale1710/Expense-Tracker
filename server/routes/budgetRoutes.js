import express from 'express';
import { getBudgets, createBudget, getBudget, updateBudget, deleteBudget } from '../controllers/budgetController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

router.route('/').get(getBudgets).post(createBudget);
router.route('/:id').get(getBudget).put(updateBudget).delete(deleteBudget);

export default router;
