import { useState, useMemo } from 'react';
import { CalendarDays, Flame, Award, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TODAY = new Date();

// Normalize a transaction date to a local "YYYY-MM-DD" key
const localDateKey = (date) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Intensity color scale indexed by bucket (0 = no activity)
const buildColorScale = (type) => {
  if (type === 'income') {
    return [
      'bg-dark-900/40 border border-slate-800/60',
      'bg-emerald-950/50 border border-emerald-900/40',
      'bg-emerald-800/50 border border-emerald-700/40',
      'bg-emerald-600/60 border border-emerald-500',
      'bg-emerald-500 border border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.25)]',
    ];
  }
  return [
    'bg-dark-900/40 border border-slate-800/60',
    'bg-indigo-950/50 border border-indigo-900/40',
    'bg-indigo-800/50 border border-indigo-700/40',
    'bg-indigo-600/60 border border-indigo-500',
    'bg-primary-500 border border-primary-400 shadow-[0_0_8px_rgba(99,102,241,0.25)]',
  ];
};

export default function MonthlyHeatmap({
  transactions = [],
  title = 'Monthly Heatmap',
  subtitle = 'Daily activity for the selected month',
  type = 'spending',
  currencySymbol = '₹',
}) {
  const isIncome = type === 'income';

  const [viewYear, setViewYear] = useState(TODAY.getFullYear());
  const [viewMonth, setViewMonth] = useState(TODAY.getMonth()); // 0-indexed
  const [hoveredCell, setHoveredCell] = useState(null);

  // Group transactions by local calendar date
  const groupedByDay = useMemo(() => {
    const map = {};
    (transactions || []).forEach((tx) => {
      const key = localDateKey(tx.date);
      if (!key) return;
      const amount = Number(tx.amount) || 0;
      if (!map[key]) map[key] = { total: 0, count: 0 };
      map[key].total += amount;
      map[key].count += 1;
    });
    return map;
  }, [transactions]);

  const firstDayOffset = new Date(viewYear, viewMonth, 1).getDay(); // Sunday = 0
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const monthKey = (day) =>
    `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  // 7-column calendar grid (Sunday-first), padded to full weeks
  const grid = useMemo(() => {
    const cells = [];
    for (let i = 0; i < firstDayOffset; i++) {
      cells.push(null); // blank leading cells
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const key = monthKey(day);
      const rec = groupedByDay[key] || { total: 0, count: 0 };
      cells.push({
        date: new Date(viewYear, viewMonth, day),
        day,
        dateKey: key,
        amount: rec.total,
        count: rec.count,
      });
    }
    while (cells.length % 7 !== 0) cells.push(null); // pad trailing cells
    return [...Array(Math.ceil(cells.length / 7))].map((_, i) => cells.slice(i * 7, i * 7 + 7));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewYear, viewMonth, firstDayOffset, daysInMonth, groupedByDay]);

  // Month statistics for the sub-panels
  const monthStats = useMemo(() => {
    let total = 0;
    let activeDays = 0;
    let peakDay = null;
    let maxDaily = 0;

    grid.forEach((week) => {
      (week || []).forEach((cell) => {
        if (!cell || cell.amount <= 0) return;
        total += cell.amount;
        activeDays += 1;
        if (cell.amount > maxDaily) {
          maxDaily = cell.amount;
          peakDay = cell;
        }
      });
    });

    return {
      total,
      activeDays,
      peakDay,
      avgDaily: activeDays > 0 ? total / daysInMonth : 0,
    };
  }, [grid, daysInMonth]);

  // Intensity bucket for a single day amount (relative to the month's peak)
  const getIntensity = (amount) => {
    if (amount <= 0) return 0;
    const peak = monthStats.peakDay?.amount || 0;
    if (peak <= 0) return 0;
    const ratio = amount / peak;
    if (ratio >= 0.75) return 4;
    if (ratio >= 0.5) return 3;
    if (ratio >= 0.25) return 2;
    return 1;
  };

  const scale = buildColorScale(isIncome ? 'income' : 'spending');

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
    setHoveredCell(null);
  };

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
    setHoveredCell(null);
  };

  const accLabel = isIncome ? 'Income' : 'Spending';
  const accent = isIncome ? 'text-emerald-400' : 'text-primary-400';

  return (
    <div className="flex flex-col p-5 bg-dark-800/80 border border-slate-700/60 rounded-2xl shadow-xl space-y-4">
      {/* Header controls row */}
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">{title}</h3>
          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{subtitle}</p>
        </div>

        {/* Month / Year navigation */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={goPrevMonth}
            aria-label="Previous month"
            className="p-2 bg-dark-900 border border-slate-800/80 rounded-xl text-slate-300 hover:text-slate-100 hover:border-primary-500 focus:outline-none transition-colors cursor-pointer"
          >
            <ChevronLeft size={14} />
          </button>

          <select
            value={viewMonth}
            onChange={(e) => setViewMonth(parseInt(e.target.value))}
            className="px-2.5 py-2 text-xs bg-dark-900 border border-slate-800/80 rounded-xl text-slate-300 focus:outline-none focus:border-primary-500 cursor-pointer font-bold shadow-sm"
          >
            {MONTH_NAMES.map((name, idx) => (
              <option key={name} value={idx}>
                {name}
              </option>
            ))}
          </select>

          <select
            value={viewYear}
            onChange={(e) => setViewYear(parseInt(e.target.value))}
            className="px-2.5 py-2 text-xs bg-dark-900 border border-slate-800/80 rounded-xl text-slate-300 focus:outline-none focus:border-primary-500 cursor-pointer font-bold shadow-sm"
          >
            {[...Array(21)].map((_, i) => {
              const y = TODAY.getFullYear() - 6 + i;
              return (
                <option key={y} value={y}>
                  {y}
                </option>
              );
            })}
          </select>

          <button
            onClick={goNextMonth}
            aria-label="Next month"
            className="p-2 bg-dark-900 border border-slate-800/80 rounded-xl text-slate-300 hover:text-slate-100 hover:border-primary-500 focus:outline-none transition-colors cursor-pointer"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="flex flex-col overflow-x-auto scrollbar-none pb-1">
        {/* Day header row */}
        <div className="grid grid-cols-7 gap-1 mb-1.5">
          {DAY_NAMES.map((day) => (
            <div
              key={day}
              className="text-center text-[9px] font-bold text-slate-500 uppercase tracking-wider"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar body */}
        <div className="grid grid-cols-7 gap-1">
          {grid.flat().map((cell, idx) => {
            if (!cell) {
              return <div key={`blank-${idx}`} className="h-9 sm:h-11 rounded-lg" />;
            }
            const intensity = getIntensity(cell.amount);
            const isToday =
              cell.dateKey ===
              `${TODAY.getFullYear()}-${String(TODAY.getMonth() + 1).padStart(2, '0')}-${String(TODAY.getDate()).padStart(2, '0')}`;

            return (
              <div
                key={cell.dateKey}
                onMouseEnter={() => setHoveredCell(cell)}
                onMouseLeave={() => setHoveredCell(null)}
                className={`relative h-9 sm:h-11 rounded-lg flex flex-col items-center justify-center transition-transform duration-200 cursor-pointer hover:scale-105 ${
                  intensity > 0
                    ? scale[intensity]
                    : 'bg-dark-900/40 border border-slate-800/60'
                } ${isToday ? 'ring-1 ring-slate-300/60' : ''}`}
              >
                <span className={`text-[10px] sm:text-xs font-bold ${
                  intensity > 0 ? 'text-slate-100' : 'text-slate-500'
                }`}>
                  {cell.day}
                </span>
                {cell.amount > 0 && (
                  <span className={`text-[8px] sm:text-[9px] font-mono font-semibold ${isIncome ? 'text-emerald-200' : 'text-indigo-200'}`}>
                    {currencySymbol}{Math.round(cell.amount).toLocaleString('en-IN')}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Dynamic tooltip + intensity key */}
      <div className="h-6 flex items-center justify-between border-t border-slate-800/60 pt-3">
        <div className="text-[10px] font-bold text-slate-400 min-w-0">
          {hoveredCell ? (
            <span>
              {hoveredCell.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}:{' '}
              <span className={`${accent} font-black`}>
                {currencySymbol}{hoveredCell.amount.toLocaleString('en-IN')}
              </span>{' '}
              <span className="text-slate-500">({hoveredCell.count} {hoveredCell.count === 1 ? 'transaction' : 'transactions'})</span>
            </span>
          ) : (
            <span className="text-slate-500">Hover over days to examine daily aggregates</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[8px] font-bold text-slate-500 flex-shrink-0">
          <span>Less</span>
          <div className="w-2.5 h-2.5 rounded-[2px] bg-dark-900/40 border border-slate-800/60" />
          {scale.slice(1).map((cls, idx) => (
            <div key={idx} className={`w-2.5 h-2.5 rounded-[2px] ${cls}`} />
          ))}
          <span>More</span>
        </div>
      </div>

      {/* Sub-panels displaying monthly stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 border-t border-slate-800/60 pt-4 text-xs font-semibold text-slate-300">
        <div className="p-3 bg-dark-900/40 border border-slate-800 rounded-2xl flex items-center gap-3">
          <div className="p-2 bg-dark-900 rounded-xl border border-slate-800">
            <CalendarDays size={14} className={isIncome ? 'text-emerald-400' : 'text-primary-400'} />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] text-slate-500 font-bold uppercase">Monthly {accLabel}</p>
            <p className="font-mono font-black text-slate-200 mt-0.5 truncate">
              {currencySymbol}{Math.round(monthStats.total).toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        <div className="p-3 bg-dark-900/40 border border-slate-800 rounded-2xl flex items-center gap-3">
          <div className="p-2 bg-dark-900 rounded-xl border border-slate-800">
            <Clock size={14} className={isIncome ? 'text-emerald-400' : 'text-indigo-400'} />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] text-slate-500 font-bold uppercase">Daily Avg</p>
            <p className="font-mono font-black text-slate-200 mt-0.5 truncate">
              {currencySymbol}{Math.round(monthStats.avgDaily).toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        <div className="p-3 bg-dark-900/40 border border-slate-800 rounded-2xl flex items-center gap-3">
          <div className="p-2 bg-dark-900 rounded-xl border border-slate-800">
            <Flame size={14} className={isIncome ? 'text-emerald-400' : 'text-orange-400'} />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] text-slate-500 font-bold uppercase">Active Days</p>
            <p className="font-mono font-black text-slate-200 mt-0.5">
              {monthStats.activeDays} Days
            </p>
          </div>
        </div>

        <div className="p-3 bg-dark-900/40 border border-slate-800 rounded-2xl flex items-center gap-3">
          <div className="p-2 bg-dark-900 rounded-xl border border-slate-800">
            <Award size={14} className={isIncome ? 'text-emerald-400' : 'text-yellow-400'} />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] text-slate-500 font-bold uppercase">Peak Day</p>
            <p className="font-mono font-black text-slate-200 truncate mt-0.5">
              {monthStats.peakDay
                ? `${currencySymbol}${Math.round(monthStats.peakDay.amount).toLocaleString()} (${monthStats.peakDay.day})`
                : 'No data'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}