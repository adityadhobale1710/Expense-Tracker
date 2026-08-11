import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Session from '../models/Session.js';
import SecurityLog from '../models/SecurityLog.js';
import { login, logout } from '../controllers/authController.js';
import { revokeSession } from '../controllers/sessionController.js';

dotenv.config();

// Mock DB Storage
let usersDb = [];
let sessionsDb = [];
let logsDb = [];

// Stubs
User.findOne = async (query) => {
  return usersDb.find(u => u.email === query.email);
};
User.findById = async (id) => {
  const found = usersDb.find(u => u._id.toString() === id.toString());
  if (!found) return null;
  return {
    ...found,
    async save() { return this; }
  };
};

Session.create = async (doc) => {
  const sessionDoc = {
    _id: new mongoose.Types.ObjectId(),
    isActive: true,
    lastActive: new Date(),
    ...doc
  };
  sessionsDb.push(sessionDoc);
  return sessionDoc;
};

Session.find = async (query) => {
  return {
    sort(sortObj) {
      return sessionsDb.filter(s => s.user.toString() === query.user.toString() && s.isActive === query.isActive);
    }
  };
};

Session.findOneAndUpdate = async (query, update, options) => {
  const session = sessionsDb.find(s => {
    let match = true;
    if (query._id && s._id.toString() !== query._id.toString()) match = false;
    if (query.user && s.user.toString() !== query.user.toString()) match = false;
    if (query.token && s.token !== query.token) match = false;
    return match;
  });
  if (session) {
    if (update.isActive !== undefined) session.isActive = update.isActive;
    return session;
  }
  return null;
};

SecurityLog.create = async (doc) => {
  logsDb.push(doc);
  return doc;
};

// Response helper
const makeMockRes = () => {
  let responseStatus = 200;
  let responseData = null;
  return {
    status(s) {
      responseStatus = s;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    },
    cookie(name, val, opts) {},
    clearCookie(name, opts) {},
    getStatus() { return responseStatus; },
    getData() { return responseData; }
  };
};

const runSessionTests = async () => {
  console.log('--- STARTING REAL DEVICE SESSIONS TESTS ---');

  // Stub Date.now to increment on every call, ensuring unique JWT iat values
  const originalDateNow = Date.now;
  let mockTime = originalDateNow();
  Date.now = () => {
    mockTime += 1000;
    return mockTime;
  };

  try {
    const userA_id = new mongoose.Types.ObjectId();
    const userB_id = new mongoose.Types.ObjectId();

    const mockUserA = {
      _id: userA_id,
      name: 'User A',
      email: 'usera@test.com',
      password: 'password123',
      matchPassword: async (pwd) => pwd === 'password123',
      isEmailVerified: true,
      save() { return Promise.resolve(this); }
    };
    const mockUserB = {
      _id: userB_id,
      name: 'User B',
      email: 'userb@test.com',
      password: 'password123',
      matchPassword: async (pwd) => pwd === 'password123',
      isEmailVerified: true,
      save() { return Promise.resolve(this); }
    };

    usersDb = [mockUserA, mockUserB];
    sessionsDb = [];
    logsDb = [];

    // 1. Login User A (Device 1)
    console.log('1. Logging in User A from Chrome browser on Windows...');
    const reqLogin1 = {
      body: { email: 'usera@test.com', password: 'password123' },
      headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0' },
      ip: '192.168.1.100'
    };
    const resLogin1 = makeMockRes();

    await login(reqLogin1, resLogin1, (err) => { if (err) throw err; });
    const token1 = resLogin1.getData().data.accessToken;

    // 2. Verify Session Created for User A (Device 1)
    console.log('2. Verifying Session 1 created in DB...');
    if (sessionsDb.length !== 1) throw new Error('Expected 1 session created');
    const session1 = sessionsDb[0];
    if (session1.user.toString() !== userA_id.toString()) throw new Error('Session user mismatch');
    if (session1.os !== 'Windows' || session1.browser !== 'Chrome') {
      throw new Error(`Device parse mismatch: OS=${session1.os}, browser=${session1.browser}`);
    }
    if (session1.ipAddress !== '192.168.1.100') throw new Error('IP address mismatch');
    if (!session1.isActive) throw new Error('Session should be active');
    console.log('✓ Session 1 verified successfully');

    // 3. Login User A (Device 2 - Safari on iOS)
    console.log('3. Logging in User A from Safari browser on iOS...');
    const reqLogin2 = {
      body: { email: 'usera@test.com', password: 'password123' },
      headers: { 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1' },
      ip: '10.0.0.5'
    };
    const resLogin2 = makeMockRes();

    await login(reqLogin2, resLogin2, (err) => { if (err) throw err; });
    const token2 = resLogin2.getData().data.accessToken;

    // 4. Verify Multiple Sessions (both active)
    console.log('4. Verifying both sessions exist in DB...');
    if (sessionsDb.length !== 2) throw new Error('Expected 2 sessions created');
    const session2 = sessionsDb[1];
    if (session2.os !== 'iOS' || session2.browser !== 'Safari' || session2.deviceName !== 'iOS Mobile Device') {
      throw new Error(`Device 2 parse mismatch: OS=${session2.os}, browser=${session2.browser}, name=${session2.deviceName}`);
    }
    console.log('✓ Multiple sessions verified successfully');

    // 5. Revoke one session (Session 1)
    console.log('5. Revoking Session 1 (Chrome Windows)...');
    const reqRevoke = {
      user: { _id: userA_id },
      params: { id: session1._id },
      ip: '192.168.1.100'
    };
    const resRevoke = makeMockRes();
    await revokeSession(reqRevoke, resRevoke, (err) => { if (err) throw err; });

    // 6. Verify only Session 1 is revoked (Session 2 remains active)
    console.log('6. Checking session status after revocation...');
    if (session1.isActive) throw new Error('Session 1 should be deactivated');
    if (!session2.isActive) throw new Error('Session 2 should still be active');
    console.log('✓ Only Session 1 was revoked successfully');

    // 7. Verify another user cannot revoke User A's session
    console.log('7. Verifying User B cannot revoke User A\'s Session 2...');
    const reqMaliciousRevoke = {
      user: { _id: userB_id }, // Authenticated as User B
      params: { id: session2._id }, // Session belonging to User A
      ip: '200.200.200.200'
    };
    const resMaliciousRevoke = makeMockRes();
    let revokeErrorThrown = false;
    try {
      await revokeSession(reqMaliciousRevoke, resMaliciousRevoke, (err) => {
        if (err) revokeErrorThrown = true;
      });
    } catch {
      revokeErrorThrown = true;
    }
    if (resMaliciousRevoke.getStatus() === 200 && !revokeErrorThrown) {
      throw new Error('User B was allowed to revoke User A\'s session!');
    }
    console.log('✓ Malicious revocation request rejected successfully');

    // 8. Logout Session 2
    console.log('8. Logging out Session 2...');
    const reqLogout = {
      user: { _id: userA_id },
      headers: { authorization: `Bearer ${token2}` }
    };
    const resLogout = makeMockRes();
    await logout(reqLogout, resLogout, (err) => { if (err) throw err; });

    if (session2.isActive) throw new Error('Session 2 should be deactivated on logout');
    console.log('✓ Logout deactivated current session token');

    console.log('--- ALL DEVICE SESSION TESTS PASSED SUCCESSFULLY ---');
    process.exit(0);

  } catch (err) {
    console.error('Test Suite Failed:', err.message);
    process.exit(1);
  }
};

runSessionTests();
