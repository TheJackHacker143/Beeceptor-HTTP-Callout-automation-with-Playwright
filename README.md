# Beeceptor HTTP Callout — Playwright Automation

This project is a small, beginner-friendly Playwright automation that:

1. Logs in to [Beeceptor](https://beeceptor.com).
2. Creates a Beeceptor **HTTP Callout Rule** on a mock endpoint (via the dashboard UI).
3. Triggers that rule by sending a real HTTP request.
4. Verifies, from Beeceptor's request log, that the callout actually fired.
5. Cleans up the rule it created, so the endpoint is left clean after the test.

It is intentionally written in a **simple, readable style** — no fancy design
patterns, no Page Object classes, just clear functions and comments — so it's
easy to explain line-by-line in an interview.

---

## How an HTTP Callout works (quick recap)

A normal mock rule just replies to a request. An **HTTP Callout Rule** does
one extra thing: when a matching request comes in, Beeceptor can also fire
its **own** outgoing HTTP request ("the callout") to another URL — for
example, to simulate notifying a CRM or sending a webhook.

In this project, to keep things self-contained (no second server needed),
the callout points back at the **same** Beeceptor endpoint, just a different
path. That way we can see both the original request and the callout request
in one place — Beeceptor's request log.

```
Test  --POST /create-order-->  Beeceptor
                                   |
                                   |  (instant mock response sent back to test)
                                   |
                                   +--POST /order-callback-received--> (same endpoint, logged separately)
```

---

## Project structure

```
beeceptor-callout-test/
├── tests/
│   └── httpCallout.spec.js     # the actual test (the main file to read)
├── utils/
│   └── beeceptorHelpers.js     # small reusable login/setup helper functions
├── playwright.config.js        # Playwright settings (screenshots, video, etc.)
├── package.json
├── .env.example                 # copy this to .env and fill in your own values
└── README.md
```

---

## Setup instructions

### 1. Install dependencies

```bash
npm install
npx playwright install chromium
```

### 2. Create a Beeceptor account

Go to [https://beeceptor.com](https://beeceptor.com) and sign up using **email
+ password** (not Google/GitHub SSO — SSO popups are harder to automate
reliably with Playwright).

### 3. Configure environment variables

```bash
cp .env.example .env
```

Then open `.env` and fill in:

| Variable             | Description                                                          |
|----------------------|-----------------------------------------------------------------------|
| `BEECEPTOR_ENDPOINT` | Your mock server's subdomain name, e.g. `jagan-callout-demo`          |
| `BEECEPTOR_EMAIL`    | Your Beeceptor login email                                            |
| `BEECEPTOR_PASSWORD` | Your Beeceptor login password                                         |
| `TRIGGER_PATH`       | The path that triggers the callout rule (default `/create-order`)     |
| `CALLOUT_PATH`       | The path the callout is sent to (default `/order-callback-received`)  |

> The test will create the endpoint automatically if it doesn't already
> exist, so you don't need to manually create it on the Beeceptor website
> first.

---

## Running the tests

```bash
npm test                 # headless run
npm run test:headed      # see the browser while it runs (great for learning/demo)
npm run test:debug       # step through with Playwright Inspector
npm run report           # open the HTML report after a run
```

---

## What gets verified (assertions)

- The endpoint dashboard loads correctly after login.
- The new Callout rule appears in the rules list after saving.
- The triggering request gets an instant `200` response with the expected
  mock body.
- **The callout itself fired** — Beeceptor's request log shows a second,
  separate log entry on `CALLOUT_PATH`, proving the asynchronous callout was
  sent, not just the original request.
- The rule is removed at the end of the test (the rules list no longer shows
  it) — this confirms our cleanup step worked.

---

## Error handling & failure artifacts

- `playwright.config.js` is set up to automatically capture a **screenshot**,
  a **video**, and a **trace** whenever a step fails — open the HTML report
  (`npm run report`) to see exactly what the page looked like at the moment
  of failure.
- `tests/httpCallout.spec.js` checks required `.env` values up front and
  throws a clear error message instead of failing with a confusing selector
  error if `.env` was never configured.
- Each major step in the test uses `test.step(...)`, so when something fails,
  the test report tells you exactly which stage failed (e.g. "Save the new
  rule" vs. "Verify the HTTP Callout actually executed") instead of just
  pointing at a line number.

---

## A note on selectors (important, be ready to mention this in the interview)

Beeceptor's dashboard UI can change over time (new labels, redesigned forms,
etc.). This project follows **Playwright's recommended best practice** of
using **role-based and text-based locators** (`getByRole`, `getByLabel`,
`getByText`, `getByPlaceholder`) instead of brittle CSS classes or auto
generated IDs. This makes the test more resilient to small UI tweaks and,
just as importantly, makes the test code self-documenting — anyone reading
it can tell exactly what UI element it's interacting with.

If Beeceptor changes specific wording on a button or label, you'd only need
to update the matching string in one place — that's the benefit of keeping
selectors simple and readable rather than over-engineered.

---

## Why this design is interview-friendly

- **No Page Object Model / class hierarchies** — for a single-flow test like
  this, plain functions in `utils/` are easier to read and explain than a
  class-based abstraction. (You can mention you *know* POM and would
  introduce it if the suite grew to cover many flows.)
- **`test.step()` everywhere** — lets you narrate the test out loud, step by
  step, exactly the way the assignment is structured.
- **One test, one responsibility** — create → trigger → verify → clean up.
  Easy to reason about, easy to debug.
- **Real assertions, not just "it didn't crash"** — every step has an
  `expect()` that proves something specific happened.
