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
 * Executes an async operation with an AbortController-based timeout.
 * Passes an AbortSignal to the callback and aborts the underlying request if timeout is reached.
 * @param {(signal: AbortSignal) => Promise<any>} operation 
 * @param {number} ms 
 */
const withTimeout = async (operation, ms = 30000) => {
  const controller = new AbortController();
  let timedOut = false;

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, ms);

  try {
    return await operation(controller.signal);
  } catch (err) {
    if (timedOut || err.name === 'AbortError' || controller.signal.aborted) {
      const timeoutError = new Error('TIMEOUT');
      timeoutError.status = 504;
      throw timeoutError;
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
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

  logger.info(`[Gemini Service] Request started (intelligent context). Contents: ${contents.length} message(s). Timeout: 30s.`);

  try {
    const ai = getGenAIClient();
    const modelName = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

    logger.info(`[Gemini Service] Using model: ${modelName}`);

    // Execute the API call with a single abortable 30-second timeout
    const result = await withTimeout(
      (signal) =>
        ai.models.generateContent({
          model: modelName,
          contents,
          config: {
            abortSignal: signal,
            systemInstruction: { parts: [{ text: systemInstructionText }] },
          },
        }),
      30000
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

    logger.error(
      `[Gemini Service] Request failed after ${duration}ms: ${err.message}`,
      { statusCode, name: err.name, stack: err.stack }
    );

    throw mapToUserError(err, statusCode);
  }
};

