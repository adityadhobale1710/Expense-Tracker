import { GoogleGenAI } from '@google/genai';
import logger from '../../utils/logger.js';

// Helper to initialize and retrieve GenAI client
const getGenAIClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('MISSING_API_KEY');
  }
  return new GoogleGenAI({ apiKey });
};




/**
 * Extract a numeric HTTP status code from a Gemini SDK error object.
 * The SDK's error shape varies across versions:
 *   - err.status  (number or string like "503")
 *   - err.code    (gRPC integer, e.g. 14 for UNAVAILABLE)
 *   - err.message (may contain "[503 Service Unavailable]" or "status: 503")
 * @param {Error} err
 * @returns {number|null}
 */
const extractStatusCode = (err) => {
  // Direct numeric or string status field
  if (err.status) {
    const n = parseInt(err.status, 10);
    if (!isNaN(n)) return n;
  }

  // gRPC code → HTTP mapping for the codes we care about
  const grpcToHttp = { 1: 499, 4: 504, 8: 429, 14: 503, 16: 401 };
  if (err.code != null) {
    const n = parseInt(err.code, 10);
    if (grpcToHttp[n]) return grpcToHttp[n];
  }

  // Regex fallback: look for a 3-digit HTTP code in the message
  if (err.message) {
    const match = err.message.match(/\b(4\d{2}|5\d{2})\b/);
    if (match) return parseInt(match[1], 10);
  }

  return null;
};



/**
 * Returns true when Gemini signals that the project's daily or free-tier quota
 * for a specific model has been fully exhausted.
 *
 * Fingerprint: RESOURCE_EXHAUSTED (429 / gRPC 8) whose error detail references
 * the free-tier per-day metric:
 *   "GenerateRequestsPerDayPerProjectPerModel-FreeTier"
 *
 * This is a hard quota boundary — retrying with another model does NOT help
 * because the exhaustion is scoped to the project key, not the model.
 * No fallback should be attempted.
 *
 * @param {Error} err
 * @param {number|null} statusCode
 * @returns {boolean}
 */
const isQuotaExhausted = (err, statusCode) => {
  if (statusCode !== 429 && err.code !== 8) return false;
  if (typeof err.message !== 'string') return false;
  const msg = err.message.toLowerCase();
  // Google embeds the metric name in the error message / details
  return (
    msg.includes('generaterequeststsperdayperprojectpermodel-freetier') ||
    msg.includes('per_day') ||
    msg.includes('daily') ||
    msg.includes('free_tier') ||
    msg.includes('free-tier') ||
    msg.includes('quota exceeded for metric') ||
    msg.includes('resource_exhausted')
  );
};

/**
 * Returns true when Gemini signals a temporary (short-term) rate limit that
 * is NOT a daily quota exhaustion — i.e. it makes sense to try a different
 * model immediately.
 *
 * Covers:
 *   - gRPC code 8 (RESOURCE_EXHAUSTED) without the daily-quota fingerprint
 *   - HTTP 429 without the daily-quota fingerprint
 *
 * @param {Error} err
 * @param {number|null} statusCode
 * @returns {boolean}
 */
const isTemporary429 = (err, statusCode) => {
  if (statusCode !== 429 && err.code !== 8) return false;
  // If it IS a daily quota error, it is NOT a temporary rate limit
  return !isQuotaExhausted(err, statusCode);
};

/**
 * Map the final error to a user-friendly message and attach the HTTP status
 * so that the controller can pass it through to the client.
 * @param {Error} err
 * @param {number|null} statusCode
 * @returns {Error} A new Error with .message and .status set.
 */
const mapToUserError = (err, statusCode) => {
  let message;

  if (err.message === 'MISSING_API_KEY') {
    message = 'AI Assistant is currently unavailable because the API key is not configured on the server. Please contact support.';
    const e = new Error(message);
    e.status = 503;
    return e;
  }

  // Daily / free-tier quota exhausted — surface a clear, specific message.
  if (err.message === 'QUOTA_EXHAUSTED' || isQuotaExhausted(err, statusCode)) {
    message = 'Gemini AI usage quota has been reached for this project. Please try again later.';
    const e = new Error(message);
    e.status = 429;
    return e;
  }

  if (statusCode === 503) {
    message = 'FinMate AI is currently experiencing high demand. Please try again in a few moments.';
    const e = new Error(message);
    e.status = 503;
    return e;
  }

  if (statusCode === 429) {
    // Generic temporary rate-limit (not a daily quota)
    message = 'Rate limit reached. Please wait before sending another message.';
    const e = new Error(message);
    e.status = 429;
    return e;
  }

  if (statusCode === 401 || statusCode === 403) {
    message = 'AI service authentication failed.';
    const e = new Error(message);
    e.status = statusCode;
    return e;
  }

  // Generic connectivity fallback
  message = "I'm having trouble connecting to the AI service right now. Please try again in a moment.";
  const e = new Error(message);
  e.status = statusCode || 502;
  return e;
};

/**
 * Returns true for errors where trying the fallback model may succeed:
 *   - 503 / UNAVAILABLE  → model temporarily overloaded
 *   - Temporary 429      → short-term rate limit (NOT daily quota exhaustion)
 *
 * 400, 401, 403, 404, daily-quota 429, and programming errors are NOT fallbackable.
 *
 * @param {Error} err
 * @param {number|null} statusCode
 * @returns {boolean}
 */
