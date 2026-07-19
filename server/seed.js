import dotenv from 'dotenv';
import dns from 'dns';
import connectDB from './config/db.js';
import User from './models/User.js';
import { seedDataForUser } from './utils/seeder.js';

dotenv.config();
dns.setServers(['8.8.8.8', '1.1.1.1']);

const seed = async () => {
  try {
    await connectDB();
    
    // Check if demo user exists
    let demoUser = await User.findOne({ email: 'demo@expensetrack.com' });
    if (!demoUser) {
      demoUser = await User.create({
        name: 'Demo User',
        email: 'demo@expensetrack.com',
        password: 'password123',
        currency: 'INR'
      });
      console.log('✅ Demo user created (email: demo@expensetrack.com, password: password123)');
    }
    
    await seedDataForUser(demoUser._id);
    console.log('✅ Database successfully seeded with raw mock data!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seed();
