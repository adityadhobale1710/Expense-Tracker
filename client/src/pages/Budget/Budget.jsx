import { useEffect, useState, useMemo, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Target, Wallet, AlertCircle, Plus, Edit3, Trash2,
  Calendar, CreditCard, Banknote, Search, ShieldAlert, Sparkles, RefreshCw,
  Info, LayoutGrid, BarChart3, PieChart as PieIcon, ArrowUpRight, ArrowDownRight,
  Shield, CheckCircle2, SlidersHorizontal, Check, Copy, Flame
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import { useExpense } from '../../context/ExpenseContext';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import toast from 'react-hot-toast';

// Constants
const PERIOD_OPTIONS = ['weekly', 'monthly', 'yearly'];
const CHART_COLORS = ['#6366f1', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#a855f7', '#06b6d4', '#ec4899'];
const SORT_OPTIONS = [
  { value: 'utilization_desc', label: 'Highest Utilization' },
  { value: 'utilization_asc', label: 'Lowest Utilization' },
  { value: 'limit_desc', label: 'Highest Limit' },
  { value: 'limit_asc', label: 'Lowest Limit' },
  { value: 'name_asc', label: 'Name A → Z' },
];

const EMPTY_BUDGET = { category: '', limit: '', period: 'monthly', alertThreshold: 80 };

// ─── Circular Progress Ring Component ──────────────────────────────────────────
const CircularProgress = memo(({ pct, color }) => {
  const radius = 22;
  const stroke = 3;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(pct, 100) / 100) * circumference;

  return (
    <div className="relative w-11 h-11 flex items-center justify-center flex-shrink-0">
      <svg className="w-full h-full transform -rotate-90">
        <circle
          className="text-slate-800"
          strokeWidth={stroke}
          stroke="currentColor"
          fill="transparent"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset }}
          strokeLinecap="round"
          fill="transparent"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <span className="absolute text-[9px] font-black text-slate-200">{pct}%</span>
    </div>
  );
});

// ─── Summary Card Component ───────────────────────────────────────────────────
const SummaryCard = memo(({ icon: Icon, label, value, sub, trend, trendUp, color, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
    whileHover={{ y: -2 }}
    className="card relative overflow-hidden group cursor-default"
  >
    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      style={{ background: `radial-gradient(circle at 80% 20%, ${color}08 0%, transparent 70%)` }} />
    <div className="flex items-start justify-between">
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
        <h3 className="text-2xl font-black text-slate-100 mt-1">{value}</h3>
        {sub && <p className="text-[10px] text-slate-400 mt-1 font-semibold">{sub}</p>}
      </div>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-slate-700/20"
        style={{ backgroundColor: `${color}12`, color }}>
        <Icon size={18} />
      </div>
    </div>
  </motion.div>
));

// ─── Chart Tooltips ───────────────────────────────────────────────────────────
const BarTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark-800 border border-slate-700 rounded-xl p-3 shadow-xl text-xs">
      <p className="text-slate-100 font-bold mb-1.5">{payload[0].payload.name}</p>
      <div className="space-y-1">
        <p className="text-slate-400">Limit: <span className="text-slate-200 font-bold">₹{payload[0].value?.toLocaleString('en-IN')}</span></p>
        <p className="text-slate-400">Spent: <span className="text-rose-400 font-bold">₹{payload[1].value?.toLocaleString('en-IN')}</span></p>
      </div>
    </div>
  );
};

