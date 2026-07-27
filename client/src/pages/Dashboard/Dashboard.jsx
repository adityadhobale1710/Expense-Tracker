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
  Plus, BarChart2, TrendingUp, Target, Wallet, Award, ArrowUpRight, Grid, Activity, Clock, Bell, Lightbulb, ChevronRight, AlertCircle
} from 'lucide-react';


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
    fetchDashboardData
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

  // Gamification state
  const [gameXp, setGameXp] = useState(3450);
  const [gameCoins, setGameCoins] = useState(640);
  const [gameStreak, setGameStreak] = useState(18);
  const [unlockedBadgesCount, setUnlockedBadgesCount] = useState(13);

  const [subscriptions, setSubscriptions] = useState([]);
  const [loans, setLoans] = useState([]);
  const [goals, setGoals] = useState([]);
  const [dashWallets, setDashWallets] = useState([]);

  const loadDashboard = useCallback(async () => {
    try {
      const payload = await fetchDashboardData();
      if (payload) {
        if (payload.user) {
          setGameXp(payload.user.xp || 3450);
          setGameCoins(payload.user.coins || 640);
          setGameStreak(payload.user.streak || 18);
          setUnlockedBadgesCount(payload.user.achievements?.filter(a => a.unlocked).length || 13);
        }
        setSubscriptions(payload.subscriptions || []);
        setLoans(payload.loans || []);
        setGoals(payload.goals || []);
        setDashWallets(payload.wallets || []);
        setRecentNotifications(payload.recentNotifications || []);
      }
    } catch {}
  }, [fetchDashboardData]);

  // Widgets list
  const widgets = [
    'weeklySpend', 'monthlySpend', 'remainingBudget',
    'walletSummary',
    'savingsProgress', 'largestExpense', 'mostUsedCategory',
    'health', 'bills', 'notifications',
    'tipOfTheDay'
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
  }, [loadDashboard]);

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
                <span className="text-emerald-450 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-xl">
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
                              <span>{item.category.icon}</span>
                              <span className="text-slate-350">{item.category.name}</span>
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
                            item.type === 'expense' ? 'text-red-450' : 'text-emerald-450'
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

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
        {widgets.map((widgetId) => {
          // 2. Weekly Spend
          if (widgetId === 'weeklySpend') {
            return (
              <div key={widgetId} className="card flex flex-col justify-between hover:border-primary-500/30 transition-all duration-300 group">
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-700/30">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-450">
                      <BarChart2 size={16} />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-350">Weekly Spending</h3>
                  </div>
                </div>
                <div className="py-4">
                  <p className="text-3xl font-extrabold text-slate-100 tracking-tight group-hover:text-primary-400 transition-colors">
                    ₹{weeklySpend.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[10px] text-slate-555 font-bold mt-1.5 flex items-center gap-1">
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
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-455">
                      <TrendingUp size={16} />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-355">Monthly Spending</h3>
                  </div>
                </div>
                <div className="py-4">
                  <p className="text-3xl font-extrabold text-slate-100 tracking-tight group-hover:text-primary-400 transition-colors">
                    ₹{monthlySpend.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[10px] text-slate-555 font-bold mt-1.5 flex items-center gap-1">
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
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-455">
                      <Target size={16} />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-350">Remaining Budget</h3>
                  </div>
                  {totalLimit > 0 && (
                    <span className="text-[9px] font-bold text-slate-400">{budgetProgressPct}% spent</span>
                  )}
                </div>
                <div className="py-4">
                  <p className="text-3xl font-extrabold text-indigo-400 tracking-tight">
                    ₹{remainingBudget.toLocaleString('en-IN')}
                  </p>
                  <div className="mt-3">
                    <div className="w-full bg-slate-700/30 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-indigo-550 h-full rounded-full transition-all duration-500" 
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

          // Wallet Summary Widget
          if (widgetId === 'walletSummary') {
            const totalWalletBalance = dashWallets.reduce((s, w) => s + w.balance, 0);
            const primaryWlt = dashWallets.find(w => w.isPrimary) || dashWallets[0];
            return (
              <div key={widgetId} className="card flex flex-col justify-between hover:border-primary-500/30 transition-all duration-300">
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-700/30">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-450">
                      <Wallet size={16} />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-350">Wallet Summary</h3>
                  </div>
                  <Link to="/wallets" className="text-[10px] text-primary-400 hover:underline font-bold flex items-center gap-0.5">
                    View All <ChevronRight size={10} />
                  </Link>
                </div>
                <div className="py-4 space-y-2.5">
                  <div className="flex justify-between items-center bg-slate-900/40 p-2.5 rounded-xl border border-slate-700/20">
                    <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Total Balance</span>
                    <span className="text-lg font-extrabold text-slate-100">₹{totalWalletBalance.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[9px] text-slate-500 uppercase font-bold">Primary</span>
                    <span className="text-xs font-semibold text-slate-205">{primaryWlt?.icon} {primaryWlt?.name || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[9px] text-slate-500 uppercase font-bold">Wallets</span>
                    <span className="text-xs font-semibold text-slate-205">{dashWallets.length} active</span>
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
              <div key={widgetId} className="card flex flex-col justify-between hover:border-primary-500/30 transition-all duration-300 min-h-[320px]">
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-700/30">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-450">
                      <Award size={16} />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-355">Goals Progress</h3>
                  </div>
                  <Link to="/goals" className="text-[10px] font-bold text-primary-400 hover:underline flex items-center gap-0.5">
                    View All <ChevronRight size={10} />
                  </Link>
                </div>
                
                {primaryGoal ? (
                  <div className="flex-1 flex flex-col justify-between pt-3 space-y-3">
                    <div className="flex items-center gap-4 bg-slate-900/20 p-2.5 rounded-xl border border-slate-700/20">
                      <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
                        <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${size} ${size}`}>
                          <circle cx={size / 2} cy={size / 2} r={radius} className="stroke-slate-800" strokeWidth={strokeWidth} fill="transparent" />
                          <circle cx={size / 2} cy={size / 2} r={radius} stroke={primaryGoal.color || '#10b981'} strokeWidth={strokeWidth} fill="transparent"
                            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
                        </svg>
                        <span className="absolute text-[11px] font-black text-slate-100">{pct}%</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-slate-205 truncate leading-tight">{primaryGoal.title}</h4>
                        <span className="text-[8px] text-slate-550 font-bold uppercase tracking-wider">{primaryGoal.category}</span>
                        <div className="text-[9px] font-semibold text-slate-400 mt-1">
                          Saved: <span className="text-emerald-450 font-bold">₹{primaryGoal.savedAmount.toLocaleString('en-IN')}</span> / ₹{primaryGoal.targetAmount.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold">
                      <div className="bg-slate-900/30 p-2 border border-slate-800 rounded-xl">
                        <span className="text-slate-550 block text-[8px] font-bold uppercase">Nearest Goal</span>
                        <span className="text-slate-300 font-bold truncate block">{nearestGoal ? nearestGoal.title : 'None'}</span>
                      </div>
                      <div className="bg-slate-900/30 p-2 border border-slate-800 rounded-xl">
                        <span className="text-slate-550 block text-[8px] font-bold uppercase">Deadline</span>
                        <span className="text-amber-450 font-bold block">{daysLeft > 0 ? `${daysLeft}d left` : 'Expired'}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedGoal(primaryGoal);
                        setIsContributionOpen(true);
                      }}
                      className="w-full py-2.5 bg-emerald-500/20 border border-emerald-500/35 hover:bg-emerald-500/30 text-emerald-450 hover:text-emerald-400 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
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

          // 7. Largest Expense
          if (widgetId === 'largestExpense') {
            return (
              <div key={widgetId} className="card flex flex-col justify-between hover:border-primary-500/30 transition-all duration-300 group">
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-700/30">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-450">
                      <ArrowUpRight size={16} />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-350">Largest Expense</h3>
                  </div>
                </div>
                <div className="py-4">
                  {largestExpenseObj ? (
                    <>
                      <p className="text-base font-bold text-slate-205 truncate group-hover:text-red-400 transition-colors">{largestExpenseObj.title}</p>
                      <p className="text-2xl font-black text-red-450 mt-1">-₹{largestExpenseObj.amount.toLocaleString('en-IN')}</p>
                    </>
                  ) : (
                    <p className="text-xs text-slate-550 font-bold">No logs captured</p>
                  )}
                </div>
              </div>
            );
          }

          // 8. Most Used Category
          if (widgetId === 'mostUsedCategory') {
            return (
              <div key={widgetId} className="card flex flex-col justify-between hover:border-primary-500/30 transition-all duration-300">
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-700/30">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-455">
                      <Grid size={16} />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-350">Top Category</h3>
                  </div>
                </div>
                <div className="py-4">
                  <p className="text-2xl font-extrabold text-indigo-300 uppercase tracking-wide">{mostUsedCategory}</p>
                  <p className="text-[10px] text-slate-550 font-bold mt-1.5">Most frequent logging sector</p>
                </div>
              </div>
            );
          }

          // 9. Financial Health Score
          if (widgetId === 'health') {
            return (
              <div key={widgetId} className="card flex flex-col justify-between hover:border-primary-500/30 transition-all duration-300">
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-700/30">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-455">
                      <Activity size={16} />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-355">Health Score</h3>
                  </div>
                </div>
                <div className="flex flex-col items-center py-4">
                  <div className="relative w-28 h-28 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" className="stroke-slate-800" strokeWidth="8" fill="transparent" />
                      <circle cx="50" cy="50" r="40" className="stroke-indigo-500" strokeWidth="8" fill="transparent" strokeDasharray="251" strokeDashoffset={251 - (251 * 82) / 100} strokeLinecap="round" />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-2xl font-extrabold text-slate-100">82</span>
                      <span className="text-[8px] text-emerald-450 font-bold uppercase tracking-wider">Excellent</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // 10. Upcoming Bills
          if (widgetId === 'bills') {
            const combinedObligations = [
              ...subscriptions.map(s => ({
                name: s.name,
                cost: s.cost,
                date: new Date(s.renewalDate).toLocaleDateString('en-IN')
              })),
              ...loans.map(l => ({
                name: `${l.name} EMI`,
                cost: l.emiAmount,
                date: l.nextEmiDate ? new Date(l.nextEmiDate).toLocaleDateString('en-IN') : 'N/A'
              }))
            ].slice(0, 2);

            return (
              <div key={widgetId} className="card flex flex-col justify-between hover:border-primary-500/30 transition-all duration-300">
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-700/30">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-450">
                      <Clock size={16} />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-350">Upcoming Obligations</h3>
                  </div>
                </div>
                <div className="py-2.5 space-y-2">
                  {combinedObligations.length === 0 ? (
                    <p className="text-xs text-slate-500 font-bold">No upcoming obligations.</p>
                  ) : (
                    combinedObligations.map((ob, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-900/30 border border-slate-700/30 rounded-xl flex items-center justify-between text-xs hover:border-slate-700/50 transition-colors">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-300 truncate max-w-[140px]">{ob.name}</p>
                          <p className="text-[9px] text-slate-550">Due: {ob.date}</p>
                        </div>
                        <span className="font-black text-slate-100 flex-shrink-0">₹{ob.cost.toLocaleString('en-IN')}</span>
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
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-355">Recent Notifications</h3>
                  </div>
                </div>
                <div className="py-2 space-y-2">
                  {recentNotifications.map((n, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-900/30 border border-slate-700/30 rounded-xl text-[10px] hover:border-slate-700/50 transition-colors">
                      <p className="text-slate-300 leading-normal font-semibold">{n.message}</p>
                      <span className="text-slate-550 font-bold block text-right mt-0.5">{n.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          }


          // 13. AI Tip of the Day
          if (widgetId === 'tipOfTheDay') {
            return (
              <div key={widgetId} className="card flex flex-col justify-between hover:border-primary-500/30 transition-all duration-300">
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-700/30">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-455">
                      <Lightbulb size={16} />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-350">AI Tip of the Day</h3>
                  </div>
                </div>
                <div className="py-4 space-y-3">
                  <div className="p-3 bg-indigo-550/5 border border-indigo-500/10 rounded-xl flex gap-3">
                    <span className="text-xl flex-shrink-0">💡</span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-205">Cut unused streaming services</h4>
                      <p className="text-[10px] text-slate-450 mt-0.5 leading-normal">
                        Canceling Spotify could save you ₹1,428/year. Redirecting it to gold funds yields better CAGR.
                      </p>
                    </div>
                  </div>
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
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-205 cursor-pointer text-sm font-bold">✕</button>
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
