import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useGamification } from '../../context/GamificationContext';


function MiniBar({ value, maxValue, color }) {
  const pct = maxValue > 0 ? Math.min((value / maxValue) * 100, 100) : 0;
  return (
    <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
      <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function XPAnalytics() {
  const { xp, lifetimeXP } = useGamification();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/gamification/stats');
        if (data.success) setStats(data.data);
      } catch {}
      finally { setLoading(false); }
    };
    load();
  }, []);

  const maxWeekly = 5000;

  if (loading) {
    return (
      <div className="py-8 flex justify-center">
        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats) return null;

  // Streak trend bars (7 days)
  const trend = stats.streakTrend || [0, 0, 0, 0, 0, 0, 0];
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date().getDay();
  const orderedLabels = Array.from({ length: 7 }, (_, i) => dayLabels[(today - 6 + i + 7) % 7]);

  return (
    <div className="space-y-6">
      {/* Top metrics grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'XP This Week',  value: (stats.xpThisWeek || 0).toLocaleString('en-IN'), icon: '📅', color: 'text-indigo-400' },
          { label: 'XP This Month', value: (stats.xpThisMonth || 0).toLocaleString('en-IN'), icon: '🗓️', color: 'text-violet-400' },
          { label: 'Top Activity',  value: (stats.topAction || 'N/A').replace(/_/g, ' ').toLowerCase(), icon: '🏅', color: 'text-amber-400' },
          { label: 'Badge Completion', value: `${stats.badgeCompletionPct || 0}%`, icon: '🏆', color: 'text-emerald-400' },
        ].map(s => (
          <div key={s.label} className="bg-dark-800 border border-slate-700/50 rounded-2xl p-4 flex items-center gap-3">
            <span className="text-2xl">{s.icon}</span>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{s.label}</p>
              <p className={`text-sm font-extrabold mt-0.5 capitalize ${s.color}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Weekly XP bar */}
      <div className="bg-dark-800 border border-slate-700/50 rounded-2xl p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="text-sm font-black text-slate-100 flex items-center gap-2">
            <span className="text-indigo-400">📈</span>
            Weekly XP Progress
          </h4>
          <span className="text-xs font-mono font-bold text-indigo-400">{(stats.xpThisWeek || 0).toLocaleString('en-IN')} / {maxWeekly.toLocaleString('en-IN')}</span>
        </div>
        <MiniBar value={stats.xpThisWeek || 0} maxValue={maxWeekly} color="bg-gradient-to-r from-indigo-500 to-emerald-500" />
        <p className="text-xs text-slate-500">Target: earn {maxWeekly.toLocaleString('en-IN')} XP this week</p>
      </div>

      {/* 7-day activity trend */}
      <div className="bg-dark-800 border border-slate-700/50 rounded-2xl p-5 space-y-4">
        <h4 className="text-sm font-black text-slate-100">7-Day Activity Trend</h4>
        <div className="flex items-end gap-1.5 h-20">
          {trend.map((active, i) => (
            <div key={i} className="flex flex-col items-center gap-1 flex-1">
              <div
                className={`w-full rounded-t-md transition-all duration-500 ${active ? 'bg-indigo-500' : 'bg-slate-800'}`}
                style={{ height: active ? '60px' : '10px' }}
              />
              <span className="text-xs text-slate-600 font-bold">{orderedLabels[i].slice(0, 2)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Lifetime vs seasonal XP */}
      <div className="bg-dark-800 border border-slate-700/50 rounded-2xl p-5 space-y-3">
        <h4 className="text-sm font-black text-slate-100">XP Breakdown</h4>
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-bold text-slate-400">
              <span>Lifetime XP (all seasons)</span>
              <span className="font-mono text-violet-400">{(lifetimeXP || stats.lifetimeXP || xp).toLocaleString('en-IN')}</span>
            </div>
            <MiniBar value={lifetimeXP || xp} maxValue={Math.max(lifetimeXP || xp, 1000)} color="bg-gradient-to-r from-violet-500 to-purple-500" />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-bold text-slate-400">
              <span>This Month's XP</span>
              <span className="font-mono text-indigo-400">{(stats.xpThisMonth || 0).toLocaleString('en-IN')}</span>
            </div>
            <MiniBar value={stats.xpThisMonth || 0} maxValue={Math.max(lifetimeXP || xp, stats.xpThisMonth || 1, 1)} color="bg-gradient-to-r from-indigo-500 to-sky-500" />
          </div>
        </div>
      </div>
    </div>
  );
}
