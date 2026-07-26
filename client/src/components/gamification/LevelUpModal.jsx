import { useEffect, useRef } from 'react';
import { useGamification } from '../../context/GamificationContext';
import { calculateLevel } from '../../services/rewardService';
import { PROGRESSION_LEVELS } from '../../pages/Achievements/achievementsData';

function launchConfetti(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#3b82f6', '#fbbf24'];
  const particles = Array.from({ length: 150 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height - canvas.height,
    r: Math.random() * 6 + 2,
    d: Math.random() * canvas.height,
    color: colors[Math.floor(Math.random() * colors.length)],
    tiltAngle: 0,
    tiltAngleInc: Math.random() * 0.05 + 0.02,
  }));

  let animId;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let active = false;
    particles.forEach((p, i) => {
      p.tiltAngle += p.tiltAngleInc;
      p.y += (Math.cos(p.d) + 3.5 + p.r / 2) / 2.2;
      p.x += Math.sin(p.tiltAngle) * 0.8;
      if (p.y < canvas.height) active = true;
      ctx.beginPath();
      ctx.lineWidth = p.r;
      ctx.strokeStyle = p.color;
      ctx.moveTo(p.x + Math.sin(p.tiltAngle - i / 3) * 12 + p.r / 2, p.y);
      ctx.lineTo(p.x + Math.sin(p.tiltAngle - i / 3) * 12, p.y + Math.sin(p.tiltAngle - i / 3) * 12 + p.r / 2);
      ctx.stroke();
    });
    if (active) animId = requestAnimationFrame(draw);
  }
  animId = requestAnimationFrame(draw);
  return () => cancelAnimationFrame(animId);
}

export default function LevelUpModal() {
  const { levelUpData, clearLevelUp, xp } = useGamification();
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!levelUpData || !canvasRef.current) return;
    const cleanup = launchConfetti(canvasRef.current);
    return cleanup;
  }, [levelUpData]);

  if (!levelUpData) return null;

  const newLevelInfo = PROGRESSION_LEVELS.find(l => l.level === levelUpData.to) || PROGRESSION_LEVELS[levelUpData.to - 1];
  const prevLevelInfo = PROGRESSION_LEVELS.find(l => l.level === levelUpData.from);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      {/* Confetti canvas */}
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[201] w-full h-full" />

      {/* Modal card */}
      <div className="relative z-[202] max-w-sm w-full bg-gradient-to-br from-indigo-500/10 via-slate-900/95 to-slate-900 border border-indigo-500/40 rounded-3xl p-8 shadow-2xl text-center overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Badge */}
        <div className="relative w-24 h-24 mx-auto mb-4">
          <div className="w-full h-full rounded-full bg-gradient-to-tr from-indigo-500 via-violet-500 to-emerald-500 p-1 shadow-[0_0_40px_rgba(99,102,241,0.5)] animate-spin-slow">
            <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-4xl">
              {newLevelInfo?.icon || '⚡'}
            </div>
          </div>
          <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-900 font-black text-sm px-3 py-1 rounded-full shadow-lg border-2 border-slate-900">
            Lvl {levelUpData.to}
          </div>
        </div>

        {/* Text */}
        <div className="mb-6 space-y-1">
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.25em]">Level Up!</p>
          <h2 className="text-3xl font-black text-slate-100 tracking-tight">
            {newLevelInfo?.name || `Level ${levelUpData.to}`}
          </h2>
          <p className="text-xs text-slate-400">
            {prevLevelInfo?.name} → {newLevelInfo?.name}
          </p>
        </div>

        {/* Rewards */}
        {newLevelInfo?.reward && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 mb-6">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Rewards Unlocked</p>
            <p className="text-sm font-bold text-amber-400">🎁 {newLevelInfo.reward}</p>
          </div>
        )}

        {/* Continue */}
        <button
          onClick={clearLevelUp}
          className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black text-sm rounded-xl shadow-lg transition-all duration-200 active:scale-95 cursor-pointer"
        >
          Continue ⚡
        </button>

        <style>{`
          @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          .animate-spin-slow { animation: spin-slow 6s linear infinite; }
        `}</style>
      </div>
    </div>
  );
}
