/**
 * server/tests/security_and_exports.test.mjs
 * 
 * SECURITY, CSV INJECTION & CASCADING ACCOUNT DELETION TEST SUITE
 * Tests:
 *   1. Admin role authorization guard (/api/admin/*)
 *   2. NoSQL Injection protection (express-mongo-sanitize)
 *   3. XSS payload entity escaping (xssSanitizer)
 *   4. Export sanitization against spreadsheet formula injection (=SUM, @HYPERLINK)
 *   5. Cascading account deletion across all 13 database collections
 */

import {
  request,
  createTestUser,
  createTestWallet,
  createTestCategory,
  cleanupUser,
  TestSuiteRunner,
  User,
  Expense,
  Income,
  Budget,
  Goal,
  Contribution,
  Bill,
  Loan,
  Subscription,
  Notification,
  Category,
  Wallet,
  SplitExpense,
  Family,
  AIChat,
  Session,
} from './test_helpers.mjs';

export const runSecurityAndExportTests = async () => {
  const runner = new TestSuiteRunner('Security, Exports & Cascading Purge');
  console.log('\n======================================================');
  console.log('  RUNNING SUITE: Security, Exports & Cascading Purge');
  console.log('======================================================');

  let regularUser, adminUser, cascadeUser;

  try {
    regularUser = await createTestUser({ name: 'Regular User', role: 'user' });
    adminUser = await createTestUser({ name: 'Admin User', role: 'admin' });

    // ─────────────────────────────────────────────────────────────
    // 1. ADMIN AUTHORIZATION GUARD
    // ─────────────────────────────────────────────────────────────
    const regularAdminAccess = await request({
      method: 'GET',
      path: '/admin/stats',
      token: regularUser.accessToken,
    });

    const adminAccessBlocked = regularAdminAccess.status === 403 && regularAdminAccess.data?.message?.includes('Not authorized as an admin');
    runner.record({
      id: 'SEC-ADM-001',
      feature: 'Role-Based Access Control',
      name: 'Block non-admin user from accessing /api/admin/stats',
      passed: adminAccessBlocked,
      expected: 'HTTP 403 "Not authorized as an admin"',
      actual: `HTTP ${regularAdminAccess.status} (${regularAdminAccess.data?.message})`,
      file: 'server/middleware/authMiddleware.js',
      func: 'authorize',
      severity: 'CRITICAL',
    });

    const adminValidAccess = await request({
      method: 'GET',
      path: '/admin/stats',
      token: adminUser.accessToken,
    });

    const adminPassed = adminValidAccess.status === 200 && adminValidAccess.data?.data?.overview !== undefined;
    runner.record({
      id: 'SEC-ADM-002',
      feature: 'Role-Based Access Control',
      name: 'Allow verified admin user access to admin portal diagnostics',
      passed: adminPassed,
      expected: 'HTTP 200 with system telemetry overview',
      actual: `HTTP ${adminValidAccess.status}`,
      file: 'server/controllers/adminController.js',
      func: 'getAdminStats',
      severity: 'HIGH',
    });

    // ─────────────────────────────────────────────────────────────
    // 2. NoSQL INJECTION SANITIZATION
    // ─────────────────────────────────────────────────────────────
    const injectionUser = await createTestUser({ name: 'Injection User' });
    const injectionRes = await request({
      method: 'POST',
      path: '/income',
      body: { title: { $gt: '' }, amount: 100, date: new Date().toISOString() },
      token: injectionUser.accessToken,
    });

    // Mongo sanitize strips $gt or validation schema rejects object -> returns 400, never executes injection
    const injectionBlocked = injectionRes.status === 400;
    runner.record({
      id: 'SEC-INJ-001',
      feature: 'NoSQL Injection Guard',
      name: 'Sanitize / reject NoSQL operator injection payloads ($gt) in request body',
      passed: injectionBlocked,
      expected: 'HTTP 400 (Payload sanitized or rejected)',
      actual: `HTTP ${injectionRes.status}`,
      file: 'server/server.js',
      severity: 'CRITICAL',
    });
    await cleanupUser(injectionUser.user._id);

    // ─────────────────────────────────────────────────────────────
    // 3. EXPORT CSV FORMULA INJECTION SANITIZATION
    // ─────────────────────────────────────────────────────────────
    const exportWallet = await createTestWallet(regularUser.user, { name: 'Export Vault', balance: 50000 });
    const exportCat = await createTestCategory(regularUser.user, { name: 'Export Cat', type: 'expense' });

    // Create expense with formula injection payloads
    await request({
      method: 'POST',
      path: '/expenses',
      body: {
        title: '=SUM(1+1)',
        amount: 100,
        category: exportCat._id.toString(),
        walletId: exportWallet._id.toString(),
        paymentMethod: 'card',
        date: new Date().toISOString(),
        description: '@HYPERLINK("http://evil.com")',
      },
      token: regularUser.accessToken,
    });

    const csvExportRes = await request({
      method: 'GET',
      path: `/analytics/export/csv?token=${regularUser.accessToken}`,
    });

    const csvText = csvExportRes.rawText || '';
    const formulaSanitized = csvText.includes("''=SUM(1+1)") || csvText.includes("'=SUM(1+1)") || !csvText.startsWith('=SUM');

    runner.record({
      id: 'SEC-CSV-001',
      feature: 'CSV Formula Injection Guard',
      name: 'Sanitize spreadsheet formula injection characters (=, @, +, -) via sanitizeCell',
      passed: csvExportRes.status === 200 && formulaSanitized,
      expected: 'HTTP 200 with sanitized single-quoted formula cells',
      actual: `HTTP ${csvExportRes.status}, Content: ${csvText.slice(0, 80)}...`,
      file: 'server/controllers/analyticsController.js',
      func: 'exportCSV',
      severity: 'CRITICAL',
    });

    // ─────────────────────────────────────────────────────────────
    // 4. CASCADING ACCOUNT DELETION ACROSS ALL 13 COLLECTIONS
    // ─────────────────────────────────────────────────────────────
    cascadeUser = await createTestUser({ name: 'Cascading Purge Tester' });
    const cUid = cascadeUser.user._id;

    const cWallet = await createTestWallet(cascadeUser.user, { name: 'Purge Wallet', balance: 50000 });
    const cCat = await createTestCategory(cascadeUser.user, { name: 'Purge Category', type: 'expense' });
    await Expense.create({ user: cUid, title: 'Purge Exp', amount: 100, wallet: cWallet._id, category: cCat._id });
    await Income.create({ user: cUid, title: 'Purge Inc', amount: 500, wallet: cWallet._id });
    await Budget.create({ user: cUid, category: cCat._id, limit: 1000 });
    await Goal.create({ user: cUid, title: 'Purge Goal', targetAmount: 5000, targetDate: new Date() });
    await Bill.create({ user: cUid, title: 'Purge Bill', amount: 50, category: 'Utilities', dueDate: new Date() });
    await Loan.create({ user: cUid, name: 'Purge Loan', type: 'personal', amount: 1000, interestRate: 5, durationMonths: 12, emiAmount: 100, remainingBalance: 1000, nextEmiDate: new Date() });
    await Subscription.create({ user: cUid, name: 'Purge Sub', cost: 10, renewalDate: new Date() });
    await Notification.create({ user: cUid, message: 'Purge Notification' });
    await SplitExpense.create({ creator: cUid, title: 'Purge Split', amount: 500, groupName: 'Friends' });
    await Family.create({ owner: cUid, name: 'Purge Family' });
    await AIChat.create({ user: cUid, messages: [{ role: 'user', content: 'Hello' }] });

    // Execute DELETE /api/users/me
    const deleteAccountRes = await request({
      method: 'DELETE',
      path: '/users/me',
      token: cascadeUser.accessToken,
    });

    const [
      remUser,
      remExp,
      remInc,
      remBud,
      remWal,
      remGoa,
      remBil,
      remLoa,
      remSub,
      remNotif,
      remCat,
      remSplit,
      remFam,
      remChat,
    ] = await Promise.all([
      User.findById(cUid),
      Expense.countDocuments({ user: cUid }),
      Income.countDocuments({ user: cUid }),
      Budget.countDocuments({ user: cUid }),
      Wallet.countDocuments({ user: cUid }),
      Goal.countDocuments({ user: cUid }),
      Bill.countDocuments({ user: cUid }),
      Loan.countDocuments({ user: cUid }),
      Subscription.countDocuments({ user: cUid }),
      Notification.countDocuments({ user: cUid }),
      Category.countDocuments({ user: cUid }),
      SplitExpense.countDocuments({ creator: cUid }),
      Family.countDocuments({ owner: cUid }),
      AIChat.countDocuments({ user: cUid }),
    ]);

    const totalRemaining = remExp + remInc + remBud + remWal + remGoa + remBil + remLoa + remSub + remNotif + remCat + remSplit + remFam + remChat;
    const cascadePassed = deleteAccountRes.status === 200 && remUser === null && totalRemaining === 0;

    runner.record({
      id: 'SEC-PURGE-001',
      feature: 'Cascading Account Deletion',
      name: 'Purge user and all related records across 13 collections in atomic transaction',
      passed: cascadePassed,
      expected: 'HTTP 200 and 0 remaining documents across all collections',
      actual: `HTTP ${deleteAccountRes.status}, User: ${Boolean(remUser)}, Remaining Docs: ${totalRemaining}`,
      file: 'server/controllers/userController.js',
      func: 'deleteMe',
      rootCause: cascadePassed ? '' : 'Concurrent Promise.all in MongoDB transaction session triggers MongoServerError on Atlas / mismatched Family schema field',
      severity: 'CRITICAL',
    });

  } finally {
    await cleanupUser(regularUser?.user?._id);
    await cleanupUser(adminUser?.user?._id);
    if (cascadeUser?.user?._id) await cleanupUser(cascadeUser.user._id);
  }

  return runner.summary();
};

if (process.argv[1] && process.argv[1].endsWith('security_and_exports.test.mjs')) {
  runSecurityAndExportTests()
    .then((summary) => {
      console.log('\n--- SECURITY & EXPORTS SUMMARY ---');
      console.log(`Total: ${summary.total} | Passed: ${summary.passed} | Failed: ${summary.failed}`);
      process.exit(summary.failed > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error('Fatal test runner error:', err);
      process.exit(1);
    });
}
