import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function Wallets() {
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Create wallet form
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('bank');
  const [balance, setBalance] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [icon, setIcon] = useState('🏦');

  // Transfer form
  const [showTransfer, setShowTransfer] = useState(false);
  const [fromWallet, setFromWallet] = useState('');
  const [toWallet, setToWallet] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [note, setNote] = useState('');

  const fetchWallets = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/wallets');
      setWallets(data.data || []);
    } catch (e) {
      toast.error('Failed to load wallets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallets();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name) return toast.error('Please enter a wallet name');
    try {
      await api.post('/wallets', {
        name,
        type,
        balance: Number(balance) || 0,
        color,
        icon,
      });
      toast.success('Wallet created!');
      setShowCreate(false);
      setName('');
      setBalance('');
      fetchWallets();
    } catch {
      toast.error('Failed to create wallet');
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!fromWallet || !toWallet) return toast.error('Select source and destination wallets');
    if (fromWallet === toWallet) return toast.error('Source and destination cannot be the same');
    if (!transferAmount || Number(transferAmount) <= 0) return toast.error('Enter a valid transfer amount');

    try {
      await api.post('/wallets/transfer', {
        fromWalletId: fromWallet,
        toWalletId: toWallet,
        amount: Number(transferAmount),
        note,
      });
      toast.success('Funds transferred successfully!');
      setShowTransfer(false);
      setTransferAmount('');
      setNote('');
      fetchWallets();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Transfer failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this wallet?')) return;
    try {
      await api.delete(`/wallets/${id}`);
      toast.success('Wallet deleted');
      fetchWallets();
    } catch {
      toast.error('Failed to delete wallet');
    }
  };

  const WALLET_TYPES = [
    { value: 'cash', label: 'Cash', icon: '💵' },
    { value: 'bank', label: 'Bank Account', icon: '🏦' },
    { value: 'upi', label: 'UPI Wallet', icon: '📱' },
    { value: 'credit_card', label: 'Credit Card', icon: '💳' },
    { value: 'debit_card', label: 'Debit Card', icon: '📇' },
    { value: 'business', label: 'Business Account', icon: '💼' },
    { value: 'crypto', label: 'Crypto Wallet', icon: '🪙' },
    { value: 'gift_card', label: 'Gift Card', icon: '🎁' }
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Multiple Wallets</h1>
          <p className="text-xs text-slate-400 mt-0.5">Manage balances across accounts and transfer funds</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowTransfer(true)} className="btn bg-slate-800 border border-slate-700 text-slate-300 hover:text-slate-100 text-xs">
            ⇄ Transfer Money
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-primary text-xs">
            + New Wallet
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card h-40 animate-pulse bg-slate-800/40" />
          <div className="card h-40 animate-pulse bg-slate-800/40" />
          <div className="card h-40 animate-pulse bg-slate-800/40" />
        </div>
      ) : wallets.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-slate-400">No custom wallets created yet. Set up wallets to segment cash flows.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {wallets.map((wallet) => (
            <div key={wallet._id} className="card relative overflow-hidden group hover:border-slate-500/40 transition-all">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/5 to-transparent rounded-bl-full pointer-events-none" />
              <div className="flex justify-between items-start">
                <span className="text-3xl p-2 bg-slate-900/30 rounded-xl">{wallet.icon || '💳'}</span>
                <button onClick={() => handleDelete(wallet._id)} className="text-slate-500 hover:text-red-400 text-sm">
                  ✕
                </button>
              </div>
              <div className="mt-4">
                <h3 className="font-bold text-slate-100 text-base">{wallet.name}</h3>
                <p className="text-xs text-slate-500 uppercase font-semibold mt-0.5">{wallet.type}</p>
              </div>
              <div className="mt-6 flex justify-between items-baseline">
                <span className="text-2xl font-extrabold text-slate-100">
                  ₹{Number(wallet.balance).toLocaleString('en-IN')}
                </span>
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: wallet.color }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE WALLET MODAL */}
      {showCreate && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="card w-full max-w-md space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
              <h3 className="font-bold text-slate-100">Create New Wallet</h3>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-100">✕</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="form-group">
                <label className="label">Wallet Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. HDFC Salary, ICICI Gold, Cash" className="input" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="label">Type</label>
                  <select value={type} onChange={(e) => {
                    setType(e.target.value);
                    const selected = WALLET_TYPES.find(w => w.value === e.target.value);
                    if (selected) {
                      setIcon(selected.icon);
                    }
                  }} className="select">
                    {WALLET_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Opening Balance (₹)</label>
                  <input type="number" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="0.00" className="input" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="label">Wallet Theme Icon</label>
                  <input type="text" value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="Icon Emoji" className="input" />
                </div>
                <div className="form-group">
                  <label className="label">Color Marker</label>
                  <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="input h-10 p-1" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary text-xs">Cancel</button>
                <button type="submit" className="btn-primary text-xs">Add Wallet</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TRANSFER MODAL */}
      {showTransfer && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="card w-full max-w-md space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
              <h3 className="font-bold text-slate-100">Transfer Between Wallets</h3>
              <button onClick={() => setShowTransfer(false)} className="text-slate-400 hover:text-slate-100">✕</button>
            </div>
            <form onSubmit={handleTransfer} className="space-y-4">
              <div className="form-group">
                <label className="label">From Wallet</label>
                <select value={fromWallet} onChange={(e) => setFromWallet(e.target.value)} className="select">
                  <option value="">Select Source Wallet</option>
                  {wallets.map(w => (
                    <option key={w._id} value={w._id}>{w.name} (Balance: ₹{w.balance})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="label">To Wallet</label>
                <select value={toWallet} onChange={(e) => setToWallet(e.target.value)} className="select">
                  <option value="">Select Destination Wallet</option>
                  {wallets.map(w => (
                    <option key={w._id} value={w._id}>{w.name} (Balance: ₹{w.balance})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Transfer Amount (₹)</label>
                <input type="number" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} placeholder="0.00" className="input" />
              </div>
              <div className="form-group">
                <label className="label">Note / Remark</label>
                <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Monthly transfer, repayment" className="input" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowTransfer(false)} className="btn-secondary text-xs">Cancel</button>
                <button type="submit" className="btn-primary text-xs">Settle Transfer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
