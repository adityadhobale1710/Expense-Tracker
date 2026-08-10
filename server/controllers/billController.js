import mongoose from 'mongoose';
import asyncHandler from 'express-async-handler';
import Bill from '../models/Bill.js';
import Expense from '../models/Expense.js';
import Wallet from '../models/Wallet.js';
import Category from '../models/Category.js';
import Budget from '../models/Budget.js';
import Notification from '../models/Notification.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { invalidateAICache, CACHE_MODULES } from '../utils/CacheInvalidator.js';

// Helper: Recalculate Budget spent
const recalcBudgetSpent = async (userId, categoryId) => {
  if (!categoryId) return;
  const [result] = await Expense.aggregate([
    { $match: { user: userId, category: categoryId } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const spent = result ? result.total : 0;
  await Budget.updateOne(
    { user: userId, category: categoryId },
    { $set: { spent } }
  );
};

// Helper: Update Bill Statuses based on due dates
const refreshBillStatuses = async (userId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Mark past unpaid/uncancelled bills as overdue
  await Bill.updateMany(
    {
      user: userId,
      dueDate: { $lt: today },
      status: { $nin: ['paid', 'cancelled'] },
    },
    { $set: { status: 'overdue' } }
  );

  // Mark upcoming unpaid/uncancelled bills due within 3 days as due_soon
  const threeDaysLater = new Date(today);
  threeDaysLater.setDate(today.getDate() + 3);
  await Bill.updateMany(
    {
      user: userId,
      dueDate: { $gte: today, $lte: threeDaysLater },
      status: 'upcoming',
    },
    { $set: { status: 'due_soon' } }
  );

  // Mark upcoming bills due after 3 days back to upcoming (if they were pushed/postponed)
  await Bill.updateMany(
    {
      user: userId,
      dueDate: { $gt: threeDaysLater },
      status: 'due_soon',
    },
    { $set: { status: 'upcoming' } }
  );
};

// @desc    Get all bills (with filtering and sorting)
// @route   GET /api/bills
export const getBills = asyncHandler(async (req, res) => {
  await refreshBillStatuses(req.user._id);

  const {
    category,
    status,
    priority,
    recurring,
    paymentMethod,
    search,
    month,
    year,
    startDate,
    endDate,
    sortBy = 'dueDate_asc',
  } = req.query;

  const filter = { user: req.user._id };

  if (category) filter.category = category;
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (recurring !== undefined) filter.recurring = recurring === 'true';
  if (paymentMethod) filter.paymentMethod = paymentMethod;

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { notes: { $regex: search, $options: 'i' } },
    ];
  }

  // Month and Year filtering
  if (month || year) {
    const filterYear = year ? parseInt(year) : new Date().getFullYear();
    if (month) {
      const filterMonth = parseInt(month) - 1; // 0-indexed
      const startOfMonth = new Date(filterYear, filterMonth, 1);
      const endOfMonth = new Date(filterYear, filterMonth + 1, 0, 23, 59, 59, 999);
      filter.dueDate = { $gte: startOfMonth, $lte: endOfMonth };
    } else {
      const startOfYear = new Date(filterYear, 0, 1);
      const endOfYear = new Date(filterYear, 12, 0, 23, 59, 59, 999);
      filter.dueDate = { $gte: startOfYear, $lte: endOfYear };
    }
  } else if (startDate || endDate) {
    filter.dueDate = {};
    if (startDate) filter.dueDate.$gte = new Date(startDate);
    if (endDate) filter.dueDate.$lte = new Date(endDate);
  }

  // Sorting
  let sortObj = {};
  switch (sortBy) {
    case 'dueDate_asc':
      sortObj = { dueDate: 1 };
      break;
    case 'dueDate_desc':
      sortObj = { dueDate: -1 };
      break;
    case 'highest_amount':
      sortObj = { amount: -1 };
      break;
    case 'lowest_amount':
      sortObj = { amount: 1 };
      break;
    case 'recently_added':
      sortObj = { createdAt: -1 };
      break;
    case 'alphabetical':
      sortObj = { title: 1 };
      break;
    case 'status':
      sortObj = { status: 1 };
      break;
    case 'priority':
      // Sorted in database alphabetically (high, low, medium)
      // Custom sorting is handled client-side if needed, but db sort gets it started
      sortObj = { priority: 1 };
      break;
    default:
      sortObj = { dueDate: 1 };
  }

  const bills = await Bill.find(filter).sort(sortObj);
  sendSuccess(res, 200, 'Bills retrieved successfully', bills);
});

// @desc    Create a new bill
// @route   POST /api/bills
export const createBill = asyncHandler(async (req, res) => {
  const {
    title,
    amount,
    category,
    dueDate,
    priority,
    recurring,
    frequency,
    reminder,
    customReminderDays,
    paymentMethod,
    notes,
    color,
    icon,
  } = req.body;

  const bill = await Bill.create({
    user: req.user._id,
    title,
    amount,
    category,
    dueDate,
    priority,
    recurring,
    frequency,
    reminder,
    customReminderDays,
    paymentMethod,
    notes,
    color,
    icon,
  });

  // Create local application notification
  await Notification.create({
    user: req.user._id,
    type: 'general',
    message: recurring
      ? `Recurring bill "${title}" created successfully.`
      : `Bill "${title}" scheduled for ${new Date(dueDate).toLocaleDateString('en-IN')}.`,
  });

  sendSuccess(res, 201, 'Bill created successfully', bill);
});

// @desc    Update a bill
// @route   PUT /api/bills/:id
export const updateBill = asyncHandler(async (req, res) => {
  const bill = await Bill.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    req.body,
    { new: true, runValidators: true }
  );

  if (!bill) {
    res.status(404);
    throw new Error('Bill not found');
  }

  sendSuccess(res, 200, 'Bill updated successfully', bill);
});

