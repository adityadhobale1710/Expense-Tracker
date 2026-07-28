import { useState, useEffect, useMemo, useRef } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../hooks/useDialog';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, DollarSign, Plus, CheckCircle, ChevronDown, Trash2, Search, Info, Scale, CheckCircle2, AlertTriangle
} from 'lucide-react';

const CATEGORY_ICONS = {
  Restaurant: '🍔',
  Trip: '✈️',
  'Room Rent': '🏠',
  Friends: '🍻',
  Office: '💼',
  All: '📂'
};

export default function SplitBills() {
  const { user } = useAuth();
  const { showConfirm } = useDialog();
  const [splits, setSplits] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Split Modal States
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [groupName, setGroupName] = useState('Restaurant');
  const [memberEmails, setMemberEmails] = useState('');
  const [splitMethod, setSplitMethod] = useState('Equal'); // 'Equal' | 'Manual'
  const [paidBy, setPaidBy] = useState(''); // Email of the payer (default: user.email)

  // Manual splits shares mapping (email -> string amount)
  const [manualShares, setManualShares] = useState({});

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

  // Set default paidBy when user is loaded or modal opens
  useEffect(() => {
    if (user && !paidBy) {
      setPaidBy(user.email);
    }
  }, [user, showCreate]);

  // Normalize backend splits
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

  // Filtered splits
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

  // Summary Metrics calculations
  const stats = useMemo(() => {
    if (!user) return { owe: 0, owed: 0, outstanding: 0, settled: 0 };
    const myEmail = user.email.toLowerCase();

    let youOwe = 0;
    let youAreOwed = 0;
    let settledSum = 0;

    safeSplits.forEach((s) => {
      const isCreator = s.creator?.email?.toLowerCase() === myEmail;
      
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

  // Parse participant list: Creator + parsed emails
  const participants = useMemo(() => {
    const list = [user?.email?.toLowerCase()].filter(Boolean);
    if (memberEmails) {
      memberEmails
        .split(',')
        .map(e => e.trim().toLowerCase())
        .filter(Boolean)
        .forEach(email => {
          if (!list.includes(email)) {
            list.push(email);
          }
        });
    }
    return list;
  }, [user, memberEmails]);

  // Equal split share calculator with penny-adjuster
  const equalShares = useMemo(() => {
    const billAmt = Number(amount) || 0;
    if (billAmt <= 0 || participants.length === 0) return {};

    const totalCents = Math.round(billAmt * 100);
    const baseCents = Math.floor(totalCents / participants.length);
    const remainderCents = totalCents % participants.length;

    const shares = {};
    participants.forEach((email, idx) => {
      let cents = baseCents;
      if (idx < remainderCents) {
        cents += 1;
      }
      shares[email] = (cents / 100).toFixed(2);
    });
    return shares;
  }, [amount, participants]);

  // Active shares depending on splitMethod
  const computedShares = useMemo(() => {
    if (splitMethod === 'Equal') {
      return equalShares;
    }
    // Return manualShares sanitized
    const shares = {};
    participants.forEach(email => {
      shares[email] = Number(manualShares[email] || 0).toFixed(2);
    });
    return shares;
  }, [splitMethod, equalShares, manualShares, participants]);

  // Validation details
  const manualTotalSum = useMemo(() => {
    return participants.reduce((sum, email) => sum + (Number(manualShares[email]) || 0), 0);
  }, [manualShares, participants]);

  const remainingBalance = useMemo(() => {
    const total = Number(amount) || 0;
    if (splitMethod === 'Equal') return 0;
    return total - manualTotalSum;
  }, [amount, splitMethod, manualTotalSum]);

  const isBalanced = useMemo(() => {
    const total = Number(amount) || 0;
    if (total <= 0 || participants.length === 0) return false;
    if (splitMethod === 'Equal') return true;
    return Math.abs(total - manualTotalSum) < 0.01;
  }, [amount, splitMethod, manualTotalSum, participants]);

  // Set default manual shares when participants list or amount changes
  useEffect(() => {
    if (splitMethod === 'Manual' && Object.keys(manualShares).length === 0) {
      // Initialize manual shares equally
      const shares = {};
      participants.forEach(email => {
        shares[email] = equalShares[email] || '0.00';
      });
      setManualShares(shares);
    }
  }, [splitMethod, participants, equalShares]);

  // Smart Helpers
  const handleResetSplit = () => {
    const shares = {};
    participants.forEach(email => {
      shares[email] = '0.00';
    });
    setManualShares(shares);
    toast.success('Split amounts reset');
  };

  const handleEqualize = () => {
    setManualShares(equalShares);
    toast.success('Amounts equalized');
  };

  const handleRoundAmounts = () => {
    const total = Number(amount) || 0;
    if (total <= 0) return;

    const roundedShares = {};
    let roundedSum = 0;

    participants.forEach((email) => {
      const val = Math.round(Number(manualShares[email] || 0));
      roundedShares[email] = val;
      roundedSum += val;
    });

    // Adjust remainder on first participant
    const diff = total - roundedSum;
    if (participants.length > 0 && diff !== 0) {
      const firstEmail = participants[0];
      roundedShares[firstEmail] = Number(roundedShares[firstEmail]) + diff;
    }

    const finalShares = {};
    participants.forEach(email => {
      finalShares[email] = Number(roundedShares[email]).toFixed(2);
    });

    setManualShares(finalShares);
    toast.success('Amounts rounded & balanced');
  };

  const handleAutoBalance = () => {
    const total = Number(amount) || 0;
    if (total <= 0 || participants.length === 0) return;

    const firstEmail = participants[0];
    const otherSum = participants
      .filter(e => e !== firstEmail)
      .reduce((sum, e) => sum + (Number(manualShares[e]) || 0), 0);

    const firstShare = Math.max(0, total - otherSum);
    setManualShares(prev => ({
      ...prev,
      [firstEmail]: firstShare.toFixed(2)
    }));
    toast.success('Balanced remaining difference');
  };

  const handleManualShareChange = (email, value) => {
    setManualShares(prev => ({
      ...prev,
      [email]: value
    }));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!title || !amount || participants.length <= 1) {
      return toast.error('Please enter title, amount, and at least one member');
    }

    if (!isBalanced) {
      return toast.error(`Split is unbalanced. Remaining: ₹${remainingBalance.toFixed(2)}`);
    }

    // Backend payload formatted members: array of other participants excluding the payer (paidBy)
    // Wait, the existing backend code matches splits:
    // Payer is creator of split (creator). Other members owe share to creator.
    // If payer is another friend, we should adapt. But the existing database structure
    // sets creator as logged-in user, and s.members as friends who owe money.
    // So we map members excluding the creator/user email.
    const myEmail = user.email.toLowerCase();
    const otherParticipants = participants.filter(email => email !== myEmail);

    const formattedMembers = otherParticipants.map(email => ({
      userEmail: email,
      share: Number(computedShares[email] || 0),
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
      setTitle('');
      setAmount('');
      setMemberEmails('');
      setManualShares({});
      setSplitMethod('Equal');
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

  return (
    <div className="space-y-6 pb-20">
      {/* Page Header */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-700/50 bg-gradient-to-r from-indigo-500/10 via-slate-900/50 to-slate-900 p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl">
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 2h12a1 1 0 0 1 1 1v18l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5L5 21V3a1 1 0 0 1 1-1z" stroke="white" strokeWidth="1.6" strokeLinejoin="round" fill="white" fillOpacity="0.15"/>
                <line x1="9" y1="8" x2="15" y2="8" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
                <line x1="12" y1="6" x2="12" y2="10" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
                <line x1="9" y1="13" x2="15" y2="13" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="2 1.5"/>
                <circle cx="9.5" cy="16" r="0.8" fill="white"/>
                <circle cx="12" cy="16" r="0.8" fill="white"/>
                <circle cx="14.5" cy="16" r="0.8" fill="white"/>
              </svg>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-100 tracking-tight">Split Bills Workspace</h1>
          </div>
          <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-xl">
            Track, split, settle, and manage shared bills and payments seamlessly with your friends and group workspaces.
          </p>
        </div>

        <button
          onClick={() => {
            setTitle('');
            setAmount('');
            setMemberEmails('');
            setManualShares({});
            setSplitMethod('Equal');
            setShowCreate(true);
          }}
          className="btn bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs px-5 py-2.5 rounded-xl font-black shadow-lg transition-all cursor-pointer"
        >
          + New Split Bill
        </button>
      </div>

      {/* Summary Cards */}
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
            color: 'text-rose-455',
            glow: 'from-rose-500/5 to-transparent',
          },
          {
            label: 'You Are Owed',
            value: `₹${stats.owed.toLocaleString('en-IN')}`,
            icon: '📈',
            color: 'text-emerald-455',
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
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card text-center py-16 px-6 max-w-2xl mx-auto space-y-6 border-dashed border-indigo-500/30"
        >
          <div className="mx-auto w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-indigo-500/40" style={{animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite'}}>
            <svg viewBox="0 0 48 48" fill="none" className="w-14 h-14" xmlns="http://www.w3.org/2000/svg">
              <rect x="8" y="4" width="32" height="40" rx="4" fill="white" fillOpacity="0.15" stroke="white" strokeWidth="2.5" strokeLinejoin="round"/>
              <line x1="16" y1="15" x2="32" y2="15" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="24" y1="10" x2="24" y2="20" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="16" y1="27" x2="32" y2="27" stroke="white" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 3"/>
              <circle cx="19" cy="35" r="2.5" fill="white" fillOpacity="0.9"/>
              <circle cx="29" cy="35" r="2.5" fill="white" fillOpacity="0.9"/>
              <circle cx="24" cy="35" r="2.5" fill="white" fillOpacity="0.9"/>
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-slate-100">No Shared Bills Yet</h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Create your first shared check, divide trip expenses, or split utilities with your friends to track balances.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="btn bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-extrabold px-8 py-3 rounded-xl shadow-xl transition-all cursor-pointer"
          >
            Create Split Bill
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bills List Column */}
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

                const totalMembers = split.members.length;
                const settledMembers = split.members.filter((m) => m.paid).length;
                const progressPct = totalMembers > 0 ? Math.round((settledMembers / totalMembers) * 100) : 0;

                return (
                  <div
                    key={split._id}
                    className="relative overflow-hidden card border border-slate-800/80 bg-slate-900/10 hover:bg-slate-900/20 p-5 space-y-4 transition-all duration-300 shadow-xl"
                  >
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
                            <Trash2 size={12} />
                          </button>
                        )}

                        <button
                          onClick={() => toggleExpandBill(split._id)}
                          className="p-1.5 bg-slate-900/60 hover:bg-slate-850 border border-slate-800 text-slate-400 rounded-lg text-xs cursor-pointer flex items-center justify-center"
                        >
                          <ChevronDown size={12} className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                    </div>

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

          {/* Right Column details */}
          <div className="space-y-6">
            {/* Quick action shortcuts */}
            <div className="card space-y-4 shadow-xl">
              <div>
                <h3 className="text-sm font-black text-slate-100">⚡ Split Shortcuts</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Quick split presets and workspace configurations</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { title: 'Split Evenly', icon: '⚖️', action: 'Equal' },
                  { title: 'Split Exact', icon: '📝', action: 'Manual' },
                ].map((act, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setTitle('');
                      setAmount('');
                      setMemberEmails('');
                      setManualShares({});
                      setSplitMethod(act.action);
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

            {/* Balances summary */}
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
          </div>
        </div>
      )}

      {/* CREATE MULTI-METHOD BILL MODAL */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="card w-full max-w-lg space-y-4 max-h-[92dvh] overflow-y-auto rounded-2xl border border-slate-800"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center pb-2 border-b border-slate-700/40">
                <div>
                  <h3 className="font-black text-slate-100 text-base flex items-center gap-2">
                    <Scale size={18} className="text-indigo-400" />
                    <span>Create Split Bill</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Log shared expenses and assign debt ratios.</p>
                </div>
                <button
                  onClick={() => setShowCreate(false)}
                  className="text-slate-400 hover:text-slate-100 cursor-pointer text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Segmented Split Method Control */}
              <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setSplitMethod('Equal')}
                  className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${
                    splitMethod === 'Equal'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-205'
                  }`}
                >
                  ⚖️ Equal Split
                </button>
                <button
                  type="button"
                  onClick={() => setSplitMethod('Manual')}
                  className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${
                    splitMethod === 'Manual'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-205'
                  }`}
                >
                  📝 Manual Split
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
                {/* Basic Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="label">Bill Title</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Olive Garden Dinner, Airbnb Cabin"
                      className="input py-2 text-xs bg-dark-900 border-slate-750"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Category</label>
                    <select
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      className="select py-2 text-xs bg-dark-900 border-slate-750"
                    >
                      <option value="Restaurant">Restaurant Dinner</option>
                      <option value="Trip">Shared Trip/Travel</option>
                      <option value="Room Rent">Rent & Utilities</option>
                      <option value="Friends">Friends Hangout</option>
                      <option value="Office">Office Purchase</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="label">Total Amount (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="input py-2 text-xs bg-dark-900 border-slate-750"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Paid By</label>
                    <select
                      value={paidBy}
                      onChange={(e) => setPaidBy(e.target.value)}
                      className="select py-2 text-xs bg-dark-900 border-slate-750"
                    >
                      {participants.map(email => (
                        <option key={email} value={email}>
                          {email === user?.email?.toLowerCase() ? `You (${email})` : email}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Friend Emails inputs */}
                <div className="form-group">
                  <label className="label">Members Emails (Comma-separated)</label>
                  <textarea
                    rows="2"
                    value={memberEmails}
                    onChange={(e) => {
                      setMemberEmails(e.target.value);
                      // Clear manual mapping values that don't match
                      setManualShares({});
                    }}
                    placeholder="e.g. rahul@gmail.com, amit@gmail.com"
                    className="input py-2 text-xs bg-dark-900 border-slate-750 resize-none"
                    required
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Adds participant members to this split workspace.
                  </p>
                </div>

                {/* Live Allocator visual summary */}
                <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    <span>Summary</span>
                    <div className="flex items-center gap-1.5">
                      {isBalanced ? (
                        <span className="flex items-center gap-1 text-emerald-450 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <CheckCircle2 size={10} /> Balanced
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                          <AlertTriangle size={10} /> Not Balanced
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1.5 border-t border-slate-800/50">
                    <div>
                      <p className="text-[9px] text-slate-500 font-bold uppercase">Total Bill</p>
                      <p className="font-extrabold text-slate-200 mt-0.5">₹{Number(amount || 0).toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-500 font-bold uppercase">Allocated</p>
                      <p className="font-extrabold text-slate-200 mt-0.5">
                        ₹{splitMethod === 'Equal' ? Number(amount || 0).toLocaleString('en-IN') : manualTotalSum.toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-500 font-bold uppercase">Remaining</p>
                      <p className={`font-extrabold mt-0.5 ${remainingBalance === 0 ? 'text-slate-400' : 'text-amber-400'}`}>
                        ₹{remainingBalance.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>

                  {/* Smart Actions Row (only for Manual Splits) */}
                  {splitMethod === 'Manual' && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800/40">
                      <button
                        type="button"
                        onClick={handleEqualize}
                        className="py-1 px-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 hover:text-slate-200 rounded text-[9px] font-bold text-slate-400 transition-all cursor-pointer"
                      >
                        ⚖️ Equalize
                      </button>
                      <button
                        type="button"
                        onClick={handleAutoBalance}
                        className="py-1 px-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 hover:text-slate-200 rounded text-[9px] font-bold text-slate-400 transition-all cursor-pointer"
                      >
                        ⚡ Auto-Balance
                      </button>
                      <button
                        type="button"
                        onClick={handleRoundAmounts}
                        className="py-1 px-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 hover:text-slate-200 rounded text-[9px] font-bold text-slate-400 transition-all cursor-pointer"
                      >
                        🪙 Round
                      </button>
                      <button
                        type="button"
                        onClick={handleResetSplit}
                        className="py-1 px-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 hover:text-slate-200 rounded text-[9px] font-bold text-slate-400 transition-all cursor-pointer"
                      >
                        🔄 Reset
                      </button>
                    </div>
                  )}
                </div>

                {/* Participant Allocation Table / Stacked Cards */}
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Participant Ledger</span>
                  <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1">
                    {participants.map((email, idx) => {
                      const shareValue = computedShares[email] || '0.00';
                      const pct = Number(amount) > 0 ? Math.round((Number(shareValue) / Number(amount)) * 100) : 0;
                      const isMe = email === user?.email?.toLowerCase();

                      return (
                        <div
                          key={email}
                          className="flex flex-col sm:flex-row justify-between sm:items-center bg-slate-950 border border-slate-850 p-2.5 rounded-xl gap-2 transition-all"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-[10px] uppercase">
                              {email[0]}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold text-slate-205 truncate">
                                {isMe ? 'Aditya (You)' : email}
                              </p>
                              <span className="text-[8px] text-slate-500 font-black uppercase tracking-wide">
                                Member Participant
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3.5">
                            {/* percentage share */}
                            <span className="px-1.5 py-px bg-slate-900 text-slate-400 text-[8px] font-extrabold uppercase rounded">
                              {pct}% Share
                            </span>

                            {splitMethod === 'Equal' ? (
                              <span className="text-xs font-black text-slate-200 font-mono">
                                ₹{shareValue}
                              </span>
                            ) : (
                              <div className="relative flex items-center">
                                <span className="absolute left-2.5 text-slate-500 font-bold">₹</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={manualShares[email] || ''}
                                  placeholder="0.00"
                                  onChange={(e) => handleManualShareChange(email, e.target.value)}
                                  className="w-24 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-lg py-1 pl-6 pr-2 text-right font-black text-slate-100 font-mono text-xs focus:outline-none"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Modal Footer Controls */}
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-700/40">
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="btn bg-slate-900 border border-slate-800 text-slate-400 text-xs py-2.5 px-4 cursor-pointer rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!isBalanced}
                    className="btn bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black text-xs py-2.5 px-6 cursor-pointer rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Split
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
