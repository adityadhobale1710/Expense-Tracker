import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import ChartCard from './ChartCard';
import { CHART_COLORS } from '../../utils/chartTheme';
import AnalyticsEmptyState from './AnalyticsEmptyState';
import { PiggyBank } from 'lucide-react';

const formatValue = (value) => {
  const num = Number(value) || 0;
  const abs = Math.abs(num).toLocaleString('en-IN');
  return num < 0 ? `-₹${abs}` : `₹${abs}`;
};

export default function SavingsProgressChart({ data = [] }) {
  // Valid data exists when ANY month has real income or expense transactions.
  // Zero savings (income === expense) and negative savings (expense > income)
  // are both valid, so we must not gate on savings > 0.
  const hasData = Array.isArray(data) && data.some((d) => (d.income || 0) > 0 || (d.expense || 0) > 0);

  if (!hasData) {
    return (
      <ChartCard title="Savings Progress" subtitle="Track how your savings change over time">
        <AnalyticsEmptyState
          icon={PiggyBank}
          title="No savings data available"
          message="Log income and expenses to track how your savings change over time."
        />
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title="Savings Progress"
      subtitle="Track how your savings change over time"
      infoText="Monthly net savings (earnings minus expenses). Historical months show full-month savings; the current month shows the running balance through today."
    >
      <div className="w-full h-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="colorSavingsProgress" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.savings} stopOpacity={0.25} />
                <stop offset="95%" stopColor={CHART_COLORS.savings} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
            <XAxis dataKey="name" stroke="var(--chart-text)" fontSize={10} tickLine={false} />
            <YAxis
              stroke="var(--chart-text)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              domain={['auto', 'auto']}
              tickFormatter={formatValue}
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
              labelFormatter={(label, payload) =>
                payload?.[0]?.payload?.isCurrent ? `${label} (Current)` : label
              }
              formatter={(value) => [formatValue(value), 'Savings']}
            />
            <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} iconType="circle" />
            <Area
              type="monotone"
              dataKey="savings"
              stroke={CHART_COLORS.savings}
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorSavingsProgress)"
              name="Savings"
              dot={(props) => {
                const { cx, cy, payload } = props;
                if (payload?.isCurrent) {
                  return (
                    <circle
                      key={`current-${cx}`}
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill="#0f172a"
                      stroke={CHART_COLORS.savings}
                      strokeWidth={2.5}
                    />
                  );
                }
                return null;
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}