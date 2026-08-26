import { useGamification } from '../../context/GamificationContext';

export default function StatsPanel() {
  const { xp, coins, level, streak, longestStreak, achievements, lifetimeXP } = useGamification();

  const totalBadges = achievements.length;
  const unlockedBadges = achievements.filter(a => a.unlocked).length;
  const completionPct = totalBadges > 0 ? Math.round((unlockedBadges / totalBadges) * 100) : 0;
  const rareUnlocked = achievements.filter(a => a.unlocked && (a.tier === 'Rare' || a.tier === 'Epic' || a.tier === 'Legendary' || a.tier === 'Mythic')).length;

  const stats = [
    { label: 'Total XP',          value: (xp || 0).toLocaleString('en-IN'),           icon: '✨', color: 'text-indigo-400' },
    { label: 'Lifetime XP',       value: (lifetimeXP || xp || 0).toLocaleString('en-IN'), icon: '💫', color: 'text-violet-400' },
    { label: 'Current Level',     value: `Lvl ${level}`,                               icon: '⚡', color: 'text-amber-400' },
    { label: 'Coins',             value: (coins || 0).toLocaleString('en-IN'),          icon: '🪙', color: 'text-yellow-400' },
    { label: 'Badges Collected',  value: `${unlockedBadges} / ${totalBadges}`,          icon: '🏆', color: 'text-emerald-400' },
    { label: 'Completion',        value: `${completionPct}%`,                           icon: '📈', color: 'text-cyan-400' },
    { label: 'Current Streak',    value: `${streak}d`,                                  icon: '🔥', color: 'text-orange-400' },
    { label: 'Longest Streak',    value: `${longestStreak}d`,                           icon: '👑', color: 'text-rose-400' },
    { label: 'Rare+ Badges',      value: rareUnlocked,                                  icon: '💎', color: 'text-purple-400' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-dark-800 border border-slate-700/50 rounded-2xl p-4 flex items-center gap-3 shadow-lg hover:scale-[1.03] hover:border-slate-600/50 transition-all duration-300 cursor-default group"
        >
          <span className="text-2xl select-none group-hover:scale-110 transition-transform">{stat.icon}</span>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
            <p className={`text-base font-extrabold mt-0.5 ${stat.color}`}>{stat.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
