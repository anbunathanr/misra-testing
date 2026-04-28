# E2E Testing - Next Steps

## Current Status
✅ E2E automation test suite is complete and ready to run
✅ Quick Verification test has been made resilient with multiple selector fallbacks
✅ All dependencies installed (@playwright/test, imapflow, dotenv-cli)
✅ Playwright browsers installed

## What You Need to Do Now

### Step 1: Create `.env.test` Configuration File
Copy `.env.test.example` to `.env.test` and fill in your values:

```bash
cp .env.test.example .env.test
```

Then edit `.env.test` with:
- `TEST_EMAIL`: Your Gmail test account
- `TEST_PASSWORD`: Your Gmail password
- `IMAP_USER`: Your Gmail address
- `IMAP_PASS`: Your Gmail App Password (get from https://myaccount.google.com/apppasswords)
- `BASE_URL`: Either `https://misra.digitransolutions.in` (if deployed) OR `http://localhost:3000` (if running locally)

### Step 2: Deploy or Run Locally
Choose ONE:

**Option A: Deploy to misra.digitransolutions.in**
- Deploy the frontend and backend to production
- Update `BASE_URL=https://misra.digitransolutions.in` in `.env.test`

**Option B: Run Locally**
- Start backend: `npm run dev` in `packages/backend`
- Start frontend: `npm run dev` in `packages/frontend`
- Update `BASE_URL=http://localhost:3000` in `.env.test`

### Step 3: Run Quick Verification Test
```bash
npm run test:e2e:quick
```

This will:
- Navigate to your site
- Check if it's accessible
- Look for login button with multiple selector fallbacks
- Show debugging output if elements aren't found
- Complete in ~10 seconds

### Step 4: Run Full E2E Test (Optional)
Once Quick Verification passes:
```bash
npm run test:e2e:full
```

This will:
- Login automatically with your test credentials
- Extract OTP from Gmail automatically (via IMAP)
- Upload a C file
- Trigger MISRA analysis
- Wait for analysis to complete
- Verify compliance report
- Complete in ~2-3 minutes

## Available Commands
```bash
npm run test:e2e              # Run all tests
npm run test:e2e:quick        # Quick verification only
npm run test:e2e:full         # Full workflow test
npm run test:e2e:headed       # Run with browser visible
npm run test:e2e:debug        # Debug mode with step-by-step execution
npm run test:e2e:report       # View HTML test report
```

## Troubleshooting

**Quick Verification shows "Login button not found"**
- Site isn't deployed yet OR has different UI structure
- Check `BASE_URL` in `.env.test` is correct
- Check site is actually running at that URL

**Full test fails at OTP extraction**
- IMAP credentials are wrong
- Check Gmail App Password is correct (not regular password)
- Ensure IMAP is enabled in Gmail settings

**Tests timeout**
- Site is slow to respond
- Increase timeout values in test file if needed
- Check network connectivity

## What the Tests Do

**Quick Verification (10 seconds)**
- Navigates to site
- Checks if accessible
- Finds login button
- Shows debugging info if elements missing

**Full Workflow (2-3 minutes)**
- Logs in with email/password
- Extracts OTP from Gmail automatically
- Uploads C file
- Runs MISRA analysis
- Waits for completion
- Verifies compliance report

## Next: Deployment
Once tests pass locally, you can:
1. Deploy to production
2. Update `BASE_URL` to production URL
3. Run tests against production
4. Set up CI/CD pipeline to run tests automatically
