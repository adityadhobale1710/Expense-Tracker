import React from 'react';
import { DollarSign } from 'lucide-react';

/**
 * SpendingInsights to display granular spending statistics
 */
export default function SpendingInsights({ spending = {} }) {
  const fmt = (v) => (v ?? 0).toLocaleString('en-IN');
  const largest = spending.largestExpense || { title: 'None', amount: 0, category: 'None' };

  return (
    <div className="bg-dark-800 border border-slate-700/50 rounded-2xl p-5 shadow-lg space-y-4">
      <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pointer-events-none">
        <DollarSign size={14} className="text-primary-400" /> Spending Insights
      </h4>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="text-[9px] font-black text-slate-500 uppercase block">Highest Spending Category</span>
          <span className="text-sm font-bold text-slate-200 block mt-1 truncate">{spending.highestSpendingCategory || 'None'}</span>
        </div>
        <div>
          <span className="text-[9px] font-black text-slate-500 uppercase block">Lowest Spending Category</span>
          <span className="text-sm font-bold text-slate-200 block mt-1 truncate">{spending.lowestSpendingCategory || 'None'}</span>
        </div>
        <div>
          <span className="text-[9px] font-black text-slate-500 uppercase block">Fastest Growing Category</span>
          <span className="text-sm font-bold text-slate-200 block mt-1 text-amber-400 truncate">{spending.fastestGrowingCategory || 'None'}</span>
        </div>
        <div>
          <span className="text-[9px] font-black text-slate-500 uppercase block">Uncategorized Expenses</span>
          <span className="text-sm font-bold text-slate-200 block mt-1">₹{fmt(spending.uncategorizedExpenses)}</span>
        </div>
        <div>
          <span className="text-[9px] font-black text-slate-500 uppercase block">Average Daily Spending</span>
          <span className="text-sm font-bold text-slate-200 block mt-1">₹{fmt(spending.avgDailySpending)}</span>
        </div>
        <div>
          <span className="text-[9px] font-black text-slate-500 uppercase block">Weekend Spending</span>
          <span className="text-sm font-bold text-slate-200 block mt-1">₹{fmt(spending.weekendSpending)}</span>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-700/30">
        <span className="text-[9px] font-black text-slate-500 uppercase block">Largest Expense</span>
        <div className="mt-2 flex justify-between items-center bg-slate-900/40 border border-slate-800 p-2.5 rounded-xl text-xs font-semibold text-slate-350">
          <div>
            <span className="text-slate-200 block font-bold truncate max-w-[120px] sm:max-w-[160px]">{largest.title}</span>
            <span className="text-[8px] text-slate-500 uppercase block mt-0.5 font-bold tracking-wider">{largest.category}</span>
          </div>
          <span className="text-slate-100 font-bold">₹{fmt(largest.amount)}</span>
        </div>
      </div>
    </div>
  );
}
