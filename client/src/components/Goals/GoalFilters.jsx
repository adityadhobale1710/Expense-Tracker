import { GOAL_CATEGORIES } from '../../utils/goalHelpers';

export default function GoalFilters({
  filters = {},
  onChange,
  onClear
}) {
  const statusOptions = ['All', 'Active', 'Completed', 'Paused', 'Expired', 'Archived'];
  const priorityOptions = ['All', 'High', 'Medium', 'Low'];
  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'highest_progress', label: 'Highest Progress' },
    { value: 'lowest_progress', label: 'Lowest Progress' },
    { value: 'nearest_deadline', label: 'Nearest Deadline' },
    { value: 'largest_target', label: 'Largest Target' },
    { value: 'completed_first', label: 'Completed First' }
  ];

  const handleSelect = (key, val) => {
    onChange({ ...filters, [key]: val === 'All' ? '' : val });
  };

  const hasActiveFilters = filters.status || filters.category || filters.priority || filters.search;

  return (
    <div className="flex flex-wrap items-center gap-3 bg-dark-800/40 p-4 border border-slate-700/30 rounded-3xl backdrop-blur-sm">
      {/* Status Filter */}
      <div className="flex flex-col space-y-1">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</label>
        <select
          value={filters.status || 'All'}
          onChange={(e) => handleSelect('status', e.target.value)}
          className="px-3 py-1.5 bg-dark-900 border border-slate-700/40 rounded-xl text-xs text-slate-200 font-semibold focus:outline-none focus:border-primary-500"
        >
          {statusOptions.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      {/* Category Filter */}
      <div className="flex flex-col space-y-1">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Category</label>
        <select
          value={filters.category || 'All'}
          onChange={(e) => handleSelect('category', e.target.value)}
          className="px-3 py-1.5 bg-dark-900 border border-slate-700/40 rounded-xl text-xs text-slate-200 font-semibold focus:outline-none focus:border-primary-500"
        >
          <option value="All">All Categories</option>
          {GOAL_CATEGORIES.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      {/* Priority Filter */}
      <div className="flex flex-col space-y-1">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Priority</label>
        <select
          value={filters.priority || 'All'}
          onChange={(e) => handleSelect('priority', e.target.value)}
          className="px-3 py-1.5 bg-dark-900 border border-slate-700/40 rounded-xl text-xs text-slate-200 font-semibold focus:outline-none focus:border-primary-500"
        >
          {priorityOptions.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      {/* Sorting */}
      <div className="flex flex-col space-y-1 ml-0 sm:ml-auto">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sort By</label>
        <select
          value={filters.sort || 'newest'}
          onChange={(e) => onChange({ ...filters, sort: e.target.value })}
          className="px-3 py-1.5 bg-dark-900 border border-slate-700/40 rounded-xl text-xs text-slate-200 font-semibold focus:outline-none focus:border-primary-500"
        >
          {sortOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <button
          onClick={onClear}
          className="mt-4 sm:mt-0 text-xs font-bold text-slate-400 hover:text-slate-200 uppercase tracking-wider px-3 py-2 bg-dark-900 border border-slate-700/30 rounded-xl hover:border-slate-600 transition-colors"
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}
