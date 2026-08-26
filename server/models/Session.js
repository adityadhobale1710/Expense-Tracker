import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    deviceName: { type: String, default: 'Unknown Device' },
    browser: { type: String, default: 'Unknown Browser' },
    os: { type: String, default: 'Unknown OS' },
    ipAddress: { type: String, default: '127.0.0.1' },
    isActive: { type: Boolean, default: true },
    lastActive: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Phase 3 indexes — support fast per-user session queries and admin security views
// user index already exists (inline on field definition above)
sessionSchema.index({ isActive: 1 });                  // filter active sessions
sessionSchema.index({ user: 1, lastActive: -1 });      // Last Seen lookup per user
sessionSchema.index({ lastActive: -1 });               // global analytics by time

const Session = mongoose.model('Session', sessionSchema);
export default Session;
