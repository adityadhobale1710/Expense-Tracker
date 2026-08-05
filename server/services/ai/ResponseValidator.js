/**
 * ResponseValidator.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates AI Assistant responses against backend facts before returning.
 * Rejects and corrects the output if hallucinations are detected.
 */

import logger from '../../utils/logger.js';

export const validateResponse = (aiResponse, counts) => {
  const norm = aiResponse.toLowerCase();

  // 1. Goal count validation
  if (counts.goals > 0) {
    if (
      norm.includes('no goals') ||
      norm.includes('0 goals') ||
      norm.includes('dont have any goals') ||
      norm.includes("don't have any goals") ||
      norm.includes('have no active goals')
    ) {
      return { isValid: false, reason: `AI claimed 0 goals when user has ${counts.goals} active goals.` };
    }
  }

  // 2. Budget count validation
  if (counts.budgets > 0) {
    if (
      norm.includes('no budgets') ||
      norm.includes('0 budgets') ||
      norm.includes('dont have any budgets') ||
      norm.includes("don't have any budgets")
    ) {
      return { isValid: false, reason: `AI claimed 0 budgets when user has ${counts.budgets} active budgets.` };
    }
  }

  // 3. Wallet count validation
  if (counts.wallets > 0) {
    if (
      norm.includes('no wallets') ||
      norm.includes('0 wallets') ||
      norm.includes('dont have any wallets') ||
      norm.includes("don't have any wallets")
    ) {
      return { isValid: false, reason: `AI claimed 0 wallets when user has ${counts.wallets} active wallets.` };
    }
  }

  // 4. Loan count validation
  if (counts.loans > 0) {
    if (
      norm.includes('no loans') ||
      norm.includes('0 loans') ||
      norm.includes('dont have any loans') ||
      norm.includes("don't have any loans")
    ) {
      return { isValid: false, reason: `AI claimed 0 loans when user has ${counts.loans} active loans.` };
    }
  }

  // 5. Subscription count validation
  if (counts.subscriptions > 0) {
    if (
      norm.includes('no subscriptions') ||
      norm.includes('0 subscriptions') ||
      norm.includes('dont have any subscriptions') ||
      norm.includes("don't have any subscriptions")
    ) {
      return { isValid: false, reason: `AI claimed 0 subscriptions when user has ${counts.subscriptions} active subscriptions.` };
    }
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
