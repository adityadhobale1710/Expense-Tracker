/**
 * FinancialHealthService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Generate a deterministic Financial Health Score (0-100) and grade breakdown.
 *
 * Weightings:
 *  - Savings Rate: 25%
 *  - Budget Adherence: 20%
 *  - Goal Progress: 15%
 *  - Debt Ratio: 15%
 *  - Cash Flow: 10%
 *  - Emergency Fund: 10%
 *  - Income Stability: 5%
 *
 * Returns: { score, grade, strengths, weaknesses, improvementAreas, metricBreakdown }
 */

import {
  calculateWalletBalance,
  calculateMonthlyExpense,
  calculateMonthlyIncome,
  calculateSavings,
  calculateBudgetUsage,
  calculateGoalProgress,
  calculateLoanSummary,
} from './ToolRegistry.js';
import logger from '../../utils/logger.js';

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
  // Ideal: 20%+ savings rate gets full 25 points. Linear scaling below 20%.
  let savingsRateScore = 0;
  if (savings.rate > 0) {
    savingsRateScore = Math.min(25, (savings.rate / 20) * 25);
  }

  // 3. Score Component: Budget Adherence (20 Points)
  // Ideal: 0 exceeded budgets gets 20 points. Deducts proportionally based on exceeded ratio.
  let budgetComplianceScore = 20;
  if (budgetSummary.budgets.length > 0) {
    const exceededCount = budgetSummary.exceededCount || 0;
    budgetComplianceScore = Math.max(0, (1 - exceededCount / budgetSummary.budgets.length) * 20);
  }

  // 4. Score Component: Debt Ratio (15 Points)
  // EMI ratio: ideal is 0. Under 20% gets 12-15 points. 20-36% gets 6-10. Over 50% gets 0.
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
  // Ideal: Average progress pct of active goals is 100% (15 points).
  let goalProgressScore = 15;
  const activeGoals = goalSummary.goals.filter(g => g.status === 'Active');
  if (activeGoals.length > 0) {
    const avgProgress = activeGoals.reduce((sum, g) => sum + (g.progressPct || 0), 0) / activeGoals.length;
    goalProgressScore = Math.min(15, (avgProgress / 100) * 15);
  }

  // 6. Score Component: Cash Flow (10 Points)
  // Net cash flow positive gives 10 points, negative gives 0.
  const netCashFlow = savings.total;
  const cashFlowScore = netCashFlow > 0 ? 10 : 0;

  // 7. Score Component: Emergency Fund Strength (10 Points)
  // Ideal: Liquid wallet balances >= 3 months of expenses gets 10 points.
  // 1-3 months gets 6 points. < 1 month gets 0.
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
  // Compute Coefficient of Variation (stddev / mean) across historical trend months.
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
  logger.info(`[FinancialHealthService] Score computed: ${finalScore} in ${duration}ms.`);

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
