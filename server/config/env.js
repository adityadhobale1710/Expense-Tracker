import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const REQUIRED_ENV_VARS = [
  'MONGO_URI',
  'CLIENT_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'COOKIE_SECRET'
];

const missingVars = [];

REQUIRED_ENV_VARS.forEach((envVar) => {
  if (!process.env[envVar]) {
    missingVars.push(envVar);
  }
});

if (missingVars.length > 0) {
  console.error('\n❌ CRITICAL CONFIGURATION ERROR: Missing required environment variables:');
  missingVars.forEach((v) => console.error(`   - ${v}`));
  console.error('The server cannot start without these variables. Exiting...\n');
  process.exit(1);
}

