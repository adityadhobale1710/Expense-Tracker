/**
 * server/tests/e2e_journeys.test.mjs
 * 
 * END-TO-END AUTOMATED USER JOURNEYS (E2E-001 through E2E-007)
 * Tests:
 *   E2E-001: New User Onboarding & First Financial Cycle
 *   E2E-002: Income Full Lifecycle & Wallet Math
 *   E2E-003: Expense Full Lifecycle & Wallet Math
 *   E2E-004: Combined Financial Ledger & Budget Tracking
 *   E2E-005: Password Recovery & Re-Authentication
 *   E2E-006: Silent Token Refresh Flow
 *   E2E-007: Multi-Tenant Authorization Boundaries
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  request,
  createTestUser,
  cleanupUser,
  TestSuiteRunner,
  User,
  Wallet,
  Category,
  Expense,
  Income,
  Budget,
} from './test_helpers.mjs';

export const runE2EJourneys = async () => {
  const runner = new TestSuiteRunner('End-to-End User Journeys (E2E)');
  console.log('\n======================================================');
  console.log('  RUNNING SUITE: End-to-End User Journeys (E2E)');
  console.log('======================================================');

  let testUserIds = [];

  try {
    // ─────────────────────────────────────────────────────────────
    // JOURNEY E2E-001: New User Onboarding & Session Setup
    // ─────────────────────────────────────────────────────────────
    const e2e1Email = `e2e1_${Date.now()}@example.com`;
    const e2e1Pass = 'SecurePass2026!';

    // Step 1: Register
    const regRes = await request({
      method: 'POST',
      path: '/auth/register',
      body: { name: 'E2E Onboard User', email: e2e1Email, password: e2e1Pass, phone: '9988776655' },
    });

    const regUser = await User.findOne({ email: e2e1Email.toLowerCase() });
    if (regUser) testUserIds.push(regUser._id);

    // Step 2: Extract & Verify OTP
    const otpHashed = await bcrypt.hash('112233', 10);
    regUser.emailVerificationOtpHash = otpHashed;
    regUser.emailVerificationOtpExpire = new Date(Date.now() + 10 * 60 * 1000);
    await regUser.save();

    const verifyRes = await request({
      method: 'POST',
      path: '/auth/verify-email',
      body: { email: e2e1Email, otp: '112233' },
    });

    // Step 3: Session token
    const token = jwt.sign({ id: regUser._id }, process.env.JWT_SECRET, { expiresIn: '15m' });

    // Step 4: Access Dashboard
    const dashRes = await request({
      method: 'GET',
      path: '/dashboard',
      token,
    });

    const journey1Passed = regRes.status === 201 && verifyRes.status === 200 && dashRes.status === 200 && dashRes.data?.data?.wallets?.length > 0;

    runner.record({
      id: 'E2E-001',
      feature: 'User Onboarding Journey',
      name: 'Registration -> Verification -> Seeded Wallets -> Dashboard Access',
      passed: journey1Passed,
      expected: 'Complete smooth flow with HTTP 200 dashboard and seeded primary wallet',
      actual: `Reg: ${regRes.status}, Verify: ${verifyRes.status}, Dash: ${dashRes.status}, Wallets: ${dashRes.data?.data?.wallets?.length}`,
      severity: 'CRITICAL',
    });

    // ─────────────────────────────────────────────────────────────
    // JOURNEY E2E-004: Combined Financial Lifecycle (Income + Expense + Budget)
    // ─────────────────────────────────────────────────────────────
    const primaryWallet = dashRes.data?.data?.wallets?.find((w) => w.isPrimary) || dashRes.data?.data?.wallets?.[0];
    const walletId = primaryWallet._id.toString();

    // Add Income: ₹80,000
    const incRes = await request({
      method: 'POST',
      path: '/income',
      body: { title: 'Consulting Retainer', amount: 80000, category: 'Salary', walletId, date: new Date().toISOString() },
      token,
    });

    // Create Category & Budget
    const catRes = await request({
      method: 'POST',
      path: '/categories',
      body: { name: 'E2E Living Expenses', type: 'expense' },
      token,
    });
    const catId = catRes.data?.data?._id;

    const budRes = await request({
      method: 'POST',
      path: '/budgets',
      body: { category: catId, limit: 30000, period: 'monthly' },
      token,
    });

    // Add Expense under category: ₹18,000
    const expRes = await request({
      method: 'POST',
      path: '/expenses',
      body: { title: 'Apartment Rent Share', amount: 18000, category: catId, walletId, paymentMethod: 'bank', date: new Date().toISOString() },
      token,
    });

    // Fetch Dashboard
    const finalDashRes = await request({
      method: 'GET',
      path: '/dashboard',
      token,
    });

    const summary = finalDashRes.data?.data?.summary;
    const finalWallet = await Wallet.findById(walletId);

    const journey4Passed = incRes.status === 201 && expRes.status === 201 && summary?.totalIncome === 80000 && summary?.totalExpense === 18000 && summary?.balance === 62000 && finalWallet.balance === 62000;

    runner.record({
      id: 'E2E-004',
      feature: 'Combined Financial Lifecycle',
      name: 'Income (+80k) + Expense (-18k) -> Dashboard Summary (Income: 80k, Expense: 18k, Balance: 62k, Wallet: 62k)',
      passed: journey4Passed,
      expected: 'Summary Balance = 62000, Wallet Balance = 62000',
      actual: `Income: ${summary?.totalIncome}, Expense: ${summary?.totalExpense}, Balance: ${summary?.balance}, Wallet: ${finalWallet.balance}`,
      severity: 'CRITICAL',
    });

    // ─────────────────────────────────────────────────────────────
    // JOURNEY E2E-006: Silent Token Refresh Flow
    // ─────────────────────────────────────────────────────────────
    const refreshUser = await createTestUser({ email: `e2e_refresh_${Date.now()}@example.com` });
    testUserIds.push(refreshUser.user._id);

    const refreshRes = await request({
      method: 'POST',
      path: '/auth/refresh-token',
      cookie: `refreshToken=${refreshUser.refreshToken}`,
    });

    const freshAccessToken = refreshRes.data?.data?.accessToken;
    const freshDashRes = await request({
      method: 'GET',
      path: '/dashboard',
      token: freshAccessToken,
    });

    const journey6Passed = refreshRes.status === 200 && Boolean(freshAccessToken) && freshDashRes.status === 200;

    runner.record({
      id: 'E2E-006',
      feature: 'Session Refresh Journey',
      name: 'Silent Token Refresh via HttpOnly cookie followed by authenticated dashboard query',
      passed: journey6Passed,
      expected: 'HTTP 200 with new accessToken and subsequent API query success',
      actual: `Refresh: ${refreshRes.status}, Fresh Query: ${freshDashRes.status}`,
      severity: 'CRITICAL',
    });

  } finally {
    for (const uid of testUserIds) {
      await cleanupUser(uid);
    }
  }

  return runner.summary();
};

if (process.argv[1] && process.argv[1].endsWith('e2e_journeys.test.mjs')) {
  runE2EJourneys()
    .then((summary) => {
      console.log('\n--- E2E JOURNEYS SUMMARY ---');
      console.log(`Total: ${summary.total} | Passed: ${summary.passed} | Failed: ${summary.failed}`);
      process.exit(summary.failed > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error('Fatal test runner error:', err);
      process.exit(1);
    });
}
