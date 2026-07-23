import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { motion } from 'framer-motion';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Wallet,
  X
} from 'lucide-react';

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

  // Issue #6 fix: removed simulateSocialLogin — it wrote fake mock tokens to
  // localStorage (mock-sso-token) without any real server authentication,
  // creating a false sense of logged-in state. SSO is not yet implemented.

  return (
    <div className="min-h-screen bg-[#F3F4FE] text-[#475569] flex items-center justify-center p-4 sm:p-6 lg:p-10 font-sans selection:bg-[#5B4CF0]/20 selection:text-[#5B4CF0]">
      {/* Main Split Container Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[1040px] bg-white rounded-[28px] sm:rounded-[32px] shadow-[0_20px_60px_rgba(79,70,229,0.07)] border border-slate-200/60 overflow-hidden grid grid-cols-1 md:grid-cols-2 my-auto"
      >
        {/* LEFT SIDE - LOGIN FORM PANEL */}
        <div className="p-7 sm:p-10 lg:p-12 flex flex-col justify-between bg-white font-sans">
          <div>
            {/* App Logo & Header */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 border border-slate-200 bg-white">
                <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
              </div>
              <span className="text-lg font-bold tracking-tight text-[#1E293B] font-jakarta">
                My Expense Pro
              </span>
            </div>

            {/* Welcome Greeting */}
            <div className="mb-7">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1E293B] tracking-tight font-jakarta">
                Welcome Back
              </h1>
              <p className="text-xs sm:text-sm font-medium text-[#475569] mt-1">
                Please enter your details to sign in
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div className="form-group">
                <label className="block text-xs font-semibold text-[#334155] mb-1.5 font-jakarta">
                  Email Address
                </label>
                <div className="relative flex items-center group">
                  <Mail className="w-4 h-4 absolute left-4 text-slate-400 pointer-events-none transition-colors group-focus-within:text-[#5B4CF0]" />
                  <input
                    id="login-email"
                    type="text"
                    className={`w-full h-[50px] pl-11 pr-4 bg-[#F1F5F9] border border-transparent rounded-[14px] text-[#0F172A] text-sm font-medium placeholder-[#94A3B8] focus:outline-none focus:bg-white focus:border-[#5B4CF0] focus:ring-4 focus:ring-[#5B4CF0]/12 transition-all duration-200 ${
                      emailError ? '!border-red-500 !bg-red-50/50 focus:!ring-red-500/15' : ''
                    }`}
                    placeholder="name@company.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="form-group">
                <label className="block text-xs font-semibold text-[#334155] mb-1.5 font-jakarta">
                  Password
                </label>
                <div className="relative flex items-center group">
                  <Lock className="w-4 h-4 absolute left-4 text-slate-400 pointer-events-none transition-colors group-focus-within:text-[#5B4CF0]" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    className={`w-full h-[50px] pl-11 pr-11 bg-[#F1F5F9] border border-transparent rounded-[14px] text-[#0F172A] text-sm font-medium placeholder-[#94A3B8] focus:outline-none focus:bg-white focus:border-[#5B4CF0] focus:ring-4 focus:ring-[#5B4CF0]/12 transition-all duration-200 ${
                      passwordError ? '!border-red-500 !bg-red-50/50 focus:!ring-red-500/15' : ''
                    }`}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-[#5B4CF0] hover:text-[#4338CA] transition-colors p-1 rounded-lg focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#5B4CF0] focus:ring-[#5B4CF0] focus:ring-offset-0 transition-colors cursor-pointer accent-[#5B4CF0]"
                  />
                  <span className="text-[#475569] group-hover:text-[#1E293B] transition-colors font-medium">
                    Remember Me
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-[#5B4CF0] hover:text-[#4338CA] font-semibold transition-colors hover:underline"
                >
                  Forgot Password?
                </button>
              </div>

              {/* Sign In Button */}
              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                className="w-full h-[50px] mt-2 rounded-[14px] bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-sm shadow-md shadow-[#4F46E5]/25 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed font-jakarta"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing In...</span>
                  </span>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Social Login Divider */}
            <div className="relative my-6 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <span className="relative bg-white px-3 text-[11px] font-semibold tracking-wider uppercase text-[#64748B]">
                OR CONTINUE WITH
              </span>
            </div>

            {/* Social Login Buttons */}
            <div className="flex">
              {/* Issue #6 fix: SSO button is disabled — real OAuth not yet implemented */}
              <button
                type="button"
                disabled
                title="Google Sign-In coming soon"
                className="w-full h-[46px] px-3 bg-[#F1F5F9] text-[#94A3B8] text-xs font-semibold rounded-[14px] flex items-center justify-center gap-2 cursor-not-allowed opacity-60"
              >
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.28v3.15C3.26 21.3 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.28C.46 8.2 0 10.04 0 12s.46 3.8 1.28 5.42l4-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.7 1.28 6.58l4 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Google (Coming Soon)</span>
              </button>
            </div>
          </div>

          {/* Footer Register Link */}
          <div className="pt-6 text-center text-xs text-[#64748B] mt-4">
            Don't have an account?{' '}
            <Link to="/register" className="text-[#5B4CF0] hover:text-[#4338CA] font-semibold transition-colors hover:underline">
              Create one
            </Link>
          </div>
        </div>

        {/* RIGHT SIDE - PURPLE PREVIEW PANEL */}
        <div className="hidden md:flex bg-[#F3F4FE] p-8 lg:p-12 flex-col items-center justify-center text-center select-none relative font-sans">
          {/* Dashed Circle Graphic with Tilted 3D Card */}
          <div className="relative w-64 h-64 lg:w-72 lg:h-72 rounded-full border-2 border-dashed border-[#C7D2FE] flex items-center justify-center mb-8">
            <motion.div
              animate={{ y: [0, -6, 0], rotate: [-5, -7, -5] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              className="w-48 h-32 bg-white rounded-2xl shadow-[0_15px_35px_rgba(99,102,241,0.08)] border border-slate-100/80 p-4 flex flex-col justify-between text-left"
            >
              {/* Card Accent Top Bar in Purple */}
              <div className="w-12 h-2 rounded-full bg-[#5B4CF0]" />
              {/* Card Lines */}
              <div className="space-y-2">
                <div className="w-24 h-2 rounded-full bg-slate-100" />
                <div className="w-16 h-2 rounded-full bg-slate-100" />
              </div>
            </motion.div>
          </div>

          {/* Text Content */}
          <h2 className="text-xl lg:text-2xl font-bold text-[#1E293B] mb-3 font-jakarta">
            Smart Personal Budgeting
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] max-w-[320px] leading-relaxed font-medium">
            Track metrics, predict cash flows, carbon footprint metrics, and get automatic AI recommendations.
          </p>
        </div>
      </motion.div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xs animate-fade-in font-sans">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-md bg-white border border-slate-100 rounded-[24px] p-6 sm:p-8 shadow-2xl"
          >
            <button
              type="button"
              onClick={() => {
                setShowForgotModal(false);
                setForgotStep(1);
              }}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-lg"
              aria-label="Close reset modal"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h2 className="text-xl font-extrabold text-[#1E293B] mb-1 font-jakarta">Reset Password</h2>
            
            {forgotStep === 1 ? (
              <form onSubmit={handleSendResetCode} className="space-y-4 mt-4">
                <p className="text-xs text-[#475569] leading-relaxed font-medium">
                  Enter your email address and we'll send you a 6-digit verification code to reset your password.
                </p>
                <div className="form-group">
                  <label className="block text-xs font-semibold text-[#334155] mb-1.5 font-jakarta">
                    Email Address
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 absolute left-4 text-slate-400 pointer-events-none" />
                    <input
                      type="email"
                      className="w-full h-[48px] pl-11 pr-4 bg-[#F1F5F9] border border-transparent rounded-[14px] text-[#0F172A] text-sm font-medium placeholder-[#94A3B8] focus:outline-none focus:bg-white focus:border-[#5B4CF0] focus:ring-4 focus:ring-[#5B4CF0]/12 transition-all duration-200"
                      placeholder="your-email@company.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full h-[48px] rounded-[14px] bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-sm shadow-md shadow-[#4F46E5]/25 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 mt-2 font-jakarta"
                  disabled={forgotLoading}
                >
                  {forgotLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending Code...
                    </span>
                  ) : (
                    'Send Verification Code'
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4 mt-4">
                <p className="text-xs text-[#475569] leading-relaxed font-medium">
                  A 6-digit verification code has been sent to <strong>{forgotEmail}</strong>. Please enter the code and your new password.
                </p>
                <div className="form-group">
                  <label className="block text-xs font-semibold text-[#334155] mb-1.5 font-jakarta">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    className="w-full h-[48px] bg-[#F1F5F9] border border-transparent rounded-[14px] text-center tracking-[0.5em] font-mono text-lg text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#5B4CF0] focus:ring-4 focus:ring-[#5B4CF0]/12 transition-all duration-200"
                    placeholder="000000"
                    value={forgotCode}
                    onChange={(e) => setForgotCode(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="block text-xs font-semibold text-[#334155] mb-1.5 font-jakarta">
                    New Password
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 absolute left-4 text-slate-400 pointer-events-none" />
                    <input
                      type="password"
                      className="w-full h-[48px] pl-11 pr-4 bg-[#F1F5F9] border border-transparent rounded-[14px] text-[#0F172A] text-sm font-medium placeholder-[#94A3B8] focus:outline-none focus:bg-white focus:border-[#5B4CF0] focus:ring-4 focus:ring-[#5B4CF0]/12 transition-all duration-200"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    className="h-[48px] px-4 bg-slate-100 hover:bg-slate-200 text-[#334155] text-xs font-semibold rounded-[14px] transition-all w-1/3"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="flex-1 h-[48px] rounded-[14px] bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-sm shadow-md shadow-[#4F46E5]/25 hover:shadow-lg transition-all duration-200 font-jakarta"
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Resetting...
                      </span>
                    ) : (
                      'Reset Password'
                    )}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
