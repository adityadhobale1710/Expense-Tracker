import React from 'react';
import { Button } from './Button';
import { motion } from 'framer-motion';

export const EmptyState = ({
  title = 'No records found',
  description = 'Add a new entry to get started.',
  icon: Icon,
  actionText,
  onAction,
  illustration,
  className = '',
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`card text-center py-12 px-6 max-w-lg mx-auto flex flex-col items-center justify-center space-y-4 border border-slate-700/40 shadow-xl ${className}`}
    >
      <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-primary-400 shadow-inner">
        {Icon ? <Icon className="w-6 h-6" /> : <span className="text-2xl">📂</span>}
      </div>
      
      <div className="space-y-1">
        <h3 className="text-base font-black text-slate-100 tracking-tight">
          {title}
        </h3>
        <p className="text-xs text-slate-400 max-w-sm leading-relaxed font-semibold">
          {description}
        </p>
      </div>

      {actionText && onAction && (
        <Button onClick={onAction} className="text-xs font-bold px-6 py-2 shadow-lg">
          {actionText}
        </Button>
      )}
    </motion.div>
  );
};
