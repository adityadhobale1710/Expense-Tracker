import React from 'react';
import { Sparkles } from 'lucide-react';

/**
 * Common EmptyState component for blank or incomplete financial panels
 */
export default function EmptyState({ 
  title = 'No Data Recorded Yet', 
  description = 'Add records inside expenses, income, wallets, budgets, or goals to generate financial health insights.' 
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-12 border border-dashed border-slate-700/50 bg-dark-800/10 rounded-2xl space-y-4">
      <div className="w-12 h-12 rounded-xl bg-slate-900/60 border border-slate-700/60 text-slate-500 flex items-center justify-center">
        <Sparkles size={20} />
      </div>
      <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
        {title}
      </h3>
      <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
        {description}
      </p>
    </div>
  );
}
