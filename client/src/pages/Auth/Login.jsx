import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import api from '../../services/api';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Forgot password flow states
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotCode, setForgotCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleSendResetCode = async (e) => {
    e.preventDefault();
    if (!forgotEmail) return toast.error('Please enter your email');
    setForgotLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: forgotEmail });
      toast.success('Verification code sent to your email!');
      setForgotStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reset code');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!forgotCode || !newPassword) {
      return toast.error('Please enter the verification code and your new password');
    }
    if (newPassword.length < 6) {
      return toast.error('New password must be at least 6 characters');
    }
    setForgotLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email: forgotEmail,
        token: forgotCode,
        newPassword,
      });
      toast.success('Password reset successful! You can now sign in.');
      setShowForgotModal(false);
      setForgotStep(1);
      setForgotEmail('');
      setForgotCode('');
      setNewPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setForgotLoading(false);
    }
  };

  // Load remembered email on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('remembered_email');
    if (savedEmail) {
      setForm((prev) => ({ ...prev, email: savedEmail }));
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setEmailError(false);
    setPasswordError(false);

    // Scenario 3: Empty email
    if (!form.email) {
      setEmailError(true);
      toast.error('Please enter your email.');
      return;
    }

    // Scenario 5: Invalid email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setEmailError(true);
      toast.error('Please enter a valid email address.');
      return;
    }

    // Scenario 4: Empty password
    if (!form.password) {
      setPasswordError(true);
      toast.error('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      await login(form.email, form.password);
      if (rememberMe) {
        localStorage.setItem('remembered_email', form.email);
      } else {
        localStorage.removeItem('remembered_email');
      }
      navigate('/dashboard');
    } catch (err) {
      let errMsg = err.response?.data?.message || 'Login failed';
      
      // Highlight invalid fields where appropriate
      if (errMsg.includes('email') || errMsg.includes('No account found') || errMsg.includes('not registered') || errMsg.includes('registered')) {
        setEmailError(true);
      }
      if (errMsg.includes('password') || errMsg.includes('Incorrect password')) {
        setPasswordError(true);
      }

      // Map incorrect password message
      if (errMsg === 'Incorrect password.') {
        errMsg = 'Incorrect password. Please try again.';
      }

      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const simulateSocialLogin = (provider) => {
    toast.success(`Simulating Single-Sign-On with ${provider}...`);
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      // Create a dummy user
      const dummyUser = {
        name: 'Aditya Dhobale',
        email: `aditya@${provider.toLowerCase()}.com`,
        currency: 'INR',
        role: 'user',
        phone: '+91 9876543210',
        company: 'SSO Account',
        twoFactorEnabled: false
      };
      localStorage.setItem('accessToken', 'mock-sso-token');
      localStorage.setItem('user', JSON.stringify(dummyUser));
      // Reload page state or update auth
      window.location.href = '/dashboard';
    }, 1200);
  };

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
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl shadow-lg shadow-primary-600/30 mb-4 glow-primary">
            <svg className="w-9 h-9 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 7h-8v10h8a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
              <path d="M5 21V5a2 2 0 0 1 2-2h10v4H7a2 2 0 0 0-2 2v12h14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gradient">My Expense Pro</h1>
          <p className="text-slate-400 mt-1">Professional Personal Finance Dashboard</p>
        </div>

        {/* Card */}
        <div className="glass p-8 relative overflow-hidden">
          <h2 className="text-xl font-semibold text-slate-100 mb-6">Welcome Back</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-group">
              <label className="label">Email Address</label>
              <input
                id="login-email"
                type="text"
                className={`input ${emailError ? '!border-red-500 focus:!ring-red-500' : ''}`}
                placeholder="name@company.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            
            <div className="form-group">
              <label className="label">Password</label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className={`input pr-10 ${passwordError ? '!border-red-500 focus:!ring-red-500' : ''}`}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? '👁️' : '🕶️'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-700 bg-dark-900 text-primary-500 focus:ring-primary-500"
                />
                <span>Remember Me</span>
              </label>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-primary-400 hover:underline"
              >
                Forgot Password?
              </button>
            </div>

            <button
              id="login-submit"
              type="submit"
              className="btn-primary w-full mt-2 py-3"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying...
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          {/* Social Divider */}
          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-700/50"></div></div>
            <span className="relative bg-dark-800/80 px-3 text-xs text-slate-500 font-medium">Or continue with</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => simulateSocialLogin('Google')}
              className="flex items-center justify-center gap-2 py-2 px-4 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl transition-all"
            >
              🌐 Google
            </button>
            <button
              type="button"
              onClick={() => simulateSocialLogin('GitHub')}
              className="flex items-center justify-center gap-2 py-2 px-4 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl transition-all"
            >
              🐙 GitHub
            </button>
          </div>

          <p className="text-center text-sm text-slate-400 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-400 hover:text-primary-300 font-medium">
              Create one
            </Link>
          </p>
        </div>
      </div>

      {/* Forgot Password Glassmorphic Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto bg-dark-900/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md glass p-6 sm:p-8 border border-slate-700/50 shadow-2xl animate-scale-up my-auto">
            <button
              type="button"
              onClick={() => {
                setShowForgotModal(false);
                setForgotStep(1);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors text-lg"
            >
              ✕
            </button>
            <h2 className="text-xl font-bold text-slate-100 mb-2">Reset Password</h2>
            
            {forgotStep === 1 ? (
              <form onSubmit={handleSendResetCode} className="space-y-4 mt-4">
                <p className="text-xs text-slate-400">
                  Enter your email address and we'll send you a 6-digit verification code to reset your password.
                </p>
                <div className="form-group">
                  <label className="label">Email Address</label>
                  <input
                    type="email"
                    className="input text-slate-100"
                    placeholder="your-email@company.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="btn-primary w-full py-2.5 mt-2"
                  disabled={forgotLoading}
                >
                  {forgotLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending Code...
                    </span>
                  ) : 'Send Verification Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4 mt-4">
                <p className="text-xs text-slate-400">
                  A 6-digit verification code has been sent to <strong>{forgotEmail}</strong>. Please enter the code and your new password.
                </p>
                <div className="form-group">
                  <label className="label">Verification Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    className="input text-center tracking-[0.5em] font-mono text-lg text-slate-100"
                    placeholder="000000"
                    value={forgotCode}
                    onChange={(e) => setForgotCode(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="label">New Password</label>
                  <input
                    type="password"
                    className="input text-slate-100"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    className="flex items-center justify-center py-2.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl transition-all w-1/3"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex-1 py-2.5"
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Resetting...
                      </span>
                    ) : 'Reset Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
