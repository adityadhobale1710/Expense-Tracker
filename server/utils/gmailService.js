import { google } from 'googleapis';
import logger from './logger.js';

/**
 * Builds a valid RFC 2822 MIME message and encodes it as base64url,
 * which is the format required by the Gmail API `users.messages.send` endpoint.
 *
 * @param {string} to       - Recipient email address
 * @param {string} from     - Sender address (e.g. "Expense Tracker <sender@gmail.com>")
 * @param {string} subject  - Email subject
 * @param {string} html     - HTML body content
 * @returns {string} base64url-encoded MIME message
 */
function buildMimeMessage(to, from, subject, html) {
  const boundary = `ET_BOUNDARY_${Date.now()}`;
  const mimeLines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    'Please enable HTML to view this email.',
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    '',
    html,
    '',
    `--${boundary}--`,
  ];

  const raw = mimeLines.join('\r\n');

  // Gmail API requires base64url encoding (RFC 4648 §5)
  return Buffer.from(raw)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Creates a Gmail API OAuth2 client from application environment variables.
 * Uses the app's dedicated sender account credentials — NOT the end user's credentials.
 * The Expense Tracker user is never asked to authorize Gmail.
 *
 * @returns {import('googleapis').gmail_v1.Gmail}
 */
function createGmailClient() {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    // redirect_uri is unused at runtime; only required for the initial authorization
    'http://127.0.0.1:3000'
  );

  // Set credentials using the stored refresh token.
  // The googleapis library exchanges this automatically for a short-lived access token.
  oAuth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });

  return google.gmail({ version: 'v1', auth: oAuth2Client });
}

/**
 * Sends an email via the Gmail API using OAuth2 refresh-token flow.
 *
 * @param {object} opts
 * @param {string} opts.to       - Recipient email address
 * @param {string} opts.subject  - Email subject
 * @param {string} opts.html     - HTML body
 * @returns {Promise<{ success: boolean, messageId?: string, error?: string }>}
 */
export async function sendViaGmail({ to, subject, html }) {
  const senderEmail = process.env.GMAIL_SENDER_EMAIL;
  const companyName = process.env.COMPANY_NAME || 'Expense Tracker';

  const from = `"${companyName}" <${senderEmail}>`;
  const rawMessage = buildMimeMessage(to, from, subject, html);

  const gmail = createGmailClient();

  const response = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: rawMessage },
  });

  const messageId = response?.data?.id;
  logger.info(`📧 [Gmail API] Email delivered successfully. Message ID: ${messageId}`);

  return { success: true, messageId };
}

/**
 * Returns true if all required Gmail API environment variables are configured.
 * Used by sendEmail.js to decide which transport to use at runtime.
 *
 * @returns {boolean}
 */
export function isGmailConfigured() {
  return !!(
    process.env.GMAIL_CLIENT_ID &&
    process.env.GMAIL_CLIENT_SECRET &&
    process.env.GMAIL_REFRESH_TOKEN &&
    process.env.GMAIL_SENDER_EMAIL
  );
}
