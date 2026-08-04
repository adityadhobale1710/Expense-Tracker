import asyncHandler from 'express-async-handler';
import AIChat from '../models/AIChat.js';
import Expense from '../models/Expense.js';
import Income from '../models/Income.js';
import Budget from '../models/Budget.js';
import Wallet from '../models/Wallet.js';
import Goal from '../models/Goal.js';
import Loan from '../models/Loan.js';
import Subscription from '../models/Subscription.js';
import Category from '../models/Category.js'; // Ensure Category schema is loaded for population
import { generateAIResponse } from '../services/ai/GeminiService.js';
import { sendSuccess } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';

// @desc    Get AI Chat History
// @route   GET /api/ai/history
export const getChatHistory = asyncHandler(async (req, res) => {
  let chat = await AIChat.findOne({ user: req.user._id });
  if (!chat) {
    chat = await AIChat.create({ user: req.user._id, messages: [] });
  }

  // Parse optional limit query parameter, default to 50
  const queryLimit = parseInt(req.query.limit, 10);
  const limit = (!isNaN(queryLimit) && queryLimit > 0) ? queryLimit : 50;
  const returnedMessages = chat.messages.slice(-limit);

  sendSuccess(res, 200, 'Chat history retrieved', returnedMessages);
});

// @desc    Send Message to AI assistant
// @route   POST /api/ai/chat
export const sendMessage = asyncHandler(async (req, res) => {
  const { message } = req.body;
  
  // Trim message and reject empty/whitespace-only input
  const trimmedMessage = typeof message === 'string' ? message.trim() : '';
  if (!trimmedMessage) {
    res.status(400);
    throw new Error('Message is required');
  }

  const userId = req.user._id;

  // 1. Retrieve or initialize the chat session
  let chat = await AIChat.findOne({ user: userId });
  if (!chat) {
    chat = await AIChat.create({ user: userId, messages: [] });
  }

  // 2. Context caching: only rebuild if it is empty or older than 5 minutes
  const cacheDurationMs = 5 * 60 * 1000;
  const isCacheValid = chat.contextUpdatedAt && 
                       (Date.now() - new Date(chat.contextUpdatedAt).getTime() < cacheDurationMs) && 
                       chat.financialContext;

  let financialContextText = '';

  if (isCacheValid) {
    financialContextText = chat.financialContext;
    logger.info(`[AI Controller] Using cached financial context for user: ${userId}`);
  } else {
    logger.info(`[AI Controller] Cache invalid/expired. Recomputing financial context for user: ${userId}`);

    // Retrieve User Context for smart, context-aware responses (limit range to last 30 days for totals)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      wallets,
      budgets,
      recentExpenses,
      recentIncomes,
      monthlyExpensesDocs,
      monthlyIncomesDocs,
      goals,
      loans,
      subscriptions
    ] = await Promise.all([
      Wallet.find({ user: userId, isArchived: false }),
      Budget.find({ user: userId }).populate('category'),
      Expense.find({ user: userId }).sort({ date: -1 }).limit(10).populate('category'),
      Income.find({ user: userId }).sort({ date: -1 }).limit(10),
      Expense.find({ user: userId, date: { $gte: thirtyDaysAgo } }).populate('category'),
      Income.find({ user: userId, date: { $gte: thirtyDaysAgo } }),
      Goal.find({ user: userId, isDeleted: false }),
      Loan.find({ user: userId }),
      Subscription.find({ user: userId })
    ]);

    // Calculate totals and metrics
    const currentBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
    const monthlyExpenses = monthlyExpensesDocs.reduce((sum, e) => sum + e.amount, 0);
    const monthlyIncome = monthlyIncomesDocs.reduce((sum, i) => sum + i.amount, 0);
    const savings = Math.max(0, monthlyIncome - monthlyExpenses);

    // Wallet balances summary list
    const walletSummary = wallets
      .map(w => `- ${w.name} (${w.type}): ${w.balance.toLocaleString('en-IN')} ${w.currency}`)
      .join('\n') || '- None';

    // Budget status summary list
    const budgetSummary = budgets
      .map(b => {
        const categoryName = b.category ? b.category.name : 'Unknown';
        const percent = b.limit > 0 ? Math.round((b.spent / b.limit) * 100) : 0;
        return `- ${categoryName}: Spent ₹${b.spent.toLocaleString('en-IN')} of ₹${b.limit.toLocaleString('en-IN')} limit (${percent}%)`;
      })
      .join('\n') || '- None';

    // Goal progress summary list
    const goalSummary = goals
      .map(g => `- ${g.title}: Saved ₹${g.savedAmount.toLocaleString('en-IN')} of ₹${g.targetAmount.toLocaleString('en-IN')} (${g.progressPct}%, status: ${g.status})`)
      .join('\n') || '- None';

    // Loan summary list
    const loanSummary = loans
      .map(l => `- ${l.name} (${l.type}): Principal ₹${l.amount.toLocaleString('en-IN')}, Remaining ₹${l.remainingBalance.toLocaleString('en-IN')}, EMI ₹${l.emiAmount.toLocaleString('en-IN')}/mo`)
      .join('\n') || '- None';

    // Subscription summary list
    const subscriptionSummary = subscriptions
      .map(s => `- ${s.name}: ₹${s.cost.toLocaleString('en-IN')} / ${s.billingCycle}`)
      .join('\n') || '- None';

    // Top spending categories in the last 30 days
    const categoryTotals = {};
    monthlyExpensesDocs.forEach(e => {
      const catName = e.category ? e.category.name : 'Uncategorized';
      categoryTotals[catName] = (categoryTotals[catName] || 0) + e.amount;
    });
    const topCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat, total]) => `- ${cat}: ₹${total.toLocaleString('en-IN')}`)
      .join('\n') || '- None';

    // Combined recent transactions list (5 expenses, 5 incomes)
    const recentTx = [];
    recentExpenses.slice(0, 5).forEach(e => {
      recentTx.push({
        type: 'Expense',
        title: e.title,
        amount: e.amount,
        category: e.category ? e.category.name : 'Uncategorized',
        date: e.date
      });
    });
    recentIncomes.slice(0, 5).forEach(i => {
      recentTx.push({
        type: 'Income',
        title: i.title,
        amount: i.amount,
        category: i.category || 'Other',
        date: i.date
      });
    });
    recentTx.sort((a, b) => b.date - a.date);
    const transactionSummary = recentTx
      .map(tx => `- [${tx.type}] ${tx.title} (${tx.category}): ₹${tx.amount.toLocaleString('en-IN')} on ${new Date(tx.date).toLocaleDateString('en-IN')}`)
      .join('\n') || '- None';

    // Trends & volume summary
    const trendsSummary = `- Last 30 Days logged: ${monthlyExpensesDocs.length} expenses, ${monthlyIncomesDocs.length} incomes
- Monthly Savings Rate: ${monthlyIncome > 0 ? Math.round((savings / monthlyIncome) * 100) : 0}% of total income`;

    // Compile full context
    financialContextText = `Wallet Balance:
- Total Liquid Assets: ₹${currentBalance.toLocaleString('en-IN')}
${walletSummary}

Monthly Summary (Last 30 Days):
- Monthly Income: ₹${monthlyIncome.toLocaleString('en-IN')}
- Monthly Expenses: ₹${monthlyExpenses.toLocaleString('en-IN')}
- Savings: ₹${savings.toLocaleString('en-IN')}

Budget Status:
${budgetSummary}

Top Spending Categories (Last 30 Days):
${topCategories}

Recent Transactions:
${transactionSummary}

Goal Progress:
${goalSummary}

Loans / Liabilities:
${loanSummary}

Active Subscriptions:
${subscriptionSummary}

Trends & Volume:
${trendsSummary}`;

    // Update fields in the document object to persist on save
    chat.financialContext = financialContextText;
    chat.contextUpdatedAt = new Date();
  }

  // 3. Load only the most recent 15 messages for Gemini call context
  const recentMessages = chat.messages.slice(-15);

  // 4. Generate response using Gemini Service
  let reply;
  try {
    reply = await generateAIResponse(recentMessages, trimmedMessage, financialContextText);
  } catch (error) {
    res.status(error.status || 502);
    throw new Error(error.message);
  }

  // 5. Save both the user prompt and AI response back to MongoDB chat logs
  chat.messages.push({ role: 'user', content: trimmedMessage });
  chat.messages.push({ role: 'assistant', content: reply });
  
  if (chat.messages.length > 50) {
    chat.messages = chat.messages.slice(-50);
  }
  await chat.save();

  // 6. Send success response back with the saved messages matching original API contract
  sendSuccess(res, 200, 'Reply sent', {
    userMessage: chat.messages[chat.messages.length - 2],
    aiMessage: chat.messages[chat.messages.length - 1],
  });
});
