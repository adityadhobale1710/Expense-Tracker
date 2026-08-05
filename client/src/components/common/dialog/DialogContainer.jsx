import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trash2, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle, 
  Info 
} from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';
import AlertDialog from './AlertDialog';

const VARIANT_CONFIGS = {
  danger: {
    bg: 'bg-rose-500/10 border-rose-500/20',
    iconColor: 'text-rose-400',
    iconBg: 'bg-rose-500/10 border border-rose-500/20',
    btnBg: 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500',
    defaultIcon: Trash2,
  },
  warning: {
    bg: 'bg-amber-500/10 border-amber-500/20',
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/10 border border-amber-500/20',
    btnBg: 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500',
    defaultIcon: AlertTriangle,
  },
  success: {
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/10 border border-emerald-500/20',
    btnBg: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500',
    defaultIcon: CheckCircle,
  },
  info: {
    bg: 'bg-indigo-500/10 border-indigo-500/20',
    iconColor: 'text-indigo-400',
    iconBg: 'bg-indigo-500/10 border border-indigo-500/20',
    btnBg: 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500',
    defaultIcon: Info,
  },
  confirmation: {
    bg: 'bg-slate-800/10 border-slate-700/20',
    iconColor: 'text-indigo-400',
    iconBg: 'bg-indigo-500/10 border border-indigo-500/20',
    btnBg: 'bg-indigo-600 hover:bg-indigo-500',
    defaultIcon: Info,
  },
};

export default function DialogContainer({ dialog }) {
  useEffect(() => {
    if (!dialog) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        dialog.resolve(false);
      }
      if (e.key === 'Enter') {
        dialog.resolve(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dialog]);

  return (
    <AnimatePresence>
      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => dialog.resolve(false)}
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
          />

          {/* Dialog Modal content wrapper */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="relative z-10 w-full max-w-[480px]"
          >
            {dialog.type === 'confirm' ? (
              <ConfirmDialog
                dialog={dialog}
                config={VARIANT_CONFIGS[dialog.variant] || VARIANT_CONFIGS.confirmation}
                IconComponent={dialog.icon || (VARIANT_CONFIGS[dialog.variant] || VARIANT_CONFIGS.confirmation).defaultIcon}
              />
            ) : (
              <AlertDialog
                dialog={dialog}
                config={VARIANT_CONFIGS[dialog.variant] || VARIANT_CONFIGS.confirmation}
                IconComponent={dialog.icon || (VARIANT_CONFIGS[dialog.variant] || VARIANT_CONFIGS.confirmation).defaultIcon}
              />
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
