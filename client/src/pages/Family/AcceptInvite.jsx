import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import axios from 'axios';
import { API_URL } from '../../services/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Users, CheckCircle, XCircle, LogIn } from 'lucide-react';

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
      <div className="min-h-screen bg-[#F3F4FE] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Render: invalid / expired invitation ──────────────────────────────────────
  if (inviteError) {
    return (
      <div className="min-h-screen bg-[#F3F4FE] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-[28px] shadow-xl border border-slate-200/60 p-8 text-center"
        >
          <XCircle className="w-14 h-14 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-extrabold text-[#1E293B] mb-2">Invitation Unavailable</h1>
          <p className="text-sm text-[#475569] mb-6">{inviteError}</p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:opacity-90 transition"
          >
            <LogIn className="w-4 h-4" />
            Go to Login
          </Link>
        </motion.div>
      </div>
    );
  }

  // ── Render: accepted ──────────────────────────────────────────────────────────
  if (accepted) {
    return (
      <div className="min-h-screen bg-[#F3F4FE] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white rounded-[28px] shadow-xl border border-slate-200/60 p-8 text-center"
        >
          <CheckCircle className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-xl font-extrabold text-[#1E293B] mb-2">You're In! 🎉</h1>
          <p className="text-sm text-[#475569] mb-6">
            You have joined <strong>{invitation?.familyName}</strong> as a{' '}
            <strong className="capitalize">{invitation?.role}</strong>.
          </p>
          <button
            onClick={() => navigate('/family')}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:opacity-90 transition"
          >
            <Users className="w-4 h-4" />
            Go to Family Hub
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Render: invitation preview ────────────────────────────────────────────────
  const emailMismatch =
    user && invitation && user.email.toLowerCase() !== invitation.invitedEmail.toLowerCase();

  return (
    <div className="min-h-screen bg-[#F3F4FE] text-[#475569] flex items-center justify-center p-4 font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[480px] bg-white rounded-[28px] sm:rounded-[32px] shadow-[0_20px_60px_rgba(79,70,229,0.07)] border border-slate-200/60 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">
            Family Hub Invitation
          </h1>
          <p className="text-indigo-200 text-xs mt-1">
            You have been invited to collaborate
          </p>
        </div>

        {/* Body */}
        <div className="p-8 space-y-5">
          {/* Invitation details */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 text-sm">
            <DetailRow label="Family" value={invitation?.familyName} />
            <DetailRow label="Invited by" value={`${invitation?.ownerName} (${invitation?.ownerEmail})`} />
            <DetailRow label="Your role" value={<span className="capitalize font-semibold text-indigo-600">{invitation?.role}</span>} />
            <DetailRow label="Sent to" value={invitation?.invitedEmail} />
            <DetailRow
              label="Expires"
              value={
                invitation?.expiresAt
                  ? new Date(invitation.expiresAt).toLocaleString()
                  : '—'
              }
            />
          </div>

          {/* Email mismatch warning */}
          {emailMismatch && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800">
              <strong>Account mismatch:</strong> You are logged in as{' '}
              <strong>{user.email}</strong>, but this invitation was sent to{' '}
              <strong>{invitation?.invitedEmail}</strong>. Please log out and sign in with the correct
              account to accept this invitation.
            </div>
          )}

          {/* Not logged in */}
          {!user && (
            <div className="space-y-3">
              <p className="text-sm text-center text-[#475569]">
                Sign in or create an account using{' '}
                <strong>{invitation?.invitedEmail}</strong> to accept this invitation.
              </p>
              <div className="flex gap-3">
                <Link
                  to="/login"
                  state={{ from: `/family/invite/${token}`, invitedEmail: invitation?.invitedEmail }}
                  className="flex-1 text-center bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:opacity-90 transition"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  state={{ from: `/family/invite/${token}`, invitedEmail: invitation?.invitedEmail }}
                  className="flex-1 text-center border border-indigo-300 text-indigo-600 text-sm font-semibold py-2.5 rounded-xl hover:bg-indigo-50 transition"
                >
                  Register
                </Link>
              </div>
            </div>
          )}

          {/* Logged in — correct email */}
          {user && !emailMismatch && (
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold py-3 rounded-xl hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {accepting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Accept Invitation
                </>
              )}
            </button>
          )}

          {/* Logged in — wrong email: offer to log out */}
          {user && emailMismatch && (
            <Link
              to="/login"
              state={{ from: `/family/invite/${token}`, invitedEmail: invitation?.invitedEmail }}
              className="block text-center border border-slate-300 text-[#475569] text-sm font-semibold py-2.5 rounded-xl hover:bg-slate-50 transition"
            >
              Switch Account
            </Link>
          )}

          <p className="text-[11px] text-center text-slate-400">
            By accepting, you agree to share your expense activity within this family hub.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-xs text-slate-500 shrink-0">{label}</span>
      <span className="text-xs font-medium text-[#1E293B] text-right">{value}</span>
    </div>
  );
}
