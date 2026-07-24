import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import ConfirmDialog from '../../components/common/ConfirmDialog';

export default function Loans() {
  const [loans, setLoans] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, loading: false });

  // New loan form
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('personal');
  const [amount, setAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [durationMonths, setDurationMonths] = useState('');
  const [emiAmount, setEmiAmount] = useState('');
  const [remainingBalance, setRemainingBalance] = useState('');
  const [nextEmiDate, setNextEmiDate] = useState('');

  // EMI payment state
  const [payingLoanId, setPayingLoanId] = useState(null);
  const [selectedWalletId, setSelectedWalletId] = useState('');

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
      setNextEmiDate('');
      fetchData();
    } catch {
      toast.error('Failed to log loan account');
    }
  };

  const handlePayEmi = async (loanId) => {
    if (wallets.length === 0) {
      return toast.error('Create a wallet first to execute EMI payments');
    }

    // If wallet selector is open for this loan, use selected wallet
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

    // If only one wallet, use it directly
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

    // Multiple wallets — show selector
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

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Loans & EMI Tracker</h1>
          <p className="text-xs text-slate-400 mt-0.5">Track education, home, car loans, and credit card interest calendars</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-xs">
          + Log New Loan
        </button>
      </div>

      {/* Wallet Empty State Banner */}
      {!loading && wallets.length === 0 && (
        <div className="card border-amber-500/30 bg-amber-500/5 text-center py-8 space-y-3 flex flex-col items-center">
          <img src="/wallet.png" alt="Wallet Logo" className="w-12 h-12 object-contain" />
          <h3 className="text-base font-bold text-slate-100 mt-2">You need a wallet before paying EMI</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Create a wallet to track your EMI payments and manage deductions automatically.
          </p>
          <Link to="/wallets" className="btn-primary text-xs inline-flex">
            Create Wallet
          </Link>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card h-44 animate-pulse bg-slate-800/40" />
          <div className="card h-44 animate-pulse bg-slate-800/40" />
        </div>
      ) : loans.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-slate-400">No active loans logged yet. Stay debt-free or log entries to plan repayments.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {loans.map((loan) => {
            const paidPrincipal = Math.max(loan.amount - loan.remainingBalance, 0);
            const pctPaid = loan.amount > 0 ? Math.round((paidPrincipal / loan.amount) * 100) : 0;
            return (
              <div key={loan._id} className="card flex flex-col justify-between hover:border-slate-500/20 transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="badge badge-red text-[10px] tracking-wide font-bold uppercase">{loan.type.replace('_', ' ')}</span>
                    <h3 className="text-base font-extrabold text-slate-100 mt-2">{loan.name}</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">Interest rate: {loan.interestRate}% • Term: {loan.durationMonths}m</p>
                  </div>
                  <div className="flex gap-2 items-start">
                    {loan.remainingBalance > 0 ? (
                      <div className="flex flex-col items-end gap-1.5">
                        <button
                          onClick={() => handlePayEmi(loan._id)}
                          disabled={wallets.length === 0}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                            wallets.length === 0
                              ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                              : 'bg-red-500/20 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white'
                          }`}
                        >
                          {payingLoanId === loan._id ? 'Confirm Pay' : 'Pay EMI'}
                        </button>
                        {/* Wallet selector dropdown */}
                        {payingLoanId === loan._id && (
                          <div className="flex gap-1 items-center">
                            <select
                              className="select text-[10px] py-1 px-2 min-w-[120px]"
                              value={selectedWalletId}
                              onChange={(e) => setSelectedWalletId(e.target.value)}
                            >
                              {wallets.map(w => (
                                <option key={w._id} value={w._id}>
                                  {w.icon} {w.name} (₹{w.balance.toLocaleString('en-IN')})
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => { setPayingLoanId(null); setSelectedWalletId(''); }}
                              className="text-slate-500 hover:text-slate-300 text-xs"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="badge badge-green">Paid Off 🎉</span>
                    )}
                    <button onClick={() => handleDelete(loan._id)} className="text-slate-500 hover:text-red-400 text-sm">
                      ✕
                    </button>
                  </div>
                </div>

                <div className="my-6 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Principal Paid Off</span>
                    <span className="font-bold text-slate-200">{pctPaid}% Paid</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill bg-red-500" style={{ width: `${pctPaid}%` }} />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                    <span>Paid: ₹{paidPrincipal.toLocaleString('en-IN')}</span>
                    <span>Total: ₹{Number(loan.amount).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-500 pt-3 border-t border-slate-700/50">
                  <span>EMI: ₹{Number(loan.emiAmount).toLocaleString('en-IN')}/mo</span>
                  <span>Next Date: {loan.remainingBalance > 0 ? new Date(loan.nextEmiDate).toLocaleDateString('en-IN') : 'Settled'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE LOAN MODAL */}
      {showCreate && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-fade-in overflow-y-auto">
          <div className="card w-full max-w-md space-y-4 max-h-[90dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl my-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
              <h3 className="font-bold text-slate-100">Log Loan Account</h3>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-100">✕</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="form-group">
                <label className="label">Loan Account Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. SBI Home Loan, Apple iPhone EMI" className="input" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="label">Loan Type</label>
                  <select value={type} onChange={(e) => setType(e.target.value)} className="select">
                    <option value="personal">Personal Loan</option>
                    <option value="education">Education Loan</option>
                    <option value="home">Home Loan</option>
                    <option value="car">Car Loan</option>
                    <option value="credit_card_emi">Credit Card EMI</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Interest Rate (% p.a.)</label>
                  <input type="number" step="0.1" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} placeholder="e.g. 8.5" className="input" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="form-group">
                  <label className="label">Duration (m)</label>
                  <input type="number" value={durationMonths} onChange={(e) => setDurationMonths(e.target.value)} placeholder="Months" className="input" />
                </div>
                <div className="form-group">
                  <label className="label">Total Amount (₹)</label>
                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Principal" className="input" />
                </div>
                <div className="form-group">
                  <label className="label">EMI / mo (₹)</label>
                  <input type="number" value={emiAmount} onChange={(e) => setEmiAmount(e.target.value)} placeholder="Installment" className="input" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="label">Remaining Balance (₹)</label>
                  <input type="number" value={remainingBalance} onChange={(e) => setRemainingBalance(e.target.value)} placeholder="Principal left" className="input" />
                </div>
                <div className="form-group">
                  <label className="label">Next EMI Date</label>
                  <input type="date" value={nextEmiDate} onChange={(e) => setNextEmiDate(e.target.value)} className="input" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary text-xs">Cancel</button>
                <button type="submit" className="btn-primary text-xs">Log Loan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Loan Record"
        message="Are you sure you want to delete this loan record? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        loading={deleteConfirm.loading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null, loading: false })}
      />
    </div>
  );
}
