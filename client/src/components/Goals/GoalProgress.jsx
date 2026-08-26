import { motion } from 'framer-motion';
import { getProgressColor } from '../../utils/goalHelpers';

// 1. Horizontal Premium Gradient Progress Bar
export function GoalProgressBar({ progress = 0 }) {
  const barColor = progress >= 100 ? 'bg-yellow-500' : progress >= 85 ? 'bg-blue-500' : 'bg-primary-600';

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1.5 text-xs font-semibold">
        <span className="text-slate-400">Completion</span>
        <span className="text-slate-200 font-bold">{progress}%</span>
      </div>
      <div className="h-2 w-full bg-dark-900 border border-slate-700/30 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: '0%' }}
          animate={{ width: `${Math.min(progress, 100)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// 2. Circular SVG Progress Ring with Framer Motion path animations
export function GoalProgressRing({ progress = 0, size = 48, strokeWidth = 4 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(progress, 100) / 100) * circumference;
  const strokeColor = getProgressColor(progress);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        {/* Background Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-slate-800"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress Path */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          strokeLinecap="round"
        />
      </svg>
      {/* Percentage Center Text */}
      <span className="absolute text-xs font-black text-slate-100">{progress}%</span>
    </div>
  );
}

export default { GoalProgressBar, GoalProgressRing };
