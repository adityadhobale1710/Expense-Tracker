/**
 * server/tests/phase5_e2e.mjs
 *
 * PHASE 5 — END-TO-END DASHBOARD + ANALYTICS + AI CONSISTENCY TEST
 *
 * VERIFICATION CHAIN:
 *   DATABASE → CURRENT TRANSACTION STATE → Dashboard(HTTP) → Analytics(HTTP) → AI(HTTP)
 *
 * This harness boots the REAL production Express server (server.js) against a
 * LOCAL isolated MongoDB (ai_phase5_test) and drives the exact HTTP endpoints
 * the frontend pages consume:
 *   - Transactions list        : GET  /api/expenses, /api/income
 *   - Dashboard                : GET  /api/dashboard
 *   - Analytics                : GET  /api/reports/summary, /api/reports/by-category,
 *                                GET  /api/analytics/income, /api/analytics/cashflow
 *   - AI Assistant             : POST /api/ai/chat
 *   - Mutations                : POST/PUT/DELETE /api/expenses, /api/income
 *
 * After EVERY mutation, DB state is compared against Dashboard, Analytics, and
 * the AI Assistant. Any surface that still reports a deleted/edited-old value is
 * a stale data failure.
 *
 * NOTE: There is no browser-automation framework in this repo, so navigation
 * (Test 9) and refresh (Test 10) are verified through their mechanism:
 *   - every /api response sets Cache-Control: no-store (server.js) → the browser
 *     can never replay a stale snapshot on navigation/refresh;
 *   - Dashboard re-fetches on dataRevision and AnalyticsPro fetches scoped data
 *     on dataRevision (client code, already applied in prior phases).
 *
 * The database is dropped at the end.
 */

const LABORATORY_PORT = 5599;
process.env.MONGO_URI = process.env.PHASE5_MONGO_URI || `mongodb://127.0.0.1:27017/ai_phase5_test`;
process.env.PORT = String(LABORATORY_PORT);
if (!process.env.NODE_ENV) process.env.NODE_ENV = 'development';

// Boot the real server (import triggers connectDB + app.listen). dotenv will NOT
// override the MONGO_URI we set above.
await import('../server.js');

import mongoose from 'mongoose';
import User from '../models/User.js';
import Wallet from '../models/Wallet.js';
import Category from '../models/Category.js';
import Expense from '../models/Expense.js';
import Income from '../models/Income.js';
import { generateAccessToken, generateRefreshToken } from '../utils/generateToken.js';
import AIChat from '../models/AIChat.js';

const BASE = `http://127.0.0.1:${LABORATORY_PORT}/api`;
const TOKEN_TTL_OVERRIDE = { expiresIn: '2h' };

const results = [];
const record = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`  [${pass ? 'PASS' : 'FAIL'}] ${name}${detail ? ' — ' + detail : ''}`);
};

const hasAmount = (text, n) => {
  if (!text) return false;
  const norm = String(text).toLowerCase();
  return norm.includes(String(n)) ||
    norm.includes('₹' + n.toLocaleString('en-IN')) ||
    norm.includes('inr ' + n) ||
    norm.includes(`₹${n}`);
};

// ─── helpers ────────────────────────────────────────────────────────────────
const newUser = async (tag) => {
  const email = `phase5_${tag}_${Date.now()}_${Math.floor(Math.random() * 1e6)}@test.local`;
  const user = await User.create({ name: `Phase5 ${tag}`, email, password: 'secret123' });
  const wallet = await Wallet.create({ user: user._id, name: 'Primary', type: 'bank', balance: 100000, isPrimary: true });
  const food = await Category.create({ user: user._id, name: 'Food', type: 'expense', icon: '🍔', color: '#f43f5e' });
  const other = await Category.create({ user: user._id, name: 'Other', type: 'expense', icon: '📁', color: '#6b7280' });
  return { user, wallet, food, other };
};

const authHeaders = (user) => {
  const token = generateAccessToken(user._id.toString(), TOKEN_TTL_OVERRIDE);
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
};

const api = async (method, path, user, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: authHeaders(user),
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json, cacheControl: res.headers.get('cache-control') };
};

