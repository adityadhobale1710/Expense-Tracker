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
import { updateMemoryAsynchronously } from '../services/ai/MemoryService.js';
import { sendSuccess } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';
import crypto from 'crypto';

/**
 * Atomically checks and increments the user's daily quota.
 * Uses a two-step approach for exact rolling limits.
 */
const incrementDailyQuota = async (userId, reason = 'primary') => {
  const limit = parseInt(process.env.AI_DAILY_MESSAGE_LIMIT || '50', 10);
  const today = new Date().toISOString().split('T')[0];

  // 1. Try to increment today's existing record if under limit
  let updatedChat = await AIChat.findOneAndUpdate(
    { user: userId, 'dailyUsage.date': today, 'dailyUsage.count': { $lt: limit } },
    { $inc: { 'dailyUsage.count': 1 } },
    { new: true }
  );

  if (updatedChat) {
    logger.info(`[Quota] user ${userId}: ${updatedChat.dailyUsage.count}/${limit}, reason: ${reason}`);
    return { allowed: true };
  }

  // 2. Try to rollover if the date is stale
  updatedChat = await AIChat.findOneAndUpdate(
    { user: userId, 'dailyUsage.date': { $ne: today } },
    { $set: { dailyUsage: { date: today, count: 1 } } },
    { new: true }
  );

  if (updatedChat) {
    logger.info(`[Quota] user ${userId}: 1/${limit}, reason: ${reason} (rollover)`);
    return { allowed: true };
  }

  // 3. Quota exhausted for today
  return { allowed: false, limit };
};

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
    
    const userMsg = { role: 'user', content: trimmedMessage };
    const assistantMsg = { role: 'assistant', content: factReply };
    
    const updatedChat = await AIChat.findByIdAndUpdate(
      chat._id,
      { $push: { messages: { $each: [userMsg, assistantMsg], $slice: -50 } } },
      { new: true }
    );

    const resolvedModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
    return sendSuccess(res, 200, 'Reply sent', {
      userMessage: updatedChat.messages[updatedChat.messages.length - 2],
      aiMessage: updatedChat.messages[updatedChat.messages.length - 1],
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
  const promptPayload = buildPrompt(contextResult, recentMessages, trimmedMessage, chat.structuredMemory);

  // Log estimated token usage for observability
  const tokenEstimate = estimateTokens(promptPayload);
  logger.info(
    `[AI Controller] Prompt built. ` +
    `Estimated tokens — System: ${tokenEstimate.systemTokens}, ` +
    `Contents: ${tokenEstimate.contentsTokens}, ` +
    `Total: ${tokenEstimate.totalTokens}.`
  );


  // ── Phase 4: Lightweight Response Cache ─────────────────────────────────────
  const CACHE_VERSION = 1;
  // Hash the authoritative data summary and context sections to detect changes
  const contextSummaryHash = crypto.createHash('md5')
    .update(JSON.stringify({ v: CACHE_VERSION, counts, sections: contextResult.contextSections }))
    .digest('hex');
  const cacheKey = `${primaryIntent}_${trimmedMessage.toLowerCase().replace(/[^a-z0-9]/g, '')}_${contextSummaryHash}`;
  const now = Date.now();
  const cacheTTL = parseInt(process.env.AI_CACHE_TTL || '120000', 10);

  let reply;
  let cacheHit = false;

  if (chat.responseCache && chat.responseCache[cacheKey]) {
    const cached = chat.responseCache[cacheKey];
    if (now - cached.timestamp < cacheTTL) {
      logger.info(`[Cache] Cache hit for key: ${cacheKey}. Skipping Gemini.`);
      reply = cached.data;
      cacheHit = true;
    }
  }

  if (!cacheHit) {
    // ── Check Daily Quota ───────────────────────────────────────────────────
    const quota = await incrementDailyQuota(userId, 'primary-call');
    if (!quota.allowed) {
      // Calculate reset at midnight UTC
      const tomorrow = new Date();
      tomorrow.setUTCHours(24, 0, 0, 0);
      const secondsUntilMidnight = Math.floor((tomorrow.getTime() - now) / 1000);
      
      res.setHeader('Retry-After', secondsUntilMidnight);
      // Respond with JSON body for frontend detection
      res.status(429).json({ success: false, message: 'Daily AI limit reached', resetAt: tomorrow.toISOString() });
      return;
    }

    // ── 6. Call Gemini ────────────────────────────────────────────────────────
    try {

      reply = await generateAIResponse(promptPayload);

    } catch (error) {
      // Refund the quota ONLY for external AI failures (e.g. 500, 502, 503, 504)
      // Do not refund for bad request (400), auth (401/403), rate limit (429), or validation retries
      const status = error.status || 500;
      if (status >= 500 && status <= 504) {
        const today = new Date().toISOString().split('T')[0];
        await AIChat.findOneAndUpdate(
          { user: userId, 'dailyUsage.date': today },
          { $inc: { 'dailyUsage.count': -1 } }
        );
        logger.info(`[Quota] Refunded 1 quota for user ${userId} due to external AI failure: ${status}`);
      }
      res.status(status);
      throw new Error(error.message);
    }

    // Phase 5: Response Validation (with retry quota alignment)
    const validationResult = validateResponse(reply, counts, contextResult.validationContext, 'v2');

    
    if (!validationResult.isValid) {

      logger.warn(`[ResponseValidator] AI Response failed validation: ${validationResult.reason}`);
      
      // Attempt single regeneration with strict correction prompt
      try {

        // Retry Quota Alignment
        const retryQuota = await incrementDailyQuota(userId, 'validation-retry');
        if (!retryQuota.allowed) {
          logger.warn(`[ResponseValidator] Retry blocked by quota. Using deterministic fallback.`);

          reply = getFallbackFactualResponse(counts);
        } else {
          logger.info('[ResponseValidator] Attempting prompt correction and regeneration...');
          const correctionPayload = {
            systemInstruction: promptPayload.systemInstruction + `\n\nCRITICAL CORRECTION:\nYour previous response was factually incorrect: ${validationResult.reason}. Please make absolutely sure you output correct amounts and counts matching the AUTHORITATIVE DATA SUMMARY exactly.`,
            contents: promptPayload.contents,
          };

          reply = await generateAIResponse(correctionPayload);

          
          // Validate again
          const reValidation = validateResponse(reply, counts, contextResult.validationContext, 'v2');

          if (!reValidation.isValid) {
            logger.warn(`[ResponseValidator] Regenerated AI Response also failed validation: ${reValidation.reason}`);

            reply = getFallbackFactualResponse(counts);
          } else {
            logger.info('[ResponseValidator] Prompt correction successful. Regenerated response passed validation.');

          }
        }
      } catch (regenError) {
        logger.warn(`[ResponseValidator] Regeneration failed: ${regenError.message}. Using deterministic fallback.`);

        reply = getFallbackFactualResponse(counts);
      }
    } else {

    }
    
    // Prune cache occasionally to keep doc size reasonable
    if (chat.responseCache && Object.keys(chat.responseCache).length > 20) {
      const prunedCache = {};
      for (const [key, val] of Object.entries(chat.responseCache)) {
        if (now - val.timestamp < cacheTTL) prunedCache[key] = val;
      }
      await AIChat.findByIdAndUpdate(chat._id, { $set: { responseCache: prunedCache } });
    }

    await AIChat.findByIdAndUpdate(chat._id, {
      $set: { [`responseCache.${cacheKey}`]: { data: reply, timestamp: now } }
    });
  }

  // ── 7. Persist conversation ───────────────────────────────────────────────
  const userMsg = { role: 'user', content: trimmedMessage };
  const assistantMsg = { role: 'assistant', content: reply };

  const updatedChat = await AIChat.findByIdAndUpdate(
    chat._id,
    { $push: { messages: { $each: [userMsg, assistantMsg], $slice: -50 } } },
    { new: true }
  );

  const totalDuration = Date.now() - requestStart;
  logger.info(`[AI Controller] Request completed in ${totalDuration}ms.`);

  // L5: return the resolved model name so the frontend can display it accurately
  const resolvedModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';

  // ── 8. Asynchronously Update Long-Term Memory (Fire and Forget) ───────────
  // We pass the last few messages and the user's latest message to extract non-financial context.
  updateMemoryAsynchronously(chat._id, trimmedMessage, recentMessages).catch(err => {
    logger.error(`[Memory Update Failed] ${err.message}`);
  });

  // ── 9. Return response ────────────────────────────────────────────────────
  sendSuccess(res, 200, 'Reply sent', {
    userMessage: updatedChat.messages[updatedChat.messages.length - 2],
    aiMessage: updatedChat.messages[updatedChat.messages.length - 1],
    meta: { model: resolvedModel },
  });
});



