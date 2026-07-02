const { test, expect } = require('@playwright/test');
require('dotenv').config();

const ENDPOINT = process.env.BEECEPTOR_ENDPOINT || 'jagan-playwright-test';
const TRIGGER_PATH = process.env.TRIGGER_PATH || '/create-order';
const CALLOUT_PATH = process.env.CALLOUT_PATH || '/order-callback-received';
const BEESESSION = process.env.BEESESSION || 's%3Aup2LJU16fqWzpqYr_8OUolQLZNb5LFF2.j1bYtg69%2Bs9x%2Fd9hezFHKZcLDmrR1e5JUodMjDnkxPM';
const MOCK_SERVER_BASE_URL = `https://${ENDPOINT}.free.beeceptor.com`;
const DASHBOARD_URL = `https://app.beeceptor.com/console/${ENDPOINT}`;

test.describe('Beeceptor HTTP Callout Rule', () => {

  test('should create, trigger and verify an HTTP Callout rule', async ({ page, request, context }) => {

    await test.step('Inject login cookie', async () => {
      // Cookie seedha browser mein inject karo - storageState ki zaroorat nahi
      await context.addCookies([
        {
          name: 'beesession',
          value: BEESESSION,
          domain: '.beeceptor.com',
          path: '/',
          httpOnly: true,
          secure: true,
          sameSite: 'None'
        },
        {
          name: 'gdprConsent',
          value: 'accepted',
          domain: '.beeceptor.com',
          path: '/',
          httpOnly: false,
          secure: true,
          sameSite: 'None'
        }
      ]);
      console.log('✅ Cookies injected');
    });

    await test.step('Open endpoint dashboard', async () => {
      await page.goto(DASHBOARD_URL);
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(new RegExp(ENDPOINT));
      console.log('✅ Dashboard loaded');
    });

    await test.step('Open Mock Rules', async () => {
  // Exact data attribute use karo
  await page.locator('[data-bs-target=".allRules"]').first().click();
  await page.waitForTimeout(2000);
  console.log('✅ Mock Rules opened');
});

await test.step('Open Create Proxy or Callout', async () => {
  // Dropdown arrow click karo (New Rule ke paas wala)
  await page.locator('button.dropdown-toggle').click();
  await page.waitForTimeout(1000);
  
  // Dropdown mein Proxy or Callout option click karo
  await page.getByText('New Callout Rule').click();
  await page.waitForTimeout(2000);
  console.log('✅ Create Proxy or Callout opened');
});
    await test.step('Fill matching criteria', async () => {
  // Method dropdown - exact id use karo
  await page.locator('#matchMethod').selectOption('POST');
  
  // Path field - Match value/expression wala input
  await page.locator('input[name="matchValue"], input[placeholder*="path"], .match-value input').first().fill(TRIGGER_PATH);
  
  console.log('✅ Matching criteria filled');
});

    await test.step('Configure instant mock response', async () => {
  // Dropdown mein "Return instant mock response" select karo
  await page.locator('select').filter({ hasText: /synchronous|instant|wait/i }).selectOption({ index: 1 });
  console.log('✅ Response configured');
});

    await test.step('Configure HTTP Callout', async () => {
      await page.getByLabel(/callout url|callout path/i).fill(
        `${MOCK_SERVER_BASE_URL}${CALLOUT_PATH}`
      );
      await page.getByLabel(/callout method/i).selectOption('POST');
      await page.getByText(/forward original request/i).click();
      console.log('✅ Callout configured');
    });

    await test.step('Save rule', async () => {
      await page.getByRole('button', { name: /save/i }).click();
      await expect(page.getByText(TRIGGER_PATH)).toBeVisible();
      console.log('✅ Rule saved');
    });

    await test.step('Trigger callout via HTTP request', async () => {
      const response = await request.post(`${MOCK_SERVER_BASE_URL}${TRIGGER_PATH}`, {
        data: { orderId: 'TEST-101', amount: 499 },
      });
      expect(response.status()).toBe(200);
      console.log('✅ Triggered, status:', response.status());
    });

    await test.step('Verify callout in request log', async () => {
      await page.goto(DASHBOARD_URL);
      await page.waitForTimeout(2000);
      await page.reload();
      await expect(page.getByText(TRIGGER_PATH).first()).toBeVisible();
      await expect(page.getByText(CALLOUT_PATH).first()).toBeVisible();
      console.log('✅ Callout verified');
    });

    await test.step('Clean up rule', async () => {
      await page.goto(`${DASHBOARD_URL}/rules`);
      const ruleRow = page.locator('tr', { hasText: TRIGGER_PATH }).first();
      await ruleRow.getByRole('button', { name: /delete|remove/i }).click();
      await page.getByRole('button', { name: /confirm|yes|delete/i }).click();
      console.log('✅ Rule deleted');
    });

  });
});