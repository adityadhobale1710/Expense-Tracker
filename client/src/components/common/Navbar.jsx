import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

const PAGE_TITLES = {
  '/dashboard':     { title: 'Dashboard', subtitle: 'Your financial overview' },
  '/income':        { title: 'Income',    subtitle: 'Track your earnings' },
  '/expenses':      { title: 'Expenses',  subtitle: 'Manage your spending' },
  '/budget':        { title: 'Budget',    subtitle: 'Set spending limits' },
  '/reports':       { title: 'Reports',   subtitle: 'Analyze your finances' },
  '/calendar':      { title: 'Bill Calendar', subtitle: 'Track upcoming obligations' },
  '/ai-insights':   { title: 'AI Insights', subtitle: 'Smart savings recommendations' },
  '/achievements':  { title: 'Achievements', subtitle: 'Earn XP, level up, and unlock rewards' },
  '/profile':       { title: 'Profile',   subtitle: 'Manage your account' },
  '/wallets':       { title: 'Wallets Hub', subtitle: 'Track multiple accounts' },
  '/goals':         { title: 'Savings Goals', subtitle: 'Grow your reserves' },
  '/investments':   { title: 'Investments', subtitle: 'Grow your assets portfolio' },
  '/loans':         { title: 'Loans & EMIs', subtitle: 'Audit credit and debt balance' },
  '/subscriptions': { title: 'Subscriptions', subtitle: 'Manage recurring services' },
  '/split-bills':   { title: 'Split Bills', subtitle: 'Share costs with friends' },
  '/family':        { title: 'Family Sharing', subtitle: 'Shared wallet approvals hub' },
  '/ai-assistant':  { title: 'AI Assistant', subtitle: 'Conversational finance advisor' },
  '/analytics-pro': { title: 'Analytics Pro', subtitle: 'Interactive visual models' },
  '/admin-portal':  { title: 'Admin Control Center', subtitle: 'Server diagnostics & settings' },
};

const THEME_ICONS = {
  light: '☀️',
  dark: '🌙',
  midnight: '🪐',
  ocean: '🌊',
  forest: '🌲',
  'purple-neon': '🔮',
};

const THEMES = [
  { id: 'light', name: 'Light Theme', icon: '☀️' },
  { id: 'dark', name: 'Classic Dark', icon: '🌙' },
  { id: 'midnight', name: 'Midnight Neon', icon: '🪐' },
  { id: 'ocean', name: 'Deep Ocean', icon: '🌊' },
  { id: 'forest', name: 'Forest Greens', icon: '🌲' },
  { id: 'purple-neon', name: 'Purple Neon', icon: '🔮' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const page = PAGE_TITLES[pathname] || { title: 'My Expense', subtitle: '' };
  const { theme, setTheme } = useTheme();

  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.data || []);
    } catch {}
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
    } catch {}
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <header className="h-16 bg-dark-800 border-b border-slate-700/50 flex items-center justify-between px-6 flex-shrink-0 relative z-40">
      <div>
        <h2 className="text-lg font-semibold text-slate-100">{page.title}</h2>
        <p className="text-xs text-slate-500">{page.subtitle}</p>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-400 hidden md:block">
          {greeting}, <span className="text-primary-400 font-medium">{user?.name?.split(' ')[0]}</span>!
        </span>

        {/* Notifications Icon with Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowDropdown(!showDropdown);
              setShowThemeDropdown(false);
            }}
            className="p-2 rounded-xl bg-slate-900 border border-slate-700/50 hover:bg-slate-800 text-slate-300 hover:text-slate-100 relative text-sm cursor-pointer"
          >
            🔔
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-indigo-500 text-white text-[9px] font-bold h-4 w-4 rounded-full flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-72 bg-dark-900 border border-slate-700 rounded-2xl p-4 shadow-xl z-50 animate-fade-in space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-200">Alerts & Notifications</span>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-[10px] text-indigo-400 hover:underline">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">No notifications logged.</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id}
                      className={`p-2.5 rounded-xl border text-[11px] leading-normal transition-colors ${
                        n.read ? 'bg-slate-900/30 border-slate-800 text-slate-400' : 'bg-indigo-600/10 border-indigo-500/20 text-slate-200'
                      }`}
                    >
                      {n.message}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Theme Picker Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowThemeDropdown(!showThemeDropdown);
              setShowDropdown(false);
            }}
            className="p-2 rounded-xl bg-slate-900 border border-slate-700/50 hover:bg-slate-800 text-slate-300 hover:text-slate-100 relative text-sm cursor-pointer flex items-center justify-center h-9 w-9"
            title="Switch Theme"
          >
            <span className="text-base leading-none">{THEME_ICONS[theme] || '🎨'}</span>
          </button>

          {showThemeDropdown && (
            <div className="absolute right-0 mt-2 w-52 bg-dark-900 border border-slate-700 rounded-2xl p-2.5 shadow-xl z-50 animate-fade-in space-y-1">
              <div className="flex justify-between items-center pb-1.5 px-2 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-200">Switch Theme</span>
              </div>
              <div className="pt-1 space-y-0.5">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTheme(t.id);
                      setShowThemeDropdown(false);
                    }}
                    className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-left text-xs font-semibold transition-all duration-200 cursor-pointer ${
                      theme === t.id
                        ? 'bg-primary-600/20 text-primary-400 border border-primary-500/20'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 border border-transparent'
                    }`}
                  >
                    <span className="text-sm leading-none">{t.icon}</span>
                    <span className="flex-1">{t.name}</span>
                    {theme === t.id && <span className="text-[10px] text-primary-400">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

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
