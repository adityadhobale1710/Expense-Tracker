import { useState, useEffect } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function AnalyticsPro() {
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [incRes, expRes] = await Promise.all([
        api.get('/income'),
        api.get('/expenses')
      ]);
      setIncomes(incRes.data.data.incomes || []);
      setExpenses(expRes.data.data.expenses || []);
    } catch {
      toast.error('Failed to load transaction data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Format cash flow (Group by month name)
  const getCashFlowData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const flow = months.map(m => ({ name: m, Income: 0, Expense: 0 }));

    incomes.forEach(i => {
      const date = new Date(i.date);
      if (date.getFullYear() === 2026) {
        flow[date.getMonth()].Income += i.amount;
      }
    });

    expenses.forEach(e => {
      const date = new Date(e.date);
      if (date.getFullYear() === 2026) {
        flow[date.getMonth()].Expense += e.amount;
      }
    });

    // Filter months with actual activities
    return flow.filter(f => f.Income > 0 || f.Expense > 0);
  };

  const cashFlowData = getCashFlowData();

  // Simulated heatmap cells (30 days of spending counts)
  const heatmapData = Array.from({ length: 30 }, (_, i) => {
    const day = i + 1;
    const dayTransactions = expenses.filter(e => {
      const d = new Date(e.date);
      return d.getDate() === day && d.getMonth() === new Date().getMonth();
    });
    return {
      day,
      count: dayTransactions.length,
      amount: dayTransactions.reduce((sum, e) => sum + e.amount, 0)
    };
  });

  // Simple Forecast logic (Next 3 months based on average)
  const getForecastData = () => {
    const avgExpense = expenses.length > 0 ? expenses.reduce((sum, e) => sum + e.amount, 0) / 3 : 18000;
    const avgIncome = incomes.length > 0 ? incomes.reduce((sum, i) => sum + i.amount, 0) / 3 : 25000;

    return [
      {
        name: 'Current Month',
        Income: Number(avgIncome.toFixed(2)),
        Expense: Number(avgExpense.toFixed(2))
      },
      {
        name: 'Next Month (Est)',
        Income: Number((avgIncome * 1.02).toFixed(2)),
        Expense: Number((avgExpense * 0.96).toFixed(2))
      },
      {
        name: 'Month 3 (Est)',
        Income: Number((avgIncome * 1.05).toFixed(2)),
        Expense: Number((avgExpense * 0.94).toFixed(2))
      }
    ];
  };

  const forecastData = getForecastData();

  const getHeatmapColor = (count) => {
    if (count === 0) return 'bg-slate-800/40 border border-slate-800';
    if (count <= 2) return 'bg-indigo-900/40 border border-indigo-900/60 text-indigo-400';
    if (count <= 4) return 'bg-indigo-700/50 border border-indigo-700 text-indigo-200';
    return 'bg-indigo-500 border border-indigo-400 text-white font-bold';
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Advanced Analytics</h1>
        <p className="text-xs text-slate-400 mt-0.5">Explore cash flows, forecasts, category matrices, and spending calendars</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card h-64 animate-pulse bg-slate-800/40" />
          <div className="card h-64 animate-pulse bg-slate-800/40" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cash Flow Line Chart */}
          <div className="card space-y-4">
            <h3 className="text-sm font-bold text-slate-200">2026 Monthly Cash Flow</h3>
            <div className="h-64 mt-4">
              {cashFlowData.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-20">Log transactions to trace curves</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cashFlowData}>
                    <defs>
                      <linearGradient id="incomeColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="expenseColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                    <XAxis dataKey="name" stroke="var(--chart-text)" fontSize={11} tick={{ fill: 'var(--chart-text)' }} />
                    <YAxis stroke="var(--chart-text)" fontSize={11} tick={{ fill: 'var(--chart-text)' }} />
                    <Tooltip contentStyle={{ background: 'var(--chart-tooltip-bg)', border: '1px solid var(--chart-tooltip-border)', color: 'var(--chart-tooltip-text)', borderRadius: '12px' }} />
                    <Legend />
                    <Area type="monotone" dataKey="Income" stroke="#10b981" fillOpacity={1} fill="url(#incomeColor)" />
                    <Area type="monotone" dataKey="Expense" stroke="#ef4444" fillOpacity={1} fill="url(#expenseColor)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* AI Projections & Forecast */}
          <div className="card space-y-4">
            <h3 className="text-sm font-bold text-slate-200">AI Expense & Savings Forecast</h3>
            <div className="h-64 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={forecastData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="name" stroke="var(--chart-text)" fontSize={11} tick={{ fill: 'var(--chart-text)' }} />
                  <YAxis stroke="var(--chart-text)" fontSize={11} tick={{ fill: 'var(--chart-text)' }} />
                  <Tooltip
                    formatter={(value) => `₹${value.toFixed(2)}`}
                    contentStyle={{ background: 'var(--chart-tooltip-bg)', border: '1px solid var(--chart-tooltip-border)', color: 'var(--chart-tooltip-text)', borderRadius: '12px' }}
                  />
                  <Legend />
                  <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Expense" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Spending Heatmap Calendar */}
          <div className="card lg:col-span-2 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-200">Current Month Daily Spending Heatmap</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Visual representation of transactions density over the calendar days</p>
            </div>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-3 pt-2">
              {heatmapData.map((d) => (
                <div
                  key={d.day}
                  title={`Day ${d.day}: ${d.count} transactions, ₹${d.amount}`}
                  className={`h-12 flex flex-col justify-between p-1.5 rounded-lg transition-all text-[9px] font-semibold cursor-default ${getHeatmapColor(d.count)}`}
                >
                  <span className="text-slate-400">Day {d.day}</span>
                  <span className="text-right text-[10px] font-extrabold">{d.count > 0 ? `${d.count}x` : ''}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
