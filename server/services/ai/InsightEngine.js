import { analyzeRisks } from './RiskAnalyzer.js';
import { analyzeTrends } from './TrendAnalyzer.js';
import { generateRecommendations } from './RecommendationEngine.js';
import { generateAIResponse } from './GeminiService.js';
import { collectFinancialData } from './DataCollector.js';
import FinancialDataService from '../financial/FinancialDataService.js';
import AIChat from '../../models/AIChat.js';
import logger from '../../utils/logger.js';
import {
  calculateWalletBalance,
  calculateMonthlyExpense,
  calculateMonthlyIncome,
  calculateSavings,
  calculateBudgetUsage,
  calculateGoalProgress,
  calculateLoanSummary,
} from './ToolRegistry.js';

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
    subscriptions: activeSubscriptions,
    // AUDIT-CALC-002: Pass historical trend data so income stability is scored on real data
    historicalTrends: trendWindow
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

export const calculateFinancialHealth = (snapshot = {}) => {
  const startTime = Date.now();

  const {
    wallets = [],
    budgets = [],
    expenses = [],
    incomes = [],
    goals = [],
    loans = [],
    historicalTrends = { incomes: [], expenses: [] }
  } = snapshot;

  // 1. Core Calculations via ToolRegistry
  const walletSummary = calculateWalletBalance(wallets);
  const expenseSummary = calculateMonthlyExpense(expenses);
  const incomeSummary = calculateMonthlyIncome(incomes);
  const budgetSummary = calculateBudgetUsage(budgets);
  const goalSummary = calculateGoalProgress(goals);
  const loanSummary = calculateLoanSummary(loans);
  const savings = calculateSavings(incomeSummary.total, expenseSummary.total);

  // 2. Score Component: Savings Rate (25 Points)
  let savingsRateScore = 0;
  if (savings.rate > 0) {
    savingsRateScore = Math.min(25, (savings.rate / 20) * 25);
  }

  // 3. Score Component: Budget Adherence (20 Points)
  let budgetComplianceScore = 20;
  if (budgetSummary.budgets.length > 0) {
    const exceededCount = budgetSummary.exceededCount || 0;
    budgetComplianceScore = Math.max(0, (1 - exceededCount / budgetSummary.budgets.length) * 20);
  }

  // 4. Score Component: Debt Ratio (15 Points)
  let debtScore = 15;
  const totalMonthlyEMI = loanSummary.totalMonthlyEMI || 0;
  const monthlyIncome = incomeSummary.total || 0;
  const emiRatio = monthlyIncome > 0 ? totalMonthlyEMI / monthlyIncome : 0;

  if (emiRatio === 0) {
    debtScore = 15;
  } else if (emiRatio <= 0.20) {
    debtScore = 12;
  } else if (emiRatio <= 0.36) {
    debtScore = 8;
  } else if (emiRatio <= 0.50) {
    debtScore = 4;
  } else {
    debtScore = 0;
  }

  // 5. Score Component: Goal Progress (15 Points)
  let goalProgressScore = 15;
  const activeGoals = goalSummary.goals.filter(g => g.status === 'Active');
  if (activeGoals.length > 0) {
    const avgProgress = activeGoals.reduce((sum, g) => sum + (g.progressPct || 0), 0) / activeGoals.length;
    goalProgressScore = Math.min(15, (avgProgress / 100) * 15);
  }

  // 6. Score Component: Cash Flow (10 Points)
  // MASTER-040: Fixed savings.total → savings.amount (calculateSavings returns { amount, rate, isPositive, deficit })
  const netCashFlow = savings.amount;
  const cashFlowScore = netCashFlow > 0 ? 10 : 0;

  // 7. Score Component: Emergency Fund Strength (10 Points)
  let emergencyFundScore = 0;
  const totalLiquid = walletSummary.total || 0;
  const monthlyExpense = expenseSummary.total || 0;
  const coverRatio = monthlyExpense > 0 ? totalLiquid / monthlyExpense : (totalLiquid > 0 ? 3 : 0);

  if (coverRatio >= 3) {
    emergencyFundScore = 10;
  } else if (coverRatio >= 1) {
    emergencyFundScore = 6;
  } else {
    emergencyFundScore = 0;
  }

  // 8. Score Component: Income Stability (5 Points)
  let stabilityScore = 5;
  const monthlyIncomes = {};
  if (historicalTrends && historicalTrends.incomes) {
    historicalTrends.incomes.forEach(inc => {
      const date = new Date(inc.date);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      monthlyIncomes[key] = (monthlyIncomes[key] || 0) + inc.amount;
    });
  }
  const incomeVals = Object.values(monthlyIncomes);
  if (incomeVals.length >= 2) {
    const mean = incomeVals.reduce((a, b) => a + b, 0) / incomeVals.length;
    const variance = incomeVals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / incomeVals.length;
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? stdDev / mean : 0;

    if (cv > 0.30) {
      stabilityScore = 1;
    } else if (cv > 0.15) {
      stabilityScore = 3;
    } else {
      stabilityScore = 5;
    }
  }

  // Calculate final score out of 100
  const finalScore = Math.round(
    savingsRateScore +
    budgetComplianceScore +
    debtScore +
    goalProgressScore +
    cashFlowScore +
    emergencyFundScore +
    stabilityScore
  );

  // Determine Grade
  let grade = 'Needs Attention';
  if (finalScore >= 90) grade = 'Excellent';
  else if (finalScore >= 75) grade = 'Good';
  else if (finalScore >= 60) grade = 'Average';

  // Strengths, Weaknesses, Improvement Areas (Deterministic)
  const strengths = [];
  const weaknesses = [];
  const improvementAreas = [];

  if (savings.rate >= 20) {
    strengths.push(`Excellent savings rate of ${savings.rate.toFixed(1)}%`);
  } else if (savings.rate > 0) {
    improvementAreas.push(`Increase savings rate from ${savings.rate.toFixed(1)}% to at least 20%`);
  } else {
    weaknesses.push('Negative cash flow: Spending exceeds monthly income');
    improvementAreas.push('Immediately reduce discretionary spending to build positive cash flow');
  }

  if (budgetSummary.exceededCount === 0 && budgetSummary.budgets.length > 0) {
    strengths.push('Strict budget adherence: 0 categories overspent');
  } else if (budgetSummary.exceededCount > 0) {
    weaknesses.push(`Budget breached in ${budgetSummary.exceededCount} categories`);
    improvementAreas.push('Review and adjust category limits or track daily outlays closely');
  }

  if (emiRatio === 0) {
    strengths.push('Zero debt overhead: No active loan liabilities');
  } else if (emiRatio > 0.36) {
    weaknesses.push(`High debt-to-income ratio (${Math.round(emiRatio * 100)}% of income goes to EMI)`);
    improvementAreas.push('Prioritize paying off principal balances to reduce monthly EMI burden');
  }

  if (coverRatio >= 3) {
    strengths.push(`Strong emergency cushion cover (${coverRatio.toFixed(1)}x monthly expenses)`);
  } else {
    weaknesses.push(`Low liquidity cover (${coverRatio.toFixed(1)}x monthly expenses)`);
    improvementAreas.push('Aim to save at least 3-6 months of basic living expenses');
  }

  // Safeguards for empty arrays/defaults
  if (strengths.length === 0) strengths.push('Account is tracking and listing metrics successfully');
  if (improvementAreas.length === 0) improvementAreas.push('Maintain current financial pacing and review next month');

  const duration = Date.now() - startTime;
  logger.info(`[InsightEngine:calculateFinancialHealth] Score computed: ${finalScore} in ${duration}ms.`);

  return {
    score: finalScore,
    grade,
    strengths,
    weaknesses,
    improvementAreas,
    metricBreakdown: {
      savingsRateScore: Math.round(savingsRateScore),
      budgetComplianceScore: Math.round(budgetComplianceScore),
      debtScore: Math.round(debtScore),
      goalProgressScore: Math.round(goalProgressScore),
      cashFlowScore: Math.round(cashFlowScore),
      emergencyFundScore: Math.round(emergencyFundScore),
      stabilityScore: Math.round(stabilityScore),
      metrics: {
        savingsRate: savings.rate,
        budgetsExceeded: budgetSummary.exceededCount,
        debtToIncome: emiRatio * 100,
        liquidityRatio: coverRatio,
        netCashFlow
      }
    }
  };
};

