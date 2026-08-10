/**
 * ResponseValidator.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates AI Assistant responses against backend facts before returning.
 * Rejects and corrects the output if hallucinations are detected.
 */

import logger from '../../utils/logger.js';

// ============================================================================
// 1. Value Normalization
// ============================================================================
const normalizeNumber = (str, multiplierStr) => {
  let val = parseFloat(str.replace(/,/g, ''));
  if (isNaN(val)) return null;

  if (multiplierStr) {
    const m = multiplierStr.toLowerCase();
    if (m === 'k') val *= 1000;
    else if (m === 'lakh' || m === 'l' || m === 'lakhs') val *= 100000;
    else if (m === 'cr' || m === 'crore' || m === 'crores') val *= 10000000;
    else if (m === 'm' || m === 'million') val *= 1000000;
    else if (m === 'b' || m === 'billion') val *= 1000000000;
  }
  return val;
};

// ============================================================================
// 2. Value Extraction
// ============================================================================
const extractFinancialValues = (text) => {
  const norm = text.toLowerCase();
  const values = []; // Array of { val, index, matchText }
  
  // Extract Percentages (e.g., "80%", "40.5%")
  const pctRegex = /([\d.,]+)\s*%/g;
  let match;
  while ((match = pctRegex.exec(norm)) !== null) {
    const val = normalizeNumber(match[1]);
    if (val !== null) values.push({ val, index: match.index, matchText: match[0] });
  }

  // Extract Currency / Large Numbers
  // Matches: ₹10,000, 10k, 1 lakh, Rs. 1500, etc.
  // We require either a currency symbol OR a multiplier to avoid catching dates/years/bullets.
  const currRegex = /(?:₹|rs\.?|inr|\$|£|€)?\s*([\d,]+(?:\.\d+)?)\s*(k|lakhs?|l|crores?|cr|m|millions?|b|billions?)?\b/g;
  
  while ((match = currRegex.exec(norm)) !== null) {
    const hasSymbol = match[0].match(/₹|rs|inr|\$|£|€/i);
    const hasMultiplier = match[2];
    
    // Only capture if it clearly looks like money (has symbol) or large number (multiplier)
    // This avoids matching years like '2024' or list items '1.', '2.'
    if (hasSymbol || hasMultiplier) {
      const val = normalizeNumber(match[1], match[2]);
      if (val !== null) values.push({ val, index: match.index, matchText: match[0] });
    }
  }
  
  return values;
};

// ============================================================================
// 3. Context Builder
// ============================================================================
/**
 * Note: flattenValidationContext must be kept in sync with EVERY context section 
 * ContextBuilder can produce. Any section or derived number it misses becomes a 
 * guaranteed false-positive hallucination flag.
 */
const flattenValidationContext = (vc) => {
  const allowed = new Set();
  const add = (v) => { if (typeof v === 'number' && !isNaN(v)) allowed.add(v); };

  if (vc.wallets) {
    add(vc.wallets.total);
    vc.wallets.breakdown?.forEach(w => add(w.balance));
  }
  if (vc.budgets) {
    add(vc.budgets.totalLimit);
    add(vc.budgets.totalSpent);
    vc.budgets.budgets?.forEach(b => {
      add(b.limit); add(b.spent); add(b.remaining); add(b.usagePercent);
      if (b.spent > b.limit) add(b.spent - b.limit); // budget overage
    });
  }
  if (vc.goals) {
    vc.goals.goals?.forEach(g => {
      add(g.targetAmount); add(g.savedAmount); add(g.progressPct); add(g.suggestedMonthlySaving);
    });
  }
  if (vc.loans) {
    add(vc.loans.totalRemaining);
    add(vc.loans.totalMonthlyEMI);
    vc.loans.loans?.forEach(l => {
      add(l.remaining); add(l.emiAmount); add(l.interestRate);
    });
  }
  if (vc.subscriptions) {
    add(vc.subscriptions.monthlyTotal);
    add(vc.subscriptions.yearlyTotal);
    vc.subscriptions.list?.forEach(s => {
      add(s.cost); add(s.monthlyCost);
    });
  }
  if (vc.savings) {
    add(vc.savings.amount);
    add(vc.savings.rate);
  }
  if (vc.expenses) {
    add(vc.expenses.total);
    // MASTER-001: Add average so the AI can correctly cite monthly expense averages
    add(vc.expenses.average);
    vc.expenses.byCategory?.forEach(c => { add(c.total); add(c.percent); });
    vc.expenses.recent?.forEach(r => add(r.amount));
  }
  if (vc.incomes) {
    add(vc.incomes.total);
    // MASTER-001: Add average so the AI can correctly cite monthly income averages
    add(vc.incomes.average);
    vc.incomes.bySource?.forEach(s => { add(s.total); add(s.percent); });
  }
  if (vc.health) {
    add(vc.health.score);
  }
  if (vc.simulation) {
    Object.values(vc.simulation).forEach(val => add(val));
  }
  return Array.from(allowed);
};

// ============================================================================
// 4. Validation Engine
// ============================================================================
const checkValueTolerance = (val, allowedValues) => {
  let confidence = 'NONE';
  let matchedValue = null;

  for (const allowed of allowedValues) {
    if (val === allowed) {
      return { confidence: 'HIGH', matchedValue: allowed }; // Exact match
    }
    
    // Tolerance: Max 1% difference (handles 33.3 vs 33.33)
    const diff = Math.abs(val - allowed);
    const tolerance = Math.max(1, allowed * 0.01);
    
    if (diff <= tolerance) {
      confidence = 'MEDIUM';
      matchedValue = allowed;
    }
  }
  
  return { confidence, matchedValue };
};

