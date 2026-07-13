import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function FamilySharing() {
  const [family, setFamily] = useState(null);
  const [loading, setLoading] = useState(true);

  // Invite member form
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');

  // Approval request form
  const [showRequest, setShowRequest] = useState(false);
  const [reqTitle, setReqTitle] = useState('');
  const [reqAmount, setReqAmount] = useState('');
  const [reqCategory, setReqCategory] = useState('General');

  const fetchFamily = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/family');
      setFamily(data.data || null);
    } catch {
      toast.error('Failed to load family sharing hub');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFamily();
  }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email) return toast.error('Please enter an email address');
    try {
      const { data } = await api.post('/family/invite', { email, role });
      toast.success(`Invite sent to ${email}!`);
      setEmail('');
      setFamily(data.data);
      fetchFamily();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to send invite');
    }
  };

  const handleRequestApproval = async (e) => {
    e.preventDefault();
    if (!reqTitle || !reqAmount) return toast.error('Please enter title and amount');
    try {
      await api.post('/family/approval-request', {
        title: reqTitle,
        amount: Number(reqAmount),
        category: reqCategory
      });
      toast.success('Approval request submitted!');
      setShowRequest(false);
      setReqTitle('');
      setReqAmount('');
      fetchFamily();
    } catch {
      toast.error('Failed to submit request');
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.post(`/family/approve/${id}`);
      toast.success('Request approved successfully!');
      fetchFamily();
    } catch {
      toast.error('Failed to approve transaction request');
    }
  };

  const handleReject = async (id) => {
    try {
      await api.post(`/family/reject/${id}`);
      toast.success('Request rejected');
      fetchFamily();
    } catch {
      toast.error('Failed to reject request');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Family Sharing</h1>
          <p className="text-xs text-slate-400 mt-0.5">Invite family members, assign roles, and configure expense approval workflows</p>
        </div>
        <button onClick={() => setShowRequest(true)} className="btn bg-indigo-600 hover:bg-indigo-500 text-white text-xs">
          Request Expense Approval
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card h-48 animate-pulse bg-slate-800/40 lg:col-span-2" />
          <div className="card h-48 animate-pulse bg-slate-800/40" />
        </div>
      ) : !family ? (
        <div className="card text-center py-12">
          <p className="text-slate-400">Loading family hub information...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Members list & Invite Panel */}
          <div className="card lg:col-span-2 space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-700/50">
              <h3 className="text-sm font-bold text-slate-200">{family.name}</h3>
              <span className="badge badge-purple text-[10px] uppercase font-bold">Owner: {family.owner?.name}</span>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Family Members</h4>
              <div className="space-y-3">
                {family.members.map((m) => (
                  <div key={m._id} className="flex justify-between items-center bg-slate-900/30 p-3 rounded-xl border border-slate-800">
                    <div>
                      <p className="text-xs font-semibold text-slate-200">{m.email}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wide">Role: {m.role} • Status: {m.status}</p>
                    </div>
                    <span className={`badge ${m.status === 'accepted' ? 'badge-green' : 'badge-yellow'}`}>
                      {m.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Invite Form */}
            <form onSubmit={handleInvite} className="pt-4 border-t border-slate-700/50 flex flex-col sm:flex-row gap-3 items-end">
              <div className="form-group flex-1">
                <label className="label">Invite Family Member (Email)</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="family@gmail.com" className="input" />
              </div>
              <div className="form-group w-full sm:w-40">
                <label className="label">Role</label>
                <select value={role} onChange={(e) => setRole(e.target.value)} className="select">
                  <option value="member">Member</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <button type="submit" className="btn-primary w-full sm:w-auto text-xs px-6 py-2.5">
                Send Invitation
              </button>
            </form>
          </div>

          {/* Approvals ledger */}
          <div className="card space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-200 pb-3 border-b border-slate-700/50">Expense Approvals</h3>
              <div className="space-y-4 mt-4 max-h-[300px] overflow-y-auto pr-1">
                {family.approvals.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">No approvals logged yet.</p>
                ) : (
                  family.approvals.map((req) => (
                    <div key={req._id} className="bg-slate-900/40 border border-slate-800 p-3 rounded-xl space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-bold text-slate-200">{req.title}</p>
                          <p className="text-[10px] text-slate-500">Requested by: {req.requesterEmail}</p>
                        </div>
                        <span className="text-sm font-extrabold text-indigo-400">₹{req.amount}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-[10px]">
                        <span className={`badge ${req.status === 'approved' ? 'badge-green' : req.status === 'rejected' ? 'badge-red' : 'badge-yellow'}`}>
                          {req.status.toUpperCase()}
                        </span>
                        {req.status === 'pending' && (
                          <div className="flex gap-2">
                            <button onClick={() => handleApprove(req._id)} className="px-2 py-0.5 bg-green-500/20 text-green-400 border border-green-500/20 rounded font-bold hover:bg-green-500 hover:text-white transition-all">
                              Approve
                            </button>
                            <button onClick={() => handleReject(req._id)} className="px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/20 rounded font-bold hover:bg-red-500 hover:text-white transition-all">
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE APPROVAL REQUEST MODAL */}
      {showRequest && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="card w-full max-w-md space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
              <h3 className="font-bold text-slate-100">Request Expense Approval</h3>
              <button onClick={() => setShowRequest(false)} className="text-slate-400 hover:text-slate-100">✕</button>
            </div>
            <form onSubmit={handleRequestApproval} className="space-y-4">
              <div className="form-group">
                <label className="label">Item Name / Title</label>
                <input type="text" value={reqTitle} onChange={(e) => setReqTitle(e.target.value)} placeholder="e.g. Science Class Books, Weekly Groceries" className="input" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="label">Category</label>
                  <select value={reqCategory} onChange={(e) => setReqCategory(e.target.value)} className="select">
                    <option value="Education">Education</option>
                    <option value="Food & Dining">Food & Dining</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Shopping">Shopping</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Estimated Amount (₹)</label>
                  <input type="number" value={reqAmount} onChange={(e) => setReqAmount(e.target.value)} placeholder="0.00" className="input" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowRequest(false)} className="btn-secondary text-xs">Cancel</button>
                <button type="submit" className="btn-primary text-xs">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
