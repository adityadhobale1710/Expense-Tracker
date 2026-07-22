import mongoose from 'mongoose';

const goalSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: [true, 'Goal name is required'], trim: true },
    targetAmount: { type: Number, required: [true, 'Target amount is required'], min: 0 },
    currentSaved: { type: Number, default: 0, min: [0, 'Saved amount cannot be negative'] },
    deadline: { type: Date, required: [true, 'Deadline date is required'] },
    category: { type: String, default: 'General' },
    status: { type: String, enum: ['active', 'completed'], default: 'active' },
  },
  { timestamps: true }
);

// Virtual for progress percent and estimated completion
goalSchema.virtual('progressPct').get(function () {
  return this.targetAmount > 0 ? Math.min(Math.round((this.currentSaved / this.targetAmount) * 100), 100) : 0;
});

goalSchema.set('toJSON', { virtuals: true });

const Goal = mongoose.model('Goal', goalSchema);
export default Goal;
