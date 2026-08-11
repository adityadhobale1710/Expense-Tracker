import express from 'express';
import { getBudgets, createBudget, getBudget, updateBudget, deleteBudget, getBudgetAnalytics, getGlobalBudgetAnalytics } from '../controllers/budgetController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { budgetSchema } from '../middleware/schemas.js';

const router = express.Router();
router.use(protect);

router.route('/analytics/global').get(getGlobalBudgetAnalytics);
router.route('/').get(getBudgets).post(validate(budgetSchema), createBudget);
router.route('/:id/analytics').get(getBudgetAnalytics);
router.route('/:id').get(getBudget).put(validate(budgetSchema), updateBudget).delete(deleteBudget);

export default router;
