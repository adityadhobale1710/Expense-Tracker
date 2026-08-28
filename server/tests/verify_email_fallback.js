/**
 * Verification Script: Email Fallback Rollback in Production
 *
 * Mocks process.env.NODE_ENV = 'production' so sendEmail falls back and returns
 * { success: false, mocked: false, deliveryFailed: true }.
 * We then manually invoke the controllers and verify they return 502 and rollback state.
 *
 * Run: node tests/verify_email_fallback.js
 */

import crypto from 'crypto';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

let passed = 0;
let failed = 0;

const assert = (condition, label) => {
  if (condition) {
    console.log(`  ✅ PASS: ${label}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${label}`);
    failed++;
  }
};

const runTest = async () => {
  console.log('========================================================');
  console.log('VERIFYING EMAIL FALLBACK ROLLBACK LOGIC (PRODUCTION)');
  console.log('========================================================\n');

  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is required to run the regression test.');
    process.exit(1);
  }

  const dns = await import('dns');
  dns.setServers(['8.8.8.8', '1.1.1.1']);

  // Connect to the database
  await mongoose.connect(process.env.MONGO_URI);
  
  // Dynamically import models and controllers
  const User = (await import('../models/User.js')).default;
  const Family = (await import('../models/Family.js')).default;
  const authController = await import('../controllers/authController.js');
  const familyController = await import('../controllers/familyController.js');
  
  // ── 1. Setup Test Data ────────────────────────────────────────────────────────
  const testEmail = 'fallback_test@example.com';
  const registerEmail = 'register_fallback@example.com';
  await User.deleteMany({ email: { $in: [testEmail, registerEmail] } });
  await Family.deleteMany({ name: 'Fallback Family' });
  
  const testUser = await User.create({
    name: 'Fallback Tester',
    email: testEmail,
    password: 'password123',
    isEmailVerified: true
  });
  
  // Mock req and res for express-async-handler controllers
  const createRes = () => {
    const res = {
      statusCode: 200,
      body: null,
      status: function(code) { this.statusCode = code; return this; },
      json: function(data) { this.body = data; return this; }
    };
    return res;
  };
  
  // Override NODE_ENV and GMAIL_CLIENT_ID to ensure production fallback behavior
  const originalNodeEnv = process.env.NODE_ENV;
  const originalGmail = process.env.GMAIL_CLIENT_ID;
  
  process.env.NODE_ENV = 'production';
  delete process.env.GMAIL_CLIENT_ID; // Force Gmail to be "unconfigured"
  
  try {
    // ── 1.5 Test register ───────────────────────────────────────────────────────
    console.log('\n[TEST register]');
    const req0 = { body: { name: 'Reg Tester', email: registerEmail, password: 'password123' } };
    const res0 = createRes();
    
    let caughtError = null;
    try {
      await authController.register(req0, res0, (err) => { if(err) throw err; });
    } catch (e) {
      caughtError = e;
    }
    
    assert(caughtError && res0.statusCode === 502, 'register returns 502 status');
    assert(caughtError?.message.includes('Failed to send'), 'register throws correct error');
    
    const verifyUser0 = await User.findOne({ email: registerEmail });
    assert(verifyUser0, 'User was created');
    assert(verifyUser0.emailVerificationOtpHash === null, 'emailVerificationOtpHash rolled back');
    assert(verifyUser0.emailVerificationOtpExpire === null, 'emailVerificationOtpExpire rolled back');

    // ── 2. Test forgotPassword ─────────────────────────────────────────────────
    console.log('\n[TEST forgotPassword]');
    const req1 = { body: { email: testEmail } };
    const res1 = createRes();
    
    caughtError = null;
    try {
      await authController.forgotPassword(req1, res1, (err) => { if(err) throw err; });
    } catch (e) {
      caughtError = e;
    }
    
    assert(caughtError && res1.statusCode === 502, 'forgotPassword returns 502 status');
    assert(caughtError?.message.includes('Failed to send'), 'forgotPassword throws correct error');
    
    const verifyUser1 = await User.findById(testUser._id);
    assert(verifyUser1.resetPasswordToken === null, 'resetPasswordToken rolled back');
    assert(verifyUser1.resetPasswordExpire === null, 'resetPasswordExpire rolled back');

    // ── 3. Test resendVerification ─────────────────────────────────────────────
    console.log('\n[TEST resendVerification]');
    // Create an unverified user
    const unverifiedEmail = 'unverified_fallback@example.com';
    await User.deleteMany({ email: unverifiedEmail });
    const unverifiedUser = await User.create({
      name: 'Unverified Tester',
      email: unverifiedEmail,
      password: 'password123',
      isEmailVerified: false,
      emailVerificationLastSentAt: new Date(Date.now() - 1000000) // avoid cooldown
    });
    
    const req2 = { body: { email: unverifiedEmail } };
    const res2 = createRes();
    
    caughtError = null;
    try {
      await authController.resendVerification(req2, res2, (err) => { if(err) throw err; });
    } catch (e) {
      caughtError = e;
    }
    
    assert(caughtError && res2.statusCode === 502, 'resendVerification returns 502 status');
    assert(caughtError?.message.includes('Failed to send'), 'resendVerification throws correct error');
    
    const verifyUser2 = await User.findById(unverifiedUser._id);
    assert(verifyUser2.emailVerificationOtpHash === null, 'emailVerificationOtpHash rolled back');
    assert(verifyUser2.emailVerificationLastSentAt === null, 'emailVerificationLastSentAt rolled back');

    // ── 4. Test inviteMember ───────────────────────────────────────────────────
    console.log('\n[TEST inviteMember]');
    const req3 = {
      user: testUser, // The inviter
      body: { email: 'invitee_fallback@example.com', role: 'member' }
    };
    const res3 = createRes();
    
    caughtError = null;
    try {
      await familyController.inviteMember(req3, res3, (err) => { if(err) throw err; });
    } catch (e) {
      caughtError = e;
    }
    
    assert(caughtError && res3.statusCode === 502, 'inviteMember returns 502 status');
    assert(caughtError?.message.includes('Failed to send'), 'inviteMember throws correct error');
    
    const verifyFamily = await Family.findOne({ owner: testUser._id });
    assert(verifyFamily, 'Family was created');
    const memberExists = verifyFamily.members.some(m => m.email === 'invitee_fallback@example.com');
    assert(!memberExists, 'Pending member record was rolled back');

  } finally {
    // Restore env vars
    process.env.NODE_ENV = originalNodeEnv;
    if (originalGmail) process.env.GMAIL_CLIENT_ID = originalGmail;
    
    // Cleanup
    await User.deleteMany({ email: { $in: [testEmail, 'unverified_fallback@example.com'] } });
    await Family.deleteMany({ owner: testUser._id });
    
    mongoose.connection.close();
  }

  console.log('\n========================================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('========================================================\n');
  if (failed > 0) process.exit(1);
};

runTest().catch(console.error);
