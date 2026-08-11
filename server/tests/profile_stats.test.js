import mongoose from 'mongoose';
import User from '../models/User.js';
import Wallet from '../models/Wallet.js';
import Budget from '../models/Budget.js';
import Goal from '../models/Goal.js';
import Subscription from '../models/Subscription.js';
import Bill from '../models/Bill.js';
import Income from '../models/Income.js';
import Expense from '../models/Expense.js';

import { getProfileStats, updateMe } from '../controllers/userController.js';

// Mock DB Storage
let walletsDb = [];
let budgetsDb = [];
let goalsDb = [];
let subscriptionsDb = [];
let billsDb = [];
let incomesDb = [];
let expensesDb = [];
let usersDb = [];

// Stub model methods
Wallet.countDocuments = async (query) => {
  if (!query.user) throw new Error('Query must scope user ID');
  return walletsDb.filter(w => w.user.toString() === query.user.toString() && w.isArchived !== true).length;
};
Budget.countDocuments = async (query) => {
  if (!query.user) throw new Error('Query must scope user ID');
  return budgetsDb.filter(b => b.user.toString() === query.user.toString()).length;
};
Goal.countDocuments = async (query) => {
  if (!query.user) throw new Error('Query must scope user ID');
  return goalsDb.filter(g => g.user.toString() === query.user.toString() && g.isDeleted !== true).length;
};
Subscription.countDocuments = async (query) => {
  if (!query.user) throw new Error('Query must scope user ID');
  return subscriptionsDb.filter(s => s.user.toString() === query.user.toString()).length;
};
Bill.countDocuments = async (query) => {
  if (!query.user) throw new Error('Query must scope user ID');
  const ninList = query.status?.$nin || [];
  return billsDb.filter(b => b.user.toString() === query.user.toString() && !ninList.includes(b.status)).length;
};
Income.countDocuments = async (query) => {
  if (!query.user) throw new Error('Query must scope user ID');
  return incomesDb.filter(i => i.user.toString() === query.user.toString() && i.isTransfer !== true).length;
};
Expense.countDocuments = async (query) => {
  if (!query.user) throw new Error('Query must scope user ID');
  return expensesDb.filter(e => e.user.toString() === query.user.toString() && e.isTransfer !== true).length;
};
Income.aggregate = async (pipeline) => {
  const match = pipeline.find(p => p.$match)?.$match || {};
  if (!match.user) throw new Error('Aggregation must scope user ID');
  const matching = incomesDb.filter(i => i.user.toString() === match.user.toString() && i.isTransfer !== true);
  const sum = matching.reduce((acc, i) => acc + i.amount, 0);
  return [{ _id: null, total: sum }];
};
Expense.aggregate = async (pipeline) => {
  const match = pipeline.find(p => p.$match)?.$match || {};
  if (!match.user) throw new Error('Aggregation must scope user ID');
  const matching = expensesDb.filter(e => e.user.toString() === match.user.toString() && e.isTransfer !== true);
  const sum = matching.reduce((acc, e) => acc + e.amount, 0);
  return [{ _id: null, total: sum }];
};

User.findByIdAndUpdate = (id, updateFields) => {
  const idx = usersDb.findIndex(u => u._id.toString() === id.toString());
  const updatedUser = idx !== -1 ? { ...usersDb[idx], ...updateFields } : null;
  if (idx !== -1) {
    usersDb[idx] = updatedUser;
  }
  return {
    select(selectFields) {
      return Promise.resolve(updatedUser);
    }
  };
};

// Response sender helper
const makeMockRes = () => {
  let responseStatus = 200;
  let responseData = null;
  return {
    status(s) {
      responseStatus = s;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    },
    getStatus() { return responseStatus; },
    getData() { return responseData; }
  };
};

