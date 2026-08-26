import React from 'react';
import { Card } from './Card';
import { TrendingUp, TrendingDown } from 'lucide-react';

export const StatCard = ({
  label,
  value,
  icon: Icon,
  color = '#6366f1',
  trend,
  trendUp,
  description,
  loading = false,
  className = '',
}) => {
  return (
    <Card hoverable className={`group ${className}`}>
      {/* Background glow radial gradient matching brand indicator color */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: `radial-gradient(circle at 85% 15%, ${color}09 0%, transparent 65%)` }}
      />

      <div className="flex items-start justify-between relative z-10">
        <div className="flex items-center gap-3.5">
          {Icon && (
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border"
              style={{
                backgroundColor: `${color}15`,
                borderColor: `${color}25`,
                color: color
              }}
            >
              <Icon className="w-5 h-5" />
            </div>
          )}
          <div>
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest leading-none">
              {label}
            </p>
            {loading ? (
              <div className="h-6 w-24 bg-slate-700/60 rounded animate-pulse mt-2.5" />
            ) : (
              <p className="text-2xl font-black text-slate-100 mt-2 leading-none tracking-tight">
                {value}
              </p>
            )}
          </div>
        </div>

        {trend !== undefined && !loading && (
          <div
            className={`flex items-center gap-0.5 text-[10px] font-black px-2 py-0.5 rounded-full border ${
              trendUp
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/15'
            }`}
          >
            {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{trend}</span>
          </div>
        )}
      </div>

      {description && !loading && (
        <p className="text-xs text-slate-400 font-semibold mt-3 relative z-10">
          {description}
        </p>
      )}
    </Card>
  );
};
