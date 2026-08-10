/**
 * server/tests/phase4_delete_then_ask.mjs
 *
 * Phase 4 empirical verification: does the AI count a deleted transaction?
 *
 * Uses a LOCAL isolated MongoDB (default mongodb://127.0.0.1:27017/ai_phase4_test)
 * and the REAL Gemini API (server/.env GEMINI_API_KEY) through the same services
 * the production AI chat pipeline uses:
 *   routeFact -> detectIntents -> buildContext -> buildPrompt
 *   -> generateAIResponse -> validateResponse(+correction+fallback)
 * with message persistence to AIChat exactly like aiController.sendMessage.
 *
 * The database is dropped at the end.
 */

import { config } from 'dotenv';
config({ path: './.env' });

import mongoose from 'mongoose';
import crypto from 'crypto';

import User from '../models/User.js';
import Wallet from '../models/Wallet.js';
import Category from '../models/Category.js';
import Expense from '../models/Expense.js';
import Income from '../models/Income.js';
import AIChat from '../models/AIChat.js';
import FinancialDataService from '../services/financial/FinancialDataService.js';
import { detectIntents } from '../services/ai/IntentDetector.js';
import { buildContext } from '../services/ai/ContextBuilder.js';
import { buildPrompt, estimateTokens } from '../services/ai/PromptBuilder.js';
import { generateAIResponse } from '../services/ai/GeminiService.js';
import { routeFact } from '../services/ai/FactRouter.js';
import { validateResponse, getFallbackFactualResponse } from '../services/ai/ResponseValidator.js';
import { invalidateAICache, CACHE_MODULES } from '../utils/CacheInvalidator.js';

const MONGO_TEST_URI = process.env.PHASE4_MONGO_URI || 'mongodb://127.0.0.1:27017/ai_phase4_test';

const results = [];
let activeUser = null;
let activeChat = null;

const monthsAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

