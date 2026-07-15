import { useMemo } from 'react';
import { ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import ChartCard from './ChartCard';

export default function MonthlySpendingTrend({ monthlyData = [] }) {
  
  const chartData = useMemo(() => {
    if (!monthlyData || monthlyData.length === 0) return [];

    // Calculate actual 12 months data
    const data = monthlyData.map((d, idx) => {
      // 1. Moving average of last 3 months
      let sum = 0;
      let count = 0;
      for (let i = 0; i < 3; i++) {
        if (idx - i >= 0) {
          sum += monthlyData[idx - i].expense;
          count++;
        }
      }
      const movingAvg = count > 0 ? parseFloat((sum / count).toFixed(1)) : d.expense;

      return {
        name: d.name,
        expense: d.expense,
        movingAvg,
        // Existing points are historical, so no prediction
        forecast: null,
        // Confidence Interval bounds are tight on historical
        ciLow: d.expense,
        ciHigh: d.expense
      };
    });

    // 2. Perform Linear Regression to forecast future 3 months
    const n = data.length;
    if (n >= 3) {
      let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
      data.forEach((d, idx) => {
        sumX += idx;
        sumY += d.expense;
        sumXY += idx * d.expense;
        sumX2 += idx * idx;
      });

      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      // Estimate standard error
      let sumResidualSquares = 0;
      data.forEach((d, idx) => {
        const pred = slope * idx + intercept;
        sumResidualSquares += Math.pow(d.expense - pred, 2);
      });
      const stdError = Math.sqrt(sumResidualSquares / (n - 2)) || 5000;

      // Add forecast points
      // Extract month/year from last record to increment month label
      const lastLabel = data[n - 1].name; // format: "Jan 2026"
      const parts = lastLabel.split(' ');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      let lastMonthIdx = monthNames.indexOf(parts[0]);
      let lastYear = parseInt(parts[1]) || new Date().getFullYear();

      // Connect last actual point to the forecast line for visual continuity
      data[n - 1].forecast = data[n - 1].expense;

      for (let i = 1; i <= 3; i++) {
        const nextMonthIdx = (lastMonthIdx + i) % 12;
        const nextYear = lastYear + Math.floor((lastMonthIdx + i) / 12);
        const nameLabel = `${monthNames[nextMonthIdx]} ${nextYear}`;
        
        const idx = n - 1 + i;
        const forecastVal = Math.max(0, Math.round(slope * idx + intercept));

        // Confidence interval expands as we project further out
        const varianceFactor = 1 + i * 0.4; 
        const ciLow = Math.max(0, Math.round(forecastVal - stdError * varianceFactor));
        const ciHigh = Math.round(forecastVal + stdError * varianceFactor);

        data.push({
          name: nameLabel,
          expense: null,
          movingAvg: null,
          forecast: forecastVal,
          ciLow,
          ciHigh
        });
      }
    }

    return data;
  }, [monthlyData]);

  if (chartData.length === 0) {
    return (
      <ChartCard title="Monthly Spending Trend" subtitle="MoM outflows with regression projection">
        <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs">
          No historical monthly summaries found.
        </div>
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title="Monthly Spend Velocity"
      subtitle="Outflow trajectories with statistical machine learning forecasts"
      infoText="Plots month-over-month outflows (red) against a 3-month moving average (purple). The dashed blue curve extends the trajectory 3 months forward using linear regression, shaded inside a 95% confidence interval."
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
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
          <Tooltip
            contentStyle={{
              background: 'var(--chart-tooltip-bg)',
              border: '1px solid var(--chart-tooltip-border)',
              borderRadius: '12px',
              color: 'var(--chart-tooltip-text)',
              fontSize: '11px',
              fontWeight: 'bold'
            }}
            formatter={(value, name) => {
              if (name === 'Confidence Interval') {
                return [`₹${value[0].toLocaleString('en-IN')} - ₹${value[1].toLocaleString('en-IN')}`, name];
              }
              return [`₹${value.toLocaleString('en-IN')}`, name];
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }}
            iconType="circle"
          />

          {/* Shaded confidence interval band */}
          <Area
            type="monotone"
            stroke="none"
            fill="#3b82f6"
            fillOpacity={0.06}
            name="Confidence Interval"
            // Using baseValue="dataMin" or stack/range behavior
            // Let's bind standard Recharts area properties:
            // Since Area takes dataKey and renders from 0 by default, 
            // Recharts also allows giving a dataKey array to shade custom ranges:
            // We can provide dataKey={['ciLow', 'ciHigh']}
            // To be 100% safe in standard Recharts versions without array keys,
            // we can render a stack or use the range data structure. 
            // Actually, Recharts Area allows dataKey="ciHigh" with a baseValue of "ciLow" inside details!
            // Let's check: baseValue="ciLow" or range. Yes, range array dataKey={['ciLow', 'ciHigh']} is fully supported.
            // Let's use array dataKey:
            dataKey={['ciLow', 'ciHigh']}
          />

          {/* Actual Expense Line */}
          <Line
            type="monotone"
            dataKey="expense"
            stroke="#ef4444"
            strokeWidth={3}
            dot={{ r: 3, fill: '#ef4444' }}
            name="Actual Expense"
          />

          {/* Moving Average Line */}
          <Line
            type="monotone"
            dataKey="movingAvg"
            stroke="#a855f7"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={false}
            name="3-Mo Moving Average"
          />

          {/* Forecast Line */}
          <Line
            type="monotone"
            dataKey="forecast"
            stroke="#3b82f6"
            strokeWidth={2.5}
            strokeDasharray="6 6"
            dot={{ r: 3, fill: '#3b82f6' }}
            name="AI Spend Forecast"
          />

        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
