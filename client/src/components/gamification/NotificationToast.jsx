import { useEffect, useState } from 'react';
import { useGamification } from '../../context/GamificationContext';

export default function NotificationToast() {
  const { notifications, dismissNotification } = useGamification();
  const [visible, setVisible] = useState([]);

  useEffect(() => {
    // Auto-dismiss after 4 seconds
    notifications.forEach(n => {
      if (!visible.includes(n.id)) {
        setVisible(prev => [...prev, n.id]);
        setTimeout(() => dismissNotification(n.id), 4000);
      }
    });
  }, [notifications]);

  if (notifications.length === 0) return null;

  const typeConfig = {
    achievement: { bg: 'from-indigo-900/95 to-slate-900/95', border: 'border-indigo-500/40', icon: '🏆', label: 'Achievement Unlocked!' },
    levelup:     { bg: 'from-amber-900/95 to-slate-900/95',  border: 'border-amber-500/40',  icon: '⚡', label: 'Level Up!' },
    chest:       { bg: 'from-yellow-900/95 to-slate-900/95', border: 'border-yellow-500/40', icon: '🎁', label: 'Reward Chest!' },
    challenge:   { bg: 'from-emerald-900/95 to-slate-900/95', border: 'border-emerald-500/40', icon: '✅', label: 'Challenge Complete!' },
  };

  return (
    <div className="fixed bottom-6 right-6 z-[190] flex flex-col gap-2 pointer-events-none" aria-live="polite">
      {notifications.slice(-3).map((n) => {
        const cfg = typeConfig[n.type] || typeConfig.achievement;
        return (
          <div
            key={n.id}
            className={`pointer-events-auto flex items-center gap-3 bg-gradient-to-r ${cfg.bg} border ${cfg.border} rounded-2xl px-4 py-3 shadow-2xl backdrop-blur-md min-w-[240px] max-w-[320px] cursor-pointer select-none hover:scale-[1.02] transition-all duration-200`}
            style={{ animation: 'slideInRight 0.3s ease-out' }}
            onClick={() => dismissNotification(n.id)}
          >
            <div className="text-2xl flex-shrink-0">{n.icon || cfg.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{cfg.label}</p>
              <p className="text-sm font-bold text-slate-100 truncate mt-0.5">{n.title}</p>
              {n.xp > 0 && (
                <p className="text-[10px] font-bold text-indigo-400 mt-0.5">+{n.xp} XP</p>
              )}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); dismissNotification(n.id); }}
              className="text-slate-600 hover:text-slate-400 text-xs flex-shrink-0 font-bold"
            >
              ✕
            </button>
          </div>
        );
      })}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(120%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
