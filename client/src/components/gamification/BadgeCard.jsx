import { RARITY_CONFIG } from '../../constants/rewardConstants';

export default function BadgeCard({ ach, onPin, isPinned = false }) {
  const isHidden = ach.hidden && !ach.unlocked;
  const cfg = RARITY_CONFIG[ach.tier] || RARITY_CONFIG.Common;

  if (isHidden) {
    return (
      <div className="relative border rounded-2xl p-5 flex flex-col justify-between min-h-[190px] bg-slate-900/10 border-slate-800/50 opacity-70 select-none group">
        <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-900/40 border border-slate-800 flex items-center justify-center text-2xl text-slate-600">
            🔒
          </div>
          <div>
            <h4 className="font-extrabold text-sm text-slate-600">??? Hidden</h4>
            <p className="text-xs text-slate-700 mt-1">Complete special tasks to reveal</p>
          </div>
        </div>
      </div>
    );
  }

  const pctProgress = ach.progressNeeded > 0
    ? Math.min((ach.currentProgress / ach.progressNeeded) * 100, 100)
    : 0;

  return (
    <div
      className={`relative border rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 min-h-[190px] select-none group cursor-default
        ${ach.unlocked
          ? `bg-gradient-to-br ${cfg.gradient} hover:scale-[1.03] hover:shadow-2xl`
          : 'bg-slate-900/10 border-slate-800/80 opacity-55 grayscale contrast-75'
        }`}
      style={ach.unlocked ? { border: `1px solid ${cfg.border.replace('border-', '')}`, boxShadow: cfg.glow || 'none' } : {}}
    >
      {/* Shine for unlocked */}
      {ach.unlocked && (
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-[-70%] w-[40%] h-full bg-gradient-to-r from-transparent via-white/10 to-transparent rotate-12 animate-[shine_4s_ease-in-out_infinite]" />
        </div>
      )}

      {/* Rarity ribbon */}
      <div className="absolute top-0 right-0 overflow-hidden w-16 h-16 pointer-events-none rounded-tr-2xl">
        <div className={`absolute top-2 right-[-22px] rotate-45 text-center text-[7px] font-black py-0.5 w-20 shadow-sm border uppercase tracking-wider ${cfg.ribbon}`}>
          {ach.tier}
        </div>
      </div>

      {/* Pin button */}
      {ach.unlocked && onPin && (
        <button
          onClick={(e) => { e.stopPropagation(); onPin(ach.id); }}
          className={`absolute top-3 left-3 w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all z-10
            ${isPinned
              ? 'bg-amber-500/30 border border-amber-500/60 text-amber-400'
              : 'bg-slate-900/60 border border-slate-700/50 text-slate-500 opacity-0 group-hover:opacity-100'
            }`}
          title={isPinned ? 'Unpin badge' : 'Pin to showcase'}
        >
          📌
        </button>
      )}

      {/* Badge body */}
      <div>
        <div
          className={`text-3xl w-14 h-14 rounded-2xl flex items-center justify-center border shadow-inner
            ${ach.unlocked ? 'bg-dark-900/40 border-slate-700/50 scale-105' : 'bg-dark-900/20 border-slate-800'}`}
        >
          {ach.icon}
        </div>
        <h4 className="font-extrabold text-sm text-slate-100 mt-4 leading-tight group-hover:text-indigo-300 transition-colors">
          {ach.title}
        </h4>
        <p className="text-xs text-slate-400 mt-1 leading-normal line-clamp-2">
          {ach.description}
        </p>
      </div>

      {/* Progress / Complete */}
      <div className="mt-4 pt-3 border-t border-slate-700/20">
        {ach.unlocked ? (
          <div className="flex justify-between items-center text-xs font-bold text-emerald-400">
            <span>✓ Completed</span>
            <span>+{ach.xpReward} XP</span>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 font-semibold truncate max-w-[120px]">{ach.requirement}</span>
              <span className="text-slate-400 font-bold font-mono">
                {ach.currentProgress.toLocaleString('en-IN')} / {ach.progressNeeded.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  ach.tier === 'Legendary' ? 'bg-yellow-500' :
                  ach.tier === 'Epic'      ? 'bg-purple-500' :
                  ach.tier === 'Rare'      ? 'bg-cyan-500'   :
                  ach.tier === 'Mythic'    ? 'bg-rose-500'   : 'bg-indigo-500'
                }`}
                style={{ width: `${pctProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Hover tooltip */}
      <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 w-64 bg-slate-900/95 border border-slate-700/80 rounded-2xl p-3.5 shadow-2xl z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-200 scale-95 group-hover:scale-100 backdrop-blur-md">
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900/95" />
        <p className="text-xs font-black text-slate-100 flex items-center gap-2">
          <span>{ach.icon}</span><span>{ach.title}</span>
        </p>
        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
          {ach.unlocked ? `✅ ${ach.description}` : `Target: ${ach.requirement}`}
        </p>
        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex justify-between text-xs font-bold text-slate-400">
          <span>Reward:</span>
          <span className="text-indigo-400">+{ach.xpReward} XP / +{ach.coinsReward}🪙</span>
        </div>
        {ach.unlocked && ach.unlockedAt && (
          <p className="text-xs text-slate-600 mt-1 font-semibold">
            Unlocked {new Date(ach.unlockedAt).toLocaleDateString('en-IN')}
          </p>
        )}
      </div>

      <style>{`
        @keyframes shine {
          0%   { left: -70%; }
          15%  { left: 150%; }
          100% { left: 150%; }
        }
      `}</style>
    </div>
  );
}
