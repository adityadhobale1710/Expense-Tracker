import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import AIChat from '../models/AIChat.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const dedupe = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find all users with more than 1 AIChat document
    const duplicates = await AIChat.aggregate([
      { $group: { _id: '$user', count: { $sum: 1 }, docs: { $push: '$$ROOT' } } },
      { $match: { count: { $gt: 1 } } }
    ]);

    console.log(`Found ${duplicates.length} users with duplicate AIChat documents.`);

    for (const group of duplicates) {
      const userId = group._id;
      const docs = group.docs;
      console.log(`\nProcessing user: ${userId}`);
      console.log(`Found ${docs.length} documents.`);

      // 1. Merge messages
      let allMessages = [];
      docs.forEach(doc => {
        if (doc.messages) {
          allMessages.push(...doc.messages);
        }
      });
      
      // Sort chronologically and cap at 50
      allMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      allMessages = allMessages.slice(-50);

      // 2. Keep the highest dailyUsage.count for today
      const today = new Date().toISOString().split('T')[0];
      let maxUsageCount = 0;
      let maxUsageDate = today;

      docs.forEach(doc => {
        if (doc.dailyUsage && doc.dailyUsage.date === today) {
          if (doc.dailyUsage.count > maxUsageCount) {
            maxUsageCount = doc.dailyUsage.count;
          }
        }
      });

      // Keep the first document, delete the rest
      const primaryDoc = docs[0];
      const docsToDelete = docs.slice(1).map(d => d._id);

      await AIChat.findByIdAndUpdate(primaryDoc._id, {
        $set: {
          messages: allMessages,
          'dailyUsage.date': maxUsageDate,
          'dailyUsage.count': maxUsageCount
        }
      });

      await AIChat.deleteMany({ _id: { $in: docsToDelete } });

      console.log(`Merged ${allMessages.length} messages. Kept doc: ${primaryDoc._id}. Deleted ${docsToDelete.length} extra docs.`);
    }

    console.log('\nDeduplication complete.');
    process.exit(0);
  } catch (error) {
    console.error('Error during deduplication:', error);
    process.exit(1);
  }
};

dedupe();
