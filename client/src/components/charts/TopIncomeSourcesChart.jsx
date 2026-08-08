import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import ChartCard from './ChartCard';
import { CHART_COLORS } from '../../utils/chartTheme';

export default function TopIncomeSourcesChart({ categoryData = [] }) {
  if (!categoryData || categoryData.length === 0) {
    return (
      <ChartCard title="Top Income Sources" subtitle="Where your money comes from">
        <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs">
          No income data available.
        </div>
      </ChartCard>
    );
  }

  // Sort and take top 5 sources
  const topSources = [...categoryData].sort((a, b) => b.total - a.total).slice(0, 5);

  return (
    <ChartCard
      title="Top Income Sources"
      subtitle="Highest revenue generators"
      infoText="A breakdown of your top 5 income sources, ordered by total amount."
    >
      <div className="w-full h-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={topSources} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" horizontal={false} />
            <XAxis type="number" stroke="var(--chart-text)" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="name" stroke="var(--chart-text)" fontSize={12} tickLine={false} axisLine={false} width={80} />
            <Tooltip
              contentStyle={{
                background: 'var(--chart-tooltip-bg)',
                border: '1px solid var(--chart-tooltip-border)',
                borderRadius: '12px',
                color: 'var(--chart-tooltip-text)',
                fontSize: '11px',
                fontWeight: 'bold'
              }}
              formatter={(val, name) => [`₹${val.toLocaleString('en-IN')}`, 'Income']}
            />
            <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={24}>
              {topSources.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color || CHART_COLORS.income || '#10b981'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
