import asyncHandler from 'express-async-handler';
import Goal from '../models/Goal.js';
import Contribution from '../models/Contribution.js';
import Wallet from '../models/Wallet.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import Expense from '../models/Expense.js';
import { sendSuccess } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';

// Predefined Goal Templates
const GOAL_TEMPLATES = [
  { name: 'Emergency Fund', targetAmount: 150000, icon: '🛡️', category: 'Emergency Fund', color: '#10b981', description: 'Reserve cash for unexpected emergencies.' },
  { name: 'Vacation Trip', targetAmount: 60000, icon: '🏖️', category: 'Vacation', color: '#f59e0b', description: 'Save for your dream vacation flight and stay.' },
  { name: 'Buy a Car', targetAmount: 800000, icon: '🚗', category: 'Vehicle', color: '#3b82f6', description: 'Allocate funds for a down payment or purchase.' },
  { name: 'New Laptop', targetAmount: 120000, icon: '💻', category: 'Electronics', color: '#8b5cf6', description: 'Upgrade your work or gaming computer.' },
  { name: 'Higher Education', targetAmount: 500000, icon: '🎓', category: 'Education', color: '#3b82f6', description: 'Save for college, degrees, or certifications.' },
  { name: 'Dream Wedding', targetAmount: 1000000, icon: '💍', category: 'Wedding', color: '#ec4899', description: 'Fund wedding events and apparel.' },
  { name: 'New Smart Phone', targetAmount: 80000, icon: '📱', category: 'Electronics', color: '#06b6d4', description: 'Save for the latest smartphone upgrade.' },
  { name: 'Emergency Reserve', targetAmount: 50000, icon: '🏥', category: 'Emergency Fund', color: '#ef4444', description: 'Minor liquid cushion for sudden bills.' }
];

// Helper: Check and update user achievements
export const updateSavingsAchievements = async (userId) => {
  try {
    const totalGoalsCount = await Goal.countDocuments({ user: userId });
    const emergencyGoalsCount = await Goal.countDocuments({ user: userId, category: 'Emergency Fund' });
    const completedGoals = await Goal.find({ user: userId, status: 'Completed' });

    // Calculate maximum completions in a single month
    const completedInSameMonth = () => {
      const monthCounts = {};
      completedGoals.forEach(g => {
        const month = g.updatedAt ? g.updatedAt.toISOString().substring(0, 7) : new Date().toISOString().substring(0, 7);
        monthCounts[month] = (monthCounts[month] || 0) + 1;
      });
      return Math.max(0, ...Object.values(monthCounts));
    };
    const maxCompletedInMonth = completedGoals.length > 0 ? completedInSameMonth() : 0;

    const contributions = await Contribution.find({ user: userId });
    const cumulativeSaved = contributions.reduce((sum, c) => sum + c.amount, 0);
    const maxSingleDeposit = contributions.length > 0 ? Math.max(...contributions.map(c => c.amount)) : 0;

    const goals = await Goal.find({ user: userId });
    const maxProgress = goals.length > 0 ? Math.max(...goals.map(g => g.progressPct)) : 0;

    const user = await User.findById(userId);
    if (!user) return;

    let xpAwarded = 0;
    let coinsAwarded = 0;
    const achievementsList = [...(user.achievements || [])];

    const checkAndAward = (id, currentVal, neededVal, xpReward, coinsReward) => {
      let ach = achievementsList.find(a => a.id === id);
      if (!ach) {
        ach = { id, currentProgress: 0, unlocked: false };
        achievementsList.push(ach);
      }
      if (ach.unlocked) return;

      ach.currentProgress = Math.min(currentVal, neededVal);
      if (ach.currentProgress >= neededVal) {
        ach.unlocked = true;
        ach.unlockedAt = new Date();
        xpAwarded += xpReward;
        coinsAwarded += coinsReward;
      }
    };

    // Savings achievements references
    checkAndAward('s1', contributions.length, 1, 100, 10); // First deposit
    checkAndAward('s2', totalGoalsCount, 1, 150, 15);     // Goal Setter
    checkAndAward('s3', maxSingleDeposit, 2000, 200, 20);   // Double Down
    checkAndAward('s4', completedGoals.length, 1, 500, 50); // Milestone Completed
    checkAndAward('s5', contributions.length, 5, 300, 30);  // Tenacious Saver
    checkAndAward('s6', emergencyGoalsCount, 1, 200, 20);   // Emergency Shield
    checkAndAward('s7', maxProgress, 50, 350, 35);          // Halfway
    checkAndAward('s8', cumulativeSaved, 10000, 600, 60);   // Savings Stack
    checkAndAward('s9', cumulativeSaved, 50000, 1200, 120);  // Accumulator Pro
    checkAndAward('s10', cumulativeSaved, 200000, 3000, 300); // Sovereign Vault
    checkAndAward('s11', maxCompletedInMonth, 2, 1000, 100);  // Double Completed Month

    user.achievements = achievementsList;

    if (xpAwarded > 0 || coinsAwarded > 0) {
      user.xp += xpAwarded;
      user.coins += coinsAwarded;

      const xpLevels = [0, 500, 1200, 2200, 3500, 5000, 7000, 9500, 12500, 16000, 20000, 25000, 31000, 38000, 46000];
      let calculatedLevel = 1;
      for (let i = 0; i < xpLevels.length; i++) {
        if (user.xp >= xpLevels[i]) {
          calculatedLevel = i + 1;
        } else {
          break;
        }
      }
      user.level = calculatedLevel;
    }

    await user.save();
  } catch (err) {
    // C4 fix: use Winston logger instead of console.error
    logger.error('Error updating savings achievements: %s', err.message);
  }
};

