import AIChat from '../../models/AIChat.js';
import { generateAIResponse } from './GeminiService.js';
import logger from '../../utils/logger.js';

// ============================================================================
// 1. Meaningful Change Detection
// ============================================================================
const isSmallTalk = (text) => {
  const norm = text.toLowerCase().trim();
  const stopwords = ['hi', 'hello', 'hey', 'thanks', 'thank you', 'ok', 'okay', 'yes', 'no', 'cool', 'awesome', 'great', 'sure', 'alright'];
  return stopwords.includes(norm) || norm.length < 5;
};

export const containsFinancialData = (text) => {
  return /(?:(?:₹|rs\.?|inr|\$|£|€)\s*[\d,]+(?:\.\d+)?\s*(?:k|lakhs?|l|crores?|cr|m|millions?|b|billions?)?)|(?:[\d.,]+\s*(?:%|percent))|(?:\b[\d,]+(?:\.\d+)?\s*(?:k|lakhs?|l|crores?|cr|m|millions?|b|billions?)\b)/i.test(text);
};

export const sanitizeMemoryField = (text) => {
  if (!text) return "";

  const financialRegex = /(?:(?:₹|rs\.?|inr|\$|£|€)\s*[\d,]+(?:\.\d+)?\s*(?:k|lakhs?|l|crores?|cr|m|millions?|b|billions?)?)|(?:[\d.,]+\s*(?:%|percent))|(?:\b[\d,]+(?:\.\d+)?\s*(?:k|lakhs?|l|crores?|cr|m|millions?|b|billions?)\b)/gi;
  const hasFinancial = financialRegex.test(text);
  
  // 1. Reject purely dynamic financial statements completely
  const dynamicSubjects = /\b(wallet|balance|budget|spent|remaining|transaction|expense|income|loan|emi|subscription)\b/i;
  if (hasFinancial && dynamicSubjects.test(text)) {
    return ""; // Discard entirely
  }

  // 2. Redact the financial values and preserve meaning
  let redacted = text.replace(financialRegex, '').replace(/\s{2,}/g, ' ').trim();
  
  // Clean up any trailing punctuation that might be left dangling
  redacted = redacted.replace(/\s+([.,!?:])/g, '$1');
  
  return redacted;
};

export const shouldUpdateMemory = (userMessage) => {
  if (isSmallTalk(userMessage)) return false;
  
  // If the query is aggressively financial, it likely contains no long-term memory value.
  // But users might say "I want to save ₹50,000 for a car." We still shouldn't save the 50,000, 
  // but we should save "save for a car". We'll pass it to Gemini but enforce rejection if Gemini outputs the number.
  // We won't block it here entirely unless it's ONLY numbers.
  const onlyNumbers = /^[\d.,₹$\s]+$/.test(userMessage);
  if (onlyNumbers) return false;

  return true;
};

// ============================================================================
// 2. Memory Validation & Pruning
// ============================================================================
const validateAndPruneMemory = (newMemory, oldMemory) => {
  if (!newMemory || typeof newMemory !== 'object') {
    throw new Error('Malformed memory: Not an object');
  }

  const fields = [
    'user_preferences', 'ongoing_topics', 'long_term_goals', 
    'conversation_summary', 'pending_followups', 'communication_preferences'
  ];

  const validated = {};
  let fieldsUpdated = [];

  for (const field of fields) {
    let val = newMemory[field] || '';
    
    if (typeof val !== 'string') {
      val = String(val);
    }

    // 1. Trim whitespace
    val = val.trim();

    // 2. Sanitize and redact financial values
    val = sanitizeMemoryField(val);

    // If redaction completely cleared the field, continue to next
    if (!val) {
      validated[field] = "";
      if ("" !== (oldMemory[field] || '')) {
        fieldsUpdated.push(field);
      }
      continue;
    }

    // 3. Size limits & Compression (truncate to max 500 chars per field to prevent unlimited growth)
    if (val.length > 500) {
      val = val.substring(0, 497) + '...';
    }

    // 4. Remove empty fields natively (keep as empty string)
    validated[field] = val;

    if (val !== (oldMemory[field] || '')) {
      fieldsUpdated.push(field);
    }
  }

  return { validated, fieldsUpdated };
};

