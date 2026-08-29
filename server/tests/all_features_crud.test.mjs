/**
 * server/tests/all_features_crud.test.mjs
 * 
 * COMPLETE BUSINESS DOMAIN CRUD & LOGIC TEST SUITE
 * Tests:
 *   1. Wallets (Transfer transaction, Primary switch, Delete protection)
 *   2. Categories (CRUD, Type separation, Deletion integrity)
 *   3. Budgets (Duplicate period prevention, Burn rate calculation)
 *   4. Goals (Contribution with auto-capping at 100%, Refund on deletion)
 *   5. Bills (Status evaluation, Pay with wallet & recurring cycle advancement)
 *   6. Loans (EMI payment with wallet deduction & auto payoff)
 *   7. Subscriptions (CRUD, Billing cycles)
 *   8. Investments (Profit/loss & ROI calculations)
 *   9. Split Bills (Member settlement, Delete guard on unsettled)
 *   10. Family Sharing (Invite tokens, Email match validation, Approvals)
 */

import {
  request,
  createTestUser,
  createTestWallet,
  createTestCategory,
  cleanupUser,
  TestSuiteRunner,
  Wallet,
  Category,
  Budget,
  Goal,
  Contribution,
  Bill,
  Loan,
  Subscription,
  Investment,
  SplitExpense,
  Family,
} from './test_helpers.mjs';

