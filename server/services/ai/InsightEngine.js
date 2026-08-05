import { calculateFinancialHealth } from './FinancialHealthService.js';
import { analyzeRisks } from './RiskAnalyzer.js';
import { analyzeTrends } from './TrendAnalyzer.js';
import { generateRecommendations } from './RecommendationEngine.js';
import { generateAIResponse } from './GeminiService.js';
import { collectFinancialData } from './DataCollector.js';
import FinancialDataService from '../financial/FinancialDataService.js';
import AIChat from '../../models/AIChat.js';
import logger from '../../utils/logger.js';

// M7: TTL constant kept identical to the old in-memory Map so behavior is unchanged.
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes (in ms)

/**
 * Invalidate the MongoDB-backed insights cache for a specific user.
 * @param {string} userId
 */
export const invalidateInsightsCache = async (userId) => {
  if (!userId) return;
  // M7: atomic update — only touches insightsCache, no risk of clobbering moduleCache
  await AIChat.updateOne(
    { user: userId },
    { $set: { insightsCache: {} } }
  );
  logger.info(`[InsightEngine] Invalidated DB insights cache for user: ${userId}`);
};

export const generateInsights = async ({
  wallets,
  budgets,
  expenses,
  incomes,
  goals,
  loans,
  subscriptions,
  userId,
  chat: chatArg,    // optional — if provided, skips the AIChat lookup
} = {}) => {
  const startTime = Date.now();

  // M7: load (or upsert) the AIChat document for cache read/write.
  // findOneAndUpdate with upsert is atomic — avoids race between two concurrent
  // first-ever requests both hitting AIChat.create() and getting a duplicate-key error.
  let chat = chatArg;
  if (!chat && userId) {
    chat = await AIChat.findOneAndUpdate(
      { user: userId },
      {},
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  // M7: check MongoDB-persisted cache (timestamp stored as Number ms, same as old Map)
  if (chat && chat.insightsCache && chat.insightsCache.timestamp) {
    const age = Date.now() - chat.insightsCache.timestamp; // both are Number ms
    if (age < CACHE_TTL && chat.insightsCache.data) {
      logger.info(`[InsightEngine] Cache HIT for user: ${userId} (age: ${Math.round(age / 1000)}s)`);
      return chat.insightsCache.data;
    }
  }

  logger.info(`[InsightEngine] Cache MISS for user: ${userId}. Regenerating insights...`);

  // Load data using collector if any are missing
  let activeWallets = wallets;
  let activeBudgets = budgets;
  let activeExpenses = expenses;
  let activeIncomes = incomes;
  let activeGoals = goals;
  let activeLoans = loans;
  let activeSubscriptions = subscriptions;

  if (
    !activeWallets ||
    !activeBudgets ||
    !activeExpenses ||
    !activeIncomes ||
    !activeGoals ||
    !activeLoans ||
    !activeSubscriptions
  ) {
    const collected = await collectFinancialData(userId);
    activeWallets = collected.wallets;
    activeBudgets = collected.budgets;
    activeExpenses = collected.expenses;
    activeIncomes = collected.incomes;
    activeGoals = collected.goals;
    activeLoans = collected.loans;
    activeSubscriptions = collected.subscriptions;
  }

  // M5: fetch 6-month trend window once via FinancialDataService, pass to analyzeTrends
  // to avoid a duplicate DB query inside TrendAnalyzer.
  // The dashboardController only has the current-month snapshot, so we always fetch here.
  const trendWindow = await FinancialDataService.getTrendWindow(userId, 6);

  // 1. Calculate all structured indices in parallel
  const health = calculateFinancialHealth({
    wallets: activeWallets,
    budgets: activeBudgets,
    expenses: activeExpenses,
    incomes: activeIncomes,
    goals: activeGoals,
    loans: activeLoans,
    subscriptions: activeSubscriptions
  });
  const risks = analyzeRisks({
    wallets: activeWallets,
    budgets: activeBudgets,
    expenses: activeExpenses,
    incomes: activeIncomes,
    goals: activeGoals,
    loans: activeLoans,
    subscriptions: activeSubscriptions
  });
  const recommendations = generateRecommendations({
    wallets: activeWallets,
    budgets: activeBudgets,
    expenses: activeExpenses,
    incomes: activeIncomes,
    goals: activeGoals,
    loans: activeLoans,
    subscriptions: activeSubscriptions
  });
  // M5: pass pre-fetched data so TrendAnalyzer skips its own DB query
  const trends = await analyzeTrends(userId, trendWindow);


  // 2. Extract key metrics for summary highlights
  const topCategories = trends.categoryTrends || [];
  const weeklyHighlights = [];
  const monthlyHighlights = [];

  // Generate Weekly highlights
  if (risks.length > 0) {
    const critical = risks.find(r => r.severity === 'Critical' || r.severity === 'High');
    if (critical) {
      weeklyHighlights.push(`Watch out: ${critical.title}. Action needed: ${critical.recommendedAction}`);
    }
  }
  const topRecommendation = recommendations[0];
  if (topRecommendation) {
    weeklyHighlights.push(`Recommendation: ${topRecommendation.title} - ${topRecommendation.description}`);
  }
  if (weeklyHighlights.length === 0) {
    weeklyHighlights.push('Your budget remains on track. Keep logging expenses daily!');
  }

  // Generate Monthly highlights
  monthlyHighlights.push(`Financial Health Score is ${health.score}/100 (${health.grade}).`);
  if (trends.changes.expensePct > 10) {
    monthlyHighlights.push(`Your spending rose by ${trends.changes.expensePct}% compared to last month.`);
  } else if (trends.changes.expensePct < -10) {
    monthlyHighlights.push(`Excellent pacing: spending decreased by ${Math.abs(trends.changes.expensePct)}% compared to last month.`);
  }
  const topSpentCat = trends.categoryTrends?.[0];
  if (topSpentCat) {
    monthlyHighlights.push(`Spending in category "${topSpentCat.category}" is ${topSpentCat.direction} (change: ${topSpentCat.pctChange}%).`);
  }

  // 3. AI Prompt Construction (passing pre-calculated structured summaries to Gemini)
  const systemInstruction = `You are a Senior Personal Finance Advisor.
Your job is to read the structured financial metrics below and write a concise, encouraging, and highly professional executive summary.

RULES:
1. Do NOT calculate any numbers yourself. Rely only on the numbers provided in the data.
2. Format all currency in Indian Rupees (₹) using Indian locale formatting.
3. Be direct, actionable, and focus on helping the user improve their habits.
4. Keep the summary under 120 words.
5. Do NOT mention any internal code structures, MongoDB details, or API keys.
`;

  const structuredSummaryText = `
FINANCIAL DATA MATRIX:
- Health Score: ${health.score}/100 (${health.grade})
- Strengths: ${health.strengths.join(', ')}
- Weaknesses: ${health.weaknesses.join(', ')}
- Active Risks: ${risks.slice(0, 3).map(r => `[${r.severity}] ${r.title}: ${r.description}`).join('; ')}
- Top Recommendation: ${topRecommendation ? `${topRecommendation.title} (${topRecommendation.description})` : 'None'}
- Monthly Spending: ₹${trends.current.expense.toLocaleString('en-IN')} (Change: ${trends.changes.expensePct}%)
- Monthly Income: ₹${trends.current.income.toLocaleString('en-IN')} (Change: ${trends.changes.incomePct}%)
- Net Savings: ₹${trends.current.savings.toLocaleString('en-IN')}
`;

  const payload = {
    systemInstruction,
    contents: [
      {
        role: 'user',
        parts: [{ text: `Analyze my financial behavior and write a short, friendly executive summary based on this data: \n${structuredSummaryText}` }]
      }
    ]
  };

  let aiExplanation = '';
  try {
    aiExplanation = await generateAIResponse(payload);
  } catch (error) {
    logger.warn(`[InsightEngine] Gemini API call failed: ${error.message}. Falling back to rule-based explanation.`);
    aiExplanation = `Your financial health is graded as **${health.grade}** with a score of **${health.score}/100**. Key area for focus: ${health.improvementAreas[0] || 'Continue tracking category budgets.'}`;
  }

  const duration = Date.now() - startTime;
  logger.info(`[InsightEngine] Completed in ${duration}ms.`);

  const result = {
    financialHealth: {
      score: health.score,
      grade: health.grade,
      strengths: health.strengths,
      weaknesses: health.weaknesses,
      improvementAreas: health.improvementAreas,
      metricBreakdown: health.metricBreakdown
    },
    weeklyHighlights,
    monthlyHighlights,
    activeRisks: risks,
    recommendations,
    trendSummary: trends.summaries,
    monthlyChartData: trends.monthlyChartData,
    aiExplanation,
    generatedAt: new Date()
  };

  // M7: write to AIChat document using atomic $set so concurrent moduleCache saves
  // (from ContextBuilder) cannot clobber this write and vice-versa.
  // Timestamp stored as Number (ms) — same as the old in-memory Map — so the
  // Date.now() - cached.timestamp comparison above stays correct.
  if (chat && userId) {
    try {
      await AIChat.updateOne(
        { user: userId },
        {
          $set: {
            'insightsCache.data': result,
            'insightsCache.timestamp': Date.now(),
          },
        }
      );
    } catch (cacheErr) {
      logger.warn(`[InsightEngine] Failed to persist insights cache: ${cacheErr.message}`);
    }
  }

  return result;
};

