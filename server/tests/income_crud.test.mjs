/**
 * server/tests/income_crud.test.mjs
 * 
 * MANDATORY INCOME CRUD LIFECYCLE & REBALANCING TEST SUITE
 * Exercises real API endpoints -> controllers -> database.
 * Tests:
 *   1. CREATE -> Verifies exact wallet balance addition (+₹50,000)
 *   2. READ -> Single record & list pagination & cross-user isolation
 *   3. UPDATE (Upward) -> Verifies net difference (+₹10,000) rebalancing (not entire ₹60,000)
 *   4. UPDATE (Downward) -> Verifies net difference deduction (-₹20,000) rebalancing
 *   5. DELETE -> Verifies wallet reversal (-₹40,000) back to original balance
 *   6. Insufficient balance reversal protection
 *   7. Edge cases & boundary validation
 */

import {
  request,
  createTestUser,
  createTestWallet,
  createTestCategory,
  cleanupUser,
  TestSuiteRunner,
  Income,
  Wallet,
} from './test_helpers.mjs';

export const runIncomeCRUDTests = async () => {
  const runner = new TestSuiteRunner('Income CRUD & Financial Integrity');
  console.log('\n======================================================');
  console.log('  RUNNING SUITE: Income CRUD & Financial Integrity');
  console.log('======================================================');

  let userA, userB, walletA, categoryA, createdIncomeId;
  const initialBalance = 100000; // ₹100,000

  try {
    // Setup
    userA = await createTestUser({ name: 'Income Tester A' });
    userB = await createTestUser({ name: 'Income Tester B' });
    walletA = await createTestWallet(userA.user, { name: 'Main Salary Account', balance: initialBalance });
    categoryA = await createTestCategory(userA.user, { name: 'Salary', type: 'income' });

    // ─────────────────────────────────────────────────────────────
    // 1. CREATE INCOME (₹50,000)
    // ─────────────────────────────────────────────────────────────
    const createPayload = {
      title: 'Automated Test Salary',
      amount: 50000,
      category: categoryA.name,
      walletId: walletA._id.toString(),
      source: 'Tech Corp LLC',
      paymentMethod: 'bank',
      date: new Date().toISOString(),
      description: 'Monthly direct deposit paycheck',
    };

    const createRes = await request({
      method: 'POST',
      path: '/income',
      body: createPayload,
      token: userA.accessToken,
    });

    const createPassed = createRes.status === 201 && createRes.data?.success && createRes.data?.data?._id;
    createdIncomeId = createRes.data?.data?._id;

    runner.record({
      id: 'INC-CRUD-001',
      feature: 'Income Create',
      name: 'Create Income via API with Wallet Crediting',
      passed: createPassed,
      expected: 'HTTP 201 with created income object',
      actual: `HTTP ${createRes.status}`,
      status: createRes.status,
      response: createRes.data,
      file: 'server/controllers/incomeController.js',
      func: 'addIncome',
      severity: 'CRITICAL',
    });

    // Check DB Record
    const dbIncome1 = await Income.findById(createdIncomeId);
    const dbRecordValid = dbIncome1 && dbIncome1.amount === 50000 && dbIncome1.user.toString() === userA.user._id.toString();

    runner.record({
      id: 'INC-CRUD-002',
      feature: 'Income Persistence',
      name: 'Verify Income persisted in MongoDB with correct user ownership',
      passed: Boolean(dbRecordValid),
      expected: 'DB Income record with amount 50000 and user ownership',
      actual: dbIncome1 ? `amount: ${dbIncome1.amount}, user: ${dbIncome1.user}` : 'null',
      file: 'server/models/Income.js',
      severity: 'CRITICAL',
    });

    // Check Wallet Balance: Expected = 100000 + 50000 = 150000
    const walletAfterCreate = await Wallet.findById(walletA._id);
    const expectedBalanceAfterCreate = initialBalance + 50000;
    const createBalanceMatches = walletAfterCreate.balance === expectedBalanceAfterCreate;

    runner.record({
      id: 'INC-CRUD-003',
      feature: 'Wallet Crediting Invariant',
      name: 'Verify wallet balance incremented by exactly income amount',
      passed: createBalanceMatches,
      expected: `₹${expectedBalanceAfterCreate.toLocaleString()}`,
      actual: `₹${walletAfterCreate.balance.toLocaleString()}`,
      file: 'server/controllers/incomeController.js',
      func: 'addIncome',
      severity: 'CRITICAL',
    });

    // ─────────────────────────────────────────────────────────────
    // 2. READ INCOME
    // ─────────────────────────────────────────────────────────────
    const readSingleRes = await request({
      method: 'GET',
      path: `/income/${createdIncomeId}`,
      token: userA.accessToken,
    });

    const readSinglePassed = readSingleRes.status === 200 && readSingleRes.data?.data?._id === createdIncomeId && readSingleRes.data?.data?.amount === 50000;

    runner.record({
      id: 'INC-CRUD-004',
      feature: 'Income Read Single',
      name: 'Retrieve single income by ID',
      passed: readSinglePassed,
      expected: 'HTTP 200 with income details',
      actual: `HTTP ${readSingleRes.status}`,
      status: readSingleRes.status,
      file: 'server/controllers/incomeController.js',
      func: 'getIncomeById',
      severity: 'HIGH',
    });

    const listRes = await request({
      method: 'GET',
      path: '/income?page=1&limit=10',
      token: userA.accessToken,
    });

    const listPassed = listRes.status === 200 && Array.isArray(listRes.data?.data?.incomes) && listRes.data.data.incomes.some((i) => i._id === createdIncomeId);

    runner.record({
      id: 'INC-CRUD-005',
      feature: 'Income Read List',
      name: 'List incomes with pagination and total aggregation',
      passed: listPassed,
      expected: 'HTTP 200 containing created income in array',
      actual: `HTTP ${listRes.status} (Count: ${listRes.data?.data?.incomes?.length || 0})`,
      status: listRes.status,
      file: 'server/controllers/incomeController.js',
      func: 'getIncomes',
      severity: 'HIGH',
    });

    const crossUserReadRes = await request({
      method: 'GET',
      path: `/income/${createdIncomeId}`,
      token: userB.accessToken,
    });

    const crossReadBlocked = crossUserReadRes.status === 404;

    runner.record({
      id: 'INC-CRUD-006',
      feature: 'Income Authorization Isolation',
      name: 'Prevent User B from reading User A income (IDOR check)',
      passed: crossReadBlocked,
      expected: 'HTTP 404 Not Found',
      actual: `HTTP ${crossUserReadRes.status}`,
      status: crossUserReadRes.status,
      file: 'server/controllers/incomeController.js',
      func: 'getIncomeById',
      severity: 'CRITICAL',
    });

    // ─────────────────────────────────────────────────────────────
    // 3. UPDATE INCOME (UPWARD: ₹50,000 -> ₹60,000)
    // ─────────────────────────────────────────────────────────────
    const updateUpPayload = {
      title: 'Automated Test Salary (Revised + Bonus)',
      amount: 60000,
      category: categoryA.name,
      walletId: walletA._id.toString(),
      date: new Date().toISOString(),
      description: 'Updated with ₹10,000 performance bonus',
    };

    const updateUpRes = await request({
      method: 'PUT',
      path: `/income/${createdIncomeId}`,
      body: updateUpPayload,
      token: userA.accessToken,
    });

    const updateUpPassed = updateUpRes.status === 200 && updateUpRes.data?.data?.amount === 60000;

    runner.record({
      id: 'INC-CRUD-007',
      feature: 'Income Update Upward',
      name: 'Update Income Amount Upward (₹50k -> ₹60k)',
      passed: updateUpPassed,
      expected: 'HTTP 200 with updated amount 60000',
      actual: `HTTP ${updateUpRes.status} (Amount: ${updateUpRes.data?.data?.amount})`,
      status: updateUpRes.status,
      file: 'server/controllers/incomeController.js',
      func: 'updateIncome',
      severity: 'CRITICAL',
    });

    const walletAfterUpdateUp = await Wallet.findById(walletA._id);
    const expectedBalanceAfterUp = expectedBalanceAfterCreate + (60000 - 50000);
    const updateUpBalanceMatches = walletAfterUpdateUp.balance === expectedBalanceAfterUp;

    runner.record({
      id: 'INC-CRUD-008',
      feature: 'Wallet Difference Rebalancing (Upward)',
      name: 'Verify wallet adjusted ONLY by difference (+₹10,000) not entire amount',
      passed: updateUpBalanceMatches,
      expected: `₹${expectedBalanceAfterUp.toLocaleString()}`,
      actual: `₹${walletAfterUpdateUp.balance.toLocaleString()}`,
      file: 'server/controllers/incomeController.js',
      func: 'updateIncome',
      severity: 'CRITICAL',
    });

    // ─────────────────────────────────────────────────────────────
    // 4. UPDATE INCOME (DOWNWARD: ₹60,000 -> ₹40,000)
    // ─────────────────────────────────────────────────────────────
    const updateDownPayload = {
      title: 'Automated Test Salary (Part-time)',
      amount: 40000,
      category: categoryA.name,
      walletId: walletA._id.toString(),
      date: new Date().toISOString(),
      description: 'Reduced to part-time base',
    };

    const updateDownRes = await request({
      method: 'PUT',
      path: `/income/${createdIncomeId}`,
      body: updateDownPayload,
      token: userA.accessToken,
    });

    const updateDownPassed = updateDownRes.status === 200 && updateDownRes.data?.data?.amount === 40000;

    runner.record({
      id: 'INC-CRUD-009',
      feature: 'Income Update Downward',
      name: 'Update Income Amount Downward (₹60k -> ₹40k)',
      passed: updateDownPassed,
      expected: 'HTTP 200 with updated amount 40000',
      actual: `HTTP ${updateDownRes.status} (Amount: ${updateDownRes.data?.data?.amount})`,
      status: updateDownRes.status,
      file: 'server/controllers/incomeController.js',
      func: 'updateIncome',
      severity: 'CRITICAL',
    });

    const walletAfterUpdateDown = await Wallet.findById(walletA._id);
    const expectedBalanceAfterDown = expectedBalanceAfterUp + (40000 - 60000);
    const updateDownBalanceMatches = walletAfterUpdateDown.balance === expectedBalanceAfterDown;

    runner.record({
      id: 'INC-CRUD-010',
      feature: 'Wallet Difference Rebalancing (Downward)',
      name: 'Verify wallet adjusted downward by difference (-₹20,000)',
      passed: updateDownBalanceMatches,
      expected: `₹${expectedBalanceAfterDown.toLocaleString()}`,
      actual: `₹${walletAfterUpdateDown.balance.toLocaleString()}`,
      file: 'server/controllers/incomeController.js',
      func: 'updateIncome',
      severity: 'CRITICAL',
    });

    // ─────────────────────────────────────────────────────────────
    // 5. DELETE INCOME (₹40,000)
    // ─────────────────────────────────────────────────────────────
    const deleteRes = await request({
      method: 'DELETE',
      path: `/income/${createdIncomeId}`,
      token: userA.accessToken,
    });

    const deletePassed = deleteRes.status === 200 && deleteRes.data?.success;

    runner.record({
      id: 'INC-CRUD-011',
      feature: 'Income Delete',
      name: 'Delete Income via API',
      passed: deletePassed,
      expected: 'HTTP 200 Success',
      actual: `HTTP ${deleteRes.status}`,
      status: deleteRes.status,
      file: 'server/controllers/incomeController.js',
      func: 'deleteIncome',
      severity: 'CRITICAL',
    });

    const dbIncomeDeleted = await Income.findById(createdIncomeId);
    const dbDeletedPassed = dbIncomeDeleted === null;

    runner.record({
      id: 'INC-CRUD-012',
      feature: 'Income Removal Verification',
      name: 'Verify income record is completely removed from MongoDB',
      passed: dbDeletedPassed,
      expected: 'null (document does not exist)',
      actual: dbIncomeDeleted ? 'Document still exists' : 'null',
      file: 'server/models/Income.js',
      severity: 'CRITICAL',
    });

    const walletAfterDelete = await Wallet.findById(walletA._id);
    const finalBalanceMatches = walletAfterDelete.balance === initialBalance;

    runner.record({
      id: 'INC-CRUD-013',
      feature: 'Wallet Invariant Restoration',
      name: 'Verify wallet balance restored exactly to pre-income initial balance',
      passed: finalBalanceMatches,
      expected: `₹${initialBalance.toLocaleString()}`,
      actual: `₹${walletAfterDelete.balance.toLocaleString()}`,
      file: 'server/controllers/incomeController.js',
      func: 'deleteIncome',
      severity: 'CRITICAL',
    });

    // ─────────────────────────────────────────────────────────────
    // 6. INSUFFICIENT BALANCE ON INCOME REVERSAL
    // ─────────────────────────────────────────────────────────────
    const lowWallet = await createTestWallet(userA.user, { name: 'Low Balance Wallet', balance: 5000 });
    const incToReverse = await request({
      method: 'POST',
      path: '/income',
      body: {
        title: 'Temp Income',
        amount: 10000,
        category: categoryA.name,
        date: new Date().toISOString(),
        walletId: lowWallet._id.toString(),
      },
      token: userA.accessToken,
    });
    const incToReverseId = incToReverse.data?.data?._id;

    // Manually drain the wallet balance to ₹2,000 (money was spent elsewhere)
    await Wallet.findByIdAndUpdate(lowWallet._id, { balance: 2000 });

    const failedDeleteRes = await request({
      method: 'DELETE',
      path: `/income/${incToReverseId}`,
      token: userA.accessToken,
    });

    const deleteBlockedForInsufficient = failedDeleteRes.status === 400 && failedDeleteRes.data?.message?.includes('Insufficient wallet balance');

    runner.record({
      id: 'INC-CRUD-014',
      feature: 'Insufficient Balance Deletion Guard',
      name: 'Block income deletion if wallet balance is insufficient to reverse amount',
      passed: deleteBlockedForInsufficient,
      expected: 'HTTP 400 "Insufficient wallet balance to reverse this income"',
      actual: `HTTP ${failedDeleteRes.status} (${failedDeleteRes.data?.message})`,
      status: failedDeleteRes.status,
      file: 'server/controllers/incomeController.js',
      func: 'deleteIncome',
      severity: 'HIGH',
    });

    // ─────────────────────────────────────────────────────────────
    // 7. INCOME EDGE CASES & BOUNDARY VALIDATION
    // ─────────────────────────────────────────────────────────────
    const zeroAmountRes = await request({
      method: 'POST',
      path: '/income',
      body: { title: 'Zero Income', amount: 0, date: new Date().toISOString(), walletId: walletA._id.toString() },
      token: userA.accessToken,
    });
    runner.record({
      id: 'INC-EDGE-001',
      feature: 'Validation',
      name: 'Reject amount = 0',
      passed: zeroAmountRes.status === 400,
      expected: 'HTTP 400 Validation Error',
      actual: `HTTP ${zeroAmountRes.status}`,
      file: 'server/middleware/schemas.js',
      severity: 'HIGH',
    });

    const negAmountRes = await request({
      method: 'POST',
      path: '/income',
      body: { title: 'Negative Income', amount: -500, date: new Date().toISOString(), walletId: walletA._id.toString() },
      token: userA.accessToken,
    });
    runner.record({
      id: 'INC-EDGE-002',
      feature: 'Validation',
      name: 'Reject negative amount (-500)',
      passed: negAmountRes.status === 400,
      expected: 'HTTP 400 Validation Error',
      actual: `HTTP ${negAmountRes.status}`,
      file: 'server/middleware/schemas.js',
      severity: 'HIGH',
    });

    const fakeWalletRes = await request({
      method: 'POST',
      path: '/income',
      body: { title: 'Ghost Wallet Income', amount: 1000, date: new Date().toISOString(), walletId: '666666666666666666666666' },
      token: userA.accessToken,
    });
    runner.record({
      id: 'INC-EDGE-003',
      feature: 'Validation',
      name: 'Reject nonexistent wallet ID',
      passed: fakeWalletRes.status === 404 || fakeWalletRes.status === 400,
      expected: 'HTTP 404 or 400 Wallet not found',
      actual: `HTTP ${fakeWalletRes.status}`,
      file: 'server/controllers/incomeController.js',
      severity: 'HIGH',
    });

    const hijackWalletRes = await request({
      method: 'POST',
      path: '/income',
      body: { title: 'Hijacked Wallet Income', amount: 1000, date: new Date().toISOString(), walletId: walletA._id.toString() },
      token: userB.accessToken,
    });
    runner.record({
      id: 'INC-EDGE-004',
      feature: 'Security',
      name: 'Reject unauthorized wallet ID belonging to another user',
      passed: hijackWalletRes.status === 404 || hijackWalletRes.status === 403,
      expected: 'HTTP 404 or 403 Wallet not found / unauthorized',
      actual: `HTTP ${hijackWalletRes.status}`,
      file: 'server/controllers/incomeController.js',
      severity: 'CRITICAL',
    });

    const missingTitleRes = await request({
      method: 'POST',
      path: '/income',
      body: { amount: 1000, date: new Date().toISOString(), walletId: walletA._id.toString() },
      token: userA.accessToken,
    });
    runner.record({
      id: 'INC-EDGE-005',
      feature: 'Validation',
      name: 'Reject missing title',
      passed: missingTitleRes.status === 400,
      expected: 'HTTP 400 Title is required',
      actual: `HTTP ${missingTitleRes.status}`,
      file: 'server/middleware/schemas.js',
      severity: 'HIGH',
    });

  } finally {
    await cleanupUser(userA?.user?._id);
    await cleanupUser(userB?.user?._id);
  }

  return runner.summary();
};

if (process.argv[1] && process.argv[1].endsWith('income_crud.test.mjs')) {
  runIncomeCRUDTests()
    .then((summary) => {
      console.log('\n--- INCOME CRUD SUMMARY ---');
      console.log(`Total: ${summary.total} | Passed: ${summary.passed} | Failed: ${summary.failed}`);
      process.exit(summary.failed > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error('Fatal test runner error:', err);
      process.exit(1);
    });
}
