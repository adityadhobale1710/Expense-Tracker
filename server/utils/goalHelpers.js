import Goal from '../models/Goal.js';
import Contribution from '../models/Contribution.js';
import Wallet from '../models/Wallet.js';
import Notification from '../models/Notification.js';
import { updateSavingsAchievements } from '../controllers/goalController.js';

export const handleIncomeAutoSave = async (income, userId) => {
  try {
    const amount = income.amount;
    const category = income.category;
    const walletId = income.wallet;

    // Find active goals with auto-save enabled that list this income category
    const goals = await Goal.find({
      user: userId,
      status: 'Active',
      autoSaveEnabled: true,
      autoSaveCategories: category,
      isDeleted: { $ne: true }
    });

    for (const goal of goals) {
      if (goal.savedAmount >= goal.targetAmount) continue;

      let contrib = 0;
      let typeStr = 'Automatic';

      if (goal.autoSaveType === 'percentage') {
        contrib = amount * (goal.autoSavePercentage / 100);
        typeStr = 'Salary Auto Save';
      } else if (goal.autoSaveType === 'fixed') {
        contrib = goal.autoSaveFixedAmount;
        typeStr = 'Automatic';
      } else if (goal.autoSaveType === 'round_up_100') {
        const nextMultiple = Math.ceil(amount / 100) * 100;
        contrib = nextMultiple - amount;
        typeStr = 'Round Up';
      } else if (goal.autoSaveType === 'round_up_500') {
        const nextMultiple = Math.ceil(amount / 500) * 500;
        contrib = nextMultiple - amount;
        typeStr = 'Round Up';
      } else if (goal.autoSaveType === 'round_up_1000') {
        const nextMultiple = Math.ceil(amount / 1000) * 1000;
        contrib = nextMultiple - amount;
        typeStr = 'Round Up';
      } else if (goal.autoSaveType === 'remaining_salary') {
        contrib = amount * (goal.autoSavePercentage / 100 || 0.1);
        typeStr = 'Salary Auto Save';
      }

      const remaining = goal.targetAmount - goal.savedAmount;
      const actualContrib = Math.min(contrib, remaining);

      if (actualContrib <= 0) continue;

      let wallet = null;
      if (walletId) {
        wallet = await Wallet.findOne({ _id: walletId, user: userId });
        if (wallet && wallet.balance >= actualContrib) {
          wallet.balance -= actualContrib;
          await wallet.save();
        } else {
          // Failure notification
          await Notification.create({
            user: userId,
            type: 'auto_save_failed',
            message: `⚠️ Auto-Save to "${goal.title}" failed: Insufficient balance in wallet ${wallet?.name || 'linked'}.`
          });
          continue;
        }
      }

      // Record contribution
      await Contribution.create({
        goalId: goal._id,
        user: userId,
        wallet: walletId || null,
        amount: actualContrib,
        note: `Auto-save (${goal.autoSaveType}) trigger from Income: ${income.title}`,
        date: new Date(),
        type: typeStr
      });

      const oldSaved = goal.savedAmount;
      goal.savedAmount += actualContrib;
      goal.goalHistory.push({
        action: 'Contribution',
        amount: actualContrib,
        note: `Auto-save triggers: Income: ${income.title}`,
        user: userId,
        createdAt: new Date()
      });

      const newPct = Math.min(Math.round((goal.savedAmount / goal.targetAmount) * 100), 100);
      const oldPct = Math.min(Math.round((oldSaved / goal.targetAmount) * 100), 100);
      
      const milestones = [25, 50, 75, 90, 100];
      for (const threshold of milestones) {
        if (oldPct < threshold && newPct >= threshold) {
          const isCompleted = threshold === 100;
          await Notification.create({
            user: userId,
            type: isCompleted ? 'goal_completed' : 'goal_milestone',
            message: isCompleted 
              ? `🏆 Hurrah! You fully completed your savings goal "${goal.title}"!`
              : `🎯 Milestone achieved! Your savings goal "${goal.title}" is now ${threshold}% completed.`
          });
        }
      }

      if (newPct >= 100) {
        goal.status = 'Completed';
        goal.goalHistory.push({
          action: 'Completed Goal',
          note: `Auto-save trigger completed target of ₹${goal.targetAmount.toLocaleString('en-IN')}!`,
          user: userId,
          createdAt: new Date()
        });
      }

      // Invalidate AI cache
      goal.aiGeneratedAt = null;
      await goal.save();

      // Log success notification
      await Notification.create({
        user: userId,
        type: 'auto_save_success',
        message: `⚙️ Auto-Save trigger added ₹${actualContrib.toLocaleString('en-IN')} to "${goal.title}" from income category "${category}".`
      });
    }

    if (goals.length > 0) {
      await updateSavingsAchievements(userId);
    }
  } catch (err) {
    console.error('Auto-save process error:', err);
  }
};
