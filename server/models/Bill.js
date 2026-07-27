import mongoose from 'mongoose';

const billSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: [true, 'Bill title is required'], trim: true },
    amount: { type: Number, required: [true, 'Bill amount is required'], min: [0, 'Amount must be positive'] },
    category: { type: String, required: [true, 'Category is required'], trim: true },
    dueDate: { type: Date, required: [true, 'Due date is required'], index: true },
    status: {
      type: String,
      enum: ['paid', 'upcoming', 'due_soon', 'overdue', 'cancelled'],
      default: 'upcoming',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    recurring: { type: Boolean, default: false },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'none'],
      default: 'none',
    },
    reminder: {
      type: String,
      enum: ['1_day_before', '2_days_before', '3_days_before', '1_week_before', 'none', 'custom'],
      default: 'none',
    },
    customReminderDays: { type: Number, default: 0 },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'upi', 'bank', 'other'],
      default: 'other',
    },
    notes: { type: String, default: '' },
    color: { type: String, default: '#3b82f6' }, // hex code (e.g., #3b82f6)
    icon: { type: String, default: '💸' }, // emoji or key representation
    paymentHistory: [
      {
        paidAt: { type: Date, default: Date.now },
        amountPaid: { type: Number, required: true },
        notes: { type: String, default: '' },
      },
    ],
  },
  { timestamps: true }
);

// Pre-save middleware to automatically classify status (e.g. if overdue or due_soon)
billSchema.pre('save', function (next) {
  if (this.status !== 'paid' && this.status !== 'cancelled') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(this.dueDate);
    due.setHours(0, 0, 0, 0);

    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      this.status = 'overdue';
    } else if (diffDays <= 3) {
      this.status = 'due_soon';
    } else {
      this.status = 'upcoming';
    }
  }
  next();
});

const Bill = mongoose.model('Bill', billSchema);
export default Bill;
