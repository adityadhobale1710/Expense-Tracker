import React from 'react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend 
} from 'recharts';

/**
 * Budget Trend Chart to map category limit vs spent margins
 */
export default function BudgetTrendChart({ budgets = [] }) {
  if (budgets.length === 0) {
    return (
      <div className="bg-dark-800 border border-slate-700/50 rounded-2xl p-5 shadow-lg flex items-center justify-center h-72">
        <p className="text-xs text-slate-500 italic">No configured budgets found.</p>
      </div>
    );
  }

  return (
    <div className="bg-dark-800 border border-slate-700/50 rounded-2xl p-5 shadow-lg space-y-4">
      <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
        Budget Limit vs Spent
      </h4>
      <div className="h-60 w-full text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={budgets} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
            <XAxis dataKey="category" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" tickFormatter={(v) => `₹${v}`} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc' }}
              formatter={(v) => [`₹${v.toLocaleString('en-IN')}`]}
            />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            <Bar dataKey="limit" fill="#4f46e5" name="Budget Limit" radius={[4, 4, 0, 0]} />
            <Bar dataKey="spent" fill="#f43f5e" name="Amount Spent" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
