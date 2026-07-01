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

const SecurityLog = mongoose.model('SecurityLog', securityLogSchema);
export default SecurityLog;