// @desc    Get all goals (with filters, search & sorting)
// @route   GET /api/goals
export const getGoals = asyncHandler(async (req, res) => {
  const { search, category, status, priority, sort } = req.query;
  const filter = { user: req.user._id, isDeleted: { $ne: true } };

  // Text search query
  if (search) {
    filter.$text = { $search: search };
  }

  // Pre-filter
  if (category) filter.category = category;
  if (status) filter.status = status;
  if (priority) filter.priority = priority;

  let query = Goal.find(filter);

  // Sorting
  if (sort === 'highest_progress') {
    query = query.sort({ progressPct: -1 });
  } else if (sort === 'lowest_progress') {
    query = query.sort({ progressPct: 1 });
  } else if (sort === 'nearest_deadline') {
    query = query.sort({ targetDate: 1 });
  } else if (sort === 'largest_target') {
    query = query.sort({ targetAmount: -1 });
  } else if (sort === 'completed_first') {
    query = query.sort({ status: 1, progressPct: -1 });
  } else {
    query = query.sort({ createdAt: -1 }); // Default: newest first
  }

  const goals = await query;
  sendSuccess(res, 200, 'Goals retrieved successfully', goals);
});

// @desc    Get dashboard statistics for savings goals
// @route   GET /api/goals/stats
export const getGoalStats = asyncHandler(async (req, res) => {
  const goals = await Goal.find({ user: req.user._id, isDeleted: { $ne: true } });
  
  const activeCount = goals.filter(g => g.status === 'Active').length;
  const completedCount = goals.filter(g => g.status === 'Completed').length;
  
  const totalSaved = goals.reduce((sum, g) => sum + g.savedAmount, 0);
  const totalRemaining = goals.reduce((sum, g) => sum + g.remainingAmount, 0);
  const avgProgress = goals.length > 0 
    ? Math.round(goals.reduce((sum, g) => sum + g.progressPct, 0) / goals.length) 
    : 0;

  // Monthly savings velocity (total saved divided by months elapsed since oldest goal)
  let monthlySavingRate = 0;
  if (goals.length > 0) {
    const oldestGoal = goals.reduce((oldest, current) => oldest.createdAt < current.createdAt ? oldest : current);
    const monthsElapsed = Math.max(1, (new Date() - oldestGoal.createdAt) / (1000 * 60 * 60 * 24 * 30.4));
    monthlySavingRate = Math.round(totalSaved / monthsElapsed);
  }

  const upcomingDeadlines = goals
    .filter(g => g.status === 'Active' && new Date(g.targetDate) > new Date())
    .sort((a, b) => new Date(a.targetDate) - new Date(b.targetDate))
    .slice(0, 3)
    .map(g => ({
      _id: g._id,
      title: g.title,
      targetDate: g.targetDate,
      daysRemaining: Math.ceil((new Date(g.targetDate) - new Date()) / (1000 * 60 * 60 * 24))
    }));

  sendSuccess(res, 200, 'Goal statistics retrieved', {
    activeGoals: activeCount,
    completedGoals: completedCount,
    totalSaved,
    totalRemaining,
    averageProgress: avgProgress,
    monthlySaving: monthlySavingRate,
    upcomingDeadlines
  });
});

