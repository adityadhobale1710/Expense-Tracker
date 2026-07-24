import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Trash2, Edit3, Plus, ArrowRight, Eye } from 'lucide-react';
import { GoalProgressBar } from './GoalProgress';
import { calculateDaysRemaining, formatDaysRemaining } from '../../utils/goalCalculations';
import { getPriorityBadgeClass, getStatusBadgeClass } from '../../utils/goalHelpers';

export default function GoalCard({
  goal = {},
  onEdit,
  onDelete,
  onAddMoney
}) {
  const navigate = useNavigate();
  const {
    _id,
    title = '',
    targetAmount = 0,
    savedAmount = 0,
    remainingAmount = 0,
    targetDate,
    priority = 'Medium',
    status = 'Active',
    color = '#6366f1',
    icon = '🎯',
    gradient = '',
    progressPct = 0
  } = goal;

  const daysLeft = calculateDaysRemaining(targetDate);
  const daysLabel = formatDaysRemaining(daysLeft);

  const cardStyle = gradient 
    ? `bg-gradient-to-br ${gradient}` 
    : 'bg-dark-800/85 backdrop-blur-lg border-slate-700/60';

  const headingColor = gradient ? 'text-white' : 'text-slate-100';
  const subtextColor = gradient ? 'text-white/80' : 'text-slate-400';
  const borderLight = gradient ? 'border-white/10' : 'border-slate-700/40';

  return (
    <motion.div
      layout
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3 }}
      className={`relative flex flex-col p-6 border rounded-3xl shadow-xl hover:shadow-2xl transition-all h-full justify-between overflow-hidden ${cardStyle}`}
    >
      {/* Visual background gradient glow on hover */}
      {!gradient && (
        <div 
          className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-15 pointer-events-none transition-all"
          style={{ background: color }}
        />
      )}

      {/* Header Info */}
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg bg-dark-900/60 border border-slate-700/30 shadow-inner">
              {icon}
            </span>
            <div>
              <h4 className={`font-black text-sm tracking-tight truncate max-w-[150px] ${headingColor}`}>
                {title}
              </h4>
              <span className={`text-[9px] font-bold uppercase tracking-wider ${subtextColor}`}>
                {goal.category}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-lg ${getStatusBadgeClass(status)}`}>
              {status}
            </span>
            <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-lg ${getPriorityBadgeClass(priority)}`}>
              {priority}
            </span>
          </div>
        </div>

        {/* Target Details */}
        <div className="grid grid-cols-3 gap-2 py-1">
          <div>
            <p className={`text-[9px] font-bold uppercase tracking-wider ${subtextColor}`}>Target</p>
            <p className={`text-xs font-black leading-tight ${headingColor}`}>₹{targetAmount.toLocaleString('en-IN')}</p>
          </div>
          <div>
            <p className={`text-[9px] font-bold uppercase tracking-wider ${subtextColor}`}>Saved</p>
            <p className="text-xs font-black leading-tight text-emerald-400">₹{savedAmount.toLocaleString('en-IN')}</p>
          </div>
          <div className="text-right">
            <p className={`text-[9px] font-bold uppercase tracking-wider ${subtextColor}`}>Remaining</p>
            <p className="text-xs font-black leading-tight text-rose-400">₹{remainingAmount.toLocaleString('en-IN')}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="pt-1">
          <GoalProgressBar progress={progressPct} />
        </div>
      </div>

      {/* Footer Details & Buttons */}
      <div className="mt-5 pt-4 border-t space-y-4 justify-end flex flex-col flex-1" style={{ borderColor: borderLight }}>
        <div className="flex justify-between items-center text-[10px] font-semibold">
          <div className="flex items-center gap-1 text-slate-350">
            <Calendar size={12} className={subtextColor} />
            <span className={subtextColor}>{new Date(targetDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
          </div>
          <span className={`font-bold ${daysLeft > 0 ? 'text-amber-400' : 'text-rose-400'}`}>
            {daysLabel}
          </span>
        </div>

        {/* Actions Button Grid */}
        <div className="grid grid-cols-4 gap-2">
          {/* Edit */}
          <button
            onClick={() => onEdit(goal)}
            title="Edit Details"
            className="flex items-center justify-center p-2 rounded-xl bg-dark-900/60 border border-slate-700/30 hover:border-primary-500/50 hover:bg-dark-900 transition-all"
          >
            <Edit3 size={12} className="text-slate-300 hover:text-primary-400" />
          </button>
          
          {/* Delete */}
          <button
            onClick={() => onDelete(goal._id)}
            title="Delete Goal"
            className="flex items-center justify-center p-2 rounded-xl bg-dark-900/60 border border-slate-700/30 hover:border-rose-500/50 hover:bg-dark-900 transition-all"
          >
            <Trash2 size={12} className="text-slate-300 hover:text-rose-400" />
          </button>

          {/* Add Money */}
          {status !== 'Completed' && status !== 'Archived' ? (
            <button
              onClick={() => onAddMoney(goal)}
              title="Add Money"
              className="flex items-center justify-center p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/70 hover:bg-emerald-500/30 transition-all col-span-1"
            >
              <Plus size={12} className="text-emerald-400" />
            </button>
          ) : (
            <div className="col-span-1" /> // empty slot
          )}

          {/* View Details */}
          <button
            onClick={() => navigate(`/goals/${_id}`)}
            title="View Details"
            className="flex items-center justify-center p-2 rounded-xl bg-primary-500/20 border border-primary-500/30 hover:border-primary-500/70 hover:bg-primary-500/30 transition-all text-xs font-bold gap-1 text-primary-400 col-span-1"
          >
            <Eye size={12} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
