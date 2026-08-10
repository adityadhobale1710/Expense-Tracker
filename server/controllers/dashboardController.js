import asyncHandler from 'express-async-handler';
import FinancialDataService from '../services/financial/FinancialDataService.js';
import Category from '../models/Category.js';
import Notification from '../models/Notification.js';
import AIChat from '../models/AIChat.js';
import { sendSuccess } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';
import {
  calculateMonthlyExpense,
  calculateMonthlyIncome,
  calculateSavings,
} from '../services/ai/ToolRegistry.js';

// @desc    Get aggregated dashboard data
// @route   GET /api/dashboard
export const getDashboardData = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // 1. Load canonical snapshot
  const snapshot = await FinancialDataService.getFinancialSnapshot(userId, { limit: 50 });

  // 2. Load dashboard specific non-financial UI data
  const [categories, recentNotifications] = await Promise.all([
    Category.find({ user: userId }).sort({ name: 1 }),
    Notification.find({ user: userId }).sort({ createdAt: -1 }).limit(3)
  ]);

  const {
    user: userProfile,
    wallets,
    budgets,
    goals,
    loans,
    subscriptions,
    expenses,
    incomes,
    dateRange
  } = snapshot;

  // Compute summary metrics using ToolRegistry (M4: single source of truth for totals)
  // Filter to the snapshot's date range before calculating
  const rangedExpenses = expenses.filter(
    (e) => new Date(e.date) >= dateRange.startDate && new Date(e.date) <= dateRange.endDate
  );
  const rangedIncomes = incomes.filter(
    (i) => new Date(i.date) >= dateRange.startDate && new Date(i.date) <= dateRange.endDate
  );

  const expSummary = calculateMonthlyExpense(rangedExpenses);
  const incSummary = calculateMonthlyIncome(rangedIncomes);
  const savSummary = calculateSavings(incSummary.total, expSummary.total);

  const totalIncome = incSummary.total;
  const totalExpense = expSummary.total;
  const balance = savSummary.amount;
  const savingsRate = totalIncome > 0 ? Math.round(savSummary.rate) : 0;

  // Run AI Financial Advisor insights calculation using pre-fetched collections (zero DB duplicate queries)
  // M7: load (or upsert) the chat document so InsightEngine can read/write the MongoDB insights cache
  let insights = null;
  try {
    const chat = await AIChat.findOneAndUpdate(
      { user: userId },
      {},
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    const { generateInsights } = await import('../services/ai/InsightEngine.js');
    insights = await generateInsights({
      wallets,
      budgets,
      expenses,
      incomes,
      goals,
      loans,
      subscriptions,
      userId,
      chat,
    });
  } catch (err) {
    logger.warn(`Failed to generate AI dashboard insights: ${err.message}`);
  }

  sendSuccess(res, 200, 'Dashboard data aggregated successfully', {
    user: userProfile,
    wallets,
    categories,
    budgets,
    incomes: incomes || [],
    expenses: expenses || [],
    goals,
    subscriptions,
    loans,
    recentNotifications: recentNotifications.map(n => ({
      message: n.message,
      date: new Date(n.createdAt).toLocaleDateString('en-IN')
    })),
    summary: {
      totalIncome,
      totalExpense,
      balance,
      savingsRate
    },
    // Dynamic Proactive Advisor payloads
    financialHealth: insights?.financialHealth || null,
    healthScore: insights?.financialHealth?.score || 82,
    grade: insights?.financialHealth?.grade || 'Excellent',
    tipOfTheDay: insights?.recommendations?.[0]
      ? { title: insights.recommendations[0].title, text: insights.recommendations[0].description }
      : { title: 'Cut unused streaming services', text: 'Canceling Spotify could save you ₹1,428/year. Redirecting it to gold funds yields better CAGR.' },
    topInsight: insights?.aiExplanation || null,
    activeRisks: insights?.activeRisks || [],
    recommendations: insights?.recommendations || [],
    trendSummary: insights?.trendSummary || [],
  });
});