// @desc    Get quick-start goal templates
// @route   GET /api/goals/templates
export const getGoalTemplates = asyncHandler(async (req, res) => {
  sendSuccess(res, 200, 'Goal templates fetched', GOAL_TEMPLATES);
});

// @desc    Get single goal
// @route   GET /api/goals/:id
export const getGoalById = asyncHandler(async (req, res) => {
  const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id, isDeleted: { $ne: true } });
  if (!goal) {
    res.status(404);
    throw new Error('Goal not found');
  }
  sendSuccess(res, 200, 'Goal retrieved', goal);
});

// @desc    Get paginated contributions for a goal
// @route   GET /api/goals/:id/contributions
export const getGoalContributions = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id, isDeleted: { $ne: true } });
  if (!goal) {
    res.status(404);
    throw new Error('Goal not found');
  }

  const total = await Contribution.countDocuments({ goalId: req.params.id });
  const contributions = await Contribution.find({ goalId: req.params.id })
    .sort({ date: -1 })
    .skip(skip)
    .limit(limit);

  sendSuccess(res, 200, 'Contributions retrieved', {
    contributions,
    total,
    page,
    pages: Math.ceil(total / limit)
  });
});

// @desc    Create a new goal
// @route   POST /api/goals
export const createGoal = asyncHandler(async (req, res) => {
  const { title, description, category, targetAmount, targetDate, priority, color, icon, notes } = req.body;

  // C2 fix: coerce to Number first, then validate — prevents string comparisons like "0" <= 0 being false
  const numericTarget = Number(targetAmount);
  if (isNaN(numericTarget) || numericTarget <= 0) {
    res.status(400);
    throw new Error('Target amount must be a valid number greater than zero');
  }

  if (new Date(targetDate) <= new Date()) {
    res.status(400);
    throw new Error('Target date must be in the future');
  }

  const historyObj = {
    action: 'Goal Created',
    user: req.user._id,
    note: `Goal initiated with target of ₹${numericTarget.toLocaleString('en-IN')}`,
    createdAt: new Date()
  };

  const goal = await Goal.create({
    user: req.user._id,
    title,
    description,
    category,
    targetAmount: numericTarget,
    targetDate,
    priority: priority || 'Medium',
    color: color || '#6366f1',
    icon: icon || '🎯',
    notes,
    goalHistory: [historyObj]
  });

  // Log in notifications
  await Notification.create({
    user: req.user._id,
    type: 'goal_created',
    message: `🎯 Financial Goal initiated: "${title}" with a target of ₹${targetAmount.toLocaleString('en-IN')}.`
  });

  // Achievements
  await updateSavingsAchievements(req.user._id);

  sendSuccess(res, 201, 'Goal created successfully', goal);
});

// @desc    Update a goal
// @route   PUT /api/goals/:id
export const updateGoal = asyncHandler(async (req, res) => {
  const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id, isDeleted: { $ne: true } });
  if (!goal) {
    res.status(404);
    throw new Error('Goal not found');
  }

  const fieldsToUpdate = [
    'title', 'description', 'category', 'targetAmount', 'targetDate',
    'priority', 'color', 'icon', 'uploadedIcon', 'notes'
  ];

  fieldsToUpdate.forEach(f => {
    if (req.body[f] !== undefined) {
      // C3 fix: coerce and validate targetAmount in update path
      if (f === 'targetAmount') {
        const numVal = Number(req.body[f]);
        if (isNaN(numVal) || numVal <= 0) {
          res.status(400);
          throw new Error('Target amount must be a valid number greater than zero');
        }
        goal[f] = numVal;
      } else {
        goal[f] = req.body[f];
      }
    }
  });

  goal.goalHistory.push({
    action: 'Goal Edited',
    user: req.user._id,
    note: 'Details modified by user',
    createdAt: new Date()
  });

  // Invalidate AI cache
  goal.aiGeneratedAt = null;

  await goal.save();
  await updateSavingsAchievements(req.user._id);

  sendSuccess(res, 200, 'Goal updated successfully', goal);
});

