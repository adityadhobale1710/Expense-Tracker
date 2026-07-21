import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useExpense } from '../../context/ExpenseContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { PROGRESSION_LEVELS } from '../Achievements/achievementsData';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import toast from 'react-hot-toast';

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

const NET_WORTH_HISTORY = [
  { name: "Jan", Wealth: 120000 },
  { name: "Feb", Wealth: 135000 },
  { name: "Mar", Wealth: 150000 },
  { name: "Apr", Wealth: 165000 },
  { name: "May", Wealth: 180000 },
  { name: "Jun", Wealth: 200000 }
];

export default function Dashboard() {
  const { summary, fetchSummary, expenses, fetchExpenses, incomes, fetchIncomes, categories, fetchCategories, budgets, fetchBudgets, addExpense, addIncome } = useExpense();
  const { user } = useAuth();

  // Gamification state
  const [gameXp, setGameXp] = useState(3450);
  const [gameCoins, setGameCoins] = useState(640);
  const [gameStreak, setGameStreak] = useState(18);
  const [unlockedBadgesCount, setUnlockedBadgesCount] = useState(13);

  // Widget Order state (12 widgets)
  const [widgetOrder, setWidgetOrder] = useState(() => {
    const defaultWidgets = [
      'todayOverview', 'todaySpend', 'todayIncome', 'weeklySpend', 'monthlySpend', 'remainingBudget',
      'savingsProgress', 'largestExpense', 'mostUsedCategory',
      'health', 'bills', 'notifications',
      'tipOfTheDay', 'cashFlow'
    ];
    const saved = localStorage.getItem('dashboard_widget_order');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const validSaved = parsed.filter(w => defaultWidgets.includes(w));
          const missing = defaultWidgets.filter(w => !validSaved.includes(w));
          return [...validSaved, ...missing];
        }
      } catch (e) {
        console.error('Error parsing dashboard_widget_order', e);
      }
    }
    return defaultWidgets;
  });

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

  // Drag and Drop state
  const [draggedWidget, setDraggedWidget] = useState(null);

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
  }, []);

  useEffect(() => {
    if (categories.length > 0 && !txForm.category) {
      const firstMatched = categories.find(c => c.type === txForm.type);
      if (firstMatched) {
        setTxForm(prev => ({ ...prev, category: firstMatched._id }));
      }
    }
  }, [txForm.type, categories]);

  const handleDragStart = (id) => setDraggedWidget(id);
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (targetId) => {
    if (!draggedWidget || draggedWidget === targetId) return;
    const newOrder = [...widgetOrder];
    const draggedIdx = newOrder.indexOf(draggedWidget);
    const targetIdx = newOrder.indexOf(targetId);
    newOrder.splice(draggedIdx, 1);
    newOrder.splice(targetIdx, 0, draggedWidget);
    setWidgetOrder(newOrder);
    localStorage.setItem('dashboard_widget_order', JSON.stringify(newOrder));
    setDraggedWidget(null);
  };



  const handleSaveTransaction = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        title: txForm.title,
        amount: Number(txForm.amount),
        category: txForm.category,
        date: new Date(`${txForm.date}T${txForm.time || '00:00'}`).toISOString(),
        paymentMethod: txForm.paymentMethod,
        description: txForm.description
      };

      if (txForm.type === 'expense') {
        await addExpense(payload);
      } else {
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
    } catch {
      toast.error('Failed to create transaction');
    }
  };

  // ─── WIDGETS DATA CALCULATIONS ───
  const todayDateString = new Date().toDateString();
  const todaySpend = expenses
    .filter(e => new Date(e.date).toDateString() === todayDateString)
    .reduce((sum, e) => sum + e.amount, 0);

  const todayIncome = incomes
    .filter(i => new Date(i.date).toDateString() === todayDateString)
    .reduce((sum, i) => sum + i.amount, 0);

  const todayNet = todayIncome - todaySpend;

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
          <p className="text-xs text-slate-400 mt-0.5">Here is your financial drag-and-drop dashboard panel today.</p>
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

      {/* Today Quick Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4 flex items-center justify-between border-emerald-500/20 bg-emerald-500/5">
          <div>
            <span className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider">Today's Income</span>
            <p className="text-xl font-extrabold text-emerald-300 mt-1">₹{todayIncome.toLocaleString('en-IN')}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-lg font-bold">
            💰
          </div>
        </div>

        <div className="card p-4 flex items-center justify-between border-rose-500/20 bg-rose-500/5">
          <div>
            <span className="text-[11px] font-medium text-rose-400 uppercase tracking-wider">Today's Expenses</span>
            <p className="text-xl font-extrabold text-rose-300 mt-1">₹{todaySpend.toLocaleString('en-IN')}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400 text-lg font-bold">
            💸
          </div>
        </div>

        <div className="card p-4 flex items-center justify-between border-indigo-500/20 bg-indigo-500/5">
          <div>
            <span className="text-[11px] font-medium text-indigo-400 uppercase tracking-wider">Today's Net Flow</span>
            <p className={`text-xl font-extrabold mt-1 ${todayNet >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {todayNet >= 0 ? '+' : ''}₹{todayNet.toLocaleString('en-IN')}
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 text-lg font-bold">
            ⚖️
          </div>
        </div>
      </div>

      {/* Rearrangeable Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {widgetOrder.map((widgetId) => {
          // Today Overview
          if (widgetId === 'todayOverview') {
            return (
              <div key={widgetId} draggable onDragStart={() => handleDragStart(widgetId)} onDragOver={handleDragOver} onDrop={() => handleDrop(widgetId)} className="card flex flex-col justify-between hover:border-indigo-500/30 transition-all cursor-move">
                <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
                  <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">📊 Today's Overview</h3>
                  <span className="text-[10px] text-slate-500">≡ Drag</span>
                </div>
                <div className="py-3 space-y-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium">Today's Income:</span>
                    <span className="font-extrabold text-emerald-400">+₹{todayIncome.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium">Today's Expense:</span>
                    <span className="font-extrabold text-rose-400">-₹{todaySpend.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-300">Net Flow:</span>
                    <span className={todayNet >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {todayNet >= 0 ? '+' : ''}₹{todayNet.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            );
          }

          // Today Spend
          if (widgetId === 'todaySpend') {
            return (
              <div key={widgetId} draggable onDragStart={() => handleDragStart(widgetId)} onDragOver={handleDragOver} onDrop={() => handleDrop(widgetId)} className="card flex flex-col justify-between hover:border-rose-500/30 transition-all cursor-move">
                <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
                  <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">💸 Today's Spending</h3>
                  <span className="text-[10px] text-slate-500">≡ Drag</span>
                </div>
                <div className="py-4">
                  <p className="text-2xl font-extrabold text-rose-400">₹{todaySpend.toLocaleString('en-IN')}</p>
                  <p className="text-[10px] text-slate-500 mt-1">Aggregated expenses logged today</p>
                </div>
              </div>
            );
          }

          // Today Income
          if (widgetId === 'todayIncome') {
            return (
              <div key={widgetId} draggable onDragStart={() => handleDragStart(widgetId)} onDragOver={handleDragOver} onDrop={() => handleDrop(widgetId)} className="card flex flex-col justify-between hover:border-emerald-500/30 transition-all cursor-move">
                <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
                  <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">💰 Today's Income</h3>
                  <span className="text-[10px] text-slate-500">≡ Drag</span>
                </div>
                <div className="py-4">
                  <p className="text-2xl font-extrabold text-emerald-400">₹{todayIncome.toLocaleString('en-IN')}</p>
                  <p className="text-[10px] text-slate-500 mt-1">Total earnings & credits today</p>
                </div>
              </div>
            );
          }

          // 2. Weekly Spend
          if (widgetId === 'weeklySpend') {
            return (
              <div key={widgetId} draggable onDragStart={() => handleDragStart(widgetId)} onDragOver={handleDragOver} onDrop={() => handleDrop(widgetId)} className="card flex flex-col justify-between hover:border-indigo-500/20 transition-all cursor-move">
                <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
                  <h3 className="text-xs font-bold text-slate-300">📊 Weekly Spending</h3>
                  <span className="text-[10px] text-slate-500">≡ Drag</span>
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
              <div key={widgetId} draggable onDragStart={() => handleDragStart(widgetId)} onDragOver={handleDragOver} onDrop={() => handleDrop(widgetId)} className="card flex flex-col justify-between hover:border-indigo-500/20 transition-all cursor-move">
                <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
                  <h3 className="text-xs font-bold text-slate-300">💸 Monthly Spending</h3>
                  <span className="text-[10px] text-slate-500">≡ Drag</span>
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
              <div key={widgetId} draggable onDragStart={() => handleDragStart(widgetId)} onDragOver={handleDragOver} onDrop={() => handleDrop(widgetId)} className="card flex flex-col justify-between hover:border-indigo-500/20 transition-all cursor-move">
                <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
                  <h3 className="text-xs font-bold text-slate-300">🎯 Remaining Budget</h3>
                  <span className="text-[10px] text-slate-500">≡ Drag</span>
                </div>
                <div className="py-4">
                  <p className="text-2xl font-extrabold text-indigo-400">₹{remainingBudget.toLocaleString('en-IN')}</p>
                  <p className="text-[10px] text-slate-500 mt-1">Cushion below limits</p>
                </div>
              </div>
            );
          }


          // 6. Savings Goal Progress
          if (widgetId === 'savingsProgress') {
            return (
              <div key={widgetId} draggable onDragStart={() => handleDragStart(widgetId)} onDragOver={handleDragOver} onDrop={() => handleDrop(widgetId)} className="card flex flex-col justify-between hover:border-indigo-500/20 transition-all cursor-move">
                <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
                  <h3 className="text-xs font-bold text-slate-300">🥅 Goal Progress</h3>
                  <span className="text-[10px] text-slate-500">≡ Drag</span>
                </div>
                <div className="py-4 space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span>Emergency Fund</span>
                    <span>72%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill bg-indigo-500" style={{ width: '72%' }} />
                  </div>
                </div>
              </div>
            );
          }

          // 7. Largest Expense
          if (widgetId === 'largestExpense') {
            return (
              <div key={widgetId} draggable onDragStart={() => handleDragStart(widgetId)} onDragOver={handleDragOver} onDrop={() => handleDrop(widgetId)} className="card flex flex-col justify-between hover:border-indigo-500/20 transition-all cursor-move">
                <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
                  <h3 className="text-xs font-bold text-slate-300">💥 Largest Expense</h3>
                  <span className="text-[10px] text-slate-500">≡ Drag</span>
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
              <div key={widgetId} draggable onDragStart={() => handleDragStart(widgetId)} onDragOver={handleDragOver} onDrop={() => handleDrop(widgetId)} className="card flex flex-col justify-between hover:border-indigo-500/20 transition-all cursor-move">
                <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
                  <h3 className="text-xs font-bold text-slate-300">🗂️ Top Category</h3>
                  <span className="text-[10px] text-slate-500">≡ Drag</span>
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
              <div key={widgetId} draggable onDragStart={() => handleDragStart(widgetId)} onDragOver={handleDragOver} onDrop={() => handleDrop(widgetId)} className="card flex flex-col justify-between hover:border-indigo-500/20 transition-all cursor-move">
                <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
                  <h3 className="text-xs font-bold text-slate-300">🏥 Health Score</h3>
                  <span className="text-[10px] text-slate-500">≡ Drag</span>
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
            return (
              <div key={widgetId} draggable onDragStart={() => handleDragStart(widgetId)} onDragOver={handleDragOver} onDrop={() => handleDrop(widgetId)} className="card flex flex-col justify-between hover:border-indigo-500/20 transition-all cursor-move">
                <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
                  <h3 className="text-xs font-bold text-slate-300">⏳ Upcoming Obligations</h3>
                  <span className="text-[10px] text-slate-500">≡ Drag</span>
                </div>
                <div className="py-2.5 space-y-2">
                  <div className="p-2 bg-slate-900/30 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-300">Apartment Rent</p>
                      <p className="text-[9px] text-slate-500">Due: Jul 5</p>
                    </div>
                    <span className="font-bold text-slate-200">₹20,000</span>
                  </div>
                  <div className="p-2 bg-slate-900/30 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-300">Netflix Premium</p>
                      <p className="text-[9px] text-slate-500">Due: Jul 8</p>
                    </div>
                    <span className="font-bold text-slate-200">₹649</span>
                  </div>
                </div>
              </div>
            );
          }

          // 11. Recent Notifications
          if (widgetId === 'notifications') {
            return (
              <div key={widgetId} draggable onDragStart={() => handleDragStart(widgetId)} onDragOver={handleDragOver} onDrop={() => handleDrop(widgetId)} className="card flex flex-col justify-between hover:border-indigo-500/20 transition-all cursor-move">
                <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
                  <h3 className="text-xs font-bold text-slate-300">🔔 Recent Notifications</h3>
                  <span className="text-[10px] text-slate-500">≡ Drag</span>
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
              <div key={widgetId} draggable onDragStart={() => handleDragStart(widgetId)} onDragOver={handleDragOver} onDrop={() => handleDrop(widgetId)} className="card flex flex-col justify-between hover:border-indigo-500/20 transition-all cursor-move">
                <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
                  <h3 className="text-xs font-bold text-slate-300">💡 AI Tip of the Day</h3>
                  <span className="text-[10px] text-slate-500">≡ Drag</span>
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

          // 14. Monthly Cash Flow
          if (widgetId === 'cashFlow') {
            return (
              <div key={widgetId} draggable onDragStart={() => handleDragStart(widgetId)} onDragOver={handleDragOver} onDrop={() => handleDrop(widgetId)} className="card flex flex-col justify-between hover:border-indigo-500/20 transition-all cursor-move md:col-span-2 xl:col-span-3">
                <div className="flex justify-between items-center pb-2 border-b border-slate-700/50 mb-3">
                  <h3 className="text-xs font-bold text-slate-300">📈 Monthly Cash Flow Projections</h3>
                  <span className="text-[10px] text-slate-500">≡ Drag</span>
                </div>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={NET_WORTH_HISTORY} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                      <XAxis dataKey="name" tick={{ fill: 'var(--chart-text)', fontSize: 10 }} />
                      <YAxis tick={{ fill: 'var(--chart-text)', fontSize: 10 }} />
                      <Tooltip contentStyle={{ background: 'var(--chart-tooltip-bg)', border: '1px solid var(--chart-tooltip-border)', color: 'var(--chart-tooltip-text)', borderRadius: '12px' }} />
                      <Area type="monotone" dataKey="Wealth" stroke="#10b981" fillOpacity={1} fill="url(#colorCash)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
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
                        <option key={c._id} value={c._id}>
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
                <button type="submit" className="btn-primary py-2 px-4">Save Log</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
