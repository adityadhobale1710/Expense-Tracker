import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useGamification } from '../../context/GamificationContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';

const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' }
];

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  // Issue 1 fix: consume live gamification state from the same single source of truth
  // as the Achievements page (GamificationContext → GET /api/gamification/profile).
  // This replaces the previous reads of user?.xp, user?.level, etc. in the Gamification
  // section, which were reading from the stale AuthContext snapshot.
  const {
    xp: gamXP,
    lifetimeXP: gamLifetimeXP,
    level: gamLevel,
    rank: gamRank,
    coins: gamCoins,
    streak: gamStreak,
    longestStreak: gamLongestStreak,
    achievements: gamAchievements,
    season: gamSeason,
    isLoaded: gamIsLoaded,
    loading: gamLoading,
  } = useGamification();
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState('profile');
  const [activeProfileSection, setActiveProfileSection] = useState('personal');

  // Form states
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    company: user?.company || '',
    currency: user?.currency || 'INR'
  });

  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNew: ''
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  // Global theme context
  const { theme, setTheme } = useTheme();

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    toast.success(`Theme switched to ${newTheme.toUpperCase()}`);
  };

  // Simulated preferences states
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.twoFactorEnabled || false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [liveCurrencySync, setLiveCurrencySync] = useState(true);
  const [alerts, setAlerts] = useState(user?.alertSettings || { bills: true, budgets: true, weekly: false });
  const [deviceSessions, setDeviceSessions] = useState([]);
  const [profileStats, setProfileStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const { data } = await api.get('/users/me/stats');
      if (data.success && data.data) {
        setProfileStats(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch profile stats:', err);
      toast.error('Failed to load profile statistics');
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const { data } = await api.get('/users/me');
      if (data.success && data.data) {
        updateUser(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch full profile:', err);
    }
  };

  const [loadingSessions, setLoadingSessions] = useState(false);

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const { data } = await api.get('/sessions');
      if (data.success && data.data) {
        setDeviceSessions(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
      toast.error('Failed to load device sessions');
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    if (activeSection === 'profile') {
      fetchProfile();
      fetchStats();
    } else if (activeSection === 'security') {
      fetchSessions();
    }
  }, [activeSection]);

  useEffect(() => {
    if (user) {
      if (user.alertSettings) {
        setAlerts(user.alertSettings);
      }
      if (user.twoFactorEnabled !== undefined) {
        setTwoFactorEnabled(user.twoFactorEnabled);
      }
      setProfileForm({
        name: user.name || '',
        phone: user.phone || '',
        company: user.company || '',
        currency: user.currency || 'INR'
      });
      setFromCurr(user.currency || 'INR');
    }
  }, [user]);

  // Interactive Currency Converter states
  const [convAmount, setConvAmount] = useState('1');
  const [fromCurr, setFromCurr] = useState(user?.currency || 'USD');
  const [toCurr, setToCurr] = useState(user?.currency === 'USD' ? 'INR' : 'USD');
  const [exchangeRates, setExchangeRates] = useState({});
  const [isLoadingRates, setIsLoadingRates] = useState(false);

  // Fetch exchange rates from free open API
  const fetchRates = async (base) => {
    if (!liveCurrencySync) return;
    setIsLoadingRates(true);
    try {
      const response = await fetch(`https://open.er-api.com/v6/latest/${base}`);
      const data = await response.json();
      if (data && data.rates) {
        setExchangeRates(data.rates);
      }
    } catch (err) {
      console.error('Failed to fetch live currency rates:', err);
      // Fallback rates if API fails or offline
      const staticFallbacks = {
        USD: { USD: 1, INR: 83.5, EUR: 0.92, GBP: 0.78 },
        INR: { INR: 1, USD: 0.012, EUR: 0.011, GBP: 0.0093 },
        EUR: { EUR: 1, USD: 1.09, INR: 90.7, GBP: 0.85 },
        GBP: { GBP: 1, USD: 1.28, INR: 106.8, EUR: 1.18 }
      };
      setExchangeRates(staticFallbacks[base] || staticFallbacks['USD']);
    } finally {
      setIsLoadingRates(false);
    }
  };

  useEffect(() => {
    fetchRates(fromCurr);
  }, [fromCurr, liveCurrencySync]);

  const getConvertedVal = () => {
    if (exchangeRates[toCurr]) {
      const rate = exchangeRates[toCurr];
      const val = parseFloat(convAmount);
      if (isNaN(val)) return '0.00';
      return (val * rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    const fallbackRates = {
      USD: { USD: 1, INR: 83.5, EUR: 0.92, GBP: 0.78 },
      INR: { INR: 1, USD: 0.012, EUR: 0.011, GBP: 0.0093 },
      EUR: { EUR: 1, USD: 1.09, INR: 90.7, GBP: 0.85 },
      GBP: { GBP: 1, USD: 1.28, INR: 106.8, EUR: 1.18 }
    };
    const rate = fallbackRates[fromCurr]?.[toCurr] || 1;
    const val = parseFloat(convAmount);
    if (isNaN(val)) return '0.00';
    return (val * rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getActiveRate = () => {
    if (exchangeRates[toCurr]) {
      return exchangeRates[toCurr].toFixed(4);
    }
    const fallbackRates = {
      USD: { USD: 1, INR: 83.5, EUR: 0.92, GBP: 0.78 },
      INR: { INR: 1, USD: 0.012, EUR: 0.011, GBP: 0.0093 },
      EUR: { EUR: 1, USD: 1.09, INR: 90.7, GBP: 0.85 },
      GBP: { GBP: 1, USD: 1.28, INR: 106.8, EUR: 1.18 }
    };
    return (fallbackRates[fromCurr]?.[toCurr] || 1).toFixed(4);
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const { data } = await api.put('/users/me', {
        name: profileForm.name,
        phone: profileForm.phone,
        company: profileForm.company,
        twoFactorEnabled
      });
      updateUser(data.data);
      toast.success('Profile successfully updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmNew) {
      toast.error('New passwords do not match');
      return;
    }
    setSavingPwd(true);
    try {
      await api.put('/users/me/password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      toast.success('Password updated successfully!');
      setPasswords({ currentPassword: '', newPassword: '', confirmNew: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSavingPwd(false);
    }
  };



  const toggle2FA = async (enabled) => {
    setTwoFactorEnabled(enabled);
    try {
      const { data } = await api.put('/users/me', {
        twoFactorEnabled: enabled
      });
      updateUser(data.data);
      toast.success(`Two-Factor Authentication (2FA) ${enabled ? 'enabled' : 'disabled'}`);
    } catch {
      toast.error('Failed to change 2FA status');
    }
  };

  const revokeSession = async (id) => {
    try {
      const { data } = await api.delete(`/sessions/${id}`);
      if (data.success) {
        toast.success('Device session revoked successfully.');
        fetchSessions();
      }
    } catch (err) {
      console.error('Failed to revoke session:', err);
      toast.error(err.response?.data?.message || 'Failed to revoke device session');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="page-header">
        <div>
          <h1 className="page-title">System Settings</h1>
          <p className="page-subtitle">Configure currency parameters, account security, notifications, and profile options</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Left Side Navigation */}
        <div className="xl:col-span-1 flex flex-col gap-2">
          {/* User Mini-Card */}
          <div className="card-sm flex items-center gap-3 mb-2 bg-slate-900/20">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-xs font-bold text-slate-200 truncate">{user?.name}</h3>
              {user?.role && user.role !== 'user' && (
                <p className="text-xs text-slate-500 uppercase font-semibold">
                  {user.role === 'premium' ? 'Premium User' : user.role === 'admin' ? 'Admin User' : user.role}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={() => setActiveSection('profile')}
            className={`w-full text-left p-3.5 rounded-xl font-medium text-sm transition-all duration-200 ${
              activeSection === 'profile'
                ? 'bg-primary-600/20 text-primary-400 border border-primary-500/20 shadow-md'
                : 'bg-dark-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            👤 Profile Setup
          </button>
          <button
            onClick={() => setActiveSection('password')}
            className={`w-full text-left p-3.5 rounded-xl font-medium text-sm transition-all duration-200 ${
              activeSection === 'password'
                ? 'bg-primary-600/20 text-primary-400 border border-primary-500/20 shadow-md'
                : 'bg-dark-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            🔒 Change Password
          </button>
          <button
            onClick={() => setActiveSection('preferences')}
            className={`w-full text-left p-3.5 rounded-xl font-medium text-sm transition-all duration-200 ${
              activeSection === 'preferences'
                ? 'bg-primary-600/20 text-primary-400 border border-primary-500/20 shadow-md'
                : 'bg-dark-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            🌎 App Preferences
          </button>
          <button
            onClick={() => setActiveSection('security')}
            className={`w-full text-left p-3.5 rounded-xl font-medium text-sm transition-all duration-200 ${
              activeSection === 'security'
                ? 'bg-primary-600/20 text-primary-400 border border-primary-500/20 shadow-md'
                : 'bg-dark-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            🛡️ Security Center (2FA)
          </button>
          <button
            onClick={() => setActiveSection('notifications')}
            className={`w-full text-left p-3.5 rounded-xl font-medium text-sm transition-all duration-200 ${
              activeSection === 'notifications'
                ? 'bg-primary-600/20 text-primary-400 border border-primary-500/20 shadow-md'
                : 'bg-dark-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            🔔 Alert Settings
          </button>

          <div className="border-t border-slate-700/50 my-2 pt-2 space-y-2">
            <button onClick={logout} className="w-full btn-danger text-xs py-2">
              🚪 Logout Session
            </button>
          </div>
        </div>

        {/* Right Side Settings Contents */}
        <div className="xl:col-span-3 card">
          {activeSection === 'profile' && (
            <div className="space-y-6 animate-fade-in">
              <div className="pb-4 border-b border-slate-700/50">
                <h3 className="text-base font-bold text-slate-100">Profile Setup</h3>
                <p className="text-xs text-slate-400 mt-1">Manage your personal information, account details, gamification, and financial overview.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Secondary navigation */}
                <div className="lg:col-span-1 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveProfileSection('personal')}
                    className={`w-full text-left p-3 rounded-xl transition-all duration-200 flex flex-col gap-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 ${
                      activeProfileSection === 'personal'
                        ? 'bg-primary-600/20 text-primary-400 border border-primary-500/20 shadow-md font-semibold'
                        : 'bg-dark-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 border border-transparent font-medium'
                    }`}
                  >
                    <span className="text-sm flex items-center gap-2">👤 Personal Information</span>
                    <span className="text-xs text-slate-500 font-normal pl-6">Your profile details</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveProfileSection('account')}
                    className={`w-full text-left p-3 rounded-xl transition-all duration-200 flex flex-col gap-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 ${
                      activeProfileSection === 'account'
                        ? 'bg-primary-600/20 text-primary-400 border border-primary-500/20 shadow-md font-semibold'
                        : 'bg-dark-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 border border-transparent font-medium'
                    }`}
                  >
                    <span className="text-sm flex items-center gap-2">✉ Email & Account</span>
                    <span className="text-xs text-slate-500 font-normal pl-6">Account and security</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveProfileSection('gamification')}
                    className={`w-full text-left p-3 rounded-xl transition-all duration-200 flex flex-col gap-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 ${
                      activeProfileSection === 'gamification'
                        ? 'bg-primary-600/20 text-primary-400 border border-primary-500/20 shadow-md font-semibold'
                        : 'bg-dark-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 border border-transparent font-medium'
                    }`}
                  >
                    <span className="text-sm flex items-center gap-2">🎮 Gamification</span>
                    <span className="text-xs text-slate-500 font-normal pl-6">XP and progress</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveProfileSection('financial')}
                    className={`w-full text-left p-3 rounded-xl transition-all duration-200 flex flex-col gap-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 ${
                      activeProfileSection === 'financial'
                        ? 'bg-primary-600/20 text-primary-400 border border-primary-500/20 shadow-md font-semibold'
                        : 'bg-dark-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 border border-transparent font-medium'
                    }`}
                  >
                    <span className="text-sm flex items-center gap-2">💰 Financial Summary</span>
                    <span className="text-xs text-slate-500 font-normal pl-6">Your financial overview</span>
                  </button>
                </div>

                {/* Selected section content */}
                <div className="lg:col-span-3">
                  {activeProfileSection === 'personal' && (
                    <div className="space-y-6">
                      <div className="pb-4 border-b border-slate-700/50">
                        <h4 className="text-sm font-semibold text-slate-200">Personal Information</h4>
                        <p className="text-xs text-slate-400 mt-1">Update your basic profile details.</p>
                      </div>
                      <form onSubmit={handleProfileSave} className="space-y-6 text-xs">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="form-group">
                            <label className="label">Full Name</label>
                            <input
                              type="text"
                              className="input"
                              value={profileForm.name}
                              onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                              required
                            />
                          </div>
                          <div className="form-group">
                            <label className="label">Email Address</label>
                            <input
                              type="email"
                              className="input opacity-50 cursor-not-allowed"
                              value={user?.email || ''}
                              disabled
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="form-group">
                            <label className="label">Phone Number</label>
                            <input
                              type="tel"
                              className="input"
                              placeholder="+91 9876543210"
                              value={profileForm.phone}
                              onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                            />
                          </div>
                          <div className="form-group">
                            <label className="label">Company / Workspace</label>
                            <input
                              type="text"
                              className="input"
                              placeholder="Developer Inc."
                              value={profileForm.company}
                              onChange={(e) => setProfileForm({ ...profileForm, company: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="pt-2">
                          <button type="submit" className="btn-primary py-2.5 px-6" disabled={savingProfile}>
                            {savingProfile ? 'Saving Changes...' : 'Save Profile'}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {activeProfileSection === 'account' && (
                    <div className="space-y-6">
                      <div className="pb-4 border-b border-slate-700/50">
                        <h4 className="text-sm font-semibold text-slate-200">Email & Account</h4>
                        <p className="text-xs text-slate-400 mt-1">Manage account and verification information.</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                        <div className="bg-dark-900/40 border border-slate-700/30 rounded-xl p-4 flex flex-col gap-1.5 shadow-sm">
                          <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Email Address</span>
                          <span className="text-sm font-medium text-slate-200 truncate">{user?.email || '-'}</span>
                        </div>
                        <div className="bg-dark-900/40 border border-slate-700/30 rounded-xl p-4 flex flex-col gap-1.5 shadow-sm">
                          <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Verification Status</span>
                          <div>
                            {user?.isEmailVerified ? (
                              <span className="badge-green">Verified ✓</span>
                            ) : (
                              <span className="badge-red">Unverified ✗</span>
                            )}
                          </div>
                        </div>
                        <div className="bg-dark-900/40 border border-slate-700/30 rounded-xl p-4 flex flex-col gap-1.5 shadow-sm">
                          <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Account Role</span>
                          <div>
                            {user?.role === 'premium' ? (
                              <span className="badge-purple">Premium</span>
                            ) : user?.role === 'admin' ? (
                              <span className="badge-blue">Admin</span>
                            ) : (
                              <span className="badge bg-slate-700/30 text-slate-300">User</span>
                            )}
                          </div>
                        </div>
                        <div className="bg-dark-900/40 border border-slate-700/30 rounded-xl p-4 flex flex-col gap-1.5 shadow-sm">
                          <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Member Since</span>
                          <span className="text-sm font-medium text-slate-200">
                            {user?.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}
                          </span>
                        </div>
                        <div className="bg-dark-900/40 border border-slate-700/30 rounded-xl p-4 flex flex-col gap-1.5 shadow-sm">
                          <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Last Updated</span>
                          <span className="text-sm font-medium text-slate-200">
                            {user?.updatedAt ? new Date(user.updatedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}
                          </span>
                        </div>
                        <div className="bg-dark-900/40 border border-slate-700/30 rounded-xl p-4 flex flex-col gap-1.5 shadow-sm">
                          <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Two-Factor Authentication</span>
                          <div>
                            {user?.twoFactorEnabled ? (
                              <span className="badge-green">Enabled ✓</span>
                            ) : (
                              <span className="badge-red">Disabled ✗</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeProfileSection === 'gamification' && (
                    <div className="space-y-6">
                      <div className="pb-4 border-b border-slate-700/50 flex justify-between items-end">
                        <div>
                          <h4 className="text-sm font-semibold text-slate-200">Gamification</h4>
                          <p className="text-xs text-slate-400 mt-1">View your current progress and rewards.</p>
                        </div>
                        {gamSeason && (
                          <div className="text-right">
                            <span className="text-xs text-primary-400 uppercase font-bold tracking-wider">{gamSeason.name}</span>
                            <p className="text-xs text-slate-500">Season XP: {gamSeason.seasonalXP?.toLocaleString('en-IN') || 0}</p>
                          </div>
                        )}
                      </div>

                      {/* Loading skeleton while GamificationContext is fetching */}
                      {gamLoading && !gamIsLoaded ? (
                        <div className="space-y-4 animate-pulse">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[...Array(4)].map((_, i) => (
                              <div key={i} className="bg-dark-900/40 border border-slate-700/30 rounded-xl p-4 flex flex-col gap-2">
                                <Skeleton className="h-3 w-16" />
                                <Skeleton className="h-5 w-12" />
                              </div>
                            ))}
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            {[...Array(2)].map((_, i) => (
                              <div key={i} className="bg-dark-900/40 border border-slate-700/30 rounded-xl p-4 flex flex-col gap-2">
                                <Skeleton className="h-3 w-20" />
                                <Skeleton className="h-5 w-16" />
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-6 text-xs animate-fade-in">
                          {/* PROGRESS */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Progress</h5>
                              {/* Issue 5 fix: explain the Level vs Rank distinction */}
                              <span className="text-xs text-slate-600 italic">
                                Level = season XP · Rank = lifetime XP
                              </span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="bg-dark-900/40 border border-slate-700/30 rounded-xl p-4 flex flex-col gap-1 shadow-sm">
                                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Level</span>
                                <span className="text-base font-bold text-slate-200">{gamLevel}</span>
                              </div>
                              <div className="bg-dark-900/40 border border-slate-700/30 rounded-xl p-4 flex flex-col gap-1 shadow-sm">
                                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Rank</span>
                                <span className="text-base font-bold text-slate-200">{gamRank ?? '-'}</span>
                              </div>
                              <div className="bg-dark-900/40 border border-slate-700/30 rounded-xl p-4 flex flex-col gap-1 shadow-sm">
                                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Current XP</span>
                                <span className="text-base font-bold text-slate-200">{gamXP.toLocaleString('en-IN')}</span>
                              </div>
                              <div className="bg-dark-900/40 border border-slate-700/30 rounded-xl p-4 flex flex-col gap-1 shadow-sm">
                                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Lifetime XP</span>
                                <span className="text-base font-bold text-slate-200">{gamLifetimeXP.toLocaleString('en-IN')}</span>
                              </div>
                            </div>
                          </div>

                          {/* STREAK */}
                          <div className="space-y-3">
                            <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Streak</h5>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-dark-900/40 border border-slate-700/30 rounded-xl p-4 flex flex-col gap-1 shadow-sm">
                                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Current Streak</span>
                                <span className="text-base font-bold text-slate-200">{gamStreak} days</span>
                              </div>
                              <div className="bg-dark-900/40 border border-slate-700/30 rounded-xl p-4 flex flex-col gap-1 shadow-sm">
                                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Longest Streak</span>
                                <span className="text-base font-bold text-slate-200">{gamLongestStreak} days</span>
                              </div>
                            </div>
                          </div>

                          {/* REWARDS */}
                          <div className="space-y-3">
                            <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rewards</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-dark-900/40 border border-slate-700/30 rounded-xl p-4 flex flex-col gap-1 shadow-sm">
                                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Available Coins</span>
                                <span className="text-base font-bold text-slate-200">{gamCoins.toLocaleString('en-IN')} 🪙</span>
                              </div>
                              <div className="bg-dark-900/40 border border-slate-700/30 rounded-xl p-4 flex flex-col gap-1 shadow-sm">
                                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Badges Unlocked</span>
                                <span className="text-base font-bold text-slate-200">
                                  {gamAchievements.filter(a => a.unlocked).length} / {gamAchievements.length}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeProfileSection === 'financial' && (
                    <div className="space-y-6">
                      {/* 4. FINANCIAL SUMMARY */}
                      <div className="pb-4 border-b border-slate-700/50">
                        <h4 className="text-sm font-semibold text-slate-200">Financial Summary</h4>
                        <p className="text-xs text-slate-400 mt-1">Overview of your financial activity.</p>
                      </div>

                      <div className="space-y-6 text-xs animate-fade-in">
                        {/* PRIMARY STATS */}
                        <div className="space-y-3">
                          <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Primary Statistics</h5>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex flex-col gap-1.5 shadow-sm">
                              <span className="text-xs text-emerald-400 uppercase tracking-wider font-bold">Total Income</span>
                              {loadingStats ? (
                                <Skeleton className="h-[24px] w-1/2" />
                              ) : (
                                <span className="text-lg font-extrabold text-emerald-400">
                                  {profileStats !== null ? `${user?.currency || 'INR'} ${(profileStats.totalIncome ?? 0).toLocaleString()}` : '-'}
                                </span>
                              )}
                            </div>
                            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 flex flex-col gap-1.5 shadow-sm">
                              <span className="text-xs text-rose-400 uppercase tracking-wider font-bold">Total Expenses</span>
                              {loadingStats ? (
                                <Skeleton className="h-[24px] w-1/2" />
                              ) : (
                                <span className="text-lg font-extrabold text-rose-400">
                                  {profileStats !== null ? `${user?.currency || 'INR'} ${(profileStats.totalExpense ?? 0).toLocaleString()}` : '-'}
                                </span>
                              )}
                            </div>
                            {(() => {
                              const net = profileStats !== null ? (profileStats.totalIncome ?? 0) - (profileStats.totalExpense ?? 0) : 0;
                              const isPositive = net >= 0;
                              return (
                                <div className={`${isPositive ? 'bg-primary-500/10 border-primary-500/20' : 'bg-rose-500/10 border-rose-500/20'} border rounded-xl p-4 flex flex-col gap-1.5 shadow-sm`}>
                                  <span className={`text-xs ${isPositive ? 'text-primary-400' : 'text-rose-400'} uppercase tracking-wider font-bold`}>Net Balance</span>
                                  {loadingStats ? (
                                    <Skeleton className="h-[24px] w-1/2" />
                                  ) : (
                                    <span className={`text-lg font-extrabold ${isPositive ? 'text-primary-400' : 'text-rose-400'}`}>
                                      {profileStats !== null ? `${user?.currency || 'INR'} ${net.toLocaleString()}` : '-'}
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        {/* SECONDARY STATS */}
                        <div className="space-y-3">
                          <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Secondary Statistics</h5>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-dark-900/40 border border-slate-700/30 rounded-xl p-4 flex flex-col gap-1 shadow-sm">
                              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Transactions</span>
                              {loadingStats ? (
                                <Skeleton className="h-[20px] w-1/2" />
                              ) : (
                                <span className="text-base font-bold text-slate-200">
                                  {profileStats !== null ? `${profileStats.transactionCount ?? 0} total` : '-'}
                                </span>
                              )}
                            </div>
                            <div className="bg-dark-900/40 border border-slate-700/30 rounded-xl p-4 flex flex-col gap-1 shadow-sm">
                              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Wallets</span>
                              {loadingStats ? (
                                <Skeleton className="h-[20px] w-1/2" />
                              ) : (
                                <span className="text-base font-bold text-slate-200">
                                  {profileStats !== null ? `${profileStats.walletsCount ?? 0} active` : '-'}
                                </span>
                              )}
                            </div>
                            <div className="bg-dark-900/40 border border-slate-700/30 rounded-xl p-4 flex flex-col gap-1 shadow-sm">
                              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Budgets</span>
                              {loadingStats ? (
                                <Skeleton className="h-[20px] w-1/2" />
                              ) : (
                                <span className="text-base font-bold text-slate-200">
                                  {profileStats !== null ? `${profileStats.budgetsCount ?? 0} active` : '-'}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-dark-900/40 border border-slate-700/30 rounded-xl p-4 flex flex-col gap-1 shadow-sm">
                              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Goals</span>
                              {loadingStats ? (
                                <Skeleton className="h-[20px] w-1/2" />
                              ) : (
                                <span className="text-base font-bold text-slate-200">
                                  {profileStats !== null ? `${profileStats.goalsCount ?? 0} active` : '-'}
                                </span>
                              )}
                            </div>
                            <div className="bg-dark-900/40 border border-slate-700/30 rounded-xl p-4 flex flex-col gap-1 shadow-sm">
                              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Subscriptions</span>
                              {loadingStats ? (
                                <Skeleton className="h-[20px] w-1/2" />
                              ) : (
                                <span className="text-base font-bold text-slate-200">
                                  {profileStats !== null ? `${profileStats.subscriptionsCount ?? 0} active` : '-'}
                                </span>
                              )}
                            </div>
                            <div className="bg-dark-900/40 border border-slate-700/30 rounded-xl p-4 flex flex-col gap-1 shadow-sm">
                              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Bills</span>
                              {loadingStats ? (
                                <Skeleton className="h-[20px] w-1/2" />
                              ) : (
                                <span className="text-base font-bold text-slate-200">
                                  {profileStats !== null ? `${profileStats.billsCount ?? 0} unpaid` : '-'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'password' && (
            <div className="space-y-6">
              <div className="pb-4 border-b border-slate-700/50">
                <h3 className="text-base font-bold text-slate-100">Update Password</h3>
                <p className="text-xs text-slate-400 mt-1">Ensure your account uses a long, random password to stay secure.</p>
              </div>
              <form onSubmit={handlePasswordSave} className="space-y-4 text-xs">
                <div className="form-group">
                  <label className="label">Current Password</label>
                  <input
                    type="password"
                    className="input"
                    placeholder="••••••••"
                    value={passwords.currentPassword}
                    onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="label">New Password</label>
                    <input
                      type="password"
                      className="input"
                      placeholder="••••••••"
                      value={passwords.newPassword}
                      onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Confirm New Password</label>
                    <input
                      type="password"
                      className="input"
                      placeholder="••••••••"
                      value={passwords.confirmNew}
                      onChange={(e) => setPasswords({ ...passwords, confirmNew: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="btn-primary py-2.5 px-6" disabled={savingPwd}>
                  {savingPwd ? 'Updating Password...' : 'Update Password'}
                </button>
              </form>
            </div>
          )}

          {activeSection === 'preferences' && (
            <div className="space-y-6">
              <div className="pb-4 border-b border-slate-700/50">
                <h3 className="text-base font-bold text-slate-100">App Preferences</h3>
                <p className="text-xs text-slate-400 mt-1">Configure language, base currency, and API conversion rules.</p>
              </div>
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="form-group">
                    <label className="label">Base Currency Selection</label>
                    <select
                      className="select"
                      value={profileForm.currency}
                      onChange={async (e) => {
                        const newCurrency = e.target.value;
                        setProfileForm({ ...profileForm, currency: newCurrency });
                        setFromCurr(newCurrency);
                        try {
                          const { data } = await api.put('/users/me', {
                            currency: newCurrency
                          });
                          updateUser(data.data);
                          toast.success(`Base currency updated to ${newCurrency}`);
                        } catch (err) {
                          console.error('Failed to update base currency:', err);
                          toast.error('Failed to save currency preference');
                        }
                      }}
                    >
                      {CURRENCIES.map(c => (
                        <option key={c.code} value={c.code}>
                          {c.code} ({c.symbol}) - {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="label">Language Selection</label>
                    <select
                      className="select"
                      value={selectedLanguage}
                      onChange={(e) => {
                        setSelectedLanguage(e.target.value);
                        toast.success('Language set to English');
                      }}
                    >
                      <option value="en">English</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="label">Theme Customization</label>
                    <select
                      className="select"
                      value={theme}
                      onChange={(e) => handleThemeChange(e.target.value)}
                    >
                      <option value="light">☀️ Light Theme</option>
                      <option value="dark">🌙 Classic Dark</option>
                      <option value="dark-blue">🔵 Dark Blue</option>
                    </select>
                  </div>
                </div>

                <div className="p-4 bg-dark-800 border border-slate-700/50 rounded-xl space-y-4 shadow-md">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-700/30">
                    <div>
                      <h4 className="font-bold text-slate-200 text-sm">Currency Converter & Rates</h4>
                      <p className="text-xs text-slate-50 mt-0.5">Convert currencies with live or fallback exchange rates.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-400">Live Sync</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={liveCurrencySync}
                          onChange={(e) => {
                            setLiveCurrencySync(e.target.checked);
                            toast.success(`Live sync ${e.target.checked ? 'enabled' : 'disabled'}`);
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Amount Input */}
                    <div className="form-group">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Amount</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Enter amount"
                        value={convAmount}
                        onChange={(e) => setConvAmount(e.target.value)}
                        className="input py-2 text-xs"
                      />
                    </div>
                    {/* From Currency Selection */}
                    <div className="form-group">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">From</label>
                      <select
                        className="select py-2 text-xs"
                        value={fromCurr}
                        onChange={(e) => setFromCurr(e.target.value)}
                      >
                        {CURRENCIES.map(c => (
                          <option key={c.code} value={c.code}>
                            {c.code} ({c.symbol})
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* To Currency Selection */}
                    <div className="form-group">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">To</label>
                      <select
                        className="select py-2 text-xs"
                        value={toCurr}
                        onChange={(e) => setToCurr(e.target.value)}
                      >
                        {CURRENCIES.map(c => (
                          <option key={c.code} value={c.code}>
                            {c.code} ({c.symbol})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Result Panel */}
                  <div className="p-3 bg-dark-900/50 border border-slate-700/30 rounded-xl flex items-center justify-between text-xs transition-all">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Converted Amount</p>
                      <p className="text-base font-extrabold text-slate-200 mt-1">
                        {CURRENCIES.find(c => c.code === toCurr)?.symbol || ''} {getConvertedVal()} <span className="text-xs text-slate-400 font-normal">{toCurr}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Exchange Rate</p>
                      <p className="text-xs font-bold text-primary-400 mt-1">
                        1 {fromCurr} = {getActiveRate()} {toCurr}
                      </p>
                      {liveCurrencySync && (
                        <p className="text-xs text-slate-600 mt-0.5">
                          {isLoadingRates ? 'Updating...' : 'Live Rate Connected'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="space-y-6">
              <div className="pb-4 border-b border-slate-700/50">
                <h3 className="text-base font-bold text-slate-100">Security Center</h3>
                <p className="text-xs text-slate-400 mt-1">Manage Two-Factor authentication (2FA) and monitor active device sessions.</p>
              </div>

              <div className="space-y-5 text-xs">
                <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-300">Two-Factor Authentication (2FA)</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Add an extra layer of security using Google Authenticator codes.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={twoFactorEnabled}
                      onChange={(e) => toggle2FA(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-slate-400">Active Device Sessions</h4>
                  {loadingSessions ? (
                    <div className="space-y-3">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : deviceSessions.length === 0 ? (
                    <EmptyState
                      title="No active sessions"
                      description="You are currently not logged in on any other devices."
                    />
                  ) : (
                    <div className="table-container">
                      <table className="table text-xs">
                        <thead>
                          <tr>
                            <th>Device</th>
                            <th>IP Address</th>
                            <th>Status</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {deviceSessions.map(session => (
                            <tr key={session._id}>
                              <td className="font-medium text-slate-200">{session.deviceName || 'Unknown Device'}</td>
                              <td className="font-mono text-slate-400">{session.ipAddress || '127.0.0.1'}</td>
                              <td className="text-slate-400 font-semibold">
                                {session.isCurrent ? (
                                  <span className="text-emerald-400 font-bold">Active Now</span>
                                ) : (
                                  session.lastActive ? new Date(session.lastActive).toLocaleString() : 'Inactive'
                                )}
                              </td>
                              <td>
                                {session.isCurrent ? (
                                  <span className="text-emerald-400 font-bold">Current</span>
                                ) : (
                                  <button
                                    onClick={() => revokeSession(session._id)}
                                    className="text-red-400 hover:text-red-300 font-semibold underline"
                                  >
                                    Revoke
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="space-y-6">
              <div className="pb-4 border-b border-slate-700/50">
                <h3 className="text-base font-bold text-slate-100">Notification Settings</h3>
                <p className="text-xs text-slate-400 mt-1">Select how and when you receive financial alerts.</p>
              </div>

              <div className="space-y-4 text-xs">
                {[
                  { key: 'bills', title: 'Upcoming bill alerts', desc: 'Receive warnings 2 days before bills auto-debit.' },
                  { key: 'budgets', title: 'Budget threshold warnings', desc: 'Instant push warning when category spending exceeds 90%.' },
                  { key: 'weekly', title: 'Weekly summary reports', desc: 'Receive a detailed overview email every Sunday morning.' }
                ].map(item => (
                  <label key={item.key} className="flex items-center justify-between p-3 bg-slate-900/40 border border-slate-800 rounded-xl cursor-pointer">
                    <div>
                      <h4 className="font-bold text-slate-300">{item.title}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={alerts[item.key]}
                      onChange={async (e) => {
                        const updatedAlerts = { ...alerts, [item.key]: e.target.checked };
                        setAlerts(updatedAlerts);
                        try {
                          const { data } = await api.put('/users/me', {
                            alertSettings: updatedAlerts
                          });
                          updateUser(data.data);
                          toast.success('Notification settings saved.');
                        } catch (err) {
                          console.error('Failed to update alert settings:', err);
                          toast.error('Failed to save alert settings');
                        }
                      }}
                      className="rounded border-slate-700 bg-dark-900 text-primary-500 focus:ring-primary-500"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
