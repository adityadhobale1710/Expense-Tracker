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
  // Populating creator to send notification emails
  const split = await SplitExpense.findById(req.params.id).populate('creator', 'name email');

  if (!split) {
    res.status(404);
    throw new Error('Split bill not found');
  }

  // Authorization: only the creator OR the member themselves can settle a share
  const isCreator = split.creator._id.toString() === req.user._id.toString();
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

  const wasAlreadySettled = member.paid;
  member.paid = true;
  member.status = 'settled';

  // Check if all members are paid
  const allSettled = split.members.every((m) => m.paid);
  if (allSettled) {
    split.status = 'settled';
  }

  await split.save();

  // Send email notifications if this was actually a new settlement
  if (!wasAlreadySettled) {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const currency = req.user.currency || 'INR';
    const groupText = split.groupName ? ` in group **"${escapeHtml(split.groupName)}"**` : '';

    // 1. Partial settlement: notify creator (unless creator is the one doing the settling)
    if (!isCreator) {
      const partialHtml = getHtmlTemplate({
        title: 'Split Bill Share Settled',
        greeting: `Hello ${escapeHtml(split.creator.name)},`,
        body: `**${escapeHtml(memberEmail)}** has settled their share of **${escapeHtml(currency)} ${escapeHtml(member.share.toString())}** for **"${escapeHtml(split.title)}"**${groupText}.`,
        ctaText: 'View Split Bills',
        ctaUrl: `${clientUrl}/dashboard`,
        footerText: 'Log in to your workspace dashboard to manage and settle your active shared bills.',
      });

      sendEmail({
        to: split.creator.email.toLowerCase(),
        subject: `Share Settled: "${split.title}"`,
        html: partialHtml,
        text: `Hello ${split.creator.name},\n\n${memberEmail} has settled their share of ${currency} ${member.share} for "${split.title}".\n\nView and settle your active shared bills here: ${clientUrl}/dashboard`,
      }).catch((err) => console.error(`Split bill settle email to creator failed:`, err));
    }

    // 2. Full settlement: notify creator and all members
    if (allSettled) {
      const fullHtml = getHtmlTemplate({
        title: 'Split Bill Fully Settled',
        greeting: `Hello!`,
        body: `The split bill for **"${escapeHtml(split.title)}"**${groupText} has been fully settled by all members.<br/><br/>Total Bill Amount: **${escapeHtml(currency)} ${escapeHtml(split.amount.toString())}**`,
        ctaText: 'View Split Bills',
        ctaUrl: `${clientUrl}/dashboard`,
        footerText: 'Log in to your workspace dashboard to manage your shared bills.',
      });

      const fullText = `Hello!\n\nThe split bill for "${split.title}" has been fully settled by all members.\nTotal Amount: ${currency} ${split.amount}\n\nView here: ${clientUrl}/dashboard`;

      // Notify creator
      sendEmail({
        to: split.creator.email.toLowerCase(),
        subject: `Fully Settled: "${split.title}"`,
        html: fullHtml,
        text: fullText,
      }).catch((err) => console.error(`Split bill full-settle email to creator failed:`, err));

      // Notify all members
      split.members.forEach((m) => {
        sendEmail({
          to: m.userEmail.toLowerCase(),
          subject: `Fully Settled: "${split.title}"`,
          html: fullHtml,
          text: fullText,
        }).catch((err) => console.error(`Split bill full-settle email to member ${m.userEmail} failed:`, err));
      });
    }
  }

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
