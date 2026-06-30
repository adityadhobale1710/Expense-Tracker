import { useEffect, useState } from 'react';
import api from '../../services/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, Tooltip as PieTooltip
} from 'recharts';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const COLORS = ['#6366f1','#22c55e','#f97316','#ec4899','#3b82f6','#eab308','#14b8a6','#8b5cf6','#f43f5e','#06b6d4'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark-800 border border-slate-700 rounded-xl p-3 shadow-xl">
      <p className="text-xs text-slate-400 mb-2">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-sm font-medium" style={{ color: p.color }}>
          {p.name}: ₹{Number(p.value).toLocaleString('en-IN')}
        </p>
      ))}
    </div>
  );
};

export default function Reports() {
  const [summary, setSummary] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [sumRes, monthRes, catRes] = await Promise.all([
          api.get('/reports/summary'),
          api.get('/reports/monthly'),
          api.get('/reports/by-category'),
        ]);

        setSummary(sumRes.data.data);
        setCategoryData(catRes.data.data);

        const { incomes: inc, expenses: exp } = monthRes.data.data;
        const now = new Date();
        const months = Array.from({ length: 6 }, (_, i) => {
          const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
          return { month: MONTHS[d.getMonth()], m: d.getMonth() + 1, y: d.getFullYear() };
        });
        setChartData(months.map(({ month, m, y }) => ({
          month,
          Income: inc.find((x) => x._id.month === m && x._id.year === y)?.total || 0,
          Expense: exp.find((x) => x._id.month === m && x._id.year === y)?.total || 0,
        })));
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">This month's financial overview</p>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Income', value: summary?.totalIncome, color: 'text-green-400', icon: '💰' },
          { label: 'Expenses', value: summary?.totalExpense, color: 'text-red-400', icon: '💸' },
          { label: 'Balance', value: summary?.balance, color: 'text-primary-400', icon: '🏦' },
          { label: 'Savings Rate', value: `${summary?.savingsRate || 0}%`, color: 'text-yellow-400', icon: '📊', raw: true },
        ].map(({ label, value, color, icon, raw }) => (
          <div key={label} className="card text-center">
            <p className="text-2xl mb-2">{icon}</p>
            <p className={`text-xl font-bold ${color}`}>{raw ? value : `₹${Number(value || 0).toLocaleString('en-IN')}`}</p>
            <p className="text-xs text-slate-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Line Chart */}
      <div className="card">
        <h3 className="text-base font-semibold text-slate-100 mb-4">Monthly Trend (6 months)</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
            <Line type="monotone" dataKey="Income" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 4, fill: '#22c55e' }} />
            <Line type="monotone" dataKey="Expense" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, fill: '#6366f1' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Pie + Table */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Pie chart */}
        <div className="card">
          <h3 className="text-base font-semibold text-slate-100 mb-4">Expenses by Category</h3>
          {categoryData.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No expense data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={categoryData} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <PieTooltip formatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Category table */}
        <div className="card">
          <h3 className="text-base font-semibold text-slate-100 mb-4">Category Breakdown</h3>
          {categoryData.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No data available</p>
          ) : (
            <div className="space-y-3">
              {categoryData.map((c, i) => {
                const maxVal = categoryData[0]?.total || 1;
                const pct = Math.round((c.total / maxVal) * 100);
                return (
                  <div key={c._id || i}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{c.icon}</span>
                        <span className="text-sm text-slate-300">{c.name}</span>
                        <span className="text-xs text-slate-500">({c.count} txns)</span>
                      </div>
                      <span className="text-sm font-semibold text-slate-100">₹{Number(c.total).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
