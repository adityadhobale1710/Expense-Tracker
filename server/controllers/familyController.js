import asyncHandler from 'express-async-handler';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import Family from '../models/Family.js';
import Expense from '../models/Expense.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { sendEmail, getHtmlTemplate, escapeHtml } from '../utils/sendEmail.js';
import logger from '../utils/logger.js';

// Resend cooldown in ms (5 minutes) — prevents invitation email spam
const INVITE_RESEND_COOLDOWN_MS = 5 * 60 * 1000;
// Invitation token expiry duration (48 hours)
const INVITE_TOKEN_EXPIRY_MS = 48 * 60 * 60 * 1000;

// @desc    Get family hub for current user
// @route   GET /api/family
export const getFamily = asyncHandler(async (req, res) => {
  let family = await Family.findOne({
    $or: [{ owner: req.user._id }, { 'members.email': req.user.email }],
  }).populate('owner', 'name email');

  if (!family) {
    // Auto-create a default family if none exists for this owner
    family = await Family.create({
      owner: req.user._id,
      name: `${req.user.name}'s Family Hub`,
      members: [{ email: req.user.email, role: 'owner', status: 'accepted' }],
      approvals: [],
    });
    family = await Family.findById(family._id).populate('owner', 'name email');
  }

  sendSuccess(res, 200, 'Family hub retrieved', family);
});

