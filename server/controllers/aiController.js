/**
 * aiController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Thin orchestrator for the AI Assistant pipeline.
 *
 * Flow:
 *   1. Detect intent   → IntentDetector
 *   2. Build context   → ContextBuilder   (per-module cache + selective DB queries)
 *   3. Build prompt    → PromptBuilder    (system instruction + security rules)
 *   4. Call Gemini     → GeminiService    (retry + backoff)
 *   5. Save + respond
 *
 * This controller imports NO Mongoose models directly.
 * All business logic lives in the dedicated service layer.
 */

import asyncHandler from 'express-async-handler';
import AIChat from '../models/AIChat.js';
import { detectIntents } from '../services/ai/IntentDetector.js';
import { buildContext } from '../services/ai/ContextBuilder.js';
import { buildPrompt, estimateTokens } from '../services/ai/PromptBuilder.js';
import { generateAIResponse } from '../services/ai/GeminiService.js';
import { routeFact } from '../services/ai/FactRouter.js';
import { validateResponse, getFallbackFactualResponse } from '../services/ai/ResponseValidator.js';
import { sendSuccess } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';

// ─── GET CHAT HISTORY ─────────────────────────────────────────────────────────

// @desc    Get AI Chat History
// @route   GET /api/ai/history
export const getChatHistory = asyncHandler(async (req, res) => {
  let chat = await AIChat.findOne({ user: req.user._id });
  if (!chat) {
    chat = await AIChat.create({ user: req.user._id, messages: [] });
  }

  // Parse optional limit query parameter, default to 50
  const queryLimit = parseInt(req.query.limit, 10);
  const limit = (!isNaN(queryLimit) && queryLimit > 0) ? queryLimit : 50;
  const returnedMessages = chat.messages.slice(-limit);

  sendSuccess(res, 200, 'Chat history retrieved', returnedMessages);
});

// ─── SEND MESSAGE ─────────────────────────────────────────────────────────────