// @desc    Update a goal status (Pause, Resume, Archive)
// @route   PUT /api/goals/:id/status
export const updateGoalStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id, isDeleted: { $ne: true } });
  if (!goal) {
    res.status(404);
    throw new Error('Goal not found');
  }

  const validStatuses = ['Active', 'Paused', 'Archived', 'Completed'];
  if (!validStatuses.includes(status)) {
    res.status(400);
    throw new Error(`Invalid status: must be one of ${validStatuses.join(', ')}`);
  }

  const prevStatus = goal.status;
  goal.status = status;
  goal.goalHistory.push({
    action: status === 'Active' && prevStatus === 'Paused' ? 'Resumed Goal' : `${status} Goal`,
    user: req.user._id,
    note: `Status toggled from ${prevStatus} to ${status}`,
    createdAt: new Date()
  });

  await goal.save();

  sendSuccess(res, 200, `Goal status updated to ${status}`, goal);
});

// @desc    Soft delete a goal
// @route   DELETE /api/goals/:id
export const deleteGoal = asyncHandler(async (req, res) => {
  const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id, isDeleted: { $ne: true } });
  if (!goal) {
    res.status(404);
    throw new Error('Goal not found');
  }

  goal.isDeleted = true;
  goal.deletedAt = new Date();
  goal.goalHistory.push({
    action: 'Goal Deleted',
    user: req.user._id,
    note: 'Soft deleted goal by user',
    createdAt: new Date()
  });

  await goal.save();
  sendSuccess(res, 200, 'Goal deleted successfully');
});

