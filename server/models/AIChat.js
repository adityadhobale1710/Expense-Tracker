import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const aiChatSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    messages: [chatMessageSchema],
    // Per-module context cache — each entry holds { data: String, cachedAt: Date }
    // Keyed by module name: wallets | budgets | expenses | incomes | goals | loans | subscriptions
    moduleCache: { type: mongoose.Schema.Types.Mixed, default: {} },
    // Insights cache — holds { data: Object, timestamp: Number (ms) } for 5-min TTL
    // Stored as Number (not Date) to match Date.now() comparisons in InsightEngine.
    insightsCache: { type: mongoose.Schema.Types.Mixed, default: {} },
    // Phase 3: Structured Long-term Memory
    structuredMemory: {
      user_preferences: { type: String, default: "" },
      ongoing_topics: { type: String, default: "" },
      long_term_goals: { type: String, default: "" },
      conversation_summary: { type: String, default: "" },
      pending_followups: { type: String, default: "" },
      communication_preferences: { type: String, default: "" },
      // Metadata
      version: { type: Number, default: 1 },
      lastUpdated: { type: Date, default: null },
      summaryCount: { type: Number, default: 0 },
      // Importance Classification (Internal Only)
      importance: {
        type: Map,
        of: String,
        default: {
          user_preferences: "CRITICAL",
          communication_preferences: "CRITICAL",
          long_term_goals: "CRITICAL",
          ongoing_topics: "MEDIUM",
          pending_followups: "MEDIUM",
          conversation_summary: "LOW"
        }
      }
    },
    // Phase 4: Daily Quota & Caching
    dailyUsage: {
      date: { type: String },
      count: { type: Number, default: 0 }
    },
    responseCache: { type: mongoose.Schema.Types.Mixed, default: {} }
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