// @desc    Invite member to family
// @route   POST /api/family/invite
export const inviteMember = asyncHandler(async (req, res) => {
  const { email, role } = req.body;
  if (!email) {
    res.status(400);
    throw new Error('Email is required');
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Owner cannot invite themselves
  if (normalizedEmail === req.user.email.toLowerCase()) {
    res.status(400);
    throw new Error('You cannot invite yourself to your own family hub');
  }

  let family = await Family.findOne({ owner: req.user._id });
  if (!family) {
    family = await Family.create({
      owner: req.user._id,
      name: `${req.user.name}'s Family Hub`,
      members: [{ email: req.user.email, role: 'owner', status: 'accepted' }],
    });
  }

  const existingMember = family.members.find(
    (m) => m.email.toLowerCase() === normalizedEmail
  );

  if (existingMember) {
    if (existingMember.status === 'accepted') {
      res.status(400);
      throw new Error('This person is already a member of your family hub');
    }

    // Pending invitation already exists — enforce resend cooldown
    if (
      existingMember.invitedAt &&
      Date.now() - new Date(existingMember.invitedAt).getTime() < INVITE_RESEND_COOLDOWN_MS
    ) {
      const waitSec = Math.ceil(
        (INVITE_RESEND_COOLDOWN_MS - (Date.now() - new Date(existingMember.invitedAt).getTime())) / 1000
      );
      res.status(429);
      throw new Error(`An invitation was recently sent to this address. Please wait ${waitSec} seconds before resending.`);
    }

    // Resend: generate a fresh token and overwrite the stale one
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(rawToken, 10);
    const expiry = new Date(Date.now() + INVITE_TOKEN_EXPIRY_MS);

    existingMember.invitationTokenHash = tokenHash;
    existingMember.invitationTokenExpire = expiry;
    existingMember.invitedAt = new Date();
    existingMember.role = role || existingMember.role;

    await family.save();

    const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim().replace(/\/$/, '');
    const acceptUrl = `${clientUrl}/family/invite/${rawToken}`;
    const roleLabel = existingMember.role === 'admin' ? 'Administrator' : 'Member';

    const inviteHtml = getHtmlTemplate({
      title: `Invitation to join ${escapeHtml(req.user.name)}'s Family Hub`,
      greeting: `Hello!`,
      body: `**${escapeHtml(req.user.name)}** (${escapeHtml(req.user.email)}) has re-sent your invitation to join their **Family Sharing Hub** on Expense Tracker as a **${roleLabel}**.\n\nAs a ${roleLabel} you can collaborate on shared expenses, track contributions, and request approval for large purchases.\n\nThis invitation expires in **48 hours**.`,
      ctaText: 'Accept Invitation',
      ctaUrl: acceptUrl,
      footerText: `If you do not have an account yet, please register using the email address this invitation was sent to (${normalizedEmail}). If you did not expect this invitation, you can safely ignore this email.`,
    });

    const emailResult = await sendEmail({
      to: normalizedEmail,
      subject: `Invitation to join ${req.user.name}'s Family Hub`,
      html: inviteHtml,
      text: `Hello!\n\n${req.user.name} (${req.user.email}) has re-sent your invitation to join their Family Sharing Hub on Expense Tracker as a ${roleLabel}.\n\nAccept your invitation here (link expires in 48 hours):\n${acceptUrl}\n\nIf you do not have an Expense Tracker account, please register using ${normalizedEmail}.\n\nIf you did not expect this invitation, please ignore this email.`,
    });

    if (!emailResult.success && !emailResult.mocked) {
      // Roll back the token so the stale one isn't persisted without delivery
      existingMember.invitationTokenHash = null;
      existingMember.invitationTokenExpire = null;
      existingMember.invitedAt = null;
      await family.save();
      logger.error(`[inviteMember] Gmail delivery failed for resend to ${normalizedEmail}`);
      res.status(502);
      throw new Error('Failed to send invitation email. Please try again later.');
    }

    return sendSuccess(res, 200, 'Invitation resent successfully', family);
  }

  // ── New invitation ────────────────────────────────────────────────────────────
  // Generate a cryptographically secure 32-byte random token.
  // Only the bcrypt hash is stored in MongoDB; the raw token goes only into the email URL.
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = await bcrypt.hash(rawToken, 10);
  const expiry = new Date(Date.now() + INVITE_TOKEN_EXPIRY_MS);

  family.members.push({
    email: normalizedEmail,
    role: role || 'member',
    status: 'pending',
    invitationTokenHash: tokenHash,
    invitationTokenExpire: expiry,
    invitedAt: new Date(),
  });

  await family.save();

  const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim().replace(/\/$/, '');
  const acceptUrl = `${clientUrl}/family/invite/${rawToken}`;
  const roleLabel = (role || 'member') === 'admin' ? 'Administrator' : 'Member';

  const inviteHtml = getHtmlTemplate({
    title: `Invitation to join ${escapeHtml(req.user.name)}'s Family Hub`,
    greeting: `Hello!`,
    body: `**${escapeHtml(req.user.name)}** (${escapeHtml(req.user.email)}) has invited you to join their **Family Sharing Hub** on Expense Tracker as a **${roleLabel}**.\n\nAs a ${roleLabel} you can collaborate on shared expenses, track contributions, and request approval for large purchases.\n\nThis invitation expires in **48 hours**.`,
    ctaText: 'Accept Invitation',
    ctaUrl: acceptUrl,
    footerText: `If you do not have an account yet, please register using the email address this invitation was sent to (${normalizedEmail}). If you did not expect this invitation, you can safely ignore this email.`,
  });

  // Await the email send — do NOT use fire-and-forget.
  // If Gmail API fails the member record is rolled back and the caller receives a 502.
  const emailResult = await sendEmail({
    to: normalizedEmail,
    subject: `Invitation to join ${req.user.name}'s Family Hub`,
    html: inviteHtml,
    text: `Hello!\n\n${req.user.name} (${req.user.email}) has invited you to join their Family Sharing Hub on Expense Tracker as a ${roleLabel}.\n\nAccept your invitation here (link expires in 48 hours):\n${acceptUrl}\n\nIf you do not have an Expense Tracker account, please register using ${normalizedEmail}.\n\nIf you did not expect this invitation, please ignore this email.`,
  });

  if (!emailResult.success && !emailResult.mocked) {
    // Remove the member record we just added so we don't leave a dangling pending entry
    family.members = family.members.filter(
      (m) => m.email.toLowerCase() !== normalizedEmail
    );
    await family.save();
    logger.error(`[inviteMember] Gmail delivery failed for invite to ${normalizedEmail}`);
    res.status(502);
    throw new Error('Failed to send invitation email. Please try again later.');
  }

  sendSuccess(res, 200, 'Invitation sent successfully', family);
});

// @desc    Look up a pending invitation by token (public — used by AcceptInvite page)
// @route   GET /api/family/invite/:token
export const getInvitation = asyncHandler(async (req, res) => {
  const { token } = req.params;
  if (!token || token.length !== 64) {
    res.status(400);
    throw new Error('Invalid invitation link');
  }

  // Find all families that have at least one pending member with a non-expired token
  const families = await Family.find({
    'members.status': 'pending',
    'members.invitationTokenExpire': { $gt: new Date() },
  }).populate('owner', 'name email');

  let matchedFamily = null;
  let matchedMember = null;

  for (const fam of families) {
    for (const member of fam.members) {
      if (
        member.status === 'pending' &&
        member.invitationTokenHash &&
        member.invitationTokenExpire > new Date()
      ) {
        // eslint-disable-next-line no-await-in-loop
        const isMatch = await bcrypt.compare(token, member.invitationTokenHash);
        if (isMatch) {
          matchedFamily = fam;
          matchedMember = member;
          break;
        }
      }
    }
    if (matchedFamily) break;
  }

  if (!matchedFamily || !matchedMember) {
    res.status(404);
    throw new Error('Invitation not found or has expired. Please ask the owner to resend it.');
  }

  // Return only what the frontend needs — never expose the token hash
  sendSuccess(res, 200, 'Invitation found', {
    invitedEmail: matchedMember.email,
    role: matchedMember.role,
    familyName: matchedFamily.name,
    ownerName: matchedFamily.owner?.name || 'Unknown',
    ownerEmail: matchedFamily.owner?.email || '',
    expiresAt: matchedMember.invitationTokenExpire,
  });
});

// @desc    Accept an invitation (authenticated — must be logged in as the invited email)
// @route   POST /api/family/invite/accept
export const acceptInvitation = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token || token.length !== 64) {
    res.status(400);
    throw new Error('Invalid invitation token');
  }

  // Find all families with a matching pending member
  const families = await Family.find({
    'members.status': 'pending',
    'members.invitationTokenExpire': { $gt: new Date() },
  });

  let matchedFamily = null;
  let matchedMember = null;

  for (const fam of families) {
    for (const member of fam.members) {
      if (
        member.status === 'pending' &&
        member.invitationTokenHash &&
        member.invitationTokenExpire > new Date()
      ) {
        // eslint-disable-next-line no-await-in-loop
        const isMatch = await bcrypt.compare(token, member.invitationTokenHash);
        if (isMatch) {
          matchedFamily = fam;
          matchedMember = member;
          break;
        }
      }
    }
    if (matchedFamily) break;
  }

  if (!matchedFamily || !matchedMember) {
    res.status(404);
    throw new Error('Invitation not found or has expired. Please ask the owner to resend it.');
  }

  // Security: the logged-in user's email MUST match the invitation email
  if (req.user.email.toLowerCase() !== matchedMember.email.toLowerCase()) {
    res.status(403);
    throw new Error(
      `This invitation was sent to ${matchedMember.email}. Please log in with that account to accept it.`
    );
  }

  // Accept the invitation
  matchedMember.status = 'accepted';
  matchedMember.invitationTokenHash = null;
  matchedMember.invitationTokenExpire = null;
  matchedMember.invitedAt = null;
  await matchedFamily.save();

  sendSuccess(res, 200, 'Invitation accepted successfully. Welcome to the family hub!', {
    familyId: matchedFamily._id,
    familyName: matchedFamily.name,
    role: matchedMember.role,
  });
});

