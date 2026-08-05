import { calculateFinancialHealth } from './FinancialHealthService.js';
import { analyzeRisks } from './RiskAnalyzer.js';
import { analyzeTrends } from './TrendAnalyzer.js';
import { generateRecommendations } from './RecommendationEngine.js';
import { generateAIResponse } from './GeminiService.js';
import { collectFinancialData } from './DataCollector.js';
import logger from '../../utils/logger.js';

// Local memory cache to optimize performance and minimize Gemini API hits
const insightsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Invalidate the memory cache for a specific user.
 * @param {string} userId 
 */
export const invalidateInsightsCache = (userId) => {
  if (!userId) return;
  const key = userId.toString();
  insightsCache.delete(key);
  logger.info(`[InsightEngine] Invalidated memory cache for user: ${userId}`);
};

export const generateInsights = async ({
  wallets,
  budgets,
  expenses,
  incomes,
  goals,
  loans,
  subscriptions,
  userId
} = {}) => {
  const startTime = Date.now();
  const cacheKey = userId ? userId.toString() : '';

  if (cacheKey && insightsCache.has(cacheKey)) {
    const cached = insightsCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      logger.info(`[InsightEngine] Cache HIT for user: ${userId}`);
      return cached.data;
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
  const trends = await analyzeTrends(userId);


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

  if (cacheKey) {
    insightsCache.set(cacheKey, { timestamp: Date.now(), data: result });
  }

  return result;
};

