import { useEffect, useState, useMemo, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Search, Filter, X, Plus, Edit3, Trash2,
  ChevronLeft, ChevronRight, RotateCcw, Calendar,
  Banknote, Wallet, Tag, SlidersHorizontal,
  BarChart3, PieChart as PieChartIcon, CheckCircle2, Clock, Zap,
  Receipt, Briefcase, DollarSign,
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { useExpense } from '../../context/ExpenseContext';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { DataTable } from '../../components/ui/DataTable';

// ─── Constants ────────────────────────────────────────────────────────────────
const CHART_COLORS = ['#10b981', '#6366f1', '#f59e0b', '#3b82f6', '#a855f7', '#06b6d4', '#ec4899', '#f43f5e'];
const PAYMENT_METHODS = ['cash', 'card', 'upi', 'bank', 'other'];
const PM_LABELS = { cash: 'Cash', card: 'Card', upi: 'UPI', bank: 'Bank', other: 'Other' };
const PM_COLORS = { cash: '#10b981', card: '#3b82f6', upi: '#8b5cf6', bank: '#f59e0b', other: '#64748b' };
const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Newest First' },
  { value: 'date_asc', label: 'Oldest First' },
  { value: 'amount_desc', label: 'Highest Amount' },
  { value: 'amount_asc', label: 'Lowest Amount' },
  { value: 'title_asc', label: 'A → Z' },
];
const PAGE_SIZE = 15;

const SOURCE_SUGGESTIONS = [
  'Salary', 'Freelance', 'Business', 'Investment', 'Rental', 'Dividends',
  'Commission', 'Bonus', 'Gift', 'Side Project', 'Other',
];

const getLocalTodayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const getLocalTimeString = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};
const EMPTY_FORM = {
  title: '', amount: '', category: '', source: '', paymentMethod: 'other',
  date: getLocalTodayString(), time: getLocalTimeString(), description: '',
};

// ─── Mini Sparkline ───────────────────────────────────────────────────────────
const Sparkline = memo(({ data, color }) => (
  <ResponsiveContainer width="100%" height={36}>
    <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
      <defs>
        <linearGradient id={`inc-spark-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={color} stopOpacity={0.3} />
          <stop offset="95%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5}
        fill={`url(#inc-spark-${color.replace('#','')})`} dot={false} />
    </AreaChart>
  </ResponsiveContainer>
));

// ─── Summary Card ─────────────────────────────────────────────────────────────
const SummaryCard = memo(({ icon: Icon, label, value, trend, trendUp, color, sparkData, loading, delay = 0 }) => (
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
  </motion.div>
));

// ─── Category Badge ───────────────────────────────────────────────────────────
const CategoryBadge = memo(({ category }) => {
  if (!category) return <span className="text-slate-500 text-xs">—</span>;
  const name = typeof category === 'string' ? category : category?.name;
  const icon = category?.icon || null;
  const color = category?.color || '#10b981';
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
      {icon && <span className="text-sm leading-none">{icon}</span>}
      {name}
    </span>
  );
});

// ─── Source Badge ─────────────────────────────────────────────────────────────
const SourceBadge = memo(({ source }) => {
  if (!source) return <span className="text-slate-500 text-xs">—</span>;
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
      <Briefcase size={9} />
      {source}
    </span>
  );
});

// ─── Payment Method Badge ─────────────────────────────────────────────────────
const PMBadge = memo(({ method }) => {
  const key = PAYMENT_METHODS.includes(method) ? method : '';
  if (!key) return <span className="text-slate-500 text-xs italic">Not Set</span>;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-700/40 text-slate-300 border border-slate-600/40">
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: PM_COLORS[key] }} />
      {PM_LABELS[key]}
    </span>
  );
});

// ─── Custom Tooltips ──────────────────────────────────────────────────────────
const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="border rounded-xl px-3 py-2 shadow-xl text-xs" style={{ backgroundColor: 'var(--chart-tooltip-bg)', borderColor: 'var(--chart-tooltip-border)', color: 'var(--chart-tooltip-text)' }}>
      <p className="font-bold">{payload[0].name}</p>
      <p className="text-emerald-400 font-black mt-0.5">₹{payload[0].value?.toLocaleString('en-IN')}</p>
    </div>
  );
};
const AreaTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="border rounded-xl px-3 py-2 shadow-xl text-xs" style={{ backgroundColor: 'var(--chart-tooltip-bg)', borderColor: 'var(--chart-tooltip-border)', color: 'var(--chart-tooltip-text)' }}>
      <p className="mb-1" style={{ color: 'var(--chart-text)' }}>{label}</p>
      <p className="text-emerald-400 font-black">₹{payload[0]?.value?.toLocaleString('en-IN')}</p>
    </div>
  );
};

