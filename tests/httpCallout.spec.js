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

    // ─── STEP 1: Cookie inject karo ───────────────────────────────
    await test.step('Inject login cookie', async () => {
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

    // ─── STEP 2: Dashboard kholo ──────────────────────────────────
    await test.step('Open endpoint dashboard', async () => {
      await page.goto(DASHBOARD_URL);
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(new RegExp(ENDPOINT));
      console.log('✅ Dashboard loaded');
    });

    // ─── STEP 3: Mock Rules modal kholo ───────────────────────────
    await test.step('Open Mock Rules', async () => {
      await page.locator('[data-bs-target=".allRules"]').first().click();
      await page.waitForTimeout(2000);
      console.log('✅ Mock Rules opened');
    });

    // ─── STEP 4: New Callout Rule form kholo ──────────────────────
    await test.step('Open New Callout Rule form', async () => {
      // Dropdown arrow (caret) click karo
      await page.locator('button.dropdown-toggle').click();
      await page.waitForTimeout(1000);
      // "New Callout Rule" option click karo
      await page.getByText('New Callout Rule').click();
      await page.waitForTimeout(2000);
      console.log('✅ Callout Rule form opened');
    });

    // ─── STEP 5: Request matching fill karo ──────────────────────
    await test.step('Fill request matching criteria', async () => {
  // Modal ke andar scroll karo - form upar hai
  await page.evaluate(() => {
    const modal = document.querySelector('.modal-body, .modal-content, .allRules');
    if (modal) modal.scrollTop = 0;
  });
  await page.waitForTimeout(1000);

  // Force true - element visible na ho tab bhi kaam karega
  await page.locator('select[name="matchMethod"]').selectOption('POST', { force: true });
  await page.locator('input[name="matchValue"]').fill(TRIGGER_PATH, { force: true });

  console.log('✅ Matching criteria filled');
});

    // ─── STEP 6: Callout URL fill karo (scroll karke) ────────────
    await test.step('Configure HTTP Callout target', async () => {
      // Form scroll karo neeche
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1000);

      // Callout URL input - name attribute se
      await page.locator('input[name="proxyUrl"], input[name="calloutUrl"], input[placeholder*="http"]')
        .last()
        .fill(`${MOCK_SERVER_BASE_URL}${CALLOUT_PATH}`);

      // Callout method POST select karo
      await page.locator('select[name="matchMethodProxy"]').selectOption('POST');

      console.log('✅ Callout configured');
    });

    // ─── STEP 7: Save karo ────────────────────────────────────────
    await test.step('Save the rule', async () => {
      await page.getByRole('button', { name: /save/i }).click();
      await page.waitForTimeout(2000);
      console.log('✅ Rule saved');
    });

    // ─── STEP 8: HTTP request trigger karo ───────────────────────
    await test.step('Trigger callout via HTTP request', async () => {
      const response = await request.post(`${MOCK_SERVER_BASE_URL}${TRIGGER_PATH}`, {
        data: { orderId: 'TEST-101', amount: 499 },
      });
      // Beeceptor koi bhi response deta hai - bas 5xx nahi hona chahiye
      expect(response.status()).toBeLessThan(500);
      console.log('✅ Request triggered, status:', response.status());
    });

    // ─── STEP 9: Verify karo ─────────────────────────────────────
    await test.step('Verify callout rule exists in Mock Rules', async () => {
      await page.goto(DASHBOARD_URL);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Mock Rules kholo aur apna rule verify karo
      await page.locator('[data-bs-target=".allRules"]').first().click();
      await page.waitForTimeout(1500);

      // Hmare trigger path ka rule exist karta hai
      await expect(page.getByText(TRIGGER_PATH)).toBeVisible();
      console.log('✅ Callout rule verified in Mock Rules');
    });

    // ─── STEP 10: Cleanup - rule delete karo ─────────────────────
    await test.step('Clean up: delete the rule', async () => {
      // Delete icon (trash) click karo rule row mein
      const ruleRow = page.locator('li, tr, div').filter({ hasText: TRIGGER_PATH }).first();
      await ruleRow.locator('[title*="Delete"], [title*="delete"], .btn-danger, button').last().click();
      await page.waitForTimeout(1000);

      // Confirmation dialog handle karo agar aaye
      const confirmBtn = page.getByRole('button', { name: /confirm|yes|delete|ok/i });
      if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmBtn.click();
      }

      console.log('✅ Rule deleted');
    });

  });
});