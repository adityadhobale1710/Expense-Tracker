import React from 'react';
import { ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import ChartCard from './ChartCard';
import { CHART_COLORS } from '../../utils/chartTheme';
import AnalyticsEmptyState from './AnalyticsEmptyState';
import { LineChart } from 'lucide-react';

export default function SavingsTrendChart({ monthlyData = [] }) {
  if (monthlyData.length === 0) {
    return (
      <ChartCard title="Savings Trend" subtitle="Income vs Expense vs Savings">
        <AnalyticsEmptyState 
          icon={LineChart} 
          title="No Savings Trend" 
          message="Record income and expenses to visualize your savings trend." 
        />
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title="Savings Progress"
      subtitle="Monthly cash flow comparison"
      infoText="Compares your earnings vs spending per month, showing your overall net savings trajectory over time."
      heightClass="h-48 sm:h-52"
    >
      <div className="w-full h-full relative mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
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
              formatter={(val, name) => [`₹${val.toLocaleString('en-IN')}`, name]}
            />
            <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
            <Bar dataKey="income" name="Income" fill={CHART_COLORS.income || '#10b981'} radius={[4, 4, 0, 0]} barSize={20} />
            <Bar dataKey="expense" name="Expense" fill={CHART_COLORS.expense || '#f43f5e'} radius={[4, 4, 0, 0]} barSize={20} />
            <Line type="monotone" dataKey="savings" name="Net Savings" stroke={CHART_COLORS.savings || '#3b82f6'} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
