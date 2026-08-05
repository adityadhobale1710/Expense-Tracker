import React from 'react';
import { PiggyBank } from 'lucide-react';

/**
 * SavingsInsights to audit savings rate, emergency cover, and monthly saving trends
 */
export default function SavingsInsights({ savings = {} }) {
  const fmt = (v) => (v ?? 0).toLocaleString('en-IN');

  return (
    <div className="bg-dark-800 border border-slate-700/50 rounded-2xl p-5 shadow-lg space-y-4">
      <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pointer-events-none">
        <PiggyBank size={14} className="text-primary-400" /> Savings Intelligence
      </h4>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="text-[9px] font-black text-slate-500 uppercase block">Savings Rate</span>
          <span className="text-sm font-bold text-slate-200 block mt-1">{savings.savingsRate || 0}%</span>
        </div>
        <div>
          <span className="text-[9px] font-black text-slate-500 uppercase block">Avg Monthly Savings</span>
          <span className="text-sm font-bold text-slate-200 block mt-1">₹{fmt(savings.averageMonthlySavings)}</span>
        </div>
        <div>
          <span className="text-[9px] font-black text-slate-500 uppercase block">Projected Savings</span>
          <span className="text-sm font-bold text-slate-200 block mt-1">₹{fmt(savings.projectedSavings)}</span>
        </div>
        <div>
          <span className="text-[9px] font-black text-slate-500 uppercase block">Savings Streak</span>
          <span className="text-sm font-bold text-emerald-400 block mt-1">{savings.savingStreak || 0} Months</span>
        </div>
        <div>
          <span className="text-[9px] font-black text-slate-500 uppercase block">Emergency Fund</span>
          <span className="text-sm font-bold text-slate-200 block mt-1">₹{fmt(savings.emergencyFund)}</span>
        </div>
        <div>
          <span className="text-[9px] font-black text-slate-500 uppercase block">Months Covered</span>
          <span className="text-sm font-bold text-slate-200 block mt-1">{savings.monthsCovered || 0} Months</span>
        </div>
      </div>
      
      <div className="pt-3 border-t border-slate-700/30 text-[10px] font-black text-slate-400 flex justify-between items-center">
        <span>Recommended Savings</span>
        <span className="text-emerald-400 font-bold bg-slate-900 border border-slate-700/30 px-2 py-0.5 rounded-lg">20% Rate</span>
      </div>
    </div>
  );
}