// @desc    Contribute funds manually to a goal (Savings Transfer)
// @route   POST /api/goals/:id/contribute
export const contributeToGoal = asyncHandler(async (req, res) => {
  const { amount, walletId, note, date, type, attachment } = req.body;

  if (!amount || amount <= 0) {
    res.status(400);
    throw new Error('Contribution amount must be greater than zero');
  }

  const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id, isDeleted: { $ne: true } });
  if (!goal) {
    res.status(404);
    throw new Error('Goal not found');
  }

  if (goal.status === 'Completed' || goal.savedAmount >= goal.targetAmount) {
    res.status(400);
    throw new Error('Goal is already completed');
  }

  if (goal.status === 'Paused' || goal.status === 'Archived') {
    res.status(400);
    throw new Error(`Cannot save to a ${goal.status.toLowerCase()} goal`);
  }

  // Wallet Validation
  const wallet = await Wallet.findOne({ _id: walletId, user: req.user._id });
  if (!wallet) {
    res.status(404);
    throw new Error('Selected wallet not found');
  }

  if (wallet.balance < amount) {
    res.status(400);
    throw new Error(`Insufficient balance in wallet ${wallet.name}. Balance: ₹${wallet.balance}`);
  }

  // Prevent Over-Saving (Option A: Auto-cap contribution)
  const remaining = goal.targetAmount - goal.savedAmount;
  const actualContribution = Math.min(amount, remaining);

  // Wallet Deduction & Savings transfer creation
  wallet.balance -= actualContribution;
  // C1 fix: removed dead `await wallet.balance` — awaiting a primitive is a no-op
  await wallet.save();

  const oldSaved = goal.savedAmount;
  goal.savedAmount += actualContribution;

  const contribution = await Contribution.create({
    goalId: goal._id,
    user: req.user._id,
    wallet: wallet._id,
    amount: actualContribution,
    note: note || `Manual savings transfer from wallet ${wallet.name}`,
    date: date || new Date(),
    type: type || 'Manual',
    attachment
  });

  const completionPercent = Math.min(Math.round((goal.savedAmount / goal.targetAmount) * 100), 100);

  // Estimate Completion Date based on recent savings velocity
  const contributions = await Contribution.find({ goalId: goal._id }).sort({ date: 1 });
  if (contributions.length >= 2) {
    const timeDelta = new Date(contributions[contributions.length - 1].date) - new Date(contributions[0].date);
    const daysElapsed = Math.max(1, Math.ceil(timeDelta / (1000 * 60 * 60 * 24)));
    const totalAmount = contributions.reduce((s, c) => s + c.amount, 0);
    const ratePerDay = totalAmount / daysElapsed;
    if (ratePerDay > 0) {
      const daysToComplete = Math.ceil(goal.remainingAmount / ratePerDay);
      const estDate = new Date();
      estDate.setDate(estDate.getDate() + daysToComplete);
      goal.estimatedCompletion = estDate;
    }
  }

  goal.goalHistory.push({
    action: 'Contribution',
    amount: actualContribution,
    note: note || `Transferred savings from ${wallet.name}`,
    user: req.user._id,
    createdAt: new Date()
  });

  // Calculate milestones crossed
  const oldPct = Math.min(Math.round((oldSaved / goal.targetAmount) * 100), 100);
  const newPct = completionPercent;
  const milestones = [25, 50, 75, 90, 100];
  
  for (const threshold of milestones) {
    if (oldPct < threshold && newPct >= threshold) {
      const isCompleted = threshold === 100;
      await Notification.create({
        user: req.user._id,
        type: isCompleted ? 'goal_completed' : 'goal_milestone',
        message: isCompleted 
          ? `🏆 Hurrah! You fully completed your savings goal "${goal.title}"!`
          : `🎯 Milestone achieved! Your savings goal "${goal.title}" is now ${threshold}% completed.`
      });
    }
  }

  if (completionPercent >= 100) {
    goal.status = 'Completed';
    goal.goalHistory.push({
      action: 'Completed Goal',
      note: `Target of ₹${goal.targetAmount.toLocaleString('en-IN')} achieved!`,
      user: req.user._id,
      createdAt: new Date()
    });
  }

  // Invalidate AI cache
  goal.aiGeneratedAt = null;

  await goal.save();

  // Update achievements
  await updateSavingsAchievements(req.user._id);

  sendSuccess(res, 200, 'Contribution saved successfully', {
    goal,
    contribution,
    differenceReturned: amount - actualContribution // return cap residue if any
  });
});

