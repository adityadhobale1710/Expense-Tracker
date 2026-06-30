import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const onChange = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl shadow-lg shadow-primary-600/30 mb-4">
            <span className="text-white text-3xl font-bold">₹</span>
          </div>
          <h1 className="text-3xl font-bold text-gradient">ExpenseTrack</h1>
          <p className="text-slate-400 mt-1">Start managing your finances</p>
        </div>

        <div className="glass p-8">
          <h2 className="text-xl font-semibold text-slate-100 mb-6">Create account</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-group">
              <label className="label">Full name</label>
              <input id="reg-name" type="text" className="input" placeholder="John Doe" value={form.name} onChange={onChange('name')} required />
            </div>
            <div className="form-group">
              <label className="label">Email address</label>
              <input id="reg-email" type="email" className="input" placeholder="you@example.com" value={form.email} onChange={onChange('email')} required />
            </div>
            <div className="form-group">
              <label className="label">Password</label>
              <input id="reg-password" type="password" className="input" placeholder="Min. 6 characters" value={form.password} onChange={onChange('password')} required minLength={6} />
            </div>
            <div className="form-group">
              <label className="label">Confirm password</label>
              <input id="reg-confirm" type="password" className="input" placeholder="••••••••" value={form.confirmPassword} onChange={onChange('confirmPassword')} required />
            </div>
            <button id="reg-submit" type="submit" className="btn-primary w-full mt-2" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : 'Create account'}
            </button>
          </form>
          <p className="text-center text-sm text-slate-400 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
