import asyncHandler from 'express-async-handler';
import Family from '../models/Family.js';
import Expense from '../models/Expense.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { sendEmail, getHtmlTemplate } from '../utils/sendEmail.js';

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

  let family = await Family.findOne({ owner: req.user._id });
  if (!family) {
    family = await Family.create({
      owner: req.user._id,
      name: `${req.user.name}'s Family Hub`,
      members: [{ email: req.user.email, role: 'owner', status: 'accepted' }],
    });
  }

  // Check if already invited
  const exists = family.members.some((m) => m.email.toLowerCase() === email.toLowerCase());
  if (exists) {
    res.status(400);
    throw new Error('Member already invited or in family');
  }

  family.members.push({
    email: email.toLowerCase(),
    role: role || 'member',
    status: 'pending',
  });

  await family.save();

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const inviteHtml = getHtmlTemplate({
    title: 'Family Hub Invitation',
    greeting: 'Hello!',
    body: `You have been invited by **${req.user.name}** (${req.user.email}) to join their Family Sharing Hub on My Expense Pro as a **${role || 'member'}**.`,
    ctaText: 'Accept Invitation & Go to Dashboard',
    ctaUrl: `${clientUrl}/dashboard`,
    footerText: 'If you do not have an account, please sign up using this email address to see your pending invitations.',
  });

  // Run async non-blocking so response is not delayed
  sendEmail({
    to: email.toLowerCase(),
    subject: `Invitation to join ${req.user.name}'s Family Hub - My Expense Pro`,
    html: inviteHtml,
    text: `Hello!\n\nYou have been invited by ${req.user.name} (${req.user.email}) to join their Family Sharing Hub on My Expense Pro as a ${role || 'member'}.\n\nGo to My Expense Pro to accept your invitation: ${clientUrl}/dashboard`,
  }).catch(err => console.error('Family invite email failed:', err));

  sendSuccess(res, 200, 'Invitation sent successfully', family);
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
