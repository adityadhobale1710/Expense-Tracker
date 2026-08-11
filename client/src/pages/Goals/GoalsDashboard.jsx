import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target, Plus, AlertCircle, RefreshCw, Sparkles, TrendingUp,
  Award, Calendar, ArrowUpRight, BarChart3, ChevronRight,
  Shield, Wallet, HelpCircle, Activity, Info
} from 'lucide-react';
import useGoals from '../../hooks/useGoals';
import { useDialog } from '../../hooks/useDialog';

import GoalCard from '../../components/Goals/GoalCard';
import GoalSearch from '../../components/Goals/GoalSearch';
import GoalFilters from '../../components/Goals/GoalFilters';
import GoalModal from '../../components/Goals/GoalModal';
import ContributionModal from '../../components/Goals/ContributionModal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { DataTable } from '../../components/ui/DataTable';

export default function GoalsDashboard() {
  const { showConfirm } = useDialog();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    status: 'Active',
    category: '',
    priority: '',
    sort: 'newest'
  });

  const queryFilters = useMemo(() => ({
    search,
    ...filters
  }), [search, filters]);

  const {
    goals,
    isLoadingGoals,
    refetchGoals,
    stats,
    isLoadingStats,
    refetchStats,
    templates,
    createGoal,
    updateGoal,
    deleteGoal,
    contributeToGoal
  } = useGoals(queryFilters);

  // Modal control states
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isContributionOpen, setIsContributionOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);

  const handleOpenCreate = useCallback(() => {
    setSelectedGoal(null);
    setIsGoalModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((goal) => {
    setSelectedGoal(goal);
    setIsGoalModalOpen(true);
  }, []);

  const handleOpenAddMoney = useCallback((goal) => {
    setSelectedGoal(goal);
    setIsContributionOpen(true);
  }, []);

  const handleTemplateClick = useCallback((t) => {
    setSelectedGoal({
      title: t.name,
      targetAmount: t.targetAmount,
      icon: t.icon,
      category: t.category,
      color: t.color,
      description: t.description,
      isTemplate: true
    });
    setIsGoalModalOpen(true);
  }, []);

  const handleGoalSubmit = async (formData) => {
    try {
      if (selectedGoal && !selectedGoal.isTemplate) {
        await updateGoal({ id: selectedGoal._id, data: formData });
      } else {
        await createGoal(formData);
      }
      setIsGoalModalOpen(false);
      refetchStats();
      refetchGoals();
    } catch (err) {}
  };

  const handleContributionSubmit = async (contributionData) => {
    try {
      await contributeToGoal({ id: selectedGoal._id, data: contributionData });
      setIsContributionOpen(false);
      refetchStats();
      refetchGoals();
    } catch (err) {}
  };

  const handleDeleteGoal = async (id) => {
    const confirmed = await showConfirm({
      title: 'Delete Savings Goal',
      message: 'Are you sure you want to delete this savings goal? This action will archive it.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (confirmed) {
      try {
        await deleteGoal(id);
        refetchStats();
        refetchGoals();
      } catch (err) {}
    }
  };

  const handleClearFilters = useCallback(() => {
    setSearch('');
    setFilters({
      status: 'Active',
      category: '',
      priority: '',
      sort: 'newest'
    });
  }, []);

  const totalTarget = useMemo(() => (stats.totalSaved || 0) + (stats.totalRemaining || 0), [stats]);
  const averageProgress = stats.averageProgress || 0;

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-100 flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-primary-500/15 border border-primary-500/20 flex items-center justify-center flex-shrink-0">
              <Target size={20} className="text-primary-400" />
            </span>
            Savings Goals
          </h1>
          <p className="text-slate-500 text-sm mt-1 ml-[52px]">
            Plan, monitor, and automate savings toward major life milestones
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleOpenCreate}
          className="btn-primary gap-2 self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>New Goal</span>
        </motion.button>
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoadingStats ? (
          [...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))
        ) : (
          <>
            <motion.div whileHover={{ y: -2 }} className="card p-5 cursor-default relative overflow-hidden group">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-primary-500/5 to-transparent" />
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active Goals</span>
                <span className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-400"><Target size={15} /></span>
              </div>
              <h3 className="text-2xl font-black text-slate-100 mt-2">{stats.activeGoals || 0}</h3>
              <p className="text-[10px] text-slate-400 mt-1">{stats.completedGoals || 0} goals completed</p>
            </motion.div>

            <motion.div whileHover={{ y: -2 }} className="card p-5 cursor-default relative overflow-hidden group">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-emerald-500/5 to-transparent" />
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Saved</span>
                <span className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400"><Wallet size={15} /></span>
              </div>
              <h3 className="text-2xl font-black text-slate-100 mt-2">₹{(stats.totalSaved || 0).toLocaleString('en-IN')}</h3>
              <p className="text-[10px] text-emerald-400 mt-1">{averageProgress}% Avg Progress</p>
            </motion.div>

            <motion.div whileHover={{ y: -2 }} className="card p-5 cursor-default relative overflow-hidden group">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-indigo-500/5 to-transparent" />
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Target</span>
                <span className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400"><Shield size={15} /></span>
              </div>
              <h3 className="text-2xl font-black text-slate-100 mt-2">₹{totalTarget.toLocaleString('en-IN')}</h3>
              <p className="text-[10px] text-slate-400 mt-1">Remaining: ₹{(stats.totalRemaining || 0).toLocaleString('en-IN')}</p>
            </motion.div>

            <motion.div whileHover={{ y: -2 }} className="card p-5 cursor-default relative overflow-hidden group">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-amber-500/5 to-transparent" />
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Monthly Saving</span>
                <span className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400"><Calendar size={15} /></span>
              </div>
              <h3 className="text-2xl font-black text-slate-100 mt-2">₹{(stats.monthlySaving || 0).toLocaleString('en-IN')}</h3>
              <p className="text-[10px] text-slate-400 mt-1">Required contribution / month</p>
            </motion.div>
          </>
        )}
      </div>

      {/* Main Content Layout (70/30 Split) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (70%): Filters + Goals list */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Search & Filters */}
          <div className="space-y-3">
            <GoalSearch value={search} onChange={setSearch} />
            <GoalFilters
              filters={filters}
              onChange={(newF) => setFilters(prev => ({ ...prev, ...newF }))}
              onClear={handleClearFilters}
            />
          </div>

          {/* Goals Grid list */}
          {isLoadingGoals ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <Skeleton.Card key={i} />
              ))}
            </div>
          ) : goals.length === 0 ? (
            <EmptyState
              title="No active goals found"
              description="Create a goal from scratch or use one of our quick start templates to initiate savings tracks!"
              icon={Target}
              actionText="New Goal"
              onAction={handleOpenCreate}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <AnimatePresence mode="popLayout">
                {goals.map(goal => (
                  <motion.div
                    key={goal._id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                  >
                    <GoalCard
                      goal={goal}
                      onEdit={handleOpenEdit}
                      onDelete={handleDeleteGoal}
                      onAddMoney={handleOpenAddMoney}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Right Column (30%): AI Insights, Templates, Achievements */}
        <div className="space-y-6">
          
          {/* Quick Start Templates */}
          {templates.length > 0 && (
            <div className="card p-6 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles size={14} className="text-primary-400" /> Goal Templates
                </h3>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Quick start options for savings</p>
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                {templates.slice(0, 4).map(t => (
                  <button
                    key={t.name}
                    onClick={() => handleTemplateClick(t)}
                    className="p-3 bg-dark-900 border border-slate-700/40 rounded-xl hover:border-primary-500/50 hover:bg-dark-800 transition-all flex items-center justify-between text-left font-semibold"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg w-8 h-8 rounded-lg bg-dark-800 flex items-center justify-center border border-slate-700/30">{t.icon}</span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-200">{t.name}</h4>
                        <span className="text-[9px] text-slate-500">Category: {t.category}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-100 block">₹{t.targetAmount.toLocaleString('en-IN')}</span>
                      <span className="text-[9px] text-primary-400 font-bold flex items-center gap-0.5 justify-end">Apply <ChevronRight size={10} /></span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}


        </div>
      </div>

      {/* Goal Form Modal */}
      <AnimatePresence>
        {isGoalModalOpen && (
          <GoalModal
            isOpen={isGoalModalOpen}
            onClose={() => setIsGoalModalOpen(false)}
            onSubmit={handleGoalSubmit}
            goal={selectedGoal}
            templates={templates}
          />
        )}
      </AnimatePresence>

      {/* Contribution Form Modal */}
      <AnimatePresence>
        {isContributionOpen && (
          <ContributionModal
            isOpen={isContributionOpen}
            onClose={() => setIsContributionOpen(false)}
            onSubmit={handleContributionSubmit}
            goal={selectedGoal}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
