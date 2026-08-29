/**
 * server/tests/test_helpers.mjs
 * 
 * Reusable Test Helpers and Harness for Expense Tracker Automated Test Suite
 * Connects to isolated test database namespace (expense_tracker_test)
 * Boots the real Express API server on dedicated port 5599
 */

import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

export const TEST_PORT = parseInt(process.env.TEST_PORT || '5599', 10);
export const BASE_URL = `http://127.0.0.1:${TEST_PORT}/api`;

// Use isolated test database namespace
const baseMongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/expense_tracker';
if (baseMongoUri.includes('/expense_tracker?')) {
  process.env.MONGO_URI = baseMongoUri.replace('/expense_tracker?', '/expense_tracker_test?');
} else if (baseMongoUri.includes('/expense_tracker')) {
  process.env.MONGO_URI = baseMongoUri.replace('/expense_tracker', '/expense_tracker_test');
} else if (!baseMongoUri.includes('test')) {
  process.env.MONGO_URI = `${baseMongoUri}_test`;
}

process.env.PORT = String(TEST_PORT);
process.env.NODE_ENV = 'test';

// Boot the real Express application
await import('../server.js');

import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Wallet from '../models/Wallet.js';
import Category from '../models/Category.js';
import Expense from '../models/Expense.js';
import Income from '../models/Income.js';
import Budget from '../models/Budget.js';
import Goal from '../models/Goal.js';
import Contribution from '../models/Contribution.js';
import Bill from '../models/Bill.js';
import Loan from '../models/Loan.js';
import Subscription from '../models/Subscription.js';
import Investment from '../models/Investment.js';
import SplitExpense from '../models/SplitExpense.js';
import Family from '../models/Family.js';
import AIChat from '../models/AIChat.js';
import Session from '../models/Session.js';
import SecurityLog from '../models/SecurityLog.js';
import Notification from '../models/Notification.js';

export {
  mongoose,
  User,
  Wallet,
  Category,
  Expense,
  Income,
  Budget,
  Goal,
  Contribution,
  Bill,
  Loan,
  Subscription,
  Investment,
  SplitExpense,
  Family,
  AIChat,
  Session,
  SecurityLog,
  Notification,
};

/**
 * HTTP Request Helper with JSON, Auth, and Cookie parsing
 */
export const request = async ({
  method = 'GET',
  path = '',
  body = null,
  token = null,
  cookie = null,
  headers = {},
  timeout = 15000,
}) => {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  const reqHeaders = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (token) {
    reqHeaders['Authorization'] = `Bearer ${token}`;
  }
  if (cookie) {
    reqHeaders['Cookie'] = cookie;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      method,
      headers: reqHeaders,
      body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
      signal: controller.signal,
      redirect: 'manual', // Don't auto-follow redirects so we can assert 302s
    });

    clearTimeout(timeoutId);

    const status = res.status;
    const responseHeaders = Object.fromEntries(res.headers.entries());
    const rawCookies = res.headers.get('set-cookie');
    const location = res.headers.get('location');

    let json = null;
    let text = '';
    try {
      text = await res.text();
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    return {
      status,
      data: json,
      rawText: text,
      headers: responseHeaders,
      setCookie: rawCookies,
      location,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    return {
      status: err.name === 'AbortError' ? 408 : 500,
      data: null,
      error: err.message,
    };
  }
};

/**
 * Entity Factories
 */
export const createTestUser = async (overrides = {}) => {
  const uniqueId = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  const email = overrides.email || `test_${uniqueId}@example.com`;
  const name = overrides.name || `Test User ${uniqueId}`;
  const password = overrides.password || 'TestPass123!';

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    isEmailVerified: overrides.isEmailVerified !== undefined ? overrides.isEmailVerified : true,
    isVerified: overrides.isVerified !== undefined ? overrides.isVerified : true,
    otpVerified: overrides.otpVerified !== undefined ? overrides.otpVerified : true,
    role: overrides.role || 'user',
    isDisabled: overrides.isDisabled || false,
    isBlocked: overrides.isBlocked || false,
    authProvider: overrides.authProvider || 'local',
    ...overrides,
  });

  const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

  user.refreshToken = refreshToken;
  await user.save();

  return { user, accessToken, refreshToken, rawPassword: password };
};

