import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, ArrowRight, Minus } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, Tooltip } from 'recharts';
import ChartInsight from './ChartInsight';

export default function IncomeComparisonCard({ currentMonthIncome, previousMonthIncome, mappedMonthlyData }) {
  // Calculate Percentage Change
  const percentageChange = useMemo(() => {
    if (previousMonthIncome === 0) {
      return currentMonthIncome > 0 ? 100 : 0; // Or indicate 'New income'
    }
    return ((currentMonthIncome - previousMonthIncome) / previousMonthIncome) * 100;
  }, [currentMonthIncome, previousMonthIncome]);

  const isPositive = percentageChange > 0;
  const isNegative = percentageChange < 0;
  const isUnchanged = percentageChange === 0;

  // Generate insight message dynamically
  const insightMessage = useMemo(() => {
    if (previousMonthIncome === 0 && currentMonthIncome > 0) {
      return "New income recorded this month! Great start.";
    } else if (previousMonthIncome === 0 && currentMonthIncome === 0) {
      return "No income was recorded last month or this month.";
    } else if (isPositive) {
      return `Great! Your income increased by ${Math.abs(percentageChange).toFixed(2)}% compared with last month.`;
    } else if (isNegative) {
      return `Your income decreased by ${Math.abs(percentageChange).toFixed(2)}% compared with last month.`;
    } else {
      return "Your income is unchanged compared with last month.";
    }
  }, [percentageChange, isPositive, isNegative, previousMonthIncome, currentMonthIncome]);

  // Format data for the small chart (ensure exactly 6 months if possible, or use whatever mappedMonthlyData gives)
  // mappedMonthlyData contains last N months based on the filter.
  // We'll display up to 6 months for the chart.
  const chartData = useMemo(() => {
    return (mappedMonthlyData || []).map(d => ({
      name: d.name,
      income: d.income || 0,
    }));
  }, [mappedMonthlyData]);

  return (
    <div className="bg-dark-800/80 border border-slate-700/60 p-6 rounded-3xl shadow-xl space-y-4 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-slate-700/40 pb-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
              <TrendingUp className="text-emerald-400" size={18} />
              Income This Month vs Last Month
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Compare your income performance
            </p>
          </div>
        </div>

        {/* Comparison Values */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mt-6 border-b border-slate-700/40 pb-6">
          
          <div className="flex-1 w-full flex flex-col justify-center items-center p-4 bg-dark-900/50 rounded-2xl border border-slate-700/40">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">This Month</span>
            <span className="text-2xl font-black text-slate-100 font-mono tracking-tight">
              ₹{Number(currentMonthIncome).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            <div className="mt-2 flex items-center gap-1.5">
              {previousMonthIncome === 0 ? (
                <span className="badge bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-md">
                  New income this month
                </span>
              ) : isPositive ? (
                <span className="badge bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                  <TrendingUp size={12} /> +{percentageChange.toFixed(2)}% vs last month
                </span>
              ) : isNegative ? (
                <span className="badge bg-rose-500/10 text-rose-400 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                  <TrendingDown size={12} /> {percentageChange.toFixed(2)}% vs last month
                </span>
              ) : (
                <span className="badge bg-slate-500/10 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Minus size={12} /> Unchanged
                </span>
              )}
            </div>
          </div>

          <ArrowRight className="text-slate-600 hidden sm:block" size={24} />

          <div className="flex-1 w-full flex flex-col justify-center items-center p-4 bg-dark-900/50 rounded-2xl border border-slate-700/40 opacity-80">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Last Month</span>
            <span className="text-xl font-bold text-slate-300 font-mono tracking-tight">
              ₹{Number(previousMonthIncome).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          </div>

        </div>

        {/* Small Monthly Comparison Chart */}
        <div className="mt-6 h-32 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <Tooltip
                  cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                  contentStyle={{
                    background: 'var(--chart-tooltip-bg, #0f172a)',
                    border: '1px solid var(--chart-tooltip-border, #334155)',
                    borderRadius: '8px',
                    color: 'var(--chart-tooltip-text, #f8fafc)',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}
                  itemStyle={{ color: 'var(--chart-tooltip-text)' }}
                  labelStyle={{ color: 'var(--chart-text)' }}
                  formatter={(val) => [`₹${val.toLocaleString('en-IN')}`, 'Income']}
                />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#64748b' }} 
                  dy={10} 
                />
                <Bar dataKey="income" radius={[4, 4, 4, 4]} maxBarSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={index === chartData.length - 1 ? '#10b981' : '#334155'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
             <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
               No chart data available
             </div>
          )}
        </div>
      </div>
      
      <div className="pt-2">
        <ChartInsight message={insightMessage} />
      </div>
    </div>
  );
}