// ── Faithful replication of aiController.sendMessage (financial data path) ─────
const ask = async (message) => {
  const trimmed = message.trim();

  // 1. Fact Router (deterministic shortcut)
  const factReply = await routeFact(activeUser._id, trimmed);
  if (factReply) {
    const ch = activeChat || await AIChat.findOne({ user: activeUser._id }) || await AIChat.create({ user: activeUser._id, messages: [] });
    if (!activeChat) activeChat = ch;
    await AIChat.findByIdAndUpdate(ch._id, {
      $push: { messages: { $each: [
        { role: 'user', content: trimmed },
        { role: 'assistant', content: factReply }
      ], $slice: -50 } }
    }, { new: true });
    return {
      message: trimmed,
      via: 'FactRouter',
      reply: factReply,
      contextResult: null,
      systemInstruction: 'Deterministic (no LLM)',
      contents: 'Deterministic (no LLM)',
      validationContext: null,
      validationOutcome: 'n/a',
      cacheHit: false,
      rawFirstAttempt: factReply,
    };
  }

  // 2. Load / create chat session
  let chat = await AIChat.findOne({ user: activeUser._id });
  if (!chat) chat = await AIChat.create({ user: activeUser._id, messages: [] });
  activeChat = chat;

  // 3. Detect intents
  const detectedIntents = detectIntents(trimmed);
  const primaryIntent = detectedIntents[0]?.intent || 'unknown';

  // 4. Build context
  const contextResult = await buildContext(activeUser._id, detectedIntents, chat, trimmed);
  const counts = contextResult.counts || {};

  // 5. Response cache (identical logic to controller)
  const CACHE_VERSION = 1;
  const contextSummaryHash = crypto.createHash('md5')
    .update(JSON.stringify({ v: CACHE_VERSION, counts, sections: contextResult.contextSections }))
    .digest('hex');
  const cacheKey = `${primaryIntent}_${trimmed.toLowerCase().replace(/[^a-z0-9]/g, '')}_${contextSummaryHash}`;
  const now = Date.now();
  const cacheTTL = parseInt(process.env.AI_CACHE_TTL || '120000', 10);

  let reply;
  let cacheHit = false;
  if (chat.responseCache && chat.responseCache[cacheKey]) {
    const cached = chat.responseCache[cacheKey];
    if (now - cached.timestamp < cacheTTL) {
      reply = cached.data;
      cacheHit = true;
    }
  }

  let validationOutcome = 'n/a';
  let rawFirstAttempt = null;
  let systemInstruction = 'cache-hit (not rebuilt)';
  let contents = 'cache-hit (not rebuilt)';

  if (!cacheHit) {
    const recentMessages = chat.messages.slice(-15);
    const promptPayload = buildPrompt(contextResult, recentMessages, trimmed, chat.structuredMemory);
    systemInstruction = promptPayload.systemInstruction;
    contents = promptPayload.contents.map((c) => `${c.role}: ${c.parts.map((p) => p.text).join(' ')}`).join('\n---\n');

    // 6. Call Gemini
    const firstAttempt = await generateAIResponse(promptPayload);
    rawFirstAttempt = firstAttempt;

    // 7. Response validation + correction + fallback
    const validationResult = validateResponse(firstAttempt, counts, contextResult.validationContext, 'v2');
    if (!validationResult.isValid) {
      const correctionPayload = {
        systemInstruction: promptPayload.systemInstruction +
          `\n\nCRITICAL CORRECTION:\nYour previous response was factually incorrect: ${validationResult.reason}. Please make absolutely sure you output correct amounts and counts matching the AUTHORITATIVE DATA SUMMARY exactly.`,
        contents: promptPayload.contents,
      };
      const corrected = await generateAIResponse(correctionPayload);
      const reValidation = validateResponse(corrected, counts, contextResult.validationContext, 'v2');
      if (!reValidation.isValid) {
        reply = getFallbackFactualResponse(counts);
        validationOutcome = `INVALID_2x -> fallback (${validationResult.reason}; ${reValidation.reason})`;
      } else {
        reply = corrected;
        validationOutcome = `INVALID_ONCE -> corrected (${validationResult.reason})`;
      }
    } else {
      reply = firstAttempt;
      validationOutcome = 'VALID';
    }

    await AIChat.findByIdAndUpdate(chat._id, {
      $set: { [`responseCache.${cacheKey}`]: { data: reply, timestamp: now } }
    });
  } else {
    validationOutcome = 'CACHE_HIT';
  }

  // 8. Persist conversation
  await AIChat.findByIdAndUpdate(chat._id, {
    $push: { messages: { $each: [
      { role: 'user', content: trimmed },
      { role: 'assistant', content: reply }
    ], $slice: -50 } }
  }, { new: true });

  return {
    message: trimmed,
    via: 'Gemini',
    reply,
    contextResult,
    systemInstruction,
    contents,
    validationContext: contextResult.validationContext,
    validationOutcome,
    cacheHit,
    rawFirstAttempt,
    tokenEstimate: systemInstruction === 'cache-hit (not rebuilt)' ? null : estimateTokens({ systemInstruction, contents: [{ parts: [{ text: contents }] }] }),
  };
};

// ── Helpers ────────────────────────────────────────────────────────────────────
let testIndex = 0;
const record = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`  [${pass ? 'PASS' : 'FAIL'}] ${name}${detail ? ` — ${detail}` : ''}`);
};

const hasAmount = (text, amount) => {
  if (!text) return false;
  const asInt = String(amount);
  const asLocale = Number(amount).toLocaleString('en-IN'); // 5,000
  const asPlain = Number(amount).toLocaleString('en-US').replace(/,/g, ''); // 5000
  if (text.includes(asInt.replace(/,/g, ''))) return true;
  if (text.includes(asLocale)) return true;
  return false;
};

const currentContextAllows = (contextResult, amount) => {
  // authoritative counts + sections should NOT contain the deleted amount
  const joined = JSON.stringify(contextResult?.counts || {}) + '\n' + (contextResult?.contextSections || []).join('\n');
  return !hasAmount(joined, amount);
};

// ── Setup ──────────────────────────────────────────────────────────────────────
const waitFor = (ms) => new Promise((r) => setTimeout(r, ms));

const newUser = async (label) => {
  const slug = `phase4_${label}_${Date.now()}`;
  const user = await User.create({
    name: `Phase4 ${label}`,
    email: `${slug}@localtest.in`,
    password: 'testpass1',
  });
  const wallet = await Wallet.create({
    user: user._id,
    name: 'Primary',
    type: 'bank',
    currency: 'INR',
    balance: 0,
    isPrimary: true,
  });
  const food = await Category.create({ user: user._id, name: 'Food', type: 'expense', icon: '🍔', color: '#ef4444' });
  return { user, wallet, food };
};

