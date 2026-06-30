import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/income',    icon: '💰', label: 'Income' },
  { to: '/expenses',  icon: '💸', label: 'Expenses' },
  { to: '/budget',    icon: '🎯', label: 'Budget' },
  { to: '/reports',   icon: '📈', label: 'Reports' },
  { to: '/profile',   icon: '👤', label: 'Profile' },
];

export default function Sidebar() {
  return (
    <aside className="w-60 bg-dark-800 border-r border-slate-700/50 flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="p-6 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center text-white font-bold text-lg glow-primary">
            ₹
          </div>
          <div>
            <h1 className="font-bold text-slate-100 text-base leading-tight">ExpenseTrack</h1>
            <p className="text-xs text-slate-500">Finance Manager</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-3">Main Menu</p>
        {NAV_ITEMS.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <span className="text-lg">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700/50">
        <p className="text-xs text-slate-600 text-center">ExpenseTrack v1.0</p>
      </div>
    </aside>
  );
}
