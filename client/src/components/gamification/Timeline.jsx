import { useState, useEffect } from 'react';
import api from '../../services/api';

function groupByDate(history) {
  const groups = {};
  history.forEach(event => {
    const date = event.timestamp
      ? new Date(event.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'Unknown';
    if (!groups[date]) groups[date] = [];
    groups[date].push(event);
  });
  return groups;
}

const ACTION_ICONS = {
  ADD_EXPENSE: '📝', ADD_INCOME: '💵', CREATE_BUDGET: '🧱', STAY_DAILY_BUDGET: '🛡️',
  DAILY_LOGIN: '👋', COMPLETE_CHALLENGE: '⚡', ADD_GOAL: '🎯', GOAL_COMPLETED: '🏆',
  ADD_INVESTMENT: '📈', ADD_WALLET: '👛', WALLET_TRANSFER: '↔️', ADD_LOAN: '🏛️',
  PAYOFF_LOAN: '✅', MAINTAIN_STREAK: '🔥', EXPORT_REPORTS: '📄', VIEW_ANALYTICS: '📊',
};

export default function Timeline() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/gamification/history?page=${p}&limit=15`);
      if (data.success) {
        setHistory(prev => p === 1 ? data.data.history : [...prev, ...data.data.history]);
        setTotalPages(data.data.pages);
        setPage(p);
      }
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(1); }, []);

  const grouped = groupByDate(history);
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const formatDate = (dateStr) => {
    if (dateStr === today) return 'Today';
    if (dateStr === yesterday) return 'Yesterday';
    return dateStr;
  };

  if (loading && history.length === 0) {
    return (
      <div className="py-16 flex flex-col items-center gap-3 text-slate-500">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold">Loading your timeline...</p>
      </div>
    );
  }

  if (!loading && history.length === 0) {
    return (
      <div className="py-16 text-center space-y-2 text-slate-500">
        <p className="text-3xl">📜</p>
        <p className="text-sm font-bold">No XP history yet</p>
        <p className="text-xs">Start earning XP by adding expenses, completing challenges, and more!</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {Object.entries(grouped).map(([date, events]) => (
        <div key={date} className="space-y-3">
          {/* Date group header */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap px-2">
              {formatDate(date)}
            </span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          {/* Events */}
          <div className="space-y-2 relative">
            {/* Vertical line */}
            <div className="absolute left-5 top-4 bottom-4 w-px bg-slate-800" />

            {events.map((event, i) => (
              <div key={i} className="flex items-start gap-4 pl-2">
                {/* Node */}
                <div className="relative z-10 flex-shrink-0 w-7 h-7 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center text-sm mt-0.5">
                  {ACTION_ICONS[event.action] || '✨'}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 bg-slate-900/20 border border-slate-800/50 rounded-xl px-3.5 py-2.5 hover:border-slate-700/50 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-slate-200 capitalize truncate">
                      {event.description || (event.action || '').replace(/_/g, ' ').toLowerCase()}
                    </p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {event.xp > 0 && (
                        <span className="text-[10px] font-extrabold text-indigo-400">+{event.xp} XP</span>
                      )}
                      {event.coins > 0 && (
                        <span className="text-[10px] font-extrabold text-yellow-500">+{event.coins}🪙</span>
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-600 mt-0.5 font-medium">
                    {event.timestamp ? new Date(event.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Load more */}
      {page < totalPages && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => load(page + 1)}
            disabled={loading}
            className="bg-slate-900/40 border border-slate-800 text-slate-400 hover:text-slate-200 px-6 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer hover:border-slate-700"
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}
