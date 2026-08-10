import React, { useEffect, useState } from 'react';
import ChartCard from './ChartCard';
import { CHART_COLORS } from '../../utils/chartTheme';
import AnalyticsEmptyState from './AnalyticsEmptyState';
import { HeartPulse } from 'lucide-react';

export default function FinancialHealthChart({ data = [] }) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 150);
    return () => clearTimeout(timer);
  }, []);

  if (data.length === 0) {
    return (
      <ChartCard title="Financial Health" subtitle="Budget Rule Analysis">
        <AnalyticsEmptyState 
          icon={HeartPulse} 
          title="No Financial Health Data" 
          message="Keep tracking expenses to evaluate your financial health score." 
        />
      </ChartCard>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);

  // Targets based on 50/30/20 rule
  const ruleMapping = {
    'Needs & Bills': { target: 50, getStatus: (pct) => pct <= 50 ? 'healthy' : pct <= 60 ? 'warning' : 'poor' },
    'Wants & Leisure': { target: 30, getStatus: (pct) => pct <= 30 ? 'healthy' : pct <= 40 ? 'warning' : 'poor' },
    'Savings & Investments': { target: 20, getStatus: (pct) => pct >= 20 ? 'healthy' : pct >= 10 ? 'warning' : 'poor' }
  };

  const getStatusColor = (status) => {
    if (status === 'healthy') return CHART_COLORS.income;
    if (status === 'warning') return CHART_COLORS.warning;
    return CHART_COLORS.expense;
  };

  let totalPenalty = 0;
  
  const mappedData = data.map(item => {
    const pct = total > 0 ? (item.value / total) * 100 : 0;
    const rule = ruleMapping[item.name] || { target: 0, getStatus: () => 'warning' };
    const status = rule.getStatus(pct);

    // Calculate penalties for health score
    if (item.name === 'Needs & Bills') {
      totalPenalty += Math.max(0, pct - 50) * 1.5;
    } else if (item.name === 'Wants & Leisure') {
      totalPenalty += Math.max(0, pct - 30) * 1.5;
    } else if (item.name === 'Savings & Investments') {
      totalPenalty += Math.max(0, 20 - pct) * 2;
    }

    return {
      name: item.name,
      value: item.value,
      pct,
      target: rule.target,
      status,
      color: getStatusColor(status)
    };
  });

  const rawScore = Math.max(0, Math.round(100 - totalPenalty));
  const healthScore = total === 0 ? 0 : rawScore;
  
  let scoreLabel = 'Excellent';
  let scoreColor = CHART_COLORS.income;
  if (healthScore < 50) { scoreLabel = 'Critical'; scoreColor = CHART_COLORS.expense; }
  else if (healthScore < 75) { scoreLabel = 'Needs Work'; scoreColor = CHART_COLORS.warning; }
  else if (healthScore < 90) { scoreLabel = 'Good'; scoreColor = CHART_COLORS.health; }

  return (
    <ChartCard
      title="Financial Health"
      subtitle="50/30/20 Rule Analysis"
      infoText="Evaluates your spending against the standard 50% Needs, 30% Wants, 20% Savings budgeting rule."
    >
      <div className="flex flex-col h-full justify-center px-2 py-2 space-y-6">
        
        {/* Top Score Dashboard */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-3xl font-black font-mono tracking-tight" style={{ color: scoreColor }}>
              {healthScore} <span className="text-lg text-slate-500 font-bold">/ 100</span>
            </p>
            <p className="text-xs font-bold uppercase tracking-wider mt-1" style={{ color: scoreColor }}>
              {scoreLabel}
            </p>
          </div>
        </div>

        {/* KPI Bars */}
        <div className="space-y-5">
          {mappedData.map((item, idx) => (
            <div key={idx} className="group">
              <div className="flex justify-between items-end mb-2">
                <span className="text-[13px] font-bold text-slate-300 group-hover:text-slate-100 transition-colors">
                  {item.name}
                </span>
                <div className="text-right flex items-baseline gap-3">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">
                    Target {item.target}%
                  </span>
                  <span className="text-sm font-black font-mono" style={{ color: item.color }}>
                    {item.pct.toFixed(1)}%
                  </span>
                </div>
              </div>
              
              <div className="relative h-3 w-full bg-slate-800/80 rounded-full overflow-hidden border border-slate-700/50">
                {/* Target Marker Background */}
                <div 
                  className="absolute top-0 bottom-0 border-r-2 border-slate-500/50 z-0" 
                  style={{ width: `${item.target}%` }}
                />
                
                {/* Actual Progress */}
                <div 
                  className="h-full rounded-full transition-all duration-1000 ease-out relative z-10"
                  style={{ 
                    width: isLoaded ? `${Math.min(item.pct, 100)}%` : '0%', 
                    backgroundColor: item.color,
                    boxShadow: `0 0 10px ${item.color}50`
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20" />
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </ChartCard>
  );
}