// @desc    Get AI Insights for a Goal
// @route   GET /api/goals/:id/insights
export const getGoalInsights = asyncHandler(async (req, res) => {
  const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id, isDeleted: { $ne: true } });
  if (!goal) {
    res.status(404);
    throw new Error('Goal not found');
  }

  // 1. Return cached values if fresh (within last 1 hour)
  if (goal.aiGeneratedAt && (new Date() - goal.aiGeneratedAt < 60 * 60 * 1000) && goal.aiInsights?.length > 0) {
    return sendSuccess(res, 200, 'Cached AI Insights retrieved', goal.aiInsights);
  }

  // 2. Compute dynamic rule-based explainable insights
  const contributions = await Contribution.find({ goalId: goal._id }).sort({ date: 1 });
  const totalSaved = goal.savedAmount;
  const remaining = goal.remainingAmount;

  const insights = [];

  // Insight A: Pace check
  const timeElapsedMs = new Date() - goal.createdAt;
  const daysElapsed = Math.max(1, Math.ceil(timeElapsedMs / (1000 * 60 * 60 * 24)));
  const ratePerDay = totalSaved / daysElapsed;
  const daysLeft = Math.ceil((new Date(goal.targetDate) - new Date()) / (1000 * 60 * 60 * 24));

  if (totalSaved === 0) {
    insights.push({
      level: 'Critical',
      message: 'This goal has stalled with zero contributions. Make an initial deposit to jumpstart progress!',
      confidence: 99
    });
  } else if (ratePerDay > 0) {
    const daysToFinish = Math.ceil(remaining / ratePerDay);
    const diff = daysLeft - daysToFinish;

    if (diff > 0) {
      insights.push({
        level: 'Positive',
        message: `At your current savings pace, you are on track to achieve this goal ${diff} days early!`,
        confidence: 90
      });
    } else if (diff < 0) {
      const extraMonthly = Math.round(((remaining / (daysLeft / 30.4)) - (ratePerDay * 30.4)) * 100) / 100;
      insights.push({
        level: 'Critical',
        message: `Warning: At your current savings rate, you will miss your target deadline. Increase savings by roughly ₹${Math.max(100, Math.round(extraMonthly))} per month to complete on time.`,
        confidence: 94
      });
    } else {
      insights.push({
        level: 'Positive',
        message: 'Your average savings pace lines up exactly with your deadline. Keep it up!',
        confidence: 85
      });
    }
  }

  // Insight B: Inactivity warning
  if (contributions.length > 0) {
    const last = contributions[contributions.length - 1];
    const stalledDays = Math.ceil((new Date() - last.date) / (1000 * 60 * 60 * 24));
    if (stalledDays > 30 && goal.status === 'Active') {
      insights.push({
        level: 'Warning',
        message: `You haven't contributed to this goal in ${stalledDays} days. Consider making a manual contribution to continue progress.`,
        confidence: 98
      });
    }
  }

  // Insight C: Category suggestions based on spending leaks
  const currentMonthStart = new Date();
  currentMonthStart.setDate(1);
  currentMonthStart.setHours(0,0,0,0);
  
  const expenses = await Expense.find({ user: req.user._id, date: { $gte: currentMonthStart } }).populate('category');
  if (expenses.length > 0) {
    const catTotals = {};
    expenses.forEach(e => {
      const catName = e.category?.name || 'Other';
      catTotals[catName] = (catTotals[catName] || 0) + e.amount;
    });
    const sorted = Object.keys(catTotals).sort((a,b) => catTotals[b] - catTotals[a]);
    const maxCat = sorted[0];
    const maxAmount = catTotals[maxCat];
    const reduction = Math.round(maxAmount * 0.20);
    const speedUpDays = ratePerDay > 0 ? Math.round(reduction / ratePerDay) : 10;
    
    if (maxAmount > 2000 && goal.status === 'Active') {
      insights.push({
        level: 'Suggestion',
        message: `Reducing discretionary spending in "${maxCat}" by 20% (saves ₹${reduction.toLocaleString('en-IN')}) would allow you to achieve this goal ${speedUpDays} days faster.`,
        confidence: 92
      });
    }
  }

  // If no specific insights generated, add a default advice card
  if (insights.length === 0) {
    insights.push({
      level: 'Suggestion',
      message: 'Establish a weekly recurring savings buffer of ₹500 to keep the goal active and ensure completion.',
      confidence: 80
    });
  }

  // Store in cache
  goal.aiInsights = insights;
  goal.aiGeneratedAt = new Date();
  await goal.save();

  sendSuccess(res, 200, 'AI Insights fetched', insights);
});

