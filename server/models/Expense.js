import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    title: { type: String, required: [true, 'Title is required'], trim: true },
    amount: { type: Number, required: [true, 'Amount is required'], min: [0, 'Amount must be positive'] },
    date: { type: Date, default: Date.now, index: true },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'upi', 'bank', 'other'],
      default: 'other',
    },
    receipt: { type: String, default: '' },
    tags: [{ type: String }],
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

const Expense = mongoose.model('Expense', expenseSchema);
export default Expense;
