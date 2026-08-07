import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ExpandableLegend({
  data = [],
  currencySymbol = '₹',
  selectedItemName = null,
  onItemClick,
  onItemDoubleClick,
  initialVisible = 3,
}) {
  const [showAll, setShowAll] = useState(false);

  // Ensure data is sorted by highest value
  const sortedData = [...data].sort((a, b) => (b.value || b.total || 0) - (a.value || a.total || 0));
  const visibleData = showAll ? sortedData : sortedData.slice(0, initialVisible);
  const hiddenCount = sortedData.length - initialVisible;

  return (
    <div className="flex flex-col h-full justify-center">
      <motion.div 
        layout
        className="space-y-1.5 max-h-[220px] overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-700/50 hover:[&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-full"
      >
        <AnimatePresence initial={false}>
          {visibleData.map((item, idx) => {
            const isSelected = selectedItemName === item.name;
            const value = item.value ?? item.total ?? 0;
            const percentage = item.percentage ?? 0;

            return (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                onClick={() => onItemClick && onItemClick(item)}
                onDoubleClick={() => onItemDoubleClick && onItemDoubleClick(item)}
                className={`flex justify-between items-center text-[11px] font-semibold py-1.5 px-2.5 rounded-xl border cursor-pointer transition-colors ${
                  selectedItemName
                    ? isSelected
                      ? 'bg-slate-800/80 border-slate-700 text-white font-bold shadow-sm'
                      : 'border-transparent text-slate-500 opacity-40 hover:opacity-60'
                    : 'border-transparent text-slate-300 hover:bg-slate-800/40 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className="w-2 h-2 rounded-full inline-block flex-shrink-0"
                    style={{ backgroundColor: item.color || '#3b82f6' }}
                  />
                  <span className="truncate max-w-[100px] sm:max-w-[140px]">{item.name}</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-right flex-shrink-0">
                  <span className="font-bold text-slate-200">
                    {currencySymbol}{Math.round(Number(value)).toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold w-7 text-right">
                    {Number(percentage).toFixed(0)}%
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
      
      {hiddenCount > 0 && (
        <motion.button
          layout
          onClick={() => setShowAll(!showAll)}
          className="mt-3 text-[10px] font-bold text-slate-400 hover:text-slate-200 transition-colors w-full text-center py-2 bg-slate-800/30 hover:bg-slate-800/60 rounded-xl"
        >
          {showAll ? 'Show Less' : `+${hiddenCount} More`}
        </motion.button>
      )}
    </div>
  );
}
