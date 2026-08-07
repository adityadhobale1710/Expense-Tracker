import { validateResponse } from './ResponseValidator.js';

const counts = { wallets: 1, budgets: 1, expenses: 10, incomes: 2, goals: 0, loans: 0, subscriptions: 0, transactions: 12 };

const validationContext = {
  expenses: {
    total: 50000,
    byCategory: [{ category: 'Food', total: 20000, percent: 40 }],
    recent: [{ title: 'Lunch', category: 'Food', amount: 500 }]
  }
};

const aiResponse = "Based on your expenses of ₹50,000, I recommend you set a food budget of ₹15,000 per month to save money.";

console.log('Testing ResponseValidator with proposed budget...');
const result = validateResponse(aiResponse, counts, validationContext, 'v2');
console.log('Result:', result);
