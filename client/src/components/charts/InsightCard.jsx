import React from 'react';
import { motion } from 'framer-motion';

export default function InsightCard({ title, value, subtitle, icon: Icon, trend }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="bg-dark-800/80 border border-slate-700/60 rounded-2xl p-5 flex flex-col justify-between h-full hover:-translate-y-1 hover:shadow-2xl transition-all duration-300"
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</h3>
        {Icon && (
          <div className="bg-slate-700/30 p-2 rounded-xl text-primary-400">
            <Icon size={16} />
          </div>
        )}
      </div>
      <div>
        <div className="text-xl font-black text-white mb-1 tracking-tight truncate">
          {value}
        </div>
        <div className="flex items-center gap-2 mt-2">
          {trend && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${trend > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </span>
          )}
          <span className="text-[11px] font-medium text-slate-500 truncate">
            {subtitle}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
