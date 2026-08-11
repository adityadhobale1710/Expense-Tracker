import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import { logEngagement, syncAchievements } from '../controllers/gamificationController.js';
import { calculateLevel } from '../utils/levelUtils.js';

dotenv.config();

// In-memory mock database for the test run
let usersDb = [];

// Stub mongoose connection
mongoose.connect = async () => {
  console.log('[Mock] Stubbed mongoose.connect called');
};

// Mock User Model static methods
User.deleteMany = async (query) => {
  console.log('[Mock] User.deleteMany called with:', query);
  if (query && query.email && query.email.$in) {
    usersDb = usersDb.filter(u => !query.email.$in.includes(u.email));
  } else {
    usersDb = [];
  }
  return { deletedCount: usersDb.length };
};

User.create = async (userDoc) => {
  console.log('[Mock] User.create called for:', userDoc.name);
  const doc = {
    _id: new mongoose.Types.ObjectId(),
    achievements: [],
    simulatedActions: [],
    xpHistory: [],
    ...userDoc,
    async save() {
      const idx = usersDb.findIndex(u => u._id.toString() === this._id.toString());
      if (idx !== -1) {
        usersDb[idx] = { ...usersDb[idx], ...this };
      }
      return this;
    }
  };
  usersDb.push(doc);
  return doc;
};

User.findById = async (id) => {
  const found = usersDb.find(u => u._id.toString() === id.toString());
  if (!found) return null;
  return {
    ...found,
    async save() {
      const idx = usersDb.findIndex(u => u._id.toString() === id.toString());
      if (idx !== -1) {
        usersDb[idx] = { ...usersDb[idx], ...this };
      }
      return this;
    }
  };
};

User.findByIdAndUpdate = async (id, update, options) => {
  const user = await User.findById(id);
  if (!user) return null;
  
  if (update.$inc) {
    if (update.$inc.xp) user.xp = (user.xp || 0) + update.$inc.xp;
    if (update.$inc.lifetimeXP) user.lifetimeXP = (user.lifetimeXP || 0) + update.$inc.lifetimeXP;
    if (update.$inc.coins) user.coins = (user.coins || 0) + update.$inc.coins;
  }
  
  if (update.$set) {
    if (update.$set.xp !== undefined) user.xp = update.$set.xp;
    if (update.$set.lifetimeXP !== undefined) user.lifetimeXP = update.$set.lifetimeXP;
    if (update.$set.level !== undefined) user.level = update.$set.level;
    if (update.$set.rank !== undefined) user.rank = update.$set.rank;
    if (update.$set.achievements !== undefined) user.achievements = update.$set.achievements;
  }
  
  await user.save();
  return user;
};

import GamificationLog from '../models/GamificationLog.js';
GamificationLog.create = async (doc, opts) => {
  return doc;
};
GamificationLog.findOneAndUpdate = async (query, update, options) => {
  // If we want to simulate it didn't exist (new insertion), we return null 
  // because `{ upsert: true, new: false }` returns null on insert.
  return null;
};

const runTest = async () => {
  console.log('--- STARTING GAMIFICATION REGRESSION TESTS ---');

  try {
    await mongoose.connect('mock-uri');

    // 1. Seed two users
    await User.deleteMany({ email: { $in: ['usera@test.com', 'userb@test.com'] } });

    const userA = await User.create({
      name: 'User A',
      email: 'usera@test.com',
      password: 'password123',
      xp: 5000,
      level: 4,
      achievements: [
        { id: 'c1', unlocked: true, unlockedAt: new Date(), currentProgress: 1 },
        { id: 's2', unlocked: true, unlockedAt: new Date(), currentProgress: 1 }
      ]
    });

    const userB = await User.create({
      name: 'User B',
      email: 'userb@test.com',
      password: 'password123',
      xp: 0,
      level: 1,
      achievements: []
    });

    console.log('Seeded User A and User B');

    // 2. Validate User B initial state
    console.log('Verifying User B initial DB profile state...');
    if (userB.xp !== 0 || userB.level !== 1 || userB.achievements.length !== 0) {
      throw new Error('User B did not start with clean initial state');
    }
    console.log('✓ User B starts fresh (Level 1, 0 XP, 0 achievements)');

    // 3. Mock Req/Res for logEngagement with forged payload (should be ignored since it doesn't take xp/coins/achievementsUnlocked)
    console.log('Simulating forged reward request for User B...');
    
    const mockReq = {
      user: { _id: userB._id },
      body: {
        actionId: 'DAILY_LOGIN',
        xp: 99999, // forged
        coins: 99999, // forged
        achievementsUnlocked: ['s10'], // forged mismatch
        levelUp: { from: 1, to: 15 } // forged
      }
    };

    let responseData = null;
    let responseStatus = null;
    const mockRes = {
      status(s) {
        responseStatus = s;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      }
    };

    // Invoke the controller action (wrapped in asyncHandler)
    await logEngagement(mockReq, mockRes, (err) => {
      if (err) throw err;
    });

    // Check DB state for User B after reward
    const updatedUserB = await User.findById(userB._id);
    
    const day = new Date().getDay();
    const multiplier = (day === 0 || day === 6) ? 2.0 : 1.0;
    const expectedXP = Math.round(100 * multiplier);

    console.log(`Earned XP calculated on server: ${updatedUserB.xp}`);
    if (updatedUserB.xp !== expectedXP) {
      throw new Error(`Expected XP to be computed to ${expectedXP}, but got ${updatedUserB.xp}`);
    }

    if (updatedUserB.level !== 1) {
      throw new Error(`Expected level to be calculated from XP (remains Level 1), but got Level ${updatedUserB.level}`);
    }

    const s10Badge = updatedUserB.achievements.find(a => a.id === 's10');
    if (s10Badge && s10Badge.unlocked) {
      throw new Error('Server accepted forged achievementsUnlocked s10 badge!');
    }

    console.log('✓ Server successfully rejected forged XP, level, and badge parameters');

    // 4. Test reject business actionId
    console.log('Verifying business actionId is rejected with 400...');
    const invalidReq = {
      user: { _id: userB._id },
      body: { actionId: 'ADD_INCOME' }
    };
    let errorThrown = false;
    try {
      await logEngagement(invalidReq, mockRes, (err) => {
        if (err) errorThrown = true;
      });
    } catch (e) {
      errorThrown = true;
    }
    if (!errorThrown && responseStatus !== 400) {
      throw new Error('Expected error status for business actionId');
    }
    console.log('✓ Server rejected business actionId on logEngagement');

    // Clean up
    await User.deleteMany({ email: { $in: ['usera@test.com', 'userb@test.com'] } });
    console.log('Database clean-up finished');

    console.log('--- ALL GAMIFICATION REGRESSION TESTS PASSED SUCCESSFULLY ---');
    process.exit(0);

  } catch (error) {
    console.error('Test Failed:', error.message);
    process.exit(1);
  }
};

runTest();
