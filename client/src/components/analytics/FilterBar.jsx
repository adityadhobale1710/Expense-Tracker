import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, RefreshCw, CalendarDays } from 'lucide-react';

const presetRanges = ['Week', 'Month', 'Quarter', 'Year', 'Custom'];

export default function FilterBar({ timeframe, setTimeframe, startDate, setStartDate, endDate, setEndDate }) {
  const [showDatePicker, setShowDatePicker] = useState(false);

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
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (timeframe === 'Month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (timeframe === 'Quarter') {
      const quarter = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), quarter * 3, 1);
      end = new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59, 999);
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
      newEnd.setMonth(startDate.getMonth() + step + 1);
      newEnd.setDate(0);
    } else if (timeframe === 'Quarter') {
      newStart.setMonth(startDate.getMonth() + step * 3);
      newEnd.setMonth(startDate.getMonth() + (step * 3) + 3);
      newEnd.setDate(0);
    } else if (timeframe === 'Year') {
      newStart.setFullYear(startDate.getFullYear() + step);
      newEnd.setFullYear(endDate.getFullYear() + step);
    } else {
      // Shift by exact difference in days for custom
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
    if (timeframe === 'Quarter') {
      const q = Math.floor(startDate.getMonth() / 3) + 1;
      return `Q${q} ${startDate.getFullYear()}`;
    }
    return `${startDate.toLocaleDateString('en-US', opt)} - ${endDate.toLocaleDateString('en-US', opt)}`;
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-dark-800/85 border border-slate-700/60 rounded-3xl backdrop-blur-md transition-all shadow-xl">
      
      {/* Timeframe Presets Toggle Grid */}
      <div className="flex items-center gap-1 bg-dark-900/65 p-1 rounded-2xl border border-slate-850">
        {presetRanges.map((preset) => (
          <button
            key={preset}
            onClick={() => setTimeframe(preset)}
            className={`relative px-4 py-2 text-xs font-bold rounded-xl transition-all duration-350 cursor-pointer ${
              timeframe === preset
                ? 'bg-gradient-to-r from-primary-600 to-indigo-500 text-white shadow-md shadow-primary-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {timeframe === preset && (
              <motion.div
                layoutId="activeFilterPreset"
                className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-500 -z-10"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10">{preset}</span>
          </button>
        ))}
      </div>

      {/* Date Navigation / Actions */}
      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
        
        {/* Step Backward */}
        <button
          onClick={() => handleStepDate('prev')}
          className="p-2.5 bg-dark-900 border border-slate-850 text-slate-350 hover:text-white rounded-xl hover:bg-slate-800/50 transition-all cursor-pointer shadow-sm active:scale-95"
          title="Previous Period"
        >
          <ChevronLeft size={15} />
        </button>

        {/* Current Date Visualizer Trigger */}
        <button
          onClick={() => timeframe === 'Custom' && setShowDatePicker(!showDatePicker)}
          className={`flex items-center gap-2 px-4 py-2.5 bg-dark-900 border border-slate-850 rounded-xl text-xs font-bold text-slate-200 min-w-[160px] justify-center transition-all ${
            timeframe === 'Custom' ? 'hover:border-primary-500/50 hover:text-primary-300 cursor-pointer' : 'cursor-default'
          }`}
        >
          <CalendarIcon size={14} className="text-primary-400" />
          <span>{formatDateLabel()}</span>
        </button>

        {/* Step Forward */}
        <button
          onClick={() => handleStepDate('next')}
          className="p-2.5 bg-dark-900 border border-slate-850 text-slate-350 hover:text-white rounded-xl hover:bg-slate-800/50 transition-all cursor-pointer shadow-sm active:scale-95"
          title="Next Period"
        >
          <ChevronRight size={15} />
        </button>

        {/* Today/Reset button */}
        <button
          onClick={handleResetToToday}
          className="px-4 py-2.5 text-xs font-bold border border-slate-850 bg-dark-900 text-slate-300 hover:text-white rounded-xl hover:bg-slate-800/50 transition-all cursor-pointer shadow-sm"
        >
          Today
        </button>
      </div>

      {/* Custom Picker Modal / Floating Drawer */}
      <AnimatePresence>
        {timeframe === 'Custom' && showDatePicker && (
          <>
            <div className="fixed inset-0 z-45" onClick={() => setShowDatePicker(false)} />
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="absolute right-4 mt-16 p-5 bg-dark-800 border border-slate-700/80 rounded-3xl shadow-2xl z-50 space-y-4 backdrop-blur-md w-72"
            >
              <div className="flex items-center gap-2 border-b border-slate-700/40 pb-2.5">
                <CalendarDays size={14} className="text-primary-500" />
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Select Custom Window</h4>
              </div>
              <div className="space-y-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">From Date</label>
                  <input
                    type="date"
                    value={startDate ? startDate.toISOString().split('T')[0] : ''}
                    onChange={(e) => {
                      if(e.target.value) {
                        const d = new Date(e.target.value);
                        d.setHours(0, 0, 0, 0);
                        setStartDate(d);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs bg-dark-900 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-primary-500 font-semibold"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">To Date</label>
                  <input
                    type="date"
                    value={endDate ? endDate.toISOString().split('T')[0] : ''}
                    onChange={(e) => {
                      if(e.target.value) {
                        const d = new Date(e.target.value);
                        d.setHours(23, 59, 59, 999);
                        setEndDate(d);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs bg-dark-900 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-primary-500 font-semibold"
                  />
                </div>
              </div>
              <button
                onClick={() => setShowDatePicker(false)}
                className="w-full py-2 bg-gradient-to-r from-primary-600 to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-primary-550/10 cursor-pointer"
              >
                Apply Date Range
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
