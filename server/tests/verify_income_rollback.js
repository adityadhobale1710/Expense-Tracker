import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Wallet from '../models/Wallet.js';
import Income from '../models/Income.js';
import User from '../models/User.js';

dotenv.config();

async function runTest() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/expense_tracker');
  console.log('Connected to DB');

  // Create test user and wallet
  await User.deleteOne({ email: 'test_rollback@example.com' });
  const user = await User.create({ name: 'Test User', email: 'test_rollback@example.com', password: 'password123' });
  const wallet = await Wallet.create({ name: 'Test Wallet', type: 'bank', balance: 1000, user: user._id });

  console.log('Initial wallet balance:', wallet.balance);

  // We'll simulate a failure in income creation by monkey-patching Income.create
  // to throw an error after the wallet has supposedly been updated but before transaction commits.
  const originalCreate = Income.create;
  Income.create = async function () {
    throw new Error('Simulated failure during Income creation!');
  };

  const req = {
    user: { _id: user._id },
    body: {
      walletId: wallet._id,
      amount: 500,
      title: 'Test Income',
      category: 'Salary',
      date: new Date()
    }
  };

  const res = {
    status: (code) => { console.log('Status set to:', code); return res; },
    json: (data) => console.log('Response:', data)
  };

  // We need to import the addIncome function. Since it's ES module, we'll import it dynamically.
  const { addIncome } = await import('../controllers/incomeController.js');

  console.log('Attempting to add income (which should fail and rollback)...');
  try {
    await addIncome(req, res);
  } catch (error) {
    console.log('Expected error caught:', error.message);
  }

  // Restore Income.create
  Income.create = originalCreate;

  // Check wallet balance
  const updatedWallet = await Wallet.findById(wallet._id);
  console.log('Final wallet balance:', updatedWallet.balance);

  let passed = false;
  if (updatedWallet.balance === 1000) {
    console.log('✅ TEST PASSED: Wallet balance remained unchanged. Transaction rolled back successfully.');
    passed = true;
  } else {
    console.error('❌ TEST FAILED: Wallet balance was modified despite transaction failure.');
  }

  // Cleanup
  await Wallet.findByIdAndDelete(wallet._id);
  await User.findByIdAndDelete(user._id);
  await mongoose.disconnect();
  
  process.exit(passed ? 0 : 1);
}

runTest().catch(err => {
    console.error(err);
    process.exit(1);
});