const todayISO = () => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
};
const daysAgoISO = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
};
// Current-month start/end (matches server default snapshot bucket)
const monthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return { start: start.toISOString(), end: end.toISOString() };
};

const dbState = async (userId) => {
  const [expenses, incomes, wallets] = await Promise.all([
    Expense.find({ user: userId }).lean(),
    Income.find({ user: userId }).lean(),
    Wallet.find({ user: userId }).lean(),
  ]);
  return {
    expenses,
    incomes,
    walletBalance: wallets.reduce((s, w) => s + (w.balance || 0), 0),
    totalExpense: expenses.reduce((s, e) => s + e.amount, 0),
    totalIncome: incomes.reduce((s, i) => s + i.amount, 0),
  };
};

const sumFromList = (list) => list.reduce((s, x) => s + (x.amount || 0), 0);

// Surface readers (mimic what each page renders)
const readInTransactionState = async (user) => {
  const r1 = await api('GET', '/expenses?limit=1000', user);
  const r2 = await api('GET', '/income?limit=1000', user);
  return {
    expenses: Array.isArray(r1.json?.data?.expenses) ? r1.json.data.expenses : [],
    incomes: Array.isArray(r2.json?.data?.incomes) ? r2.json.data.incomes : [],
  };
};

const readDashboard = async (user) => {
  const r = await api('GET', '/dashboard', user);
  const d = r.json?.data || {};
  return {
    expenses: Array.isArray(d.expenses) ? d.expenses : [],
    incomes: Array.isArray(d.incomes) ? d.incomes : [],
    summary: d.summary || {},
    cacheControl: r.cacheControl,
  };
};

const readAnalytics = async (user, rng = monthRange()) => {
  const q = `startDate=${encodeURIComponent(rng.start)}&endDate=${encodeURIComponent(rng.end)}`;
  const [summary, byCat, income, cashflow] = await Promise.all([
    api('GET', `/reports/summary?${q}`, user),
    api('GET', `/reports/by-category?${q}`, user),
    api('GET', `/analytics/income?${q}`, user),
    api('GET', `/analytics/cashflow?${q}`, user),
  ]);
  return {
    summary: summary.json?.data || {},
    byCategory: Array.isArray(byCat.json?.data) ? byCat.json.data : [],
    analyticsIncome: income.json?.data || {},
    cashflow: Array.isArray(cashflow.json?.data) ? cashflow.json.data : [],
  };
};

async function askAI(user, message) {
  const r = await api('POST', '/ai/chat', user, { message });
  const ai = r.json?.data?.aiMessage;
  const reply = typeof ai === 'object' ? ai.content : (typeof ai === 'string' ? ai : '');
  return { reply: String(reply || '') };
}

const catTotal = (byCategory, name) => {
  const c = byCategory.find((x) => String(x.name).toLowerCase() === String(name).toLowerCase());
  return c ? c.total : 0;
};

// ─── TEST RUNNER ─────────────────────────────────────────────────────────────
const showNextTest = (n, title) => console.log(`\n==============================================================\nTEST ${n} — ${title}\n==============================================================`);