// @desc    Get AI Recommendations and Spending analysis for goals
// @route   GET /api/goals/recommendations
export const getGoalRecommendations = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Retrieve active goals
  const goals = await Goal.find({ user: userId, status: 'Active', isDeleted: { $ne: true } });
  if (goals.length === 0) {
    return sendSuccess(res, 200, 'No active goals to recommend for', []);
  }

  // We can fetch the first active goal and cache recommendations on it or return dynamically.
  // The user wanted: Explainable AI recommendations containing recommendation, reason, impact, confidence.
  const currentMonthStart = new Date();
  currentMonthStart.setDate(1);
  currentMonthStart.setHours(0,0,0,0);
  
  const expenses = await Expense.find({ user: userId, date: { $gte: currentMonthStart } }).populate('category');
  const recommendations = [];

  if (expenses.length > 0) {
    const catTotals = {};
    expenses.forEach(e => {
      const catName = e.category?.name || 'Other';
      catTotals[catName] = (catTotals[catName] || 0) + e.amount;
    });

    const sorted = Object.keys(catTotals).sort((a,b) => catTotals[b] - catTotals[a]);
    const topCat = sorted[0];
    const topCatVal = catTotals[topCat];
    
    // Suggest 20% cutback
    const targetGoal = goals[0]; // recommend for primary goal
    const savedPct = targetGoal.progressPct;
    
    if (topCatVal > 2000) {
      const monthlySavingsPotential = Math.round(topCatVal * 0.2);
      const impactDays = Math.ceil(targetGoal.remainingAmount / (targetGoal.suggestedDailySaving + (monthlySavingsPotential / 30)));
      const daysEarlier = Math.max(2, Math.ceil(targetGoal.remainingAmount / (targetGoal.suggestedDailySaving || 100)) - impactDays);
      
      recommendations.push({
        recommendation: `Reduce ${topCat} by 20%`,
        reason: `Your spending in "${topCat}" is ₹${topCatVal.toLocaleString('en-IN')} this month, representing your highest discretionary outlet.`,
        impact: `Redirecting this 20% (₹${monthlySavingsPotential.toLocaleString('en-IN')}) will help you achieve "${targetGoal.title}" ${daysEarlier} days earlier.`,
        confidence: 94
      });
    }
  }

  // General savings recommendations
  const totalRemaining = goals.reduce((sum, g) => sum + g.remainingAmount, 0);
  const avgMonthlyTarget = goals.reduce((sum, g) => sum + g.suggestedMonthlySaving, 0);

  recommendations.push({
    recommendation: 'Establish consistent monthly savings',
    reason: 'Manual savings transfers can be irregular, affecting the consistency of your progress.',
    impact: `Allocating a fixed monthly amount of ₹${Math.round(avgMonthlyTarget * 0.5).toLocaleString('en-IN')} will help keep your goals on track.`,
    confidence: 90
  });

  sendSuccess(res, 200, 'AI Recommendations fetched', recommendations);
});

