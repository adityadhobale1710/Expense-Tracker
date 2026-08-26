import { useState, useEffect, useCallback, useContext, useRef } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { DialogContext } from '../../context/DialogContext';
import { useAuth } from '../../context/AuthContext';
import AdminAnalytics from './AdminAnalytics';

// ─── Utility helpers ──────────────────────────────────────────────────────────
const fmt = (n) => (n ?? 0).toLocaleString('en-IN');
const fmtCurrency = (n, cur = 'INR') => {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n);
};
const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const fmtDateTime = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};
const timeAgo = (d) => {
  if (!d) return '—';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return fmtDate(d);
};

// ─── Custom hook: debounce ────────────────────────────────────────────────────
function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, color = 'border-primary-500', loading }) {
  if (loading) {
    return <div className="card-sm h-24 animate-pulse bg-slate-800/40 rounded-xl" />;
  }
  return (
    <div className={`card-sm flex items-center gap-3 border-l-4 ${color} hover:border-opacity-80 transition-all`}>
      <span className="text-xl flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-tight">{label}</p>
        <p className="text-xl font-extrabold text-slate-100 mt-0.5 leading-tight">{value}</p>
        {sub && <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ isBlocked, isDisabled }) {
  if (isBlocked && isDisabled) return <span className="badge badge-red">Blocked+Disabled</span>;
  if (isBlocked)  return <span className="badge badge-red">Blocked</span>;
  if (isDisabled) return <span className="badge" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>Disabled</span>;
  return <span className="badge badge-green">Active</span>;
}

// ─── Role Badge ───────────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  const cfg = {
    admin:   { cls: 'badge-red',    label: 'Admin' },
    premium: { cls: 'badge-yellow', label: 'Premium' },
    user:    { cls: 'badge-blue',   label: 'User' },
  };
  const { cls, label } = cfg[role] || { cls: 'badge-blue', label: role };
  return <span className={`badge ${cls}`}>{label}</span>;
}

// ─── Pagination ────────────────────────────────────────────────────────────────
function Pagination({ page, totalPages, total, limit, onPageChange }) {
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end   = Math.min(page * limit, total);

  const pages = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-700/50">
      <p className="text-xs text-slate-400">
        {total === 0 ? 'No users found' : `Showing ${start}–${end} of ${fmt(total)} users`}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="px-3 py-1.5 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          aria-label="Previous page"
        >
          ← Prev
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-2 py-1.5 text-xs text-slate-500">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                p === page
                  ? 'bg-primary-600 border-primary-500 text-white font-bold'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
              aria-label={`Page ${p}`}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages || totalPages === 0}
          className="px-3 py-1.5 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          aria-label="Next page"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

