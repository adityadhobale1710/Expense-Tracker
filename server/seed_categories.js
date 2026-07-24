import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from './models/User.js';
import Category from './models/Category.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const NEW_CATEGORIES = [
  { name: 'Award', icon: '🏆', color: '#eab308', type: 'income' },
  { name: 'Tips/Bonus', icon: '💵', color: '#10b981', type: 'income' },
];

async function seedNewCategories() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const users = await User.find();
    let addedCount = 0;

    for (const user of users) {
      for (const cat of NEW_CATEGORIES) {
        const exists = await Category.findOne({ user: user._id, name: cat.name, type: cat.type });
        if (!exists) {
          await Category.create({ ...cat, user: user._id });
          addedCount++;
        }
      }
    }

    console.log(`Added ${addedCount} new categories to existing users.`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding categories:', error);
    process.exit(1);
  }
}

seedNewCategories();
