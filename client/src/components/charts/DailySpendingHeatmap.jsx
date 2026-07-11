import { useState } from 'react';
import { motion } from 'framer-motion';

export default function DailySpendingHeatmap({ heatmapData }) {
  const [hoveredCell, setHoveredCell] = useState(null);

  // Generate 53 weeks (Sunday to Saturday rows) for the last 365 days
  const getCalendarGrid = () => {
    const grid = [];
    const today = new Date();
    
    // Align starting day to 364 days ago (52 weeks + current week days)
    const startDate = new Date();
    startDate.setDate(today.getDate() - 364);
    
    // Find the Sunday of that week to align rows
    const startDayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - startDayOfWeek);

    const currentDate = new Date(startDate);
    
    // Populate weeks
    for (let week = 0; week < 53; week++) {
      const weekDays = [];
      for (let day = 0; day < 7; day++) {
        const dateStr = currentDate.toISOString().split('T')[0];
        // Match with database aggregates
        const record = heatmapData?.find((item) => item._id === dateStr) || { amount: 0, count: 0 };
        
        weekDays.push({
          date: new Date(currentDate),
          dateStr,
          amount: record.amount,
          count: record.count
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
      grid.push(weekDays);
    }
    return grid;
  };

  const getColorClass = (amount) => {
    if (amount === 0) return 'bg-slate-200 dark:bg-dark-900/40 border border-slate-300 dark:border-slate-800/60';
    if (amount <= 1000) return 'bg-indigo-100 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/40 text-indigo-400';
    if (amount <= 5000) return 'bg-indigo-300 dark:bg-indigo-800/40 border border-indigo-400 dark:border-indigo-700/40 text-indigo-200';
    if (amount <= 15000) return 'bg-indigo-500 dark:bg-indigo-600/50 border border-indigo-650 dark:border-indigo-550 text-white';
    return 'bg-indigo-700 dark:bg-primary-500 border border-indigo-800 dark:border-primary-400 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]';
  };

  const grid = getCalendarGrid();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Label month shifts horizontally
  const getMonthLabels = () => {
    const labels = [];
    let prevMonth = -1;
    grid.forEach((week, weekIndex) => {
      const firstDayOfWeek = week[0].date;
      const month = firstDayOfWeek.getMonth();
      if (month !== prevMonth && weekIndex % 4 === 0) {
        labels.push({ name: monthNames[month], index: weekIndex });
        prevMonth = month;
      }
    });
    return labels;
  };

  const monthLabels = getMonthLabels();

  return (
    <div className="flex flex-col p-6 bg-dark-800/80 border border-slate-700/60 rounded-3xl shadow-xl space-y-4">
      <div>
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Annual Spending Heatmap</h3>
        <p className="text-[10px] text-slate-500 font-semibold mt-0.5">GitHub-style activity calendar detailing spending frequency</p>
      </div>

      <div className="flex flex-col overflow-x-auto scrollbar-none pb-2 relative">
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

        {/* Heatmap Grid Content */}
        <div className="flex gap-1 items-start">
          {/* Day column indicators */}
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
                    onMouseEnter={() => setHoveredCell(cell)}
                    onMouseLeave={() => setHoveredCell(null)}
                    className={`w-[10.5px] h-[10.5px] sm:w-[12px] sm:h-[12px] rounded-[2.5px] transition-transform duration-200 cursor-pointer ${getColorClass(
                      cell.amount
                    )} hover:scale-125 relative`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Tooltip Float */}
        <div className="h-6 mt-4 flex items-center justify-between border-t border-slate-800/60 pt-3">
          <div className="text-[10px] font-bold text-slate-400">
            {hoveredCell ? (
              <span>
                {hoveredCell.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}:{' '}
                <span className="text-primary-400 font-black">₹{hoveredCell.amount.toLocaleString('en-IN')}</span> ({hoveredCell.count} items)
              </span>
            ) : (
              <span className="text-slate-500">Hover over boxes to view details</span>
            )}
          </div>

          {/* Intensity Key */}
          <div className="flex items-center gap-1.5 text-[8px] font-bold text-slate-500">
            <span>Less</span>
            <div className="w-2.5 h-2.5 rounded-[2px] bg-slate-200 dark:bg-dark-900/40 border border-slate-350 dark:border-slate-800/60" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-indigo-100 dark:bg-indigo-950/40" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-indigo-300 dark:bg-indigo-800/40" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-indigo-500 dark:bg-indigo-600/50" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-indigo-700 dark:bg-primary-500" />
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  );
}
