/**
 * Verification Script 2: GeminiService retry logic tests
 *
 * Mocks the Gemini SDK so no real API key is needed.
 * Tests three scenarios described in the bug report:
 *   (a) 503 twice then succeeds → retries, succeeds on attempt 3
 *   (b) 400 Bad Request         → zero retries, immediate failure
 *   (c) 503 on all 3 attempts   → stops after exactly 3 attempts
 *
 * Run: node tests/verify_retry_logic.js
 */

// ── Minimal in-process mock of the Gemini SDK ─────────────────────────────────
// We replace the real GoogleGenAI with a factory that calls our scenario fn.

let scenarioFn = null;          // set per test
let callCount = 0;
let callTimestamps = [];        // to verify real time gaps between retries

// Mock GoogleGenAI class used by GeminiService
class MockGoogleGenAI {
  constructor() {
    this.models = {
      generateContent: async () => {
        const attempt = ++callCount;
        callTimestamps.push(Date.now());
        console.log(`    → SDK call #${attempt}`);
        return scenarioFn(attempt);   // may throw or return
      }
    };
  }
}

// ── Patch module system so GeminiService uses our mock ───────────────────────
// We use a dynamic import with a loader shim via global override (CJS-style).
// Since GeminiService.js is ESM, we inline a simplified copy of the retry
// logic here so the test is self-contained and dependency-free.

// ── Inline copy of the relevant helpers from GeminiService.js ────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const extractStatusCode = (err) => {
  if (err.status) {
    const n = parseInt(err.status, 10);
    if (!isNaN(n)) return n;
  }
  const grpcToHttp = { 1: 499, 4: 504, 8: 429, 14: 503, 16: 401 };
  if (err.code != null) {
    const n = parseInt(err.code, 10);
    if (grpcToHttp[n]) return grpcToHttp[n];
  }
  if (err.message) {
    const match = err.message.match(/\b(4\d{2}|5\d{2})\b/);
    if (match) return parseInt(match[1], 10);
  }
  return null;
};

const isTransientError = (err, statusCode) => {
  if (statusCode === 400 || statusCode === 401 || statusCode === 403) return false;
  if (err.message === 'TIMEOUT') return true;
  if (statusCode === 429 || statusCode === 503) return true;
  const msg = (err.message || '').toLowerCase();
  if (
    msg.includes('unavailable') ||
    msg.includes('overloaded') ||
    msg.includes('high demand') ||
    msg.includes('503')
  ) return true;
  if (
    msg.includes('fetch') ||
    msg.includes('network') ||
    msg.includes('enotfound') ||
    msg.includes('econnrefused')
  ) return true;
  return false;
};

const mapToUserError = (err, statusCode) => {
  if (statusCode === 503) {
    const e = new Error('FinMate AI is currently experiencing high demand. Please try again in a few moments.');
    e.status = 503;
    return e;
  }
  if (statusCode === 429) {
    const e = new Error('Rate limit reached. Please wait before sending another message.');
    e.status = 429;
    return e;
  }
  if (statusCode === 401 || statusCode === 403) {
    const e = new Error('AI service authentication failed.');
    e.status = statusCode;
    return e;
  }
  const e = new Error("I'm having trouble connecting to the AI service right now. Please try again in a moment.");
  e.status = statusCode || 502;
  return e;
};

/**
 * Inline replica of the retry loop from GeminiService.generateAIResponse()
 * but using MockGoogleGenAI instead of real SDK.
 */
const simulateGeminiCall = async () => {
  const maxAttempts = 3;
  const backoffDelays = [0, 2000, 4000];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt > 1) {
      const delay = backoffDelays[attempt - 1];
      console.log(`    ⏳ Backoff: waiting ${delay}ms before attempt ${attempt}...`);
      await sleep(delay);
    }

    try {
      const ai = new MockGoogleGenAI();
      const result = await ai.models.generateContent();
      return result; // success — return text
    } catch (err) {
      const statusCode = extractStatusCode(err);
      const transient = isTransientError(err, statusCode);
      console.log(`    ✗ Attempt ${attempt} failed. status=${statusCode ?? 'unknown'}, transient=${transient}`);

      if (transient && attempt < maxAttempts) {
        console.log(`    ↻ Will retry...`);
        continue;
      }

      throw mapToUserError(err, statusCode);
    }
  }
};

// ── Helper to make a 503 error ────────────────────────────────────────────────
const make503 = () => {
  const e = new Error('Service Unavailable');
  e.status = 503;
  return e;
};

const make400 = () => {
  const e = new Error('Bad Request: invalid model name');
  e.status = 400;
  return e;
};

// ─────────────────────────────────────────────────────────────────────────────
// TEST RUNNER
// ─────────────────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

const assert = (condition, label) => {
  if (condition) {
    console.log(`  ✅ PASS: ${label}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${label}`);
    failed++;
  }
};

// ── Scenario (a): 503 twice, then success ────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════');
console.log('Scenario (a): 503 twice → success on attempt 3');
console.log('══════════════════════════════════════════════════════════');

callCount = 0;
callTimestamps = [];
scenarioFn = (attempt) => {
  if (attempt <= 2) throw make503();
  return { text: 'Hello from Gemini!' };
};

const t0 = Date.now();
try {
  const result = await simulateGeminiCall();
  const elapsed = Date.now() - t0;
  assert(callCount === 3, `Exactly 3 SDK calls were made (got ${callCount})`);
  assert(result.text === 'Hello from Gemini!', 'Returned the success value');
  assert(elapsed >= 5900, `Total elapsed ≥ 6 s (2s+4s backoff). Actual: ${elapsed}ms`);
  // Check gaps between timestamps
  const gap1 = callTimestamps[1] - callTimestamps[0];
  const gap2 = callTimestamps[2] - callTimestamps[1];
  assert(gap1 >= 1900, `Gap between call 1→2 ≥ 2s. Actual: ${gap1}ms`);
  assert(gap2 >= 3900, `Gap between call 2→3 ≥ 4s. Actual: ${gap2}ms`);
} catch (e) {
  console.error('  Unexpected throw:', e.message);
  failed++;
}

// ── Scenario (b): 400 Bad Request → zero retries ─────────────────────────────
console.log('\n══════════════════════════════════════════════════════════');
console.log('Scenario (b): 400 Bad Request → zero retries');
console.log('══════════════════════════════════════════════════════════');

callCount = 0;
callTimestamps = [];
scenarioFn = () => { throw make400(); };

try {
  await simulateGeminiCall();
  console.error('  Unexpected success!');
  failed++;
} catch (e) {
  assert(callCount === 1, `Exactly 1 SDK call (no retries). Got: ${callCount}`);
  assert(e.status !== 200, `Error was thrown (not swallowed)`);
}

// ── Scenario (c): 503 on all attempts → stops after 3 ────────────────────────
console.log('\n══════════════════════════════════════════════════════════');
console.log('Scenario (c): 503 on all 3 attempts → stops after 3');
console.log('══════════════════════════════════════════════════════════');

callCount = 0;
callTimestamps = [];
scenarioFn = () => { throw make503(); };

try {
  await simulateGeminiCall();
  console.error('  Unexpected success!');
  failed++;
} catch (e) {
  assert(callCount === 3, `Exactly 3 SDK calls (maxAttempts). Got: ${callCount}`);
  assert(e.status === 503, `Mapped error has status 503. Got: ${e.status}`);
  assert(
    e.message.includes('high demand'),
    `User-friendly 503 message. Got: "${e.message}"`
  );
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('══════════════════════════════════════════════════════════\n');

if (failed > 0) process.exit(1);
