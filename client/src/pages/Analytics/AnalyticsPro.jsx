import { useState, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api, { API_URL } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { Layers, Sparkles, Plus, Database, AlertCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

// Premium Redesigned Component Imports
import DashboardHeader from '../../components/analytics/DashboardHeader';
import FilterBar from '../../components/analytics/FilterBar';
import KPICardsGrid from '../../components/analytics/KPICardsGrid';
import FinancialHealthGauge from '../../components/analytics/FinancialHealthGauge';
import BudgetProgress from '../../components/analytics/BudgetProgress';
import UpcomingPayments from '../../components/analytics/UpcomingPayments';
import IncomeExpenseAreaChart from '../../components/charts/IncomeExpenseAreaChart';
import MonthlySpendingTrend from '../../components/charts/MonthlySpendingTrend';
import DonutChart from '../../components/charts/DonutChart';
import CategoryBarChart from '../../components/charts/CategoryBarChart';
import WaterfallChart from '../../components/charts/WaterfallChart';
import TreemapChart from '../../components/charts/TreemapChart';
import RadarChartComparison from '../../components/charts/RadarChartComparison';
import PaymentMethodsChart from '../../components/charts/PaymentMethodsChart';
import SankeyDiagram from '../../components/charts/SankeyDiagram';
import DailySpendingHeatmap from '../../components/charts/DailySpendingHeatmap';
import GoalTracker from '../../components/analytics/GoalTracker';
import AIInsightsPanel from '../../components/analytics/AIInsightsPanel';
import TransactionTable from '../../components/analytics/TransactionTable';

export default function AnalyticsPro() {
  const { theme, setTheme } = useTheme();
  
  // Custom scroll reference for AI Panel
  const aiSectionRef = useRef(null);

  // States
  const [timeframe, setTimeframe] = useState('Month');
  const [currency, setCurrency] = useState('INR'); // 'INR' | 'USD' | 'EUR'
  const [selectedWallet, setSelectedWallet] = useState('all'); // 'all' | walletId
  const [globalSearch, setGlobalSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  
  // Interactive mock preview state
  const [previewSampleData, setPreviewSampleData] = useState(false);

  // Default: Current Month dates
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  });

  // Currency Conversions
  const currencySymbol = useMemo(() => {
    if (currency === 'USD') return '$';
    if (currency === 'EUR') return '€';
    return '₹';
  }, [currency]);

  const conversionRate = useMemo(() => {
    if (currency === 'USD') return 0.012; // 1 INR = 0.012 USD
    if (currency === 'EUR') return 0.011; // 1 INR = 0.011 EUR
    return 1.0;
  }, [currency]);

  // Query Params
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

  // 8. Fetch raw Category definitions
  const { data: categoriesRes } = useQuery({
    queryKey: ['categoriesList'],
    queryFn: async () => {
      const res = await api.get('/categories');
      return res.data.data;
    }
  });

  // 9. Fetch raw Expenses & Incomes
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

  // 10. Supplementary premium dashboard REST endpoints
  const { data: budgetsRes, isLoading: isBudgetsLoading, refetch: refetchBudgets } = useQuery({
    queryKey: ['budgetsList'],
    queryFn: async () => {
      const res = await api.get('/budgets');
      return res.data.data || [];
    }
  });

  const { data: loansRes, isLoading: isLoansLoading, refetch: refetchLoans } = useQuery({
    queryKey: ['loansList'],
    queryFn: async () => {
      const res = await api.get('/loans');
      return res.data.data || [];
    }
  });

  const { data: investmentsRes, isLoading: isInvestmentsLoading, refetch: refetchInvestments } = useQuery({
    queryKey: ['investmentsList'],
    queryFn: async () => {
      const res = await api.get('/investments');
      return res.data.data || [];
    }
  });

  const { data: goalsRes, isLoading: isGoalsLoading, refetch: refetchGoals } = useQuery({
    queryKey: ['goalsList'],
    queryFn: async () => {
      const res = await api.get('/goals');
      return res.data.data || [];
    }
  });

  const { data: subscriptionsRes, isLoading: isSubscriptionsLoading, refetch: refetchSubscriptions } = useQuery({
    queryKey: ['subscriptionsList'],
    queryFn: async () => {
      const res = await api.get('/subscriptions');
      return res.data.data || [];
    }
  });

  const { data: walletsRes, isLoading: isWalletsLoading, refetch: refetchWallets } = useQuery({
    queryKey: ['walletsList'],
    queryFn: async () => {
      const res = await api.get('/wallets');
      return res.data.data || [];
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
        refetchRawIncomes(),
        refetchBudgets(),
        refetchLoans(),
        refetchInvestments(),
        refetchGoals(),
        refetchSubscriptions(),
        refetchWallets()
      ]),
      {
        loading: 'Refreshing analytics ledger datasets...',
        success: 'Financial profiles successfully updated!',
        error: 'Failed to refresh financial metrics.'
      }
    );
  };

  const handleExport = (format) => {
    const baseUrl = API_URL;
    const sStr = startDate ? startDate.toISOString() : '';
    const eStr = endDate ? endDate.toISOString() : '';
    const token = localStorage.getItem('accessToken');
    const url = `${baseUrl}/analytics/export/${format}?startDate=${sStr}&endDate=${eStr}&token=${token}`;
    
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.click();
  };

  const scrollToAI = () => {
    aiSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    isRawIncomesLoading ||
    isBudgetsLoading ||
    isLoansLoading ||
    isInvestmentsLoading ||
    isGoalsLoading ||
    isSubscriptionsLoading ||
    isWalletsLoading;

  // Real Database checks: is there transaction history?
  const hasDatabaseData = useMemo(() => {
    if (isLoading) return true; // keep skeleton active
    return (rawExpensesRes && rawExpensesRes.length > 0) || (rawIncomesRes && rawIncomesRes.length > 0);
  }, [isLoading, rawExpensesRes, rawIncomesRes]);

  // High-Fidelity Mock Dataset for previewing empty states
  const mockDataset = useMemo(() => {
    const now = new Date();
    const mockSummary = {
      totalIncome: 154000,
      totalExpense: 89400,
      savings: 64600,
      balance: 64600,
      avgDailyExpense: 2980,
      highestExpenseDay: { date: new Date(now.getFullYear(), now.getMonth(), 12).toISOString(), amount: 24500 },
      totalTransactions: 36,
      trends: { incomeTrend: 12.4, expenseTrend: -4.2, savingsTrend: 35.8, balanceTrend: 18.2 },
      sparkline: [2000, 4500, 1000, 6700, 3000, 8900, 4000, 5400, 3000, 7200]
    };

    const mockMonthly = [
      { name: 'Aug 2025', income: 120000, expense: 78000, savings: 42000 },
      { name: 'Sep 2025', income: 120000, expense: 80000, savings: 40000 },
      { name: 'Oct 2025', income: 130000, expense: 85000, savings: 45000 },
      { name: 'Nov 2025', income: 130000, expense: 92000, savings: 38000 },
      { name: 'Dec 2025', income: 160000, expense: 110000, savings: 50000 },
      { name: 'Jan 2026', income: 140000, expense: 82000, savings: 58000 },
      { name: 'Feb 2026', income: 140000, expense: 85000, savings: 55000 },
      { name: 'Mar 2026', income: 145000, expense: 87000, savings: 58000 },
      { name: 'Apr 2026', income: 150000, expense: 88000, savings: 62000 },
      { name: 'May 2026', income: 150000, expense: 91000, savings: 59000 },
      { name: 'Jun 2026', income: 154000, expense: 89400, savings: 64600 },
      { name: 'Jul 2026', income: 154000, expense: 89400, savings: 64600 }
    ];

    const mockCategory = {
      totalExpense: 89400,
      breakdown: [
        { name: 'Rent & Housing', total: 32000, percentage: 35.8, count: 1, color: '#6366f1', icon: '🏠' },
        { name: 'Food & Dining', total: 18500, percentage: 20.7, count: 14, color: '#f97316', icon: '🍕' },
        { name: 'Bills & Utilities', total: 12400, percentage: 13.9, count: 5, color: '#f59e0b', icon: '⚡' },
        { name: 'Shopping', total: 10500, percentage: 11.7, count: 6, color: '#ec4899', icon: '🛍️' },
        { name: 'Entertainment', total: 9200, percentage: 10.3, count: 4, color: '#a855f7', icon: '🎬' },
        { name: 'Transport', total: 6800, percentage: 7.6, count: 6, color: '#0ea5e9', icon: '🚗' }
      ]
    };

    const mockTrend = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - 29 + i);
      const amt = Math.round(1500 + Math.sin(i * 0.5) * 800 + (i === 12 ? 22000 : 0));
      return {
        date: date.toISOString().split('T')[0],
        amount: amt,
        rolling7: Math.round(1800 + i * 20),
        rolling30: Math.round(1750 + i * 15)
      };
    });

    const mockCashflow = mockTrend.map((t, idx) => ({
      date: t.date,
      income: idx === 0 || idx === 15 ? 77000 : 0,
      expense: t.amount,
      runningBalance: 40000 + (idx * 1500)
    }));

    const mockHeatmap = Array.from({ length: 365 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - 364 + i);
      const isActive = Math.random() > 0.4;
      return {
        _id: date.toISOString().split('T')[0],
        amount: isActive ? Math.round(Math.random() * 6000) : 0,
        count: isActive ? Math.round(Math.random() * 4 + 1) : 0
      };
    });

    const mockIncome = {
      totalIncome: 154000,
      sources: [
        { source: 'Active Salary', amount: 120000, count: 1, percentage: 77.9, color: '#10b981', icon: '🏦' },
        { source: 'Side Hustles', amount: 24000, count: 2, percentage: 15.6, color: '#059669', icon: '💻' },
        { source: 'Dividends Yield', amount: 10000, count: 1, percentage: 6.5, color: '#14b8a6', icon: '📈' }
      ]
    };

    const mockBudgets = [
      { _id: 'b1', category: { name: 'Food & Dining' }, limit: 20000, spent: 18500, period: 'monthly', alertThreshold: 80 },
      { _id: 'b2', category: { name: 'Shopping' }, limit: 12000, spent: 10500, period: 'monthly', alertThreshold: 80 },
      { _id: 'b3', category: { name: 'Transport' }, limit: 8000, spent: 6800, period: 'monthly', alertThreshold: 80 }
    ];

    const mockLoans = [
      { _id: 'l1', name: 'Premium HDFC Home Loan', amount: 4800000, interestRate: 8.4, durationMonths: 240, emiAmount: 38500, remainingBalance: 4620000, nextEmiDate: new Date(now.getFullYear(), now.getMonth(), 15).toISOString(), paymentStatus: 'unpaid' },
      { _id: 'l2', name: 'ICICI Car Loan Portfolio', amount: 900000, interestRate: 9.2, durationMonths: 60, emiAmount: 17200, remainingBalance: 520000, nextEmiDate: new Date(now.getFullYear(), now.getMonth(), 24).toISOString(), paymentStatus: 'unpaid' }
    ];

    const mockInvestments = [
      { _id: 'i1', name: 'Parag Parikh Flexi Cap', investedAmount: 180000, currentValue: 245000, type: 'mutual_funds' },
      { _id: 'i2', name: 'Tesla Inc Equity Asset', investedAmount: 120000, currentValue: 154000, type: 'stocks' },
      { _id: 'i3', name: 'Bitcoin Liquidity Pool', investedAmount: 60000, currentValue: 88000, type: 'crypto' }
    ];

    const mockGoals = [
      { _id: 'g1', name: '6-Month Emergency Cushion', targetAmount: 300000, currentSaved: 185000, deadline: new Date(now.getFullYear(), now.getMonth() + 8, 1).toISOString(), category: 'Emergency', status: 'active', progressPct: 62 },
      { _id: 'g2', name: 'Euro Trip Winter Cabin', targetAmount: 200000, currentSaved: 95000, deadline: new Date(now.getFullYear(), now.getMonth() + 11, 25).toISOString(), category: 'Travel', status: 'active', progressPct: 48 }
    ];

    const mockSubscriptions = [
      { _id: 's1', name: 'Netflix Premium Suite', cost: 649, billingCycle: 'monthly', renewalDate: new Date(now.getFullYear(), now.getMonth(), 14).toISOString() },
      { _id: 's2', name: 'Spotify Music Family', cost: 179, billingCycle: 'monthly', renewalDate: new Date(now.getFullYear(), now.getMonth(), 21).toISOString() },
      { _id: 's3', name: 'AWS Cloud Hosting Dev', cost: 2450, billingCycle: 'monthly', renewalDate: new Date(now.getFullYear(), now.getMonth(), 28).toISOString() }
    ];

    const mockWallets = [
      { _id: 'w1', name: 'HDFC Savings Account', balance: 112000, type: 'bank', icon: '🏦', color: '#6366f1' },
      { _id: 'w2', name: 'Surplus Cash reserves', balance: 14500, type: 'cash', icon: '💵', color: '#10b981' }
    ];

    const mockRawExpenses = [
      { _id: 'e1', title: 'Home Monthly Rent Settlement', amount: 32000, date: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), category: 'Rent & Housing', paymentMethod: 'bank', description: 'Monthly rent payout for apartment.' },
      { _id: 'e2', title: 'Weekly Groceries - Swiggy Instamart', amount: 2450, date: new Date(now.getFullYear(), now.getMonth(), 4).toISOString(), category: 'Food & Dining', paymentMethod: 'upi', description: 'Fresh vegetables and household stocks.' },
      { _id: 'e3', title: 'Zara Leather Jacket & Apparel', amount: 6800, date: new Date(now.getFullYear(), now.getMonth(), 8).toISOString(), category: 'Shopping', paymentMethod: 'card', description: 'Winter coats and formal shopping.' },
      { _id: 'e4', title: 'PVR Inox Movie Leisure', amount: 1400, date: new Date(now.getFullYear(), now.getMonth(), 9).toISOString(), category: 'Entertainment', paymentMethod: 'upi', description: 'Weekend movie tickets.' },
      { _id: 'e5', title: 'Electricity Grid Utility Bill', amount: 4800, date: new Date(now.getFullYear(), now.getMonth(), 12).toISOString(), category: 'Bills & Utilities', paymentMethod: 'bank', description: 'Monthly electricity bill.' },
      { _id: 'e6', title: 'Weekly Dinner Out - The Oberoi', amount: 5600, date: new Date(now.getFullYear(), now.getMonth(), 12).toISOString(), category: 'Food & Dining', paymentMethod: 'card', description: 'Family dinner.' }
    ];

    const mockRawIncomes = [
      { _id: 'in1', title: 'Corporate Salary Credit', amount: 120000, date: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), category: 'Active Salary', description: 'Monthly corporate payroll credit.' },
      { _id: 'in2', title: 'Consulting Contract Payout', amount: 24000, date: new Date(now.getFullYear(), now.getMonth(), 10).toISOString(), category: 'Side Hustles', description: 'UI redesign freelance client payout.' }
    ];

    return {
      summary: mockSummary,
      monthly: mockMonthly,
      category: mockCategory,
      trend: mockTrend,
      cashflow: mockCashflow,
      heatmap: mockHeatmap,
      income: mockIncome,
      budgets: mockBudgets,
      loans: mockLoans,
      investments: mockInvestments,
      goals: mockGoals,
      subscriptions: mockSubscriptions,
      wallets: mockWallets,
      rawExpenses: mockRawExpenses,
      rawIncomes: mockRawIncomes
    };
  }, []);

  // Compute final variables using conversion rates, filtering by selectedWallet, 
  // and merging mock preview values if database has no data or user clicked generate.
  const activeSummary = useMemo(() => {
    const rawSum = (previewSampleData || !hasDatabaseData) ? mockDataset.summary : (summaryRes || {});
    return {
      ...rawSum,
      totalIncome: (rawSum.totalIncome || 0) * conversionRate,
      totalExpense: (rawSum.totalExpense || 0) * conversionRate,
      savings: (rawSum.savings || 0) * conversionRate,
      balance: (rawSum.balance || 0) * conversionRate,
      avgDailyExpense: (rawSum.avgDailyExpense || 0) * conversionRate,
      highestExpenseDay: rawSum.highestExpenseDay 
        ? { ...rawSum.highestExpenseDay, amount: rawSum.highestExpenseDay.amount * conversionRate } 
        : null
    };
  }, [previewSampleData, hasDatabaseData, summaryRes, conversionRate, mockDataset]);

  const activeMonthly = useMemo(() => {
    const rawList = (previewSampleData || !hasDatabaseData) ? mockDataset.monthly : (monthlyRes || []);
    return rawList.map(item => ({
      ...item,
      income: item.income * conversionRate,
      expense: item.expense * conversionRate,
      savings: item.savings * conversionRate
    }));
  }, [previewSampleData, hasDatabaseData, monthlyRes, conversionRate, mockDataset]);

  const activeCategory = useMemo(() => {
    const rawCat = (previewSampleData || !hasDatabaseData) ? mockDataset.category : (categoryRes || {});
    const list = rawCat.breakdown || [];
    return list.map(item => ({
      ...item,
      total: item.total * conversionRate
    }));
  }, [previewSampleData, hasDatabaseData, categoryRes, conversionRate, mockDataset]);

  const activeTrend = useMemo(() => {
    const rawList = (previewSampleData || !hasDatabaseData) ? mockDataset.trend : (trendRes || []);
    return rawList.map(item => ({
      ...item,
      amount: item.amount * conversionRate,
      rolling7: item.rolling7 * conversionRate,
      rolling30: item.rolling30 * conversionRate,
      prediction: item.prediction ? item.prediction * conversionRate : null
    }));
  }, [previewSampleData, hasDatabaseData, trendRes, conversionRate, mockDataset]);

  const activeCashflow = useMemo(() => {
    const rawList = (previewSampleData || !hasDatabaseData) ? mockDataset.cashflow : (cashflowRes || []);
    return rawList.map(item => ({
      ...item,
      income: item.income * conversionRate,
      expense: item.expense * conversionRate,
      runningBalance: item.runningBalance * conversionRate
    }));
  }, [previewSampleData, hasDatabaseData, cashflowRes, conversionRate, mockDataset]);

  const activeHeatmap = useMemo(() => {
    return (previewSampleData || !hasDatabaseData) ? mockDataset.heatmap : (heatmapRes || []);
  }, [previewSampleData, hasDatabaseData, heatmapRes, mockDataset]);

  const activeIncome = useMemo(() => {
    const rawInc = (previewSampleData || !hasDatabaseData) ? mockDataset.income : (incomeRes || {});
    const list = rawInc.sources || [];
    return list.map(item => ({
      ...item,
      amount: item.amount * conversionRate
    }));
  }, [previewSampleData, hasDatabaseData, incomeRes, conversionRate, mockDataset]);

  const activeBudgets = useMemo(() => {
    const rawList = (previewSampleData || !hasDatabaseData) ? mockDataset.budgets : (budgetsRes || []);
    return rawList.map(item => ({
      ...item,
      limit: item.limit * conversionRate,
      spent: item.spent * conversionRate
    }));
  }, [previewSampleData, hasDatabaseData, budgetsRes, conversionRate, mockDataset]);

  const activeLoans = useMemo(() => {
    const rawList = (previewSampleData || !hasDatabaseData) ? mockDataset.loans : (loansRes || []);
    return rawList.map(item => ({
      ...item,
      amount: item.amount * conversionRate,
      emiAmount: item.emiAmount * conversionRate,
      remainingBalance: item.remainingBalance * conversionRate
    }));
  }, [previewSampleData, hasDatabaseData, loansRes, conversionRate, mockDataset]);

  const activeInvestments = useMemo(() => {
    const rawList = (previewSampleData || !hasDatabaseData) ? mockDataset.investments : (investmentsRes || []);
    return rawList.map(item => ({
      ...item,
      investedAmount: item.investedAmount * conversionRate,
      currentValue: item.currentValue * conversionRate
    }));
  }, [previewSampleData, hasDatabaseData, investmentsRes, conversionRate, mockDataset]);

  const activeGoals = useMemo(() => {
    const rawList = (previewSampleData || !hasDatabaseData) ? mockDataset.goals : (goalsRes || []);
    return rawList.map(item => ({
      ...item,
      targetAmount: item.targetAmount * conversionRate,
      currentSaved: item.currentSaved * conversionRate
    }));
  }, [previewSampleData, hasDatabaseData, goalsRes, conversionRate, mockDataset]);

  const activeSubscriptions = useMemo(() => {
    const rawList = (previewSampleData || !hasDatabaseData) ? mockDataset.subscriptions : (subscriptionsRes || []);
    return rawList.map(item => ({
      ...item,
      cost: item.cost * conversionRate
    }));
  }, [previewSampleData, hasDatabaseData, subscriptionsRes, conversionRate, mockDataset]);

  const activeWallets = useMemo(() => {
    const rawList = (previewSampleData || !hasDatabaseData) ? mockDataset.wallets : (walletsRes || []);
    return rawList.map(item => ({
      ...item,
      balance: item.balance * conversionRate
    }));
  }, [previewSampleData, hasDatabaseData, walletsRes, conversionRate, mockDataset]);

  const activeRawExpenses = useMemo(() => {
    const rawList = (previewSampleData || !hasDatabaseData) ? mockDataset.rawExpenses : (rawExpensesRes || []);
    let list = rawList.map(item => ({
      ...item,
      amount: item.amount * conversionRate
    }));
    
    // Filter by wallet account
    if (selectedWallet !== 'all') {
      list = list.filter(item => item.paymentMethod === (walletsRes?.find(w => w._id === selectedWallet)?.type || ''));
    }
    
    return list;
  }, [previewSampleData, hasDatabaseData, rawExpensesRes, selectedWallet, walletsRes, conversionRate, mockDataset]);

  const activeRawIncomes = useMemo(() => {
    const rawList = (previewSampleData || !hasDatabaseData) ? mockDataset.rawIncomes : (rawIncomesRes || []);
    return rawList.map(item => ({
      ...item,
      amount: item.amount * conversionRate
    }));
  }, [previewSampleData, hasDatabaseData, rawIncomesRes, conversionRate, mockDataset]);

  // Loading skeleton screen
  if (isLoading) {
    return (
      <div className="space-y-6 pb-12 p-4 max-w-[1600px] mx-auto animate-pulse">
        <div className="h-14 bg-dark-800/60 border border-slate-800 rounded-2xl" />
        <div className="h-12 bg-dark-800/60 border border-slate-800 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-dark-800/60 border border-slate-800 rounded-3xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-80 lg:col-span-2 bg-dark-800/60 border border-slate-800 rounded-3xl" />
          <div className="h-80 bg-dark-800/60 border border-slate-800 rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 p-1 max-w-[1600px] mx-auto transition-colors duration-300">
      
      {/* Sample Data Banner */}
      {(previewSampleData || !hasDatabaseData) && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-primary-900/40 via-indigo-900/30 to-slate-900/40 border border-primary-500/20 rounded-2xl text-xs">
          <div className="flex items-center gap-2 text-primary-300 font-semibold">
            <Database size={15} className="animate-bounce" />
            <span>
              {!hasDatabaseData
                ? 'Empty Database: No ledger history found. Redesign preview is loaded with high-fidelity sample data.'
                : 'Sample Data Preview Active: Showing interactive sandbox metrics.'}
            </span>
          </div>
          {hasDatabaseData && (
            <button
              onClick={() => { setPreviewSampleData(false); toast.success('Reverted to real ledger database!'); }}
              className="px-3 py-1 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-bold cursor-pointer transition-all"
            >
              Show Real Data
            </button>
          )}
        </div>
      )}

      {/* red branded Executive Header */}
      <DashboardHeader
        wallets={walletsRes || []}
        selectedWallet={selectedWallet}
        setSelectedWallet={setSelectedWallet}
        currency={currency}
        setCurrency={setCurrency}
        globalSearch={globalSearch}
        setGlobalSearch={setGlobalSearch}
        onRefresh={handleRefreshAll}
        theme={theme}
        setTheme={setTheme}
        onExport={handleExport}
        onScrollToAI={scrollToAI}
      />

      {/* Date preset controllers */}
      <FilterBar
        timeframe={timeframe}
        setTimeframe={setTimeframe}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
      />

      {/* Main KPI grids */}
      <KPICardsGrid
        summary={activeSummary}
        budgets={activeBudgets}
        loans={activeLoans}
        investments={activeInvestments}
        goals={activeGoals}
        wallets={activeWallets}
        rawExpenses={activeRawExpenses}
        rawIncomes={activeRawIncomes}
        currencySymbol={currencySymbol}
      />

      {/* Allocation Rows: Score Gauge + Stacked Bar + Upcoming reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Circular gauge */}
        <FinancialHealthGauge
          summary={activeSummary}
          budgets={activeBudgets}
          loans={activeLoans}
          goals={activeGoals}
          wallets={activeWallets}
        />

        {/* 100% Stacked allocation */}
        <BudgetProgress
          budgets={activeBudgets}
          rawExpenses={activeRawExpenses}
          summary={activeSummary}
          currencySymbol={currencySymbol}
        />

        {/* Timeline widget */}
        <UpcomingPayments
          subscriptions={activeSubscriptions}
          loans={activeLoans}
          currencySymbol={currencySymbol}
        />

      </div>

      {/* Main interactive charts: Area line + Monthly ML Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Income vs Expense area (zoomable) */}
        <div className="lg:col-span-2">
          <IncomeExpenseAreaChart
            trendData={activeTrend}
            prevTrendData={activeTrend.map(t => ({ ...t, amount: t.amount * 0.9 }))}
            currencySymbol={currencySymbol}
          />
        </div>

        {/* Forecast Line Chart */}
        <div>
          <MonthlySpendingTrend
            monthlyData={activeMonthly}
            currencySymbol={currencySymbol}
          />
        </div>

      </div>

      {/* Category breakdown rows: Donut + Bar chart lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Interactive center Donut */}
        <DonutChart
          categoryData={activeCategory}
          rawExpenses={activeRawExpenses}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          currencySymbol={currencySymbol}
        />

        {/* Horizontal sorting Bar lists */}
        <CategoryBarChart
          categoryData={activeCategory}
          currencySymbol={currencySymbol}
        />

      </div>

      {/* Timeline flows: Sankey + Cumulative Cashflows */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Sankey Money map diagram */}
        <SankeyDiagram
          summary={activeSummary}
          wallets={activeWallets}
          categoryData={activeCategory}
          currencySymbol={currencySymbol}
        />

        {/* Waterfall decay bridge */}
        <WaterfallChart
          summary={activeSummary}
          categoryData={activeCategory}
          currencySymbol={currencySymbol}
        />

      </div>

      {/* Nested Treemaps + Radar comparison scales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Treemap */}
        <TreemapChart
          rawExpenses={activeRawExpenses}
          currencySymbol={currencySymbol}
        />

        {/* Radar targets comparison */}
        <RadarChartComparison
          summary={activeSummary}
          budgets={activeBudgets}
          loans={activeLoans}
          investments={activeInvestments}
          currencySymbol={currencySymbol}
        />

      </div>

      {/* Heatmaps & Payments splits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Daily Spending Heatmap */}
        <div className="lg:col-span-2">
          <DailySpendingHeatmap
            heatmapData={activeHeatmap}
            currencySymbol={currencySymbol}
          />
        </div>

        {/* Payment Channels donut */}
        <div>
          <PaymentMethodsChart
            rawExpenses={activeRawExpenses}
            currencySymbol={currencySymbol}
          />
        </div>

      </div>

      {/* Goals progress rings & deadline cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2">
          <GoalTracker
            goals={activeGoals}
            currencySymbol={currencySymbol}
          />
        </div>

        {/* AI automated summary highlights (tabbed lists) */}
        <div ref={aiSectionRef}>
          <AIInsightsPanel
            summary={activeSummary}
            categoryData={activeCategory}
            trendData={activeTrend}
            currencySymbol={currencySymbol}
          />
        </div>

      </div>

      {/* Expandable row sticky transaction list table */}
      <TransactionTable
        incomes={activeRawIncomes}
        expenses={activeRawExpenses}
        categories={categoriesRes || []}
        startDate={startDate}
        endDate={endDate}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        refetchExpenses={refetchRawExpenses}
        refetchIncomes={refetchRawIncomes}
        currencySymbol={currencySymbol}
      />

    </div>
  );
}
