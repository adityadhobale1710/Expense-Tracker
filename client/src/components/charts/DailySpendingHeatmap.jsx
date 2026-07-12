import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, Flame, Award, Clock } from 'lucide-react';

export default function DailySpendingHeatmap({ heatmapData = [], currencySymbol = '₹' }) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [hoveredCell, setHoveredCell] = useState(null);

  const availableYears = useMemo(() => {
    if (!heatmapData || heatmapData.length === 0) return [currentYear];
    const years = heatmapData.map(item => new Date(item._id).getFullYear());
    const uniqueYears = [...new Set(years)].sort((a, b) => b - a);
    return uniqueYears.includes(currentYear) ? uniqueYears : [currentYear, ...uniqueYears];
  }, [heatmapData, currentYear]);

  // Generate 53 weeks aligned to selected year (January 1st to December 31st)
  const grid = useMemo(() => {
    const weeks = [];
    const startDate = new Date(selectedYear, 0, 1);
    
    // Align starting day to the Sunday of that week
    const startDayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - startDayOfWeek);

    const currentDate = new Date(startDate);
    
    // We construct 53 weeks (371 days) to cover the full calendar year safely
    for (let week = 0; week < 53; week++) {
      const weekDays = [];
      for (let day = 0; day < 7; day++) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const record = heatmapData?.find((item) => item._id === dateStr) || { amount: 0, count: 0 };
        
        weekDays.push({
          date: new Date(currentDate),
          dateStr,
          amount: record.amount,
          count: record.count,
          inYear: currentDate.getFullYear() === selectedYear
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
      weeks.push(weekDays);
    }
    return weeks;
  }, [selectedYear, heatmapData]);

  // Calculate annual statistics for the sub-panels
  const annualStats = useMemo(() => {
    const yearRecords = heatmapData.filter(item => new Date(item._id).getFullYear() === selectedYear);
    const totalSpent = yearRecords.reduce((sum, item) => sum + item.amount, 0);
    const activeDays = yearRecords.filter(item => item.amount > 0).length;
    
    const peakRecord = yearRecords.length > 0 
      ? [...yearRecords].sort((a, b) => b.amount - a.amount)[0] 
      : null;

    return {
      totalSpent,
      activeDays,
      peakDay: peakRecord ? { date: new Date(peakRecord._id), amount: peakRecord.amount } : null,
      avgDailySpent: activeDays > 0 ? totalSpent / 365 : 0
    };
  }, [selectedYear, heatmapData]);

  const getColorClass = (amount, inYear) => {
    if (!inYear) return 'opacity-10 dark:opacity-5'; // cell outside the current selected year
    if (amount === 0) return 'bg-slate-200 dark:bg-dark-900/40 border border-slate-300 dark:border-slate-800/60';
    if (amount <= 1000) return 'bg-indigo-100 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/40';
    if (amount <= 5000) return 'bg-indigo-300 dark:bg-indigo-800/40 border border-indigo-400 dark:border-indigo-700/40';
    if (amount <= 15000) return 'bg-indigo-500/80 dark:bg-indigo-600/50 border border-indigo-650 dark:border-indigo-550';
    return 'bg-indigo-700 dark:bg-primary-500 border border-indigo-800 dark:border-primary-400 shadow-[0_0_8px_rgba(99,102,241,0.25)]';
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Label month shifts horizontally
  const monthLabels = useMemo(() => {
    const labels = [];
    let prevMonth = -1;
    grid.forEach((week, weekIndex) => {
      const firstDayOfWeek = week[0].date;
      if (week[0].inYear) {
        const month = firstDayOfWeek.getMonth();
        if (month !== prevMonth && weekIndex % 4 === 0) {
          labels.push({ name: monthNames[month], index: weekIndex });
          prevMonth = month;
        }
      }
    });
    return labels;
  }, [grid]);

  return (
    <div className="flex flex-col p-6 bg-dark-800/80 border border-slate-700/60 rounded-3xl shadow-xl space-y-6">
      
      {/* Header controls row */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Annual Activity Heatmap</h3>
          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">GitHub-style activity calendar detailing spending frequency and density</p>
        </div>

        {/* Year Selector */}
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          className="px-3.5 py-2.5 text-xs bg-dark-900 border border-slate-850/80 rounded-xl text-slate-350 focus:outline-none focus:border-primary-500 cursor-pointer font-bold shadow-sm"
        >
          {availableYears.map(yr => (
            <option key={yr} value={yr}>Year {yr}</option>
          ))}
        </select>
      </div>

      {/* Heatmap Grid Wrapper */}
      <div className="flex flex-col overflow-x-auto scrollbar-none pb-1 relative">
        
        {/* Month headers row */}
        <div className="flex pl-10 mb-2 h-4 relative">
          {monthLabels.map((lbl, idx) => (
            <span
              key={idx}
              className="text-[9px] font-bold text-slate-500 absolute"
              style={{ left: `${lbl.index * 13.5 + 40}px` }}
            >
              {lbl.name}
            </span>
          ))}
        </div>

        {/* Grid content */}
        <div className="flex gap-1 items-start">
          {/* Day column labels */}
          <div className="grid grid-rows-7 gap-[3.5px] pr-2 text-right select-none mt-0.5">
            {dayNames.map((day, idx) => (
              <span key={idx} className="text-[8px] font-bold text-slate-500 h-3 leading-3">
                {idx % 2 === 1 ? day : ''}
              </span>
            ))}
          </div>

          {/* Grid columns of weeks */}
          <div className="flex gap-[3.5px]">
            {grid.map((week, weekIdx) => (
              <div key={weekIdx} className="grid grid-rows-7 gap-[3.5px]">
                {week.map((cell, dayIdx) => (
                  <div
                    key={dayIdx}
                    onMouseEnter={() => cell.inYear && setHoveredCell(cell)}
                    onMouseLeave={() => setHoveredCell(null)}
                    className={`w-[10.5px] h-[10.5px] sm:w-[12px] sm:h-[12px] rounded-[2.5px] transition-transform duration-200 ${
                      cell.inYear ? 'cursor-pointer hover:scale-125' : 'pointer-events-none'
                    } ${getColorClass(cell.amount, cell.inYear)} relative`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Interactive Tooltip */}
        <div className="h-6 mt-4 flex items-center justify-between border-t border-slate-800/60 pt-3">
          <div className="text-[10px] font-bold text-slate-400">
            {hoveredCell ? (
              <span>
                {hoveredCell.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}:{' '}
                <span className="text-primary-400 font-black">{currencySymbol}{hoveredCell.amount.toLocaleString('en-IN')}</span> ({hoveredCell.count} invoices)
              </span>
            ) : (
              <span className="text-slate-500">Hover over cells to examine daily aggregates</span>
            )}
          </div>

          {/* Intensity Indicator Key */}
          <div className="flex items-center gap-1.5 text-[8px] font-bold text-slate-500">
            <span>Less</span>
            <div className="w-2.5 h-2.5 rounded-[2px] bg-slate-200 dark:bg-dark-900/40 border border-slate-350 dark:border-slate-800/60" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-indigo-100 dark:bg-indigo-950/40" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-indigo-300 dark:bg-indigo-800/40" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-indigo-500/80 dark:bg-indigo-600/50" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-indigo-700 dark:bg-primary-500" />
            <span>More</span>
          </div>
        </div>
      </div>

      {/* Sub-panels displaying annual stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 border-t border-slate-800/60 pt-4 text-xs font-semibold text-slate-350">
        
        {/* Total annual outlay */}
        <div className="p-3 bg-dark-900/40 border border-slate-850 rounded-2xl flex items-center gap-3">
          <div className="p-2 bg-dark-900 rounded-xl border border-slate-800">
            <CalendarDays size={14} className="text-primary-400" />
          </div>
          <div>
            <p className="text-[9px] text-slate-500 font-bold uppercase">Annual Spent</p>
            <p className="font-mono font-black text-slate-200 mt-0.5">
              {currencySymbol}{Math.round(annualStats.totalSpent).toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* Average daily spent */}
        <div className="p-3 bg-dark-900/40 border border-slate-850 rounded-2xl flex items-center gap-3">
          <div className="p-2 bg-dark-900 rounded-xl border border-slate-800">
            <Clock size={14} className="text-indigo-400" />
          </div>
          <div>
            <p className="text-[9px] text-slate-550 font-bold uppercase">Daily Avg</p>
            <p className="font-mono font-black text-slate-200 mt-0.5">
              {currencySymbol}{Math.round(annualStats.avgDailySpent).toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* Active spent days */}
        <div className="p-3 bg-dark-900/40 border border-slate-850 rounded-2xl flex items-center gap-3">
          <div className="p-2 bg-dark-900 rounded-xl border border-slate-800">
            <Flame size={14} className="text-orange-400" />
          </div>
          <div>
            <p className="text-[9px] text-slate-550 font-bold uppercase">Active Days</p>
            <p className="font-mono font-black text-slate-200 mt-0.5">
              {annualStats.activeDays} Days
            </p>
          </div>
        </div>

        {/* Peak spending day */}
        <div className="p-3 bg-dark-900/40 border border-slate-850 rounded-2xl flex items-center gap-3">
          <div className="p-2 bg-dark-900 rounded-xl border border-slate-800">
            <Award size={14} className="text-yellow-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] text-slate-550 font-bold uppercase">Peak Day</p>
            <p className="font-mono font-black text-slate-200 truncate mt-0.5">
              {annualStats.peakDay
                ? `${currencySymbol}${Math.round(annualStats.peakDay.amount).toLocaleString()} (${annualStats.peakDay.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})`
                : 'No data'}
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
