/**
 * server/tests/expense_crud.test.mjs
 * 
 * MANDATORY EXPENSE CRUD LIFECYCLE & REBALANCING TEST SUITE
 * Exercises real API endpoints -> controllers -> database.
 * Tests:
 *   1. CREATE -> Verifies exact wallet balance deduction (-₹2,500)
 *   2. READ -> Single record, list pagination, and cross-user isolation
 *   3. UPDATE (Upward) -> Verifies net difference deduction (-₹500)
 *   4. UPDATE (Downward) -> Verifies net difference refund (+₹1,000)
 *   5. WALLET SWITCH -> Attempting switch to Wallet B with insufficient balance is rejected cleanly
 *   6. DELETE -> Verifies wallet refund (+₹2,000) back to pre-expense initial balance
 *   7. Edge cases & boundary validation
 */

import {
  request,
  createTestUser,
  createTestWallet,
  createTestCategory,
  cleanupUser,
  TestSuiteRunner,
  Expense,
  Wallet,
} from './test_helpers.mjs';

export const runExpenseCRUDTests = async () => {
  const runner = new TestSuiteRunner('Expense CRUD & Financial Integrity');
  console.log('\n======================================================');
  console.log('  RUNNING SUITE: Expense CRUD & Financial Integrity');
  console.log('======================================================');

  let userA, userB, walletA, walletB, categoryA, createdExpenseId;
  const initialBalanceA = 100000; // ₹100,000
  const initialBalanceB = 2000;   // ₹2,000

  try {
    // Setup
    userA = await createTestUser({ name: 'Expense Tester A' });
    userB = await createTestUser({ name: 'Expense Tester B' });
    walletA = await createTestWallet(userA.user, { name: 'Main Checking', balance: initialBalanceA });
    walletB = await createTestWallet(userA.user, { name: 'Petty Cash', balance: initialBalanceB });
    categoryA = await createTestCategory(userA.user, { name: 'Food & Dining', type: 'expense' });

    // ─────────────────────────────────────────────────────────────
    // 1. CREATE EXPENSE (₹2,500)
    // ─────────────────────────────────────────────────────────────
    const createPayload = {
      title: 'Automated Test Grocery',
      amount: 2500,
      category: categoryA._id.toString(),
      walletId: walletA._id.toString(),
      paymentMethod: 'card',
      date: new Date().toISOString(),
      description: 'Supermarket weekly grocery run',
      tags: ['groceries', 'household'],
    };

    const createRes = await request({
      method: 'POST',
      path: '/expenses',
      body: createPayload,
      token: userA.accessToken,
    });

    const createPassed = createRes.status === 201 && createRes.data?.success && createRes.data?.data?._id;
    createdExpenseId = createRes.data?.data?._id;

    runner.record({
      id: 'EXP-CRUD-001',
      feature: 'Expense Create',
      name: 'Create Expense via API with Wallet Deduction',
      passed: createPassed,
      expected: 'HTTP 201 with created expense object',
      actual: `HTTP ${createRes.status}`,
      status: createRes.status,
      response: createRes.data,
      file: 'server/controllers/expenseController.js',
      func: 'addExpense',
      severity: 'CRITICAL',
    });

    // Check DB Record
    const dbExpense1 = await Expense.findById(createdExpenseId);
    const dbRecordValid = dbExpense1 && dbExpense1.amount === 2500 && dbExpense1.user.toString() === userA.user._id.toString();

    runner.record({
      id: 'EXP-CRUD-002',
      feature: 'Expense Persistence',
      name: 'Verify Expense persisted in MongoDB with correct user ownership',
      passed: Boolean(dbRecordValid),
      expected: 'DB Expense record with amount 2500 and user ownership',
      actual: dbExpense1 ? `amount: ${dbExpense1.amount}, user: ${dbExpense1.user}` : 'null',
      file: 'server/models/Expense.js',
      severity: 'CRITICAL',
    });

    // Check Wallet Balance: Expected = 100000 - 2500 = 97500
    const walletAfterCreate = await Wallet.findById(walletA._id);
    const expectedBalanceAfterCreate = initialBalanceA - 2500;
    const createBalanceMatches = walletAfterCreate.balance === expectedBalanceAfterCreate;

    runner.record({
      id: 'EXP-CRUD-003',
      feature: 'Wallet Deduction Invariant',
      name: 'Verify wallet balance decremented by exactly expense amount',
      passed: createBalanceMatches,
      expected: `₹${expectedBalanceAfterCreate.toLocaleString()}`,
      actual: `₹${walletAfterCreate.balance.toLocaleString()}`,
      file: 'server/controllers/expenseController.js',
      func: 'addExpense',
      severity: 'CRITICAL',
    });

    // ─────────────────────────────────────────────────────────────
    // 2. READ EXPENSE
    // ─────────────────────────────────────────────────────────────
    const readSingleRes = await request({
      method: 'GET',
      path: `/expenses/${createdExpenseId}`,
      token: userA.accessToken,
    });

    const readSinglePassed = readSingleRes.status === 200 && readSingleRes.data?.data?._id === createdExpenseId && readSingleRes.data?.data?.amount === 2500;

    runner.record({
      id: 'EXP-CRUD-004',
      feature: 'Expense Read Single',
      name: 'Retrieve single expense by ID',
      passed: readSinglePassed,
      expected: 'HTTP 200 with expense details',
      actual: `HTTP ${readSingleRes.status}`,
      status: readSingleRes.status,
      file: 'server/controllers/expenseController.js',
      func: 'getExpenseById',
      severity: 'HIGH',
    });

    const listRes = await request({
      method: 'GET',
      path: '/expenses?page=1&limit=10',
      token: userA.accessToken,
    });

    const listPassed = listRes.status === 200 && Array.isArray(listRes.data?.data?.expenses) && listRes.data.data.expenses.some((e) => e._id === createdExpenseId);

    runner.record({
      id: 'EXP-CRUD-005',
      feature: 'Expense Read List',
      name: 'List expenses with pagination and summary',
      passed: listPassed,
      expected: 'HTTP 200 containing created expense in array',
      actual: `HTTP ${listRes.status} (Count: ${listRes.data?.data?.expenses?.length || 0})`,
      status: listRes.status,
      file: 'server/controllers/expenseController.js',
      func: 'getExpenses',
      severity: 'HIGH',
    });

    const crossUserReadRes = await request({
      method: 'GET',
      path: `/expenses/${createdExpenseId}`,
      token: userB.accessToken,
    });

    const crossReadBlocked = crossUserReadRes.status === 404;

    runner.record({
      id: 'EXP-CRUD-006',
      feature: 'Expense Authorization Isolation',
      name: 'Prevent User B from reading User A expense (IDOR check)',
      passed: crossReadBlocked,
      expected: 'HTTP 404 Not Found',
      actual: `HTTP ${crossUserReadRes.status}`,
      status: crossUserReadRes.status,
      file: 'server/controllers/expenseController.js',
      func: 'getExpenseById',
      severity: 'CRITICAL',
    });

    // ─────────────────────────────────────────────────────────────
    // 3. UPDATE EXPENSE (UPWARD: ₹2,500 -> ₹3,000)
    // ─────────────────────────────────────────────────────────────
    const updateUpPayload = {
      title: 'Automated Test Grocery (Added Items)',
      amount: 3000,
      category: categoryA._id.toString(),
      walletId: walletA._id.toString(),
      paymentMethod: 'card',
      date: new Date().toISOString(),
      description: 'Added organic snacks',
    };

    const updateUpRes = await request({
      method: 'PUT',
      path: `/expenses/${createdExpenseId}`,
      body: updateUpPayload,
      token: userA.accessToken,
    });

    const updateUpPassed = updateUpRes.status === 200 && updateUpRes.data?.data?.amount === 3000;

    runner.record({
      id: 'EXP-CRUD-007',
      feature: 'Expense Update Upward',
      name: 'Update Expense Amount Upward (₹2,500 -> ₹3,000)',
      passed: updateUpPassed,
      expected: 'HTTP 200 with updated amount 3000',
      actual: `HTTP ${updateUpRes.status} (Amount: ${updateUpRes.data?.data?.amount})`,
      status: updateUpRes.status,
      file: 'server/controllers/expenseController.js',
      func: 'updateExpense',
      severity: 'CRITICAL',
    });

    const walletAfterUpdateUp = await Wallet.findById(walletA._id);
    const expectedBalanceAfterUp = expectedBalanceAfterCreate - (3000 - 2500);
    const updateUpBalanceMatches = walletAfterUpdateUp.balance === expectedBalanceAfterUp;

    runner.record({
      id: 'EXP-CRUD-008',
      feature: 'Wallet Difference Deduction (Upward)',
      name: 'Verify wallet debited ONLY by difference (-₹500) not entire amount',
      passed: updateUpBalanceMatches,
      expected: `₹${expectedBalanceAfterUp.toLocaleString()}`,
      actual: `₹${walletAfterUpdateUp.balance.toLocaleString()}`,
      file: 'server/controllers/expenseController.js',
      func: 'updateExpense',
      severity: 'CRITICAL',
    });

    // ─────────────────────────────────────────────────────────────
    // 4. UPDATE EXPENSE (DOWNWARD: ₹3,000 -> ₹2,000)
    // ─────────────────────────────────────────────────────────────
    const updateDownPayload = {
      title: 'Automated Test Grocery (Returned Items)',
      amount: 2000,
      category: categoryA._id.toString(),
      walletId: walletA._id.toString(),
      paymentMethod: 'card',
      date: new Date().toISOString(),
      description: 'Returned broken item, ₹1000 refund',
    };

    const updateDownRes = await request({
      method: 'PUT',
      path: `/expenses/${createdExpenseId}`,
      body: updateDownPayload,
      token: userA.accessToken,
    });

    const updateDownPassed = updateDownRes.status === 200 && updateDownRes.data?.data?.amount === 2000;

    runner.record({
      id: 'EXP-CRUD-009',
      feature: 'Expense Update Downward',
      name: 'Update Expense Amount Downward (₹3,000 -> ₹2,000)',
      passed: updateDownPassed,
      expected: 'HTTP 200 with updated amount 2000',
      actual: `HTTP ${updateDownRes.status} (Amount: ${updateDownRes.data?.data?.amount})`,
      status: updateDownRes.status,
      file: 'server/controllers/expenseController.js',
      func: 'updateExpense',
      severity: 'CRITICAL',
    });

    const walletAfterUpdateDown = await Wallet.findById(walletA._id);
    const expectedBalanceAfterDown = expectedBalanceAfterUp + (3000 - 2000);
    const updateDownBalanceMatches = walletAfterUpdateDown.balance === expectedBalanceAfterDown;

    runner.record({
      id: 'EXP-CRUD-010',
      feature: 'Wallet Difference Refund (Downward)',
      name: 'Verify wallet credited by difference (+₹1,000) upon expense reduction',
      passed: updateDownBalanceMatches,
      expected: `₹${expectedBalanceAfterDown.toLocaleString()}`,
      actual: `₹${walletAfterUpdateDown.balance.toLocaleString()}`,
      file: 'server/controllers/expenseController.js',
      func: 'updateExpense',
      severity: 'CRITICAL',
    });

    // ─────────────────────────────────────────────────────────────
    // 5. WALLET-SWITCHING CONSISTENCY TEST
    // ─────────────────────────────────────────────────────────────
    const switchExpenseRes = await request({
      method: 'POST',
      path: '/expenses',
      body: {
        title: 'High Value Item',
        amount: 5500,
        category: categoryA._id.toString(),
        walletId: walletA._id.toString(),
        paymentMethod: 'card',
        date: new Date().toISOString(),
      },
      token: userA.accessToken,
    });
    const switchExpenseId = switchExpenseRes.data?.data?._id;

    // Attempt to switch the ₹5,500 expense to Wallet B (balance ₹2,000)
    const switchFailRes = await request({
      method: 'PUT',
      path: `/expenses/${switchExpenseId}`,
      body: {
        title: 'High Value Item',
        amount: 5500,
        category: categoryA._id.toString(),
        walletId: walletB._id.toString(),
        paymentMethod: 'card',
        date: new Date().toISOString(),
      },
      token: userA.accessToken,
    });

    const switchRejectedCleanly = switchFailRes.status === 400 && switchFailRes.data?.message?.includes('Insufficient wallet balance');

    runner.record({
      id: 'EXP-CRUD-011',
      feature: 'Wallet Switch Insufficient Balance Guard',
      name: 'Reject switching expense to another wallet with insufficient funds',
      passed: switchRejectedCleanly,
      expected: 'HTTP 400 "Insufficient wallet balance"',
      actual: `HTTP ${switchFailRes.status} (${switchFailRes.data?.message})`,
      status: switchFailRes.status,
      file: 'server/controllers/expenseController.js',
      func: 'updateExpense',
      severity: 'CRITICAL',
    });

    const walletAAfterFailedSwitch = await Wallet.findById(walletA._id);
    const expectedWalletAAfterSwitch = expectedBalanceAfterDown - 5500;
    const walletAUnchanged = walletAAfterFailedSwitch.balance === expectedWalletAAfterSwitch;

    runner.record({
      id: 'EXP-CRUD-012',
      feature: 'Atomic Integrity on Rejected Switch',
      name: 'Verify source wallet balance remains untouched after rejected wallet switch',
      passed: walletAUnchanged,
      expected: `₹${expectedWalletAAfterSwitch.toLocaleString()}`,
      actual: `₹${walletAAfterFailedSwitch.balance.toLocaleString()}`,
      file: 'server/controllers/expenseController.js',
      func: 'updateExpense',
      severity: 'CRITICAL',
    });

    await request({ method: 'DELETE', path: `/expenses/${switchExpenseId}`, token: userA.accessToken });

    // ─────────────────────────────────────────────────────────────
    // 6. DELETE EXPENSE (₹2,000)
    // ─────────────────────────────────────────────────────────────
    const deleteRes = await request({
      method: 'DELETE',
      path: `/expenses/${createdExpenseId}`,
      token: userA.accessToken,
    });

    const deletePassed = deleteRes.status === 200 && deleteRes.data?.success;

    runner.record({
      id: 'EXP-CRUD-013',
      feature: 'Expense Delete',
      name: 'Delete Expense via API',
      passed: deletePassed,
      expected: 'HTTP 200 Success',
      actual: `HTTP ${deleteRes.status}`,
      status: deleteRes.status,
      file: 'server/controllers/expenseController.js',
      func: 'deleteExpense',
      severity: 'CRITICAL',
    });

    const dbExpenseDeleted = await Expense.findById(createdExpenseId);
    const dbDeletedPassed = dbExpenseDeleted === null;

    runner.record({
      id: 'EXP-CRUD-014',
      feature: 'Expense Removal Verification',
      name: 'Verify expense record is completely removed from MongoDB',
      passed: dbDeletedPassed,
      expected: 'null (document does not exist)',
      actual: dbExpenseDeleted ? 'Document still exists' : 'null',
      file: 'server/models/Expense.js',
      severity: 'CRITICAL',
    });

    const walletAfterDelete = await Wallet.findById(walletA._id);
    const finalBalanceMatches = walletAfterDelete.balance === initialBalanceA;

    runner.record({
      id: 'EXP-CRUD-015',
      feature: 'Wallet Invariant Restoration',
      name: 'Verify wallet balance restored exactly to pre-expense initial balance',
      passed: finalBalanceMatches,
      expected: `₹${initialBalanceA.toLocaleString()}`,
      actual: `₹${walletAfterDelete.balance.toLocaleString()}`,
      file: 'server/controllers/expenseController.js',
      func: 'deleteExpense',
      severity: 'CRITICAL',
    });

    // ─────────────────────────────────────────────────────────────
    // 7. EXPENSE EDGE CASES & BOUNDARY VALIDATION
    // ─────────────────────────────────────────────────────────────
    const overspendRes = await request({
      method: 'POST',
      path: '/expenses',
      body: {
        title: 'Overspending Test',
        amount: 500000,
        category: categoryA._id.toString(),
        walletId: walletA._id.toString(),
        paymentMethod: 'card',
        date: new Date().toISOString(),
      },
      token: userA.accessToken,
    });
    runner.record({
      id: 'EXP-EDGE-001',
      feature: 'Validation',
      name: 'Reject expense creation exceeding available wallet balance',
      passed: overspendRes.status === 400 && overspendRes.data?.message?.includes('Insufficient wallet balance'),
      expected: 'HTTP 400 "Insufficient wallet balance"',
      actual: `HTTP ${overspendRes.status} (${overspendRes.data?.message})`,
      file: 'server/controllers/expenseController.js',
      severity: 'CRITICAL',
    });

    const zeroAmountRes = await request({
      method: 'POST',
      path: '/expenses',
      body: { title: 'Zero Expense', amount: 0, walletId: walletA._id.toString(), category: categoryA._id.toString(), paymentMethod: 'cash', date: new Date().toISOString() },
      token: userA.accessToken,
    });
    runner.record({
      id: 'EXP-EDGE-002',
      feature: 'Validation',
      name: 'Reject expense amount = 0',
      passed: zeroAmountRes.status === 400,
      expected: 'HTTP 400 Validation Error',
      actual: `HTTP ${zeroAmountRes.status}`,
      file: 'server/middleware/schemas.js',
      severity: 'HIGH',
    });

    const negAmountRes = await request({
      method: 'POST',
      path: '/expenses',
      body: { title: 'Negative Expense', amount: -200, walletId: walletA._id.toString(), category: categoryA._id.toString(), paymentMethod: 'cash', date: new Date().toISOString() },
      token: userA.accessToken,
    });
    runner.record({
      id: 'EXP-EDGE-003',
      feature: 'Validation',
      name: 'Reject negative expense amount (-200)',
      passed: negAmountRes.status === 400,
      expected: 'HTTP 400 Validation Error',
      actual: `HTTP ${negAmountRes.status}`,
      file: 'server/middleware/schemas.js',
      severity: 'HIGH',
    });

    const fakeWalletRes = await request({
      method: 'POST',
      path: '/expenses',
      body: { title: 'Ghost Wallet Expense', amount: 500, walletId: '666666666666666666666666', category: categoryA._id.toString(), paymentMethod: 'cash', date: new Date().toISOString() },
      token: userA.accessToken,
    });
    runner.record({
      id: 'EXP-EDGE-004',
      feature: 'Validation',
      name: 'Reject nonexistent wallet ID',
      passed: fakeWalletRes.status === 404 || fakeWalletRes.status === 400,
      expected: 'HTTP 404 or 400 Wallet not found',
      actual: `HTTP ${fakeWalletRes.status}`,
      file: 'server/controllers/expenseController.js',
      severity: 'HIGH',
    });

    const hijackWalletRes = await request({
      method: 'POST',
      path: '/expenses',
      body: { title: 'Hijacked Wallet Expense', amount: 500, walletId: walletA._id.toString(), category: categoryA._id.toString(), paymentMethod: 'cash', date: new Date().toISOString() },
      token: userB.accessToken,
    });
    runner.record({
      id: 'EXP-EDGE-005',
      feature: 'Security',
      name: 'Reject unauthorized wallet ID belonging to another user',
      passed: hijackWalletRes.status === 404 || hijackWalletRes.status === 403,
      expected: 'HTTP 404 or 403 Wallet not found / unauthorized',
      actual: `HTTP ${hijackWalletRes.status}`,
      file: 'server/controllers/expenseController.js',
      severity: 'CRITICAL',
    });

    const missingCatRes = await request({
      method: 'POST',
      path: '/expenses',
      body: { title: 'No Category Expense', amount: 500, walletId: walletA._id.toString(), paymentMethod: 'cash', date: new Date().toISOString() },
      token: userA.accessToken,
    });
    runner.record({
      id: 'EXP-EDGE-006',
      feature: 'Validation',
      name: 'Reject missing category',
      passed: missingCatRes.status === 400,
      expected: 'HTTP 400 Category is required',
      actual: `HTTP ${missingCatRes.status}`,
      file: 'server/middleware/schemas.js',
      severity: 'HIGH',
    });

  } finally {
    await cleanupUser(userA?.user?._id);
    await cleanupUser(userB?.user?._id);
  }

  return runner.summary();
};

if (process.argv[1] && process.argv[1].endsWith('expense_crud.test.mjs')) {
  runExpenseCRUDTests()
    .then((summary) => {
      console.log('\n--- EXPENSE CRUD SUMMARY ---');
      console.log(`Total: ${summary.total} | Passed: ${summary.passed} | Failed: ${summary.failed}`);
      process.exit(summary.failed > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error('Fatal test runner error:', err);
      process.exit(1);
    });
}
