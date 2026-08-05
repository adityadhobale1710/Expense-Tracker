/**
 * RecommendationService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Analyzes financial metrics and generates a prioritized deck of personalized
 * financial action steps, automatically sorted from HIGH to LOW.
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

export const getRecommendations = (snapshot = {}) => {
  const startTime = Date.now();
  const recommendations = [];

  const {
    wallets = [],
    budgets = [],
    expenses = [],
    incomes = [],
    goals = [],
    loans = [],
    subscriptions = []
  } = snapshot;

  const walletSummary = calculateWalletBalance(wallets);
  const expenseSummary = calculateMonthlyExpense(expenses);
  const incomeSummary = calculateMonthlyIncome(incomes);
  const budgetSummary = calculateBudgetUsage(budgets);
  const goalSummary = calculateGoalProgress(goals);
  const loanSummary = calculateLoanSummary(loans);
  const subSummary = calculateSubscriptionCost(subscriptions);

  const surplus = incomeSummary.total - expenseSummary.total;
  const savingsRate = incomeSummary.total > 0 ? (surplus / incomeSummary.total) * 100 : 0;
  const coverRatio = expenseSummary.total > 0 ? walletSummary.total / expenseSummary.total : 0;

  // 1. RECOMMENDATION: Emergency buffer fund (HIGH)
  if (coverRatio < 3) {
    const gap = Math.max(0, (expenseSummary.total * 3) - walletSummary.total);
    recommendations.push({
      id: 'rec_emergency_buffer',
      priority: 'HIGH',
      category: 'Savings',
      title: 'Increase Emergency Fund',
      description: `Your liquid balance of ₹${walletSummary.total.toLocaleString('en-IN')} covers less than 3 months of expenses. Save ₹${Math.round(gap).toLocaleString('en-IN')} to hit a standard 3-month safety cushion.`,
      estimatedSavings: Math.round(surplus * 0.15) || 3000,
      action: 'Transfer Funds'
    });
  }

  // 2. RECOMMENDATION: Uncategorized spending (HIGH/MEDIUM)
  const uncategorizedSpent = expenseSummary.byCategory?.find(c => c.category === 'Uncategorized')?.total || 0;
  if (uncategorizedSpent > 5000) {
    recommendations.push({
      id: 'rec_uncategorized',
      priority: 'HIGH',
      category: 'Expenses',
      title: 'Reduce Uncategorized Spending',
      description: `You spent ₹${uncategorizedSpent.toLocaleString('en-IN')} this month without categories. Categorizing these allows AI to run accurate savings projections.`,
      estimatedSavings: Math.round(uncategorizedSpent * 0.20),
      action: 'Categorize Outlays'
    });
  }

  // 3. RECOMMENDATION: Category budget breaches (HIGH/MEDIUM)
  const overspent = budgets.find(b => b.spent > b.limit);
  if (overspent) {
    const excess = overspent.spent - overspent.limit;
    recommendations.push({
      id: 'rec_budget_rebalance',
      priority: 'HIGH',
      category: 'Budget',
      title: `Reallocate overspent "${overspent.category?.name || 'Category'}" Budget`,
      description: `Spending on "${overspent.category?.name || 'Category'}" has breached the limit by ₹${excess.toLocaleString('en-IN')}. Reduce discretionary outlays to avoid monthly surplus loss.`,
      estimatedSavings: Math.round(excess),
      action: 'Modify Budget'
    });
  }

  // 4. RECOMMENDATION: Savings rate increase (MEDIUM)
  if (savingsRate < 20 && surplus > 0) {
    const gapAmount = Math.round((incomeSummary.total * 0.20) - surplus);
    recommendations.push({
      id: 'rec_savings_rate',
      priority: 'MEDIUM',
      category: 'Savings',
      title: 'Improve Savings Rate',
      description: `Your savings rate is ${Math.round(savingsRate)}%. Setting aside an additional ₹${gapAmount.toLocaleString('en-IN')} monthly will hit the benchmark 20% savings target.`,
      estimatedSavings: gapAmount,
      action: 'Create Goal'
    });
  }

  // 5. RECOMMENDATION: Goal progress behind (MEDIUM)
  goals.forEach((g, idx) => {
    if (g.status === 'Active' && idx < 2) {
      const remaining = g.targetAmount - g.currentAmount;
      const targetDate = new Date(g.targetDate);
      const monthsRemaining = (targetDate - new Date()) / (1000 * 60 * 60 * 24 * 30.4);
      if (monthsRemaining > 0) {
        const requiredMonthly = remaining / monthsRemaining;
        if (g.monthlyContribution < requiredMonthly) {
          const diff = Math.round(requiredMonthly - g.monthlyContribution);
          recommendations.push({
            id: `rec_goal_acceleration_${g._id}`,
            priority: 'MEDIUM',
            category: 'Goals',
            title: `Increase Contribution for "${g.title}"`,
            description: `This goal is behind schedule. Boost your monthly contribution by ₹${diff.toLocaleString('en-IN')} to achieve it by ${targetDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}.`,
            estimatedSavings: 0,
            action: 'Edit Goal'
          });
        }
      }
    }
  });

  // 6. RECOMMENDATION: Debt reduction (MEDIUM/LOW)
  const totalEMI = loanSummary.totalMonthlyEMI || 0;
  const emiRatio = incomeSummary.total > 0 ? totalEMI / incomeSummary.total : 0;
  if (emiRatio > 0.36) {
    recommendations.push({
      id: 'rec_loan_avalanche',
      priority: 'MEDIUM',
      category: 'Debt',
      title: 'Reduce EMI Burden',
      description: `Debt repayments occupy ${Math.round(emiRatio * 100)}% of your monthly income. Pre-pay high-interest loans to lower monthly overheads.`,
      estimatedSavings: Math.round(totalEMI * 0.15),
      action: 'View Loans'
    });
  }

  // 7. RECOMMENDATION: Subscription audits (LOW)
  if (subscriptions.length > 0) {
    const cost = subSummary.monthlyTotal || 0;
    recommendations.push({
      id: 'rec_sub_audit',
      priority: 'LOW',
      category: 'Subscriptions',
      title: 'Cancel Unused Subscriptions',
      description: `You have ${subscriptions.length} active recurring subscriptions, costing ₹${cost.toLocaleString('en-IN')}/month. Perform an audit to cancel low-usage licenses.`,
      estimatedSavings: Math.round(cost * 0.25),
      action: 'Audit Subscriptions'
    });
  }

  // Default recommendation if none
  if (recommendations.length === 0) {
    recommendations.push({
      id: 'rec_default_tips',
      priority: 'LOW',
      category: 'General',
      title: 'Review Financial Habits',
      description: 'Your cash flows and savings levels are fully optimized. Review category margins next week to keep up the momentum.',
      estimatedSavings: 0,
      action: 'View Dashboard'
    });
  }

  // Sort: HIGH -> MEDIUM -> LOW
  const priorityLevels = { HIGH: 1, MEDIUM: 2, LOW: 3 };
  const sorted = recommendations.sort((a, b) => priorityLevels[a.priority] - priorityLevels[b.priority]);

  const duration = Date.now() - startTime;
  logger.info(`[RecommendationService] Recommendations compiled and sorted in ${duration}ms.`);

  return sorted;
};
