import { useState, useEffect, useCallback } from 'react';
import { useGamification } from '../../context/GamificationContext';
import { getDailyChallenges, getTodayDateStr } from '../../constants/challengePool';

import toast from 'react-hot-toast';

const STORAGE_KEY_PREFIX = 'daily_challenges_';

export default function DailyChallenges() {
  const { applyReward, spawnFloaty } = useGamification();
  const todayStr = getTodayDateStr();
  const storageKey = `${STORAGE_KEY_PREFIX}${todayStr}`;

  const dailyChallenges = getDailyChallenges(todayStr);

  // Load completion state from localStorage (keyed by date — auto-resets daily)
  const [completed, setCompleted] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Burst confetti for a moment
  const [burstId, setBurstId] = useState(null);

  const handleComplete = useCallback((challenge) => {
    if (completed.includes(challenge.id)) return;

    const newCompleted = [...completed, challenge.id];
    setCompleted(newCompleted);
    localStorage.setItem(storageKey, JSON.stringify(newCompleted));

    // Award XP
    if (challenge.actionId) {
      applyReward(challenge.actionId);
    } else {
      applyReward('COMPLETE_CHALLENGE');
    }

    spawnFloaty(`+${challenge.xp} XP`, 0, 0);
    setBurstId(challenge.id);
    setTimeout(() => setBurstId(null), 1000);

    toast.success(`✅ ${challenge.title} — +${challenge.xp} XP`, {
      style: { background: '#1e1b4b', color: '#a5b4fc', border: '1px solid #6366f1' },
    });

    // Bonus if all 3 completed
    if (newCompleted.length === dailyChallenges.length) {
      setTimeout(() => {
        applyReward('COMPLETE_CHALLENGE');
        toast.success('🎉 All daily challenges complete! Bonus XP awarded!', {
          duration: 4000,
          style: { background: '#1e1b4b', color: '#fbbf24', border: '2px solid #f59e0b' },
        });
      }, 500);
    }
  }, [completed, storageKey, applyReward, spawnFloaty, dailyChallenges.length]);

  const completedCount = completed.length;
  const progressPct = Math.round((completedCount / dailyChallenges.length) * 100);

  // Midnight auto-reset
  useEffect(() => {
    const checkReset = () => {
      const currentDay = getTodayDateStr();
      if (currentDay !== todayStr) {
        setCompleted([]);
      }
    };
    const interval = setInterval(checkReset, 60000);
    return () => clearInterval(interval);
  }, [todayStr]);

  return (
    <div className="card bg-dark-800 border border-slate-700/50 rounded-2xl p-6 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <h3 className="text-base font-black text-slate-100">Daily Challenges</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 ml-8">
            Resets at midnight • {completedCount}/{dailyChallenges.length} done
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
            {todayStr}
          </span>
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-slate-500 font-bold">
          <span>Progress</span>
          <span>{progressPct}%</span>
        </div>
        <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Challenge list */}
      <div className="space-y-3">
        {dailyChallenges.map((challenge) => {
          const isDone = completed.includes(challenge.id);
          const isBursting = burstId === challenge.id;

          return (
            <button
              key={challenge.id}
              disabled={isDone}
              onClick={() => handleComplete(challenge)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all duration-300 group cursor-pointer ${
                isDone
                  ? 'bg-emerald-500/5 border-emerald-500/25 opacity-80 cursor-default'
                  : 'bg-slate-900/30 border-slate-800 hover:border-indigo-500/40 hover:bg-indigo-500/5 hover:scale-[1.01] active:scale-[0.99]'
              } ${isBursting ? 'animate-pulse' : ''}`}
            >
              <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${isDone ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' : 'border-slate-700 text-slate-700 group-hover:border-indigo-400'}`}>
                {isDone ? '✓' : ''}
              </div>

              {/* Mission text */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{challenge.icon}</span>
                  <p className={`text-sm font-bold truncate ${isDone ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                    {challenge.title}
                  </p>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 ml-7 leading-snug">
                  {challenge.description}
                </p>
              </div>

              {/* Reward */}
              <div className="flex-shrink-0 flex flex-col items-end gap-1">
                <span className={`text-[11px] font-extrabold ${isDone ? 'text-slate-600' : 'text-indigo-400'}`}>
                  +{challenge.xp} XP
                </span>
                <span className={`text-[10px] font-bold ${isDone ? 'text-slate-600' : 'text-yellow-500'}`}>
                  +{challenge.coins}🪙
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* All complete celebration */}
      {completedCount === dailyChallenges.length && (
        <div className="rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 p-4 text-center">
          <p className="text-sm font-black text-emerald-400">🎉 All challenges complete!</p>
          <p className="text-xs text-slate-400 mt-1">Come back tomorrow for new missions.</p>
        </div>
      )}
    </div>
  );
}
