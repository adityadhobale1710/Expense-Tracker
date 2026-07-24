import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { WalletCards, Wallet, CreditCard, Star, Layers, Plus, Search, Coins, Banknote } from 'lucide-react';
import api from '../../services/api';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import toast from 'react-hot-toast';

// ─── Constants ──────────────────────────────────────────
const WALLET_TYPES = [
  { value: 'cash', label: 'Cash', icon: '💵' },
  { value: 'bank', label: 'Bank Account', icon: '🏦' },
  { value: 'upi', label: 'UPI', icon: '📱' },
  { value: 'credit_card', label: 'Credit Card', icon: '💳' },
  { value: 'digital_wallet', label: 'Digital Wallet', icon: '🪙' },
  { value: 'debit_card', label: 'Debit Card', icon: '💳' },
  { value: 'business', label: 'Business', icon: '💼' },
  { value: 'crypto', label: 'Crypto', icon: '₿' },
  { value: 'gift_card', label: 'Gift Card', icon: '🎁' },
];

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'];
const CURRENCY_SYMBOLS = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };

const COLOR_OPTIONS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#06b6d4',
];

const ICON_OPTIONS = ['💳', '🏦', '💵', '📱', '🪙', '💼', '₿', '🎁', '👛', '💰', '🏧', '🔐'];

const SORT_OPTIONS = [
  { value: 'balance-desc', label: 'Highest Balance' },
  { value: 'balance-asc', label: 'Lowest Balance' },
  { value: 'updated', label: 'Recently Updated' },
];

const EMPTY_FORM = {
  name: '', type: 'bank', balance: '', currency: 'INR',
  color: '#6366f1', icon: '💳', isPrimary: false,
};

// ─── Sub-components ──────────────────────────────────────

function WalletEmptyState({ onCreateClick }) {
  return (
    <div className="card text-center py-16 space-y-4 flex flex-col items-center border border-slate-800">
      <div className="w-20 h-20 rounded-3xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center p-3 shadow-xl mb-2">
        <img src="/wallet.png" alt="Wallet Logo" className="w-full h-full object-contain" />
      </div>
      <h3 className="text-xl font-bold text-slate-100 mt-2">No Wallets Yet</h3>
      <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
        Create your first wallet to manage balances, track spending, and pay EMIs.
      </p>
      <button onClick={onCreateClick} className="btn-primary text-sm mx-auto flex items-center gap-2">
        <Plus size={16} />
        <span>Create Wallet</span>
      </button>
    </div>
  );
}

