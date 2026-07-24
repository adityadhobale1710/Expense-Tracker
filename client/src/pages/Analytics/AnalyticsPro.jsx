import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, PiggyBank, Wallet, PieChart as PieChartIcon,
  BarChart3, ArrowUpRight, Sparkles, Calendar, DollarSign,
  CheckCircle2, AlertTriangle, Layers, ArrowLeft, RefreshCcw
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Sector
} from 'recharts';
import { useExpense } from '../../context/ExpenseContext';
import api from '../../services/api';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const INCOME_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'];
const EXPENSE_COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#06b6d4', '#6366f1', '#a855f7', '#ec4899'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900/95 border border-slate-700/80 backdrop-blur-md p-3.5 rounded-2xl shadow-2xl space-y-1.5 min-w-[170px]">
      <p className="text-xs font-bold text-slate-400 border-b border-slate-800 pb-1">{label}</p>
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center justify-between gap-3 text-xs">
          <span className="flex items-center gap-1.5 font-medium" style={{ color: entry.color }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            {entry.name}:
          </span>
          <span className="font-bold text-slate-100 font-mono">
            ₹{Number(entry.value || 0).toLocaleString('en-IN')}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function AnalyticsPro() {
  const { summary, incomes, expenses, fetchIncomes, fetchExpenses, fetchSummary } = useExpense();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'earnings' | 'expenses' | 'savings'
  const [timeRange, setTimeRange] = useState('6m'); // '1m' | '3m' | '6m'
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [incomeAnalyticsData, setIncomeAnalyticsData] = useState(null);

  // Active indices for interactive hover on pie charts
  const [activeIncomeIndex, setActiveIncomeIndex] = useState(-1);
  const [activeExpenseIndex, setActiveExpenseIndex] = useState(-1);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchSummary(),
        fetchIncomes(),
        fetchExpenses()
      ]);

      const [mRes, cRes, incomeAnalyticsRes] = await Promise.all([
        api.get('/reports/monthly'),
        api.get('/reports/by-category'),
        api.get('/analytics/income')
      ]);

      console.log("Income Analytics:", incomeAnalyticsRes.data);
      setIncomeAnalyticsData(incomeAnalyticsRes.data?.data || null);
      setCategoryData(cRes.data?.data || []);

      // Format monthly report
      const { incomes: incList = [], expenses: expList = [] } = mRes.data?.data || {};
      const now = new Date();
      const count = timeRange === '1m' ? 1 : timeRange === '3m' ? 3 : 6;
      
      const formattedMonths = Array.from({ length: count }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (count - 1) + i, 1);
        const m = d.getMonth() + 1;
        const y = d.getFullYear();
        
        const incMatch = incList.find(x => x._id?.month === m && x._id?.year === y);
        const expMatch = expList.find(x => x._id?.month === m && x._id?.year === y);
        
        const incVal = incMatch?.total || 0;
        const expVal = expMatch?.total || 0;
        const savingsVal = Math.max(0, incVal - expVal);
        const savingsRateVal = incVal > 0 ? Math.round((savingsVal / incVal) * 100) : 0;

        return {
          month: MONTH_NAMES[d.getMonth()],
          Earnings: incVal,
          Spent: expVal,
          Saved: savingsVal,
          savingsRate: savingsRateVal
        };
      });

      setMonthlyData(formattedMonths);
    } catch (err) {
      console.error('Failed to load Analytics Pro metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange]);

  // Aggregate Incomes by source for the Earnings Pie Chart
  const incomePieData = useMemo(() => {
    if (!incomes || incomes.length === 0) {
      // Fallback presentation data if no income logs recorded yet
      return [
        { name: 'Salary', value: 65000, icon: '💼', color: '#10b981' },
        { name: 'Freelancing', value: 18000, icon: '💻', color: '#3b82f6' },
        { name: 'Investments', value: 12000, icon: '📈', color: '#8b5cf6' },
        { name: 'Others', value: 5000, icon: '🎁', color: '#f59e0b' }
      ];
    }

    const iconMap = {
      Salary: '💼',
      Freelance: '💻',
      Freelancing: '💻',
      Business: '🏬',
      Investment: '📈',
      Investments: '📈',
      Gift: '🎁',
      Bonus: '🎉',
      Other: '💰',
      Uncategorized: '💰'
    };

    // If we have backend analytics data, use it directly!
    if (incomeAnalyticsData && incomeAnalyticsData.sources) {
      return incomeAnalyticsData.sources.map((s, idx) => ({
        name: s.source,
        value: s.amount,
        icon: iconMap[s.source] || '💰',
        color: INCOME_COLORS[idx % INCOME_COLORS.length]
      }));
    }

    const map = {};
    incomes.forEach((inc) => {
      const categoryVal = typeof inc.category === 'object' ? inc.category?.name : inc.category;
      const key = categoryVal?.trim() || "Uncategorized";
      map[key] = (map[key] || 0) + (inc.amount || 0);
    });

    return Object.entries(map)
      .map(([name, value], idx) => ({
        name,
        value,
        icon: iconMap[name] || '💰',
        color: INCOME_COLORS[idx % INCOME_COLORS.length]
      }))
      .sort((a, b) => b.value - a.value);
  }, [incomes, incomeAnalyticsData]);

  const totalEarnedVal = useMemo(() => {
    if (summary?.totalIncome) return summary.totalIncome;
    return incomePieData.reduce((acc, item) => acc + item.value, 0);
  }, [summary, incomePieData]);

  // Aggregate Expenses by category for Expense Pie/Donut Chart
  const expensePieData = useMemo(() => {
    if (categoryData && categoryData.length > 0) {
      return categoryData.map((cat, idx) => ({
        name: cat.name || 'Uncategorized',
        value: cat.total || 0,
        count: cat.count || 1,
        icon: cat.icon || '📁',
        color: cat.color || EXPENSE_COLORS[idx % EXPENSE_COLORS.length]
      }));
    }

    if (!expenses || expenses.length === 0) {
      return [
        { name: 'Food & Dining', value: 12000, count: 14, icon: '🍔', color: '#ef4444' },
        { name: 'Shopping', value: 8500, count: 6, icon: '🛍️', color: '#f97316' },
        { name: 'Bills & Utilities', value: 6200, count: 4, icon: '💡', color: '#eab308' },
        { name: 'Entertainment', value: 3400, count: 5, icon: '🎬', color: '#06b6d4' }
      ];
    }

    const map = {};
    expenses.forEach((exp) => {
      const catName = exp.category?.name || exp.category || 'Other';
      const icon = exp.category?.icon || '📁';
      if (!map[catName]) {
        map[catName] = { name: catName, value: 0, count: 0, icon };
      }
      map[catName].value += exp.amount || 0;
      map[catName].count += 1;
    });

    return Object.values(map)
      .map((item, idx) => ({
        ...item,
        color: EXPENSE_COLORS[idx % EXPENSE_COLORS.length]
      }))
      .sort((a, b) => b.value - a.value);
  }, [categoryData, expenses]);

  const totalSpentVal = useMemo(() => {
    if (summary?.totalExpense) return summary.totalExpense;
    return expensePieData.reduce((acc, item) => acc + item.value, 0);
  }, [summary, expensePieData]);

  const netSavingsVal = Math.max(0, totalEarnedVal - totalSpentVal);
  const savingsRateVal = totalEarnedVal > 0 ? Math.round((netSavingsVal / totalEarnedVal) * 100) : 0;

  // Active Shape renderer for hoverable Pie charts
  const renderActiveShape = (props) => {
    const RADIAN = Math.PI / 180;
    const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 8) * cos;
    const sy = cy + (outerRadius + 8) * sin;
    const mx = cx + (outerRadius + 18) * cos;
    const my = cy + (outerRadius + 18) * sin;
    const ex = sx + (cos >= 0 ? 1 : -1) * 12;
    const ey = sy;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 6}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" strokeWidth={1.5} />
        <circle cx={ex} cy={ey} r={3} fill={fill} />
        <text x={ex + (cos >= 0 ? 1 : -1) * 6} y={ey - 4} textAnchor={textAnchor} fill="var(--slate-200)" className="text-[11px] font-bold">
          {payload.name}
        </text>
        <text x={ex + (cos >= 0 ? 1 : -1) * 6} y={ey + 8} textAnchor={textAnchor} fill={fill} className="text-[11px] font-black font-mono">
          ₹{Number(value).toLocaleString('en-IN')} ({(percent * 100).toFixed(0)}%)
        </text>
      </g>
    );
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Top Header & Breadcrumb Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-dark-800/60 border border-slate-700/40 p-5 rounded-3xl backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="p-2.5 rounded-2xl bg-dark-900/80 border border-slate-700/60 hover:bg-slate-800 text-slate-300 transition-all hover:scale-105"
            title="Back to Dashboard"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-300 bg-clip-text text-transparent">
                Analytics Pro
              </h1>
              <span className="badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full">
                Interactive Visualizer
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">
              Comprehensive deep-dive into your Earnings, Expenses, and Savings run rates.
            </p>
          </div>
        </div>

        {/* Time Period Filter Selector */}
        <div className="flex items-center gap-2 bg-dark-900/90 border border-slate-700/60 p-1.5 rounded-2xl self-start sm:self-auto">
          {[
            { id: '1m', label: '1 Month' },
            { id: '3m', label: '3 Months' },
            { id: '6m', label: '6 Months' }
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTimeRange(id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                timeRange === id
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {label}
            </button>
          ))}
          <button
            onClick={loadAnalyticsData}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all ml-1"
            title="Refresh Data"
          >
            <RefreshCcw size={14} className={loading ? 'animate-spin text-primary-400' : ''} />
          </button>
        </div>
      </div>

      {/* 4 Primary KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Earned Card */}
        <div className="relative overflow-hidden bg-dark-800/80 border border-emerald-500/30 p-5 rounded-3xl shadow-xl hover:border-emerald-500/50 transition-all group">
          <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">How I Earn (Total)</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-md">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-100 font-mono tracking-tight">
              ₹{Number(totalEarnedVal).toLocaleString('en-IN')}
            </h3>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="badge bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                +{incomePieData.length} Income Streams
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Recorded inflows</span>
            </div>
          </div>
        </div>

        {/* Total Spent Card */}
        <div className="relative overflow-hidden bg-dark-800/80 border border-rose-500/30 p-5 rounded-3xl shadow-xl hover:border-rose-500/50 transition-all group">
          <div className="absolute top-0 right-0 w-28 h-28 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">How Much I Spend</span>
            <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-md">
              <TrendingDown size={20} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-100 font-mono tracking-tight">
              ₹{Number(totalSpentVal).toLocaleString('en-IN')}
            </h3>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="badge bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                {expensePieData.length} Spending Categories
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Outflow logs</span>
            </div>
          </div>
        </div>

        {/* Net Savings Card */}
        <div className="relative overflow-hidden bg-dark-800/80 border border-indigo-500/30 p-5 rounded-3xl shadow-xl hover:border-indigo-500/50 transition-all group">
          <div className="absolute top-0 right-0 w-28 h-28 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">How Much I Save</span>
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-md">
              <PiggyBank size={20} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-100 font-mono tracking-tight">
              ₹{Number(netSavingsVal).toLocaleString('en-IN')}
            </h3>
            <div className="flex items-center gap-1.5 mt-2">
              <span className={`badge text-[10px] font-bold ${
                savingsRateVal >= 30
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : savingsRateVal >= 15
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                {savingsRateVal}% Savings Rate
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Net liquidity</span>
            </div>
          </div>
        </div>

        {/* Financial Health Status */}
        <div className="relative overflow-hidden bg-dark-800/80 border border-amber-500/30 p-5 rounded-3xl shadow-xl hover:border-amber-500/50 transition-all group">
          <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Financial Health</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md">
              <Sparkles size={20} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl font-extrabold text-amber-300 tracking-tight">
              {savingsRateVal >= 30 ? '🌟 Excellent Saver' : savingsRateVal >= 15 ? '⚖️ Balanced Flow' : '⚠️ Alert: High Outflows'}
            </h3>
            <p className="text-[11px] text-slate-400 mt-2 line-clamp-1 font-medium">
              {savingsRateVal >= 30
                ? 'You save over 30% of earnings consistently!'
                : savingsRateVal >= 15
                ? 'Healthy cash balance, maintain expense speed.'
                : 'Consider optimizing high-cost expense categories.'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-700/40 pb-2">
        {[
          { id: 'overview', label: '📊 Complete Overview', icon: Layers },
          { id: 'earnings', label: '💼 How I Earn (Incomes)', icon: TrendingUp },
          { id: 'expenses', label: '💸 How I Spend (Expenses)', icon: TrendingDown }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === id
                ? 'bg-slate-800 text-slate-100 border border-slate-600 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <span>{label}</span>
          </button>
        ))}
      </div>



      {/* Section 2: Pie Charts & Visual Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Earnings Stream Pie Chart (How I Earn) */}
        {(activeTab === 'overview' || activeTab === 'earnings') && (
          <div className="bg-dark-800/80 border border-slate-700/60 p-6 rounded-3xl shadow-xl space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-700/40 pb-3">
                <div>
                  <h2 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
                    <PieChartIcon className="text-emerald-400" size={18} />
                    How I Earn (Income Streams)
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Breakdown of earnings by source category
                  </p>
                </div>
                <span className="badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-bold">
                  ₹{Number(totalEarnedVal).toLocaleString('en-IN')}
                </span>
              </div>

              {/* Top part: Pie Chart & Legend */}
              <div className="flex flex-col sm:flex-row items-center gap-6 mt-6 border-b border-slate-700/40 pb-6">
                {/* Pie Chart */}
                <div className="relative h-48 w-48 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={incomePieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={90}
                        dataKey="value"
                        stroke="none"
                      >
                        {incomePieData.map((entry, index) => (
                          <Cell key={`cell-inc-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Total */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-sm font-bold text-slate-100 font-mono">{Number(totalEarnedVal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Simple Legend */}
                <div className="flex-1 space-y-3 w-full sm:w-auto">
                  {incomePieData.map(item => {
                    const percent = totalEarnedVal > 0 ? ((item.value / totalEarnedVal) * 100).toFixed(2) : 0;
                    return (
                      <div key={item.name} className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className="w-2.5 h-2.5 rounded-full border border-slate-700" style={{ backgroundColor: item.color }}></span>
                          <span className="text-slate-200 font-medium">{item.name}</span>
                        </div>
                        <span className="text-slate-300 font-mono">{percent}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom part: Detailed List */}
              <div className="mt-6 space-y-5 flex-1 overflow-y-auto">
                {incomePieData.map(item => {
                  const percent = totalEarnedVal > 0 ? ((item.value / totalEarnedVal) * 100).toFixed(2) : 0;
                  return (
                    <div key={item.name} className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-sm" style={{ backgroundColor: `${item.color}`, color: '#fff' }}>
                            {item.icon}
                          </div>
                          <div>
                            <span className="text-slate-100 font-semibold text-sm">{item.name}</span>
                            <span className="text-slate-400 ml-2 text-xs font-mono">{percent}%</span>
                          </div>
                        </div>
                        <span className="text-slate-100 text-sm font-mono font-medium">{Number(item.value).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden ml-14 max-w-[calc(100%-3.5rem)]">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percent}%`, backgroundColor: item.color }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Expenses Category Pie / Donut Chart (How Much I Spend) */}
        {(activeTab === 'overview' || activeTab === 'expenses') && (
          <div className="bg-dark-800/80 border border-slate-700/60 p-6 rounded-3xl shadow-xl space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-700/40 pb-3">
                <div>
                  <h2 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
                    <PieChartIcon className="text-rose-400" size={18} />
                    How Much I Spend (Category Allocation)
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Distribution of total outflows across expenditure buckets
                  </p>
                </div>
                <span className="badge bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-mono font-bold">
                  ₹{Number(totalSpentVal).toLocaleString('en-IN')}
                </span>
              </div>

              {/* Top part: Pie Chart & Legend */}
              <div className="flex flex-col sm:flex-row items-center gap-6 mt-6 border-b border-slate-700/40 pb-6">
                {/* Pie Chart */}
                <div className="relative h-48 w-48 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expensePieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={90}
                        dataKey="value"
                        stroke="none"
                      >
                        {expensePieData.map((entry, index) => (
                          <Cell key={`cell-exp-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Total */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-sm font-bold text-slate-100 font-mono">{Number(totalSpentVal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Simple Legend */}
                <div className="flex-1 space-y-3 w-full sm:w-auto">
                  {expensePieData.map(item => {
                    const percent = totalSpentVal > 0 ? ((item.value / totalSpentVal) * 100).toFixed(2) : 0;
                    return (
                      <div key={item.name} className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className="w-2.5 h-2.5 rounded-full border border-slate-700" style={{ backgroundColor: item.color }}></span>
                          <span className="text-slate-200 font-medium">{item.name}</span>
                        </div>
                        <span className="text-slate-300 font-mono">{percent}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom part: Detailed List */}
              <div className="mt-6 space-y-5 flex-1 overflow-y-auto">
                {expensePieData.map(item => {
                  const percent = totalSpentVal > 0 ? ((item.value / totalSpentVal) * 100).toFixed(2) : 0;
                  return (
                    <div key={item.name} className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-sm" style={{ backgroundColor: `${item.color}`, color: '#fff' }}>
                            {item.icon}
                          </div>
                          <div>
                            <span className="text-slate-100 font-semibold text-sm">{item.name}</span>
                            <span className="text-slate-400 ml-2 text-xs font-mono">{percent}%</span>
                          </div>
                        </div>
                        <span className="text-slate-100 text-sm font-mono font-medium">{Number(item.value).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden ml-14 max-w-[calc(100%-3.5rem)]">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percent}%`, backgroundColor: item.color }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>



      {/* Section 4: Detailed Breakdown & Financial Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-dark-800/80 border border-slate-700/60 rounded-3xl space-y-2 shadow-lg">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
            <TrendingUp size={16} />
            Earning Insight
          </div>
          <h4 className="text-sm font-extrabold text-slate-100">Diversification Score</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            You currently log {incomePieData.length} active income stream(s). Expanding secondary passive or freelance streams increases financial stability.
          </p>
        </div>

        <div className="p-5 bg-dark-800/80 border border-slate-700/60 rounded-3xl space-y-2 shadow-lg">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
            <TrendingDown size={16} />
            Outflow Audit
          </div>
          <h4 className="text-sm font-extrabold text-slate-100">Top Outflow Bucket</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            {expensePieData[0]?.name || 'Top category'} takes the largest share of your budget. Setting a strict monthly ceiling will boost your net savings rate.
          </p>
        </div>

        <div className="p-5 bg-dark-800/80 border border-slate-700/60 rounded-3xl space-y-2 shadow-lg">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
            <PiggyBank size={16} />
            Savings Optimization
          </div>
          <h4 className="text-sm font-extrabold text-slate-100">Recommended Target</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Aim to direct at least 20-30% of total earnings directly into investment wallets right when earnings are received to automate wealth building.
          </p>
        </div>
      </div>
    </div>
  );
}
