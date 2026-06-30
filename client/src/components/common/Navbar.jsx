import { useAuth } from '../../context/AuthContext';
import { useLocation } from 'react-router-dom';

const PAGE_TITLES = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Your financial overview' },
  '/income':    { title: 'Income',    subtitle: 'Track your earnings' },
  '/expenses':  { title: 'Expenses',  subtitle: 'Manage your spending' },
  '/budget':    { title: 'Budget',    subtitle: 'Set spending limits' },
  '/reports':   { title: 'Reports',   subtitle: 'Analyze your finances' },
  '/profile':   { title: 'Profile',   subtitle: 'Manage your account' },
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const page = PAGE_TITLES[pathname] || { title: 'ExpenseTrack', subtitle: '' };

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <header className="h-16 bg-dark-800 border-b border-slate-700/50 flex items-center justify-between px-6 flex-shrink-0">
      <div>
        <h2 className="text-lg font-semibold text-slate-100">{page.title}</h2>
        <p className="text-xs text-slate-500">{page.subtitle}</p>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-400 hidden md:block">
          {greeting}, <span className="text-primary-400 font-medium">{user?.name?.split(' ')[0]}</span>!
        </span>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <button onClick={logout} className="btn-ghost text-xs px-3 py-1.5">
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
