import { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from 'recharts';
import api from '../../services/api';
import toast from 'react-hot-toast';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9', '#ec4899', '#14b8a6', '#f97316', '#64748b'];

function KpiCard({ icon, label, value, sub, color = 'border-primary-500', loading }) {
  if (loading) return <div className="card-sm h-24 animate-pulse bg-slate-800/40 rounded-xl" />;
  return (
    <div className={`card-sm flex items-center gap-3 border-l-4 ${color} hover:border-opacity-80 transition-all`}>
      <span className="text-xl flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-tight">{label}</p>
        <p className="text-xl font-extrabold text-slate-100 mt-0.5 leading-tight">{value}</p>
        {sub && <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Date filters
  const [rangePreset, setRangePreset] = useState('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams();
      if (rangePreset !== 'custom') {
        const end = new Date();
        const start = new Date();
        if (rangePreset === 'today') start.setHours(0,0,0,0);
        else if (rangePreset === '7d') start.setDate(end.getDate() - 7);
        else if (rangePreset === '30d') start.setDate(end.getDate() - 30);
        else if (rangePreset === '90d') start.setDate(end.getDate() - 90);
        else if (rangePreset === 'year') start.setMonth(0, 1);
        params.append('startDate', start.toISOString());
        params.append('endDate', end.toISOString());
      } else {
        if (customStart) params.append('startDate', new Date(customStart).toISOString());
        if (customEnd) params.append('endDate', new Date(customEnd).toISOString());
      }
      // Add timezone offset so server can use it if needed
      params.append('timezone', new Date().getTimezoneOffset().toString());

      const res = await api.get(`/admin/analytics?${params.toString()}`);
      setData(res.data.data);
    } catch (err) {
      setError(true);
      toast.error('Failed to load analytics.');
    } finally {
      setLoading(false);
    }
  }, [rangePreset, customStart, customEnd]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleExport = (type, format) => {
    const params = new URLSearchParams();
    if (rangePreset !== 'custom') {
      const end = new Date();
      const start = new Date();
      if (rangePreset === 'today') start.setHours(0,0,0,0);
      else if (rangePreset === '7d') start.setDate(end.getDate() - 7);
      else if (rangePreset === '30d') start.setDate(end.getDate() - 30);
      else if (rangePreset === '90d') start.setDate(end.getDate() - 90);
      else if (rangePreset === 'year') start.setMonth(0, 1);
      params.append('startDate', start.toISOString());
      params.append('endDate', end.toISOString());
    } else {
      if (customStart) params.append('startDate', new Date(customStart).toISOString());
      if (customEnd) params.append('endDate', new Date(customEnd).toISOString());
    }
    params.append('format', format);
    
    // Bug 2 Fix: Get access token and append as query parameter
    const token = localStorage.getItem('accessToken');
    if (!token) {
      toast.error('Authentication token missing. Please log in again.');
      return;
    }
    params.append('token', token);
    
    window.location.href = `${import.meta.env.VITE_API_URL}/admin/analytics/export/${type}?${params.toString()}`;
  };

  const fmt = (n) => (n ?? 0).toLocaleString('en-IN');

  const GrowthIndicator = ({ val }) => {
    if (val > 0) return <span className="text-emerald-400">↑ {val.toFixed(1)}%</span>;
    if (val < 0) return <span className="text-red-400">↓ {Math.abs(val).toFixed(1)}%</span>;
    return <span className="text-slate-500">— 0%</span>;
  };

  if (error) {
    return (
      <div className="card border-red-500/30 text-center py-8">
        <p className="text-sm text-red-400 mb-3">Unable to load analytics.</p>
        <button onClick={fetchAnalytics} className="btn btn-secondary text-xs">Try Again</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters & Export */}
      <div className="card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <select 
            value={rangePreset} 
            onChange={(e) => setRangePreset(e.target.value)}
            className="input-field text-xs py-1.5 min-w-[120px]"
          >
            <option value="today">Today</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="year">This Year</option>
            <option value="custom">Custom Range</option>
          </select>
          {rangePreset === 'custom' && (
            <div className="flex items-center gap-2">
              <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="input-field text-xs py-1.5" />
              <span className="text-slate-500 text-xs">to</span>
              <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="input-field text-xs py-1.5" />
            </div>
          )}
          <button onClick={fetchAnalytics} className="btn btn-secondary text-xs py-1.5 px-3">↺ Refresh</button>
        </div>
        <div className="flex items-center gap-2">
          <div className="dropdown relative group">
            <button className="btn btn-secondary text-xs py-1.5 px-3">📄 Export Report ▾</button>
            <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button onClick={() => handleExport('analytics', 'pdf')} className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-slate-700">Analytics (PDF)</button>
              <button onClick={() => handleExport('analytics', 'excel')} className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-slate-700">Analytics (Excel)</button>
              <button onClick={() => handleExport('analytics', 'csv')} className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-slate-700">Analytics (CSV)</button>
              <div className="h-px bg-slate-700 my-1"></div>
              <button onClick={() => handleExport('users', 'csv')} className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-slate-700">Users (CSV)</button>
              <button onClick={() => handleExport('security', 'csv')} className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-slate-700">Security Events (CSV)</button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard loading={loading} icon="👥" label="Total Users" value={fmt(data?.userMetrics?.total)} color="border-slate-500" />
        <KpiCard loading={loading} icon="✅" label="Active Accounts" value={fmt(data?.userMetrics?.activeAccounts)} color="border-primary-500" />
        <KpiCard loading={loading} icon="🚀" label="New Users" value={fmt(data?.userMetrics?.newCurrentPeriod)} sub={<GrowthIndicator val={data?.userMetrics?.userGrowthPct} />} color="border-emerald-500" />
        <KpiCard loading={loading} icon="🔥" label="Active Users (Period)" value={fmt(data?.userMetrics?.activeUsers)} color="border-amber-500" />
        <KpiCard loading={loading} icon="💸" label="Total Expenses" value={fmt(data?.financialMetrics?.expensesByCurrency?.reduce((a,b)=>a+b.count,0))} sub="Transactions" color="border-red-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Chart */}
        <div className="card space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Top Categories (Global)</h3>
          <div className="h-64">
            {loading ? <div className="w-full h-full bg-slate-800/40 rounded animate-pulse" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data?.categoryDistribution} dataKey="totalAmount" nameKey="_id" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                    {data?.categoryDistribution?.map((entry, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(val, name) => [fmt(val), name]} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Currency Volumes */}
        <div className="card space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Transaction Volume by Currency</h3>
          <div className="h-64">
            {loading ? <div className="w-full h-full bg-slate-800/40 rounded animate-pulse" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.financialMetrics?.expensesByCurrency}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="_id" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => v>=1000?`${(v/1000).toFixed(1)}k`:v} />
                  <RechartsTooltip formatter={(val) => fmt(val)} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} cursor={{fill: '#334155', opacity: 0.4}} />
                  <Bar dataKey="totalAmount" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expense Amount" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
