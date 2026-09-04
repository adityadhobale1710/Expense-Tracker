import nodemailer from 'nodemailer';
import logger from './logger.js';
import { sendViaGmail, isGmailConfigured } from './gmailService.js';

// Configuration variables with fallback defaults
const LOGO_URL = process.env.LOGO_URL || 'https://raw.githubusercontent.com/adityadhobale1710/Expense-Tracker/main/client/public/logo.jpg';
const COMPANY_NAME = process.env.COMPANY_NAME || 'Expense Tracker';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@expensetracker.com';

// ── SMTP Transporter Cache ───────────────────────────────────────────────────
let smtpTransporter = null;

/**
 * Returns true if SMTP credentials (user and password) are configured.
 */
export function isSmtpConfigured() {
  return !!(process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim());
}

/**
 * Creates or returns the cached Nodemailer SMTP transporter.
 */
function getSmtpTransporter() {
  if (!smtpTransporter) {
    const host = process.env.SMTP_HOST?.trim() || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT?.trim()) || 465;
    const isSecure = port === 465;

    smtpTransporter = nodemailer.createTransport({
      host,
      port,
      secure: isSecure,
      auth: {
        user: process.env.SMTP_USER?.trim(),
        pass: process.env.SMTP_PASS?.trim().replace(/\s+/g, ''), // Strip spaces in App Passwords
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }
  return smtpTransporter;
}

/**
 * Sends an email using Nodemailer via SMTP.
 */
export async function sendViaSmtp({ to, subject, html, text }) {
  const transporter = getSmtpTransporter();
  const fromAddress = process.env.SMTP_FROM?.trim() || process.env.SMTP_USER?.trim();
  const fromName = process.env.SMTP_FROM_NAME?.trim() || COMPANY_NAME;

  const info = await transporter.sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to,
    subject,
    html,
    text: text || undefined,
  });

  logger.info(`📧 [SMTP] Email delivered successfully. Message ID: ${info.messageId}`);
  return { success: true, messageId: info.messageId };
}

/**
 * Resolves and normalizes the frontend client base URL for email CTAs and navigation links.
 *
 * - In production (`NODE_ENV === 'production'`):
 *   - Fails clearly if CLIENT_URL is missing or empty.
 *   - Validates that the URL scheme is HTTPS.
 *   - Never falls back to localhost.
 * - In non-production (e.g. development):
 *   - Uses CLIENT_URL if provided, else falls back safely to 'http://localhost:5173'.
 * - Normalizes any trailing slashes and handles comma-separated lists (taking the primary origin).
 *
 * @returns {string} Normalized base URL (e.g. 'https://expense-tracker-five-virid-19.vercel.app' or 'http://localhost:5173')
 */
export const getClientBaseUrl = () => {
  const rawUrl = process.env.CLIENT_URL;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!rawUrl || !rawUrl.trim()) {
    if (isProduction) {
      throw new Error('CLIENT_URL environment variable is missing or empty in production environment');
    }
    return 'http://localhost:5173';
  }

  const primaryUrl = rawUrl.split(',')[0].trim().replace(/\/+$/, '');

  if (!primaryUrl) {
    if (isProduction) {
      throw new Error('CLIENT_URL environment variable is invalid in production environment');
    }
    return 'http://localhost:5173';
  }

  if (isProduction) {
    try {
      const parsedUrl = new URL(primaryUrl);
      if (parsedUrl.protocol !== 'https:') {
        throw new Error(`Insecure CLIENT_URL scheme (${parsedUrl.protocol}) detected in production. Production frontend must use HTTPS.`);
      }
    } catch (err) {
      if (err.message.includes('Insecure CLIENT_URL scheme')) {
        throw err;
      }
      throw new Error(`Malformed CLIENT_URL in production: "${primaryUrl}" (${err.message})`);
    }
  }

  return primaryUrl;
};

export const escapeHtml = (unsafe) => {
  if (typeof unsafe !== 'string') return unsafe;
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const processMarkdown = (text) => {
  if (!text) return text;
  return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
};

/**
 * Generates a premium dark-themed, glassmorphic-styled HTML email template.
 */
export const getHtmlTemplate = ({ title, greeting, body, ctaText, ctaUrl, code, footerText }) => {
  const safeGreeting = processMarkdown(greeting);
  const safeBody = processMarkdown(body);
  const safeFooterText = processMarkdown(footerText);
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
              ${safeGreeting ? `<h2 style="margin: 0 0 14px 0; font-size: 18px; font-weight: 700; color: #ffffff; line-height: 1.35;">${safeGreeting}</h2>` : ''}
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #94a3b8;">${safeBody}</p>

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
              <p style="margin: 0; font-size: 11px; color: #64748b; line-height: 1.5;">${safeFooterText || `You received this email because you are registered with ${COMPANY_NAME}.`}</p>
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
 * Sends an email using the configured transport.
 *
 * Supported transports:
 *   1. SMTP (Nodemailer) — when SMTP_USER and SMTP_PASS are set (e.g. Gmail App Password or SMTP provider).
 *   2. Gmail API (OAuth2) — when GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_SENDER_EMAIL are set.
 *
 * If both are configured, SMTP is prioritized with automatic failover to Gmail API if an error occurs.
 * If neither succeeds (or neither is configured), falls back to terminal logging.
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  logger.info(`\n📧 Dispatching email to: ${to} (Subject: "${subject}")`);

  let lastError = null;

  // ── Transport 1: SMTP / Gmail App Password ─────────────────────────────────
  if (isSmtpConfigured()) {
    try {
      const result = await sendViaSmtp({ to, subject, html, text });
      return result;
    } catch (smtpError) {
      lastError = smtpError;
      logger.error(`❌ [SMTP] Delivery failed: ${smtpError.message}`);
    }
  }

  // ── Transport 2: Gmail API (OAuth2) ─────────────────────────────────────────
  if (isGmailConfigured()) {
    try {
      const result = await sendViaGmail({ to, subject, html });
      return result;
    } catch (gmailError) {
      lastError = gmailError;
      logger.error(`❌ [Gmail API] Delivery failed: ${gmailError.message}`);
    }
  }

  if (!isSmtpConfigured() && !isGmailConfigured()) {
    logger.error('❌ [Email] No email delivery provider configured (neither SMTP nor Gmail API).');
    lastError = new Error('No email delivery provider configured');
  }

  let safeText = text;
  if (process.env.NODE_ENV === 'production' && safeText) {
    safeText = safeText.replace(/\b\d{6}\b/g, '******');
  }

  // ── Transport Fallback: Terminal log ────────────────────────────────────────
  logger.info('⚠️  [Log Fallback] No transport succeeded. Dumping email context below:');
  logger.info('──────────────────────────────────────────────────────────────────────');
  logger.info(`TO:      ${to}`);
  logger.info(`SUBJECT: ${subject}`);
  logger.info(`TEXT:    ${safeText}`);
  logger.info('──────────────────────────────────────────────────────────────────────\n');

  if (process.env.NODE_ENV === 'production') {
    // In production, a mocked/fallback send is indistinguishable from a hard failure
    // so callers execute their rollback logic and return 502 instead of false success.
    return {
      success: false,
      mocked: false,
      deliveryFailed: true,
      error: lastError?.message || 'Email delivery failed'
    };
  }
  return { success: false, mocked: true, error: lastError?.message };
};
