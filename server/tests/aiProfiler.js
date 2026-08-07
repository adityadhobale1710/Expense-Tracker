import { performance } from 'perf_hooks';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { buildContext } from '../services/ai/ContextBuilder.js';
import { buildPrompt, estimateTokens } from '../services/ai/PromptBuilder.js';
import { validateResponse } from '../services/ai/ResponseValidator.js';
import { generateAIResponse } from '../services/ai/GeminiService.js';
import { updateMemoryAsynchronously } from '../services/ai/MemoryService.js';

dotenv.config({ path: './.env' });

import FinancialDataService from '../services/financial/FinancialDataService.js';
import AIChat from '../models/AIChat.js';

// Setup Mock Data
const createMockDataset = (size) => {
  const isLarge = size === 'large';
  const multiplier = isLarge ? 50 : 1;
  return {
    user: { level: 5, xp: 500, coins: 100 },
    wallets: Array.from({ length: 3 * multiplier }, (_, i) => ({ name: `W${i}`, type: 'Bank', balance: 5000, currency: 'INR' })),
    budgets: Array.from({ length: 5 * multiplier }, (_, i) => ({ category: { name: `C${i}` }, limit: 10000, spent: 4000 })),
    expenses: Array.from({ length: 20 * multiplier }, (_, i) => ({ amount: 100, category: { name: `C${i % 5}` }, title: `Exp ${i}`, date: new Date() })),
    incomes: Array.from({ length: 5 * multiplier }, (_, i) => ({ amount: 2000, category: { name: 'Salary' }, source: 'Work', date: new Date() })),
    goals: Array.from({ length: 2 * multiplier }, (_, i) => ({ title: `G${i}`, targetAmount: 100000, savedAmount: 10000, isDeleted: false })),
    loans: Array.from({ length: 1 * multiplier }, (_, i) => ({ name: `L${i}`, emiAmount: 500, remainingBalance: 20000, type: 'Personal', interestRate: 5 })),
    subscriptions: Array.from({ length: 3 * multiplier }, (_, i) => ({ name: `Sub${i}`, cost: 100, billingCycle: 'monthly', nextBillingDate: new Date() })),
  };
};

const createMockChatHistory = (size) => {
  let length = 5;
  if (size === 'medium') length = 15;
  if (size === 'long') length = 45;
  
  return Array.from({ length }, (_, i) => ({
    role: i % 2 === 0 ? 'user' : 'assistant',
    content: i % 2 === 0 ? "What's my budget looking like?" : "Your budget is fine."
  }));
};

const profileScenario = async (datasetSize, historySize) => {
  console.log(`\n======================================================`);
  console.log(`Profiling Scenario: Dataset [${datasetSize}] | History [${historySize}]`);
  console.log(`======================================================`);

  // Mock Collector
  const rawData = createMockDataset(datasetSize);
  FinancialDataService.getFinancialSnapshot = async () => rawData;
  
  const mockChat = {
    _id: new mongoose.Types.ObjectId(),
    moduleCache: {},
    structuredMemory: {
      user_preferences: "Loves saving money",
      ongoing_topics: "Budget planning",
      long_term_goals: "Buy a house",
      conversation_summary: "",
      pending_followups: "",
      communication_preferences: "Concise",
      version: 1, lastUpdated: new Date(), summaryCount: 1
    },
    save: async () => {}, // Mock save
    markModified: () => {}
  };

  const detectedIntents = [{ intent: 'budget_analysis', confidence: 0.95 }];
  const userMessage = "Tell me how I am doing with my budget this month.";
  const chatHistory = createMockChatHistory(historySize);

  // 1. Profile ContextBuilder
  const t0 = performance.now();
  const contextResult = await buildContext("mockId", detectedIntents, mockChat, userMessage);
  const tContext = performance.now() - t0;
  
  // 2. Profile PromptBuilder
  const t1 = performance.now();
  const promptPayload = buildPrompt(contextResult, chatHistory, userMessage, mockChat.structuredMemory);
  const tPrompt = performance.now() - t1;

  // Measure prompt character length
  const promptSizeChars = promptPayload.systemInstruction.length + promptPayload.contents.map(c => c.parts[0].text).join('').length;

  // 3. Profile GeminiService
  const t2 = performance.now();
  let aiResponse = "";
  let inputTokens = 0, outputTokens = 0;
  try {
    // Note: To get exact tokens, we need to bypass our internal wrap or rely on usageMetadata if returned.
    // Our GeminiService logs usageMetadata but doesn't return it natively in the string. Let's patch temporarily for profiling or just capture duration.
    aiResponse = await generateAIResponse(promptPayload);
    // Rough estimate using our internal if exact isn't passed back
    const est = estimateTokens(promptPayload);
    inputTokens = est.systemTokens + est.contentsTokens;
    outputTokens = Math.ceil(aiResponse.length / 4);
  } catch (err) {
    console.error("Gemini API Error:", err.message);
    aiResponse = "MOCK_RESPONSE";
  }
  const tGemini = performance.now() - t2;

  // 4. Profile ResponseValidator
  const t3 = performance.now();
  const validation = validateResponse(aiResponse, contextResult.counts, contextResult.validationContext, 'v2');
  const tValidation = performance.now() - t3;

  // 5. Profile MemoryService
  // We mock AIChat.findById to return our mockChat for updateMemoryAsynchronously
  AIChat.findById = async () => mockChat;
  
  const t4 = performance.now();
  await updateMemoryAsynchronously(mockChat._id, userMessage, chatHistory);
  const tMemory = performance.now() - t4;
  
  const memorySizeChars = JSON.stringify(mockChat.structuredMemory).length;

  // Calculate costs ($0.075 / 1M input, $0.30 / 1M output)
  const estCost = ((inputTokens / 1000000) * 0.075) + ((outputTokens / 1000000) * 0.30);

  return {
    Dataset: datasetSize,
    History: historySize,
    PromptSizeKB: (promptSizeChars / 1024).toFixed(2),
    MemorySizeKB: (memorySizeChars / 1024).toFixed(2),
    ContextTimeMs: tContext.toFixed(2),
    PromptTimeMs: tPrompt.toFixed(2),
    GeminiTimeMs: tGemini.toFixed(2),
    ValidationTimeMs: tValidation.toFixed(2),
    MemoryTimeMs: tMemory.toFixed(2),
    InputTokens: inputTokens,
    OutputTokens: outputTokens,
    EstCostUSD: estCost.toFixed(6)
  };
};

const runAudit = async () => {
  const results = [];
  results.push(await profileScenario('small', 'short'));
  results.push(await profileScenario('small', 'medium'));
  results.push(await profileScenario('large', 'long')); // Stress test
  
  console.log("\n========================================================================================");
  console.table(results);
  console.log("========================================================================================");
  
  process.exit(0);
};

runAudit();