const checkProximity = (text, index, matchText) => {
  const windowStart = Math.max(0, index - 80);
  const windowText = text.substring(windowStart, index + matchText.length).toLowerCase();
  
  const advisoryPhrases = ['i recommend', 'consider', 'you could aim for', 'a common rule is', 'if you were to', 'suggest', 'propose', 'target', 'budget of', 'would be', 'could be'];
  const factualPhrases = ['you have', 'your total is', 'you currently', "you've spent", 'you spent', 'your balance', 'total of', 'account has'];

  for (const phrase of factualPhrases) {
    if (windowText.includes(phrase)) return 'FACTUAL';
  }
  for (const phrase of advisoryPhrases) {
    if (windowText.includes(phrase)) return 'ADVISORY';
  }
  return 'BARE'; // default to bare
};

const logValidationEvent = ({ duration, extracted, validated, outcome, rule, module, ts }) => {
  const logStr = `[ResponseValidator] [${outcome}] Rule: ${rule}, Module: ${module}, Duration: ${duration}ms, Extracted: [${extracted}], Validated: [${validated}], TS: ${ts}`;
  
  if (outcome === 'CRITICAL') logger.warn(logStr);
  else logger.info(logStr);
};

// Public Entry Point
export const validateResponse = (aiResponse, counts, validationContext = {}, contextVersion = 'v1') => {
  const startTime = Date.now();
  const norm = aiResponse.toLowerCase();

  // 1. Existing Count Validation (Fallback/Backward Compatibility)
  const countChecks = [
    { key: 'goals', str: 'goals', count: counts.goals },
    { key: 'budgets', str: 'budgets', count: counts.budgets },
    { key: 'wallets', str: 'wallets', count: counts.wallets },
    { key: 'loans', str: 'loans', count: counts.loans },
    { key: 'subscriptions', str: 'subscriptions', count: counts.subscriptions }
  ];

  for (const check of countChecks) {
    // Only enforce count validations if the module was actually provided in the context block
    if (validationContext[check.key] && check.count > 0 && (norm.includes(`no ${check.str}`) || norm.includes(`0 ${check.str}`) || norm.includes(`dont have any ${check.str}`) || norm.includes(`don't have any ${check.str}`))) {
      logValidationEvent({
        duration: Date.now() - startTime,
        extracted: `0 ${check.str}`,
        validated: `> 0`,
        outcome: 'CRITICAL',
        rule: 'CountValidation',
        module: check.key,
        ts: new Date().toISOString()
      });

      return { isValid: false, reason: `AI claimed 0 ${check.str} when user has ${check.count} active ${check.str}.` };
    }
  }

  // 2. Structured Financial Validation
  if (Object.keys(validationContext).length > 0) {
    const extractedValues = extractFinancialValues(aiResponse);
    const allowedValues = flattenValidationContext(validationContext);

    for (const item of extractedValues) {
      const { val, index, matchText } = item;
      const { confidence } = checkValueTolerance(val, allowedValues);

      if (confidence === 'NONE') {
        const proximity = checkProximity(norm, index, matchText);
        
        if (proximity === 'FACTUAL') {
          // AI hallucinates a specific financial number as a fact about the user
          logValidationEvent({
            duration: Date.now() - startTime,
            extracted: val,
            validated: 'ONE_OF_AUTHORITATIVE',
            outcome: 'CRITICAL',
            rule: `FinancialToleranceMatch [${proximity}]`,
            module: 'Global',
            ts: new Date().toISOString()
          });

          return { 
            isValid: false, 
            reason: `AI hallucinated a factual financial figure (${val}) that does not match the authoritative context.` 
          };
        } else {
          // ADVISORY or BARE: Soft warning, do not fail validation
          logValidationEvent({
            duration: Date.now() - startTime,
            extracted: val,
            validated: 'ONE_OF_AUTHORITATIVE',
            outcome: 'WARNING',
            rule: `FinancialToleranceMatch [${proximity}]`,
            module: 'Global',
            ts: new Date().toISOString()
          });
        }
      } else if (confidence === 'MEDIUM') {
        logValidationEvent({
          duration: Date.now() - startTime,
          extracted: val,
          validated: 'TOLERANCE_ACCEPTED',
          outcome: 'WARNING',
          rule: 'FinancialToleranceMatch',
          module: 'Global',
          ts: new Date().toISOString()
        });
      }
    }

    logValidationEvent({
      duration: Date.now() - startTime,
      extracted: extractedValues.length ? 'Multiple values' : 'None',
      validated: 'All passed',
      outcome: 'INFORMATION',
      rule: 'ValidationComplete',
      module: 'Global',
      ts: new Date().toISOString()
    });

  } else {
    logger.info(`[ResponseValidator] [INFORMATION] Missing validation context. Accepted response without deep numeric validation.`);
  }

  return { isValid: true };
};

export const getFallbackFactualResponse = (counts) => {
  logger.info('[ResponseValidator] Generating fallback factual response.');
  return `I have verified your account records directly to ensure absolute accuracy:

* **Wallets**: You have **${counts.wallets}** active wallet(s) configured.
* **Budgets**: You have **${counts.budgets}** budget limit(s) configured.
* **Savings Goals**: You have **${counts.goals}** active savings goal(s) logged.
* **Liabilities & Loans**: You have **${counts.loans}** active loan(s)/liabilities logged.
* **Subscriptions**: You have **${counts.subscriptions}** active subscription(s) configured.
* **Transactions**: You have logged a total of **${counts.transactions}** transaction(s) (${counts.expenses} expense(s), ${counts.incomes} income(s)).

Please let me know if you would like me to perform a detailed analysis on any of these items!`;
};
