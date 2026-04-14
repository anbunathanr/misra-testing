# Test Button Quick Start - Using Deployed Backend

## 5-Minute Setup

### Step 1: Open the Test Button
```
Open this file in your browser:
packages/backend/test-button.html
```

### Step 2: Select Your Environment
Choose from the dropdown:
- **Local Development** - localhost:3000 (requires local backend)
- **Development** - dev.misra.digitransolutions.in
- **Staging** - staging.misra.digitransolutions.in
- **Production** - misra.digitransolutions.in

### Step 3: Click "Run Test"
The test will:
1. ✅ Get test credentials from backend
2. ✅ Simulate login
3. ✅ Upload a C file
4. ✅ Trigger MISRA analysis
5. ✅ Verify results

### Step 4: Check Results
- **Green "Success"** = All tests passed
- **Red "Error"** = Check the error message and troubleshooting section below

---

## Common Issues & Fixes

### Issue: "net::ERR_NAME_NOT_RESOLVED"
**Cause**: The domain doesn't exist or isn't deployed

**Fix**:
1. Verify the backend is deployed to AWS
2. Check that the domain is correct
3. Try a different environment (dev/staging/production)

### Issue: "net::ERR_CONNECTION_REFUSED"
**Cause**: Backend is not running (for local development)

**Fix**:
1. If using "Local Development": Start the backend with SAM CLI
2. If using deployed environment: Check AWS Lambda functions are running
3. Verify network connectivity to the backend

### Issue: CORS Error
**Cause**: Browser blocked the request due to CORS policy

**Fix**:
1. Backend CORS headers may need adjustment
2. Check browser console for detailed error
3. Contact backend team to enable CORS for your domain

### Issue: "Test mode not enabled"
**Cause**: TEST_MODE_ENABLED environment variable is not set

**Fix**:
1. Set TEST_MODE_ENABLED=true on Lambda functions
2. Redeploy backend with this environment variable
3. Wait a few minutes for changes to take effect

---

## What the Test Does

The test button performs a complete E2E workflow:

```
1. Login
   └─ Calls /auth/test-login endpoint
   └─ Gets access token and OTP

2. Upload
   └─ Simulates file upload
   └─ Prepares C file for analysis

3. Analyze
   └─ Triggers MISRA compliance analysis
   └─ Waits for processing

4. Verify
   └─ Checks analysis results
   └─ Verifies compliance report
   └─ Confirms test passed
```

---

## Browser Console Debugging

If you encounter issues, check the browser console for detailed errors:

1. **Open Developer Tools**: F12 or Right-click → Inspect
2. **Go to Console tab**: See detailed error messages
3. **Check Network tab**: See API requests and responses
4. **Look for CORS errors**: Common in cross-domain requests

---

## Environment Variables Needed

For the backend to work, these must be set:

```
TEST_MODE_ENABLED=true
ENVIRONMENT=development|staging|production
COGNITO_USER_POOL_ID=your-pool-id
COGNITO_CLIENT_ID=your-client-id
```

---

## Next Steps

- ✅ Open test-button.html in browser
- ✅ Select environment
- ✅ Click "Run Test"
- ✅ Check results

If you need to test locally with a development backend, see `TEST_BUTTON_LOCAL_SETUP_OPTIONS.md` for Option B (Local SAM Setup).

