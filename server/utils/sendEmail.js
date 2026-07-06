import nodemailer from 'nodemailer';

/**
 * Generates a premium dark-themed, glassmorphic-styled HTML email template.
 */
export const getHtmlTemplate = ({ title, greeting, body, ctaText, ctaUrl, code, footerText }) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background-color: #05070f;
          color: #e2e8f0;
          -webkit-font-smoothing: antialiased;
        }
        .wrapper {
          width: 100%;
          table-layout: fixed;
          background-color: #05070f;
          padding: 40px 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #0b0f19;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
        }
        .header {
          background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
          padding: 40px 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.5px;
          text-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }
        .content {
          padding: 40px 30px;
        }
        .greeting {
          font-size: 20px;
          font-weight: 700;
          color: #ffffff;
          margin-top: 0;
          margin-bottom: 16px;
        }
        .body-text {
          font-size: 15px;
          line-height: 1.6;
          color: #94a3b8;
          margin-bottom: 30px;
        }
        .cta-container {
          text-align: center;
          margin: 35px 0;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%);
          color: #ffffff !important;
          text-decoration: none;
          padding: 14px 32px;
          font-size: 16px;
          font-weight: 700;
          border-radius: 12px;
          box-shadow: 0 10px 20px rgba(99, 102, 241, 0.25);
          transition: all 0.2s ease;
        }
        .code-container {
          background-color: #0f172a;
          border: 1px dashed rgba(99, 102, 241, 0.3);
          border-radius: 16px;
          padding: 20px;
          text-align: center;
          margin: 35px 0;
        }
        .code-text {
          font-family: 'Courier New', Courier, monospace;
          font-size: 32px;
          font-weight: 800;
          letter-spacing: 6px;
          color: #818cf8;
          margin: 0;
        }
        .footer {
          padding: 30px;
          text-align: center;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          background-color: #070912;
        }
        .footer p {
          font-size: 12px;
          color: #64748b;
          margin: 8px 0 0 0;
        }
        .footer a {
          color: #6366f1;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <div class="header">
            <h1>My Expense Pro</h1>
          </div>
          <div class="content">
            ${greeting ? `<div class="greeting">${greeting}</div>` : ''}
            <div class="body-text">${body}</div>
            
            ${code ? `
              <div class="code-container">
                <p style="margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: 700;">Verification Code</p>
                <div class="code-text">${code}</div>
              </div>
            ` : ''}

            ${ctaUrl && ctaText ? `
              <div class="cta-container">
                <a href="${ctaUrl}" class="cta-button">${ctaText}</a>
              </div>
            ` : ''}
          </div>
          <div class="footer">
            <p>${footerText || 'You received this email because you are registered with My Expense Pro.'}</p>
            <p>&copy; ${new Date().getFullYear()} My Expense Pro. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Sends an email using SMTP transport or logs it to the terminal as a fallback.
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  const isSmtpConfigured = 
    process.env.SMTP_HOST && 
    process.env.SMTP_USER && 
    !process.env.SMTP_USER.includes('your_smtp_username') &&
    process.env.SMTP_PASS &&
    !process.env.SMTP_PASS.includes('your_smtp_password');

  console.log(`\n📧 Dispatching email to: ${to} (Subject: "${subject}")`);

  if (!isSmtpConfigured) {
    console.log('⚠️  [SMTP Log Fallback] SMTP credentials are not configured or still have default placeholders. Dumping email context below:');
    console.log('──────────────────────────────────────────────────────────────────────');
    console.log(`TO:      ${to}`);
    console.log(`SUBJECT: ${subject}`);
    console.log(`TEXT:    ${text}`);
    console.log('──────────────────────────────────────────────────────────────────────\n');
    return { success: true, mocked: true };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'My Expense Pro'}" <${process.env.SMTP_FROM || 'noreply@expensetracker.com'}>`,
      to,
      subject,
      text,
      html,
    });

    console.log(`🚀 [SMTP Success] Email dispatched successfully: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ [SMTP Error] Failed to deliver email via SMTP:', error.message);
    console.log('──────────────────────────────────────────────────────────────────────');
    console.log('⚠️ Falling back to terminal dumping because SMTP transport failed:');
    console.log(`TO:      ${to}`);
    console.log(`SUBJECT: ${subject}`);
    console.log(`TEXT:    ${text}`);
    console.log('──────────────────────────────────────────────────────────────────────\n');
    return { success: false, error: error.message };
  }
};
