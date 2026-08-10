/**
 * DataCollector.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Utility service to load all user financial records from the centralized
 * FinancialDataService to ensure absolute consistency with the Dashboard UI.
 */

import FinancialDataService from '../financial/FinancialDataService.js';
import logger from '../../utils/logger.js';
import { getBoundsForOffset } from '../../utils/timezoneUtils.js';

export const collectFinancialData = async (userId, dateRanges = {}, tzOffset = null) => {
  const startTime = Date.now();

  let startDate = dateRanges.expensesStartDate;
  let endDate = dateRanges.expensesEndDate;
  
  if (!startDate || !endDate) {
    const bounds = getBoundsForOffset(tzOffset, 'last30days');
    if (!startDate) startDate = bounds.start;
    if (!endDate) endDate = bounds.end;
  }

  // Load via unified Snapshot
  const snapshot = await FinancialDataService.getFinancialSnapshot(userId, { startDate, endDate });

  const duration = Date.now() - startTime;
  logger.info(`[DataCollector] Gathered all collections via FinancialDataService in ${duration}ms.`);

  return snapshot;
};

