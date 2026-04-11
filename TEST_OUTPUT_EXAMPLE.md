# Test Output Example

## Successful Test Run

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

## Failed Test Run (Login Error)

```
========================================
MISRA Compliance E2E Test Started
========================================

[TEST] Step 1: Getting test credentials from backend...
[TEST] ✗ Failed to get test credentials: 403 Forbidden

✗ Test failed: Failed to get test credentials: 403 Forbidden
========================================

Error: TEST_MODE_ENABLED not set or test-login endpoint not deployed
```

**Solution**: 
- Set `export TEST_MODE_ENABLED=true`
- Deploy test-login Lambda function
- Check Cognito configuration

---

## Failed Test Run (File Upload Error)

```
========================================
MISRA Compliance E2E Test Started
========================================

[TEST] Step 1: Getting test credentials from backend...
[TEST] ✓ Got access token and OTP: 654321
[TEST] Step 2: Launching browser...
[TEST] ✓ Browser launched
[TEST] Step 3: Navigating to login page...
[TEST] ✓ Login page loaded
[TEST] Step 4: Performing login...
[TEST] ✓ OTP entered: 654321
[TEST] ✓ Login successful, dashboard loaded
[TEST] Step 5: Uploading C file...
[TEST] ✗ Test failed: File input not found

✗ Test failed: File input not found
========================================

Screenshot saved to test-failure.png
```

**Solution**:
- Check file upload component is rendered
- Verify file input selector matches your UI
- Check browser console for errors

---

## Failed Test Run (Analysis Timeout)

```
========================================
MISRA Compliance E2E Test Started
========================================

[TEST] Step 1: Getting test credentials from backend...
[TEST] ✓ Got access token and OTP: 789012
[TEST] Step 2: Launching browser...
[TEST] ✓ Browser launched
[TEST] Step 3: Navigating to login page...
[TEST] ✓ Login page loaded
[TEST] Step 4: Performing login...
[TEST] ✓ OTP entered: 789012
[TEST] ✓ Login successful, dashboard loaded
[TEST] Step 5: Uploading C file...
[TEST] ✓ File uploaded
[TEST] Step 6: Triggering MISRA compliance analysis...
[TEST] ✓ Analysis started
[TEST] Step 7: Waiting for analysis completion...
[TEST] ✗ Test failed: Timeout waiting for analysis completion

✗ Test failed: Timeout waiting for analysis completion (120000ms)
========================================

Screenshot saved to test-failure.png
```

**Solution**:
- Increase timeout in test (currently 120 seconds)
- Check that analysis Lambda is deployed
- Verify SQS queue is processing messages
- Check CloudWatch logs for analysis errors

---

## HTML Button Output

When running from `test-button.html`:

```
========================================
MISRA Compliance E2E Test Started
========================================

[TEST] Step 1: Getting test credentials from backend...
[TEST] ✓ Got access token and OTP: 456789
[TEST] Step 2: Navigating to application...
[TEST] ✓ Application loaded
[TEST] Step 3: Uploading C file...
[TEST] ✓ File uploaded successfully
[TEST] Step 4: Triggering MISRA compliance analysis...
[TEST] ✓ Analysis started
[TEST] Step 5: Waiting for analysis completion...
[TEST] ✓ Analysis completed
[TEST] Step 6: Verifying compliance report...
[TEST] ✓ Compliance score: 92%
[TEST] ✓ Violations found: 3
[TEST] ✓ Screenshot saved

========================================
✓ All tests passed successfully!
========================================
```

**Status Badge**: Changes from "Running" → "Success" (green)

---

## CLI Output

When running `npm run test:misra`:

