/**
 * RiskAnalyzer.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Detects financial risks, categorizes severity (Low, Medium, High, Critical),
 * and proposes deterministic recommended actions.
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

export const analyzeRisks = ({
  wallets = [],
  budgets = [],
  expenses = [],
  incomes = [],
  goals = [],
  loans = [],
  subscriptions = [],
} = {}) => {
  const startTime = Date.now();
  const risks = [];

  const walletSummary = calculateWalletBalance(wallets);
  const expenseSummary = calculateMonthlyExpense(expenses);
  const incomeSummary = calculateMonthlyIncome(incomes);
  const budgetSummary = calculateBudgetUsage(budgets);
  const goalSummary = calculateGoalProgress(goals);
  const loanSummary = calculateLoanSummary(loans);
  const subSummary = calculateSubscriptionCost(subscriptions);

  // 1. Budget Overruns Risk
  budgetSummary.budgets.forEach(b => {
    if (b.status === 'exceeded') {
      risks.push({
        type: 'budget_overrun',
        severity: 'Critical',
        title: `Budget Exceeded: ${b.category}`,
        description: `You have spent ₹${b.spent.toLocaleString('en-IN')} out of ₹${b.limit.toLocaleString('en-IN')} limit for ${b.category}.`,
        recommendedAction: `Stop spending on ${b.category} or reallocate ₹${(b.spent - b.limit).toLocaleString('en-IN')} from another budget category.`
      });
    } else if (b.usagePercent >= 80) {
      risks.push({
        type: 'budget_overrun',
        severity: 'High',
        title: `Budget Nearing Limit: ${b.category}`,
        description: `You have spent ${b.usagePercent}% of your ₹${b.limit.toLocaleString('en-IN')} limit for ${b.category}.`,
        recommendedAction: `Minimize discretionary purchases in ${b.category} for the rest of the period to avoid budget breach.`
      });
    } else if (b.usagePercent >= 60) {
      risks.push({
        type: 'budget_overrun',
        severity: 'Medium',
        title: `Moderate Budget Usage: ${b.category}`,
        description: `You have spent ${b.usagePercent}% of your ₹${b.limit.toLocaleString('en-IN')} limit for ${b.category}.`,
        recommendedAction: `Keep track of your upcoming outlays to remain within the budget threshold.`
      });
    }
  });

  // 2. Negative Cash Flow Risk
  const surplus = incomeSummary.total - expenseSummary.total;
  if (surplus < 0 && incomeSummary.total > 0) {
    risks.push({
      type: 'negative_cash_flow',
      severity: 'Critical',
      title: 'Negative Monthly Cash Flow',
      description: `You spent ₹${expenseSummary.total.toLocaleString('en-IN')} but only earned ₹${incomeSummary.total.toLocaleString('en-IN')} this month (Deficit: ₹${Math.abs(surplus).toLocaleString('en-IN')}).`,
      recommendedAction: 'Cut non-essential subscriptions or lifestyle costs immediately to restore a positive balance.'
    });
  }

  // 3. Low Emergency Savings
  const emergencyCushion = walletSummary.total;
  const avgMonthlyExpense = expenseSummary.total || 1;
  const monthCushion = emergencyCushion / avgMonthlyExpense;
  if (monthCushion < 1) {
    risks.push({
      type: 'low_emergency_savings',
      severity: 'High',
      title: 'Low Emergency Fund Coverage',
      description: `Your total liquid savings (₹${emergencyCushion.toLocaleString('en-IN')}) will cover less than 1 month of average monthly spending.`,
      recommendedAction: 'Prioritize building a 3-month emergency reserve before making discretionary investments.'
    });
  } else if (monthCushion < 3) {
    risks.push({
      type: 'low_emergency_savings',
      severity: 'Medium',
      title: 'Modest Emergency Fund Coverage',
      description: `Your liquid balance covers ${monthCushion.toFixed(1)} months of expenses, which is slightly below the target of 3-6 months.`,
      recommendedAction: 'Continue saving at least 10% of monthly income to reach the standard 3-month threshold.'
    });
  }

  // 4. High Debt Ratio
  const totalEMI = loanSummary.totalMonthlyEMI || 0;
  const totalIncome = incomeSummary.total || 0;
  const debtRatio = totalIncome > 0 ? totalEMI / totalIncome : 0;
  if (debtRatio > 0.40) {
    risks.push({
      type: 'high_debt_ratio',
      severity: 'Critical',
      title: 'Critical Debt Obligation Burden',
      description: `${Math.round(debtRatio * 100)}% of your monthly income is consumed by active EMI loan commitments.`,
      recommendedAction: 'Avoid taking any new credit lines. Focus on prepaying the loan with the highest interest rate.'
    });
  } else if (debtRatio > 0.20) {
    risks.push({
      type: 'high_debt_ratio',
      severity: 'High',
      title: 'Elevated Loan Debt Burden',
      description: `${Math.round(debtRatio * 100)}% of your income is allocated to debt repayment.`,
      recommendedAction: 'Maintain strict budget controls to ensure debt payments do not compromise savings targets.'
    });
  }

  // 5. Delayed Financial Goals
  goalSummary.goals.forEach(g => {
    if (g.status === 'Active' && g.daysLeft !== null) {
      // If deadline is in less than 30 days and progress is below 80%
      if (g.daysLeft <= 30 && g.progressPct < 80) {
        risks.push({
          type: 'delayed_financial_goals',
          severity: 'High',
          title: `Goal Deadline Alert: ${g.title}`,
          description: `Goal "${g.title}" is due in ${g.daysLeft} days but is only ${g.progressPct}% complete.`,
          recommendedAction: `Increase savings allocation or consider extending the goal completion timeline.`
        });
      }
    }
  });

  // 6. High Subscription Burden
  const monthlySubs = subSummary.monthlyTotal || 0;
  const subRatio = totalIncome > 0 ? monthlySubs / totalIncome : 0;
  if (subRatio > 0.10) {
    risks.push({
      type: 'high_subscription_burden',
      severity: 'High',
      title: 'High Subscription Overhead',
      description: `Subscriptions consume ${Math.round(subRatio * 100)}% of your monthly budget (₹${monthlySubs.toLocaleString('en-IN')}/mo).`,
      recommendedAction: 'Audit streaming and digital services, and cancel any platforms you have not used in the past 30 days.'
    });
  }

  // 7. Unusual Expenses / Spending Spikes
  const avgTx = expenseSummary.average || 0;
  expenses.forEach(e => {
    if (e.amount > avgTx * 4 && e.amount > 5000) {
      risks.push({
        type: 'unusual_expense',
        severity: 'Medium',
        title: `Unusually Large Expense: ${e.title}`,
        description: `Logged a single purchase of ₹${e.amount.toLocaleString('en-IN')} in ${e.category?.name || 'Category'}, which is over 4x your average transaction.`,
        recommendedAction: 'Ensure this transaction is verified and note its impact on this month\'s savings rate.'
      });
    }
  });

  // 8. Low Wallet Balance
  wallets.forEach(w => {
    if (!w.isArchived && w.balance < 1000) {
      risks.push({
        type: 'low_wallet_balance',
        severity: 'Medium',
        title: `Low Balance Alert: ${w.name}`,
        description: `Wallet "${w.name}" has a low balance of ₹${w.balance.toLocaleString('en-IN')}.`,
        recommendedAction: `Avoid payment failures or overdraft charges by replenishing funds in this wallet.`
      });
    }
  });

  // Sort by severity: Critical > High > Medium > Low
  const severityWeight = { Critical: 4, High: 3, Medium: 2, Low: 1 };
  risks.sort((a, b) => severityWeight[b.severity] - severityWeight[a.severity]);

  const duration = Date.now() - startTime;
  logger.info(`[RiskAnalyzer] Risks scanned. Detected ${risks.length} issues in ${duration}ms.`);

  return risks;
};
