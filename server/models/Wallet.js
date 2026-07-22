import mongoose from 'mongoose';

const walletSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: [true, 'Wallet name is required'], trim: true },
    type: {
      type: String,
      enum: ['cash', 'bank', 'upi', 'credit_card', 'debit_card', 'business', 'crypto', 'gift_card'],
      required: true,
    },
    balance: { type: Number, default: 0, min: [0, 'Balance cannot be negative'] },
    color: { type: String, default: '#6366f1' },
    icon: { type: String, default: '💳' },
  },
  { timestamps: true }
);

const Wallet = mongoose.model('Wallet', walletSchema);
export default Wallet;
