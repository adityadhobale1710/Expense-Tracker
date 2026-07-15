import { motion } from 'framer-motion';
import { Target, Calendar, CheckCircle2, ChevronRight, Award } from 'lucide-react';

export default function GoalTracker({
  goals = [],
  currencySymbol = '₹'
}) {
  
  const getDaysRemaining = (deadlineStr) => {
    const diff = new Date(deadlineStr) - new Date();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? `${days} days left` : 'Expired';
  };

  const getPercentageColor = (pct) => {
    if (pct >= 100) return 'text-emerald-500 stroke-emerald-500';
    if (pct >= 50) return 'text-primary-500 stroke-primary-500';
    return 'text-indigo-400 stroke-indigo-400';
  };

  return (
    <div className="flex flex-col p-6 bg-dark-800/80 border border-slate-700/60 rounded-3xl shadow-xl space-y-5 h-full justify-between">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Solvency Target Tracker</h3>
          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Progress indicators for emergency fund, vacations and houses</p>
        </div>
        <div className="p-2 rounded-xl bg-dark-900 border border-slate-800">
          <Target size={16} className="text-primary-400" />
        </div>
      </div>

      {/* Goals Grid list */}
      <div className="space-y-4 pr-1 overflow-y-auto max-h-72">
        {goals.length > 0 ? (
          goals.map((g) => {
            const pct = g.progressPct || Math.round(((g.currentSaved || 0) / (g.targetAmount || 1)) * 100);
            const remaining = Math.max(0, g.targetAmount - g.currentSaved);
            const isCompleted = g.status === 'completed' || pct >= 100;
            const daysLabel = getDaysRemaining(g.deadline);

            // Circular progress calculations
            const r = 18;
            const circum = 2 * Math.PI * r;
            const offset = circum - (Math.min(pct, 100) / 100) * circum;

            return (
              <div
                key={g._id}
                className="flex items-center gap-4 p-3 bg-dark-900/40 border border-slate-850 hover:border-slate-800 rounded-2xl transition-colors text-xs"
              >
                {/* SVG Progress Circle Ring */}
                <div className="relative w-12 h-12 flex-shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 44 44">
                    <circle
                      cx="22"
                      cy="22"
                      r={r}
                      className="stroke-slate-800"
                      strokeWidth="3.5"
                      fill="transparent"
                    />
                    <motion.circle
                      cx="22"
                      cy="22"
                      r={r}
                      className={`${getPercentageColor(pct)}`}
                      strokeWidth="3.5"
                      fill="transparent"
                      strokeDasharray={circum}
                      initial={{ strokeDashoffset: circum }}
                      animate={{ strokeDashoffset: offset }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-slate-105">
                    {pct}%
                  </div>
                </div>

                {/* Details info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-slate-200 truncate">{g.name}</h4>
                    {isCompleted && <CheckCircle2 size={12} className="text-emerald-450 flex-shrink-0" />}
                  </div>

                  <div className="flex items-center gap-3 text-[10px] text-slate-500 font-semibold mt-0.5">
                    <span className="flex items-center gap-1">
                      <Calendar size={10} className="text-slate-550" />
                      <span>{daysLabel}</span>
                    </span>
                    <span>&bull;</span>
                    <span>Remaining: {currencySymbol}{remaining.toLocaleString()}</span>
                  </div>
                </div>

                {/* Totals */}
                <div className="text-right flex-shrink-0 font-mono">
                  <span className="font-black text-slate-100 block">
                    {currencySymbol}{g.currentSaved.toLocaleString()}
                  </span>
                  <span className="text-[9px] text-slate-500 font-bold block mt-0.5">
                    target {currencySymbol}{g.targetAmount.toLocaleString()}
                  </span>
                </div>

              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center p-8 bg-dark-900/40 border border-slate-850 rounded-2xl text-center space-y-2 mt-4">
            <Award size={22} className="text-slate-655" />
            <p className="text-[11px] font-bold text-slate-450">No Solvency Targets Configured</p>
            <p className="text-[9px] text-slate-550">Create financial milestones (e.g. Vacation, Emergency Fund) to track goals.</p>
          </div>
        )}
      </div>

    </div>
  );
}
