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

const runTraceTest = async () => {
  // 1. Setup Mongo & Generate Token directly
  const dns = await import('dns');
  dns.setServers(['8.8.8.8', '1.1.1.1']);
  const dotenv = await import('dotenv');
  dotenv.config();
  const mongoUri = process.env.MONGO_URI || 'mongodb+srv://dhobaleaditya2007_db_user:Z43JxbFQ3GoLOh2V@cluster0.yp5dvm5.mongodb.net/expense_tracker?appName=Cluster0';
  await import('mongoose').then(m => m.connect(mongoUri));
  const User = (await import('./models/User.js')).default;
  const jwt = await import('jsonwebtoken');
  
  await User.deleteMany({ email: 'test_trace@test.com' });
  const user = await User.create({ name: 'Trace Test', email: 'test_trace@test.com', password: 'password123', isVerified: true });
  const token = jwt.default.sign({ id: user._id }, 'your_super_secret_jwt_key_change_this_in_production', { expiresIn: '15m' });
  
  console.log('Creating dummy data...');
  const walletRes = await request('POST', '/wallets', { name: 'Main', balance: 50000, type: 'bank' }, token);
  const walletId = walletRes.data.data._id;
  const expRes1 = await request('POST', '/expenses', { title: 'Food', amount: 5000, date: new Date().toISOString(), wallet: walletId, category: 'Food', paymentMethod: 'cash' }, token);
  console.log('Exp 1:', expRes1.data);
  const expRes2 = await request('POST', '/expenses', { title: 'Transport', amount: 2000, date: new Date().toISOString(), wallet: walletId, category: 'Transport', paymentMethod: 'cash' }, token);
  console.log('Exp 2:', expRes2.data);
  await request('POST', '/budgets', { category: 'Food', limit: 8000, name: 'Food Budget' }, token);
  await request('POST', '/goals', { title: 'Car', targetAmount: 100000, targetDate: '2028-01-01', category: 'Savings' }, token);
  
  // Clear the trace.log file
  const fs = await import('fs');
  fs.writeFileSync('trace.log', '');
  
  // Make the failing request
  console.log('Sending "Where am I spending the most?"');
  const aiRes1 = await request('POST', '/ai/chat', { message: 'Where am I spending the most?' }, token);
  console.log(`- AI Response: "${aiRes1.data.data?.aiMessage?.content || JSON.stringify(aiRes1.data)}"`);
  
  // Check the trace log
  console.log('\n--- TRACE LOG ---');
  console.log(fs.readFileSync('trace.log', 'utf8'));
  
  process.exit(0);
};

runTraceTest().catch(console.error);
