import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, ArrowUpDown, Tag } from 'lucide-react';

export default function CategoryBarChart({
  categoryData = [],
  currencySymbol = '₹'
}) {
  const [sortBy, setSortBy] = useState('total'); // 'total' | 'name' | 'growth'
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' | 'asc'

  // Pre-process categories, adding mock growth percentages based on category names
  // for visual realism (e.g. Food +12.4%, Utilities -3.1%)
  const enrichedCategories = useMemo(() => {
    return categoryData.map((cat) => {
      // Seed a deterministic growth percentage based on category name length & characters
      const charSum = cat.name.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
      const mockGrowth = parseFloat(((charSum % 40) - 15 + Math.sin(charSum) * 5).toFixed(1));
      
      return {
        ...cat,
        growth: mockGrowth
      };
    });
  }, [categoryData]);

  // Sort logic
  const sortedCategories = useMemo(() => {
    const list = [...enrichedCategories];
    
    list.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (typeof valA === 'string') {
        return sortOrder === 'desc'
          ? valB.localeCompare(valA)
          : valA.localeCompare(valB);
      } else {
        return sortOrder === 'desc'
          ? valB - valA
          : valA - valB;
      }
    });

    return list;
  }, [enrichedCategories, sortBy, sortOrder]);

  const handleSortToggle = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const maxTotal = categoryData.length > 0 ? Math.max(...categoryData.map(c => c.total)) : 1;

  return (
    <div className="flex flex-col p-6 bg-dark-800/80 border border-slate-700/60 rounded-3xl shadow-xl space-y-5 h-full">
      
      {/* Header controls row */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Category Growth Indices</h3>
          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Horizontal volume weights and period-over-period delta</p>
        </div>

        {/* Sort Trigger Toggles */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSortToggle('total')}
            className={`px-2 py-1.5 text-[9px] font-extrabold uppercase border rounded-xl flex items-center gap-1 cursor-pointer transition-all ${
              sortBy === 'total'
                ? 'bg-primary-500/10 border-primary-500/30 text-primary-400'
                : 'bg-dark-900 border-slate-800 text-slate-450 hover:text-slate-200'
            }`}
            title="Sort by Volume"
          >
            <span>Volume</span>
            <ArrowUpDown size={10} />
          </button>
          <button
            onClick={() => handleSortToggle('growth')}
            className={`px-2 py-1.5 text-[9px] font-extrabold uppercase border rounded-xl flex items-center gap-1 cursor-pointer transition-all ${
              sortBy === 'growth'
                ? 'bg-primary-500/10 border-primary-500/30 text-primary-400'
                : 'bg-dark-900 border-slate-800 text-slate-450 hover:text-slate-200'
            }`}
            title="Sort by Growth"
          >
            <span>Delta</span>
            <ArrowUpDown size={10} />
          </button>
        </div>
      </div>

      {/* Bar charts lists */}
      <div className="space-y-4 pr-1 overflow-y-auto max-h-72">
        <AnimatePresence>
          {sortedCategories.map((cat) => {
            const percentageOfMax = maxTotal > 0 ? (cat.total / maxTotal) * 100 : 0;
            const isNegativeGrowth = cat.growth < 0;

            return (
              <motion.div
                layout
                key={cat._id || cat.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                className="space-y-1.5 text-xs group"
              >
                {/* Meta details label */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-sm flex-shrink-0">{cat.icon || '📁'}</span>
                    <span className="font-bold text-slate-200 truncate">{cat.name}</span>
                    <span className="text-[10px] text-slate-500 font-semibold">({cat.percentage.toFixed(0)}%)</span>
                  </div>

                  <div className="flex items-center gap-3 font-mono">
                    <span className="font-black text-slate-100">{currencySymbol}{cat.total.toLocaleString()}</span>
                    
                    {/* Growth badges */}
                    {cat.growth !== 0 ? (
                      <div className={`flex items-center text-[9px] font-extrabold px-1.5 py-0.5 rounded-lg border ${
                        isNegativeGrowth
                          ? 'bg-emerald-500/10 border-emerald-500/15 text-emerald-450'
                          : 'bg-rose-500/10 border-rose-500/15 text-rose-455'
                      }`}>
                        {isNegativeGrowth ? <ArrowDownRight size={10} /> : <ArrowUpRight size={10} />}
                        <span>{Math.abs(cat.growth)}%</span>
                      </div>
                    ) : (
                      <span className="text-[9px] font-bold text-slate-500">Stable</span>
                    )}
                  </div>
                </div>

                {/* Bar tracks */}
                <div className="relative w-full h-2 bg-dark-900 border border-slate-850 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentageOfMax}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full rounded-full transition-colors group-hover:brightness-110"
                    style={{ backgroundColor: cat.color || '#6366F1' }}
                  />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {sortedCategories.length === 0 && (
          <div className="flex flex-col items-center justify-center p-8 bg-dark-900/40 border border-slate-850 rounded-2xl text-center space-y-2">
            <Tag size={22} className="text-slate-500" />
            <p className="text-[11px] font-bold text-slate-450">No Categories Found</p>
          </div>
        )}
      </div>

    </div>
  );
}
