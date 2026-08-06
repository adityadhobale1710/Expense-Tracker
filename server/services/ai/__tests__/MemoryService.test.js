import assert from 'assert';
import { shouldUpdateMemory, sanitizeMemoryField } from '../MemoryService.js';

console.log("--- STARTING MEMORY SERVICE TESTS ---");

// 1. Meaningful Change Detection
assert.strictEqual(shouldUpdateMemory("hello"), false, "Should skip 'hello'");
assert.strictEqual(shouldUpdateMemory("thanks"), false, "Should skip 'thanks'");
assert.strictEqual(shouldUpdateMemory("ok"), false, "Should skip 'ok'");
assert.strictEqual(shouldUpdateMemory("I want to save for a wedding"), true, "Should trigger on goals");
assert.strictEqual(shouldUpdateMemory("Please be concise"), true, "Should trigger on preferences");

// Financial exclusion logic in detection
assert.strictEqual(shouldUpdateMemory("10000"), false, "Should skip purely numeric inputs");
assert.strictEqual(shouldUpdateMemory("₹50000"), false, "Should skip purely numeric financial inputs");

console.log("✓ Meaningful change detection passed");

// 2. Financial Redaction & Discarding
assert.strictEqual(sanitizeMemoryField("I like saving ₹5000 every month."), "I like saving every month.", "Should redact financial portion but keep context");
assert.strictEqual(sanitizeMemoryField("Long-term goal: Save ₹2 lakh for wedding."), "Long-term goal: Save for wedding.", "Should redact financial portion but keep context");

assert.strictEqual(sanitizeMemoryField("My wallet balance is ₹45000."), "", "Should discard dynamic wallet balance");
assert.strictEqual(sanitizeMemoryField("My monthly budget is ₹10000."), "", "Should discard dynamic monthly budget");

// Additional checks
assert.strictEqual(sanitizeMemoryField("User prefers concise answers."), "User prefers concise answers.", "Should leave standard preference untouched");
assert.strictEqual(sanitizeMemoryField("User has $500 in expense this week"), "", "Should discard dynamic expense");

console.log("✓ Financial data redaction logic passed");

console.log("--- ALL MEMORY REGRESSION TESTS PASSED SUCCESSFULLY ---");
