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
 * Executes a function with a timeout.
 * @param {Promise} promise 
 * @param {number} ms 
 */
const withTimeout = (promise, ms = 15000) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('TIMEOUT'));
    }, ms);
  });
  return Promise.race([
    promise.finally(() => clearTimeout(timeoutId)),
    timeoutPromise
  ]);
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
 * Return true for transient errors that are safe to retry.
 * Permanent errors (4xx auth/validation) should never be retried.
 * @param {Error} err
 * @param {number|null} statusCode
 * @returns {boolean}
 */
const isTransientError = (err, statusCode) => {
  // Permanent: auth failures and bad requests
  if (statusCode === 400 || statusCode === 401 || statusCode === 403) return false;

  // TIMEOUT sentinel
  if (err.message === 'TIMEOUT') return true;

  // Rate-limited or server overloaded
  if (statusCode === 429 || statusCode === 503) return true;

  // Text-based overload / unavailability signals from the SDK message
  const msg = (err.message || '').toLowerCase();
  if (
    msg.includes('unavailable') ||
    msg.includes('overloaded') ||
    msg.includes('high demand') ||
    msg.includes('503')
  ) return true;

  // Network-level transient failures
  if (
    msg.includes('fetch') ||
    msg.includes('network') ||
    msg.includes('enotfound') ||
    msg.includes('econnrefused')
  ) return true;

  return false;
};

/**
 * Return a sleep Promise for `ms` milliseconds.
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

  if (err.message === 'TIMEOUT' || statusCode === 504) {
    message = 'The AI service took too long to respond. Please try again in a moment.';
    const e = new Error(message);
    e.status = 504;
    return e;
  }

  if (statusCode === 503) {
    message = 'FinMate AI is currently experiencing high demand. Please try again in a few moments.';
    const e = new Error(message);
    e.status = 503;
    return e;
  }

  if (statusCode === 429) {
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
 * Generate context-aware financial assistant response using Google Gemini.
 *
 * @param {{ systemInstruction: string, contents: Array }} payload
 * @returns {Promise<string>} The assistant response text.
 */
export const generateAIResponse = async ({ systemInstruction, contents }) => {
  const startTime = Date.now();
  const systemInstructionText = systemInstruction;

  logger.info(`[Gemini Service] Request started (intelligent context). Contents: ${contents.length} message(s).`);

  const maxAttempts = 3;
  // Backoff delays in ms: before attempt 2 → 2 s, before attempt 3 → 4 s
  const backoffDelays = [0, 2000, 4000];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Apply backoff before every retry (not before the first attempt)
    if (attempt > 1) {
      const delay = backoffDelays[attempt - 1];
      logger.info(`[Gemini Service] Waiting ${delay}ms before attempt ${attempt}/${maxAttempts}...`);
      await sleep(delay);
    }

    try {
      const ai = getGenAIClient();
      const modelName = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

      logger.info(`[Gemini Service] Using model: ${modelName}`);

      // Race the API call with a 15-second timeout
      const result = await withTimeout(
        ai.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction: { parts: [{ text: systemInstructionText }] },
          },
        }),
        15000
      );

      const reply = result.text;
      const duration = Date.now() - startTime;

      const usageMetadata = result.usageMetadata;
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

    } catch (err) {
      const duration = Date.now() - startTime;
      const statusCode = extractStatusCode(err);

      logger.warn(
        `[Gemini Service] Attempt ${attempt}/${maxAttempts} failed after ${duration}ms: ${err.message}`,
        { statusCode, name: err.name }
      );

      const transient = isTransientError(err, statusCode);

      if (transient && attempt < maxAttempts) {
        logger.info(`[Gemini Service] Transient error (status ${statusCode ?? 'unknown'}) — will retry...`);
        continue;
      }

      logger.error(
        `[Gemini Service] Request failed permanently on attempt ${attempt}. Error: ${err.message}`,
        { statusCode, name: err.name, stack: err.stack }
      );

      throw mapToUserError(err, statusCode);
    }
  }
};

