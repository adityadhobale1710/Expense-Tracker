import express from 'express';
import {
  getExpenses, addExpense, getExpense, updateExpense, deleteExpense, getExpenseSummary
} from '../controllers/expenseController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { expenseSchema } from '../middleware/schemas.js';

const router = express.Router();
router.use(protect);

router.get('/summary', getExpenseSummary);
router.route('/').get(getExpenses).post(validate(expenseSchema), addExpense);
router.route('/:id').get(getExpense).put(validate(expenseSchema), updateExpense).delete(deleteExpense);

export default router;
