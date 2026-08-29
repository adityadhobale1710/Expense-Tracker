/**
 * server/tests/cross_user_security.test.mjs
 * 
 * MULTI-TENANT ISOLATION & IDOR SECURITY TEST SUITE
 * Tests:
 *   User A creates financial data across all modules.
 *   User B attempts to Read, Update, Mutate, or Delete User A's private resources.
 *   Verifies strict multitenancy scoping across all 11 business domains.
 */

import {
  request,
  createTestUser,
  createTestWallet,
  createTestCategory,
  cleanupUser,
  TestSuiteRunner,
  Budget,
  Goal,
  Bill,
  Loan,
  Subscription,
  Investment,
  SplitExpense,
} from './test_helpers.mjs';

export const runCrossUserSecurityTests = async () => {
  const runner = new TestSuiteRunner('Cross-User Data Isolation & IDOR Security');
  console.log('\n======================================================');
  console.log('  RUNNING SUITE: Cross-User Data Isolation & IDOR');
  console.log('======================================================');

  let userA, userB;

  try {
    userA = await createTestUser({ name: 'Tenant A' });
    userB = await createTestUser({ name: 'Tenant B (Attacker)' });

    // User A creates resources
    const walletA = await createTestWallet(userA.user, { name: 'Secret Savings', balance: 500000 });
    const catA = await createTestCategory(userA.user, { name: 'Confidential Category', type: 'expense' });

    const incA = await request({
      method: 'POST',
      path: '/income',
      body: { title: 'Executive Bonus', amount: 200000, category: 'Salary', walletId: walletA._id.toString(), date: new Date().toISOString() },
      token: userA.accessToken,
    });
    const incomeAId = incA.data?.data?._id;

    const expA = await request({
      method: 'POST',
      path: '/expenses',
      body: { title: 'Private Medical Treatment', amount: 50000, category: catA._id.toString(), walletId: walletA._id.toString(), paymentMethod: 'card', date: new Date().toISOString() },
      token: userA.accessToken,
    });
    const expenseAId = expA.data?.data?._id;

    const budgetA = await Budget.create({ user: userA.user._id, category: catA._id, limit: 100000, spent: 50000, period: 'monthly' });
    const goalA = await Goal.create({ user: userA.user._id, title: 'Private Swiss Vacation', targetAmount: 300000, targetDate: new Date(Date.now() + 1e8) });
    const billA = await Bill.create({ user: userA.user._id, title: 'Confidential Retainer', amount: 25000, category: 'Legal', dueDate: new Date() });
    const loanA = await Loan.create({ user: userA.user._id, name: 'Mortgage A', type: 'home', amount: 1000000, interestRate: 8, durationMonths: 120, emiAmount: 15000, remainingBalance: 900000, nextEmiDate: new Date() });
    const subA = await Subscription.create({ user: userA.user._id, name: 'Private Membership', cost: 5000, billingCycle: 'monthly', renewalDate: new Date() });
    const invA = await Investment.create({ user: userA.user._id, name: 'Apple Stocks', type: 'stocks', investedAmount: 100000, currentValue: 150000 });
    const splitA = await SplitExpense.create({ creator: userA.user._id, title: 'Executive Dinner', amount: 10000, groupName: 'Friends', members: [{ userEmail: 'other@example.com', share: 5000 }] });

    // ─────────────────────────────────────────────────────────────
    // 1. WALLETS IDOR
    // ─────────────────────────────────────────────────────────────
    const getWalletRes = await request({ method: 'GET', path: `/wallets/${walletA._id}`, token: userB.accessToken });
    runner.record({
      id: 'SEC-IDOR-WAL-001',
      feature: 'Wallets IDOR',
      name: 'User B cannot read User A wallet',
      passed: getWalletRes.status === 404,
      expected: 'HTTP 404 Not Found',
      actual: `HTTP ${getWalletRes.status}`,
      severity: 'CRITICAL',
    });

    const delWalletRes = await request({ method: 'DELETE', path: `/wallets/${walletA._id}`, token: userB.accessToken });
    runner.record({
      id: 'SEC-IDOR-WAL-002',
      feature: 'Wallets IDOR',
      name: 'User B cannot delete User A wallet',
      passed: delWalletRes.status === 404,
      expected: 'HTTP 404 Not Found',
      actual: `HTTP ${delWalletRes.status}`,
      severity: 'CRITICAL',
    });

    // ─────────────────────────────────────────────────────────────
    // 2. TRANSACTIONS (INCOME & EXPENSE) IDOR
    // ─────────────────────────────────────────────────────────────
    const getIncRes = await request({ method: 'GET', path: `/income/${incomeAId}`, token: userB.accessToken });
    runner.record({
      id: 'SEC-IDOR-INC-001',
      feature: 'Income IDOR',
      name: 'User B cannot read User A income',
      passed: getIncRes.status === 404,
      expected: 'HTTP 404 Not Found',
      actual: `HTTP ${getIncRes.status}`,
      severity: 'CRITICAL',
    });

    const putIncRes = await request({ method: 'PUT', path: `/income/${incomeAId}`, body: { title: 'Hacked', amount: 1, date: new Date().toISOString() }, token: userB.accessToken });
    runner.record({
      id: 'SEC-IDOR-INC-002',
      feature: 'Income IDOR',
      name: 'User B cannot update User A income',
      passed: putIncRes.status === 404,
      expected: 'HTTP 404 Not Found',
      actual: `HTTP ${putIncRes.status}`,
      severity: 'CRITICAL',
    });

    const getExpRes = await request({ method: 'GET', path: `/expenses/${expenseAId}`, token: userB.accessToken });
    runner.record({
      id: 'SEC-IDOR-EXP-001',
      feature: 'Expense IDOR',
      name: 'User B cannot read User A expense',
      passed: getExpRes.status === 404,
      expected: 'HTTP 404 Not Found',
      actual: `HTTP ${getExpRes.status}`,
      severity: 'CRITICAL',
    });

    const delExpRes = await request({ method: 'DELETE', path: `/expenses/${expenseAId}`, token: userB.accessToken });
    runner.record({
      id: 'SEC-IDOR-EXP-002',
      feature: 'Expense IDOR',
      name: 'User B cannot delete User A expense',
      passed: delExpRes.status === 404,
      expected: 'HTTP 404 Not Found',
      actual: `HTTP ${delExpRes.status}`,
      severity: 'CRITICAL',
    });

    // ─────────────────────────────────────────────────────────────
    // 3. BUDGETS & GOALS IDOR
    // ─────────────────────────────────────────────────────────────
    const getBudgetRes = await request({ method: 'GET', path: `/budgets/${budgetA._id}`, token: userB.accessToken });
    runner.record({
      id: 'SEC-IDOR-BUD-001',
      feature: 'Budget IDOR',
      name: 'User B cannot read User A budget',
      passed: getBudgetRes.status === 404,
      expected: 'HTTP 404 Not Found',
      actual: `HTTP ${getBudgetRes.status}`,
      severity: 'HIGH',
    });

    const getGoalRes = await request({ method: 'GET', path: `/goals/${goalA._id}`, token: userB.accessToken });
    runner.record({
      id: 'SEC-IDOR-GOA-001',
      feature: 'Goal IDOR',
      name: 'User B cannot read User A goal',
      passed: getGoalRes.status === 404,
      expected: 'HTTP 404 Not Found',
      actual: `HTTP ${getGoalRes.status}`,
      severity: 'HIGH',
    });

    const walletB = await createTestWallet(userB.user, { balance: 50000 });
    const contributeGoalRes = await request({ method: 'POST', path: `/goals/${goalA._id}/contribute`, body: { amount: 100, walletId: walletB._id.toString() }, token: userB.accessToken });
    runner.record({
      id: 'SEC-IDOR-GOA-002',
      feature: 'Goal IDOR',
      name: 'User B cannot contribute to or tamper User A goal',
      passed: contributeGoalRes.status === 404,
      expected: 'HTTP 404 Not Found',
      actual: `HTTP ${contributeGoalRes.status}`,
      severity: 'HIGH',
    });

    // ─────────────────────────────────────────────────────────────
    // 4. BILLS & LOANS IDOR
    // ─────────────────────────────────────────────────────────────
    const payBillRes = await request({ method: 'POST', path: `/bills/${billA._id}/pay`, token: userB.accessToken });
    runner.record({
      id: 'SEC-IDOR-BIL-001',
      feature: 'Bill IDOR',
      name: 'User B cannot pay or mutate User A bill',
      passed: payBillRes.status === 404,
      expected: 'HTTP 404 Not Found',
      actual: `HTTP ${payBillRes.status}`,
      severity: 'HIGH',
    });

    const payEmiRes = await request({ method: 'POST', path: `/loans/${loanA._id}/pay-emi`, token: userB.accessToken });
    runner.record({
      id: 'SEC-IDOR-LOA-001',
      feature: 'Loan IDOR',
      name: 'User B cannot pay or mutate User A loan',
      passed: payEmiRes.status === 404,
      expected: 'HTTP 404 Not Found',
      actual: `HTTP ${payEmiRes.status}`,
      severity: 'HIGH',
    });

    // ─────────────────────────────────────────────────────────────
    // 5. SUBSCRIPTIONS, INVESTMENTS, SPLITS IDOR
    // ─────────────────────────────────────────────────────────────
    const delSubRes = await request({ method: 'DELETE', path: `/subscriptions/${subA._id}`, token: userB.accessToken });
    runner.record({
      id: 'SEC-IDOR-SUB-001',
      feature: 'Subscription IDOR',
      name: 'User B cannot delete User A subscription',
      passed: delSubRes.status === 404,
      expected: 'HTTP 404 Not Found',
      actual: `HTTP ${delSubRes.status}`,
      severity: 'HIGH',
    });

    const delInvRes = await request({ method: 'DELETE', path: `/investments/${invA._id}`, token: userB.accessToken });
    runner.record({
      id: 'SEC-IDOR-INV-001',
      feature: 'Investment IDOR',
      name: 'User B cannot delete User A investment asset',
      passed: delInvRes.status === 404,
      expected: 'HTTP 404 Not Found',
      actual: `HTTP ${delInvRes.status}`,
      severity: 'HIGH',
    });

    const settleSplitRes = await request({ method: 'POST', path: `/splits/${splitA._id}/settle`, body: { memberEmail: 'other@example.com' }, token: userB.accessToken });
    runner.record({
      id: 'SEC-IDOR-SPL-001',
      feature: 'Split IDOR',
      name: 'User B cannot settle split bills they are not a part of',
      passed: settleSplitRes.status === 403 || settleSplitRes.status === 404,
      expected: 'HTTP 403 or 404 Forbidden',
      actual: `HTTP ${settleSplitRes.status}`,
      severity: 'HIGH',
    });

  } finally {
    await cleanupUser(userA?.user?._id);
    await cleanupUser(userB?.user?._id);
  }

  return runner.summary();
};

if (process.argv[1] && process.argv[1].endsWith('cross_user_security.test.mjs')) {
  runCrossUserSecurityTests()
    .then((summary) => {
      console.log('\n--- CROSS-USER SECURITY SUMMARY ---');
      console.log(`Total: ${summary.total} | Passed: ${summary.passed} | Failed: ${summary.failed}`);
      process.exit(summary.failed > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error('Fatal test runner error:', err);
      process.exit(1);
    });
}
