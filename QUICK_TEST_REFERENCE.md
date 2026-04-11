# Quick Test Reference

## 🚀 Run Test in 3 Steps

### Step 1: Install Dependencies
```bash
cd packages/backend
npm install --save-dev @playwright/test
```

### Step 2: Enable Test Mode
```bash
export TEST_MODE_ENABLED=true
export ENVIRONMENT=development
```

### Step 3: Run Test

**Choose one:**

```bash
# Option A: HTML Button (Easiest - No CLI needed)
open packages/backend/test-button.html
# Then click "Run Test" button

# Option B: CLI Command
npm run test:misra

# Option C: CLI with Browser Visible
npm run test:misra:debug

# Option D: Playwright Direct
npx playwright test packages/backend/src/__tests__/integration/misra-compliance-e2e.test.ts
```

---

## 📋 What Gets Tested

✅ Login with automatic OTP extraction
✅ File upload (sample C file)
✅ MISRA analysis trigger
✅ Completion wait (up to 120 seconds)
✅ Compliance report verification
✅ Screenshots on success/failure

---

## 🔧 Configuration

Set these environment variables:

```bash
# Required
export TEST_MODE_ENABLED=true
export ENVIRONMENT=development

# Optional (defaults shown)
export APP_URL=https://misra.digitransolutions.in
export BACKEND_URL=https://api.misra.digitransolutions.in
export COGNITO_USER_POOL_ID=your-pool-id
export COGNITO_CLIENT_ID=your-client-id
```

---

## 📊 Expected Output

```
========================================
MISRA Compliance E2E Test Started
========================================

[TEST] Step 1: Getting test credentials from backend...
[TEST] ✓ Got access token and OTP: 123456
[TEST] Step 2: Launching browser...
[TEST] ✓ Browser launched
[TEST] Step 3: Navigating to login page...
[TEST] ✓ Login page loaded
[TEST] Step 4: Performing login...
[TEST] ✓ OTP entered: 123456
[TEST] ✓ Login successful, dashboard loaded
[TEST] Step 5: Uploading C file...
[TEST] ✓ File uploaded
[TEST] Step 6: Triggering MISRA compliance analysis...
[TEST] ✓ Analysis started
[TEST] Step 7: Waiting for analysis completion...
[TEST] ✓ Analysis completed
[TEST] Step 8: Verifying compliance report...
[TEST] ✓ Compliance score: 92%

========================================
✓ All tests passed successfully!
========================================
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Test fails at login | Check TEST_MODE_ENABLED=true and Cognito config |
| File upload fails | Verify file input selector matches your UI |
| Analysis times out | Increase timeout or check Lambda deployment |
| OTP not working | Verify test-login endpoint is deployed |
| Browser won't open | Try with --debug flag or check Playwright install |

---

## 📁 Files Created

```
packages/backend/
├── src/functions/auth/test-login.ts              ← Backend test mode
├── src/__tests__/integration/misra-compliance-e2e.test.ts  ← E2E tests
├── run-misra-test.ts                             ← CLI runner
├── test-button.html                              ← HTML UI
└── MISRA_E2E_TEST_GUIDE.md                       ← Full documentation
```

---

## 🔐 Security

- Test mode is **disabled by default**
- Only works in development/staging
- Never enable in production
- Controlled by `TEST_MODE_ENABLED` environment variable

---

## 📚 Full Documentation

See `packages/backend/MISRA_E2E_TEST_GUIDE.md` for:
- Detailed setup instructions
- CI/CD integration examples
- Advanced usage patterns
- Performance metrics
- Troubleshooting guide

---

## ✅ Status

**Ready to use!** All components are implemented and tested.

Start with the HTML button for easiest testing:
```bash
open packages/backend/test-button.html
```

Then click "Run Test" button!
