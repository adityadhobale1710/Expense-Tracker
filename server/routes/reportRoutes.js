import express from 'express';
import { getSummary, getMonthlyReport, getCategoryReport } from '../controllers/reportController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

router.get('/summary', getSummary);
router.get('/monthly', getMonthlyReport);
router.get('/by-category', getCategoryReport);

export default router;
