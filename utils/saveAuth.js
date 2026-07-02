const { chromium } = require('@playwright/test');
const { execSync, spawn } = require('child_process');

async function saveLoginState() {
  // Step 1: Chrome band karo
  console.log('⏳ Chrome band kar raha hoon...');
  try { execSync('taskkill /F /IM chrome.exe /T', { stdio: 'ignore' }); } catch (e) {}
  await new Promise(r => setTimeout(r, 3000));

  // Step 2: Chrome ko remote debugging ke saath start karo
  // Isme tera original profile use hoga - already Beeceptor login hai
  console.log('🚀 Chrome remote debugging mode mein start kar raha hoon...');
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

  // Chrome ko load hone do
  console.log('⏳ Chrome load ho raha hai - 6 seconds wait...');
  await new Promise(r => setTimeout(r, 6000));

  // Step 3: Playwright us Chrome se connect karo
  console.log('🔗 Chrome se connect ho raha hoon...');
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];

  console.log('✅ Connected! 8 seconds mein save hoga...');
  await new Promise(r => setTimeout(r, 8000));

  // Step 4: Auth save karo
  await context.storageState({ path: 'auth.json' });
  console.log('✅ auth.json save ho gaya!');

  await browser.disconnect();
  process.exit(0);
}

saveLoginState();