/**
 * Compute the active period boundaries for a budget document, based on its
 * stored start/end dates or its period type (weekly / monthly / yearly).
 *
 * Shared by budgetController and FinancialDataService so the Dashboard, Budget
 * page and AI pipeline all measure "spent" against the exact same window.
 */
export const getBudgetPeriodDates = (budget) => {
  const now = new Date();
  let start = new Date(now);
  let end = new Date(now);

  if (budget.startDate && budget.endDate) {
    return { startDate: budget.startDate, endDate: budget.endDate };
  }

  if (budget.period === 'weekly') {
    const day = now.getDay() || 7;
    if (day !== 1) start.setHours(-24 * (day - 1));
    start.setHours(0, 0, 0, 0);
    end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  } else if (budget.period === 'yearly') {
    start = new Date(now.getFullYear(), 0, 1);
    end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  return { startDate: start, endDate: end };
};