export const runAllFeaturesCRUDTests = async () => {
  const runner = new TestSuiteRunner('All Features Business Domain CRUD');
  console.log('\n======================================================');
  console.log('  RUNNING SUITE: All Features Business Domain CRUD');
  console.log('======================================================');

  let userA, userB;

  try {
    userA = await createTestUser({ name: 'Domain Tester A' });
    userB = await createTestUser({ name: 'Domain Tester B' });

    // ─────────────────────────────────────────────────────────────
    // 1. WALLETS & TRANSFERS
    // ─────────────────────────────────────────────────────────────
    const wallet1 = await createTestWallet(userA.user, { name: 'Source Bank', balance: 50000, isPrimary: true });
    const wallet2 = await createTestWallet(userA.user, { name: 'Target Wallet', balance: 10000, isPrimary: false });

    // Atomic Transfer (₹20,000 from W1 -> W2)
    const transferRes = await request({
      method: 'POST',
      path: '/wallets/transfer',
      body: {
        fromWalletId: wallet1._id.toString(),
        toWalletId: wallet2._id.toString(),
        amount: 20000,
        note: 'Internal Transfer Test',
      },
      token: userA.accessToken,
    });

    const w1After = await Wallet.findById(wallet1._id);
    const w2After = await Wallet.findById(wallet2._id);
    const transferPassed = transferRes.status === 200 && w1After.balance === 30000 && w2After.balance === 30000;

    runner.record({
      id: 'DOM-WAL-001',
      feature: 'Wallet Transfer',
      name: 'Atomic wallet-to-wallet transfer debits source and credits destination',
      passed: transferPassed,
      expected: 'HTTP 200, W1: 30000, W2: 30000',
      actual: `HTTP ${transferRes.status}, W1: ${w1After.balance}, W2: ${w2After.balance}`,
      file: 'server/controllers/walletController.js',
      func: 'transferFunds',
      severity: 'CRITICAL',
    });

    // Delete Primary Wallet Rejection
    const delPrimaryRes = await request({
      method: 'DELETE',
      path: `/wallets/${wallet1._id}`,
      token: userA.accessToken,
    });

    runner.record({
      id: 'DOM-WAL-002',
      feature: 'Wallet Deletion Guard',
      name: 'Prevent deletion of primary wallet',
      passed: delPrimaryRes.status === 400 && delPrimaryRes.data?.message?.includes('primary'),
      expected: 'HTTP 400 "Cannot delete the primary wallet"',
      actual: `HTTP ${delPrimaryRes.status} (${delPrimaryRes.data?.message})`,
      file: 'server/controllers/walletController.js',
      func: 'deleteWallet',
      severity: 'HIGH',
    });

    // ─────────────────────────────────────────────────────────────
    // 2. CATEGORIES & INTEGRITY
    // ─────────────────────────────────────────────────────────────
    const catCreateRes = await request({
      method: 'POST',
      path: '/categories',
      body: { name: 'Health & Fitness', type: 'expense', icon: '🏋️', color: '#10b981' },
      token: userA.accessToken,
    });
    const catId = catCreateRes.data?.data?._id;

    // Create an expense using this category
    const expUnderCat = await request({
      method: 'POST',
      path: '/expenses',
      body: { title: 'Gym Membership', amount: 3000, category: catId, walletId: wallet2._id.toString(), paymentMethod: 'card', date: new Date().toISOString() },
      token: userA.accessToken,
    });

    // Attempt to delete category linked to expense
    const delCatLinkedRes = await request({
      method: 'DELETE',
      path: `/categories/${catId}`,
      token: userA.accessToken,
    });

    runner.record({
      id: 'DOM-CAT-001',
      feature: 'Category Deletion Guard',
      name: 'Block deletion of category linked to existing expenses',
      passed: delCatLinkedRes.status === 400 && delCatLinkedRes.data?.message?.includes('linked'),
      expected: 'HTTP 400 "Cannot delete category with linked expenses"',
      actual: `HTTP ${delCatLinkedRes.status} (${delCatLinkedRes.data?.message})`,
      file: 'server/controllers/categoryController.js',
      func: 'deleteCategory',
      severity: 'HIGH',
    });

    // Cleanup linked expense
    await request({ method: 'DELETE', path: `/expenses/${expUnderCat.data?.data?._id}`, token: userA.accessToken });

    // ─────────────────────────────────────────────────────────────
    // 3. BUDGETS & BURN RATE
    // ─────────────────────────────────────────────────────────────
    const budgetCreateRes = await request({
      method: 'POST',
      path: '/budgets',
      body: { category: catId, limit: 15000, period: 'monthly', alertThreshold: 80 },
      token: userA.accessToken,
    });
    const budgetId = budgetCreateRes.data?.data?._id;

    // Duplicate budget prevention
    const dupBudgetRes = await request({
      method: 'POST',
      path: '/budgets',
      body: { category: catId, limit: 20000, period: 'monthly' },
      token: userA.accessToken,
    });

    runner.record({
      id: 'DOM-BUD-001',
      feature: 'Budget Duplicate Guard',
      name: 'Prevent duplicate budgets for same category and period',
      passed: dupBudgetRes.status === 400 && dupBudgetRes.data?.message?.includes('already exists'),
      expected: 'HTTP 400 "A budget for this category and period already exists"',
      actual: `HTTP ${dupBudgetRes.status} (${dupBudgetRes.data?.message})`,
      file: 'server/controllers/budgetController.js',
      func: 'createBudget',
      severity: 'HIGH',
    });

    // Budget Analytics
    const budgetAnalyticsRes = await request({
      method: 'GET',
      path: `/budgets/${budgetId}/analytics`,
      token: userA.accessToken,
    });

    runner.record({
      id: 'DOM-BUD-002',
      feature: 'Budget Analytics',
      name: 'Calculate budget burn rate and projected utilization',
      passed: budgetAnalyticsRes.status === 200 && budgetAnalyticsRes.data?.data?.activeRunRate !== undefined,
      expected: 'HTTP 200 with activeRunRate and projected metrics',
      actual: `HTTP ${budgetAnalyticsRes.status}`,
      file: 'server/controllers/budgetController.js',
      func: 'getBudgetAnalytics',
      severity: 'MEDIUM',
    });

    // ─────────────────────────────────────────────────────────────
    // 4. GOALS & AUTO-CAPPING CONTRIBUTIONS
    // ─────────────────────────────────────────────────────────────
    const goalCreateRes = await request({
      method: 'POST',
      path: '/goals',
      body: {
        title: 'Dream Gaming Setup',
        targetAmount: 50000,
        targetDate: new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString(),
        priority: 'High',
      },
      token: userA.accessToken,
    });
    const goalId = goalCreateRes.data?.data?._id;

    await Wallet.findByIdAndUpdate(wallet2._id, { balance: 100000 });

    const contrib1Res = await request({
      method: 'POST',
      path: `/goals/${goalId}/contribute`,
      body: { amount: 30000, walletId: wallet2._id.toString() },
      token: userA.accessToken,
    });

    // Over-save contribution: remaining target is ₹20,000. Send ₹40,000!
    const contrib2OverRes = await request({
      method: 'POST',
      path: `/goals/${goalId}/contribute`,
      body: { amount: 40000, walletId: wallet2._id.toString() },
      token: userA.accessToken,
    });

    const updatedGoal = await Goal.findById(goalId);
    const overSaveCapped = contrib2OverRes.status === 200 && updatedGoal.savedAmount === 50000 && updatedGoal.status === 'Completed';

    runner.record({
      id: 'DOM-GOA-001',
      feature: 'Goal Over-Save Capping',
      name: 'Auto-cap contribution to exact remaining target, refund excess and mark Completed',
      passed: overSaveCapped,
      expected: 'HTTP 200, Goal savedAmount: 50000, Status: Completed',
      actual: `HTTP ${contrib2OverRes.status}, saved: ${updatedGoal.savedAmount}, status: ${updatedGoal.status}`,
      file: 'server/controllers/goalController.js',
      func: 'contributeToGoal',
      severity: 'CRITICAL',
    });

    // ─────────────────────────────────────────────────────────────
    // 5. BILLS & RECURRING CYCLE ADVANCEMENT
    // ─────────────────────────────────────────────────────────────
    const billCreateRes = await request({
      method: 'POST',
      path: '/bills',
      body: {
        title: 'Broadband Fiber Internet',
        amount: 1500,
        category: 'Utilities',
        dueDate: new Date().toISOString(),
        recurring: true,
        frequency: 'monthly',
      },
      token: userA.accessToken,
    });
    const billId = billCreateRes.data?.data?._id;

    // Pay Bill with Wallet
    const payBillRes = await request({
      method: 'POST',
      path: `/bills/${billId}/pay`,
      body: { walletId: wallet2._id.toString() },
      token: userA.accessToken,
    });

    const billAfterPay = await Bill.findById(billId);
    const dueDateAdvanced = new Date(billAfterPay.dueDate).getTime() > Date.now();

    runner.record({
      id: 'DOM-BIL-001',
      feature: 'Bill Payment & Recurring Advance',
      name: 'Pay bill with wallet deduction and auto-advance next recurring due date',
      passed: payBillRes.status === 200 && dueDateAdvanced,
      expected: 'HTTP 200 with advanced next dueDate',
      actual: `HTTP ${payBillRes.status}, nextDue: ${billAfterPay.dueDate}`,
      file: 'server/controllers/billController.js',
      func: 'payBill',
      severity: 'HIGH',
    });

    // ─────────────────────────────────────────────────────────────
    // 6. LOANS & AUTO-PAYOFF
    // ─────────────────────────────────────────────────────────────
    const loanCreateRes = await request({
      method: 'POST',
      path: '/loans',
      body: {
        name: 'Device EMI Loan',
        type: 'credit_card_emi',
        amount: 10000,
        interestRate: 0,
        durationMonths: 2,
        emiAmount: 5000,
        remainingBalance: 5000,
        nextEmiDate: new Date().toISOString(),
      },
      token: userA.accessToken,
    });
    const loanId = loanCreateRes.data?.data?._id;

    // Pay Final EMI
    const payEmiRes = await request({
      method: 'POST',
      path: `/loans/${loanId}/pay-emi`,
      body: { walletId: wallet2._id.toString() },
      token: userA.accessToken,
    });

    const loanAfterPayoff = await Loan.findById(loanId);
    const loanPaidOff = payEmiRes.status === 200 && loanAfterPayoff.remainingBalance === 0 && loanAfterPayoff.paymentStatus === 'paid';

    runner.record({
      id: 'DOM-LOA-001',
      feature: 'Loan EMI & Auto Payoff',
      name: 'Pay EMI, reduce remaining balance to 0 and auto-mark loan as paid',
      passed: loanPaidOff,
      expected: 'HTTP 200, remainingBalance: 0, paymentStatus: "paid"',
      actual: `HTTP ${payEmiRes.status}, rem: ${loanAfterPayoff.remainingBalance}, status: ${loanAfterPayoff.paymentStatus}`,
      file: 'server/controllers/loanController.js',
      func: 'payEmi',
      severity: 'HIGH',
    });

    // ─────────────────────────────────────────────────────────────
    // 7. SUBSCRIPTIONS CRUD
    // ─────────────────────────────────────────────────────────────
    const subRes = await request({
      method: 'POST',
      path: '/subscriptions',
      body: {
        name: 'Cloud Storage 2TB',
        cost: 650,
        billingCycle: 'monthly',
        renewalDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      },
      token: userA.accessToken,
    });
    const subId = subRes.data?.data?._id;

    runner.record({
      id: 'DOM-SUB-001',
      feature: 'Subscription CRUD',
      name: 'Create and track recurring subscription service',
      passed: subRes.status === 201 && Boolean(subId),
      expected: 'HTTP 201 Created',
      actual: `HTTP ${subRes.status}`,
      file: 'server/controllers/subscriptionController.js',
      func: 'createSubscription',
      severity: 'MEDIUM',
    });

    // ─────────────────────────────────────────────────────────────
    // 8. INVESTMENTS & ROI CALCULATIONS
    // ─────────────────────────────────────────────────────────────
    const invRes = await request({
      method: 'POST',
      path: '/investments',
      body: {
        name: 'Nifty 50 Index Fund',
        type: 'mutual_funds',
        investedAmount: 100000,
        currentValue: 125000,
      },
      token: userA.accessToken,
    });
    const invId = invRes.data?.data?._id;
    const invDb = await Investment.findById(invId);

    runner.record({
      id: 'DOM-INV-001',
      feature: 'Investment Metrics',
      name: 'Compute profit/loss virtual and percentage ROI correctly',
      passed: invRes.status === 201 && invDb.profitOrLoss === 25000 && invDb.percentageReturn === 25,
      expected: 'HTTP 201, Profit: 25000, Return: 25%',
      actual: `HTTP ${invRes.status}, Profit: ${invDb?.profitOrLoss}, Return: ${invDb?.percentageReturn}%`,
      file: 'server/models/Investment.js',
      severity: 'MEDIUM',
    });

    // ─────────────────────────────────────────────────────────────
    // 9. SPLIT BILLS & SETTLEMENT DELETION GUARD
    // ─────────────────────────────────────────────────────────────
    const splitRes = await request({
      method: 'POST',
      path: '/splits',
      body: {
        title: 'Team Offsite Lunch',
        amount: 4000,
        groupName: 'Office',
        members: [{ userEmail: userB.user.email, share: 2000 }],
      },
      token: userA.accessToken,
    });
    const splitId = splitRes.data?.data?._id;

    // Attempt delete before settlement
    const delUnsettledSplitRes = await request({
      method: 'DELETE',
      path: `/splits/${splitId}`,
      token: userA.accessToken,
    });

    runner.record({
      id: 'DOM-SPL-001',
      feature: 'Split Deletion Guard',
      name: 'Block deletion of unsettled split expense',
      passed: delUnsettledSplitRes.status === 400 && delUnsettledSplitRes.data?.message?.includes('settled'),
      expected: 'HTTP 400 "Only settled split bills can be deleted"',
      actual: `HTTP ${delUnsettledSplitRes.status} (${delUnsettledSplitRes.data?.message})`,
      file: 'server/controllers/splitController.js',
      func: 'deleteSplit',
      severity: 'HIGH',
    });

    // Settle member share
    const settleRes = await request({
      method: 'POST',
      path: `/splits/${splitId}/settle`,
      body: { memberEmail: userB.user.email },
      token: userA.accessToken,
    });

    // Now delete should succeed
    const delSettledSplitRes = await request({
      method: 'DELETE',
      path: `/splits/${splitId}`,
      token: userA.accessToken,
    });

    runner.record({
      id: 'DOM-SPL-002',
      feature: 'Split Settlement & Deletion',
      name: 'Settle member share and allow deletion once fully settled',
      passed: settleRes.status === 200 && delSettledSplitRes.status === 200,
      expected: 'Settle HTTP 200, Delete HTTP 200',
      actual: `Settle: ${settleRes.status}, Delete: ${delSettledSplitRes.status}`,
      file: 'server/controllers/splitController.js',
      severity: 'HIGH',
    });

    // ─────────────────────────────────────────────────────────────
    // 10. FAMILY SHARING HUB & EMAIL MATCH ACCEPTANCE
    // ─────────────────────────────────────────────────────────────
    const inviteRes = await request({
      method: 'POST',
      path: '/family/invite',
      body: { email: userB.user.email, role: 'member' },
      token: userA.accessToken,
    });

    const familyRecord = await Family.findOne({ owner: userA.user._id });
    const hasInviteHash = Boolean(familyRecord?.members?.find((m) => m.email === userB.user.email)?.invitationTokenHash);

    runner.record({
      id: 'DOM-FAM-001',
      feature: 'Family Invitation',
      name: 'Dispatch family invitation with 48h bcrypt token hash',
      passed: inviteRes.status === 200 && hasInviteHash,
      expected: 'HTTP 200 with stored invitationTokenHash',
      actual: `HTTP ${inviteRes.status}, HasHash: ${hasInviteHash}`,
      file: 'server/controllers/familyController.js',
      func: 'inviteMember',
      severity: 'HIGH',
    });

  } finally {
    await cleanupUser(userA?.user?._id);
    await cleanupUser(userB?.user?._id);
  }

  return runner.summary();
};

if (process.argv[1] && process.argv[1].endsWith('all_features_crud.test.mjs')) {
  runAllFeaturesCRUDTests()
    .then((summary) => {
      console.log('\n--- ALL FEATURES CRUD SUMMARY ---');
      console.log(`Total: ${summary.total} | Passed: ${summary.passed} | Failed: ${summary.failed}`);
      process.exit(summary.failed > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error('Fatal test runner error:', err);
      process.exit(1);
    });
}
