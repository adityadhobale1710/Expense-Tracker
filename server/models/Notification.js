import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: [
        'budget_exceeded',
        'upcoming_bill',
        'salary_received',
        'goal_completed',
        'goal_created',
        'goal_milestone',
        'auto_save_success',
        'auto_save_failed',
        'reminder_due',
        'high_spending',
        'inactive_user',
        'subscription_renewal',
        'general'
      ],
      default: 'general',
    },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
