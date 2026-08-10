import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, PiggyBank, Wallet, PieChart as PieChartIcon,
  Layers, ArrowLeft, RefreshCcw, AlertCircle, Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Sector
} from 'recharts';
import { useExpense } from '../../context/ExpenseContext';
import ExpandableLegend from '../../components/charts/ExpandableLegend';
import api from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { DataTable } from '../../components/ui/DataTable';

// Import newly integrated chart components
import CashFlowChart from '../../components/charts/CashFlowChart';
import CountUp from 'react-countup';
import InsightCard from '../../components/charts/InsightCard';
import AnalyticsSectionTitle from '../../components/charts/AnalyticsSectionTitle';
import ChartInsight from '../../components/charts/ChartInsight';

import IncomeTrendChart from '../../components/charts/IncomeTrendChart';
import IncomeComparisonCard from '../../components/charts/IncomeComparisonCard';
import ExpenseComparisonCard from '../../components/charts/ExpenseComparisonCard';
import TopIncomeSourcesChart from '../../components/charts/TopIncomeSourcesChart';
import IncomeExpenseRatioChart from '../../components/charts/IncomeExpenseRatioChart';
import SavingsProgressChart from '../../components/charts/SavingsProgressChart';

import MonthlySpendingTrend from '../../components/charts/MonthlySpendingTrend';
import PaymentMethodsChart from '../../components/charts/PaymentMethodsChart';
import TopCategoriesChart from '../../components/charts/TopCategoriesChart';
import MonthlyHeatmap from '../../components/charts/MonthlyHeatmap';
import MonthlyComparisonChart from '../../components/charts/MonthlyComparisonChart';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const INCOME_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'];
const EXPENSE_COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#06b6d4', '#6366f1', '#a855f7', '#ec4899'];

