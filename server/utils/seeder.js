import Category from '../models/Category.js';
import Expense from '../models/Expense.js';
import Income from '../models/Income.js';
import Budget from '../models/Budget.js';
import Wallet from '../models/Wallet.js';
import Goal from '../models/Goal.js';
import Investment from '../models/Investment.js';
import Loan from '../models/Loan.js';
import Subscription from '../models/Subscription.js';
import Notification from '../models/Notification.js';
import AIChat from '../models/AIChat.js';
import SplitExpense from '../models/SplitExpense.js';
import Family from '../models/Family.js';
import Feedback from '../models/Feedback.js';

const DEFAULT_CATEGORIES = [
  { name: 'Food & Dining', icon: '🍔', color: '#f97316', type: 'expense' },
  { name: 'Transport', icon: '🚗', color: '#3b82f6', type: 'expense' },
  { name: 'Shopping', icon: '🛍️', color: '#ec4899', type: 'expense' },
  { name: 'Entertainment', icon: '🎬', color: '#8b5cf6', type: 'expense' },
  { name: 'Health', icon: '🏥', color: '#22c55e', type: 'expense' },
  { name: 'Utilities', icon: '💡', color: '#eab308', type: 'expense' },
  { name: 'Rent', icon: '🏠', color: '#14b8a6', type: 'expense' },
  { name: 'Education', icon: '📚', color: '#6366f1', type: 'expense' },
  { name: 'Other', icon: '📁', color: '#6b7280', type: 'expense' },
  { name: 'Salary', icon: '💼', color: '#22c55e', type: 'income' },
  { name: 'Freelance', icon: '💻', color: '#3b82f6', type: 'income' },
  { name: 'Investment', icon: '📈', color: '#f59e0b', type: 'income' },
  { name: 'Gift', icon: '🎁', color: '#ec4899', type: 'income' },
  { name: 'Other Income', icon: '💰', color: '#6366f1', type: 'income' },
];

const getRelativeDate = (daysAgo) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(12, 0, 0, 0);
  return date;
};

