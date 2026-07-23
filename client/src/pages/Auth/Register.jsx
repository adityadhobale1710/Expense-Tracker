import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function Register() {
  const location = useLocation();
  const [step, setStep] = useState(location.state?.step || 'register');
  const [emailForOtp, setEmailForOtp] = useState(location.state?.email || '');
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  const [form, setForm] = useState({ name: '', email: location.state?.email || '', phone: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, verifyRegistrationOtp, resendRegistrationOtp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const { email } = await register(form.name, form.email, form.password, form.phone);
      setEmailForOtp(email || form.email);
      setStep('otp');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }
    setOtpLoading(true);
    try {
      await verifyRegistrationOtp(emailForOtp, otp);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResendDisabled(true);
    setResendCountdown(30);
    try {
      await resendRegistrationOtp(emailForOtp);
      toast.success('Code resent!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Resend failed');
    }

    const interval = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setResendDisabled(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleGoBack = () => {
    setStep('register');
    setOtp('');
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
          {step === 'register' ? (
            <>
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
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-slate-100 mb-6">Verify Email</h2>
              <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                We have sent a 6-digit verification code to <strong className="text-slate-200">{emailForOtp}</strong>. Enter it below to activate your account.
              </p>
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="form-group">
                  <label className="label">Verification Code</label>
                  <input
                    id="reg-otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    className="input text-center tracking-[0.5em] font-mono text-2xl"
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setOtp(val);
                    }}
                    required
                    autoFocus
                  />
                </div>

                <button id="otp-submit" type="submit" className="btn-primary w-full mt-4 py-3" disabled={otpLoading}>
                  {otpLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Verifying...
                    </span>
                  ) : 'Verify & Create Account'}
                </button>
              </form>

              <div className="flex flex-col items-center gap-4 mt-6 text-sm text-slate-400">
                <div className="flex justify-between w-full">
                  <button
                    type="button"
                    onClick={handleGoBack}
                    className="text-primary-400 hover:text-primary-300 font-medium transition-colors"
                  >
                    ← Edit Email
                  </button>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendDisabled}
                    className={`font-medium transition-colors ${
                      resendDisabled 
                        ? 'text-slate-600 cursor-not-allowed' 
                        : 'text-primary-400 hover:text-primary-300'
                    }`}
                  >
                    {resendCountdown > 0 ? `Resend (${resendCountdown}s)` : 'Resend Code'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