// ============================================================================
// 3. Memory Generation & Update
// ============================================================================
export const updateMemoryAsynchronously = async (chatId, latestUserMessage, recentMessages) => {
  const start = Date.now();
  let outcome = 'SKIPPED';
  let triggerReason = 'N/A';
  let fieldsUpdated = [];
  let errorMsg = null;

  try {
    if (!shouldUpdateMemory(latestUserMessage)) {
      triggerReason = 'SmallTalk_Or_Irrelevant';
      return;
    }

    triggerReason = 'Meaningful_Change_Detected';

    const chat = await AIChat.findById(chatId);
    if (!chat) return;

    const currentMemory = chat.structuredMemory || {
      user_preferences: "", ongoing_topics: "", long_term_goals: "",
      conversation_summary: "", pending_followups: "", communication_preferences: "",
      version: 1, lastUpdated: null, summaryCount: 0
    };

    const promptPayload = {
      systemInstruction: `You are the Memory Manager for an AI Assistant. Your job is to extract long-term conversational memory from the user's recent messages and update the structured memory object.

CRITICAL RULES:
1. NEVER extract or summarise financial data (wallet balances, budgets, expenses, incomes, goals, loans, subscriptions, transactions, percentages).
2. ONLY extract user preferences, communication styles, long-term non-financial goals, and ongoing topics.
3. Merge duplicate facts. Replace outdated preferences. Preserve the latest information. Do not append indefinitely.
4. Output STRICT JSON exactly matching this schema, with no markdown formatting or extra text:
{
  "user_preferences": "string",
  "ongoing_topics": "string",
  "long_term_goals": "string",
  "conversation_summary": "string",
  "pending_followups": "string",
  "communication_preferences": "string"
}`,
      contents: [
        {
          role: 'user',
          parts: [{
            text: `CURRENT MEMORY:\n${JSON.stringify(currentMemory, null, 2)}\n\nRECENT CONVERSATION:\n${recentMessages.map(m => m.role + ': ' + m.content).join('\n')}\n\nLATEST MESSAGE:\nuser: ${latestUserMessage}`
          }]
        }
      ]
    };

    // Use JSON structure natively via Gemini if possible. Since we wrap in try-catch, it's safe.
    // For now, we enforce prompt-level strictness and parse.
    const replyStr = await generateAIResponse(promptPayload);
    
    // Strip potential markdown block
    const cleanedReply = replyStr.replace(/^```json/i, '').replace(/```$/i, '').trim();
    
    let parsedMemory;
    try {
      parsedMemory = JSON.parse(cleanedReply);
    } catch (parseErr) {
      throw new Error(`JSON Parse Error: ${parseErr.message}`);
    }

    const { validated, fieldsUpdated: updated } = validateAndPruneMemory(parsedMemory, currentMemory);
    fieldsUpdated = updated;

    if (fieldsUpdated.length > 0) {
      chat.structuredMemory = {
        ...currentMemory,
        ...validated,
        version: (currentMemory.version || 1) + 1,
        lastUpdated: new Date(),
        summaryCount: (currentMemory.summaryCount || 0) + 1,
        importance: {
          user_preferences: "CRITICAL",
          communication_preferences: "CRITICAL",
          long_term_goals: "CRITICAL",
          ongoing_topics: "MEDIUM",
          pending_followups: "MEDIUM",
          conversation_summary: "LOW"
        }
      };
      await chat.save();
      outcome = 'SUCCESS';
    } else {
      outcome = 'NO_CHANGE';
    }

  } catch (error) {
    outcome = 'ERROR';
    errorMsg = error.message;
  } finally {
    const duration = Date.now() - start;
    if (outcome !== 'SKIPPED') {
      logger.info(`[MemoryService] [${outcome}] Trigger: ${triggerReason}, Fields: [${fieldsUpdated.join(', ')}], Duration: ${duration}ms${errorMsg ? `, Error: ${errorMsg}` : ''}`);
    }
  }
};
