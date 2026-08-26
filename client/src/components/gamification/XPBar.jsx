import { useGamification } from '../../context/GamificationContext';
import { calculateLevel, calculateXPProgress } from '../../services/rewardService';

export default function XPBar({ compact = false }) {
  const { xp } = useGamification();
  const { currentLvl, nextLvl } = calculateLevel(xp);
  const progress = calculateXPProgress(xp);
  const isMaxLevel = currentLvl.level === nextLvl.level;
  const xpIntoLevel = xp - currentLvl.xpRequired;
  const xpForNextLevel = isMaxLevel ? 0 : nextLvl.xpRequired - currentLvl.xpRequired;

  if (compact) {
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs font-bold text-slate-400">
          <span>Lv.{currentLvl.level}</span>
          <span className="font-mono">{xp.toLocaleString('en-IN')} XP</span>
        </div>
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5 w-full">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-slate-300 uppercase tracking-wider">XP Progress</span>
          {!isMaxLevel && (
            <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
              Level {currentLvl.level} → {nextLvl.level}
            </span>
          )}
        </div>
        <span className="text-xs font-mono font-bold text-slate-200">
          {isMaxLevel ? '✨ MAX' : `${xp.toLocaleString('en-IN')} / ${nextLvl.xpRequired.toLocaleString('en-IN')}`}
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative w-full h-4 bg-slate-900 border border-slate-800 rounded-full overflow-hidden p-0.5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-500 transition-all duration-1000 ease-out relative overflow-hidden"
          style={{ width: `${progress}%` }}
        >
          {/* Shimmer */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite_linear]" />
        </div>
      </div>

      <div className="flex justify-between text-xs text-slate-500 font-semibold">
        <span>{isMaxLevel ? 'Maximum level reached!' : `${(xpForNextLevel - xpIntoLevel).toLocaleString('en-IN')} XP to Level ${nextLvl.level}`}</span>
        <span className="font-bold text-slate-400">{progress}%</span>
      </div>

      <style>{`
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
}
