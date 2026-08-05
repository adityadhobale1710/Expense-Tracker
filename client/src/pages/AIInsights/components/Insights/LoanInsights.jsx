import React from 'react';
import { CreditCard } from 'lucide-react';

/**
 * LoanInsights to audit total outstanding loans, monthly EMIs, and debt ratios
 */
export default function LoanInsights({ loans = {} }) {
  const fmt = (v) => (v ?? 0).toLocaleString('en-IN');

  return (
    <div className="bg-dark-800 border border-slate-700/50 rounded-2xl p-5 shadow-lg space-y-4">
      <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pointer-events-none">
        <CreditCard size={14} className="text-primary-400" /> Loans & EMIs
      </h4>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="text-[9px] font-black text-slate-500 uppercase block">Total Debt</span>
          <span className="text-sm font-bold text-slate-200 block mt-1">₹{fmt(loans.totalDebt)}</span>
        </div>
        <div>
          <span className="text-[9px] font-black text-slate-500 uppercase block">Debt-to-Income Ratio</span>
          <span className="text-sm font-bold text-slate-200 block mt-1 text-rose-400">{loans.debtToIncomeRatio || 0}%</span>
        </div>
        <div>
          <span className="text-[9px] font-black text-slate-500 uppercase block">Monthly EMI</span>
          <span className="text-sm font-bold text-slate-200 block mt-1">₹{fmt(loans.monthlyEMI)}</span>
        </div>
        <div>
          <span className="text-[9px] font-black text-slate-500 uppercase block">Interest Burden (Avg)</span>
          <span className="text-sm font-bold text-slate-200 block mt-1">{loans.interestBurden?.toFixed(1) || '0.0'}%</span>
        </div>
      </div>
      
      <div className="pt-3 border-t border-slate-700/30 text-[10px] font-black text-slate-400 flex justify-between items-center">
        <span>Recommended Debt Ratio</span>
        <span className="text-emerald-400 font-bold bg-slate-900 border border-slate-700/30 px-2 py-0.5 rounded-lg">&lt; 36%</span>
      </div>
    </div>
  );
}
