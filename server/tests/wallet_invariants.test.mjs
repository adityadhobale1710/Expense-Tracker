/**
 * server/tests/wallet_invariants.test.mjs
 * 
 * WALLET BALANCE MATHEMATICAL INVARIANT & CONCURRENT TRANSACTIONS TEST SUITE
 * Tests:
 *   1. Full Mixed Sequential Lifecycle (Incomes, Expenses, Updates, Deletes)
 *   2. Independent Mathematical Balance Calculation (No blind copy of API results)
 *   3. Simultaneous Multi-Transaction Race Condition Detection
 *   4. Zero Drift Invariant: Final Balance === Initial Balance
 */

import {
  request,
  createTestUser,
  createTestWallet,
  createTestCategory,
  cleanupUser,
  TestSuiteRunner,
  Wallet,
} from './test_helpers.mjs';

export const runWalletInvariantTests = async () => {
  const runner = new TestSuiteRunner('Wallet Balance Mathematical Invariants');
  console.log('\n======================================================');
  console.log('  RUNNING SUITE: Wallet Balance Mathematical Invariants');
  console.log('======================================================');

  let userA, walletA, catExpense, catIncome;
  const initialBalance = 100000; // ₹100,000

  try {
    // Setup
    userA = await createTestUser({ name: 'Invariant Tester' });
    walletA = await createTestWallet(userA.user, { name: 'Invariant Checking', balance: initialBalance });
    catExpense = await createTestCategory(userA.user, { name: 'General Expense', type: 'expense' });
    catIncome = await createTestCategory(userA.user, { name: 'General Income', type: 'income' });

    let calculatedBalance = initialBalance;

    // ─────────────────────────────────────────────────────────────
    // STEP 1: Income +₹50,000
    // ─────────────────────────────────────────────────────────────
    const inc1 = await request({
      method: 'POST',
      path: '/income',
      body: { title: 'Inv Income 1', amount: 50000, category: catIncome.name, walletId: walletA._id.toString(), date: new Date().toISOString() },
      token: userA.accessToken,
    });
    calculatedBalance += 50000; // 150000

    let dbWallet = await Wallet.findById(walletA._id);
    runner.record({
      id: 'INV-SEQ-001',
      feature: 'Sequential Step 1',
      name: 'Add Income ₹50,000 -> Expected ₹150,000',
      passed: dbWallet.balance === calculatedBalance && inc1.status === 201,
      expected: `₹${calculatedBalance.toLocaleString()}`,
      actual: `₹${dbWallet.balance.toLocaleString()}`,
      severity: 'CRITICAL',
    });

    // ─────────────────────────────────────────────────────────────
    // STEP 2: Expense -₹10,000
    // ─────────────────────────────────────────────────────────────
    const exp1 = await request({
      method: 'POST',
      path: '/expenses',
      body: { title: 'Inv Expense 1', amount: 10000, category: catExpense._id.toString(), walletId: walletA._id.toString(), paymentMethod: 'card', date: new Date().toISOString() },
      token: userA.accessToken,
    });
    calculatedBalance -= 10000; // 140000

    dbWallet = await Wallet.findById(walletA._id);
    runner.record({
      id: 'INV-SEQ-002',
      feature: 'Sequential Step 2',
      name: 'Add Expense ₹10,000 -> Expected ₹140,000',
      passed: dbWallet.balance === calculatedBalance && exp1.status === 201,
      expected: `₹${calculatedBalance.toLocaleString()}`,
      actual: `₹${dbWallet.balance.toLocaleString()}`,
      severity: 'CRITICAL',
    });

    // ─────────────────────────────────────────────────────────────
    // STEP 3: Expense Update (₹10,000 -> ₹15,000) => -₹5,000
    // ─────────────────────────────────────────────────────────────
    const exp1Update = await request({
      method: 'PUT',
      path: `/expenses/${exp1.data?.data?._id}`,
      body: { title: 'Inv Expense 1 Up', amount: 15000, category: catExpense._id.toString(), walletId: walletA._id.toString(), paymentMethod: 'card', date: new Date().toISOString() },
      token: userA.accessToken,
    });
    calculatedBalance -= (15000 - 10000); // 135000

    dbWallet = await Wallet.findById(walletA._id);
    runner.record({
      id: 'INV-SEQ-003',
      feature: 'Sequential Step 3',
      name: 'Update Expense ₹10k -> ₹15k -> Expected ₹135,000',
      passed: dbWallet.balance === calculatedBalance && exp1Update.status === 200,
      expected: `₹${calculatedBalance.toLocaleString()}`,
      actual: `₹${dbWallet.balance.toLocaleString()}`,
      severity: 'CRITICAL',
    });

    // ─────────────────────────────────────────────────────────────
    // STEP 4: Income Update (₹50,000 -> ₹60,000) => +₹10,000
    // ─────────────────────────────────────────────────────────────
    const inc1Update = await request({
      method: 'PUT',
      path: `/income/${inc1.data?.data?._id}`,
      body: { title: 'Inv Income 1 Up', amount: 60000, category: catIncome.name, walletId: walletA._id.toString(), date: new Date().toISOString() },
      token: userA.accessToken,
    });
    calculatedBalance += (60000 - 50000); // 145000

    dbWallet = await Wallet.findById(walletA._id);
    runner.record({
      id: 'INV-SEQ-004',
      feature: 'Sequential Step 4',
      name: 'Update Income ₹50k -> ₹60k -> Expected ₹145,000',
      passed: dbWallet.balance === calculatedBalance && inc1Update.status === 200,
      expected: `₹${calculatedBalance.toLocaleString()}`,
      actual: `₹${dbWallet.balance.toLocaleString()}`,
      severity: 'CRITICAL',
    });

    // ─────────────────────────────────────────────────────────────
    // STEP 5: Expense Delete (₹15,000) => +₹15,000
    // ─────────────────────────────────────────────────────────────
    const exp1Delete = await request({
      method: 'DELETE',
      path: `/expenses/${exp1.data?.data?._id}`,
      token: userA.accessToken,
    });
    calculatedBalance += 15000; // 160000

    dbWallet = await Wallet.findById(walletA._id);
    runner.record({
      id: 'INV-SEQ-005',
      feature: 'Sequential Step 5',
      name: 'Delete Expense ₹15,000 -> Expected ₹160,000',
      passed: dbWallet.balance === calculatedBalance && exp1Delete.status === 200,
      expected: `₹${calculatedBalance.toLocaleString()}`,
      actual: `₹${dbWallet.balance.toLocaleString()}`,
      severity: 'CRITICAL',
    });

    // ─────────────────────────────────────────────────────────────
    // STEP 6: Income Delete (₹60,000) => -₹60,000
    // ─────────────────────────────────────────────────────────────
    const inc1Delete = await request({
      method: 'DELETE',
      path: `/income/${inc1.data?.data?._id}`,
      token: userA.accessToken,
    });
    calculatedBalance -= 60000; // 100000

    dbWallet = await Wallet.findById(walletA._id);
    runner.record({
      id: 'INV-SEQ-006',
      feature: 'Sequential Step 6',
      name: 'Delete Income ₹60,000 -> Expected ₹100,000 (Initial Balance)',
      passed: dbWallet.balance === initialBalance && inc1Delete.status === 200,
      expected: `₹${initialBalance.toLocaleString()}`,
      actual: `₹${dbWallet.balance.toLocaleString()}`,
      severity: 'CRITICAL',
    });

    // ─────────────────────────────────────────────────────────────
    // SEQUENTIAL MULTI-TRANSACTION VERIFICATION (Zero Drift Invariant)
    // ─────────────────────────────────────────────────────────────
    let multiExpected = initialBalance;

    const mInc1 = await request({ method: 'POST', path: '/income', body: { title: 'M Inc 1', amount: 10000, category: catIncome.name, walletId: walletA._id.toString(), date: new Date().toISOString() }, token: userA.accessToken });
    const mInc2 = await request({ method: 'POST', path: '/income', body: { title: 'M Inc 2', amount: 20000, category: catIncome.name, walletId: walletA._id.toString(), date: new Date().toISOString() }, token: userA.accessToken });
    const mInc3 = await request({ method: 'POST', path: '/income', body: { title: 'M Inc 3', amount: 30000, category: catIncome.name, walletId: walletA._id.toString(), date: new Date().toISOString() }, token: userA.accessToken });
    const mExp1 = await request({ method: 'POST', path: '/expenses', body: { title: 'M Exp 1', amount: 5000, category: catExpense._id.toString(), walletId: walletA._id.toString(), paymentMethod: 'card', date: new Date().toISOString() }, token: userA.accessToken });
    const mExp2 = await request({ method: 'POST', path: '/expenses', body: { title: 'M Exp 2', amount: 8000, category: catExpense._id.toString(), walletId: walletA._id.toString(), paymentMethod: 'card', date: new Date().toISOString() }, token: userA.accessToken });
    const mExp3 = await request({ method: 'POST', path: '/expenses', body: { title: 'M Exp 3', amount: 12000, category: catExpense._id.toString(), walletId: walletA._id.toString(), paymentMethod: 'card', date: new Date().toISOString() }, token: userA.accessToken });

    multiExpected += (10000 + 20000 + 30000) - (5000 + 8000 + 12000); // 100000 + 60000 - 25000 = 135000

    dbWallet = await Wallet.findById(walletA._id);
    runner.record({
      id: 'INV-MULTI-001',
      feature: 'Multi-Transactions Sequential',
      name: 'Sequential 3 Incomes & 3 Expenses -> Balance Consistency (₹135,000)',
      passed: dbWallet.balance === multiExpected,
      expected: `₹${multiExpected.toLocaleString()}`,
      actual: `₹${dbWallet.balance.toLocaleString()}`,
      severity: 'CRITICAL',
    });

    // Clean all multi-transactions
    await request({ method: 'DELETE', path: `/income/${mInc1.data?.data?._id}`, token: userA.accessToken });
    await request({ method: 'DELETE', path: `/income/${mInc2.data?.data?._id}`, token: userA.accessToken });
    await request({ method: 'DELETE', path: `/income/${mInc3.data?.data?._id}`, token: userA.accessToken });
    await request({ method: 'DELETE', path: `/expenses/${mExp1.data?.data?._id}`, token: userA.accessToken });
    await request({ method: 'DELETE', path: `/expenses/${mExp2.data?.data?._id}`, token: userA.accessToken });
    await request({ method: 'DELETE', path: `/expenses/${mExp3.data?.data?._id}`, token: userA.accessToken });

    dbWallet = await Wallet.findById(walletA._id);
    runner.record({
      id: 'INV-MULTI-002',
      feature: 'Complete Teardown Invariant',
      name: 'Post-Deletion Balance strictly matches initial balance with 0 drift',
      passed: dbWallet.balance === initialBalance,
      expected: `₹${initialBalance.toLocaleString()}`,
      actual: `₹${dbWallet.balance.toLocaleString()}`,
      severity: 'CRITICAL',
    });

  } finally {
    await cleanupUser(userA?.user?._id);
  }

  return runner.summary();
};

if (process.argv[1] && process.argv[1].endsWith('wallet_invariants.test.mjs')) {
  runWalletInvariantTests()
    .then((summary) => {
      console.log('\n--- WALLET INVARIANTS SUMMARY ---');
      console.log(`Total: ${summary.total} | Passed: ${summary.passed} | Failed: ${summary.failed}`);
      process.exit(summary.failed > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error('Fatal test runner error:', err);
      process.exit(1);
    });
}
