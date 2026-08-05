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

  const userId = req.user._id;
  const requestStart = Date.now();

  // ── 1. Load or initialise the chat session ────────────────────────────────
  let chat = await AIChat.findOne({ user: userId });
  if (!chat) {
    chat = await AIChat.create({ user: userId, messages: [] });
  }

  // ── 2. Detect intent ──────────────────────────────────────────────────────
  const detectedIntents = detectIntents(trimmedMessage);
  const primaryIntent = detectedIntents[0]?.intent || 'unknown';
  const topConfidence = detectedIntents[0]?.confidence || 0;

  logger.info(
    `[AI Controller] User: ${userId} | Primary intent: "${primaryIntent}" (${topConfidence}) | ` +
    `All intents: [${detectedIntents.map((d) => `${d.intent}:${d.confidence}`).join(', ')}]`
  );

  // ── 3. Build context (intent-driven, per-module cache) ────────────────────
  const contextResult = await buildContext(userId, detectedIntents, chat, trimmedMessage);


  logger.info(
    `[AI Controller] Context built. ` +
    `Modules fetched: [${contextResult.modulesFetched.join(', ') || 'none'}]. ` +
    `DB queries: ${contextResult.queryCount}. ` +
    `Cache hits: [${contextResult.cacheHits.join(', ') || 'none'}]. ` +
    `Cache misses: [${contextResult.cacheMisses.join(', ') || 'none'}].`
  );

  // ── 4. Build prompt ───────────────────────────────────────────────────────
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

  // ── 5. Call Gemini ────────────────────────────────────────────────────────
  let reply;
  try {
    reply = await generateAIResponse(promptPayload);
  } catch (error) {
    res.status(error.status || 502);
    throw new Error(error.message);
  }

  // ── 6. Persist conversation ───────────────────────────────────────────────
  chat.messages.push({ role: 'user', content: trimmedMessage });
  chat.messages.push({ role: 'assistant', content: reply });

  // Enforce 50-message rolling window
  if (chat.messages.length > 50) {
    chat.messages = chat.messages.slice(-50);
  }

  await chat.save();

  const totalDuration = Date.now() - requestStart;
  logger.info(`[AI Controller] Request completed in ${totalDuration}ms.`);

  // ── 7. Return response ────────────────────────────────────────────────────
  sendSuccess(res, 200, 'Reply sent', {
    userMessage: chat.messages[chat.messages.length - 2],
    aiMessage: chat.messages[chat.messages.length - 1],
  });
});

// @desc    Get AI Advisor financial insights
// @route   GET /api/ai/insights
export const getAIInsights = asyncHandler(async (req, res) => {
  const { generateInsights } = await import('../services/ai/InsightEngine.js');
  const insights = await generateInsights({ userId: req.user._id });
  sendSuccess(res, 200, 'AI insights fetched successfully', insights);
});

// @desc    Get Dynamic AI Monthly Report
// @route   GET /api/ai/report
export const getMonthlyReport = asyncHandler(async (req, res) => {
  const { generateMonthlyReport } = await import('../services/ai/MonthlyReportGenerator.js');
  const report = await generateMonthlyReport({ userId: req.user._id });
  sendSuccess(res, 200, 'AI monthly report generated successfully', report);
});

