# Beeceptor HTTP Callout — Playwright Automation

This project automates the complete HTTP Callout workflow on Beeceptor using Playwright and JavaScript.

What this test does:
- Opens Beeceptor dashboard and logs in using session cookie
- Creates a new HTTP Callout Rule from the UI
- Triggers the rule by sending a real HTTP POST request
- Verifies the callout executed successfully (status 200)
- Cleans up after the test

---

## What is HTTP Callout?

When a request comes to Beeceptor, it can also fire one extra HTTP request to another URL automatically. This is called HTTP Callout.

For example - user places an order, Beeceptor receives it, gives response, and also notifies another system in background. That is HTTP Callout.

```
Your Test --> POST /create-order --> Beeceptor
                                         |
                                         +--> POST /order-callback-received (callout fires here)
```

---

## Project Structure

```
beeceptor-callout-test/
├── tests/
│   └── httpCallout.spec.js   # main test file - all automation logic is here
├── utils/
│   └── saveAuth.js           # helper to save beeceptor login session
├── playwright.config.js      # playwright settings
├── package.json
├── .env.example              # copy this to .env and fill your values
└── README.md
```

---

## Setup

### 1. Install dependencies

```bash
npm install
npx playwright install chromium
```

### 2. Create Beeceptor account and endpoint

- Go to https://beeceptor.com and create a free account
- Create one endpoint (example - jagan-playwright-test)

### 3. Get your session cookie

Beeceptor uses Google login so Playwright cannot automate it directly. We use session cookie instead.

- Open https://app.beeceptor.com in Chrome and login
- Press F12 and go to Application tab
- Click Cookies on left side
- Click https://app.beeceptor.com
- Find beesession and copy its value

### 4. Setup .env file

```bash
# windows
copy .env.example .env

# mac/linux
cp .env.example .env
```

Open .env and fill in your values:

| Variable | Description |
|----------|-------------|
| `BEECEPTOR_ENDPOINT` | your endpoint name (example - jagan-playwright-test) |
| `TRIGGER_PATH` | path that triggers the callout rule (default /create-order) |
| `CALLOUT_PATH` | path where callout will be sent (default /order-callback-received) |
| `BEESESSION` | your beesession cookie value from browser |

---

## Running the test

```bash
# run with browser visible (recommended for first time)
npm run test:headed

# run without browser
npm test

# debug mode - step by step
npm run test:debug

# open html report after run
npm run report
```

---

## What gets verified

- Beeceptor dashboard loads successfully after cookie injection
- New Callout Rule is created from the UI
- HTTP POST request returns status 200
- Rule is cleaned up after test

---

## Key decisions

**Cookie injection instead of login** - Beeceptor uses Google OAuth which Playwright cannot automate directly. So we save the session cookie manually and inject it into the browser. This is a common pattern for automating apps with OAuth login.

**JavaScript evaluate for form filling** - The callout rule form fields are inside a modal and not directly visible to Playwright. We use JavaScript evaluate with React native input setter to fill the values properly.

**Simple code structure** - No Page Object Model or complex design patterns. Just clear test steps with good comments so anyone can read and understand easily.
