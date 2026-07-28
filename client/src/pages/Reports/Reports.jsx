import { useEffect, useState, useMemo } from 'react';
import api from '../../services/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import { TrendingUp, TrendingDown, Calendar, Wallet, List, Award, Percent } from 'lucide-react';
import toast from 'react-hot-toast';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Premium colors for specific categories
const getCategoryColor = (name, index) => {
  const n = (name || '').toLowerCase();
  if (n.includes('shopping')) return '#8b5cf6'; // Purple
  if (n.includes('food') || n.includes('dining')) return '#f97316'; // Orange
  if (n.includes('health') || n.includes('medical') || n.includes('gym')) return '#22c55e'; // Green
  if (n.includes('education') || n.includes('book') || n.includes('learning')) return '#3b82f6'; // Blue
  if (n.includes('transport') || n.includes('fuel') || n.includes('cab')) return '#ef4444'; // Red
  if (n.includes('entertainment') || n.includes('movie') || n.includes('netflix')) return '#ec4899'; // Pink
  if (n.includes('bill') || n.includes('rent') || n.includes('utility') || n.includes('recharge')) return '#6366f1'; // Indigo
  if (n.includes('other') || n.includes('uncategorized')) return '#64748b'; // Slate

  const COLORS = ['#6366f1','#22c55e','#f97316','#ec4899','#3b82f6','#eab308','#14b8a6','#8b5cf6','#f43f5e','#06b6d4'];
  return COLORS[index % COLORS.length];
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark-800 border border-slate-700/80 rounded-xl p-3 shadow-xl text-xs space-y-1">
      <p className="text-slate-400 font-medium mb-1.5">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-sm font-extrabold" style={{ color: p.color }}>
          {p.name}: ₹{Number(p.value).toLocaleString('en-IN')}
        </p>
      ))}
    </div>
  );
};

// Premium Custom Pie Tooltip
const CustomPieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  const avgExpense = data.count > 0 ? (data.total / data.count).toFixed(0) : 0;
  return (
    <div className="bg-dark-800 border border-slate-700/80 rounded-xl p-3.5 shadow-xl text-xs space-y-1.5 min-w-[150px]">
      <p className="text-[10px] uppercase font-black text-slate-500 tracking-wider flex items-center gap-1.5">
        <span>{data.icon}</span> <span>{data.name}</span>
      </p>
      <div className="border-t border-slate-700/50 my-1 pt-1 space-y-1">
        <p className="font-extrabold text-sm text-slate-100">
          ₹{Number(data.total).toLocaleString('en-IN')}
        </p>
        <p className="text-slate-400 font-medium">
          Share: <span className="text-primary-400 font-bold">{data.percentage || 0}%</span>
        </p>
        <p className="text-slate-400 font-medium">
          Transactions: <span className="text-slate-200 font-bold">{data.count}</span>
        </p>
        <p className="text-slate-400 font-medium">
          Avg Expense: <span className="text-emerald-450 font-bold">₹{Number(avgExpense).toLocaleString('en-IN')}</span>
        </p>
      </div>
    </div>
  );
};

