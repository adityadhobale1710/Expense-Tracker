import mongoose from 'mongoose';

const investmentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: [true, 'Asset name is required'], trim: true },
    type: {
      type: String,
      enum: ['stocks', 'mutual_funds', 'gold', 'crypto', 'fd', 'ppf', 'nps'],
      required: true,
    },
    investedAmount: { type: Number, required: [true, 'Invested amount is required'], min: 0 },
    currentValue: { type: Number, required: [true, 'Current value is required'], min: 0 },
    symbol: { type: String, default: '' },
    purchaseDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Virtual for profit/loss calculation
investmentSchema.virtual('profitOrLoss').get(function () {
  return this.currentValue - this.investedAmount;
});

investmentSchema.virtual('percentageReturn').get(function () {
  return this.investedAmount > 0 ? ((this.currentValue - this.investedAmount) / this.investedAmount) * 100 : 0;
});

investmentSchema.set('toJSON', { virtuals: true });

const Investment = mongoose.model('Investment', investmentSchema);
export default Investment;