// Local calendar "YYYY-MM-DD" key for a transaction date, matching the MonthlyHeatmap convention.
const localDateKey = (date) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export default function AnalyticsPro() {
  const { dataRevision } = useExpense();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'earnings' | 'expenses' | 'savings'
  const [timeRange, setTimeRange] = useState('6m'); // '1m' | '3m' | '6m'
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [incomeAnalyticsData, setIncomeAnalyticsData] = useState(null);
  const [incomeComparison, setIncomeComparison] = useState({ currentMonth: 0, previousMonth: 0 });
  const [expenseComparison, setExpenseComparison] = useState({ currentMonth: 0, previousMonth: 0 });
  const [expenseComparisonMonthlyData, setExpenseComparisonMonthlyData] = useState([]);

  const [scopedSummary, setScopedSummary] = useState(null);
  const [scopedIncomes, setScopedIncomes] = useState([]);
  const [scopedExpenses, setScopedExpenses] = useState([]);

  // API response states for specific charts
  const [cashflowData, setCashflowData] = useState([]);

  // Active indices for interactive hover on pie charts
  const [error, setError] = useState(null);

  // Guard against React 18 StrictMode double-invoke. Holds the active AbortController
  // so that the cleanup function from the first mount can cancel its own in-flight
  // requests before the second mount issues a fresh set.
  const abortControllerRef = useRef(null);

  const loadAnalyticsData = useCallback(async (signal) => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      // Calculate date range from timeRange
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);

      let startDate = new Date();
      if (timeRange === '1m') {
        startDate.setMonth(startDate.getMonth() - 1);
      } else if (timeRange === '3m') {
        startDate.setMonth(startDate.getMonth() - 3);
      } else {
        startDate.setMonth(startDate.getMonth() - 6);
      }
      startDate.setHours(0, 0, 0, 0);

      const startISO = startDate.toISOString();
      const endISO = endDate.toISOString();

      // Axios passes the AbortController signal — any cancelled request throws
      // CanceledError which is caught and silently ignored below.
      const axiosOpts = signal ? { signal } : {};

      const [mRes, cRes, incomeAnalyticsRes, cashflowRes, summaryRes, incomesRes, expensesRes] = await Promise.all([
        api.get('/reports/monthly', axiosOpts),
        api.get('/reports/by-category', { params: { startDate: startISO, endDate: endISO }, ...axiosOpts }),
        api.get('/analytics/income', { params: { startDate: startISO, endDate: endISO }, ...axiosOpts }),
        api.get('/analytics/cashflow', { params: { startDate: startISO, endDate: endISO }, ...axiosOpts }),
        api.get('/reports/summary', { params: { startDate: startISO, endDate: endISO }, ...axiosOpts }),
        api.get('/income', { params: { limit: 1000, startDate: startISO, endDate: endISO }, ...axiosOpts }),
        api.get('/expenses', { params: { limit: 1000, startDate: startISO, endDate: endISO }, ...axiosOpts }),
      ]);

      // Defensive access — never crash if server returned unexpected shape
      setIncomeAnalyticsData(incomeAnalyticsRes.data?.data || null);
      setCategoryData(Array.isArray(cRes.data?.data) ? cRes.data.data : []);
      setCashflowData(Array.isArray(cashflowRes.data?.data) ? cashflowRes.data.data : []);
      setScopedSummary(summaryRes.data?.data || null);
      setScopedIncomes(Array.isArray(incomesRes.data?.data?.incomes) ? incomesRes.data.data.incomes : []);
      setScopedExpenses(Array.isArray(expensesRes.data?.data?.expenses) ? expensesRes.data.data.expenses : []);

      // Format monthly report
      const { incomes: incList = [], expenses: expList = [] } = mRes.data?.data || {};
      const now = new Date();

      const currentM = now.getMonth() + 1;
      const currentY = now.getFullYear();
      let prevM = currentM - 1;
      let prevY = currentY;
      if (prevM === 0) {
        prevM = 12;
        prevY = currentY - 1;
      }
      
      const currentMonthIncome = incList
        .filter(x => x._id?.month === currentM && x._id?.year === currentY)
        .reduce((sum, x) => sum + (x.total || 0), 0);
        
      const previousMonthIncome = incList
        .filter(x => x._id?.month === prevM && x._id?.year === prevY)
        .reduce((sum, x) => sum + (x.total || 0), 0);
        
      setIncomeComparison({ currentMonth: currentMonthIncome, previousMonth: previousMonthIncome });

      const currentMonthExpense = expList
        .filter(x => x._id?.month === currentM && x._id?.year === currentY)
        .reduce((sum, x) => sum + (x.total || 0), 0);
        
      const previousMonthExpense = expList
        .filter(x => x._id?.month === prevM && x._id?.year === prevY)
        .reduce((sum, x) => sum + (x.total || 0), 0);
        
      setExpenseComparison({ currentMonth: currentMonthExpense, previousMonth: previousMonthExpense });

      // Build consistent 6-month historical data for the Expense chart
      // We start from 5 months ago up to the current month.
      const expense6Months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
        const m = d.getMonth() + 1;
        const y = d.getFullYear();
        const expMatch = expList.find((x) => x._id?.month === m && x._id?.year === y);
        return {
          name: MONTH_NAMES[d.getMonth()],
          expense: expMatch?.total || 0
        };
      });
      setExpenseComparisonMonthlyData(expense6Months);

      const count = timeRange === '1m' ? 1 : timeRange === '3m' ? 3 : 6;

      const formattedMonths = Array.from({ length: count }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (count - 1) + i, 1);
        const m = d.getMonth() + 1;
        const y = d.getFullYear();

        const incMatch = incList.find((x) => x._id?.month === m && x._id?.year === y);
        const expMatch = expList.find((x) => x._id?.month === m && x._id?.year === y);

        const incVal = incMatch?.total || 0;
        const expVal = expMatch?.total || 0;
        const savingsVal = incVal - expVal;
        const savingsRateVal = incVal > 0 ? Math.round((savingsVal / incVal) * 100) : 0;

        return {
          month: MONTH_NAMES[d.getMonth()],
          Earnings: incVal,
          Spent: expVal,
          Saved: savingsVal,
          savingsRate: savingsRateVal,
        };
      });

      setMonthlyData(formattedMonths);
    } catch (err) {
      // Silently ignore AbortController cancellation — this is expected in StrictMode
      if (err.name === 'CanceledError' || err.name === 'AbortError' || err.message === 'canceled') {
        return;
      }
      console.error('[AnalyticsPro] Failed to load analytics metrics:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load analytics data.');
    } finally {
      setLoading(false);
    }
  }, [timeRange]); // eslint-disable-line react-hooks/exhaustive-deps

  // Manual retry handler — creates a fresh AbortController for the new request
  const handleRetry = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    loadAnalyticsData(controller.signal);
  }, [loadAnalyticsData]);

  useEffect(() => {
    // Cancel any in-flight request from the previous render cycle.
    // In React 18 StrictMode this fires: mount → unmount (abort) → remount (fresh request).
    // In production it is a no-op since there is no prior controller.
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    loadAnalyticsData(controller.signal);

    return () => {
      // Cleanup: abort on unmount or before the next effect run
      controller.abort();
    };
  }, [timeRange, dataRevision]); // eslint-disable-line react-hooks/exhaustive-deps

  // Aggregate Incomes by source for the Earnings Pie Chart.
  // Pure derived data: the server breakdown (if present) wins, otherwise we
  // derive from the real loaded incomes. NO fabricated fallback values.
  const incomePieData = useMemo(() => {
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

    if (incomeAnalyticsData && incomeAnalyticsData.sources && incomeAnalyticsData.sources.length > 0) {
      return incomeAnalyticsData.sources.map((s, idx) => ({
        name: s.source,
        value: s.amount,
        icon: iconMap[s.source] || '💰',
        color: INCOME_COLORS[idx % INCOME_COLORS.length]
      }));
    }

    if (!scopedIncomes || scopedIncomes.length === 0) {
      return [];
    }

    const map = {};
    scopedIncomes.forEach((inc) => {
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
  }, [scopedIncomes, incomeAnalyticsData]);

  const totalEarnedVal = useMemo(() => {
    if (scopedSummary?.totalIncome !== undefined) return scopedSummary.totalIncome;
    return incomePieData.reduce((acc, item) => acc + item.value, 0);
  }, [scopedSummary, incomePieData]);

  // Aggregate Expenses by category for Expense Pie/Donut Chart.
  // Pure derived data: the server category breakdown (if present) wins, otherwise
  // we derive from the real loaded expenses. NO fabricated fallback values.
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

    if (!scopedExpenses || scopedExpenses.length === 0) {
      return [];
    }

    const map = {};
    scopedExpenses.forEach((exp) => {
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
  }, [categoryData, scopedExpenses]);

  const totalSpentVal = useMemo(() => {
    if (scopedSummary?.totalExpense !== undefined) return scopedSummary.totalExpense;
    return expensePieData.reduce((acc, item) => acc + item.value, 0);
  }, [scopedSummary, expensePieData]);

  const netSavingsVal = Math.max(0, totalEarnedVal - totalSpentVal);
  const savingsRateVal = totalEarnedVal > 0 ? Math.round((netSavingsVal / totalEarnedVal) * 100) : 0;

  // Derived computations for newly integrated charts
  const mappedMonthlyData = useMemo(() => {
    if (!monthlyData || monthlyData.length === 0) return [];
    return monthlyData.map(d => ({
      name: d.month,
      income: d.Earnings || 0,
      expense: d.Spent || 0,
      savings: d.Saved || 0
    }));
  }, [monthlyData]);

  const incomeCategoryData = useMemo(() => {
    return incomePieData.map(i => ({
      name: i.name,
      total: i.value,
      color: i.color
    }));
  }, [incomePieData]);

  const highestExpenseCat = expensePieData[0];
  const highestIncomeCat = incomePieData[0];
  const bestSavingsMonth = mappedMonthlyData.length > 0 ? [...mappedMonthlyData].sort((a, b) => b.savings - a.savings)[0] : null;

  // Savings Progress dataset — historical full-month savings (from the monthly report)
  // plus the CURRENT month computed as a real running balance through today only.
  // mappedMonthlyData's last element is always the current month (its full-month API
  // value is already filtered by endDate=now); we replace it with a precise running
  // total computed from the already-loaded transaction arrays so future-dated
  // transactions can never leak in and the current month is never duplicated.
  const savingsProgressData = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const firstKey = `${year}-${String(month).padStart(2, '0')}-01`;
    const todayKey = localDateKey(now);

    const sumToDate = (list = []) =>
      list.reduce((acc, tx) => {
        const key = localDateKey(tx.date);
        if (key && key >= firstKey && key <= todayKey) acc += Number(tx.amount) || 0;
        return acc;
      }, 0);

    const currentIncome = sumToDate(scopedIncomes);
    const currentExpense = sumToDate(scopedExpenses);

    const currentPoint = {
      name: MONTH_NAMES[now.getMonth()],
      income: currentIncome,
      expense: currentExpense,
      savings: currentIncome - currentExpense,
      isCurrent: true,
    };

    // Completed months only — drop the trailing current-month entry from the report
    // so we have exactly ONE data point for the current month.
    const historical = mappedMonthlyData.slice(0, -1).map((d) => ({
      name: d.name,
      income: d.income,
      expense: d.expense,
      savings: d.income - d.expense,
      isCurrent: false,
    }));

    return [...historical, currentPoint];
  }, [mappedMonthlyData, scopedIncomes, scopedExpenses]);

  if (loading) {
    return (
      <div className="space-y-6 pb-20 animate-fade-in analytics-page">
        {/* Header skeleton */}
        <div className="flex justify-between items-center pb-5 border-b border-slate-800/40">
          <Skeleton className="h-10 w-48 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>

        {/* Charts grid skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton.Chart />
          <Skeleton.Chart />
          <Skeleton.Chart />
          <Skeleton.Chart />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4 max-w-md mx-auto text-center px-4 analytics-page">
        <div className="p-4 bg-red-500/10 border border-red-500/25 text-red-400 rounded-3xl text-sm font-medium">
          <p className="font-bold mb-1">Failed to load analytics</p>
          <p className="text-xs text-red-300/80">{error}</p>
        </div>
        <button
          onClick={handleRetry}
          className="px-5 py-2.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-100 text-xs font-bold rounded-2xl cursor-pointer transition-all"
        >
          Try Again
        </button>
      </div>
    );
  }

  const isEmptyState = totalEarnedVal === 0 && totalSpentVal === 0;

  if (isEmptyState) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4 text-center px-4 analytics-page">
        <div className="w-16 h-16 rounded-3xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 text-2xl shadow-lg">
          📊
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-200">No transactions recorded yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Once you log your income and expenses in the dashboard, we will compile your visual charts here!
          </p>
        </div>
        <Link
          to="/dashboard"
          className="px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold rounded-2xl cursor-pointer transition-all shadow-md shadow-primary-500/20"
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-fade-in analytics-page">
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
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${timeRange === id
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
            >
              {label}
            </button>
          ))}
          <button
            onClick={handleRetry}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all ml-1"
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
              ₹<CountUp end={Number(totalEarnedVal)} duration={1} separator="," />
            </h3>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="badge bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                +{incomePieData.length} Income Streams
              </span>
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
              ₹<CountUp end={Number(totalSpentVal)} duration={1} separator="," />
            </h3>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="badge bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                {expensePieData.length} Spending Categories
              </span>
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
              ₹<CountUp end={Number(netSavingsVal)} duration={1} separator="," />
            </h3>
            <div className="flex items-center gap-1.5 mt-2">
              <span className={`badge text-[10px] font-bold ${savingsRateVal >= 30
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
              {savingsRateVal >= 30 ? '🌟 Excellent Saver' : savingsRateVal >= 15 ? '⚖️ Balanced Flow' : '⚠️ Alert: High Spending'}
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

      {/* Insight Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {highestExpenseCat && (
          <InsightCard
            title="Highest Spending Category"
            value={highestExpenseCat.name}
            subtitle={`₹${highestExpenseCat.value.toLocaleString('en-IN')} total`}
            icon={TrendingDown}
          />
        )}
        {highestIncomeCat && (
          <InsightCard
            title="Largest Income Source"
            value={highestIncomeCat.name}
            subtitle={`${((highestIncomeCat.value / (totalEarnedVal || 1)) * 100).toFixed(0)}% of income`}
            icon={TrendingUp}
          />
        )}
        {bestSavingsMonth && (
          <InsightCard
            title="Best Savings Month"
            value={bestSavingsMonth.name}
            subtitle={`₹${bestSavingsMonth.savings.toLocaleString('en-IN')} saved`}
            icon={PiggyBank}
          />
        )}
      </div>

      <AnalyticsSectionTitle
        title={
          activeTab === 'overview' ? 'Complete Overview' :
            activeTab === 'earnings' ? 'Income Analytics' :
              activeTab === 'expenses' ? 'Expense Analytics' : 'Financial Breakdown'
        }
        subtitle={
          activeTab === 'overview' ? 'A complete snapshot of your financial performance.' :
            activeTab === 'earnings' ? 'Track earnings, income sources, and monthly growth.' :
              activeTab === 'expenses' ? 'Understand spending patterns and category distribution.' : ''
        }
      />

      {/* Tabs Navigation Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-700/40 pb-2 mb-6">
        {[
          { id: 'overview', label: '📊 Complete Overview', icon: Layers },
          { id: 'earnings', label: '💼 How I Earn (Incomes)', icon: TrendingUp },
          { id: 'expenses', label: '💸 How I Spend (Expenses)', icon: TrendingDown }
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${activeTab === id
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

                {/* Unified Legend details using ExpandableLegend */}
                <div className="flex-1 w-full sm:w-auto pl-0 sm:pl-4">
                  <ExpandableLegend
                    data={incomePieData.map(item => ({
                      ...item,
                      percentage: totalEarnedVal > 0 ? (item.value / totalEarnedVal) * 100 : 0
                    }))}
                    currencySymbol="₹"
                  />
                </div>
              </div>
            </div>
            {highestIncomeCat && (
              <ChartInsight
                message={`${highestIncomeCat.name} represents ${((highestIncomeCat.value / (totalEarnedVal || 1)) * 100).toFixed(0)}% of your total earnings.`}
              />
            )}
          </div>
        )}

        {/* Income This Month vs Last Month (Only on Earnings Tab) */}
        {activeTab === 'earnings' && (
          <IncomeComparisonCard 
            currentMonthIncome={incomeComparison.currentMonth}
            previousMonthIncome={incomeComparison.previousMonth}
            mappedMonthlyData={mappedMonthlyData}
          />
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
                    Distribution of total expenses across expenditure buckets
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

                {/* Unified Legend details using ExpandableLegend */}
                <div className="flex-1 w-full sm:w-auto pl-0 sm:pl-4">
                  <ExpandableLegend
                    data={expensePieData.map(item => ({
                      ...item,
                      percentage: totalSpentVal > 0 ? (item.value / totalSpentVal) * 100 : 0
                    }))}
                    currencySymbol="₹"
                  />
                </div>
              </div>
            </div>
            {highestExpenseCat && (
              <ChartInsight
                message={`${highestExpenseCat.name} represents ${((highestExpenseCat.value / (totalSpentVal || 1)) * 100).toFixed(0)}% of your monthly expenses.`}
              />
            )}
          </div>
        )}

        {/* Expense This Month vs Last Month (Only on Expenses Tab) */}
        {activeTab === 'expenses' && (
          <ExpenseComparisonCard 
            currentMonthExpense={expenseComparison.currentMonth}
            previousMonthExpense={expenseComparison.previousMonth}
            expenseComparisonMonthlyData={expenseComparisonMonthlyData}
          />
        )}
      </div>

      {/* Overview Tab Charts */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <CashFlowChart cashflowData={cashflowData} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SavingsProgressChart data={savingsProgressData} />
            <IncomeExpenseRatioChart summary={{ totalIncome: totalEarnedVal, totalExpense: totalSpentVal }} />
          </div>
        </div>
      )}

      {/* Earnings Tab Charts */}
      {activeTab === 'earnings' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TopIncomeSourcesChart categoryData={incomeCategoryData} />
            <IncomeTrendChart monthlyData={mappedMonthlyData} />
          </div>
          <div className="grid grid-cols-1 gap-6">
            <MonthlyComparisonChart monthlyData={mappedMonthlyData} />
          </div>
          <div className="lg:col-span-2">
            <MonthlyHeatmap
              transactions={scopedIncomes}
              title="Monthly Income Heatmap"
              subtitle="Daily earning intensity for the selected month"
              type="income"
              currencySymbol="₹"
            />
          </div>
        </div>
      )}

      {/* Expenses Tab Charts */}
      {activeTab === 'expenses' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TopCategoriesChart categoryData={expensePieData} />
            <PaymentMethodsChart rawExpenses={scopedExpenses} />
          </div>
          <div className="grid grid-cols-1 gap-6">
            <MonthlySpendingTrend monthlyData={mappedMonthlyData} />
          </div>
          <div className="lg:col-span-2">
            <MonthlyHeatmap
              transactions={scopedExpenses}
              title="Monthly Spending Heatmap"
              subtitle="Daily spending intensity for the selected month"
              type="spending"
              currencySymbol="₹"
            />
          </div>
        </div>
      )}

      {/* Section 4: Detailed Breakdown & Financial Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