export const createTestWallet = async (user, overrides = {}) => {
  const unique = `${Date.now()}_${Math.floor(Math.random() * 1e5)}`;
  const wallet = await Wallet.create({
    user: user._id || user,
    name: overrides.name || `Wallet_${unique}`,
    type: overrides.type || 'bank',
    balance: overrides.balance !== undefined ? overrides.balance : 100000,
    currency: overrides.currency || 'INR',
    isPrimary: overrides.isPrimary !== undefined ? overrides.isPrimary : false,
    color: overrides.color || '#6366f1',
    icon: overrides.icon || '💳',
    ...overrides,
  });
  return wallet;
};

export const createTestCategory = async (user, overrides = {}) => {
  const unique = `${Date.now()}_${Math.floor(Math.random() * 1e5)}`;
  const category = await Category.create({
    user: user._id || user,
    name: overrides.name || `Category_${unique}`,
    type: overrides.type || 'expense',
    icon: overrides.icon || '📁',
    color: overrides.color || '#6366f1',
    ...overrides,
  });
  return category;
};

/**
 * Complete Data Cleanup for Test Users
 */
export const cleanupUser = async (userId) => {
  if (!userId) return;
  const uid = userId._id || userId;
  await Promise.all([
    Expense.deleteMany({ user: uid }),
    Income.deleteMany({ user: uid }),
    Budget.deleteMany({ user: uid }),
    Wallet.deleteMany({ user: uid }),
    Goal.deleteMany({ user: uid }),
    Contribution.deleteMany({ user: uid }),
    Bill.deleteMany({ user: uid }),
    Loan.deleteMany({ user: uid }),
    Subscription.deleteMany({ user: uid }),
    Investment.deleteMany({ user: uid }),
    Category.deleteMany({ user: uid }),
    SplitExpense.deleteMany({ creator: uid }),
    Family.deleteMany({ owner: uid }),
    AIChat.deleteMany({ user: uid }),
    Session.deleteMany({ user: uid }),
    SecurityLog.deleteMany({ user: uid }),
    Notification.deleteMany({ user: uid }),
    User.deleteOne({ _id: uid }),
  ]);
};

/**
 * Test Results Tracking Engine
 */
export class TestSuiteRunner {
  constructor(suiteName) {
    this.suiteName = suiteName;
    this.tests = [];
  }

  record({
    id,
    feature,
    name,
    passed,
    expected,
    actual,
    status = null,
    response = null,
    file = '',
    func = '',
    rootCause = '',
    severity = 'MEDIUM',
    type = 'PASS', // 'PASS' | 'FAIL' | 'BLOCKED' | 'NOT_IMPLEMENTED' | 'NOT_TESTABLE'
  }) {
    const resultType = passed ? 'PASS' : type === 'PASS' ? 'FAIL' : type;
    const testResult = {
      id,
      feature,
      name,
      passed: Boolean(passed),
      type: resultType,
      expected: String(expected || ''),
      actual: String(actual || ''),
      status,
      response,
      file,
      func,
      rootCause,
      severity: passed ? 'INFO' : severity,
      timestamp: new Date().toISOString(),
    };

    this.tests.push(testResult);
    const tag = passed ? '✅ PASS' : `❌ ${resultType}`;
    console.log(`  [${tag}] ${id}: ${name}${!passed ? ` (Expected: ${expected} | Actual: ${actual})` : ''}`);
    return testResult;
  }

  summary() {
    const total = this.tests.length;
    const passed = this.tests.filter((t) => t.passed).length;
    const failed = this.tests.filter((t) => !t.passed && t.type === 'FAIL').length;
    const blocked = this.tests.filter((t) => t.type === 'BLOCKED').length;
    const notImplemented = this.tests.filter((t) => t.type === 'NOT_IMPLEMENTED').length;
    const skipped = this.tests.filter((t) => t.type === 'NOT_TESTABLE').length;

    return {
      suite: this.suiteName,
      total,
      passed,
      failed,
      blocked,
      notImplemented,
      skipped,
      tests: this.tests,
    };
  }
}