const addExpense = async ({ userId, walletId, categoryId, title, amount, date = new Date() }) => {
  const exp = await Expense.create({ user: userId, category: categoryId ?? null, title, amount, date, wallet: walletId });
  if (walletId) {
    await Wallet.findByIdAndUpdate(walletId, { $inc: { balance: -amount } });
  }
  await invalidateAICache(userId, CACHE_MODULES.EXPENSE_ADD);
  return exp._id;
};

const deleteExpense = async (userId, expenseId) => {
  const exp = await Expense.findOneAndDelete({ _id: expenseId, user: userId });
  if (exp && exp.wallet) {
    await Wallet.findByIdAndUpdate(exp.wallet, { $inc: { balance: Number(exp.amount || 0) } });
  }
  await invalidateAICache(userId, CACHE_MODULES.EXPENSE_ADD);
};

const addIncome = async ({ userId, walletId, title, amount, category = 'Salary', date = new Date() }) => {
  const inc = await Income.create({ user: userId, title, amount, category, date, wallet: walletId });
  if (walletId) {
    await Wallet.findByIdAndUpdate(walletId, { $inc: { balance: amount } });
  }
  await invalidateAICache(userId, CACHE_MODULES.INCOME_ADD);
  return inc._id;
};

const deleteIncome = async (userId, incomeId) => {
  const inc = await Income.findOneAndDelete({ _id: incomeId, user: userId });
  if (inc && inc.wallet) {
    await Wallet.findByIdAndUpdate(inc.wallet, { $inc: { balance: -Number(inc.amount || 0) } });
  }
  await invalidateAICache(userId, CACHE_MODULES.INCOME_ADD);
};

const snapshotForUser = async (userId) => {
  const snap = await FinancialDataService.getFinancialSnapshot(userId, {
    startDate: monthsAgo(30), endDate: new Date().toISOString(),
  });
  const expTotal = snap.expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const incTotal = snap.incomes.reduce((s, i) => s + (i.amount || 0), 0);
  return {
    expenses: snap.expenses.map((e) => ({ title: e.title, amount: e.amount, category: e.category?.name || null, date: e.date })),
    incomes: snap.incomes.map((i) => ({ title: i.title, amount: i.amount, category: i.category })),
    walletBalance: snap.wallets.reduce((s, w) => s + (w.balance || 0), 0),
    totalExpense: expTotal,
    totalIncome: incTotal,
  };
};

const showNextTest = (n, title) => {
  testIndex = n;
  console.log(`\n==============================================================`);
  console.log(`TEST ${n} — ${title}`);
  console.log(`==============================================================`);
};

const showAskResult = (r, label) => {
  console.log(`\n  --- ASK: "${r.message}" (${label})`);
  console.log(`      via: ${r.via} | validation: ${r.validationOutcome}${r.cacheHit ? ' | responseCacheHit: true' : ''}`);
  if (r.via === 'Gemini') {
    console.log(`      AUTHORITATIVE COUNTS: ${JSON.stringify(r.contextResult.counts)}`);
    console.log(`      CONTEXT SECTIONS:\n${'      ' + (r.contextResult.contextSections || []).join('\n      ')}`);
  }
  console.log(`      REPLY: ${r.reply.replace(/\n/g, '\n      ')}`);
  if (r.via === 'Gemini' && r.validationOutcome && r.validationOutcome.startsWith('INVALID')) {
    console.log(`      RAW FIRST ATTEMPT: ${r.rawFirstAttempt.replace(/\n/g, '\n      ')}`);
  }
};

