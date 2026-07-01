import mongoose from 'mongoose';

const familyMemberSchema = new mongoose.Schema({
  email: { type: String, required: true },
  role: { type: String, enum: ['owner', 'admin', 'member'], default: 'member' },
  status: { type: String, enum: ['pending', 'accepted'], default: 'pending' },
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
