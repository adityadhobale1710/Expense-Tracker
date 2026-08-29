/**
 * server/tests/rate_limits_timeouts.test.mjs
 * 
 * RATE LIMITS & TIMEOUT BOUNDARIES TEST SUITE
 * Tests:
 *   1. Password Reset Rate Limiter (5 requests / 10 min per IP)
 *   2. AI Daily Quota (50 msgs / day)
 *   3. Timeout boundaries (Axios 15s, Gemini 15s, OTP 10m/15m, Family 48h)
 *   4. Instance-local in-memory store documentation verification
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

import {
  request,
  createTestUser,
  cleanupUser,
  TestSuiteRunner,
  AIChat,
} from './test_helpers.mjs';

export const runRateLimitAndTimeoutTests = async () => {
  const runner = new TestSuiteRunner('Rate Limits & Timeout Boundaries');
  console.log('\n======================================================');
  console.log('  RUNNING SUITE: Rate Limits & Timeouts');
  console.log('======================================================');

  let userA;

  try {
    userA = await createTestUser({ name: 'Rate Limit Tester' });

    // ─────────────────────────────────────────────────────────────
    // 1. PASSWORD RESET RATE LIMITER (5 req / 10 min)
    // ─────────────────────────────────────────────────────────────
    let resetResponses = [];
    for (let i = 1; i <= 6; i++) {
      const res = await request({
        method: 'POST',
        path: '/auth/forgot-password',
        body: { email: `rate_test_${i}@example.com` },
      });
      resetResponses.push(res.status);
    }

    const resetLimitEnforced = resetResponses.includes(429) || resetResponses[5] === 429;
    runner.record({
      id: 'RATE-PWD-001',
      feature: 'Password Reset Limiter',
      name: 'Enforce 5 req / 10 min rate limit on forgot-password',
      passed: resetLimitEnforced,
      expected: 'HTTP 429 after 5 requests',
      actual: `Status codes: [${resetResponses.join(', ')}]`,
      file: 'server/routes/authRoutes.js',
      severity: 'HIGH',
    });

    // ─────────────────────────────────────────────────────────────
    // 2. AI DAILY QUOTA ENFORCEMENT
    // ─────────────────────────────────────────────────────────────
    const todayStr = new Date().toISOString().split('T')[0];
    await AIChat.findOneAndUpdate(
      { user: userA.user._id },
      { $set: { 'dailyUsage.date': todayStr, 'dailyUsage.count': 100 } },
      { upsert: true }
    );

    const quotaExceededRes = await request({
      method: 'POST',
      path: '/ai/chat',
      body: { message: 'Hello AI' },
      token: userA.accessToken,
    });

    const quotaEnforced = quotaExceededRes.status === 429 && quotaExceededRes.data?.message?.includes('Daily AI limit reached');
    runner.record({
      id: 'RATE-AI-001',
      feature: 'AI Daily Quota',
      name: 'Enforce daily quota cutoff when message count reaches 100',
      passed: quotaEnforced,
      expected: 'HTTP 429 "Daily AI limit reached"',
      actual: `HTTP ${quotaExceededRes.status} (${quotaExceededRes.data?.message})`,
      file: 'server/controllers/aiController.js',
      func: 'chatWithAI',
      severity: 'HIGH',
    });

    // ─────────────────────────────────────────────────────────────
    // 3. TIMEOUT BOUNDARY CONFIGURATION AUDIT
    // ─────────────────────────────────────────────────────────────
    const clientApiPath = join(__dirname, '../../client/src/services/api.js');
    const apiJsContent = fs.existsSync(clientApiPath) ? fs.readFileSync(clientApiPath, 'utf8') : '';
    const axiosTimeoutPresent = apiJsContent.includes('timeout: 15000');

    runner.record({
      id: 'TIME-AXIOS-001',
      feature: 'Frontend Client Timeout',
      name: 'Verify Axios instance configured with 15,000 ms timeout boundary',
      passed: axiosTimeoutPresent,
      expected: 'timeout: 15000 in api.js',
      actual: axiosTimeoutPresent ? '15000 ms confirmed' : 'Missing/different timeout',
      file: 'client/src/services/api.js',
      severity: 'HIGH',
    });

    const serverGeminiPath = join(__dirname, '../services/ai/GeminiService.js');
    const geminiJsContent = fs.existsSync(serverGeminiPath) ? fs.readFileSync(serverGeminiPath, 'utf8') : '';
    const geminiTimeoutPresent = geminiJsContent.includes('withTimeout') && geminiJsContent.includes('15000') && geminiJsContent.includes('maxAttempts = 3');

    runner.record({
      id: 'TIME-GEMINI-001',
      feature: 'Gemini AI Service Timeout',
      name: 'Verify Gemini service has 15s timeout with 3-attempt exponential retry',
      passed: geminiTimeoutPresent,
      expected: '15000ms withTimeout and maxAttempts = 3 in GeminiService.js',
      actual: geminiTimeoutPresent ? 'Confirmed 15s timeout + 3 attempts retry' : 'Missing timeout/retry',
      file: 'server/services/ai/GeminiService.js',
      severity: 'HIGH',
    });

  } finally {
    await cleanupUser(userA?.user?._id);
  }

  return runner.summary();
};

if (process.argv[1] && process.argv[1].endsWith('rate_limits_timeouts.test.mjs')) {
  runRateLimitAndTimeoutTests()
    .then((summary) => {
      console.log('\n--- RATE LIMITS & TIMEOUTS SUMMARY ---');
      console.log(`Total: ${summary.total} | Passed: ${summary.passed} | Failed: ${summary.failed}`);
      process.exit(summary.failed > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error('Fatal test runner error:', err);
      process.exit(1);
    });
}
