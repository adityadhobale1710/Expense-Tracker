import React from 'react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend 
} from 'recharts';

/**
 * 3-Month cash flow forecast area chart component
 */
export default function CashFlowChart({ forecast = [] }) {
  if (forecast.length === 0) {
    return (
      <div className="bg-dark-800 border border-slate-700/50 rounded-2xl p-5 shadow-lg flex items-center justify-center h-72">
        <p className="text-xs text-slate-500 italic">Insufficient forecast data available.</p>
      </div>
    );
  }

  return (
    <div className="bg-dark-800 border border-slate-700/50 rounded-2xl p-5 shadow-lg space-y-4">
      <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
        3-Month Cash Flow Forecast
      </h4>
      <div className="h-60 w-full text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={forecast} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
            <XAxis dataKey="month" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" tickFormatter={(v) => `₹${v}`} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc' }}
              formatter={(v) => [`₹${v.toLocaleString('en-IN')}`]}
            />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            <Area type="monotone" dataKey="projectedIncome" stroke="#6366f1" fillOpacity={1} fill="url(#colorIncome)" name="Projected Income" />
            <Area type="monotone" dataKey="projectedExpense" stroke="#f43f5e" fillOpacity={1} fill="url(#colorExpense)" name="Projected Spending" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
