import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  AlertTriangle, 
  X, 
  Info, 
  XCircle 
} from 'lucide-react';

const TOAST_CONFIGS = {
  success: {
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/10 border-emerald-500/25',
    progressBg: 'bg-emerald-500',
    Icon: CheckCircle,
  },
  error: {
    iconColor: 'text-rose-400',
    iconBg: 'bg-rose-500/10 border-rose-500/25',
    progressBg: 'bg-rose-500',
    Icon: XCircle,
  },
  warning: {
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/10 border-amber-500/25',
    progressBg: 'bg-amber-500',
    Icon: AlertTriangle,
  },
  info: {
    iconColor: 'text-indigo-400',
    iconBg: 'bg-indigo-500/10 border-indigo-500/25',
    progressBg: 'bg-indigo-500',
    Icon: Info,
  },
};

export default function Toast({ toast, onClose }) {
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const duration = 4000; // 4 seconds

  useEffect(() => {
    if (isPaused) return;

    const interval = 20; // tick every 20ms
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isPaused, onClose]);

  const config = TOAST_CONFIGS[toast.type] || TOAST_CONFIGS.info;
  const ToastIcon = config.Icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="pointer-events-auto relative overflow-hidden bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex gap-3 shadow-xl backdrop-blur-sm max-w-sm w-full transition-all group"
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${config.iconBg}`}>
        <ToastIcon className={`w-4.5 h-4.5 ${config.iconColor}`} />
      </div>

      <div className="flex-1 min-w-0 pr-2">
        <h4 className="text-xs font-black text-slate-100 truncate">{toast.title || toast.type.toUpperCase()}</h4>
        <p className="text-xs text-slate-400 leading-relaxed mt-0.5">{toast.message}</p>
      </div>

      <button
        onClick={onClose}
        className="text-slate-500 hover:text-slate-300 transition-colors p-1 bg-slate-950/20 hover:bg-slate-800 border border-slate-800 rounded-lg cursor-pointer h-7 self-start"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-950">
        <div
          className={`h-full ${config.progressBg} transition-all ease-linear`}
          style={{ width: `${progress}%`, transitionDuration: '20ms' }}
        />
      </div>
    </motion.div>
  );
}