// Reusable EmptyState component from components/ui/EmptyState is now used.

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Income() {
  const { incomes, fetchIncomes, addIncome, updateIncome, deleteIncome, categories, fetchCategories, loading, incomesTotal } = useExpense();

  const [modal, setModal] = useState({ open: false, mode: 'add', item: null });
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, loading: false });

  // Filters
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterAmtMin, setFilterAmtMin] = useState('');
  const [filterAmtMax, setFilterAmtMax] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchIncomes();
    fetchCategories('income');
  }, []);

  // ── Computed data ────────────────────────────────────────────────────────────
  const now = new Date();
  const todayStr = now.toDateString();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const filtered = useMemo(() => {
    let list = [...incomes];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        i.title?.toLowerCase().includes(q) ||
        i.source?.toLowerCase().includes(q) ||
        i.category?.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q)
      );
    }
    if (filterCat) list = list.filter(i => (i.category?._id || i.category) === filterCat);
    if (filterSource) list = list.filter(i => i.source?.toLowerCase().includes(filterSource.toLowerCase()));
    if (filterDateFrom) list = list.filter(i => new Date(i.date) >= new Date(filterDateFrom));
    if (filterDateTo) list = list.filter(i => new Date(i.date) <= new Date(filterDateTo + 'T23:59:59'));
    if (filterAmtMin) list = list.filter(i => i.amount >= Number(filterAmtMin));
    if (filterAmtMax) list = list.filter(i => i.amount <= Number(filterAmtMax));

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
  }, [incomes, search, filterCat, filterSource, filterDateFrom, filterDateTo, filterAmtMin, filterAmtMax, sortBy]);

  const hasActiveFilters = search || filterCat || filterSource || filterDateFrom || filterDateTo || filterAmtMin || filterAmtMax;

  const totalAll = useMemo(() => incomes.reduce((s, i) => s + i.amount, 0), [incomes]);
  const todayTotal = useMemo(() => incomes.filter(i => new Date(i.date).toDateString() === todayStr).reduce((s, i) => s + i.amount, 0), [incomes, todayStr]);
  const monthTotal = useMemo(() => incomes.filter(i => { const d = new Date(i.date); return d.getMonth() === thisMonth && d.getFullYear() === thisYear; }).reduce((s, i) => s + i.amount, 0), [incomes, thisMonth, thisYear]);
  const avgTx = useMemo(() => incomes.length ? Math.round(totalAll / incomes.length) : 0, [totalAll, incomes.length]);
  const highestTx = useMemo(() => incomes.reduce((max, i) => i.amount > max ? i.amount : max, 0), [incomes]);

  const monthlySparkData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(thisYear, thisMonth - i, 1);
      const m = d.getMonth(); const y = d.getFullYear();
      const v = incomes.filter(e => { const ed = new Date(e.date); return ed.getMonth() === m && ed.getFullYear() === y; }).reduce((s, e) => s + e.amount, 0);
      months.push({ v });
    }
    return months;
  }, [incomes, thisMonth, thisYear]);

  // Source breakdown for pie chart
  const sourceChartData = useMemo(() => {
    const map = {};
    incomes.forEach(i => {
      const name = i.source || i.category || 'Other';
      map[name] = (map[name] || 0) + i.amount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([name, value]) => ({ name, value }));
  }, [incomes]);

  const trendData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(thisYear, thisMonth - i, 1);
      const m = d.getMonth(); const y = d.getFullYear();
      const total = incomes.filter(e => { const ed = new Date(e.date); return ed.getMonth() === m && ed.getFullYear() === y; }).reduce((s, e) => s + e.amount, 0);
      months.push({ month: d.toLocaleString('en-IN', { month: 'short' }), total });
    }
    return months;
  }, [incomes, thisMonth, thisYear]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  useEffect(() => { setPage(1); }, [search, filterCat, filterSource, filterDateFrom, filterDateTo, filterAmtMin, filterAmtMax, sortBy]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const resetFilters = useCallback(() => {
    setSearch(''); setFilterCat(''); setFilterSource('');
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
      // Legacy records have no paymentMethod → keep as '' so the form shows "Not Set"
      // and nothing is saved as 'other' without the user explicitly choosing it.
      paymentMethod: (PAYMENT_METHODS.includes(item.paymentMethod) ? item.paymentMethod : ''),
      date: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,
      time: `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`,
    });
    setModal({ open: true, mode: 'edit', item });
  }, []);

  const closeModal = useCallback(() => setModal({ open: false, mode: 'add', item: null }), []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title?.trim()) { toast.error('Please enter a title.'); return; }
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) { toast.error('Please enter a valid amount.'); return; }
    if (!form.date) { toast.error('Please select a date.'); return; }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        date: new Date(`${form.date}T${form.time || '00:00'}`).toISOString(),
        amount: Number(form.amount),
        title: form.title.trim(),
      };
      delete payload.time; delete payload._id; delete payload.user;
      delete payload.createdAt; delete payload.updatedAt; delete payload.__v; delete payload.wallet;
      if (!payload.category) delete payload.category;
      if (!payload.source) delete payload.source;
      if (!payload.description) delete payload.description;

      if (modal.mode === 'add') await addIncome(payload);
      else await updateIncome(modal.item._id, payload);
      closeModal();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save income');
    } finally { setSubmitting(false); }
  };

  const handleDelete = useCallback((id) => setDeleteConfirm({ isOpen: true, id, loading: false }), []);
  const confirmDelete = async () => {
    if (!deleteConfirm.id) return;
    setDeleteConfirm(p => ({ ...p, loading: true }));
    try {
      await deleteIncome(deleteConfirm.id);
      setDeleteConfirm({ isOpen: false, id: null, loading: false });
    } catch {
      toast.error('Failed to delete income');
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
            <span className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <TrendingUp size={20} className="text-emerald-400" />
            </span>
            Income
          </h1>
          <p className="text-slate-500 text-sm mt-1 ml-[52px]">
            {incomes.length} transactions · Total{' '}
            <span className="text-emerald-400 font-bold">{fmt(totalAll)}</span>
          </p>
        </div>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={openAdd} id="add-income-btn"
          className="btn gap-2 self-start sm:self-auto bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25">
          <Plus size={16} /> Add Income
        </motion.button>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <SummaryCard delay={0}    icon={TrendingUp}  label="Total Earned"  value={fmt(incomesTotal ?? totalAll)}   color="#10b981" sparkData={monthlySparkData} loading={loading} />
        <SummaryCard delay={0.05} icon={Calendar}    label="This Month"    value={fmt(monthTotal)} color="#6366f1" loading={loading} />
        <SummaryCard delay={0.1}  icon={Clock}       label="Today"         value={fmt(todayTotal)} color="#f59e0b" loading={loading} />
        <SummaryCard delay={0.15} icon={BarChart3}   label="Average"       value={fmt(avgTx)}      color="#3b82f6" loading={loading} />
        <SummaryCard delay={0.2}  icon={DollarSign}  label="Highest"       value={fmt(highestTx)}  color="#a855f7" loading={loading} />
        <SummaryCard delay={0.25} icon={Briefcase}   label="Transactions"  value={incomes.length}  color="#06b6d4" loading={loading} />
      </div>

      {/* ── Filters ── */}
      <div className="card-sm space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input className="input pl-9 text-sm" placeholder="Search income…"
              value={search} onChange={e => setSearch(e.target.value)} />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                <X size={13} />
              </button>
            )}
          </div>

          <select className="select min-w-[140px] text-sm" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c._id} value={c._id}>{c.icon} {c.name}</option>)}
          </select>

          <select className="select min-w-[130px] text-sm" value={filterSource} onChange={e => setFilterSource(e.target.value)}>
            <option value="">All Sources</option>
            {SOURCE_SUGGESTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select className="select min-w-[140px] text-sm" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <button onClick={() => setShowFilters(p => !p)}
            className={`btn-ghost gap-1.5 text-sm border ${showFilters ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' : 'border-slate-700'}`}>
            <SlidersHorizontal size={14} />
            <span className="hidden sm:inline">Advanced</span>
          </button>

          {hasActiveFilters && (
            <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              onClick={resetFilters}
              className="btn-ghost gap-1.5 text-sm text-rose-400 hover:text-rose-300 border border-rose-500/20 hover:bg-rose-500/10">
              <RotateCcw size={13} /> Reset
            </motion.button>
          )}
        </div>

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
            Showing <span className="text-slate-300 font-semibold">{filtered.length}</span> of {incomes.length} entries
          </p>
        )}
      </div>

      {/* ── Charts ── */}
      {incomes.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Source Breakdown */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="card">
            <h3 className="font-bold text-slate-100 flex items-center gap-2 mb-4">
              <PieChartIcon size={16} className="text-emerald-400" /> Income Sources
            </h3>
            {sourceChartData.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">No data yet</p>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={sourceChartData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                      paddingAngle={2} dataKey="value" stroke="none">
                      {sourceChartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {sourceChartData.slice(0, 6).map((d, i) => (
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
              <BarChart3 size={16} className="text-emerald-400" /> 6-Month Trend
            </h3>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="incArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<AreaTooltip />} />
                <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2}
                  fill="url(#incArea)" dot={{ fill: '#10b981', r: 3, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        </div>
      )}

      {/* ── Transaction Table ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="card p-0 overflow-hidden">
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
          <EmptyState
            title="No income recorded yet"
            description="Start tracking your earnings by adding your first income entry."
            icon={TrendingUp}
            actionText="Add Your First Income"
            onAction={openAdd}
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Transaction</th>
                    <th>Category</th>
                    <th>Source</th>
                    <th>Payment Method</th>
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
                            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center text-base flex-shrink-0">
                              {item.category?.icon || '💰'}
                            </div>
                            <div>
                              <p className="text-slate-100 font-semibold text-sm leading-tight">{item.title}</p>
                              {item.description && (
                                <p className="text-slate-500 text-[11px] truncate max-w-[180px]">{item.description}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td><CategoryBadge category={item.category} /></td>
                        <td><SourceBadge source={item.source} /></td>
                        <td><PMBadge method={item.paymentMethod} /></td>
                        <td>
                          <div>
                            <p className="text-slate-300 text-sm">{new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                            <p className="text-slate-500 text-[11px]">{new Date(item.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </td>
                        <td className="text-right">
                          <span className="text-emerald-400 font-black text-sm">+{fmt(item.amount)}</span>
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
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center text-base flex-shrink-0">
                    {item.category?.icon || '💰'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-100 font-semibold text-sm truncate">{item.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <CategoryBadge category={item.category} />
                      {item.source && <SourceBadge source={item.source} />}
                      <PMBadge method={item.paymentMethod} />
                    </div>
                    <p className="text-slate-500 text-[11px] mt-0.5">{new Date(item.date).toLocaleDateString('en-IN')}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className="text-emerald-400 font-black text-sm">+{fmt(item.amount)}</span>
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
                          page === pg ? 'bg-emerald-600 text-white' : 'hover:bg-slate-700 text-slate-400'
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
        title={modal.mode === 'add' ? 'Add Income' : 'Edit Income'} size="xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Basic Info */}
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-4 h-0.5 bg-emerald-500 rounded" /> Basic Information
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="form-group sm:col-span-2">
                <label className="label">Title *</label>
                <input className="input" value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Monthly Salary - July 2026" />
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
                <label className="label">Category</label>
                <select className="select" value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c._id} value={c.name}>{c.icon} {c.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Financial Details */}
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-4 h-0.5 bg-emerald-500 rounded" /> Details
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                <label className="label">Source</label>
                <input list="income-sources" className="input" value={form.source}
                  onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                  placeholder="e.g. Salary, Freelance…" />
                <datalist id="income-sources">
                  {SOURCE_SUGGESTIONS.map(s => <option key={s} value={s} />)}
                </datalist>
              </div>
              <div className="form-group">
                <label className="label">Payment Method</label>
                <select className="select" value={form.paymentMethod}
                  onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                  <option value="">Not Set</option>
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{PM_LABELS[m]}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Additional */}
          <div className="form-group">
            <label className="label">Description</label>
            <input className="input text-sm" value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Optional note…" />
          </div>

          {/* Amount preview */}
          {form.amount && form.title && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Recording income</p>
                <p className="text-slate-200 font-semibold text-sm">{form.title}</p>
              </div>
              <p className="text-emerald-400 font-black text-xl">+{fmt(form.amount)}</p>
            </motion.div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              type="submit" disabled={submitting}
              className="btn flex-1 gap-2 bg-emerald-600 hover:bg-emerald-500 text-white">
              {submitting ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
              ) : modal.mode === 'add' ? <><Plus size={15} /> Add Income</> : <><CheckCircle2 size={15} /> Update Income</>}
            </motion.button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Confirm ── */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Income"
        message="Are you sure you want to delete this income record? This action cannot be undone and will update your wallet balance."
        confirmText="Delete Income"
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
        className="md:hidden fixed bottom-6 right-6 z-40 w-14 h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white shadow-xl shadow-emerald-500/30 flex items-center justify-center">
        <Plus size={24} />
      </motion.button>
    </div>
  );
}