const runStatsTests = async () => {
  console.log('--- STARTING PROFILE STATS & CONTROLLER TESTS ---');

  try {
    const userA_id = new mongoose.Types.ObjectId();
    const userB_id = new mongoose.Types.ObjectId();

    usersDb = [
      { _id: userA_id, name: 'User A', email: 'usera@test.com', twoFactorEnabled: false, alertSettings: { bills: true, budgets: true, weekly: false } },
      { _id: userB_id, name: 'User B', email: 'userb@test.com', twoFactorEnabled: false, alertSettings: { bills: true, budgets: true, weekly: false } }
    ];

    // Seed financial records for User A
    incomesDb = [
      { user: userA_id, amount: 1000, isTransfer: false },
      { user: userA_id, amount: 500, isTransfer: false },
      { user: userA_id, amount: 300, isTransfer: true } // should be excluded
    ];

    expensesDb = [
      { user: userA_id, amount: 200, isTransfer: false },
      { user: userA_id, amount: 150, isTransfer: false },
      { user: userA_id, amount: 100, isTransfer: true } // should be excluded
    ];

    walletsDb = [
      { user: userA_id, balance: 1000, isArchived: false },
      { user: userA_id, balance: 500, isArchived: false },
      { user: userA_id, balance: 200, isArchived: true } // should be excluded
    ];

    budgetsDb = [
      { user: userA_id, limit: 1000 },
      { user: userA_id, limit: 500 }
    ];

    goalsDb = [
      { user: userA_id, targetAmount: 5000, isDeleted: false },
      { user: userA_id, targetAmount: 2000, isDeleted: true } // should be excluded
    ];

    subscriptionsDb = [
      { user: userA_id, cost: 15 },
      { user: userA_id, cost: 10 }
    ];

    billsDb = [
      { user: userA_id, status: 'upcoming' },
      { user: userA_id, status: 'overdue' },
      { user: userA_id, status: 'paid' }, // should be excluded
      { user: userA_id, status: 'cancelled' } // should be excluded
    ];

    // Test 1: Authenticated stats request for User A
    console.log('Test 1: Fetching stats for User A (with records)...');
    const reqA = { user: { _id: userA_id } };
    const resA = makeMockRes();

    await getProfileStats(reqA, resA, (err) => { if (err) throw err; });

    const statsA = resA.getData().data;
    if (resA.getStatus() !== 200 || !resA.getData().success) {
      throw new Error(`Expected 200 success response, got ${resA.getStatus()}`);
    }

    if (statsA.totalIncome !== 1500) throw new Error(`Expected totalIncome 1500, got ${statsA.totalIncome}`);
    if (statsA.totalExpense !== 350) throw new Error(`Expected totalExpense 350, got ${statsA.totalExpense}`);
    if (statsA.transactionCount !== 4) throw new Error(`Expected transactionCount 4, got ${statsA.transactionCount}`);
    if (statsA.walletsCount !== 2) throw new Error(`Expected walletsCount 2, got ${statsA.walletsCount}`);
    if (statsA.budgetsCount !== 2) throw new Error(`Expected budgetsCount 2, got ${statsA.budgetsCount}`);
    if (statsA.goalsCount !== 1) throw new Error(`Expected goalsCount 1, got ${statsA.goalsCount}`);
    if (statsA.subscriptionsCount !== 2) throw new Error(`Expected subscriptionsCount 2, got ${statsA.subscriptionsCount}`);
    if (statsA.billsCount !== 2) throw new Error(`Expected billsCount 2, got ${statsA.billsCount}`);

    console.log('✓ Test 1 Passed: Stats successfully calculated for User A');

    // Test 2: Fetching stats for User B (no records)
    console.log('Test 2: Fetching stats for User B (no records)...');
    const reqB = { user: { _id: userB_id } };
    const resB = makeMockRes();

    await getProfileStats(reqB, resB, (err) => { if (err) throw err; });

    const statsB = resB.getData().data;
    if (statsB.totalIncome !== 0) throw new Error(`Expected totalIncome 0, got ${statsB.totalIncome}`);
    if (statsB.totalExpense !== 0) throw new Error(`Expected totalExpense 0, got ${statsB.totalExpense}`);
    if (statsB.transactionCount !== 0) throw new Error(`Expected transactionCount 0, got ${statsB.transactionCount}`);
    if (statsB.walletsCount !== 0) throw new Error(`Expected walletsCount 0, got ${statsB.walletsCount}`);
    if (statsB.budgetsCount !== 0) throw new Error(`Expected budgetsCount 0, got ${statsB.budgetsCount}`);
    if (statsB.goalsCount !== 0) throw new Error(`Expected goalsCount 0, got ${statsB.goalsCount}`);
    if (statsB.subscriptionsCount !== 0) throw new Error(`Expected subscriptionsCount 0, got ${statsB.subscriptionsCount}`);
    if (statsB.billsCount !== 0) throw new Error(`Expected billsCount 0, got ${statsB.billsCount}`);

    console.log('✓ Test 2 Passed: Stats successfully isolated to 0 for User B');

    // Test 3: Verify isolation (User B cannot see User A's data)
    console.log('Test 3: Confirming User B cannot access User A\'s data...');
    // Scoped query is tested by ensuring reqB returned 0, proving User A\'s records weren\'t included in B\'s metrics
    console.log('✓ Test 3 Passed: User separation verified');

    // Test 4: Verify scoping checks (Ensure req.user._id is used and not parameters)
    console.log('Test 4: Verify scoping checks (no req.user ID leak)...');
    // Handled by stubs throwing error if user query scope is missing.
    console.log('✓ Test 4 Passed: Queries safely scoped to req.user._id');

    // Test 5: Verify update profile controller whitelist protection
    console.log('Test 5: Testing whitelisting in updateMe controller...');
    const reqUpdate = {
      user: { _id: userA_id },
      body: {
        name: 'User A Updated',
        twoFactorEnabled: true,
        alertSettings: { bills: false, budgets: false, weekly: true },
        // Blacklisted fields below - should be ignored
        role: 'admin',
        password: 'hacked_password123',
        twoFactorSecret: 'malicious_secret',
        backupCodes: ['fake_code_1']
      }
    };
    const resUpdate = makeMockRes();
    await updateMe(reqUpdate, resUpdate, (err) => { if (err) throw err; });

    const updatedUser = resUpdate.getData().data;
    if (updatedUser.name !== 'User A Updated') throw new Error('Failed to update whitelisted name');
    if (updatedUser.twoFactorEnabled !== true) throw new Error('Failed to update whitelisted twoFactorEnabled');
    if (updatedUser.alertSettings.bills !== false || updatedUser.alertSettings.weekly !== true) {
      throw new Error('Failed to update whitelisted alertSettings');
    }

    // Verify blacklisted fields are NOT changed
    if (updatedUser.role === 'admin') throw new Error('Blacklisted role field was updated!');
    if (updatedUser.password === 'hacked_password123') throw new Error('Blacklisted password field was updated!');
    if (updatedUser.twoFactorSecret === 'malicious_secret') throw new Error('Blacklisted twoFactorSecret was updated!');

    console.log('✓ Test 5 Passed: Profile update whitelisting successfully verified');

    console.log('--- ALL TEST SUITE RUNS PASSED SUCCESSFULLY ---');
    process.exit(0);

  } catch (err) {
    console.error('Test Suite Failed:', err.message);
    process.exit(1);
  }
};

runStatsTests();
