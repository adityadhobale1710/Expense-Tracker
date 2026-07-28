import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar
} from 'recharts';

// 1. Savings Growth over time (Historical Cumulative)
export function SavingsGrowthChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-72 bg-dark-850 border border-slate-700/35 rounded-2xl">
        <p className="text-xs font-semibold text-slate-500">Log contributions to map historical savings velocity</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-6 bg-dark-800/80 border border-slate-700/60 rounded-3xl shadow-xl space-y-4">
      <div>
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Savings Growth & Velocity</h3>
        <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Historical cumulative totals tracking monthly deposits</p>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="colorSaved" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
            <XAxis dataKey="month" stroke="var(--chart-text)" fontSize={10} tickLine={false} />
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
              formatter={(val) => [`₹${val.toLocaleString('en-IN')}`, 'Total Saved']}
            />
            <Area
              type="monotone"
              dataKey="cumulative"
              stroke="#10b981"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorSaved)"
              name="Cumulative Savings"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// 2. Category Comparison (Target vs Saved)
export function CategoryComparisonChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-72 bg-dark-850 border border-slate-700/35 rounded-2xl">
        <p className="text-xs font-semibold text-slate-500">Create goals in multiple categories to map breakdowns</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-6 bg-dark-800/80 border border-slate-700/60 rounded-3xl shadow-xl space-y-4">
      <div>
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Breakdown By Category</h3>
        <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Contrasting targeted balances against accumulated savings by category</p>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
            <XAxis dataKey="category" stroke="var(--chart-text)" fontSize={10} tickLine={false} />
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
            <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} iconType="circle" />
            <Bar dataKey="target" fill="#6366f1" radius={[4, 4, 0, 0]} name="Target" />
            <Bar dataKey="saved" fill="#10b981" radius={[4, 4, 0, 0]} name="Saved" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// 3. Savings Forecast (Projected values for next 6 months)
export function SavingsForecastChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-72 bg-dark-850 border border-slate-700/35 rounded-2xl">
        <p className="text-xs font-semibold text-slate-500">Compile savings rate data to map projections</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-6 bg-dark-800/80 border border-slate-700/60 rounded-3xl shadow-xl space-y-4">
      <div>
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">6-Month Wealth Projection</h3>
        <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Simulated savings path overlaying current velocity patterns</p>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
            <XAxis dataKey="month" stroke="var(--chart-text)" fontSize={10} tickLine={false} />
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
              formatter={(val) => [`₹${val.toLocaleString('en-IN')}`, 'Projected Balance']}
            />
            <Area
              type="monotone"
              dataKey="projectedAmount"
              stroke="#3b82f6"
              strokeWidth={2.5}
              strokeDasharray="4 4"
              fillOpacity={1}
              fill="url(#colorForecast)"
              name="Projected Balance"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default { SavingsGrowthChart, CategoryComparisonChart, SavingsForecastChart };
