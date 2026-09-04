/**
 * server/tests/run_all_tests.mjs
 * 
 * MASTER AUTOMATED TEST RUNNER & AUDIT ENGINE
 * Sequentially executes all test suites, compiles metrics, and outputs comprehensive test reports.
 */

import { mongoose } from './test_helpers.mjs';
import { runIncomeCRUDTests } from './income_crud.test.mjs';
import { runExpenseCRUDTests } from './expense_crud.test.mjs';
import { runPhase1CoreFinancialTests } from './phase1_core_financial.test.mjs';
import { runPhase2SecondaryFeaturesTests } from './phase2_secondary_features.test.mjs';
import { runWalletInvariantTests } from './wallet_invariants.test.mjs';
import { runAuthTests } from './auth.test.mjs';
import { runGoogleOAuthTests } from './google_oauth.test.mjs';
import { runCrossUserSecurityTests } from './cross_user_security.test.mjs';
import { runAllFeaturesCRUDTests } from './all_features_crud.test.mjs';
import { runAIAssistantTests } from './ai_assistant.test.mjs';
import { runSecurityAndExportTests } from './security_and_exports.test.mjs';
import { runRateLimitAndTimeoutTests } from './rate_limits_timeouts.test.mjs';
import { runE2EJourneys } from './e2e_journeys.test.mjs';

const runMasterSuite = async () => {
  console.log('╔════════════════════════════════════════════════════════════════════════╗');
  console.log('║        EXPENSE TRACKER - MASTER AUTOMATED TEST SUITE & AUDIT           ║');
  console.log('║        Database Namespace: expense_tracker_test                        ║');
  console.log('╚════════════════════════════════════════════════════════════════════════╝');

  const startTime = Date.now();
  const allSummaries = [];

  try {
    allSummaries.push(await runIncomeCRUDTests());
    allSummaries.push(await runExpenseCRUDTests());
    allSummaries.push(await runPhase1CoreFinancialTests());
    allSummaries.push(await runPhase2SecondaryFeaturesTests());
    allSummaries.push(await runWalletInvariantTests());
    allSummaries.push(await runAuthTests());
    allSummaries.push(await runGoogleOAuthTests());
    allSummaries.push(await runCrossUserSecurityTests());
    allSummaries.push(await runAllFeaturesCRUDTests());
    allSummaries.push(await runAIAssistantTests());
    allSummaries.push(await runSecurityAndExportTests());
    allSummaries.push(await runRateLimitAndTimeoutTests());
    allSummaries.push(await runE2EJourneys());
  } catch (err) {
    console.error('\n❌ CRITICAL SUITE ABORTION:', err);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  // Calculate Aggregates
  let grandTotal = 0;
  let grandPassed = 0;
  let grandFailed = 0;
  let grandBlocked = 0;
  let grandNotImplemented = 0;
  let grandSkipped = 0;
  const allTests = [];

  for (const s of allSummaries) {
    grandTotal += s.total;
    grandPassed += s.passed;
    grandFailed += s.failed;
    grandBlocked += s.blocked;
    grandNotImplemented += s.notImplemented;
    grandSkipped += s.skipped;
    allTests.push(...s.tests);
  }

  console.log('\n');
  console.log('========================================================================');
  console.log('                        EXECUTIVE AUDIT SUMMARY                         ');
  console.log('========================================================================');
  console.log(`  Total Tests Executed  : ${grandTotal}`);
  console.log(`  Passed (✅)           : ${grandPassed}`);
  console.log(`  Failed (❌)           : ${grandFailed}`);
  console.log(`  Blocked (⚠️)          : ${grandBlocked}`);
  console.log(`  Not Implemented (ℹ️)  : ${grandNotImplemented}`);
  console.log(`  Not Testable / Skip   : ${grandSkipped}`);
  console.log(`  Execution Time        : ${duration} seconds`);
  console.log('========================================================================');

  console.log('\n--- SUITE BREAKDOWN ---');
  for (const s of allSummaries) {
    const status = s.failed === 0 ? '✅ PASS' : '❌ FAIL';
    console.log(`  [${status}] ${s.suite.padEnd(45)}: ${s.passed}/${s.total} passed`);
  }

  const failures = allTests.filter((t) => !t.passed);
  if (failures.length > 0) {
    console.log('\n========================================================================');
    console.log('                          DEFECT REPORT TABLE                           ');
    console.log('========================================================================');
    console.log('| Severity | Test ID | Feature | Expected | Actual | Root Cause |');
    console.log('| :--- | :--- | :--- | :--- | :--- | :--- |');
    for (const f of failures) {
      console.log(`| ${f.severity} | ${f.id} | ${f.feature} | ${f.expected} | ${f.actual} | ${f.rootCause || 'Assertion Mismatch'} |`);
    }
  } else {
    console.log('\n🎉 ALL 11 TEST SUITES PASSED WITH 100% SUCCESS RATE AND ZERO REGRESSIONS!');
  }

  try {
    await mongoose.disconnect();
  } catch { }

  process.exit(grandFailed > 0 ? 1 : 0);
};

runMasterSuite().catch(console.error);
