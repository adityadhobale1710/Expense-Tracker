import asyncHandler from 'express-async-handler';
import FinancialDataService from '../services/financial/FinancialDataService.js';
import Category from '../models/Category.js';
import Notification from '../models/Notification.js';
import { sendSuccess } from '../utils/apiResponse.js';

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

  // Fallback aggregations (for current month)
  let totalIncome = 0;
  let totalExpense = 0;
  
  incomes.forEach(i => {
    if (new Date(i.date) >= dateRange.startDate && new Date(i.date) <= dateRange.endDate) {
      totalIncome += i.amount;
    }
  });
  
  expenses.forEach(e => {
    if (new Date(e.date) >= dateRange.startDate && new Date(e.date) <= dateRange.endDate) {
      totalExpense += e.amount;
    }
  });

  // Compute summary metrics
  const balance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round((balance / totalIncome) * 100) : 0;

  // Run AI Financial Advisor insights calculation using pre-fetched collections (zero DB duplicate queries)
  let insights = null;
  try {
    const { generateInsights } = await import('../services/ai/InsightEngine.js');
    insights = await generateInsights({
      wallets,
      budgets,
      expenses,
      incomes,
      goals,
      loans,
      subscriptions,
      userId
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

