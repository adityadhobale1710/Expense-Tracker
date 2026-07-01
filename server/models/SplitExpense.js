import mongoose from 'mongoose';

const splitMemberSchema = new mongoose.Schema({
  userEmail: { type: String, required: true },
  share: { type: Number, required: true },
  paid: { type: Boolean, default: false },
  status: { type: String, enum: ['pending', 'settled'], default: 'pending' },
});

const splitExpenseSchema = new mongoose.Schema(
  {
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: [true, 'Bill title is required'], trim: true },
    amount: { type: Number, required: [true, 'Total amount is required'], min: 0 },
    groupName: {
      type: String,
      enum: ['Restaurant', 'Trip', 'Room Rent', 'Friends', 'Office'],
      required: true,
    },
    status: { type: String, enum: ['pending', 'settled'], default: 'pending' },
    members: [splitMemberSchema],
  },
  { timestamps: true }
);

const SplitExpense = mongoose.model('SplitExpense', splitExpenseSchema);
export default SplitExpense;
