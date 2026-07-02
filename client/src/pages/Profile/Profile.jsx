import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' }
];

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState('profile');

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
  const [seeding, setSeeding] = useState(false);

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
  const [alerts, setAlerts] = useState({ bills: true, budgets: true, weekly: false });
  const [deviceSessions, setDeviceSessions] = useState([
    { id: 1, name: 'Windows 11 PC (Chrome browser) - Current', ip: '192.168.1.42', time: 'Active Session' },
    { id: 2, name: 'OnePlus 11 Smartphone (Mobile App)', ip: '103.54.21.90', time: 'Yesterday, 9:24 PM' }
  ]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const { data } = await api.put('/users/me', {
        name: profileForm.name,
        phone: profileForm.phone,
        company: profileForm.company,
        currency: profileForm.currency,
        twoFactorEnabled
      });
      updateUser(data.data);
      toast.success('Profile successfully updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setProfileForm({
        name: user?.name || '',
        phone: user?.phone || '',
        company: user?.company || '',
        currency: user?.currency || 'INR'
      });
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

  const handleSeedData = async () => {
    if (!window.confirm('Are you sure you want to seed demo data? This will clear all your current income, expenses, and budget entries.')) {
      return;
    }
    setSeeding(true);
    try {
      await api.post('/users/seed');
      toast.success('Successfully seeded 3 months of raw mock data! 🎉');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to seed demo data');
    } finally {
      setSeeding(false);
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

  const revokeSession = (id) => {
    setDeviceSessions(prev => prev.filter(s => s.id !== id));
    toast.success('Device session revoked successfully.');
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
              <p className="text-[10px] text-slate-500 uppercase font-semibold">{user?.role || 'Standard User'}</p>
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
            <button onClick={handleSeedData} disabled={seeding} className="w-full btn-secondary text-xs py-2 bg-indigo-500/10 border-indigo-500/20 text-indigo-400">
              {seeding ? 'Seeding Data...' : '⚙️ Seed Demo Data'}
            </button>
            <button onClick={logout} className="w-full btn-danger text-xs py-2">
              🚪 Logout Session
            </button>
          </div>
        </div>

        {/* Right Side Settings Contents */}
        <div className="xl:col-span-3 card">
          {activeSection === 'profile' && (
            <div className="space-y-6">
              <div className="pb-4 border-b border-slate-700/50">
                <h3 className="text-base font-bold text-slate-100">Edit Profile</h3>
                <p className="text-xs text-slate-400 mt-1">Configure your personal public account profile parameters.</p>
              </div>
              <form onSubmit={handleProfileSave} className="space-y-4 text-xs">
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

                <button type="submit" className="btn-primary py-2.5 px-6" disabled={savingProfile}>
                  {savingProfile ? 'Saving Changes...' : 'Save Profile'}
                </button>
              </form>
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
                      onChange={(e) => {
                        setProfileForm({ ...profileForm, currency: e.target.value });
                        toast.success(`Base currency updated to ${e.target.value}`);
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
                        toast.success(`Language changed to ${e.target.value === 'en' ? 'English' : 'Alternative'}`);
                      }}
                    >
                      <option value="en">English</option>
                      <option value="es">Español</option>
                      <option value="hi">हिन्दी</option>
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
                      <option value="midnight">🪐 Midnight Neon</option>
                      <option value="ocean">🌊 Deep Ocean</option>
                      <option value="forest">🌲 Forest Greens</option>
                      <option value="purple-neon">🔮 Purple Neon</option>
                    </select>
                  </div>
                </div>

                <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-slate-300">Live API Currency sync</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">Automate real-time conversion rates polling (USD/INR).</p>
                    </div>
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
                  {liveCurrencySync && (
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800 text-[10px] text-slate-400">
                      <div>
                        <span>Convert From (1 USD):</span>
                        <span className="block font-bold text-slate-200 mt-0.5">1.00 USD</span>
                      </div>
                      <div>
                        <span>Convert To (Live Rate):</span>
                        <span className="block font-bold text-primary-400 mt-0.5">83.42 INR</span>
                      </div>
                    </div>
                  )}
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
                    <p className="text-[10px] text-slate-500 mt-0.5">Add an extra layer of security using Google Authenticator codes.</p>
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
                  <div className="table-container">
                    <table className="table text-[11px]">
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
                          <tr key={session.id}>
                            <td className="font-medium text-slate-200">{session.name}</td>
                            <td className="font-mono text-slate-400">{session.ip}</td>
                            <td className="text-slate-400 font-semibold">{session.time}</td>
                            <td>
                              {session.id === 1 ? (
                                <span className="text-emerald-400 font-bold">Current</span>
                              ) : (
                                <button
                                  onClick={() => revokeSession(session.id)}
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
                      <p className="text-[10px] text-slate-500 mt-0.5">{item.desc}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={alerts[item.key]}
                      onChange={(e) => {
                        setAlerts({ ...alerts, [item.key]: e.target.checked });
                        toast.success('Alert settings saved.');
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
