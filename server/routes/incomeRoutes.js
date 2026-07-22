import express from 'express';
import { getIncomes, addIncome, getIncome, updateIncome, deleteIncome } from '../controllers/incomeController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { incomeSchema } from '../middleware/schemas.js';

const router = express.Router();
router.use(protect);

router.route('/').get(getIncomes).post(validate(incomeSchema), addIncome);
router.route('/:id').get(getIncome).put(validate(incomeSchema), updateIncome).delete(deleteIncome);

export default router;
