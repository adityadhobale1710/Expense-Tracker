import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import ChartCard from './ChartCard';
import { CHART_COLORS } from '../../utils/chartTheme';
import AnalyticsEmptyState from './AnalyticsEmptyState';
import { TrendingUp } from 'lucide-react';

export default function IncomeTrendChart({ monthlyData = [] }) {
  if (monthlyData.length === 0) {
    return (
      <ChartCard title="Monthly Income Trend" subtitle="Earnings over time">
        <AnalyticsEmptyState 
          icon={TrendingUp} 
          title="No Income Trend" 
          message="Record income to visualize your earnings trend." 
        />
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title="Monthly Income Trend"
      subtitle="Your earning trajectory"
      infoText="Tracks your gross income over the selected months to help identify seasonal earnings or growth trends."
    >
      <div className="w-full h-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.income || '#10b981'} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={CHART_COLORS.income || '#10b981'} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
            <XAxis dataKey="name" stroke="var(--chart-text)" fontSize={10} tickLine={false} />
            <YAxis 
              stroke="var(--chart-text)" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false}
              tickFormatter={(value) => '₹' + (value >= 1000 ? (value / 1000) + 'k' : value)}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--chart-tooltip-bg)',
                border: '1px solid var(--chart-tooltip-border)',
                borderRadius: '12px',
                color: 'var(--chart-tooltip-text)',
                fontSize: '11px',
                fontWeight: 'bold'
              }}
              itemStyle={{ color: 'var(--chart-tooltip-text)' }}
              labelStyle={{ color: 'var(--chart-text)' }}
              formatter={(val, name) => [`₹${val.toLocaleString('en-IN')}`, name]}
            />
            <Area type="monotone" dataKey="income" name="Income" stroke={CHART_COLORS.income || '#10b981'} fillOpacity={1} fill="url(#colorIncome)" strokeWidth={2} activeDot={{ r: 6 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
