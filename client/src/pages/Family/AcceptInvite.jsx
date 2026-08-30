import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import axios from 'axios';
import { API_URL } from '../../services/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Users, CheckCircle, XCircle, LogIn, Home, User, ShieldCheck, Mail, Calendar, UserPlus } from 'lucide-react';

/**
 * AcceptInvite — Public page that handles family hub invitation acceptance.
 *
 * Flow:
 *   1. Extract token from URL param.
 *   2. Fetch invitation preview via GET /api/family/invite/:token (public, no auth needed).
 *   3. If user is not logged in: show login/register prompt.
 *   4. If user is logged in: offer one-click acceptance via POST /api/family/invite/accept.
 *   5. Verify that the logged-in user's email matches the invitation email.
 */
export default function AcceptInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [invitation, setInvitation] = useState(null);   // invitation preview data
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [inviteError, setInviteError] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  // ── Step 1: Fetch invitation preview ─────────────────────────────────────────
  useEffect(() => {
    if (!token) {
      setInviteError('Invalid invitation link.');
      setLoadingInvite(false);
      return;
    }

    const fetchInvite = async () => {
      try {
        // Use raw axios — this is a public endpoint; no Bearer token required
        const res = await axios.get(`${API_URL}/family/invite/${token}`, {
          withCredentials: true,
        });
        setInvitation(res.data?.data);
      } catch (err) {
        setInviteError(
          err.response?.data?.message ||
          'This invitation link is invalid or has expired. Please ask the owner to resend it.'
        );
      } finally {
        setLoadingInvite(false);
      }
    };

    fetchInvite();
  }, [token]);

  // ── Step 2: Accept invitation ─────────────────────────────────────────────────
  const handleAccept = async () => {
    if (!user) return;
    setAccepting(true);
    try {
      await api.post('/family/invite/accept', { token });
      setAccepted(true);
      toast.success('Welcome to the family hub! 🎉');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept invitation. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  // ── Render: loading ───────────────────────────────────────────────────────────
  if (loadingInvite) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#F8FAFF] via-[#F4F6FD] to-[#EDF2FE] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Render: invalid / expired invitation ──────────────────────────────────────
  if (inviteError) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#F8FAFF] via-[#F4F6FD] to-[#EDF2FE] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
        {/* Background decorative atmosphere */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-[#E0E7FF]/50 rounded-full blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg bg-white rounded-[28px] md:rounded-[32px] shadow-[0_20px_50px_rgba(79,70,229,0.06),0_2px_10px_rgba(0,0,0,0.03)] border border-[#E2E8F0] p-8 md:p-10 text-center relative z-10"
        >
          <div className="w-16 h-16 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center mx-auto mb-5 text-red-500">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-[#0F172A] mb-2">Invitation Unavailable</h1>
          <p className="text-sm sm:text-base text-[#64748B] mb-8 leading-relaxed">{inviteError}</p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-sm sm:text-base font-semibold px-7 py-3.5 rounded-xl md:rounded-2xl shadow-md shadow-indigo-500/20 transition-all duration-200"
          >
            <LogIn className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Go to Login</span>
          </Link>
        </motion.div>
      </div>
    );
  }

  // ── Render: accepted ──────────────────────────────────────────────────────────
  if (accepted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#F8FAFF] via-[#F4F6FD] to-[#EDF2FE] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
        {/* Background decorative atmosphere */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-[#E0E7FF]/50 rounded-full blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg bg-white rounded-[28px] md:rounded-[32px] shadow-[0_20px_50px_rgba(79,70,229,0.06),0_2px_10px_rgba(0,0,0,0.03)] border border-[#E2E8F0] p-8 md:p-10 text-center relative z-10"
        >
          <div className="w-16 h-16 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-5 text-emerald-500">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A] mb-2">You're In! 🎉</h1>
          <p className="text-sm sm:text-base text-[#64748B] mb-8 leading-relaxed">
            You have joined <strong className="text-[#0F172A]">{invitation?.familyName}</strong> as a{' '}
            <strong className="capitalize text-[#6366F1]">{invitation?.role}</strong>.
          </p>
          <button
            onClick={() => navigate('/family')}
            className="inline-flex items-center justify-center gap-2 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-sm sm:text-base font-semibold px-7 py-3.5 rounded-xl md:rounded-2xl shadow-md shadow-indigo-500/20 transition-all duration-200"
          >
            <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Go to Family Hub</span>
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Render: invitation preview ────────────────────────────────────────────────
  const emailMismatch =
    user && invitation && user.email.toLowerCase() !== invitation.invitedEmail.toLowerCase();

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-[#F8FAFF] via-[#F4F6FD] to-[#EDF2FE] flex items-center justify-center p-4 sm:p-6 md:p-10 font-sans">
      {/* Background decorative atmosphere */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Soft top radial glow */}
        <div className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[850px] h-[550px] bg-gradient-to-b from-[#E0E7FF]/70 via-[#EEF2FF]/40 to-transparent rounded-full blur-3xl opacity-70" />

        {/* Soft dotted pattern overlay */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dot-pattern" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.5" fill="#4F46E5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dot-pattern)" />
        </svg>

        {/* Subtle decorative bottom wave */}
        <svg
          className="absolute bottom-0 left-0 right-0 w-full h-40 md:h-56 text-[#E0E7FF]/35"
          viewBox="0 0 1440 320"
          fill="currentColor"
          preserveAspectRatio="none"
        >
          <path d="M0,192L48,197.3C96,203,192,213,288,197.3C384,181,480,139,576,138.7C672,139,768,181,864,197.3C960,213,1056,203,1152,181.3C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
        </svg>
      </div>

      {/* Main Centered Invitation Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[780px] bg-white rounded-[28px] sm:rounded-[36px] shadow-[0_20px_50px_rgba(79,70,229,0.06),0_2px_10px_rgba(0,0,0,0.03)] border border-[#E2E8F0] p-6 sm:p-10 md:p-12 relative z-10"
      >
        {/* Header / Invitation Icon */}
        <div className="text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#EEF2FF] border border-[#E0E7FF] rounded-2xl sm:rounded-[24px] flex items-center justify-center mx-auto mb-4 sm:mb-5 shadow-sm text-[#6366F1]">
            <Users className="w-8 h-8 sm:w-10 sm:h-10 text-[#6366F1]" />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-[34px] font-bold text-[#0F172A] tracking-tight">
            Family Hub Invitation
          </h1>
          <p className="text-[#64748B] text-sm sm:text-base md:text-[17px] mt-1.5 sm:mt-2">
            You have been invited to collaborate
          </p>
        </div>

        {/* Invitation Information Panel */}
        <div className="mt-8 md:mt-10 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl md:rounded-[24px] p-5 sm:p-7 md:p-8 space-y-4">
          <DetailRow
            icon={<Home className="w-4 h-4 text-[#6366F1]" />}
            label="Family"
            value={invitation?.familyName || 'Family Hub'}
            isLast={false}
          />
          <DetailRow
            icon={<User className="w-4 h-4 text-[#6366F1]" />}
            label="Invited by"
            value={`${invitation?.ownerName || 'Family Owner'}${invitation?.ownerEmail ? ` (${invitation?.ownerEmail})` : ''}`}
            isLast={false}
          />
          <DetailRow
            icon={<ShieldCheck className="w-4 h-4 text-[#6366F1]" />}
            label="Your role"
            value={
              <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs sm:text-sm font-semibold bg-[#EEF2FF] text-[#6366F1] border border-[#E0E7FF] capitalize">
                {invitation?.role || 'Member'}
              </span>
            }
            isLast={false}
          />
          <DetailRow
            icon={<Mail className="w-4 h-4 text-[#6366F1]" />}
            label="Sent to"
            value={invitation?.invitedEmail || '—'}
            isLast={false}
          />
          <DetailRow
            icon={<Calendar className="w-4 h-4 text-[#6366F1]" />}
            label="Expires"
            value={
              invitation?.expiresAt
                ? new Date(invitation.expiresAt).toLocaleString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '—'
            }
            isLast={true}
          />
        </div>

        {/* Email mismatch warning */}
        {emailMismatch && (
          <div className="mt-6 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl md:rounded-2xl p-4 sm:p-5 text-xs sm:text-sm text-[#92400E] flex items-start gap-3">
            <XCircle className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold text-[#78350F]">Account mismatch:</strong> You are logged in as{' '}
              <strong className="text-[#78350F]">{user.email}</strong>, but this invitation was sent to{' '}
              <strong className="text-[#78350F]">{invitation?.invitedEmail}</strong>. Please switch accounts to accept this invitation.
            </div>
          </div>
        )}

        {/* Acceptance Message & Action Buttons */}
        {!user && (
          <div className="mt-6 sm:mt-8 space-y-5">
            <p className="text-center text-sm sm:text-base text-[#475569]">
              Sign in or create an account using{' '}
              <strong className="text-[#0F172A] font-semibold break-all">{invitation?.invitedEmail}</strong>{' '}
              to accept this invitation.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Link
                to="/login"
                state={{ from: `/family/invite/${token}`, invitedEmail: invitation?.invitedEmail }}
                className="flex items-center justify-center gap-2.5 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-sm sm:text-base font-semibold py-3.5 px-6 rounded-xl md:rounded-2xl shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all duration-200"
              >
                <LogIn className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Log In</span>
              </Link>
              <Link
                to="/register"
                state={{ from: `/family/invite/${token}`, invitedEmail: invitation?.invitedEmail }}
                className="flex items-center justify-center gap-2.5 bg-white border-2 border-[#6366F1] text-[#6366F1] hover:bg-[#EEF2FF]/60 text-sm sm:text-base font-semibold py-3.5 px-6 rounded-xl md:rounded-2xl transition-all duration-200"
              >
                <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Register</span>
              </Link>
            </div>
          </div>
        )}

        {/* Logged in — correct email */}
        {user && !emailMismatch && (
          <div className="mt-6 sm:mt-8 space-y-4">
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="w-full flex items-center justify-center gap-2.5 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-sm sm:text-base font-bold py-3.5 md:py-4 px-6 rounded-xl md:rounded-2xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/35 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {accepting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>Accept Invitation</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Logged in — wrong email: offer to switch account */}
        {user && emailMismatch && (
          <div className="mt-4">
            <Link
              to="/login"
              state={{ from: `/family/invite/${token}`, invitedEmail: invitation?.invitedEmail }}
              className="w-full flex items-center justify-center gap-2 bg-white border-2 border-[#6366F1] text-[#6366F1] hover:bg-[#EEF2FF] text-sm sm:text-base font-semibold py-3.5 rounded-xl md:rounded-2xl transition"
            >
              <LogIn className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Switch Account</span>
            </Link>
          </div>
        )}

        {/* Footer Disclaimer */}
        <p className="text-xs sm:text-[13px] text-center text-[#94A3B8] mt-6 md:mt-8 leading-relaxed">
          By accepting, you agree to share your expense activity within this family hub.
        </p>
      </motion.div>
    </div>
  );
}

function DetailRow({ icon, label, value, isLast }) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-4 ${
        !isLast ? 'border-b border-[#E2E8F0]/70 pb-3.5' : ''
      }`}
    >
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-[#EEF2FF] flex items-center justify-center shrink-0">
          {icon}
        </div>
        <span className="text-xs sm:text-sm font-medium text-[#64748B]">{label}</span>
      </div>
      <div className="text-xs sm:text-sm md:text-base font-medium text-[#0F172A] sm:text-right break-words pl-9.5 sm:pl-0">
        {value}
      </div>
    </div>
  );
}