// @desc    Request expense approval
// @route   POST /api/family/approval-request
export const createApprovalRequest = asyncHandler(async (req, res) => {
  const { title, amount, category } = req.body;

  let family = await Family.findOne({ 'members.email': req.user.email });
  if (!family) {
    res.status(400);
    throw new Error('You must belong to a family hub to request approvals');
  }

  family.approvals.push({
    title,
    amount,
    category: category || 'Other',
    requesterEmail: req.user.email,
    status: 'pending',
  });

  await family.save();
  sendSuccess(res, 201, 'Approval request filed', family);
});

// @desc    Approve a request
// @route   POST /api/family/approve/:id
export const approveRequest = asyncHandler(async (req, res) => {
  const family = await Family.findOne({
    $or: [{ owner: req.user._id }, { 'members.email': req.user.email, 'members.role': 'admin' }],
  });

  if (!family) {
    res.status(403);
    throw new Error('Unauthorized or not an admin/owner of family');
  }

  const reqObj = family.approvals.id(req.params.id);
  if (!reqObj) {
    res.status(404);
    throw new Error('Approval request not found');
  }

  reqObj.status = 'approved';
  await family.save();

  // Create real expense for the requesting user or shared pool if needed
  // (In a real system, you'd map this, here we flag it and optionally create an expense)
  
  sendSuccess(res, 200, 'Request approved', family);
});

// @desc    Reject a request
// @route   POST /api/family/reject/:id
export const rejectRequest = asyncHandler(async (req, res) => {
  const family = await Family.findOne({
    $or: [{ owner: req.user._id }, { 'members.email': req.user.email, 'members.role': 'admin' }],
  });

  if (!family) {
    res.status(403);
    throw new Error('Unauthorized or not an admin/owner of family');
  }

  const reqObj = family.approvals.id(req.params.id);
  if (!reqObj) {
    res.status(404);
    throw new Error('Approval request not found');
  }

  reqObj.status = 'rejected';
  await family.save();

  sendSuccess(res, 200, 'Request rejected', family);
});
