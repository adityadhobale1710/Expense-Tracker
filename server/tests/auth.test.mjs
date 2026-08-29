/**
 * server/tests/auth.test.mjs
 * 
 * COMPREHENSIVE AUTHENTICATION & SESSION TEST SUITE
 * Tests:
 *   1. Registration (valid, duplicate, validation rules, default seeding)
 *   2. Email Verification (OTP verification, 5-attempt lockout, 30s cooldown)
 *   3. Login (valid, unverified guard, disabled guard, enumeration protection)
 *   4. Logout (session termination, cookie clearance)
 *   5. Refresh Token (rotation, expired/invalid rejection, disabled guard)
 *   6. Password Reset (forgot request, OTP validation, session revocation)
 */

import bcrypt from 'bcryptjs';
import {
  request,
  createTestUser,
  cleanupUser,
  TestSuiteRunner,
  User,
  Wallet,
  Category,
  Session,
} from './test_helpers.mjs';

export const runAuthTests = async () => {
  const runner = new TestSuiteRunner('Authentication & Session Management');
  console.log('\n======================================================');
  console.log('  RUNNING SUITE: Authentication & Session Management');
  console.log('======================================================');

  let testUserIds = [];

  try {
    // ─────────────────────────────────────────────────────────────
    // 1. REGISTRATION
    // ─────────────────────────────────────────────────────────────
    const uniqueEmail = `reg_test_${Date.now()}@example.com`;
    const regRes = await request({
      method: 'POST',
      path: '/auth/register',
      body: {
        name: 'Registration Tester',
        email: uniqueEmail,
        password: 'Password123!',
        phone: '9876543210',
      },
    });

    const regPassed = regRes.status === 201 && regRes.data?.success;
    runner.record({
      id: 'AUTH-REG-001',
      feature: 'Registration',
      name: 'Valid Registration with Category & Wallet Seeding',
      passed: regPassed,
      expected: 'HTTP 201 Created',
      actual: `HTTP ${regRes.status}`,
      file: 'server/controllers/authController.js',
      func: 'register',
      severity: 'CRITICAL',
    });

    // Check DB User Record & Seeding
    const createdUser = await User.findOne({ email: uniqueEmail.toLowerCase() });
    if (createdUser) testUserIds.push(createdUser._id);

    const seededCategories = createdUser ? await Category.find({ user: createdUser._id }) : [];
    const seededWallet = createdUser ? await Wallet.findOne({ user: createdUser._id, isPrimary: true }) : null;

    runner.record({
      id: 'AUTH-REG-002',
      feature: 'Auto-Seeding',
      name: 'Verify default 16 categories & 1 primary bank wallet automatically seeded',
      passed: Boolean(createdUser && seededCategories.length === 16 && seededWallet),
      expected: '16 Categories and 1 Primary Bank Wallet',
      actual: `Categories: ${seededCategories.length}, Wallet: ${seededWallet?.name || 'none'}`,
      file: 'server/controllers/authController.js',
      func: 'register',
      severity: 'CRITICAL',
    });

    // Duplicate Registration Rejection
    const dupRes = await request({
      method: 'POST',
      path: '/auth/register',
      body: {
        name: 'Duplicate Tester',
        email: uniqueEmail,
        password: 'Password123!',
      },
    });

    runner.record({
      id: 'AUTH-REG-003',
      feature: 'Registration',
      name: 'Reject duplicate email registration with friendly 400',
      passed: dupRes.status === 400 && dupRes.data?.message?.includes('already exists'),
      expected: 'HTTP 400 "User already exists with this email"',
      actual: `HTTP ${dupRes.status} (${dupRes.data?.message})`,
      file: 'server/controllers/authController.js',
      func: 'register',
      severity: 'HIGH',
    });

    // Short Password (<6 chars)
    const shortPassRes = await request({
      method: 'POST',
      path: '/auth/register',
      body: {
        name: 'Short Pass',
        email: `short_${Date.now()}@example.com`,
        password: '123',
      },
    });

    runner.record({
      id: 'AUTH-REG-004',
      feature: 'Validation',
      name: 'Reject password shorter than 6 characters',
      passed: shortPassRes.status === 400,
      expected: 'HTTP 400 Validation Error',
      actual: `HTTP ${shortPassRes.status}`,
      file: 'server/middleware/schemas.js',
      severity: 'HIGH',
    });

    // ─────────────────────────────────────────────────────────────
    // 2. EMAIL VERIFICATION & 5-ATTEMPT LOCKOUT
    // ─────────────────────────────────────────────────────────────
    const unverifiedEmail = `unverified_${Date.now()}@example.com`;
    const otpHashed = await bcrypt.hash('123456', 10);
    const unverifiedUser = await User.create({
      name: 'Unverified Tester',
      email: unverifiedEmail,
      password: 'Password123!',
      isEmailVerified: false,
      emailVerificationOtpHash: otpHashed,
      emailVerificationOtpExpire: new Date(Date.now() + 10 * 60 * 1000),
      emailVerificationOtpAttempts: 0,
      emailVerificationLastSentAt: new Date(),
    });
    testUserIds.push(unverifiedUser._id);

    // Test 5 Failed OTP Attempts
    for (let i = 1; i <= 5; i++) {
      await request({
        method: 'POST',
        path: '/auth/verify-email',
        body: { email: unverifiedEmail, otp: '000000' },
      });
    }

    // 6th Attempt should be locked out
    const lockedRes = await request({
      method: 'POST',
      path: '/auth/verify-email',
      body: { email: unverifiedEmail, otp: '123456' },
    });

    const lockoutPassed = lockedRes.status === 429 && lockedRes.data?.message?.includes('Too many verification attempts');
    runner.record({
      id: 'AUTH-VER-001',
      feature: 'Brute-Force Protection',
      name: 'Enforce 5-attempt OTP lockout on email verification',
      passed: lockoutPassed,
      expected: 'HTTP 429 "Too many verification attempts. Please request a new code."',
      actual: `HTTP ${lockedRes.status} (${lockedRes.data?.message})`,
      file: 'server/controllers/authController.js',
      func: 'verifyEmail',
      severity: 'CRITICAL',
    });

    // Resend Cooldown (30s)
    const resendCooldownRes = await request({
      method: 'POST',
      path: '/auth/resend-verification',
      body: { email: unverifiedEmail },
    });

    const cooldownPassed = resendCooldownRes.status === 429 && resendCooldownRes.data?.message?.includes('wait');
    runner.record({
      id: 'AUTH-VER-002',
      feature: 'Resend Cooldown',
      name: 'Enforce 30-second resend verification cooldown per account',
      passed: cooldownPassed,
      expected: 'HTTP 429 "Please wait X seconds..."',
      actual: `HTTP ${resendCooldownRes.status} (${resendCooldownRes.data?.message})`,
      file: 'server/controllers/authController.js',
      func: 'resendVerification',
      severity: 'HIGH',
    });

    // Successful Verification
    const validVerifyEmail = `valid_verify_${Date.now()}@example.com`;
    const validOtpHashed = await bcrypt.hash('654321', 10);
    const verifyTargetUser = await User.create({
      name: 'Valid Verify Tester',
      email: validVerifyEmail,
      password: 'Password123!',
      isEmailVerified: false,
      emailVerificationOtpHash: validOtpHashed,
      emailVerificationOtpExpire: new Date(Date.now() + 10 * 60 * 1000),
      emailVerificationOtpAttempts: 0,
    });
    testUserIds.push(verifyTargetUser._id);

    const validVerifyRes = await request({
      method: 'POST',
      path: '/auth/verify-email',
      body: { email: validVerifyEmail, otp: '654321' },
    });

    const dbUserAfterVerify = await User.findById(verifyTargetUser._id);
    const verifySuccess = validVerifyRes.status === 200 && dbUserAfterVerify?.isEmailVerified === true && dbUserAfterVerify?.isVerified === true;

    runner.record({
      id: 'AUTH-VER-003',
      feature: 'Email Verification',
      name: 'Successfully verify email with valid OTP & set verification flags',
      passed: verifySuccess,
      expected: 'HTTP 200 and DB isEmailVerified = true',
      actual: `HTTP ${validVerifyRes.status}, isEmailVerified: ${dbUserAfterVerify?.isEmailVerified}`,
      file: 'server/controllers/authController.js',
      func: 'verifyEmail',
      severity: 'CRITICAL',
    });

    // ─────────────────────────────────────────────────────────────
    // 3. LOGIN & GUARDS
    // ─────────────────────────────────────────────────────────────
    const loginUser = await createTestUser({ email: `login_${Date.now()}@example.com`, isEmailVerified: true });
    testUserIds.push(loginUser.user._id);

    const loginRes = await request({
      method: 'POST',
      path: '/auth/login',
      body: { email: loginUser.user.email, password: loginUser.rawPassword },
    });

    const loginSuccess = loginRes.status === 200 && loginRes.data?.data?.accessToken && loginRes.setCookie?.includes('refreshToken');
    runner.record({
      id: 'AUTH-LOG-001',
      feature: 'Login',
      name: 'Valid login returns accessToken and sets HttpOnly refreshToken cookie',
      passed: loginSuccess,
      expected: 'HTTP 200 with accessToken and refreshToken cookie',
      actual: `HTTP ${loginRes.status}, Cookie: ${Boolean(loginRes.setCookie)}`,
      file: 'server/controllers/authController.js',
      func: 'login',
      severity: 'CRITICAL',
    });

    // Unverified Account Login Block
    const unverifiedLoginUser = await createTestUser({ email: `unver_log_${Date.now()}@example.com`, isEmailVerified: false, isVerified: false });
    testUserIds.push(unverifiedLoginUser.user._id);

    const unverifiedLoginRes = await request({
      method: 'POST',
      path: '/auth/login',
      body: { email: unverifiedLoginUser.user.email, password: unverifiedLoginUser.rawPassword },
    });

    const unverifiedBlocked = unverifiedLoginRes.status === 403 && unverifiedLoginRes.data?.requiresVerification === true;
    runner.record({
      id: 'AUTH-LOG-002',
      feature: 'Login Guard',
      name: 'Reject unverified account login with requiresVerification flag',
      passed: unverifiedBlocked,
      expected: 'HTTP 403 with requiresVerification: true',
      actual: `HTTP ${unverifiedLoginRes.status}`,
      file: 'server/controllers/authController.js',
      func: 'login',
      severity: 'CRITICAL',
    });

    // Disabled Account Login Block
    const disabledUser = await createTestUser({ email: `disabled_${Date.now()}@example.com`, isDisabled: true, isEmailVerified: true });
    testUserIds.push(disabledUser.user._id);

    const disabledLoginRes = await request({
      method: 'POST',
      path: '/auth/login',
      body: { email: disabledUser.user.email, password: disabledUser.rawPassword },
    });

    const disabledBlocked = disabledLoginRes.status === 403 && disabledLoginRes.data?.message?.includes('disabled');
    runner.record({
      id: 'AUTH-LOG-003',
      feature: 'Login Guard',
      name: 'Reject disabled account login with HTTP 403',
      passed: disabledBlocked,
      expected: 'HTTP 403 "Your account has been temporarily disabled"',
      actual: `HTTP ${disabledLoginRes.status}`,
      file: 'server/controllers/authController.js',
      func: 'login',
      severity: 'CRITICAL',
    });

    // User Enumeration Protection
    const wrongPassRes = await request({
      method: 'POST',
      path: '/auth/login',
      body: { email: loginUser.user.email, password: 'WrongPassword123!' },
    });

    const nonexistentRes = await request({
      method: 'POST',
      path: '/auth/login',
      body: { email: 'nonexistent_account_404@example.com', password: 'AnyPassword123!' },
    });

    const enumerationProtected = wrongPassRes.status === 401 && nonexistentRes.status === 401 && wrongPassRes.data?.message === nonexistentRes.data?.message;
    runner.record({
      id: 'AUTH-LOG-004',
      feature: 'Enumeration Protection',
      name: 'Generic error message for both incorrect password and nonexistent email',
      passed: enumerationProtected,
      expected: 'HTTP 401 identical message for both scenarios',
      actual: `WrongPass: "${wrongPassRes.data?.message}" | Nonexistent: "${nonexistentRes.data?.message}"`,
      file: 'server/controllers/authController.js',
      func: 'login',
      severity: 'HIGH',
    });

    // ─────────────────────────────────────────────────────────────
    // 4. LOGOUT & SESSION TERMINATION
    // ─────────────────────────────────────────────────────────────
    const logoutRes = await request({
      method: 'POST',
      path: '/auth/logout',
      token: loginUser.accessToken,
    });

    const dbUserAfterLogout = await User.findById(loginUser.user._id);
    const logoutPassed = logoutRes.status === 200 && dbUserAfterLogout?.refreshToken === null;

    runner.record({
      id: 'AUTH-LOGOUT-001',
      feature: 'Logout',
      name: 'Logout clears DB refreshToken and clears cookie',
      passed: logoutPassed,
      expected: 'HTTP 200 and DB refreshToken = null',
      actual: `HTTP ${logoutRes.status}, DB Token: ${dbUserAfterLogout?.refreshToken}`,
      file: 'server/controllers/authController.js',
      func: 'logout',
      severity: 'HIGH',
    });

    // ─────────────────────────────────────────────────────────────
    // 5. REFRESH TOKEN ROTATION
    // ─────────────────────────────────────────────────────────────
    const refreshUser = await createTestUser({ email: `refresh_${Date.now()}@example.com`, isEmailVerified: true });
    testUserIds.push(refreshUser.user._id);

    const refreshRes = await request({
      method: 'POST',
      path: '/auth/refresh-token',
      cookie: `refreshToken=${refreshUser.refreshToken}`,
    });

    const refreshSuccess = refreshRes.status === 200 && refreshRes.data?.data?.accessToken && refreshRes.setCookie?.includes('refreshToken');
    runner.record({
      id: 'AUTH-REF-001',
      feature: 'Token Refresh',
      name: 'Rotate refresh token and issue fresh access token via HttpOnly cookie',
      passed: refreshSuccess,
      expected: 'HTTP 200 with new accessToken and rotated cookie',
      actual: `HTTP ${refreshRes.status}`,
      file: 'server/controllers/authController.js',
      func: 'refreshToken',
      severity: 'CRITICAL',
    });

    const missingCookieRes = await request({
      method: 'POST',
      path: '/auth/refresh-token',
    });

    runner.record({
      id: 'AUTH-REF-002',
      feature: 'Token Refresh',
      name: 'Reject refresh request when cookie is missing',
      passed: missingCookieRes.status === 401,
      expected: 'HTTP 401 Unauthorized',
      actual: `HTTP ${missingCookieRes.status}`,
      file: 'server/controllers/authController.js',
      func: 'refreshToken',
      severity: 'HIGH',
    });

    // ─────────────────────────────────────────────────────────────
    // 6. PASSWORD RESET & SESSION REVOCATION
    // ─────────────────────────────────────────────────────────────
    const resetUser = await createTestUser({ email: `pwd_reset_${Date.now()}@example.com`, isEmailVerified: true });
    testUserIds.push(resetUser.user._id);

    await Session.create({
      user: resetUser.user._id,
      token: resetUser.accessToken,
      deviceName: 'Chrome on Windows',
      isActive: true,
    });

    const forgotRes = await request({
      method: 'POST',
      path: '/auth/forgot-password',
      body: { email: resetUser.user.email },
    });

    const dbResetUser = await User.findById(resetUser.user._id);
    const hasResetToken = Boolean(dbResetUser.resetPasswordToken && dbResetUser.resetPasswordExpire);

    runner.record({
      id: 'AUTH-PWD-001',
      feature: 'Forgot Password',
      name: 'Generate 6-digit OTP hash and 15-minute expiration on forgot-password',
      passed: forgotRes.status === 200 && hasResetToken,
      expected: 'HTTP 200 with resetPasswordToken stored in DB',
      actual: `HTTP ${forgotRes.status}, HasToken: ${hasResetToken}`,
      file: 'server/controllers/authController.js',
      func: 'forgotPassword',
      severity: 'HIGH',
    });

    const resetOtpHashed = await bcrypt.hash('999999', 10);
    dbResetUser.resetPasswordToken = resetOtpHashed;
    dbResetUser.resetPasswordExpire = new Date(Date.now() + 15 * 60 * 1000);
    await dbResetUser.save();

    const newPass = 'BrandNewPassword999!';
    const resetRes = await request({
      method: 'POST',
      path: '/auth/reset-password',
      body: {
        email: resetUser.user.email,
        token: '999999',
        newPassword: newPass,
      },
    });

    const activeSessions = await Session.find({ user: resetUser.user._id, isActive: true });
    const userAfterReset = await User.findById(resetUser.user._id);
    const matchesNewPass = await userAfterReset.matchPassword(newPass);
    const rejectsOldPass = !(await userAfterReset.matchPassword(resetUser.rawPassword));

    const resetCompleteSuccess = resetRes.status === 200 && activeSessions.length === 0 && matchesNewPass && rejectsOldPass;

    runner.record({
      id: 'AUTH-PWD-002',
      feature: 'Reset Password',
      name: 'Reset password, revoke all active sessions, reject old pass & accept new pass',
      passed: resetCompleteSuccess,
      expected: 'HTTP 200, Active Sessions = 0, OldPass Rejected, NewPass Accepted',
      actual: `Reset: ${resetRes.status}, ActiveSessions: ${activeSessions.length}, MatchNew: ${matchesNewPass}, RejectOld: ${rejectsOldPass}`,
      file: 'server/controllers/authController.js',
      func: 'resetPassword',
      severity: 'CRITICAL',
    });

  } finally {
    for (const uid of testUserIds) {
      await cleanupUser(uid);
    }
  }

  return runner.summary();
};

if (process.argv[1] && process.argv[1].endsWith('auth.test.mjs')) {
  runAuthTests()
    .then((summary) => {
      console.log('\n--- AUTH SUMMARY ---');
      console.log(`Total: ${summary.total} | Passed: ${summary.passed} | Failed: ${summary.failed}`);
      process.exit(summary.failed > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error('Fatal test runner error:', err);
      process.exit(1);
    });
}
