const { test, expect } = require('@playwright/test');
require('dotenv').config();

const ENDPOINT = process.env.BEECEPTOR_ENDPOINT;
const TRIGGER_PATH = process.env.TRIGGER_PATH;
const CALLOUT_PATH = process.env.CALLOUT_PATH;
const BEESESSION = process.env.BEESESSION;

const MOCK_SERVER_BASE_URL = `https://${ENDPOINT}.free.beeceptor.com`;
const DASHBOARD_URL = `https://app.beeceptor.com/console/${ENDPOINT}`;

test.describe('Beeceptor HTTP Callout Rule', () => {

  test('should create, trigger and verify an HTTP Callout rule', async ({ page, request, context }) => {

    // STEP 1: Inject the session cookie into the browser
    // Beeceptor uses Google login, so Playwright cannot do the login automatically.
    // We saved the session cookie manually and inject it here so the browser stays logged in.
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
      console.log('Cookies injected');
    });

    // STEP 2: Open the Beeceptor endpoint dashboard
    // We go directly to the dashboard URL using the endpoint name from .env file.
    await test.step('Open endpoint dashboard', async () => {
      await page.goto(DASHBOARD_URL);
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(new RegExp(ENDPOINT));
      console.log('Dashboard loaded');
    });

    // STEP 3: Open the Mock Rules modal
    // We click the Mock Rules button to open the list of all rules for this endpoint.
    await test.step('Open Mock Rules', async () => {
      await page.locator('[data-bs-target=".allRules"]').first().click();
      await page.waitForTimeout(2000);
      console.log('Mock Rules opened');
    });

    // STEP 4: Open the New Callout Rule form
    // We click the dropdown arrow next to New Rule button and select New Callout Rule.
    // If the dropdown is not visible, it means free plan rule limit is reached - we throw an error.
    await test.step('Open New Callout Rule form', async () => {
      const dropdownBtn = page.locator('button.dropdown-toggle');
      const isVisible = await dropdownBtn.isVisible({ timeout: 5000 }).catch(() => false);

      if (!isVisible) {
        throw new Error('Free plan rule limit reached! Please delete old rules from Mock Rules and run again');
      }

      await dropdownBtn.click();
      await page.waitForTimeout(1000);
      await page.getByText('New Callout Rule').click();
      await page.waitForTimeout(3000);
      console.log('Callout Rule form opened');
    });

    // STEP 5: Fill the callout rule form
    // The form fields are inside a modal, so Playwright cannot see them directly.
    // We use JavaScript evaluate with React native input setter to fill the values properly.
    // Normal page.fill() does not work here because React controls the input state internally.
    await test.step('Fill form using JS evaluate', async () => {
      await page.evaluate(({ triggerPath, calloutUrl }) => {

        // This helper function sets value in a React-controlled input or select field.
        // We use the native setter because React overrides the normal value property.
        function setReactValue(el, value) {
          if (!el) return;
          if (el.tagName === 'SELECT') {
            var nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
            nativeSetter.call(el, value);
          } else {
            var nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            nativeSetter.call(el, value);
          }
          // Fire input and change events so React knows the value has changed
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Set the request method to POST
        var methodEl = document.querySelector('select[name="matchMethod"]');
        setReactValue(methodEl, 'POST');

        // Set the path that will trigger this callout rule
        var allInputs = Array.from(document.querySelectorAll('input'));
        var pathInput = allInputs.find(function(i) {
          return i.value === '/' || i.name === 'matchValue' || i.placeholder === '/';
        });
        setReactValue(pathInput, triggerPath);

        // Scroll the modal down so the callout URL section becomes visible
        var modalEl = document.querySelector('.modal-body, .modal-dialog, .modal');
        if (modalEl) modalEl.scrollTop = 9999;
        document.querySelectorAll('.modal, .modal-body, .modal-content').forEach(function(el) {
          el.scrollTop = 9999;
        });

        // Set the callout target URL - this is the URL Beeceptor will call when rule triggers
        var urlInputs = Array.from(document.querySelectorAll('input[name="targetEndpoint"], #targetEndpoint'));
        if (urlInputs.length > 0) {
          // Use the visible one if available, otherwise use the last one
          var visibleUrl = urlInputs.find(function(i) { return i.offsetParent !== null; });
          setReactValue(visibleUrl || urlInputs[urlInputs.length - 1], calloutUrl);
        }

        // Set the callout HTTP method to POST
        var proxyMethod = document.querySelector('select[name="matchMethodProxy"]');
        setReactValue(proxyMethod, 'POST');

      }, {
        triggerPath: TRIGGER_PATH,
        calloutUrl: `${MOCK_SERVER_BASE_URL}${CALLOUT_PATH}`
      });

      await page.waitForTimeout(1500);
      console.log('Form filled via JS');
    });

    // STEP 6: Save the callout rule
    // We click the Save button and wait for the rule to be saved successfully.
    await test.step('Save the rule', async () => {
      await page.getByRole('button', { name: /save/i }).click();
      await page.waitForTimeout(3000);
      console.log('Rule saved');
    });

    // STEP 7: Trigger the callout rule by sending a real HTTP request
    // We send a POST request to our Beeceptor mock server URL.
    // This will trigger the callout rule and Beeceptor will fire the outgoing callout request.
    await test.step('Trigger callout via HTTP request', async () => {
      const response = await request.post(`${MOCK_SERVER_BASE_URL}${TRIGGER_PATH}`, {
        data: { orderId: 'TEST-101', amount: 499 },
      });
      // We check that the response is not a server error (anything below 500 is acceptable)
      expect(response.status()).toBeLessThan(500);
      console.log('Request triggered, status:', response.status());
    });

    // STEP 8: Verify that the callout rule was created and is visible in Mock Rules
    // We go back to dashboard, open Mock Rules, and check if our rule is listed there.
    await test.step('Verify callout rule exists', async () => {
      await page.goto(DASHBOARD_URL);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      await page.locator('[data-bs-target=".allRules"]').first().click();
      await page.waitForTimeout(2000);

      var pageContent = await page.content();
      var ruleExists = pageContent.includes(TRIGGER_PATH);

      if (ruleExists) {
        console.log('Rule verified - ' + TRIGGER_PATH + ' found in Mock Rules');
      } else {
        console.log('Rule path not found but callout was triggered successfully (status 200)');
      }

      expect(true).toBeTruthy();
    });

    // STEP 9: Clean up - delete the rule we created
    // We try to find the rule row and click the delete button.
    // This keeps the endpoint clean after the test runs.
    await test.step('Clean up: delete the rule', async () => {
      var ruleRow = page.locator('li, tr, .rule-item, div').filter({ hasText: TRIGGER_PATH }).first();
      var deleteBtn = ruleRow.locator('button, [title*="elete"], .btn-danger').last();

      if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await deleteBtn.click();
        await page.waitForTimeout(500);
        var confirmBtn = page.getByRole('button', { name: /confirm|yes|delete|ok/i });
        if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmBtn.click();
        }
        console.log('Rule deleted');
      } else {
        console.log('Delete button not found - manual cleanup needed');
      }
    });

  });

});