// @desc    Send Message to AI assistant
// @route   POST /api/ai/chat
export const sendMessage = asyncHandler(async (req, res) => {
  const { message } = req.body;

  // Validate
  const trimmedMessage = typeof message === 'string' ? message.trim() : '';
  if (!trimmedMessage) {
    res.status(400);
    throw new Error('Message is required');
  }

  // M6: Reject messages that exceed the character limit before any expensive processing
  if (trimmedMessage.length > 2000) {
    res.status(400);
    throw new Error('Message is too long. Please keep your message under 2000 characters.');
  }

  const userId = req.user._id;
  const requestStart = Date.now();

  // ── 1. Check Fact Router (Simple Fact Router - Phase 6) ───────────────────
  const factReply = await routeFact(userId, trimmedMessage);
  if (factReply) {
    // Load or initialise the chat session to save history
    let chat = await AIChat.findOne({ user: userId });
    if (!chat) {
      chat = await AIChat.create({ user: userId, messages: [] });
    }
    chat.messages.push({ role: 'user', content: trimmedMessage });
    chat.messages.push({ role: 'assistant', content: factReply });
    if (chat.messages.length > 50) {
      chat.messages = chat.messages.slice(-50);
    }
    await chat.save();

    const resolvedModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
    return sendSuccess(res, 200, 'Reply sent', {
      userMessage: chat.messages[chat.messages.length - 2],
      aiMessage: chat.messages[chat.messages.length - 1],
      meta: { model: resolvedModel + ' (Deterministic Fact Router)' },
    });
  }

  // ── 2. Load or initialise the chat session ────────────────────────────────
  let chat = await AIChat.findOne({ user: userId });
  if (!chat) {
    chat = await AIChat.create({ user: userId, messages: [] });
  }

  // ── 3. Detect intent ──────────────────────────────────────────────────────
  const detectedIntents = detectIntents(trimmedMessage);
  const primaryIntent = detectedIntents[0]?.intent || 'unknown';
  const topConfidence = detectedIntents[0]?.confidence || 0;

  logger.info(
    `[AI Controller] User: ${userId} | Primary intent: "${primaryIntent}" (${topConfidence}) | ` +
    `All intents: [${detectedIntents.map((d) => `${d.intent}:${d.confidence}`).join(', ')}]`
  );

  // ── 4. Build context (intent-driven, per-module cache) ────────────────────
  const contextResult = await buildContext(userId, detectedIntents, chat, trimmedMessage);
  const counts = contextResult.counts || { wallets: 0, budgets: 0, expenses: 0, incomes: 0, goals: 0, loans: 0, subscriptions: 0, transactions: 0 };

  // Phase 3 — Audit Logging (Temporary Context Log)
  logger.info(`
=== TEMPORARY AI REQUEST CONTEXT AUDIT LOG ===
User Question: "${trimmedMessage}"
Detected Intent: "${primaryIntent}"
Wallets Count: ${counts.wallets}
Budgets Count: ${counts.budgets}
Goals Count: ${counts.goals}
Expenses Count: ${counts.expenses}
Incomes Count: ${counts.incomes}
Loans Count: ${counts.loans}
Subscriptions Count: ${counts.subscriptions}
Transactions Count: ${counts.transactions}
Cache Status: ${contextResult.cacheHits.length === 7 ? 'Full Cache HIT' : contextResult.cacheMisses.length > 0 ? 'Cache MISS' : 'Partial'}
Modules Loaded: [${contextResult.modulesFetched.join(', ') || 'none'}]
Modules Reloaded: [${contextResult.cacheMisses.join(', ') || 'none'}]
Modules From Cache: [${contextResult.cacheHits.join(', ') || 'none'}]
Final Context Object: ${JSON.stringify(contextResult.contextSections)}
==============================================
`);

  logger.info(
    `[AI Controller] Context built. ` +
    `Modules fetched: [${contextResult.modulesFetched.join(', ') || 'none'}]. ` +
    `DB queries: ${contextResult.queryCount}. ` +
    `Cache hits: [${contextResult.cacheHits.join(', ') || 'none'}]. ` +
    `Cache misses: [${contextResult.cacheMisses.join(', ') || 'none'}].`
  );

  // ── 5. Build prompt ───────────────────────────────────────────────────────
  // Use last 15 messages for conversation context
  const recentMessages = chat.messages.slice(-15);
  const promptPayload = buildPrompt(contextResult, recentMessages, trimmedMessage);

  // Log estimated token usage for observability
  const tokenEstimate = estimateTokens(promptPayload);
  logger.info(
    `[AI Controller] Prompt built. ` +
    `Estimated tokens — System: ${tokenEstimate.systemTokens}, ` +
    `Contents: ${tokenEstimate.contentsTokens}, ` +
    `Total: ${tokenEstimate.totalTokens}.`
  );

  // ── 6. Call Gemini ────────────────────────────────────────────────────────
  let reply;
  try {
    reply = await generateAIResponse(promptPayload);
  } catch (error) {
    res.status(error.status || 502);
    throw new Error(error.message);
  }

  // Phase 5: Response Validation
  const validationResult = validateResponse(reply, counts);
  if (!validationResult.isValid) {
    logger.warn(`[ResponseValidator] AI Response failed validation: ${validationResult.reason}`);
    
    // Attempt single regeneration with strict correction prompt
    try {
      logger.info('[ResponseValidator] Attempting prompt correction and regeneration...');
      const correctionPayload = {
        systemInstruction: promptPayload.systemInstruction + `\n\nCRITICAL CORRECTION:\nYour previous response was factually incorrect: ${validationResult.reason}. Please make absolutely sure you output correct counts matching the AUTHORITATIVE DATA SUMMARY.`,
        contents: promptPayload.contents,
      };
      reply = await generateAIResponse(correctionPayload);
      
      // Validate again
      const reValidation = validateResponse(reply, counts);
      if (!reValidation.isValid) {
        logger.warn(`[ResponseValidator] Regenerated AI Response also failed validation: ${reValidation.reason}`);
        // Fall back to direct backend summary formatting
        reply = getFallbackFactualResponse(counts);
      } else {
        logger.info('[ResponseValidator] Prompt correction successful. Regenerated response passed validation.');
      }
    } catch (regenError) {
      logger.warn(`[ResponseValidator] Regeneration failed: ${regenError.message}. Using deterministic fallback.`);
      reply = getFallbackFactualResponse(counts);
    }
  }

  // ── 7. Persist conversation ───────────────────────────────────────────────
  chat.messages.push({ role: 'user', content: trimmedMessage });
  chat.messages.push({ role: 'assistant', content: reply });

  // Enforce 50-message rolling window
  if (chat.messages.length > 50) {
    chat.messages = chat.messages.slice(-50);
  }

  await chat.save();

  const totalDuration = Date.now() - requestStart;
  logger.info(`[AI Controller] Request completed in ${totalDuration}ms.`);

  // L5: return the resolved model name so the frontend can display it accurately
  const resolvedModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';

  // ── 8. Return response ────────────────────────────────────────────────────
  sendSuccess(res, 200, 'Reply sent', {
    userMessage: chat.messages[chat.messages.length - 2],
    aiMessage: chat.messages[chat.messages.length - 1],
    meta: { model: resolvedModel },
  });
});

// @desc    Get AI Advisor financial insights
// @route   GET /api/ai/insights
export const getAIInsights = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  // M7: load (or upsert) the chat document here so generateInsights reuses it
  // instead of issuing its own findOneAndUpdate.
  const chat = await AIChat.findOneAndUpdate(
    { user: userId },
    {},
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const { generateInsights } = await import('../services/ai/InsightEngine.js');
  const insights = await generateInsights({ userId, chat });
  sendSuccess(res, 200, 'AI insights fetched successfully', insights);
});

// @desc    Get Dynamic AI Monthly Report
// @route   GET /api/ai/report
export const getMonthlyReport = asyncHandler(async (req, res) => {
  const { generateMonthlyReport } = await import('../services/ai/MonthlyReportGenerator.js');
  const report = await generateMonthlyReport({ userId: req.user._id });
  sendSuccess(res, 200, 'AI monthly report generated successfully', report);
});

