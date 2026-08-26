import { useGamification } from '../../context/GamificationContext';

export default function SeasonCard() {
  const { season } = useGamification();

  if (!season || !season.startDate) return null;

  const now = new Date();
  const endDate = season.endDate ? new Date(season.endDate) : new Date(new Date(season.startDate).getTime() + 30 * 24 * 60 * 60 * 1000);
  const startDate = new Date(season.startDate);

  const totalMs = endDate - startDate;
  const elapsedMs = now - startDate;
  const remainingMs = Math.max(endDate - now, 0);
  const daysLeft = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
  const progressPct = Math.min(Math.round((elapsedMs / totalMs) * 100), 100);

  const isEnding = daysLeft <= 5;

  return (
    <div className={`card rounded-2xl p-5 border shadow-xl space-y-3 ${
      isEnding
        ? 'bg-gradient-to-br from-rose-500/10 to-slate-900/80 border-rose-500/30'
        : 'bg-dark-800 border-slate-700/50'
    }`}>
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <span className="text-xl">🌌</span>
          <div>
            <h3 className="text-sm font-black text-slate-100">{season.name || `Season ${season.number || 1}`}</h3>
            <p className="text-xs text-slate-400">Season {season.number || 1}</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-lg font-extrabold font-mono ${isEnding ? 'text-rose-400' : 'text-amber-400'}`}>
            {daysLeft}d
          </p>
          <p className="text-xs text-slate-500 font-bold uppercase">remaining</p>
        </div>
      </div>

      {/* Season progress */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-bold text-slate-500">
          <span>Season Progress</span>
          <span>{progressPct}% elapsed</span>
        </div>
        <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              isEnding ? 'bg-gradient-to-r from-rose-500 to-orange-400' : 'bg-gradient-to-r from-indigo-500 to-violet-500'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Seasonal XP */}
      <div className="flex items-center justify-between bg-slate-900/30 rounded-xl border border-slate-800/50 px-3 py-2">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Season XP</span>
        <span className="text-sm font-extrabold text-indigo-400 font-mono">
          {(season.seasonalXP || 0).toLocaleString('en-IN')} XP
        </span>
      </div>

      {isEnding && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-center">
          <p className="text-xs font-bold text-rose-400">⚠️ Season ending soon! Badges & titles carry over.</p>
        </div>
      )}
    </div>
  );
}
