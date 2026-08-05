/**
 * AIInsightsOrchestrator.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Primary manager for the unified AI Insights flow. Coordinates cache evaluations,
 * loads snapshots, and calls all modular financial analysis engines in parallel.
 */

import { getFinancialSnapshotNormalized } from '../financial/FinancialDataAggregator.js';
import { calculateFinancialHealth } from './FinancialHealthService.js';
import { getInsights } from './InsightService.js';
import { getPredictions } from './PredictionService.js';
import { getRecommendations } from './RecommendationService.js';
import { getAlerts } from './AlertService.js';
import { generateNarrative } from './AIReportNarrator.js';
import AIChat from '../../models/AIChat.js';
import logger from '../../utils/logger.js';

const CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache TTL

/**
 * Orchestrates unified AI Insight pipeline for a user.
 * 
 * @param {string} userId - User identifier
 * @param {boolean} [forceRefresh=false] - Bypass cache read
 * @returns {Promise<object>} Unified insights response payload
 */
export const generateInsightsUnified = async (userId, forceRefresh = false) => {
  const orchestratorStart = Date.now();

  // 1. Fetch AIChat for Cache evaluation
  let chat = await AIChat.findOneAndUpdate(
    { user: userId },
    {},
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  if (!forceRefresh && chat && chat.insightsCache && chat.insightsCache.timestamp) {
    const age = Date.now() - chat.insightsCache.timestamp;
    if (age < CACHE_TTL && chat.insightsCache.data) {
      logger.info(`[AIInsightsOrchestrator] Cache HIT for user: ${userId} (age: ${Math.round(age / 1000)}s)`);
      return chat.insightsCache.data;
    }
  }

  logger.info(`[AIInsightsOrchestrator] Cache MISS or Forced Refresh. Re-aggregating data...`);

  // 2. Fetch Aggregated normalized data snapshot
  const snapshot = await getFinancialSnapshotNormalized(userId);

  // 3. Execute calculations in parallel
  const health = calculateFinancialHealth(snapshot);
  const insights = getInsights(snapshot);
  const predictions = getPredictions(snapshot);
  const recommendations = getRecommendations(snapshot);
  const alerts = getAlerts(snapshot);

  // 4. Generate AI narrative summary brief
  const narrative = await generateNarrative(snapshot, health, insights);

  const durationMs = Date.now() - orchestratorStart;
  const generatedIn = `${durationMs} ms`;

  // 5. Structure final payload
  const result = {
    summary: narrative,
    financialHealth: {
      score: health.score,
      grade: health.grade,
      strengths: health.strengths,
      weaknesses: health.weaknesses,
      improvementAreas: health.improvementAreas,
      metricBreakdown: health.metricBreakdown
    },
    spending: insights.spending,
    budget: insights.budget,
    goals: insights.goals,
    savings: insights.savings,
    loans: insights.loans,
    subscriptions: insights.subscriptions,
    predictions,
    alerts,
    recommendations,
    lastGenerated: new Date().toISOString(),
    generatedIn
  };

  // 6. Save cache back to AIChat
  if (chat) {
    try {
      await AIChat.updateOne(
        { user: userId },
        {
          $set: {
            'insightsCache.data': result,
            'insightsCache.timestamp': Date.now()
          }
        }
      );
      logger.info(`[AIInsightsOrchestrator] Cache updated successfully for user: ${userId}`);
    } catch (err) {
      logger.warn(`[AIInsightsOrchestrator] Failed to persist cache: ${err.message}`);
    }
  }

  return result;
};
