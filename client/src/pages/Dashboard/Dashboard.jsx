import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useExpense } from '../../context/ExpenseContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { PROGRESSION_LEVELS } from '../Achievements/achievementsData';
import toast from 'react-hot-toast';
import ConfirmDialog from '../../components/common/ConfirmDialog';

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
    deleteExpense, deleteIncome
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
      fetchSummary();
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

  const fetchDashboardExtraData = async () => {
    try {
      const [subsRes, loansRes, goalsRes, walletsRes] = await Promise.all([
        api.get('/subscriptions'),
        api.get('/loans'),
        api.get('/goals'),
        api.get('/wallets'),
      ]);
      setSubscriptions(subsRes.data.data || []);
      setLoans(loansRes.data.data || []);
      setGoals(goalsRes.data.data || []);
      setDashWallets(walletsRes.data.data || []);
    } catch {}
  };

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



  const fetchGamification = async () => {
    if (!user) return;
    try {
      const { data } = await api.get('/users/me');
      if (data.data) {
        setGameXp(data.data.xp || 3450);
        setGameCoins(data.data.coins || 640);
        setGameStreak(data.data.streak || 18);
        setUnlockedBadgesCount(data.data.achievements?.filter(a => a.unlocked).length || 13);
      }
    } catch {}
  };

  const fetchRecentNotifications = async () => {
    try {
      const { data } = await api.get('/notifications');
      if (data.data && data.data.length > 0) {
        setRecentNotifications(data.data.slice(0, 3).map(n => ({
          message: n.message,
          date: new Date(n.createdAt).toLocaleDateString('en-IN')
        })));
      }
    } catch {}
  };

  useEffect(() => {
    fetchSummary();
    fetchExpenses({ limit: 50 });
    fetchIncomes({ limit: 50 });
    fetchCategories();
    fetchBudgets();
    fetchGamification();
    fetchRecentNotifications();
    fetchDashboardExtraData();
  }, []);

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
      fetchSummary();
      fetchExpenses({ limit: 50 });
      fetchIncomes({ limit: 50 });
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
    <div className="space-y-6 animate-fade-in relative pb-12">
      {/* Top Welcome Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Hello, {user?.name?.split(' ')[0]}</h1>
          <p className="text-xs text-slate-400 mt-0.5">Here is your financial dashboard panel today.</p>
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
          className="btn-primary text-xs px-4 py-2"
        >
          + Add Transaction
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
          <div className="card space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-700/50 pb-3">
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
                <span className="text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-xl">
                  Expense: -₹{totalTodayExpense.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {todayTransactions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-400 text-xs">No transactions recorded today.</p>
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
                        <td className="font-medium text-slate-100">{item.title}</td>
                        <td>
                          {item.category ? (
                            <span className="flex items-center gap-1.5 text-xs">
                              <span>{item.category.icon}</span>
                              <span className="text-slate-300">{item.category.name}</span>
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
                            <span className="text-[10px] text-slate-500">
                              {new Date(item.date).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </td>
                        <td
                          className={`font-semibold ${
                            item.type === 'expense' ? 'text-red-400' : 'text-emerald-400'
                          }`}
                        >
                          {item.type === 'expense' ? '-' : '+'}₹
                          {item.amount.toLocaleString('en-IN')}
                        </td>
                        <td>
                          <button
                            onClick={() => handleDeleteTransaction(item._id, item.type)}
                            className="btn-danger text-xs px-2 py-1"
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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {widgets.map((widgetId) => {
          // 2. Weekly Spend
          if (widgetId === 'weeklySpend') {
            return (
              <div key={widgetId} className="card flex flex-col justify-between hover:border-indigo-500/20 transition-all">
                <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
                  <h3 className="text-xs font-bold text-slate-300">📊 Weekly Spending</h3>
                </div>
                <div className="py-4">
                  <p className="text-2xl font-extrabold text-slate-100">₹{weeklySpend.toLocaleString('en-IN')}</p>
                  <p className="text-[10px] text-slate-500 mt-1">Logs in last 7 days</p>
                </div>
              </div>
            );
          }

          // 3. Monthly Spend
          if (widgetId === 'monthlySpend') {
            return (
              <div key={widgetId} className="card flex flex-col justify-between hover:border-indigo-500/20 transition-all">
                <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
                  <h3 className="text-xs font-bold text-slate-300">💸 Monthly Spending</h3>
                </div>
                <div className="py-4">
                  <p className="text-2xl font-extrabold text-slate-100">₹{monthlySpend.toLocaleString('en-IN')}</p>
                  <p className="text-[10px] text-slate-500 mt-1">Total current monthly volume</p>
                </div>
              </div>
            );
          }

          // 4. Remaining Budget
          if (widgetId === 'remainingBudget') {
            return (
              <div key={widgetId} className="card flex flex-col justify-between hover:border-indigo-500/20 transition-all">
                <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
                  <h3 className="text-xs font-bold text-slate-300">🎯 Remaining Budget</h3>
                </div>
                <div className="py-4">
                  <p className="text-2xl font-extrabold text-indigo-400">₹{remainingBudget.toLocaleString('en-IN')}</p>
                  <p className="text-[10px] text-slate-500 mt-1">Cushion below limits</p>
                </div>
              </div>
            );
          }

          // Wallet Summary Widget
          if (widgetId === 'walletSummary') {
            const totalWalletBalance = dashWallets.reduce((s, w) => s + w.balance, 0);
            const primaryWlt = dashWallets.find(w => w.isPrimary) || dashWallets[0];
            return (
              <div key={widgetId} className="card flex flex-col justify-between hover:border-indigo-500/20 transition-all">
                <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
                  <h3 className="text-xs font-bold text-slate-300">👛 Wallet Summary</h3>
                  <Link to="/wallets" className="text-[10px] text-primary-400 hover:text-primary-300 font-bold">View All →</Link>
                </div>
                <div className="py-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Total Balance</span>
                    <span className="text-lg font-extrabold text-slate-100">₹{totalWalletBalance.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Primary</span>
                    <span className="text-xs font-bold text-slate-200">{primaryWlt?.icon} {primaryWlt?.name || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Wallets</span>
                    <span className="text-xs font-bold text-slate-200">{dashWallets.length}</span>
                  </div>
                </div>
              </div>
            );
          }

          // 6. Savings Goal Progress
          if (widgetId === 'savingsProgress') {
            const primaryGoal = goals && goals.length > 0 ? goals[0] : null;
            const pct = primaryGoal ? Math.round(((primaryGoal.currentSaved || 0) / (primaryGoal.targetAmount || 1)) * 100) : 0;
            return (
              <div key={widgetId} className="card flex flex-col justify-between hover:border-indigo-500/20 transition-all">
                <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
                  <h3 className="text-xs font-bold text-slate-300">🥅 Goal Progress</h3>
                </div>
                <div className="py-4 space-y-2">
                  {primaryGoal ? (
                    <>
                      <div className="flex justify-between text-xs font-bold">
                        <span>{primaryGoal.name}</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill bg-indigo-500" style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-slate-500">No active goals logged.</p>
                  )}
                </div>
              </div>
            );
          }

          // 7. Largest Expense
          if (widgetId === 'largestExpense') {
            return (
              <div key={widgetId} className="card flex flex-col justify-between hover:border-indigo-500/20 transition-all">
                <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
                  <h3 className="text-xs font-bold text-slate-300">💥 Largest Expense</h3>
                </div>
                <div className="py-4">
                  {largestExpenseObj ? (
                    <>
                      <p className="text-lg font-extrabold text-slate-200 truncate">{largestExpenseObj.title}</p>
                      <p className="text-xl font-black text-red-400 mt-1">-₹{largestExpenseObj.amount.toLocaleString('en-IN')}</p>
                    </>
                  ) : (
                    <p className="text-xs text-slate-500">No logs captured</p>
                  )}
                </div>
              </div>
            );
          }

          // 8. Most Used Category
          if (widgetId === 'mostUsedCategory') {
            return (
              <div key={widgetId} className="card flex flex-col justify-between hover:border-indigo-500/20 transition-all">
                <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
                  <h3 className="text-xs font-bold text-slate-300">🗂️ Top Category</h3>
                </div>
                <div className="py-4">
                  <p className="text-xl font-extrabold text-indigo-300 uppercase">{mostUsedCategory}</p>
                  <p className="text-[10px] text-slate-500 mt-1">Most frequent logging sector</p>
                </div>
              </div>
            );
          }

          // 9. Financial Health Score
          if (widgetId === 'health') {
            return (
              <div key={widgetId} className="card flex flex-col justify-between hover:border-indigo-500/20 transition-all">
                <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
                  <h3 className="text-xs font-bold text-slate-300">🏥 Health Score</h3>
                </div>
                <div className="flex flex-col items-center py-4">
                  <div className="relative w-28 h-28 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" stroke="#1e293b" strokeWidth="8" fill="transparent" />
                      <circle cx="50" cy="50" r="40" stroke="#6366f1" strokeWidth="8" fill="transparent" strokeDasharray="251" strokeDashoffset={251 - (251 * 82) / 100} />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-2xl font-extrabold text-slate-100">82</span>
                      <span className="text-[8px] text-emerald-400 font-bold uppercase">Excellent</span>
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
              <div key={widgetId} className="card flex flex-col justify-between hover:border-indigo-500/20 transition-all">
                <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
                  <h3 className="text-xs font-bold text-slate-300">⏳ Upcoming Obligations</h3>
                </div>
                <div className="py-2.5 space-y-2">
                  {combinedObligations.length === 0 ? (
                    <p className="text-xs text-slate-500">No upcoming obligations.</p>
                  ) : (
                    combinedObligations.map((ob, idx) => (
                      <div key={idx} className="p-2 bg-slate-900/30 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-slate-300 truncate max-w-[140px]">{ob.name}</p>
                          <p className="text-[9px] text-slate-500">Due: {ob.date}</p>
                        </div>
                        <span className="font-bold text-slate-200">₹{ob.cost.toLocaleString('en-IN')}</span>
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
              <div key={widgetId} className="card flex flex-col justify-between hover:border-indigo-500/20 transition-all">
                <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
                  <h3 className="text-xs font-bold text-slate-300">🔔 Recent Notifications</h3>
                </div>
                <div className="py-2 space-y-2">
                  {recentNotifications.map((n, idx) => (
                    <div key={idx} className="p-2 bg-slate-900/30 border border-slate-800 rounded-xl text-[10px]">
                      <p className="text-slate-300 leading-normal">{n.message}</p>
                      <span className="text-slate-500 font-bold block text-right mt-0.5">{n.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          }


          // 13. AI Tip of the Day
          if (widgetId === 'tipOfTheDay') {
            return (
              <div key={widgetId} className="card flex flex-col justify-between hover:border-indigo-500/20 transition-all">
                <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
                  <h3 className="text-xs font-bold text-slate-300">💡 AI Tip of the Day</h3>
                </div>
                <div className="py-4 space-y-3">
                  <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl flex gap-3">
                    <span className="text-xl">💡</span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">Cut unused streaming services</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">
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
          <div className="card max-w-md w-full p-6 my-8 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-700/50 pb-3">
              <h3 className="font-bold text-slate-100">Add Transaction</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>
            <form onSubmit={handleSaveTransaction} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="label">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input py-2"
                    value={txForm.amount}
                    onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="label">Type</label>
                  <select
                    className="select py-2"
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
                    className="select py-2"
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
                    className="input py-2"
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
                    className="input py-2"
                    value={txForm.date}
                    onChange={(e) => setTxForm({ ...txForm, date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="label">Time</label>
                  <input
                    type="time"
                    className="input py-2"
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
                    className="select py-2"
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
                    className="input py-2"
                    value={txForm.description}
                    onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
                  />
                </div>
              </div>



              <div className="flex justify-end gap-2 pt-4 border-t border-slate-700/50">
                <button type="button" onClick={() => setActiveModal(null)} className="btn-secondary py-2 px-4">Cancel</button>
                <button type="submit" className="btn-primary py-2 px-4" disabled={submitting}>
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
    </div>
  );
}
