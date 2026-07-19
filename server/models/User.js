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
    password: { type: String, required: [true, 'Password is required'], minlength: 6 },
    avatar: { type: String, default: '' },
    currency: { type: String, default: 'INR' },
    role: { type: String, enum: ['user', 'premium', 'admin'], default: 'user' },
    phone: { type: String, default: '' },
    company: { type: String, default: '' },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, default: '' },
    backupCodes: { type: [String], default: [] },
    otpVerified: { type: Boolean, default: false },
    isEmailVerified: { type: Boolean, default: false },
    isDisabled: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
    refreshToken: { type: String, default: null },
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpire: { type: Date, default: null },
    
    // Gamification properties
    xp: { type: Number, default: 3450 },
    coins: { type: Number, default: 640 },
    level: { type: Number, default: 5 },
    streak: { type: Number, default: 18 },
    longestStreak: { type: Number, default: 24 },
    unlockedTitles: { type: [String], default: ['Novice', 'Tracker', 'Thrifty'] },
    unlockedAvatars: { type: [String], default: [] },
    unlockedThemes: { type: [String], default: ['light', 'dark'] },
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
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Match password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