export default function Reports() {
  const [summary, setSummary] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Active chart segment hover index
  const [activeIndex, setActiveIndex] = useState(-1);

  const load = async () => {
    setLoading(true);
    try {
      let params = {};
      if (customStartDate && customEndDate) {
        params.startDate = new Date(customStartDate).toISOString();
        params.endDate = new Date(customEndDate).toISOString();
      } else {
        params.month = selectedMonth;
        params.year = selectedYear;
        // Compute start/end dates for category aggregates in backend
        params.startDate = new Date(selectedYear, selectedMonth, 1).toISOString();
        params.endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59).toISOString();
      }

      const [sumRes, monthRes, catRes] = await Promise.all([
        api.get('/reports/summary', { params }),
        api.get('/reports/monthly'),
        api.get('/reports/by-category', { params: { startDate: params.startDate, endDate: params.endDate } }),
      ]);

      setSummary(sumRes.data.data);
      setCategoryData(catRes.data.data);

      const { incomes: inc, expenses: exp } = monthRes.data.data;
      const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
        return { month: MONTHS[d.getMonth()], m: d.getMonth() + 1, y: d.getFullYear() };
      });
      setChartData(months.map(({ month, m, y }) => ({
        month,
        Income: inc.find((x) => x._id.month === m && x._id.year === y)?.total || 0,
        Expense: exp.find((x) => x._id.month === m && x._id.year === y)?.total || 0,
      })));
    } catch {
      toast.error('Failed to load reports data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [selectedMonth, selectedYear]);

  const handleCustomRangeSubmit = (e) => {
    e.preventDefault();
    if (!customStartDate || !customEndDate) {
      toast.error('Please select both start and end dates.');
      return;
    }
    if (new Date(customStartDate) > new Date(customEndDate)) {
      toast.error('Start date cannot be after end date.');
      return;
    }
    load();
  };

  const handleClearCustomRange = () => {
    setCustomStartDate('');
    setCustomEndDate('');
    setSelectedMonth(now.getMonth());
    setSelectedYear(now.getFullYear());
  };

  // Memoize total category expenses
  const totalCategoryExpenses = useMemo(() => {
    return categoryData.reduce((sum, item) => sum + (item.total || 0), 0);
  }, [categoryData]);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="page-subtitle">Track trends, breakdown categories, and inspect budget indexes</p>
        </div>
      </div>

      {/* Modern Filter Section */}
      <div className="card p-4 space-y-4 border border-slate-700/30">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300 pb-2 border-b border-slate-700/20">
          <Calendar size={14} className="text-primary-400" />
          <span>Report Filter Presets</span>
        </div>
        <div className="flex flex-col lg:flex-row justify-between gap-4 text-xs">
          {/* Month & Year Selectors */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Select Month</label>
              <select
                disabled={!!customStartDate || !!customEndDate}
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="select py-2 text-xs bg-dark-900 border-slate-750 disabled:opacity-50"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx}>{name}</option>
                ))}
              </select>
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Select Year</label>
              <select
                disabled={!!customStartDate || !!customEndDate}
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="select py-2 text-xs bg-dark-900 border-slate-750 disabled:opacity-50"
              >
                <option value={2024}>2024</option>
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
              </select>
            </div>
          </div>

          {/* Custom Date Range */}
          <form onSubmit={handleCustomRangeSubmit} className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Start Date</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="input py-2 text-xs bg-dark-900 border-slate-750"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">End Date</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="input py-2 text-xs bg-dark-900 border-slate-750"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary py-2 px-4 text-xs font-bold uppercase tracking-wider">
                Apply Custom Range
              </button>
              {(customStartDate || customEndDate) && (
                <button
                  type="button"
                  onClick={handleClearCustomRange}
                  className="btn-secondary py-2 px-3 text-xs"
                >
                  Clear
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Summary Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Total Inflow', value: summary?.totalIncome, color: 'text-emerald-450', icon: '💰', trend: '+12% month-on-month', up: true },
              { label: 'Total Outflow', value: summary?.totalExpense, color: 'text-rose-450', icon: '💸', trend: '-3% from projection', up: false },
              { label: 'Net Balance', value: summary?.balance, color: 'text-primary-400', icon: '🏦', trend: 'Keep savings rates high', up: true },
              { label: 'Savings Rate', value: `${summary?.savingsRate || 0}%`, color: 'text-amber-450', icon: '📈', raw: true, trend: 'Target minimum 30%', up: true },
            ].map(({ label, value, color, icon, raw, trend, up }) => (
              <div key={label} className="card hover:border-slate-650 transition-all duration-300 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{label}</span>
                    <span className="text-base">{icon}</span>
                  </div>
                  <p className={`text-[28px] font-bold mt-1.5 leading-none ${color}`}>
                    {raw ? value : `₹${Number(value || 0).toLocaleString('en-IN')}`}
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-700/20 flex items-center gap-1 text-[9px] text-slate-500 font-bold uppercase">
                  {up ? <TrendingUp size={12} className="text-emerald-450" /> : <TrendingDown size={12} className="text-rose-450" />}
                  <span>{trend}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Analytics Charts Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* Left Col: Category Pie/Doughnut Card */}
            <div className="xl:col-span-2 card flex flex-col justify-between">
              <div className="pb-3 border-b border-slate-700/30 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-slate-100">Expenses by Category</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Overall category weight analysis</p>
                </div>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-1 rounded-xl">
                  {customStartDate ? 'Custom Range' : MONTH_NAMES[selectedMonth]}
                </span>
              </div>

              {categoryData.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <span className="text-3xl mb-2">📊</span>
                  <p className="text-xs text-slate-500">No expense records found for this period.</p>
                </div>
              ) : (
                <div className="pt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  
                  {/* perfect centered Doughnut chart */}
                  <div className="lg:col-span-6 relative flex items-center justify-center">
                    <div style={{ width: 230, height: 230 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryData}
                            dataKey="total"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={72}
                            outerRadius={95}
                            paddingAngle={2}
                            stroke="none"
                            onMouseEnter={(_, idx) => setActiveIndex(idx)}
                            onMouseLeave={() => setActiveIndex(-1)}
                          >
                            {categoryData.map((c, i) => (
                              <Cell
                                key={i}
                                fill={getCategoryColor(c.name, i)}
                                style={{
                                  filter: activeIndex === i ? 'drop-shadow(0 0 6px rgba(255,255,255,0.15))' : 'none',
                                  transformOrigin: '50% 50%',
                                  transform: activeIndex === i ? 'scale(1.02)' : 'scale(1)',
                                  transition: 'all 0.2s ease-in-out',
                                  cursor: 'pointer'
                                }}
                              />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomPieTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Perfectly centered labels inside doughnut */}
                    <div className="absolute text-center flex flex-col items-center">
                      <span className="text-[9px] uppercase font-black tracking-widest text-slate-500">Total Expenses</span>
                      <span className="text-xl font-bold text-slate-100 mt-0.5">
                        ₹{totalCategoryExpenses.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[9px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider">
                        {customStartDate ? 'Custom' : 'Monthly Spend'}
                      </span>
                    </div>
                  </div>

                  {/* Clean Legend list instead of crowded labels */}
                  <div className="lg:col-span-6 space-y-2.5">
                    {categoryData.map((c, i) => {
                      const sharePct = totalCategoryExpenses > 0 ? ((c.total / totalCategoryExpenses) * 100).toFixed(0) : 0;
                      const active = activeIndex === i;
                      return (
                        <div
                          key={c._id || i}
                          onMouseEnter={() => setActiveIndex(i)}
                          onMouseLeave={() => setActiveIndex(-1)}
                          className={`p-2 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                            active
                              ? 'bg-slate-900/60 border-slate-700/60 shadow'
                              : 'bg-transparent border-transparent hover:bg-slate-900/20'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: getCategoryColor(c.name, i) }}
                            />
                            <span className="text-xs font-semibold text-slate-205">{c.name}</span>
                          </div>
                          <div className="text-right text-xs">
                            <p className="font-extrabold text-slate-100">₹{Number(c.total).toLocaleString('en-IN')}</p>
                            <span className="text-[9px] text-slate-400 font-bold">{sharePct}% share</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>
              )}
            </div>

            {/* Right Col: Six Month Line Chart Trend */}
            <div className="xl:col-span-1 card flex flex-col justify-between">
              <div className="pb-3 border-b border-slate-700/30">
                <h3 className="text-lg font-bold text-slate-100">Monthly Trend</h3>
                <p className="text-xs text-slate-400 mt-0.5">Historical 6 months analysis</p>
              </div>

              <div className="pt-6">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" strokeOpacity={0.1} />
                    <XAxis dataKey="month" tick={{ fill: 'var(--chart-text)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--chart-text)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Line type="monotone" dataKey="Income" stroke="#22c55e" strokeWidth={2} dot={{ r: 3, fill: '#22c55e' }} />
                    <Line type="monotone" dataKey="Expense" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3, fill: '#8b5cf6' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Premium Category Breakdown Row */}
          <div className="card">
            <div className="pb-3 border-b border-slate-700/30">
              <h3 className="text-lg font-bold text-slate-100">Category Breakdown</h3>
              <p className="text-xs text-slate-400 mt-0.5">Comprehensive audit breakdown parameters</p>
            </div>

            {categoryData.length === 0 ? (
              <p className="text-slate-500 text-center py-8 text-xs font-semibold">No data available for this range</p>
            ) : (
              <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {categoryData.map((c, i) => {
                  const sharePct = totalCategoryExpenses > 0 ? ((c.total / totalCategoryExpenses) * 100).toFixed(0) : 0;
                  const maxVal = categoryData[0]?.total || 1;
                  const relativePct = Math.round((c.total / maxVal) * 100);
                  const active = activeIndex === i;

                  return (
                    <div
                      key={c._id || i}
                      onMouseEnter={() => setActiveIndex(i)}
                      onMouseLeave={() => setActiveIndex(-1)}
                      className={`p-3 rounded-2xl border transition-all duration-300 cursor-pointer ${
                        active
                          ? 'bg-slate-900/60 border-slate-700 shadow-md transform -translate-y-[2px]'
                          : 'bg-slate-900/20 border-slate-800/40 hover:bg-slate-900/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{c.icon || '🛍️'}</span>
                          <div>
                            <span className="text-xs font-bold text-slate-205">{c.name}</span>
                            <span className="text-[9px] text-slate-500 font-bold ml-2">({c.count} txns)</span>
                          </div>
                        </div>
                        <div className="text-right text-xs">
                          <span className="font-extrabold text-slate-100">₹{Number(c.total).toLocaleString('en-IN')}</span>
                          <span className="text-[9px] text-slate-400 block font-bold mt-0.5">{sharePct}% share</span>
                        </div>
                      </div>

                      {/* Animated visual progress bar */}
                      <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${relativePct}%`,
                            backgroundColor: getCategoryColor(c.name, i)
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
