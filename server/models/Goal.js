import mongoose from 'mongoose';

const milestoneSchema = new mongoose.Schema({
  percentage: { type: Number, required: true },
  reached: { type: Boolean, default: false },
  reachedAt: { type: Date, default: null }
}, { _id: false });

const goalHistorySchema = new mongoose.Schema({
  action: { type: String, required: true },
  amount: { type: Number },
  note: { type: String, default: '' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const aiInsightSchema = new mongoose.Schema({
  level: { type: String, enum: ['Positive', 'Suggestion', 'Warning', 'Critical'], required: true },
  message: { type: String, required: true },
  confidence: { type: Number, default: 90 }
}, { _id: false });

const aiRecommendationSchema = new mongoose.Schema({
  recommendation: { type: String, required: true },
  reason: { type: String, required: true },
  impact: { type: String, required: true },
  confidence: { type: Number, default: 90 }
}, { _id: false });

const goalSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: [true, 'Goal title is required'], trim: true },
    description: { type: String, default: '' },
    category: { type: String, default: 'Other' },
    targetAmount: { type: Number, required: [true, 'Target amount is required'], min: [0.01, 'Target amount must be positive'] },
    savedAmount: { type: Number, default: 0, min: 0 },
    targetDate: { type: Date, required: [true, 'Target date is required'] },
    priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
    color: { type: String, default: '#6366f1' },
    icon: { type: String, default: '🎯' },
    uploadedIcon: { type: String, default: '' },
    
    // Computed fields & settings
    status: { 
      type: String, 
      enum: ['Active', 'Completed', 'Paused', 'Expired', 'Archived'], 
      default: 'Active' 
    },
    progressPct: { type: Number, default: 0 },
    remainingAmount: { type: Number, default: 0 },
    estimatedCompletion: { type: Date, default: null },
    
    reminderPreferences: {
      frequency: { 
        type: String, 
        enum: ['Weekly', 'Monthly', 'Before Deadline', 'Missed Contribution', 'None'], 
        default: 'None' 
      }
    },
    
    milestones: {
      type: [milestoneSchema],
      default: () => [
        { percentage: 25, reached: false, reachedAt: null },
        { percentage: 50, reached: false, reachedAt: null },
        { percentage: 75, reached: false, reachedAt: null },
        { percentage: 90, reached: false, reachedAt: null },
        { percentage: 100, reached: false, reachedAt: null }
      ]
    },
    
    suggestedMonthlySaving: { type: Number, default: 0 },
    suggestedWeeklySaving: { type: Number, default: 0 },
    suggestedDailySaving: { type: Number, default: 0 },
    
    notes: { type: String, default: '', trim: true },
    
    // Soft Delete
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    
    // Audit log
    goalHistory: [goalHistorySchema],
    
    // AI Insights Cache
    aiInsights: [aiInsightSchema],
    aiRecommendations: [aiRecommendationSchema],
    aiGeneratedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

// Search indexes on title, category, and notes
goalSchema.index({ title: 'text', notes: 'text', category: 'text' });

// Legacy Virtual Bindings for 100% Backward Compatibility
goalSchema.virtual('name')
  .get(function() { return this.title; })
  .set(function(v) { this.title = v; });

goalSchema.virtual('currentSaved')
  .get(function() { return this.savedAmount; })
  .set(function(v) { this.savedAmount = v; });

goalSchema.virtual('deadline')
  .get(function() { return this.targetDate; })
  .set(function(v) { this.targetDate = v; });

goalSchema.virtual('progressPctVirtual').get(function () {
  return this.targetAmount > 0 ? Math.min(Math.round((this.savedAmount / this.targetAmount) * 100), 100) : 0;
});

// Pre-save triggers for automated computations
goalSchema.pre('save', function (next) {
  // Normalize casing of status if needed
  if (this.status) {
    const cap = this.status.charAt(0).toUpperCase() + this.status.slice(1).toLowerCase();
    const valid = ['Active', 'Completed', 'Paused', 'Expired', 'Archived'];
    if (valid.includes(cap)) {
      this.status = cap;
    }
  }

  // Auto-fill values
  this.savedAmount = Math.max(0, this.savedAmount);
  this.remainingAmount = Math.max(0, this.targetAmount - this.savedAmount);
  this.progressPct = this.targetAmount > 0 ? Math.min(Math.round((this.savedAmount / this.targetAmount) * 100), 100) : 0;

  if (this.progressPct >= 100) {
    this.status = 'Completed';
  }

  // Calculate suggested savings rates
  const daysLeft = Math.ceil((new Date(this.targetDate) - new Date()) / (1000 * 60 * 60 * 24));
  if (daysLeft > 0 && this.remainingAmount > 0) {
    this.suggestedDailySaving = Math.round((this.remainingAmount / daysLeft) * 100) / 100;
    this.suggestedWeeklySaving = Math.round((this.remainingAmount / (daysLeft / 7)) * 100) / 100;
    this.suggestedMonthlySaving = Math.round((this.remainingAmount / (daysLeft / 30.4)) * 100) / 100;
  } else {
    this.suggestedDailySaving = 0;
    this.suggestedWeeklySaving = 0;
    this.suggestedMonthlySaving = 0;
  }

  // Sync milestone reached status
  if (this.milestones && this.milestones.length > 0) {
    this.milestones.forEach(m => {
      if (this.progressPct >= m.percentage && !m.reached) {
        m.reached = true;
        m.reachedAt = new Date();
      }
    });
  }

  next();
});

// Query middleware to automatically exclude deleted goals
goalSchema.pre(/^find/, function (next) {
  const filter = this.getFilter();
  if (filter && filter.includeDeleted) {
    delete filter.includeDeleted; // clean up custom filter flag
  } else {
    this.where({ isDeleted: { $ne: true } });
  }
  next();
});

goalSchema.set('toJSON', { virtuals: true });
goalSchema.set('toObject', { virtuals: true });

const Goal = mongoose.model('Goal', goalSchema);
export default Goal;
