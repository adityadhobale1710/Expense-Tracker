import asyncHandler from 'express-async-handler';
import SplitExpense from '../models/SplitExpense.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { sendEmail, getHtmlTemplate, escapeHtml } from '../utils/sendEmail.js';

// @desc    Get all split expenses for user
// @route   GET /api/splits
export const getSplits = asyncHandler(async (req, res) => {
  const userEmail = req.user.email;
  // Retrieve splits where user is the creator OR is a member
  const splits = await SplitExpense.find({
    $or: [{ creator: req.user._id }, { 'members.userEmail': userEmail }],
  }).populate('creator', 'name email');

  sendSuccess(res, 200, 'Splits retrieved successfully', splits);
});

// @desc    Create a split bill
// @route   POST /api/splits
export const createSplit = asyncHandler(async (req, res) => {
  const { title, amount, groupName, members } = req.body;
  // members: [{ userEmail, share, paid }]
  const split = await SplitExpense.create({
    creator: req.user._id,
    title,
    amount,
    groupName,
    members: members || [],
  });

  // Notify members via email in the background
  if (members && members.length > 0) {
    const creatorName = req.user.name;
    const currency = req.user.currency || 'INR';

    members.forEach((m) => {
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      const emailHtml = getHtmlTemplate({
        title: 'New Shared Bill',
        greeting: `Hello!`,
        body: `**${escapeHtml(creatorName)}** has shared a bill with you for **"${escapeHtml(title)}"**${groupName ? ` in group **"${escapeHtml(groupName)}"**` : ''}.<br/><br/>` +
              `Total Bill Amount: <strong>${escapeHtml(currency)} ${escapeHtml(amount.toString())}</strong><br/>` +
              `Your Share: <strong>${escapeHtml(currency)} ${escapeHtml(m.share.toString())}</strong>`,
        ctaText: 'View Split Bills',
        ctaUrl: `${clientUrl}/dashboard`,
        footerText: 'Log in to your workspace dashboard to manage and settle your active shared bills.',
      });

      sendEmail({
        to: m.userEmail.toLowerCase(),
        subject: `New Shared Bill: "${title}" by ${creatorName}`,
        html: emailHtml,
        text: `Hello!\n\n${creatorName} has shared a bill with you for "${title}".\n\nTotal Amount: ${currency} ${amount}\nYour Share: ${currency} ${m.share}\n\nView and settle your active shared bills here: ${clientUrl}/dashboard`,
      }).catch((err) => console.error(`Split bill email notify failed for ${m.userEmail}:`, err));
    });
  }

  sendSuccess(res, 201, 'Split bill created', split);
});

// @desc    Settle a member's share
// @route   POST /api/splits/:id/settle
export const settleMember = asyncHandler(async (req, res) => {
  const { memberEmail } = req.body;
  // Issue #3 fix: fetch with no filter first, then check ownership
  const split = await SplitExpense.findById(req.params.id);

  if (!split) {
    res.status(404);
    throw new Error('Split bill not found');
  }

  // Authorization: only the creator OR the member themselves can settle a share
  const isCreator = split.creator.toString() === req.user._id.toString();
  const isSelf    = req.user.email === memberEmail;
  if (!isCreator && !isSelf) {
    res.status(403);
    throw new Error('Not authorized to settle this member share');
  }

  const member = split.members.find((m) => m.userEmail === memberEmail);
  if (!member) {
    res.status(404);
    throw new Error('Member not found in split');
  }

  member.paid = true;
  member.status = 'settled';

  // Check if all members are paid
  const allSettled = split.members.every((m) => m.paid);
  if (allSettled) {
    split.status = 'settled';
  }

  await split.save();
  sendSuccess(res, 200, 'Member share settled successfully', split);
});

// @desc    Update split details
// @route   PUT /api/splits/:id
export const updateSplit = asyncHandler(async (req, res) => {
  const { title, amount, groupName, members, status } = req.body;
  // Issue #3 fix: only the creator can update a split (ownership filter)
  const split = await SplitExpense.findOneAndUpdate(
    { _id: req.params.id, creator: req.user._id },
    { title, amount, groupName, members, status },
    { new: true, runValidators: true }
  );
  if (!split) {
    res.status(404);
    throw new Error('Split bill not found or you are not the creator');
  }
  sendSuccess(res, 200, 'Split updated', split);
});

// @desc    Delete a split bill
// @route   DELETE /api/splits/:id
export const deleteSplit = asyncHandler(async (req, res) => {
  const split = await SplitExpense.findById(req.params.id);

  if (!split) {
    res.status(404);
    throw new Error('Split bill not found');
  }

  // Authorization: only the creator can delete it
  if (split.creator.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to delete this split bill');
  }

  // Check if status is settled
  if (split.status !== 'settled') {
    res.status(400);
    throw new Error('Only settled split bills can be deleted');
  }

  await split.deleteOne();
  sendSuccess(res, 200, 'Split bill deleted successfully');
});
