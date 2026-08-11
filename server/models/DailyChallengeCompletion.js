import mongoose from 'mongoose';

const dailyChallengeCompletionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    challengeId: {
      type: String,
      required: true,
    },
    dateString: {
      type: String,
      required: true,
    },
    completedAt: {
      type: Date,
      default: Date.now,
    }
  },
  { timestamps: true }
);

// A user can only complete a specific challenge once per day
dailyChallengeCompletionSchema.index(
  { user: 1, challengeId: 1, dateString: 1 },
  { unique: true }
);

const DailyChallengeCompletion = mongoose.model('DailyChallengeCompletion', dailyChallengeCompletionSchema);
export default DailyChallengeCompletion;
