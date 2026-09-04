/**
 * Email Delivery Test — Localhost Only
 * Tests ALL email types actually sent by the server.
 *
 * Run: node tests/test_email_delivery.mjs <your@email.com>
 */

import "dotenv/config";
import { sendEmail, getHtmlTemplate, getClientBaseUrl, isSmtpConfigured } from "../utils/sendEmail.js";
import { isGmailConfigured } from "../utils/gmailService.js";

const recipientEmail = process.argv[2] || process.env.TEST_EMAIL;

if (!recipientEmail) {
  console.error("\n❌ Usage: node tests/test_email_delivery.mjs <your@email.com>\n");
  process.exit(1);
}

const BASE_URL = getClientBaseUrl();
let passed = 0;
let failed = 0;

function printSection(title) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  ${title}`);
  console.log("─".repeat(60));
}

function checkTransport() {
  printSection("🔍 Checking email transport configuration");
  const smtpOk = isSmtpConfigured();
  const gmailOk = isGmailConfigured();

  if (smtpOk) {
    console.log(`  ✅ SMTP configured — Host: ${process.env.SMTP_HOST || "smtp.gmail.com"}, Port: ${process.env.SMTP_PORT || 465}`);
    console.log(`     User: ${process.env.SMTP_USER}`);
  } else {
    console.log("  ⚠️  SMTP: NOT configured (missing SMTP_USER or SMTP_PASS)");
  }

  if (gmailOk) {
    console.log(`  ✅ Gmail API configured — Sender: ${process.env.GMAIL_SENDER_EMAIL}`);
  } else {
    console.log("  ⚠️  Gmail API: NOT configured or token expired");
  }

  if (!smtpOk && !gmailOk) {
    console.error("\n  ❌ FATAL: No email transport is configured!\n");
    console.error("  Add to server/.env:");
    console.error("    SMTP_HOST=smtp.gmail.com");
    console.error("    SMTP_PORT=465");
    console.error("    SMTP_USER=expensetracker1710@gmail.com");
    console.error("    SMTP_PASS=xxxx xxxx xxxx xxxx  (from https://myaccount.google.com/apppasswords)\n");
    process.exit(1);
  }
}

async function sendTest(label, emailConfig) {
  try {
    const result = await sendEmail(emailConfig);
    if (result.success) {
      console.log(`  ✅ SENT — ${label} (ID: ${result.messageId})`);
      passed++;
    } else if (result.mocked) {
      console.log(`  ⚠️  MOCKED — ${label} (no transport configured in .env)`);
      failed++;
    } else {
      console.log(`  ❌ FAILED — ${label}: ${result.error || "Unknown error"}`);
      failed++;
    }
  } catch (err) {
    console.log(`  ❌ ERROR — ${label}: ${err.message}`);
    failed++;
  }
}

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║       EXPENSE TRACKER — Email Delivery Test              ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`\n  📬 Sending all test emails to: ${recipientEmail}`);

  checkTransport();

  printSection("📧 Test 1: Registration — Email Verification OTP");
  await sendTest("Registration OTP", {
    to: recipientEmail,
    subject: "Verify your Expense Tracker email",
    html: getHtmlTemplate({
      title: "Verify Your Email",
      greeting: "Hello Test User",
      body: "Welcome to Expense Tracker! Please use the 6-digit code below to verify your email address. This code expires in 10 minutes.",
      code: "483920",
      footerText: "If you did not create this account, you can safely ignore this email.",
    }),
    text: "Hello Test User,\n\nWelcome to Expense Tracker! Your 6-digit verification code is:\n\n483920\n\nThis code will expire in 10 minutes.",
  });

  printSection("📧 Test 2: Forgot Password — Reset OTP");
  await sendTest("Password Reset OTP", {
    to: recipientEmail,
    subject: "Your verification code",
    html: getHtmlTemplate({
      title: "Reset Password Code",
      greeting: "Hello Test User",
      body: "We received a request to reset the password associated with your account. Please enter the verification code below. This code is valid for 15 minutes.",
      code: "762341",
      footerText: "If you did not request a password reset, you can safely ignore this email.",
    }),
    text: "Hello Test User,\n\nYour 6-digit password reset verification code is:\n\n762341\n\nThis code will expire in 15 minutes.",
  });

  printSection("📧 Test 3: Resend Verification — New OTP");
  await sendTest("Resend Verification OTP", {
    to: recipientEmail,
    subject: "Your new verification code",
    html: getHtmlTemplate({
      title: "Your new verification code",
      greeting: "Hello Test User",
      body: "We received a request to resend your verification code. Please use the 6-digit code below. This code is valid for 10 minutes.",
      code: "194837",
      footerText: "If you did not request a new code, you can safely ignore this email.",
    }),
    text: "Hello Test User,\n\nYour new 6-digit code is:\n\n194837\n\nThis code will expire in 10 minutes.",
  });

  printSection("📧 Test 4: Password Successfully Updated");
  await sendTest("Password Changed Confirmation", {
    to: recipientEmail,
    subject: "Password successfully updated",
    html: getHtmlTemplate({
      title: "Password Updated",
      greeting: "Hello Test User",
      body: `Your account password has been successfully updated. You can now log in using your new credentials.\n\nIf you did not make this change, please contact support immediately.`,
      ctaText: "Log In Now",
      ctaUrl: `${BASE_URL}/login`,
      footerText: "If you did not request this change, contact support immediately.",
    }),
    text: `Hello Test User,\n\nYour account password has been successfully updated. Log in at: ${BASE_URL}/login`,
  });

  printSection("📧 Test 5: Family Hub — Invitation Email");
  const acceptUrl = `${BASE_URL}/accept-invite?token=test-token-abc123`;
  await sendTest("Family Invite (with CTA button)", {
    to: recipientEmail,
    subject: "Invitation to join Aditya's Family Hub",
    html: getHtmlTemplate({
      title: "Family Hub Invitation",
      greeting: "Hello!",
      body: `**Aditya Dhobale** (aditya@example.com) has invited you to join their **Family Sharing Hub** on Expense Tracker as a **Admin**.\n\nThis invitation expires in **48 hours**.`,
      ctaText: "Accept Invitation",
      ctaUrl: acceptUrl,
      footerText: `If you did not expect this invitation, you can safely ignore this email.`,
    }),
    text: `Hello!\n\nAditya Dhobale invited you to join their Family Hub.\n\nAccept here (expires in 48h):\n${acceptUrl}`,
  });

  printSection("📧 Test 6: Split Expense — You Owe Notification");
  await sendTest("Split Expense Notification", {
    to: recipientEmail,
    subject: "New Shared Expense: Dinner at Restaurant",
    html: getHtmlTemplate({
      title: "New Shared Expense",
      greeting: "Hello Test User",
      body: `**Aditya Dhobale** has added a shared expense **"Dinner at Restaurant"** (₹1,200) and you owe **₹400**.\n\nPlease settle this at your earliest convenience.`,
      ctaText: "View & Settle",
      ctaUrl: `${BASE_URL}/splits`,
      footerText: "You received this because you are part of a shared expense on Expense Tracker.",
    }),
    text: `Hello Test User,\n\nAditya Dhobale added a shared expense "Dinner at Restaurant" (₹1,200). You owe ₹400.\n\nView it at: ${BASE_URL}/splits`,
  });

  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║                      TEST RESULTS                       ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log(`║  ✅ Passed: ${String(passed).padEnd(47)}║`);
  console.log(`║  ❌ Failed: ${String(failed).padEnd(47)}║`);
  console.log(`║  📬 Total:  ${String(passed + failed).padEnd(47)}║`);
  console.log("╚══════════════════════════════════════════════════════════╝");

  if (failed === 0) {
    console.log("\n🎉 All emails delivered successfully! Check your inbox.\n");
  } else {
    console.log("\n⚠️  Some emails failed. Add SMTP credentials to server/.env and try again.\n");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("\n💥 Unexpected error:", err.message);
  process.exit(1);
});
