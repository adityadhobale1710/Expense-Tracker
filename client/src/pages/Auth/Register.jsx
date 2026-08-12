import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  User,
  Phone,
  CheckCircle2,
  XCircle,
} from 'lucide-react';


const GoldCoin = ({ className }) => (
  <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="goldCoinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFE082" />
        <stop offset="30%" stopColor="#FBBF24" />
        <stop offset="70%" stopColor="#D97706" />
        <stop offset="100%" stopColor="#78350F" />
      </linearGradient>
      <linearGradient id="goldCoinHighlightGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#FBBF24" stopOpacity="0" />
      </linearGradient>
    </defs>
    <circle cx="20" cy="20" r="18" fill="url(#goldCoinGrad)" filter="drop-shadow(0px 3px 5px rgba(217, 119, 6, 0.35))" />
    <circle cx="20" cy="20" r="14" fill="none" stroke="#FBBF24" strokeWidth="1.2" opacity="0.6" />
    <circle cx="20" cy="20" r="17" fill="none" stroke="url(#goldCoinHighlightGrad)" strokeWidth="1" />
    <text x="20" y="26" fontFamily="sans-serif" fontWeight="bold" fontSize="18" fill="#FFF" textAnchor="middle" filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.3))">₹</text>
  </svg>
);

