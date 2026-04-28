# E2E Automation Testing for MISRA Platform

Complete end-to-end automation testing suite for `misra.digitransolutions.in`

## 🎯 What This Does

Fully automated testing that:
- ✅ Logs in with email/password
- ✅ Extracts OTP from Gmail automatically (no manual intervention)
- ✅ Uploads C/C++ files
- ✅ Triggers MISRA compliance analysis
- ✅ Waits for analysis to complete
- ✅ Verifies compliance report
- ✅ Extracts compliance score and violations
- ✅ Generates detailed test reports

## 🚀 Quick Start (5 minutes)

### 1. Install Dependencies
```bash
npm install --save-dev @playwright/test imapflow dotenv-cli
```

### 2. Set Up Gmail App Password
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Factor Authentication
3. Find "App passwords" → Select "Mail" and "Windows Computer"
4. Copy the 16-character password

### 3. Configure Environment
```bash
cp .env.test.example .env.test
```

Edit `.env.test`:
```env
TEST_EMAIL=your-email@gmail.com
TEST_PASSWORD=your-password
IMAP_USER=your-email@gmail.com
IMAP_PASS=your-16-char-app-password
BASE_URL=https://misra.digitransolutions.in
```

### 4. Run Tests
```bash
# Quick verification (30 seconds)
npm run test:e2e -- -g "Quick Verification"

# Full workflow (2-3 minutes)
npm run test:e2e -- -g "Complete MISRA Analysis"

# See browser (headed mode)
npm run test:e2e:headed

# View results
npm run test:e2e:report
```

## 📋 Test Scenarios

### Scenario 1: Complete MISRA Analysis Workflow

**Duration:** 2-3 minutes

**Steps:**
1. Navigate to login page
2. Enter email address
3. Enter password
4. Wait for OTP email
5. Extract OTP automatically from Gmail
6. Enter OTP
7. Verify login success
8. Navigate to file upload
9. Upload sample C file
10. Click "Analyze MISRA Compliance"
11. Wait for analysis to complete (polling)
12. Verify compliance report is displayed
13. Extract compliance score
14. Verify violations table

**Expected Result:**
```
✅ Login successful
✅ OTP extracted: 123456
✅ File uploaded: test_sample.c
✅ Analysis triggered
✅ Analysis completed in 28.5s
✅ Compliance Score: 72%
✅ Violations found: 8
✅ Test passed
```

### Scenario 2: Quick Verification Test

**Duration:** 30 seconds

**Steps:**
1. Navigate to site
2. Verify site is accessible
3. Check login button is visible
4. Check upload section is visible

**Expected Result:**
```
✅ Site is accessible
✅ Login button visible
✅ Upload section visible
✅ Quick verification passed
```

## 🔧 OTP Extraction Methods

### Method 1: IMAP (Recommended)

**How it works:**
- Connects to Gmail IMAP server
- Fetches latest email from inbox
- Extracts 6-digit OTP using regex
- Returns OTP code

**Advantages:**
- ✅ More reliable
- ✅ No UI dependencies
- ✅ Faster (5-10 seconds)
- ✅ Works with any email provider

**Setup:**
1. Enable 2FA on Gmail
2. Generate App Password
3. Set IMAP_USER and IMAP_PASS in .env.test

### Method 2: Playwright UI Scraping (Fallback)

**How it works:**
- Opens Gmail in new browser tab
- Waits for inbox to load
- Clicks latest email
- Extracts OTP from email body
- Returns OTP code

**Advantages:**
- ✅ No additional setup
- ✅ Visual verification possible
- ✅ Works with Gmail UI

**Disadvantages:**
- ❌ Slower (15-20 seconds)
- ❌ Brittle (UI changes break it)
- ❌ Requires Gmail to be accessible

## 📊 Test Reports

After running tests, view detailed reports:

```bash
npm run test:e2e:report
```

Reports include:
- ✅ Test execution timeline
- ✅ Screenshots of each step
- ✅ Video recordings (on failure)
- ✅ Detailed logs
- ✅ Performance metrics

## 🔍 Troubleshooting

### OTP Not Found

**Error:** `OTP not found in email`

**Solutions:**
1. Verify email is being sent to correct address
2. Check OTP format is 6 digits
3. Verify email arrives within 2 minutes
4. Check IMAP credentials are correct
5. Try UI scraping method instead

**Debug:**
```bash
npm run test:e2e:headed  # See what's happening
```

### Login Fails

**Error:** `Login button not found`

