import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);

  // New goal form
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [category, setCategory] = useState('General');

  // Allocate cash form
  const [showAllocate, setShowAllocate] = useState(false);
  const [activeGoal, setActiveGoal] = useState(null);
  const [allocateAmount, setAllocateAmount] = useState('');
  const [sourceWallet, setSourceWallet] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [goalsRes, walletsRes] = await Promise.all([
        api.get('/goals'),
        api.get('/wallets')
      ]);
      setGoals(goalsRes.data.data || []);
      setWallets(walletsRes.data.data || []);
    } catch {
      toast.error('Failed to load goals data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name || !targetAmount || !deadline) {
      return toast.error('Please fill out all fields');
    }
    try {
      await api.post('/goals', {
        name,
        targetAmount: Number(targetAmount),
        deadline,
        category
      });
      toast.success('Savings goal set!');
      setShowCreate(false);
      setName('');
      setTargetAmount('');
      setDeadline('');
      fetchData();
    } catch {
      toast.error('Failed to create savings goal');
    }
  };

  const handleAllocate = async (e) => {
    e.preventDefault();
    if (!allocateAmount || Number(allocateAmount) <= 0) return toast.error('Enter a valid deposit amount');
    try {
      const selectedWallet = wallets.find(w => w._id === sourceWallet);
      await api.post(`/goals/${activeGoal._id}/deposit`, {
        amount: Number(allocateAmount),
        sourceWalletName: selectedWallet ? selectedWallet.name : 'Primary Balance'
      });
      toast.success('Funds allocated to savings goal!');
      setShowAllocate(false);
      setAllocateAmount('');
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to deposit savings');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this savings goal?')) return;
    try {
      await api.delete(`/goals/${id}`);
      toast.success('Savings goal deleted');
      fetchData();
    } catch {
      toast.error('Failed to delete goal');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Savings Goals</h1>
          <p className="text-xs text-slate-400 mt-0.5">Track your progress towards items, weddings, or emergency cushions</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-xs">
          + Set New Goal
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card h-44 animate-pulse bg-slate-800/40" />
          <div className="card h-44 animate-pulse bg-slate-800/40" />
        </div>
      ) : goals.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-slate-400">No active savings goals found. Set targets to budget effectively.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {goals.map((goal) => {
            const pct = goal.progressPct || 0;
            const remaining = Math.max(goal.targetAmount - goal.currentSaved, 0);
            
            // Estimated Completion Date calculation (simulated monthly savings of 2500)
            const simulatedMonthlySave = 2500;
            const monthsToSave = simulatedMonthlySave > 0 ? Math.ceil(remaining / simulatedMonthlySave) : 1;
            const estDate = new Date();
            estDate.setMonth(estDate.getMonth() + monthsToSave);
            const estDateString = estDate.toLocaleDateString('en-IN', { year: 'numeric', month: 'short' });

            return (
              <div key={goal._id} className="card flex flex-col justify-between hover:border-slate-500/20 transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="badge badge-purple text-[10px] tracking-wide font-bold uppercase">{goal.category}</span>
                    <h3 className="text-base font-extrabold text-slate-100 mt-2">{goal.name}</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">Deadline: {new Date(goal.deadline).toLocaleDateString('en-IN')}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setActiveGoal(goal);
                        setShowAllocate(true);
                      }}
                      className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-bold hover:bg-emerald-500 hover:text-white transition-all"
                    >
                      Allocate Cash
                    </button>
                    <button onClick={() => handleDelete(goal._id)} className="text-slate-500 hover:text-red-400 text-sm">
                      ✕
                    </button>
                  </div>
                </div>

                <div className="my-6 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Progress</span>
                    <span className="font-bold text-slate-200">{pct}% Completed</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill bg-purple-500" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                    <span>Saved: ₹{Number(goal.currentSaved).toLocaleString('en-IN')}</span>
                    <span>Target: ₹{Number(goal.targetAmount).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-500 pt-3 border-t border-slate-700/50">
                  <span>Remaining: ₹{remaining.toLocaleString('en-IN')}</span>
                  <span className="text-indigo-400">Est. Completion: {goal.status === 'completed' ? 'Completed! 🎉' : estDateString}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE GOAL MODAL */}
      {showCreate && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="card w-full max-w-md space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
              <h3 className="font-bold text-slate-100">Set Savings Goal</h3>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-100">✕</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="form-group">
                <label className="label">Goal Title</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Royal Enfield Bike, Wedding Fund, MacBook Pro" className="input" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="label">Target Amount (₹)</label>
                  <input type="number" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} placeholder="e.g. 150000" className="input" />
                </div>
                <div className="form-group">
                  <label className="label">Deadline</label>
                  <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="input" />
                </div>
              </div>
              <div className="form-group">
                <label className="label">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="select">
                  <option value="General">General Savings</option>
                  <option value="Emergency Fund">Emergency Cushion</option>
                  <option value="Vehicle">Vehicle Purchase</option>
                  <option value="Tech">Gadgets & Tech</option>
                  <option value="Vacation">Vacation Travel</option>
                  <option value="Wedding">Wedding Expense</option>
                  <option value="House">Real Estate/House</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary text-xs">Cancel</button>
                <button type="submit" className="btn-primary text-xs">Create Goal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ALLOCATE CASH MODAL */}
      {showAllocate && activeGoal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="card w-full max-w-md space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
              <h3 className="font-bold text-slate-100">Deposit Savings - {activeGoal.name}</h3>
              <button onClick={() => setShowAllocate(false)} className="text-slate-400 hover:text-slate-100">✕</button>
            </div>
            <form onSubmit={handleAllocate} className="space-y-4">
              <div className="form-group">
                <label className="label">Source Wallet / Ledger</label>
                <select value={sourceWallet} onChange={(e) => setSourceWallet(e.target.value)} className="select">
                  <option value="">Select Wallet</option>
                  {wallets.map(w => (
                    <option key={w._id} value={w._id}>{w.name} (Balance: ₹{w.balance})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Amount to Deposit (₹)</label>
                <input type="number" value={allocateAmount} onChange={(e) => setAllocateAmount(e.target.value)} placeholder="0.00" className="input" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAllocate(false)} className="btn-secondary text-xs">Cancel</button>
                <button type="submit" className="btn-primary text-xs">Deposit Money</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
