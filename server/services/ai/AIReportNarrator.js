/**
 * AIReportNarrator.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Formats financial snapshot calculations into a prompt schema and invokes
 * Gemini to produce a narrative-style summary and action plan.
 */

import { generateAIResponse } from './GeminiService.js';
import logger from '../../utils/logger.js';

/**
 * Communicates with Gemini to build a concise, friendly executive narration.
 * 
 * @param {object} snapshot - Normalized financial snapshot
 * @param {object} health - Score indicators from FinancialHealthService
 * @param {object} insights - Spending/budget results from InsightService
 * @returns {Promise<string>} AI executive narrative
 */
export const generateNarrative = async (snapshot, health, insights) => {
  const startTime = Date.now();

  const userName = snapshot.user?.name ? snapshot.user.name.split(' ')[0] : 'Aditya';
  const score = health.score || 88;
  const grade = health.grade || 'Excellent';

  // Construct context payload
  const systemInstruction = `You are FinMate, a highly professional AI financial advisor.
Your job is to read the structured financial metrics below and write a concise, engaging personal executive summary.

RULES:
1. Do NOT calculate any numbers yourself. Rely only on the numbers provided in the data.
2. Format all currency in Indian Rupees (₹) using Indian locale formatting.
3. Be direct, actionable, and focus on helping the user improve their habits.
4. Highlight major metrics: month-over-month spending shifts, budget overruns, savings deficits, and milestones behind.
5. Keep the narrative under 150 words.
6. Address the user directly by name.
`;

  const trends = insights.spending || {};
  const budgets = insights.budget || {};
  const goals = insights.goals || {};
  const savings = insights.savings || {};

  const structuredSummaryText = `
FINANCIAL SYSTEM MATRIX:
- User Name: ${userName}
- Health Score: ${score}/100 (${grade})
- Monthly Spending: ₹${(snapshot.expenses.reduce((sum, e) => sum + e.amount, 0)).toLocaleString('en-IN')}
- Exceeded Budgets count: ${budgets.exceededBudgets || 0}
- Active Goals: ${goals.activeGoals || 0} (Completion: ${goals.goalCompletionPct || 0}%)
- Emergency Fund Covers: ${savings.monthsCovered || 0} months
- Weaknesses: ${health.weaknesses?.join(', ') || 'None'}
- Top Strengths: ${health.strengths?.join(', ') || 'Account logged'}
`;

  const payload = {
    systemInstruction,
    contents: [
      {
        role: 'user',
        parts: [{ text: `Analyze my financial behavior and write a short, friendly executive narrative summary based on this data: \n${structuredSummaryText}` }]
      }
    ]
  };

  let narrative = '';
  try {
    narrative = await generateAIResponse(payload);
  } catch (error) {
    logger.warn(`[AIReportNarrator] Gemini API failed: ${error.message}. Falling back to deterministic narrative.`);
    narrative = `Hello ${userName}! Your financial health score is **${score}/100** (${grade}). Your emergency fund covers **${savings.monthsCovered || 0}** months of expenses. Focus on rebalancing overspent budgets and increasing goal contributions to maintain long-term stability.`;
  }

  const duration = Date.now() - startTime;
  logger.info(`[AIReportNarrator] AI executive summary generated in ${duration}ms.`);

  return narrative;
};
