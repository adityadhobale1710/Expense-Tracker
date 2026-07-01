import asyncHandler from 'express-async-handler';
import AIChat from '../models/AIChat.js';
import Expense from '../models/Expense.js';
import Income from '../models/Income.js';
import Budget from '../models/Budget.js';
import Wallet from '../models/Wallet.js';
import { sendSuccess } from '../utils/apiResponse.js';

// @desc    Get AI Chat History
// @route   GET /api/ai/history
export const getChatHistory = asyncHandler(async (req, res) => {
  let chat = await AIChat.findOne({ user: req.user._id });
  if (!chat) {
    chat = await AIChat.create({ user: req.user._id, messages: [] });
  }
  sendSuccess(res, 200, 'Chat history retrieved', chat.messages);
});

// @desc    Send Message to AI assistant
// @route   POST /api/ai/chat
export const sendMessage = asyncHandler(async (req, res) => {
  const { message } = req.body;
  if (!message) {
    res.status(400);
    throw new Error('Message is required');
  }

  // 1. Retrieve User Context for smart responses
  const userId = req.user._id;
  const [expenses, incomes, budgets, wallets] = await Promise.all([
    Expense.find({ user: userId }).sort({ date: -1 }).limit(10),
    Income.find({ user: userId }).sort({ date: -1 }).limit(10),
    Budget.find({ user: userId }),
    Wallet.find({ user: userId }),
  ]);

  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
  const currentBalance = wallets.reduce((sum, w) => sum + w.balance, 0);

  // 2. Draft Smart Mock Responses based on query text
  const msgLower = message.toLowerCase();
  let reply = '';

  if (msgLower.includes('can i spend') || msgLower.includes('spend') && msgLower.includes('rupees') || msgLower.includes('₹')) {
    // Try to extract number
    const match = message.match(/(?:₹|rs\.?)\s*(\d+)/i) || message.match(/(\d+)\s*(?:rupees|rs|inr)/i) || message.match(/\b\d{3,6}\b/);
    const amountToSpend = match ? parseInt(match[1] || match[0], 10) : 5000;
    const remaining = currentBalance - amountToSpend;

    if (remaining < 20000) {
      reply = `Spending ₹${amountToSpend.toLocaleString('en-IN')} right now is a bit tight. Your total wallet balance is ₹${currentBalance.toLocaleString('en-IN')}. If you spend this, your liquid cushion drops to ₹${remaining.toLocaleString('en-IN')}. I recommend postponing this or checking your Utilities budget.`;
    } else {
      reply = `Yes, you can absolutely spend ₹${amountToSpend.toLocaleString('en-IN')}! With your current liquid wallet assets at ₹${currentBalance.toLocaleString('en-IN')}, allocating ₹${amountToSpend.toLocaleString('en-IN')} still leaves you with a healthy buffer of ₹${remaining.toLocaleString('en-IN')}. Go ahead!`;
    }
  } else if (msgLower.includes('why') && (msgLower.includes('increase') || msgLower.includes('rising') || msgLower.includes('more'))) {
    // Find largest expense categories
    if (expenses.length > 0) {
      const topExpense = expenses[0];
      reply = `Your recent expenses are showing a slight upward trajectory primarily due to category spikes. Specifically, your purchase of "${topExpense.title}" for ₹${topExpense.amount.toLocaleString('en-IN')} was your largest transaction. Reducing discretionary items in Food & Dining will help curve this growth.`;
    } else {
      reply = `Your expense data is currently too limited to detect trends. Keep logging your daily activities so I can model your trajectories!`;
    }
  } else if (msgLower.includes('what should i save') || msgLower.includes('savings') || msgLower.includes('save')) {
    const recommendedSavings = Math.round(totalIncome * 0.2) || 15000;
    reply = `Based on your regular logs, you should aim to save at least 20% of your income. For your profile, this equates to roughly ₹${recommendedSavings.toLocaleString('en-IN')} per month. Setting up a dedicated savings goal for an "Emergency Fund" with auto-transfers will help you reach this target easily.`;
  } else if (msgLower.includes('budget') || msgLower.includes('recommend')) {
    reply = `I recommend a 50/30/20 budgeting layout. Allocate 50% (₹${Math.round(totalIncome * 0.5)} ) for Needs like Rent & Utilities, 30% (₹${Math.round(totalIncome * 0.3)}) for Wants like Restaurants, and 20% (₹${Math.round(totalIncome * 0.2)}) for Savings and investments. Currently, your budgets are utilized at ${budgets.length > 0 ? '72%' : '0%'} of their limits.`;
  } else {
    // Default fallback
    reply = `Hello! I am your AI Financial Assistant. I've analyzed your data:
- Liquid Wallets Balance: ₹${currentBalance.toLocaleString('en-IN')}
- Active budgets set: ${budgets.length}
- Recent monthly log volume is stable.

How else can I assist your financial planning today? You can ask me to predict savings, explain charts, or audit recent transactions.`;
  }

  // 3. Persist to DB Chat log
  let chat = await AIChat.findOne({ user: userId });
  if (!chat) {
    chat = await AIChat.create({ user: userId, messages: [] });
  }

  chat.messages.push({ role: 'user', content: message });
  chat.messages.push({ role: 'assistant', content: reply });
  await chat.save();

  sendSuccess(res, 200, 'Reply sent', {
    userMessage: chat.messages[chat.messages.length - 2],
    aiMessage: chat.messages[chat.messages.length - 1],
  });
});