// @desc    Delete a bill
// @route   DELETE /api/bills/:id
export const deleteBill = asyncHandler(async (req, res) => {
  const bill = await Bill.findOneAndDelete({ _id: req.params.id, user: req.user._id });

  if (!bill) {
    res.status(404);
    throw new Error('Bill not found');
  }

  sendSuccess(res, 200, 'Bill deleted successfully');
});

// @desc    Mark a bill as Paid (and create expense)
// @route   POST /api/bills/:id/pay
export const markBillPaid = asyncHandler(async (req, res) => {
  // MASTER-022/057: Accept optional walletId to deduct bill payment from a wallet
  const { notes = 'Paid via Bill Calendar', walletId } = req.body;
  const userId = req.user._id;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const bill = await Bill.findOne({ _id: req.params.id, user: userId }).session(session);

    if (!bill) {
      res.status(404);
      throw new Error('Bill not found');
    }

    // Validate and deduct wallet balance if a walletId was provided
    let linkedWalletId = null;
    if (walletId) {
      const wallet = await Wallet.findOneAndUpdate(
        { _id: walletId, user: userId, balance: { $gte: bill.amount } },
        { $inc: { balance: -bill.amount } },
        { new: true, session }
      );
      if (!wallet) {
        const existing = await Wallet.findOne({ _id: walletId, user: userId }).session(session);
        if (!existing) { res.status(404); throw new Error('Wallet not found'); }
        res.status(400); throw new Error('Insufficient wallet balance for bill payment');
      }
      linkedWalletId = wallet._id;
    }

    const paymentRecord = {
      paidAt: new Date(),
      amountPaid: bill.amount,
      notes,
    };

    bill.paymentHistory.push(paymentRecord);

    // Sync to Expenses: Find or create Category first
    let categoryObj = await Category.findOne({
      user: userId,
      name: bill.category,
      type: 'expense',
    }).session(session);

    if (!categoryObj) {
      const [newCat] = await Category.create([{
        user: userId,
        name: bill.category,
        icon: bill.icon || '💸',
        color: bill.color || '#3b82f6',
        type: 'expense',
      }], { session });
      categoryObj = newCat;
    }

    // Create Expense record with optional wallet link
    const [expense] = await Expense.create([{
      user: userId,
      title: `[Bill Paid] ${bill.title}`,
      amount: bill.amount,
      date: new Date(),
      category: categoryObj._id,
      paymentMethod: bill.paymentMethod || 'other',
      description: notes,
      // MASTER-022/057: Link wallet to the expense if provided
      wallet: linkedWalletId,
    }], { session });

    // If recurring, calculate the next due date and reset status. Otherwise, set status to paid.
    if (bill.recurring && bill.frequency !== 'none') {
      const nextDate = new Date(bill.dueDate);
      switch (bill.frequency) {
        case 'daily':
          nextDate.setDate(nextDate.getDate() + 1);
          break;
        case 'weekly':
          nextDate.setDate(nextDate.getDate() + 7);
          break;
        case 'monthly':
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
        case 'quarterly':
          nextDate.setMonth(nextDate.getMonth() + 3);
          break;
        case 'yearly':
          nextDate.setFullYear(nextDate.getFullYear() + 1);
          break;
        default:
          nextDate.setMonth(nextDate.getMonth() + 1);
      }
      bill.dueDate = nextDate;
      bill.status = 'upcoming'; // Middleware will recalculate when needed
    } else {
      bill.status = 'paid';
    }

    await bill.save({ session });

    // Create system notification
    await Notification.create([{
      user: userId,
      type: 'general',
      message: `Bill "${bill.title}" marked as paid. Expense logged.`,
    }], { session });

    await session.commitTransaction();

    // Side-effects (can happen outside transaction)
    await recalcBudgetSpent(userId, categoryObj._id);
    await invalidateAICache(userId, CACHE_MODULES.EXPENSE_ADD);

    sendSuccess(res, 200, 'Bill marked as paid successfully', { bill, expense });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

// @desc    Skip the current cycle of a recurring bill
// @route   POST /api/bills/:id/skip
export const skipBill = asyncHandler(async (req, res) => {
  const bill = await Bill.findOne({ _id: req.params.id, user: req.user._id });

  if (!bill) {
    res.status(404);
    throw new Error('Bill not found');
  }

  if (!bill.recurring || bill.frequency === 'none') {
    res.status(400);
    throw new Error('Only recurring bills can be skipped');
  }

  const nextDate = new Date(bill.dueDate);
  switch (bill.frequency) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    default:
      nextDate.setMonth(nextDate.getMonth() + 1);
  }

  const oldDueDate = bill.dueDate;
  bill.dueDate = nextDate;
  bill.status = 'upcoming';
  await bill.save();

  await Notification.create({
    user: req.user._id,
    type: 'general',
    message: `Skipped "${bill.title}" due on ${new Date(oldDueDate).toLocaleDateString('en-IN')}. Next due is ${nextDate.toLocaleDateString('en-IN')}.`,
  });

  sendSuccess(res, 200, 'Bill cycle skipped successfully', bill);
});

// @desc    Postpone a bill's due date
// @route   POST /api/bills/:id/postpone
export const postponeBill = asyncHandler(async (req, res) => {
  const { days = 7 } = req.body;
  const bill = await Bill.findOne({ _id: req.params.id, user: req.user._id });

  if (!bill) {
    res.status(404);
    throw new Error('Bill not found');
  }

  const newDate = new Date(bill.dueDate);
  newDate.setDate(newDate.getDate() + parseInt(days));

  bill.dueDate = newDate;
  bill.status = 'upcoming'; // Middleware will re-assess if it is still overdue or due_soon
  await bill.save();

  await Notification.create({
    user: req.user._id,
    type: 'general',
    message: `Bill "${bill.title}" postponed by ${days} days to ${newDate.toLocaleDateString('en-IN')}.`,
  });

  sendSuccess(res, 200, 'Bill postponed successfully', bill);
});

// @desc    Duplicate a bill to a new custom date
// @route   POST /api/bills/:id/duplicate
export const duplicateBill = asyncHandler(async (req, res) => {
  const { newDueDate } = req.body;
  const originalBill = await Bill.findOne({ _id: req.params.id, user: req.user._id });

  if (!originalBill) {
    res.status(404);
    throw new Error('Original bill not found');
  }

  const newBill = await Bill.create({
    user: req.user._id,
    title: `${originalBill.title} (Copy)`,
    amount: originalBill.amount,
    category: originalBill.category,
    dueDate: newDueDate || new Date(),
    priority: originalBill.priority,
    recurring: originalBill.recurring,
    frequency: originalBill.frequency,
    reminder: originalBill.reminder,
    customReminderDays: originalBill.customReminderDays,
    paymentMethod: originalBill.paymentMethod,
    notes: originalBill.notes,
    color: originalBill.color,
    icon: originalBill.icon,
  });

  await Notification.create({
    user: req.user._id,
    type: 'general',
    message: `Bill "${originalBill.title}" duplicated.`,
  });

  sendSuccess(res, 201, 'Bill duplicated successfully', newBill);
});

// @desc    Get dashboard statistics for bills
// @route   GET /api/bills/stats
export const getBillStats = asyncHandler(async (req, res) => {
  await refreshBillStatuses(req.user._id);

  const bills = await Bill.find({ user: req.user._id });

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  let upcomingCount = 0;
  let upcomingAmount = 0;
  let paidCountThisMonth = 0;
  let paidAmountThisMonth = 0;
  let overdueCount = 0;
  let overdueAmount = 0;
  let totalPaidAmount = 0;
  let totalDueAmount = 0;
  let highestBill = 0;
  let sumAmount = 0;
  let billsThisMonthCount = 0;

  // Track charts data
  const categoryTotals = {};
  const categoryCounts = {};
  const monthlyTrends = {}; // Format: "YYYY-MM": sum

  // Pre-populate last 6 months for trend chart
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
    monthlyTrends[label] = 0;
  }

  bills.forEach((bill) => {
    const billDate = new Date(bill.dueDate);
    const isThisMonth = billDate.getMonth() === currentMonth && billDate.getFullYear() === currentYear;

    if (bill.amount > highestBill) {
      highestBill = bill.amount;
    }
    sumAmount += bill.amount;

    if (isThisMonth) {
      billsThisMonthCount++;
    }

    // Status aggregates
    if (bill.status === 'overdue') {
      overdueCount++;
      overdueAmount += bill.amount;
      totalDueAmount += bill.amount;
    } else if (bill.status === 'upcoming' || bill.status === 'due_soon') {
      upcomingCount++;
      upcomingAmount += bill.amount;
      totalDueAmount += bill.amount;
    }

    // Cumulative sums of payment history
    bill.paymentHistory.forEach((payment) => {
      totalPaidAmount += payment.amountPaid;
      
      const payDate = new Date(payment.paidAt);
      if (payDate.getMonth() === currentMonth && payDate.getFullYear() === currentYear) {
        paidCountThisMonth++;
        paidAmountThisMonth += payment.amountPaid;
      }
    });

    // Category distribution (all unpaid + upcoming bills, or total distribution)
    if (bill.status !== 'cancelled') {
      categoryTotals[bill.category] = (categoryTotals[bill.category] || 0) + bill.amount;
      categoryCounts[bill.category] = (categoryCounts[bill.category] || 0) + 1;
    }

    // Monthly Trend Chart (based on due date for last 6 months)
    const trendLabel = billDate.toLocaleString('default', { month: 'short', year: '2-digit' });
    if (trendLabel in monthlyTrends) {
      monthlyTrends[trendLabel] += bill.amount;
    }
  });

  const averageBill = bills.length > 0 ? sumAmount / bills.length : 0;

  // Format category chart data
  const categoryChart = Object.keys(categoryTotals).map((cat) => ({
    name: cat,
    value: categoryTotals[cat],
    count: categoryCounts[cat],
  }));

  // Format monthly trend chart data
  const trendChart = Object.keys(monthlyTrends).map((key) => ({
    month: key,
    amount: monthlyTrends[key],
  }));

  // AI Insights Generation (Rule-based)
  const insights = [];

  if (overdueCount > 0) {
    insights.push({
      type: 'warning',
      text: `You have ${overdueCount} overdue bill${overdueCount > 1 ? 's' : ''} worth ₹${overdueAmount.toLocaleString('en-IN')}. Pay today to avoid penalties!`,
    });
  }

  // Count due this week (within 7 days)
  const next7Days = new Date();
  next7Days.setDate(today.getDate() + 7);
  const dueThisWeek = bills.filter(
    (b) =>
      b.status !== 'paid' &&
      b.status !== 'cancelled' &&
      new Date(b.dueDate) >= today &&
      new Date(b.dueDate) <= next7Days
  );

  if (dueThisWeek.length > 0) {
    insights.push({
      type: 'info',
      text: `You have ${dueThisWeek.length} bill${dueThisWeek.length > 1 ? 's' : ''} due this week, totaling ₹${dueThisWeek.reduce((s, b) => s + b.amount, 0).toLocaleString('en-IN')}.`,
    });
  }

  if (highestBill > 0) {
    const highestBillObj = bills.find((b) => b.amount === highestBill);
    insights.push({
      type: 'highlight',
      text: `Your highest scheduled bill is "${highestBillObj.title}" for ₹${highestBill.toLocaleString('en-IN')}.`,
    });
  }

  if (bills.length > 0) {
    insights.push({
      type: 'info',
      text: `Your average bill cost is ₹${Math.round(averageBill).toLocaleString('en-IN')}.`,
    });
  }

  // Custom alert if energy/utility bill increased (mock logic based on category names)
  const elecBills = bills.filter((b) => b.category.toLowerCase().includes('electricity'));
  if (elecBills.length > 1) {
    insights.push({
      type: 'success',
      text: `Electricity bills are stable. Monitor usage to maintain this rate.`,
    });
  }

  // Suggest quick actions
  const nextUrgent = bills
    .filter((b) => b.status !== 'paid' && b.status !== 'cancelled')
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];
  if (nextUrgent) {
    insights.push({
      type: 'action',
      text: `Pay your next upcoming bill "${nextUrgent.title}" (₹${nextUrgent.amount.toLocaleString('en-IN')}) by ${new Date(nextUrgent.dueDate).toLocaleDateString('en-IN')} to stay on track.`,
    });
  }

  // Sparkline generator: simulated trends based on historical values
  const processSparkline = (currentVal, type) => {
    const base = [0.4, 0.6, 0.3, 0.8, 0.5, 0.7, 0.9, 0.6, 0.8, 1];
    return base.map((multiplier) => ({ val: Math.round(currentVal * multiplier) }));
  };

  sendSuccess(res, 200, 'Bill stats computed successfully', {
    upcomingCount,
    upcomingAmount,
    paidCountThisMonth,
    paidAmountThisMonth,
    overdueCount,
    overdueAmount,
    totalPaidAmount,
    totalDueAmount,
    highestBill,
    averageBill,
    billsThisMonthCount,
    categoryChart,
    trendChart,
    insights,
    sparklines: {
      upcoming: processSparkline(upcomingAmount, 'upcoming'),
      paid: processSparkline(paidAmountThisMonth, 'paid'),
      overdue: processSparkline(overdueAmount, 'overdue'),
      totalDue: processSparkline(totalDueAmount, 'totalDue'),
    },
  });
});
