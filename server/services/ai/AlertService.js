/**
 * AlertService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Scans accounts for budget violations, duplicate subscription payments,
 * liquid low balances, goal lags, and due liabilities, and flags them by severity.
 */

import {
  calculateWalletBalance,
  calculateBudgetUsage,
} from './ToolRegistry.js';
import logger from '../../utils/logger.js';

export const getAlerts = (snapshot = {}) => {
  const startTime = Date.now();
  const alerts = [];

  const {
    wallets = [],
    budgets = [],
    expenses = [],
    loans = [],
    subscriptions = [],
    goals = []
  } = snapshot;

  // 1. Critical Alert: Low Wallet Balance
  const walletSummary = calculateWalletBalance(wallets);
  if (walletSummary.total < 5000) {
    alerts.push({
      id: 'alert_low_balance',
      severity: 'Critical',
      title: 'Low Wallet Balance',
      description: `Your total liquid balance is ₹${walletSummary.total.toLocaleString('en-IN')}, which is below the ₹5,000 safety limit.`,
      module: 'Wallets',
      action: 'Transfer Funds'
    });
  }

  // 2. Critical Alert: Budget Exceeded
  budgets.forEach(b => {
    if (b.spent > b.limit) {
      alerts.push({
        id: `alert_budget_exceeded_${b._id}`,
        severity: 'Critical',
        title: 'Budget Exceeded',
        description: `Your spending in "${b.category?.name || 'Category'}" has exceeded its limit of ₹${b.limit.toLocaleString('en-IN')} by ₹${(b.spent - b.limit).toLocaleString('en-IN')}.`,
        module: 'Budget',
        action: 'Modify Budget'
      });
    }
  });

  // 3. Warning Alert: High spending detected
  expenses.forEach(e => {
    if (e.amount > 10000) {
      alerts.push({
        id: `alert_high_spending_${e._id}`,
        severity: 'Warning',
        title: 'High Spending Detected',
        description: `A transaction of ₹${e.amount.toLocaleString('en-IN')} for "${e.title}" was recorded in category "${e.category?.name || 'Uncategorized'}".`,
        module: 'Expenses',
        action: 'Categorize Outlays'
      });
    }
  });

  // 4. Warning Alert: Goal behind schedule
  goals.forEach(g => {
    if (g.status === 'Active') {
      const remaining = g.targetAmount - g.currentAmount;
      const targetDate = new Date(g.targetDate);
      const monthsRemaining = (targetDate - new Date()) / (1000 * 60 * 60 * 24 * 30.4);
      if (monthsRemaining > 0) {
        const requiredMonthly = remaining / monthsRemaining;
        if (g.monthlyContribution < requiredMonthly) {
          alerts.push({
            id: `alert_goal_lag_${g._id}`,
            severity: 'Warning',
            title: 'Goal Behind Schedule',
            description: `Goal "${g.title}" requires ₹${Math.round(requiredMonthly).toLocaleString('en-IN')}/month to finish on schedule. Current contribution is ₹${g.monthlyContribution.toLocaleString('en-IN')}.`,
            module: 'Goals',
            action: 'Edit Goal'
          });
        }
      }
    }
  });

  // 5. Information Alert: Upcoming EMI Due
  loans.forEach(l => {
    // Check if next payment date is within 7 days
    if (l.nextPaymentDate) {
      const nextPay = new Date(l.nextPaymentDate);
      const diffDays = Math.ceil((nextPay - new Date()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 7 && diffDays >= 0) {
        alerts.push({
          id: `alert_upcoming_emi_${l._id}`,
          severity: 'Information',
          title: 'Upcoming EMI Due',
          description: `EMI of ₹${l.monthlyPayment.toLocaleString('en-IN')} for "${l.name}" is due in ${diffDays} days on ${nextPay.toLocaleDateString('en-IN')}.`,
          module: 'Loans',
          action: 'View Loans'
        });
      }
    }
  });

  // 6. Information Alert: Upcoming Subscription Renewal
  subscriptions.forEach(s => {
    if (s.nextBillingDate) {
      const renewalDate = new Date(s.nextBillingDate);
      const diffDays = Math.ceil((renewalDate - new Date()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 3 && diffDays >= 0) {
        alerts.push({
          id: `alert_upcoming_sub_${s._id}`,
          severity: 'Information',
          title: 'Subscription Renewing Tomorrow',
          description: `Subscription "${s.name}" of ₹${s.cost.toLocaleString('en-IN')} will renew in ${diffDays} days.`,
          module: 'Subscriptions',
          action: 'Audit Subscriptions'
        });
      }
    }
  });

  // 7. Information Alert: Duplicate Subscription Detected
  const subscriptionCostMap = {};
  subscriptions.forEach(s => {
    if (subscriptionCostMap[s.cost] && subscriptionCostMap[s.cost].category === s.category) {
      alerts.push({
        id: `alert_duplicate_sub_${s._id}`,
        severity: 'Warning',
        title: 'Duplicate Subscription Detected',
        description: `Potential duplicate found: "${s.name}" shares the price (₹${s.cost}) and category of "${subscriptionCostMap[s.cost].name}".`,
        module: 'Subscriptions',
        action: 'Audit Subscriptions'
      });
    } else {
      subscriptionCostMap[s.cost] = s;
    }
  });

  const duration = Date.now() - startTime;
  logger.info(`[AlertService] Scanner compiled ${alerts.length} warnings in ${duration}ms.`);

  return alerts;
};
