import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { to: '/dashboard',    icon: '📊', label: 'Dashboard' },
  { to: '/income',       icon: '💰', label: 'Income' },
  { to: '/expenses',     icon: '💸', label: 'Expenses' },
  { to: '/wallets',      icon: '/wallet.png', label: 'Wallets' },
  { to: '/budget',       icon: '🎯', label: 'Budget' },
  { to: '/loans',        icon: '🏛️', label: 'Loans & EMIs' },
  { to: '/subscriptions',icon: '🔁', label: 'Subscriptions' },
  { to: '/split-bills',  icon: '/split-bill.png', label: 'Split Bills' },
  { to: '/family',       icon: '👪', label: 'Family Sharing' },
  { to: '/calendar',     icon: '📅', label: 'Bill Calendar' },
  { to: '/ai-insights',  icon: '💡', label: 'AI Insights', badge: 'Soon' },
  { to: '/ai-assistant', icon: '🤖', label: 'AI Assistant', badge: 'Soon' },
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

        {/* Logo — full brand on desktop/mobile drawer, icon-only on tablet rail */}
        <div className="p-3 lg:p-6 border-b border-slate-700/50">
          <div className="flex items-center justify-center lg:justify-start gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm border border-slate-700/35 bg-slate-800">
              <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            {/* Brand name: visible on desktop (≥1024px) and mobile drawer, hidden on tablet rail */}
            <div className="block md:hidden lg:block">
              <h1 className="font-bold text-slate-100 text-base leading-tight">My Expense</h1>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 lg:p-4 space-y-1 overflow-y-auto">
          {/* Section label: only on desktop */}
          <p className="block md:hidden lg:block text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-3">Main Menu</p>
          {NAV_ITEMS.map(({ to, icon, label, badge }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              title={badge ? `${label} (${badge})` : label}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <span className="text-lg flex-shrink-0 flex items-center justify-center">
                {typeof icon === 'string' && icon.startsWith('/') ? (
                  <img src={icon} alt="" className="w-5 h-5 object-contain" />
                ) : (
                  icon
                )}
              </span>
              {/* Label: visible on desktop (≥1024px) and mobile drawer, hidden on tablet rail */}
              <span className="inline md:hidden lg:inline flex-1 truncate">{label}</span>
              {badge && (
                <span className="inline md:hidden lg:inline-block ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-wider flex-shrink-0">
                  {badge}
                </span>
              )}
            </NavLink>
          ))}
          {user?.role === 'admin' && (
            <NavLink
              to="/admin-portal"
              onClick={onClose}
              title="Admin Portal"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <span className="text-lg flex-shrink-0">🛡️</span>
              <span className="inline md:hidden lg:inline">Admin Portal</span>
            </NavLink>
          )}
        </nav>

        {/* User info at footer */}
        <div className="p-2 lg:p-4 border-t border-slate-700/50 bg-slate-900/30">
          <div className="flex items-center justify-center lg:justify-start gap-3">
            <div className="w-10 h-10 bg-primary-600/20 border border-primary-500/30 rounded-xl flex items-center justify-center text-primary-400 font-bold text-sm flex-shrink-0">
              {initials}
            </div>
            {/* Name & role: visible on desktop (≥1024px) and mobile drawer, hidden on tablet rail */}
            <div className="block md:hidden lg:block flex-1 min-w-0">
              <h4 className="text-xs font-bold text-slate-200 truncate">{user?.name || 'Guest User'}</h4>
              {user?.role && user.role !== 'user' && (
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mt-0.5">
                  {user.role === 'premium' ? '👑 Premium User' : user.role === 'admin' ? '🛡️ Admin User' : user.role}
                </p>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
