import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Trash2, Edit3, Plus, Eye } from 'lucide-react';
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
    progressPct = 0
  } = goal;

  const daysLeft = calculateDaysRemaining(targetDate);
  const daysLabel = formatDaysRemaining(daysLeft);

  return (
    <motion.div
      layout
      className="card hover:border-primary-500/30 transition-all duration-200 flex flex-col justify-between h-full"
    >
      {/* Header Info */}
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <span
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
              style={{ backgroundColor: `${color}20` }}
            >
              {icon}
            </span>
            <div>
              <h4 className="font-semibold text-sm text-slate-100 truncate max-w-[150px]">
                {title}
              </h4>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
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
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-455 text-slate-400">Target</p>
            <p className="text-xs font-semibold leading-tight text-slate-100">₹{targetAmount.toLocaleString('en-IN')}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Saved</p>
            <p className="text-xs font-semibold leading-tight text-emerald-400">₹{savedAmount.toLocaleString('en-IN')}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Remaining</p>
            <p className="text-xs font-semibold leading-tight text-rose-400">₹{remainingAmount.toLocaleString('en-IN')}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="pt-1">
          <GoalProgressBar progress={progressPct} />
        </div>
      </div>

      {/* Footer Details & Buttons */}
      <div className="mt-5 pt-4 border-t border-slate-700/30 space-y-4 justify-end flex flex-col flex-1">
        <div className="flex justify-between items-center text-[10px] font-semibold">
          <div className="flex items-center gap-1 text-slate-400">
            <Calendar size={12} />
            <span>{new Date(targetDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
          </div>
          <span className={`font-bold ${daysLeft > 0 ? 'text-amber-400' : 'text-rose-400'}`}>
            {daysLabel}
          </span>
        </div>

        {/* Actions Button Grid */}
        <div className="flex gap-2 justify-end">
          {/* Edit */}
          <button
            onClick={() => onEdit(goal)}
            title="Edit Details"
            className="btn-icon p-2 text-xs"
          >
            <Edit3 size={12} />
          </button>
          
          {/* Delete */}
          <button
            onClick={() => onDelete(goal._id)}
            title="Delete Goal"
            className="btn-icon p-2 text-xs hover:text-red-400"
          >
            <Trash2 size={12} />
          </button>

          {/* Add Money */}
          {status !== 'Completed' && status !== 'Archived' && (
            <button
              onClick={() => onAddMoney(goal)}
              title="Add Money"
              className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white text-emerald-400 transition-all text-xs"
            >
              <Plus size={12} />
            </button>
          )}

          {/* View Details */}
          <button
            onClick={() => navigate(`/goals/${_id}`)}
            title="View Details"
            className="p-2 rounded-lg bg-primary-500/10 border border-primary-500/20 hover:bg-primary-500 hover:text-white text-primary-400 transition-all text-xs"
          >
            <Eye size={12} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
