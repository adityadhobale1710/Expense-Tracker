import mongoose from 'mongoose';

const incomeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: [true, 'Title is required'], trim: true },
    amount: { type: Number, required: [true, 'Amount is required'], min: [0, 'Amount must be positive'] },
    category: { type: String, default: 'Other' },
    source: { type: String, default: '' },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'upi', 'bank', 'other'],
      default: 'other',
    },
    date: { type: Date, default: Date.now, index: true },
    description: { type: String, default: '' },
    wallet: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet', default: null },
    // MASTER-045: Flag to exclude wallet-to-wallet transfers from income/expense aggregations
    isTransfer: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Income = mongoose.model('Income', incomeSchema);
export default Income;
