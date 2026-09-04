import asyncHandler from 'express-async-handler';
import FinancialDataService from '../services/financial/FinancialDataService.js';
import Category from '../models/Category.js';
import Notification from '../models/Notification.js';
import AIChat from '../models/AIChat.js';
import { sendSuccess } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';
import { getUserDateRange } from '../utils/timezoneUtils.js';
import {
  calculateMonthlyExpense,
  calculateMonthlyIncome,
  calculateSavings,
} from '../services/ai/ToolRegistry.js';

// Cache TTL must match InsightEngine so we agree on freshness (5 min)
const INSIGHTS_CACHE_TTL = 5 * 60 * 1000;

// @desc    Get aggregated dashboard data
// @route   GET /api/dashboard
export const getDashboardData = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // 1. Load canonical snapshot — no transaction limit for accurate financial aggregation
  // MASTER-042/061: Removed { limit: 50 } — totals must be computed across ALL transactions.
  // We load up to 500 for display but compute monetary totals across the full month.
  const { start, end } = getUserDateRange(req);
  const snapshot = await FinancialDataService.getFinancialSnapshot(userId, { startDate: start, endDate: end });

  // 2. Load dashboard specific non-financial UI data
  const [categories, recentNotifications] = await Promise.all([
    Category.find({ user: userId }).sort({ name: 1 }),
    Notification.find({ user: userId }).sort({ createdAt: -1 }).limit(3)
  ]);

  const {
    user: userProfile,
    wallets,
    budgets,
    goals,
    loans,
    subscriptions,
    expenses,
    incomes,
    dateRange
  } = snapshot;

  // Compute summary metrics using ToolRegistry (M4: single source of truth for totals)
  // Filter to the snapshot's date range before calculating
  const rangedExpenses = expenses.filter(
    (e) => new Date(e.date) >= dateRange.startDate && new Date(e.date) <= dateRange.endDate
  );
  const rangedIncomes = incomes.filter(
    (i) => new Date(i.date) >= dateRange.startDate && new Date(i.date) <= dateRange.endDate
  );

  const expSummary = calculateMonthlyExpense(rangedExpenses);
  const incSummary = calculateMonthlyIncome(rangedIncomes);
  const savSummary = calculateSavings(incSummary.total, expSummary.total);

  const totalIncome = incSummary.total;
  const totalExpense = expSummary.total;
  const balance = savSummary.amount;
  const savingsRate = totalIncome > 0 ? Math.round(savSummary.rate) : 0;

  // --- Non-blocking AI Insights ---
  // Read from the MongoDB-persisted cache synchronously; if fresh, use it.
  // If stale/missing, respond immediately with nulls and fire off a background
  // regeneration so the next request (or a polling refresh) will get fresh data.
  // This completely removes Gemini latency and 503 errors from the critical path.
  let insights = null;
  let chatDoc = null;
  try {
    chatDoc = await AIChat.findOneAndUpdate(
      { user: userId },
      {},
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const cache = chatDoc?.insightsCache;
    const cacheAge = cache?.timestamp ? Date.now() - cache.timestamp : Infinity;
    if (cache?.data && cacheAge < INSIGHTS_CACHE_TTL) {
      // Cache is fresh — use it immediately, no background work needed
      insights = cache.data;
      logger.info(`[Dashboard] Serving cached insights for user ${userId} (age: ${Math.round(cacheAge / 1000)}s)`);
    } else {
      // Cache is stale or missing — kick off background regeneration and respond now
      logger.info(`[Dashboard] Insights cache miss for user ${userId}. Firing background regeneration.`);
      import('../services/ai/InsightEngine.js')
        .then(({ generateInsights }) =>
          generateInsights({
            wallets,
            budgets,
            expenses,
            incomes,
            goals,
            loans,
            subscriptions,
            userId,
            chat: chatDoc,
          })
        )
        .catch((err) =>
          logger.warn(`[Dashboard] Background insight regeneration failed: ${err.message}`)
        );
    }
  } catch (err) {
    // A cache-read failure must never crash the dashboard
    logger.warn(`[Dashboard] Failed to read insights cache: ${err.message}`);
  }

  sendSuccess(res, 200, 'Dashboard data aggregated successfully', {
    user: userProfile,
    wallets,
    categories,
    budgets,
    incomes: incomes || [],
    expenses: expenses || [],
    goals,
    subscriptions,
    loans,
    recentNotifications: recentNotifications.map(n => ({
      message: n.message,
      date: new Date(n.createdAt).toLocaleDateString('en-IN')
    })),
    summary: {
      totalIncome,
      totalExpense,
      balance,
      savingsRate
    },
    // Dynamic Proactive Advisor payloads
    // These are null on a cold cache; the frontend already handles null gracefully.
    financialHealth: insights?.financialHealth || null,
    healthScore: insights?.financialHealth?.score || null,
    grade: insights?.financialHealth?.grade || null,
    topInsight: insights?.aiExplanation || null,
    activeRisks: insights?.activeRisks || [],
    recommendations: insights?.recommendations || [],
    trendSummary: insights?.trendSummary || [],
  });
});

