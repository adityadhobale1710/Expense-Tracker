import { motion } from 'framer-motion';
import { Calendar, Layers } from 'lucide-react';

export default function CategoryBreakdown({ categoryData }) {
  if (!categoryData || categoryData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-dark-800/80 border border-slate-700/60 rounded-2xl h-full min-h-[300px]">
        <Layers className="text-slate-600 mb-2" size={32} />
        <p className="text-xs font-semibold text-slate-500">Categorize expense records to unlock breakdown tables</p>
      </div>
    );
  }

  const grandTotal = categoryData.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="flex flex-col p-6 bg-dark-800/80 border border-slate-700/60 rounded-3xl shadow-xl space-y-4">
      <div>
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Expense Structural Allocation</h3>
        <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Budget utilization metrics across categories</p>
      </div>

      <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
        {categoryData.map((item, index) => {
          const formattedDate = item.lastTransactionDate
            ? new Date(item.lastTransactionDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
            : 'N/A';

          return (
            <motion.div
              key={item._id || item.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.04 }}
              className="flex flex-col gap-2 p-3 bg-dark-900/40 border border-slate-800/80 hover:border-slate-700 rounded-xl transition-all"
            >
              {/* Row 1: Icon, Name, Count and Values */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-base"
                    style={{ backgroundColor: `${item.color}15`, border: `1px solid ${item.color}30` }}
                  >
                    {item.icon}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-200">{item.name}</span>
                    <span className="text-[9px] text-slate-500 font-bold font-mono">
                      {item.count} ledger{item.count > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col text-right">
                  <span className="text-xs font-black text-slate-100 font-mono">
                    ₹{item.total.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[9px] text-slate-400 font-bold bg-slate-800 border border-slate-700/50 px-1.5 py-0.5 rounded-lg inline-self-end mt-0.5">
                    {item.percentage.toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Row 2: Horizontal Progress Bar */}
              <div className="h-2 bg-slate-900 border border-slate-800/60 rounded-full overflow-hidden relative">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${item.percentage}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: item.color }}
                />
              </div>

              {/* Row 3: Last transaction stamp */}
              <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-semibold self-end">
                <Calendar size={10} className="text-slate-500" />
                <span>Last transaction: {formattedDate}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
