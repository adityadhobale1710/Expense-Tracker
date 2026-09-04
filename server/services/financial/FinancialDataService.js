import User from '../../models/User.js';
import Wallet from '../../models/Wallet.js';
import Budget from '../../models/Budget.js';
import Expense from '../../models/Expense.js';
import Income from '../../models/Income.js';
import Goal from '../../models/Goal.js';
import Loan from '../../models/Loan.js';
import Subscription from '../../models/Subscription.js';
import { getBudgetPeriodDates } from '../../utils/budgetDates.js';

class FinancialDataService {
  /**
   * Get User Profile with standardized fields
   */
  static async getUserProfile(userId) {
    return User.findById(userId)
      .select('_id name email phone avatar currency role company xp coins level streak longestStreak lifetimeXP rank achievements pinnedBadges season rewardChests unlockedTitles unlockedAvatars unlockedThemes simulatedActions twoFactorEnabled isEmailVerified')
      .lean();
  }

  /**
   * Get all active wallets for a user
   */
  static async getWallets(userId) {
    // Only return non-archived wallets (if isArchived exists, though Dashboard didn't filter by it before, AI did. 
    // Standardizing: no isArchived filter unless it's a schema standard. Wait, does Wallet have isArchived? 
    // Let's standardise to just { user: userId })
    return Wallet.find({ user: userId }).sort({ isPrimary: -1, updatedAt: -1 }).lean();
  }

  /**
   * Get all budgets with category population
   */
  static async getBudgets(userId) {
    const budgets = await Budget.find({ user: userId })
      .populate('category', 'name icon color')
      .lean();

    // H7 fix: recompute Budget.spent live from the Expense collection so every
    // consumer (dashboard, Financial Health Score, AI chat) reads accurate values
    // rather than the stale persisted field.
    //
    // PERF: Single $facet aggregation — one DB round-trip regardless of how many
    // budgets exist. Each facet branch is fully isolated, so two budgets sharing
    // the same category but covering different periods (e.g. January Food vs
    // February Food) are computed independently and never cross-contaminate.
    const budgetsWithCategory = budgets.filter((b) => b.category);
    if (budgetsWithCategory.length > 0) {
      // Build one facet pipeline per budget. The facet key is the budget's
      // own string _id so we can look results up after the aggregation.
      const facetStages = {};
      for (const b of budgetsWithCategory) {
        const { startDate, endDate } = getBudgetPeriodDates(b);
        facetStages[String(b._id)] = [
          {
            $match: {
              category: b.category._id,
              date: { $gte: startDate, $lte: endDate },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$amount' },
            },
          },
        ];
      }

      // Single aggregation call — pre-filter to this user's non-transfer expenses,
      // then fan out to per-budget facets.
      const [facetResult] = await Expense.aggregate([
        {
          $match: {
            user: userId,
            isTransfer: { $ne: true },
          },
        },
        { $facet: facetStages },
      ]);

      // Fan results back to each budget
      for (const b of budgetsWithCategory) {
        const rows = facetResult?.[String(b._id)] ?? [];
        b.spent = rows[0]?.total ?? 0;
        b.percentSpent = b.limit > 0 ? Math.round((b.spent / b.limit) * 100) : 0;
      }
    }

    return budgets;
  }

  /**
   * Get all active goals (excluding soft-deleted)
   */
  static async getGoals(userId) {
    return Goal.find({ user: userId, isDeleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Get all loans
   */
  static async getLoans(userId) {
    return Loan.find({ user: userId }).sort({ createdAt: -1 }).lean();
  }

  /**
   * Get all subscriptions
   */
  static async getSubscriptions(userId) {
    return Subscription.find({ user: userId }).sort({ nextBillingDate: 1 }).lean();
  }

  /**
   * Get expenses with optional date filtering and pagination
   */
  static async getExpenses(userId, options = {}) {
    const query = { user: userId };
    // MASTER-045: Exclude wallet-to-wallet transfers from financial totals
    if (!options.includeTransfers) query.isTransfer = { $ne: true };
    
    if (options.startDate || options.endDate) {
      query.date = {};
      if (options.startDate) query.date.$gte = new Date(options.startDate);
      if (options.endDate) query.date.$lte = new Date(options.endDate);
    }

    let mQuery = Expense.find(query).populate('category', 'name icon color');
    
    if (options.sort) mQuery = mQuery.sort(options.sort);
    else mQuery = mQuery.sort({ date: -1, createdAt: -1 });

    if (options.limit) mQuery = mQuery.limit(options.limit);
    
    return mQuery.lean();
  }

  /**
   * Get incomes with optional date filtering and pagination
   */
  static async getIncomes(userId, options = {}) {
    const query = { user: userId };
    // MASTER-045: Exclude wallet-to-wallet transfers from financial totals
    if (!options.includeTransfers) query.isTransfer = { $ne: true };
    
    if (options.startDate || options.endDate) {
      query.date = {};
      if (options.startDate) query.date.$gte = new Date(options.startDate);
      if (options.endDate) query.date.$lte = new Date(options.endDate);
    }

    let mQuery = Income.find(query);
    
    if (options.sort) mQuery = mQuery.sort(options.sort);
    else mQuery = mQuery.sort({ date: -1, createdAt: -1 });

    if (options.limit) mQuery = mQuery.limit(options.limit);
    
    return mQuery.lean();
  }

  /**
   * Get combined transactions (expenses + incomes)
   */
  static async getTransactions(userId, options = {}) {
    const [expenses, incomes] = await Promise.all([
      this.getExpenses(userId, options),
      this.getIncomes(userId, options)
    ]);

    const transactions = [
      ...expenses.map(e => ({ ...e, txType: 'expense' })),
      ...incomes.map(i => ({ ...i, txType: 'income' }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (options.limit) {
      return transactions.slice(0, options.limit);
    }
    return transactions;
  }

  /**
   * Get the canonical shared financial snapshot
   * Used identically by Dashboard, AI, Reports, and Analytics
   */
  static async getFinancialSnapshot(userId, dateOptions = {}) {
    // Default to current month if no date options provided
    let { startDate, endDate } = dateOptions;
    if (!startDate || !endDate) {
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth();
      startDate = new Date(y, m, 1);
      endDate = new Date(y, m + 1, 0, 23, 59, 59);
    }

    const txOptions = { startDate, endDate, limit: dateOptions.limit };

    const [
      user,
      wallets,
      budgets,
      goals,
      loans,
      subscriptions,
      expenses,
      incomes
    ] = await Promise.all([
      this.getUserProfile(userId),
      this.getWallets(userId),
      this.getBudgets(userId),
      this.getGoals(userId),
      this.getLoans(userId),
      this.getSubscriptions(userId),
      this.getExpenses(userId, txOptions),
      this.getIncomes(userId, txOptions)
    ]);

    return {
      user,
      wallets,
      budgets,
      goals,
      loans,
      subscriptions,
      expenses,
      incomes,
      dateRange: { startDate, endDate }
    };
  }
  /**
   * Get expenses + incomes for the last N months (trend window).
   * Used by TrendAnalyzer to avoid direct model imports.
   *
   * @param {string|object} userId
   * @param {number} months - Number of months to look back (default 6)
   * @returns {Promise<{ expenses: Array, incomes: Array }>}
   */
  static async getTrendWindow(userId, months = 6) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - (months - 1));
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const [expenses, incomes] = await Promise.all([
      this.getExpenses(userId, { startDate }),
      this.getIncomes(userId, { startDate }),
    ]);

    return { expenses, incomes };
  }
}

export default FinancialDataService;
