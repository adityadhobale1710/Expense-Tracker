import React from 'react';
import { TrendingUp, ShieldCheck } from 'lucide-react';

/**
 * PredictionCard to render multi-horizon predictions and risk estimations
 */
export default function PredictionCard({ predictions = {} }) {
  const fmt = (v) => (v ?? 0).toLocaleString('en-IN');
  
  const horizons = [
    { title: 'Month End', data: predictions.monthEnd },
    { title: 'Next Month', data: predictions.nextMonth },
    { title: 'Next Quarter', data: predictions.nextQuarter },
    { title: 'Next 6 Months', data: predictions.next6Months }
  ];

  return (
    <div className="bg-dark-800 border border-slate-700/50 rounded-2xl p-5 shadow-lg space-y-4">
      <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pointer-events-none">
        <TrendingUp size={14} className="text-primary-400" /> AI Predictions
      </h4>
      
      <div className="space-y-3.5">
        {horizons.map((h, idx) => {
          if (!h.data) return null;
          return (
            <div 
              key={idx} 
              className="bg-slate-900/30 border border-slate-800 p-3 rounded-xl flex justify-between items-center text-xs font-semibold text-slate-300"
            >
              <div>
                <span className="text-slate-200 block font-bold">{h.title}</span>
                <span className="text-[8px] text-slate-500 font-extrabold uppercase mt-0.5 flex items-center gap-0.5">
                  <ShieldCheck className="w-3 h-3 text-emerald-400 flex-shrink-0" /> Confidence: {h.data.confidence}%
                </span>
              </div>
              
              <div className="text-right">
                <span className="text-slate-100 font-bold block">Balance: ₹{fmt(h.data.balance)}</span>
                <span className="text-[9px] text-slate-400 block mt-0.5">
                  Spend: ₹{fmt(h.data.spending)} | Save: ₹{fmt(h.data.savings)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="pt-3 border-t border-slate-700/30 text-[10px] font-black text-slate-400 flex justify-between items-center">
        <span>Overspending Risk Index</span>
        <span className={`font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border ${
          predictions.overspendingRisk === 'High' ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' :
          predictions.overspendingRisk === 'Medium' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
          'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
        }`}>
          {predictions.overspendingRisk || 'Low'} Risk
        </span>
      </div>
    </div>
  );
}
