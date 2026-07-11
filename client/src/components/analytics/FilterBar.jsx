import { useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react';

const presetRanges = ['Week', 'Month', 'Year', 'Custom'];

export default function FilterBar({ timeframe, setTimeframe, startDate, setStartDate, endDate, setEndDate }) {
  
  // Set date ranges automatically when timeframe changes (except custom)
  useEffect(() => {
    if (timeframe === 'Custom') return;
    
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (timeframe === 'Week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday start
      start = new Date(now.setDate(diff));
      start.setHours(0,0,0,0);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23,59,59,999);
    } else if (timeframe === 'Month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (timeframe === 'Year') {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    }

    setStartDate(start);
    setEndDate(end);
  }, [timeframe, setStartDate, setEndDate]);

  // Adjust dates back/forward by timeframe size
  const handleStepDate = (direction) => {
    const step = direction === 'next' ? 1 : -1;
    const newStart = new Date(startDate);
    const newEnd = new Date(endDate);

    if (timeframe === 'Week') {
      newStart.setDate(startDate.getDate() + step * 7);
      newEnd.setDate(endDate.getDate() + step * 7);
    } else if (timeframe === 'Month') {
      newStart.setMonth(startDate.getMonth() + step);
      // set to last day of that new month
      newEnd.setMonth(startDate.getMonth() + step + 1);
      newEnd.setDate(0);
    } else if (timeframe === 'Year') {
      newStart.setFullYear(startDate.getFullYear() + step);
      newEnd.setFullYear(endDate.getFullYear() + step);
    } else {
      // For custom, shift by the exact difference in days
      const diffTime = Math.abs(endDate - startDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
      newStart.setDate(startDate.getDate() + step * diffDays);
      newEnd.setDate(endDate.getDate() + step * diffDays);
    }

    setStartDate(newStart);
    setEndDate(newEnd);
  };

  const handleResetToToday = () => {
    setTimeframe('Month');
  };

  const formatDateLabel = () => {
    if (!startDate || !endDate) return '';
    const opt = { month: 'short', day: 'numeric', year: 'numeric' };
    if (timeframe === 'Year') return startDate.getFullYear().toString();
    if (timeframe === 'Month') return startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    return `${startDate.toLocaleDateString('en-US', opt)} - ${endDate.toLocaleDateString('en-US', opt)}`;
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-dark-800/80 border border-slate-700/60 rounded-2xl backdrop-blur-md transition-all shadow-lg">
      
      {/* Timeframe Presets */}
      <div className="flex items-center gap-1.5 bg-dark-900/60 p-1.5 rounded-xl border border-slate-800">
        {presetRanges.map((preset) => (
          <button
            key={preset}
            onClick={() => setTimeframe(preset)}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              timeframe === preset
                ? 'bg-primary-500 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {preset}
          </button>
        ))}
      </div>

      {/* Date Navigation Controllers */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => handleStepDate('prev')}
          className="p-2 bg-dark-900 border border-slate-800 text-slate-300 hover:text-white rounded-xl hover:bg-slate-800/50 transition-all cursor-pointer"
          title="Previous Period"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="flex items-center gap-2 px-3 py-2 bg-dark-900 border border-slate-800 rounded-xl text-xs font-semibold text-slate-200 min-w-[140px] justify-center">
          <Calendar size={14} className="text-primary-400" />
          <span>{formatDateLabel()}</span>
        </div>

        <button
          onClick={() => handleStepDate('next')}
          className="p-2 bg-dark-900 border border-slate-800 text-slate-300 hover:text-white rounded-xl hover:bg-slate-800/50 transition-all cursor-pointer"
          title="Next Period"
        >
          <ChevronRight size={16} />
        </button>

        <button
          onClick={handleResetToToday}
          className="px-3.5 py-2 text-xs font-bold border border-slate-800 bg-dark-900 text-slate-300 hover:text-white rounded-xl hover:bg-slate-800/50 transition-all cursor-pointer"
        >
          Today
        </button>
      </div>

      {/* Custom Range Inputs */}
      {timeframe === 'Custom' && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={startDate ? startDate.toISOString().split('T')[0] : ''}
            onChange={(e) => setStartDate(new Date(e.target.value))}
            className="px-2.5 py-1.5 text-xs bg-dark-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-primary-500"
          />
          <span className="text-slate-500 text-xs font-bold">to</span>
          <input
            type="date"
            value={endDate ? endDate.toISOString().split('T')[0] : ''}
            onChange={(e) => setEndDate(new Date(e.target.value))}
            className="px-2.5 py-1.5 text-xs bg-dark-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-primary-500"
          />
        </div>
      )}
    </div>
  );
}