```
$ npm run test:misra

> @misra-platform/backend@1.0.0 test:misra
> ts-node run-misra-test.ts

========================================
MISRA Compliance E2E Test Runner
========================================

Configuration:
  Mode: normal
  Headless: true
  App URL: https://misra.digitransolutions.in
  Backend URL: https://api.misra.digitransolutions.in
  Test Mode Enabled: true

========================================
MISRA Compliance E2E Test Started
========================================

[TEST] Step 1: Getting test credentials from backend...
[TEST] ✓ Got access token and OTP: 234567
[TEST] Step 2: Launching browser...
[TEST] ✓ Browser launched
[TEST] Step 3: Navigating to login page...
[TEST] ✓ Login page loaded
[TEST] Step 4: Performing login...
[TEST] ✓ OTP entered: 234567
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

## Playwright Test Output

When running `npx playwright test`:

```
$ npx playwright test packages/backend/src/__tests__/integration/misra-compliance-e2e.test.ts

Running 1 test using 1 worker

  MISRA Compliance E2E Test
    ✓ Complete MISRA Compliance Analysis Workflow (45s)

  1 passed (45s)
```

---

## Debug Mode Output

When running `npm run test:misra:debug`:

```
$ npm run test:misra:debug

> @misra-platform/backend@1.0.0 test:misra:debug
> HEADLESS=false ts-node run-misra-test.ts

========================================
MISRA Compliance E2E Test Runner
========================================

Configuration:
  Mode: normal
  Headless: false
  App URL: https://misra.digitransolutions.in
  Backend URL: https://api.misra.digitransolutions.in
  Test Mode Enabled: true

[Browser window opens and you can see the test executing]

========================================
MISRA Compliance E2E Test Started
========================================

[TEST] Step 1: Getting test credentials from backend...
[TEST] ✓ Got access token and OTP: 567890
[TEST] Step 2: Launching browser...
[TEST] ✓ Browser launched
[TEST] Step 3: Navigating to login page...
[TEST] ✓ Login page loaded
[TEST] Step 4: Performing login...
[TEST] ✓ OTP entered: 567890
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

## CI/CD Output (GitHub Actions)

```
Run npm run test:misra:headless
  env:
    TEST_MODE_ENABLED: true
    ENVIRONMENT: staging

========================================
MISRA Compliance E2E Test Runner
========================================

Configuration:
  Mode: normal
  Headless: true
  App URL: https://misra.digitransolutions.in
  Backend URL: https://api.misra.digitransolutions.in
  Test Mode Enabled: true

========================================
MISRA Compliance E2E Test Started
========================================

[TEST] Step 1: Getting test credentials from backend...
[TEST] ✓ Got access token and OTP: 890123
[TEST] Step 2: Launching browser...
[TEST] ✓ Browser launched
[TEST] Step 3: Navigating to login page...
[TEST] ✓ Login page loaded
[TEST] Step 4: Performing login...
[TEST] ✓ OTP entered: 890123
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

✓ Test job completed successfully
```

---

## Screenshots Generated

### On Success
- `compliance-report.png` - Screenshot of the compliance report

### On Failure
- `test-failure.png` - Screenshot showing where the test failed

---

## Log Levels

### Success Indicators
- ✓ (checkmark) = Step completed successfully
- Green status badge = Test passed

### Error Indicators
- ✗ (X mark) = Step failed
- Red status badge = Test failed
- Error message = Specific failure reason

---

## Interpreting Results

### All Tests Passed
```
========================================
✓ All tests passed successfully!
========================================
```
✅ Everything worked! MISRA analysis pipeline is functioning correctly.

### Test Failed
```
✗ Test failed: [error message]
========================================
```
❌ Something went wrong. Check the error message and troubleshooting guide.

### Timeout
```
✗ Test failed: Timeout waiting for analysis completion
```
⏱️ Analysis took too long. Check Lambda deployment and SQS processing.

### Connection Error
```
✗ Test failed: Failed to get test credentials: 403 Forbidden
```
🔌 Backend test mode not enabled or endpoint not deployed.

---

## Next Steps

1. **If test passes**: ✅ Your MISRA pipeline is working!
2. **If test fails**: Check the error message and see troubleshooting guide
3. **For CI/CD**: Integrate into your pipeline using the examples provided

---

**Version**: 1.0.0
**Last Updated**: 2024
