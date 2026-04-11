# MISRA Compliance E2E Test Application Guide

## Overview

This guide covers the automated end-to-end test application for MISRA compliance analysis. The test application automates the complete workflow: login → file upload → MISRA analysis → result verification.

## Features

✅ **Automated Login** - Uses backend test mode to get credentials and OTP automatically
✅ **File Upload** - Automatically uploads a sample C file
✅ **Analysis Trigger** - Triggers MISRA compliance analysis
✅ **Completion Wait** - Waits for analysis to complete (with timeout)
✅ **Report Verification** - Verifies compliance report and metrics
✅ **Multiple Execution Modes** - CLI, HTML UI, and programmatic API
✅ **Error Handling** - Screenshots on failure, detailed logging
✅ **CI/CD Ready** - Perfect for automated testing pipelines

## Architecture

### Components

1. **Backend Test Mode** (`test-login.ts`)
   - Lambda endpoint: `POST /auth/test-login`
   - Returns OTP directly in JSON response
   - Only enabled in development/staging
   - Auto-creates test users

2. **E2E Test Suite** (`misra-compliance-e2e.test.ts`)
   - Playwright-based browser automation
   - Automated workflow execution
   - Screenshot capture on failure
   - Detailed step-by-step logging

3. **CLI Test Runner** (`run-misra-test.ts`)
   - Command-line interface
   - Multiple execution modes
   - Environment variable configuration
   - Perfect for CI/CD integration

4. **HTML Test UI** (`test-button.html`)
   - Beautiful web interface
   - Single-click testing
   - Real-time output display
   - Configuration management

## Setup Instructions

### 1. Install Dependencies

```bash
cd packages/backend
npm install
npm install --save-dev @playwright/test
```

### 2. Configure Environment Variables

Create `.env` file in `packages/backend`:

```env
# Test Mode Configuration
TEST_MODE_ENABLED=true
ENVIRONMENT=development

# Application URLs
APP_URL=https://misra.digitransolutions.in
BACKEND_URL=https://api.misra.digitransolutions.in

# Cognito Configuration
COGNITO_USER_POOL_ID=your-user-pool-id
COGNITO_CLIENT_ID=your-client-id

# Playwright Configuration
PLAYWRIGHT_HEADLESS=true
```

### 3. Deploy Backend Test Mode

The test-login endpoint needs to be deployed as a Lambda function:

```bash
# Build Lambda functions
npm run build:lambdas

# Deploy CDK stack
cdk deploy
```

### 4. Update CDK Stack

Add the test-login function to your CDK stack:

```typescript
// In misra-platform-stack.ts
const testLoginFunction = new lambda.Function(this, 'TestLoginFunction', {
  runtime: lambda.Runtime.NODEJS_18_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset(path.join(__dirname, '../dist-lambdas/auth/test-login')),
  environment: {
    COGNITO_USER_POOL_ID: userPool.userPoolId,
    COGNITO_CLIENT_ID: userPoolClient.userPoolClientId,
    TEST_MODE_ENABLED: 'true',
    ENVIRONMENT: 'development',
  },
});

// Add to API Gateway
api.addRoute('POST', '/auth/test-login', testLoginFunction);
```

## Usage

### Option 1: HTML Test Button (Easiest)

1. Open `packages/backend/test-button.html` in your browser
2. Configure URLs (defaults are pre-filled)
3. Click "Run Test" button
4. Watch real-time output

```bash
# Or serve it locally
python -m http.server 8000
# Then open http://localhost:8000/packages/backend/test-button.html
```

### Option 2: CLI Test Runner

```bash
# Run with default settings (headless)
npm run test:misra

# Run with browser visible (debug mode)
npm run test:misra:debug

# Run in CI/CD mode (headless, no browser)
npm run test:misra:headless
```

### Option 3: Playwright Test Command

```bash
# Run tests directly
npx playwright test packages/backend/src/__tests__/integration/misra-compliance-e2e.test.ts

# Run with UI mode
npx playwright test --ui

# Run with debug mode
npx playwright test --debug
```

## Configuration

### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `APP_URL` | `https://misra.digitransolutions.in` | Frontend application URL |
| `BACKEND_URL` | `https://api.misra.digitransolutions.in` | Backend API URL |
| `TEST_MODE_ENABLED` | `false` | Enable backend test mode |
| `ENVIRONMENT` | `production` | Environment (development/staging/production) |
| `COGNITO_USER_POOL_ID` | - | Cognito user pool ID |
| `COGNITO_CLIENT_ID` | - | Cognito client ID |
| `PLAYWRIGHT_HEADLESS` | `true` | Run browser in headless mode |

### Test Credentials

The test application uses these credentials:

- **Email**: `test-misra@example.com`
- **Password**: `TestPassword123!`
- **OTP**: Generated automatically (6 digits)

## Test Workflow

### Step-by-Step Execution

1. **Get Test Credentials**
   - Calls `/auth/test-login` endpoint
   - Receives access token and OTP
   - No email parsing needed

2. **Navigate to Application**
   - Opens MISRA application in browser
   - Waits for login page to load

3. **Perform Login**
   - Enters test credentials
   - Enters OTP automatically
   - Waits for dashboard to load