// ─── User Sessions Panel ───────────────────────────────────────────────────────
function UserSessionsPanel({ userId, onRevokeSession }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await api.get(`/admin/users/${userId}/sessions`);
      setSessions(res.data.data);
    } catch {
      toast.error('Failed to load user sessions');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  if (loading) return <div className="h-20 bg-slate-800/40 rounded-xl animate-pulse" />;
  if (sessions.length === 0) return <p className="text-xs text-slate-500">No session history found.</p>;

  return (
    <div className="space-y-2">
      {sessions.map(s => (
        <div key={s._id} className={`p-3 rounded-xl border flex flex-col md:flex-row justify-between gap-3 ${s.isActive ? 'bg-slate-900/60 border-slate-700/50' : 'bg-slate-950/40 border-slate-800/50 opacity-60'}`}>
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${s.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
              <span className="text-xs font-bold text-slate-200 truncate">{s.deviceName}</span>
            </div>
            <p className="text-[10px] text-slate-500 font-mono">{s.ipAddress} • {s.browser}</p>
            <p className="text-[10px] text-slate-400">Last seen: {fmtDateTime(s.lastActive)}</p>
          </div>
          {s.isActive && (
            <button
              onClick={() => onRevokeSession(s._id, fetchSessions)}
              className="btn btn-ghost text-red-400 text-[10px] py-1 px-2 h-fit"
            >
              Revoke
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── User Activity Panel ───────────────────────────────────────────────────────
function UserActivityPanel({ userId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    setLoading(true);
    api.get(`/admin/users/${userId}/activity?page=${page}&limit=5`)
      .then(res => {
        setEvents(res.data.data.events);
        setTotalPages(res.data.data.pagination.totalPages);
      })
      .catch(() => toast.error('Failed to load user activity'))
      .finally(() => setLoading(false));
  }, [userId, page]);

  if (loading && events.length === 0) return <div className="h-40 bg-slate-800/40 rounded-xl animate-pulse" />;
  if (events.length === 0) return <p className="text-xs text-slate-500">No recent activity.</p>;

  return (
    <div className="space-y-4">
      <div className="relative border-l border-slate-700/50 ml-3 space-y-6 pb-2">
        {events.map((evt, i) => (
          <div key={evt._id} className="relative pl-6">
            <span className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-dark-800 ${
              evt.severity === 'CRITICAL' ? 'bg-red-500' :
              evt.severity === 'HIGH' ? 'bg-amber-500' :
              evt.severity === 'MEDIUM' ? 'bg-yellow-500' :
              evt.severity === 'LOW' ? 'bg-emerald-500' : 'bg-blue-500'
            }`} />
            <p className="text-xs text-slate-400 mb-0.5">{fmtDateTime(evt.timestamp)}</p>
            <p className="text-sm font-semibold text-slate-200">{evt.action}</p>
            {evt.details && <p className="text-xs text-slate-500 mt-1">{evt.details}</p>}
          </div>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-2">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn btn-secondary py-1 px-3 text-[10px]">Newer</button>
          <span className="text-[10px] text-slate-500 py-1">{page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="btn btn-secondary py-1 px-3 text-[10px]">Older</button>
        </div>
      )}
    </div>
  );
}

// ─── User Detail Drawer ────────────────────────────────────────────────────────
function UserDetailDrawer({ userId, onClose, onActionComplete }) {
  const { showConfirm } = useContext(DialogContext);
  const { user: adminUser } = useAuth();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const drawerRef = useRef(null);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    api.get(`/admin/users/${userId}`)
      .then((res) => setDetail(res.data.data))
      .catch(() => toast.error('Failed to load user details'))
      .finally(() => setLoading(false));
  }, [userId]);

  // Focus trap & keyboard close
  useEffect(() => {
    const el = drawerRef.current;
    if (el) el.focus();
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleAction = async (action, confirmOpts) => {
    const confirmed = await showConfirm(confirmOpts);
    if (!confirmed) return;
    setActionLoading(true);
    try {
      await api.patch(`/admin/users/${userId}/status`, { action });
      toast.success(`User ${action}ed successfully`);
      // Refresh detail
      const res = await api.get(`/admin/users/${userId}`);
      setDetail(res.data.data);
      onActionComplete?.();
    } catch (e) {
      toast.error(e?.response?.data?.message || `Failed to ${action} user`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevoke = async () => {
    const confirmed = await showConfirm({
      title: 'Revoke All Sessions?',
      message: 'This will sign the user out of all active devices immediately. Their existing access tokens will expire within 15 minutes.',
      confirmText: 'Revoke Sessions',
      cancelText: 'Cancel',
      variant: 'warning',
    });
    if (!confirmed) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/admin/users/${userId}/revoke-sessions`);
      toast.success(`Sessions revoked (${res.data.data?.sessionsDeactivated ?? 0} deactivated)`);
      const detailRes = await api.get(`/admin/users/${userId}`);
      setDetail(detailRes.data.data);
      onActionComplete?.();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to revoke sessions');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeIndividual = async (sessionId, refreshSessions) => {
    const confirmed = await showConfirm({
      title: 'Revoke Session?',
      message: 'This specific session will be terminated immediately.',
      confirmText: 'Revoke',
      cancelText: 'Cancel',
      variant: 'warning',
    });
    if (!confirmed) return;
    try {
      await api.post(`/admin/users/${userId}/sessions/${sessionId}/revoke`);
      toast.success('Session revoked');
      refreshSessions(); // re-fetch the sessions list
      // Also refresh main detail for lastSeen/activeSessions counts
      const detailRes = await api.get(`/admin/users/${userId}`);
      setDetail(detailRes.data.data);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to revoke session');
    }
  };

  const u = detail?.user;
  const fin = detail?.financialSummary;
  const eng = detail?.engagement;
  const ses = detail?.sessions;

  const isSelf = u?._id?.toString() === adminUser?._id?.toString();

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer — slides in from right */}
      <div
        ref={drawerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="User Details"
        className="fixed right-0 top-0 h-full w-full max-w-2xl bg-dark-800 border-l border-slate-700/50 z-50 overflow-y-auto shadow-2xl outline-none"
        style={{ animation: 'slideInRight 0.25s ease-out' }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-dark-800 border-b border-slate-700/50">
          <div>
            <h2 className="text-base font-bold text-slate-100">User Details</h2>
            <p className="text-xs text-slate-400 mt-0.5">Admin view — sensitive fields excluded</p>
          </div>
          <button
            onClick={onClose}
            className="btn-icon text-slate-400 hover:text-slate-100"
            aria-label="Close drawer"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="p-6 space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-slate-800/40 animate-pulse" />
            ))}
          </div>
        ) : !detail ? (
          <div className="p-6 text-center text-slate-400">Failed to load user details.</div>
        ) : (
          <div className="p-6 space-y-6 pb-10">
            {/* ── Profile ───────────────────────────────────────────── */}
            <section className="card space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary-600/20 border border-primary-500/30 flex items-center justify-center text-primary-400 font-bold text-xl flex-shrink-0 overflow-hidden">
                  {u?.avatar ? (
                    <img src={u.avatar} alt={u.name} className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    (u?.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-100 text-lg truncate">{u?.name}</h3>
                  <p className="text-sm text-slate-400 truncate">{u?.email}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {/* Role = display only (correction #4) */}
                    <RoleBadge role={u?.role} />
                    <StatusBadge isBlocked={u?.isBlocked} isDisabled={u?.isDisabled} />
                    {u?.isEmailVerified
                      ? <span className="badge badge-green">✓ Email Verified</span>
                      : <span className="badge badge-red">✗ Unverified</span>
                    }
                    {u?.twoFactorEnabled && <span className="badge badge-purple">2FA Enabled</span>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  { label: 'User ID',      value: u?._id?.toString().slice(-8) + '…' },
                  { label: 'Currency',     value: u?.currency || '—' },
                  { label: 'Phone',        value: u?.phone || 'Not provided' },
                  { label: 'Company',      value: u?.company || 'Not provided' },
                  { label: 'Registered',   value: fmtDate(u?.createdAt) },
                  { label: 'Last Updated', value: fmtDate(u?.updatedAt) },
                  // Correction #2: labeled "Last Seen" sourced from Session.lastActive
                  { label: 'Last Seen',    value: u?.lastSeen ? fmtDateTime(u.lastSeen) : 'No sessions recorded' },
                  { label: 'Active Sessions', value: ses?.activeSessions ?? 0 },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-900/40 rounded-xl p-3 border border-slate-800">
                    <p className="text-slate-500 mb-0.5">{label}</p>
                    <p className="font-semibold text-slate-200 break-all">{value}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Financial Summary ─────────────────────────────────── */}
            <section className="card space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-700/50">
                Financial Summary
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                {[
                  { label: 'Total Expenses',     value: fmtCurrency(fin?.totalExpenses),   sub: `${fmt(fin?.expenseCount)} records`, color: 'text-red-400' },
                  { label: 'Total Income',        value: fmtCurrency(fin?.totalIncome),    sub: `${fmt(fin?.incomeCount)} records`,  color: 'text-emerald-400' },
                  { label: 'Budgets',             value: fmt(fin?.budgets),                sub: 'budget plans',                      color: 'text-blue-400' },
                  { label: 'Goals',               value: fmt(fin?.goals),                  sub: 'savings goals',                     color: 'text-violet-400' },
                  { label: 'Subscriptions',       value: fmt(fin?.subscriptions),          sub: 'active subscriptions',              color: 'text-amber-400' },
                  { label: 'Loans',               value: fmt(fin?.loans),                  sub: 'loan records',                      color: 'text-orange-400' },
                  { label: 'Wallets / Accounts',  value: fmt(fin?.wallets),                sub: 'payment accounts',                  color: 'text-teal-400' },
                ].map(({ label, value, sub, color }) => (
                  <div key={label} className="bg-slate-900/40 rounded-xl p-3 border border-slate-800">
                    <p className="text-slate-500 mb-0.5">{label}</p>
                    <p className={`font-extrabold text-base ${color}`}>{value}</p>
                    <p className="text-slate-600 mt-0.5">{sub}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Engagement ────────────────────────────────────────── */}
            <section className="card space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-700/50">
                Gamification & Engagement
              </h4>
              <div className="grid grid-cols-3 gap-3 text-xs">
                {[
                  { label: 'Level',         value: eng?.level ?? 1,         icon: '⭐' },
                  { label: 'XP',            value: fmt(eng?.xp),            icon: '✨' },
                  { label: 'Streak',        value: `${eng?.streak ?? 0}d`,  icon: '🔥' },
                  { label: 'Longest Streak',value: `${eng?.longestStreak ?? 0}d`, icon: '🏅' },
                  { label: 'Rank',          value: eng?.rank ?? 'Bronze',   icon: '🎖️' },
                  { label: 'Feedback',      value: eng?.feedbackCount ?? 0, icon: '💬' },
                ].map(({ label, value, icon }) => (
                  <div key={label} className="bg-slate-900/40 rounded-xl p-3 border border-slate-800 text-center">
                    <p className="text-xl mb-1">{icon}</p>
                    <p className="font-bold text-slate-200">{value}</p>
                    <p className="text-slate-500">{label}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Security Center (Phase 3) ─────────────────────────── */}
            <section className="card space-y-6 border border-slate-700">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-700/50">
                <span className="text-lg">🛡️</span>
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Security &amp; Devices
                </h4>
              </div>
              
              <div className="space-y-3">
                <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active &amp; Recent Sessions</h5>
                <UserSessionsPanel userId={userId} onRevokeSession={handleRevokeIndividual} />
              </div>

              <div className="space-y-3">
                <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Activity Timeline</h5>
                <UserActivityPanel userId={userId} />
              </div>
            </section>

            {/* ── Account Actions ───────────────────────────────────── */}
            {!isSelf && (
              <section className="card space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-700/50">
                  Account Actions
                  <span className="ml-2 font-normal normal-case text-slate-600">— requires confirmation</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Block / Unblock */}
                  {u?.isBlocked ? (
                    <button
                      disabled={actionLoading}
                      onClick={() => handleAction('unblock', {
                        title: 'Unblock User?',
                        message: `This will restore access for ${u.name} (${u.email}).`,
                        confirmText: 'Unblock User',
                        cancelText: 'Cancel',
                        variant: 'success',
                      })}
                      className="btn btn-secondary gap-2 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                    >
                      ✓ Unblock User
                    </button>
                  ) : (
                    <button
                      disabled={actionLoading}
                      onClick={() => handleAction('block', {
                        title: 'Block User?',
                        message: `This will prevent ${u.name} (${u.email}) from signing in. They can be unblocked later.`,
                        confirmText: 'Block User',
                        cancelText: 'Cancel',
                        variant: 'danger',
                      })}
                      className="btn btn-danger"
                    >
                      🚫 Block User
                    </button>
                  )}

                  {/* Disable / Enable */}
                  {u?.isDisabled ? (
                    <button
                      disabled={actionLoading}
                      onClick={() => handleAction('enable', {
                        title: 'Enable User?',
                        message: `This will restore sign-in access for ${u.name} (${u.email}).`,
                        confirmText: 'Enable User',
                        cancelText: 'Cancel',
                        variant: 'success',
                      })}
                      className="btn btn-secondary gap-2 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                    >
                      ✓ Enable User
                    </button>
                  ) : (
                    <button
                      disabled={actionLoading}
                      onClick={() => handleAction('disable', {
                        title: 'Disable User?',
                        message: `This will prevent ${u.name} (${u.email}) from signing in. They can be re-enabled later.`,
                        confirmText: 'Disable User',
                        cancelText: 'Cancel',
                        variant: 'warning',
                      })}
                      className="btn btn-secondary gap-2 text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                    >
                      ⛔ Disable User
                    </button>
                  )}

                  {/* Revoke Sessions */}
                  <button
                    disabled={actionLoading}
                    onClick={handleRevoke}
                    className="btn btn-secondary gap-2 text-slate-300 sm:col-span-2"
                  >
                    🔑 Revoke All Sessions
                  </button>
                </div>

                {actionLoading && (
                  <p className="text-xs text-slate-500 text-center">Processing action…</p>
                )}
              </section>
            )}

            {isSelf && (
              <div className="card bg-amber-500/10 border-amber-500/20 text-center">
                <p className="text-xs text-amber-400">
                  ⚠️ Account actions are disabled for your own account to prevent self-lockout.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ADMIN PORTAL
// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminPortal() {
  const [activeTab, setActiveTab] = useState('overview');

  // ── Overview state ──────────────────────────────────────────────────────────
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError]  = useState(false);

  // ── Users state ─────────────────────────────────────────────────────────────
  const [users, setUsers]           = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError]     = useState(false);

  // ── Users filters ───────────────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState('');
  const [sortBy, setSortBy]           = useState('createdAt');
  const [sortOrder, setSortOrder]     = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);

  const debouncedSearch = useDebounce(searchInput, 400);

  // ── Feedback state ─────────────────────────────────────────────────────────
  const [feedback, setFeedback]     = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  // ── User detail drawer ──────────────────────────────────────────────────────
  const [drawerUserId, setDrawerUserId] = useState(null);

  // ── Phase 3: Security state ────────────────────────────────────────────────
  const [securityOverview, setSecurityOverview] = useState(null);
  const [securityOverviewLoading, setSecurityOverviewLoading] = useState(false);

  const [securityEvents, setSecurityEvents] = useState([]);
  const [securityPagination, setSecurityPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securityFilterAction, setSecurityFilterAction] = useState('');
  const [securityFilterUser, setSecurityFilterUser] = useState('');
  const [securityPage, setSecurityPage] = useState(1);
  const debouncedSecurityUser = useDebounce(securityFilterUser, 400);

  // ── Fetch overview stats ────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(false);
    try {
      const res = await api.get('/admin/stats');
      setStats(res.data.data);
    } catch {
      setStatsError(true);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // ── Fetch users ─────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async (opts = {}) => {
    setUsersLoading(true);
    setUsersError(false);
    try {
      const params = new URLSearchParams({
        page:      opts.page      ?? currentPage,
        limit:     20,
        search:    opts.search    ?? debouncedSearch,
        role:      opts.role      ?? roleFilter,
        status:    opts.status    ?? statusFilter,
        verified:  opts.verified  ?? verifiedFilter,
        sortBy:    opts.sortBy    ?? sortBy,
        sortOrder: opts.sortOrder ?? sortOrder,
      });
      const res = await api.get(`/admin/users?${params}`);
      setUsers(res.data.data.users || []);
      setPagination(res.data.data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch {
      setUsersError(true);
    } finally {
      setUsersLoading(false);
    }
  }, [currentPage, debouncedSearch, roleFilter, statusFilter, verifiedFilter, sortBy, sortOrder]);

  // ── Fetch feedback ─────────────────────────────────────────────────────────
  const fetchFeedback = useCallback(async () => {
    setFeedbackLoading(true);
    try {
      const res = await api.get('/admin/feedback');
      setFeedback(res.data.data || []);
    } catch {
      toast.error('Failed to load feedback');
    } finally {
      setFeedbackLoading(false);
    }
  }, []);

  // ── Phase 3: Fetch Security Overview ───────────────────────────────────────
  const fetchSecurityOverview = useCallback(async () => {
    setSecurityOverviewLoading(true);
    try {
      const res = await api.get('/admin/security/overview');
      setSecurityOverview(res.data.data);
    } catch {
      toast.error('Failed to load security overview');
    } finally {
      setSecurityOverviewLoading(false);
    }
  }, []);

  // ── Phase 3: Fetch Security Events ─────────────────────────────────────────
  const fetchSecurityEvents = useCallback(async (opts = {}) => {
    setSecurityLoading(true);
    try {
      const params = new URLSearchParams({
        page:   opts.page   ?? securityPage,
        limit:  20,
        action: opts.action ?? securityFilterAction,
        user:   opts.user   ?? debouncedSecurityUser,
      });
      const res = await api.get(`/admin/security/events?${params}`);
      setSecurityEvents(res.data.data.events || []);
      setSecurityPagination(res.data.data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch {
      toast.error('Failed to load security events');
    } finally {
      setSecurityLoading(false);
    }
  }, [securityPage, securityFilterAction, debouncedSecurityUser]);

  // ── Initial load ─────────────────────────────────────────────────────────
  useEffect(() => { fetchStats(); }, [fetchStats]);

  // ── Correction #3: Unified fetch effect for filters and tab switching ─────
  useEffect(() => {
    if (activeTab === 'users') {
      setCurrentPage(1);
      fetchUsers({ page: 1 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, debouncedSearch, roleFilter, statusFilter, verifiedFilter, sortBy, sortOrder]);

  // ── Fetch when user explicitly changes pages (but ignore the reset to 1) ──
  useEffect(() => {
    if (activeTab === 'users' && currentPage !== 1) {
      fetchUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // ── Load feedback when tab active ────────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'feedback') fetchFeedback();
  }, [activeTab, fetchFeedback]);

  // ── Phase 3: Load Security when tab active or filters change ───────────────
  useEffect(() => {
    if (activeTab === 'security') {
      fetchSecurityOverview();
      fetchSecurityEvents();
    }
  }, [activeTab, fetchSecurityOverview, fetchSecurityEvents]);

  // Reset security page on filter change
  useEffect(() => {
    setSecurityPage(1);
  }, [securityFilterAction, debouncedSecurityUser]);

  const handleUpdateFeedback = async (id, status) => {
    try {
      await api.put(`/admin/feedback/${id}`, { status });
      toast.success(`Feedback marked as ${status}`);
      fetchFeedback();
    } catch {
      toast.error('Failed to update feedback');
    }
  };

  const handleSortToggle = (field) => {
    if (sortBy === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <span className="text-slate-600 ml-1">↕</span>;
    return <span className="text-primary-400 ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>;
  };

  const TABS = [
    { id: 'overview',  label: 'Overview',     icon: '📊' },
    { id: 'analytics', label: 'Analytics',    icon: '📈' },
    { id: 'users',     label: 'Users',        icon: '👥' },
    { id: 'security',  label: 'Security',     icon: '🛡️' },
    { id: 'health',    label: 'System Health', icon: '🖥️' },
    { id: 'feedback',  label: 'Feedback',     icon: '💬' },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Admin Control Center</h1>
          <p className="text-xs text-slate-400 mt-0.5">Platform overview, user management, and system diagnostics</p>
        </div>
        <button
          onClick={() => { fetchStats(); if (activeTab === 'users') fetchUsers(); }}
          className="btn btn-secondary text-xs self-start sm:self-auto"
          aria-label="Refresh data"
        >
          ↺ Refresh
        </button>
      </div>

      {/* ── Tab Navigation ────────────────────────────────────────────────── */}
      <div
        className="flex bg-slate-900 border border-slate-700/50 p-1 rounded-xl gap-0.5 overflow-x-auto"
        role="tablist"
        aria-label="Admin sections"
      >
        {TABS.map(({ id, label, icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={activeTab === id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-lg font-semibold transition-all whitespace-nowrap ${
              activeTab === id
                ? 'bg-primary-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="text-sm">{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* OVERVIEW TAB                                                       */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-6" role="tabpanel" aria-label="Overview">
          {statsError && (
            <div className="card border-red-500/30 text-center py-8">
              <p className="text-sm text-red-400 mb-3">Unable to load admin statistics.</p>
              <button onClick={fetchStats} className="btn btn-secondary text-xs">Try Again</button>
            </div>
          )}

          {/* ── User KPI Cards ──────────────────────────────────────────── */}
          <div>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">User Metrics</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              <KpiCard loading={statsLoading} icon="👥" label="Total Users"   value={fmt(stats?.userMetrics?.total)}        color="border-primary-500" />
              <KpiCard loading={statsLoading} icon="✅" label="Active Users"   value={fmt(stats?.userMetrics?.active)}       sub="neither blocked nor disabled" color="border-emerald-500" />
              <KpiCard loading={statsLoading} icon="🚫" label="Blocked Only"   value={fmt(stats?.userMetrics?.blockedOnly)}  sub="isBlocked, not disabled"      color="border-red-500" />
              <KpiCard loading={statsLoading} icon="⛔" label="Disabled Only"  value={fmt(stats?.userMetrics?.disabledOnly)} sub="isDisabled, not blocked"      color="border-amber-500" />
              <KpiCard loading={statsLoading} icon="🔒" label="Blocked+Disabled" value={fmt(stats?.userMetrics?.bothFlags)} sub="both flags set"               color="border-rose-700" />
              <KpiCard loading={statsLoading} icon="🛡️" label="Admin Users"   value={fmt(stats?.userMetrics?.adminUsers)}                                      color="border-violet-500" />
              <KpiCard loading={statsLoading} icon="🆕" label="New Today"      value={fmt(stats?.userMetrics?.newToday)}    sub="UTC midnight boundary"        color="border-sky-500" />
              <KpiCard loading={statsLoading} icon="📅" label="New This Week"  value={fmt(stats?.userMetrics?.newThisWeek)} sub="since Sunday 00:00 UTC"       color="border-indigo-500" />
              <KpiCard loading={statsLoading} icon="📆" label="New This Month" value={fmt(stats?.userMetrics?.newThisMonth)} sub="since 1st 00:00 UTC"         color="border-teal-500" />
            </div>
            <p className="text-[10px] text-slate-600 mt-2">
              Status groups are mutually exclusive: Active + Blocked-Only + Disabled-Only + Blocked+Disabled = Total Users. Timezone: UTC.
            </p>
          </div>

          {/* ── Financial Activity ──────────────────────────────────────── */}
          <div>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Platform Financial Activity</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              <KpiCard loading={statsLoading} icon="💸" label="Expense Records" value={fmt(stats?.financialMetrics?.expenses)}      sub={fmtCurrency(stats?.financialMetrics?.expenseVolume)} color="border-red-500" />
              <KpiCard loading={statsLoading} icon="💰" label="Income Records"  value={fmt(stats?.financialMetrics?.incomes)}       sub={fmtCurrency(stats?.financialMetrics?.incomeVolume)}  color="border-emerald-500" />
              <KpiCard loading={statsLoading} icon="📋" label="Budgets"         value={fmt(stats?.financialMetrics?.budgets)}       color="border-blue-500" />
              <KpiCard loading={statsLoading} icon="🎯" label="Goals"           value={fmt(stats?.financialMetrics?.goals)}         color="border-violet-500" />
              <KpiCard loading={statsLoading} icon="🔁" label="Subscriptions"   value={fmt(stats?.financialMetrics?.subscriptions)} color="border-amber-500" />
              <KpiCard loading={statsLoading} icon="🏛️" label="Loans"          value={fmt(stats?.financialMetrics?.loans)}         color="border-orange-500" />
              <KpiCard loading={statsLoading} icon="💳" label="Wallets"         value={fmt(stats?.financialMetrics?.wallets)}       color="border-teal-500" />
              <KpiCard loading={statsLoading} icon="💬" label="Feedback"        value={fmt(stats?.feedback?.total)}                 color="border-pink-500" />
            </div>
          </div>

          {/* ── Recent Admin Activity ──────────────────────────────────── */}
          <div>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Recent Admin Activity</h2>
            <div className="card">
              {statsLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-12 rounded-lg bg-slate-800/40 animate-pulse" />
                  ))}
                </div>
              ) : !stats?.recentAdminActivity?.length ? (
                <p className="text-xs text-slate-500 text-center py-6">No admin activity recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {stats.recentAdminActivity.map((log, i) => (
                    <div key={i} className="flex items-start justify-between gap-3 p-3 bg-slate-900/40 rounded-xl border border-slate-800">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-200">{log.action}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5 truncate">{log.details}</p>
                        {log.user && (
                          <p className="text-[10px] text-slate-600 mt-0.5">
                            by {log.user.name} ({log.user.email})
                          </p>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 whitespace-nowrap flex-shrink-0">{timeAgo(log.timestamp)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ANALYTICS TAB (Phase 4)                                            */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'analytics' && (
        <div role="tabpanel" aria-label="Analytics">
          <AdminAnalytics />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* USERS TAB                                                          */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'users' && (
        <div className="space-y-4" role="tabpanel" aria-label="User management">
          {/* ── Search + Filters ──────────────────────────────────────── */}
          <div className="card space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
                <input
                  type="text"
                  placeholder="Search by name or email…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="input pl-9 text-sm"
                  aria-label="Search users"
                  id="user-search"
                />
                {searchInput && (
                  <button
                    onClick={() => setSearchInput('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-sm"
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="select text-xs w-32"
                  aria-label="Filter by role"
                >
                  <option value="">All Roles</option>
                  <option value="user">User</option>
                  <option value="premium">Premium</option>
                  <option value="admin">Admin</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="select text-xs w-40"
                  aria-label="Filter by status"
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active (neither)</option>
                  <option value="blocked">Blocked Only</option>
                  <option value="disabled">Disabled Only</option>
                  <option value="both">Blocked + Disabled</option>
                </select>

                <select
                  value={verifiedFilter}
                  onChange={(e) => setVerifiedFilter(e.target.value)}
                  className="select text-xs w-36"
                  aria-label="Filter by verification"
                >
                  <option value="">All Verified</option>
                  <option value="verified">Email Verified</option>
                  <option value="unverified">Unverified</option>
                </select>

                {/* Clear filters */}
                {(roleFilter || statusFilter || verifiedFilter || searchInput) && (
                  <button
                    onClick={() => {
                      setRoleFilter('');
                      setStatusFilter('');
                      setVerifiedFilter('');
                      setSearchInput('');
                    }}
                    className="btn btn-ghost text-xs text-slate-400"
                    aria-label="Clear all filters"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Users Table ───────────────────────────────────────────── */}
          <div className="card space-y-4">
            {usersError ? (
              <div className="text-center py-10">
                <p className="text-sm text-red-400 mb-3">Unable to load users.</p>
                <button onClick={() => fetchUsers()} className="btn btn-secondary text-xs">
                  Try Again
                </button>
              </div>
            ) : (
              <>
                <div className="table-container">
                  <table className="table" aria-label="User directory">
                    <thead>
                      <tr>
                        <th>
                          <button onClick={() => handleSortToggle('name')} className="flex items-center hover:text-slate-200">
                            Name <SortIcon field="name" />
                          </button>
                        </th>
                        <th>
                          <button onClick={() => handleSortToggle('email')} className="flex items-center hover:text-slate-200">
                            Email <SortIcon field="email" />
                          </button>
                        </th>
                        <th>Role</th>
                        <th>Status</th>
                        <th className="hidden lg:table-cell">Verified</th>
                        <th className="hidden xl:table-cell">Currency</th>
                        <th>
                          <button onClick={() => handleSortToggle('createdAt')} className="flex items-center hover:text-slate-200">
                            Registered <SortIcon field="createdAt" />
                          </button>
                        </th>
                        <th className="hidden md:table-cell">Last Seen</th>
                        <th className="hidden lg:table-cell">Expenses</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersLoading ? (
                        [...Array(8)].map((_, i) => (
                          <tr key={i}>
                            {[...Array(10)].map((__, j) => (
                              <td key={j}>
                                <div className="h-4 bg-slate-700/40 rounded animate-pulse" />
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : users.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="text-center py-12 text-slate-500">
                            {searchInput || roleFilter || statusFilter || verifiedFilter
                              ? 'No users match the current filters.'
                              : 'No users found.'}
                          </td>
                        </tr>
                      ) : (
                        users.map((u) => (
                          <tr
                            key={u._id}
                            className="cursor-pointer hover:bg-slate-700/30 transition-colors"
                            onClick={() => setDrawerUserId(u._id)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === 'Enter' && setDrawerUserId(u._id)}
                            aria-label={`View details for ${u.name}`}
                          >
                            <td>
                              <span className="font-semibold text-slate-200">{u.name}</span>
                            </td>
                            <td className="text-slate-400 text-xs">{u.email}</td>
                            <td><RoleBadge role={u.role} /></td>
                            <td><StatusBadge isBlocked={u.isBlocked} isDisabled={u.isDisabled} /></td>
                            <td className="hidden lg:table-cell">
                              {u.isEmailVerified
                                ? <span className="badge badge-green text-[10px]">✓ Verified</span>
                                : <span className="badge badge-red text-[10px]">✗ No</span>
                              }
                            </td>
                            <td className="hidden xl:table-cell text-xs text-slate-400">{u.currency}</td>
                            <td className="text-xs text-slate-500">{fmtDate(u.createdAt)}</td>
                            {/* Correction #2: lastSeen from Session.lastActive */}
                            <td className="hidden md:table-cell text-xs text-slate-500">
                              {u.lastSeen ? timeAgo(u.lastSeen) : <span className="text-slate-700">—</span>}
                            </td>
                            <td className="hidden lg:table-cell text-xs text-slate-400">{fmt(u.expenseCount)}</td>
                            <td>
                              <button
                                onClick={(e) => { e.stopPropagation(); setDrawerUserId(u._id); }}
                                className="btn btn-ghost text-xs py-1 px-2"
                                aria-label={`View ${u.name}`}
                              >
                                View →
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <Pagination
                  page={pagination.page}
                  totalPages={pagination.totalPages}
                  total={pagination.total}
                  limit={pagination.limit}
                  onPageChange={(p) => {
                    setCurrentPage(p);
                    fetchUsers({ page: p });
                  }}
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SECURITY TAB (Phase 3)                                             */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'security' && (
        <div className="space-y-6" role="tabpanel" aria-label="Security center">
          {/* Security Overview KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard icon="🛡️" label="Failed Logins (24h)" value={fmt(securityOverview?.kpis?.failedLogins24h)} color="border-red-500" loading={securityOverviewLoading} />
            <KpiCard icon="🟢" label="Active Sessions"     value={fmt(securityOverview?.kpis?.activeSessions)}  color="border-emerald-500" loading={securityOverviewLoading} />
            <KpiCard icon="🚫" label="Blocked Accounts"    value={fmt(securityOverview?.kpis?.blockedAccounts)} color="border-amber-500" loading={securityOverviewLoading} />
            <KpiCard icon="⛔" label="Disabled Accounts"   value={fmt(securityOverview?.kpis?.disabledAccounts)} color="border-amber-500" loading={securityOverviewLoading} />
          </div>

          <div className="card space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h3 className="text-sm font-bold text-slate-200">Security Events &amp; Audit Log</h3>
              
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  placeholder="Search user email/name..."
                  value={securityFilterUser}
                  onChange={(e) => setSecurityFilterUser(e.target.value)}
                  className="input-field text-xs py-1.5 min-w-[200px]"
                />
                <select
                  value={securityFilterAction}
                  onChange={(e) => setSecurityFilterAction(e.target.value)}
                  className="input-field text-xs py-1.5"
                >
                  <option value="">All Actions</option>
                  <option value="login failed">Failed Logins</option>
                  <option value="login success">Successful Logins</option>
                  <option value="admin">Admin Actions</option>
                  <option value="revoke">Session Revocations</option>
                  <option value="password">Password Events</option>
                </select>
                {(securityFilterAction || securityFilterUser) && (
                  <button
                    onClick={() => { setSecurityFilterAction(''); setSecurityFilterUser(''); }}
                    className="btn btn-ghost text-xs py-1.5 px-3 text-red-400"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-700/50">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-800/80 text-xs text-slate-400 uppercase tracking-wider border-b border-slate-700/50">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Timestamp</th>
                    <th className="px-4 py-3 font-semibold">Severity</th>
                    <th className="px-4 py-3 font-semibold">Action</th>
                    <th className="px-4 py-3 font-semibold">User</th>
                    <th className="px-4 py-3 font-semibold">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {securityLoading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i}>
                        {[...Array(5)].map((__, j) => (
                          <td key={j} className="px-4 py-3">
                            <div className="h-4 bg-slate-700/40 rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : securityEvents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-xs text-slate-500">
                        No security events found.
                      </td>
                    </tr>
                  ) : (
                    securityEvents.map((evt) => (
                      <tr key={evt._id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 text-xs text-slate-400">{fmtDateTime(evt.timestamp)}</td>
                        <td className="px-4 py-3">
                          <span className={`badge text-[10px] ${
                            evt.severity === 'CRITICAL' ? 'badge-red animate-pulse' :
                            evt.severity === 'HIGH' ? 'badge-amber' :
                            evt.severity === 'MEDIUM' ? 'badge-yellow' :
                            evt.severity === 'LOW' ? 'badge-green' : 'badge-blue'
                          }`}>
                            {evt.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-slate-200">
                          {evt.action}
                          {evt.details && (
                            <p className="font-normal text-[10px] text-slate-500 max-w-xs truncate" title={evt.details}>
                              {evt.details}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {evt.user ? (
                            <div
                              className="text-primary-400 hover:underline cursor-pointer"
                              onClick={() => setDrawerUserId(evt.user._id)}
                            >
                              {evt.user.email}
                            </div>
                          ) : <span className="text-slate-600">System / Unknown</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 font-mono">{evt.ipAddress || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              page={securityPagination.page}
              totalPages={securityPagination.totalPages}
              total={securityPagination.total}
              limit={securityPagination.limit}
              onPageChange={(p) => {
                setSecurityPage(p);
                fetchSecurityEvents({ page: p });
              }}
            />
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SYSTEM HEALTH TAB                                                  */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'health' && (
        <div className="space-y-6" role="tabpanel" aria-label="System health">
          {statsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card h-48 animate-pulse bg-slate-800/40" />
              <div className="card h-48 animate-pulse bg-slate-800/40" />
            </div>
          ) : statsError ? (
            <div className="card border-red-500/30 text-center py-8">
              <p className="text-sm text-red-400 mb-3">Unable to load diagnostics.</p>
              <button onClick={fetchStats} className="btn btn-secondary text-xs">Retry</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Node Process Memory */}
              <div className="card flex flex-col col-span-1 md:col-span-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-700/50 mb-4">
                  Node Process Memory
                  <span className="ml-2 text-[10px] font-normal text-slate-500 normal-case">
                    (this Node.js process — not total server RAM)
                  </span>
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'RSS',        desc: 'Total OS memory for this process', value: stats?.diagnostics?.nodeMemory?.rss,       color: 'text-violet-400' },
                    { label: 'Heap Used',  desc: 'V8 heap in use by JS objects',     value: stats?.diagnostics?.nodeMemory?.heapUsed,  color: 'text-emerald-400' },
                    { label: 'Heap Total', desc: 'Total V8 heap allocated',          value: stats?.diagnostics?.nodeMemory?.heapTotal, color: 'text-sky-400' },
                    { label: 'External',   desc: 'C++ objects bound to JS',          value: stats?.diagnostics?.nodeMemory?.external,  color: 'text-amber-400' },
                  ].map(({ label, desc, value, color }) => (
                    <div key={label} className="bg-slate-900/40 rounded-xl p-4 border border-slate-800">
                      <p className="text-[10px] text-slate-500 mb-0.5">{desc}</p>
                      <p className="text-xs font-bold text-slate-300 mb-1">{label}</p>
                      <p className={`text-xl font-extrabold ${color}`}>
                        {value ?? '—'} <span className="text-xs font-medium text-slate-500">MB</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* System Status */}
              <div className="card flex flex-col gap-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-700/50">
                  System Status
                </h4>
                <div className="space-y-4 text-xs flex-1">
                  {[
                    {
                      label: 'API Server',
                      value: <span className="text-emerald-400 font-bold">Online ✅</span>,
                    },
                    {
                      label: 'Database',
                      value: <span className="text-emerald-400 font-bold">Connected ✅</span>,
                    },
                    {
                      label: 'Server Uptime',
                      value: (() => {
                        const s = stats?.diagnostics?.uptimeSeconds;
                        if (s == null) return '—';
                        const h = Math.floor(s / 3600);
                        const m = Math.floor((s % 3600) / 60);
                        const sec = s % 60;
                        return `${h}h ${m}m ${sec}s`;
                      })(),
                    },
                    {
                      label: 'Node Version',
                      value: stats?.diagnostics?.nodeVersion ?? '—',
                    },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-center">
                      <span className="text-slate-400">{label}:</span>
                      <span className="font-bold text-slate-200">{value}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-600 mt-auto">
                  MERN Stack — Node process metrics only. Not total server hardware.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* FEEDBACK TAB                                                       */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'feedback' && (
        <div className="card space-y-4" role="tabpanel" aria-label="Feedback inbox">
          <h3 className="text-sm font-bold text-slate-200">User Inquiries &amp; Reports</h3>
          {feedbackLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-slate-800/40 animate-pulse" />)}
            </div>
          ) : feedback.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">No support reports received.</p>
          ) : (
            <div className="space-y-4">
              {feedback.map((item) => (
                <div
                  key={item._id}
                  className="bg-slate-900/40 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row justify-between gap-4"
                >
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="badge badge-purple text-[10px] font-bold uppercase">{item.status}</span>
                      <span className="font-bold text-xs text-slate-200">{item.subject}</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-normal">{item.message}</p>
                    <p className="text-[10px] text-slate-500">
                      From: {item.user?.name} ({item.user?.email})
                    </p>
                  </div>
                  <div className="flex md:flex-col justify-end gap-2 items-end flex-shrink-0">
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
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── User Detail Drawer ──────────────────────────────────────────── */}
      {drawerUserId && (
        <UserDetailDrawer
          userId={drawerUserId}
          onClose={() => setDrawerUserId(null)}
          onActionComplete={() => {
            fetchStats();
            if (activeTab === 'users') fetchUsers();
          }}
        />
      )}
    </div>
  );
}