export const seedDataForUser = async (userId) => {
  console.log(`🌱 Seeding mock data for user ${userId}...`);

  // 1. Clean existing transactions & budgets across ALL collections
  await Promise.all([
    Expense.deleteMany({ user: userId }),
    Income.deleteMany({ user: userId }),
    Budget.deleteMany({ user: userId }),
    Wallet.deleteMany({ user: userId }),
    Goal.deleteMany({ user: userId }),
    Investment.deleteMany({ user: userId }),
    Loan.deleteMany({ user: userId }),
    Subscription.deleteMany({ user: userId }),
    Notification.deleteMany({ user: userId }),
    AIChat.deleteMany({ user: userId }),
    SplitExpense.deleteMany({ creator: userId }),
    Family.deleteMany({ owner: userId }),
    Feedback.deleteMany({ user: userId }),
  ]);

  // 2. Check and ensure default categories exist
  let userCats = await Category.find({ user: userId });
  if (userCats.length === 0) {
    const catsToInsert = DEFAULT_CATEGORIES.map((c) => ({ ...c, user: userId }));
    userCats = await Category.insertMany(catsToInsert);
  }

  const catMap = {};
  userCats.forEach((c) => {
    catMap[c.name] = c._id;
  });

  // 3. Seed Wallets
  const walletHdfc = await Wallet.create({
    user: userId,
    name: 'HDFC Salary Bank',
    type: 'bank',
    balance: 75000,
    color: '#3b82f6',
    icon: '🏦'
  });

  const walletUpi = await Wallet.create({
    user: userId,
    name: 'Paytm UPI',
    type: 'upi',
    balance: 8450,
    color: '#10b981',
    icon: '📱'
  });

  const walletCard = await Wallet.create({
    user: userId,
    name: 'Amazon ICICI Credit',
    type: 'credit_card',
    balance: -12000,
    color: '#ec4899',
    icon: '💳'
  });

  const walletCash = await Wallet.create({
    user: userId,
    name: 'Cash Box',
    type: 'cash',
    balance: 3500,
    color: '#f59e0b',
    icon: '💵'
  });

  // 4. Seed Incomes
  const rawIncomes = [
    { title: 'Monthly Salary', amount: 75000, category: 'Salary', source: 'Primary Corp', date: getRelativeDate(1), description: 'Regular monthly paycheck' },
    { title: 'Freelance Design', amount: 14000, category: 'Freelance', source: 'Upwork Project', date: getRelativeDate(5), description: 'UI design consulting work' },
    { title: 'Stocks Dividend', amount: 4500, category: 'Investment', source: 'Zerodha', date: getRelativeDate(12), description: 'Quarterly payouts' },
  ];
  await Income.insertMany(rawIncomes.map((inc) => ({ ...inc, user: userId })));

  // 5. Seed Expenses
  const rawExpenses = [
    { title: 'Apartment Rent', amount: 20000, categoryName: 'Rent', date: getRelativeDate(2), paymentMethod: 'bank', description: 'Rent for current month' },
    { title: 'Electricity Bill', amount: 2900, categoryName: 'Utilities', date: getRelativeDate(8), paymentMethod: 'upi', description: 'Power grid bill' },
    { title: 'Weekly Groceries', amount: 2450, categoryName: 'Food & Dining', date: getRelativeDate(1), paymentMethod: 'upi', description: 'Zepto order' },
    { title: 'Dinner at Restaurant', amount: 1200, categoryName: 'Food & Dining', date: getRelativeDate(4), paymentMethod: 'card', description: 'Pizza with friends' },
    { title: 'Netflix Premium', amount: 649, categoryName: 'Entertainment', date: getRelativeDate(0), paymentMethod: 'card', description: 'Monthly auto-renew subscription' }
  ];
  const expensesToInsert = rawExpenses.map((exp) => ({
    user: userId,
    category: catMap[exp.categoryName] || null,
    title: exp.title,
    amount: exp.amount,
    date: exp.date,
    paymentMethod: exp.paymentMethod,
    description: exp.description || ''
  }));
  await Expense.insertMany(expensesToInsert);

  // 6. Seed Budgets
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
  const budgets = [
    { user: userId, category: catMap['Food & Dining'], limit: 15000, spent: 3650, period: 'monthly', startDate: startOfMonth, endDate: endOfMonth },
    { user: userId, category: catMap['Utilities'], limit: 6000, spent: 2900, period: 'monthly', startDate: startOfMonth, endDate: endOfMonth }
  ];
  await Budget.insertMany(budgets);

  // 7. Seed Savings Goals
  await Goal.create([
    { user: userId, name: 'Buy Electric Bike', targetAmount: 150000, currentSaved: 45000, deadline: getRelativeDate(-180), category: 'Vehicle' },
    { user: userId, name: 'European Vacation', targetAmount: 200000, currentSaved: 15000, deadline: getRelativeDate(-270), category: 'Vacation' },
    { user: userId, name: 'Emergency Buffer', targetAmount: 50000, currentSaved: 50000, deadline: getRelativeDate(0), category: 'Emergency Fund', status: 'completed' }
  ]);

  // 8. Seed Investments
  await Investment.create([
    { user: userId, name: 'Nifty 50 Index Fund', type: 'mutual_funds', investedAmount: 120000, currentValue: 134500, symbol: 'NIFTY50', purchaseDate: getRelativeDate(30) },
    { user: userId, name: 'Bitcoin ETF', type: 'crypto', investedAmount: 35000, currentValue: 44800, symbol: 'BTC', purchaseDate: getRelativeDate(60) },
    { user: userId, name: 'Reliance Equity', type: 'stocks', investedAmount: 45000, currentValue: 43200, symbol: 'RELIANCE', purchaseDate: getRelativeDate(10) }
  ]);

  // 9. Seed Loans
  await Loan.create([
    { user: userId, name: 'Education Loan', type: 'education', amount: 450000, interestRate: 8.5, durationMonths: 60, emiAmount: 9200, remainingBalance: 380000, nextEmiDate: getRelativeDate(-30) },
    { user: userId, name: 'iPhone 15 EMI', type: 'credit_card_emi', amount: 80000, interestRate: 0, durationMonths: 12, emiAmount: 6666, remainingBalance: 26664, nextEmiDate: getRelativeDate(-15) }
  ]);

  // 10. Seed Subscriptions
  await Subscription.create([
    { user: userId, name: 'Netflix Premium', cost: 649, billingCycle: 'monthly', renewalDate: getRelativeDate(-5), reminder: true },
    { user: userId, name: 'Spotify Duo', cost: 179, billingCycle: 'monthly', renewalDate: getRelativeDate(-10), reminder: true },
    { user: userId, name: 'Amazon Prime Yearly', cost: 1499, billingCycle: 'yearly', renewalDate: getRelativeDate(-90), reminder: true }
  ]);

  // 11. Seed Notifications
  await Notification.create([
    { user: userId, type: 'salary_received', message: 'Salary credited successfully! 💼', read: true },
    { user: userId, type: 'goal_completed', message: 'Emergency Buffer savings goal completed! 🎉', read: false },
    { user: userId, type: 'subscription_renewal', message: 'Netflix subscription renews in 2 days. ⏳', read: false }
  ]);

  // 12. Seed AI Chat History
  await AIChat.create({
    user: userId,
    messages: [
      { role: 'user', content: 'Can I spend ₹5000 this month?', timestamp: getRelativeDate(2) },
      { role: 'assistant', content: 'Yes, you can! Your liquid wallet balances are high enough...', timestamp: getRelativeDate(2) }
    ]
  });

  // 13. Seed Split Bills
  await SplitExpense.create([
    { creator: userId, title: 'Weekend Goa Trip', amount: 24000, groupName: 'Trip', status: 'pending', members: [
      { userEmail: 'spouse@gmail.com', share: 8000, paid: false, status: 'pending' },
      { userEmail: 'colleague@gmail.com', share: 8000, paid: true, status: 'settled' }
    ]},
    { creator: userId, title: 'Team lunch at Bistro', amount: 4500, groupName: 'Restaurant', status: 'settled', members: [
      { userEmail: 'colleague@gmail.com', share: 1500, paid: true, status: 'settled' },
      { userEmail: 'intern@gmail.com', share: 1500, paid: true, status: 'settled' }
    ]}
  ]);

  // 14. Seed Family Hub
  await Family.create({
    owner: userId,
    name: 'Active Family Sharing Pool',
    members: [
      { email: 'spouse@gmail.com', role: 'admin', status: 'accepted' },
      { email: 'child@gmail.com', role: 'member', status: 'pending' }
    ],
    approvals: [
      { title: 'Weekly grocery cart items', amount: 4200, category: 'Food & Dining', requesterEmail: 'spouse@gmail.com', status: 'pending' },
      { title: 'School tuition books fee', amount: 2800, category: 'Education', requesterEmail: 'child@gmail.com', status: 'approved' }
    ]
  });

  console.log(`🎉 Complete integrated seeder populated successfully for user ${userId}!`);
};
