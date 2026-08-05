import React from 'react';

/**
 * Common MetricCard component to display financial metrics consistently
 */
export default function MetricCard({ 
  label, 
  value, 
  icon: Icon, 
  description, 
  trend, 
  trendUp, 
  color = 'text-primary-400' 
}) {
  return (
    <div className="bg-dark-800 border border-slate-700/50 rounded-2xl p-5 shadow-lg relative overflow-hidden transition-all duration-300 hover:scale-[1.01]">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3.5">
          {Icon && (
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border border-slate-700/60 bg-slate-900/60 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
          )}
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">
              {label}
            </p>
            <p className="text-2xl font-black text-slate-100 mt-2.5 leading-none tracking-tight">
              {value}
            </p>
          </div>
        </div>

        {trend !== undefined && (
          <div
            className={`flex items-center gap-0.5 text-[10px] font-black px-2 py-0.5 rounded-full border ${
              trendUp
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/15'
            }`}
          >
            <span>{trend}</span>
          </div>
        )}
      </div>

      {description && (
        <p className="text-[10px] text-slate-400 font-semibold mt-3">
          {description}
        </p>
      )}
    </div>
  );
}