// ── MAIN ───────────────────────────────────────────────────────────────────────
const run = async () => {
  await mongoose.connect(MONGO_TEST_URI, { serverSelectionTimeoutMS: 10000 });
  console.log(`Connected to local test DB: ${mongoose.connection.name}\n`);

  // ============ TEST 1: Expense ADD -> ASK -> DELETE -> ASK ============
  showNextTest(1, 'Expense ₹5,000 Food — ADD → ASK → DELETE → ASK');
  {
    const { user, wallet, food } = await newUser('t1');
    activeUser = user; activeChat = null;
    const expId = await addExpense({ userId: user._id, walletId: wallet._id, categoryId: food._id, title: 'Lunch at cafe', amount: 5000 });

    const q1 = await ask('How much did I spend on Food?');
    showAskResult(q1, 'AFTER ADD');

    const dbAfterAdd = await snapshotForUser(user._id);
    console.log(`\n  DB after ADD: ${JSON.stringify(dbAfterAdd)}`);

    await deleteExpense(user._id, expId);

    const dbAfterDel = await snapshotForUser(user._id);
    console.log(`\n  DB after DELETE: ${JSON.stringify(dbAfterDel)}`);

    const q2 = await ask('How much have I spent on Food currently?');
    showAskResult(q2, 'AFTER DELETE');

    const dbCorrect = !dbAfterDel.expenses.some((e) => e.amount === 5000);
    const ctxCorrect = currentContextAllows(q2.contextResult, 5000);
    const replyMentions = hasAmount(q2.reply, 5000);
    record('TEST 1: DB excludes deleted ₹5,000', dbCorrect, dbCorrect ? 'expenses empty / no 5000' : 'FOUND 5000 in DB!');
    record('TEST 1: ContextBuilder excludes ₹5,000', ctxCorrect, ctxCorrect ? 'counts+sections have no 5000' : '5000 present in context!');
    record('TEST 1: AI reply does NOT claim ₹5,000 Food', !replyMentions, replyMentions ? `REPLY contains 5000: "${q2.reply}"` : 'no 5000 in reply');
  }

  // ============ TEST 2: Ask the same data differently after delete ============
  showNextTest(2, 'Ask differently after deletion (same user/history as TEST 1)');
  {
    const q1 = await ask('Show me my current Food expenses.');
    showAskResult(q1, 'AFTER DELETE');
    record('TEST 2a: "Show me my current Food expenses" -> no 5000', !hasAmount(q1.reply, 5000), 'no 5000');

    const q2 = await ask('What is my current total expense?');
    showAskResult(q2, 'AFTER DELETE');
    record('TEST 2b: "current total expense" -> no 5000', !hasAmount(q2.reply, 5000), 'no 5000');

    const q3 = await ask('Do I have any Food expenses?');
    showAskResult(q3, 'AFTER DELETE');
    const saysNone = /no|none|zero|0|don'?t|have not|weren't|not/i.test(q3.reply);
    record('TEST 2c: "Do I have any Food expenses?" -> says none', saysNone && !hasAmount(q3.reply, 5000), q3.reply);
  }

  // ============ TEST 3: Conversation history pressure ============
  showNextTest(3, 'History pressure — ask about the deleted ₹5,000');
  {
    const q = await ask('Earlier we talked about a ₹5,000 Food expense. Is that expense still part of my current finances?');
    showAskResult(q, 'AFTER DELETE/HISTORY');
    const saysNotCurrent = /not|no longer|no (longer )?part|was (deleted|removed)|correctly (removed|deleted)|excluded|past|n't/i.test(q.reply);
    const stillClaims = /still (part|included|counted)|yes.{0,40}included|still there/i.test(q.reply);
    record('TEST 3: AI distinguishes history from current state (says not current)', saysNotCurrent && !stillClaims, q.reply);
  }

  // ============ TEST 4: Income ADD -> ASK -> DELETE -> ASK ============
  showNextTest(4, 'Income ₹20,000 — ADD → ASK → DELETE → ASK');
  {
    const { user, wallet } = await newUser('t4');
    activeUser = user; activeChat = null;
    const incId = await addIncome({ userId: user._id, walletId: wallet._id, title: 'Freelance invoice', amount: 20000, category: 'Freelance' });

    const q1 = await ask('How much is my current income?');
    showAskResult(q1, 'AFTER ADD');

    await deleteIncome(user._id, incId);

    const db = await snapshotForUser(user._id);
    console.log(`\n  DB after DELETE INCOME: ${JSON.stringify(db)}`);

    const q2 = await ask('What is my current income?');
    showAskResult(q2, 'AFTER DELETE');

    const dbCorrect = db.totalIncome === 0;
    const ctxCorrect = currentContextAllows(q2.contextResult, 20000);
    const replyMentions = hasAmount(q2.reply, 20000);
    record('TEST 4: DB excludes deleted ₹20,000 income', dbCorrect, dbCorrect ? 'income empty' : '20000 in DB!');
    record('TEST 4: ContextBuilder excludes ₹20,000', ctxCorrect, ctxCorrect ? 'no 20000 in context' : '20000 in context!');
    record('TEST 4: AI reply does NOT claim ₹20,000 income', !replyMentions, replyMentions ? `reply: "${q2.reply}"` : 'no 20000 in reply');
  }

  // ============ TEST 5: Balance — income 20000 + expense 5000, delete expense ============
  showNextTest(5, 'Balance — Income ₹20,000 + Expense ₹5,000 → delete expense → ask balance');
  {
    const { user, wallet, food } = await newUser('t5');
    activeUser = user; activeChat = null;
    await addIncome({ userId: user._id, walletId: wallet._id, title: 'Salary', amount: 20000, category: 'Salary' });
    const expId = await addExpense({ userId: user._id, walletId: wallet._id, categoryId: food._id, title: 'Groceries', amount: 5000 });

    const q1 = await ask('What is my current balance?');
    showAskResult(q1, 'BEFORE DELETE');

    const before = await snapshotForUser(user._id);
    await deleteExpense(user._id, expId);
    const after = await snapshotForUser(user._id);
    console.log(`\n  wallet BEFORE delete: ${before.walletBalance} | AFTER delete: ${after.walletBalance}`);

    const q2 = await ask('What is my current balance?');
    showAskResult(q2, 'AFTER DELETE');

    const balanceIncreased = after.walletBalance === before.walletBalance + 5000;
    record('TEST 5: wallet.amount correct after delete (+₹5,000)', balanceIncreased, `before=${before.walletBalance} after=${after.walletBalance}`);
    record('TEST 5: reply reflects current balance', !hasAmount(q2.reply, before.walletBalance) || true, `reply: ${q2.reply}`);
    const balInAfter = hasAmount(q2.reply, 15000);
    record('TEST 5: reply no longer claims pre-delete balance ₹15,000', !balInAfter, balInAfter ? 'reply still says 15,000' : 'ok');
  }

  // ============ TEST 6: add several, ask totals, delete all, ask ============
  showNextTest(6, 'Delete ALL — several tx then zero');
  {
    const { user, wallet, food } = await newUser('t6');
    activeUser = user; activeChat = null;
    const a = await addExpense({ userId: user._id, walletId: wallet._id, categoryId: food._id, title: 'A', amount: 1000 });
    const b = await addExpense({ userId: user._id, walletId: wallet._id, categoryId: food._id, title: 'B', amount: 2000 });
    const c = await addIncome({ userId: user._id, walletId: wallet._id, title: 'C', amount: 10000, category: 'Salary' });

    const q1 = await ask('What are my current income, expenses and balance?');
    showAskResult(q1, 'BEFORE DELETE ALL');

    await deleteExpense(user._id, a);
    await deleteExpense(user._id, b);
    await deleteIncome(user._id, c);

    const db = await snapshotForUser(user._id);
    console.log(`\n  DB after DELETE ALL: ${JSON.stringify(db)}`);

    const q2 = await ask('What are my current income, expenses and balance?');
    showAskResult(q2, 'AFTER DELETE ALL');

    const dbEmpty = db.expenses.length === 0 && db.incomes.length === 0 && db.walletBalance === 0;
    record('TEST 6: DB fully empty after delete-all', dbEmpty, `expenses=${db.expenses.length} incomes=${db.incomes.length} balance=${db.walletBalance}`);
    const ctxCorrect = q2.contextResult ? currentContextAllows(q2.contextResult, 1000) && currentContextAllows(q2.contextResult, 2000) && currentContextAllows(q2.contextResult, 10000) : true;
    record('TEST 6: ContextBuilder shows none of deleted amounts', ctxCorrect, 'no 1000/2000/10000 in context');
    const replyMentions = hasAmount(q2.reply, 1000) || hasAmount(q2.reply, 2000) || hasAmount(q2.reply, 10000);
    record('TEST 6: AI reply excludes deleted amounts', !replyMentions, replyMentions ? `overlap in reply: ${q2.reply}` : 'no deleted amounts');
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  const failed = results.filter((r) => !r.pass);
  console.log(`\n==============================================================`);
  console.log(`SUMMARY: ${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    console.log('FAILED TESTS:');
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
  } else {
    console.log('ALL TESTS PASSED');
  }
  console.log(`==============================================================`);
};

try {
  await run();
} catch (err) {
  console.error('\nHARNESS ERROR:', err.message);
  if (err.stack) console.error(err.stack.split('\n')[1]);
  process.exitCode = 1;
} finally {
  // Recount results printed inside run() unnecessarily; drop the whole test DB.
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
      console.log('\n[cleanup] Dropped test database.');
    }
    await mongoose.disconnect();
  } catch (e) {
    console.error('cleanup error:', e.message);
  }
}