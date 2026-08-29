/**
 * server/tests/google_oauth.test.mjs
 * 
 * GOOGLE OAUTH 2.0 & CSRF STATE VERIFICATION TEST SUITE
 * Tests:
 *   1. OAuth Initiation Redirect & CSRF State Cookie Setting
 *   2. CSRF State Validation & Mismatch Attack Mitigation
 *   3. Missing State Parameter Rejection
 *   4. Graceful User Cancellation Redirect Handling
 */

import {
  request,
  TestSuiteRunner,
} from './test_helpers.mjs';

export const runGoogleOAuthTests = async () => {
  const runner = new TestSuiteRunner('Google OAuth & CSRF Security');
  console.log('\n======================================================');
  console.log('  RUNNING SUITE: Google OAuth & CSRF Security');
  console.log('======================================================');

  // ─────────────────────────────────────────────────────────────
  // 1. INITIATION REDIRECT & CSRF COOKIE
  // ─────────────────────────────────────────────────────────────
  const initRes = await request({
    method: 'GET',
    path: '/auth/google',
  });

  const isRedirect = initRes.status === 302;
  const targetUrl = initRes.location || '';
  const hasStateInLocation = targetUrl.includes('state=');
  const setsStateCookie = initRes.setCookie && initRes.setCookie.includes('oauth_state');

  runner.record({
    id: 'OAUTH-INIT-001',
    feature: 'OAuth Initiation',
    name: 'Generate random state, set secure cookie and redirect (302) to Google Accounts',
    passed: isRedirect && hasStateInLocation && Boolean(setsStateCookie),
    expected: 'HTTP 302 with state query param and oauth_state cookie',
    actual: `HTTP ${initRes.status}, Cookie: ${Boolean(setsStateCookie)}`,
    file: 'server/controllers/authController.js',
    func: 'googleAuth',
    severity: 'CRITICAL',
  });

  // ─────────────────────────────────────────────────────────────
  // 2. CSRF ATTACK MITIGATION (MISMATCHED STATE)
  // ─────────────────────────────────────────────────────────────
  const csrfMismatchRes = await request({
    method: 'GET',
    path: '/auth/google/callback?code=fake_code_123&state=attacker_state',
    cookie: 'oauth_state=legitimate_user_state',
  });

  const csrfBlocked = csrfMismatchRes.status === 302 && (csrfMismatchRes.location?.includes('googleAuth=error') || csrfMismatchRes.location?.includes('Security%20validation%20failed'));

  runner.record({
    id: 'OAUTH-CSRF-001',
    feature: 'CSRF Protection',
    name: 'Block callback when state in query mismatches oauth_state cookie',
    passed: csrfBlocked,
    expected: 'HTTP 302 redirect with security error message',
    actual: `HTTP ${csrfMismatchRes.status}, Location: ${csrfMismatchRes.location}`,
    file: 'server/controllers/authController.js',
    func: 'googleCallback',
    severity: 'CRITICAL',
  });

  // ─────────────────────────────────────────────────────────────
  // 3. MISSING STATE ENTIRELY
  // ─────────────────────────────────────────────────────────────
  const missingStateRes = await request({
    method: 'GET',
    path: '/auth/google/callback?code=fake_code_123',
  });

  const missingStateBlocked = missingStateRes.status === 302 && (missingStateRes.location?.includes('googleAuth=error') || missingStateRes.location?.includes('Security%20validation%20failed'));

  runner.record({
    id: 'OAUTH-CSRF-002',
    feature: 'CSRF Protection',
    name: 'Block callback when state parameter or cookie is missing entirely',
    passed: missingStateBlocked,
    expected: 'HTTP 302 redirect with security error message',
    actual: `HTTP ${missingStateRes.status}, Location: ${missingStateRes.location}`,
    file: 'server/controllers/authController.js',
    func: 'googleCallback',
    severity: 'CRITICAL',
  });

  // ─────────────────────────────────────────────────────────────
  // 4. USER CANCELLATION HANDLING
  // ─────────────────────────────────────────────────────────────
  const state = 'fa271e8231b09af0376289bff274d90d';
  const cancelRes = await request({
    method: 'GET',
    path: `/auth/google/callback?error=access_denied&state=${state}`,
    cookie: `oauth_state=${state}`,
  });

  const cancelHandled = cancelRes.status === 302 && cancelRes.location?.includes('googleAuth=error') && cancelRes.location?.includes('cancelled');

  runner.record({
    id: 'OAUTH-FLOW-001',
    feature: 'Error Handling',
    name: 'Handle Google user cancellation with friendly error redirect',
    passed: cancelHandled,
    expected: 'HTTP 302 redirect to /login with cancellation message',
    actual: `HTTP ${cancelRes.status}, Location: ${cancelRes.location}`,
    file: 'server/controllers/authController.js',
    func: 'googleCallback',
    severity: 'MEDIUM',
  });

  return runner.summary();
};

if (process.argv[1] && process.argv[1].endsWith('google_oauth.test.mjs')) {
  runGoogleOAuthTests()
    .then((summary) => {
      console.log('\n--- GOOGLE OAUTH SUMMARY ---');
      console.log(`Total: ${summary.total} | Passed: ${summary.passed} | Failed: ${summary.failed}`);
      process.exit(summary.failed > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error('Fatal test runner error:', err);
      process.exit(1);
    });
}
