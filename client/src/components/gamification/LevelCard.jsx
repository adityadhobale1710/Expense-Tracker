import { useGamification } from '../../context/GamificationContext';
import { calculateLevel } from '../../services/rewardService';
import { getRankFromXP, RANK_TIERS } from '../../constants/rewardConstants';
import XPBar from './XPBar';
import RankBadge from './RankBadge';
import { useAuth } from '../../context/AuthContext';
// Link import kept for potential navigation extensions

export default function LevelCard() {
  const { xp, coins, streak, longestStreak, lifetimeXP, achievements, pinnedBadges } = useGamification();
  const { user } = useAuth();
  const { currentLvl } = calculateLevel(xp);
  const rank = getRankFromXP(lifetimeXP);
  const rankTier = RANK_TIERS.find(r => r.name === rank.name) || RANK_TIERS[0];
  const unlockedCount = achievements.filter(a => a.unlocked).length;

  const stats = [
    { label: 'Coins',          value: coins.toLocaleString('en-IN'), icon: '🪙', color: 'text-yellow-400' },
    { label: 'Streak',         value: `${streak}d`,                   icon: '🔥', color: 'text-orange-400' },
    { label: 'Badges',         value: `${unlockedCount}`,             icon: '🏆', color: 'text-indigo-400' },
    { label: 'Best Streak',    value: `${longestStreak}d`,            icon: '⚡', color: 'text-emerald-400' },
  ];

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-700/50 bg-gradient-to-br from-indigo-500/10 via-slate-900/60 to-slate-900 p-6 md:p-8 shadow-2xl">
      {/* Ambient blobs */}
      <div className="absolute -top-16 -left-16 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-emerald-500/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-32 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">

        {/* Avatar + Level Badge */}
        <div className="relative flex-shrink-0">
          <div
            className="w-24 h-24 md:w-28 md:h-28 rounded-full p-[3px] shadow-xl"
            style={{ background: `linear-gradient(135deg, ${rankTier.color}, #6366f1, #10b981)` }}
          >
            <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-5xl select-none">
              {user?.avatar ? (
                <img src={user.avatar} alt={user?.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                <span>{currentLvl.icon}</span>
              )}
            </div>
          </div>
          {/* Level badge */}
          <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-900 font-black text-xs px-2.5 py-1 rounded-full shadow-lg border-2 border-slate-900 whitespace-nowrap">
            Lvl {currentLvl.level}
          </div>
        </div>

        {/* Name, Rank, XP bar */}
        <div className="flex-1 space-y-4 text-center md:text-left w-full min-w-0">
          <div>
            <div className="flex flex-col md:flex-row md:items-center gap-2 justify-center md:justify-start flex-wrap">
              <h2 className="text-2xl md:text-3xl font-black text-slate-100 tracking-tight truncate">
                {user?.name || 'Financial Legend'}
              </h2>
              <span className="inline-block text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full border"
                style={{ color: rankTier.color, borderColor: `${rankTier.color}40`, background: `${rankTier.color}15` }}>
                {currentLvl.name}
              </span>
            </div>
            <div className="flex items-center gap-2 justify-center md:justify-start mt-1">
              <RankBadge />
              <span className="text-xs text-slate-400 font-medium">
                {(lifetimeXP || xp).toLocaleString('en-IN')} lifetime XP
              </span>
            </div>
          </div>

          <XPBar />
        </div>

        {/* Stats mini-grid */}
        <div className="grid grid-cols-2 gap-2.5 w-full md:w-auto flex-shrink-0 pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-slate-700/40 md:pl-8">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-3 flex items-center gap-2.5 min-w-[120px]">
              <span className="text-xl select-none">{stat.icon}</span>
              <div>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">{stat.label}</p>
                <p className={`text-sm font-extrabold font-mono ${stat.color}`}>{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
