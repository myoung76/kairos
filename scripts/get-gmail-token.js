#!/usr/bin/env node
/**
 * One-time local OAuth helper — run this once to get a Gmail refresh token.
 *
 * Usage:
 *   cd scripts
 *   GMAIL_CLIENT_ID=xxx GMAIL_CLIENT_SECRET=xxx node get-gmail-token.js
 *
 * Then copy the printed refresh token into your GitHub repo secret GMAIL_REFRESH_TOKEN.
 */

import { google } from 'googleapis';
import http       from 'http';

const CLIENT_ID     = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const PORT          = 3456;
const REDIRECT_URI  = `http://localhost:${PORT}`;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Error: GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET must be set.');
  console.error('Example:');
  console.error('  GMAIL_CLIENT_ID=xxx GMAIL_CLIENT_SECRET=xxx node get-gmail-token.js');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt:      'consent',
  scope:       ['https://www.googleapis.com/auth/gmail.readonly'],
});

// Start a temporary local server to capture the OAuth callback
const server = http.createServer(async (req, res) => {
  const url    = new URL(req.url, `http://localhost:${PORT}`);
  const code   = url.searchParams.get('code');
  const error  = url.searchParams.get('error');

  if (error) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h2>Authorization failed. Check your terminal.</h2>');
    server.close();
    console.error('\n✗ OAuth error:', error);
    process.exit(1);
  }

  if (!code) return; // ignore favicon etc.

  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<h2>✓ Authorization successful! You can close this tab and return to the terminal.</h2>');
  server.close();

  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log('\n✓ Success! Add this as a GitHub secret named GMAIL_REFRESH_TOKEN:\n');
    console.log('   ' + tokens.refresh_token);
    console.log('\nAlso confirm these secrets are in GitHub:');
    console.log('   GMAIL_CLIENT_ID     =', CLIENT_ID);
    console.log('   GMAIL_CLIENT_SECRET =', CLIENT_SECRET);
  } catch (err) {
    console.error('\n✗ Failed to exchange code:', err.message);
    process.exit(1);
  }
});

server.listen(PORT, () => {
  console.log('\n1. Open this URL in your browser:\n');
  console.log('   ' + authUrl);
  console.log('\n2. Sign in and click Allow — the token will print here automatically.\n');
});
