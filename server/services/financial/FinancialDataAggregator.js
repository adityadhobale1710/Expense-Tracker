/**
 * FinancialDataAggregator.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Aggregates all user financial entries and standardizes them into a normalized
 * snapshot to avoid redundant MongoDB queries across modular calculation files.
 */

import FinancialDataService from './FinancialDataService.js';
import logger from '../../utils/logger.js';

/**
 * Normalizes all user financial modules into a single dataset.
 * 
 * @param {string} userId - User identifier
 * @returns {Promise<object>} Unified financial snapshot
 */
export const getFinancialSnapshotNormalized = async (userId) => {
  const startTime = Date.now();

  // Set default current month window
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Fetch full snapshot via canonical FinancialDataService
  const snapshot = await FinancialDataService.getFinancialSnapshot(userId, { startDate, endDate });

  // Pre-load 6-month trend window for averages/stability metrics
  const historicalTrends = await FinancialDataService.getTrendWindow(userId, 6);

  const duration = Date.now() - startTime;
  logger.info(`[FinancialDataAggregator] Unified snapshot loaded in ${duration}ms for user: ${userId}`);

  return {
    user: snapshot.user,
    wallets: snapshot.wallets || [],
    budgets: snapshot.budgets || [],
    goals: snapshot.goals || [],
    loans: snapshot.loans || [],
    subscriptions: snapshot.subscriptions || [],
    expenses: snapshot.expenses || [],
    incomes: snapshot.incomes || [],
    historicalTrends: historicalTrends || { expenses: [], incomes: [] },
    dateRange: { startDate, endDate }
  };
};
