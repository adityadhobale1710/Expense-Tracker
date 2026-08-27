import { sendEmail, getHtmlTemplate } from '../utils/sendEmail.js';
import logger from '../utils/logger.js';

/**
 * @desc    Test Resend email integration
 * @route   POST /api/email/test
 * @access  Public (Temporary for manual testing)
 */
export const testEmail = async (req, res) => {
  try {
    const { to } = req.body;

    if (!to) {
      return res.status(400).json({ 
        success: false, 
        message: 'Recipient email (to) is required' 
      });
    }

    const html = getHtmlTemplate({
      title: 'Resend Integration Test',
      greeting: 'Hello from Resend!',
      body: 'This is a manual test email sent via your existing sendEmail.js utility to verify Resend integration.',
      footerText: 'This is a temporary test endpoint.'
    });

    const result = await sendEmail({
      to,
      subject: 'Resend Integration Test',
      text: 'This is a manual test email sent via Resend integration.',
      html,
    });

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Test email processed successfully',
        data: result
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to send test email',
        error: result.error
      });
    }
  } catch (error) {
    logger.error(`Test email endpoint failed: ${error.message}`);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to process test email request' 
    });
  }
};
