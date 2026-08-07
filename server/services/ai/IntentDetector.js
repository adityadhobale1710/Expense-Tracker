/**
 * IntentDetector.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Hybrid, deterministic intent-detection engine.
 *
 * • Zero I/O — no MongoDB, no Gemini calls.
 * • Uses layered scoring: phrase detection → keyword matching → regex → synonyms.
 * • Supports multi-intent detection, sorted by confidence descending.
 * • Falls back to 'unknown' when confidence is too low.
 */

import logger from '../../utils/logger.js';

/**
 * Usage:
 *   import { detectIntents } from './IntentDetector.js';
 *   const intents = detectIntents("How much did I spend on food?");
 *   // → [{ intent: 'expense_analysis', confidence: 0.96 }, ...]
 */

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const INTENT_IDS = [
  'balance',
  'expense_analysis',
  'income_analysis',
  'budget_analysis',
  'goal_progress',
  'loan_analysis',
  'subscription_review',
  'savings_advice',
  'cash_flow',
  'comparison',
  'financial_health',
  'spending_prediction',
  'general_advice',
  'greeting',
  'unknown',
];

// Minimum confidence to include an intent in results
const MIN_CONFIDENCE = 0.40;
// Confidence floor for the 'unknown' fallback
const UNKNOWN_CONFIDENCE = 0.30;

// ─── NORMALISATION ────────────────────────────────────────────────────────────

/**
 * Normalise text: lowercase, strip punctuation, collapse whitespace.
 * @param {string} text
 * @returns {string}
 */
