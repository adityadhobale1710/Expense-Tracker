import React from 'react';
import { motion } from 'framer-motion';

export default function AnalyticsSectionTitle({ title, subtitle, icon: Icon }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-6"
    >
      <div className="flex items-center gap-2 mb-1.5">
        {Icon && <Icon className="text-primary-400" size={20} />}
        <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">{title}</h2>
      </div>
      {subtitle && <p className="text-sm text-slate-400 font-medium">{subtitle}</p>}
    </motion.div>
  );
}
