import mongoose from 'mongoose';

const budgetSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    limit: { type: Number, required: [true, 'Budget limit is required'], min: 0 },
    spent: { type: Number, default: 0 },
    period: { type: String, enum: ['weekly', 'monthly', 'yearly'], default: 'monthly' },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    alertThreshold: { type: Number, default: 80 }, // percentage
  },
  { timestamps: true }
);

// Virtual: percentage spent
budgetSchema.virtual('percentSpent').get(function () {
  return this.limit > 0 ? Math.round((this.spent / this.limit) * 100) : 0;
});

budgetSchema.set('toJSON', { virtuals: true });

const Budget = mongoose.model('Budget', budgetSchema);
export default Budget;
