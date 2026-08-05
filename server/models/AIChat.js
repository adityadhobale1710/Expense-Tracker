import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const aiChatSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    messages: [chatMessageSchema],
    // Per-module context cache — each entry holds { data: String, cachedAt: Date }
    // Keyed by module name: wallets | budgets | expenses | incomes | goals | loans | subscriptions
    moduleCache: { type: mongoose.Schema.Types.Mixed, default: {} },
    // Insights cache — holds { data: Object, timestamp: Number (ms) } for 5-min TTL
    // Stored as Number (not Date) to match Date.now() comparisons in InsightEngine.
    insightsCache: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);


aiChatSchema.pre('save', function (next) {
  if (this.messages && this.messages.length > 50) {
    this.messages = this.messages.slice(-50);
  }
  next();
});

const AIChat = mongoose.model('AIChat', aiChatSchema);
export default AIChat;
