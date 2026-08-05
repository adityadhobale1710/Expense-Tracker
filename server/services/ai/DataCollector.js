/**
 * DataCollector.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Utility service to load all user financial records from the centralized
 * FinancialDataService to ensure absolute consistency with the Dashboard UI.
 */

import FinancialDataService from '../financial/FinancialDataService.js';
import logger from '../../utils/logger.js';

export const collectFinancialData = async (userId, dateRanges = {}) => {
  const startTime = Date.now();

  const defaultStart = new Date();
  defaultStart.setDate(defaultStart.getDate() - 30);

  const startDate = dateRanges.expensesStartDate || defaultStart;
  const endDate = dateRanges.expensesEndDate || new Date();

  // Load via unified Snapshot
  const snapshot = await FinancialDataService.getFinancialSnapshot(userId, { startDate, endDate });

  const duration = Date.now() - startTime;
  logger.info(`[DataCollector] Gathered all collections via FinancialDataService in ${duration}ms.`);

  return snapshot;
};