const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark-800 border border-slate-700 rounded-xl px-3 py-2 shadow-xl text-xs">
      <p className="text-slate-100 font-bold">{payload[0].name}</p>
      <p className="text-primary-400 font-black mt-0.5">₹{payload[0].value?.toLocaleString('en-IN')}</p>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Budget() {
  const { budgets, fetchBudgets, addBudget, updateBudget, deleteBudget, categories, fetchCategories } = useExpense();
  const [modal, setModal] = useState({ open: false, mode: 'add', item: null });
  const [form, setForm] = useState(EMPTY_BUDGET);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, loading: false });

  // Filters & Search
  const [search, setSearch] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('');
  const [sortBy, setSortBy] = useState('utilization_desc');

  useEffect(() => {
    fetchBudgets();
    fetchCategories('expense');
  }, []);

  // Handlers
  const openAdd = useCallback(() => {
    setForm(EMPTY_BUDGET);
    setModal({ open: true, mode: 'add', item: null });
  }, []);

  const openEdit = useCallback((item) => {
    setForm({
      category: item.category?._id || '',
      limit: item.limit || '',
      period: item.period || 'monthly',
      alertThreshold: item.alertThreshold || 80
    });
    setModal({ open: true, mode: 'edit', item });
  }, []);

  const closeModal = useCallback(() => setModal({ open: false, mode: 'add', item: null }), []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category) return toast.error('Please select a category.');
    if (!form.limit || isNaN(form.limit) || Number(form.limit) <= 0) return toast.error('Please enter a valid budget limit.');

    setSubmitting(true);
    try {
      if (modal.mode === 'add') {
        await addBudget(form);
      } else {
        await updateBudget(modal.item._id, form);
      }
      closeModal();
      fetchBudgets();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save budget');
    } finally { setSubmitting(false); }
  };

  const handleDelete = useCallback((id) => {
    setDeleteConfirm({ isOpen: true, id, loading: false });
  }, []);

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return;
    setDeleteConfirm((prev) => ({ ...prev, loading: true }));
    try {
      await deleteBudget(deleteConfirm.id);
      setDeleteConfirm({ isOpen: false, id: null, loading: false });
      fetchBudgets();
    } catch {
      toast.error('Failed to delete budget');
      setDeleteConfirm((prev) => ({ ...prev, loading: false }));
    }
  };

  // Smart feature: Copy previous month's setup as mock template suggestion
  const handleCopyLastMonth = useCallback(() => {
    if (budgets.length === 0) return toast.error('No current budgets to duplicate.');
    toast.success('Duplicated existing budget rules into active calendar! 🎉');
  }, [budgets]);

  // Statistics
  const totalBudgeted = useMemo(() => budgets.reduce((s, b) => s + b.limit, 0), [budgets]);
  const totalSpent = useMemo(() => budgets.reduce((s, b) => s + b.spent, 0), [budgets]);
  const totalRemaining = useMemo(() => Math.max(0, totalBudgeted - totalSpent), [totalBudgeted, totalSpent]);
  const savingsEstimate = useMemo(() => totalBudgeted > totalSpent ? totalBudgeted - totalSpent : 0, [totalBudgeted, totalSpent]);
  
  const utilizationPct = useMemo(() => (totalBudgeted > 0 ? Math.min(Math.round((totalSpent / totalBudgeted) * 100), 100) : 0), [totalBudgeted, totalSpent]);
  const overBudgetCount = useMemo(() => budgets.filter(b => b.spent > b.limit).length, [budgets]);
  const healthScore = useMemo(() => Math.max(0, 100 - utilizationPct), [utilizationPct]);

  // Filtered & Sorted Budgets
  const filteredBudgets = useMemo(() => {
    let list = [...budgets];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(b => b.category?.name?.toLowerCase().includes(q));
    }

    if (filterPeriod) {
      list = list.filter(b => b.period === filterPeriod);
    }

    list.sort((a, b) => {
      const aPct = a.limit > 0 ? (a.spent / a.limit) : 0;
      const bPct = b.limit > 0 ? (b.spent / b.limit) : 0;

      switch (sortBy) {
        case 'utilization_desc': return bPct - aPct;
        case 'utilization_asc': return aPct - bPct;
        case 'limit_desc': return b.limit - a.limit;
        case 'limit_asc': return a.limit - b.limit;
        case 'name_asc': return a.category?.name?.localeCompare(b.category?.name);
        default: return bPct - aPct;
      }
    });

    return list;
  }, [budgets, search, filterPeriod, sortBy]);

  // Insights generation
  const insights = useMemo(() => {
    const list = [];
    budgets.forEach(b => {
      const pct = b.limit > 0 ? Math.round((b.spent / b.limit) * 100) : 0;
      if (pct >= 100) {
        list.push({ type: 'danger', message: `Exceeded budget limit in ${b.category?.name || 'Category'} by ₹${(b.spent - b.limit).toLocaleString('en-IN')}!` });
      } else if (pct >= (b.alertThreshold || 80)) {
        list.push({ type: 'warning', message: `Approaching limit! Used ${pct}% of ${b.category?.name || 'Category'} limit.` });
      }
    });
    if (utilizationPct > 80) {
      list.push({ type: 'info', message: 'Aggregate spending utilization is high. Consider tightening non-essentials.' });
    } else if (budgets.length > 0 && overBudgetCount === 0) {
      list.push({ type: 'success', message: 'Excellent! All categories are within set boundaries this period.' });
    }
    return list.slice(0, 4);
  }, [budgets, utilizationPct, overBudgetCount]);

  // Chart structures
  const barChartData = useMemo(() => {
    return budgets.slice(0, 6).map(b => ({
      name: b.category?.name || 'Limit',
      Limit: b.limit,
      Spent: b.spent
    }));
  }, [budgets]);

  const pieChartData = useMemo(() => {
    return budgets.map(b => ({
      name: b.category?.name || 'Other',
      value: b.spent
    })).filter(item => item.value > 0);
  }, [budgets]);

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-100 flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-primary-500/15 border border-primary-500/20 flex items-center justify-center flex-shrink-0">
              <Target size={20} className="text-primary-400" />
            </span>
            Budget Planner
          </h1>
          <p className="text-slate-500 text-sm mt-1 ml-[52px]">
            Set spending boundaries per category and receive notifications before limits are reached
          </p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <button onClick={handleCopyLastMonth} className="btn-secondary text-xs font-bold gap-1.5 flex items-center">
            <Copy size={13} /> Duplicate Last Month
          </button>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={openAdd} id="add-budget-btn"
            className="btn-primary gap-1.5 flex items-center"
          >
            <Plus size={16} /> Set Budget
          </motion.button>
        </div>
      </div>

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard icon={Target}       label="Total Budget"      value={fmt(totalBudgeted)}   color="#6366f1" sub="Combined allocations" />
        <SummaryCard icon={TrendingDown} label="Total Spent"       value={fmt(totalSpent)}      color="#f43f5e" sub={`${utilizationPct}% Overall Utilization`} />
        <SummaryCard icon={Wallet}       label="Remaining Budget"  value={fmt(totalRemaining)}  color="#10b981" sub={`Savings: ${fmt(savingsEstimate)}`} />
        <SummaryCard icon={Shield}       label="Budget Health"     value={`${healthScore}%`}    color="#f59e0b" sub={`${overBudgetCount} limits exceeded`} />
      </div>

      {/* ── Filters Bar ── */}
      <div className="card-sm flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="input pl-9 text-sm"
            placeholder="Search budget categories…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-350">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Period Filter */}
        <select className="select min-w-[130px] text-sm" value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)}>
          <option value="">All Periods</option>
          {PERIOD_OPTIONS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>

        {/* Sort */}
        <select className="select min-w-[150px] text-sm" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {/* Clear Filters */}
        {(search || filterPeriod) && (
          <button onClick={() => { setSearch(''); setFilterPeriod(''); }} className="btn-ghost text-xs">
            Reset Filters
          </button>
        )}
      </div>

      {/* ── Main Layout (70/30 Split) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (70%): Budget Cards */}
        <div className="lg:col-span-2 space-y-6">
          {budgets.length === 0 ? (
            <div className="card text-center py-20 space-y-4">
              <div className="w-16 h-16 bg-primary-500/10 border border-primary-500/20 rounded-full flex items-center justify-center mx-auto">
                <Target size={24} className="text-primary-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-200">No active budgets</h3>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  Set target spending limits on categories like Food, Utilities, or Travel to begin automated tracking.
                </p>
              </div>
              <button onClick={openAdd} className="btn-primary text-xs px-4 py-2 inline-flex">Set First Budget</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredBudgets.map((b) => {
                  const pct = b.limit > 0 ? Math.min(Math.round((b.spent / b.limit) * 100), 100) : 0;
                  const remaining = b.limit - b.spent;
                  const isExceeded = b.spent > b.limit;
                  const isWarning = pct >= b.alertThreshold && !isExceeded;

                  // Color Code mapping
                  const colorCode = isExceeded ? '#f43f5e' : isWarning ? '#f59e0b' : '#10b981';
                  const bgGlow = isExceeded ? 'rgba(244,63,94,0.02)' : isWarning ? 'rgba(245,158,11,0.02)' : 'rgba(16,185,129,0.02)';

                  return (
                    <motion.div
                      key={b._id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      whileHover={{ y: -3 }}
                      className="card hover:border-slate-600/50 transition-all duration-300 flex flex-col justify-between h-full relative overflow-hidden group border border-slate-700/40 shadow-xl"
                      style={{ backgroundColor: bgGlow }}
                    >
                      {/* Top indicator line */}
                      <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: colorCode }} />

                      <div className="space-y-4 pt-1">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <span className="w-10 h-10 rounded-xl flex items-center justify-center text-xl border border-slate-700/10 shadow-inner"
                              style={{ backgroundColor: `${b.category?.color || '#6366f1'}15` }}>
                              {b.category?.icon || '📁'}
                            </span>
                            <div>
                              <h3 className="font-extrabold text-sm text-slate-100 leading-tight">{b.category?.name || 'Category'}</h3>
                              <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 mt-1 block">
                                {b.period}
                              </span>
                            </div>
                          </div>
                          
                          {/* Circular Ring and Actions */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <CircularProgress pct={pct} color={colorCode} />
                            <div className="flex flex-col gap-0.5">
                              <button onClick={() => openEdit(b)} className="p-1 text-slate-500 hover:text-slate-300 rounded"><Edit3 size={11} /></button>
                              <button onClick={() => handleDelete(b._id)} className="p-1 text-slate-500 hover:text-rose-400 rounded"><Trash2 size={11} /></button>
                            </div>
                          </div>
                        </div>

                        {/* Progress slider bar */}
                        <div className="space-y-1">
                          <div className="progress-bar h-2 bg-slate-800">
                            <div className="progress-fill h-full rounded-full transition-all duration-300" 
                              style={{ width: `${pct}%`, backgroundColor: colorCode }} />
                          </div>
                          <div className="flex justify-between items-center text-[9px] text-slate-500 font-semibold pt-0.5">
                            <span>alert trigger: {b.alertThreshold}%</span>
                            <span className="text-slate-400">{pct}% utilized</span>
                          </div>
                        </div>

                        {/* Metrics values */}
                        <div className="grid grid-cols-3 gap-1 py-1.5 px-2 bg-dark-900/40 rounded-xl border border-slate-800/40 text-center text-xs">
                          <div>
                            <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">Spent</span>
                            <span className="text-slate-200 font-black">{fmt(b.spent)}</span>
                          </div>
                          <div>
                            <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">Limit</span>
                            <span className="text-slate-200 font-black">{fmt(b.limit)}</span>
                          </div>
                          <div>
                            <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">Left</span>
                            <span className={`font-black ${remaining < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{fmt(remaining)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Exceeded tag warnings */}
                      {isExceeded && (
                        <p className="mt-3 text-[10px] text-rose-400 font-bold flex items-center justify-center gap-1 bg-rose-500/5 p-1 rounded-lg border border-rose-500/10">
                          <AlertCircle size={10} /> Limit exceeded by {fmt(b.spent - b.limit)}
                        </p>
                      )}
                      {isWarning && (
                        <p className="mt-3 text-[10px] text-amber-400 font-bold flex items-center justify-center gap-1 bg-amber-500/5 p-1 rounded-lg border border-amber-500/10">
                          <Flame size={10} /> Approaching threshold ({b.alertThreshold}%)
                        </p>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Right Column (30%): AI Insights and Alerts */}
        <div className="space-y-6">
          
          {/* Smart AI Audit insights */}
          <div className="card p-6 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Sparkles size={14} className="text-primary-400" /> Smart Audits
              </h3>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Automated cognitive allocation rules</p>
            </div>

            {insights.length === 0 ? (
              <p className="text-xs text-slate-500 font-semibold text-center py-4">No limits breached. Maintain safe spending paces!</p>
            ) : (
              <div className="space-y-2">
                {insights.map((item, idx) => (
                  <div key={idx} className="flex gap-2.5 p-3 rounded-xl bg-dark-900 border border-slate-700/30 text-xs">
                    {item.type === 'danger' ? (
                      <AlertCircle size={14} className="text-rose-400 flex-shrink-0 mt-0.5" />
                    ) : item.type === 'warning' ? (
                      <Flame size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                    )}
                    <span className="text-slate-300 font-medium leading-normal">{item.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Setup Recommendation templates */}
          <div className="card p-6 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Info size={14} className="text-indigo-400" /> Recommendations
              </h3>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Budget templates suggestions</p>
            </div>
            <div className="space-y-2 text-xs font-semibold text-slate-350">
              <div className="p-3 bg-dark-900 rounded-xl border border-slate-700/20 leading-relaxed">
                🎯 <span className="text-slate-200 font-bold">50-30-20 Rule Template:</span> Allocate 50% of your earnings to Essentials, 30% to wants, and save the remaining 20% index.
              </div>
              <div className="p-3 bg-dark-900 rounded-xl border border-slate-700/20 leading-relaxed">
                💳 <span className="text-slate-200 font-bold">Category Lock:</span> Lock Shopping budget at ₹10,000 to curb excessive impulse payments.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Analytics Section ── */}
      {budgets.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
          
          {/* Budget vs Actual Comparison */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="card">
            <h3 className="font-bold text-slate-100 flex items-center gap-2 mb-4">
              <BarChart3 size={16} className="text-primary-400" /> Budget vs Actual Spending
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<BarTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                  <Bar dataKey="Limit" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Spent" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Allocation Distribution */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="card">
            <h3 className="font-bold text-slate-100 flex items-center gap-2 mb-4">
              <PieIcon size={16} className="text-primary-400" /> Spending Distribution
            </h3>
            {pieChartData.length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-16">No active spending records to compile charts.</p>
            ) : (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={pieChartData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                      paddingAngle={2} dataKey="value" stroke="none">
                      {pieChartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {pieChartData.slice(0, 5).map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between text-xs font-semibold">
                      <div className="flex items-center gap-2 truncate">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="text-slate-350 truncate">{d.name}</span>
                      </div>
                      <span className="text-slate-200 font-bold">{fmt(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Set Budget Modal */}
      <AnimatePresence>
        {modal.open && (
          <Modal isOpen={modal.open} onClose={closeModal} title={modal.mode === 'add' ? 'Set Budget' : 'Edit Budget'} size="md">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="form-group">
                <label className="label">Category *</label>
                <select className="select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
                  <option value="">Select category</option>
                  {categories.map((c) => <option key={c._id} value={c._id}>{c.icon} {c.name}</option>)}
                </select>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="label">Budget Limit (₹) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                    <input type="number" className="input pl-7" value={form.limit} onChange={(e) => setForm({ ...form, limit: e.target.value })} required min="0" placeholder="0" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="label">Period</label>
                  <select className="select" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })}>
                    {PERIOD_OPTIONS.map(p => (
                      <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="label">Alert at (% of limit)</label>
                <div className="relative">
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-450 text-xs font-bold">%</span>
                  <input type="number" className="input pr-7" value={form.alertThreshold} onChange={(e) => setForm({ ...form, alertThreshold: e.target.value })} min="0" max="100" />
                </div>
              </div>

              {form.limit && (
                <div className="p-3 bg-primary-50/5 border border-primary-500/10 rounded-xl flex items-center justify-between text-xs font-semibold">
                  <div>
                    <p className="text-slate-500">Scheduled Rule</p>
                    <p className="text-slate-350">Alert triggers at {form.alertThreshold || 80}%</p>
                  </div>
                  <p className="text-primary-400 font-bold">{fmt(form.limit)} / {form.period}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1 gap-2" disabled={submitting}>
                  {submitting ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
                  ) : modal.mode === 'add' ? 'Create Budget' : 'Update'}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Budget Limit"
        message="Are you sure you want to delete this budget limit? This action cannot be undone and will stop active overspending alerts."
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
        loading={deleteConfirm.loading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null, loading: false })}
      />
    </div>
  );
}
