/**
 * MonthlyReportGenerator.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Compiles a structured, comprehensive financial report for the month,
 * including budget analysis, goal tracking, and liabilities. Generates
 * a natural-language executive narrative using Gemini.
 */

import { calculateFinancialHealth } from './FinancialHealthService.js';
import { analyzeRisks } from './RiskAnalyzer.js';
import { analyzeTrends } from './TrendAnalyzer.js';
import { generateRecommendations } from './RecommendationEngine.js';
import { generateAIResponse } from './GeminiService.js';
import { collectFinancialData } from './DataCollector.js';
import logger from '../../utils/logger.js';

export const generateMonthlyReport = async ({
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

  // 1. Gather all individual analysis modules
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

  // 2. Format Structured Summaries
  const incomeSummary = activeIncomes.reduce((sum, i) => sum + (i.amount || 0), 0);
  const expenseSummary = activeExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const savings = incomeSummary - expenseSummary;
  const savingsRate = incomeSummary > 0 ? (savings / incomeSummary) * 100 : 0;

  const budgetPerformance = activeBudgets.map(b => ({
    category: b.category?.name || 'Unknown',
    limit: b.limit,
    spent: b.spent,
    usagePct: b.limit > 0 ? Math.round((b.spent / b.limit) * 100) : 0,
    status: b.spent > b.limit ? 'Exceeded' : 'Safe'
  }));

  const goalProgress = activeGoals.map(g => ({
    title: g.title,
    target: g.targetAmount,
    saved: g.savedAmount,
    progressPct: g.progressPct,
    status: g.status
  }));

  const loanOverview = activeLoans.map(l => ({
    name: l.name,
    principal: l.amount,
    remaining: l.remainingBalance,
    emi: l.emiAmount,
    interest: l.interestRate
  }));

  const subscriptionReview = activeSubscriptions.map(s => ({
    name: s.name,
    cost: s.cost,
    cycle: s.billingCycle,
    renewal: s.renewalDate
  }));


  // Key Achievements & Areas for Improvement (Deterministic)
  const achievements = [];
  const improvements = [];

  if (savingsRate >= 20) {
    achievements.push(`Maintained a healthy savings rate of ${savingsRate.toFixed(1)}%, beating the recommended 20% limit.`);
  }
  const exceededCount = budgetPerformance.filter(b => b.status === 'Exceeded').length;
  if (exceededCount === 0 && budgets.length > 0) {
    achievements.push('Stayed under budget in all configured category limits.');
  } else if (exceededCount > 0) {
    improvements.push(`Exceeded budgets in ${exceededCount} categories. Review category limits.`);
  }

  if (savings < 0) {
    improvements.push('Discretionary spending is exceeding cash inflows. Implement immediate cost reductions.');
  }

  if (achievements.length === 0) achievements.push('Logged all financial activities accurately to the ledger.');
  if (improvements.length === 0) improvements.push('No critical issues detected. Maintain current budget tracking.');

  // 3. AI-generated Executive Summary Narrative
  const systemInstruction = `You are a Principal Financial Advisor.
Generate a structured, comprehensive, and conversational monthly executive summary of the user's financial status.

Follow this outline exactly:
1. Executive Summary (General review of income, expenses, and savings rate)
2. Achievements (Highlight positive spending adjustments and milestone progress)
3. Actionable Path (Summarize budget and loan suggestions)

RULES:
- Do NOT calculate or invent values. Rely exclusively on the pre-computed metrics provided.
- Format all currency figures using Indian Rupees (₹) and Indian number locale.
- Keep the summary professional, clear, and under 200 words.
`;

  const structuredSummaryText = `
MONTHLY PERFORMANCE SUMMARY:
- Total Incomes: ₹${incomeSummary.toLocaleString('en-IN')}
- Total Expenses: ₹${expenseSummary.toLocaleString('en-IN')}
- Net Savings: ₹${savings.toLocaleString('en-IN')} (Rate: ${savingsRate.toFixed(1)}%)
- Health Index Score: ${health.score}/100 (${health.grade})
- Exceeded Budgets: ${exceededCount}/${budgets.length}
- Achievements: ${achievements.join(' ')}
- Improvements: ${improvements.join(' ')}
- Active Risks: ${risks.slice(0, 2).map(r => r.title).join(', ')}
`;

  const payload = {
    systemInstruction,
    contents: [
      {
        role: 'user',
        parts: [{ text: `Generate my monthly financial report summary using this data:\n${structuredSummaryText}` }]
      }
    ]
  };

  let executiveSummary = '';
  try {
    executiveSummary = await generateAIResponse(payload);
  } catch (error) {
    logger.warn(`[MonthlyReportGenerator] Gemini call failed: ${error.message}`);
    executiveSummary = `Financial Health Score: **${health.score}/100** (${health.grade}). Monthly Savings Rate: **${savingsRate.toFixed(1)}%**. ${improvements[0] || ''}`;
  }

  const duration = Date.now() - startTime;
  logger.info(`[MonthlyReportGenerator] Completed in ${duration}ms.`);

  return {
    reportDate: new Date(),
    summary: {
      totalIncome: incomeSummary,
      totalExpense: expenseSummary,
      savings,
      savingsRate
    },
    financialHealth: {
      score: health.score,
      grade: health.grade,
      metricBreakdown: health.metricBreakdown
    },
    budgetPerformance,
    goalProgress,
    loanOverview,
    subscriptionReview,
    achievements,
    improvements,
    risks,
    recommendations,
    trends: trends.summaries,
    executiveSummary
  };
};
