import React from 'react';
import { HeartPulse } from 'lucide-react';

/**
 * Score gauge displaying score circular dial and metric breakdowns
 */
export default function FinancialHealthScore({ health }) {
  const score = health?.score || 88;
  const grade = health?.grade || 'Good';
  const breakdown = health?.metricBreakdown || {};

  const getScoreColor = (val) => {
    if (val >= 90) return 'text-emerald-400 stroke-emerald-500';
    if (val >= 75) return 'text-primary-400 stroke-primary-500';
    if (val >= 60) return 'text-amber-400 stroke-amber-500';
    return 'text-rose-400 stroke-rose-500';
  };

  const getTrackColor = (val, max) => {
    const ratio = val / max;
    if (ratio >= 0.85) return 'bg-emerald-500';
    if (ratio >= 0.70) return 'bg-primary-500';
    if (ratio >= 0.50) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const metrics = [
    { label: 'Savings Rate', val: breakdown.savingsRateScore || 0, max: 25 },
    { label: 'Budget Adherence', val: breakdown.budgetComplianceScore || 0, max: 20 },
    { label: 'Goal Progress', val: breakdown.goalProgressScore || 0, max: 15 },
    { label: 'Debt Ratio', val: breakdown.debtScore || 0, max: 15 },
    { label: 'Cash Flow', val: breakdown.cashFlowScore || 0, max: 10 },
    { label: 'Emergency Fund', val: breakdown.emergencyFundScore || 0, max: 10 },
    { label: 'Income Stability', val: breakdown.stabilityScore || 0, max: 5 }
  ];

  return (
    <div className="bg-dark-800 border border-slate-700/50 rounded-2xl p-6 shadow-lg relative overflow-hidden flex flex-col md:flex-row items-center gap-6 h-full">
      {/* Left score dial */}
      <div className="flex flex-col items-center justify-center shrink-0 w-full md:w-44 text-center">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5 justify-center pointer-events-none">
          <HeartPulse size={14} className="text-rose-500 animate-pulse" /> Financial Health
        </h3>
        
        <div className="relative w-32 h-32 flex items-center justify-center mb-3">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" className="stroke-slate-800" strokeWidth="8" fill="transparent" />
            <circle
              cx="50"
              cy="50"
              r="40"
              className={`transition-all duration-1000 ease-out ${getScoreColor(score)}`}
              strokeWidth="8"
              fill="transparent"
              strokeDasharray="251"
              strokeDashoffset={251 - (251 * score) / 100}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-3xl font-black text-slate-100">{score}</span>
            <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest mt-0.5">
              Score
            </span>
          </div>
        </div>

        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${
          score >= 90 ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' :
          score >= 75 ? 'text-primary-400 border-primary-500/20 bg-primary-500/5' :
          score >= 60 ? 'text-amber-400 border-amber-500/20 bg-amber-500/5' :
          'text-rose-400 border-rose-500/20 bg-rose-500/5'
        }`}>
          {grade} Grade
        </span>
      </div>

      {/* Right metric bars */}
      <div className="flex-1 w-full space-y-3">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-700/50 pb-2 mb-2">
          Scoring Metrics
        </h4>
        {metrics.map((m, idx) => {
          const pct = (m.val / m.max) * 100;
          return (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-300">
                <span>{m.label}</span>
                <span className="text-slate-400">{m.val} / {m.max} pts</span>
              </div>
              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getTrackColor(m.val, m.max)}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
