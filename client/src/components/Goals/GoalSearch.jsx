import { Search } from 'lucide-react';

export default function GoalSearch({ value = '', onChange }) {
  return (
    <div className="relative flex-1">
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
        <Search size={16} className="text-slate-500" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search goals by title, notes or category..."
        className="w-full pl-10 pr-4 py-2.5 bg-dark-900/60 border border-slate-700/40 rounded-2xl text-xs font-semibold text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary-500/80 transition-colors"
      />
    </div>
  );
}
