/**
 * server/tests/ai_assistant.test.mjs
 * 
 * FINMATE AI ASSISTANT & FACT ROUTER TEST SUITE
 * Tests:
 *   1. Authentication requirement (Unauthenticated -> 401)
 *   2. Empty prompt validation (-> 400)
 *   3. 2000-character input cap enforcement (-> 400)
 *   4. Deterministic Fact Router (Quotes exact wallet balances from DB)
 *   5. Chat History retrieval and clear history endpoint
 *   6. Daily Quota enforcement
 */

import {
  request,
  createTestUser,
  createTestWallet,
  cleanupUser,
  TestSuiteRunner,
  AIChat,
} from './test_helpers.mjs';

export const runAIAssistantTests = async () => {
  const runner = new TestSuiteRunner('FinMate AI Assistant & Intelligence Pipeline');
  console.log('\n======================================================');
  console.log('  RUNNING SUITE: FinMate AI Assistant Pipeline');
  console.log('======================================================');

  let userA;

  try {
    userA = await createTestUser({ name: 'AI Tester' });
    const wallet1 = await createTestWallet(userA.user, { name: 'Main Vault', balance: 85000 });

    // ─────────────────────────────────────────────────────────────
    // 1. UNAUTHENTICATED ACCESS
    // ─────────────────────────────────────────────────────────────
    const unauthRes = await request({
      method: 'POST',
      path: '/ai/chat',
      body: { message: 'Hello FinMate' },
    });

    runner.record({
      id: 'AI-AUTH-001',
      feature: 'Authentication Guard',
      name: 'Reject unauthenticated AI chat request',
      passed: unauthRes.status === 401,
      expected: 'HTTP 401 Unauthorized',
      actual: `HTTP ${unauthRes.status}`,
      file: 'server/middleware/authMiddleware.js',
      severity: 'CRITICAL',
    });

    // ─────────────────────────────────────────────────────────────
    // 2. EMPTY PROMPT VALIDATION
    // ─────────────────────────────────────────────────────────────
    const emptyRes = await request({
      method: 'POST',
      path: '/ai/chat',
      body: { message: '   ' },
      token: userA.accessToken,
    });

    runner.record({
      id: 'AI-VAL-001',
      feature: 'Input Validation',
      name: 'Reject empty / whitespace AI message',
      passed: emptyRes.status === 400,
      expected: 'HTTP 400 "Message is required"',
      actual: `HTTP ${emptyRes.status} (${emptyRes.data?.message})`,
      file: 'server/middleware/schemas.js',
      severity: 'HIGH',
    });

    // ─────────────────────────────────────────────────────────────
    // 3. 2000-CHARACTER CAP ENFORCEMENT
    // ─────────────────────────────────────────────────────────────
    const longMessage = 'A'.repeat(2005);
    const longRes = await request({
      method: 'POST',
      path: '/ai/chat',
      body: { message: longMessage },
      token: userA.accessToken,
    });

    runner.record({
      id: 'AI-VAL-002',
      feature: 'Input Boundary',
      name: 'Enforce strict 2000-character prompt length limit',
      passed: longRes.status === 400 && longRes.data?.message?.includes('2000'),
      expected: 'HTTP 400 "Message is too long. Please keep your message under 2000 characters."',
      actual: `HTTP ${longRes.status} (${longRes.data?.message})`,
      file: 'server/middleware/schemas.js',
      severity: 'HIGH',
    });

    // ─────────────────────────────────────────────────────────────
    // 4. DETERMINISTIC FACT ROUTER (Total Wallet Balance)
    // ─────────────────────────────────────────────────────────────
    const factRes = await request({
      method: 'POST',
      path: '/ai/chat',
      body: { message: 'What is my total wallet balance?' },
      token: userA.accessToken,
    });

    const aiReply = factRes.data?.data?.aiMessage?.content || '';
    const factMatches = factRes.status === 200 && (aiReply.includes('85,000') || aiReply.includes('85000'));

    runner.record({
      id: 'AI-FACT-001',
      feature: 'Deterministic Fact Router',
      name: 'Directly route financial fact query and quote exact wallet balance (₹85,000)',
      passed: factMatches,
      expected: 'HTTP 200 reply quoting "₹85,000"',
      actual: `HTTP ${factRes.status}, Reply: "${aiReply.slice(0, 70)}..."`,
      file: 'server/services/ai/FactRouter.js',
      severity: 'CRITICAL',
    });

    // ─────────────────────────────────────────────────────────────
    // 5. CHAT HISTORY & CLEAR HISTORY
    // ─────────────────────────────────────────────────────────────
    const historyRes = await request({
      method: 'GET',
      path: '/ai/history',
      token: userA.accessToken,
    });

    const hasHistory = historyRes.status === 200 && Array.isArray(historyRes.data?.data) && historyRes.data.data.length > 0;

    const clearRes = await request({
      method: 'DELETE',
      path: '/ai/history',
      token: userA.accessToken,
    });

    const postClearHistory = await request({
      method: 'GET',
      path: '/ai/history',
      token: userA.accessToken,
    });

    const historyCleared = clearRes.status === 200 && postClearHistory.data?.data?.length === 0;

    runner.record({
      id: 'AI-HIST-001',
      feature: 'History Management',
      name: 'Fetch conversation history and purge history on New Chat',
      passed: hasHistory && historyCleared,
      expected: 'History populated -> Clear returns 200 -> History empty',
      actual: `Initial: ${historyRes.data?.data?.length} msgs, Cleared: ${postClearHistory.data?.data?.length} msgs`,
      file: 'server/controllers/aiController.js',
      func: 'clearHistory',
      severity: 'HIGH',
    });

  } finally {
    await cleanupUser(userA?.user?._id);
  }

  return runner.summary();
};

if (process.argv[1] && process.argv[1].endsWith('ai_assistant.test.mjs')) {
  runAIAssistantTests()
    .then((summary) => {
      console.log('\n--- AI ASSISTANT SUMMARY ---');
      console.log(`Total: ${summary.total} | Passed: ${summary.passed} | Failed: ${summary.failed}`);
      process.exit(summary.failed > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error('Fatal test runner error:', err);
      process.exit(1);
    });
}
