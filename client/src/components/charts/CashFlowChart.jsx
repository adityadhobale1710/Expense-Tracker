import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export default function CashFlowChart({ cashflowData }) {
  if (!cashflowData || cashflowData.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 bg-dark-800/80 border border-slate-700/60 rounded-2xl p-6">
        <p className="text-sm font-semibold text-slate-500">Record cash transactions to see cumulative flow lines</p>
      </div>
    );
  }

  // Pre-process date labels for ticks
  const formattedData = cashflowData.map((d) => {
    const dateObj = new Date(d.date);
    return {
      ...d,
      formattedDate: dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    };
  });

  return (
    <div className="flex flex-col p-6 bg-dark-800/80 border border-slate-700/60 rounded-3xl shadow-xl space-y-4">
      <div>
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Cumulative Net Cash Flow</h3>
        <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Running balance overlaying income inflows and expense outflows</p>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id="flowIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="flowExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>

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
              formatter={(val) => `₹${val.toLocaleString('en-IN')}`}
            />
            <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} iconType="circle" />

            <Area type="monotone" dataKey="income" fill="url(#flowIncome)" stroke="#10b981" strokeWidth={1.5} name="Income Inflow" />
            <Area type="monotone" dataKey="expense" fill="url(#flowExpense)" stroke="#ef4444" strokeWidth={1.5} name="Expense Outflow" />
            <Line type="monotone" dataKey="runningBalance" stroke="#3b82f6" strokeWidth={3} dot={false} name="Running Balance" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
