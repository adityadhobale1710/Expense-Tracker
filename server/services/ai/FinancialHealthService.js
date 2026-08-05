/**
 * FinancialHealthService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Generate a deterministic Financial Health Score (0-100) and grade breakdown.
 *
 * Weightings:
 *  - Savings Rate: 25%
 *  - Budget Compliance: 25%
 *  - Debt-to-Income Ratio: 20%
 *  - Goal Progress: 15%
 *  - Subscription Burden: 10%
 *  - Emergency Fund Strength: 5%
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
  calculateSubscriptionCost,
} from './ToolRegistry.js';
import logger from '../../utils/logger.js';

export const calculateFinancialHealth = ({
  wallets = [],
  budgets = [],
  expenses = [],
  incomes = [],
  goals = [],
  loans = [],
  subscriptions = [],
} = {}) => {
  const startTime = Date.now();

  // 1. Core Calculations via ToolRegistry
  const walletSummary = calculateWalletBalance(wallets);
  const expenseSummary = calculateMonthlyExpense(expenses);
  const incomeSummary = calculateMonthlyIncome(incomes);
  const budgetSummary = calculateBudgetUsage(budgets);
  const goalSummary = calculateGoalProgress(goals);
  const loanSummary = calculateLoanSummary(loans);
  const subSummary = calculateSubscriptionCost(subscriptions);
  const savings = calculateSavings(incomeSummary.total, expenseSummary.total);

  // 2. Score Component: Savings Rate (25 Points)
  // Ideal: 20%+ savings rate gets full 25 points. Linear scaling below 20%.
  let savingsRateScore = 0;
  if (savings.rate > 0) {
    savingsRateScore = Math.min(25, (savings.rate / 20) * 25);
  }

  // 3. Score Component: Budget Compliance (25 Points)
  // Ideal: 0 exceeded budgets gets 25 points. Deducts proportionally based on exceeded ratio.
  let budgetComplianceScore = 25;
  if (budgetSummary.budgets.length > 0) {
    const exceededCount = budgetSummary.exceededCount || 0;
    budgetComplianceScore = Math.max(0, (1 - exceededCount / budgetSummary.budgets.length) * 25);
  }

  // 4. Score Component: Debt-to-Income Ratio (20 Points)
  // EMI ratio: ideal is 0. Under 20% gets 16-20 points. 20-36% gets 10-15. Over 50% gets 0.
  let debtScore = 20;
  const totalMonthlyEMI = loanSummary.totalMonthlyEMI || 0;
  const monthlyIncome = incomeSummary.total || 0;
  const emiRatio = monthlyIncome > 0 ? totalMonthlyEMI / monthlyIncome : 0;

  if (emiRatio === 0) {
    debtScore = 20;
  } else if (emiRatio <= 0.20) {
    debtScore = 16;
  } else if (emiRatio <= 0.36) {
    debtScore = 10;
  } else if (emiRatio <= 0.50) {
    debtScore = 5;
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

  // 6. Score Component: Subscription Burden (10 Points)
  // Ideal: Subscription cost < 5% of monthly income gets 10 points. 5-10% gets 7 points. 10-15% gets 4 points.
  let subscriptionScore = 10;
  const subMonthlyCost = subSummary.monthlyTotal || 0;
  const subRatio = monthlyIncome > 0 ? subMonthlyCost / monthlyIncome : 0;

  if (subRatio < 0.05) {
    subscriptionScore = 10;
  } else if (subRatio < 0.10) {
    subscriptionScore = 7;
  } else if (subRatio < 0.15) {
    subscriptionScore = 4;
  } else {
    subscriptionScore = 0;
  }

  // 7. Score Component: Emergency Fund Strength (5 Points)
  // Ideal: Liquid wallet balances >= 3 months of expenses gets 5 points.
  // 1-3 months gets 3 points. < 1 month gets 0.
  let emergencyFundScore = 0;
  const totalLiquid = walletSummary.total || 0;
  const monthlyExpense = expenseSummary.total || 0;
  const coverRatio = monthlyExpense > 0 ? totalLiquid / monthlyExpense : (totalLiquid > 0 ? 3 : 0);

  if (coverRatio >= 3) {
    emergencyFundScore = 5;
  } else if (coverRatio >= 1) {
    emergencyFundScore = 3;
  } else {
    emergencyFundScore = 0;
  }

  // Calculate final score out of 100
  const finalScore = Math.round(
    savingsRateScore +
    budgetComplianceScore +
    debtScore +
    goalProgressScore +
    subscriptionScore +
    emergencyFundScore
  );

  // Determine Grade
  let grade = 'Critical';
  if (finalScore >= 90) grade = 'Excellent';
  else if (finalScore >= 75) grade = 'Good';
  else if (finalScore >= 60) grade = 'Fair';
  else if (finalScore >= 40) grade = 'Needs Improvement';

  // Strengths, Weaknesses, Improvement Areas (Deterministic)
  const strengths = [];
  const weaknesses = [];
  const improvementAreas = [];

  if (savings.rate >= 20) {
    strengths.push(`Excellent savings rate of ${savings.rate.toFixed(1)}% (Target: 20%)`);
  } else if (savings.rate > 0) {
    improvementAreas.push(`Increase savings rate from ${savings.rate.toFixed(1)}% to at least 20%`);
  } else {
    weaknesses.push('Negative cash flow: Spending exceeds monthly income');
    improvementAreas.push('Immediately reduce discretionary spending to build positive cash flow');
  }

  if (budgetSummary.exceededCount === 0 && budgetSummary.budgets.length > 0) {
    strengths.push('Strict budget adherence: 0 categories overspent');
  } else if (budgetSummary.exceededCount > 0) {
    weaknesses.push(`Budget breached in ${budgetSummary.exceededCount} categor(ies)`);
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

  if (subRatio >= 0.10) {
    weaknesses.push(`High subscription load (${Math.round(subRatio * 100)}% of income)`);
    improvementAreas.push('Perform a subscription audit and cancel unused services');
  }

  // Safeguards for empty arrays/defaults
  if (strengths.length === 0) strengths.push('Account is set up and tracking finances successfully');
  if (improvementAreas.length === 0) improvementAreas.push('Continue tracking and review categories monthly');

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
      subscriptionScore: Math.round(subscriptionScore),
      emergencyFundScore: Math.round(emergencyFundScore),
      metrics: {
        savingsRate: savings.rate,
        budgetsExceeded: budgetSummary.exceededCount,
        debtToIncome: emiRatio * 100,
        subBurden: subRatio * 100,
        liquidityRatio: coverRatio
      }
    }
  };
};
