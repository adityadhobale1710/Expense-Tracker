import { Resend } from 'resend';
import logger from './logger.js';

// Configuration variables with fallback defaults
const LOGO_URL = process.env.LOGO_URL || 'https://raw.githubusercontent.com/adityadhobale1710/Expense-Tracker/main/client/public/logo.jpg';
const COMPANY_NAME = process.env.COMPANY_NAME || 'Expense Tracker';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@expensetracker.com';

/**
 * Generates a premium dark-themed, glassmorphic-styled HTML email template.
 */
export const getHtmlTemplate = ({ title, greeting, body, ctaText, ctaUrl, code, footerText }) => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
    
    body {
      margin: 0;
      padding: 0;
      width: 100% !important;
      background-color: #05070f;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #05070f; font-family: 'Plus Jakarta Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <!-- Preheader text (hidden preview text) -->
  <div style="display: none; max-height: 0px; overflow: hidden; font-size: 1px; line-height: 1px; color: #05070f;">
    ${title} - Action Required.
  </div>

  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #05070f; padding: 32px 0;">
    <tr>
      <td align="center">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; background-color: #0b0f19; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.55);">
          <!-- Header (Brand Logo Banner) -->
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 36px 24px;">
              <img src="${LOGO_URL}" alt="${COMPANY_NAME} Logo" border="0" width="130" style="display: block; outline: none; border: none; max-width: 130px; height: auto;" />
            </td>
          </tr>
          <!-- Content Body -->
          <tr>
            <td style="padding: 36px 28px;">
              ${greeting ? `<h2 style="margin: 0 0 14px 0; font-size: 18px; font-weight: 700; color: #ffffff; line-height: 1.35;">${greeting}</h2>` : ''}
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #94a3b8;">${body}</p>

              ${code ? `
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0;">
                  <tr>
                    <td align="center" style="background-color: #0f172a; border: 1px dashed rgba(99, 102, 241, 0.3); border-radius: 12px; padding: 22px 16px;">
                      <p style="margin: 0 0 10px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; font-weight: 700;">Verification Code</p>
                      <div style="font-family: 'Courier New', Courier, monospace; font-size: 30px; font-weight: 800; letter-spacing: 5px; color: #818cf8; line-height: 1.2;">${code}</div>
                    </td>
                  </tr>
                </table>
              ` : ''}

              ${ctaUrl && ctaText ? `
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0;">
                  <tr>
                    <td align="center">
                      <a href="${ctaUrl}" target="_blank" style="display: inline-block; background: linear-gradient(90deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; padding: 12px 28px; font-size: 14px; font-weight: 700; border-radius: 10px; box-shadow: 0 8px 16px rgba(79, 70, 229, 0.2); line-height: 1.2;">${ctaText}</a>
                    </td>
                  </tr>
                </table>
              ` : ''}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #070912; padding: 24px 28px; border-top: 1px solid rgba(255, 255, 255, 0.05); text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #64748b; line-height: 1.5;">${footerText || `You received this email because you are registered with ${COMPANY_NAME}.`}</p>
              <p style="margin: 10px 0 0 0; font-size: 11px; color: #64748b; line-height: 1.5;">
                &copy; ${new Date().getFullYear()} ${COMPANY_NAME}. All rights reserved.<br/>
                For support, contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color: #6366f1; text-decoration: none;">${SUPPORT_EMAIL}</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

/**
 * Sends an email using Resend HTTPS API or logs it to the terminal as a fallback.
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  const resendApiKey = process.env.RESEND_API_KEY;

  logger.info(`\n📧 Dispatching email to: ${to} (Subject: "${subject}")`);

  if (!resendApiKey) {
    logger.info('⚠️  [Resend Log Fallback] RESEND_API_KEY is not configured. Dumping email context below:');
    logger.info('──────────────────────────────────────────────────────────────────────');
    logger.info(`TO:      ${to}`);
    logger.info(`SUBJECT: ${subject}`);
    logger.info(`TEXT:    ${text}`);
    logger.info('──────────────────────────────────────────────────────────────────────\n');
    return { success: true, mocked: true };
  }

  try {
    const resend = new Resend(resendApiKey);

    // Overall deadline guard — guarantees sendEmail resolves well under the
    // client's 15s axios timeout even if resend stalls.
    const MAIL_DEADLINE_MS = 10000;
    
    const fromName = process.env.SMTP_FROM_NAME || 'My Expense Pro';
    // If SMTP_FROM is preserved from before, we use it. Otherwise use the onboarding sender.
    const fromEmail = process.env.SMTP_FROM || 'onboarding@resend.dev';
    
    const sendPromise = resend.emails.send({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      text,
      html,
    });

    const info = await Promise.race([
      sendPromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Resend API send timed out')), MAIL_DEADLINE_MS)
      ),
    ]);

    if (info.error) {
      throw new Error(info.error.message);
    }

    logger.info(`🚀 [Resend Success] Email dispatched successfully: ${info.data?.id}`);
    return { success: true, messageId: info.data?.id };
  } catch (error) {
    logger.error('❌ [Resend Error] Failed to deliver email via Resend: ' + error.message);
    logger.info('──────────────────────────────────────────────────────────────────────');
    logger.info('⚠️ Falling back to terminal dumping because Resend transport failed:');
    logger.info(`TO:      ${to}`);
    logger.info(`SUBJECT: ${subject}`);
    logger.info(`TEXT:    ${text}`);
    logger.info('──────────────────────────────────────────────────────────────────────\n');
    return { success: false, error: error.message };
  }
};
