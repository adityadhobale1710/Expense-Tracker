import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import ChartCard from './ChartCard';
import AnalyticsEmptyState from './AnalyticsEmptyState';
import { BarChart3 } from 'lucide-react';
import { CHART_COLORS } from '../../utils/chartTheme';

export default function MonthlyComparisonChart({ monthlyData }) {
  if (!monthlyData || monthlyData.length === 0) {
    return (
      <ChartCard title="Annual Monthly Comparisons" subtitle="Income, Expenses, and Savings">
        <AnalyticsEmptyState 
          icon={BarChart3} 
          title="No Monthly Data" 
          message="Record transactions to build monthly performance graphs." 
        />
      </ChartCard>
    );
  }

  return (
    <ChartCard 
      title="Annual Monthly Comparisons" 
      subtitle="Comparative flows of Income, Expenses, and Savings"
    >
      <div className="h-72 w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="var(--chart-text)"
              fontSize={10}
              tickLine={false}
            />
            <YAxis
              stroke="var(--chart-text)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `₹${v}`}
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
              formatter={(val) => `₹${val.toLocaleString('en-IN')}`}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }}
              iconType="circle"
            />
            
            <Bar dataKey="income" fill={CHART_COLORS.income} radius={[4, 4, 0, 0]} name="Income" />
            <Bar dataKey="expense" fill={CHART_COLORS.expense} radius={[4, 4, 0, 0]} name="Expense" />
            <Bar dataKey="savings" fill={CHART_COLORS.savings} radius={[4, 4, 0, 0]} name="Savings" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