const isFallbackable = (err, statusCode) => {
  // 503 / UNAVAILABLE — model is temporarily overloaded
  if (statusCode === 503) return true;
  if (err.code === 14) return true; // gRPC UNAVAILABLE
  if (typeof err.message === 'string') {
    const msg = err.message.toLowerCase();
    if (msg.includes('unavailable') || msg.includes('high demand') || msg.includes('temporarily unavailable')) return true;
  }
  // Temporary 429 (short-term rate limit only — daily quota is NOT fallbackable)
  if (isTemporary429(err, statusCode)) return true;
  return false;
};

/**
 * Make a single generateContent call against a specific model.
 * Returns the raw SDK result object.
 * @param {GoogleGenAI} ai
 * @param {string} model
 * @param {Array} contents
 * @param {string} systemInstructionText
 */
const callGemini = (ai, model, contents, systemInstructionText) =>
  ai.models.generateContent({
    model,
    contents,
    config: {
      systemInstruction: { parts: [{ text: systemInstructionText }] },
    },
  });

/**
 * Generate context-aware financial assistant response using Google Gemini.
 *
 * Attempt order:
 *   1. PRIMARY_MODEL  (env GEMINI_MODEL, default gemini-3.6-flash)
 *   2. FALLBACK_MODEL (gemini-2.0-flash) — only if primary returns:
 *        • 503 / UNAVAILABLE  (model temporarily overloaded)
 *        • Temporary 429      (short-term rate limit, NOT daily quota)
 *
 * Daily/free-tier quota exhaustion (RESOURCE_EXHAUSTED) is NOT retried.
 * At most one fallback attempt is made; no fixed timeout is introduced.
 *
 * @param {{ systemInstruction: string, contents: Array }} payload
 * @returns {Promise<string>} The assistant response text.
 */
export const generateAIResponse = async ({ systemInstruction, contents }) => {
  const startTime = Date.now();
  const systemInstructionText = systemInstruction;

  // Primary model from env; hard-coded fallback for when env is absent.
  const PRIMARY_MODEL   = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  const FALLBACK_MODEL  = 'gemini-2.0-flash';

  logger.info(`[Gemini Service] Request started (intelligent context). Contents: ${contents.length} message(s).`);

  const ai = getGenAIClient();

  // ── Attempt 1: Primary model ────────────────────────────────────────────────
  let primaryResult;
  let primaryFailed = false;
  let primaryStatusCode = null;

  logger.info(`[Gemini Service] Using primary model: ${PRIMARY_MODEL}`);

  try {
    primaryResult = await callGemini(ai, PRIMARY_MODEL, contents, systemInstructionText);
  } catch (primaryErr) {
    primaryFailed = true;
    primaryStatusCode = extractStatusCode(primaryErr);

    logger.error(
      `[Gemini Service] Primary model failed after ${Date.now() - startTime}ms: ${primaryErr.message}`,
      { statusCode: primaryStatusCode, name: primaryErr.name }
    );

    // ── Daily / free-tier quota exhausted — do NOT retry ────────────────────
    // This is a project-level hard limit. Trying another model will not help.
    if (isQuotaExhausted(primaryErr, primaryStatusCode)) {
      logger.error(`[Gemini Service] Daily free-tier quota exhausted for ${PRIMARY_MODEL}. No retry will be attempted.`);
      throw mapToUserError(primaryErr, primaryStatusCode);
    }

    // ── Attempt 2: Fallback model (503 / temporary-429 only) ────────────────
    if (isFallbackable(primaryErr, primaryStatusCode)) {
      // Build a specific log line per error type for easy log triage
      if (primaryStatusCode === 503 || err?.code === 14) {
        logger.info(`[Gemini Service] Primary model returned 503 (UNAVAILABLE). Trying fallback model: ${FALLBACK_MODEL}`);
      } else {
        logger.info(`[Gemini Service] Primary model returned temporary 429 (rate limit). Trying fallback model: ${FALLBACK_MODEL}`);
      }

      try {
        const fallbackStart = Date.now();
        primaryResult = await callGemini(ai, FALLBACK_MODEL, contents, systemInstructionText);
        logger.info(`[Gemini Service] Fallback model succeeded in ${Date.now() - fallbackStart}ms.`);
        primaryFailed = false; // Fallback succeeded — treat as success.
      } catch (fallbackErr) {
        const fallbackStatusCode = extractStatusCode(fallbackErr);
        logger.error(
          `[Gemini Service] Fallback model failed after ${Date.now() - startTime}ms: ${fallbackErr.message}`,
          { statusCode: fallbackStatusCode, name: fallbackErr.name }
        );
        logger.error('[Gemini Service] No Gemini model available. Both primary and fallback failed.');
        throw mapToUserError(fallbackErr, fallbackStatusCode);
      }
    } else {
      // Non-recoverable error (400, 401, 403, …) — do not attempt fallback.
      throw mapToUserError(primaryErr, primaryStatusCode);
    }
  }

  // ── Success path (primary or fallback) ─────────────────────────────────────
  const reply = primaryResult.text;
  const duration = Date.now() - startTime;

  const usageMetadata = primaryResult.usageMetadata;
  if (usageMetadata) {
    logger.info(
      `[Gemini Service] Completed in ${duration}ms. ` +
      `Tokens — Prompt: ${usageMetadata.promptTokenCount}, ` +
      `Candidates: ${usageMetadata.candidatesTokenCount}, ` +
      `Total: ${usageMetadata.totalTokenCount}`
    );
  } else {
    logger.info(`[Gemini Service] Completed in ${duration}ms.`);
  }

  return reply;
};

