import { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Target, Wallet, AlertCircle, Plus, Edit3, Trash2,
  Calendar, CreditCard, Banknote, Search, RefreshCw,
  Info, LayoutGrid, BarChart3, PieChart as PieIcon, ArrowUpRight, ArrowDownRight,
  CheckCircle2, SlidersHorizontal, Check, Copy, Flame, Lock, Unlock,
  ChevronRight, MoreVertical, Layers,
  Printer, RotateCcw, Eye, HelpCircle, Briefcase, X,
  Star, Clock, DollarSign
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  AreaChart, Area, LineChart, Line
} from 'recharts';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { DataTable } from '../../components/ui/DataTable';

// ─── Service Configuration Mapper ──────────────────────────
const SERVICES_CONFIG = {
  netflix: { icon: '📺', color: '#e50914', plan: 'Premium 4K', category: 'Entertainment' },
  spotify: { icon: '🎵', color: '#1db954', plan: 'Premium Duo', category: 'Music' },
  'amazon prime': { icon: '📦', color: '#ff9900', plan: 'Prime Video', category: 'Entertainment' },
  disney: { icon: '🎬', color: '#0063e5', plan: 'Hotstar Premium', category: 'Entertainment' },
  youtube: { icon: '🔴', color: '#ff0000', plan: 'Premium Individual', category: 'Entertainment' },
  google: { icon: '🌈', color: '#4285f4', plan: 'Google One 100GB', category: 'Cloud' },
  icloud: { icon: '☁️', color: '#007aff', plan: 'iCloud+ 50GB', category: 'Cloud' },
  microsoft: { icon: '🟧', color: '#f25022', plan: 'Microsoft 365 Personal', category: 'Productivity' },
  adobe: { icon: '🎨', color: '#ff0000', plan: 'Creative Cloud All Apps', category: 'Creativity' },
  canva: { icon: '🎭', color: '#00c4cc', plan: 'Canva Pro', category: 'Creativity' },
  chatgpt: { icon: '🤖', color: '#10a37f', plan: 'ChatGPT Plus', category: 'AI Tools' },
  github: { icon: '🐙', color: '#24292e', plan: 'GitHub Pro', category: 'Development' },
  figma: { icon: '🎨', color: '#f24e1e', plan: 'Figma Professional', category: 'Creativity' },
  dropbox: { icon: '📦', color: '#0061ff', plan: 'Dropbox Plus', category: 'Cloud' },
  notion: { icon: '📓', color: '#000000', plan: 'Notion Plus', category: 'Productivity' },
  zoom: { icon: '📹', color: '#2d8cff', plan: 'Zoom Pro', category: 'Communication' },
  slack: { icon: '💬', color: '#4a154b', plan: 'Slack Pro', category: 'Communication' },
  'apple music': { icon: '🎧', color: '#fc3c44', plan: 'Individual Plan', category: 'Music' },
  hotstar: { icon: '🌟', color: '#ffc629', plan: 'Super Plan', category: 'Entertainment' },
  jiocinema: { icon: '🍿', color: '#e21b70', plan: 'Premium Monthly', category: 'Entertainment' }
};

const getServiceConfig = (name) => {
  const n = name.toLowerCase();
  for (const [key, value] of Object.entries(SERVICES_CONFIG)) {
    if (n.includes(key)) {
      return value;
    }
  }
  return { icon: '🔔', color: '#6366f1', plan: 'Basic Plan', category: 'SaaS / Services' };
};

const CATEGORIES = ['Entertainment', 'Music', 'Cloud', 'Productivity', 'Creativity', 'AI Tools', 'Development', 'Communication', 'SaaS / Services'];
const PAYMENT_METHODS = ['credit_card', 'debit_card', 'upi', 'netbanking', 'wallet'];
const BILLING_CYCLES = ['monthly', 'yearly'];
const PRIORITY_OPTIONS = ['low', 'medium', 'high'];

const EMPTY_FORM = {
  name: '',
  cost: '',
  billingCycle: 'monthly',
  renewalDate: '',
  reminder: true,
  category: 'SaaS / Services',
  plan: 'Basic Plan',
  paymentMethod: 'credit_card',
  autoRenewal: true,
  priority: 'medium',
  color: '#6366f1',
  icon: '🔔',
  notes: '',
  isPinned: false,
  isFavorite: false,
  tags: '',
  isFreeTrial: false
};

