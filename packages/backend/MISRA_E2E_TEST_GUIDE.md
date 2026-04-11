# MISRA Compliance E2E Test Guide

## Overview

This guide explains how to set up and run the automated end-to-end test for the MISRA compliance analysis workflow. The test automates the complete user journey:

1. **Login** with test credentials (OTP extracted from backend)
2. **Upload** a C file
3. **Trigger** MISRA compliance analysis
4. **Wait** for analysis completion
5. **Verify** the compliance report

## Architecture

### Backend Test Mode (`test-login.ts`)

A new Lambda endpoint that returns OTP directly in the response for testing:

```
POST /auth/test-login
{
  "email": "test@example.com",
  "password": "TestPassword123!",
  "testMode": true
}

Response:
{
  "accessToken": "...",
  "refreshToken": "...",
  "user": {...},
  "expiresIn": 3600,
  "testOtp": "123456",  // ← OTP for testing
  "testMode": true
}
```

**Features:**
- Only enabled in `development` or `staging` environments
- Controlled by `TEST_MODE_ENABLED` environment variable
- Generates random 6-digit OTP
- Returns OTP in response for automated extraction

### E2E Test Application (`misra-compliance-e2e.test.ts`)

Playwright-based test that automates the complete workflow:

```typescript
const test = new MisraComplianceE2ETest({
  baseUrl: 'https://misra.digitransolutions.in',
  testEmail: 'test@example.com',
  testPassword: 'TestPassword123!',
  backendUrl: 'https://api.misra.digitransolutions.in',
});

await test.runCompleteTest();
```

**Steps:**
1. Gets test credentials and OTP from backend
2. Launches Playwright browser
3. Navigates to login page
4. Enters credentials and OTP
5. Uploads sample C file
6. Clicks "Analyze MISRA Compliance" button
7. Waits for analysis completion
8. Verifies compliance report

### Test Runner (`run-misra-test.ts`)

CLI tool to execute the test with environment variables:

```bash
npm run test:misra
npm run test:misra:headless
npm run test:misra:debug
```

### Test Button UI (`test-button.html`)

Simple HTML interface with a "Test" button for manual testing:

- Configure URLs and credentials
- Run test with single click
- View real-time output
- Clear logs

## Setup Instructions

### 1. Install Dependencies

```bash
cd packages/backend
npm install
npm install playwright  # For browser automation
```

### 2. Enable Test Mode in Backend

Set environment variables:

```bash
# In .env or deployment config
ENVIRONMENT=development
TEST_MODE_ENABLED=true
```

Or update CDK stack:

```typescript
const testLoginFunction = new lambda.Function(this, 'TestLoginFunction', {
  runtime: lambda.Runtime.NODEJS_18_X,
  handler: 'test-login.handler',
  code: lambda.Code.fromAsset('dist/functions/auth'),
  environment: {
    TEST_MODE_ENABLED: 'true',
    ENVIRONMENT: 'development',
  },
});
```

### 3. Add API Gateway Route

Add route to API Gateway for test-login endpoint:

```typescript
const testLoginIntegration = new apigateway.LambdaIntegration(testLoginFunction);
api.root.addResource('auth').addResource('test-login').addMethod('POST', testLoginIntegration);
```

### 4. Configure Test Credentials

Create test user in DynamoDB (or let it auto-create):

```bash
# Test credentials
Email: test@example.com
Password: TestPassword123!
```

## Running Tests

### Option 1: CLI (Recommended for CI/CD)

```bash
# Run with default settings
npm run test:misra

# Run in headless mode (no browser UI)
npm run test:misra:headless

# Run with browser visible (debug mode)
npm run test:misra:debug

# Custom configuration
APP_URL=https://misra.digitransolutions.in \
BACKEND_URL=https://api.misra.digitransolutions.in \
TEST_EMAIL=test@example.com \
TEST_PASSWORD=TestPassword123! \
npm run test:misra
```

### Option 2: HTML Test Button

1. Open `test-button.html` in browser
2. Configure URLs and credentials
3. Click "Run Test" button
4. View real-time output

### Option 3: Programmatic

```typescript
import { MisraComplianceE2ETest } from './src/__tests__/integration/misra-compliance-e2e.test';

const test = new MisraComplianceE2ETest({
  baseUrl: 'https://misra.digitransolutions.in',
  testEmail: 'test@example.com',
  testPassword: 'TestPassword123!',
  backendUrl: 'https://api.misra.digitransolutions.in',
});

await test.runCompleteTest();
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_URL` | `https://misra.digitransolutions.in` | Frontend URL |
| `BACKEND_URL` | `https://api.misra.digitransolutions.in` | Backend API URL |
| `TEST_EMAIL` | `test@example.com` | Test account email |
| `TEST_PASSWORD` | `TestPassword123!` | Test account password |
| `HEADLESS` | `true` | Run browser in headless mode |
| `TEST_MODE_ENABLED` | `false` | Enable backend test mode |
| `ENVIRONMENT` | `production` | Environment (development/staging/production) |

