import { useEffect, useState, useMemo, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingDown, TrendingUp, Search, Filter, X, Plus, Edit3, Trash2,
  ChevronLeft, ChevronRight, ArrowUpDown, RotateCcw, Calendar,
  CreditCard, Banknote, Wallet, Tag, SlidersHorizontal,
  BarChart3, PieChart as PieChartIcon, AlertCircle, Download,
  Receipt, Copy, CheckCircle2, Clock, Zap,
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { useExpense } from '../../context/ExpenseContext';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import toast from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────────────────────
const PAYMENT_METHODS = ['cash', 'card', 'upi', 'bank', 'other'];
const PM_LABELS = { cash: 'Cash', card: 'Card', upi: 'UPI', bank: 'Bank', other: 'Other' };
const PM_ICONS = { cash: Banknote, card: CreditCard, upi: Zap, bank: Wallet, other: Receipt };
const CHART_COLORS = ['#6366f1', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#a855f7', '#06b6d4', '#ec4899'];
const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Newest First' },
  { value: 'date_asc', label: 'Oldest First' },
  { value: 'amount_desc', label: 'Highest Amount' },
  { value: 'amount_asc', label: 'Lowest Amount' },
  { value: 'title_asc', label: 'A → Z' },
];
const PAGE_SIZE = 15;

const getLocalTodayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const getLocalTimeString = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};
const EMPTY_FORM = {
  title: '', amount: '', category: '', date: getLocalTodayString(),
  time: getLocalTimeString(), paymentMethod: 'upi', description: '', tags: '',
};

// ─── Mini Sparkline ───────────────────────────────────────────────────────────
const Sparkline = memo(({ data, color }) => (
  <ResponsiveContainer width="100%" height={36}>
    <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
      <defs>
        <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={color} stopOpacity={0.3} />
          <stop offset="95%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5}
        fill={`url(#spark-${color})`} dot={false} />
    </AreaChart>
  </ResponsiveContainer>
));

// ─── Summary Card ─────────────────────────────────────────────────────────────
const SummaryCard = memo(({ icon: Icon, label, value, sub, trend, trendUp, color, sparkData, loading, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
    whileHover={{ y: -2, transition: { duration: 0.2 } }}
    className="card relative overflow-hidden group cursor-default"
  >
    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      style={{ background: `radial-gradient(circle at 80% 20%, ${color}08 0%, transparent 70%)` }} />
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}18`, border: `1px solid ${color}25` }}>
          <Icon size={18} style={{ color }} />
        </div>
        <div>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
          {loading ? (
            <div className="h-6 w-24 bg-slate-700/60 rounded animate-pulse mt-1" />
          ) : (
            <p className="text-xl font-black text-slate-100 mt-0.5 leading-none">{value}</p>
          )}
        </div>
      </div>
      {trend !== undefined && !loading && (
        <div className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
          trendUp ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
        }`}>
          {trendUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    {sparkData && !loading && <Sparkline data={sparkData} color={color} />}
    {sub && !loading && <p className="text-[11px] text-slate-500 mt-1">{sub}</p>}
  </motion.div>
));

