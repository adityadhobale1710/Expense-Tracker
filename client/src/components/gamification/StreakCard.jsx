import { useState, useEffect } from 'react';
import { useGamification } from '../../context/GamificationContext';
import api from '../../services/api';

// Build a 49-cell (7×7) empty heatmap for the error/loading fallback
// — all cells inactive, no fabricated data.
function emptyHeatmap() {
  const today = new Date();
  const grid = [];
  for (let i = 48; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    grid.push({ date: d.toISOString().slice(0, 10), active: false, today: i === 0 });
  }
  return grid;
}

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function StreakCard() {
  const { streak, longestStreak } = useGamification();

  const [heatmap, setHeatmap] = useState(null); // null = loading
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data } = await api.get('/gamification/stats');
        if (cancelled) return;
        if (data.success && Array.isArray(data.data?.activityHeatmap)) {
          setHeatmap(data.data.activityHeatmap);
        } else {
          setHeatmap(emptyHeatmap());
          setFetchError(true);
        }
      } catch {
        if (!cancelled) {
          setHeatmap(emptyHeatmap());
          setFetchError(true);
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // Chunk flat 49-item array into 7 columns of 7
  const weeks = heatmap
    ? Array.from({ length: 7 }, (_, w) => heatmap.slice(w * 7, w * 7 + 7))
    : [];

  const milestones = [7, 14, 30, 60, 100];
  const nextMilestone = milestones.find(m => m > streak) || milestones[milestones.length - 1];
  const milestonePct = Math.min((streak / nextMilestone) * 100, 100);

  return (
    <div className="card bg-dark-800 border border-slate-700/50 rounded-2xl p-6 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl animate-pulse">🔥</span>
            <h3 className="text-base font-black text-slate-100">Streak Tracker</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">Log transactions daily to keep your streak alive</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-extrabold text-orange-400 font-mono leading-none">{streak}</p>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">day streak</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3 text-center">
          <p className="text-xs text-slate-500 uppercase font-bold tracking-wide">Current</p>
          <p className="text-lg font-extrabold text-orange-400 font-mono mt-0.5">{streak}d</p>
        </div>
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3 text-center">
          <p className="text-xs text-slate-500 uppercase font-bold tracking-wide">Best Ever</p>
          <p className="text-lg font-extrabold text-emerald-400 font-mono mt-0.5">{longestStreak}d</p>
        </div>
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3 text-center">
          <p className="text-xs text-slate-500 uppercase font-bold tracking-wide">Next Goal</p>
          <p className="text-lg font-extrabold text-indigo-400 font-mono mt-0.5">{nextMilestone}d</p>
        </div>
      </div>

      {/* Next milestone progress */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-bold text-slate-400">
          <span>Progress to {nextMilestone}-day streak</span>
          <span className="font-mono">{streak}/{nextMilestone}</span>
        </div>
        <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-700"
            style={{ width: `${milestonePct}%` }}
          />
        </div>
        {streak >= nextMilestone && (
          <p className="text-xs text-amber-400 font-bold text-center">
            🎉 +50 Bonus XP unlocked at this milestone!
          </p>
        )}
      </div>

      {/* GitHub-style heatmap */}
      <div className="min-h-[120px]">
        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">7-Week Activity</p>

        {/* Loading spinner */}
        {heatmap === null && (
          <div className="flex justify-center items-center h-[52px]">
            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Heatmap grid (shown once loaded — real data or empty-on-error) */}
        {heatmap !== null && (
          <>
            <div className="flex gap-1">
              {/* Day labels column */}
              <div className="flex flex-col gap-1 pr-1">
                {WEEKDAY_LABELS.map((label, i) => (
                  <span key={i} className="text-xs text-slate-600 font-bold h-3 flex items-center">{label}</span>
                ))}
              </div>

              {/* Heatmap grid */}
              <div className="flex gap-1 flex-1 overflow-x-auto">
                {weeks.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-1">
                    {week.map((day, di) => (
                      <div
                        key={di}
                        title={`${day.date}: ${day.active ? 'Active' : 'No activity'}`}
                        className={`w-3 h-3 rounded-sm transition-all ${
                          day.today
                            ? 'bg-indigo-500 ring-1 ring-indigo-400 ring-offset-1 ring-offset-slate-900'
                            : day.active
                            ? 'bg-emerald-500/80 hover:bg-emerald-400'
                            : 'bg-slate-800 hover:bg-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-2 mt-2 justify-end">
              <span className="text-xs text-slate-600">Less</span>
              <div className="flex gap-0.5">
                {['bg-slate-800', 'bg-emerald-900', 'bg-emerald-700', 'bg-emerald-500', 'bg-emerald-400'].map((c, i) => (
                  <div key={i} className={`w-2.5 h-2.5 rounded-sm ${c}`} />
                ))}
              </div>
              <span className="text-xs text-slate-600">More</span>
            </div>

            {fetchError && (
              <p className="text-xs text-slate-500 text-center mt-1">
                Activity data unavailable — connect to sync your real history.
              </p>
            )}
          </>
        )}
      </div>

      {/* Milestone badges */}
      <div className="flex gap-2 flex-wrap">
        {milestones.map(m => (
          <span
            key={m}
            className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
              streak >= m
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                : 'bg-slate-900/30 border-slate-800 text-slate-600'
            }`}
          >
            {streak >= m ? '✓' : '○'} {m}d
          </span>
        ))}
      </div>
    </div>
  );
}
