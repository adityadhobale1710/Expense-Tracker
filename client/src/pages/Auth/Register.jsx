import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
      await register(form.name, form.email, form.password, form.phone);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const onChange = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  // Password strength calculator
  const getPasswordStrength = () => {
    const pwd = form.password;
    if (!pwd) return { score: 0, text: 'None', color: 'bg-slate-700' };
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 8 && /[0-9]/.test(pwd)) score++;
    if (pwd.length >= 10 && /[^A-Za-z0-9]/.test(pwd)) score++;

    if (score === 1) return { score, text: 'Weak', color: 'bg-red-500' };
    if (score === 2) return { score, text: 'Medium', color: 'bg-yellow-500' };
    if (score === 3) return { score, text: 'Strong & Secure 🎉', color: 'bg-green-500' };
    return { score: 0, text: 'None', color: 'bg-slate-700' };
  };

  const strength = getPasswordStrength();

  return (
    <div className="min-h-screen bg-dark-900 flex items-start justify-center p-4 overflow-y-auto">
      {/* Background gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-92 h-92 bg-primary-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-92 h-92 bg-indigo-600/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in my-auto">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl overflow-hidden border border-slate-700/50 bg-dark-800 shadow-lg mb-4">
            <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-bold text-gradient">My Expense Pro</h1>
          <p className="text-slate-400 mt-1">Start managing your personal finances</p>
        </div>

        {/* Card */}
        <div className="glass p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-slate-100 mb-6">Create Account</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-group">
              <label className="label">Full Name</label>
              <input id="reg-name" type="text" className="input" placeholder="Aditya Dhobale" value={form.name} onChange={onChange('name')} required />
            </div>

            <div className="form-group">
              <label className="label">Email Address</label>
              <input id="reg-email" type="email" className="input" placeholder="name@company.com" value={form.email} onChange={onChange('email')} required />
            </div>

            <div className="form-group">
              <label className="label">Phone Number</label>
              <input id="reg-phone" type="tel" className="input" placeholder="+91 9876543210" value={form.phone} onChange={onChange('phone')} required />
            </div>

            <div className="form-group">
              <label className="label">Password</label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={onChange('password')}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? '👁️' : '🕶️'}
                </button>
              </div>
              
              {/* Strength Meter */}
              <div className="mt-2 space-y-1">
                <div className="flex gap-1 h-1">
                  <div className={`h-full flex-1 rounded ${strength.score >= 1 ? strength.color : 'bg-slate-700'}`} />
                  <div className={`h-full flex-1 rounded ${strength.score >= 2 ? strength.color : 'bg-slate-700'}`} />
                  <div className={`h-full flex-1 rounded ${strength.score >= 3 ? strength.color : 'bg-slate-700'}`} />
                </div>
                <span className="text-[10px] font-semibold text-slate-400">
                  Strength: <span className="text-slate-200">{strength.text}</span>
                </span>
              </div>
            </div>

            <div className="form-group">
              <label className="label">Confirm Password</label>
              <div className="relative">
                <input
                  id="reg-confirm"
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={onChange('confirmPassword')}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showConfirmPassword ? '👁️' : '🕶️'}
                </button>
              </div>
              {form.confirmPassword && form.password !== form.confirmPassword && (
                <span className="text-[10px] text-red-400 font-semibold mt-1">Passwords do not match</span>
              )}
            </div>

            <button id="reg-submit" type="submit" className="btn-primary w-full mt-4 py-3" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating profile...
                </span>
              ) : 'Create Account'}
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
