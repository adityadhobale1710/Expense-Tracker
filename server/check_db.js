import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const checkUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');
    const users = await User.find({});
    console.log('Users count:', users.length);
    console.log('Users found:', users.map(u => ({ id: u._id, name: u.name, email: u.email, password: u.password })));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

checkUsers();
