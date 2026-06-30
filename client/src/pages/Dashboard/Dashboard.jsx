import { useEffect } from 'react';
import { useExpense } from '../../context/ExpenseContext';
import { useAuth } from '../../context/AuthContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import api from '../../services/api';
import { useState } from 'react';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const StatCard = ({ icon, label, amount, color, trend }) => (
  <div className="stat-card animate-fade-in">
    <div className={`stat-icon ${color}`}>
      <span className="text-2xl">{icon}</span>
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-slate-100 mt-0.5 truncate">
        ₹{Number(amount || 0).toLocaleString('en-IN')}
      </p>
      {trend !== undefined && (
        <p className={`text-xs mt-1 ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}% vs last month
        </p>
      )}
    </div>
  </div>
);

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

export default function Dashboard() {
  const { summary, fetchSummary, expenses, fetchExpenses, incomes, fetchIncomes, budgets, fetchBudgets } = useExpense();
  const { user } = useAuth();
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchSummary(), fetchExpenses({ limit: 5 }), fetchIncomes({ limit: 5 }), fetchBudgets()]);
      // fetch monthly trend
      try {
        const { data } = await api.get('/reports/monthly');
        const { incomes: inc, expenses: exp } = data.data;
        const now = new Date();
        const months = Array.from({ length: 6 }, (_, i) => {
          const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
          return { month: MONTHS[d.getMonth()], year: d.getFullYear(), m: d.getMonth() + 1, y: d.getFullYear() };
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

  // Combine & sort recent transactions
  const recent = [
    ...expenses.slice(0, 5).map((e) => ({ ...e, _type: 'expense' })),
    ...incomes.slice(0, 5).map((i) => ({ ...i, _type: 'income' })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon="💰" label="Total Income" amount={summary?.totalIncome} color="bg-green-500/10" />
        <StatCard icon="💸" label="Total Expenses" amount={summary?.totalExpense} color="bg-red-500/10" />
        <StatCard icon="🏦" label="Net Balance" amount={summary?.balance} color="bg-primary-500/10" />
        <StatCard icon="📊" label="Savings Rate" amount={`${summary?.savingsRate || 0}%`} color="bg-yellow-500/10" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="card xl:col-span-2">
          <h3 className="text-base font-semibold text-slate-100 mb-4">Income vs Expenses (6 months)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
              <Bar dataKey="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expense" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Budget Overview */}
        <div className="card">
          <h3 className="text-base font-semibold text-slate-100 mb-4">Budget Status</h3>
          <div className="space-y-4">
            {budgets.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">No budgets set</p>
            ) : budgets.slice(0, 5).map((b) => {
              const pct = b.limit > 0 ? Math.min(Math.round((b.spent / b.limit) * 100), 100) : 0;
              const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-green-500';
              return (
                <div key={b._id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span>{b.category?.icon || '📁'}</span>
                      <span className="text-sm text-slate-300">{b.category?.name || 'Budget'}</span>
                    </div>
                    <span className="text-xs text-slate-400">{pct}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className={`progress-fill ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-slate-500">₹{b.spent.toLocaleString('en-IN')}</span>
                    <span className="text-xs text-slate-500">₹{b.limit.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <h3 className="text-base font-semibold text-slate-100 mb-4">Recent Transactions</h3>
        {recent.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">No transactions yet. Add income or expenses to get started!</p>
        ) : (
          <div className="divide-y divide-slate-700/30">
            {recent.map((t) => (
              <div key={t._id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base ${t._type === 'income' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                    {t._type === 'income' ? '💰' : (t.category?.icon || '💸')}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-200">{t.title}</p>
                    <p className="text-xs text-slate-500">{new Date(t.date).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>
                <span className={`text-sm font-semibold ${t._type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                  {t._type === 'income' ? '+' : '-'}₹{Number(t.amount).toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
