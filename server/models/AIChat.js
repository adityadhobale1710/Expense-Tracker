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
    financialContext: { type: String, default: '' },
    contextUpdatedAt: { type: Date, default: null }
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
