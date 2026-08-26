import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { DataTable } from '../../components/ui/DataTable';

const SharedBalanceIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 flex-shrink-0">
    <defs>
      {/* Background Gradient */}
      <linearGradient id="shared-balance-bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6366F1" stopOpacity="0.15" />
        <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.10" />
        <stop offset="100%" stopColor="#10B981" stopOpacity="0.10" />
      </linearGradient>
      
      {/* Border Gradient */}
      <linearGradient id="shared-balance-border" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6366F1" stopOpacity="0.5" />
        <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#10B981" stopOpacity="0.5" />
      </linearGradient>

      {/* Indigo-Violet Gradient */}
      <linearGradient id="shared-balance-indigo-violet" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6366F1" />
        <stop offset="100%" stopColor="#8B5CF6" />
      </linearGradient>

      {/* Emerald Gradient */}
      <linearGradient id="shared-balance-emerald" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#10B981" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>

      {/* Glassmorphism Card Gradient */}
      <linearGradient id="shared-balance-glass" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.25" />
        <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.05" />
      </linearGradient>

      {/* Subtle Shadow Filter */}
      <filter id="shared-balance-shadow" x="-20%" y="-20%" width="140%" height="140%" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#090d16" floodOpacity="0.4" />
      </filter>
    </defs>

    {/* Outer Container Background (Rounded-Square with glow) */}
    <rect x="2" y="2" width="44" height="44" rx="14" fill="url(#shared-balance-bg)" stroke="url(#shared-balance-border)" strokeWidth="1.2" />
    
    {/* Glassmorphic sheen border */}
    <rect x="3" y="3" width="42" height="42" rx="13" stroke="white" strokeOpacity="0.08" strokeWidth="1" pointerEvents="none" />

    {/* Sleek Wallet/Shared Card Graphics */}
    {/* 1. The Back Card (Indigo/Violet Gradient) */}
    <rect x="11" y="14" width="22" height="14" rx="3" fill="url(#shared-balance-indigo-violet)" transform="rotate(-6 22 21)" filter="url(#shared-balance-shadow)" />

    {/* 2. The Front Card (Glassmorphism card) */}
    <rect x="15" y="20" width="22" height="14" rx="3" fill="url(#shared-balance-glass)" stroke="white" strokeOpacity="0.2" strokeWidth="0.8" filter="url(#shared-balance-shadow)" />
    
    {/* 3. Mini chip on the front card */}
    <rect x="18" y="23" width="4.5" height="3.5" rx="0.8" fill="url(#shared-balance-emerald)" />
    
    {/* 4. Shared Money Pool (Glowing Emerald Circle/Coin with Plus) */}
    <circle cx="31" cy="29" r="6.5" fill="url(#shared-balance-emerald)" filter="url(#shared-balance-shadow)" />
    
    {/* Plus symbol in the coin */}
    <path d="M31 26.5V31.5M28.5 29H33.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" />

    {/* Connecting Dots/Arches to represent group sharing */}
    <path d="M22 30.5C22 28.5 23.5 27.5 25 27.5" stroke="white" strokeOpacity="0.3" strokeWidth="1" strokeDasharray="1.5 1.5" strokeLinecap="round" />
  </svg>
);

