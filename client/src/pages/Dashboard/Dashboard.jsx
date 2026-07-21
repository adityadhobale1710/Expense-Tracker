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
      'todaySpend', 'weeklySpend', 'monthlySpend', 'remainingBudget',
      'savingsProgress', 'largestExpense', 'mostUsedCategory',
      'health', 'bills', 'notifications',
      'tipOfTheDay', 'cashFlow'
    ];
    const saved = localStorage.getItem('dashboard_widget_order');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(w => defaultWidgets.includes(w));
        }
      } catch (e) {
        console.error('Error parsing dashboard_widget_order', e);
      }
    }
    return defaultWidgets;
  });

  // Modals state
  const [activeModal, setActiveModal] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [qrScanning, setQrScanning] = useState(false);
  const [qrMerchant, setQrMerchant] = useState('');

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
    fetchExpenses({ limit: 10 });
    fetchIncomes({ limit: 10 });
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

  // OCR Pre-fill simulation
  const simulateOCR = (brand) => {
    setOcrLoading(true);
    setTimeout(() => {
      setOcrLoading(false);
      setActiveModal(null);
      let prefill = {};
      if (brand === 'starbucks') {
        prefill = { title: 'Starbucks Coffee', amount: '450', type: 'expense', description: 'Caramel Macchiato' };
      } else if (brand === 'uber') {
        prefill = { title: 'Uber Trip', amount: '1200', type: 'expense', description: 'commute' };
      } else if (brand === 'walmart') {
        prefill = { title: 'Grocery Shopping', amount: '5400', type: 'expense', description: 'Walmart groceries' };
      }

      const categoryMatch = categories.find(c => c.type === 'expense' && (c.name.toLowerCase().includes('food') || c.name.toLowerCase().includes('transport') || c.name.toLowerCase().includes('shop')));
      setTxForm(prev => ({
        ...prev,
        ...prefill,
        category: categoryMatch ? categoryMatch._id : prev.category
      }));
      setActiveModal('addTx');
      toast.success('Mock receipt text extracted successfully!');
    }, 1200);
  };



  const simulateQR = () => {
    setQrScanning(true);
    setTimeout(() => {
      setQrScanning(false);
      setQrMerchant('Zara Store Merchant • ₹3,800.00');
      setTimeout(() => {
        const categoryMatch = categories.find(c => c.type === 'expense' && c.name.toLowerCase().includes('shop'));
        setTxForm(prev => ({
          ...prev,
          title: 'Zara Purchase',
          amount: '3800',
          type: 'expense',
          description: 'UPI QR Payment Scan',
          category: categoryMatch ? categoryMatch._id : prev.category
        }));
        setActiveModal('addTx');
        toast.success('QR merchant metadata captured!');
      }, 800);
    }, 1200);
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
      fetchExpenses({ limit: 10 });
      fetchIncomes({ limit: 10 });
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

      {/* Rearrangeable Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {widgetOrder.map((widgetId) => {
          // 1. Today Spend
          if (widgetId === 'todaySpend') {
            return (
              <div key={widgetId} draggable onDragStart={() => handleDragStart(widgetId)} onDragOver={handleDragOver} onDrop={() => handleDrop(widgetId)} className="card flex flex-col justify-between hover:border-indigo-500/20 transition-all cursor-move">
                <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
                  <h3 className="text-xs font-bold text-slate-300">📅 Today's Spending</h3>
                  <span className="text-[10px] text-slate-500">≡ Drag</span>
                </div>
                <div className="py-4">
                  <p className="text-2xl font-extrabold text-slate-100">₹{todaySpend.toLocaleString('en-IN')}</p>
                  <p className="text-[10px] text-slate-500 mt-1">Aggregated logs for today</p>
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

      {/* Floating Utilities (QR Code) */}
      <div className="fixed bottom-6 left-6 flex flex-col gap-2 z-40">
        <button
          onClick={() => setActiveModal('qr')}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
          title="Scan QR Merchant"
        >
          📱
        </button>
      </div>

      {/* OCR Receipt Scanner Floater */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setActiveModal('ocr')}
          className="btn-primary flex items-center gap-2 h-12 px-5 rounded-full shadow-lg cursor-pointer"
        >
          📷 Scan Receipt
        </button>
      </div>

      {/* ─── OCR MODAL ─── */}
      {activeModal === 'ocr' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="card max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-700/50 pb-3">
              <h3 className="font-bold text-slate-100 flex items-center gap-2">📷 Receipt OCR Scanner</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>
            <p className="text-xs text-slate-400 leading-normal">
              Select one of the mock receipt objects below to simulate automatic transaction scanning and parsing.
            </p>
            <div className="flex flex-col gap-2">
              <button onClick={() => simulateOCR('starbucks')} className="p-3 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-left text-xs font-semibold rounded-xl flex items-center justify-between cursor-pointer">
                <span>☕ Starbucks Coffee receipt</span>
                <span className="text-slate-400">₹450.00</span>
              </button>
              <button onClick={() => simulateOCR('uber')} className="p-3 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-left text-xs font-semibold rounded-xl flex items-center justify-between cursor-pointer">
                <span>🚗 Uber Ride invoice</span>
                <span className="text-slate-400">₹1,200.00</span>
              </button>
              <button onClick={() => simulateOCR('walmart')} className="p-3 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-left text-xs font-semibold rounded-xl flex items-center justify-between cursor-pointer">
                <span>🛍️ Walmart grocery bill</span>
                <span className="text-slate-400">₹5,400.00</span>
              </button>
            </div>
            {ocrLoading && (
              <div className="flex flex-col items-center justify-center py-4 space-y-2 border-t border-slate-800">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-medium text-slate-300">AI parsing receipt structures...</span>
              </div>
            )}
          </div>
        </div>
      )}



      {/* ─── QR SCANNER MODAL ─── */}
      {activeModal === 'qr' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="card max-w-sm w-full p-6 text-center space-y-4">
            <div className="flex justify-between items-center border-b border-slate-700/50 pb-3 text-left">
              <h3 className="font-bold text-slate-100">📱 UPI QR Payment Scanner</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>
            <p className="text-xs text-slate-400">Simulates capturing merchant code detail structures.</p>
            <div className="relative w-48 h-48 mx-auto border-4 border-indigo-500 rounded-2xl overflow-hidden bg-black flex items-center justify-center">
              <div className="absolute top-0 w-full h-1 bg-indigo-500 shadow-md shadow-indigo-500/50 animate-bounce" style={{ animationDuration: '3s' }} />
              <span className="text-8xl opacity-15 text-white">🔳</span>
              {qrScanning && (
                <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center space-y-2">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] text-slate-300">Scanning metadata...</span>
                </div>
              )}
              {qrMerchant && (
                <div className="absolute inset-0 bg-emerald-600 flex flex-col items-center justify-center text-white p-3">
                  <span className="text-3xl">✅</span>
                  <p className="text-xs font-bold mt-2">QR Scanned</p>
                  <p className="text-[9px] opacity-90 mt-1 break-all">{qrMerchant}</p>
                </div>
              )}
            </div>
            <button onClick={simulateQR} disabled={qrScanning || qrMerchant} className="btn-primary text-xs w-full py-2.5 cursor-pointer">
              Simulate QR Scan
            </button>
          </div>
        </div>
      )}

      {/* ─── ADD TRANSACTION MODAL ─── */}
      {activeModal === 'addTx' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in">
          <div className="card max-w-md w-full p-6 my-8 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-700/50 pb-3">
              <h3 className="font-bold text-slate-100">Add Scanned Transaction</h3>
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
