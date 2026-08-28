import mongoose from 'mongoose';

const familyMemberSchema = new mongoose.Schema({
  email: { type: String, required: true },
  role: { type: String, enum: ['owner', 'admin', 'member'], default: 'member' },
  status: { type: String, enum: ['pending', 'accepted'], default: 'pending' },
  // Secure invitation token (stored as bcrypt hash, never plaintext)
  invitationTokenHash: { type: String, default: null },
  // Token expiry — 48 hours after invite is sent
  invitationTokenExpire: { type: Date, default: null },
  // Timestamp of the most recent invite send (used for resend cooldown)
  invitedAt: { type: Date, default: null },
});

const approvalRequestSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    amount: { type: Number, required: true },
    category: { type: String, default: 'Other' },
    requesterEmail: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  },
  { timestamps: true }
);

const familySchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: [true, 'Family group name is required'], trim: true },
    members: [familyMemberSchema],
    approvals: [approvalRequestSchema],
  },
  { timestamps: true }
);

const Family = mongoose.model('Family', familySchema);
export default Family;