export default function FamilySharing() {
  const [family, setFamily] = useState(null);
  const [loading, setLoading] = useState(true);

  // Extra integration states
  const [wallets, setWallets] = useState([]);
  const [goals, setGoals] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loadingExtra, setLoadingExtra] = useState(true);

  // Form states
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');

  // Request approval modal
  const [showRequest, setShowRequest] = useState(false);
  const [reqTitle, setReqTitle] = useState('');
  const [reqAmount, setReqAmount] = useState('');
  const [reqCategory, setReqCategory] = useState('General');

  // Invite modal
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Search, filter, sorting, pagination for transactions
  const [txSearch, setTxSearch] = useState('');
  const [txSort, setTxSort] = useState('date-desc');
  const [txPage, setTxPage] = useState(1);
  const TX_PER_PAGE = 5;

  const fetchFamily = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/family');
      setFamily(data.data || null);
    } catch {
      toast.error('Failed to load family sharing hub');
    } finally {
      setLoading(false);
    }
  };

  const fetchExtraData = async () => {
    setLoadingExtra(true);
    try {
      const [walletsRes, goalsRes, expensesRes] = await Promise.all([
        api.get('/wallets'),
        api.get('/goals'),
        api.get('/expenses')
      ]);
      setWallets(walletsRes.data.data || walletsRes.data || []);
      setGoals(goalsRes.data.data || goalsRes.data || []);
      setExpenses(expensesRes.data.data?.expenses || expensesRes.data?.expenses || []);
    } catch (e) {
      console.warn('Failed to load shared wallet & goal context:', e);
    } finally {
      setLoadingExtra(false);
    }
  };

  useEffect(() => {
    fetchFamily();
    fetchExtraData();
  }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email) return toast.error('Please enter an email address');
    try {
      const { data } = await api.post('/family/invite', { email, role });
      toast.success(`Invite sent to ${email}!`);
      setEmail('');
      setFamily(data.data);
      setShowInviteModal(false);
      fetchFamily();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to send invite');
    }
  };

  const handleRequestApproval = async (e) => {
    e.preventDefault();
    if (!reqTitle || !reqAmount) return toast.error('Please enter title and amount');
    try {
      await api.post('/family/approval-request', {
        title: reqTitle,
        amount: Number(reqAmount),
        category: reqCategory
      });
      toast.success('Approval request submitted!');
      setShowRequest(false);
      setReqTitle('');
      setReqAmount('');
      fetchFamily();
    } catch {
      toast.error('Failed to submit request');
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.post(`/family/approve/${id}`);
      toast.success('Request approved successfully!');
      fetchFamily();
    } catch {
      toast.error('Failed to approve request');
    }
  };

  const handleReject = async (id) => {
    try {
      await api.post(`/family/reject/${id}`);
      toast.success('Request rejected');
      fetchFamily();
    } catch {
      toast.error('Failed to reject request');
    }
  };

  // ── Runtime Data Normalization & Safeties ──────────────────────────────────
  const safeMembers = useMemo(() => {
    if (!family || !Array.isArray(family.members)) return [];
    return family.members.map((m) => ({
      _id: m._id || Math.random().toString(),
      email: m.email || '',
      role: m.role || 'member',
      status: m.status || 'pending',
    }));
  }, [family]);

  const activeMembers = useMemo(() => {
    return safeMembers.filter((m) => m.status === 'accepted');
  }, [safeMembers]);

  const pendingInvites = useMemo(() => {
    return safeMembers.filter((m) => m.status === 'pending');
  }, [safeMembers]);

  const safeApprovals = useMemo(() => {
    if (!family || !Array.isArray(family.approvals)) return [];
    return family.approvals.map((a) => ({
      _id: a._id || Math.random().toString(),
      title: a.title || 'Untitled Request',
      requesterEmail: a.requesterEmail || '',
      amount: Number(a.amount ?? 0),
      status: a.status || 'pending',
    }));
  }, [family]);

  const safeGoals = useMemo(() => {
    const list = Array.isArray(goals) ? goals : (goals?.goals || []);
    return list.map((g) => ({
      _id: g._id || Math.random().toString(),
      title: g.title || 'Untitled Goal',
      targetAmount: Number(g.targetAmount ?? 0),
      savedAmount: Number(g.savedAmount ?? g.currentAmount ?? 0),
      deadline: g.deadline || g.targetDate || '',
    }));
  }, [goals]);

  const safeWallets = useMemo(() => {
    const list = Array.isArray(wallets) ? wallets : [];
    return list.map((w) => ({
      _id: w._id || Math.random().toString(),
      name: w.name || 'Unnamed Wallet',
      balance: Number(w.balance ?? 0),
      isPrimary: !!w.isPrimary,
    }));
  }, [wallets]);

  const safeExpenses = useMemo(() => {
    const list = Array.isArray(expenses) ? expenses : [];
    return list.map((e) => ({
      _id: e._id || Math.random().toString(),
      title: e.title || 'Untitled Expense',
      amount: Number(e.amount ?? 0),
      date: e.date || new Date().toISOString(),
      category: e.category || null,
    }));
  }, [expenses]);

  // ── Metrics calculations ──────────────────────────────────────────────────
  const stats = useMemo(() => {
    const membersCount = safeMembers.length;
    const pendingCount = safeApprovals.filter((a) => a.status === 'pending').length;
    const approvedSum = safeApprovals
      .filter((a) => a.status === 'approved')
      .reduce((sum, a) => sum + a.amount, 0);
    const balanceSum = safeWallets.reduce((sum, w) => sum + w.balance, 0);

    return {
      members: membersCount,
      sharedBalance: balanceSum,
      sharedExpenses: approvedSum,
      pendingRequests: pendingCount,
    };
  }, [safeMembers, safeApprovals, safeWallets]);

  // ── Filtered & sorted transactions ────────────────────────────────────────
  const filteredExpenses = useMemo(() => {
    return safeExpenses
      .filter((exp) => {
        const matchesSearch = !txSearch ||
          exp.title.toLowerCase().includes(txSearch.toLowerCase()) ||
          exp.description?.toLowerCase().includes(txSearch.toLowerCase());
        return matchesSearch;
      })
      .sort((a, b) => {
        if (txSort === 'date-desc') return new Date(b.date) - new Date(a.date);
        if (txSort === 'date-asc') return new Date(a.date) - new Date(b.date);
        if (txSort === 'amount-desc') return b.amount - a.amount;
        if (txSort === 'amount-asc') return a.amount - b.amount;
        return 0;
      });
  }, [safeExpenses, txSearch, txSort]);

  const paginatedExpenses = useMemo(() => {
    const start = (txPage - 1) * TX_PER_PAGE;
    return filteredExpenses.slice(start, start + TX_PER_PAGE);
  }, [filteredExpenses, txPage]);

  const totalTxPages = Math.ceil(filteredExpenses.length / TX_PER_PAGE);

  // ── Member contribution breakdown ──────────────────────────────────────────
  const memberContributions = useMemo(() => {
    const totals = {};
    let grandTotal = 0;

    safeApprovals
      .filter((a) => a.status === 'approved')
      .forEach((a) => {
        totals[a.requesterEmail] = (totals[a.requesterEmail] || 0) + a.amount;
        grandTotal += a.amount;
      });

    return activeMembers.map((m, idx) => {
      const amount = totals[m.email] || 0;
      const pct = grandTotal > 0 ? Math.round((amount / grandTotal) * 100) : 0;
      const colors = ['bg-indigo-500', 'bg-emerald-500', 'bg-orange-500', 'bg-rose-500'];
      return {
        email: m.email,
        amount,
        pct,
        color: colors[idx % colors.length],
      };
    });
  }, [safeApprovals, activeMembers]);

  // Framer Motion Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
  };

  // If loading primary family details
  if (loading && !family) {
    return (
      <div className="space-y-6 pb-20 animate-fade-in">
        {/* Banner skeleton */}
        <Skeleton className="h-28 w-full" />
        
        {/* Hub content split grid skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-60 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // ── Empty Onboarding State (If only 1 member exists) ──────────────────────
  const isWorkspaceEmpty = safeMembers.length <= 1;

  return (
    <div className="space-y-6 pb-20">
      {/* ── Page Hero Header ── */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-700/50 bg-gradient-to-r from-indigo-500/10 via-slate-900/50 to-slate-900 p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl">
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div>
          <div className="flex items-center gap-3">
            <span className="text-3xl">👨‍👩‍👧‍👦</span>
            <h1 className="text-2xl md:text-3xl font-black text-slate-100 tracking-tight">Family Sharing Workspace</h1>
          </div>
          <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-xl">
            Collaborate on budgets, review pending expense requests, and manage shared wallets together in one premium workspace.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
          <button
            onClick={() => setShowRequest(true)}
            className="flex-1 md:flex-none btn bg-slate-900/60 border border-slate-800 text-slate-200 hover:text-white hover:border-slate-700 text-xs px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer"
          >
            Request Approval
          </button>
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex-1 md:flex-none btn bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs px-5 py-2.5 rounded-xl font-black shadow-lg transition-all cursor-pointer"
          >
            + Invite Member
          </button>
        </div>
      </div>

      {isWorkspaceEmpty ? (
        // ── Premium Setup empty state ──
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card text-center py-16 px-6 max-w-2xl mx-auto space-y-6 border-dashed border-indigo-500/30"
        >
          <div className="text-6xl mx-auto w-24 h-24 rounded-3xl bg-indigo-500/10 flex items-center justify-center animate-pulse">
            🤝
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-slate-100">Set Up Your Family Workspace</h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Invite your partner, children, or roommates to start splitting payments, sharing savings goals, and automating budget reviews.
            </p>
          </div>
          <div>
            <button
              onClick={() => setShowInviteModal(true)}
              className="btn bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-extrabold px-8 py-3 rounded-xl shadow-xl transition-all cursor-pointer"
            >
              Invite Family Members
            </button>
          </div>
        </motion.div>
      ) : (
        // ── Main Dashboard Layout ──
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          {/* ── 4 Stat Cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Members',       value: `${stats.members} Members`, icon: '👥', color: 'text-indigo-400',   glow: 'from-indigo-500/5 to-transparent' },
              { label: 'Shared Balance',      value: `₹${stats.sharedBalance.toLocaleString('en-IN')}`, icon: <SharedBalanceIcon />, color: 'text-emerald-400',  glow: 'from-emerald-500/5 to-transparent' },
              { label: 'Monthly Shared Spend', value: `₹${stats.sharedExpenses.toLocaleString('en-IN')}`, icon: '📉', color: 'text-rose-400',     glow: 'from-rose-500/5 to-transparent' },
              { label: 'Pending Requests',    value: `${stats.pendingRequests} Pending`, icon: '⌛', color: 'text-orange-400',   glow: 'from-orange-500/5 to-transparent' },
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                className="relative overflow-hidden card p-5 flex items-center gap-4 hover:scale-[1.02] hover:border-slate-600/50 transition-all duration-300 group cursor-default"
              >
                <div className="absolute inset-0 bg-gradient-to-br opacity-50 group-hover:opacity-100 transition-opacity" style={{ background: stat.glow }} />
                {typeof stat.icon === 'string' ? (
                  <span className="text-3xl select-none relative z-10 w-12 h-12 flex items-center justify-center">{stat.icon}</span>
                ) : (
                  <div className="relative z-10 flex-shrink-0 w-12 h-12 flex items-center justify-center">{stat.icon}</div>
                )}
                <div className="relative z-10 min-w-0">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
                  <p className={`text-base font-extrabold mt-0.5 font-mono truncate ${stat.color}`}>{stat.value}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* ── Two Column Grid ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left 70% Column */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Section 1: Family Members */}
              <div className="card space-y-5 shadow-xl">
                <div className="pb-3 border-b border-slate-700/50 flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-black text-slate-100 flex items-center gap-1.5">👥 Workspace Directory</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Active family group members and administration roles</p>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-2 py-0.5">
                    Hub Name: {family?.name}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {activeMembers.map((member) => {
                    const colors = ['from-indigo-500 to-violet-600', 'from-emerald-500 to-teal-600', 'from-orange-500 to-amber-500'];
                    const hash = member.email.charCodeAt(0) + member.email.charCodeAt(1);
                    const grad = colors[hash % colors.length];

                    return (
                      <div key={member._id} className="relative group border border-slate-800/80 bg-slate-900/10 hover:bg-slate-900/30 hover:border-slate-700/50 rounded-2xl p-4 transition-all duration-300 flex items-start gap-4">
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${grad} flex items-center justify-center font-black text-white text-lg`}>
                            {member.email[0].toUpperCase()}
                          </div>
                          <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-950 rounded-full" title="Online" />
                        </div>

                        {/* Details */}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black text-slate-200 truncate">{member.email}</p>
                          <div className="flex gap-1.5 items-center mt-1 flex-wrap">
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              member.role === 'owner' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                              member.role === 'admin' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                              'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}>
                              {member.role}
                            </span>
                            <span className="text-xs text-slate-500">Joined</span>
                          </div>
                        </div>

                        {/* View Action buttons */}
                        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <button className="p-1 bg-slate-800 hover:bg-slate-800 text-slate-400 rounded-lg text-xs" title="View details">👁️</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 2: Expense Contributions */}
              <div className="card space-y-5 shadow-xl">
                <div>
                  <h3 className="text-sm font-black text-slate-100">📊 Contribution Metrics</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Share of monthly shared expenses computed by requester</p>
                </div>

                <div className="space-y-4">
                  {memberContributions.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4">No approved expenses logged yet.</p>
                  ) : (
                    memberContributions.map((contrib, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-300 truncate max-w-[200px]">{contrib.email}</span>
                          <span className="text-slate-400 font-mono">₹{contrib.amount.toLocaleString('en-IN')} ({contrib.pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${contrib.pct}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className={`h-full rounded-full ${contrib.color}`}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Section 3: Shared Goals */}
              <div className="card space-y-5 shadow-xl">
                <div>
                  <h3 className="text-sm font-black text-slate-100">🎯 Shared Savings Goals</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Track group milestones and mutual savings targets</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {safeGoals.length === 0 ? (
                    <div className="col-span-full py-8 text-center text-slate-500 text-xs">
                      No savings goals defined. Start tracking savings from the Goals dashboard.
                    </div>
                  ) : (
                    safeGoals.slice(0, 4).map((goal) => {
                      const pct = goal.targetAmount > 0 ? Math.min(Math.round((goal.savedAmount / goal.targetAmount) * 100), 100) : 0;
                      return (
                        <div key={goal._id} className="bg-slate-900/20 border border-slate-800/80 rounded-2xl p-4 space-y-3 hover:border-slate-700/50 transition-colors">
                          <div className="flex justify-between items-start">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xl">
                              🎯
                            </div>
                            <span className="text-xs font-mono font-bold text-indigo-400">{pct}%</span>
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-slate-200 truncate">{goal.title}</h4>
                            <p className="text-xs text-slate-500 mt-0.5">Target: ₹{goal.targetAmount.toLocaleString('en-IN')}</p>
                          </div>

                          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>

                          <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                            <span>Saved: ₹{goal.savedAmount.toLocaleString('en-IN')}</span>
                            <span>{goal.deadline ? new Date(goal.deadline).toLocaleDateString('en-IN') : 'No date'}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>

            {/* Right 30% Column */}
            <div className="space-y-6">

              {/* Expense Approval Ledger */}
              <div className="card space-y-4 shadow-xl">
                <div>
                  <h3 className="text-sm font-black text-slate-100">⚖️ Expense Approvals</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Pending validation and payout authorizations</p>
                </div>

                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin">
                  {safeApprovals.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-6">No approvals logged yet.</p>
                  ) : (
                    safeApprovals.map((req) => (
                      <div key={req._id} className="bg-slate-900/30 border border-slate-800 rounded-xl p-3.5 space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-black text-slate-200 truncate">{req.title}</p>
                            <p className="text-xs text-slate-500 truncate mt-0.5">From: {req.requesterEmail}</p>
                          </div>
                          <span className="text-sm font-extrabold text-indigo-400 font-mono">₹{req.amount.toLocaleString('en-IN')}</span>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-slate-800/60 text-xs">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            req.status === 'rejected' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                            'bg-orange-500/10 text-orange-405 border border-orange-500/20'
                          }`}>
                            {req.status}
                          </span>

                          {req.status === 'pending' && (
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => handleApprove(req._id)}
                                className="px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500 hover:text-slate-950 font-bold transition-all cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(req._id)}
                                className="px-2 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg hover:bg-rose-500 hover:text-white font-bold transition-all cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Pending Invitations list */}
              {pendingInvites.length > 0 && (
                <div className="card space-y-4 shadow-xl border-dashed border-orange-500/30">
                  <div>
                    <h3 className="text-sm font-black text-slate-100 flex items-center gap-1.5">⌛ Pending Invitations</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Awaiting verification from invited family members</p>
                  </div>

                  <div className="space-y-2.5">
                    {pendingInvites.map((invite) => (
                      <div key={invite._id} className="bg-slate-900/30 border border-slate-800 rounded-xl p-3 flex justify-between items-center gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-200 truncate">{invite.email}</p>
                          <p className="text-xs text-slate-500 mt-0.5">Role: {invite.role}</p>
                        </div>
                        <span className="text-[10px] font-black uppercase bg-orange-500/10 text-orange-400 border border-orange-500/25 px-2 py-0.5 rounded-full">
                          Sent
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Activity Feed */}
              <div className="card space-y-4 shadow-xl">
                <div>
                  <h3 className="text-sm font-black text-slate-100">📜 Activity Log</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Timeline of changes in the workspace</p>
                </div>

                <div className="relative space-y-4 pl-4 border-l border-slate-800/80">
                  {[
                    { text: 'Workspace sync completed', time: 'Just now', icon: '🟢' },
                    { text: 'Aditya added ₹500 to savings', time: 'Yesterday', icon: '💰' },
                    { text: 'Prarthana updated Food budget', time: '3 days ago', icon: '🍔' },
                  ].map((act, i) => (
                    <div key={i} className="relative space-y-0.5">
                      <span className="absolute -left-[21px] top-1 bg-slate-900 text-xs">{act.icon}</span>
                      <p className="text-xs font-semibold text-slate-300 leading-tight">{act.text}</p>
                      <p className="text-xs text-slate-500">{act.time}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>

          {/* ── Bottom Section: Shared Wallets ── */}
          <div className="card space-y-5 shadow-xl">
            <div>
              <h3 className="text-sm font-black text-slate-100">👛 Shared Wallets</h3>
              <p className="text-xs text-slate-400 mt-0.5">Digital wallets and checking assets mapped to this workspace</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {safeWallets.length === 0 ? (
                <div className="col-span-full py-8 text-center text-slate-500 text-xs">
                  No active wallets found. Setup wallets inside the Wallets dashboard.
                </div>
              ) : (
                safeWallets.map((wallet) => (
                  <div key={wallet._id} className="relative overflow-hidden bg-slate-900/35 border border-slate-800/80 hover:border-indigo-500/30 rounded-2xl p-4.5 space-y-3 transition-all hover:scale-[1.02] cursor-default">
                    <div className="flex justify-between items-center">
                      <span className="text-2xl">👛</span>
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        wallet.isPrimary ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-slate-800 text-slate-500'
                      }`}>
                        {wallet.isPrimary ? 'Primary' : 'Secondary'}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-200 truncate">{wallet.name}</h4>
                      <p className="text-lg font-black text-slate-100 font-mono mt-1">₹{wallet.balance.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── Recent Transactions Table ── */}
          <div className="card space-y-5 shadow-xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-3 border-b border-slate-700/40">
              <div>
                <h3 className="text-sm font-black text-slate-100">🧾 Workspace Ledger</h3>
                <p className="text-xs text-slate-400 mt-0.5">Chronological record of transactions recorded on the tracker</p>
              </div>

              {/* Filter controls */}
              <div className="flex gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Search ledger..."
                  value={txSearch}
                  onChange={e => { setTxSearch(e.target.value); setTxPage(1); }}
                  className="bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all flex-1 sm:flex-none sm:w-48"
                />
                <select
                  value={txSort}
                  onChange={e => { setTxSort(e.target.value); setTxPage(1); }}
                  className="bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
                >
                  <option value="date-desc">Newest first</option>
                  <option value="date-asc">Oldest first</option>
                  <option value="amount-desc">Highest amount</option>
                  <option value="amount-asc">Lowest amount</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-800/80">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-900/40 border-b border-slate-800 text-slate-400 font-bold">
                    <th className="px-4 py-3">Item / Description</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {paginatedExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-500 font-semibold">
                        No transactions match your filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedExpenses.map((tx) => (
                      <tr key={tx._id} className="hover:bg-slate-900/10 transition-colors">
                        <td className="px-4 py-3.5 font-bold text-slate-200">{tx.title}</td>
                        <td className="px-4 py-3.5 text-slate-400">
                          <span className="bg-indigo-500/5 text-indigo-400 border border-indigo-500/15 px-2 py-0.5 rounded-full font-bold">
                            {tx.category?.name || 'General'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-mono font-extrabold text-slate-100">
                          ₹{tx.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3.5 text-slate-500">
                          {new Date(tx.date).toLocaleDateString('en-IN')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Pagination */}
            {totalTxPages > 1 && (
              <div className="flex justify-center items-center gap-2 pt-2">
                <button
                  disabled={txPage === 1}
                  onClick={() => setTxPage(p => Math.max(p - 1, 1))}
                  className="bg-slate-900/40 border border-slate-800 text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-75 disabled:pointer-events-none transition-all cursor-pointer"
                >
                  ←
                </button>
                <span className="text-xs text-slate-400 font-bold px-1">Page {txPage} of {totalTxPages}</span>
                <button
                  disabled={txPage === totalTxPages}
                  onClick={() => setTxPage(p => Math.min(p + 1, totalTxPages))}
                  className="bg-slate-900/40 border border-slate-800 text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-75 disabled:pointer-events-none transition-all cursor-pointer"
                >
                  →
                </button>
              </div>
            )}
          </div>

        </motion.div>
      )}

      {/* ── Request Expense Approval Modal ── */}
      <AnimatePresence>
        {showRequest && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="card w-full max-w-md space-y-4 max-h-[90dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl my-auto border border-slate-800"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
                <h3 className="font-black text-slate-100">Request Expense Approval</h3>
                <button onClick={() => setShowRequest(false)} className="text-slate-400 hover:text-slate-200 cursor-pointer text-sm">✕</button>
              </div>
              <form onSubmit={handleRequestApproval} className="space-y-4">
                <div className="form-group">
                  <label className="label">Item Name / Title</label>
                  <input
                    type="text"
                    value={reqTitle}
                    onChange={(e) => setReqTitle(e.target.value)}
                    placeholder="e.g. Science Class Books, Weekly Groceries"
                    className="input"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="label">Category</label>
                    <select value={reqCategory} onChange={(e) => setReqCategory(e.target.value)} className="select">
                      <option value="Education">Education</option>
                      <option value="Food & Dining">Food & Dining</option>
                      <option value="Utilities">Utilities</option>
                      <option value="Entertainment">Entertainment</option>
                      <option value="Shopping">Shopping</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="label">Estimated Amount (₹)</label>
                    <input
                      type="number"
                      value={reqAmount}
                      onChange={(e) => setReqAmount(e.target.value)}
                      placeholder="0.00"
                      className="input"
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowRequest(false)} className="btn bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs px-4 py-2">
                    Cancel
                  </button>
                  <button type="submit" className="btn bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-extrabold text-xs px-5 py-2">
                    Submit Request
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Invite Member Modal ── */}
      <AnimatePresence>
        {showInviteModal && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="card w-full max-w-md space-y-4 max-h-[90dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl my-auto border border-slate-800"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
                <h3 className="font-black text-slate-100">Invite Workspace Member</h3>
                <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-slate-200 cursor-pointer text-sm">✕</button>
              </div>

              <form onSubmit={handleInvite} className="space-y-4">
                <div className="form-group">
                  <label className="label">Invite Family Member (Email)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="family@gmail.com"
                    className="input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="label">Workspace Role</label>
                  <select value={role} onChange={(e) => setRole(e.target.value)} className="select">
                    <option value="member">Member</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowInviteModal(false)} className="btn bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs px-4 py-2">
                    Cancel
                  </button>
                  <button type="submit" className="btn bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-extrabold text-xs px-5 py-2">
                    Send Invitation
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