4. **Upload C File**
   - Creates sample C file
   - Uploads to application
   - Waits for upload confirmation

5. **Trigger Analysis**
   - Clicks "Analyze MISRA Compliance" button
   - Waits for analysis to start

6. **Wait for Completion**
   - Polls for analysis completion
   - Timeout: 120 seconds
   - Checks for "completed" status

7. **Verify Report**
   - Extracts compliance score
   - Counts violations
   - Takes screenshot
   - Validates results

## Test Output Example

```
========================================
MISRA Compliance E2E Test Started
========================================

[TEST] Step 1: Getting test credentials from backend...
[TEST] ✓ Got access token and OTP: 123456
[TEST] Step 2: Navigating to login page...
[TEST] ✓ Login page loaded
[TEST] Step 3: Performing login...
[TEST] ✓ OTP entered: 123456
[TEST] ✓ Login successful, dashboard loaded
[TEST] Step 4: Uploading C file...
[TEST] ✓ File uploaded
[TEST] Step 5: Triggering MISRA compliance analysis...
[TEST] ✓ Analysis started
[TEST] Step 6: Waiting for analysis completion...
[TEST] ✓ Analysis completed
[TEST] Step 7: Verifying compliance report...
[TEST] ✓ Compliance score: 92%

========================================
✓ All tests passed successfully!
========================================
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: MISRA E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd packages/backend
          npm install
          npm install --save-dev @playwright/test
      
      - name: Run E2E tests
        env:
          APP_URL: ${{ secrets.APP_URL }}
          BACKEND_URL: ${{ secrets.BACKEND_URL }}
          TEST_MODE_ENABLED: 'true'
          ENVIRONMENT: 'staging'
        run: npm run test:misra:headless
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v2
        with:
          name: test-results
          path: |
            compliance-report.png
            test-failure.png
```

### GitLab CI Example

```yaml
misra-e2e-test:
  image: mcr.microsoft.com/playwright:v1.40.0-focal
  script:
    - cd packages/backend
    - npm install
    - npm run test:misra:headless
  artifacts:
    paths:
      - compliance-report.png
      - test-failure.png
    when: always
  only:
    - main
    - develop
```

## Troubleshooting

### Test Fails at Login

**Problem**: OTP not being entered correctly

**Solution**:
1. Check that test-login endpoint is deployed
2. Verify TEST_MODE_ENABLED=true in environment
3. Check Cognito user pool configuration
4. Review CloudWatch logs for errors

### Test Fails at File Upload

**Problem**: File input not found

**Solution**:
1. Verify file upload component is rendered
2. Check that file input selector matches your UI
3. Ensure file permissions are correct
4. Check browser console for errors

### Test Fails at Analysis

**Problem**: Analysis doesn't complete within timeout

**Solution**:
1. Increase timeout in test (currently 120 seconds)
2. Check that analysis Lambda is deployed
3. Verify SQS queue is processing messages
4. Check CloudWatch logs for analysis errors

### Screenshots Not Saving

**Problem**: Screenshot files not created

**Solution**:
1. Ensure write permissions in test directory
2. Check disk space availability
3. Verify Playwright has access to file system
4. Check test output for error messages

## Performance Metrics

Typical test execution times:

- **Login**: 5-10 seconds
- **File Upload**: 3-5 seconds
- **Analysis Trigger**: 2-3 seconds
- **Analysis Completion**: 30-60 seconds (depends on file size)
- **Report Verification**: 2-3 seconds
- **Total**: 45-90 seconds

## Security Considerations

### Test Mode Security

- Test mode is **disabled by default**
- Only enabled when `TEST_MODE_ENABLED=true`
- Only works in development/staging environments
- Production deployment blocks test mode
- OTP is returned only in test mode

### Best Practices

1. **Never enable test mode in production**
2. **Use separate test credentials**
3. **Rotate test passwords regularly**
4. **Monitor test mode usage in logs**
5. **Restrict test endpoint access**

## Advanced Usage

### Custom Test Scenarios

Modify `misra-compliance-e2e.test.ts` to add custom scenarios:

```typescript
test('Custom MISRA Analysis Scenario', async ({ browser }) => {
  // Your custom test logic here
});
```

### Programmatic API

Use the test application programmatically:

```typescript
import { test } from '@playwright/test';

// Run tests programmatically
const result = await test.run();
```

### Parallel Execution

Run multiple tests in parallel:

```bash
npx playwright test --workers=4
```

## Support and Debugging

### Enable Debug Logging

```bash
DEBUG=pw:api npm run test:misra:debug
```

### Generate Test Report

```bash
npx playwright test --reporter=html
```

### View Test Traces

```bash
npx playwright show-trace trace.zip
```

## Next Steps

1. Deploy test-login endpoint to your backend
2. Configure environment variables
3. Run test locally to verify setup
4. Integrate into CI/CD pipeline
5. Monitor test results and logs

## Additional Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Test API](https://playwright.dev/docs/api/class-test)
- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [Cognito Documentation](https://docs.aws.amazon.com/cognito/)

---

**Version**: 1.0.0
**Last Updated**: 2024
**Status**: Production Ready
