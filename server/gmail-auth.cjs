const fs = require('fs');
const path = require('path');
const http = require('http');
const { google } = require('googleapis');
const url = require('url');

require('dotenv').config();

const CREDENTIALS_PATH = path.join(__dirname, 'client_secret_467666891263-sg4dfg19ft1pjip8vsnb7n8h9tggaqk8.apps.googleusercontent.com.json');

async function main() {
  let client_id = process.env.GMAIL_CLIENT_ID?.trim();
  let client_secret = process.env.GMAIL_CLIENT_SECRET?.trim();

  if (fs.existsSync(CREDENTIALS_PATH)) {
    try {
      const credentialsStr = fs.readFileSync(CREDENTIALS_PATH, 'utf-8');
      const credentials = JSON.parse(credentialsStr);
      if (credentials.installed) {
        client_id = credentials.installed.client_id;
        client_secret = credentials.installed.client_secret;
      }
    } catch (e) {
      // fallback to env
    }
  }

  if (!client_id || !client_secret) {
    console.error('Error: GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET must be set in .env or present in client_secret JSON file.');
    process.exit(1);
  }
  
  // Create an OAuth2 client
  // The redirect URI must match what's allowed for Desktop clients.
  // Google recommends using http://127.0.0.1 for desktop loopback flows.
  const port = 3000;
  const redirectUri = `http://127.0.0.1:${port}`;
  
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirectUri
  );

  // Generate the authentication URL
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // Force consent so a refresh token is always returned
    scope: ['https://www.googleapis.com/auth/gmail.send'],
  });

  console.log('Authorize this app by visiting this URL:');
  console.log(authUrl);
  console.log('\nWaiting for authorization callback on http://127.0.0.1:3000 ...');

  // Start a temporary HTTP server to receive the callback
  const server = http.createServer(async (req, res) => {
    try {
      if (req.url.indexOf('/favicon.ico') > -1) {
        res.writeHead(204);
        res.end();
        return;
      }

      const qs = new url.URL(req.url, redirectUri).searchParams;
      const code = qs.get('code');
      
      if (!code) {
        res.writeHead(400);
        res.end('No code found in the callback URL.');
        return;
      }

      res.writeHead(200);
      res.end('Authorization successful! You can close this tab and check your terminal.');
      server.close();

      console.log('\nAuthorization code received. Exchanging for tokens...');
      
      const { tokens } = await oAuth2Client.getToken(code);
      
      console.log('\n=================== OAUTH TOKENS ===================');
      console.log('Refresh Token:', tokens.refresh_token);
      if (!tokens.refresh_token) {
        console.log('NOTE: No refresh token returned. This usually happens if prompt=consent was not provided or user already granted access previously without revoking it.');
      }
      console.log('====================================================');
      console.log('\nSUCCESS! Copy the refresh token above and add it to your .env file and Render environment variables (GMAIL_REFRESH_TOKEN).');
      console.log('\n⚠️  CRITICAL NOTICE:');
      console.log('If your Google Cloud Console OAuth consent screen is in "Testing" status,');
      console.log('this refresh token will automatically EXPIRE IN 7 DAYS, throwing invalid_grant!');
      console.log('To make it permanent:');
      console.log('1. Open https://console.cloud.google.com/apis/credentials/consent');
      console.log('2. Under "Publishing status", click "PUBLISH APP" to switch to "In production".');
      console.log('====================================================\n');
      process.exit(0);
    } catch (error) {
      console.error('Error during callback processing:', error.message);
      res.writeHead(500);
      res.end('Authentication failed.');
      server.close();
      process.exit(1);
    }
  });

  server.listen(port, '127.0.0.1', () => {
    // Server is listening explicitly on IPv4 loopback
  });
}

main().catch(console.error);
