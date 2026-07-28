export const PRESET_COLORS = [
  { name: 'Indigo', hex: '#6366f1', text: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
  { name: 'Emerald', hex: '#10b981', text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  { name: 'Amber', hex: '#f59e0b', text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  { name: 'Rose', hex: '#f43f5e', text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
  { name: 'Violet', hex: '#8b5cf6', text: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
  { name: 'Cyan', hex: '#06b6d4', text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' }
];

export const SUGGESTED_ICONS = [
  { char: '🛡️', label: 'Emergency Fund' },
  { char: '🏖️', label: 'Vacation' },
  { char: '🏠', label: 'House' },
  { char: '🚗', label: 'Car' },
  { char: '🎓', label: 'Education' },
  { char: '💻', label: 'Laptop' },
  { char: '📱', label: 'Phone' },
  { char: '💍', label: 'Wedding' },
  { char: '🎮', label: 'Gaming' },
  { char: '✈️', label: 'Travel' },
  { char: '📈', label: 'Investment' },
  { char: '💼', label: 'Business' }
];

export const GOAL_CATEGORIES = [
  'Vacation',
  'Emergency Fund',
  'House',
  'Vehicle',
  'Education',
  'Investment',
  'Electronics',
  'Wedding',
  'Business',
  'Other'
];

export const getProgressColor = (pct) => {
  if (pct >= 100) return '#eab308'; // Gold 100%
  if (pct >= 80) return '#3b82f6';  // Blue 80-99%
  if (pct >= 50) return '#eab308';  // Yellow 50-80%
  return '#10b981';                 // Green 0-50%
};

export const getPriorityBadgeClass = (priority) => {
  switch (priority) {
    case 'High':
      return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
    case 'Medium':
      return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    case 'Low':
      return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    default:
      return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
  }
};

export const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'Active':
      return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    case 'Completed':
      return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
    case 'Paused':
      return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    case 'Expired':
      return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
    case 'Archived':
      return 'bg-slate-700/30 text-slate-400 border border-slate-700/50';
    default:
      return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
  }
};

export default {
  PRESET_COLORS,
  SUGGESTED_ICONS,
  GOAL_CATEGORIES,
  getProgressColor,
  getPriorityBadgeClass,
  getStatusBadgeClass
};
