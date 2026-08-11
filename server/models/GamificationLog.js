import mongoose from 'mongoose';

const gamificationLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    actionId: {
      type: String,
      required: true,
    },
    entityId: {
      type: String,
      default: null,
    },
    dateString: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['PENDING', 'COMPLETED'],
      default: 'PENDING',
    }
  },
  { timestamps: true }
);

// Idempotency for entity-based actions (e.g. ADD_EXPENSE with expense ID)
gamificationLogSchema.index(
  { user: 1, actionId: 1, entityId: 1 },
  { unique: true, partialFilterExpression: { entityId: { $type: "string" } } }
);

// Idempotency for daily actions (e.g. DAILY_LOGIN, VIEW_ANALYTICS)
gamificationLogSchema.index(
  { user: 1, actionId: 1, dateString: 1 },
  { unique: true, partialFilterExpression: { dateString: { $type: "string" } } }
);

const GamificationLog = mongoose.model('GamificationLog', gamificationLogSchema);
export default GamificationLog;
