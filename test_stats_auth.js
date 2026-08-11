import http from 'http';
import mongoose from 'mongoose';
import User from './server/models/User.js';
import { generateAccessToken } from './server/utils/generateToken.js';
import connectDB from './server/config/db.js';

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
      
      const req2 = http.request('http://localhost:5000/api/users/me', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      }, (res2) => {
        let data2 = '';
        res2.on('data', chunk => data2 += chunk);
        res2.on('end', () => {
          console.log('Me Status:', res2.statusCode, 'Body:', data2);
          process.exit(0);
        });
      });
      req2.end();
    });
  });
  req.on('error', console.error);
  req.end();
}
test();
