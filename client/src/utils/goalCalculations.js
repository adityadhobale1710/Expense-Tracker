export const calculateDaysRemaining = (targetDateStr) => {
  if (!targetDateStr) return 0;
  const target = new Date(targetDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = target - today;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
};

export const formatDaysRemaining = (days) => {
  if (days < 0) return 'Expired';
  if (days === 0) return 'Deadline Today';
  if (days === 1) return '1 Day Left';
  return `${days} Days Left`;
};

export const calculateSavingsRate = (contributions = [], oldestGoalCreatedAt = null) => {
  if (contributions.length === 0) return 0;
  
  // Calculate average savings per month
  const oldestDate = oldestGoalCreatedAt ? new Date(oldestGoalCreatedAt) : new Date(contributions[0].date);
  const monthsElapsed = Math.max(1, (new Date() - oldestDate) / (1000 * 60 * 60 * 24 * 30.4));
  const totalSaved = contributions.reduce((sum, c) => sum + c.amount, 0);
  return Math.round(totalSaved / monthsElapsed);
};

export const calculateExpectedCompletionDate = (goal, contributions = []) => {
  if (!goal || goal.savedAmount >= goal.targetAmount) return null;
  if (contributions.length === 0) return null;

  const durationMs = new Date() - new Date(goal.createdAt);
  const daysElapsed = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60 * 24)));
  const ratePerDay = goal.savedAmount / daysElapsed;

  if (ratePerDay <= 0) return null;

  const daysToFinish = Math.ceil(goal.remainingAmount / ratePerDay);
  const completionDate = new Date();
  completionDate.setDate(completionDate.getDate() + daysToFinish);
  return completionDate;
};

export default {
  calculateDaysRemaining,
  formatDaysRemaining,
  calculateSavingsRate,
  calculateExpectedCompletionDate
};
