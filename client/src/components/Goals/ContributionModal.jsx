import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Wallet, AlertCircle, Plus, Landmark } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function ContributionModal({
  isOpen,
  onClose,
  onSubmit,
  goal = {}
}) {
  const [amount, setAmount] = useState('');
  const [walletId, setWalletId] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [type, setType] = useState('Manual');
  const [error, setError] = useState('');

  // Fetch wallets list directly for selection
  const { data: wallets = [], isLoading: isLoadingWallets } = useQuery({
    queryKey: ['wallets'],
    queryFn: async () => {
      const { data } = await api.get('/wallets');
      return data.data || [];
    },
    enabled: isOpen
  });

  const remaining = goal ? goal.targetAmount - goal.savedAmount : 0;

  useEffect(() => {
    if (isOpen) {
      setAmount(remaining.toString()); // prefill remaining
      setNote('');
      setDate(new Date().toISOString().substring(0, 10));
      setType('Manual');
      setError('');
      
      // Auto select first wallet if available
      if (wallets.length > 0) {
        setWalletId(wallets[0]._id);
      }
    }
  }, [isOpen, goal, wallets]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const contribAmount = Number(amount);
    if (!contribAmount || contribAmount <= 0) {
      return setError('Contribution amount must be greater than zero');
    }

    if (!walletId) {
      return setError('Please select a wallet to transfer savings from');
    }

    // Wallet balance check
    const selectedWallet = wallets.find(w => w._id === walletId);
    if (selectedWallet && selectedWallet.balance < contribAmount) {
      return setError(`Insufficient balance in wallet ${selectedWallet.name}. Current Balance: ₹${selectedWallet.balance.toLocaleString('en-IN')}`);
    }

    onSubmit({
      amount: contribAmount,
      walletId,
      note: note || `Savings transfer to goal: ${goal.title}`,
      date,
      type
    });
  };

  const handlePrefill = (percentageVal) => {
    if (!goal) return;
    const value = Math.round(goal.targetAmount * (percentageVal / 100));
    const capped = Math.min(value, remaining);
    setAmount(capped.toString());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md bg-dark-800/90 border border-slate-700/60 rounded-3xl shadow-2xl p-6 overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-700/30">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Wallet size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-100">
                Savings Transfer
              </h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">Allocate savings from a cash wallet to "{goal.title}"</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-dark-900 border border-slate-700/30 text-slate-400 hover:text-slate-200">
            <X size={16} />
          </button>
        </div>

        {/* Error alert */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-semibold my-4">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          
          {/* Target Reference */}
          <div className="p-3 bg-dark-900/60 border border-slate-700/30 rounded-2xl flex justify-between text-xs font-bold text-slate-400">
            <span>Remaining Target:</span>
            <span className="text-slate-200 font-black">₹{remaining.toLocaleString('en-IN')}</span>
          </div>

          {/* Amount input */}
          <div className="flex flex-col space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Transfer Amount (INR)</label>
              {/* Quick pre-fills */}
              <div className="flex gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <button type="button" onClick={() => handlePrefill(10)} className="hover:text-primary-400">10%</button>
                <button type="button" onClick={() => handlePrefill(25)} className="hover:text-primary-400">25%</button>
                <button type="button" onClick={() => handlePrefill(50)} className="hover:text-primary-400">50%</button>
                <button type="button" onClick={() => setAmount(remaining.toString())} className="hover:text-primary-400 font-bold text-emerald-400">Max</button>
              </div>
            </div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 5000"
              className="px-3.5 py-2.5 bg-dark-900 border border-slate-700/40 rounded-xl text-xs font-bold focus:outline-none focus:border-primary-500"
            />
          </div>

          {/* Wallet Select */}
          <div className="flex flex-col space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Source Wallet</label>
            {isLoadingWallets ? (
              <div className="h-9 bg-dark-900 border border-slate-700 rounded-xl animate-pulse" />
            ) : (
              <select
                value={walletId}
                onChange={(e) => setWalletId(e.target.value)}
                className="px-3.5 py-2 bg-dark-900 border border-slate-700/40 rounded-xl text-xs font-semibold focus:outline-none focus:border-primary-500"
              >
                <option value="">-- Select Source Wallet --</option>
                {wallets.map(w => (
                  <option key={w._id} value={w._id}>
                    {w.name} (Balance: ₹{w.balance.toLocaleString('en-IN')})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Note & Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="px-3.5 py-2 bg-dark-900 border border-slate-700/40 rounded-xl text-xs font-semibold focus:outline-none focus:border-primary-500"
              />
            </div>
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="px-3.5 py-2 bg-dark-900 border border-slate-700/40 rounded-xl text-xs font-semibold focus:outline-none focus:border-primary-500"
              >
                <option value="Manual">Manual</option>
                <option value="Wallet Transfer">Wallet Transfer</option>
                <option value="Automatic">Automatic</option>
                <option value="Reward">Reward</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="flex flex-col space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Transfer Notes</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Added half of my monthly freelance bonus"
              className="px-3.5 py-2 bg-dark-900 border border-slate-700/40 rounded-xl text-xs font-semibold focus:outline-none focus:border-primary-500"
            />
          </div>



          {/* Submit */}
          <div className="pt-4 border-t border-slate-700/30 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-dark-900 border border-slate-700/40 text-xs font-bold text-slate-300 hover:text-slate-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-xs font-bold text-slate-100 rounded-xl shadow-md transition-all shadow-emerald-500/10 flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span>Transfer Funds</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
