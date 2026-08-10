import React from 'react';
import { Lightbulb } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ChartInsight({ message }) {
  if (!message) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="mt-3 px-4 py-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center gap-3"
    >
      <div className="bg-indigo-500/20 p-1.5 rounded-full text-indigo-400 flex-shrink-0">
        <Lightbulb size={12} className="animate-pulse" />
      </div>
      <p className="text-xs text-indigo-200/90 font-medium leading-relaxed">
        {message}
      </p>
    </motion.div>
  );
}
