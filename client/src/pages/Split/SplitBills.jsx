import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../hooks/useDialog';
import { motion, AnimatePresence } from 'framer-motion';

export default function SplitBills() {
  const { user } = useAuth();
  const { showConfirm } = useDialog();
  const [splits, setSplits] = useState([]);
  const [loading, setLoading] = useState(true);

  // New split multi-step modal
  const [showCreate, setShowCreate] = useState(false);
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [groupName, setGroupName] = useState('Restaurant');
  const [memberEmails, setMemberEmails] = useState('');
  const [splitMethod, setSplitMethod] = useState('Equal'); // Visual only selector

  // Search, filter, sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [expandedBillId, setExpandedBillId] = useState(null);

  const fetchSplits = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/splits');
      setSplits(data.data || []);
    } catch {
      toast.error('Failed to load splits history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSplits();
  }, []);

  // ── Runtime Data Normalization & Safeties ──────────────────────────────────
  const safeSplits = useMemo(() => {
    if (!Array.isArray(splits)) return [];
    return splits.map((s) => ({
      _id: s._id || Math.random().toString(),
      title: s.title || 'Untitled Split',
      amount: Number(s.amount ?? 0),
      groupName: s.groupName || 'Restaurant',
      status: s.status || 'pending',
      creator: s.creator || { name: 'Unknown Creator', email: '' },
      members: Array.isArray(s.members)
        ? s.members.map((m) => ({
            _id: m._id || Math.random().toString(),
            userEmail: m.userEmail || '',
            share: Number(m.share ?? 0),
            paid: !!m.paid,
            status: m.status || 'pending',
          }))
        : [],
      createdAt: s.createdAt || new Date().toISOString(),
    }));
  }, [splits]);

  // ── Filtered & sorted splits ──────────────────────────────────────────────
  const filteredSplits = useMemo(() => {
    return safeSplits.filter((s) => {
      const matchesSearch =
        !searchQuery ||
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.creator.name.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = categoryFilter === 'All' || s.groupName === categoryFilter;
      const matchesStatus = statusFilter === 'All' || s.status === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [safeSplits, searchQuery, categoryFilter, statusFilter]);

  // ── Summary Cards metrics ────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!user) return { owe: 0, owed: 0, outstanding: 0, settled: 0 };
    const myEmail = user.email.toLowerCase();

    let youOwe = 0;
    let youAreOwed = 0;
    let settledSum = 0;

    safeSplits.forEach((s) => {
      const isCreator = s.creator?.email?.toLowerCase() === myEmail;
      
      // Calculate you owe (if you are a member and have not paid)
      s.members.forEach((m) => {
        const isMe = m.userEmail.toLowerCase() === myEmail;
        if (isMe && m.status === 'pending') {
          youOwe += m.share;
        }
        if (isCreator && m.userEmail.toLowerCase() !== myEmail && m.status === 'pending') {
          youAreOwed += m.share;
        }
        if (m.status === 'settled') {
          settledSum += m.share;
        }
      });
    });

    return {
      owe: youOwe,
      owed: youAreOwed,
      outstanding: youAreOwed - youOwe,
      settled: settledSum,
    };
  }, [safeSplits, user]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!title || !amount || !memberEmails) {
      return toast.error('Please enter title, amount, and member emails');
    }

    const emailList = memberEmails
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);

    if (emailList.length === 0) return toast.error('Please provide at least one valid member email');

    // Calculate equal split shares
    const memberCount = emailList.length + 1; // plus creator
    const splitShare = Number(amount) / memberCount;

    const formattedMembers = emailList.map((email) => ({
      userEmail: email,
      share: splitShare,
      paid: false,
      status: 'pending',
    }));

    try {
      await api.post('/splits', {
        title,
        amount: Number(amount),
        groupName,
        members: formattedMembers,
      });
      toast.success('Split bill created successfully!');
      setShowCreate(false);
      setStep(1);
      setTitle('');
      setAmount('');
      setMemberEmails('');
      fetchSplits();
    } catch {
      toast.error('Failed to log split bill');
    }
  };

  const handleSettle = async (splitId, memberEmail) => {
    try {
      await api.post(`/splits/${splitId}/settle`, { memberEmail });
      toast.success(`Settled share for ${memberEmail}`);
      fetchSplits();
    } catch {
      toast.error('Failed to settle share');
    }
  };

  const handleDeleteSplit = async (splitId) => {
    const confirmed = await showConfirm({
      title: 'Delete Settled Bill',
      message: 'Are you sure you want to permanently delete this settled split bill? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await api.delete(`/splits/${splitId}`);
      toast.success('Split bill deleted successfully');
      fetchSplits();
    } catch {
      toast.error('Failed to delete split bill');
    }
  };

  const toggleExpandBill = (id) => {
    setExpandedBillId(expandedBillId === id ? null : id);
  };

  // Group badges mapping
  const CATEGORY_ICONS = {
    Restaurant: '🍔',
    Trip: '✈️',
    'Room Rent': '🏠',
    Friends: '🍻',
    Office: '💼',
  };

  return (
    <div className="space-y-6 pb-20">
      {/* ── Page Header ── */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-700/50 bg-gradient-to-r from-indigo-500/10 via-slate-900/50 to-slate-900 p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl">
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div>
          <div className="flex items-center gap-3">
            <span className="text-3xl">🧮</span>
            <h1 className="text-2xl md:text-3xl font-black text-slate-100 tracking-tight">Split Bills Workspace</h1>
          </div>
          <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-xl">
            Track, split, settle, and manage shared bills and payments seamlessly with your friends and group workspaces.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
          <button
            onClick={() => {
              setTitle('');
              setAmount('');
              setMemberEmails('');
              setStep(1);
              setShowCreate(true);
            }}
            className="flex-1 md:flex-none btn bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs px-5 py-2.5 rounded-xl font-black shadow-lg transition-all cursor-pointer"
          >
            + New Split Bill
          </button>
        </div>
      </div>

      {/* ── Summary Cards Metrics ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Net Balance',
            value: `${stats.outstanding >= 0 ? '+' : ''}₹${stats.outstanding.toLocaleString('en-IN')}`,
            icon: '💵',
            color: stats.outstanding >= 0 ? 'text-emerald-450' : 'text-rose-400',
            glow: stats.outstanding >= 0 ? 'from-emerald-500/5 to-transparent' : 'from-rose-500/5 to-transparent',
          },
          {
            label: 'You Owe',
            value: `₹${stats.owe.toLocaleString('en-IN')}`,
            icon: '📉',
            color: 'text-rose-450',
            glow: 'from-rose-500/5 to-transparent',
          },
          {
            label: 'You Are Owed',
            value: `₹${stats.owed.toLocaleString('en-IN')}`,
            icon: '📈',
            color: 'text-emerald-450',
            glow: 'from-emerald-500/5 to-transparent',
          },
          {
            label: 'Settled Payments',
            value: `₹${stats.settled.toLocaleString('en-IN')}`,
            icon: '✅',
            color: 'text-indigo-400',
            glow: 'from-indigo-500/5 to-transparent',
          },
        ].map((stat, idx) => (
          <div
            key={idx}
            className="relative overflow-hidden card p-5 flex items-center gap-4 hover:scale-[1.02] hover:border-slate-650 transition-all duration-300 group cursor-default"
          >
            <div className="absolute inset-0 bg-gradient-to-br opacity-50 group-hover:opacity-100 transition-opacity" style={{ background: stat.glow }} />
            <span className="text-3xl select-none relative z-10">{stat.icon}</span>
            <div className="relative z-10 min-w-0">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
              <p className={`text-base font-extrabold mt-0.5 font-mono truncate ${stat.color}`}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="card h-48 animate-pulse bg-slate-800/40" />
            <div className="card h-48 animate-pulse bg-slate-800/40" />
          </div>
          <div className="card h-96 animate-pulse bg-slate-800/40" />
        </div>
      ) : safeSplits.length === 0 ? (
        // ── Empty Onboarding State ──
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card text-center py-16 px-6 max-w-2xl mx-auto space-y-6 border-dashed border-indigo-500/30"
        >
          <div className="text-6xl mx-auto w-24 h-24 rounded-3xl bg-indigo-500/10 flex items-center justify-center animate-pulse">
            🧮
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-slate-100">No Shared Bills Yet</h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Create your first shared check, divide trip expenses, or split utilities with your friends to track balances.
            </p>
          </div>
          <div>
            <button
              onClick={() => setShowCreate(true)}
              className="btn bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-extrabold px-8 py-3 rounded-xl shadow-xl transition-all cursor-pointer"
            >
              Create Split Bill
            </button>
          </div>
        </motion.div>
      ) : (
        // ── Main Workspace Grid ──
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Bills directory */}
          <div className="lg:col-span-2 space-y-5">
            {/* Filter Hub */}
            <div className="card p-4 flex flex-col sm:flex-row justify-between gap-3 items-center">
              <div className="flex gap-2 items-center w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Search shared bills..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-150 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all w-full sm:w-48"
                />
              </div>

              <div className="flex gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar">
                {['All', 'Restaurant', 'Trip', 'Room Rent', 'Friends', 'Office'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                      categoryFilter === cat
                        ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                        : 'bg-slate-900/40 text-slate-400 border border-slate-800/80 hover:text-slate-200'
                    }`}
                  >
                    {CATEGORY_ICONS[cat] || '📂'} {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="space-y-4">
              {filteredSplits.map((split) => {
                const creatorName = split.creator?.name || 'You';
                const isExpanded = expandedBillId === split._id;
                const isCreator = split.creator?._id === user?._id || split.creator?.email?.toLowerCase() === user?.email?.toLowerCase();

                // Progress math
                const totalMembers = split.members.length;
                const settledMembers = split.members.filter((m) => m.paid).length;
                const progressPct = totalMembers > 0 ? Math.round((settledMembers / totalMembers) * 100) : 0;

                return (
                  <div
                    key={split._id}
                    className="relative overflow-hidden card border border-slate-800/80 bg-slate-900/10 hover:bg-slate-900/20 p-5 space-y-4 transition-all duration-300 shadow-xl"
                  >
                    {/* Top Row */}
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xl">
                          {CATEGORY_ICONS[split.groupName] || '📂'}
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-slate-100">{split.title}</h3>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Category: {split.groupName} • Paid by: {creatorName}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            split.status === 'settled'
                              ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20'
                              : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                          }`}
                        >
                          {split.status}
                        </span>
                        
                        {split.status === 'settled' && isCreator && (
                          <button
                            onClick={() => handleDeleteSplit(split._id)}
                            className="p-1.5 bg-rose-500/10 hover:bg-rose-500 hover:text-white border border-rose-500/20 text-rose-400 rounded-lg text-xs cursor-pointer transition-all flex items-center justify-center"
                            title="Delete Settled Split"
                          >
                            🗑️
                          </button>
                        )}

                        <button
                          onClick={() => toggleExpandBill(split._id)}
                          className="p-1.5 bg-slate-900/60 hover:bg-slate-850 border border-slate-800 text-slate-400 rounded-lg text-xs cursor-pointer"
                        >
                          {isExpanded ? '▲' : '▼'}
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar & Summary */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-bold text-slate-500">
                        <span>Settlement Progress</span>
                        <span>
                          {settledMembers}/{totalMembers} Settled ({progressPct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-850">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Bottom stats row */}
                    <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-850/50">
                      <div>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Total Bill</p>
                        <p className="text-sm font-black text-slate-200">₹{split.amount.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Created Date</p>
                        <p className="text-[10px] text-slate-400">{new Date(split.createdAt).toLocaleDateString('en-IN')}</p>
                      </div>
                    </div>

                    {/* Expanded details container */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden space-y-3 pt-3 border-t border-slate-850/50"
                        >
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Workspace Debts Ledger</p>
                          <div className="space-y-2">
                            {split.members.map((member) => (
                              <div
                                key={member._id}
                                className="flex justify-between items-center bg-slate-900/30 border border-slate-850 p-2.5 rounded-xl text-xs"
                              >
                                <span className="text-slate-300 font-medium truncate max-w-[200px]">{member.userEmail}</span>
                                <div className="flex items-center gap-3">
                                  <span className="font-extrabold text-slate-100 font-mono">
                                    ₹{Math.round(member.share).toLocaleString('en-IN')}
                                  </span>

                                  {member.status === 'pending' ? (
                                    <button
                                      onClick={() => handleSettle(split._id, member.userEmail)}
                                      className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg hover:bg-indigo-600 hover:text-slate-950 font-black transition-all text-[9px] cursor-pointer"
                                    >
                                      Settle Debt
                                    </button>
                                  ) : (
                                    <span className="text-emerald-450 text-[9px] font-black uppercase bg-emerald-500/10 border border-emerald-500/15 px-2 py-0.5 rounded-full">
                                      Settled
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Settlement feed & Quick Actions */}
          <div className="space-y-6">
            {/* Quick Actions Grid */}
            <div className="card space-y-4 shadow-xl">
              <div>
                <h3 className="text-sm font-black text-slate-100">⚡ Split Shortcuts</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Quick split presets and workspace configurations</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { title: 'Split Evenly', icon: '⚖️' },
                  { title: 'Split Exact', icon: '📝' },
                  { title: 'Split by %', icon: '📊' },
                  { title: 'Settle All', icon: '🤝' },
                ].map((act, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setTitle('');
                      setAmount('');
                      setMemberEmails('');
                      setStep(1);
                      setShowCreate(true);
                    }}
                    className="p-3 bg-slate-900/35 border border-slate-800 hover:border-indigo-500/30 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer"
                  >
                    <span className="text-xl">{act.icon}</span>
                    <span className="text-[9px] font-extrabold text-slate-350">{act.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Debts Summary Overview */}
            <div className="card space-y-4 shadow-xl">
              <div>
                <h3 className="text-sm font-black text-slate-100">⚖️ Workspace Balances</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Net liability calculations for current group participants</p>
              </div>

              <div className="space-y-3">
                {stats.owe > 0 && (
                  <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-3.5 flex justify-between items-center gap-3">
                    <div>
                      <p className="text-[9px] font-bold text-rose-400 uppercase tracking-wide">You Owe Others</p>
                      <p className="text-base font-black text-rose-455 font-mono mt-0.5">₹{stats.owe.toLocaleString('en-IN')}</p>
                    </div>
                    <span className="text-2xl">📉</span>
                  </div>
                )}

                {stats.owed > 0 && (
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3.5 flex justify-between items-center gap-3">
                    <div>
                      <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-wide">You Are Owed By Others</p>
                      <p className="text-base font-black text-emerald-455 font-mono mt-0.5">₹{stats.owed.toLocaleString('en-IN')}</p>
                    </div>
                    <span className="text-2xl">📈</span>
                  </div>
                )}

                {stats.owe === 0 && stats.owed === 0 && (
                  <p className="text-xs text-slate-500 text-center py-4">No outstanding liabilities. You are fully settled!</p>
                )}
              </div>
            </div>

            {/* Activity Log */}
            <div className="card space-y-4 shadow-xl">
              <div>
                <h3 className="text-sm font-black text-slate-100">📜 Activity Log</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Timeline of changes in split bills</p>
              </div>

              <div className="relative space-y-4 pl-4 border-l border-slate-800/80">
                {[
                  { text: 'Dinner bill settled by Sahil', time: 'Just now', icon: '🟢' },
                  { text: 'Created Trip split workspace', time: 'Yesterday', icon: '✈️' },
                  { text: 'Split updated by Aditya', time: '2 days ago', icon: '⚙️' },
                ].map((act, i) => (
                  <div key={i} className="relative space-y-0.5">
                    <span className="absolute -left-[21px] top-1 bg-slate-900 text-xs">{act.icon}</span>
                    <p className="text-xs font-semibold text-slate-300 leading-tight">{act.text}</p>
                    <p className="text-[9px] text-slate-500">{act.time}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE MULTI-STEP SPLIT BILL MODAL ── */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="card w-full max-w-md space-y-4 max-h-[90dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl my-auto border border-slate-800"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
                <h3 className="font-black text-slate-100">Create Split Bill — Step {step}/3</h3>
                <button
                  onClick={() => {
                    setShowCreate(false);
                    setStep(1);
                  }}
                  className="text-slate-400 hover:text-slate-100 cursor-pointer text-sm"
                >
                  ✕
                </button>
              </div>

              {/* Steps Progress Visual */}
              <div className="flex gap-2">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                      step >= s ? 'bg-indigo-600' : 'bg-slate-900 border border-slate-850'
                    }`}
                  />
                ))}
              </div>

              {/* Form Content */}
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                {step === 1 && (
                  <div className="space-y-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Step 1: Bill details</p>
                    <div className="form-group">
                      <label className="label">Bill Title</label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Olive Garden Dinner, Airbnb Cabin rent"
                        className="input"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="form-group">
                        <label className="label">Group Category</label>
                        <select
                          value={groupName}
                          onChange={(e) => setGroupName(e.target.value)}
                          className="select"
                        >
                          <option value="Restaurant">Restaurant Dinner</option>
                          <option value="Trip">Shared Trip/Travel</option>
                          <option value="Room Rent">Rent & Utilities</option>
                          <option value="Friends">Friends Hangout</option>
                          <option value="Office">Office Purchase</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="label">Total Amount (₹)</label>
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.00"
                          className="input"
                          required
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="btn bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs px-6 py-2.5 cursor-pointer rounded-xl"
                      >
                        Continue →
                      </button>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Step 2: Add participants</p>
                    <div className="form-group">
                      <label className="label">Friends Emails (Comma-separated)</label>
                      <textarea
                        rows="4"
                        value={memberEmails}
                        onChange={(e) => setMemberEmails(e.target.value)}
                        placeholder="e.g. aditya@gmail.com, friend2@gmail.com"
                        className="input resize-none"
                        required
                      />
                      <p className="text-[10px] text-slate-500 mt-1.5">
                        Split shares are auto-calculated equally among members. Ensure emails match active users.
                      </p>
                    </div>
                    <div className="flex justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="btn bg-slate-900 border border-slate-800 text-slate-400 text-xs px-5 py-2.5 cursor-pointer rounded-xl"
                      >
                        ← Back
                      </button>
                      <button
                        type="button"
                        onClick={() => setStep(3)}
                        className="btn bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs px-5 py-2.5 cursor-pointer rounded-xl"
                      >
                        Continue →
                      </button>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Step 3: Review Split Method</p>

                    <div className="form-group">
                      <label className="label">Splitting Rules</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['Equal', 'Shares', 'Exact', 'Percentage'].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setSplitMethod(m)}
                            className={`p-3 border rounded-xl text-center text-xs font-bold transition-all cursor-pointer ${
                              splitMethod === m
                                ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30'
                                : 'bg-slate-900/30 border-slate-850 text-slate-400 hover:text-slate-350'
                            }`}
                          >
                            {m === 'Equal' ? '⚖️ Equal' : m === 'Shares' ? '👥 Shares' : m === 'Exact' ? '📝 Exact' : '📊 %'}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-555 mt-2.5">
                        Currently splitting equally: ₹{(Number(amount || 0) / ((memberEmails.split(',').filter(Boolean).length || 0) + 1)).toFixed(2)} per person.
                      </p>
                    </div>

                    <div className="flex justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="btn bg-slate-900 border border-slate-800 text-slate-400 text-xs px-5 py-2.5 cursor-pointer rounded-xl"
                      >
                        ← Back
                      </button>
                      <button
                        type="submit"
                        className="btn bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs px-6 py-2.5 cursor-pointer rounded-xl"
                      >
                        ✔ Finish & Settle Split
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
