import mongoose from 'mongoose';
import User from './models/User.js';
import { generateAccessToken } from './utils/generateToken.js';
import connectDB from './config/db.js';
import http from 'http';

async function test() {
  await connectDB();
  const user = await User.findOne();
  const token = generateAccessToken(user._id);
  
  const req = http.request('http://localhost:5000/api/users/me/stats', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('Stats Status:', res.statusCode, 'Body:', data);
      process.exit(0);
    });
  });
  req.end();
}
test();