// Color theme states mapping
const STATUS_COLORS = {
  active: { hex: '#10b981', label: 'Active', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  upcoming: { hex: '#3b82f6', label: 'Upcoming Renewal', bg: 'bg-blue-500/10', text: 'text-blue-400' },
  soon: { hex: '#f97316', label: 'Renew Soon', bg: 'bg-orange-500/10', text: 'text-orange-400' },
  expired: { hex: '#ef4444', label: 'Expired', bg: 'bg-rose-500/10', text: 'text-rose-400' },
  trial: { hex: '#8b5cf6', label: 'Free Trial', bg: 'bg-purple-500/10', text: 'text-purple-400' },
  cancelled: { hex: '#64748b', label: 'Cancelled', bg: 'bg-slate-700/20', text: 'text-slate-400' }
};

// Days remaining calculation helper
const getDaysRemaining = (dateStr) => {
  const today = new Date();
  today.setHours(0,0,0,0);
  const renewal = new Date(dateStr);
  renewal.setHours(0,0,0,0);
  const diffTime = renewal - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Determine status config
const getStatusConfig = (sub, days) => {
  const ext = sub.extendedProps || {};
  if (!sub.autoRenewal && ext.status === 'cancelled') return STATUS_COLORS.cancelled;
  if (ext.isFreeTrial) return STATUS_COLORS.trial;
  if (days < 0) return STATUS_COLORS.expired;
  if (days <= 3) return STATUS_COLORS.soon;
  if (days <= 14) return STATUS_COLORS.upcoming;
  return STATUS_COLORS.active;
};

// ─── Animated Counter Component ─────────────────────────────
const AnimatedCounter = memo(({ value, prefix = '₹', suffix = '' }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = parseFloat(value) || 0;
    if (end === 0) {
      setDisplayValue(0);
      return;
    }
    const duration = 600;
    const incrementTime = 25;
    const totalSteps = duration / incrementTime;
    const stepIncrement = end / totalSteps;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      start += stepIncrement;
      if (currentStep >= totalSteps) {
        setDisplayValue(end);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(start));
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <span>
      {prefix}
      {displayValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
      {suffix}
    </span>
  );
});

// ─── Mini Sparkline Component ───────────────────────────────
const Sparkline = memo(({ data = [], color = '#6366f1' }) => {
  const points = useMemo(() => {
    const coordinates = data.length > 1 ? data : [22, 45, 15, 30, 52, 28, 45, 60];
    const width = 70;
    const height = 18;
    const max = Math.max(...coordinates, 1);
    const min = Math.min(...coordinates, 0);
    const range = max - min || 1;

    return coordinates.map((val, idx) => {
      const x = (idx / (coordinates.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    }).join(' ');
  }, [data]);

  return (
    <svg width="70" height="18" className="overflow-visible opacity-80">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
});

// ─── Premium Summary Card Component ──────────────────────────
const PremiumSummaryCard = memo(({ icon: Icon, label, value, sub, trend, trendUp, color, sparkData, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
    whileHover={{ y: -3 }}
    className="card relative overflow-hidden group cursor-default border-slate-700/30 flex flex-col justify-between"
  >
    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
      style={{ background: `radial-gradient(circle at 80% 20%, ${color}0C 0%, transparent 65%)` }} />
    <div className="absolute top-0 left-0 right-0 h-[2px] opacity-40 group-hover:opacity-100 transition-opacity"
      style={{ backgroundColor: color }} />
    
    <div className="flex items-start justify-between gap-2">
      <div className="space-y-1">
        <p className="text-[10px] font-bold text-slate-400/90 uppercase tracking-wider">{label}</p>
        <h3 className="text-2xl font-black text-slate-100 tracking-tight">
          {typeof value === 'number' ? <AnimatedCounter value={value} prefix={label.includes('Health') || label.includes('Active') || label.includes('Trials') || label.includes('Renewals') ? '' : '₹'} suffix={label.includes('Score') ? '%' : ''} /> : value}
        </h3>
      </div>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center border border-slate-700/20 shadow-inner flex-shrink-0"
        style={{ backgroundColor: `${color}15`, color }}>
        <Icon size={16} />
      </div>
    </div>

    <div className="flex items-end justify-between mt-4 pt-3 border-t border-slate-800/50">
      <div className="space-y-0.5">
        {trend && (
          <span className={`text-[10px] font-bold flex items-center gap-0.5 ${trendUp ? 'text-emerald-400' : 'text-rose-400'}`}>
            {trendUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
            {trend}
          </span>
        )}
        <span className="text-[9px] text-slate-400 block font-medium truncate max-w-[110px]">{sub}</span>
      </div>
      <div className="pt-1 flex items-center">
        <Sparkline data={sparkData} color={color} />
      </div>
    </div>
  </motion.div>
));

export default function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, loading: false });
  
  // Custom states
  const [activeChartTab, setActiveChartTab] = useState('monthly');
  const [modal, setModal] = useState({ open: false, mode: 'add', item: null });
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [extendedStore, setExtendedStore] = useState({});

  // Filters State
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterBillingCycle, setFilterBillingCycle] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterPriceRange, setFilterPriceRange] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [sortBy, setSortBy] = useState('cost-desc');

  // Sync Extended properties from localStorage
  const syncExtendedProps = useCallback(() => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('subscription_ext_'));
    const store = {};
    keys.forEach(k => {
      try {
        const id = k.replace('subscription_ext_', '');
        store[id] = JSON.parse(localStorage.getItem(k));
      } catch {}
    });
    setExtendedStore(store);
  }, []);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/subscriptions');
      setSubscriptions(data.data || []);
    } catch {
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
    syncExtendedProps();
  }, []);

  // Combine database values and localStorage options
  const combinedSubscriptions = useMemo(() => {
    return subscriptions.map(sub => {
      const ext = extendedStore[sub._id] || {};
      const service = getServiceConfig(sub.name);
      return {
        ...sub,
        category: ext.category || service.category,
        plan: ext.plan || service.plan,
        paymentMethod: ext.paymentMethod || 'credit_card',
        autoRenewal: ext.autoRenewal !== undefined ? ext.autoRenewal : true,
        priority: ext.priority || 'medium',
        color: ext.color || service.color,
        icon: ext.icon || service.icon,
        notes: ext.notes || '',
        isPinned: ext.isPinned || false,
        isFavorite: ext.isFavorite || false,
        tags: ext.tags || '',
        isFreeTrial: ext.isFreeTrial || false,
        extendedProps: ext
      };
    });
  }, [subscriptions, extendedStore]);

  // Filters application
  const filteredSubs = useMemo(() => {
    let list = [...combinedSubscriptions];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s => s.name?.toLowerCase().includes(q) || s.plan?.toLowerCase().includes(q));
    }

    if (filterCategory) {
      list = list.filter(s => s.category === filterCategory);
    }

    if (filterBillingCycle) {
      list = list.filter(s => s.billingCycle === filterBillingCycle);
    }

    if (filterPaymentMethod) {
      list = list.filter(s => s.paymentMethod === filterPaymentMethod);
    }

    if (filterTag) {
      const tag = filterTag.toLowerCase();
      list = list.filter(s => s.tags?.toLowerCase().includes(tag));
    }

    if (filterMonth) {
      list = list.filter(s => {
        const d = new Date(s.renewalDate);
        return d.getMonth() === parseInt(filterMonth);
      });
    }

    if (filterPriceRange) {
      const limit = parseFloat(filterPriceRange);
      list = list.filter(s => s.cost <= limit);
    }

    if (filterStatus) {
      list = list.filter(s => {
        const days = getDaysRemaining(s.renewalDate);
        const config = getStatusConfig(s, days);
        return config.label.toLowerCase().includes(filterStatus.toLowerCase()) || 
          (filterStatus === 'cancelled' && !s.autoRenewal);
      });
    }

    // Sort mappings
    list.sort((a, b) => {
      const costA = a.billingCycle === 'monthly' ? a.cost : a.cost / 12;
      const costB = b.billingCycle === 'monthly' ? b.cost : b.cost / 12;

      // Pin sorting logic (always pin to top)
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      switch (sortBy) {
        case 'cost-desc': return costB - costA;
        case 'cost-asc': return costA - costB;
        case 'renewal-soon': return getDaysRemaining(a.renewalDate) - getDaysRemaining(b.renewalDate);
        case 'renewal-late': return getDaysRemaining(b.renewalDate) - getDaysRemaining(a.renewalDate);
        case 'name-asc': return a.name?.localeCompare(b.name);
        default: return costB - costA;
      }
    });

    return list;
  }, [combinedSubscriptions, search, filterCategory, filterBillingCycle, filterPaymentMethod, filterTag, filterMonth, filterPriceRange, filterStatus, sortBy]);

  // Aggregate Metrics
  const totalMonthlyCost = useMemo(() => {
    return combinedSubscriptions.reduce((sum, s) => {
      if (!s.autoRenewal && s.extendedProps?.status === 'cancelled') return sum;
      return sum + (s.billingCycle === 'monthly' ? s.cost : s.cost / 12);
    }, 0);
  }, [combinedSubscriptions]);

  const totalYearlyCost = useMemo(() => totalMonthlyCost * 12, [totalMonthlyCost]);

  const activeCount = useMemo(() => {
    return combinedSubscriptions.filter(s => s.autoRenewal && !s.isFreeTrial && getDaysRemaining(s.renewalDate) >= 0).length;
  }, [combinedSubscriptions]);

  const upcomingCount = useMemo(() => {
    return combinedSubscriptions.filter(s => {
      const days = getDaysRemaining(s.renewalDate);
      return days >= 0 && days <= 14;
    }).length;
  }, [combinedSubscriptions]);

  const trialCount = useMemo(() => {
    return combinedSubscriptions.filter(s => s.isFreeTrial).length;
  }, [combinedSubscriptions]);

  // Modal open handlers
  const openAdd = useCallback(() => {
    setForm(EMPTY_FORM);
    setModal({ open: true, mode: 'add', item: null });
  }, []);

  const openEdit = useCallback((item) => {
    setForm({
      name: item.name || '',
      cost: item.cost || '',
      billingCycle: item.billingCycle || 'monthly',
      renewalDate: item.renewalDate ? new Date(item.renewalDate).toISOString().slice(0,10) : '',
      reminder: item.reminder !== undefined ? item.reminder : true,
      category: item.category || 'SaaS / Services',
      plan: item.plan || 'Basic Plan',
      paymentMethod: item.paymentMethod || 'credit_card',
      autoRenewal: item.autoRenewal,
      priority: item.priority || 'medium',
      color: item.color || '#6366f1',
      icon: item.icon || '🔔',
      notes: item.notes || '',
      isPinned: item.isPinned || false,
      isFavorite: item.isFavorite || false,
      tags: item.tags || '',
      isFreeTrial: item.isFreeTrial || false
    });
    setModal({ open: true, mode: 'edit', item });
  }, []);

  const closeModal = useCallback(() => {
    setModal({ open: false, mode: 'add', item: null });
  }, []);

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.cost || !form.renewalDate) {
      return toast.error('Please input service name, billing cost and renewal date.');
    }

    setSubmitting(true);
    try {
      const dbPayload = {
        name: form.name,
        cost: Number(form.cost),
        billingCycle: form.billingCycle,
        renewalDate: form.renewalDate,
        reminder: form.reminder
      };

      let returnedSub = null;
      if (modal.mode === 'add') {
        const { data } = await api.post('/subscriptions', dbPayload);
        returnedSub = data.data;
        toast.success('Subscription saved!');
      } else {
        const { data } = await api.put(`/subscriptions/${modal.item._id}`, dbPayload);
        returnedSub = data.data;
        toast.success('Subscription updated!');
      }

      // Sync and store extra parameters locally
      const subId = returnedSub?._id || modal.item?._id;
      if (subId) {
        const extPayload = {
          category: form.category,
          plan: form.plan,
          paymentMethod: form.paymentMethod,
          autoRenewal: form.autoRenewal,
          priority: form.priority,
          color: form.color,
          icon: form.icon,
          notes: form.notes,
          isPinned: form.isPinned,
          isFavorite: form.isFavorite,
          tags: form.tags,
          isFreeTrial: form.isFreeTrial,
          status: form.autoRenewal ? 'active' : 'cancelled'
        };
        localStorage.setItem(`subscription_ext_${subId}`, JSON.stringify(extPayload));
      }

      closeModal();
      fetchSubscriptions();
      syncExtendedProps();
    } catch {
      toast.error('Failed to save subscription properties');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Action Handlers
  const handleDelete = useCallback((item) => {
    setDeleteConfirm({ isOpen: true, id: item._id, loading: false });
  }, []);

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return;
    setDeleteConfirm(prev => ({ ...prev, loading: true }));
    try {
      await api.delete(`/subscriptions/${deleteConfirm.id}`);
      localStorage.removeItem(`subscription_ext_${deleteConfirm.id}`);
      toast.success('Subscription cancelled and removed.');
      fetchSubscriptions();
      syncExtendedProps();
      setDeleteConfirm({ isOpen: false, id: null, loading: false });
    } catch {
      toast.error('Failed to delete subscription');
      setDeleteConfirm(prev => ({ ...prev, loading: false }));
    }
  };



  const handleTogglePin = useCallback((sub) => {
    const key = `subscription_ext_${sub._id}`;
    const ext = extendedStore[sub._id] || {};
    const newPinState = !sub.isPinned;

    const updated = {
      ...ext,
      isPinned: newPinState
    };

    localStorage.setItem(key, JSON.stringify(updated));
    syncExtendedProps();
    toast.success(newPinState ? 'Pinned to top.' : 'Unpinned subscription.');
  }, [extendedStore, syncExtendedProps]);

  const handleToggleFavorite = useCallback((sub) => {
    const key = `subscription_ext_${sub._id}`;
    const ext = extendedStore[sub._id] || {};
    const newFav = !sub.isFavorite;

    const updated = {
      ...ext,
      isFavorite: newFav
    };

    localStorage.setItem(key, JSON.stringify(updated));
    syncExtendedProps();
    toast.success(newFav ? 'Added to favorites ⭐' : 'Removed from favorites.');
  }, [extendedStore, syncExtendedProps]);

  // Duplicate Subscription
  const handleDuplicate = async (sub) => {
    try {
      const dbPayload = {
        name: `${sub.name} (Copy)`,
        cost: sub.cost,
        billingCycle: sub.billingCycle,
        renewalDate: sub.renewalDate,
        reminder: sub.reminder
      };

      const { data } = await api.post('/subscriptions', dbPayload);
      const newSub = data.data;

      // Copy local storage properties
      if (newSub?._id) {
        localStorage.setItem(`subscription_ext_${newSub._id}`, JSON.stringify({
          ...sub.extendedProps,
          isPinned: false,
          isFavorite: false
        }));
      }

      toast.success('Subscription duplicated successfully!');
      fetchSubscriptions();
      syncExtendedProps();
    } catch {
      toast.error('Failed to duplicate subscription');
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearch('');
    setFilterCategory('');
    setFilterStatus('');
    setFilterBillingCycle('');
    setFilterPaymentMethod('');
    setFilterMonth('');
    setFilterPriceRange('');
    setFilterTag('');
    setSortBy('cost-desc');
  };

  // Recharts Chart configurations
  const barChartData = useMemo(() => {
    return filteredSubs.slice(0, 7).map(s => {
      const monthlyEquivalent = s.billingCycle === 'monthly' ? s.cost : s.cost / 12;
      return {
        name: s.name,
        Cost: monthlyEquivalent
      };
    });
  }, [filteredSubs]);

  const pieChartData = useMemo(() => {
    const map = {};
    filteredSubs.forEach(s => {
      const val = s.billingCycle === 'monthly' ? s.cost : s.cost / 12;
      map[s.category] = (map[s.category] || 0) + val;
    });

    return Object.keys(map).map(k => ({
      name: k,
      value: Math.round(map[k])
    }));
  }, [filteredSubs]);

  const yearlyProjectionData = useMemo(() => {
    const trend = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    months.forEach((m, idx) => {
      trend.push({
        name: m,
        Projected: totalMonthlyCost
      });
    });
    return trend;
  }, [totalMonthlyCost]);



  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  if (loading && combinedSubscriptions.length === 0) {
    return (
      <div className="space-y-6 pb-24 animate-fade-in text-slate-100 font-sans relative">
        {/* Header skeleton */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800/40 pb-5">
          <Skeleton className="h-10 w-48 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
        {/* Summary grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton.Card key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 animate-fade-in text-slate-100 font-sans relative">
      
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800/40 pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-100 flex items-center gap-3 tracking-tight">
            <span className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center flex-shrink-0 shadow-lg">
              <Layers size={20} className="text-indigo-400" />
            </span>
            Subscriptions
          </h1>
          <p className="text-slate-400 text-sm mt-1 ml-[52px]">
            Manage and track all recurring SaaS, services, and entertainment accounts
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2 self-stretch md:self-auto">

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={openAdd}
            className="flex-1 md:flex-initial btn-primary px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 font-bold"
          >
            <Plus size={16} />
            <span>Add Subscription</span>
          </motion.button>
        </div>
      </div>

      {/* ── PREMIUM SUMMARY CARDS GRID ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <PremiumSummaryCard
          icon={Calendar}
          label="Monthly commitments"
          value={totalMonthlyCost}
          color="#3b82f6"
          sub="Combined monthly equivalent"
          sparkData={combinedSubscriptions.map(s => s.billingCycle === 'monthly' ? s.cost : s.cost / 12)}
        />
        <PremiumSummaryCard
          icon={Banknote}
          label="Yearly Commitments"
          value={totalYearlyCost}
          color="#10b981"
          sub="Projected annual cost"
          sparkData={combinedSubscriptions.map(s => s.billingCycle === 'monthly' ? s.cost * 12 : s.cost)}
        />
        <PremiumSummaryCard
          icon={Layers}
          label="Active Services"
          value={activeCount}
          color="#8b5cf6"
          sub="Excludes paused & trials"
          sparkData={[1, activeCount]}
        />
        <PremiumSummaryCard
          icon={Clock}
          label="Upcoming Renewals"
          value={upcomingCount}
          color="#f97316"
          sub="Renews in next 14 days"
          sparkData={[0, upcomingCount]}
        />
      </div>

      {/* ── MAIN LAYOUT GRID ── */}
      <div className="space-y-6">
          
          {/* Advanced Filter Box */}
          <div className="card p-5 space-y-4 border-slate-800 bg-slate-900/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <SlidersHorizontal size={12} className="text-slate-500" /> Filter Subscriptions
              </span>
              {(search || filterCategory || filterStatus || filterBillingCycle || filterPaymentMethod || filterMonth || filterPriceRange || filterTag) && (
                <button
                  onClick={handleResetFilters}
                  className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <RotateCcw size={10} /> Reset Filters
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Search text query */}
              <div className="relative col-span-2">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search service name or plan..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="input pl-9.5 text-xs bg-slate-900/50 hover:bg-slate-900 border-slate-700/60 transition-colors"
                />
              </div>

              {/* Status */}
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="select text-xs bg-slate-900/50 hover:bg-slate-900 border-slate-700/60"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="upcoming">Upcoming Renewal</option>
                <option value="soon">Renew Soon</option>
                <option value="expired">Expired</option>
                <option value="trial">Free Trial</option>
                <option value="cancelled">Cancelled</option>
              </select>

              {/* Billing Cycle */}
              <select
                value={filterBillingCycle}
                onChange={e => setFilterBillingCycle(e.target.value)}
                className="select text-xs bg-slate-900/50 hover:bg-slate-900 border-slate-700/60"
              >
                <option value="">All Billing Cycles</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>

              {/* Category */}
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="select text-xs bg-slate-900/50 hover:bg-slate-900 border-slate-700/60"
              >
                <option value="">All Categories</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              {/* Payment Method */}
              <select
                value={filterPaymentMethod}
                onChange={e => setFilterPaymentMethod(e.target.value)}
                className="select text-xs bg-slate-900/50 hover:bg-slate-900 border-slate-700/60"
              >
                <option value="">All Payments</option>
                {PAYMENT_METHODS.map(p => (
                  <option key={p} value={p}>
                    {p.replace('_', ' ').toUpperCase()}
                  </option>
                ))}
              </select>

              {/* Renewal Month */}
              <select
                value={filterMonth}
                onChange={e => setFilterMonth(e.target.value)}
                className="select text-xs bg-slate-900/50 hover:bg-slate-900 border-slate-700/60"
              >
                <option value="">All Months</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i}>
                    {new Date(0, i).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>

              {/* Price Cap */}
              <input
                type="number"
                placeholder="Max price (₹)..."
                value={filterPriceRange}
                onChange={e => setFilterPriceRange(e.target.value)}
                className="input text-xs bg-slate-900/50 hover:bg-slate-900 border-slate-700/60"
              />
            </div>
          </div>

          {/* SUBSCRIPTION CARDS GRID LIST */}
          {filteredSubs.length === 0 ? (
            <EmptyState
              title="No subscriptions found"
              description="Log recurring payments to receive automatic pacing indicators, warning details, and budget projection trends."
              icon={Layers}
              actionText="Add First Subscription"
              onAction={openAdd}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredSubs.map((sub) => {
                  const days = getDaysRemaining(sub.renewalDate);
                  const config = getStatusConfig(sub, days);

                  return (
                    <motion.div
                      key={sub._id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      whileHover={{ y: -4, shadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)' }}
                      transition={{ duration: 0.3 }}
                      className="card hover:border-slate-600/40 transition-all duration-300 flex flex-col justify-between h-full relative overflow-hidden group border border-slate-800 bg-slate-900/20 backdrop-blur-sm"
                      style={{ borderLeft: `3px solid ${sub.color}` }}
                    >
                      {/* Card Content */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <span
                              className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shadow-inner border border-slate-700/20 flex-shrink-0"
                              style={{ backgroundColor: `${sub.color}18` }}
                            >
                              {sub.icon}
                            </span>
                            <div className="truncate">
                              <h3 className="font-extrabold text-sm text-slate-100 tracking-tight leading-tight flex items-center gap-1.5 truncate">
                                {sub.name}
                                {sub.isPinned && <Star size={10} className="fill-amber-400 text-amber-400" />}
                              </h3>
                              <span className="text-[10px] text-slate-400 font-semibold truncate block mt-0.5">
                                {sub.plan}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${config.bg} ${config.text}`}>
                              {config.label}
                            </span>
                            
                            {/* Days counter info */}
                            <span className="text-[9px] font-semibold text-slate-500">
                              {days < 0 ? `Expired ${Math.abs(days)}d ago` : days === 0 ? 'Today' : `${days} days left`}
                            </span>
                          </div>
                        </div>

                        {/* Middle status section */}
                        <div className="flex items-center justify-between text-xs py-2 px-2.5 bg-slate-900/40 rounded-xl border border-slate-800/40">
                          <div>
                            <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">Priority</span>
                            <span className={`text-[10px] font-bold ${
                              sub.priority === 'high' ? 'text-red-400' :
                              sub.priority === 'medium' ? 'text-amber-400' : 'text-slate-400'
                            }`}>
                              {sub.priority.toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">Payments</span>
                            <span className="text-slate-300 text-[10px] font-bold uppercase tracking-wider">
                              {sub.paymentMethod.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-200">
                          <span className="text-base font-extrabold">{fmt(sub.cost)}</span>
                          <span className="text-slate-500">/{sub.billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                        </div>

                        {/* Interactive action controls */}
                        <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEdit(sub)}
                            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-indigo-400 transition-colors"
                            title="Edit"
                          >
                            <Edit3 size={11} />
                          </button>

                          <button
                            onClick={() => handleDelete(sub)}
                            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-rose-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

          {/* DYNAMIC ANALYTICS CHARTS SECTION */}
          {combinedSubscriptions.length > 0 && (
            <div className="card p-6 border-slate-800 space-y-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="font-bold text-slate-100 flex items-center gap-2">
                    <BarChart3 size={16} className="text-indigo-400" /> Subscription Spend Analytics
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium">Real-time analytical graphs mapping commitments</p>
                </div>
                
                <div className="flex rounded-lg bg-slate-900/60 p-0.5 border border-slate-800 self-stretch sm:self-auto text-[10px] font-bold">
                  <button
                    onClick={() => setActiveChartTab('monthly')}
                    className={`px-3 py-1.5 rounded-md transition-colors ${activeChartTab === 'monthly' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Monthly Costs
                  </button>
                  <button
                    onClick={() => setActiveChartTab('categories')}
                    className={`px-3 py-1.5 rounded-md transition-colors ${activeChartTab === 'categories' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Category Breakdown
                  </button>
                  <button
                    onClick={() => setActiveChartTab('projections')}
                    className={`px-3 py-1.5 rounded-md transition-colors ${activeChartTab === 'projections' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Yearly Projections
                  </button>
                </div>
              </div>

              <div className="h-64 w-full">
                {activeChartTab === 'monthly' && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--chart-tooltip-bg)', borderColor: 'var(--chart-tooltip-border)', borderRadius: '12px' }}
                        itemStyle={{ fontSize: '11px', color: 'var(--chart-tooltip-text)' }}
                        labelStyle={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--chart-text)' }}
                      />
                      <Bar dataKey="Cost" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}

                {activeChartTab === 'categories' && (
                  pieChartData.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-xs text-slate-500">
                      No active data breakdown to map.
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 h-full">
                      <div className="w-1/2 h-full min-h-[160px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieChartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={75}
                              paddingAngle={3}
                              dataKey="value"
                              stroke="none"
                            >
                              {pieChartData.map((_, i) => (
                                <Cell key={i} fill={['#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#06b6d4'][i % 7]} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{ backgroundColor: 'var(--chart-tooltip-bg)', borderColor: 'var(--chart-tooltip-border)', borderRadius: '12px' }}
                              itemStyle={{ fontSize: '11px', color: 'var(--chart-tooltip-text)' }}
                              labelStyle={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--chart-text)' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex-1 space-y-1.5 max-h-[180px] overflow-y-auto w-full px-4 text-xs font-semibold">
                        {pieChartData.slice(0, 5).map((d, i) => (
                          <div key={d.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-2 truncate">
                              <div
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ background: ['#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#06b6d4'][i % 7] }}
                              />
                              <span className="text-slate-300 truncate">{d.name}</span>
                            </div>
                            <span className="text-slate-200 font-bold">{fmt(d.value)}/mo</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                )}

                {activeChartTab === 'projections' && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={yearlyProjectionData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--chart-tooltip-bg)', borderColor: 'var(--chart-tooltip-border)', borderRadius: '12px' }}
                        itemStyle={{ fontSize: '11px', color: 'var(--chart-tooltip-text)' }}
                        labelStyle={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--chart-text)' }}
                      />
                      <Area type="monotone" dataKey="Projected" stroke="#10b981" fillOpacity={1} fill="url(#colorProjected)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          )}
        </div>

      {/* ── ADD / EDIT SUBSCRIPTION MODAL ── */}
      <AnimatePresence>
        {modal.open && (
          <Modal
            isOpen={modal.open}
            onClose={closeModal}
            title={modal.mode === 'add' ? 'Setup Subscription' : 'Adjust Subscription'}
            size="md"
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Service Auto matching tips */}
              <div className="border-b border-slate-800 pb-2 mb-3">
                <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
                  Recurring details parameters
                </span>
              </div>

              <div className="form-group">
                <label className="label text-xs">Subscription Service Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Netflix, Spotify Premium, Microsoft 365"
                  value={form.name}
                  onChange={(e) => {
                    const nameVal = e.target.value;
                    const config = getServiceConfig(nameVal);
                    setForm(prev => ({
                      ...prev,
                      name: nameVal,
                      category: config.category || prev.category,
                      plan: config.plan || prev.plan,
                      color: config.color || prev.color,
                      icon: config.icon || prev.icon
                    }));
                  }}
                  className="input text-xs bg-slate-900 border-slate-700/60"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="label text-xs">Billing Cycle</label>
                  <select
                    className="select text-xs bg-slate-900 border-slate-700/60"
                    value={form.billingCycle}
                    onChange={(e) => setForm({ ...form, billingCycle: e.target.value })}
                  >
                    {BILLING_CYCLES.map(cycle => (
                      <option key={cycle} value={cycle}>
                        {cycle.charAt(0).toUpperCase() + cycle.slice(1)} billing
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="label text-xs">Billing Cost (₹) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">₹</span>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={form.cost}
                      onChange={(e) => setForm({ ...form, cost: e.target.value })}
                      className="input pl-7.5 text-xs bg-slate-900 border-slate-700/60"
                      required
                      min="0"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="label text-xs">Renewal / Billing Date *</label>
                  <input
                    type="date"
                    value={form.renewalDate}
                    onChange={(e) => setForm({ ...form, renewalDate: e.target.value })}
                    className="input text-xs bg-slate-900 border-slate-700/60"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="label text-xs">Category Tag</label>
                  <select
                    className="select text-xs bg-slate-900 border-slate-700/60"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="label text-xs">Plan description</label>
                  <input
                    type="text"
                    placeholder="e.g. Family Premium Duo"
                    value={form.plan}
                    onChange={(e) => setForm({ ...form, plan: e.target.value })}
                    className="input text-xs bg-slate-900 border-slate-700/60"
                  />
                </div>

                <div className="form-group">
                  <label className="label text-xs">Linked Payment method</label>
                  <select
                    className="select text-xs bg-slate-900 border-slate-700/60"
                    value={form.paymentMethod}
                    onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                  >
                    {PAYMENT_METHODS.map(pay => (
                      <option key={pay} value={pay}>
                        {pay.replace('_', ' ').toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="label text-xs">Priority</label>
                  <select
                    className="select text-xs bg-slate-900 border-slate-700/60"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  >
                    {PRIORITY_OPTIONS.map(p => (
                      <option key={p} value={p}>{p.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="label text-xs">Appearance Color</label>
                  <div className="flex items-center gap-2 h-11">
                    <input
                      type="color"
                      value={form.color}
                      onChange={(e) => setForm({ ...form, color: e.target.value })}
                      className="w-10 h-8 rounded cursor-pointer border border-slate-800 bg-transparent"
                    />
                    <input
                      type="text"
                      placeholder="Emoji Logo"
                      value={form.icon}
                      onChange={(e) => setForm({ ...form, icon: e.target.value })}
                      className="input text-xs bg-slate-900 border-slate-700/60 h-8 flex-1 py-1"
                    />
                  </div>
                </div>
              </div>



              <div className="flex items-center justify-between p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-slate-200 block">Free Trial account</span>
                  <span className="text-[9px] text-slate-500 block">This represents an active trial before charges apply</span>
                </div>
                <input
                  type="checkbox"
                  checked={form.isFreeTrial}
                  onChange={(e) => setForm({ ...form, isFreeTrial: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-700 accent-indigo-500 bg-slate-900"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-slate-200 block">Reminder Alerts</span>
                  <span className="text-[9px] text-slate-500 block">Enable notification flags before renewal date</span>
                </div>
                <input
                  type="checkbox"
                  checked={form.reminder}
                  onChange={(e) => setForm({ ...form, reminder: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-700 accent-indigo-500 bg-slate-900"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn-secondary flex-1 rounded-xl text-xs py-2.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1 gap-2 rounded-xl text-xs py-2.5 font-bold"
                  disabled={submitting}
                >
                  {submitting ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
                  ) : modal.mode === 'add' ? 'Save Subscription' : 'Update'}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Remove Subscription Record"
        message="Are you sure you want to delete this subscription tracking setup? This action cannot be undone."
        confirmText="Confirm Delete"
        cancelText="Cancel"
        confirmVariant="danger"
        loading={deleteConfirm.loading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null, loading: false })}
      />



    </div>
  );
}
