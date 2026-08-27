import { sendEmail, getHtmlTemplate } from '../utils/sendEmail.js';
import logger from '../utils/logger.js';
import asyncHandler from 'express-async-handler';

/**
 * @desc    Test Gmail email integration
 * @route   POST /api/email/test
 * @access  Private
 */
export const testEmail = asyncHandler(async (req, res) => {
  const { to } = req.body;

  if (!to) {
    res.status(400);
    throw new Error('Please provide a recipient email address');
  }

  try {
    const emailHtml = getHtmlTemplate({
      title: 'Gmail API Integration Test',
      greeting: 'Hello from Expense Tracker!',
      body: 'This is a manual test email sent via your existing sendEmail.js utility to verify the Gmail API integration.',
      footerText: 'If you did not request this, you can ignore it.',
    });

    const result = await sendEmail({
      to,
      subject: 'Gmail API Integration Test',
      text: 'This is a manual test email sent via Gmail API integration.',
      html: emailHtml,
    });

    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Test email sent successfully',
        mocked: result.mocked,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send test email',
        error: result.error,
      });
    }
  } catch (error) {
    logger.error(`Email test failed: ${error.message}`);
    res.status(500);
    throw new Error(`Email test failed: ${error.message}`);
  }
});
