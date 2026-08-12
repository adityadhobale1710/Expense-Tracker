import { useState, useEffect } from 'react';
import { useGamification } from '../../context/GamificationContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import RankBadge from './RankBadge';

export default function Leaderboard() {
  const { xp, coins, level, streak, lifetimeXP, achievements } = useGamification();
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/gamification/leaderboard');
        if (data.success) {
          setEntries(data.data.leaderboard || []);
        }
      } catch {
        // Fallback: just show current user
        setEntries([{
          name: user?.name || 'You',
          avatar: user?.avatar,
          xp: xp,
          lifetimeXP: lifetimeXP,
          coins: coins,
          level: level,
          streak: streak,
          rank: 'Bronze',
          badgesCount: achievements.filter(a => a.unlocked).length,
          isCurrentUser: true,
          rank_position: 1,
        }]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const getPositionStyle = (pos) => {
    if (pos === 1) return 'text-yellow-400 text-lg';
    if (pos === 2) return 'text-slate-300 text-base';
    if (pos === 3) return 'text-amber-600 text-base';
    return 'text-slate-500 text-sm';
  };

  const getPositionIcon = (pos) => {
    if (pos === 1) return '🥇';
    if (pos === 2) return '🥈';
    if (pos === 3) return '🥉';
    return `#${pos}`;
  };

  return (
    <div className="card bg-dark-800 border border-slate-700/50 rounded-2xl p-6 shadow-xl space-y-4">
      <div className="flex justify-between items-center border-b border-slate-700/30 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🏆</span>
            <h3 className="text-base font-black text-slate-100">Family Leaderboard</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">Ranked by lifetime XP</p>
        </div>
        <span className="text-[10px] font-bold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2.5 py-1 rounded-full">
          Live
        </span>
      </div>

      {loading ? (
        <div className="py-8 flex justify-center">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {/* Column headers */}
          <div className="grid grid-cols-[40px_1fr_60px_60px_50px] gap-2 px-2 text-[9px] font-bold text-slate-600 uppercase tracking-wider">
            <span>Rank</span>
            <span>Player</span>
            <span className="text-center">Level</span>
            <span className="text-center">XP</span>
            <span className="text-center">Badges</span>
          </div>

          {entries.map((entry) => (
            <div
              key={`${entry.rank_position}-${entry.name}`}
              className={`grid grid-cols-[40px_1fr_60px_60px_50px] gap-2 items-center p-3 rounded-xl border transition-all duration-200 ${
                entry.isCurrentUser
                  ? 'bg-indigo-500/10 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.1)]'
                  : 'bg-slate-900/20 border-slate-800/50 hover:border-slate-700/50'
              }`}
            >
              {/* Position */}
              <div className={`font-black text-center ${getPositionStyle(entry.rank_position)}`}>
                {getPositionIcon(entry.rank_position)}
              </div>

              {/* Player info */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-sm flex-shrink-0 font-bold text-white overflow-hidden">
                  {entry.avatar
                    ? <img src={entry.avatar} alt={entry.name} className="w-full h-full object-cover" />
                    : entry.name?.[0]?.toUpperCase()
                  }
                </div>
                <div className="min-w-0">
                  <p className={`text-xs font-bold truncate ${entry.isCurrentUser ? 'text-indigo-300' : 'text-slate-200'}`}>
                    {entry.name} {entry.isCurrentUser && <span className="text-[9px] text-indigo-400">(You)</span>}
                  </p>
                  <div className="mt-0.5">
                    <RankBadge size="xs" lifetimeXPOverride={entry.lifetimeXP || entry.xp} />
                  </div>
                </div>
              </div>

              {/* Level */}
              <div className="text-center">
                <span className="text-xs font-black text-amber-400">{entry.level}</span>
              </div>

              {/* XP */}
              <div className="text-center">
                <span className="text-xs font-mono font-bold text-slate-300">
                  {(entry.lifetimeXP || entry.xp || 0).toLocaleString('en-IN')}
                </span>
              </div>

              {/* Badges */}
              <div className="text-center">
                <span className="text-xs font-bold text-indigo-400">{entry.badgesCount}</span>
              </div>
            </div>
          ))}

          {entries.length === 0 && (
            <div className="py-8 text-center text-slate-500 text-xs">
              <p>No leaderboard data yet.</p>
              <p className="mt-1">Join a family group to compete with others.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