const normalise = (text) =>
  (text || '')
    .toLowerCase()
    .replace(/[^\w\s₹]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// ─── SCORING HELPERS ──────────────────────────────────────────────────────────

/**
 * Score a text against a list of exact/substring phrases.
 * Returns the fraction of phrases matched (0–1), weighted by phrase length.
 *
 * @param {string} text - Normalised message
 * @param {string[]} phrases
 * @returns {number}
 */
const phraseScore = (text, phrases) => {
  let score = 0;
  for (const phrase of phrases) {
    if (text.includes(phrase)) {
      // Longer phrases are more specific → higher weight
      score += Math.min(1.0, 0.25 + phrase.split(' ').length * 0.15);
    }
  }
  return Math.min(1.0, score);
};

/**
 * Score a text against a list of single keywords.
 * Each keyword hit contributes a smaller increment than a phrase hit.
 *
 * @param {string} text - Normalised message
 * @param {string[]} keywords
 * @returns {number}
 */
const keywordScore = (text, keywords) => {
  const words = new Set(text.split(' '));
  let hits = 0;
  for (const kw of keywords) {
    if (words.has(kw) || text.includes(kw)) hits++;
  }
  return Math.min(1.0, hits * 0.18);
};

/**
 * Score a text against an array of RegExp patterns.
 * Each pattern contributes a fixed weight of 0.30.
 * For very short messages (≤3 words), the weight is boosted to 0.50 to capture
 * greetings like "Hi!" or "Hello" that have almost no other signal.
 *
 * @param {string} text - Normalised message
 * @param {RegExp[]} patterns
 * @returns {number}
 */
const regexScore = (text, patterns) => {
  for (const pattern of patterns) {
    if (pattern.test(text)) return 1.0;
  }
  return 0.0;
};

// ─── INTENT DEFINITIONS ───────────────────────────────────────────────────────
// Each intent has:
//   phrases   — high-specificity multi-word signals
//   keywords  — individual word matches
//   patterns  — regex patterns
//   boosts    — additive score when these special conditions are met

const INTENT_DEFINITIONS = {

  greeting: {
    phrases: [
      'good morning', 'good evening', 'good afternoon', 'good night',
      'thank you', 'thanks a lot', 'nice to meet', 'how are you',
      // single-word greetings — treated as phrases for higher weight
      'hi', 'hello', 'hey', 'hiya', 'howdy', 'thanks', 'bye', 'goodbye',
    ],
    keywords: [
      'hi', 'hello', 'hey', 'hiya', 'howdy', 'greetings',
      'thanks', 'ty', 'bye', 'goodbye', 'ciao',
    ],
    patterns: [
      /^(hi|hello|hey|howdy|hiya)[!.? ]*$/i,
      /^thanks?[!.? ]*$/i,
      /^(good\s?(morning|evening|afternoon|night))[!.? ]*$/i,
      /^(hey there|hi there|hello there)[!.? ]*$/i,
    ],
  },

  balance: {
    phrases: [
      'wallet balance', 'account balance', 'current balance', 'total balance',
      'how much money do i have', 'how much cash do i have',
      'how much is in my', 'what is my balance', 'check my balance',
      'total funds', 'liquid assets', 'available money',
      'how much do i have', 'my funds', 'money available',
    ],
    keywords: [
      'balance', 'wallet', 'cash', 'funds', 'money',
      'account', 'liquid', 'available', 'bank',
    ],
    patterns: [
      /how much (money|cash|funds|do i have)/,
      /\bbalance\b/,
      /\bwallet\b/,
      /current (balance|funds|money)/,
    ],
  },

  expense_analysis: {
    phrases: [
      'how much did i spend', 'where did i spend', 'my spending',
      'total expenses', 'expense breakdown', 'biggest expenses',
      'what did i spend on', 'spending on', 'money spent',
      'highest expenses', 'top expenses', 'expense report',
      'where is my money going', 'spending habits', 'spending pattern',
      'outflow', 'how much was spent', 'money going out',
    ],
    keywords: [
      'spent', 'spending', 'expense', 'expenses', 'expenditure',
      'outflow', 'purchases', 'bought', 'charged', 'paid for',
      'transactions', 'food', 'shopping', 'transport', 'bills',
    ],
    patterns: [
      /how much (did i|have i) spend/,
      /\bexpenses?\b/,
      /\bspend(ing)?\b/,
      /where (is|are|did|has) (my )?(money|cash|funds)/,
      /spent (on|last|this|in)/,
      /spending (this|last|in|on)/,
    ],
  },

  income_analysis: {
    phrases: [
      'how much did i earn', 'total income', 'my income', 'salary received',
      'money received', 'income this month', 'income last month',
      'how much have i earned', 'income breakdown', 'income sources',
      'where does my money come from', 'earnings this month',
    ],
    keywords: [
      'income', 'salary', 'earned', 'earnings', 'earning',
      'received', 'credited', 'revenue', 'paycheck', 'payday',
      'freelance', 'wages', 'stipend',
    ],
    patterns: [
      /how much (did i|have i) earn/,
      /\bincome\b/,
      /\bearnings?\b/,
      /\bsalary\b/,
      /(money|cash|funds) received/,
      /income (this|last|in)/,
    ],
  },

  budget_analysis: {
    phrases: [
      'budget status', 'budget limit', 'budget overview', 'over budget',
      'budget exceeded', 'budget remaining', 'budget left',
      'how much budget', 'am i over', 'exceeded my limit',
      'spending limit', 'budget usage', 'am i within budget',
      'budget for this month', 'budget utilisation', 'budget used',
    ],
    keywords: [
      'budget', 'limit', 'overspend', 'overspending', 'allowance',
      'threshold', 'cap', 'ceiling', 'utilisation', 'usage',
    ],
    patterns: [
      /\bbudget\b/,
      /over (budget|limit|spending)/,
      /spending limit/,
      /budget (status|usage|left|remaining|exceeded)/,
    ],
  },

  goal_progress: {
    phrases: [
      'goal progress', 'savings goal', 'goal status', 'how close am i',
      'how much saved for', 'saving for', 'target amount',
      'goal completion', 'reach my goal', 'achieve my goal',
      'goal milestone', 'dream fund', 'emergency fund', 'vacation fund',
      'progress on my goal', 'how much left for',
    ],
    keywords: [
      'goal', 'goals', 'target', 'milestone', 'fund',
      'saving for', 'saving up', 'dream', 'objective',
    ],
    patterns: [
      /\bgoal\b/,
      /\bmilestone\b/,
      /saving (for|up)/,
      /how (close|far|much) (am i|have i|to|until)/,
      /(emergency|vacation|laptop|bike|car|house) fund/,
    ],
  },

  loan_analysis: {
    phrases: [
      'loan details', 'emi amount', 'loan status', 'outstanding loan',
      'loan balance', 'remaining debt', 'debt status',
      'how much do i owe', 'loan repayment', 'my liabilities',
      'home loan', 'car loan', 'personal loan', 'education loan',
      'credit card emi', 'total debt', 'loan overview',
      'show my loan', 'my loan emi', 'loan emi details',
    ],
    keywords: [
      'loan', 'loans', 'emi', 'debt', 'borrow', 'borrowed',
      'liabilities', 'mortgage', 'repayment', 'outstanding',
      'owe', 'principal', 'interest rate',
    ],
    patterns: [
      /\bloans?\b/,
      /\bemi\b/,
      /\bdebt\b/,
      /\bmortgage\b/,
      /how much (do i|should i) owe/,
      /(home|car|personal|education) loan/,
      /loan.*emi|emi.*loan/,
    ],
  },

  subscription_review: {
    phrases: [
      'subscription cost', 'monthly subscriptions', 'active subscriptions',
      'cancel subscription', 'subscription list', 'what subscriptions',
      'recurring payments', 'subscription charges', 'should i cancel',
      'streaming services', 'subscriptions i have', 'show my subscriptions',
      'my subscriptions', 'list subscriptions',
    ],
    keywords: [
      'subscription', 'subscriptions', 'recurring', 'netflix', 'spotify',
      'amazon prime', 'hotstar', 'youtube', 'cancel', 'renewal',
      'auto-renew', 'streaming', 'membership',
    ],
    patterns: [
      /\bsubscriptions?\b/,
      /\brecurring\b/,
      /(netflix|spotify|prime|hotstar|disney|youtube)/,
      /cancel (my|a|the|subscription)/,
      /streaming (service|subscription)/,
      /show (my |all )?(subscriptions?)/,
    ],
  },

  savings_advice: {
    phrases: [
      'how much should i save', 'saving tips', 'increase savings',
      'how to save more', 'saving advice', 'saving rate',
      'should i invest', 'saving strategy', 'best way to save',
      'cut expenses', 'reduce spending', 'save money tips',
      'improve savings', 'saving potential',
    ],
    keywords: [
      'save', 'saving', 'savings', 'invest', 'investment',
      'frugal', 'thrift', 'tips', 'advice',
    ],
    patterns: [
      /how (much|can i|should i) save/,
      /(saving|investment) (tips|advice|strategy|rate|potential)/,
      /should i (save|invest)/,
      /how to (save|invest|reduce)/,
      /(cut|reduce) (expense|spending|cost)/,
    ],
  },

  cash_flow: {
    phrases: [
      'can i afford', 'can i buy', 'can i spend', 'afford a',
      'enough money to', 'do i have enough', 'is it safe to spend',
      'remaining money', 'disposable income', 'free cash',
      'after expenses', 'what can i afford', 'purchasing power',
      'money left over', 'surplus', 'cash flow',
    ],
    keywords: [
      'afford', 'purchase', 'buy', 'cash flow', 'surplus',
      'disposable', 'left over', 'leftover', 'enough',
    ],
    patterns: [
      /can i afford/,
      /can i (buy|spend|purchase)/,
      /\bafford\b/,
      /enough (money|cash|funds)/,
      /do i have enough/,
      /\bcash flow\b/,
      /money left (over|after)/,
    ],
  },

  comparison: {
    phrases: [
      'compare this month', 'vs last month', 'this month vs last month',
      'compared to last month', 'month over month', 'month on month',
      'how does this month compare', 'spending increased', 'spending decreased',
      'am i spending more', 'am i spending less', 'income vs expenses',
      'this year vs last year', 'year on year', 'year over year',
    ],
    keywords: [
      'compare', 'comparison', 'vs', 'versus', 'trend', 'change',
      'increased', 'decreased', 'more than last', 'less than last',
      'previous month', 'last month',
    ],
    patterns: [
      /(compare|comparison)/,
      /\bvs\b|\bversus\b/,
      /this (month|year|week) (vs|versus|compared)/,
      /last (month|year|week) (vs|versus|compared)/,
      /(more|less) than last (month|year)/,
      /month (over|on) month/,
      /year (over|on) year/,
    ],
  },

  financial_health: {
    phrases: [
      'financial health', 'financial status', 'financial summary',
      'overall finances', 'overall financial', 'financial overview',
      'how am i doing financially', 'am i financially healthy',
      'financial situation', 'financial well-being', 'net worth',
      'am i doing well', 'my finances', 'financial position',
    ],
    keywords: [
      'overview', 'summary', 'health', 'status', 'situation',
      'position', 'well-being', 'financially', 'overall',
    ],
    patterns: [
      /financial (health|status|summary|overview|situation|position)/,
      /how am i doing (financially)?/,
      /overall (financial|finances?|status)/,
      /\bnet worth\b/,
      /my finances/,
    ],
  },

  spending_prediction: {
    phrases: [
      'will i overspend', 'predict my spending', 'forecast spending',
      'by end of month', 'end of month estimate', 'at this rate',
      'if i keep spending', 'spending forecast', 'spending projection',
      'will i exceed', 'projected expenses', 'estimated spending',
    ],
    keywords: [
      'predict', 'forecast', 'estimate', 'projection', 'projected',
      'will i', 'at this rate', 'expected',
    ],
    patterns: [
      /(predict|forecast|estimate|projection)/,
      /will i (overspend|exceed|run out)/,
      /at this rate/,
      /by (end of|the end of) (month|year|week)/,
      /how much will i (spend|earn)/,
    ],
  },

  general_advice: {
    phrases: [
      'financial tips', 'money tips', 'money advice', 'finance advice',
      'financial planning', 'what should i do', 'help me', 'guide me',
      'give me advice', 'financial recommendation', 'should i',
    ],
    keywords: [
      'advice', 'tip', 'tips', 'suggest', 'recommendation', 'guidance',
      'plan', 'planning', 'help', 'guide',
    ],
    patterns: [
      /(advice|tips?|suggest|recommend(ation)?|guidance|planning)/,
      /what should i (do|focus|prioritize)/,
      /help me (with|understand|plan)/,
    ],
  },
};

// ─── CORE DETECTOR ────────────────────────────────────────────────────────────

/**
 * Detect one or more intents in the user's message.
 *
 * @param {string} message - Raw user message (not yet normalised).
 * @returns {Array<{ intent: string, confidence: number }>}
 *   Sorted by confidence descending; always contains at least one entry.
 */
export const detectIntents = (message) => {
  const text = normalise(message);
  const results = [];

  for (const [intentId, definition] of Object.entries(INTENT_DEFINITIONS)) {
    const ps = phraseScore(text, definition.phrases || []);
    const ks = keywordScore(text, definition.keywords || []);
    const rs = regexScore(text, definition.patterns || []);

    // Weighted combination: phrases are most reliable, then regex, then keywords
    // For very short messages (1–2 words), the regex signal is dominant — boost it.
    // M1 regression fix: Allow regex to boost confidence over the 0.40 threshold
    // so normal questions don't collapse to 'unknown'.
    const raw = Math.min(1.0, ps * 0.5 + rs * 0.4 + ks * 0.2);

    const confidence = Math.round(raw * 100) / 100;

    if (confidence >= MIN_CONFIDENCE) {
      results.push({ intent: intentId, confidence });
    }
    
    logger.info(`[IntentDetector] Score for "${intentId}" - ps:${ps.toFixed(2)}, ks:${ks.toFixed(2)}, rs:${rs.toFixed(2)}, raw:${raw.toFixed(3)}, conf:${confidence}`);
  }

  // Sort by confidence descending
  results.sort((a, b) => b.confidence - a.confidence);

  // If nothing was detected, return 'unknown' with a baseline confidence
  if (results.length === 0) {
    return [{ intent: 'unknown', confidence: UNKNOWN_CONFIDENCE }];
  }

  return results;
};

/**
 * Convenience helper — return just the top-ranked intent string.
 * @param {string} message
 * @returns {string}
 */
export const detectPrimaryIntent = (message) => detectIntents(message)[0].intent;
