import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { ArrowRight, Mail } from 'lucide-react';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyEmail, resendVerification } = useAuth();
  const [email, setEmail] = useState('');
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(30);
  const inputRefs = useRef([]);

  useEffect(() => {
    // Check if email was passed in state
    if (location.state?.email) {
      setEmail(location.state.email);
    }
  }, [location]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleChange = (index, value) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').slice(0, 6);
    if (/^\d+$/.test(pastedData)) {
      const newOtp = [...otp];
      for (let i = 0; i < pastedData.length; i++) {
        newOtp[i] = pastedData[i];
      }
      setOtp(newOtp);
      // Focus the next empty input or the last one
      const focusIndex = Math.min(pastedData.length, 5);
      if (inputRefs.current[focusIndex]) {
        inputRefs.current[focusIndex].focus();
      } else {
        inputRefs.current[5].focus();
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpValue = otp.join('');
    
    if (!email.trim()) {
      return toast.error('Please enter your email.');
    }
    if (otpValue.length !== 6) {
      return toast.error('Please enter the complete 6-digit code.');
    }

    setLoading(true);
    try {
      await verifyEmail(email, otpValue);
      toast.success('Email verified successfully. You can now log in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    if (!email.trim()) {
      return toast.error('Please enter your email to resend the code.');
    }

    try {
      await resendVerification(email);
      toast.success('Verification code sent to your email.');
      setResendCooldown(30);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend code.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F4FE] text-[#475569] flex items-center justify-center p-4 sm:p-6 lg:p-10 font-sans selection:bg-[#5B4CF0]/20 selection:text-[#5B4CF0]">
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[500px] bg-white rounded-[28px] sm:rounded-[32px] shadow-[0_20px_60px_rgba(79,70,229,0.07)] border border-slate-200/60 overflow-hidden"
      >
        <div className="p-7 sm:p-10 lg:p-12">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 border border-slate-200 bg-white">
              <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-lg font-bold tracking-tight text-[#1E293B] font-jakarta">
              My Expense Pro
            </span>
          </div>

          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1E293B] tracking-tight font-jakarta">
                Verify Your Email
              </h1>
              <p className="text-xs sm:text-sm font-medium text-[#475569] mt-1">
                Enter the 6-digit code sent to your email to verify your account.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Input */}
              <div className="form-group">
                <label className="block text-xs font-semibold text-[#334155] mb-1.5 font-jakarta">
                  Email Address
                </label>
                <div className="relative flex items-center group">
                  <Mail className="w-4 h-4 absolute left-4 text-slate-400 pointer-events-none transition-colors group-focus-within:text-[#5B4CF0]" />
                  <input
                    type="email"
                    className="w-full h-[46px] pl-11 pr-4 bg-[#F1F5F9] border border-transparent rounded-[14px] text-[#0F172A] text-sm font-medium placeholder-[#94A3B8] focus:outline-none focus:bg-white focus:border-[#5B4CF0] focus:ring-4 focus:ring-[#5B4CF0]/12 transition-all duration-200"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    readOnly={!!location.state?.email}
                  />
                </div>
              </div>

              {/* OTP Inputs */}
              <div className="form-group pt-2">
                <label className="block text-xs font-semibold text-[#334155] mb-1.5 font-jakarta">
                  6-Digit Verification Code
                </label>
                <div className="flex gap-2 justify-between mt-2" onPaste={handlePaste}>
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (inputRefs.current[index] = el)}
                      type="text"
                      maxLength={1}
                      className="w-12 h-14 sm:w-14 sm:h-16 text-center text-xl sm:text-2xl font-bold bg-[#F1F5F9] border border-transparent rounded-[14px] text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#5B4CF0] focus:ring-4 focus:ring-[#5B4CF0]/12 transition-all duration-200"
                      value={digit}
                      onChange={(e) => handleChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                    />
                  ))}
                </div>
              </div>

              {/* Resend Code */}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0}
                  className="text-xs sm:text-sm font-semibold text-[#5B4CF0] hover:text-[#4F46E5] disabled:text-[#94A3B8] disabled:cursor-not-allowed transition-colors"
                >
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Verification Code'}
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-[46px] mt-2 relative group flex items-center justify-center bg-gradient-to-r from-[#5B4CF0] to-[#7C3AED] hover:from-[#4F46E5] hover:to-[#6D28D9] text-white rounded-[14px] font-semibold text-sm shadow-md hover:shadow-lg shadow-[#5B4CF0]/25 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Verify Account</span>
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <Link to="/login" className="text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors">
                  Back to Login
                </Link>
              </div>
            </form>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
