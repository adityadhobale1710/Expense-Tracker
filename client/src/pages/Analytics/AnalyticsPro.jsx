import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { Layers, Sun, Moon, Sparkles, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

// Component imports
import FilterBar from '../../components/analytics/FilterBar';
import SummaryCards from '../../components/cards/SummaryCards';
import ExpenseLineChart from '../../components/charts/ExpenseLineChart';
import DonutChart from '../../components/charts/DonutChart';
import PieChart from '../../components/charts/PieChart';
import CategoryBreakdown from '../../components/analytics/CategoryBreakdown';
import MonthlyComparisonChart from '../../components/charts/MonthlyComparisonChart';
import CashFlowChart from '../../components/charts/CashFlowChart';
import DailySpendingHeatmap from '../../components/charts/DailySpendingHeatmap';
import TopCategoriesChart from '../../components/charts/TopCategoriesChart';
import ExpenseTrendChart from '../../components/charts/ExpenseTrendChart';
import SpendingInsights from '../../components/analytics/SpendingInsights';
import TransactionTable from '../../components/analytics/TransactionTable';

export default function AnalyticsPro() {
  const { theme, setTheme, toggleTheme } = useTheme();

  // Timeframe date states (Default: Current Month)
  const [timeframe, setTimeframe] = useState('Month');
  
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  });

  // Selected Category filter from Donut Chart
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Parse string ISO dates for API query
  const queryParams = {
    startDate: startDate?.toISOString() || '',
    endDate: endDate?.toISOString() || ''
  };

  // 1. Fetch Summary statistics (caching enabled)
  const { data: summaryRes, isLoading: isSummaryLoading, refetch: refetchSummary } = useQuery({
    queryKey: ['analyticsSummary', queryParams],
    queryFn: async () => {
      const res = await api.get('/analytics/summary', { params: queryParams });
      return res.data.data;
    }
  });

  // 2. Fetch Monthly bar totals
  const { data: monthlyRes, isLoading: isMonthlyLoading, refetch: refetchMonthly } = useQuery({
    queryKey: ['analyticsMonthly'],
    queryFn: async () => {
      const res = await api.get('/analytics/monthly');
      return res.data.data;
    }
  });

  // 3. Fetch Category breakdown totals
  const { data: categoryRes, isLoading: isCategoryLoading, refetch: refetchCategory } = useQuery({
    queryKey: ['analyticsCategory', queryParams],
    queryFn: async () => {
      const res = await api.get('/analytics/category', { params: queryParams });
      return res.data.data;
    }
  });

  // 4. Fetch Trend curves
  const { data: trendRes, isLoading: isTrendLoading, refetch: refetchTrend } = useQuery({
    queryKey: ['analyticsTrend', queryParams],
    queryFn: async () => {
      const res = await api.get('/analytics/trend', { params: queryParams });
      return res.data.data;
    }
  });

  // 5. Fetch Cashflow curves
  const { data: cashflowRes, isLoading: isCashflowLoading, refetch: refetchCashflow } = useQuery({
    queryKey: ['analyticsCashflow', queryParams],
    queryFn: async () => {
      const res = await api.get('/analytics/cashflow', { params: queryParams });
      return res.data.data;
    }
  });

  // 6. Fetch Heatmap cells
  const { data: heatmapRes, isLoading: isHeatmapLoading, refetch: refetchHeatmap } = useQuery({
    queryKey: ['analyticsHeatmap'],
    queryFn: async () => {
      const res = await api.get('/analytics/heatmap');
      return res.data.data;
    }
  });

  // 7. Fetch Income sources pie
  const { data: incomeRes, isLoading: isIncomeLoading, refetch: refetchIncome } = useQuery({
    queryKey: ['analyticsIncome', queryParams],
    queryFn: async () => {
      const res = await api.get('/analytics/income', { params: queryParams });
      return res.data.data;
    }
  });

  // Fetch all user category definitions for filter select lists
  const { data: categoriesRes } = useQuery({
    queryKey: ['categoriesList'],
    queryFn: async () => {
      const res = await api.get('/categories');
      return res.data.data;
    }
  });

  // Fetch raw transactional details for table listing
  const { data: rawExpensesRes, isLoading: isRawExpensesLoading, refetch: refetchRawExpenses } = useQuery({
    queryKey: ['rawExpensesList'],
    queryFn: async () => {
      const res = await api.get('/expenses?limit=1000');
      return res.data.data.expenses || [];
    }
  });

  const { data: rawIncomesRes, isLoading: isRawIncomesLoading, refetch: refetchRawIncomes } = useQuery({
    queryKey: ['rawIncomesList'],
    queryFn: async () => {
      const res = await api.get('/income?limit=1000');
      return res.data.data.incomes || [];
    }
  });

  const handleRefreshAll = () => {
    toast.promise(
      Promise.all([
        refetchSummary(),
        refetchMonthly(),
        refetchCategory(),
        refetchTrend(),
        refetchCashflow(),
        refetchHeatmap(),
        refetchIncome(),
        refetchRawExpenses(),
        refetchRawIncomes()
      ]),
      {
        loading: 'Refreshing analytics ledger...',
        success: 'Financial data successfully updated!',
        error: 'Failed to refresh financial metrics.'
      }
    );
  };

  const isLoading =
    isSummaryLoading ||
    isMonthlyLoading ||
    isCategoryLoading ||
    isTrendLoading ||
    isCashflowLoading ||
    isHeatmapLoading ||
    isIncomeLoading ||
    isRawExpensesLoading ||
    isRawIncomesLoading;

  return (
    <div className="space-y-6 pb-12 p-1 max-w-[1600px] mx-auto transition-colors duration-300">
      
      {/* Title Header with Theme toggles */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700/40 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <Layers className="text-primary-500" size={24} />
            <h1 className="text-2xl font-black text-slate-100 tracking-tight">Executive Analytics</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Realtime balance sheets, allocation projections, and predictive algorithms.
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefreshAll}
            className="p-2.5 bg-dark-800 border border-slate-700/60 rounded-xl text-slate-355 hover:text-white transition-all hover:bg-slate-800 cursor-pointer"
            title="Refresh All Data"
          >
            <RefreshCw size={15} />
          </button>

          {/* Theme custom selector */}
          <div className="flex items-center gap-1 bg-dark-800/80 p-1 border border-slate-700/60 rounded-xl">
            <button
              onClick={() => setTheme('light')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                theme === 'light' ? 'bg-primary-500 text-white shadow' : 'text-slate-500 hover:text-slate-350'
              }`}
              title="Light theme"
            >
              <Sun size={14} />
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                theme === 'dark' ? 'bg-primary-500 text-white shadow' : 'text-slate-500 hover:text-slate-355'
              }`}
              title="Dark theme"
            >
              <Moon size={14} />
            </button>
            <button
              onClick={() => setTheme('midnight')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                theme === 'midnight' ? 'bg-primary-500 text-white shadow' : 'text-slate-500 hover:text-slate-355'
              }`}
              title="Midnight theme"
            >
              <Sparkles size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* 1. FILTER BAR */}
      <FilterBar
        timeframe={timeframe}
        setTimeframe={setTimeframe}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
      />

      {/* Loading Skeleton States */}
      {isLoading ? (
        <div className="space-y-6 animate-pulse">
          {/* Card grid skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-28 bg-dark-800/60 border border-slate-800 rounded-2xl" />
            ))}
          </div>
          {/* Charts grid skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-80 lg:col-span-2 bg-dark-800/60 border border-slate-800 rounded-3xl" />
            <div className="h-80 bg-dark-800/60 border border-slate-800 rounded-3xl" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-80 bg-dark-800/60 border border-slate-800 rounded-3xl" />
            <div className="h-80 bg-dark-800/60 border border-slate-800 rounded-3xl" />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 2. SUMMARY CARDS */}
          <SummaryCards summary={summaryRes} />

          {/* Core Analytics Line & Donut */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 3. EXPENSE LINE CHART */}
            <div className="lg:col-span-2">
              <ExpenseLineChart trendData={trendRes} />
            </div>
            
            {/* 4. DONUT CHART */}
            <div>
              <DonutChart
                categoryData={categoryRes?.breakdown || []}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
              />
            </div>
          </div>

          {/* Allocation Details Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 6. CATEGORY BREAKDOWN */}
            <CategoryBreakdown categoryData={categoryRes?.breakdown || []} />

            {/* 5. PIE CHART */}
            <PieChart incomeData={incomeRes} />
          </div>

          {/* Annual trends Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 7. MONTHLY COMPARISON */}
            <MonthlyComparisonChart monthlyData={monthlyRes} />

            {/* 8. CASH FLOW CHART */}
            <CashFlowChart cashflowData={cashflowRes} />
          </div>

          {/* Heatmaps & Toptens Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 9. DAILY SPENDING HEATMAP */}
            <div className="lg:col-span-2">
              <DailySpendingHeatmap heatmapData={heatmapRes} />
            </div>

            {/* 10. TOP SPENDING CATEGORIES */}
            <div>
              <TopCategoriesChart categoryData={categoryRes?.breakdown || []} />
            </div>
          </div>

          {/* Forecast Predictions & Highlights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 11. EXPENSE TREND */}
            <div className="lg:col-span-2">
              <ExpenseTrendChart trendData={trendRes} />
            </div>

            {/* 12. SPENDING INSIGHTS */}
            <div>
              <SpendingInsights
                summary={summaryRes}
                categoryData={categoryRes?.breakdown || []}
                trendData={trendRes}
              />
            </div>
          </div>

          {/* 13. TRANSACTION TABLE */}
          <TransactionTable
            incomes={rawIncomesRes}
            expenses={rawExpensesRes}
            categories={categoriesRes}
            startDate={startDate}
            endDate={endDate}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </div>
      )}
    </div>
  );
}
