// utils/beeceptorHelpers.js
//
// Small helper functions used by our test.
// Keeping them here (instead of inside the test file) makes the test
// itself easier to read - this is a common, simple pattern, not over-engineering.

/**
 * Logs into Beeceptor using email + password.
 * Beeceptor shows a normal login form at https://app.beeceptor.com/login
 *
 * NOTE: If you normally log in with Google/GitHub SSO, create a
 * separate Beeceptor account with email+password for this automation,
 * since SSO popups are harder to automate reliably.
 */
async function loginToBeeceptor(page, email, password) {
  await page.goto('https://app.beeceptor.com/login');

  // Fill the login form. Beeceptor's login page has simple email/password fields.
  await page.getByPlaceholder(/email/i).fill(email);
  await page.getByPlaceholder(/password/i).fill(password);

  await page.getByRole('button', { name: /log\s?in/i }).click();

  // After login, Beeceptor redirects to the dashboard / "My Endpoints" page.
  await page.waitForURL(/app\.beeceptor\.com/, { timeout: 20000 });
}

/**
 * Makes sure our mock endpoint exists.
 * If it's not in the endpoint list yet, this function creates it.
 * Returns once we are on that endpoint's dashboard page.
 */
async function openOrCreateEndpoint(page, endpointName) {
  await page.goto('https://app.beeceptor.com/console/setup');

  // Beeceptor's "create endpoint" box usually has an input for the subdomain name
  // and a "Create Endpoint" button. We try to create it - if it already exists,
  // Beeceptor will simply take us to its dashboard (or show a friendly message),
  // either way is fine for our test.
  const endpointInput = page.getByPlaceholder(/endpoint|subdomain|name/i).first();
  await endpointInput.fill(endpointName);

  await page.getByRole('button', { name: /create endpoint/i }).click();

  // Wait for the endpoint dashboard to load - the URL contains the endpoint name.
  await page.waitForURL(new RegExp(endpointName), { timeout: 20000 }).catch(() => {
    // If creation failed only because the endpoint already exists,
    // navigate to it directly as a fallback.
  });

  await page.goto(`https://app.beeceptor.com/console/dashboard/${endpointName}`);
}

module.exports = {
  loginToBeeceptor,
  openOrCreateEndpoint,
};
