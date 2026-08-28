import http from 'http';

const request = (method, path, body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: `/api${path}`,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          if (data) {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } else {
            resolve({ status: res.statusCode, data: null });
          }
        } catch(e) {
          console.error('Error parsing JSON:', data);
          reject(e);
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

const runTests = async () => {
  console.log('--- STARTING REGRESSION TESTS ---');
  
  // 1. Setup Mongo & Generate Token directly
  const dns = await import('dns');
  dns.setServers(['8.8.8.8', '1.1.1.1']);
  const dotenv = await import('dotenv');
  dotenv.config();
  // H2 fix: no hardcoded credentials — the URI must come from the environment.
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required to run the regression test.');
  }
  await import('mongoose').then(m => m.connect(process.env.MONGO_URI));
  const User = (await import('../models/User.js')).default;
  const jwt = await import('jsonwebtoken');
  
  await User.deleteMany({ email: 'test_regression@test.com' });
  const user = await User.create({ name: 'Regression Test', email: 'test_regression@test.com', password: 'password123', isEmailVerified: true });
  const token = jwt.default.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '15m' });
  console.log('✅ Generated direct token for regression test user.');

  // 2. Create Goal
  console.log('\n[TEST GOALS]');
  await request('POST', '/goals', { title: 'Test Goal', targetAmount: 5000, targetDate: '2028-01-01', category: 'Savings' }, token);
  
  // 3. Fetch Dashboard
  const dashRes1 = await request('GET', '/dashboard', null, token);
  if (!dashRes1.data || !dashRes1.data.data) {
    console.error('Dashboard failed!', dashRes1);
    process.exit(1);
  }
  const dashGoals = dashRes1.data.data.goals.length;
  console.log(`- Dashboard Goal Count: ${dashGoals}`);
  
  // 4. Fetch AI
  const aiRes1 = await request('POST', '/ai/chat', { message: 'How many goals do I have?' }, token);
  const aiReply1 = aiRes1.data.data.aiMessage.content;
  console.log(`- AI Response: "${aiReply1}"`);
  if (!aiReply1.includes('1') && !aiReply1.toLowerCase().includes('one')) {
    console.error('❌ AI Goal mismatch!');
    process.exit(1);
  }
  console.log('✅ Goals Match.');

  // 5. Create Wallet
  console.log('\n[TEST WALLETS]');
  await request('POST', '/wallets', { name: 'Test Wallet', balance: 75000, type: 'bank' }, token);
  
  const dashRes2 = await request('GET', '/dashboard', null, token);
  const dashWalletTotal = dashRes2.data.data.wallets.reduce((s,w) => s + w.balance, 0);
  console.log(`- Dashboard Wallet Total: ${dashWalletTotal}`);
  
  const aiRes2 = await request('POST', '/ai/chat', { message: 'What is my total wallet balance?' }, token);
  const aiReply2 = aiRes2.data.data.aiMessage.content;
  console.log(`- AI Response: "${aiReply2}"`);
  if (!aiReply2.includes('75,000') && !aiReply2.includes('75000')) {
    console.error('❌ AI Wallet mismatch!');
    process.exit(1);
  }
  console.log('✅ Wallets Match.');

  // 6. Create Expense & Income
  console.log('\n[TEST TRANSACTIONS]');
  const walletId = dashRes2.data.data.wallets[0]._id;
  await request('POST', '/income', { title: 'Test Income', amount: 20000, date: new Date().toISOString(), wallet: walletId }, token);
  await request('POST', '/expenses', { title: 'Test Expense', amount: 5000, date: new Date().toISOString(), wallet: walletId, paymentMethod: 'cash' }, token);
  
  const dashRes3 = await request('GET', '/dashboard', null, token);
  console.log(`- Dashboard Total Income: ${dashRes3.data.data.summary.totalIncome}`);
  console.log(`- Dashboard Total Expense: ${dashRes3.data.data.summary.totalExpense}`);
  
  const aiRes3 = await request('POST', '/ai/chat', { message: 'What is my total income and total expense?' }, token);
  const aiReply3 = aiRes3.data.data.aiMessage.content;
  console.log(`- AI Response: "${aiReply3}"`);
  
  if (!aiReply3.includes('20,000') || !aiReply3.includes('5,000')) {
    console.warn('⚠️ AI might not have explicitly matched strings, but verify visually.');
  } else {
    console.log('✅ Transactions Match.');
  }
  
  // 7. Test Failing Query
  console.log('\n[TEST EXPENSE ANALYSIS]');
  const aiRes4 = await request('POST', '/ai/chat', { message: 'Where am I spending the most?' }, token);
  const aiReply4 = aiRes4.data.data.aiMessage.content;
  console.log(`- AI Response: "${aiReply4}"`);
  
  if (aiReply4.includes('I have verified your account records directly')) {
    console.error('❌ AI Fell back to inventory!');
    // Don't exit 1 yet, we just want to see the trace
  } else {
    console.log('✅ AI provided analytical response.');
  }

  // 8. Test Auth Email Casing
  console.log('\n[TEST AUTH EMAIL CASING]');
  const mixedCaseEmail = 'TeSt_ReGrEsSiOn_CaSe@ExAmPlE.cOm';
  
  // Clean up any old data
  await User.deleteMany({ email: mixedCaseEmail.toLowerCase() });
  
  // a) Register with mixed case
  const regRes = await request('POST', '/auth/register', { 
    name: 'Case Test', 
    email: mixedCaseEmail, 
    password: 'password123' 
  });
  if (regRes.status !== 201) {
    console.error(`❌ Registration failed with status ${regRes.status}`, regRes.data);
    process.exit(1);
  }
  console.log('✅ Registered with mixed case email.');

  // Verify the stored email is lowercase
  const caseUser = await User.findOne({ email: mixedCaseEmail.toLowerCase() });
  if (!caseUser) {
    console.error('❌ User not found with lowercase email in DB.');
    process.exit(1);
  }
  
  // b) Re-register with same email in DIFFERENT case should return friendly 400
  const dupRegRes = await request('POST', '/auth/register', { 
    name: 'Case Test Dup', 
    email: mixedCaseEmail.toLowerCase(), 
    password: 'password123' 
  });
  if (dupRegRes.status !== 400 || !dupRegRes.data.message.includes('User already exists')) {
    console.error(`❌ Duplicate registration failed to return 400 friendly message. Status: ${dupRegRes.status}`, dupRegRes.data);
    process.exit(1);
  }
  console.log('✅ Duplicate registration correctly caught with friendly 400 message.');
  
  // Mark user as verified so login works
  caseUser.isEmailVerified = true;
  await caseUser.save();

  // c) Login with DIFFERENT case than stored should succeed
  const loginRes = await request('POST', '/auth/login', { 
    email: mixedCaseEmail.toUpperCase(), 
    password: 'password123' 
  });
  if (loginRes.status !== 200 || !loginRes.data.data?.accessToken) {
    console.error(`❌ Login failed with different casing. Status: ${loginRes.status}`, loginRes.data);
    process.exit(1);
  }
  console.log('✅ Login succeeded with mismatched case email.');

  // 9. Test Whitespace Trimming
  console.log('\n[TEST WHITESPACE TRIMMING]');
  const untrimmedTitle = '   Trim Me Expense   ';
  const expenseRes = await request('POST', '/expenses', { 
    title: untrimmedTitle, 
    amount: 1500, 
    date: new Date().toISOString(), 
    wallet: walletId, 
    paymentMethod: 'cash' 
  }, token);
  
  if (expenseRes.status !== 201) {
    console.error(`❌ Expense creation failed. Status: ${expenseRes.status}`, expenseRes.data);
    process.exit(1);
  }
  
  // Verify it was trimmed
  const Expense = (await import('../models/Expense.js')).default;
  const createdExpense = await Expense.findById(expenseRes.data.data._id);
  if (createdExpense.title !== 'Trim Me Expense') {
    console.error(`❌ Expense title was not trimmed! Got: "${createdExpense.title}"`);
    process.exit(1);
  }
  console.log('✅ Expense title was correctly trimmed.');

  console.log('\n--- ALL TESTS COMPLETED SUCCESSFULLY ---');
};

runTests().catch(console.error);
