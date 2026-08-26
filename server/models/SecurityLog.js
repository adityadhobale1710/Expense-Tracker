import mongoose from 'mongoose';

const securityLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, required: true }, // e.g. 'Login Success', 'OTP Verification', 'Session Revoke', 'Backup Code Reset'
    ipAddress: { type: String, default: '127.0.0.1' },
    details: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Phase 3 indexes — support fast security event queries
// user index already exists (inline on field definition above)
securityLogSchema.index({ action: 1, timestamp: -1 });  // filter by action + sort by time
securityLogSchema.index({ user: 1, timestamp: -1 });    // user activity timeline
securityLogSchema.index({ timestamp: -1 });             // chronological timeline queries

const SecurityLog = mongoose.model('SecurityLog', securityLogSchema);
export default SecurityLog;
