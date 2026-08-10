/**
 * RecommendationEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Analyzes financial metrics and generates a list of hyper-personalized,
 * actionable suggestions based on actual user cash flow, budgets, and debts.
 */

import {
  calculateWalletBalance,
  calculateMonthlyExpense,
  calculateMonthlyIncome,
  calculateBudgetUsage,
  calculateGoalProgress,
  calculateLoanSummary,
  calculateSubscriptionCost,
} from './ToolRegistry.js';
import logger from '../../utils/logger.js';

export const generateRecommendations = ({
  wallets = [],
  budgets = [],
  expenses = [],
  incomes = [],
  goals = [],
  loans = [],
  subscriptions = [],
} = {}) => {
  const startTime = Date.now();
  const recommendations = [];

  const walletSummary = calculateWalletBalance(wallets);
  const expenseSummary = calculateMonthlyExpense(expenses);
  const incomeSummary = calculateMonthlyIncome(incomes);
  const budgetSummary = calculateBudgetUsage(budgets);
  const goalSummary = calculateGoalProgress(goals);
  const loanSummary = calculateLoanSummary(loans);
  const subSummary = calculateSubscriptionCost(subscriptions);
  const surplus = incomeSummary.total - expenseSummary.total;

  // 1. Recommendation: emergency fund buffer
  const coverRatio = expenseSummary.total > 0 ? walletSummary.total / expenseSummary.total : 0;
  if (coverRatio < 3) {
    const gap = Math.max(0, (expenseSummary.total * 3) - walletSummary.total);
    recommendations.push({
      id: 'emergency_buffer',
      title: 'Build Emergency Fund Cushion',
      description: `Your liquid balance (₹${walletSummary.total.toLocaleString('en-IN')}) covers less than 3 months of expenses. Setting aside ₹${Math.round(gap).toLocaleString('en-IN')} would hit your safety target.`,
      impact: 'High',
      priority: 'HIGH',
      estimatedMonthlySavings: 0,
      reason: 'Liquid assets cover less than 3x standard monthly outlays, exposing you to unforeseen transaction shocks.',
      category: 'Savings',
      actionableSteps: [
        'Set up an automated monthly transfer of 10% of your earnings to a dedicated savings wallet.',
        'Postpone non-essential discretionary purchases until your cushion covers 3 months.'
      ]
    });
  }

  // 2. Recommendation: category spending reductions (e.g. food/dining/shopping)
  const topSpentCat = expenseSummary.byCategory[0];
  if (topSpentCat && topSpentCat.percent > 30 && topSpentCat.total > 4000) {
    const estSavings = Math.round(topSpentCat.total * 0.15);
    recommendations.push({
      id: 'high_category_outlay',
      title: `Optimize ${topSpentCat.category} Outflows`,
      description: `Spending on "${topSpentCat.category}" accounts for ${Math.round(topSpentCat.percent)}% of your total monthly outflows (₹${topSpentCat.total.toLocaleString('en-IN')}).`,
      impact: 'Medium',
      priority: 'MEDIUM',
      estimatedMonthlySavings: estSavings,
      reason: `Outflow concentration in ${topSpentCat.category} exceeds 30% of standard monthly spend.`,
      category: 'Discretionary',
      actionableSteps: [
        `Establish a weekly budget cap of ₹${Math.round(topSpentCat.total / 6).toLocaleString('en-IN')} for ${topSpentCat.category}.`,
        'Track and log purchases immediately to stay aware of cumulative outlays.'
      ]
    });
  }

  // 3. Recommendation: budget adjustments for breached budgets
  const overspentBudget = budgetSummary.budgets.find(b => b.status === 'exceeded');
  if (overspentBudget) {
    const breach = overspentBudget.spent - overspentBudget.limit;
    recommendations.push({
      id: 'budget_compliance',
      title: `Rebalance overspent "${overspentBudget.category}" Budget`,
      description: `Your budget for ${overspentBudget.category} was breached by ₹${breach.toLocaleString('en-IN')}.`,
      impact: 'Medium',
      priority: 'MEDIUM',
      estimatedMonthlySavings: Math.round(breach),
      reason: `Spending on ${overspentBudget.category} exceeded the configured safe limit of ₹${overspentBudget.limit.toLocaleString('en-IN')}.`,
      category: 'Budgeting',
      actionableSteps: [
        `Reallocate ₹${Math.round(breach).toLocaleString('en-IN')} from another underutilized category budget.`,
        'Enable budget push notification alerts at 80% threshold in settings.'
      ]
    });
  }

  // 4. Recommendation: debt reduction (snowball/avalanche)
  if (loanSummary.loans.length > 0) {
    const highestInterestLoan = loanSummary.loans.reduce((max, l) => l.interestRate > max.interestRate ? l : max, loanSummary.loans[0]);
    if (highestInterestLoan && highestInterestLoan.interestRate > 8) {
      recommendations.push({
        id: 'debt_avalanche',
        title: `Prepay High-Interest Debt: ${highestInterestLoan.name}`,
        description: `Your "${highestInterestLoan.name}" has an elevated interest rate of ${highestInterestLoan.interestRate}%. Payoff outstanding: ₹${highestInterestLoan.remaining.toLocaleString('en-IN')}.`,
        impact: 'High',
        priority: 'HIGH',
        estimatedMonthlySavings: Math.round(highestInterestLoan.emiAmount * 0.2),
        reason: `High interest cost drag on ${highestInterestLoan.name} (${highestInterestLoan.interestRate}% interest) slows overall capital compound growth.`,
        category: 'Debt Repayment',
        actionableSteps: [
          `Direct at least 50% of monthly surplus cash (₹${Math.max(0, Math.round(surplus * 0.5)).toLocaleString('en-IN')}/mo) into extra principal prepayments.`,
          'Avoid paying only the minimum EMI to prevent compounding interest charges.'
        ]
      });
    }
  }

  // 5. Recommendation: subscription trim
  if (subSummary.monthlyTotal > 1500) {
    recommendations.push({
      id: 'subscription_trim',
      title: 'Consolidate Recurring Subscriptions',
      description: `Active subscriptions total ₹${subSummary.monthlyTotal.toLocaleString('en-IN')}/mo. Switch to annual plans or cancel duplicate platforms to save up to 15%.`,
      impact: 'Low',
      priority: 'LOW',
      estimatedMonthlySavings: Math.round(subSummary.monthlyTotal * 0.2),
      reason: `Recurring subscription burden exceeds ₹1,500/mo. Fixed digital overheads are easily reducible.`,
      category: 'Fixed Costs',
      actionableSteps: [
        'Temporarily deactivate platforms with no usage in the past 2 weeks.',
        'Migrate frequently used monthly services to discounted annual billing cycles.'
      ]
    });
  }

  // 6. Recommendation: surplus wealth management
  if (surplus > 10000 && walletSummary.total > 30000) {
    recommendations.push({
      id: 'wealth_investment',
      title: 'Deploy Liquid Cash Surplus',
      description: `You have ₹${walletSummary.total.toLocaleString('en-IN')} cash and a ₹${surplus.toLocaleString('en-IN')} surplus. Idle cash loses purchasing power to inflation.`,
      impact: 'High',
      priority: 'HIGH',
      estimatedMonthlySavings: 0,
      reason: `Idle cash reserves exceed monthly outflow requirements by a wide margin, creating an inflation drag.`,
      category: 'Wealth Building',
      actionableSteps: [
        `Allocate ₹${Math.round(surplus * 0.4).toLocaleString('en-IN')} this month to systematic SIP mutual funds.`,
        'Top up active goals or open a high-yield recurring deposit account.'
      ]
    });
  }

  // Fallback default recommendation if list is empty
  if (recommendations.length === 0) {
    recommendations.push({
      id: 'generic_wealth',
      title: 'Maintain Positive Habits',
      description: 'Your cash flow is balanced, budgets are safe, and emergency funds are strong.',
      impact: 'Low',
      priority: 'LOW',
      estimatedMonthlySavings: 0,
      reason: 'No critical financial leaks or layout inefficiencies identified.',
      category: 'General',
      actionableSteps: [
        'Review financial goals weekly to keep milestone deadlines on track.',
        'Continue logging daily expenses to preserve high-accuracy insights.'
      ]
    });
  }

  const duration = Date.now() - startTime;
  logger.info(`[RecommendationEngine] Generated ${recommendations.length} recommendations in ${duration}ms.`);

  return recommendations;
};
