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

// @desc    Get AI Advisor financial insights (Unified Aggregated endpoint)
// @route   GET /api/ai/insights
export const getAIInsights = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const forceRefresh = req.query.refresh === 'true';

  const { generateInsightsUnified } = await import('../services/ai/AIInsightsOrchestrator.js');
  const insights = await generateInsightsUnified(userId, forceRefresh);
  sendSuccess(res, 200, 'AI insights fetched successfully', insights);
});

// @desc    Get Dynamic AI Monthly Report
// @route   GET /api/ai/report
export const getMonthlyReport = asyncHandler(async (req, res) => {
  const { generateMonthlyReport } = await import('../services/ai/MonthlyReportGenerator.js');
  const report = await generateMonthlyReport({ userId: req.user._id });
  sendSuccess(res, 200, 'AI monthly report generated successfully', report);
});

// @desc    Download Monthly Statement (PDF or DOCX format)
// @route   GET /api/ai/report/download
export const downloadMonthlyReport = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const format = req.query.format === 'docx' ? 'docx' : 'pdf';

  const { generateMonthlyReport } = await import('../services/ai/MonthlyReportGenerator.js');
  const report = await generateMonthlyReport({ userId });

  const dateStr = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'short' });

  if (format === 'docx') {
    res.setHeader('Content-Type', 'application/msword');
    res.setHeader('Content-Disposition', `attachment; filename=FinMate_Financial_Report_${dateStr.replace(/ /g, '_')}.docx`);

    const html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>FinMate Monthly Financial Report</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #1e293b; }
          h1 { font-size: 24pt; font-weight: bold; color: #4f46e5; margin-bottom: 5px; text-align: center; }
          h2 { font-size: 14pt; font-weight: bold; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; margin-top: 25px; margin-bottom: 10px; }
          p { margin-bottom: 10px; text-align: justify; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; }
          th { background-color: #f1f5f9; font-weight: bold; text-align: left; padding: 8px; border: 1px solid #cbd5e1; font-size: 10pt; }
          td { padding: 8px; border: 1px solid #cbd5e1; font-size: 10pt; }
          .highlight { font-weight: bold; color: #4f46e5; }
        </style>
      </head>
      <body>
        <div style="text-align: center; margin-top: 50px; margin-bottom: 50px;">
          <h1>FinMate AI Monthly Financial Report</h1>
          <p style="font-size: 14pt; color: #64748b;">AI-powered analysis of your financial health</p>
          <p style="font-size: 12pt; color: #64748b; margin-top: 30px;">Prepared for: ${req.user.name || 'User'}</p>
          <p style="font-size: 11pt; color: #64748b;">Report Period: ${dateStr}</p>
        </div>
        <hr/>
        
        <h2>1. Executive Summary</h2>
        <p>${report.executiveSummary.replace(/\n/g, '<br/>')}</p>
        
        <h2>2. Financial Health Score</h2>
        <p>Your current Financial Health Score is <span class="highlight">${report.financialHealth.score}/100</span>, grading your finance status as <strong>${report.financialHealth.grade}</strong>.</p>
        
        <h2>3. Income vs Expense Analysis</h2>
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Total Income Earned</td>
              <td class="highlight">₹${report.summary.totalIncome.toLocaleString('en-IN')}</td>
            </tr>
            <tr>
              <td>Total Expenses Incurred</td>
              <td>₹${report.summary.totalExpense.toLocaleString('en-IN')}</td>
            </tr>
            <tr>
              <td>Net Surplus Savings</td>
              <td style="font-weight: bold; color: ${report.summary.savings >= 0 ? '#10b981' : '#ef4444'};">₹${report.summary.savings.toLocaleString('en-IN')}</td>
            </tr>
            <tr>
              <td>Savings Rate</td>
              <td class="highlight">${report.summary.savingsRate.toFixed(1)}%</td>
            </tr>
          </tbody>
        </table>
        
        <h2>4. Budget Performance</h2>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Limit</th>
              <th>Spent</th>
              <th>Usage %</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${report.budgetPerformance.map(b => `
              <tr>
                <td>${b.category}</td>
                <td>₹${b.limit.toLocaleString('en-IN')}</td>
                <td>₹${b.spent.toLocaleString('en-IN')}</td>
                <td>${b.usagePct}%</td>
                <td style="color: ${b.status === 'Exceeded' ? '#ef4444' : '#10b981'}; font-weight: bold;">${b.status}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <h2>5. Goals Progress Tracker</h2>
        <table>
          <thead>
            <tr>
              <th>Goal Name</th>
              <th>Target</th>
              <th>Saved</th>
              <th>Progress</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${report.goalProgress.map(g => `
              <tr>
                <td>${g.title}</td>
                <td>₹${g.target.toLocaleString('en-IN')}</td>
                <td>₹${g.saved.toLocaleString('en-IN')}</td>
                <td>${g.progressPct}%</td>
                <td>${g.status}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h2>6. Liability Summary</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Principal</th>
              <th>Outstanding</th>
              <th>Monthly EMI</th>
              <th>Interest Rate</th>
            </tr>
          </thead>
          <tbody>
            ${report.loanOverview.map(l => `
              <tr>
                <td>${l.name}</td>
                <td>₹${l.principal.toLocaleString('en-IN')}</td>
                <td>₹${l.remaining.toLocaleString('en-IN')}</td>
                <td>₹${l.emi.toLocaleString('en-IN')}</td>
                <td>${l.interest}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h2>7. Subscription Cost Audit</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Cost</th>
              <th>Cycle</th>
              <th>Next Renewal</th>
            </tr>
          </thead>
          <tbody>
            ${report.subscriptionReview.map(s => `
              <tr>
                <td>${s.name}</td>
                <td>₹${s.cost.toLocaleString('en-IN')}</td>
                <td>${s.cycle}</td>
                <td>${new Date(s.renewal).toLocaleDateString('en-IN')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h2>8. Action Plan & Recommendations</h2>
        <h3>Key Achievements</h3>
        <ul>
          ${report.achievements.map(a => `<li>${a}</li>`).join('')}
        </ul>
        <h3>Improvement Focus Areas</h3>
        <ul>
          ${report.improvements.map(i => `<li>${i}</li>`).join('')}
        </ul>
      </body>
      </html>
    `;

    res.send(html);
  } else {
    // Generate A4 PDF using PDFKit
    const PDFDocument = (await import('pdfkit')).default;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=FinMate_Financial_Report_${dateStr.replace(/ /g, '_')}.pdf`);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.pipe(res);

    // Cover Page
    doc.fillColor('#4f46e5').fontSize(26).font('Helvetica-Bold').text('FinMate AI Financial Report', 50, 150);
    doc.fillColor('#64748b').fontSize(14).font('Helvetica').text('AI-powered analysis of your financial health', 50, 190);
    
    doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(50, 220).lineTo(540, 220).stroke();

    doc.fillColor('#1e293b').fontSize(11).font('Helvetica-Bold').text('Prepared for:', 50, 250);
    doc.font('Helvetica').text(req.user.name || 'User', 150, 250);

    doc.font('Helvetica-Bold').text('Report Date:', 50, 270);
    doc.font('Helvetica').text(new Date().toLocaleDateString('en-IN'), 150, 270);

    doc.font('Helvetica-Bold').text('Report Period:', 50, 290);
    doc.font('Helvetica').text(dateStr, 150, 290);

    // Section 1: Executive Summary (Page 2)
    doc.addPage();
    doc.fillColor('#4f46e5').fontSize(16).font('Helvetica-Bold').text('1. Executive Summary', 50, 50);
    doc.fillColor('#1e293b').fontSize(10).font('Helvetica').text(report.executiveSummary, 50, 80, { width: 490, align: 'justify' });

    // Section 2: Health & General Summary
    doc.fillColor('#4f46e5').fontSize(16).font('Helvetica-Bold').text('2. Financial Health Status', 50, 220);
    doc.fillColor('#1e293b').fontSize(10).font('Helvetica').text(`Your current health index score is evaluated at ${report.financialHealth.score}/100, which rates your overall financial stability as "${report.financialHealth.grade}".`, 50, 250);

    // Financial breakdown
    doc.font('Helvetica-Bold').text('Monthly surplus summary:', 50, 290);
    doc.font('Helvetica').text(`Total Earnings:  ₹${report.summary.totalIncome.toLocaleString('en-IN')}`, 50, 310);
    doc.text(`Total Spend:     ₹${report.summary.totalExpense.toLocaleString('en-IN')}`, 50, 325);
    doc.text(`Net surplus:     ₹${report.summary.savings.toLocaleString('en-IN')}`, 50, 340);
    doc.text(`Savings Rate:    ${report.summary.savingsRate.toFixed(1)}%`, 50, 355);

    // Section 3: Budget & Milestones (Page 3)
    doc.addPage();
    doc.fillColor('#4f46e5').fontSize(16).font('Helvetica-Bold').text('3. Budget Performance', 50, 50);
    let y = 80;
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Category', 50, y);
    doc.text('Limit', 180, y);
    doc.text('Spent', 280, y);
    doc.text('Usage', 380, y);
    doc.text('Status', 480, y);
    doc.strokeColor('#cbd5e1').moveTo(50, y + 15).lineTo(540, y + 15).stroke();
    
    y += 25;
    doc.font('Helvetica');
    report.budgetPerformance.forEach(b => {
      doc.text(b.category, 50, y);
      doc.text(`₹${b.limit.toLocaleString('en-IN')}`, 180, y);
      doc.text(`₹${b.spent.toLocaleString('en-IN')}`, 280, y);
      doc.text(`${b.usagePct}%`, 380, y);
      doc.text(b.status, 480, y);
      y += 20;
    });

    // Goals (Page 4)
    doc.addPage();
    doc.fillColor('#4f46e5').fontSize(16).font('Helvetica-Bold').text('4. Goals Progress Tracker', 50, 50);
    y = 80;
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Goal Name', 50, y);
    doc.text('Target', 200, y);
    doc.text('Saved', 300, y);
    doc.text('Progress %', 400, y);
    doc.text('Status', 480, y);
    doc.strokeColor('#cbd5e1').moveTo(50, y + 15).lineTo(540, y + 15).stroke();

    y += 25;
    doc.font('Helvetica');
    report.goalProgress.forEach(g => {
      doc.text(g.title, 50, y);
      doc.text(`₹${g.target.toLocaleString('en-IN')}`, 200, y);
      doc.text(`₹${g.saved.toLocaleString('en-IN')}`, 300, y);
      doc.text(`${g.progressPct}%`, 400, y);
      doc.text(g.status, 480, y);
      y += 20;
    });

    // Section 5: Action Plan & Achievements
    doc.fillColor('#4f46e5').fontSize(16).font('Helvetica-Bold').text('5. Recommendations & Action Plan', 50, 240);
    doc.fillColor('#1e293b').fontSize(10).font('Helvetica-Bold').text('Highlights & Achievements:', 50, 270);
    y = 290;
    doc.font('Helvetica');
    report.achievements.forEach(a => {
      doc.text(`• ${a}`, 50, y, { width: 490 });
      y += 20;
    });

    y += 10;
    doc.font('Helvetica-Bold').text('Next Steps & Focus Areas:', 50, y);
    y += 20;
    doc.font('Helvetica');
    report.improvements.forEach(i => {
      doc.text(`• ${i}`, 50, y, { width: 490 });
      y += 20;
    });

    doc.end();
  }
});

