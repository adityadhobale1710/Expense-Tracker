import asyncHandler from 'express-async-handler';
import SplitExpense from '../models/SplitExpense.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { sendEmail, getHtmlTemplate } from '../utils/sendEmail.js';
import { env } from '../config/env.js';

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
      const clientUrl = env.CLIENT_URLS[0] || 'http://localhost:5173';
      const emailHtml = getHtmlTemplate({
        title: 'New Split Bill Notification',
        greeting: `Hello,`,
        body: `**${creatorName}** has shared a bill with you for **"${title}"**${groupName ? ` in group **"${groupName}"**` : ''}.<br/><br/>` +
              `Total Bill Amount: <strong>${currency} ${amount}</strong><br/>` +
              `Your Share: <strong>${currency} ${m.share}</strong>`,
        ctaText: 'View Split Bills',
        ctaUrl: `${clientUrl}/dashboard`,
        footerText: 'Log in to My Expense Pro to manage and settle your active split bills.',
      });

      sendEmail({
        to: m.userEmail.toLowerCase(),
        subject: `New Split Bill: "${title}" by ${creatorName} - My Expense Pro`,
        html: emailHtml,
        text: `Hello!\n\n${creatorName} shared a split bill with you.\n\nBill: "${title}"\nTotal Amount: ${currency} ${amount}\nYour Share: ${currency} ${m.share}\n\nView and settle your split bills on My Expense Pro: ${clientUrl}/dashboard`,
      }).catch((err) => console.error(`Split bill email notify failed for ${m.userEmail}:`, err));
    });
  }

  sendSuccess(res, 201, 'Split bill created', split);
});

// @desc    Settle a member's share
// @route   POST /api/splits/:id/settle
export const settleMember = asyncHandler(async (req, res) => {
  const { memberEmail } = req.body;
  const split = await SplitExpense.findById(req.params.id);

  if (!split) {
    res.status(404);
    throw new Error('Split bill not found');
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
  const split = await SplitExpense.findByIdAndUpdate(
    req.params.id,
    { title, amount, groupName, members, status },
    { new: true, runValidators: true }
  );
  if (!split) {
    res.status(404);
    throw new Error('Split bill not found');
  }
  sendSuccess(res, 200, 'Split updated', split);
});
