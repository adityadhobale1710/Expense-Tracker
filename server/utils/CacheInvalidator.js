/**
 * CacheInvalidator.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Thin utility called by resource controllers after mutations to immediately
 * invalidate the relevant AI context module cache(s) for the affected user.
 *
 * This ensures the AI always reads fresh data the next time the user asks
 * a question related to the changed resource — without waiting for TTL expiry.
 *
 * Usage (in a resource controller, after a successful mutation):
 *   import { invalidateAICache } from '../utils/CacheInvalidator.js';
 *   await invalidateAICache(userId, ['expenses']);
 *
 * Design:
 *   • Fire-and-forget safe — failures are caught and logged, never thrown.
 *   • Does NOT invalidate unrelated modules.
 *   • Works even if the user has no AIChat document yet (safe no-op).
 */

import AIChat from '../models/AIChat.js';
import { invalidateModules } from '../services/ai/ContextBuilder.js';
import { invalidateInsightsCache } from '../services/ai/InsightEngine.js';
import { checkAndGenerateNotifications } from '../services/ai/ProactiveNotificationEngine.js';
import logger from './logger.js';

/**
 * Invalidate specific AI context module caches for a user.
 *
 * @param {string | object} userId - MongoDB user ObjectId
 * @param {string[]} modules - Module cache keys to invalidate.
 *   Valid keys: 'wallets' | 'budgets' | 'expenses' | 'incomes' | 'goals' | 'loans' | 'subscriptions'
 * @returns {Promise<void>}
 */
export const invalidateAICache = async (userId, modules) => {
  if (!userId || !modules || modules.length === 0) return;

  try {
    // Invalidate the short-lived in-memory insights cache
    invalidateInsightsCache(userId);

    // Asynchronously scan for proactive alerts and generate notifications
    checkAndGenerateNotifications(userId).catch(err => {
      logger.warn(`[CacheInvalidator] Notification generation failed: ${err.message}`);
    });

    const chat = await AIChat.findOne({ user: userId });
    if (!chat) return; // No chat document yet — nothing to invalidate

    invalidateModules(chat, modules);
    await chat.save();

    logger.debug(`[CacheInvalidator] Invalidated [${modules.join(', ')}] for user ${userId}`);
  } catch (err) {
    // Non-critical — log and continue. The TTL will expire naturally.
    logger.warn(`[CacheInvalidator] Failed to invalidate cache for user ${userId}: ${err.message}`);
  }
};



// ─── MODULE → INVALIDATION MAP ────────────────────────────────────────────────
// User requested: "Cache only the FinancialSnapshot. Never cache partial modules independently. 
// On any mutation... invalidate FinancialSnapshot. Next request rebuilds it."

const ALL_MODULES = ['wallets', 'budgets', 'expenses', 'incomes', 'goals', 'loans', 'subscriptions'];

export const CACHE_MODULES = {
  WALLETS:       ALL_MODULES,
  BUDGETS:       ALL_MODULES,
  EXPENSES:      ALL_MODULES,
  INCOMES:       ALL_MODULES,
  GOALS:         ALL_MODULES,
  LOANS:         ALL_MODULES,
  SUBSCRIPTIONS: ALL_MODULES,
  EXPENSE_ADD:   ALL_MODULES,
  INCOME_ADD:    ALL_MODULES,
  WALLET_UPDATE: ALL_MODULES,
};