function WalletSummaryCards({ wallets }) {
  const totalBalance = wallets.reduce((s, w) => s + w.balance, 0);
  const primaryWallet = wallets.find(w => w.isPrimary) || wallets[0];
  const cs = primaryWallet ? (CURRENCY_SYMBOLS[primaryWallet.currency] || '₹') : '₹';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <div className="card hover:border-indigo-500/20 transition-all">
        <div className="flex items-center gap-3">
          <div className="stat-icon bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
            <Coins size={22} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Total Balance</p>
            <p className="text-xl font-extrabold text-slate-100">{cs}{totalBalance.toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>
      <div className="card hover:border-purple-500/20 transition-all">
        <div className="flex items-center gap-3">
          <div className="stat-icon bg-purple-500/15 text-purple-400 flex items-center justify-center">
            <WalletCards size={22} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Total Wallets</p>
            <p className="text-xl font-extrabold text-slate-100">{wallets.length}</p>
          </div>
        </div>
      </div>
      <div className="card hover:border-emerald-500/20 transition-all">
        <div className="flex items-center gap-3">
          <div className="stat-icon bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
            <Star size={22} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Primary Wallet</p>
            <p className="text-base font-bold text-slate-100 truncate">{primaryWallet?.name || '—'}</p>
          </div>
        </div>
      </div>
      <div className="card hover:border-cyan-500/20 transition-all">
        <div className="flex items-center gap-3">
          <div className="stat-icon bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
            <Layers size={22} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Wallet Types</p>
            <p className="text-base font-bold text-slate-100">{new Set(wallets.map(w => w.type)).size} types</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function WalletFilters({ search, onSearchChange, typeFilter, onTypeChange, sort, onSortChange }) {
  return (
    <div className="card-sm flex flex-wrap gap-3 items-center">
      <input
        type="text"
        className="input flex-1 min-w-[180px]"
        placeholder="🔍 Search wallets..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <select className="select flex-1 min-w-[140px]" value={typeFilter} onChange={(e) => onTypeChange(e.target.value)}>
        <option value="">All Types</option>
        {WALLET_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
      </select>
      <select className="select flex-1 min-w-[140px]" value={sort} onChange={(e) => onSortChange(e.target.value)}>
        {SORT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
    </div>
  );
}

function WalletCard({ wallet, onEdit, onDelete, onSetPrimary, onTransfer }) {
  const cs = CURRENCY_SYMBOLS[wallet.currency] || '₹';
  const typeLabel = WALLET_TYPES.find(t => t.value === wallet.type)?.label || wallet.type;
  return (
    <div
      className="card flex flex-col justify-between hover:border-indigo-500/20 transition-all group"
      style={{ borderTopColor: wallet.color, borderTopWidth: '3px' }}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: `${wallet.color}22` }}
          >
            {wallet.icon}
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
              {wallet.name}
              {wallet.isPrimary && (
                <span className="badge badge-purple text-[9px]">⭐ Primary</span>
              )}
            </h3>
            <span className="badge badge-blue text-[9px] mt-1">{typeLabel}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-700/50">
        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Balance</p>
        <p className="text-2xl font-extrabold text-slate-100 mt-0.5">
          {cs}{wallet.balance.toLocaleString('en-IN')}
          <span className="text-xs font-normal text-slate-500 ml-1">{wallet.currency}</span>
        </p>
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-700/50">
        <p className="text-[9px] text-slate-500">
          Updated {new Date(wallet.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </p>
        <div className="flex gap-1.5">
          {!wallet.isPrimary && (
            <button
              onClick={() => onSetPrimary(wallet._id)}
              className="text-[10px] px-2 py-1 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500 hover:text-white transition-all font-bold"
              title="Set as Primary"
            >
              ⭐
            </button>
          )}
          <button
            onClick={() => onTransfer(wallet)}
            className="text-[10px] px-2 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500 hover:text-white transition-all font-bold"
            title="Transfer"
          >
            ↗️
          </button>
          <button
            onClick={() => onEdit(wallet)}
            className="btn-ghost text-xs px-2 py-1"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(wallet)}
            className="btn-danger text-xs px-2 py-1"
          >
            Del
          </button>
        </div>
      </div>
    </div>
  );
}

function WalletHistory({ walletId, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!walletId) return;
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/wallets/${walletId}/history`);
        setHistory(data.data || []);
      } catch { /* silently fail */ }
      finally { setLoading(false); }
    };
    fetchHistory();
  }, [walletId]);

  return (
    <div className="space-y-3">
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : history.length === 0 ? (
        <p className="text-center text-slate-400 py-6 text-sm">No transactions yet for this wallet.</p>
      ) : (
        <div className="max-h-[50vh] overflow-y-auto space-y-2">
          {history.map(tx => (
            <div key={tx._id} className="p-3 bg-dark-900/50 border border-slate-700/30 rounded-xl flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-slate-200">{tx.title}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {new Date(tx.date).toLocaleDateString('en-IN')} · {tx.txType}
                </p>
              </div>
              <span className={`font-extrabold ${tx.txType === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                {tx.txType === 'income' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────
export default function Wallets() {
  const navigate = useNavigate();
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modal, setModal] = useState({ open: false, mode: 'add', wallet: null });
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  // Transfer modal
  const [transferModal, setTransferModal] = useState({ open: false, from: null });
  const [transferForm, setTransferForm] = useState({ toWalletId: '', amount: '', note: '' });

  // History modal
  const [historyModal, setHistoryModal] = useState({ open: false, walletId: null, walletName: '' });

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sort, setSort] = useState('balance-desc');

  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, wallet: null, loading: false });

  const fetchWallets = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/wallets');
      setWallets(data.data || []);
    } catch {
      toast.error('Failed to load wallets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWallets(); }, []);

  // Filtered + sorted wallets
  const filtered = useMemo(() => {
    let result = [...wallets];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(w => w.name.toLowerCase().includes(q));
    }
    if (typeFilter) {
      result = result.filter(w => w.type === typeFilter);
    }
    if (sort === 'balance-desc') result.sort((a, b) => b.balance - a.balance);
    else if (sort === 'balance-asc') result.sort((a, b) => a.balance - b.balance);
    else if (sort === 'updated') result.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    return result;
  }, [wallets, search, typeFilter, sort]);

  // ─── CRUD Handlers ──────────────────────────────────

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setModal({ open: true, mode: 'add', wallet: null });
  };

  const openEdit = (wallet) => {
    setForm({
      name: wallet.name,
      type: wallet.type,
      balance: wallet.balance,
      currency: wallet.currency,
      color: wallet.color,
      icon: wallet.icon,
      isPrimary: wallet.isPrimary,
    });
    setModal({ open: true, mode: 'edit', wallet });
  };

  const closeModal = () => setModal({ open: false, mode: 'add', wallet: null });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Wallet name is required');
    if (form.balance !== '' && Number(form.balance) < 0) return toast.error('Balance cannot be negative');

    setSubmitting(true);
    try {
      if (modal.mode === 'add') {
        await api.post('/wallets', { ...form, balance: Number(form.balance) || 0 });
        toast.success('Wallet created successfully! 🎉');
      } else {
        await api.put(`/wallets/${modal.wallet._id}`, { ...form, balance: Number(form.balance) || 0 });
        toast.success('Wallet updated successfully!');
      }
      closeModal();
      fetchWallets();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save wallet');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (wallet) => {
    if (wallet.isPrimary) return toast.error('Cannot delete primary wallet');
    setDeleteConfirm({ isOpen: true, wallet, loading: false });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.wallet) return;
    setDeleteConfirm((prev) => ({ ...prev, loading: true }));
    try {
      await api.delete(`/wallets/${deleteConfirm.wallet._id}`);
      toast.success('Wallet deleted successfully');
      fetchWallets();
      setDeleteConfirm({ isOpen: false, wallet: null, loading: false });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete wallet');
      setDeleteConfirm((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleSetPrimary = async (walletId) => {
    try {
      await api.patch(`/wallets/${walletId}/set-primary`);
      toast.success('Primary wallet updated! ⭐');
      fetchWallets();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to set primary');
    }
  };

  // ─── Transfer Handlers ──────────────────────────────

  const openTransfer = (wallet) => {
    setTransferForm({ toWalletId: '', amount: '', note: '' });
    setTransferModal({ open: true, from: wallet });
  };

  const closeTransfer = () => setTransferModal({ open: false, from: null });

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!transferForm.toWalletId || !transferForm.amount || Number(transferForm.amount) <= 0) {
      return toast.error('Select a destination wallet and valid amount');
    }
    setSubmitting(true);
    try {
      await api.post('/wallets/transfer', {
        fromWalletId: transferModal.from._id,
        toWalletId: transferForm.toWalletId,
        amount: Number(transferForm.amount),
        note: transferForm.note,
      });
      toast.success('Transfer successful! 🔄');
      closeTransfer();
      fetchWallets();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Transfer failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Page Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-slate-800 border border-slate-700/60 flex items-center justify-center p-2 shadow-lg flex-shrink-0">
            <img src="/wallet.png" alt="Wallet Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="page-title">Wallets</h1>
            <p className="page-subtitle">Manage your wallets, track balances, and transfer funds</p>
          </div>
        </div>
        <button id="create-wallet-btn" onClick={openCreate} className="btn-primary">
          + Create Wallet
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="card h-28 animate-pulse bg-slate-800/40" />)}
        </div>
      ) : wallets.length === 0 ? (
        <WalletEmptyState onCreateClick={openCreate} />
      ) : (
        <>
          {/* Summary Cards */}
          <WalletSummaryCards wallets={wallets} />

          {/* Filters */}
          <WalletFilters
            search={search} onSearchChange={setSearch}
            typeFilter={typeFilter} onTypeChange={setTypeFilter}
            sort={sort} onSortChange={setSort}
          />

          {/* Wallet Grid */}
          {filtered.length === 0 ? (
            <div className="card text-center py-10">
              <p className="text-slate-400 text-sm">No wallets match your search or filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filtered.map(wallet => (
                <WalletCard
                  key={wallet._id}
                  wallet={wallet}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onSetPrimary={handleSetPrimary}
                  onTransfer={openTransfer}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ─── Create/Edit Modal ─── */}
      <Modal
        isOpen={modal.open}
        onClose={closeModal}
        title={modal.mode === 'add' ? 'Create Wallet' : 'Edit Wallet'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="form-group">
              <label className="label">Wallet Name *</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="e.g. SBI Savings"
              />
            </div>
            <div className="form-group">
              <label className="label">Wallet Type *</label>
              <select className="select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {WALLET_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="form-group">
              <label className="label">{modal.mode === 'add' ? 'Opening Balance' : 'Balance'}</label>
              <input
                type="number"
                className="input"
                value={form.balance}
                onChange={(e) => setForm({ ...form, balance: e.target.value })}
                min="0"
                placeholder="0"
              />
            </div>
            <div className="form-group">
              <label className="label">Currency</label>
              <select className="select" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Color picker */}
          <div className="form-group">
            <label className="label">Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className={`w-8 h-8 rounded-lg border-2 transition-all ${form.color === c ? 'border-white scale-110' : 'border-transparent'}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          {/* Icon picker */}
          <div className="form-group">
            <label className="label">Icon</label>
            <div className="flex gap-2 flex-wrap">
              {ICON_OPTIONS.map(ic => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setForm({ ...form, icon: ic })}
                  className={`w-9 h-9 rounded-lg border-2 flex items-center justify-center text-lg transition-all ${form.icon === ic ? 'border-primary-500 bg-primary-500/20' : 'border-slate-700 bg-dark-900'}`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          {/* Primary toggle */}
          <div className="flex items-center gap-3 p-3 bg-dark-900/50 border border-slate-700/50 rounded-xl">
            <input
              type="checkbox"
              id="isPrimary"
              checked={form.isPrimary}
              onChange={(e) => setForm({ ...form, isPrimary: e.target.checked })}
              className="w-4 h-4 rounded accent-primary-500"
            />
            <label htmlFor="isPrimary" className="text-sm text-slate-300 cursor-pointer">
              Set as Primary Wallet
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={submitting}>
              {submitting ? 'Saving...' : modal.mode === 'add' ? 'Create Wallet' : 'Update Wallet'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── Transfer Modal ─── */}
      <Modal
        isOpen={transferModal.open}
        onClose={closeTransfer}
        title={`Transfer from ${transferModal.from?.name || ''}`}
        size="md"
      >
        <form onSubmit={handleTransfer} className="space-y-4">
          <div className="p-3 bg-dark-900/50 border border-slate-700/50 rounded-xl text-sm">
            <p className="text-slate-400">From: <span className="text-slate-100 font-bold">{transferModal.from?.name}</span></p>
            <p className="text-slate-400 text-xs mt-1">
              Available: <span className="text-emerald-400 font-bold">
                {CURRENCY_SYMBOLS[transferModal.from?.currency] || '₹'}{transferModal.from?.balance?.toLocaleString('en-IN')}
              </span>
            </p>
          </div>
          <div className="form-group">
            <label className="label">To Wallet *</label>
            <select
              className="select"
              value={transferForm.toWalletId}
              onChange={(e) => setTransferForm({ ...transferForm, toWalletId: e.target.value })}
              required
            >
              <option value="">Select destination wallet</option>
              {wallets.filter(w => w._id !== transferModal.from?._id).map(w => (
                <option key={w._id} value={w._id}>{w.icon} {w.name} ({CURRENCY_SYMBOLS[w.currency]}{w.balance.toLocaleString('en-IN')})</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Amount *</label>
            <input
              type="number"
              className="input"
              value={transferForm.amount}
              onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
              required
              min="1"
              max={transferModal.from?.balance}
              placeholder="0"
            />
          </div>
          <div className="form-group">
            <label className="label">Note</label>
            <input
              className="input"
              value={transferForm.note}
              onChange={(e) => setTransferForm({ ...transferForm, note: e.target.value })}
              placeholder="Optional transfer note"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={closeTransfer} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={submitting}>
              {submitting ? 'Transferring...' : 'Transfer Funds'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── History Modal ─── */}
      <Modal
        isOpen={historyModal.open}
        onClose={() => setHistoryModal({ open: false, walletId: null, walletName: '' })}
        title={`${historyModal.walletName} — History`}
        size="lg"
      >
        <WalletHistory walletId={historyModal.walletId} />
      </Modal>

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Wallet"
        message={`Are you sure you want to delete "${deleteConfirm.wallet?.name || 'this wallet'}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        loading={deleteConfirm.loading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, wallet: null, loading: false })}
      />
    </div>
  );
}