**Solutions:**
1. Verify credentials in .env.test
2. Check if login page URL changed
3. Run in headed mode to see UI
4. Update selectors if UI changed

**Debug:**
```bash
npm run test:e2e:debug  # Step through test
```

### Analysis Timeout

**Error:** `Analysis did not complete within timeout period`

**Solutions:**
1. Increase timeout (currently 2 minutes)
2. Check if analysis is actually running
3. Verify file was uploaded successfully
4. Check backend logs for errors

**Edit timeout in `e2e-automation.spec.ts`:**
```typescript
const maxWaitTime = 180000; // 3 minutes
```

### IMAP Connection Failed

**Error:** `IMAP connection failed`

**Solutions:**
1. Verify Gmail App Password is correct
2. Check 2FA is enabled on Gmail account
3. Verify IMAP is enabled in Gmail settings
4. Try UI scraping method instead

**Enable IMAP in Gmail:**
1. Go to [Gmail Settings](https://mail.google.com/mail/u/0/#settings/fwdandpop)
2. Find "Forwarding and POP/IMAP"
3. Enable IMAP

## 🔐 Security Best Practices

⚠️ **Important:**

1. **Never commit .env.test with real credentials**
   ```bash
   echo ".env.test" >> .gitignore
   ```

2. **Use GitHub Secrets for CI/CD**
   ```yaml
   - run: npm run test:e2e
     env:
       TEST_EMAIL: ${{ secrets.TEST_EMAIL }}
       TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
       IMAP_PASS: ${{ secrets.IMAP_PASS }}
   ```

3. **Rotate Gmail App Password regularly**
   - Generate new password every 3 months
   - Delete old passwords

4. **Use test account, not production**
   - Create separate test email
   - Don't use personal email

5. **Store credentials securely**
   - Use password manager
   - Never share .env.test file

## 📈 Performance Metrics

Expected execution times:

| Step | Duration |
|------|----------|
| Login | 10-15s |
| OTP extraction | 5-10s |
| File upload | 5-10s |
| Analysis | 30-60s |
| Report verification | 5-10s |
| **Total** | **2-3 min** |

## 🔄 CI/CD Integration

### GitHub Actions

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

### GitLab CI

Create `.gitlab-ci.yml`:

```yaml
e2e-tests:
  image: mcr.microsoft.com/playwright:v1.40.0-focal
  script:
    - npm install
    - npm run test:e2e
  artifacts:
    paths:
      - playwright-report/
    when: always
  only:
    - schedules
    - web
```

## 📚 Advanced Configuration

### Custom Sample File

Edit `packages/backend/tests/e2e-automation.spec.ts`:

```typescript
sampleCFile: `
// Your custom C code here
#include <stdio.h>

int main(void) {
    printf("Hello World\\n");
    return 0;
}
`
```

### Multiple Test Accounts

Create separate .env files:
```bash
cp .env.test.example .env.test.account1
cp .env.test.example .env.test.account2
```

Run with specific account:
```bash
dotenv -e .env.test.account1 -- npm run test:e2e
```

### Custom Timeouts

Edit `e2e-automation.spec.ts`:

```typescript
// Increase analysis wait time to 5 minutes
const maxWaitTime = 300000;
```

### Parallel Execution

Edit `playwright.config.ts`:

```typescript
workers: 4,  // Run 4 tests in parallel
```

## 📞 Support

For issues or questions:

1. **Check troubleshooting section** above
2. **Run in debug mode:**
   ```bash
   npm run test:e2e:debug
   ```
3. **Check test reports:**
   ```bash
   npm run test:e2e:report
   ```
4. **Review logs in `playwright-report/`**

## 📝 Files Included

- `packages/backend/tests/e2e-automation.spec.ts` - Main test suite
- `packages/backend/playwright.config.ts` - Playwright configuration
- `packages/frontend/src/components/E2ETestButton.tsx` - UI test button
- `E2E_AUTOMATION_SETUP.md` - Detailed setup guide
- `QUICK_START_E2E_TESTING.md` - Quick start guide
- `.env.test.example` - Environment template

## 🎓 Next Steps

1. ✅ Follow Quick Start guide
2. ✅ Run quick verification test
3. ✅ Run full workflow test
4. ✅ Check test report
5. ✅ Integrate into CI/CD pipeline
6. ✅ Set up daily scheduled tests

## 📄 License

This automation test suite is part of the MISRA Platform project.

---

**Happy Testing! 🚀**
