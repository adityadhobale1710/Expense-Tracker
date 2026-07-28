import { useState } from 'react';
import { useGamification } from '../../context/GamificationContext';
import { CHEST_REWARDS } from '../../constants/rewardConstants';

export default function RewardChestModal() {
  const { chestData, clearChest } = useGamification();
  const [isOpening, setIsOpening] = useState(false);
  const [isOpened, setIsOpened] = useState(false);

  if (!chestData) return null;

  const rewards = CHEST_REWARDS[chestData.level] || chestData;

  const handleOpen = () => {
    if (isOpened) { clearChest(); return; }
    setIsOpening(true);
    setTimeout(() => {
      setIsOpening(false);
      setIsOpened(true);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative max-w-sm w-full bg-gradient-to-br from-amber-500/10 via-slate-900/95 to-slate-900 border border-amber-500/40 rounded-3xl p-8 shadow-2xl text-center overflow-hidden">
        {/* Glow burst */}
        <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-700 ${isOpened ? 'opacity-100' : 'opacity-0'}`}>
          <div className="w-48 h-48 bg-amber-500/20 rounded-full blur-3xl" />
        </div>

        <p className="text-[10px] font-black text-amber-400 uppercase tracking-[0.25em] mb-2">Level {chestData.level} Reward</p>
        <h2 className="text-2xl font-black text-slate-100 mb-6">{rewards?.label || 'Mystery Chest'}</h2>

        {/* Chest visual */}
        <div
          className={`text-8xl mx-auto mb-6 select-none transition-all duration-700 cursor-pointer ${
            isOpening ? 'animate-bounce scale-110' : isOpened ? 'scale-125' : 'hover:scale-110'
          }`}
          onClick={handleOpen}
          style={{ filter: isOpened ? 'drop-shadow(0 0 20px #f59e0b)' : 'none' }}
        >
          {isOpened ? '🎉' : isOpening ? '✨' : '🎁'}
        </div>

        {/* Rewards revealed */}
        {isOpened ? (
          <div className="space-y-3 mb-6">
            <p className="text-sm text-slate-400 font-semibold">You received:</p>
            {rewards?.coins && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                <p className="text-2xl font-black text-amber-400">🪙 +{rewards.coins} Coins</p>
              </div>
            )}
            {rewards?.title && (
              <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-3">
                <p className="text-sm font-bold text-indigo-400">👑 Title: <span className="text-indigo-300">{rewards.title}</span></p>
              </div>
            )}
            {rewards?.badge && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
                <p className="text-sm font-bold text-emerald-400">🏆 New Badge Unlocked!</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-400 font-semibold mb-6">
            {isOpening ? 'Opening...' : 'Click the chest to open your reward!'}
          </p>
        )}

        {/* Action button */}
        <button
          onClick={handleOpen}
          className={`w-full py-3.5 font-black text-sm rounded-xl shadow-lg transition-all duration-200 active:scale-95 cursor-pointer ${
            isOpened
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
              : isOpening
              ? 'bg-dark-900 text-slate-500 cursor-wait'
              : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-900'
          }`}
        >
          {isOpened ? 'Collect & Continue 🎉' : isOpening ? 'Opening...' : '🎁 Open Chest'}
        </button>
      </div>
    </div>
  );
}
