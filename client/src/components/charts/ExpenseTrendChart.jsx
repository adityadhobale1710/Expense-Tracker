import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export default function ExpenseTrendChart({ trendData }) {
  if (!trendData || trendData.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 bg-dark-800/80 border border-slate-700/60 rounded-2xl p-6">
        <p className="text-sm font-semibold text-slate-500">Log entries to map averages and prediction curves</p>
      </div>
    );
  }

  // Formatting date labels
  const formattedData = trendData.map((d) => {
    const dateObj = new Date(d.date);
    return {
      ...d,
      formattedDate: dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    };
  });

  return (
    <div className="flex flex-col p-6 bg-dark-800/80 border border-slate-700/60 rounded-3xl shadow-xl space-y-4">
      <div>
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Historical Spending & Predictive Trends</h3>
        <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Smoothing fluctuations via rolling averages overlaying projection algorithms</p>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
            <XAxis
              dataKey="formattedDate"
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
              formatter={(val, name) => [`₹${val.toLocaleString('en-IN')}`, name]}
            />
            <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} iconType="circle" />

            <Line type="monotone" dataKey="amount" stroke="#94a3b8" strokeOpacity={0.4} strokeWidth={1} dot={false} name="Daily Incurred" />
            <Line type="monotone" dataKey="rolling7" stroke="#f59e0b" strokeWidth={2.5} dot={false} name="7-Day Rolling Avg" />
            <Line type="monotone" dataKey="rolling30" stroke="#3b82f6" strokeWidth={2.5} dot={false} name="30-Day Rolling Avg" />
            <Line type="monotone" dataKey="prediction" stroke="#10b981" strokeDasharray="5 5" strokeWidth={2} dot={false} name="Regression Forecast" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
