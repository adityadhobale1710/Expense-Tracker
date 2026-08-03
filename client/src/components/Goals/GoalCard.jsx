import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Trash2, Edit3, Plus, Eye, Archive, User } from 'lucide-react';
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
    progressPct = 0,
    suggestedMonthlySaving = 0
  } = goal;

  const daysLeft = calculateDaysRemaining(targetDate);
  const daysLabel = formatDaysRemaining(daysLeft);

  // Circular Progress calculations
  const radius = 22;
  const stroke = 3;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(progressPct, 100) / 100) * circumference;

  return (
    <motion.div
      layout
      whileHover={{ y: -3 }}
      className="card hover:border-slate-600/50 transition-all duration-300 flex flex-col justify-between h-full relative overflow-hidden group border border-slate-700/40 shadow-xl"
    >
      {/* Top decorative gradient bar */}
      <div 
        className="absolute top-0 left-0 right-0 h-1.5 opacity-80"
        style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }}
      />

      <div className="space-y-4 pt-2">
        {/* Header Section */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <span
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl border border-slate-700/20 shadow-inner"
              style={{ backgroundColor: `${color}15` }}
            >
              {icon}
            </span>
            <div className="min-w-0">
              <h4 className="font-extrabold text-sm text-slate-100 truncate max-w-[140px] leading-tight">
                {title}
              </h4>
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 mt-1 block">
                {goal.category}
              </span>
            </div>
          </div>

          {/* Badges and Progress Ring */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* SVG Circular Progress Ring */}
            <div className="relative w-11 h-11 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  className="text-slate-800"
                  strokeWidth={stroke}
                  stroke="currentColor"
                  fill="transparent"
                  r={normalizedRadius}
                  cx={radius}
                  cy={radius}
                />
                <circle
                  stroke={color}
                  strokeWidth={stroke}
                  strokeDasharray={circumference + ' ' + circumference}
                  style={{ strokeDashoffset }}
                  strokeLinecap="round"
                  fill="transparent"
                  r={normalizedRadius}
                  cx={radius}
                  cy={radius}
                />
              </svg>
              <span className="absolute text-[9px] font-black text-slate-200">{progressPct}%</span>
            </div>
          </div>
        </div>

        {/* Priority & Status Badges Row */}
        <div className="flex gap-2">
          <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-md ${getStatusBadgeClass(status)}`}>
            {status}
          </span>
          <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-md ${getPriorityBadgeClass(priority)}`}>
            {priority}
          </span>
        </div>

        {/* Financial metrics grid */}
        <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-dark-900/50 border border-slate-800/40 rounded-xl text-left">
          <div>
            <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">Target</span>
            <span className="text-xs font-black text-slate-100">₹{targetAmount.toLocaleString('en-IN')}</span>
          </div>
          <div>
            <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">Saved</span>
            <span className="text-xs font-black text-emerald-400">₹{savedAmount.toLocaleString('en-IN')}</span>
          </div>
          <div className="text-right">
            <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">Left</span>
            <span className="text-xs font-black text-rose-400">₹{remainingAmount.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <GoalProgressBar progress={progressPct} />
          {suggestedMonthlySaving > 0 && status !== 'Completed' && (
            <p className="text-[9px] text-slate-400 font-semibold leading-tight">
              Needs <span className="text-primary-400 font-bold">₹{Math.round(suggestedMonthlySaving).toLocaleString('en-IN')}</span> / month
            </p>
          )}
        </div>
      </div>

      {/* Footer details & Buttons */}
      <div className="mt-5 pt-3 border-t border-slate-700/20 space-y-3.5 flex flex-col justify-end">
        <div className="flex justify-between items-center text-[10px] font-semibold">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Calendar size={12} className="text-slate-500" />
            <span>{new Date(targetDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
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
            className="w-7 h-7 rounded-lg flex items-center justify-center bg-dark-900 border border-slate-700/30 hover:border-slate-500/50 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
          >
            <Edit3 size={12} />
          </button>
          
          {/* Delete */}
          <button
            onClick={() => onDelete(goal._id)}
            title="Delete Goal"
            className="w-7 h-7 rounded-lg flex items-center justify-center bg-dark-900 border border-slate-700 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
          >
            <Trash2 size={12} />
          </button>

          {/* Add Money (Contribution) */}
          {status !== 'Completed' && status !== 'Archived' && (
            <button
              onClick={() => onAddMoney(goal)}
              title="Add Money"
              className="w-7 h-7 rounded-lg flex items-center justify-center bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500 hover:text-white text-emerald-400 transition-all cursor-pointer"
            >
              <Plus size={13} />
            </button>
          )}

          {/* View Details */}
          <button
            onClick={() => navigate(`/goals/${_id}`)}
            title="View Details"
            className="w-7 h-7 rounded-lg flex items-center justify-center bg-primary-500/10 border border-primary-500/25 hover:bg-primary-500 hover:text-white text-primary-400 transition-all cursor-pointer"
          >
            <Eye size={12} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
