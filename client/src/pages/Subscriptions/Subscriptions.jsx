import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  // New subscription form
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [cost, setCost] = useState('');
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [renewalDate, setRenewalDate] = useState('');
  const [reminder, setReminder] = useState(true);

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
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name || !cost || !renewalDate) return toast.error('Please enter name, cost, and renewal date');
    try {
      await api.post('/subscriptions', {
        name,
        cost: Number(cost),
        billingCycle,
        renewalDate,
        reminder
      });
      toast.success('Subscription saved!');
      setShowCreate(false);
      setName('');
      setCost('');
      setRenewalDate('');
      fetchSubscriptions();
    } catch {
      toast.error('Failed to save subscription');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this subscription?')) return;
    try {
      await api.delete(`/subscriptions/${id}`);
      toast.success('Subscription deleted');
      fetchSubscriptions();
    } catch {
      toast.error('Failed to delete subscription');
    }
  };

  // Calculations
  const totalMonthlyCost = subscriptions.reduce((sum, s) => {
    return sum + (s.billingCycle === 'monthly' ? s.cost : s.cost / 12);
  }, 0);

  const totalYearlyCost = totalMonthlyCost * 12;

  const getSubLogo = (subName) => {
    const n = subName.toLowerCase();
    if (n.includes('netflix')) return '📺';
    if (n.includes('spotify')) return '🎵';
    if (n.includes('prime') || n.includes('amazon')) return '📦';
    if (n.includes('hotstar') || n.includes('disney')) return '🎬';
    if (n.includes('youtube')) return '🔴';
    if (n.includes('office') || n.includes('microsoft')) return '💻';
    if (n.includes('adobe') || n.includes('creative')) return '🎨';
    return '🔔';
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Subscription Manager</h1>
          <p className="text-xs text-slate-400 mt-0.5">Track and optimize Netflix, Spotify, Prime, Hotstar, and SaaS renewals</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-xs">
          + Add Subscription
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card-sm flex items-center gap-4 border-l-4 border-indigo-500">
          <span className="text-2xl">🗓️</span>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Monthly Commitments</p>
            <p className="text-lg font-extrabold text-slate-100 mt-0.5">₹{Math.round(totalMonthlyCost).toLocaleString('en-IN')}</p>
          </div>
        </div>
        <div className="card-sm flex items-center gap-4 border-l-4 border-amber-500">
          <span className="text-2xl">💎</span>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Yearly Commitments</p>
            <p className="text-lg font-extrabold text-slate-100 mt-0.5">₹{Math.round(totalYearlyCost).toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card h-36 animate-pulse bg-slate-800/40" />
          <div className="card h-36 animate-pulse bg-slate-800/40" />
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-slate-400">No active subscriptions tracked. Add products to get alerts before renewal dates.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {subscriptions.map((sub) => (
            <div key={sub._id} className="card flex flex-col justify-between hover:border-slate-500/20 transition-all relative overflow-hidden">
              <div className="flex justify-between items-start">
                <span className="text-3xl p-2 bg-slate-900/30 rounded-xl">{getSubLogo(sub.name)}</span>
                <button onClick={() => handleDelete(sub._id)} className="text-slate-500 hover:text-red-400 text-sm">
                  ✕
                </button>
              </div>
              <div className="mt-4">
                <h3 className="font-bold text-slate-100 text-base">{sub.name}</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Renews: {new Date(sub.renewalDate).toLocaleDateString('en-IN')}</p>
              </div>
              <div className="mt-6 flex justify-between items-baseline pt-3 border-t border-slate-700/50">
                <span className="text-xl font-extrabold text-slate-100">
                  ₹{Number(sub.cost).toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-indigo-400 font-bold uppercase">
                  {sub.billingCycle}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE SUB MODAL */}
      {showCreate && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-fade-in overflow-y-auto">
          <div className="card w-full max-w-md space-y-4 max-h-[90dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl my-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
              <h3 className="font-bold text-slate-100">Add Subscription</h3>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-100">✕</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="form-group">
                <label className="label">Subscription Service</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Netflix, Spotify Premium, Adobe Creative Cloud" className="input" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="label">Billing Cycle</label>
                  <select value={billingCycle} onChange={(e) => setBillingCycle(e.target.value)} className="select">
                    <option value="monthly">Monthly billing</option>
                    <option value="yearly">Yearly billing</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Cost (₹)</label>
                  <input type="number" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0.00" className="input" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="label">Renewal / Billing Date</label>
                  <input type="date" value={renewalDate} onChange={(e) => setRenewalDate(e.target.value)} className="input" />
                </div>
                <div className="form-group flex justify-center items-start pt-8">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={reminder} onChange={(e) => setReminder(e.target.checked)} className="rounded bg-dark-900 border-slate-700 text-primary-600 focus:ring-primary-500" />
                    <span className="text-xs text-slate-400">Enable notification alert</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary text-xs">Cancel</button>
                <button type="submit" className="btn-primary text-xs">Save Subscription</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
