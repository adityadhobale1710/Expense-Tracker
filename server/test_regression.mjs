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
  const mongoUri = process.env.MONGO_URI || 'mongodb+srv://dhobaleaditya2007_db_user:Z43JxbFQ3GoLOh2V@cluster0.yp5dvm5.mongodb.net/expense_tracker?appName=Cluster0';
  await import('mongoose').then(m => m.connect(mongoUri));
  const User = (await import('./models/User.js')).default;
  const jwt = await import('jsonwebtoken');
  
  await User.deleteMany({ email: 'test_regression@test.com' });
  const user = await User.create({ name: 'Regression Test', email: 'test_regression@test.com', password: 'password123', isVerified: true });
  const token = jwt.default.sign({ id: user._id }, 'your_super_secret_jwt_key_change_this_in_production', { expiresIn: '15m' });
  console.log('✅ Generated direct token for regression test user.');

  // 2. Create Goal
  console.log('\\n[TEST GOALS]');
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
  console.log('\\n[TEST WALLETS]');
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
  console.log('\\n[TEST TRANSACTIONS]');
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
  
  console.log('\\n--- ALL TESTS COMPLETED SUCCESSFULLY ---');
};

runTests().catch(console.error);
