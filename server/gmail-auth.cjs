const fs = require('fs');
const path = require('path');
const http = require('http');
const { google } = require('googleapis');
const url = require('url');

const CREDENTIALS_PATH = path.join(__dirname, 'client_secret_467666891263-sg4dfg19ft1pjip8vsnb7n8h9tggaqk8.apps.googleusercontent.com.json');

async function main() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.error(`Error: Credentials file not found at ${CREDENTIALS_PATH}`);
    process.exit(1);
  }

  const credentialsStr = fs.readFileSync(CREDENTIALS_PATH, 'utf-8');
  const credentials = JSON.parse(credentialsStr);
  const { client_secret, client_id } = credentials.installed;
  
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
  console.log('\nWaiting for authorization callback...');

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
      
      console.log('\n=== OAUTH TOKENS ===');
      console.log('Refresh Token:', tokens.refresh_token);
      if (!tokens.refresh_token) {
        console.log('NOTE: No refresh token returned. This usually happens if prompt=consent was not provided or user already granted access previously without revoking it.');
      }
      console.log('====================');
      console.log('\nSUCCESS! Copy the refresh token above and add it to your .env file.');
      console.log('Do not share this token or commit it to version control.');
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
