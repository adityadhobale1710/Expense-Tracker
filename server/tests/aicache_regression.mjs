/**
 * aicache_regression.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * End-to-end cache-freshness regression test against a RUNNING server.
 *
 * Usage:
 *   node tests/aicache_regression.mjs [port]
 *
 * (default port: 5000). Start a server FIRST, e.g. on 5001:
 *   $env:PORT=5001 ; node server.js
 *
 * Verifies, for the required audit sequences:
 *   1. Empty state → Analytics/AI return ZEROS — never fabricated numbers.
 *   2. ADD expense ₹10,000 → Analytics ₹10,000 → AI ₹10,000 (via FactRouter, deterministic).
 *   3. DELETE expense    → Analytics immediately ₹0 → AI immediately ₹0.
 *   4. UPDATE expense ₹5,000 → ₹8,000 → Analytics ₹8,000 → AI ₹8,000 → delete → ₹0/₹0.
 *   5. INCOME add → update → delete reflected in Analytics.
 *   6. Cache invalidation: an AI same-question replay is never served from a
 *      stale snapshot after a mutation.
 */

import http from 'http';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import dns from 'dns';

dotenv.config();
// Mirror server.js — public resolvers required to resolve Mongo SRV records.
dns.setServers(['8.8.8.8', '1.1.1.1']);

const PORT = parseInt(process.argv[2] || process.env.PORT || '5000', 10);

const request = (method, path, body = null, token = null) =>
  new Promise((resolve, reject) => {
    const started = Date.now();
    const req = http.request(
      {
        hostname: 'localhost',
        port: PORT,
        path: `/api${path}`,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        timeout: 20000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed = null;
          if (data) {
            try { parsed = JSON.parse(data); } catch { parsed = null; }
          }
          resolve({ status: res.statusCode, data: parsed, ms: Date.now() - started });
        });
      }
    );
    req.on('timeout', () => { req.destroy(new Error(`timeout after ${20000}ms`)); });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });

const main = async () => {
  const done = () => process.exit(failures > 0 ? 1 : 0);
  // LOCAL calendar date (server ranges use local midnight boundaries).
  const localToday = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  let failures = 0;
  const ok = (cond, label, extra = '') => {
    if (cond) console.log(`  ✅ ${label}`);
    else { console.log(`  ❌ ${label} ${extra}`); failures++; }
  };
  // Soft probe: surfaces Gemini-pipeline cache behaviour without hard-failing on
  // model prose variance. Failures here are still printed loudly for inspection.
  const warn = (cond, label, extra = '') => {
    if (cond) console.log(`  ✅ ${label}`);
    else console.log(`  ⚠️  ${label} ${extra}`);
  };

  console.log(`\n══ AI/CACHE REGRESSION — server port ${PORT} ══\n`);

  // ── 0. Seed an isolated test user & token ────────────────────────────────
  await mongoose.connect(process.env.MONGO_URI);
  const User = (await import('../models/User.js')).default;
  const EMAIL = 'aicache_regression_test@test.com';
  await User.deleteMany({ email: EMAIL });
  const user = await User.create({
    name: 'AI Cache Regression',
    email: EMAIL,
    password: 'password123',
    isVerified: true,
  });
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  console.log(`  · Test user ready: ${EMAIL}\n`);

  const Category = (await import('../models/Category.js')).default;
  const CAT = await Category.create({ user: user._id, name: 'RegExpCat', icon: '🧾', color: '#ef4444', type: 'expense' });
  const CAT_ID = CAT._id.toString();

  const getSummary = async () => (await request('GET', '/reports/summary', null, token)).data?.data || {};
  const getCategoryTotal = async () => {
    const r = await request('GET', '/reports/by-category', null, token);
    return ((r.data?.data) || []).reduce((s, i) => s + (i.total || 0), 0);
  };
  const getIncomeAnalytics = async () => (await request('GET', '/analytics/income', null, token)).data?.data || { totalIncome: 0 };
  const aiAsk = async (message) => {
    const r = await request('POST', '/ai/chat', { message }, token);
    if (r.status !== 200) return `HTTP ${r.status}: ${r.data?.message || ''}`;
    return r.data?.data?.aiMessage?.content || '';
  };
  const createExpense = (amount) =>
    request('POST', '/expenses', { title: 'Reg Expense', amount, date: localToday(), category: CAT_ID, paymentMethod: 'cash' }, token)
      .then((r) => ({ status: r.status, id: r.data?.data?._id }));
  const updateExpenseAmount = (id, amount) =>
    request('PUT', `/expenses/${id}`, { title: 'Reg Expense', amount, date: localToday(), category: CAT_ID, paymentMethod: 'cash' }, token)
      .then((r) => r.status);
  const createIncome = async (amount) =>
    request('POST', '/income', { title: 'Reg Income', amount, date: localToday() }, token)
      .then((r) => ({ status: r.status, id: r.data?.data?._id }));
  const updateIncomeAmount = (id, amount) =>
    request('PUT', `/income/${id}`, { title: 'Reg Income', amount, date: localToday() }, token)
      .then((r) => r.status);

  // ── 1. EMPTY baseline: zeros, never fabricated values ─────────────────────
  console.log('[1] EMPTY BASELINE');
  let sum = await getSummary();
  ok(sum.totalIncome === 0 && sum.totalExpense === 0, `summary totals are ZERO (got income=${sum.totalIncome} expense=${sum.totalExpense})`);
  ok((await getCategoryTotal()) === 0, 'category total is ZERO');
  const emptyIncome = await getIncomeAnalytics();
  ok(emptyIncome.totalIncome === 0 && (emptyIncome.sources || []).length === 0, 'income analytics ZERO/empty');
  const aiEmpty = await aiAsk('How much did I spend today?');
  ok(aiEmpty && /₹\s*0\b|₹0[^0-9]/.test(aiEmpty), `AI today spend = ₹0 (reply: "${aiEmpty}")`);

  // ── 2. ADD EXPENSE ₹10,000 ───────────────────────────────────────────────
  console.log('\n[2] ADD EXPENSE ₹10,000');
  const exp1 = await createExpense(10000);
  ok(exp1.status === 201, `created expense (status ${exp1.status})`);
  ok((await getCategoryTotal()) === 10000, `Analytics category total = ₹10,000 (got ${await getCategoryTotal()})`);
  sum = await getSummary();
  ok(sum.totalExpense === 10000, `Analytics summary expense = ₹10,000 (got ${sum.totalExpense})`);
  const ai1 = await aiAsk('How much did I spend today?');
  ok(fmt_A(ai1, '10,000'), `AI sees ₹10,000 (reply: "${ai1}")`);
  const ai1b = await aiAsk('How much did I spend today?');
  ok(fmt_A(ai1b, '10,000'), `AI replay (cached) still ₹10,000 (reply: "${ai1b}")`);
  // Gemini-pipeline probe — same general question asked again AFTER delete must
  // NOT be answered from the pre-delete cached response/module snapshot.
  const GEN_MSG = 'What is my total expense across all my logged transactions?';
  const genBefore = await aiAsk(GEN_MSG);
  warn(fmt_A(genBefore, '10,000'), `Gemini pipeline sees ₹10,000 before delete (reply: "${genBefore}")`);

  // ── 3. DELETE EXPENSE → immediate exclusion in Analytics AND AI ──────────
  console.log('\n[3] DELETE EXPENSE → AI removes immediately');
  await request('DELETE', `/expenses/${exp1.id}`, null, token);
  ok((await getCategoryTotal()) === 0, `Analytics excludes expense immediately (got ${await getCategoryTotal()})`);
  sum = await getSummary();
  ok(sum.totalExpense === 0, 'Analytics summary expense back to 0');
  const aiDel = await aiAsk('How much did I spend today?');
  ok(fmt_A(aiDel, '0', true), `AI immediately stops using ₹10,000 (reply: "${aiDel}")`);
  const genAfter = await aiAsk(GEN_MSG);
  warn(!fmt_A(genAfter, '10,000'), `Gemini pipeline no longer uses ₹10,000 after DELETE (reply: "${genAfter}")`);

  // ── 4. UPDATE EXPENSE ₹5,000 → ₹8,000, then DELETE ───────────────────────
  console.log('\n[4] UPDATE EXPENSE ₹5,000 → ₹8,000');
  const exp2 = await createExpense(5000);
  ok(exp2.status === 201, 'created expense ₹5,000');
  sum = await getSummary();
  ok(sum.totalExpense === 5000, `Analytics expense = ₹5,000 (got ${sum.totalExpense})`);
  const updStatus = await updateExpenseAmount(exp2.id, 8000);
  ok(updStatus === 200, `expense UPDATE accepted (status ${updStatus})`);
  sum = await getSummary();
  ok(sum.totalExpense === 8000, `Analytics expense = ₹8,000 after UPDATE (got ${sum.totalExpense})`);
  ok((await getCategoryTotal()) === 8000, `Analytics category = ₹8,000 after UPDATE (got ${await getCategoryTotal()})`);
  const aiUpd = await aiAsk('How much did I spend today?');
  ok(fmt_A(aiUpd, '8,000'), `AI sees ₹8,000 after UPDATE (reply: "${aiUpd}")`);
  await request('DELETE', `/expenses/${exp2.id}`, null, token);
  sum = await getSummary();
  ok(sum.totalExpense === 0, 'Analytics excludes ₹8,000 after delete');
  const aiDel2 = await aiAsk('How much did I spend today?');
  ok(fmt_A(aiDel2, '0'), `AI excludes ₹8,000 after delete (reply: "${aiDel2}")`);

  // ── 5. INCOME add / update / delete → Analytics ──────────────────────────
  console.log('\n[5] INCOME adds to Analytics');
  const inc1 = await createIncome(20000);
  ok(inc1.status === 201, 'income created ₹20,000');
  sum = await getSummary();
  ok(sum.totalIncome === 20000, `Analytics income = ₹20,000 (got ${sum.totalIncome})`);
  let inA = await getIncomeAnalytics();
  ok(inA.totalIncome === 20000, `Analytics /income total = ₹20,000 (got ${inA.totalIncome})`);

  const updIncStatus = await updateIncomeAmount(inc1.id, 25000);
  ok(updIncStatus === 200, `income UPDATE accepted (status ${updIncStatus})`);
  sum = await getSummary();
  ok(sum.totalIncome === 25000, `Analytics income = ₹25,000 after UPDATE (got ${sum.totalIncome})`);
  inA = await getIncomeAnalytics();
  ok(inA.totalIncome === 25000, `Analytics /income total = ₹25,000 after UPDATE (got ${inA.totalIncome})`);

  await request('DELETE', `/income/${inc1.id}`, null, token);
  sum = await getSummary();
  ok(sum.totalIncome === 0, 'Analytics income back to 0 after delete');
  inA = await getIncomeAnalytics();
  ok(inA.totalIncome === 0 && (inA.sources || []).length === 0, 'income analytics empty after delete');

  // ── 6. FINAL EMPTY STATE (server must still return zeros) ────────────────
  console.log('\n[6] FINAL EMPTY STATE');
  sum = await getSummary();
  ok(sum.totalIncome === 0 && sum.totalExpense === 0, 'summary totals ZERO (no fabricated Salary/Freelancing/Food/etc.)');
  ok((await getCategoryTotal()) === 0, 'category total ZERO');
  ok((await getIncomeAnalytics()).totalIncome === 0, 'income analytics ZERO');

  await mongoose.disconnect();
  console.log(`\n══ RESULT: ${failures === 0 ? 'ALL PASSED ✅' : `${failures} FAILURE(S) ❌`} ══`);
  done();
};

const fmt_A = (reply, amount) => {
  if (!reply) return false;
  if (amount === '0') return /₹\s*0\b|₹0[^0-9]|spent ₹0/.test(reply);
  return reply.includes(`₹${amount}`) || reply.includes(amount.replace(',', ''));
};

process.on('unhandledRejection', (e) => {
  console.error('Unhandled rejection:', e);
  process.exit(1);
});

main().catch((e) => {
  console.error(e);
  process.exit(1);
});