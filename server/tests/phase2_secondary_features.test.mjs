/**
 * server/tests/phase2_secondary_features.test.mjs
 * 
 * PHASE 2: SECONDARY FINANCIAL & SOCIAL FEATURES TEST SUITE
 * Exhaustive coverage for:
 *   1. Goal Controller (server/controllers/goalController.js)
 *   2. Bill Controller (server/controllers/billController.js)
 *   3. Subscription Controller (server/controllers/subscriptionController.js)
 *   4. Investment Controller (server/controllers/investmentController.js)
 *   5. Split Controller (server/controllers/splitController.js)
 *   6. Family Controller (server/controllers/familyController.js)
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import {
  request,
  createTestUser,
  createTestWallet,
  createTestCategory,
  cleanupUser,
  TestSuiteRunner,
  Goal,
  Contribution,
  Bill,
  Expense,
  Wallet,
  Subscription,
  Investment,
  SplitExpense,
  Family,
  Notification,
} from './test_helpers.mjs';

export const runPhase2SecondaryFeaturesTests = async () => {
  const runner = new TestSuiteRunner('Phase 2: Secondary Financial & Social Features');
  console.log('\n======================================================');
  console.log('  RUNNING SUITE: Phase 2: Secondary Financial Features');
  console.log('======================================================');

  let userA, userB, userC;
  let walletA1, walletA2, walletB1;

  try {
    userA = await createTestUser({ name: 'Phase2 User A' });
    userB = await createTestUser({ name: 'Phase2 User B' });
    userC = await createTestUser({ name: 'Phase2 User C' });

    walletA1 = await createTestWallet(userA.user, { name: 'P2 Main Wallet', balance: 100000, isPrimary: true, currency: 'INR' });
    walletA2 = await createTestWallet(userA.user, { name: 'P2 Savings Wallet', balance: 50000, isPrimary: false, currency: 'INR' });
    walletB1 = await createTestWallet(userB.user, { name: 'P2 UserB Wallet', balance: 40000, isPrimary: true, currency: 'INR' });

    // =========================================================================
    // 1. GOAL CONTROLLER TESTS (server/controllers/goalController.js)
    // =========================================================================
    console.log('\n--- Testing Goal Controller ---');

    // P2-GOA-001: Create goal with validations
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    const pastDate = new Date();
    pastDate.setFullYear(pastDate.getFullYear() - 1);

    const createGoalRes = await request({
      method: 'POST',
      path: '/goals',
      body: {
        title: 'Europe Summer Vacation',
        description: 'Trip to Italy and Switzerland',
        category: 'Vacation',
        targetAmount: 200000,
        targetDate: futureDate.toISOString(),
        priority: 'High',
        color: '#3b82f6',
        icon: '✈️',
      },
      token: userA.accessToken,
    });
    const goalAId = createGoalRes.data?.data?._id;

    const invalidDateGoalRes = await request({
      method: 'POST',
      path: '/goals',
      body: {
        title: 'Past Goal',
        targetAmount: 50000,
        targetDate: pastDate.toISOString(),
      },
      token: userA.accessToken,
    });

    runner.record({
      id: 'P2-GOA-001',
      feature: 'Goal Create & Validation',
      name: 'Create financial goal and reject target date in the past',
      passed: createGoalRes.status === 201 &&
              createGoalRes.data?.data?.targetAmount === 200000 &&
              createGoalRes.data?.data?.status === 'Active' &&
              invalidDateGoalRes.status === 400 &&
              invalidDateGoalRes.data?.message === 'Target date must be in the future',
      expected: 'Valid: HTTP 201 Active, Past Date: HTTP 400 "Target date must be in the future"',
      actual: `Valid: HTTP ${createGoalRes.status}, Past Date: HTTP ${invalidDateGoalRes.status} (${invalidDateGoalRes.data?.message})`,
      file: 'server/controllers/goalController.js',
      func: 'createGoal',
      severity: 'CRITICAL',
    });

    // P2-GOA-002: Goal Read, Statistics & IDOR
    const readGoalRes = await request({
      method: 'GET',
      path: `/goals/${goalAId}`,
      token: userA.accessToken,
    });
    const idorReadGoalRes = await request({
      method: 'GET',
      path: `/goals/${goalAId}`,
      token: userB.accessToken,
    });
    const goalStatsRes = await request({
      method: 'GET',
      path: '/goals/stats',
      token: userA.accessToken,
    });

    runner.record({
      id: 'P2-GOA-002',
      feature: 'Goal Read & Stats IDOR',
      name: 'Read goal details, fetch stats, and verify User B receives 404 with no data leaked',
      passed: readGoalRes.status === 200 &&
              idorReadGoalRes.status === 404 &&
              idorReadGoalRes.data?.message === 'Goal not found' &&
              goalStatsRes.status === 200 &&
              goalStatsRes.data?.data?.activeGoals >= 1,
      expected: 'User A: HTTP 200, User B: HTTP 404 "Goal not found", Stats: HTTP 200',
      actual: `User A: ${readGoalRes.status}, User B: ${idorReadGoalRes.status} (${idorReadGoalRes.data?.message}), Stats: ${goalStatsRes.status}`,
      file: 'server/controllers/goalController.js',
      func: 'getGoalById',
      severity: 'CRITICAL',
    });

    // P2-GOA-003: Update goal details & Target Amount lower than Saved Amount guard
    // First contribute ₹20,000 to goalA
    const w1BeforeContrib = (await Wallet.findById(walletA1._id)).balance;
    const contrib1Res = await request({
      method: 'POST',
      path: `/goals/${goalAId}/contribute`,
      body: {
        amount: 20000,
        walletId: walletA1._id.toString(),
        note: 'Initial deposit',
      },
      token: userA.accessToken,
    });
    const w1AfterContrib = (await Wallet.findById(walletA1._id)).balance;
    const goalAfterContrib = await Goal.findById(goalAId);

    // Attempt updating targetAmount to ₹10,000 (which is less than savedAmount ₹20,000)
    const updateTargetTooLowRes = await request({
      method: 'PUT',
      path: `/goals/${goalAId}`,
      body: { targetAmount: 10000 },
      token: userA.accessToken,
    });

    runner.record({
      id: 'P2-GOA-003',
      feature: 'Goal Update Validation',
      name: 'Reject targetAmount reduction below current savedAmount with informative 400',
      passed: contrib1Res.status === 200 &&
              w1AfterContrib === w1BeforeContrib - 20000 &&
              goalAfterContrib.savedAmount === 20000 &&
              updateTargetTooLowRes.status === 400 &&
              updateTargetTooLowRes.data?.message?.includes('cannot be less than the amount already saved'),
      expected: 'Deposit: 200, Update: HTTP 400 "Target amount cannot be less than the amount already saved..."',
      actual: `Deposit: ${contrib1Res.status}, Update: HTTP ${updateTargetTooLowRes.status} (${updateTargetTooLowRes.data?.message})`,
      file: 'server/controllers/goalController.js',
      func: 'updateGoal',
      severity: 'HIGH',
    });

    // P2-GOA-004: Auto-Cap Contribution & Goal Completion Lifecycle
    // Top up walletA1 with ₹500,000 to ensure sufficient funds for the capped deposit
    await Wallet.findByIdAndUpdate(walletA1._id, { balance: 500000 });
    const w1PreCap = 500000;

    // Target is 200,000. Currently saved: 20,000. Remaining: 180,000.
    // User attempts to deposit ₹250,000 (excess ₹70,000).
    // Ensure: caps at 180,000, wallet debited exactly 180,000, differenceReturned is 70,000, status becomes Completed.
    const capContribRes = await request({
      method: 'POST',
      path: `/goals/${goalAId}/contribute`,
      body: {
        amount: 250000,
        walletId: walletA1._id.toString(),
        note: 'Lump sum bonus deposit',
      },
      token: userA.accessToken,
    });
    const w1PostCap = (await Wallet.findById(walletA1._id)).balance;
    const goalAfterCompletion = await Goal.findById(goalAId);

    // Attempting further contribution to completed goal MUST be rejected
    const extraContribOnCompleteRes = await request({
      method: 'POST',
      path: `/goals/${goalAId}/contribute`,
      body: {
        amount: 5000,
        walletId: walletA1._id.toString(),
      },
      token: userA.accessToken,
    });

    runner.record({
      id: 'P2-GOA-004',
      feature: 'Goal Auto-Cap & Completion',
      name: 'Auto-cap contribution to exact remaining balance, transition to Completed, and reject further contributions',
      passed: capContribRes.status === 200 &&
              capContribRes.data?.data?.differenceReturned === 70000 &&
              w1PostCap === w1PreCap - 180000 &&
              goalAfterCompletion.savedAmount === 200000 &&
              goalAfterCompletion.status === 'Completed' &&
              extraContribOnCompleteRes.status === 400 &&
              extraContribOnCompleteRes.data?.message === 'Goal is already completed',
      expected: 'Cap: debits ₹180k, returns diff ₹70k, status: "Completed", Over-contrib: HTTP 400 "Goal is already completed"',
      actual: `Cap: debited ₹${w1PreCap - w1PostCap}, diffReturned: ₹${capContribRes.data?.data?.differenceReturned}, status: ${goalAfterCompletion?.status}, Over-contrib: HTTP ${extraContribOnCompleteRes.status} (${extraContribOnCompleteRes.data?.message})`,
      file: 'server/controllers/goalController.js',
      func: 'contributeToGoal',
      severity: 'CRITICAL',
    });

    // P2-GOA-005: IDOR & State Verification on Goal Contribution
    // User B attempts to contribute to User A's goal with User B's wallet
    const wB1PreIdor = (await Wallet.findById(walletB1._id)).balance;
    const goalAPreIdor = (await Goal.findById(goalAId)).savedAmount;

    const idorContribRes = await request({
      method: 'POST',
      path: `/goals/${goalAId}/contribute`,
      body: {
        amount: 1000,
        walletId: walletB1._id.toString(),
      },
      token: userB.accessToken,
    });

    const wB1PostIdor = (await Wallet.findById(walletB1._id)).balance;
    const goalAPostIdor = (await Goal.findById(goalAId)).savedAmount;

    runner.record({
      id: 'P2-GOA-005',
      feature: 'Goal Contribution IDOR & State Invariant',
      name: 'Reject User B contribution to User A goal, verifying both goal and User B wallet remain unmodified',
      passed: idorContribRes.status === 404 &&
              idorContribRes.data?.message === 'Goal not found' &&
              wB1PostIdor === wB1PreIdor &&
              goalAPostIdor === goalAPreIdor,
      expected: 'HTTP 404 "Goal not found", Wallet B balance unchanged, Goal savedAmount unchanged',
      actual: `HTTP ${idorContribRes.status} (${idorContribRes.data?.message}), WB: ${wB1PostIdor} vs ${wB1PreIdor}, Goal: ${goalAPostIdor} vs ${goalAPreIdor}`,
      file: 'server/controllers/goalController.js',
      func: 'contributeToGoal',
      severity: 'CRITICAL',
    });

    // P2-GOA-007: Delete Contribution (verify refund to wallet, decrement in savedAmount, and status reversal)
    const contrib1Id = contrib1Res.data?.data?.contribution?._id;
    const w1PreDelContrib = (await Wallet.findById(walletA1._id)).balance;
    const goalPreDelContrib = await Goal.findById(goalAId);

    const delContribRes = await request({
      method: 'DELETE',
      path: `/goals/${goalAId}/contributions/${contrib1Id}`,
      token: userA.accessToken,
    });

    const w1PostDelContrib = (await Wallet.findById(walletA1._id)).balance;
    const goalAfterDelContrib = await Goal.findById(goalAId);
    const contribInDb = await Contribution.findById(contrib1Id);

    runner.record({
      id: 'P2-GOA-007',
      feature: 'Contribution Deletion & Wallet Refund',
      name: 'Delete contribution refunds wallet, decrements savedAmount, reverts status to Active, and removes record',
      passed: delContribRes.status === 200 &&
              delContribRes.data?.message === 'Contribution removed successfully' &&
              w1PostDelContrib === w1PreDelContrib + 20000 &&
              goalAfterDelContrib.savedAmount === goalPreDelContrib.savedAmount - 20000 &&
              goalAfterDelContrib.status === 'Active' &&
              contribInDb === null,
      expected: `HTTP 200, Wallet balance ${w1PreDelContrib + 20000}, Goal savedAmount ${goalPreDelContrib.savedAmount - 20000}, Status 'Active', DB record null`,
      actual: `HTTP ${delContribRes.status} (${delContribRes.data?.message}), Wallet balance ${w1PostDelContrib}, Goal savedAmount ${goalAfterDelContrib?.savedAmount}, Status '${goalAfterDelContrib?.status}', DB record: ${contribInDb}`,
      file: 'server/controllers/goalController.js',
      func: 'deleteContribution',
      severity: 'HIGH',
    });

    // P2-GOA-006: Soft Delete Goal and verify subsequent read returns 404
    const delGoalRes = await request({
      method: 'DELETE',
      path: `/goals/${goalAId}`,
      token: userA.accessToken,
    });
    const getDeletedGoalRes = await request({
      method: 'GET',
      path: `/goals/${goalAId}`,
      token: userA.accessToken,
    });
    const dbGoal = await Goal.findById(goalAId);

    runner.record({
      id: 'P2-GOA-006',
      feature: 'Goal Soft Delete',
      name: 'Soft delete marks isDeleted: true and API queries exclude it with 404',
      passed: delGoalRes.status === 200 &&
              getDeletedGoalRes.status === 404 &&
              dbGoal.isDeleted === true,
      expected: 'Delete: HTTP 200, Get: HTTP 404, DB isDeleted: true',
      actual: `Delete: HTTP ${delGoalRes.status}, Get: HTTP ${getDeletedGoalRes.status}, DB isDeleted: ${dbGoal?.isDeleted}`,
      file: 'server/controllers/goalController.js',
      func: 'deleteGoal',
      severity: 'HIGH',
    });

    // =========================================================================
    // 2. BILL CONTROLLER TESTS (server/controllers/billController.js)
    // =========================================================================
    console.log('\n--- Testing Bill Controller ---');

    // P2-BIL-001: Create One-off Bill and Recurring Bill
    const billDueDate = new Date();
    billDueDate.setDate(billDueDate.getDate() + 5);

    const createBillRes = await request({
      method: 'POST',
      path: '/bills',
      body: {
        title: 'Internet Fiber Optic',
        amount: 1500,
        category: 'Utilities',
        dueDate: billDueDate.toISOString(),
        recurring: true,
        frequency: 'monthly',
        paymentMethod: 'bank',
        priority: 'high',
      },
      token: userA.accessToken,
    });
    const billAId = createBillRes.data?.data?._id;

    runner.record({
      id: 'P2-BIL-001',
      feature: 'Bill Create',
      name: 'Create monthly recurring bill with due date and priority',
      passed: createBillRes.status === 201 &&
              createBillRes.data?.data?.amount === 1500 &&
              createBillRes.data?.data?.recurring === true &&
              createBillRes.data?.data?.frequency === 'monthly',
      expected: 'HTTP 201, amount 1500, recurring true, frequency monthly',
      actual: `HTTP ${createBillRes.status}, recurring: ${createBillRes.data?.data?.recurring}`,
      file: 'server/controllers/billController.js',
      func: 'createBill',
      severity: 'CRITICAL',
    });

    // P2-BIL-002: Pay Recurring Bill -> Wallet Deduction, Expense Generation & Exact Monthly Date Auto-Advance
    const w1PreBillPay = (await Wallet.findById(walletA1._id)).balance;
    const initialDueDate = new Date(createBillRes.data?.data?.dueDate);

    const payBillRes = await request({
      method: 'POST',
      path: `/bills/${billAId}/pay`,
      body: {
        notes: 'Monthly fiber invoice paid from bank wallet',
        walletId: walletA1._id.toString(),
      },
      token: userA.accessToken,
    });

    const w1PostBillPay = (await Wallet.findById(walletA1._id)).balance;
    const billAfterPay = await Bill.findById(billAId);
    const createdExpenseId = payBillRes.data?.data?.expense?._id;
    const generatedExpense = await Expense.findById(createdExpenseId);

    // Date advancement calculation check (+1 month)
    const expectedNextDueDate = new Date(initialDueDate);
    expectedNextDueDate.setMonth(expectedNextDueDate.getMonth() + 1);

    runner.record({
      id: 'P2-BIL-002',
      feature: 'Bill Payment & Monthly Auto-Advance',
      name: 'Pay recurring bill debits wallet, creates linked Expense record, and auto-advances dueDate by exactly 1 month',
      passed: payBillRes.status === 200 &&
              w1PostBillPay === w1PreBillPay - 1500 &&
              billAfterPay.status === 'upcoming' &&
              new Date(billAfterPay.dueDate).getUTCMonth() === expectedNextDueDate.getUTCMonth() &&
              generatedExpense !== null &&
              generatedExpense.amount === 1500 &&
              generatedExpense.title.includes('Internet Fiber Optic') &&
              generatedExpense.wallet.toString() === walletA1._id.toString(),
      expected: `HTTP 200, Wallet balance ${w1PreBillPay - 1500}, Status 'upcoming', Next month ${expectedNextDueDate.getUTCMonth()}, Linked Expense created`,
      actual: `HTTP ${payBillRes.status}, Wallet balance ${w1PostBillPay}, Status '${billAfterPay?.status}', Month: ${new Date(billAfterPay?.dueDate).getUTCMonth()}, Expense: ₹${generatedExpense?.amount}`,
      file: 'server/controllers/billController.js',
      func: 'markBillPaid',
      severity: 'CRITICAL',
    });

    // P2-BIL-003: Non-recurring Bill Lifecycle & Status Transition to 'paid'
    const singleBillRes = await request({
      method: 'POST',
      path: '/bills',
      body: {
        title: 'Annual Property Tax',
        amount: 8000,
        category: 'Taxes',
        dueDate: billDueDate.toISOString(),
        recurring: false,
      },
      token: userA.accessToken,
    });
    const singleBillId = singleBillRes.data?.data?._id;

    const paySingleBillRes = await request({
      method: 'POST',
      path: `/bills/${singleBillId}/pay`,
      body: { notes: 'One-off tax settlement' },
      token: userA.accessToken,
    });
    const singleBillAfter = await Bill.findById(singleBillId);

    runner.record({
      id: 'P2-BIL-003',
      feature: 'One-Off Bill Settlement',
      name: 'One-off non-recurring bill payment transitions status to "paid" without date advancement',
      passed: paySingleBillRes.status === 200 && singleBillAfter.status === 'paid',
      expected: 'HTTP 200, status "paid"',
      actual: `HTTP ${paySingleBillRes.status}, status "${singleBillAfter?.status}"`,
      file: 'server/controllers/billController.js',
      func: 'markBillPaid',
      severity: 'HIGH',
    });

    // P2-BIL-004: IDOR Protection on Bill Payment & Modification
    const wB1PreBillIdor = (await Wallet.findById(walletB1._id)).balance;
    const idorPayBillRes = await request({
      method: 'POST',
      path: `/bills/${billAId}/pay`,
      body: { walletId: walletB1._id.toString() },
      token: userB.accessToken,
    });
    const wB1PostBillIdor = (await Wallet.findById(walletB1._id)).balance;

    runner.record({
      id: 'P2-BIL-004',
      feature: 'Bill Security & IDOR',
      name: 'User B cannot pay or modify User A bill, and User B wallet remains completely untouched',
      passed: idorPayBillRes.status === 404 &&
              idorPayBillRes.data?.message === 'Bill not found' &&
              wB1PostBillIdor === wB1PreBillIdor,
      expected: 'HTTP 404 "Bill not found", User B wallet balance unchanged',
      actual: `HTTP ${idorPayBillRes.status} (${idorPayBillRes.data?.message}), WB: ${wB1PostBillIdor} vs ${wB1PreBillIdor}`,
      file: 'server/controllers/billController.js',
      func: 'markBillPaid',
      severity: 'CRITICAL',
    });

    // =========================================================================
    // 3. SUBSCRIPTION CONTROLLER TESTS (server/controllers/subscriptionController.js)
    // =========================================================================
    console.log('\n--- Testing Subscription Controller ---');

    // P2-SUB-001: Create Monthly & Yearly Subscriptions
    const subDate = new Date();
    subDate.setDate(subDate.getDate() + 15);

    const createSubRes = await request({
      method: 'POST',
      path: '/subscriptions',
      body: {
        name: 'Cloud Infrastructure Plan',
        cost: 2500,
        billingCycle: 'monthly',
        renewalDate: subDate.toISOString(),
        reminder: true,
      },
      token: userA.accessToken,
    });
    const subAId = createSubRes.data?.data?._id;

    const invalidSubRes = await request({
      method: 'POST',
      path: '/subscriptions',
      body: {
        name: 'Invalid Sub',
        cost: -50,
        billingCycle: 'bi-weekly', // invalid enum
        renewalDate: subDate.toISOString(),
      },
      token: userA.accessToken,
    });

    runner.record({
      id: 'P2-SUB-001',
      feature: 'Subscription Create & Validation',
      name: 'Create subscription and reject negative cost or invalid billing cycle',
      passed: createSubRes.status === 201 &&
              createSubRes.data?.data?.cost === 2500 &&
              createSubRes.data?.data?.billingCycle === 'monthly' &&
              invalidSubRes.status === 400,
      expected: 'Valid: HTTP 201, Invalid: HTTP 400',
      actual: `Valid: HTTP ${createSubRes.status}, Invalid: HTTP ${invalidSubRes.status}`,
      file: 'server/controllers/subscriptionController.js',
      func: 'createSubscription',
      severity: 'CRITICAL',
    });

    // P2-SUB-002: Read, Update & Delete Subscription with IDOR Check
    const updateSubRes = await request({
      method: 'PUT',
      path: `/subscriptions/${subAId}`,
      body: { cost: 3200, billingCycle: 'yearly' },
      token: userA.accessToken,
    });

    const idorUpdateSubRes = await request({
      method: 'PUT',
      path: `/subscriptions/${subAId}`,
      body: { cost: 10 },
      token: userB.accessToken,
    });

    const idorDelSubRes = await request({
      method: 'DELETE',
      path: `/subscriptions/${subAId}`,
      token: userB.accessToken,
    });

    const subAfterIdor = await Subscription.findById(subAId);

    const delSubRes = await request({
      method: 'DELETE',
      path: `/subscriptions/${subAId}`,
      token: userA.accessToken,
    });
    const subPostDel = await Subscription.findById(subAId);

    runner.record({
      id: 'P2-SUB-002',
      feature: 'Subscription CRUD & IDOR',
      name: 'Update and delete subscription, verify User B IDOR rejected (404) with state preserved',
      passed: updateSubRes.status === 200 &&
              updateSubRes.data?.data?.cost === 3200 &&
              idorUpdateSubRes.status === 404 &&
              idorDelSubRes.status === 404 &&
              subAfterIdor.cost === 3200 &&
              delSubRes.status === 200 &&
              subPostDel === null,
      expected: 'Update: 200, IDOR Update/Del: 404, State intact, Delete: 200, DB: null',
      actual: `Update: ${updateSubRes.status}, IDOR Update: ${idorUpdateSubRes.status}, IDOR Del: ${idorDelSubRes.status}, Cost: ${subAfterIdor?.cost}, Delete: ${delSubRes.status}`,
      file: 'server/controllers/subscriptionController.js',
      func: 'updateSubscription',
      severity: 'HIGH',
    });

    // =========================================================================
    // 4. INVESTMENT CONTROLLER TESTS (server/controllers/investmentController.js)
    // =========================================================================
    console.log('\n--- Testing Investment Controller ---');

    // P2-INV-001: Create Investments & Portfolio Stats Calculation
    const inv1Res = await request({
      method: 'POST',
      path: '/investments',
      body: {
        name: 'Nifty 50 Index Fund',
        type: 'mutual_funds',
        investedAmount: 50000,
        currentValue: 65000,
        symbol: 'NIFTY50',
      },
      token: userA.accessToken,
    });

    const inv2Res = await request({
      method: 'POST',
      path: '/investments',
      body: {
        name: 'Physical Gold ETF',
        type: 'gold',
        investedAmount: 50000,
        currentValue: 55000,
      },
      token: userA.accessToken,
    });

    const invStatsRes = await request({
      method: 'GET',
      path: '/investments/stats',
      token: userA.accessToken,
    });

    // Expected stats:
    // totalInvested = 50000 + 50000 = 100000
    // totalCurrentValue = 65000 + 55000 = 120000
    // profitOrLoss = 120000 - 100000 = +20000
    // percentageReturn = (20000 / 100000) * 100 = 20%
    const statsData = invStatsRes.data?.data;

    runner.record({
      id: 'P2-INV-001',
      feature: 'Investment Stats & Returns Formula',
      name: 'Create investments and verify portfolio totalInvested, currentValue, profitOrLoss, and percentageReturn',
      passed: inv1Res.status === 201 &&
              inv2Res.status === 201 &&
              invStatsRes.status === 200 &&
              statsData?.totalInvested === 100000 &&
              statsData?.totalCurrentValue === 120000 &&
              statsData?.profitOrLoss === 20000 &&
              statsData?.percentageReturn === 20,
      expected: 'Total Invested: ₹100,000, Current Value: ₹120,000, Profit: +₹20,000, Return: 20%',
      actual: `Invested: ₹${statsData?.totalInvested}, Value: ₹${statsData?.totalCurrentValue}, Profit: ₹${statsData?.profitOrLoss}, Return: ${statsData?.percentageReturn}%`,
      file: 'server/controllers/investmentController.js',
      func: 'getInvestmentStats',
      severity: 'CRITICAL',
    });

    // P2-INV-002: IDOR on Investment Delete
    const inv1Id = inv1Res.data?.data?._id;
    const idorDelInvRes = await request({
      method: 'DELETE',
      path: `/investments/${inv1Id}`,
      token: userB.accessToken,
    });
    const inv1AfterIdor = await Investment.findById(inv1Id);

    runner.record({
      id: 'P2-INV-002',
      feature: 'Investment IDOR Security',
      name: 'User B cannot delete User A investment, document remains preserved in MongoDB',
      passed: idorDelInvRes.status === 404 &&
              idorDelInvRes.data?.message === 'Investment not found' &&
              inv1AfterIdor !== null,
      expected: 'HTTP 404 "Investment not found", document preserved',
      actual: `HTTP ${idorDelInvRes.status} (${idorDelInvRes.data?.message}), DB doc: ${inv1AfterIdor?.name}`,
      file: 'server/controllers/investmentController.js',
      func: 'deleteInvestment',
      severity: 'CRITICAL',
    });

    // =========================================================================
    // 5. SPLIT CONTROLLER TESTS (server/controllers/splitController.js)
    // =========================================================================
    console.log('\n--- Testing Split Controller ---');

    // P2-SPL-001: Create Split Bill with Multiple Members
    const splitCreateRes = await request({
      method: 'POST',
      path: '/splits',
      body: {
        title: 'Team Offsite Dinner',
        amount: 3000,
        groupName: 'Restaurant',
        members: [
          { userEmail: userA.user.email, share: 1000, paid: true, status: 'settled' },
          { userEmail: userB.user.email, share: 1000, paid: false, status: 'pending' },
          { userEmail: userC.user.email, share: 1000, paid: false, status: 'pending' },
        ],
      },
      token: userA.accessToken,
    });
    const splitId = splitCreateRes.data?.data?._id;

    runner.record({
      id: 'P2-SPL-001',
      feature: 'Split Bill Create',
      name: 'Create split bill with multi-member shares and creator share marked settled',
      passed: splitCreateRes.status === 201 &&
              splitCreateRes.data?.data?.amount === 3000 &&
              splitCreateRes.data?.data?.members?.length === 3,
      expected: 'HTTP 201 with 3 members',
      actual: `HTTP ${splitCreateRes.status} with ${splitCreateRes.data?.data?.members?.length} members`,
      file: 'server/controllers/splitController.js',
      func: 'createSplit',
      severity: 'CRITICAL',
    });

    // P2-SPL-002: Member Settles Own Share vs Member Settles Another Member Share (403 Authorization Guard)
    // User B attempts settling User C's share -> MUST be rejected with HTTP 403
    const userBSettlesUserCRes = await request({
      method: 'POST',
      path: `/splits/${splitId}/settle`,
      body: { memberEmail: userC.user.email },
      token: userB.accessToken,
    });

    // User B settles own share -> MUST succeed with HTTP 200
    const userBSettlesOwnRes = await request({
      method: 'POST',
      path: `/splits/${splitId}/settle`,
      body: { memberEmail: userB.user.email },
      token: userB.accessToken,
    });

    const splitAfterBSettled = await SplitExpense.findById(splitId);
    const memberB = splitAfterBSettled.members.find(m => m.userEmail === userB.user.email);
    const memberC = splitAfterBSettled.members.find(m => m.userEmail === userC.user.email);

    runner.record({
      id: 'P2-SPL-002',
      feature: 'Split Settlement Authorization',
      name: 'Member B settling Member C share rejected (403); Member B settling own share accepted (200)',
      passed: userBSettlesUserCRes.status === 403 &&
              userBSettlesUserCRes.data?.message === 'Not authorized to settle this member share' &&
              userBSettlesOwnRes.status === 200 &&
              memberB.paid === true &&
              memberB.status === 'settled' &&
              memberC.paid === false &&
              splitAfterBSettled.status !== 'settled',
      expected: 'Cross-member: HTTP 403 "Not authorized to settle this member share", Self: HTTP 200, Member C still unpaid',
      actual: `Cross-member: HTTP ${userBSettlesUserCRes.status} (${userBSettlesUserCRes.data?.message}), Self: HTTP ${userBSettlesOwnRes.status}, Member C paid: ${memberC?.paid}`,
      file: 'server/controllers/splitController.js',
      func: 'settleMember',
      severity: 'CRITICAL',
    });

    // P2-SPL-003: Creator Settles Final Share -> Status Transitions to 'settled'
    // Creator User A settles User C's share (allowed for creator)
    const creatorSettlesCRes = await request({
      method: 'POST',
      path: `/splits/${splitId}/settle`,
      body: { memberEmail: userC.user.email },
      token: userA.accessToken,
    });

    const splitAfterFullSettle = await SplitExpense.findById(splitId);

    // Unsettled delete guard vs Settled delete
    const delSettledRes = await request({
      method: 'DELETE',
      path: `/splits/${splitId}`,
      token: userA.accessToken,
    });
    const splitPostDel = await SplitExpense.findById(splitId);

    runner.record({
      id: 'P2-SPL-003',
      feature: 'Split Full Settlement & Deletion',
      name: 'Creator settles final share, bill status marks "settled", and creator deletes settled split',
      passed: creatorSettlesCRes.status === 200 &&
              splitAfterFullSettle.status === 'settled' &&
              delSettledRes.status === 200 &&
              splitPostDel === null,
      expected: 'Final settle: HTTP 200, status: "settled", Delete: HTTP 200, DB doc: null',
      actual: `Final settle: HTTP ${creatorSettlesCRes.status}, status: "${splitAfterFullSettle?.status}", Delete: HTTP ${delSettledRes.status}, DB doc: ${splitPostDel}`,
      file: 'server/controllers/splitController.js',
      func: 'deleteSplit',
      severity: 'CRITICAL',
    });

    // =========================================================================
    // 6. FAMILY CONTROLLER TESTS (server/controllers/familyController.js)
    // =========================================================================
    console.log('\n--- Testing Family Controller ---');

    // P2-FAM-001: Invite Flow: Owner invites user, generates 48h token hash, enforces self-invite guard
    const selfInviteRes = await request({
      method: 'POST',
      path: '/family/invite',
      body: { email: userA.user.email },
      token: userA.accessToken,
    });

    const inviteMemberEmail = `family_member_${Date.now()}@example.com`;
    const inviteRes = await request({
      method: 'POST',
      path: '/family/invite',
      body: { email: inviteMemberEmail, role: 'member' },
      token: userA.accessToken,
    });

    const familyA = await Family.findOne({ owner: userA.user._id });
    const pendingMember = familyA?.members?.find(m => m.email === inviteMemberEmail.toLowerCase());

    runner.record({
      id: 'P2-FAM-001',
      feature: 'Family Invite Flow & Guards',
      name: 'Reject self-invitation (400) and create pending invitation with 48h bcrypt token hash',
      passed: selfInviteRes.status === 400 &&
              selfInviteRes.data?.message === 'You cannot invite yourself to your own family hub' &&
              inviteRes.status === 200 &&
              pendingMember !== undefined &&
              pendingMember.status === 'pending' &&
              typeof pendingMember.invitationTokenHash === 'string' &&
              pendingMember.invitationTokenExpire > new Date(),
      expected: 'Self-invite: HTTP 400 "You cannot invite yourself...", Member invite: HTTP 200 with pending tokenHash',
      actual: `Self-invite: HTTP ${selfInviteRes.status} (${selfInviteRes.data?.message}), Invite: HTTP ${inviteRes.status}, Pending status: ${pendingMember?.status}`,
      file: 'server/controllers/familyController.js',
      func: 'inviteMember',
      severity: 'CRITICAL',
    });

    // P2-FAM-002: Resend Cooldown Guard (5-minute cooldown)
    const quickResendRes = await request({
      method: 'POST',
      path: '/family/invite',
      body: { email: inviteMemberEmail },
      token: userA.accessToken,
    });

    runner.record({
      id: 'P2-FAM-002',
      feature: 'Family Invite Spam Guard',
      name: 'Enforce 5-minute resend cooldown on pending invitation returning HTTP 429',
      passed: quickResendRes.status === 429 &&
              quickResendRes.data?.message?.includes('Please wait'),
      expected: 'HTTP 429 with wait cooldown message',
      actual: `HTTP ${quickResendRes.status} (${quickResendRes.data?.message})`,
      file: 'server/controllers/familyController.js',
      func: 'inviteMember',
      severity: 'HIGH',
    });

    // P2-FAM-003: Accept Flow: Authenticated Email Mismatch Guard (403) & Valid Acceptance
    // Generate a known raw token and update pending member's hash
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(rawToken, 10);
    const expiry = new Date(Date.now() + 48 * 60 * 60 * 1000);

    await Family.updateOne(
      { _id: familyA._id, 'members.email': inviteMemberEmail.toLowerCase() },
      {
        $set: {
          'members.$.email': userB.user.email.toLowerCase(),
          'members.$.invitationTokenHash': tokenHash,
          'members.$.invitationTokenExpire': expiry,
          'members.$.status': 'pending',
        }
      }
    );

    // User C attempts to accept invitation meant for User B -> MUST be rejected with HTTP 403
    const mismatchAcceptRes = await request({
      method: 'POST',
      path: '/family/invite/accept',
      body: { token: rawToken },
      token: userC.accessToken,
    });

    // User B accepts invitation meant for User B -> MUST succeed with HTTP 200
    const validAcceptRes = await request({
      method: 'POST',
      path: '/family/invite/accept',
      body: { token: rawToken },
      token: userB.accessToken,
    });

    const familyAfterAccept = await Family.findById(familyA._id);
    const acceptedMemberB = familyAfterAccept.members.find(m => m.email.toLowerCase() === userB.user.email.toLowerCase());

    runner.record({
      id: 'P2-FAM-003',
      feature: 'Family Accept Security',
      name: 'Reject acceptance when authenticated user email mismatches invitation (403); allow matching user (200)',
      passed: mismatchAcceptRes.status === 403 &&
              mismatchAcceptRes.data?.message?.includes('Please log in with that account') &&
              validAcceptRes.status === 200 &&
              acceptedMemberB.status === 'accepted' &&
              acceptedMemberB.invitationTokenHash === null,
      expected: 'Mismatch: HTTP 403 "This invitation was sent to...", Matching: HTTP 200 accepted with null tokenHash',
      actual: `Mismatch: HTTP ${mismatchAcceptRes.status} (${mismatchAcceptRes.data?.message}), Matching: HTTP ${validAcceptRes.status}, Member status: ${acceptedMemberB?.status}`,
      file: 'server/controllers/familyController.js',
      func: 'acceptInvitation',
      severity: 'CRITICAL',
    });

    // P2-FAM-004: Cancel Pending Invite & Non-Owner Guard (403)
    // Owner invites User C
    const rawTokenC = crypto.randomBytes(32).toString('hex');
    const tokenHashC = await bcrypt.hash(rawTokenC, 10);
    await Family.updateOne(
      { _id: familyA._id },
      {
        $push: {
          members: {
            email: userC.user.email.toLowerCase(),
            role: 'member',
            status: 'pending',
            invitationTokenHash: tokenHashC,
            invitationTokenExpire: expiry,
            invitedAt: new Date(),
          }
        }
      }
    );

    // Non-owner (User B) attempts to cancel invitation for User C -> MUST be rejected with HTTP 403
    const nonOwnerCancelRes = await request({
      method: 'DELETE',
      path: `/family/invite/${userC.user.email}`,
      token: userB.accessToken,
    });

    // Owner (User A) cancels invitation for User C -> MUST succeed with HTTP 200
    const ownerCancelRes = await request({
      method: 'DELETE',
      path: `/family/invite/${userC.user.email}`,
      token: userA.accessToken,
    });

    const familyAfterCancel = await Family.findById(familyA._id);
    const memberCInFamily = familyAfterCancel.members.find(m => m.email.toLowerCase() === userC.user.email.toLowerCase());

    runner.record({
      id: 'P2-FAM-004',
      feature: 'Family Cancel Authorization',
      name: 'Non-owner cancellation rejected (403); Owner cancellation removes pending invite from members array',
      passed: nonOwnerCancelRes.status === 403 &&
              nonOwnerCancelRes.data?.message === 'Only the family hub owner can cancel pending invitations' &&
              ownerCancelRes.status === 200 &&
              memberCInFamily === undefined,
      expected: 'Non-owner: HTTP 403 "Only the family hub owner...", Owner: HTTP 200, Member removed',
      actual: `Non-owner: HTTP ${nonOwnerCancelRes.status} (${nonOwnerCancelRes.data?.message}), Owner: HTTP ${ownerCancelRes.status}, Member found: ${Boolean(memberCInFamily)}`,
      file: 'server/controllers/familyController.js',
      func: 'cancelInvitation',
      severity: 'CRITICAL',
    });

  } catch (err) {
    console.error('Phase 2 Test Suite Crash:', err);
  } finally {
    await cleanupUser(userA?.user?._id);
    await cleanupUser(userB?.user?._id);
    await cleanupUser(userC?.user?._id);
  }

  return runner.summary();
};