// @desc    Get Detailed Analytics for Savings Goals
// @route   GET /api/goals/analytics
export const getGoalAnalytics = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const goals = await Goal.find({ user: userId, isDeleted: { $ne: true } });
  const contributions = await Contribution.find({ user: userId }).sort({ date: 1 });

  // 1. Goal Completion Trend (Monthly completion rates)
  const completedGoals = goals.filter(g => g.status === 'Completed');
  const successRate = goals.length > 0 ? Math.round((completedGoals.length / goals.length) * 100) : 0;

  // 2. Savings Forecast (Projected values for next 6 months)
  let avgMonthlySaved = 0;
  const monthlyMap = {};
  contributions.forEach(c => {
    const month = c.date.toISOString().substring(0, 7);
    monthlyMap[month] = (monthlyMap[month] || 0) + c.amount;
  });

  const sortedMonths = Object.keys(monthlyMap).sort();
  if (sortedMonths.length > 0) {
    const totalPeriodsSaved = Object.values(monthlyMap).reduce((s, a) => s + a, 0);
    avgMonthlySaved = Math.round(totalPeriodsSaved / sortedMonths.length);
  } else {
    avgMonthlySaved = 1000; // fallback default
  }

  const forecast = [];
  let runningSavingsTotal = goals.reduce((sum, g) => sum + g.savedAmount, 0);
  for (let i = 1; i <= 6; i++) {
    const fDate = new Date();
    fDate.setMonth(fDate.getMonth() + i);
    runningSavingsTotal += avgMonthlySaved;
    forecast.push({
      month: fDate.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
      projectedAmount: runningSavingsTotal
    });
  }

  // 3. Category Comparison (Saved vs Target)
  const categoryComparison = {};
  goals.forEach(g => {
    if (!categoryComparison[g.category]) {
      categoryComparison[g.category] = { category: g.category, target: 0, saved: 0 };
    }
    categoryComparison[g.category].target += g.targetAmount;
    categoryComparison[g.category].saved += g.savedAmount;
  });

  // 4. Monthly savings totals
  const monthlySavingsGrowth = [];
  let cumulative = 0;
  sortedMonths.forEach(m => {
    cumulative += monthlyMap[m];
    const [y, monthNum] = m.split('-');
    const mName = new Date(parseInt(y, 10), parseInt(monthNum, 10) - 1, 1).toLocaleDateString('en-IN', { month: 'short' });
    monthlySavingsGrowth.push({
      month: `${mName} ${y.substring(2)}`,
      saved: monthlyMap[m],
      cumulative
    });
  });

  // 5. Streaks (Savings streak: consecutive weeks/months user made at least 1 contribution)
  let savingsStreak = 0;
  if (sortedMonths.length > 0) {
    // Check consecutive months
    const nowMonth = new Date().toISOString().substring(0, 7);
    let checkMonth = nowMonth;
    let keepChecking = true;
    while (keepChecking) {
      if (monthlyMap[checkMonth] > 0) {
        savingsStreak += 1;
        const [y, m] = checkMonth.split('-').map(Number);
        const prev = new Date(y, m - 2, 1);
        checkMonth = prev.toISOString().substring(0, 7);
      } else {
        keepChecking = false;
      }
    }
  }

  // 6. Fastest completed goal vs slowest progressing
  let fastestGoal = null;
  let slowestGoal = null;

  if (completedGoals.length > 0) {
    const goalsWithDurations = completedGoals.map(g => {
      const creation = new Date(g.createdAt);
      const completion = g.updatedAt || new Date();
      const diffDays = Math.ceil((completion - creation) / (1000 * 60 * 60 * 24));
      return { goal: g.title, days: diffDays };
    }).sort((a,b) => a.days - b.days);

    fastestGoal = goalsWithDurations[0];
  }

  const activeGoals = goals.filter(g => g.status === 'Active');
  if (activeGoals.length > 0) {
    const slowGoals = activeGoals.map(g => {
      const creation = new Date(g.createdAt);
      const diffDays = Math.ceil((new Date() - creation) / (1000 * 60 * 60 * 24));
      const rate = g.savedAmount / Math.max(1, diffDays);
      return { goal: g.title, rate, progress: g.progressPct };
    }).sort((a,b) => a.rate - b.rate);

    slowestGoal = slowGoals[0];
  }

  sendSuccess(res, 200, 'Analytics fetched successfully', {
    successRate,
    forecast,
    categoryComparison: Object.values(categoryComparison),
    monthlySavingsGrowth,
    savingsStreak,
    fastestGoal,
    slowestGoal,
    averageMonthlySavings: avgMonthlySaved,
    mostActiveMonth: sortedMonths[sortedMonths.length - 1] || 'None'
  });
});

// @desc    Delete/Remove a savings contribution
// @route   DELETE /api/goals/:id/contributions/:contribId
export const deleteContribution = asyncHandler(async (req, res) => {
  const { id, contribId } = req.params;
  const goal = await Goal.findOne({ _id: id, user: req.user._id, isDeleted: { $ne: true } });
  if (!goal) {
    res.status(404);
    throw new Error('Goal not found');
  }

  const contrib = await Contribution.findOneAndDelete({ _id: contribId, goalId: id });
  if (!contrib) {
    res.status(404);
    throw new Error('Contribution not found');
  }

  // Refund wallet
  if (contrib.wallet) {
    const wallet = await Wallet.findOne({ _id: contrib.wallet, user: req.user._id });
    if (wallet) {
      wallet.balance += contrib.amount;
      await wallet.save();
    }
  }

  goal.savedAmount = Math.max(0, goal.savedAmount - contrib.amount);
  if (goal.savedAmount < goal.targetAmount && goal.status === 'Completed') {
    goal.status = 'Active';
  }

  goal.goalHistory.push({
    action: 'Contribution Removed',
    amount: contrib.amount,
    note: `Removed contribution of ₹${contrib.amount.toLocaleString('en-IN')}`,
    user: req.user._id,
    createdAt: new Date()
  });

  goal.aiGeneratedAt = null; // Invalidate AI cache
  await goal.save();
  await updateSavingsAchievements(req.user._id);

  sendSuccess(res, 200, 'Contribution removed successfully', goal);
});

