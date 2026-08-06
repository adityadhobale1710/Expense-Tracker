import assert from 'assert';
import { validateResponse, getFallbackFactualResponse } from '../ResponseValidator.js';

console.log("--- STARTING RESPONSE VALIDATOR REGRESSION TESTS ---");

const baseCounts = {
  wallets: 2,
  budgets: 1,
  goals: 3,
  loans: 0,
  subscriptions: 5,
  transactions: 120,
  expenses: 100,
  incomes: 20
};

const mockContext = {
  wallets: { total: 10000, breakdown: [{ balance: 5000 }, { balance: 5000 }] },
  budgets: { totalLimit: 5000, totalSpent: 2000, budgets: [{ limit: 5000, spent: 2000, remaining: 3000, usagePercent: 40 }] },
  goals: { goals: [{ targetAmount: 100000, savedAmount: 50000, progressPct: 50, suggestedMonthlySaving: 5000 }] }
};

// 1. Backward compatibility: fallback string generation
const fallback = getFallbackFactualResponse(baseCounts);
assert.ok(fallback.includes('120'), 'Fallback string should contain transactions count');
assert.ok(fallback.includes('active wallet(s)'), 'Fallback string should contain wallets string');
console.log("✓ Backward compatibility: fallback string generation passed");

// 2. Backward compatibility: rejecting false counts
const response2 = "You have 0 wallets right now.";
const result2 = validateResponse(response2, baseCounts, mockContext);
assert.strictEqual(result2.isValid, false, 'Should reject false counts');
assert.ok(result2.reason.includes('0 wallets'), 'Reason should mention 0 wallets');
console.log("✓ Backward compatibility: rejecting false counts passed");

// 3. Currency normalization: large number formats (k, lakh, cr, m, b)
// 100k -> 100000, allowed because targetAmount is 100000
const result3a = validateResponse("Your goal is 100k.", baseCounts, mockContext);
assert.strictEqual(result3a.isValid, true, 'Should accept 100k as 100000');

// 1 lakh -> 100000
const result3b = validateResponse("Your goal is 1 lakh.", baseCounts, mockContext);
assert.strictEqual(result3b.isValid, true, 'Should accept 1 lakh as 100000');

// ₹10,000 -> 10000 (wallet total)
const result3c = validateResponse("Total wallet balance is ₹10,000.", baseCounts, mockContext);
assert.strictEqual(result3c.isValid, true, 'Should accept ₹10,000 as 10000');
console.log("✓ Currency normalization: large number formats passed");

// 4. Tolerance handling: allows medium confidence matches
// Exact is 40%, AI outputs 40.2%
const result4 = validateResponse("You have used 40.2% of your budget.", baseCounts, mockContext);
assert.strictEqual(result4.isValid, true, 'Should accept 40.2% through tolerance of 40%');
console.log("✓ Tolerance handling: allows medium confidence matches passed");

// 5. Rejects strict hallucinations (critical errors)
// AI outputs ₹15,000 (not in context)
const result5 = validateResponse("Your total limit is ₹15,000.", baseCounts, mockContext);
assert.strictEqual(result5.isValid, false, 'Should reject hallucinated 15,000');
assert.ok(result5.reason.includes('hallucinated a financial figure (15000)'), 'Should report exact hallucination reason');
console.log("✓ Rejects strict hallucinations (critical errors) passed");

// 6. False positives: ignores dates, years, and generic numbers
const result6 = validateResponse("In the year 2024 and 2025, over 12 months, you saved.", baseCounts, mockContext);
assert.strictEqual(result6.isValid, true, 'Should ignore generic non-financial numbers');
console.log("✓ False positives: ignores dates, years, and generic numbers passed");

// 7. Structured context validation: matches deep nested values
const result7a = validateResponse("You are 50% there.", baseCounts, mockContext);
assert.strictEqual(result7a.isValid, true, 'Should match progressPct 50%');

const result7b = validateResponse("I suggest saving ₹5,000 a month.", baseCounts, mockContext);
assert.strictEqual(result7b.isValid, true, 'Should match suggestedMonthlySaving 5000');
console.log("✓ Structured context validation: matches deep nested values passed");

console.log("--- ALL REGRESSION TESTS PASSED SUCCESSFULLY ---");