// ─── Payment Method Badge ─────────────────────────────────────────────────────
const PMBadge = memo(({ method }) => {
  const PMIcon = PM_ICONS[method] || Receipt;
  const colors = {
    cash: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    card: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    upi: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    bank: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    other: 'bg-slate-700/50 text-slate-400 border-slate-600/30',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${colors[method] || colors.other}`}>
      <PMIcon size={9} />
      {PM_LABELS[method] || method?.toUpperCase()}
    </span>
  );
});

// ─── Category Badge ───────────────────────────────────────────────────────────
const CategoryBadge = memo(({ category }) => {
  if (!category) return <span className="text-slate-500 text-xs">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{
        background: category.color ? `${category.color}18` : '#6366f118',
        color: category.color || '#6366f1',
        border: `1px solid ${category.color ? `${category.color}30` : '#6366f130'}`,
      }}>
      <span className="text-sm leading-none">{category.icon || '📦'}</span>
      {category.name}
    </span>
  );
});

// ─── Custom Pie Tooltip ───────────────────────────────────────────────────────
const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark-800 border border-slate-700 rounded-xl px-3 py-2 shadow-xl text-xs">
      <p className="text-slate-100 font-bold">{payload[0].name}</p>
      <p className="text-rose-400 font-black mt-0.5">₹{payload[0].value?.toLocaleString('en-IN')}</p>
    </div>
  );
};

// ─── Area Chart Tooltip ───────────────────────────────────────────────────────
const AreaTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark-800 border border-slate-700 rounded-xl px-3 py-2 shadow-xl text-xs">
      <p className="text-slate-400 mb-1">{label}</p>
      <p className="text-rose-400 font-black">₹{payload[0]?.value?.toLocaleString('en-IN')}</p>
    </div>
  );
};

// ─── Empty State ──────────────────────────────────────────────────────────────
const EmptyState = memo(({ onAdd }) => (
  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
    className="flex flex-col items-center justify-center py-20 px-4 text-center">
    <div className="w-20 h-20 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-5">
      <TrendingDown size={32} className="text-rose-400" />
    </div>
    <h3 className="text-lg font-bold text-slate-200 mb-2">No expenses yet</h3>
    <p className="text-slate-500 text-sm mb-6 max-w-xs">Track your spending by adding your first expense. Every rupee counts!</p>
    <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
      onClick={onAdd}
      className="btn-primary gap-2">
      <Plus size={16} /> Add Your First Expense
    </motion.button>
  </motion.div>
));

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Expenses() {
  const { expenses, fetchExpenses, addExpense, updateExpense, deleteExpense, categories, fetchCategories, loading } = useExpense();

  // Modal state
  const [modal, setModal] = useState({ open: false, mode: 'add', item: null });
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, loading: false });

  // Filters
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterPM, setFilterPM] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterAmtMin, setFilterAmtMin] = useState('');
  const [filterAmtMax, setFilterAmtMax] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);

  // Chart view toggle
  const [chartView, setChartView] = useState('category'); // 'category' | 'trend'

  useEffect(() => {
    fetchExpenses();
    fetchCategories('expense');
  }, []);

  // ── Computed data ────────────────────────────────────────────────────────────
  const now = new Date();
  const todayStr = now.toDateString();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const filtered = useMemo(() => {
    let list = [...expenses];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.title?.toLowerCase().includes(q) ||
        e.category?.name?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        (e.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }
    if (filterCat) list = list.filter(e => (e.category?._id || e.category) === filterCat);
    if (filterPM) list = list.filter(e => e.paymentMethod === filterPM);
    if (filterDateFrom) list = list.filter(e => new Date(e.date) >= new Date(filterDateFrom));
    if (filterDateTo) list = list.filter(e => new Date(e.date) <= new Date(filterDateTo + 'T23:59:59'));
    if (filterAmtMin) list = list.filter(e => e.amount >= Number(filterAmtMin));
    if (filterAmtMax) list = list.filter(e => e.amount <= Number(filterAmtMax));

    list.sort((a, b) => {
      switch (sortBy) {
        case 'date_asc': return new Date(a.date) - new Date(b.date);
        case 'amount_desc': return b.amount - a.amount;
        case 'amount_asc': return a.amount - b.amount;
        case 'title_asc': return a.title?.localeCompare(b.title);
        default: return new Date(b.date) - new Date(a.date);
      }
    });

    return list;
  }, [expenses, search, filterCat, filterPM, filterDateFrom, filterDateTo, filterAmtMin, filterAmtMax, sortBy]);

  const hasActiveFilters = search || filterCat || filterPM || filterDateFrom || filterDateTo || filterAmtMin || filterAmtMax;

  // Summary stats
  const totalAll = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const todayTotal = useMemo(() => expenses.filter(e => new Date(e.date).toDateString() === todayStr).reduce((s, e) => s + e.amount, 0), [expenses, todayStr]);
  const monthTotal = useMemo(() => expenses.filter(e => { const d = new Date(e.date); return d.getMonth() === thisMonth && d.getFullYear() === thisYear; }).reduce((s, e) => s + e.amount, 0), [expenses, thisMonth, thisYear]);
  const avgTx = useMemo(() => expenses.length ? Math.round(totalAll / expenses.length) : 0, [totalAll, expenses.length]);
  const highestTx = useMemo(() => expenses.reduce((max, e) => e.amount > max ? e.amount : max, 0), [expenses]);

  // Last 6 months sparkline for total card
  const monthlySparkData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(thisYear, thisMonth - i, 1);
      const m = d.getMonth(); const y = d.getFullYear();
      const v = expenses.filter(e => { const ed = new Date(e.date); return ed.getMonth() === m && ed.getFullYear() === y; }).reduce((s, e) => s + e.amount, 0);
      months.push({ v });
    }
    return months;
  }, [expenses, thisMonth, thisYear]);

  // Category chart data
  const categoryChartData = useMemo(() => {
    const map = {};
    expenses.forEach(e => {
      const name = e.category?.name || 'Uncategorized';
      map[name] = (map[name] || 0) + e.amount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([name, value]) => ({ name, value }));
  }, [expenses]);

  // Monthly trend data
  const trendData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(thisYear, thisMonth - i, 1);
      const m = d.getMonth(); const y = d.getFullYear();
      const total = expenses.filter(e => { const ed = new Date(e.date); return ed.getMonth() === m && ed.getFullYear() === y; }).reduce((s, e) => s + e.amount, 0);
      months.push({ month: d.toLocaleString('en-IN', { month: 'short' }), total });
    }
    return months;
  }, [expenses, thisMonth, thisYear]);

  // Paginated rows
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, filterCat, filterPM, filterDateFrom, filterDateTo, filterAmtMin, filterAmtMax, sortBy]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const resetFilters = useCallback(() => {
    setSearch(''); setFilterCat(''); setFilterPM('');
    setFilterDateFrom(''); setFilterDateTo('');
    setFilterAmtMin(''); setFilterAmtMax('');
    setSortBy('date_desc');
  }, []);

  const openAdd = useCallback(() => {
    setForm({ ...EMPTY_FORM, date: getLocalTodayString(), time: getLocalTimeString() });
    setModal({ open: true, mode: 'add', item: null });
  }, []);

  const openEdit = useCallback((item) => {
    const d = new Date(item.date);
    setForm({
      ...item,
      category: item.category?._id || item.category || '',
      date: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,
      time: `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`,
      tags: (item.tags || []).join(', '),
    });
    setModal({ open: true, mode: 'edit', item });
  }, []);

  const closeModal = useCallback(() => setModal({ open: false, mode: 'add', item: null }), []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title?.trim()) { toast.error('Please enter a title.'); return; }
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) { toast.error('Please enter a valid amount.'); return; }
    if (!form.date) { toast.error('Please select a date.'); return; }
    if (!form.category) { toast.error('Please select a category.'); return; }
    if (!form.paymentMethod) { toast.error('Please select a payment method.'); return; }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        date: new Date(`${form.date}T${form.time || '00:00'}`).toISOString(),
        amount: Number(form.amount),
        title: form.title.trim(),
        tags: typeof form.tags === 'string'
          ? form.tags.split(',').map(t => t.trim()).filter(Boolean)
          : form.tags || [],
      };
      delete payload.time; delete payload._id; delete payload.user;
      delete payload.createdAt; delete payload.updatedAt; delete payload.__v; delete payload.wallet;

      if (modal.mode === 'add') await addExpense(payload);
      else await updateExpense(modal.item._id, payload);
      closeModal();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save expense');
    } finally { setSubmitting(false); }
  };

  const handleDelete = useCallback((id) => setDeleteConfirm({ isOpen: true, id, loading: false }), []);
  const confirmDelete = async () => {
    if (!deleteConfirm.id) return;
    setDeleteConfirm(p => ({ ...p, loading: true }));
    try {
      await deleteExpense(deleteConfirm.id);
      setDeleteConfirm({ isOpen: false, id: null, loading: false });
    } catch {
      toast.error('Failed to delete expense');
      setDeleteConfirm(p => ({ ...p, loading: false }));
    }
  };

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in pb-24">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-100 flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/20 flex items-center justify-center flex-shrink-0">
              <TrendingDown size={20} className="text-rose-400" />
            </span>
            Expenses
          </h1>
          <p className="text-slate-500 text-sm mt-1 ml-[52px]">
            {expenses.length} transactions · Total{' '}
            <span className="text-rose-400 font-bold">{fmt(totalAll)}</span>
          </p>
        </div>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={openAdd}
          id="add-expense-btn"
          className="btn-primary gap-2 self-start sm:self-auto">
          <Plus size={16} /> Add Expense
        </motion.button>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <SummaryCard delay={0}   icon={TrendingDown} label="Total Spent"      value={fmt(totalAll)}   color="#f43f5e" sparkData={monthlySparkData} loading={loading} />
        <SummaryCard delay={0.05} icon={Calendar}     label="This Month"       value={fmt(monthTotal)} color="#f59e0b" loading={loading} />
        <SummaryCard delay={0.1}  icon={Clock}        label="Today"            value={fmt(todayTotal)} color="#ec4899" loading={loading} />
        <SummaryCard delay={0.15} icon={BarChart3}    label="Average"          value={fmt(avgTx)}      color="#6366f1" loading={loading} />
        <SummaryCard delay={0.2}  icon={TrendingDown} label="Highest"          value={fmt(highestTx)}  color="#ef4444" loading={loading} />
        <SummaryCard delay={0.25} icon={Receipt}      label="Transactions"     value={expenses.length} color="#8b5cf6" loading={loading} />
      </div>

      {/* ── Filters Bar ── */}
      <div className="card-sm space-y-3">
        <div className="flex gap-2 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              className="input pl-9 text-sm"
              placeholder="Search expenses…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Category quick filter */}
          <select className="select min-w-[140px] text-sm" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c._id} value={c._id}>{c.icon} {c.name}</option>)}
          </select>

          {/* Payment Method quick filter */}
          <select className="select min-w-[120px] text-sm" value={filterPM} onChange={e => setFilterPM(e.target.value)}>
            <option value="">All Methods</option>
            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{PM_LABELS[m]}</option>)}
          </select>

          {/* Sort */}
          <select className="select min-w-[140px] text-sm" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {/* Advanced toggle */}
          <button onClick={() => setShowFilters(p => !p)}
            className={`btn-ghost gap-1.5 text-sm border ${showFilters ? 'border-primary-500/40 text-primary-400 bg-primary-500/10' : 'border-slate-700'}`}>
            <SlidersHorizontal size={14} />
            <span className="hidden sm:inline">Advanced</span>
          </button>

          {/* Reset */}
          {hasActiveFilters && (
            <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              onClick={resetFilters}
              className="btn-ghost gap-1.5 text-sm text-rose-400 hover:text-rose-300 border border-rose-500/20 hover:bg-rose-500/10">
              <RotateCcw size={13} /> Reset
            </motion.button>
          )}
        </div>

        {/* Advanced filters panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
              className="overflow-hidden">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-700/50">
                <div className="form-group">
                  <label className="label text-xs">Date From</label>
                  <input type="date" className="input text-sm" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="label text-xs">Date To</label>
                  <input type="date" className="input text-sm" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="label text-xs">Min Amount</label>
                  <input type="number" className="input text-sm" placeholder="₹ 0" value={filterAmtMin} onChange={e => setFilterAmtMin(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="label text-xs">Max Amount</label>
                  <input type="number" className="input text-sm" placeholder="₹ ∞" value={filterAmtMax} onChange={e => setFilterAmtMax(e.target.value)} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {hasActiveFilters && (
          <p className="text-xs text-slate-500">
            Showing <span className="text-slate-300 font-semibold">{filtered.length}</span> of {expenses.length} expenses
          </p>
        )}
      </div>

      {/* ── Charts ── */}
      {expenses.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Category Breakdown */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-100 flex items-center gap-2">
                <PieChartIcon size={16} className="text-rose-400" /> Category Breakdown
              </h3>
            </div>
            {categoryChartData.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">No data yet</p>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={categoryChartData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                      paddingAngle={2} dataKey="value" stroke="none">
                      {categoryChartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {categoryChartData.slice(0, 6).map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="text-slate-300 truncate max-w-[90px]">{d.name}</span>
                      </div>
                      <span className="text-slate-400 font-semibold">{fmt(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* Monthly Trend */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="card">
            <h3 className="font-bold text-slate-100 flex items-center gap-2 mb-4">
              <BarChart3 size={16} className="text-rose-400" /> 6-Month Trend
            </h3>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="expArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<AreaTooltip />} />
                <Area type="monotone" dataKey="total" stroke="#f43f5e" strokeWidth={2}
                  fill="url(#expArea)" dot={{ fill: '#f43f5e', r: 3, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        </div>
      )}

      {/* ── Transaction Table ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="card p-0 overflow-hidden">
        {/* Table header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
          <h3 className="font-bold text-slate-100">Transactions</h3>
          <span className="text-xs text-slate-500 bg-slate-800 px-2.5 py-1 rounded-full">
            {filtered.length} records
          </span>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-slate-700/60 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-700/60 rounded w-1/3" />
                  <div className="h-2.5 bg-slate-700/40 rounded w-1/5" />
                </div>
                <div className="h-4 bg-slate-700/60 rounded w-20" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState onAdd={openAdd} />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Transaction</th>
                    <th>Category</th>
                    <th>Method</th>
                    <th>Date & Time</th>
                    <th className="text-right">Amount</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {paginated.map((item, idx) => (
                      <motion.tr key={item._id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="group">
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                              style={{
                                background: item.category?.color ? `${item.category.color}18` : '#6366f118',
                                border: `1px solid ${item.category?.color ? `${item.category.color}25` : '#6366f125'}`,
                              }}>
                              {item.category?.icon || '💸'}
                            </div>
                            <div>
                              <p className="text-slate-100 font-semibold text-sm leading-tight">{item.title}</p>
                              {item.description && (
                                <p className="text-slate-500 text-[11px] truncate max-w-[180px]">{item.description}</p>
                              )}
                              {item.tags?.length > 0 && (
                                <div className="flex gap-1 mt-0.5">
                                  {item.tags.slice(0, 2).map(t => (
                                    <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-400">{t}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td><CategoryBadge category={item.category} /></td>
                        <td><PMBadge method={item.paymentMethod} /></td>
                        <td>
                          <div>
                            <p className="text-slate-300 text-sm">{new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                            <p className="text-slate-500 text-[11px]">{new Date(item.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </td>
                        <td className="text-right">
                          <span className="text-rose-400 font-black text-sm">{fmt(item.amount)}</span>
                        </td>
                        <td>
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                              onClick={() => openEdit(item)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-primary-500/15 text-slate-400 hover:text-primary-400 transition-colors"
                              title="Edit">
                              <Edit3 size={14} />
                            </motion.button>
                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                              onClick={() => handleDelete(item._id)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-rose-500/15 text-slate-400 hover:text-rose-400 transition-colors"
                              title="Delete">
                              <Trash2 size={14} />
                            </motion.button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-slate-700/30">
              {paginated.map((item, idx) => (
                <motion.div key={item._id}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.04 }}
                  className="flex items-center gap-3 p-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                    style={{ background: item.category?.color ? `${item.category.color}18` : '#6366f118' }}>
                    {item.category?.icon || '💸'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-100 font-semibold text-sm truncate">{item.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <CategoryBadge category={item.category} />
                      <PMBadge method={item.paymentMethod} />
                    </div>
                    <p className="text-slate-500 text-[11px] mt-0.5">{new Date(item.date).toLocaleDateString('en-IN')}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className="text-rose-400 font-black text-sm">{fmt(item.amount)}</span>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-primary-400 transition-colors">
                        <Edit3 size={12} />
                      </button>
                      <button onClick={() => handleDelete(item._id)} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-700/50">
                <p className="text-xs text-slate-500">
                  Page {page} of {totalPages} · {filtered.length} results
                </p>
                <div className="flex gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-700 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    <ChevronLeft size={15} />
                  </button>
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    const pg = i + 1;
                    return (
                      <button key={pg} onClick={() => setPage(pg)}
                        className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                          page === pg ? 'bg-primary-600 text-white' : 'hover:bg-slate-700 text-slate-400'
                        }`}>{pg}</button>
                    );
                  })}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-700 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* ── Add / Edit Modal ── */}
      <Modal isOpen={modal.open} onClose={closeModal}
        title={modal.mode === 'add' ? 'Add Expense' : 'Edit Expense'} size="xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Basic Info */}
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-4 h-0.5 bg-rose-500 rounded" /> Basic Information
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="form-group sm:col-span-2">
                <label className="label">Title *</label>
                <input className="input" value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Grocery shopping at DMart" />
              </div>
              <div className="form-group">
                <label className="label">Amount (₹) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                  <input type="number" className="input pl-7" value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0.00" min="0" step="0.01" />
                </div>
              </div>
              <div className="form-group">
                <label className="label">Category *</label>
                <select className="select" value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c._id} value={c._id}>{c.icon} {c.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Financial Details */}
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-4 h-0.5 bg-rose-500 rounded" /> Financial Details
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="form-group">
                <label className="label">Date *</label>
                <input type="date" className="input" value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="label">Time</label>
                <input type="time" className="input" value={form.time}
                  onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="label">Payment Method *</label>
                <select className="select" value={form.paymentMethod}
                  onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{PM_LABELS[m]}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-4 h-0.5 bg-rose-500 rounded" /> Additional Details
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="form-group">
                <label className="label">Tags</label>
                <div className="relative">
                  <Tag size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input className="input pl-8 text-sm" value={form.tags}
                    onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                    placeholder="food, weekend, essential" />
                </div>
                <p className="text-[10px] text-slate-600 mt-1">Comma-separated</p>
              </div>
              <div className="form-group">
                <label className="label">Description</label>
                <input className="input text-sm" value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Optional note…" />
              </div>
            </div>
          </div>

          {/* Amount preview */}
          {form.amount && form.title && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/15 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Recording expense</p>
                <p className="text-slate-200 font-semibold text-sm">{form.title}</p>
              </div>
              <p className="text-rose-400 font-black text-xl">{fmt(form.amount)}</p>
            </motion.div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              type="submit" disabled={submitting}
              className="btn-primary flex-1 gap-2">
              {submitting ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
              ) : modal.mode === 'add' ? <><Plus size={15} /> Add Expense</> : <><CheckCircle2 size={15} /> Update Expense</>}
            </motion.button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Confirm ── */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Expense"
        message="Are you sure you want to delete this expense? This action cannot be undone and will update your budget and wallet balances."
        confirmText="Delete Expense"
        cancelText="Cancel"
        confirmVariant="danger"
        loading={deleteConfirm.loading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null, loading: false })}
      />

      {/* ── Floating Add Button (mobile) ── */}
      <motion.button
        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
        onClick={openAdd}
        className="md:hidden fixed bottom-6 right-6 z-40 w-14 h-14 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white shadow-xl shadow-rose-500/30 flex items-center justify-center">
        <Plus size={24} />
      </motion.button>
    </div>
  );
}