const Sparkle = ({ className, delay }) => (
  <motion.svg
    animate={{ scale: [0.5, 1.2, 0.5], opacity: [0.3, 1, 0.3] }}
    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay }}
    className={`${className} text-[#FBBF24] fill-current`}
    viewBox="0 0 24 24"
  >
    <path d="M12 0L14.6 9.4L24 12L14.6 14.6L12 24L9.4 14.6L0 12L9.4 9.4L12 0Z" />
  </motion.svg>
);

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  // Form states
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Validation highlights
  const [errors, setErrors] = useState({
    name: false,
    email: false,
    phone: false,
    password: false,
    confirmPassword: false
  });

  const onChange = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value });
    setErrors({ ...errors, [key]: false });
  };

  // Password requirements calculation
  const pwd = form.password;
  const isMinLength = pwd.length >= 6;
  const isUppercase = /[A-Z]/.test(pwd);
  const isLowercase = /[a-z]/.test(pwd);
  const isNumber = /[0-9]/.test(pwd);
  const isSpecialChar = /[^A-Za-z0-9]/.test(pwd);

  const getPasswordStrength = () => {
    if (!pwd) return { score: 0, text: 'None', color: 'bg-slate-200' };
    let score = 0;
    if (isMinLength) score++;
    if (isUppercase && isLowercase) score++;
    if (isNumber && isSpecialChar) score++;

    if (score === 1) return { score, text: 'Weak Password', color: 'bg-rose-500' };
    if (score === 2) return { score, text: 'Medium Strength', color: 'bg-amber-500' };
    if (score === 3) return { score, text: 'Strong & Secure 🎉', color: 'bg-emerald-500' };
    return { score: 0, text: 'None', color: 'bg-slate-200' };
  };

  const strength = getPasswordStrength();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validations
    if (!form.name.trim()) {
      setErrors(prev => ({ ...prev, name: true }));
      return toast.error('Please enter your full name.');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setErrors(prev => ({ ...prev, email: true }));
      return toast.error('Please enter a valid email address.');
    }
    if (!form.phone.trim()) {
      setErrors(prev => ({ ...prev, phone: true }));
      return toast.error('Please enter your phone number.');
    }
    if (!isMinLength) {
      setErrors(prev => ({ ...prev, password: true }));
      return toast.error('Password must be at least 6 characters.');
    }
    if (form.password !== form.confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: true }));
      return toast.error('Passwords do not match.');
    }

    try {
      await register(form.name, form.email, form.password, form.phone);
      toast.success('Account created successfully! Please sign in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || (err.message === 'Network Error' || !err.response ? 'Network Error. Unable to connect to the backend server.' : 'Registration failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F4FE] text-[#475569] flex items-center justify-center p-4 sm:p-6 lg:p-10 font-sans selection:bg-[#5B4CF0]/20 selection:text-[#5B4CF0]">
      {/* Main Split Container Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[1040px] bg-white rounded-[28px] sm:rounded-[32px] shadow-[0_20px_60px_rgba(79,70,229,0.07)] border border-slate-200/60 overflow-hidden grid grid-cols-1 md:grid-cols-2 my-auto"
      >
        {/* LEFT SIDE - REGISTER FORM / OTP PANEL */}
        <div className="p-7 sm:p-10 lg:p-12 flex flex-col justify-between bg-white font-sans max-h-[90vh] overflow-y-auto">
          <div>
            {/* App Logo & Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 border border-slate-200 bg-white">
                <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
              </div>
              <span className="text-lg font-bold tracking-tight text-[#1E293B] font-jakarta">
                My Expense Pro
              </span>
            </div>


            <motion.div
              key="register"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Greetings header */}
              <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1E293B] tracking-tight font-jakarta">
                  Create Account
                </h1>
                <p className="text-xs sm:text-sm font-medium text-[#475569] mt-1">
                  Start tracking and saving recurring expenses today
                </p>
              </div>

              {/* Form fields */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                    {/* Full Name */}
                    <div className="form-group">
                      <label className="block text-xs font-semibold text-[#334155] mb-1.5 font-jakarta">
                        Full Name
                      </label>
                      <div className="relative flex items-center group">
                        <User className="w-4 h-4 absolute left-4 text-slate-400 pointer-events-none transition-colors group-focus-within:text-[#5B4CF0]" />
                        <input
                          id="reg-name"
                          type="text"
                          className={`w-full h-[46px] pl-11 pr-4 bg-[#F1F5F9] border border-transparent rounded-[14px] text-[#0F172A] text-sm font-medium placeholder-[#94A3B8] focus:outline-none focus:bg-white focus:border-[#5B4CF0] focus:ring-4 focus:ring-[#5B4CF0]/12 transition-all duration-200 ${
                            errors.name ? '!border-red-500 !bg-red-50/50 focus:!ring-red-500/15' : ''
                          }`}
                          placeholder="Aditya Dhobale"
                          value={form.name}
                          onChange={onChange('name')}
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div className="form-group">
                      <label className="block text-xs font-semibold text-[#334155] mb-1.5 font-jakarta">
                        Email Address
                      </label>
                      <div className="relative flex items-center group">
                        <Mail className="w-4 h-4 absolute left-4 text-slate-400 pointer-events-none transition-colors group-focus-within:text-[#5B4CF0]" />
                        <input
                          id="reg-email"
                          type="email"
                          className={`w-full h-[46px] pl-11 pr-4 bg-[#F1F5F9] border border-transparent rounded-[14px] text-[#0F172A] text-sm font-medium placeholder-[#94A3B8] focus:outline-none focus:bg-white focus:border-[#5B4CF0] focus:ring-4 focus:ring-[#5B4CF0]/12 transition-all duration-200 ${
                            errors.email ? '!border-red-500 !bg-red-50/50 focus:!ring-red-500/15' : ''
                          }`}
                          placeholder="name@company.com"
                          value={form.email}
                          onChange={onChange('email')}
                        />
                      </div>
                    </div>

                    {/* Phone */}
                    <div className="form-group">
                      <label className="block text-xs font-semibold text-[#334155] mb-1.5 font-jakarta">
                        Phone Number
                      </label>
                      <div className="relative flex items-center group">
                        <Phone className="w-4 h-4 absolute left-4 text-slate-400 pointer-events-none transition-colors group-focus-within:text-[#5B4CF0]" />
                        <input
                          id="reg-phone"
                          type="tel"
                          className={`w-full h-[46px] pl-11 pr-4 bg-[#F1F5F9] border border-transparent rounded-[14px] text-[#0F172A] text-sm font-medium placeholder-[#94A3B8] focus:outline-none focus:bg-white focus:border-[#5B4CF0] focus:ring-4 focus:ring-[#5B4CF0]/12 transition-all duration-200 ${
                            errors.phone ? '!border-red-500 !bg-red-50/50 focus:!ring-red-500/15' : ''
                          }`}
                          placeholder="+91 9876543210"
                          value={form.phone}
                          onChange={onChange('phone')}
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div className="form-group">
                      <label className="block text-xs font-semibold text-[#334155] mb-1.5 font-jakarta">
                        Password
                      </label>
                      <div className="relative flex items-center group">
                        <Lock className="w-4 h-4 absolute left-4 text-slate-400 pointer-events-none transition-colors group-focus-within:text-[#5B4CF0]" />
                        <input
                          id="reg-password"
                          type={showPassword ? 'text' : 'password'}
                          className={`w-full h-[46px] pl-11 pr-11 bg-[#F1F5F9] border border-transparent rounded-[14px] text-[#0F172A] text-sm font-medium placeholder-[#94A3B8] focus:outline-none focus:bg-white focus:border-[#5B4CF0] focus:ring-4 focus:ring-[#5B4CF0]/12 transition-all duration-200 ${
                            errors.password ? '!border-red-500 !bg-red-50/50 focus:!ring-red-500/15' : ''
                          }`}
                          placeholder="Min. 6 characters"
                          value={form.password}
                          onChange={onChange('password')}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 text-[#5B4CF0] hover:text-[#4338CA] transition-colors p-1 rounded-lg focus:outline-none"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      
                      {/* Requirements indicator list */}
                      {pwd && (
                        <div className="mt-2.5 space-y-2 bg-[#F8FAFC] border border-slate-100 p-3 rounded-2xl">
                          <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                            <span>Password Security Level</span>
                            <span className={strength.score === 3 ? 'text-emerald-500' : strength.score === 2 ? 'text-amber-500' : 'text-rose-500'}>
                              {strength.text}
                            </span>
                          </div>
                          
                          <div className="flex gap-1 h-1">
                            <div className={`h-full flex-1 rounded ${strength.score >= 1 ? strength.color : 'bg-slate-200'}`} />
                            <div className={`h-full flex-1 rounded ${strength.score >= 2 ? strength.color : 'bg-slate-200'}`} />
                            <div className={`h-full flex-1 rounded ${strength.score >= 3 ? strength.color : 'bg-slate-200'}`} />
                          </div>

                          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 pt-1 text-[10px] font-medium text-slate-500">
                            <div className="flex items-center gap-1">
                              {isMinLength ? <CheckCircle2 size={12} className="text-emerald-500" /> : <XCircle size={12} className="text-slate-300" />}
                              <span>6+ characters</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {isUppercase ? <CheckCircle2 size={12} className="text-emerald-500" /> : <XCircle size={12} className="text-slate-300" />}
                              <span>Uppercase letter</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {isLowercase ? <CheckCircle2 size={12} className="text-emerald-500" /> : <XCircle size={12} className="text-slate-300" />}
                              <span>Lowercase letter</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {isNumber ? <CheckCircle2 size={12} className="text-emerald-500" /> : <XCircle size={12} className="text-slate-300" />}
                              <span>Numeric digit</span>
                            </div>
                            <div className="flex items-center gap-1 col-span-2">
                              {isSpecialChar ? <CheckCircle2 size={12} className="text-emerald-500" /> : <XCircle size={12} className="text-slate-300" />}
                              <span>Special character (!@#$%)</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div className="form-group">
                      <label className="block text-xs font-semibold text-[#334155] mb-1.5 font-jakarta">
                        Confirm Password
                      </label>
                      <div className="relative flex items-center group">
                        <Lock className="w-4 h-4 absolute left-4 text-slate-400 pointer-events-none transition-colors group-focus-within:text-[#5B4CF0]" />
                        <input
                          id="reg-confirm"
                          type={showConfirmPassword ? 'text' : 'password'}
                          className={`w-full h-[46px] pl-11 pr-11 bg-[#F1F5F9] border border-transparent rounded-[14px] text-[#0F172A] text-sm font-medium placeholder-[#94A3B8] focus:outline-none focus:bg-white focus:border-[#5B4CF0] focus:ring-4 focus:ring-[#5B4CF0]/12 transition-all duration-200 ${
                            errors.confirmPassword ? '!border-red-500 !bg-red-50/50 focus:!ring-red-500/15' : ''
                          }`}
                          placeholder="••••••••"
                          value={form.confirmPassword}
                          onChange={onChange('confirmPassword')}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3.5 text-[#5B4CF0] hover:text-[#4338CA] transition-colors p-1 rounded-lg focus:outline-none"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {form.confirmPassword && form.password !== form.confirmPassword && (
                        <p className="text-[10px] text-rose-500 font-semibold mt-1 flex items-center gap-1">
                          <XCircle size={11} /> Passwords do not match
                        </p>
                      )}
                    </div>

                    {/* Primary Button */}
                    <button
                      id="reg-submit"
                      type="submit"
                      disabled={loading}
                      className="w-full h-[48px] rounded-[14px] bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-sm shadow-md shadow-[#4F46E5]/25 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed font-jakarta"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Creating profile...</span>
                        </span>
                      ) : (
                        <>
                          <span>Create Account</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                </motion.div>
          </div>

          {/* Bottom link back to login page */}
          <div className="pt-6 text-center text-xs text-[#64748B] mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-[#5B4CF0] hover:text-[#4338CA] font-semibold transition-colors hover:underline">
              Sign in
            </Link>
          </div>
        </div>

        {/* RIGHT SIDE - PURPLE PREVIEW PANEL (Visual Twin of Login Page) */}
        <div className="hidden md:flex bg-[#F3F4FE] p-8 lg:p-12 flex-col items-center justify-center text-center select-none relative font-sans">
          {/* Dashed Circle Graphic with Tilted 3D Card */}
          <div className="relative w-64 h-64 lg:w-72 lg:h-72 rounded-full border-2 border-dashed border-[#C7D2FE] flex items-center justify-center mb-8">
            {/* Ambient Glow */}
            <motion.div
              animate={{ scale: [1, 1.06, 1], opacity: [0.15, 0.22, 0.15] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-4 rounded-full bg-gradient-to-tr from-[#6C63FF] via-[#7C4DFF] to-[#8B5CF6] blur-2xl pointer-events-none"
            />

            {/* Glowing Particles */}
            <Sparkle className="absolute top-8 left-16 w-3 h-3" delay={0.2} />
            <Sparkle className="absolute bottom-10 right-14 w-3.5 h-3.5" delay={1.4} />
            <Sparkle className="absolute top-24 right-10 w-2.5 h-2.5" delay={0.8} />

            {/* Floating Finance Elements */}
            {/* Pie Chart */}
            <motion.div
              animate={{ y: [0, -6, 0], rotate: [0, 10, 0] }}
              transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
              className="absolute top-10 left-6 w-8 h-8 pointer-events-none"
            >
              <svg viewBox="0 0 24 24" className="w-full h-full filter drop-shadow-[0_4px_8px_rgba(139,92,246,0.15)]">
                <path d="M12 2 C6.48 2 2 6.48 2 12 C2 17.52 6.48 22 12 22 C17.52 22 22 17.52 22 12 L12 12 Z" fill="#8B5CF6" />
                <path d="M12 2 A10 10 0 0 1 22 12 L12 12 Z" fill="#FBBF24" />
                <path d="M12 12 L22 12 A10 10 0 0 1 12 22 Z" fill="#22C55E" fillOpacity={0.85} />
              </svg>
            </motion.div>

            {/* Bar Chart */}
            <motion.div
              animate={{ y: [0, 6, 0], rotate: [0, -8, 0] }}
              transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut", delay: 0.7 }}
              className="absolute top-16 left-28 w-7 h-7 flex items-end justify-center gap-[3px] bg-white/35 backdrop-blur-[4px] border border-white/50 p-1.5 rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.03)] pointer-events-none"
            >
              <div className="w-[3px] h-2.5 rounded-full bg-[#8B5CF6]" />
              <div className="w-[3px] h-4 rounded-full bg-[#6C63FF]" />
              <div className="w-[3px] h-3.5 rounded-full bg-[#22C55E]" />
            </motion.div>

            {/* Growth Arrow */}
            <motion.div
              animate={{ y: [0, -7, 0], x: [0, 3, 0] }}
              transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
              className="absolute bottom-12 right-6 w-7 h-7 text-[#22C55E] filter drop-shadow-[0_4px_8px_rgba(34,197,94,0.3)] pointer-events-none"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
            </motion.div>

            {/* Shield (Security) */}
            <motion.div
              animate={{ y: [0, 5, 0], rotate: [0, -6, 0] }}
              transition={{ duration: 4.6, repeat: Infinity, ease: "easeInOut", delay: 1.1 }}
              className="absolute bottom-10 left-12 w-6 h-6 text-[#7C4DFF] pointer-events-none"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full filter drop-shadow-[0_4px_8px_rgba(124,77,255,0.2)]">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </motion.div>

            {/* Glassmorphism Mini Cards */}
            {/* Card 1: Income Notification */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1, y: [0, -5, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute -top-3 -right-2 w-28 p-2 rounded-xl bg-white/40 border border-white/50 shadow-[0_8px_24px_rgba(99,102,241,0.06)] backdrop-blur-[6px] flex flex-col gap-1 text-left pointer-events-none select-none z-10"
            >
              <div className="flex items-center justify-between">
                <div className="w-6 h-1.5 rounded-full bg-[#7C4DFF]/70" />
                <span className="text-[8px] font-bold text-[#22C55E] font-sans">+₹8,450</span>
              </div>
              <div className="w-14 h-1 rounded-full bg-[#64748B]/15" />
              <div className="w-9 h-1 rounded-full bg-[#64748B]/10" />
            </motion.div>

            {/* Card 2: Savings Metric */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1, y: [0, 4, 0] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -bottom-4 -left-4 w-26 p-2 rounded-xl bg-white/40 border border-white/50 shadow-[0_8px_24px_rgba(99,102,241,0.06)] backdrop-blur-[6px] flex items-center gap-1.5 text-left pointer-events-none select-none z-10"
            >
              <div className="w-5 h-5 rounded-md bg-[#6C63FF]/15 flex items-center justify-center text-[#6C63FF]">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-[6.5px] font-semibold text-[#64748B]">Savings</span>
                <span className="text-[9px] font-bold text-[#1E293B]">64.2%</span>
              </div>
            </motion.div>

            {/* Floating Credit Card */}
            <motion.div
              animate={{ y: [0, -8, 0], rotate: [6, 10, 6] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.9 }}
              className="absolute top-20 -right-8 w-11 h-7 rounded-md bg-gradient-to-br from-[#8B5CF6] to-[#6C63FF] shadow-md border border-white/10 flex flex-col justify-between p-1.5 text-left z-10 pointer-events-none"
            >
              <div className="w-2.5 h-1.5 rounded-[1px] bg-[#FBBF24]/80" />
              <div className="w-6 h-0.5 rounded-full bg-white/30" />
            </motion.div>

            {/* Floating Gold Coins */}
            {/* Coin 1 */}
            <motion.div
              animate={{ y: [0, -6, 0], rotate: [0, 8, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
              className="absolute top-6 left-16 w-8 h-8 pointer-events-none z-10"
            >
              <GoldCoin className="w-full h-full" />
            </motion.div>
            
            {/* Coin 2 */}
            <motion.div
              animate={{ y: [0, -8, 0], rotate: [0, -12, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.7 }}
              className="absolute bottom-6 right-10 w-9 h-9 pointer-events-none z-10"
            >
              <GoldCoin className="w-full h-full" />
            </motion.div>

            {/* Coin 3 */}
            <motion.div
              animate={{ y: [0, -5, 0], rotate: [0, 6, 0] }}
              transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
              className="absolute top-24 -left-6 w-6 h-6 pointer-events-none z-10"
            >
              <GoldCoin className="w-full h-full" />
            </motion.div>

            {/* Main Wallet Illustration */}
            <motion.div
              animate={{ y: [0, -5, 0], rotate: [-2, 2, -2] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              className="w-40 h-40 lg:w-44 lg:h-44 flex items-center justify-center z-5 pointer-events-none"
            >
              <svg viewBox="0 0 200 200" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="walletBack" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#4F46E5" />
                    <stop offset="100%" stopColor="#1E1B4B" />
                  </linearGradient>
                  <linearGradient id="walletFront" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#8B5CF6" />
                    <stop offset="60%" stopColor="#6C63FF" />
                    <stop offset="100%" stopColor="#312E81" />
                  </linearGradient>
                  <linearGradient id="walletFlap" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#A78BFA" />
                    <stop offset="50%" stopColor="#7C4DFF" />
                    <stop offset="100%" stopColor="#4F46E5" />
                  </linearGradient>
                  <linearGradient id="goldCoin" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFE082" />
                    <stop offset="30%" stopColor="#FBBF24" />
                    <stop offset="70%" stopColor="#D97706" />
                    <stop offset="100%" stopColor="#78350F" />
                  </linearGradient>
                  <linearGradient id="goldCoinHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#FBBF24" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="rupeeNote" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#a7f3d0" />
                    <stop offset="40%" stopColor="#22C55E" />
                    <stop offset="100%" stopColor="#15803d" />
                  </linearGradient>
                  <linearGradient id="buckle" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFF" />
                    <stop offset="40%" stopColor="#FBBF24" />
                    <stop offset="100%" stopColor="#B45309" />
                  </linearGradient>
                  <linearGradient id="glassCard" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
                  </linearGradient>
                  <filter id="shadow" x="-10%" y="-10%" width="125%" height="125%">
                    <feDropShadow dx={1} dy={4} stdDeviation={3} floodColor="#000" floodOpacity={0.2} />
                  </filter>
                  <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx={0} dy={6} stdDeviation={5} floodColor="#4F46E5" floodOpacity={0.15} />
                  </filter>
                </defs>

                {/* Left Note sticking out */}
                <g transform="translate(62, 50) rotate(-18)" filter="url(#shadow)">
                  <rect x="0" y="0" width="36" height="52" rx="3" fill="url(#rupeeNote)" stroke="#e8f5e9" strokeWidth={1} />
                  <rect x="3" y="3" width="30" height="46" rx="1.5" fill="none" stroke="#e8f5e9" strokeWidth={0.5} strokeDasharray="1 1" opacity={0.7} />
                  <text x="18" y="18" fontFamily="sans-serif" fontWeight="bold" fontSize={11} fill="#e8f5e9" textAnchor="middle">₹</text>
                  <circle cx="18" cy="35" r="5" fill="#81c784" opacity="0.3" />
                </g>

                {/* Right Note sticking out */}
                <g transform="translate(98, 48) rotate(12)" filter="url(#shadow)">
                  <rect x="0" y="0" width="38" height="54" rx="3" fill="url(#rupeeNote)" stroke="#e8f5e9" strokeWidth={1} />
                  <rect x="3" y="3" width="32" height="48" rx="1.5" fill="none" stroke="#e8f5e9" strokeWidth={0.5} strokeDasharray="1 1" opacity={0.7} />
                  <text x="19" y="20" fontFamily="sans-serif" fontWeight="bold" fontSize={11} fill="#e8f5e9" textAnchor="middle">₹</text>
                  <circle cx="19" cy="37" r="5" fill="#81c784" opacity="0.3" />
                </g>

                {/* Card in Slot */}
                <g transform="translate(76, 68) rotate(-4)">
                  <rect x="0" y="0" width="45" height="28" rx="3" fill="url(#glassCard)" stroke="rgba(255,255,255,0.4)" strokeWidth={0.75} />
                  <rect x="4" y="5" width="8" height="6" rx="1" fill="#FBBF24" opacity="0.8" />
                  <rect x="16" y="6" width="22" height="2" rx="0.5" fill="white" opacity="0.4" />
                </g>

                {/* Wallet Rear Cover */}
                <rect x="50" y="80" width="100" height="70" rx="14" fill="url(#walletBack)" filter="url(#shadow)" />

                {/* Wallet Front Cover */}
                <rect x="48" y="90" width="104" height="64" rx="14" fill="url(#walletFront)" filter="url(#softShadow)" />

                {/* Stitching on Front Cover */}
                <rect x="52" y="94" width="96" height="56" rx="10" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={1.2} strokeDasharray="3 3" />

                {/* Clasp / Strap */}
                <path d="M 48 112 L 115 112 C 120 112, 124 115, 124 122 L 124 128 C 124 135, 120 138, 115 138 L 48 138 Z" fill="url(#walletFlap)" filter="url(#shadow)" />
                <path d="M 52 116 L 114 116 C 117 116, 120 118, 120 122 L 120 128 C 120 132, 117 134, 114 134 L 52 134" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={1} strokeDasharray="2 2" />

                {/* Buckle details */}
                <rect x="110" y="116" width="10" height="18" rx="2" fill="#1e1b4b" opacity="0.6" />
                <circle cx="115" cy="125" r="4.5" fill="url(#buckle)" filter="url(#shadow)" />
                <circle cx="115" cy="125" r="1.5" fill="#78350F" />
              </svg>
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
    </div>
  );
}
