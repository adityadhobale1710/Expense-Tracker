import { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import ChartCard from './ChartCard';

export default function WaterfallChart({
  summary = {},
  categoryData = [],
  currencySymbol = '₹'
}) {
  const { totalIncome = 0, balance = 0 } = summary;

  const chartData = useMemo(() => {
    if (totalIncome === 0) return [];

    const data = [];
    let runningTotal = totalIncome;

    // 1. Initial Bar: Total Income
    data.push({
      name: 'Inflow',
      range: [0, totalIncome],
      amount: totalIncome,
      type: 'inflow'
    });

    // 2. Middle Bars: Expense Categories
    // Take top 6 categories or whatever exists
    const topCategories = [...categoryData].slice(0, 6);
    
    topCategories.forEach((cat) => {
      const nextTotal = Math.max(0, runningTotal - cat.total);
      data.push({
        name: cat.name,
        range: [nextTotal, runningTotal],
        amount: -cat.total,
        type: 'expense'
      });
      runningTotal = nextTotal;
    });

    // If there is any remaining "Other" expenses not captured in top 6:
    const totalTopExp = topCategories.reduce((sum, c) => sum + c.total, 0);
    const totalExp = categoryData.reduce((sum, c) => sum + c.total, 0);
    const otherExp = Math.max(0, totalExp - totalTopExp);

    if (otherExp > 0) {
      const nextTotal = Math.max(0, runningTotal - otherExp);
      data.push({
        name: 'Other Outflows',
        range: [nextTotal, runningTotal],
        amount: -otherExp,
        type: 'expense'
      });
      runningTotal = nextTotal;
    }

    // 3. Final Bar: Net Savings / Remaining Balance
    data.push({
      name: 'Net Balance',
      range: [0, runningTotal],
      amount: runningTotal,
      type: 'balance'
    });

    return data;
  }, [totalIncome, categoryData]);

  if (chartData.length === 0) {
    return (
      <ChartCard title="Outflow Waterfall Bridge" subtitle="Flow bridges from income to balance">
        <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs">
          Record cash flows to compile the waterfall analysis.
        </div>
      </ChartCard>
    );
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const displayAmt = Math.abs(item.amount);
      const label = item.name;
      
      return (
        <div className="bg-dark-950 border border-slate-700/80 p-3 rounded-xl shadow-2xl text-[11px] font-bold text-slate-200">
          <p className="uppercase text-[9px] text-slate-400 mb-1">{label}</p>
          <p className="font-mono text-xs">
            Amount:{' '}
            <span className={item.type === 'inflow' || item.type === 'balance' ? 'text-emerald-400' : 'text-rose-455'}>
              {item.amount < 0 ? '-' : ''}{currencySymbol}{displayAmt.toLocaleString('en-IN')}
            </span>
          </p>
          {item.type === 'expense' && (
            <p className="text-[10px] text-slate-550 mt-0.5">
              Draws down balance to {currencySymbol}{Math.round(item.range[0]).toLocaleString('en-IN')}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <ChartCard
      title="Outflow Bridge Analyser"
      subtitle="Sequential breakdown showing how outflows draw down your total earnings"
      infoText="Tracks balance decay sequentially. Starting from income inflow, each category bar floats between the start and end balances, landing on the final liquid net balance."
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
          <XAxis
            dataKey="name"
            stroke="var(--chart-text)"
            fontSize={9}
            tickLine={false}
          />
          <YAxis
            stroke="var(--chart-text)"
            fontSize={9}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `₹${v}`}
          />
          <Tooltip content={<CustomTooltip />} />
          
          <Bar dataKey="range">
            {chartData.map((entry, index) => {
              // Color selection based on bridge type
              let color = '#3b82f6'; // blue (balance)
              if (entry.type === 'inflow') color = '#10b981'; // emerald
              else if (entry.type === 'expense') color = '#ef4444'; // rose

              return (
                <Cell 
                  key={`cell-${index}`} 
                  fill={color} 
                  fillOpacity={0.8}
                  className="hover:fill-opacity-100 transition-all duration-300"
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
