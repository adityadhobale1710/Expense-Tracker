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

// ─── C2 fix: refuse to boot with weak / leaked default secrets ─────────────────
// The default JWT_SECRET was shipped in the repo and is publicly known — anyone
// can mint valid access tokens (including for the admin) if a live deployment
// runs with it. Fail fast on the known defaults or any obviously weak secret
// instead of silently running a forgeable auth layer.
const KNOWN_INSECURE_SECRETS = [
  'your_super_secret_jwt_key_change_this_in_production',
  'your_super_secret_refresh_key_change_this',
  'your_super_secure_cookie_session_secret_key_change_this_in_production',
  'secret',
  'password',
];

const SECRET_ENV_VARS = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'COOKIE_SECRET'];

const isWeakSecret = (value) => {
  if (!value || typeof value !== 'string') return true;
  if (value.length < 16) return true;
  return KNOWN_INSECURE_SECRETS.includes(value.toLowerCase());
};

const weakSecrets = SECRET_ENV_VARS.filter((envVar) => isWeakSecret(process.env[envVar]));

if (weakSecrets.length > 0) {
  console.error('\n❌ CRITICAL SECURITY ERROR: weak or publicly-known secret detected. The server refuses to start.');
  weakSecrets.forEach((v) => console.error(`   - ${v}`));
  console.error('Generate strong random secrets (e.g. `openssl rand -hex 32`) and set them in your environment/`, '.env file.');
  console.error('Running with a guessable JWT secret lets attackers forge authentication tokens for ANY user.\n');
  process.exit(1);
}

