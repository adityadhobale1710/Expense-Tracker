import { useGamification } from '../../context/GamificationContext';
import { getActiveMultiplier } from '../../constants/rewardConstants';

export default function MultiplierBanner() {
  const multiplier = getActiveMultiplier();

  if (!multiplier.label || multiplier.value === 1.0) return null;

  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-r ${multiplier.color} p-0.5`}>
      <div className="relative bg-dark-900/85 rounded-[14px] px-5 py-3 flex items-center justify-between backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <span className="text-2xl animate-bounce select-none">{multiplier.icon}</span>
          <div>
            <p className="text-xs font-black text-slate-100">{multiplier.label} — Active Now!</p>
            <p className="text-[10px] text-slate-400 font-medium">All XP actions earn {multiplier.value}× more until midnight</p>
          </div>
        </div>
        <div className="text-right flex-shrink-0 ml-4">
          <p className="text-2xl font-black text-white">{multiplier.value}×</p>
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Multiplier</p>
        </div>

        {/* Shimmer overlay */}
        <div className="absolute inset-0 rounded-[14px] overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-[-100%] w-1/2 h-full bg-gradient-to-r from-transparent via-white/8 to-transparent animate-[sweep_3s_ease-in-out_infinite]" />
        </div>
      </div>

      <style>{`
        @keyframes sweep {
          0%   { left: -100%; }
          100% { left: 200%; }
        }
      `}</style>
    </div>
  );
}
