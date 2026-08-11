import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Calendar, Wallet, Play, Pause, Archive, Download, Share2,
  Trash2, Plus, Shield, Activity, UserCheck, CheckCircle2, Award,
  Sparkles, Info, AlertCircle, ChevronLeft, ChevronRight, TrendingUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useDialog } from '../../hooks/useDialog';

import { useGoals } from '../../hooks/useGoals';
import { useGoalAnalytics, useGoalContributions } from '../../hooks/useGoalAnalytics';
import { calculateDaysRemaining, formatDaysRemaining } from '../../utils/goalCalculations';
import { getPriorityBadgeClass, getStatusBadgeClass } from '../../utils/goalHelpers';

// Sub-components
import { SavingsGrowthChart } from '../../components/Goals/GoalCharts';
import ContributionModal from '../../components/Goals/ContributionModal';

export default function GoalDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showConfirm } = useDialog();

  const [page, setPage] = useState(1);
  const limit = 5;

  const {
    goal,
    isLoadingGoal,
    analytics
  } = useGoalAnalytics(id);

  const {
    contributions = [],
    total = 0,
    pages = 1
  } = useGoalContributions(id, page, limit).data || {};

  const {
    updateGoalStatus,
    contributeToGoal,
    deleteGoal,
    deleteContribution,
    isContributing
  } = useGoals();

  const [isContributionOpen, setIsContributionOpen] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Trigger celebration modal if goal just hit 100%
  useEffect(() => {
    if (goal && goal.status === 'Completed' && goal.progressPct >= 100) {
      const shownKey = `celebration_shown_${goal._id}`;
      const hasShown = localStorage.getItem(shownKey);
      if (!hasShown) {
        setShowCelebration(true);
        localStorage.setItem(shownKey, 'true');
      }
    }
  }, [goal]);

  // Reset page pagination to 1 when switching between different goals
  useEffect(() => {
    setPage(1);
  }, [id]);

  if (isLoadingGoal) {
    return (
      <div className="min-h-[60vh] flex flex-col justify-center items-center space-y-4">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Retrieving Goal Blueprint...</span>
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center space-y-3 p-6 bg-dark-800/80 border border-slate-700/60 rounded-3xl text-center">
        <AlertCircle size={32} className="text-rose-400" />
        <h3 className="text-sm font-bold text-slate-200">Goal Not Found</h3>
        <button onClick={() => navigate('/goals')} className="text-xs text-primary-400 hover:underline">
          Return to Goals list
        </button>
      </div>
    );
  }

  const daysLeft = calculateDaysRemaining(goal.targetDate);
  const daysLabel = formatDaysRemaining(daysLeft);

  const handleStatusToggle = async (status) => {
    try {
      await updateGoalStatus({ id: goal._id, status });
      toast.success(`Goal status updated to ${status}`);
    } catch (err) {}
  };

  const handleContributionSubmit = async (formData) => {
    try {
      await contributeToGoal({ id: goal._id, data: formData });
      setIsContributionOpen(false);
    } catch (err) {}
  };

  const handleRemoveContribution = async (contribId) => {
    const confirmed = await showConfirm({
      title: 'Remove Contribution',
      message: 'Are you sure you want to remove this contribution? Funds will be refunded to the wallet.',
      confirmText: 'Remove',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (confirmed) {
      try {
        await deleteContribution(goal._id, contribId);
      } catch (err) {}
    }
  };

  const handleShareAchievement = () => {
    const text = `🏆 I achieved my financial goal: "${goal.title}"! Saved ₹${goal.targetAmount.toLocaleString('en-IN')} using Expense Tracker.`;
    navigator.clipboard.writeText(text);
    toast.success('Achievement details copied to clipboard!');
  };

  const handleExportCSV = () => {
    if (contributions.length === 0) {
      return toast.error('No contributions available to export.');
    }
    let csv = 'Date,Amount (INR),Type,Note\n';
    contributions.forEach(c => {
      csv += `"${new Date(c.date).toLocaleDateString()}","${c.amount}","${c.type}","${c.note}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${goal.title.replace(/\s+/g, '_')}_savings_history.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV savings history downloaded!');
  };

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  return (
    <div className="space-y-6 pb-24 relative animate-fade-in">
      {/* Navigation & Header row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <button
          onClick={() => navigate('/goals')}
          className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors uppercase tracking-wider"
        >
          <ArrowLeft size={16} />
          <span>Back to Goals</span>
        </button>

        {/* Goal Actions */}
        <div className="flex flex-wrap gap-2">
          {goal.status === 'Paused' ? (
            <button
              onClick={() => handleStatusToggle('Active')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 hover:border-emerald-500/50 rounded-xl transition-all"
            >
              <Play size={12} />
              <span>Resume Goal</span>
            </button>
          ) : goal.status === 'Active' ? (
            <button
              onClick={() => handleStatusToggle('Paused')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/25 hover:border-amber-500/50 rounded-xl transition-all"
            >
              <Pause size={12} />
              <span>Pause Goal</span>
            </button>
          ) : null}

          {goal.status !== 'Archived' ? (
            <button
              onClick={() => handleStatusToggle('Archived')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-400 bg-slate-800 border border-slate-700/60 hover:border-slate-500 rounded-xl transition-all"
            >
              <Archive size={12} />
              <span>Archive</span>
            </button>
          ) : (
            <button
              onClick={() => handleStatusToggle('Active')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 hover:border-emerald-500/50 rounded-xl transition-all"
            >
              <Play size={12} />
              <span>Activate</span>
            </button>
          )}

          {goal.status !== 'Completed' && goal.status !== 'Archived' && goal.status !== 'Paused' && (
            <button
              onClick={() => setIsContributionOpen(true)}
              className="flex items-center gap-1.5 px-4.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg shadow-emerald-600/20 transition-all hover:scale-102"
            >
              <Plus size={14} />
              <span>Add Money</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Goal Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Summary & Analytics */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Goal Summary Panel */}
          <div className="card relative overflow-hidden flex flex-col md:flex-row gap-6 p-6">
            <div 
              className="absolute top-0 left-0 right-0 h-1.5"
              style={{ background: `linear-gradient(90deg, ${goal.color}, ${goal.color}88)` }}
            />
            {/* Visual circle progress */}
            <div className="flex-shrink-0 flex flex-col items-center justify-center space-y-2 p-4 bg-dark-900/60 border border-slate-700/30 rounded-2xl">
              <span className="text-4xl">{goal.icon}</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{goal.category}</span>
            </div>

            {/* Metrics */}
            <div className="flex-1 space-y-4">
              {/* Data Audit Warning */}
              {analytics && analytics.totalContributions !== undefined && analytics.accumulatedAmount !== undefined && analytics.totalContributions !== analytics.accumulatedAmount && (
                <div className="flex items-start gap-3 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-semibold mb-2">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <p>
                    <strong>Data Audit Warning:</strong> The sum of your recorded contributions (₹{analytics.totalContributions.toLocaleString('en-IN')}) does not match your goal's accumulated amount (₹{analytics.accumulatedAmount.toLocaleString('en-IN')}).
                  </p>
                </div>
              )}
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-lg font-black text-slate-100">{goal.title}</h3>
                  <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-lg ${getStatusBadgeClass(goal.status)}`}>
                    {goal.status}
                  </span>
                  <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-lg ${getPriorityBadgeClass(goal.priority)}`}>
                    {goal.priority}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-semibold mt-2 leading-relaxed">
                  {goal.description || 'No blueprint description provided.'}
                </p>
              </div>

              {/* Targets Progress */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs font-bold border-t border-slate-700/25">
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Target</span>
                  <span className="text-slate-100 font-black text-base">{fmt(goal.targetAmount)}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Accumulated</span>
                  <span className="text-emerald-400 font-black text-base">{fmt(goal.savedAmount)}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Remaining</span>
                  <span className="text-rose-400 font-black text-base">{fmt(goal.remainingAmount)}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Progress</span>
                  <span className="text-primary-400 font-black text-base">{goal.progressPct}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Savings Growth Charts */}
          {analytics && analytics.monthlySavingsGrowth && (
            <SavingsGrowthChart data={analytics.monthlySavingsGrowth} />
          )}



          {/* Contributions list */}
          <div className="card p-6 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Savings History</h3>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Chronological record of deposits</p>
              </div>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-900 border border-slate-700/40 text-[9px] font-bold text-slate-400 hover:text-slate-200 rounded-xl transition-all"
              >
                <Download size={10} />
                <span>Export CSV</span>
              </button>
            </div>

            {/* Contributions table */}
            {contributions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center text-xs font-semibold text-slate-500">
                <span>No contributions recorded. Add savings to track progress!</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-700/25 text-slate-500 font-bold uppercase text-[9px]">
                        <th className="pb-2">Date</th>
                        <th className="pb-2">Amount</th>
                        <th className="pb-2">Type</th>
                        <th className="pb-2">Note</th>
                        <th className="pb-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/15">
                      {contributions.map((c) => (
                        <tr key={c._id} className="text-slate-300 hover:bg-dark-900/10 font-semibold">
                          <td className="py-2.5">{new Date(c.date).toLocaleDateString()}</td>
                          <td className="py-2.5 text-emerald-400 font-bold">₹{c.amount.toLocaleString('en-IN')}</td>
                          <td className="py-2.5">
                            <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-lg bg-slate-800 border border-slate-700 text-slate-400">
                              {c.type}
                            </span>
                          </td>
                          <td className="py-2.5 max-w-[150px] truncate" title={c.note}>{c.note}</td>
                          <td className="py-2.5 text-right">
                            <button
                              onClick={() => handleRemoveContribution(c._id)}
                              className="p-1.5 rounded bg-rose-500/10 border border-rose-500/25 hover:border-rose-500/50 text-rose-400 hover:text-white transition-colors"
                              title="Delete & Refund"
                            >
                              <Trash2 size={10} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pages > 1 && (
                  <div className="flex justify-between items-center pt-2 text-[10px] font-bold text-slate-500 border-t border-slate-700/15">
                    <span>Page {page} of {pages}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-2.5 py-1 bg-dark-900 border border-slate-700/30 rounded disabled:opacity-30"
                      >
                        Prev
                      </button>
                      <button
                        onClick={() => setPage(p => Math.min(pages, p + 1))}
                        disabled={page === pages}
                        className="px-2.5 py-1 bg-dark-900 border border-slate-700/30 rounded disabled:opacity-30"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Timelines, Insights & Suggestions */}
        <div className="space-y-6">
          
          {/* Smart Predictions & Targets Widget */}
          <div className="card p-6 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Repay Forecast</h3>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Automated savings allocations</p>
            </div>

            <div className="space-y-3 font-semibold text-xs text-slate-300">
              <div className="flex justify-between p-2.5 bg-dark-900/60 border border-slate-700/30 rounded-xl">
                <span>Suggested Monthly:</span>
                <span className="text-slate-100 font-bold">₹{Math.round(analytics?.requiredMonthlyContribution || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-dark-900/60 border border-slate-700/30 rounded-xl">
                <span>Suggested Weekly:</span>
                <span className="text-slate-100 font-bold">₹{Math.round(analytics?.requiredWeeklyContribution || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-dark-900/60 border border-slate-700/30 rounded-xl">
                <span>Suggested Daily:</span>
                <span className="text-slate-100 font-bold">₹{Math.round(analytics?.requiredDailyContribution || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-dark-900/60 border border-slate-700/30 rounded-xl">
                <span>Completion Forecast:</span>
                <span className="text-emerald-400 font-bold">
                  {analytics?.completionForecast 
                    ? new Date(analytics.completionForecast).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                    : 'Insufficient data'}
                </span>
              </div>
              <div className="flex justify-between p-2.5 bg-dark-900/60 border border-slate-700/30 rounded-xl">
                <span>Probability:</span>
                <span className="text-primary-400 font-bold">
                  {analytics?.probability !== undefined ? `${analytics.probability}%` : (goal.status === 'Completed' ? '100%' : 'Insufficient data')}
                </span>
              </div>
              <div className="flex justify-between p-2.5 bg-dark-900/60 border border-slate-700/30 rounded-xl">
                <span>Days remaining:</span>
                <span className="text-amber-400 font-bold">{daysLabel}</span>
              </div>
            </div>
          </div>


        </div>
      </div>

      {/* Celebration Modal Screen */}
      <AnimatePresence>
        {showCelebration && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-900/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="w-full max-w-sm bg-gradient-to-br from-dark-800 to-dark-900 border border-yellow-500/30 rounded-3xl p-8 text-center shadow-2xl relative"
            >
              <div className="absolute top-4 right-4">
                <button
                  onClick={() => setShowCelebration(false)}
                  className="p-1 rounded bg-slate-800/40 text-slate-400 hover:text-slate-200"
                >
                  ✕
                </button>
              </div>

              {/* Award / Celebration Badge */}
              <div className="w-20 h-20 bg-yellow-500/10 border border-yellow-500/30 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-yellow-500/5">
                <Award size={42} className="text-yellow-400 animate-bounce" />
              </div>

              <h2 className="text-lg font-black text-slate-100 leading-tight">🏆 Goal Accomplished!</h2>
              <p className="text-[11px] text-slate-400 font-semibold mt-2 max-w-xs mx-auto leading-relaxed">
                Congratulations! You successfully accumulated <span className="text-yellow-400 font-bold">₹{goal.targetAmount.toLocaleString('en-IN')}</span> and completed your target: <span className="text-slate-200 font-bold">"{goal.title}"</span>!
              </p>

              {/* Reward stats */}
              <div className="bg-dark-950/60 p-3 rounded-2xl border border-slate-800 my-6">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">XP Earned</span>
                <span className="text-primary-400 font-black">+500 XP</span>
              </div>

              <div className="flex flex-col gap-2.5">
                <button
                  onClick={handleShareAchievement}
                  className="w-full py-2 bg-yellow-500 hover:bg-yellow-600 text-xs font-bold text-slate-900 rounded-xl transition-all shadow-md shadow-yellow-500/10 flex items-center justify-center gap-1.5"
                >
                  <Share2 size={14} />
                  <span>Share Achievement</span>
                </button>
                <button
                  onClick={() => {
                    setShowCelebration(false);
                    navigate('/goals');
                  }}
                  className="w-full py-2 bg-dark-900 border border-slate-700/40 text-xs font-bold text-slate-300 hover:text-slate-100 rounded-xl transition-all"
                >
                  Plan Next Goal
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Manual Contribution popup modal */}
      <AnimatePresence>
        {isContributionOpen && (
          <ContributionModal
            isOpen={isContributionOpen}
            onClose={() => setIsContributionOpen(false)}
            onSubmit={handleContributionSubmit}
            goal={goal}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