const run = async () => {
  // ============ TEST 1: ADD EXPENSE ₹5,000 Food ============
  showNextTest(1, 'ADD EXPENSE ₹5,000 Food');
  {
    const { user, wallet, food } = await newUser('t1');
    const add = await api('POST', '/expenses', user, {
      title: 'Lunch at cafe', amount: 5000, date: todayISO(), category: food._id.toString(),
      paymentMethod: 'upi', walletId: wallet._id.toString(),
    });
    const added = add.json?.data;

    const tx = await readInTransactionState(user);
    const dash = await readDashboard(user);
    const ana = await readAnalytics(user);
    const ai = await askAI(user, 'How much did I spend on Food currently?');

    record('TEST 1: transaction list shows ₹5,000', tx.expenses.some((e) => e.amount === 5000));
    record('TEST 1: Dashboard expense includes ₹5,000', dash.summary.totalExpense === 5000 && dash.expenses.some((e) => e.amount === 5000));
    record('TEST 1: Analytics total expense includes ₹5,000', ana.summary.totalExpense === 5000);
    record('TEST 1: Analytics Food category includes ₹5,000', catTotal(ana.byCategory, 'Food') === 5000);
    record('TEST 1: AI current Food spending includes ₹5,000', hasAmount(ai.reply, 5000), `AI: ${ai.reply}`);

    // DB confirm (authoritative)
    const db = await dbState(user._id);
    record('TEST 1: DB authoritative — 5000 expense', db.totalExpense === 5000, JSON.stringify(db));

    if (added?._id) await Expense.deleteOne({ _id: added._id });
  }

  // ============ TEST 2: DELETE EXPENSE (PRIMARY BUG TEST) ============
  showNextTest(2, 'DELETE EXPENSE — PRIMARY BUG TEST (WITHOUT browser refresh)');
  {
    const { user, wallet, food } = await newUser('t2');
    const add = await api('POST', '/expenses', user, {
      title: 'Groceries', amount: 5000, date: todayISO(), category: food._id.toString(),
      paymentMethod: 'upi', walletId: wallet._id.toString(),
    });
    const id = add.json?.data?._id;

    const del = await api('DELETE', `/expenses/${id}`, user);
    const delOk = del.status >= 200 && del.status < 300;

    const tx = await readInTransactionState(user);
    const dash = await readDashboard(user);
    const ana = await readAnalytics(user);
    const ai = await askAI(user, 'How much have I spent on Food currently?');

    record('TEST 2: DELETE request succeeded', delOk, `status=${del.status}`);
    record('TEST 2: transaction list no longer contains ₹5,000', !tx.expenses.some((e) => e.amount === 5000));
    record('TEST 2: Dashboard no longer includes ₹5,000', !dash.expenses.some((e) => e.amount === 5000) && dash.summary.totalExpense === 0);
    record('TEST 2: Analytics no longer includes ₹5,000', ana.summary.totalExpense === 0);
    record('TEST 2: Analytics Food category no longer includes ₹5,000', catTotal(ana.byCategory, 'Food') === 0);
    record('TEST 2: AI current Food spending does NOT include ₹5,000', !hasAmount(ai.reply, 5000), `AI: ${ai.reply}`);

    const db = await dbState(user._id);
    record('TEST 2: DB authoritative — no 5000 recorded', db.totalExpense === 0 && db.expenses.length === 0, JSON.stringify(db));
  }

  // ============ TEST 3: ADD INCOME ₹20,000 Salary ============
  showNextTest(3, 'ADD INCOME ₹20,000 Salary');
  {
    const { user, wallet } = await newUser('t3');
    const add = await api('POST', '/income', user, {
      title: 'Monthly salary', amount: 20000, date: todayISO(), category: 'Salary',
      source: 'Employer', paymentMethod: 'bank',
    });
    const added = add.json?.data;

    const tx = await readInTransactionState(user);
    const dash = await readDashboard(user);
    const ana = await readAnalytics(user);
    const ai = await askAI(user, 'How much is my current income?');

    record('TEST 3: income list shows ₹20,000', tx.incomes.some((i) => i.amount === 20000));
    record('TEST 3: Dashboard income includes ₹20,000', dash.summary.totalIncome === 20000 && dash.incomes.some((i) => i.amount === 20000));
    record('TEST 3: Dashboard balance updated (20,000)', dash.summary.balance === 20000, `balance=${dash.summary.balance}`);
    record('TEST 3: Analytics income includes ₹20,000', ana.summary.totalIncome === 20000 && ana.analyticsIncome.totalIncome === 20000);
    record('TEST 3: AI current income includes ₹20,000', hasAmount(ai.reply, 20000), `AI: ${ai.reply}`);

    const db = await dbState(user._id);
    record('TEST 3: DB authoritative — 20000 income', db.totalIncome === 20000, JSON.stringify(db));

    if (added?._id) await Income.deleteOne({ _id: added._id });
  }

  // ============ TEST 4: DELETE INCOME ============
  showNextTest(4, 'DELETE INCOME');
  {
    const { user, wallet } = await newUser('t4');
    const add = await api('POST', '/income', user, {
      title: 'Bonus', amount: 20000, date: todayISO(), category: 'Salary',
      source: 'Employer', paymentMethod: 'bank',
    });
    const id = add.json?.data?._id;

    const del = await api('DELETE', `/income/${id}`, user);
    const delOk = del.status >= 200 && del.status < 300;

    const tx = await readInTransactionState(user);
    const dash = await readDashboard(user);
    const ana = await readAnalytics(user);
    const ai = await askAI(user, 'What is my current income?');

    record('TEST 4: DELETE request succeeded', delOk, `status=${del.status}`);
    record('TEST 4: income list updates — no ₹20,000', !tx.incomes.some((i) => i.amount === 20000));
    record('TEST 4: Dashboard income updates — 0', dash.summary.totalIncome === 0 && !dash.incomes.some((i) => i.amount === 20000));
    record('TEST 4: Dashboard balance updates — 0', dash.summary.balance === 0, `balance=${dash.summary.balance}`);
    record('TEST 4: Analytics income excludes ₹20,000', ana.summary.totalIncome === 0 && ana.analyticsIncome.totalIncome === 0);
    record('TEST 4: AI current income excludes ₹20,000', !hasAmount(ai.reply, 20000), `AI: ${ai.reply}`);

    const db = await dbState(user._id);
    record('TEST 4: DB authoritative — no 20000 income', db.totalIncome === 0 && db.incomes.length === 0, JSON.stringify(db));
  }

  // ============ TEST 5: EDIT EXPENSE 1,000 → 2,000 ============
  showNextTest(5, 'EDIT EXPENSE 1,000 → 2,000');
  {
    const { user, wallet, food } = await newUser('t5');
    const add = await api('POST', '/expenses', user, {
      title: 'Snack', amount: 1000, date: todayISO(), category: food._id.toString(),
      paymentMethod: 'upi', walletId: wallet._id.toString(),
    });
    const id = add.json?.data?._id;

    const upd = await api('PUT', `/expenses/${id}`, user, {
      title: 'Snack', amount: 2000, date: todayISO(), category: food._id.toString(),
      paymentMethod: 'upi', walletId: wallet._id.toString(),
    });
    const updOk = upd.status >= 200 && upd.status < 300;

    const tx = await readInTransactionState(user);
    const dash = await readDashboard(user);
    const ana = await readAnalytics(user);
    const ai = await askAI(user, 'How much did I spend on Food?');

    const expInTx = tx.expenses.find((e) => String(e._id) === String(id));
    record('TEST 5: UPDATE request succeeded', updOk, `status=${upd.status}`);
    record('TEST 5: transaction list has only ₹2,000 (no ₹1,000)', !!expInTx && expInTx.amount === 2000 && !tx.expenses.some((e) => e.amount === 1000));
    record('TEST 5: Dashboard = ₹2,000 only', dash.summary.totalExpense === 2000 && !dash.expenses.some((e) => e.amount === 1000));
    record('TEST 5: Analytics = ₹2,000 only', ana.summary.totalExpense === 2000 && catTotal(ana.byCategory, 'Food') === 2000);
    record('TEST 5: AI = ₹2,000 (and never ₹1,000)', hasAmount(ai.reply, 2000) && !hasAmount(ai.reply, 1000), `AI: ${ai.reply}`);

    const db = await dbState(user._id);
    record('TEST 5: DB authoritative — exactly one 2000 expense', db.totalExpense === 2000 && db.expenses.length === 1 && db.expenses[0].amount === 2000, JSON.stringify(db));
  }

  // ============ TEST 6: DELETE LAST TRANSACTION → empty state ============
  showNextTest(6, 'DELETE LAST TRANSACTION → zero/empty state');
  {
    const { user, wallet, food } = await newUser('t6');
    const add = await api('POST', '/expenses', user, {
      title: 'Only one', amount: 7500, date: todayISO(), category: food._id.toString(),
      paymentMethod: 'upi', walletId: wallet._id.toString(),
    });
    const id = add.json?.data?._id;
    await api('DELETE', `/expenses/${id}`, user);

    const tx = await readInTransactionState(user);
    const dash = await readDashboard(user);
    const ana = await readAnalytics(user);
    const ai = await askAI(user, 'What are my current expenses?');

    record('TEST 6: transaction list empty', tx.expenses.length === 0);
    record('TEST 6: Dashboard zero/empty state', dash.summary.totalExpense === 0 && dash.expenses.length === 0 && dash.summary.balance === 0);
    record('TEST 6: Analytics zero/empty state', ana.summary.totalExpense === 0 && ana.summary.totalIncome === 0 && ana.summary.balance === 0);
    record('TEST 6: AI zero/empty current financial state', !hasAmount(ai.reply, 7500) && /0|none|no expenses|zero/i.test(ai.reply), `AI: ${ai.reply}`);

    const db = await dbState(user._id);
    record('TEST 6: DB authoritative — empty', db.expenses.length === 0 && db.incomes.length === 0 && db.walletBalance === 100000, JSON.stringify(db));
  }

  // ============ TEST 7: ANALYTICS DATE RANGE ISOLATION ============
  showNextTest(7, 'ANALYTICS DATE RANGE — restricted range + global state intact');
  {
    const { user, wallet, food } = await newUser('t7');
    // In-range (last 7 days)
    await api('POST', '/expenses', user, {
      title: 'Recent', amount: 3000, date: daysAgoISO(1), category: food._id.toString(),
      paymentMethod: 'upi', walletId: wallet._id.toString(),
    });
    // Out-of-range (45 days ago — outside current month & narrow window)
    await api('POST', '/expenses', user, {
      title: 'Ancient', amount: 9000, date: daysAgoISO(45), category: food._id.toString(),
      paymentMethod: 'upi', walletId: wallet._id.toString(),
    });
    // Out-of-range income (60 days ago)
    await api('POST', '/income', user, {
      title: 'Old income', amount: 50000, date: daysAgoISO(60), category: 'Freelance',
      source: 'Client', paymentMethod: 'bank',
    });

    // Restricted window: last 7 days only
    const narrow = { start: daysAgoISO(7), end: todayISO() };
    const anaNarrow = await readAnalytics(user, narrow);

    record('TEST 7: Analytics (7-day) uses only in-range expense (₹3,000)', anaNarrow.summary.totalExpense === 3000, `totalExpense=${anaNarrow.summary.totalExpense}`);
    record('TEST 7: Analytics (7-day) excludes the 45-day-old ₹9,000', !hasAmount(JSON.stringify(anaNarrow.byCategory), 9000), JSON.stringify(anaNarrow.byCategory));
    record('TEST 7: Analytics income (7-day) excludes 60-day-old ₹50,000', anaNarrow.summary.totalIncome === 0, `totalIncome=${anaNarrow.summary.totalIncome}`);

    // Global transaction state must remain complete (no date filters)
    const tx = await readInTransactionState(user);
    record('TEST 7: global transaction state intact — 2 expenses + 1 income', tx.expenses.length === 2 && tx.incomes.length === 1, `expenses=${tx.expenses.length} incomes=${tx.incomes.length}`);

    const db = await dbState(user._id);
    record('TEST 7: DB authoritative — full dataset', db.expenses.length === 2 && db.incomes.length === 1, JSON.stringify(db));

    // Cache-Control must be no-store (browser can never replay stale analytics)
    const dash = await readDashboard(user);
    record('TEST 7: Cache-Control: no-store on API responses', /no-store/i.test(dash.cacheControl || ''), `header=${dash.cacheControl}`);
  }

  // ============ TEST 8: RAPID MUTATIONS (race condition probe) ============
  showNextTest(8, 'RAPID MUTATIONS — add→delete→add→edit→delete');
  {
    const { user, wallet, food } = await newUser('t8');
    // ADD
    const r1 = await api('POST', '/expenses', user, {
      title: 'A', amount: 1000, date: todayISO(), category: food._id.toString(),
      paymentMethod: 'upi', walletId: wallet._id.toString(),
    });
    // DELETE
    await api('DELETE', `/expenses/${r1.json?.data?._id}`, user);
    // ADD again
    const r2 = await api('POST', '/expenses', user, {
      title: 'B', amount: 2000, date: todayISO(), category: food._id.toString(),
      paymentMethod: 'upi', walletId: wallet._id.toString(),
    });
    const idB = r2.json?.data?._id;
    // EDIT
    await api('PUT', `/expenses/${idB}`, user, {
      title: 'B', amount: 2500, date: todayISO(), category: food._id.toString(),
      paymentMethod: 'upi', walletId: wallet._id.toString(),
    });
    // DELETE
    await api('DELETE', `/expenses/${idB}`, user);

    const tx = await readInTransactionState(user);
    const dash = await readDashboard(user);
    const ana = await readAnalytics(user);
    const db = await dbState(user._id);

    record('TEST 8: final transaction list — empty, no dupes', tx.expenses.length === 0, `expenses=${tx.expenses.length}`);
    record('TEST 8: Dashboard reflects final zero state', dash.summary.totalExpense === 0 && dash.expenses.length === 0);
    record('TEST 8: Analytics reflects final zero state', ana.summary.totalExpense === 0 && ana.summary.totalIncome === 0);
    record('TEST 8: no deleted transaction reappeared (1000/2000/2500 absent)', !tx.expenses.some((e) => [1000, 2000, 2500].includes(e.amount)));
    record('TEST 8: DB authoritative — zero expenses, wallet fully refunded', db.expenses.length === 0 && db.walletBalance === 100000, JSON.stringify(db));

    const ai = await askAI(user, 'What is my current total expense?');
    record('TEST 8: AI reflects current (zero) state', /0|none|no expenses|zero/i.test(ai.reply) && !hasAmount(ai.reply, 1000) && !hasAmount(ai.reply, 2000) && !hasAmount(ai.reply, 2500), `AI: ${ai.reply}`);
  }

  // ============ TEST 9 + 10: NAVIGATION / REFRESH (mechanism) ============
  showNextTest('9+10', 'NAVIGATION + REFRESH — same current state everywhere');
  {
    const { user, wallet, food } = await newUser('t9');
    await api('POST', '/expenses', user, {
      title: 'Persist', amount: 4000, date: todayISO(), category: food._id.toString(),
      paymentMethod: 'upi', walletId: wallet._id.toString(),
    });
    const expId = (await api('GET', '/expenses?limit=1000', user)).json.data.expenses[0]._id;
    await api('DELETE', `/expenses/${expId}`, user);

    // Repeated cross-surface reads simulating page re-mounts / navigation
    for (let i = 1; i <= 3; i++) {
      const dash = await readDashboard(user);
      const ana = await readAnalytics(user);
      const tx = await readInTransactionState(user);
      const pass = dash.summary.totalExpense === 0 && ana.summary.totalExpense === 0 && tx.expenses.length === 0;
      record(`TEST 9/10: state consistent across surfaces (read ${i})`, pass, `dash=${dash.summary.totalExpense} ana=${ana.summary.totalExpense} tx=${tx.expenses.length}`);
    }

    // Fresh AI read (same as re-opening the AI assistant after refresh)
    const ai = await askAI(user, 'What are my current expenses and income?');
    record('TEST 9/10: AI after refresh-equivalent re-open excludes deleted ₹4,000', !hasAmount(ai.reply, 4000), `AI: ${ai.reply}`);

    const db = await dbState(user._id);
    record('TEST 9/10: DB authoritative — deleted remains excluded', db.expenses.length === 0, JSON.stringify(db));
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  const failed = results.filter((r) => !r.pass);
  console.log(`\n==============================================================`);
  console.log(`PHASE 5 SUMMARY: ${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    console.log('FAILED TESTS:');
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
  } else {
    console.log('ALL TESTS PASSED');
  }
  console.log(`==============================================================`);
  return failed.length;
};

try {
  const failedCount = await run();
  process.exitCode = failedCount > 0 ? 1 : 0;
} catch (err) {
  console.error('\nHARNESS ERROR:', err.message);
  if (err.stack) console.error(err.stack.split('\n').slice(0, 3).join('\n'));
  process.exitCode = 1;
} finally {
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
      console.log('\n[cleanup] Dropped test database.');
    }
    await mongoose.disconnect();
  } catch (e) {
    console.error('cleanup error:', e.message);
  }
  // server.js keeps an HTTP listener alive — force exit so the harness terminates.
  const exitCode = process.exitCode || 0;
  setTimeout(() => process.exit(exitCode), 50);
}