import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { 
      type: String, 
      required: function() {
        return !this.googleId;
      }, 
      minlength: [6, 'Password must be at least 6 characters'] 
    },
    googleId: { type: String, default: null, sparse: true, index: true },
    // 'local'  — created with email/password, no Google link
    // 'google' — created via Google OAuth, has no local password
    // 'both'   — originally local, subsequently linked to Google
    authProvider: { type: String, enum: ['local', 'google', 'both'], default: 'local' },
    avatar: { type: String, default: '' },
    currency: { type: String, default: 'INR' },
    role: { type: String, enum: ['user', 'premium', 'admin'], default: 'user' },
    phone: { type: String, default: '' },
    company: { type: String, default: '' },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, default: '' },
    backupCodes: { type: [String], default: [] },
    alertSettings: {
      bills: { type: Boolean, default: true },
      budgets: { type: Boolean, default: true },
      weekly: { type: Boolean, default: false }
    },
    otpVerified: { type: Boolean, default: false },
    isEmailVerified: { type: Boolean, default: false },
    // M17 fix: `isVerified` is the legacy pre-migration verification flag. Legacy
    // accounts that verified before `isEmailVerified` existed are flagged here; a
    // login/verify that only checks `isEmailVerified` permanently locks them out.
    isVerified: { type: Boolean, default: false },
    isDisabled: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
    refreshToken: { type: String, default: null },
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpire: { type: Date, default: null },
    emailVerificationOtpHash: { type: String, default: null },
    emailVerificationOtpExpire: { type: Date, default: null },
    emailVerificationOtpAttempts: { type: Number, default: 0 },
    emailVerificationLastSentAt: { type: Date, default: null },
    
    // Gamification properties
    xp: { type: Number, default: 0 },
    coins: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    streak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastActivityDate: { type: Date, default: null },
    // lifetimeXP never resets between seasons — used for rank tier calculation
    lifetimeXP: { type: Number, default: 0 },
    rank: { type: String, default: 'Bronze' },
    unlockedTitles: { type: [String], default: [] },
    unlockedAvatars: { type: [String], default: [] },
    unlockedThemes: { type: [String], default: ['light', 'dark'] },
    simulatedActions: { type: [String], default: [] },
    // Pinned badges displayed in Achievement Showcase (max 3 IDs)
    pinnedBadges: { type: [String], default: [] },
    // Season tracking — XP resets each season, badges/titles preserved
    season: {
      number:         { type: Number, default: 1 },
      name:           { type: String, default: 'Season 1: Foundation' },
      startDate:      { type: Date, default: Date.now },
      endDate:        { type: Date },
      seasonalXP:     { type: Number, default: 0 },
    },
    // Reward chests opened per level milestone
    rewardChests: [{
      level:    { type: Number },
      openedAt: { type: Date, default: Date.now },
      rewards:  { type: mongoose.Schema.Types.Mixed },
    }],
    // XP event history for timeline feed (capped at 200 entries)
    xpHistory: [{
      action:      { type: String },
      xp:          { type: Number, default: 0 },
      coins:       { type: Number, default: 0 },
      description: { type: String },
      timestamp:   { type: Date, default: Date.now },
    }],
    achievements: [{
      id: { type: String },
      currentProgress: { type: Number, default: 0 },
      unlocked: { type: Boolean, default: false },
      unlockedAt: { type: Date }
    }]
  },
  { timestamps: true }
);

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Match password
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
