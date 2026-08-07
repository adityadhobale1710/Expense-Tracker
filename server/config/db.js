import mongoose from 'mongoose';
import logger from '../utils/logger.js';
import AIChat from '../models/AIChat.js';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Startup guard for AIChat deduplication
    const duplicates = await AIChat.aggregate([
      { $group: { _id: '$user', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $limit: 1 }
    ]);
    
    if (duplicates.length > 0) {
      logger.error('CRITICAL: Duplicate AIChat documents found for the same user. You MUST run `node server/scripts/dedupeAIChats.mjs` before the unique index can be safely built.');
      process.exit(1);
    }
  } catch (error) {
    logger.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
