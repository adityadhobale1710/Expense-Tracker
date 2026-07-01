import mongoose from 'mongoose';

const loanSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: [true, 'Loan name is required'], trim: true },
    type: {
      type: String,
      enum: ['education', 'home', 'car', 'personal', 'credit_card_emi'],
      required: true,
    },
    amount: { type: Number, required: [true, 'Total loan principal amount is required'], min: 0 },
    interestRate: { type: Number, required: [true, 'Interest rate is required'], min: 0 },
    durationMonths: { type: Number, required: [true, 'Duration in months is required'], min: 1 },
    emiAmount: { type: Number, required: [true, 'Monthly EMI payment is required'], min: 0 },
    remainingBalance: { type: Number, required: true },
    nextEmiDate: { type: Date, required: true },
    paymentStatus: { type: String, enum: ['paid', 'unpaid'], default: 'unpaid' },
  },
  { timestamps: true }
);

const Loan = mongoose.model('Loan', loanSchema);
export default Loan;
