/**
 * ProactiveNotificationEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Analyzes active financial risks and budgets to programmatically generate
 * proactive notifications in the database, while enforcing strict deduplication.
 */

import Notification from '../../models/Notification.js';
import { analyzeRisks } from './RiskAnalyzer.js';
import { collectFinancialData } from './DataCollector.js';
import logger from '../../utils/logger.js';

/**
 * Scan a user's financial state and generate notifications if new risks are detected.
 * Enforces a 24-hour cool-down per risk type to prevent duplicate spam.
 *
 * @param {string | object} userId - MongoDB user ObjectId
 * @param {object} [preloadedData] - Optional preloaded data to avoid DB queries
 */
export const checkAndGenerateNotifications = async (userId, preloadedData) => {
  const startTime = Date.now();

  try {
    const data = preloadedData || await collectFinancialData(userId);
    const activeRisks = analyzeRisks(data);

    if (activeRisks.length === 0) return;

    // Fetch notifications created in the last 24 hours to check for duplicates
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentNotifications = await Notification.find({
      user: userId,
      createdAt: { $gte: oneDayAgo }
    }).lean();

    const recentMessages = new Set(recentNotifications.map(n => n.message));

    const newNotifications = [];

    for (const risk of activeRisks) {
      // Map severity levels to standard notification icons
      const emoji = risk.severity === 'Critical' ? '🔴' : risk.severity === 'High' ? '🟡' : '💡';
      const msg = `${emoji} ${risk.title}: ${risk.description}`;

      // Deduplicate: skip if identical notification was sent in the last 24 hours
      if (recentMessages.has(msg)) {
        continue;
      }

      // Map risk types to standard Notification schema types
      let notificationType = 'general';
      if (risk.type === 'budget_overrun') notificationType = 'budget_exceeded';
      else if (risk.type === 'low_emergency_savings') notificationType = 'goal_milestone';
      else if (risk.type === 'high_debt_ratio') notificationType = 'reminder_due';
      else if (risk.type === 'high_subscription_burden') notificationType = 'subscription_renewal';
      else if (risk.type === 'unusual_expense') notificationType = 'high_spending';
      else if (risk.type === 'negative_cash_flow') notificationType = 'high_spending';

      newNotifications.push({
        user: userId,
        type: notificationType,
        message: msg,
        read: false
      });
    }

    if (newNotifications.length > 0) {
      await Notification.insertMany(newNotifications);
      logger.info(`[ProactiveNotificationEngine] Created ${newNotifications.length} new notification(s) for user: ${userId}`);
    }

  } catch (err) {
    logger.warn(`[ProactiveNotificationEngine] Failed to process notifications: ${err.message}`);
  }

  const duration = Date.now() - startTime;
  logger.info(`[ProactiveNotificationEngine] Verification check completed in ${duration}ms.`);
};
