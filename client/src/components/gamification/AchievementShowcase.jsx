import { useGamification } from '../../context/GamificationContext';
import { INITIAL_ACHIEVEMENTS } from '../../pages/Achievements/achievementsData';

export default function AchievementShowcase() {
  const { pinnedBadges, achievements, updatePinnedBadges } = useGamification();

  const pinnedAchs = pinnedBadges
    .map(id => achievements.find(a => a.id === id))
    .filter(Boolean);

  if (pinnedAchs.length === 0) {
    return (
      <div className="card bg-dark-800 border border-dashed border-slate-700/50 rounded-2xl p-5 text-center space-y-2">
        <p className="text-2xl">📌</p>
        <p className="text-sm font-bold text-slate-400">No badges pinned yet</p>
        <p className="text-xs text-slate-600">
          Go to the Badges tab, hover a badge, and click 📌 to showcase up to 3 here.
        </p>
      </div>
    );
  }

  return (
    <div className="card bg-dark-800 border border-slate-700/50 rounded-2xl p-5 shadow-xl space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-lg">📌</span>
          <h3 className="text-sm font-black text-slate-100">Achievement Showcase</h3>
        </div>
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{pinnedAchs.length}/3 Pinned</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {pinnedAchs.map((ach) => (
          <div key={ach.id} className="relative group flex flex-col items-center gap-2 bg-gradient-to-b from-slate-900/50 to-slate-900/20 border border-slate-800/80 rounded-2xl p-3 text-center hover:border-indigo-500/30 transition-all">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-dark-900/40 border border-slate-700/50">
              {ach.icon}
            </div>
            <div>
              <p className="text-xs font-black text-slate-200 leading-tight line-clamp-2">{ach.title}</p>
              <p className={`text-xs font-bold mt-0.5 ${
                ach.tier === 'Legendary' ? 'text-yellow-400' :
                ach.tier === 'Epic'      ? 'text-purple-400' :
                ach.tier === 'Rare'      ? 'text-cyan-400'   :
                ach.tier === 'Mythic'    ? 'text-rose-400'   : 'text-slate-500'
              }`}>{ach.tier}</p>
            </div>

            {/* Unpin button */}
            <button
              onClick={() => updatePinnedBadges(pinnedBadges.filter(id => id !== ach.id))}
              className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-slate-900/80 border border-slate-700 text-slate-600 hover:text-red-400 hover:border-red-500/40 opacity-0 group-hover:opacity-100 transition-all text-[10px] flex items-center justify-center cursor-pointer"
              title="Unpin"
            >
              ✕
            </button>
          </div>
        ))}

        {/* Empty slots */}
        {Array.from({ length: 3 - pinnedAchs.length }).map((_, i) => (
          <div key={i} className="flex flex-col items-center justify-center gap-1 border border-dashed border-slate-800/50 rounded-2xl p-3 text-center opacity-40 min-h-[100px]">
            <span className="text-xl text-slate-700">📌</span>
            <p className="text-xs text-slate-700 font-bold">Empty Slot</p>
          </div>
        ))}
      </div>
    </div>
  );
}
