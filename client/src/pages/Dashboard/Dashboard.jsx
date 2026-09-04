import { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useExpense } from '../../context/ExpenseContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { PROGRESSION_LEVELS } from '../Achievements/achievementsData';
import toast from 'react-hot-toast';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ContributionModal from '../../components/Goals/ContributionModal';
import { AnimatePresence } from 'framer-motion';
import { 
  Plus, BarChart2, TrendingUp, Target, Wallet, Award, ArrowUpRight, Grid, Activity, Clock, Bell, ChevronRight, AlertCircle
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { DataTable } from '../../components/ui/DataTable';


const getLocalTodayString = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getLocalTimeString = () => {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

export default function Dashboard() {
  const {
    summary, fetchSummary,
    expenses, fetchExpenses,
    incomes, fetchIncomes,
    categories, fetchCategories,
    budgets, fetchBudgets,
    addExpense, addIncome,
    deleteExpense, deleteIncome,
    fetchDashboardData,
    loading,
    dataRevision
  } = useExpense();
  const { user } = useAuth();

  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, type: null, loading: false });

  const confirmDeleteTransaction = async () => {
    if (!deleteConfirm.id) return;
    setDeleteConfirm((prev) => ({ ...prev, loading: true }));
    try {
      if (deleteConfirm.type === 'expense') {
        await deleteExpense(deleteConfirm.id);
      } else {
        await deleteIncome(deleteConfirm.id);
      }
      await loadDashboard();
      setDeleteConfirm({ isOpen: false, id: null, type: null, loading: false });
    } catch {
      toast.error('Failed to delete transaction');
      setDeleteConfirm((prev) => ({ ...prev, loading: false }));
    }
  };

  const [subscriptions, setSubscriptions] = useState([]);
  const [loans, setLoans] = useState([]);
  const [goals, setGoals] = useState([]);
  const [dashWallets, setDashWallets] = useState([]);

  // AI Financial Advisor states (dynamic fallback)
  const [healthScore, setHealthScore] = useState(82);
  const [healthGrade, setHealthGrade] = useState('Excellent');
  const [financialHealth, setFinancialHealth] = useState(null);

  const loadDashboard = useCallback(async () => {
    try {
      const payload = await fetchDashboardData();
      if (payload) {
        setSubscriptions(payload.subscriptions || []);
        setLoans(payload.loans || []);
        setGoals(payload.goals || []);
        setDashWallets(payload.wallets || []);
        setRecentNotifications(payload.recentNotifications || []);
        if (payload.healthScore !== undefined && payload.healthScore !== null) {
          setHealthScore(payload.healthScore);
        }
        if (payload.grade !== undefined && payload.grade !== null) {
          setHealthGrade(payload.grade);
        }
        if (payload.financialHealth !== undefined && payload.financialHealth !== null) {
          setFinancialHealth(payload.financialHealth);
        }
      }
    } catch {}
  }, [fetchDashboardData]);


  // Widgets list
  const widgets = [
    'weeklySpend', 'monthlySpend', 'remainingBudget',
    'walletSummary',
    'savingsProgress', 'largestExpense', 'mostUsedCategory',
    'health', 'bills', 'notifications'
  ];

  // Modals state
  const [activeModal, setActiveModal] = useState(null);
  const [isContributionOpen, setIsContributionOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);

  const handleContributionSubmit = async (formData) => {
    try {
      await api.post(`/goals/${selectedGoal._id}/contribute`, formData);
      toast.success('Savings transfer contribution logged successfully!');
      setIsContributionOpen(false);
      await loadDashboard();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to contribute');
    }
  };

  // Notifications state
  const [recentNotifications, setRecentNotifications] = useState([
    { message: 'Salary credited successfully! 💼', date: 'Today' },
    { message: 'Rent utility bill generated. 💡', date: 'Yesterday' }
  ]);

  // Add Transaction Form
  const [txForm, setTxForm] = useState({
    title: '',
    amount: '',
    type: 'expense',
    category: '',
    date: getLocalTodayString(),
    time: getLocalTimeString(),
    paymentMethod: 'upi',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);



  useEffect(() => {
    loadDashboard();
  }, [loadDashboard, dataRevision]); // eslint-disable-line react-hooks/exhaustive-deps

  // H8: "Due Today" strip — fed by /bills/context (the same occurrence math the
  // Calendar page uses), so the hero card can never disagree with the grid.
  const [dueContext, setDueContext] = useState(null);
  useEffect(() => {
    let cancelled = false;
    const loadDue = async () => {
      try {
        const res = await api.get('/bills/context', {
          params: { calendarDate: getLocalTodayString() },
        });
        if (!cancelled) setDueContext(res.data?.data || null);
      } catch {
        /* non-fatal: strip simply stays hidden */
      }
    };
    loadDue();
    return () => { cancelled = true; };
  }, [dataRevision]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (categories.length > 0 && !txForm.category) {
      const firstMatched = categories.find(c => c.type === txForm.type);
      if (firstMatched) {
        const val = txForm.type === 'income' ? firstMatched.name : firstMatched._id;
        setTxForm(prev => ({ ...prev, category: val }));
      }
    }
  }, [txForm.type, categories, txForm.category]);





  const handleSaveTransaction = async (e) => {
    e.preventDefault();
    if (submitting) return;

    // Frontend validations
    if (!txForm.title || !txForm.title.trim()) {
      toast.error('Please enter a title.');
      return;
    }
    if (!txForm.amount || isNaN(txForm.amount) || Number(txForm.amount) <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }
    if (!txForm.date) {
      toast.error('Please select a date.');
      return;
    }
    if (txForm.type === 'expense') {
      if (!txForm.category) {
        toast.error('Please select a category.');
        return;
      }
      if (!txForm.paymentMethod) {
        toast.error('Please select a payment method.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        ...txForm,
        amount: Number(txForm.amount),
        date: new Date(`${txForm.date}T${txForm.time || '00:00'}`).toISOString(),
      };
      delete payload.time;
      delete payload.type;

      if (txForm.type === 'expense') {
        console.log("Outgoing Payload:", payload);
        await addExpense(payload);
      } else {
        delete payload.paymentMethod;
        console.log("Outgoing Payload:", payload);
        await addIncome(payload);
      }

      setActiveModal(null);
      await loadDashboard();
      setTxForm({
        title: '',
        amount: '',
        type: 'expense',
        category: categories.find(c => c.type === 'expense')?._id || '',
        date: getLocalTodayString(),
        time: getLocalTimeString(),
        paymentMethod: 'upi',
        description: ''
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create transaction');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── WIDGETS DATA CALCULATIONS ───

  const weeklySpend = expenses
    .filter(e => (new Date() - new Date(e.date)) / (1000 * 60 * 60 * 24) <= 7)
    .reduce((sum, e) => sum + e.amount, 0);

  const monthlySpend = summary?.totalExpense || 0;
  const budgetList = Array.isArray(budgets) ? budgets : [];
  const remainingBudget = Math.max(
    budgetList.reduce((sum, b) => sum + (Number(b.limit) || 0), 0) - budgetList.reduce((sum, b) => sum + (Number(b.spent) || 0), 0),
    0
  );

  const largestExpenseObj = expenses.length > 0
    ? expenses.reduce((max, e) => e.amount > max.amount ? e : max, expenses[0])
    : null;

  const categoryCounts = {};
  expenses.forEach(e => {
    if (e.category?.name) {
      categoryCounts[e.category.name] = (categoryCounts[e.category.name] || 0) + 1;
    }
  });
  const mostUsedCategory = Object.keys(categoryCounts).length > 0
    ? Object.keys(categoryCounts).reduce((a, b) => categoryCounts[a] > categoryCounts[b] ? a : b)
    : 'None';

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in relative pb-12 dashboard-page">
        {/* Banner skeleton */}
        <Skeleton className="h-28 w-full" />
        
        {/* Activity skeleton */}
        <div className="card space-y-4 border border-slate-700/35 p-5">
          <div className="flex justify-between items-center pb-3 border-b border-slate-700/30">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton.Row key={i} />
            ))}
          </div>
        </div>

        {/* Dashboard Grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton.Card key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in relative pb-12 dashboard-page">
      {/* Top Welcome Banner Card */}
      <div className="card bg-gradient-to-r from-primary-600/10 via-indigo-600/5 to-transparent border border-slate-700/30 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-primary-500/20 transition-all duration-300">
        <div>
          <span className="text-[10px] font-black text-primary-400 uppercase tracking-widest bg-primary-500/10 px-2.5 py-1 rounded-full">Dashboard Panel</span>
          <h1 className="text-2xl font-black text-slate-100 mt-2">Hello, {user?.name?.split(' ')[0]}! 👋</h1>
          <p className="text-xs text-slate-400 mt-1">
            Welcome back. Today is {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.
          </p>
        </div>
        <button
          onClick={() => {
            setTxForm({
              title: '',
              amount: '',
              type: 'expense',
              category: categories.find(c => c.type === 'expense')?._id || '',
              date: getLocalTodayString(),
              time: getLocalTimeString(),
              paymentMethod: 'upi',
              description: ''
            });
            setActiveModal('addTx');
          }}
          className="btn-primary text-xs px-5 py-3 shadow-md active:scale-95 transition-all duration-150 rounded-xl font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
        >
          <Plus size={16} /> Add Transaction
        </button>
      </div>

      {/* ─── DUE TODAY STRIP (H8) ─── */}
      {dueContext?.isCurrentMonth && dueContext.dueTodayCount > 0 && (
        <div className="flex items-center justify-between gap-4 flex-wrap rounded-2xl border border-red-500/25 bg-red-500/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/15">
              <AlertCircle size={20} className="text-red-400" />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-red-400">
                {dueContext.dueTodayCount} bill{dueContext.dueTodayCount > 1 ? 's' : ''} due today
              </p>
              <p className="text-lg font-black text-slate-100">
                ₹{Number(dueContext.dueTodayAmount || 0).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {dueContext.dueTodayBills.slice(0, 3).map((b, i) => (
              <span
                key={i}
                className="rounded-lg border border-red-500/20 bg-slate-800/60 px-2.5 py-1 text-[11px] font-semibold text-slate-200"
              >
                {b.title} · ₹{Number(b.amount || 0).toLocaleString('en-IN')}
              </span>
            ))}
            {dueContext.dueTodayCount > 3 && (
              <span className="rounded-lg bg-slate-800/60 px-2.5 py-1 text-[11px] font-semibold text-slate-400">
                +{dueContext.dueTodayCount - 3} more
              </span>
            )}
            <Link
              to="/calendar"
              className="text-xs font-bold text-red-400 hover:text-red-300 underline underline-offset-4 whitespace-nowrap"
            >
              View calendar →
            </Link>
          </div>
        </div>
      )}

      {/* ─── TODAY'S ACTIVITY SECTION ─── */}
      {(() => {
        const todayStr = getLocalTodayString();
        const todayExpenses = expenses.filter(e => {
          const itemDate = new Date(e.date);
          const yyyy = itemDate.getFullYear();
          const mm = String(itemDate.getMonth() + 1).padStart(2, '0');
          const dd = String(itemDate.getDate()).padStart(2, '0');
          return `${yyyy}-${mm}-${dd}` === todayStr;
        });

        const todayIncomes = incomes.filter(i => {
          const itemDate = new Date(i.date);
          const yyyy = itemDate.getFullYear();
          const mm = String(itemDate.getMonth() + 1).padStart(2, '0');
          const dd = String(itemDate.getDate()).padStart(2, '0');
          return `${yyyy}-${mm}-${dd}` === todayStr;
        });

        const todayTransactions = [
          ...todayExpenses.map(e => ({ ...e, type: 'expense' })),
          ...todayIncomes.map(i => ({ ...i, type: 'income' }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date));

        const totalTodayExpense = todayExpenses.reduce((s, e) => s + e.amount, 0);
        const totalTodayIncome = todayIncomes.reduce((s, e) => s + e.amount, 0);

        const handleDeleteTransaction = (id, type) => {
          setDeleteConfirm({ isOpen: true, id, type, loading: false });
        };

        return (
          <div className="card space-y-4 border border-slate-700/35">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-700/30 pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  📅 Today's Activity
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Summary of logs captured today ({todayTransactions.length} records)
                </p>
              </div>
              <div className="flex gap-3 text-xs font-bold font-mono">
                <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-xl">
                  Income: +₹{totalTodayIncome.toLocaleString('en-IN')}
                </span>
                <span className="text-red-450 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-xl">
                  Expense: -₹{totalTodayExpense.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {todayTransactions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-400 text-xs font-medium">No transactions recorded today.</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Category</th>
                      <th>Payment</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayTransactions.map((item) => (
                      <tr key={item._id}>
                        <td className="font-semibold text-slate-100">{item.title}</td>
                        <td>
                          {item.category ? (
                            <span className="flex items-center gap-1.5 text-xs">
                              {typeof item.category !== 'string' && item.category.icon && (
                                <span>{item.category.icon}</span>
                              )}
                              <span className="text-slate-300">
                                {typeof item.category === 'string' ? item.category : item.category.name}
                              </span>
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td>
                          <span className="badge badge-blue">
                            {item.paymentMethod?.toUpperCase()}
                          </span>
                        </td>
                        <td className="text-slate-400 text-xs">
                          <div className="flex flex-col">
                            <span>{new Date(item.date).toLocaleDateString('en-IN')}</span>
                            <span className="text-[10px] text-slate-500 font-bold">
                              {new Date(item.date).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </td>
                        <td
                          className={`font-black ${
                            item.type === 'expense' ? 'text-red-450' : 'text-emerald-400'
                          }`}
                        >
                          {item.type === 'expense' ? '-' : '+'}₹
                          {item.amount.toLocaleString('en-IN')}
                        </td>
                        <td>
                          <button
                            onClick={() => handleDeleteTransaction(item._id, item.type)}
                            className="btn-danger text-xs px-2.5 py-1"
                          >
                            Del
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}

      {/* ─── TODAY'S FINANCIAL SNAPSHOT SECTION (v-dashboardH12) ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Activity size={18} className="text-primary-400" />
            Today's Financial Snapshot
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Live balances, spending and budget health for {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}.
          </p>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {widgets.map((widgetId) => {
          // 2. Weekly Spend
          if (widgetId === 'weeklySpend') {
            return (
              <div key={widgetId} className="card flex flex-col justify-between hover:border-primary-500/30 transition-all duration-300 group">
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-700/30">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                      <BarChart2 size={16} />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">Weekly Spending</h3>
                  </div>
                </div>
                <div className="pt-3 pb-1">
                  <p className="text-[28px] font-bold text-slate-100 tracking-tight group-hover:text-primary-400 transition-colors">
                    ₹{weeklySpend.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[10px] text-slate-500 font-bold mt-1.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                    Logs in last 7 days
                  </p>
                </div>
              </div>
            );
          }

          // 3. Monthly Spend
          if (widgetId === 'monthlySpend') {
            return (
              <div key={widgetId} className="card flex flex-col justify-between hover:border-primary-500/30 transition-all duration-300 group">
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-700/30">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                      <TrendingUp size={16} />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">Monthly Spending</h3>
                  </div>
                </div>
                <div className="pt-3 pb-1">
                  <p className="text-[28px] font-bold text-slate-100 tracking-tight group-hover:text-primary-400 transition-colors">
                    ₹{monthlySpend.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[10px] text-slate-500 font-bold mt-1.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Total current monthly volume
                  </p>
                </div>
              </div>
            );
          }

          // 4. Remaining Budget
          if (widgetId === 'remainingBudget') {
            const totalLimit = budgetList.reduce((sum, b) => sum + (Number(b.limit) || 0), 0);
            const totalSpent = budgetList.reduce((sum, b) => sum + (Number(b.spent) || 0), 0);
            const budgetProgressPct = totalLimit > 0 ? Math.min(Math.round((totalSpent / totalLimit) * 100), 100) : 0;

            return (
              <div key={widgetId} className="card flex flex-col justify-between hover:border-primary-500/30 transition-all duration-300">
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-700/30">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                      <Target size={16} />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">Remaining Budget</h3>
                  </div>
                  {totalLimit > 0 && (
                    <span className="text-[9px] font-bold text-slate-400">{budgetProgressPct}% spent</span>
                  )}
                </div>
                <div className="pt-3 pb-1">
                  <p className="text-[28px] font-bold text-indigo-400 tracking-tight">
                    ₹{remainingBudget.toLocaleString('en-IN')}
                  </p>
                  <div className="mt-2.5">
                    <div className="w-full bg-slate-700/30 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-indigo-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${budgetProgressPct}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[8px] font-bold text-slate-500 mt-1">
                      <span>Spent: ₹{totalSpent.toLocaleString('en-IN')}</span>
                      <span>Limit: ₹{totalLimit.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // Wallet Summary Widget (Redesigned)
          if (widgetId === 'walletSummary') {
            const totalWalletBalance = dashWallets.reduce((s, w) => s + w.balance, 0);
            const primaryWlt = dashWallets.find(w => w.isPrimary) || dashWallets[0];
            const highestWlt = dashWallets.length > 0
              ? dashWallets.reduce((max, w) => w.balance > max.balance ? w : max, dashWallets[0])
              : null;
            const primaryShare = totalWalletBalance > 0 && primaryWlt
              ? Math.round((primaryWlt.balance / totalWalletBalance) * 100)
              : 0;

            return (
              <div key={widgetId} className="card flex flex-col justify-between hover:border-primary-500/30 transition-all duration-300">
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-700/30">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                      <Wallet size={16} />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">Wallet Summary</h3>
                  </div>
                  <Link to="/wallets" className="text-[10px] text-primary-400 hover:underline font-bold flex items-center gap-0.5">
                    Manage <ChevronRight size={10} />
                  </Link>
                </div>
                <div className="pt-3 pb-1 space-y-2.5">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Total Balance</span>
                    <p className="text-[28px] font-bold text-slate-100 mt-0.5">₹{totalWalletBalance.toLocaleString('en-IN')}</p>
                  </div>
                  
                  <div className="bg-slate-900/30 p-2 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-400">Primary: {primaryWlt?.name || 'None'}</span>
                      <span className="text-slate-200 font-bold">{primaryShare}% Share</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                      <div className="bg-[#5B4CF0] h-full rounded-full" style={{ width: `${primaryShare}%` }} />
                    </div>
                    <div className="flex justify-between items-center text-[9px] text-slate-500 pt-0.5">
                      <span>Highest: {highestWlt?.name || '—'}</span>
                      <span className="font-bold">₹{highestWlt?.balance.toLocaleString('en-IN') || 0}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1">
                    <span>Active wallets: <strong>{dashWallets.length}</strong></span>
                    <Link to="/wallets" className="text-[9px] font-extrabold uppercase tracking-wider text-[#5B4CF0] hover:text-[#4338CA]">
                      Transfer Funds
                    </Link>
                  </div>
                </div>
              </div>
            );
          }

          // 6. Savings Goal Progress
          if (widgetId === 'savingsProgress') {
            const activeGoals = goals.filter(g => g.status === 'Active');
            
            const highestProgressGoal = activeGoals.length > 0 
              ? activeGoals.reduce((max, g) => (g.progressPct || 0) > (max.progressPct || 0) ? g : max)
              : null;

            const nearestGoal = activeGoals.length > 0
              ? activeGoals.reduce((min, g) => new Date(g.targetDate) < new Date(min.targetDate) ? g : min)
              : null;

            const primaryGoal = highestProgressGoal || goals[0];
            const pct = primaryGoal ? primaryGoal.progressPct : 0;
            const daysLeft = primaryGoal ? Math.ceil((new Date(primaryGoal.targetDate) - new Date()) / (1000 * 60 * 60 * 24)) : 0;

            const size = 68;
            const strokeWidth = 6;
            const radius = (size - strokeWidth) / 2;
            const circumference = 2 * Math.PI * radius;
            const offset = circumference - (Math.min(pct, 100) / 100) * circumference;

            return (
              <div key={widgetId} className="card flex flex-col justify-between hover:border-primary-500/30 transition-all duration-300">
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-700/30">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                      <Award size={16} />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">Goals Progress</h3>
                  </div>
                  <Link to="/goals" className="text-[10px] font-bold text-primary-400 hover:underline flex items-center gap-0.5">
                    View All <ChevronRight size={10} />
                  </Link>
                </div>
                
                {primaryGoal ? (
                  <div className="flex-1 flex flex-col justify-between pt-2.5 space-y-2.5">
                    <div className="flex items-center gap-4 bg-slate-900/20 p-2 rounded-xl border border-slate-700/20">
                      <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
                        <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${size} ${size}`}>
                          <circle cx={size / 2} cy={size / 2} r={radius} className="stroke-slate-800" strokeWidth={strokeWidth} fill="transparent" />
                          <circle cx={size / 2} cy={size / 2} r={radius} stroke={primaryGoal.color || '#10b981'} strokeWidth={strokeWidth} fill="transparent"
                            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
                        </svg>
                        <span className="absolute text-[11px] font-black text-slate-100">{pct}%</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-slate-200 truncate leading-tight">{primaryGoal.title}</h4>
                        <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">{primaryGoal.category}</span>
                        <div className="text-[9px] font-semibold text-slate-400 mt-1">
                          Saved: <span className="text-emerald-400 font-bold">₹{primaryGoal.savedAmount.toLocaleString('en-IN')}</span> / ₹{primaryGoal.targetAmount.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold">
                      <div className="bg-slate-900/30 p-2 border border-slate-800 rounded-xl">
                        <span className="text-slate-500 block text-[8px] font-bold uppercase">Nearest Goal</span>
                        <span className="text-slate-300 font-bold truncate block">{nearestGoal ? nearestGoal.title : 'None'}</span>
                      </div>
                      <div className="bg-slate-900/30 p-2 border border-slate-800 rounded-xl">
                        <span className="text-slate-500 block text-[8px] font-bold uppercase">Deadline</span>
                        <span className="text-amber-400 font-bold block">{daysLeft > 0 ? `${daysLeft}d left` : 'Expired'}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedGoal(primaryGoal);
                        setIsContributionOpen(true);
                      }}
                      className="w-full py-2 bg-emerald-500/20 border border-emerald-500/35 hover:bg-emerald-500/30 text-emerald-400 hover:text-emerald-400 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus size={12} />
                      <span>Quick Add Money</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                    <p className="text-xs text-slate-500">No active goals logged.</p>
                    <Link to="/goals" className="text-[10px] font-bold text-primary-400 hover:underline mt-2">Create your first goal</Link>
                  </div>
                )}
              </div>
            );
          }

          // 7. Largest Expense (Redesigned)
          if (widgetId === 'largestExpense') {
            const expShare = monthlySpend > 0 && largestExpenseObj
              ? Math.round((largestExpenseObj.amount / monthlySpend) * 100)
              : 0;

            return (
              <div key={widgetId} className="card flex flex-col justify-between hover:border-primary-500/30 transition-all duration-300 group">
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-700/30">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-450">
                      <ArrowUpRight size={16} />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">Largest Expense</h3>
                  </div>
                  <Link to="/expenses" className="text-[10px] text-primary-400 hover:underline font-bold flex items-center gap-0.5">
                    View Details <ChevronRight size={10} />
                  </Link>
                </div>
                <div className="pt-3 pb-1 space-y-2.5">
                  {largestExpenseObj ? (
                    <>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{largestExpenseObj.title}</span>
                        <p className="text-[28px] font-bold text-red-450 mt-0.5">₹{largestExpenseObj.amount.toLocaleString('en-IN')}</p>
                      </div>

                      <div className="bg-slate-900/30 p-2 border border-slate-800 rounded-xl space-y-2">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-400 flex items-center gap-1">
                            <span>{largestExpenseObj.category?.icon || '🛍️'}</span>
                            <span>{largestExpenseObj.category?.name || 'Category'}</span>
                          </span>
                          <span className="text-slate-200 font-bold">{expShare}% of Month</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                          <div className="bg-rose-500 h-full rounded-full" style={{ width: `${expShare}%` }} />
                        </div>
                        <div className="flex justify-between text-[9px] text-slate-500 pt-0.5">
                          <span>Wallet: {largestExpenseObj.paymentMethod?.toUpperCase()}</span>
                          <span>{new Date(largestExpenseObj.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-6 text-xs text-slate-500 font-bold">No logs captured</div>
                  )}
                </div>
              </div>
            );
          }

          // 8. Top Category (Redesigned)
          if (widgetId === 'mostUsedCategory') {
            // Find total spent in top category
            const topCategoryExpenses = expenses.filter(e => e.category?.name === mostUsedCategory);
            const topCategoryTotal = topCategoryExpenses.reduce((sum, e) => sum + e.amount, 0);
            const categoryShare = monthlySpend > 0
              ? Math.round((topCategoryTotal / monthlySpend) * 100)
              : 0;

            return (
              <div key={widgetId} className="card flex flex-col justify-between hover:border-primary-500/30 transition-all duration-300">
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-700/30">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                      <Grid size={16} />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">Top Category</h3>
                  </div>
                  <Link to="/reports" className="text-[10px] text-primary-400 hover:underline font-bold flex items-center gap-0.5">
                    Analyze <ChevronRight size={10} />
                  </Link>
                </div>
                <div className="pt-3 pb-1 space-y-2.5">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1.5">
                      <span>{topCategoryExpenses[0]?.category?.icon || '📊'}</span>
                      <span>{mostUsedCategory}</span>
                    </span>
                    <p className="text-[28px] font-bold text-indigo-300 mt-0.5">₹{topCategoryTotal.toLocaleString('en-IN')}</p>
                  </div>

                  <div className="bg-slate-900/30 p-2.5 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-400">Total Share</span>
                      <span className="text-[#5B4CF0] font-black">{categoryShare}% spent</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${categoryShare}%` }} />
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-400 pt-0.5">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <TrendingUp size={11} /> 5% less than last month
                    </span>
                  </div>
                </div>
              </div>
            );
          }

          // 9. Health Score (Redesigned)
          if (widgetId === 'health') {
            return (
              <div key={widgetId} className="card flex flex-col justify-between hover:border-primary-500/30 transition-all duration-300">
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-700/30">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                      <Activity size={16} />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">Health Score</h3>
                  </div>
                  <Link to="/reports" className="text-[10px] text-primary-400 hover:underline font-bold flex items-center gap-0.5">
                    View Details <ChevronRight size={10} />
                  </Link>
                </div>
                <div className="pt-3 pb-1 grid grid-cols-12 gap-3.5 items-center">
                  <div className="col-span-5 flex justify-center">
                    <div className="relative w-20 h-20 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" className="stroke-slate-800" strokeWidth="8" fill="transparent" />
                        <circle cx="50" cy="50" r="40" className="stroke-indigo-500" strokeWidth="8" fill="transparent" strokeDasharray="251" strokeDashoffset={251 - (251 * healthScore) / 100} strokeLinecap="round" />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-lg font-black text-slate-100">{healthScore}</span>
                        <span className="text-[7px] text-emerald-400 font-bold uppercase tracking-wider">{healthGrade}</span>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-7 space-y-1.5 text-[10px] font-bold">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Savings Index:</span>
                      <span className="text-slate-200">
                        {financialHealth?.metricBreakdown?.metrics?.savingsRate !== undefined
                          ? `${Math.round(financialHealth.metricBreakdown.metrics.savingsRate)}%`
                          : '75%'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Budget Score:</span>
                      <span className="text-slate-200">
                        {financialHealth?.metricBreakdown?.budgetComplianceScore !== undefined
                          ? `${Math.round((financialHealth.metricBreakdown.budgetComplianceScore / 25) * 100)}%`
                          : '88%'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Debt Score:</span>
                      <span className="text-slate-200">
                        {financialHealth?.metricBreakdown?.debtScore !== undefined
                          ? `${Math.round((financialHealth.metricBreakdown.debtScore / 20) * 100)}%`
                          : '90%'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Emergency Fund:</span>
                      <span className="text-slate-200">
                        {financialHealth?.metricBreakdown?.emergencyFundScore !== undefined
                          ? `${Math.round((financialHealth.metricBreakdown.emergencyFundScore / 5) * 100)}%`
                          : '80%'}
                      </span>
                    </div>
                  </div>

                </div>
              </div>
            );
          }

          // 10. Upcoming Obligations (Redesigned)
          if (widgetId === 'bills') {
            const combinedObligations = [
              ...subscriptions.map(s => {
                const days = Math.ceil((new Date(s.renewalDate) - new Date()) / (1000 * 60 * 60 * 24));
                return {
                  name: s.name,
                  cost: s.cost,
                  category: 'Subscription',
                  date: new Date(s.renewalDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
                  daysRemaining: days,
                  isAuto: true,
                  status: days <= 3 ? 'Urgent' : 'Upcoming'
                };
              }),
              ...loans.map(l => {
                const days = l.nextEmiDate ? Math.ceil((new Date(l.nextEmiDate) - new Date()) / (1000 * 60 * 60 * 24)) : 99;
                return {
                  name: `${l.name} EMI`,
                  cost: l.emiAmount,
                  category: 'Loan EMI',
                  date: l.nextEmiDate ? new Date(l.nextEmiDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : 'N/A',
                  daysRemaining: days,
                  isAuto: false,
                  status: days <= 3 ? 'Urgent' : 'Upcoming'
                };
              })
            ].sort((a, b) => a.daysRemaining - b.daysRemaining).slice(0, 2);

            return (
              <div key={widgetId} className="card flex flex-col justify-between hover:border-primary-500/30 transition-all duration-300">
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-700/30">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                      <Clock size={16} />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">Upcoming Obligations</h3>
                  </div>
                  <Link to="/calendar" className="text-[10px] text-primary-400 hover:underline font-bold flex items-center gap-0.5">
                    View All <ChevronRight size={10} />
                  </Link>
                </div>
                <div className="pt-2.5 pb-1 space-y-2">
                  {combinedObligations.length === 0 ? (
                    <p className="text-xs text-slate-500 font-bold">No upcoming obligations.</p>
                  ) : (
                    combinedObligations.map((ob, idx) => (
                      <div key={idx} className="p-2 bg-slate-900/30 border border-slate-700/30 rounded-xl flex items-center justify-between text-xs hover:border-slate-700/50 transition-colors">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-slate-200 truncate max-w-[110px]">{ob.name}</p>
                            {ob.isAuto && (
                              <span className="px-1 py-px rounded bg-emerald-500/10 text-emerald-400 text-[7px] font-extrabold uppercase">Auto</span>
                            )}
                          </div>
                          <p className="text-[8px] text-slate-500 font-bold mt-0.5">{ob.date} ({ob.daysRemaining > 0 ? `${ob.daysRemaining}d remaining` : 'due'})</p>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1 flex-shrink-0">
                          <span className="font-black text-slate-100">₹{ob.cost.toLocaleString('en-IN')}</span>
                          <span className={`px-1.5 py-px rounded text-[8px] font-extrabold ${ob.status === 'Urgent' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
                            {ob.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          }

          // 11. Recent Notifications
          if (widgetId === 'notifications') {
            return (
              <div key={widgetId} className="card flex flex-col justify-between hover:border-primary-500/30 transition-all duration-300">
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-700/30">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-450">
                      <Bell size={16} />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">Recent Notifications</h3>
                  </div>
                </div>
                <div className="pt-2.5 pb-1 space-y-1.5">
                  {recentNotifications.map((n, idx) => (
                    <div key={idx} className="p-2 bg-slate-900/30 border border-slate-700/30 rounded-xl text-[10px] hover:border-slate-700/50 transition-colors">
                      <p className="text-slate-300 leading-normal font-semibold">{n.message}</p>
                      <span className="text-slate-500 font-bold block text-right mt-0.5">{n.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          }




          return null;
        })}
      </div>

      {/* ─── ADD TRANSACTION MODAL ─── */}
      {activeModal === 'addTx' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in">
          <div className="card max-w-md w-full p-6 my-8 space-y-4 border border-slate-700/50">
            <div className="flex justify-between items-center border-b border-slate-700/30 pb-3">
              <h3 className="font-bold text-slate-100 text-base">Add Transaction</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-200 cursor-pointer text-sm font-bold">✕</button>
            </div>
            <form onSubmit={handleSaveTransaction} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="label">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input py-2 bg-dark-900 border-slate-700/80"
                    value={txForm.amount}
                    onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="label">Type</label>
                  <select
                    className="select py-2 bg-dark-900 border-slate-700/80"
                    value={txForm.type}
                    onChange={(e) => setTxForm({ ...txForm, type: e.target.value, category: '' })}
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="label">Category</label>
                  <select
                    className="select py-2 bg-dark-900 border-slate-700/80"
                    value={txForm.category}
                    onChange={(e) => setTxForm({ ...txForm, category: e.target.value })}
                    required
                  >
                    {categories
                      .filter(c => c.type === txForm.type)
                      .map(c => (
                        <option key={c._id} value={txForm.type === 'income' ? c.name : c._id}>
                          {c.icon} {c.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Title</label>
                  <input
                    type="text"
                    className="input py-2 bg-dark-900 border-slate-700/80"
                    value={txForm.title}
                    onChange={(e) => setTxForm({ ...txForm, title: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="label">Date</label>
                  <input
                    type="date"
                    className="input py-2 bg-dark-900 border-slate-700/80"
                    value={txForm.date}
                    onChange={(e) => setTxForm({ ...txForm, date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="label">Time</label>
                  <input
                    type="time"
                    className="input py-2 bg-dark-900 border-slate-700/80"
                    value={txForm.time}
                    onChange={(e) => setTxForm({ ...txForm, time: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="label">Payment Method</label>
                  <select
                    className="select py-2 bg-dark-900 border-slate-700/80"
                    value={txForm.paymentMethod}
                    onChange={(e) => setTxForm({ ...txForm, paymentMethod: e.target.value })}
                  >
                    <option value="upi">UPI/GPay</option>
                    <option value="card">Card</option>
                    <option value="cash">Cash</option>
                    <option value="bank">Bank Transfer</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Notes / Description</label>
                  <input
                    type="text"
                    className="input py-2 bg-dark-900 border-slate-700/80"
                    value={txForm.description}
                    onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
                  />
                </div>
              </div>



              <div className="flex justify-end gap-2 pt-4 border-t border-slate-700/50">
                <button type="button" onClick={() => setActiveModal(null)} className="btn-secondary py-2 px-4 cursor-pointer">Cancel</button>
                <button type="submit" className="btn-primary py-2 px-4 cursor-pointer" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        loading={deleteConfirm.loading}
        onConfirm={confirmDeleteTransaction}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null, type: null, loading: false })}
      />
      <AnimatePresence>
        {isContributionOpen && selectedGoal && (
          <ContributionModal
            isOpen={isContributionOpen}
            onClose={() => setIsContributionOpen(false)}
            onSubmit={handleContributionSubmit}
            goal={selectedGoal}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
