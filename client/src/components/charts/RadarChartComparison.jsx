import { useMemo } from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, Legend } from 'recharts';
import ChartCard from './ChartCard';

export default function RadarChartComparison({
  summary = {},
  budgets = [],
  loans = [],
  investments = [],
  currencySymbol = '₹'
}) {
  const { totalIncome = 0, totalExpense = 0, savings = 0 } = summary;

  const radarData = useMemo(() => {
    // 1. Expense Allocation
    const budgetLimitSum = budgets.reduce((sum, b) => sum + b.limit, 0) || 30000;
    const actualExpense = totalExpense;

    // 2. Income Allocation
    const budgetedIncome = totalIncome || 50000; // baseline standard
    const actualIncome = totalIncome;

    // 3. Savings Allocation
    const budgetedSavings = budgetedIncome * 0.2; // standard 20% rule
    const actualSavings = savings;

    // 4. Investment Allocation
    const budgetedInvestments = budgetedIncome * 0.15; // standard 15% rule
    const actualInvestments = investments.reduce((sum, i) => sum + i.investedAmount, 0);

    // 5. Debt/Loan Allocation
    const budgetedDebt = loans.reduce((sum, l) => sum + l.emiAmount, 0) || 5000;
    const actualDebt = loans.reduce((sum, l) => sum + l.emiAmount, 0);

    return [
      { subject: 'Income', Budget: budgetedIncome, Actual: actualIncome },
      { subject: 'Expense', Budget: budgetLimitSum, Actual: actualExpense },
      { subject: 'Savings', Budget: budgetedSavings, Actual: actualSavings },
      { subject: 'Investment', Budget: budgetedInvestments, Actual: actualInvestments },
      { subject: 'Debt', Budget: budgetedDebt, Actual: actualDebt }
    ];
  }, [summary, budgets, loans, investments]);

  return (
    <ChartCard
      title="Solvency Comparison radar"
      subtitle="Multi-axis comparative overview matching actual performance against budget targets"
      infoText="A radar profile comparison. Evaluates multi-dimensional financial targets (purple) against your real inflows/outflows (green). A larger green area indicates healthy budget compliance."
    >
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" radius="70%" data={radarData}>
          <PolarGrid stroke="var(--chart-grid)" />
          <PolarAngleAxis
            dataKey="subject"
            stroke="var(--chart-text)"
            fontSize={10}
            fontWeight="bold"
          />
          <PolarRadiusAxis 
            angle={30} 
            domain={[0, 'dataMax']} 
            stroke="var(--chart-text)"
            fontSize={8}
            tickLine={false}
            axisLine={false}
          />
          
          <Tooltip
            contentStyle={{
              background: 'var(--chart-tooltip-bg)',
              border: '1px solid var(--chart-tooltip-border)',
              borderRadius: '10px',
              color: 'var(--chart-tooltip-text)',
              fontSize: '11px',
              fontWeight: 'bold'
            }}
            formatter={(value) => `${currencySymbol}${value.toLocaleString()}`}
          />
          <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} iconType="circle" />
          
          <Radar
            name="Allocated Budget"
            dataKey="Budget"
            stroke="#a855f7"
            fill="#a855f7"
            fillOpacity={0.15}
          />
          <Radar
            name="Actual Performance"
            dataKey="Actual"
            stroke="#10b981"
            fill="#10b981"
            fillOpacity={0.25}
          />
        </RadarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
