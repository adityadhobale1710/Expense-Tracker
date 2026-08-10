/**
 * FactRouter.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Deterministic shortcut router. Intercepts simple factual questions
 * (e.g. counts, balances, today's spending) and resolves them directly
 * from FinancialDataService/ToolRegistry without calling Gemini.
 */

import FinancialDataService from '../financial/FinancialDataService.js';
import {
  calculateWalletBalance,
  calculateMonthlyExpense,
  calculateMonthlyIncome,
  calculateSavings
} from './ToolRegistry.js';
import logger from '../../utils/logger.js';

const fmt = (n) => (n ?? 0).toLocaleString('en-IN');

export const routeFact = async (userId, message) => {
  const norm = message.trim().toLowerCase();

  // 1. Current Balance / Wallet balance
  if (
    /current balance|total balance|how much money do i have|how much is in my wallet|what is my balance|wallet balance/i.test(norm)
  ) {
    const wallets = await FinancialDataService.getWallets(userId);
    const balanceData = calculateWalletBalance(wallets);
    const reply = `Your total wallet balance is **₹${fmt(balanceData.total)}** across ${balanceData.count} wallet(s).`;
    logger.info(`[FactRouter] Intercepted balance query. Returned: "${reply}"`);
    return reply;
  }

  // 2. Goal count
  if (/how many goals|goal count|goals count/i.test(norm)) {
    const goals = await FinancialDataService.getGoals(userId);
    const active = goals.filter(g => g.status === 'Active').length;
    const completed = goals.filter(g => g.status === 'Completed').length;
    const reply = `You currently have **${active}** active savings goal(s) and **${completed}** completed goal(s) logged in your account.`;
    logger.info(`[FactRouter] Intercepted goals query. Returned: "${reply}"`);
    return reply;
  }

  // 3. Budget count
  if (/how many budgets|budget count|budgets count/i.test(norm)) {
    const budgets = await FinancialDataService.getBudgets(userId);
    const reply = `You currently have **${budgets.length}** budget limit(s) configured.`;
    logger.info(`[FactRouter] Intercepted budgets query. Returned: "${reply}"`);
    return reply;
  }

  // 4. Wallet count
  if (/how many wallets|wallet count|wallets count/i.test(norm)) {
    const wallets = await FinancialDataService.getWallets(userId);
    const reply = `You currently have **${wallets.length}** active wallet(s) configured.`;
    logger.info(`[FactRouter] Intercepted wallets query. Returned: "${reply}"`);
    return reply;
  }

  // 5. Loan count
  if (/how many loans|loan count|loans count/i.test(norm)) {
    const loans = await FinancialDataService.getLoans(userId);
    const reply = `You currently have **${loans.length}** active loan(s)/liabilities logged.`;
    logger.info(`[FactRouter] Intercepted loans query. Returned: "${reply}"`);
    return reply;
  }

  // 6. Subscription count
  if (/how many subscriptions|subscription count|subscriptions count/i.test(norm)) {
    const subs = await FinancialDataService.getSubscriptions(userId);
    const reply = `You currently have **${subs.length}** active subscription(s) configured.`;
    logger.info(`[FactRouter] Intercepted subscriptions query. Returned: "${reply}"`);
    return reply;
  }

  // 7. Expense count
  if (/expense count|how many expenses|number of expenses/i.test(norm)) {
    const expenses = await FinancialDataService.getExpenses(userId);
    const reply = `You have logged a total of **${expenses.length}** expense transaction(s).`;
    logger.info(`[FactRouter] Intercepted expense count query. Returned: "${reply}"`);
    return reply;
  }

  // 8. Income count
  if (/income count|how many income|number of income/i.test(norm)) {
    const incomes = await FinancialDataService.getIncomes(userId);
    const reply = `You have logged a total of **${incomes.length}** income entry/entries.`;
    logger.info(`[FactRouter] Intercepted income count query. Returned: "${reply}"`);
    return reply;
  }

  // 9. Today's spending
  if (/today's spending|spending today|expenses today|spent today|spend today/i.test(norm)) {
    const start = new Date();
    start.setHours(0,0,0,0);
    const end = new Date();
    end.setHours(23,59,59,999);
    const expenses = await FinancialDataService.getExpenses(userId, { startDate: start, endDate: end });
    const expData = calculateMonthlyExpense(expenses);
    const reply = `You spent **₹${fmt(expData.total)}** today across ${expData.count} transaction(s).`;
    logger.info(`[FactRouter] Intercepted today's spending query. Returned: "${reply}"`);
    return reply;
  }

  // 10. This week's spending
  if (/this week's spending|spending this week|expenses this week|spent this week|spend this week/i.test(norm)) {
    const start = new Date();
    const day = start.getDay();
    start.setDate(start.getDate() - day);
    start.setHours(0,0,0,0);
    const end = new Date();
    const expenses = await FinancialDataService.getExpenses(userId, { startDate: start, endDate: end });
    const expData = calculateMonthlyExpense(expenses);
    const reply = `You spent **₹${fmt(expData.total)}** this week across ${expData.count} transaction(s).`;
    logger.info(`[FactRouter] Intercepted this week's spending query. Returned: "${reply}"`);
    return reply;
  }

  return null;
};
