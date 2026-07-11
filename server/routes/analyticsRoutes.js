import express from 'express';
import {
  getAnalyticsSummary,
  getAnalyticsMonthly,
  getAnalyticsCategory,
  getAnalyticsTrend,
  getAnalyticsCashflow,
  getAnalyticsHeatmap,
  getAnalyticsIncome,
  exportPDF,
  exportExcel,
  exportCSV
} from '../controllers/analyticsController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Secure all endpoints with Bearer Auth Protect middleware
router.use(protect);

router.get('/summary', getAnalyticsSummary);
router.get('/monthly', getAnalyticsMonthly);
router.get('/category', getAnalyticsCategory);
router.get('/trend', getAnalyticsTrend);
router.get('/cashflow', getAnalyticsCashflow);
router.get('/heatmap', getAnalyticsHeatmap);
router.get('/income', getAnalyticsIncome);

// Report exporters
router.get('/export/pdf', exportPDF);
router.get('/export/excel', exportExcel);
router.get('/export/csv', exportCSV);

export default router;
