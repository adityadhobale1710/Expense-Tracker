import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { to: '/dashboard',    icon: '📊', label: 'Dashboard' },
  { to: '/income',       icon: '💰', label: 'Income' },
  { to: '/expenses',     icon: '💸', label: 'Expenses' },
  { to: '/budget',       icon: '🎯', label: 'Budget' },
  { to: '/loans',        icon: '🏛️', label: 'Loans & EMIs' },
  { to: '/subscriptions',icon: '🔁', label: 'Subscriptions' },
  { to: '/split-bills',  icon: '🍕', label: 'Split Bills' },
  { to: '/family',       icon: '👪', label: 'Family Sharing' },
  { to: '/calendar',     icon: '📅', label: 'Bill Calendar' },
  { to: '/ai-insights',  icon: '💡', label: 'AI Insights' },
  { to: '/ai-assistant', icon: '🤖', label: 'AI Assistant' },
  { to: '/analytics-pro',icon: '📊', label: 'Analytics Pro' },
  { to: '/achievements', icon: '🏆', label: 'Achievements' },
  { to: '/profile',      icon: '👤', label: 'Profile' },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user } = useAuth();
  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase()
    : 'U';

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div
          className="sidebar-overlay"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        {/* Mobile close button */}
        <button
          className="sidebar-close-btn"
          onClick={onClose}
          aria-label="Close menu"
        >
          ✕
        </button>

        {/* Logo */}
        <div className="p-6 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center text-white glow-primary flex-shrink-0">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 7h-8v10h8a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
                <path d="M5 21V5a2 2 0 0 1 2-2h10v4H7a2 2 0 0 0-2 2v12h14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="font-bold text-slate-100 text-base leading-tight">My Expense</h1>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Pro Edition</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-3">Main Menu</p>
          {NAV_ITEMS.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <span className="text-lg">{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
          {user?.role === 'admin' && (
            <NavLink
              to="/admin-portal"
              onClick={onClose}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <span className="text-lg">🛡️</span>
              <span>Admin Portal</span>
            </NavLink>
          )}
        </nav>

        {/* User info at footer */}
        <div className="p-4 border-t border-slate-700/50 bg-slate-900/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600/20 border border-primary-500/30 rounded-xl flex items-center justify-center text-primary-400 font-bold text-sm">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-slate-200 truncate">{user?.name || 'Guest User'}</h4>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mt-0.5">
                {user?.role === 'premium' ? '👑 Premium User' : user?.role === 'admin' ? '🛡️ Admin User' : 'Standard Tier'}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
