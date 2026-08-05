import React from 'react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Cell 
} from 'recharts';

/**
 * Spending Chart to show category aggregates and highlight anomaly lists
 */
export default function SpendingChart({ categoryBreakdown = [], anomalies = [] }) {
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#a855f7'];

  return (
    <div className="bg-dark-800 border border-slate-700/50 rounded-2xl p-5 shadow-lg space-y-4">
      <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
        Spending Category Allocation
      </h4>
      
      {categoryBreakdown.length === 0 ? (
        <div className="flex items-center justify-center h-44 text-slate-500 text-xs italic">
          No expenses recorded to build category charts.
        </div>
      ) : (
        <div className="h-44 w-full text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryBreakdown} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
              <XAxis dataKey="category" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" tickFormatter={(v) => `₹${v}`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc' }}
                formatter={(v) => [`₹${v.toLocaleString('en-IN')}`]}
              />
              <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]}>
                {categoryBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Anomalies segment */}
      {anomalies.length > 0 && (
        <div className="pt-3.5 border-t border-slate-700/30 space-y-2">
          <span className="text-[9px] font-black text-rose-450 uppercase tracking-widest block">
            Detected Anomalies
          </span>
          <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
            {anomalies.map((anom, idx) => (
              <div 
                key={idx} 
                className="bg-rose-500/5 border border-rose-500/15 p-2.5 rounded-xl text-[10px] text-rose-300 leading-normal"
              >
                <span className="font-bold text-rose-400 block">
                  ⚠️ {anom.title} • ₹{anom.amount.toLocaleString('en-IN')} ({anom.category})
                </span>
                <span className="text-slate-400 mt-0.5 block font-medium">
                  {anom.description}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
