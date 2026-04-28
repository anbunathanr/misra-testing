# E2E Automation Testing Setup for MISRA Platform

Complete guide to set up and run automated tests for `misra.digitransolutions.in`

## Overview

This automation test suite:
- ✅ Logs in automatically with email/password
- ✅ Extracts OTP from Gmail automatically (IMAP or UI scraping)
- ✅ Uploads C/C++ files
- ✅ Triggers MISRA analysis
- ✅ Waits for analysis completion
- ✅ Verifies compliance report
- ✅ Extracts compliance score and violations

## Prerequisites

### 1. Install Dependencies

```bash
npm install --save-dev @playwright/test imapflow
```

### 2. Gmail Setup (for OTP extraction)

#### Option A: Using Gmail App Password (Recommended - IMAP)

1. Enable 2-Factor Authentication on your Gmail account
2. Go to [Google Account Security](https://myaccount.google.com/security)
3. Find "App passwords" section
4. Select "Mail" and "Windows Computer"
5. Copy the generated 16-character password

#### Option B: Using Gmail UI (Fallback - Playwright)

No additional setup needed. The test will open Gmail in a browser and extract OTP from the UI.

## Configuration

### Environment Variables

Create a `.env.test` file in the project root:

```env
# Test Account Credentials
TEST_EMAIL=your-test-email@gmail.com
TEST_PASSWORD=your-test-password

# Gmail IMAP Configuration (for OTP extraction)
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
IMAP_USER=your-test-email@gmail.com
IMAP_PASS=your-16-char-app-password

# Target URL
BASE_URL=https://misra.digitransolutions.in
```

### Load Environment Variables

Add to `package.json` scripts:

```json
{
  "scripts": {
    "test:e2e": "dotenv -e .env.test -- npx playwright test",
    "test:e2e:headed": "dotenv -e .env.test -- npx playwright test --headed",
    "test:e2e:debug": "dotenv -e .env.test -- npx playwright test --debug",
    "test:e2e:report": "npx playwright show-report"
  }
}
```

Install dotenv-cli:

```bash
npm install --save-dev dotenv-cli
```

## Running Tests

### Run All Tests

```bash
npm run test:e2e
```

### Run Tests in Headed Mode (see browser)

```bash
npm run test:e2e:headed
```

### Run Specific Test

```bash
npx playwright test e2e-automation.spec.ts -g "Complete MISRA Analysis Workflow"
```

### Debug Mode

```bash
npm run test:e2e:debug
```

### View Test Report

```bash
npm run test:e2e:report
```

## Test Scenarios

### 1. Complete MISRA Analysis Workflow

**What it tests:**
- Login with email/password
- OTP extraction from Gmail
- File upload (C file)
- MISRA analysis trigger
- Analysis completion polling
- Compliance report verification
- Score extraction

**Expected Result:** ✅ All steps pass, compliance score displayed

### 2. Quick Verification Test

**What it tests:**
- Site accessibility
- Login button visibility
- Upload section visibility

**Expected Result:** ✅ All UI elements visible

## OTP Extraction Methods

### Method 1: IMAP (Recommended)

**Pros:**
- More reliable
- No UI dependencies
- Faster
- Works with any email provider

**Cons:**
- Requires Gmail App Password setup
- Requires IMAP access

**How it works:**
```typescript
// Connects to Gmail IMAP
// Fetches latest email
// Extracts 6-digit OTP using regex
// Returns OTP code
```

### Method 2: Playwright UI Scraping (Fallback)

**Pros:**
- No additional setup
- Works with Gmail UI
- Visual verification possible

**Cons:**
- Slower
- Brittle (UI changes break it)
- Requires Gmail to be accessible

**How it works:**
```typescript
// Opens Gmail in new tab
// Waits for inbox to load
// Clicks latest email
// Extracts OTP from email body
// Returns OTP code
```

## Troubleshooting

### OTP Not Found

**Problem:** "OTP not found in email"

**Solutions:**
1. Check email is being sent to correct address
2. Verify OTP format is 6 digits
3. Check email arrives within 2 minutes
4. Try UI scraping method instead of IMAP

### Login Fails

**Problem:** "Login button not found" or "Password field not found"

**Solutions:**
1. Verify credentials are correct
2. Check if login page URL changed
3. Run in headed mode to see what's happening: `npm run test:e2e:headed`
4. Update selectors if UI changed

### Analysis Timeout

**Problem:** "Analysis did not complete within timeout period"

**Solutions:**
1. Increase timeout in test (currently 2 minutes)
2. Check if analysis is actually running
3. Verify file was uploaded successfully
4. Check backend logs for errors

### IMAP Connection Failed

**Problem:** "IMAP connection failed"

**Solutions:**
1. Verify Gmail App Password is correct
2. Check 2FA is enabled on Gmail account
3. Verify IMAP is enabled in Gmail settings
4. Try UI scraping method instead

## Advanced Configuration

### Custom Timeouts

Edit `e2e-automation.spec.ts`:

```typescript
const maxWaitTime = 180000; // 3 minutes instead of 2
```

### Custom Sample File

Edit `e2e-automation.spec.ts`:

```typescript
sampleCFile: `
// Your custom C code here
`
```

### Multiple Test Accounts

Create separate `.env` files:
- `.env.test.account1`
- `.env.test.account2`

Run with:
```bash
dotenv -e .env.test.account1 -- npx playwright test
```

## CI/CD Integration

### GitHub Actions Example

Create `.github/workflows/e2e-tests.yml`:

```yaml
name: E2E Tests

on:
  schedule:
    - cron: '0 9 * * *'  # Daily at 9 AM
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm install
      - run: npx playwright install
      
      - run: npm run test:e2e
        env:
          TEST_EMAIL: ${{ secrets.TEST_EMAIL }}
          TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
          IMAP_USER: ${{ secrets.IMAP_USER }}
          IMAP_PASS: ${{ secrets.IMAP_PASS }}
          BASE_URL: https://misra.digitransolutions.in
      
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Performance Metrics

Expected test execution times:
- Login: 10-15 seconds
- OTP extraction: 5-10 seconds
- File upload: 5-10 seconds
- Analysis: 30-60 seconds (depends on file size)
- Report verification: 5-10 seconds

**Total: ~2-3 minutes per test run**

## Security Notes

⚠️ **Important:**
- Never commit `.env.test` with real credentials
- Use GitHub Secrets for CI/CD
- Rotate Gmail App Password regularly
- Use test account, not production account
- Store credentials securely

## Support

For issues or questions:
1. Check troubleshooting section above
2. Run in debug mode: `npm run test:e2e:debug`
3. Check Playwright reports: `npm run test:e2e:report`
4. Review test logs in `playwright-report/`

## Next Steps

1. Set up environment variables
2. Run quick verification test: `npm run test:e2e -- -g "Quick Verification"`
3. Run full workflow test: `npm run test:e2e`
4. Review reports and adjust as needed
5. Integrate into CI/CD pipeline
