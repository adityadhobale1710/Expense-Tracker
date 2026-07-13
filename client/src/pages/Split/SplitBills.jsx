import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function SplitBills() {
  const [splits, setSplits] = useState([]);
  const [loading, setLoading] = useState(true);

  // New split form
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [groupName, setGroupName] = useState('Restaurant');
  const [memberEmails, setMemberEmails] = useState('');

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

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title || !amount || !memberEmails) {
      return toast.error('Please enter title, amount, and member emails');
    }

    const emailList = memberEmails.split(',').map(email => email.trim().toLowerCase()).filter(Boolean);
    if (emailList.length === 0) return toast.error('Please provide at least one valid member email');

    // Calculate equal split shares
    const memberCount = emailList.length + 1; // plus creator
    const splitShare = Number(amount) / memberCount;

    const formattedMembers = emailList.map(email => ({
      userEmail: email,
      share: splitShare,
      paid: false,
      status: 'pending'
    }));

    try {
      await api.post('/splits', {
        title,
        amount: Number(amount),
        groupName,
        members: formattedMembers
      });
      toast.success('Split bill created successfully!');
      setShowCreate(false);
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

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Split Bills</h1>
          <p className="text-xs text-slate-400 mt-0.5">Split restaurant checks, room rent, and shared trips with colleagues and friends</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-xs">
          + Create Split Bill
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card h-48 animate-pulse bg-slate-800/40" />
          <div className="card h-48 animate-pulse bg-slate-800/40" />
        </div>
      ) : splits.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-slate-400">No active split bills found. Log shared expenses to track who owes what.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {splits.map((split) => {
            const creatorName = split.creator?.name || 'You';
            return (
              <div key={split._id} className="card flex flex-col justify-between hover:border-slate-500/20 transition-all">
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="badge badge-blue text-[10px] tracking-wide font-bold uppercase">{split.groupName}</span>
                      <h3 className="text-base font-extrabold text-slate-100 mt-2">{split.title}</h3>
                    </div>
                    <span className={`badge ${split.status === 'settled' ? 'badge-green' : 'badge-yellow'}`}>
                      {split.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Paid by: {creatorName} • Total amount: ₹{Number(split.amount).toLocaleString('en-IN')}</p>
                </div>

                <div className="my-4 space-y-2 border-t border-slate-700/50 pt-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Member Balances</p>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {split.members.map((m) => (
                      <div key={m._id} className="flex justify-between items-center text-xs">
                        <span className="text-slate-300">{m.userEmail}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-200">₹{Math.round(m.share).toLocaleString('en-IN')}</span>
                          {m.status === 'pending' ? (
                            <button
                              onClick={() => handleSettle(split._id, m.userEmail)}
                              className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded hover:bg-indigo-600 hover:text-white transition-all text-[10px]"
                            >
                              Settle
                            </button>
                          ) : (
                            <span className="text-emerald-400 text-[10px] font-bold">Settled</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-700/30 flex justify-between">
                  <span>Created: {new Date(split.createdAt).toLocaleDateString('en-IN')}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE SPLIT BILL MODAL */}
      {showCreate && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-fade-in overflow-y-auto">
          <div className="card w-full max-w-md space-y-4 max-h-[90dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl my-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
              <h3 className="font-bold text-slate-100">Create Split Bill</h3>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-100">✕</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="form-group">
                <label className="label">Bill Title</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Olive Garden Dinner, Airbnb Cabin rent" className="input" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="label">Group Category</label>
                  <select value={groupName} onChange={(e) => setGroupName(e.target.value)} className="select">
                    <option value="Restaurant">Restaurant Dinner</option>
                    <option value="Trip">Shared Trip/Travel</option>
                    <option value="Room Rent">Rent & Utilities</option>
                    <option value="Friends">Friends Hangout</option>
                    <option value="Office">Office Purchase</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Total Amount (₹)</label>
                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="input" />
                </div>
              </div>
              <div className="form-group">
                <label className="label">Friends Emails (Comma-separated)</label>
                <textarea rows="3" value={memberEmails} onChange={(e) => setMemberEmails(e.target.value)} placeholder="e.g. aditya@gmail.com, friend2@gmail.com" className="input resize-none" />
                <p className="text-[10px] text-slate-500 mt-1">Split shares are auto-calculated equally among members.</p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary text-xs">Cancel</button>
                <button type="submit" className="btn-primary text-xs">Settle Split Bill</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
