import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'SGD'];

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  const [profile, setProfile] = useState({ name: user?.name || '', currency: user?.currency || 'INR' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmNew: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const { data } = await api.put('/users/me', profile);
      updateUser(data.data);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally { setSavingProfile(false); }
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
      toast.success('Password changed!');
      setPasswords({ currentPassword: '', newPassword: '', confirmNew: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally { setSavingPwd(false); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Avatar + name header */}
      <div className="card flex items-center gap-5">
        <div className="w-20 h-20 bg-primary-600 rounded-2xl flex items-center justify-center text-white text-4xl font-bold shadow-lg shadow-primary-600/30 flex-shrink-0">
          {user?.name?.[0]?.toUpperCase()}
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-100">{user?.name}</h2>
          <p className="text-slate-400 text-sm">{user?.email}</p>
          <span className="badge badge-purple mt-2">{user?.role}</span>
        </div>
      </div>

      {/* Profile form */}
      <div className="card">
        <h3 className="text-base font-semibold text-slate-100 mb-5">Account Information</h3>
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div className="form-group">
            <label className="label">Full Name</label>
            <input className="input" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="label">Email</label>
            <input className="input opacity-50 cursor-not-allowed" value={user?.email} disabled />
          </div>
          <div className="form-group">
            <label className="label">Default Currency</label>
            <select className="select" value={profile.currency} onChange={(e) => setProfile({ ...profile, currency: e.target.value })}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button type="submit" className="btn-primary" disabled={savingProfile}>
            {savingProfile ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Password form */}
      <div className="card">
        <h3 className="text-base font-semibold text-slate-100 mb-5">Change Password</h3>
        <form onSubmit={handlePasswordSave} className="space-y-4">
          <div className="form-group">
            <label className="label">Current Password</label>
            <input type="password" className="input" value={passwords.currentPassword} onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="label">New Password</label>
            <input type="password" className="input" value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} required minLength={6} />
          </div>
          <div className="form-group">
            <label className="label">Confirm New Password</label>
            <input type="password" className="input" value={passwords.confirmNew} onChange={(e) => setPasswords({ ...passwords, confirmNew: e.target.value })} required />
          </div>
          <button type="submit" className="btn-primary" disabled={savingPwd}>
            {savingPwd ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* Danger zone */}
      <div className="card border-red-500/20">
        <h3 className="text-base font-semibold text-red-400 mb-2">Danger Zone</h3>
        <p className="text-sm text-slate-400 mb-4">Log out of all sessions.</p>
        <button onClick={logout} className="btn-danger">Sign Out</button>
      </div>
    </div>
  );
}
