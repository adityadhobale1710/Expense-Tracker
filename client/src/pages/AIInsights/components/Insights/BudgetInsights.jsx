import React from 'react';
import { Target } from 'lucide-react';

/**
 * BudgetInsights to display budget limit adherence details
 */
export default function BudgetInsights({ budget = {} }) {
  const fmt = (v) => (v ?? 0).toLocaleString('en-IN');

  return (
    <div className="bg-dark-800 border border-slate-700/50 rounded-2xl p-5 shadow-lg space-y-4">
      <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pointer-events-none">
        <Target size={14} className="text-primary-400" /> Budget Intelligence
      </h4>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="text-[9px] font-black text-slate-500 uppercase block">Total Budgets</span>
          <span className="text-sm font-bold text-slate-200 block mt-1">{budget.totalBudgets || 0}</span>
        </div>
        <div>
          <span className="text-[9px] font-black text-slate-500 uppercase block">Exceeded Budgets</span>
          <span className="text-sm font-bold text-slate-200 block mt-1 text-rose-455 text-rose-400">{budget.exceededBudgets || 0}</span>
        </div>
        <div>
          <span className="text-[9px] font-black text-slate-500 uppercase block">Remaining Budget</span>
          <span className="text-sm font-bold text-slate-200 block mt-1">₹{fmt(budget.remainingBudget)}</span>
        </div>
        <div>
          <span className="text-[9px] font-black text-slate-500 uppercase block">Projected Overspend</span>
          <span className="text-sm font-bold text-slate-200 block mt-1 text-amber-400">₹{fmt(budget.projectedOverspend)}</span>
        </div>
        <div>
          <span className="text-[9px] font-black text-slate-500 uppercase block">Best Budget Category</span>
          <span className="text-sm font-bold text-slate-200 block mt-1 truncate">{budget.mostEfficientBudget || 'None'}</span>
        </div>
        <div>
          <span className="text-[9px] font-black text-slate-500 uppercase block">Worst Budget Category</span>
          <span className="text-sm font-bold text-rose-400 block mt-1 truncate">{budget.worstPerformingBudget || 'None'}</span>
        </div>
        <div>
          <span className="text-[9px] font-black text-slate-500 uppercase block">Budget Utilization</span>
          <span className="text-sm font-bold text-slate-200 block mt-1">{budget.budgetUtilization || 0}%</span>
        </div>
        <div>
          <span className="text-[9px] font-black text-slate-500 uppercase block">Budget Health Score</span>
          <span className="text-sm font-bold text-slate-200 block mt-1">{budget.budgetHealthScore || 100}%</span>
        </div>
      </div>
      
      <div className="pt-3 border-t border-slate-700/30 text-[10px] font-black text-slate-400 flex justify-between items-center">
        <span>Days Left in Month</span>
        <span className="text-slate-200 font-bold bg-slate-900 border border-slate-700/30 px-2 py-0.5 rounded-lg">{budget.daysLeft || 0} Days</span>
      </div>
    </div>
  );
}
