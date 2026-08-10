import { validateResponse } from '../../services/ai/ResponseValidator.js';

const counts = { wallets: 1, budgets: 1, expenses: 10, incomes: 2, goals: 0, loans: 0, subscriptions: 0, transactions: 12 };

const validationContext = {
  expenses: {
    total: 50000,
    byCategory: [{ category: 'Food', total: 20000, percent: 40 }],
    recent: [{ title: 'Lunch', category: 'Food', amount: 500 }]
  },
  wallets: {
    totalBalance: 15000
  }
};

const aiResponseAdvisory = "Based on your expenses of ₹50,000, I recommend you set a food budget of ₹15,000 per month to save money.";

console.log('Testing ResponseValidator with advisory budget suggestion...');
const resultAdvisory = validateResponse(aiResponseAdvisory, counts, validationContext, 'v2');
console.log('Result Advisory:', resultAdvisory);

const aiResponseFactual = "You currently have a balance of ₹30,000 in your wallet.";
console.log('\nTesting ResponseValidator with factual hallucination...');
const resultFactual = validateResponse(aiResponseFactual, counts, validationContext, 'v2');
console.log('Result Factual:', resultFactual);
