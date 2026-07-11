import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';

export default function TopCategoriesChart({ categoryData }) {
  if (!categoryData || categoryData.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 bg-dark-800/80 border border-slate-700/60 rounded-2xl p-6">
        <p className="text-sm font-semibold text-slate-500">Record expenses to display ranks</p>
      </div>
    );
  }

  // Take top 10 categories ranked by total spent
  const topTenData = [...categoryData]
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  return (
    <div className="flex flex-col p-6 bg-dark-800/80 border border-slate-700/60 rounded-3xl shadow-xl space-y-4">
      <div>
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Top 10 Outlay Categories</h3>
        <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Horizontal rank breakdown of highest cost centers</p>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={topTenData}
            layout="vertical"
            margin={{ top: 10, right: 15, left: 15, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" horizontal={false} />
            <XAxis
              type="number"
              stroke="var(--chart-text)"
              fontSize={10}
              tickLine={false}
              tickFormatter={(v) => `₹${v}`}
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke="var(--chart-text)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              width={70}
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
            
            <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={16}>
              {topTenData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color || '#6366f1'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
