import dotenv from 'dotenv';
dotenv.config();

const REQUIRED_ENV_VARS = [
  'MONGO_URI',
  'CLIENT_URLS',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'COOKIE_SECRET'
];

const missingVars = [];

REQUIRED_ENV_VARS.forEach((envVar) => {
  if (!process.env[envVar]) {
    missingVars.push(envVar);
  }
});

if (missingVars.length > 0) {
  console.error('❌ CRITICAL CONFIGURATION ERROR: Missing required environment variables:');
  missingVars.forEach((v) => console.error(`   - ${v}`));
  console.error('The server cannot start without these variables. Exiting...');
  process.exit(1);
}

// Parse and clean client URLs
const clientUrlsList = process.env.CLIENT_URLS
  ? process.env.CLIENT_URLS.split(',').map((url) => url.trim().replace(/\/$/, ''))
  : [];

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  MONGO_URI: process.env.MONGO_URI,
  CLIENT_URLS: clientUrlsList,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  COOKIE_SECRET: process.env.COOKIE_SECRET,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: parseInt(process.env.SMTP_PORT, 10),
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_FROM: process.env.SMTP_FROM || 'noreply@expensetracker.com',
  SMTP_FROM_NAME: process.env.SMTP_FROM_NAME || 'My Expense Pro',
};
