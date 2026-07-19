import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './models/User.js';

dotenv.config();

const testPasswordHashing = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    // Let's delete a test user if exists
    await User.deleteOne({ email: 'test_hash@expensetrack.com' });
    
    // 1. Create user (should hash once)
    const user = await User.create({
      name: 'Test Hash',
      email: 'test_hash@expensetrack.com',
      password: 'mypassword123',
    });
    
    const hashAfterCreate = user.password;
    console.log('Hash after create:', hashAfterCreate);
    
    // 2. Modify another field and save
    user.refreshToken = 'some-token';
    await user.save();
    
    const hashAfterSave = user.password;
    console.log('Hash after save:', hashAfterSave);
    
    const match = await bcrypt.compare('mypassword123', hashAfterSave);
    console.log('Does password match "mypassword123"?', match);
    
    // Clean up
    await User.deleteOne({ email: 'test_hash@expensetrack.com' });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

testPasswordHashing();
