import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingDown, TrendingUp, Sparkles, Landmark, Wallet, Plus, X, Trash2,
  Calendar, CreditCard, Banknote, Search, ShieldAlert, BadgeAlert, Coins, HelpCircle, AlertCircle, Info, ChevronRight, Activity, Percent
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Modal from '../../components/common/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { DataTable } from '../../components/ui/DataTable';

// Constants
const LOAN_TYPES = [
  { value: 'personal', label: 'Personal Loan', icon: Banknote, color: '#f59e0b' },
  { value: 'education', label: 'Education Loan', icon: Coins, color: '#3b82f6' },
  { value: 'home', label: 'Home Loan', icon: Landmark, color: '#10b981' },
  { value: 'car', label: 'Car Loan', icon: CreditCard, color: '#ec4899' },
  { value: 'credit_card_emi', label: 'Credit Card EMI', icon: CreditCard, color: '#a855f7' },
];

const LOAN_COLORS = {
  personal: '#f59e0b',
  education: '#3b82f6',
  home: '#10b981',
  car: '#ec4899',
  credit_card_emi: '#a855f7',
};

const getLocalTodayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function Loans() {
  const [loans, setLoans] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, loading: false });

  // Modal control states
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState('personal');
  const [amount, setAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [durationMonths, setDurationMonths] = useState('');
  const [emiAmount, setEmiAmount] = useState('');
  const [remainingBalance, setRemainingBalance] = useState('');
  const [nextEmiDate, setNextEmiDate] = useState(getLocalTodayString());

  // EMI payment states
  const [payingLoanId, setPayingLoanId] = useState(null);
  const [selectedWalletId, setSelectedWalletId] = useState('');

  // Filters & sorting
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [sortBy, setSortBy] = useState('remaining_desc');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [loansRes, walletsRes] = await Promise.all([
        api.get('/loans'),
        api.get('/wallets')
      ]);
      setLoans(loansRes.data.data || []);
      setWallets(walletsRes.data.data || []);
    } catch {
      toast.error('Failed to load loan data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name || !amount || !interestRate || !durationMonths || !emiAmount) {
      return toast.error('Please fill out all required fields');
    }

    setSubmitting(true);
    try {
      await api.post('/loans', {
        name,
        type,
        amount: Number(amount),
        interestRate: Number(interestRate),
        durationMonths: Number(durationMonths),
        emiAmount: Number(emiAmount),
        remainingBalance: remainingBalance ? Number(remainingBalance) : Number(amount),
        nextEmiDate
      });
      toast.success('Loan logged successfully!');
      setShowCreate(false);
      setName('');
      setAmount('');
      setInterestRate('');
      setDurationMonths('');
      setEmiAmount('');
      setRemainingBalance('');
      setNextEmiDate(getLocalTodayString());
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to log loan account');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayEmi = async (loanId) => {
    if (wallets.length === 0) {
      return toast.error('Create a wallet first to execute EMI payments');
    }

    if (payingLoanId === loanId && selectedWalletId) {
      try {
        await api.post(`/loans/${loanId}/pay-emi`, { walletId: selectedWalletId });
        toast.success('EMI Payment logged successfully! 🎉');
        setPayingLoanId(null);
        setSelectedWalletId('');
        fetchData();
      } catch (e) {
        toast.error(e.response?.data?.message || 'EMI payment failed');
      }
      return;
    }

    if (wallets.length === 1) {
      try {
        await api.post(`/loans/${loanId}/pay-emi`, { walletId: wallets[0]._id });
        toast.success('EMI Payment logged successfully! 🎉');
        fetchData();
      } catch (e) {
        toast.error(e.response?.data?.message || 'EMI payment failed');
      }
      return;
    }

    setPayingLoanId(loanId);
    setSelectedWalletId(wallets.find(w => w.isPrimary)?._id || wallets[0]._id);
  };

  const handleDelete = (id) => {
    setDeleteConfirm({ isOpen: true, id, loading: false });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return;
    setDeleteConfirm((prev) => ({ ...prev, loading: true }));
    try {
      await api.delete(`/loans/${deleteConfirm.id}`);
      toast.success('Loan log removed');
      fetchData();
      setDeleteConfirm({ isOpen: false, id: null, loading: false });
    } catch {
      toast.error('Failed to delete loan log');
      setDeleteConfirm((prev) => ({ ...prev, loading: false }));
    }
  };

  // Redesign statistics calculations
  const stats = useMemo(() => {
    let totalOutstanding = 0;
    let monthlyEmi = 0;
    let totalPrincipal = 0;
    let activeCount = 0;
    let paidOffCount = 0;

    loans.forEach(l => {
      totalOutstanding += l.remainingBalance;
      totalPrincipal += l.amount;
      if (l.remainingBalance > 0) {
        monthlyEmi += l.emiAmount;
        activeCount++;
      } else {
        paidOffCount++;
      }
    });

    const totalPaid = Math.max(0, totalPrincipal - totalOutstanding);
    const paidPct = totalPrincipal > 0 ? Math.round((totalPaid / totalPrincipal) * 100) : 0;

    return {
      totalOutstanding,
      monthlyEmi,
      totalPrincipal,
      totalPaid,
      paidPct,
      activeCount,
      paidOffCount
    };
  }, [loans]);

  // Compute filtered & sorted loans
  const filteredLoans = useMemo(() => {
    let list = [...loans];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(l => l.name?.toLowerCase().includes(q) || l.type?.toLowerCase().includes(q));
    }

    if (filterType) {
      list = list.filter(l => l.type === filterType);
    }

    list.sort((a, b) => {
      switch (sortBy) {
        case 'emi_desc': return b.emiAmount - a.emiAmount;
        case 'interest_desc': return b.interestRate - a.interestRate;
        case 'remaining_desc': return b.remainingBalance - a.remainingBalance;
        case 'name_asc': return a.name?.localeCompare(b.name);
        default: return b.remainingBalance - a.remainingBalance;
      }
    });

    return list;
  }, [loans, search, filterType, sortBy]);

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-100 flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/20 flex items-center justify-center flex-shrink-0">
              <Landmark size={20} className="text-rose-400" />
            </span>
            Debt & EMI Tracker
          </h1>
          <p className="text-slate-500 text-sm mt-1 ml-[52px]">
            Log, schedule, and optimize repayments for education, housing, and personal credit accounts
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowCreate(true)}
          className="btn-primary gap-2 self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Log New Loan</span>
        </motion.button>
      </div>

      {/* Wallet Empty State Banner */}
      {!loading && wallets.length === 0 && (
        <div className="card border-amber-500/30 bg-amber-500/5 text-center p-6 space-y-3 flex flex-col items-center rounded-2xl">
          <Wallet size={36} className="text-amber-400" />
          <div>
            <h3 className="text-sm font-bold text-slate-200">Wallet Account Needed</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Create a wallet account to link EMI payments and deduct balances automatically.
            </p>
          </div>
          <Link to="/wallets" className="btn-primary text-xs px-4 py-2 mt-2">
            Create Wallet
          </Link>
        </div>
      )}

      {/* Top Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-dark-800/80 border border-slate-800 rounded-2xl animate-pulse" />
          ))
        ) : (
          <>
            <motion.div whileHover={{ y: -2 }} className="card p-5 cursor-default relative overflow-hidden group">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-rose-500/5 to-transparent" />
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Outstanding Debt</span>
                <span className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400"><Landmark size={15} /></span>
              </div>
              <h3 className="text-2xl font-black text-slate-100 mt-2">{fmt(stats.totalOutstanding)}</h3>
              <p className="text-[10px] text-slate-400 mt-1">{stats.activeCount} active loans</p>
            </motion.div>

            <motion.div whileHover={{ y: -2 }} className="card p-5 cursor-default relative overflow-hidden group">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-amber-500/5 to-transparent" />
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Monthly Outflow</span>
                <span className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400"><CreditCard size={15} /></span>
              </div>
              <h3 className="text-2xl font-black text-slate-100 mt-2">{fmt(stats.monthlyEmi)}</h3>
              <p className="text-[10px] text-slate-400 mt-1">Aggregate monthly EMI commitment</p>
            </motion.div>

            <motion.div whileHover={{ y: -2 }} className="card p-5 cursor-default relative overflow-hidden group">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-emerald-500/5 to-transparent" />
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Principal Paid</span>
                <span className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400"><Wallet size={15} /></span>
              </div>
              <h3 className="text-2xl font-black text-slate-100 mt-2">{fmt(stats.totalPaid)}</h3>
              <p className="text-[10px] text-emerald-400 mt-1">{stats.paidPct}% aggregate payoff rate</p>
            </motion.div>

            <motion.div whileHover={{ y: -2 }} className="card p-5 cursor-default relative overflow-hidden group">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-indigo-500/5 to-transparent" />
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Aggregate Balance</span>
                <span className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400"><Activity size={15} /></span>
              </div>
              <h3 className="text-2xl font-black text-slate-100 mt-2">{fmt(stats.totalPrincipal)}</h3>
              <p className="text-[10px] text-slate-400 mt-1">{stats.paidOffCount} settled/closed loans</p>
            </motion.div>
          </>
        )}
      </div>

      {/* Filters Bar */}
      <div className="card-sm flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="input pl-9 text-sm"
            placeholder="Search active debts…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Loan Type quick filter */}
        <select className="select min-w-[140px] text-sm" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All Loan Types</option>
          {LOAN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>

        {/* Sort */}
        <select className="select min-w-[140px] text-sm" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="remaining_desc">Highest Balance First</option>
          <option value="emi_desc">Highest EMI First</option>
          <option value="interest_desc">Highest Interest First</option>
          <option value="name_asc">Name A → Z</option>
        </select>

        {/* Clear Filters */}
        {(search || filterType) && (
          <button onClick={() => { setSearch(''); setFilterType(''); }} className="btn-ghost text-xs">
            Clear
          </button>
        )}
      </div>

      {/* Main Loan List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <Skeleton.Card key={i} className="h-48" />
          ))}
        </div>
      ) : filteredLoans.length === 0 ? (
        <EmptyState
          title="No active loans found"
          description="Stay debt-free or log your SBI home loan/credit card balances to begin tracking EMI schedules."
          icon={Landmark}
          actionText="Log Loan"
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredLoans.map((loan) => {
              const paidPrincipal = Math.max(loan.amount - loan.remainingBalance, 0);
              const pctPaid = loan.amount > 0 ? Math.round((paidPrincipal / loan.amount) * 100) : 0;
              const typeConfig = LOAN_TYPES.find(t => t.value === loan.type) || LOAN_TYPES[0];
              const IconComp = typeConfig.icon;
              const isSettled = loan.remainingBalance <= 0;

              return (
                <motion.div
                  key={loan._id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  whileHover={{ y: -3 }}
                  className="card flex flex-col justify-between hover:border-slate-600/50 transition-all duration-300 relative overflow-hidden group border border-slate-700/40 shadow-xl"
                >
                  {/* Decorative Left bar */}
                  <div 
                    className="absolute left-0 top-0 bottom-0 w-1.5 opacity-80"
                    style={{ backgroundColor: typeConfig.color }}
                  />

                  <div className="space-y-4 pl-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <span 
                          className="w-11 h-11 rounded-xl flex items-center justify-center text-xl border border-slate-700/20 shadow-inner"
                          style={{ backgroundColor: `${typeConfig.color}15`, color: typeConfig.color }}
                        >
                          <IconComp size={20} />
                        </span>
                        <div>
                          <span className="badge text-[8px] tracking-wide font-black uppercase" style={{ backgroundColor: `${typeConfig.color}18`, color: typeConfig.color }}>
                            {typeConfig.label}
                          </span>
                          <h3 className="text-base font-extrabold text-slate-100 mt-1 leading-tight">{loan.name}</h3>
                          <p className="text-[9px] text-slate-500 mt-1 font-semibold">
                            Interest: <span className="text-slate-400 font-bold">{loan.interestRate}% p.a.</span> • Term: <span className="text-slate-400 font-bold">{loan.durationMonths}m</span>
                          </p>
                        </div>
                      </div>
                      
                      {/* Delete */}
                      <button onClick={() => handleDelete(loan._id)} className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors flex-shrink-0">
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {/* Progress tracking */}
                    <div className="space-y-1 bg-dark-900/40 p-3 rounded-xl border border-slate-800/40 text-left">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-slate-500">Paid Off Principal</span>
                        <span className="text-emerald-400">{pctPaid}% Settled</span>
                      </div>
                      <div className="progress-bar mt-1.5">
                        <div className="progress-fill bg-rose-500" style={{ width: `${pctPaid}%`, backgroundColor: typeConfig.color }} />
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-500 pt-1 font-semibold">
                        <span>Paid: {fmt(paidPrincipal)}</span>
                        <span>Outstanding: {fmt(loan.remainingBalance)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Info & CTA */}
                  <div className="mt-5 pt-3 border-t border-slate-700/25 flex items-center justify-between pl-2">
                    <div className="text-[10px] text-slate-500 space-y-0.5">
                      <p className="font-semibold">EMI: <span className="text-slate-200 font-bold">{fmt(loan.emiAmount)} / mo</span></p>
                      <p className="text-[9px]">Next Due: <span className="text-slate-400 font-bold">{!isSettled ? new Date(loan.nextEmiDate).toLocaleDateString('en-IN') : 'Settled'}</span></p>
                    </div>

                    {!isSettled ? (
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => handlePayEmi(loan._id)}
                          disabled={wallets.length === 0}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md ${
                            wallets.length === 0
                              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                              : 'bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500 hover:text-white text-rose-400 shadow-rose-500/5'
                          }`}
                        >
                          {payingLoanId === loan._id ? 'Confirm Repay' : 'Pay EMI'}
                        </button>
                        
                        {/* Wallet Selector Dropdown */}
                        {payingLoanId === loan._id && (
                          <div className="flex gap-1.5 items-center mt-1 z-25 bg-dark-900 border border-slate-700/40 rounded-xl p-1 shadow-2xl absolute right-5 bottom-12">
                            <select
                              className="select text-[10px] py-1 px-2 border-0 bg-transparent text-slate-200 font-bold focus:ring-0 min-h-[30px]"
                              value={selectedWalletId}
                              onChange={(e) => setSelectedWalletId(e.target.value)}
                            >
                              {wallets.map(w => (
                                <option key={w._id} value={w._id}>
                                  {w.icon} {w.name} ({fmt(w.balance)})
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => { setPayingLoanId(null); setSelectedWalletId(''); }}
                              className="text-slate-500 hover:text-slate-300 text-xs px-1.5 font-bold"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="px-2.5 py-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">Settled 🎉</span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* CREATE LOAN MODAL */}
      <AnimatePresence>
        {showCreate && (
          <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Log Loan Account" size="xl">
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="form-group">
                <label className="label">Loan Account Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. SBI Home Loan, Apple iPhone EMI"
                  className="input"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="label">Loan Type</label>
                  <select value={type} onChange={(e) => setType(e.target.value)} className="select">
                    {LOAN_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Interest Rate (% p.a.)</label>
                  <div className="relative">
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">%</span>
                    <input
                      type="number"
                      step="0.01"
                      value={interestRate}
                      onChange={(e) => setInterestRate(e.target.value)}
                      placeholder="e.g. 8.5"
                      className="input pr-7"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="form-group">
                  <label className="label">Duration (months)</label>
                  <input
                    type="number"
                    value={durationMonths}
                    onChange={(e) => setDurationMonths(e.target.value)}
                    placeholder="e.g. 24"
                    className="input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="label">Total Amount (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Principal"
                      className="input pl-7"
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="label">EMI / mo (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                    <input
                      type="number"
                      value={emiAmount}
                      onChange={(e) => setEmiAmount(e.target.value)}
                      placeholder="Installment"
                      className="input pl-7"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="label">Remaining Balance (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                    <input
                      type="number"
                      value={remainingBalance}
                      onChange={(e) => setRemainingBalance(e.target.value)}
                      placeholder="Leave blank if brand new"
                      className="input pl-7"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="label">Next EMI Date</label>
                  <input
                    type="date"
                    value={nextEmiDate}
                    onChange={(e) => setNextEmiDate(e.target.value)}
                    className="input"
                    required
                  />
                </div>
              </div>

              {amount && emiAmount && (
                <div className="p-3 bg-rose-500/5 border border-rose-500/15 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <p className="text-slate-500">Repayment Estimate</p>
                    <p className="text-slate-300 font-semibold">{name || 'SBI Loan'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-rose-400 font-bold block">{fmt(emiAmount)} / mo</p>
                    <p className="text-[10px] text-slate-500">Over {durationMonths || 0} months</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary text-xs flex-1">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary text-xs flex-1 gap-2">
                  {submitting ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
                  ) : 'Log Loan Account'}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Loan Record"
        message="Are you sure you want to delete this loan record? This action cannot be undone and will permanently remove all payment dates."
        confirmText="Delete Loan"
        cancelText="Cancel"
        confirmVariant="danger"
        loading={deleteConfirm.loading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null, loading: false })}
      />
    </div>
  );
}