## Test Output

### Success Output

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
[TEST] ✓ Email entered
[TEST] ✓ Password entered
[TEST] ✓ Login button clicked
[TEST] ✓ OTP input appeared
[TEST] ✓ OTP entered: 123456
[TEST] ✓ OTP verified
[TEST] ✓ Login successful, dashboard loaded
[TEST] Step 5: Uploading C file...
[TEST] ✓ Sample C file created
[TEST] ✓ File selected
[TEST] ✓ File uploaded
[TEST] Step 6: Triggering MISRA compliance analysis...
[TEST] ✓ Analysis button clicked
[TEST] ✓ Analysis started
[TEST] Step 7: Waiting for analysis completion...
[TEST] ✓ Analysis completed
[TEST] ✓ Compliance report loaded
[TEST] Step 8: Verifying compliance report...
[TEST] ✓ Report title found
[TEST] ✓ Violations found: 5
[TEST] ✓ Compliance score: 92%
[TEST] ✓ Compliance report verified successfully

========================================
✓ All tests passed successfully!
========================================
```

### Error Output

```
[TEST] ✗ Login failed: Timeout waiting for element
[TEST] Screenshot saved: /tmp/error-1234567890.png
```

## Troubleshooting

### Issue: "Test mode is not enabled"

**Solution:** Set `TEST_MODE_ENABLED=true` in environment variables

```bash
export TEST_MODE_ENABLED=true
npm run test:misra
```

### Issue: "Timeout waiting for element"

**Solution:** Increase timeout or check if selectors match your UI

```typescript
// In misra-compliance-e2e.test.ts
await this.page!.waitForSelector('button:has-text("Analyze MISRA Compliance")', { 
  timeout: 10000  // Increase timeout
});
```

### Issue: "File upload input not found"

**Solution:** Verify file upload input selector matches your HTML

```html
<!-- Expected HTML structure -->
<input type="file" accept=".c,.cpp,.h" />
```

### Issue: "OTP input not found"

**Solution:** OTP might not be required in test mode. Check if it's optional:

```typescript
try {
  await this.page!.waitForSelector('input[placeholder*="OTP"]', { timeout: 5000 });
  // Enter OTP
} catch {
  console.log('OTP input not found, continuing...');
}
```

## CI/CD Integration

### GitHub Actions

```yaml
name: MISRA E2E Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd packages/backend
          npm install
          npx playwright install
      
      - name: Run E2E test
        env:
          APP_URL: ${{ secrets.APP_URL }}
          BACKEND_URL: ${{ secrets.BACKEND_URL }}
          TEST_EMAIL: ${{ secrets.TEST_EMAIL }}
          TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
        run: npm run test:misra:headless
```

### AWS CodePipeline

```yaml
phases:
  install:
    commands:
      - cd packages/backend
      - npm install
      - npx playwright install
  
  test:
    commands:
      - npm run test:misra:headless
```

## Best Practices

1. **Use test accounts** - Create dedicated test accounts for automation
2. **Headless mode** - Use headless mode in CI/CD for faster execution
3. **Retry logic** - Implement retry logic for flaky tests
4. **Screenshots** - Capture screenshots on failure for debugging
5. **Timeouts** - Set appropriate timeouts for slow networks
6. **Cleanup** - Always cleanup resources (close browser, delete temp files)

## Performance

- **Average test duration:** 2-5 minutes
- **Network calls:** ~10-15 API calls
- **Browser memory:** ~200-300 MB
- **Disk space:** ~50 MB (for Playwright)

## Security Considerations

⚠️ **Important:** Test mode should ONLY be enabled in development/staging environments.

```typescript
// Only allow in development/staging
const isTestModeAllowed = process.env.ENVIRONMENT === 'development' || 
                          process.env.ENVIRONMENT === 'staging';

if (!isTestModeAllowed) {
  return errorResponse(403, 'TEST_MODE_DISABLED', 'Test mode is not enabled');
}
```

## Next Steps

1. Deploy test-login endpoint to backend
2. Configure test credentials in database
3. Run test locally: `npm run test:misra:debug`
4. Integrate into CI/CD pipeline
5. Monitor test results and failures

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review test output logs
3. Check browser screenshots in `/tmp`
4. Enable debug mode: `npm run test:misra:debug`
