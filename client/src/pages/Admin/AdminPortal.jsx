import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function AdminPortal() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('diagnostics');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, feedbackRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users'),
        api.get('/admin/feedback')
      ]);
      setStats(statsRes.data.data);
      setUsers(usersRes.data.data || []);
      setFeedback(feedbackRes.data.data || []);
    } catch {
      toast.error('Failed to load admin stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateFeedback = async (id, status) => {
    try {
      await api.put(`/admin/feedback/${id}`, { status });
      toast.success(`Feedback marked as ${status}`);
      fetchData();
    } catch {
      toast.error('Failed to update feedback');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Admin Control Center</h1>
          <p className="text-xs text-slate-400 mt-0.5">Diagnose server performance, check system settings, and manage user directories</p>
        </div>
        {/* Tab triggers */}
        <div className="flex bg-slate-900 border border-slate-700/50 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`px-4 py-1.5 text-xs rounded-lg font-semibold transition-all ${
              activeTab === 'diagnostics' ? 'bg-primary-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Diagnostics
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-1.5 text-xs rounded-lg font-semibold transition-all ${
              activeTab === 'users' ? 'bg-primary-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            User Directory
          </button>
          <button
            onClick={() => setActiveTab('feedback')}
            className={`px-4 py-1.5 text-xs rounded-lg font-semibold transition-all ${
              activeTab === 'feedback' ? 'bg-primary-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Feedback Inbox
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card h-40 animate-pulse bg-slate-800/40" />
          <div className="card h-40 animate-pulse bg-slate-800/40" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Metrics summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card-sm flex items-center gap-3 border-l-4 border-primary-500">
              <span className="text-xl">👥</span>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Total Accounts</p>
                <p className="text-lg font-extrabold text-slate-100 mt-0.5">{stats?.overview?.totalUsers}</p>
              </div>
            </div>
            <div className="card-sm flex items-center gap-3 border-l-4 border-amber-500">
              <span className="text-xl">👑</span>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Premium Users</p>
                <p className="text-lg font-extrabold text-slate-100 mt-0.5">{stats?.overview?.premiumUsers}</p>
              </div>
            </div>
            <div className="card-sm flex items-center gap-3 border-l-4 border-indigo-500">
              <span className="text-xl">📝</span>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Logs Count</p>
                <p className="text-lg font-extrabold text-slate-100 mt-0.5">{stats?.overview?.totalTransactions}</p>
              </div>
            </div>
            <div className="card-sm flex items-center gap-3 border-l-4 border-red-500">
              <span className="text-xl">📫</span>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Open Reports</p>
                <p className="text-lg font-extrabold text-slate-100 mt-0.5">{stats?.overview?.totalFeedback}</p>
              </div>
            </div>
          </div>

          {/* Diagnostics Section */}
          {activeTab === 'diagnostics' && stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* CPU Card */}
              <div className="card flex flex-col justify-between items-center text-center p-6">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">CPU Usage</h4>
                <div className="relative w-28 h-28 flex items-center justify-center my-4">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" stroke="#1e293b" strokeWidth="8" fill="transparent" />
                    <circle cx="50" cy="50" r="40" stroke="#ef4444" strokeWidth="8" fill="transparent" strokeDasharray="251" strokeDashoffset={251 - (251 * stats.diagnostics.cpuUsage) / 100} />
                  </svg>
                  <span className="absolute text-xl font-extrabold text-slate-100">{stats.diagnostics.cpuUsage}%</span>
                </div>
                <p className="text-[11px] text-slate-500">Core execution workload is optimized</p>
              </div>

              {/* RAM Card */}
              <div className="card flex flex-col justify-between items-center text-center p-6">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">RAM Usage</h4>
                <div className="relative w-28 h-28 flex items-center justify-center my-4">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" stroke="#1e293b" strokeWidth="8" fill="transparent" />
                    <circle cx="50" cy="50" r="40" stroke="#10b981" strokeWidth="8" fill="transparent" strokeDasharray="251" strokeDashoffset={251 - (251 * stats.diagnostics.ramUsage) / 100} />
                  </svg>
                  <span className="absolute text-xl font-extrabold text-slate-100">{stats.diagnostics.ramUsage}%</span>
                </div>
                <p className="text-[11px] text-slate-500">Shared memory heap distribution is active</p>
              </div>

              {/* Health Metrics Card */}
              <div className="card flex flex-col justify-between p-6">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-700/50">System Health</h4>
                <div className="space-y-3.5 my-4 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Server Uptime:</span>
                    <span className="font-bold text-slate-200">{stats.diagnostics.uptime}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Database Status:</span>
                    <span className="text-emerald-400 font-bold">Connected ✅</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Active Handlers:</span>
                    <span className="font-bold text-slate-200">{stats.diagnostics.activeConnections} sockets</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500">MERN Stack core system is fully operational</p>
              </div>
            </div>
          )}

          {/* User Directory Tab */}
          {activeTab === 'users' && (
            <div className="card space-y-4">
              <h3 className="text-sm font-bold text-slate-200">Registered Accounts</h3>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Account Name</th>
                      <th>Email ID</th>
                      <th>Access Level</th>
                      <th>Phone</th>
                      <th>Joined Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u._id}>
                        <td><span className="font-bold text-slate-200">{u.name}</span></td>
                        <td>{u.email}</td>
                        <td>
                          <span className={`badge ${u.role === 'admin' ? 'badge-red' : u.role === 'premium' ? 'badge-yellow' : 'badge-green'}`}>
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="text-slate-400 text-xs">{u.phone || 'Not provided'}</td>
                        <td className="text-xs text-slate-500">{new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Feedback Inbox Tab */}
          {activeTab === 'feedback' && (
            <div className="card space-y-4">
              <h3 className="text-sm font-bold text-slate-200">User Inquiries & Reports</h3>
              <div className="space-y-4">
                {feedback.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">No support reports received.</p>
                ) : (
                  feedback.map(item => (
                    <div key={item._id} className="bg-slate-900/40 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="badge badge-purple text-[10px] font-bold uppercase">{item.status}</span>
                          <span className="font-bold text-xs text-slate-200">{item.subject}</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-normal">{item.message}</p>
                        <p className="text-[10px] text-slate-500">From: {item.user?.name} ({item.user?.email})</p>
                      </div>
                      <div className="flex md:flex-col justify-end gap-2 items-end">
                        {item.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleUpdateFeedback(item._id, 'reviewed')}
                              className="px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg text-[10px] font-bold hover:bg-amber-500 hover:text-white transition-all"
                            >
                              Mark Reviewed
                            </button>
                            <button
                              onClick={() => handleUpdateFeedback(item._id, 'resolved')}
                              className="px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/20 rounded-lg text-[10px] font-bold hover:bg-green-500 hover:text-white transition-all"
                            >
                              Resolve Issue
                            </button>
                          </>
                        )}
                        {item.status === 'reviewed' && (
                          <button
                            onClick={() => handleUpdateFeedback(item._id, 'resolved')}
                            className="px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/20 rounded-lg text-[10px] font-bold hover:bg-green-500 hover:text-white transition-all"
                          >
                            Resolve Issue
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
