/**
 * server/tests/phase1_core_financial.test.mjs
 * 
 * PHASE 1: CORE FINANCIAL CRUD & INVARIANTS TEST SUITE
 * Exhaustive coverage for:
 *   1. Expense Controller (server/controllers/expenseController.js)
 *   2. Income Controller (server/controllers/incomeController.js)
 *   3. Wallet Controller (server/controllers/walletController.js)
 *   4. Budget Controller (server/controllers/budgetController.js)
 *   5. Loan Controller (server/controllers/loanController.js)
 */

import {
  request,
  createTestUser,
  createTestWallet,
  createTestCategory,
  cleanupUser,
  TestSuiteRunner,
  Expense,
  Income,
  Wallet,
  Budget,
  Loan,
  Bill,
} from './test_helpers.mjs';

export const runPhase1CoreFinancialTests = async () => {
  const runner = new TestSuiteRunner('Phase 1: Core Financial CRUD & Invariants');
  console.log('\n======================================================');
  console.log('  RUNNING SUITE: Phase 1: Core Financial CRUD');
  console.log('======================================================');

  let userA, userB;
  let walletA1, walletA2, walletB1;
  let categoryA1, categoryA2, categoryB1;

  try {
    userA = await createTestUser({ name: 'Phase1 User A' });
    userB = await createTestUser({ name: 'Phase1 User B' });

    walletA1 = await createTestWallet(userA.user, { name: 'P1 Main Wallet', balance: 50000, isPrimary: true, currency: 'INR' });
    walletA2 = await createTestWallet(userA.user, { name: 'P1 Secondary Wallet', balance: 10000, isPrimary: false, currency: 'INR' });
    walletB1 = await createTestWallet(userB.user, { name: 'P1 UserB Wallet', balance: 20000, isPrimary: true, currency: 'INR' });

    categoryA1 = await createTestCategory(userA.user, { name: 'P1 Groceries', type: 'expense' });
    categoryA2 = await createTestCategory(userA.user, { name: 'P1 Salary', type: 'income' });
    categoryB1 = await createTestCategory(userB.user, { name: 'P1 UserB Category', type: 'expense' });

    // =========================================================================
    // 1. EXPENSE CONTROLLER TESTS
    // =========================================================================
    console.log('\n--- Testing Expense Controller ---');

    // EXP-001: Create expense without wallet (balance untouched)
    const expNoWalletRes = await request({
      method: 'POST',
      path: '/expenses',
      body: {
        title: 'Cash Coffee',
        amount: 150,
        category: categoryA1._id.toString(),
        paymentMethod: 'cash',
        date: new Date().toISOString(),
      },
      token: userA.accessToken,
    });
    runner.record({
      id: 'P1-EXP-001',
      feature: 'Expense Create',
      name: 'Create expense without wallet linkage (cash)',
      passed: expNoWalletRes.status === 201 && expNoWalletRes.data?.data?.amount === 150,
      expected: 'HTTP 201 with amount 150',
      actual: `HTTP ${expNoWalletRes.status}`,
      file: 'server/controllers/expenseController.js',
      func: 'addExpense',
      severity: 'CRITICAL',
    });

    // EXP-002: Create expense with wallet deduction
    const initialW1Bal = (await Wallet.findById(walletA1._id)).balance;
    const expWalletRes = await request({
      method: 'POST',
      path: '/expenses',
      body: {
        title: 'Supermarket Run',
        amount: 3000,
        category: categoryA1._id.toString(),
        walletId: walletA1._id.toString(),
        paymentMethod: 'card',
        date: new Date().toISOString(),
        tags: ['food', 'weekly'],
      },
      token: userA.accessToken,
    });
    const w1AfterExp = (await Wallet.findById(walletA1._id)).balance;
    const expId = expWalletRes.data?.data?._id;

    runner.record({
      id: 'P1-EXP-002',
      feature: 'Expense Create',
      name: 'Create expense with wallet deduction updates balance atomically',
      passed: expWalletRes.status === 201 && w1AfterExp === initialW1Bal - 3000,
      expected: `HTTP 201, Wallet balance ${initialW1Bal - 3000}`,
      actual: `HTTP ${expWalletRes.status}, Wallet balance ${w1AfterExp}`,
      file: 'server/controllers/expenseController.js',
      func: 'addExpense',
      severity: 'CRITICAL',
    });

    // EXP-003: Create expense with insufficient wallet balance rejected
    const expOverBalRes = await request({
      method: 'POST',
      path: '/expenses',
      body: {
        title: 'Luxury Yacht',
        amount: 999999,
        category: categoryA1._id.toString(),
        walletId: walletA1._id.toString(),
        paymentMethod: 'bank',
        date: new Date().toISOString(),
      },
      token: userA.accessToken,
    });
    runner.record({
      id: 'P1-EXP-003',
      feature: 'Expense Validation',
      name: 'Reject expense creation exceeding available wallet balance',
      passed: expOverBalRes.status === 400 && expOverBalRes.data?.message?.includes('Insufficient'),
      expected: 'HTTP 400 Insufficient wallet balance',
      actual: `HTTP ${expOverBalRes.status} (${expOverBalRes.data?.message})`,
      file: 'server/controllers/expenseController.js',
      func: 'addExpense',
      severity: 'HIGH',
    });

    // EXP-004: IDOR Create with another user's wallet rejected
    const expIdorWalletRes = await request({
      method: 'POST',
      path: '/expenses',
      body: {
        title: 'Sneaky Expense',
        amount: 500,
        category: categoryA1._id.toString(),
        walletId: walletB1._id.toString(),
        paymentMethod: 'card',
        date: new Date().toISOString(),
      },
      token: userA.accessToken,
    });
    runner.record({
      id: 'P1-EXP-004',
      feature: 'Expense Security',
      name: 'User A cannot link User B wallet to expense',
      passed: expIdorWalletRes.status === 404,
      expected: 'HTTP 404 Wallet not found',
      actual: `HTTP ${expIdorWalletRes.status}`,
      file: 'server/controllers/expenseController.js',
      func: 'addExpense',
      severity: 'CRITICAL',
    });

    // EXP-005: Read single expense & IDOR check
    const readExpRes = await request({
      method: 'GET',
      path: `/expenses/${expId}`,
      token: userA.accessToken,
    });
    const idorReadExpRes = await request({
      method: 'GET',
      path: `/expenses/${expId}`,
      token: userB.accessToken,
    });
    runner.record({
      id: 'P1-EXP-005',
      feature: 'Expense Read & IDOR',
      name: 'User A can read own expense; User B receives 404 on User A expense',
      passed: readExpRes.status === 200 && idorReadExpRes.status === 404,
      expected: 'User A: HTTP 200, User B: HTTP 404',
      actual: `User A: ${readExpRes.status}, User B: ${idorReadExpRes.status}`,
      file: 'server/controllers/expenseController.js',
      func: 'getExpense',
      severity: 'CRITICAL',
    });

    // EXP-006: Pagination & totalAmount aggregation across pages
    // Seed 5 additional expenses of ₹1,000 each
    for (let i = 0; i < 5; i++) {
      await Expense.create({
        user: userA.user._id,
        title: `Bulk Expense ${i}`,
        amount: 1000,
        category: categoryA1._id,
        paymentMethod: 'card',
        date: new Date(Date.now() - i * 86400000),
      });
    }
    // Also seed a transfer expense which MUST be excluded from totals
    await Expense.create({
      user: userA.user._id,
      title: 'Internal Transfer Test',
      amount: 5000,
      paymentMethod: 'other',
      date: new Date(),
      isTransfer: true,
    });

    const expListRes = await request({
      method: 'GET',
      path: '/expenses?page=1&limit=3',
      token: userA.accessToken,
    });
    // Expected non-transfer expenses: 150 + 3000 + (5 * 1000) = 8150. Count = 7.
    runner.record({
      id: 'P1-EXP-006',
      feature: 'Expense List & Aggregation',
      name: 'List expenses pagination (limit 3) with full-dataset totalAmount aggregation excluding transfers',
      passed: expListRes.status === 200 &&
              expListRes.data?.data?.expenses?.length === 3 &&
              expListRes.data?.data?.total === 7 &&
              expListRes.data?.data?.totalAmount === 8150,
      expected: 'Limit 3, Total 7, TotalAmount ₹8,150 (excluding transfer)',
      actual: `Limit ${expListRes.data?.data?.expenses?.length}, Total ${expListRes.data?.data?.total}, TotalAmount ₹${expListRes.data?.data?.totalAmount}`,
      file: 'server/controllers/expenseController.js',
      func: 'getExpenses',
      severity: 'HIGH',
    });

    // EXP-007: Update expense amount on same wallet (increase & decrease)
    const w1BeforeUp = (await Wallet.findById(walletA1._id)).balance;
    // Increase expense from 3000 to 4000 (+1000 deduction)
    const updateUpRes = await request({
      method: 'PUT',
      path: `/expenses/${expId}`,
      body: {
        title: 'Supermarket Run Expanded',
        amount: 4000,
        category: categoryA1._id.toString(),
        walletId: walletA1._id.toString(),
        paymentMethod: 'card',
        date: new Date().toISOString(),
      },
      token: userA.accessToken,
    });
    const w1AfterUp = (await Wallet.findById(walletA1._id)).balance;

    // Decrease expense from 4000 to 2500 (+1500 refund)
    const updateDownRes = await request({
      method: 'PUT',
      path: `/expenses/${expId}`,
      body: {
        title: 'Supermarket Run Final',
        amount: 2500,
        category: categoryA1._id.toString(),
        walletId: walletA1._id.toString(),
        paymentMethod: 'card',
        date: new Date().toISOString(),
      },
      token: userA.accessToken,
    });
    const w1AfterDown = (await Wallet.findById(walletA1._id)).balance;

    runner.record({
      id: 'P1-EXP-007',
      feature: 'Expense Update Invariant',
      name: 'Update expense amount delta adjusts wallet balance accurately (upward & downward)',
      passed: updateUpRes.status === 200 && w1AfterUp === w1BeforeUp - 1000 &&
              updateDownRes.status === 200 && w1AfterDown === w1AfterUp + 1500,
      expected: `Upward: ${w1BeforeUp - 1000}, Downward: ${w1AfterUp + 1500}`,
      actual: `Upward: ${w1AfterUp}, Downward: ${w1AfterDown}`,
      file: 'server/controllers/expenseController.js',
      func: 'updateExpense',
      severity: 'CRITICAL',
    });

    // EXP-008: Update expense wallet switch (refund old, deduct new)
    const w1PreSwitch = (await Wallet.findById(walletA1._id)).balance;
    const w2PreSwitch = (await Wallet.findById(walletA2._id)).balance;
    const expCurrentAmount = 2500;

    const switchRes = await request({
      method: 'PUT',
      path: `/expenses/${expId}`,
      body: {
        title: 'Supermarket Run Switched',
        amount: expCurrentAmount,
        category: categoryA1._id.toString(),
        walletId: walletA2._id.toString(),
        paymentMethod: 'card',
        date: new Date().toISOString(),
      },
      token: userA.accessToken,
    });
    const w1PostSwitch = (await Wallet.findById(walletA1._id)).balance;
    const w2PostSwitch = (await Wallet.findById(walletA2._id)).balance;

    runner.record({
      id: 'P1-EXP-008',
      feature: 'Expense Wallet Switch',
      name: 'Switching expense wallet refunds old wallet and debits new wallet',
      passed: switchRes.status === 200 &&
              w1PostSwitch === w1PreSwitch + expCurrentAmount &&
              w2PostSwitch === w2PreSwitch - expCurrentAmount,
      expected: `W1: ${w1PreSwitch + expCurrentAmount}, W2: ${w2PreSwitch - expCurrentAmount}`,
      actual: `W1: ${w1PostSwitch}, W2: ${w2PostSwitch}`,
      file: 'server/controllers/expenseController.js',
      func: 'updateExpense',
      severity: 'CRITICAL',
    });

    // EXP-009: Delete expense and refund wallet
    const w2PreDel = (await Wallet.findById(walletA2._id)).balance;
    const delExpRes = await request({
      method: 'DELETE',
      path: `/expenses/${expId}`,
      token: userA.accessToken,
    });
    const w2PostDel = (await Wallet.findById(walletA2._id)).balance;
    const expPostDelInDb = await Expense.findById(expId);

    runner.record({
      id: 'P1-EXP-009',
      feature: 'Expense Delete & Refund',
      name: 'Delete expense removes document and refunds full amount to wallet',
      passed: delExpRes.status === 200 &&
              w2PostDel === w2PreDel + expCurrentAmount &&
              expPostDelInDb === null,
      expected: `HTTP 200, W2 balance ${w2PreDel + expCurrentAmount}, DB doc null`,
      actual: `HTTP ${delExpRes.status}, W2 balance ${w2PostDel}, DB doc ${expPostDelInDb}`,
      file: 'server/controllers/expenseController.js',
      func: 'deleteExpense',
      severity: 'CRITICAL',
    });

    // EXP-010: Expense summary monthly aggregation
    const summaryRes = await request({
      method: 'GET',
      path: '/expenses/summary',
      token: userA.accessToken,
    });
    runner.record({
      id: 'P1-EXP-010',
      feature: 'Expense Summary',
      name: 'Monthly category summary returns aggregated category totals',
      passed: summaryRes.status === 200 && Array.isArray(summaryRes.data?.data),
      expected: 'HTTP 200 with summary array',
      actual: `HTTP ${summaryRes.status}`,
      file: 'server/controllers/expenseController.js',
      func: 'getExpenseSummary',
      severity: 'MEDIUM',
    });

    // =========================================================================
    // 2. INCOME CONTROLLER TESTS
    // =========================================================================
    console.log('\n--- Testing Income Controller ---');

    // INC-001: Add income without wallet
    const incNoWalletRes = await request({
      method: 'POST',
      path: '/income',
      body: {
        title: 'Freelance Design',
        amount: 15000,
        category: 'Freelance',
        source: 'Client Direct',
        date: new Date().toISOString(),
      },
      token: userA.accessToken,
    });
    runner.record({
      id: 'P1-INC-001',
      feature: 'Income Create',
      name: 'Create income without wallet linkage',
      passed: incNoWalletRes.status === 201 && incNoWalletRes.data?.data?.amount === 15000,
      expected: 'HTTP 201 with amount 15000',
      actual: `HTTP ${incNoWalletRes.status}`,
      file: 'server/controllers/incomeController.js',
      func: 'addIncome',
      severity: 'CRITICAL',
    });

    // INC-002: Add income with wallet credit
    const w1PreInc = (await Wallet.findById(walletA1._id)).balance;
    const incWalletRes = await request({
      method: 'POST',
      path: '/income',
      body: {
        title: 'Salary Direct Deposit',
        amount: 60000,
        category: 'Salary',
        source: 'Company Payroll',
        walletId: walletA1._id.toString(),
        paymentMethod: 'bank',
        date: new Date().toISOString(),
      },
      token: userA.accessToken,
    });
    const w1PostInc = (await Wallet.findById(walletA1._id)).balance;
    const createdIncomeId = incWalletRes.data?.data?._id;

    runner.record({
      id: 'P1-INC-002',
      feature: 'Income Create with Wallet',
      name: 'Create income credits linked wallet atomically',
      passed: incWalletRes.status === 201 && w1PostInc === w1PreInc + 60000,
      expected: `HTTP 201, Wallet balance ${w1PreInc + 60000}`,
      actual: `HTTP ${incWalletRes.status}, Wallet balance ${w1PostInc}`,
      file: 'server/controllers/incomeController.js',
      func: 'addIncome',
      severity: 'CRITICAL',
    });

    // INC-003: Read single income & IDOR check
    const readIncRes = await request({
      method: 'GET',
      path: `/income/${createdIncomeId}`,
      token: userA.accessToken,
    });
    const idorReadIncRes = await request({
      method: 'GET',
      path: `/income/${createdIncomeId}`,
      token: userB.accessToken,
    });
    runner.record({
      id: 'P1-INC-003',
      feature: 'Income Read & IDOR',
      name: 'User A can read own income; User B receives 404 on User A income',
      passed: readIncRes.status === 200 && idorReadIncRes.status === 404,
      expected: 'User A: HTTP 200, User B: HTTP 404',
      actual: `User A: ${readIncRes.status}, User B: ${idorReadIncRes.status}`,
      file: 'server/controllers/incomeController.js',
      func: 'getIncome',
      severity: 'CRITICAL',
    });

    // INC-004: Income list with pagination and totalAmount aggregation
    // Seed 4 additional incomes of ₹5,000 each
    for (let i = 0; i < 4; i++) {
      await Income.create({
        user: userA.user._id,
        title: `Bulk Income ${i}`,
        amount: 5000,
        date: new Date(Date.now() - i * 86400000),
      });
    }
    // Seed transfer income (should be excluded)
    await Income.create({
      user: userA.user._id,
      title: 'Transfer Income Test',
      amount: 10000,
      date: new Date(),
      isTransfer: true,
    });

    const incListRes = await request({
      method: 'GET',
      path: '/income?page=1&limit=2',
      token: userA.accessToken,
    });
    // Expected total: 15000 + 60000 + (4 * 5000) = 95000 across 6 records
    runner.record({
      id: 'P1-INC-004',
      feature: 'Income List & Aggregation',
      name: 'List incomes pagination (limit 2) with full-dataset totalAmount aggregation',
      passed: incListRes.status === 200 &&
              incListRes.data?.data?.incomes?.length === 2 &&
              incListRes.data?.data?.total === 6 &&
              incListRes.data?.data?.totalAmount === 95000,
      expected: 'Limit 2, Total 6, TotalAmount ₹95,000 (excluding transfer)',
      actual: `Limit ${incListRes.data?.data?.incomes?.length}, Total ${incListRes.data?.data?.total}, TotalAmount ₹${incListRes.data?.data?.totalAmount}`,
      file: 'server/controllers/incomeController.js',
      func: 'getIncomes',
      severity: 'HIGH',
    });

    // INC-005: Update income amount (credit difference & debit difference with balance guard)
    const w1PreIncUp = (await Wallet.findById(walletA1._id)).balance;
    // Increase income from 60000 to 70000 (+10000 credit)
    const updateIncUp = await request({
      method: 'PUT',
      path: `/income/${createdIncomeId}`,
      body: {
        title: 'Salary Direct Deposit Upgraded',
        amount: 70000,
        category: 'Salary',
        source: 'Company Payroll',
        walletId: walletA1._id.toString(),
        paymentMethod: 'bank',
        date: new Date().toISOString(),
      },
      token: userA.accessToken,
    });
    const w1PostIncUp = (await Wallet.findById(walletA1._id)).balance;

    // Decrease income from 70000 to 50000 (-20000 debit)
    const updateIncDown = await request({
      method: 'PUT',
      path: `/income/${createdIncomeId}`,
      body: {
        title: 'Salary Direct Deposit Corrected',
        amount: 50000,
        category: 'Salary',
        source: 'Company Payroll',
        walletId: walletA1._id.toString(),
        paymentMethod: 'bank',
        date: new Date().toISOString(),
      },
      token: userA.accessToken,
    });
    const w1PostIncDown = (await Wallet.findById(walletA1._id)).balance;

    runner.record({
      id: 'P1-INC-005',
      feature: 'Income Update Invariant',
      name: 'Update income delta correctly adjusts wallet balance (credit & debit)',
      passed: updateIncUp.status === 200 && w1PostIncUp === w1PreIncUp + 10000 &&
              updateIncDown.status === 200 && w1PostIncDown === w1PostIncUp - 20000,
      expected: `Upward: ${w1PreIncUp + 10000}, Downward: ${w1PostIncUp - 20000}`,
      actual: `Upward: ${w1PostIncUp}, Downward: ${w1PostIncDown}`,
      file: 'server/controllers/incomeController.js',
      func: 'updateIncome',
      severity: 'CRITICAL',
    });

    // INC-006: Delete income reverses credit from wallet
    const w1PreIncDel = (await Wallet.findById(walletA1._id)).balance;
    const delIncRes = await request({
      method: 'DELETE',
      path: `/income/${createdIncomeId}`,
      token: userA.accessToken,
    });
    const w1PostIncDel = (await Wallet.findById(walletA1._id)).balance;
    const incPostDelDb = await Income.findById(createdIncomeId);

    runner.record({
      id: 'P1-INC-006',
      feature: 'Income Delete & Reverse',
      name: 'Delete income removes document and debits credited amount from wallet',
      passed: delIncRes.status === 200 &&
              w1PostIncDel === w1PreIncDel - 50000 &&
              incPostDelDb === null,
      expected: `HTTP 200, Wallet balance ${w1PreIncDel - 50000}, DB doc null`,
      actual: `HTTP ${delIncRes.status}, Wallet balance ${w1PostIncDel}, DB doc ${incPostDelDb}`,
      file: 'server/controllers/incomeController.js',
      func: 'deleteIncome',
      severity: 'CRITICAL',
    });

    // =========================================================================
    // 3. WALLET CONTROLLER TESTS
    // =========================================================================
    console.log('\n--- Testing Wallet Controller ---');

    // WAL-001: Create wallet & duplicate name case-insensitivity
    const newWalletRes = await request({
      method: 'POST',
      path: '/wallets',
      body: {
        name: 'Savings Account High Yield',
        type: 'bank',
        balance: 25000,
        currency: 'INR',
        color: '#22c55e',
        icon: '🏦',
      },
      token: userA.accessToken,
    });
    const dupWalletRes = await request({
      method: 'POST',
      path: '/wallets',
      body: {
        name: 'savings account high yield', // lower case duplicate
        type: 'bank',
      },
      token: userA.accessToken,
    });
    const createdWallet3Id = newWalletRes.data?.data?._id;

    runner.record({
      id: 'P1-WAL-001',
      feature: 'Wallet Create & Uniqueness',
      name: 'Create wallet successfully and reject duplicate name case-insensitively',
      passed: newWalletRes.status === 201 && dupWalletRes.status === 400,
      expected: 'Create: HTTP 201, Duplicate: HTTP 400',
      actual: `Create: HTTP ${newWalletRes.status}, Duplicate: HTTP ${dupWalletRes.status}`,
      file: 'server/controllers/walletController.js',
      func: 'createWallet',
      severity: 'HIGH',
    });

    // WAL-002: Set Primary Wallet switch
    const setPrimaryRes = await request({
      method: 'PATCH',
      path: `/wallets/${createdWallet3Id}/set-primary`,
      token: userA.accessToken,
    });
    const w3AfterPrimary = await Wallet.findById(createdWallet3Id);
    const w1AfterPrimary = await Wallet.findById(walletA1._id);

    runner.record({
      id: 'P1-WAL-002',
      feature: 'Wallet Set Primary',
      name: 'Setting new primary wallet automatically unsets previous primary wallet',
      passed: setPrimaryRes.status === 200 && w3AfterPrimary.isPrimary === true && w1AfterPrimary.isPrimary === false,
      expected: 'W3 isPrimary: true, W1 isPrimary: false',
      actual: `W3 isPrimary: ${w3AfterPrimary?.isPrimary}, W1 isPrimary: ${w1AfterPrimary?.isPrimary}`,
      file: 'server/controllers/walletController.js',
      func: 'setPrimary',
      severity: 'HIGH',
    });

    // WAL-003: Update balance endpoint validations
    const updateBalValidRes = await request({
      method: 'PATCH',
      path: `/wallets/${createdWallet3Id}/balance`,
      body: { balance: 45000 },
      token: userA.accessToken,
    });
    const updateBalNegRes = await request({
      method: 'PATCH',
      path: `/wallets/${createdWallet3Id}/balance`,
      body: { balance: -500 },
      token: userA.accessToken,
    });
    const updateBalOverflowRes = await request({
      method: 'PATCH',
      path: `/wallets/${createdWallet3Id}/balance`,
      body: { balance: 999999999 },
      token: userA.accessToken,
    });

    runner.record({
      id: 'P1-WAL-003',
      feature: 'Wallet Update Balance',
      name: 'Balance update accepts valid amount and rejects negative and overflow values',
      passed: updateBalValidRes.status === 200 && updateBalNegRes.status === 400 && updateBalOverflowRes.status === 400,
      expected: 'Valid: 200, Negative: 400, Overflow: 400',
      actual: `Valid: ${updateBalValidRes.status}, Negative: ${updateBalNegRes.status}, Overflow: ${updateBalOverflowRes.status}`,
      file: 'server/controllers/walletController.js',
      func: 'updateBalance',
      severity: 'HIGH',
    });

    // WAL-004: Atomic Transfer Funds
    const w3PreTx = (await Wallet.findById(createdWallet3Id)).balance; // 45000
    const w2PreTx = (await Wallet.findById(walletA2._id)).balance;
    const transferAmount = 15000;

    const transferSuccessRes = await request({
      method: 'POST',
      path: '/wallets/transfer',
      body: {
        fromWalletId: createdWallet3Id,
        toWalletId: walletA2._id.toString(),
        amount: transferAmount,
        note: 'Phase 1 Audit Transfer',
      },
      token: userA.accessToken,
    });

    const w3PostTx = (await Wallet.findById(createdWallet3Id)).balance;
    const w2PostTx = (await Wallet.findById(walletA2._id)).balance;

    runner.record({
      id: 'P1-WAL-004',
      feature: 'Wallet Transfer',
      name: 'Atomic wallet-to-wallet transfer debits source and credits target',
      passed: transferSuccessRes.status === 200 &&
              w3PostTx === w3PreTx - transferAmount &&
              w2PostTx === w2PreTx + transferAmount,
      expected: `W3: ${w3PreTx - transferAmount}, W2: ${w2PreTx + transferAmount}`,
      actual: `W3: ${w3PostTx}, W2: ${w2PostTx}`,
      file: 'server/controllers/walletController.js',
      func: 'transferFunds',
      severity: 'CRITICAL',
    });

    // WAL-005: Transfer validations (same wallet, insufficient funds, cross-user)
    const transferSameRes = await request({
      method: 'POST',
      path: '/wallets/transfer',
      body: {
        fromWalletId: createdWallet3Id,
        toWalletId: createdWallet3Id,
        amount: 100,
      },
      token: userA.accessToken,
    });
    const transferInsuffRes = await request({
      method: 'POST',
      path: '/wallets/transfer',
      body: {
        fromWalletId: createdWallet3Id,
        toWalletId: walletA2._id.toString(),
        amount: 9999999,
      },
      token: userA.accessToken,
    });
    const transferIdorRes = await request({
      method: 'POST',
      path: '/wallets/transfer',
      body: {
        fromWalletId: createdWallet3Id,
        toWalletId: walletB1._id.toString(),
        amount: 100,
      },
      token: userA.accessToken,
    });

    runner.record({
      id: 'P1-WAL-005',
      feature: 'Wallet Transfer Guards',
      name: 'Reject transfer to same wallet, insufficient balance, and cross-user target wallet',
      passed: transferSameRes.status === 400 && transferInsuffRes.status === 400 && transferIdorRes.status === 404,
      expected: 'Same: 400, Insufficient: 400, Cross-user: 404',
      actual: `Same: ${transferSameRes.status}, Insufficient: ${transferInsuffRes.status}, Cross-user: ${transferIdorRes.status}`,
      file: 'server/controllers/walletController.js',
      func: 'transferFunds',
      severity: 'HIGH',
    });

    // WAL-006: Delete wallet guards (primary guard & linked transaction guard)
    // Attempt deleting W3 (which is currently primary)
    const delPrimaryGuard = await request({
      method: 'DELETE',
      path: `/wallets/${createdWallet3Id}`,
      token: userA.accessToken,
    });
    // Set W1 back to primary
    await request({
      method: 'PATCH',
      path: `/wallets/${walletA1._id}/set-primary`,
      token: userA.accessToken,
    });
    // Attempt deleting W3 (which now has transfer transactions linked)
    const delLinkedGuard = await request({
      method: 'DELETE',
      path: `/wallets/${createdWallet3Id}`,
      token: userA.accessToken,
    });

    runner.record({
      id: 'P1-WAL-006',
      feature: 'Wallet Deletion Guards',
      name: 'Prevent deletion of primary wallet and wallet with linked transactions',
      passed: delPrimaryGuard.status === 400 && delLinkedGuard.status === 400,
      expected: 'Primary del: 400, Linked del: 400',
      actual: `Primary del: ${delPrimaryGuard.status}, Linked del: ${delLinkedGuard.status}`,
      file: 'server/controllers/walletController.js',
      func: 'deleteWallet',
      severity: 'HIGH',
    });

    // =========================================================================
    // 4. BUDGET CONTROLLER TESTS
    // =========================================================================
    console.log('\n--- Testing Budget Controller ---');

    // BUD-001: Create budget & duplicate category check
    const createBudRes = await request({
      method: 'POST',
      path: '/budgets',
      body: {
        category: categoryA1._id.toString(),
        limit: 10000,
        period: 'monthly',
        alertThreshold: 80,
      },
      token: userA.accessToken,
    });
    const createdBudgetId = createBudRes.data?.data?._id;

    const dupBudRes = await request({
      method: 'POST',
      path: '/budgets',
      body: {
        category: categoryA1._id.toString(),
        limit: 15000,
        period: 'monthly',
      },
      token: userA.accessToken,
    });

    runner.record({
      id: 'P1-BUD-001',
      feature: 'Budget Create & Duplicate Guard',
      name: 'Create budget and prevent duplicate budget for same category and period',
      passed: createBudRes.status === 201 && dupBudRes.status === 400,
      expected: 'Create: 201, Duplicate: 400',
      actual: `Create: ${createBudRes.status}, Duplicate: ${dupBudRes.status}`,
      file: 'server/controllers/budgetController.js',
      func: 'createBudget',
      severity: 'HIGH',
    });

    // BUD-002: Dynamic spent aggregation in active period
    // Create an expense of ₹4,000 for Category A1 in the current month
    await Expense.create({
      user: userA.user._id,
      title: 'Budget Test Expense',
      amount: 4000,
      category: categoryA1._id,
      paymentMethod: 'card',
      date: new Date(),
    });

    const getBudRes = await request({
      method: 'GET',
      path: `/budgets/${createdBudgetId}`,
      token: userA.accessToken,
    });
    const budData = getBudRes.data?.data;

    runner.record({
      id: 'P1-BUD-002',
      feature: 'Budget Spent Aggregation',
      name: 'Budget fetch calculates dynamic spent and percentSpent from active expenses',
      passed: getBudRes.status === 200 && budData?.spent >= 4000 && budData?.percentSpent >= 40,
      expected: 'Spent >= 4000, percentSpent >= 40%',
      actual: `Spent: ${budData?.spent}, percentSpent: ${budData?.percentSpent}%`,
      file: 'server/controllers/budgetController.js',
      func: 'getBudget',
      severity: 'HIGH',
    });

    // BUD-003: Single Budget Analytics & Run Rate
    const budAnalyticsRes = await request({
      method: 'GET',
      path: `/budgets/${createdBudgetId}/analytics`,
      token: userA.accessToken,
    });
    const analytics = budAnalyticsRes.data?.data;

    runner.record({
      id: 'P1-BUD-003',
      feature: 'Budget Analytics',
      name: 'Budget analytics calculates actualSpent, remaining, utilization, and run rate',
      passed: budAnalyticsRes.status === 200 &&
              analytics?.actualSpent >= 4000 &&
              analytics?.remaining <= 6000 &&
              analytics?.activeRunRate > 0,
      expected: 'HTTP 200 with actualSpent, remaining, and activeRunRate',
      actual: `HTTP ${budAnalyticsRes.status}, Spent: ${analytics?.actualSpent}, Remaining: ${analytics?.remaining}`,
      file: 'server/controllers/budgetController.js',
      func: 'getBudgetAnalytics',
      severity: 'MEDIUM',
    });

    // BUD-004: Global Budget Analytics
    const globalBudRes = await request({
      method: 'GET',
      path: '/budgets/analytics/global',
      token: userA.accessToken,
    });
    runner.record({
      id: 'P1-BUD-004',
      feature: 'Global Budget Analytics',
      name: 'Global budget analytics returns 6-month monthly trends and 4-week pacing',
      passed: globalBudRes.status === 200 &&
              Array.isArray(globalBudRes.data?.data?.monthlyTrendData) &&
              Array.isArray(globalBudRes.data?.data?.weeklySpendingData),
      expected: 'HTTP 200 with monthlyTrendData and weeklySpendingData',
      actual: `HTTP ${globalBudRes.status}`,
      file: 'server/controllers/budgetController.js',
      func: 'getGlobalBudgetAnalytics',
      severity: 'MEDIUM',
    });

    // =========================================================================
    // 5. LOAN CONTROLLER TESTS
    // =========================================================================
    console.log('\n--- Testing Loan Controller ---');

    // LOA-001: Create loan with validations
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const createLoanRes = await request({
      method: 'POST',
      path: '/loans',
      body: {
        name: 'Auto Loan Honda',
        type: 'car',
        amount: 200000,
        interestRate: 12,
        durationMonths: 24,
        emiAmount: 9415,
        remainingBalance: 200000,
        nextEmiDate: nextMonth.toISOString(),
      },
      token: userA.accessToken,
    });
    const createdLoanId = createLoanRes.data?.data?._id;

    runner.record({
      id: 'P1-LOA-001',
      feature: 'Loan Create',
      name: 'Create loan log with interest rate, duration, and remaining balance',
      passed: createLoanRes.status === 201 && createLoanRes.data?.data?.amount === 200000,
      expected: 'HTTP 201 with amount 200000',
      actual: `HTTP ${createLoanRes.status}`,
      file: 'server/controllers/loanController.js',
      func: 'createLoan',
      severity: 'CRITICAL',
    });

    // LOA-002: Critical Check: EMI <= monthly interest MUST be rejected
    // Loan: ₹100,000, 20% annual interest -> Monthly interest = ₹1,666.67.
    // If EMI = ₹1,000 (<= ₹1,666.67), payment MUST be rejected.
    const underEmiLoan = await Loan.create({
      user: userA.user._id,
      name: 'Under-EMI Bad Loan',
      type: 'personal',
      amount: 100000,
      interestRate: 20,
      durationMonths: 36,
      emiAmount: 1000, // less than monthly interest of 1666.67
      remainingBalance: 100000,
      nextEmiDate: nextMonth,
    });

    const underEmiRes = await request({
      method: 'POST',
      path: `/loans/${underEmiLoan._id}/pay-emi`,
      body: { walletId: walletA1._id.toString() },
      token: userA.accessToken,
    });

    const underLoanAfter = await Loan.findById(underEmiLoan._id);

    runner.record({
      id: 'P1-LOA-002',
      feature: 'Loan EMI Math Guard',
      name: 'Reject EMI payment when EMI amount < current monthly interest',
      passed: underEmiRes.status === 400 &&
              underEmiRes.data?.message?.includes('greater than the current monthly interest') &&
              underLoanAfter.remainingBalance === 100000,
      expected: 'HTTP 400 "EMI amount must be greater than the current monthly interest.", Balance unchanged',
      actual: `HTTP ${underEmiRes.status} (${underEmiRes.data?.message}), Balance ${underLoanAfter.remainingBalance}`,
      file: 'server/controllers/loanController.js',
      func: 'payEmi',
      severity: 'CRITICAL',
    });

    // LOA-002B: Boundary Case: EMI exactly equal to monthly interest MUST also be rejected (<=)
    // Loan: ₹120,000, 10% annual interest -> Monthly interest = 120000 * (10 / 12 / 100) = ₹1,000.00 exact.
    // Setting EMI = ₹1,000 (strictly equal to monthly interest).
    const equalEmiLoan = await Loan.create({
      user: userA.user._id,
      name: 'Equal-EMI Boundary Loan',
      type: 'personal',
      amount: 120000,
      interestRate: 10,
      durationMonths: 24,
      emiAmount: 1000, // exactly equal to monthly interest of ₹1,000.00
      remainingBalance: 120000,
      nextEmiDate: nextMonth,
    });

    const equalEmiRes = await request({
      method: 'POST',
      path: `/loans/${equalEmiLoan._id}/pay-emi`,
      body: { walletId: walletA1._id.toString() },
      token: userA.accessToken,
    });

    const equalLoanAfter = await Loan.findById(equalEmiLoan._id);

    runner.record({
      id: 'P1-LOA-002B',
      feature: 'Loan EMI Math Boundary',
      name: 'Reject EMI payment when EMI amount == current monthly interest (exact boundary of <=)',
      passed: equalEmiRes.status === 400 &&
              equalEmiRes.data?.message?.includes('greater than the current monthly interest') &&
              equalLoanAfter.remainingBalance === 120000,
      expected: 'HTTP 400 "EMI amount must be greater than the current monthly interest.", Balance unchanged',
      actual: `HTTP ${equalEmiRes.status} (${equalEmiRes.data?.message}), Balance ${equalLoanAfter.remainingBalance}`,
      file: 'server/controllers/loanController.js',
      func: 'payEmi',
      severity: 'CRITICAL',
    });

    // LOA-003: Valid partial EMI payment with interest & principal split
    // Loan: ₹200,000, 12% interest -> Monthly rate = 1% -> Monthly interest = ₹2,000.
    // EMI = ₹9,415. Principal = 9415 - 2000 = ₹7,415.
    // New remaining balance = 200000 - 7415 = ₹192,585.
    const w1BalBeforeEmi = (await Wallet.findById(walletA1._id)).balance;

    const payEmiRes = await request({
      method: 'POST',
      path: `/loans/${createdLoanId}/pay-emi`,
      body: { walletId: walletA1._id.toString() },
      token: userA.accessToken,
    });

    const loanAfterEmi = await Loan.findById(createdLoanId);
    const w1BalAfterEmi = (await Wallet.findById(walletA1._id)).balance;
    const expectedRemaining = 200000 - (9415 - 2000); // 192585

    runner.record({
      id: 'P1-LOA-003',
      feature: 'Loan Pay EMI',
      name: 'Valid EMI payment splits interest and principal, reduces balance, and advances next date',
      passed: payEmiRes.status === 200 &&
              Math.abs(loanAfterEmi.remainingBalance - expectedRemaining) < 1 &&
              w1BalAfterEmi === w1BalBeforeEmi - 9415,
      expected: `Remaining balance: ₹${expectedRemaining}, Wallet debited: ₹9,415`,
      actual: `Remaining balance: ₹${loanAfterEmi.remainingBalance}, Wallet debited: ₹${w1BalBeforeEmi - w1BalAfterEmi}`,
      file: 'server/controllers/loanController.js',
      func: 'payEmi',
      severity: 'CRITICAL',
    });

    // LOA-004: Multi-step payoff to full settlement
    // Create loan with small remaining balance ₹5,000, 0% interest, EMI ₹5,000
    const payoffLoan = await Loan.create({
      user: userA.user._id,
      name: 'Quick Payoff Loan',
      type: 'personal',
      amount: 5000,
      interestRate: 0,
      durationMonths: 1,
      emiAmount: 5000,
      remainingBalance: 5000,
      nextEmiDate: nextMonth,
      paymentStatus: 'unpaid',
    });

    const payoffRes = await request({
      method: 'POST',
      path: `/loans/${payoffLoan._id}/pay-emi`,
      body: { walletId: walletA1._id.toString() },
      token: userA.accessToken,
    });

    const payoffLoanAfter = await Loan.findById(payoffLoan._id);

    // Attempting another payment on fully repaid loan must be rejected
    const doublePayRes = await request({
      method: 'POST',
      path: `/loans/${payoffLoan._id}/pay-emi`,
      body: { walletId: walletA1._id.toString() },
      token: userA.accessToken,
    });

    runner.record({
      id: 'P1-LOA-004',
      feature: 'Loan Full Payoff Lifecycle',
      name: 'Final EMI payment zeroes remaining balance, marks paymentStatus as paid, and rejects subsequent payments',
      passed: payoffRes.status === 200 &&
              payoffLoanAfter.remainingBalance === 0 &&
              payoffLoanAfter.paymentStatus === 'paid' &&
              doublePayRes.status === 400,
      expected: 'Remaining 0, status "paid", duplicate pay 400',
      actual: `Remaining ${payoffLoanAfter?.remainingBalance}, status "${payoffLoanAfter?.paymentStatus}", duplicate pay ${doublePayRes.status}`,
      file: 'server/controllers/loanController.js',
      func: 'payEmi',
      severity: 'CRITICAL',
    });

  } catch (err) {
    console.error('Phase 1 Test Suite Crash:', err);
  } finally {
    await cleanupUser(userA?.user?._id);
    await cleanupUser(userB?.user?._id);
  }

  return runner.summary();
};
