import { useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import ChartCard from './ChartCard';
import { CHART_COLORS } from '../../utils/chartTheme';

export default function MonthlySpendingTrend({ monthlyData = [] }) {
  const [timeSelector, setTimeSelector] = useState('Month');

  const headerActions = (
    <div className="flex bg-slate-800/50 rounded-lg p-1">
      {['Month', 'Quarter', 'Year'].map((period) => (
        <button
          key={period}
          onClick={() => setTimeSelector(period)}
          className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
            timeSelector === period
              ? 'bg-slate-700 text-slate-100 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {period}
        </button>
      ))}
    </div>
  );

  if (!monthlyData || monthlyData.length === 0) {
    return (
      <ChartCard title="Money Flow Trajectory" subtitle="Income vs Expenses">
        <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs">
          No historical monthly data available to display trajectory.
        </div>
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title="Money Flow Trajectory"
      subtitle="Income vs Expenses across periods"
      headerActions={headerActions}
    >
      <div className="w-full h-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
            <XAxis dataKey="name" stroke="var(--chart-text)" fontSize={10} tickLine={false} />
            <YAxis
              stroke="var(--chart-text)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => {
                if (value === 0) return '0';
                if (value >= 1000) return '₹' + (value / 1000) + 'k';
                return '₹' + value;
              }}
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
            <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} iconType="circle" />
            <Bar dataKey="income" name="Income" fill={CHART_COLORS.income || '#10b981'} radius={[4, 4, 0, 0]} barSize={20} />
            <Bar dataKey="expense" name="Expenses" fill={CHART_COLORS.expense || '#f43f5e'} radius={[4, 4, 0, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
