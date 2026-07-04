const { chromium } = require('@playwright/test');
const { execSync, spawn } = require('child_process');

async function saveLoginState() {
  // Step 1: Close Chrome if it is already open
  // We need to close Chrome first because Playwright cannot connect
  // to a Chrome profile that is already being used by another instance.
  console.log('⏳ Closing Chrome...');
  try { execSync('taskkill /F /IM chrome.exe /T', { stdio: 'ignore' }); } catch (e) {}
  await new Promise(r => setTimeout(r, 3000));

  // Step 2: Start Chrome with remote debugging enabled
  // We launch Chrome with our existing user profile so that
  // Beeceptor session is already logged in (no need to login again).
  // Remote debugging port 9222 allows Playwright to connect to this Chrome instance.
  console.log('🚀 Starting Chrome with remote debugging...');
  const chrome = spawn(
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    [
      '--remote-debugging-port=9222',
      '--user-data-dir=C:\\Users\\parid\\AppData\\Local\\Google\\Chrome\\User Data',
      '--profile-directory=Default',
      'https://app.beeceptor.com/console/dashboard/jagan-playwright-test'
    ],
    { detached: true, stdio: 'ignore' }
  );
  chrome.unref();

  // Wait for Chrome to fully load before connecting
  console.log('⏳ Waiting for Chrome to load - 6 seconds...');
  await new Promise(r => setTimeout(r, 6000));

  // Step 3: Connect Playwright to the running Chrome instance
  // connectOverCDP connects to Chrome using Chrome DevTools Protocol.
  // This way Playwright can control the already logged in Chrome session.
  console.log('🔗 Connecting Playwright to Chrome...');
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];

  // Wait a few seconds so the page is fully loaded before saving
  console.log('✅ Connected! Saving session in 8 seconds...');
  await new Promise(r => setTimeout(r, 8000));

  // Step 4: Save the login session to auth.json file
  // storageState saves all cookies and localStorage to a file.
  // Playwright will use this file later to skip the login step in tests.
  await context.storageState({ path: 'auth.json' });
  console.log('✅ auth.json saved successfully!');

  await browser.disconnect();
  process.exit(0);
}

saveLoginState();