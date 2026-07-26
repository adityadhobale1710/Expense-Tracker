import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Plus, AlertCircle, RefreshCw, LayoutGrid } from 'lucide-react';
import useGoals from '../../hooks/useGoals';
import { useDialog } from '../../hooks/useDialog';

// Components
import GoalStats from '../../components/Goals/GoalStats';
import GoalCard from '../../components/Goals/GoalCard';
import GoalSearch from '../../components/Goals/GoalSearch';
import GoalFilters from '../../components/Goals/GoalFilters';
import GoalModal from '../../components/Goals/GoalModal';
import ContributionModal from '../../components/Goals/ContributionModal';

export default function GoalsDashboard() {
  const { showConfirm } = useDialog();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    status: 'Active',
    category: '',
    priority: '',
    sort: 'newest'
  });

  const queryFilters = {
    search,
    ...filters
  };

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

  const handleOpenCreate = () => {
    setSelectedGoal(null);
    setIsGoalModalOpen(true);
  };

  const handleOpenEdit = (goal) => {
    setSelectedGoal(goal);
    setIsGoalModalOpen(true);
  };

  const handleOpenAddMoney = (goal) => {
    setSelectedGoal(goal);
    setIsContributionOpen(true);
  };

  const handleGoalSubmit = async (formData) => {
    try {
      if (selectedGoal) {
        await updateGoal({ id: selectedGoal._id, data: formData });
      } else {
        await createGoal(formData);
      }
      setIsGoalModalOpen(false);
      refetchStats();
    } catch (err) {}
  };

  const handleContributionSubmit = async (contributionData) => {
    try {
      await contributeToGoal({ id: selectedGoal._id, data: contributionData });
      setIsContributionOpen(false);
      refetchStats();
    } catch (err) {}
  };

  const handleDeleteGoal = async (id) => {
    const confirmed = await showConfirm({
      title: 'Delete Savings Goal',
      message: 'Are you sure you want to delete this savings goal? (It will be archived and soft-deleted)',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (confirmed) {
      try {
        await deleteGoal(id);
        refetchStats();
      } catch (err) {}
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setFilters({
      status: '',
      category: '',
      priority: '',
      sort: 'newest'
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <span>🎯</span> Financial Savings Goals
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Plan, monitor, automate and allocate savings toward major target milestones
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-100 bg-primary-500 hover:bg-primary-600 rounded-2xl shadow-lg shadow-primary-500/10 transition-all hover:scale-102 flex-shrink-0"
        >
          <Plus size={14} />
          <span>New Goal</span>
        </button>
      </div>

      {/* Goal statistics header widget */}
      {isLoadingStats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-28 bg-dark-800/80 border border-slate-800 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : (
        <GoalStats stats={stats} />
      )}

      {/* Search and Filters Section */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <GoalSearch value={search} onChange={setSearch} />
        </div>
        <GoalFilters
          filters={filters}
          onChange={(newF) => setFilters(prev => ({ ...prev, ...newF }))}
          onClear={handleClearFilters}
        />
      </div>

      {/* Goals Grid list */}
      {isLoadingGoals ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-64 bg-dark-800/80 border border-slate-800 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center p-12 bg-dark-800/80 border border-slate-700/60 rounded-3xl text-center shadow-xl space-y-4"
        >
          <div className="p-4 rounded-full bg-slate-800/60 border border-slate-750 text-slate-500">
            <Target size={36} />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-200">No active goals found</h3>
            <p className="text-[11px] text-slate-500 max-w-sm">
              Create a goal from scratch or use one of our quick start templates below to initiate savings tracks!
            </p>
          </div>

          {/* Prompt quick templates in empty view */}
          {templates.length > 0 && (
            <div className="w-full max-w-md pt-4">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Quick Start Templates</p>
              <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                {templates.slice(0, 4).map(t => (
                  <button
                    key={t.name}
                    onClick={() => {
                      handleOpenCreate();
                      setTimeout(() => handleTemplateClick(t), 200); // trigger quick populate
                    }}
                    className="p-3 bg-dark-900 border border-slate-700/40 rounded-2xl hover:border-primary-500/50 hover:bg-dark-900/80 transition-all flex items-center gap-2 text-left font-bold"
                  >
                    <span className="text-lg">{t.icon}</span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-250 leading-none">{t.name}</h4>
                      <span className="text-[9px] text-slate-500">Target: ₹{(t.targetAmount).toLocaleString('en-IN')}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
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
        </motion.div>
      )}

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
