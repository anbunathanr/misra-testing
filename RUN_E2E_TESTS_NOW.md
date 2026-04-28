# Run E2E Tests - Quick Start

## 1. Setup (One-time)

```bash
# Copy environment template
cp .env.test.example .env.test

# Edit .env.test with your values:
# - TEST_EMAIL: your-test-email@gmail.com
# - TEST_PASSWORD: your-password
# - IMAP_USER: your-test-email@gmail.com
# - IMAP_PASS: Gmail App Password (from https://myaccount.google.com/apppasswords)
# - BASE_URL: https://misra.digitransolutions.in (or http://localhost:3000 if local)
```

## 2. Run Tests

### Quick Verification (10 seconds)
```bash
npm run test:e2e:quick
```
Checks if site is accessible and finds login button.

### Full Workflow (2-3 minutes)
```bash
npm run test:e2e:full
```
Complete flow: login → upload file → analyze → verify report.

### All Tests
```bash
npm run test:e2e
```

### With Browser Visible
```bash
npm run test:e2e:headed
```

### Debug Mode
```bash
npm run test:e2e:debug
```

### View Report
```bash
npm run test:e2e:report
```

## 3. What Happens

**Quick Verification:**
- ✅ Navigates to site
- ✅ Checks if accessible
- ✅ Finds login button
- ✅ Shows debugging info

**Full Workflow:**
- ✅ Logs in with email/password
- ✅ Extracts OTP from Gmail automatically
- ✅ Uploads C file
- ✅ Runs MISRA analysis
- ✅ Waits for completion
- ✅ Verifies compliance report

## 4. Troubleshooting

| Issue | Solution |
|-------|----------|
| "Login button not found" | Check BASE_URL in .env.test is correct and site is running |
| "OTP not found" | Check Gmail App Password is correct (not regular password) |
| Tests timeout | Site is slow; check network connectivity |
| "Element not found" | Site UI structure is different; update selectors in test file |

## 5. Next Steps

Once tests pass:
1. Deploy to production
2. Update BASE_URL to production URL
3. Run tests against production
4. Set up CI/CD to run tests automatically

---

**Status**: ✅ Ready to run
**Test File**: `packages/backend/tests/e2e-automation.spec.ts`
**Config**: `.env.test` (create from `.env.test.example`)
**Commands**: See above
