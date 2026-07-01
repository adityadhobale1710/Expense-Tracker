import asyncHandler from 'express-async-handler';
import Session from '../models/Session.js';
import SecurityLog from '../models/SecurityLog.js';
import { sendSuccess } from '../utils/apiResponse.js';

// @desc    Get active device sessions
// @route   GET /api/sessions
export const getSessions = asyncHandler(async (req, res) => {
  const sessions = await Session.find({ user: req.user._id, isActive: true }).sort({ lastActive: -1 });
  sendSuccess(res, 200, 'Sessions retrieved successfully', sessions);
});

// @desc    Revoke session and force log out
// @route   DELETE /api/sessions/:id
export const revokeSession = asyncHandler(async (req, res) => {
  const session = await Session.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { isActive: false },
    { new: true }
  );

  if (!session) {
    res.status(404);
    throw new Error('Session not found');
  }

  // File security log
  await SecurityLog.create({
    user: req.user._id,
    action: 'Session Revoke',
    ipAddress: req.ip || '127.0.0.1',
    details: `Revoked session on browser ${session.browser} / OS ${session.os}`,
  });

  sendSuccess(res, 200, 'Session revoked successfully');
});
