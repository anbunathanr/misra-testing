# MISRA Test Button - Complete Guide

## Overview

The MISRA test button is an automated E2E testing tool that validates the entire MISRA compliance analysis workflow. It's a single HTML file that can be opened in any browser.

**File**: `packages/backend/test-button.html`

---

## What It Does

The test button performs a complete end-to-end workflow:

```
1. Login
   ├─ Calls /auth/test-login endpoint
   ├─ Gets access token
   └─ Gets OTP for verification

2. Upload
   ├─ Simulates file upload
   ├─ Prepares C file
   └─ Validates upload

3. Analyze
   ├─ Triggers MISRA analysis
   ├─ Waits for processing
   └─ Monitors progress

4. Verify
   ├─ Checks analysis results
   ├─ Validates compliance report
   ├─ Verifies violations detected
   └─ Confirms test passed
```

---

## Quick Start (5 Minutes)

### Step 1: Open Test Button
```
File: packages/backend/test-button.html
Method: Open in any web browser
```

### Step 2: Select Environment
Choose from dropdown:
- **Local Development** - localhost:3000 (requires local backend)
- **Development** - dev.misra.digitransolutions.in
- **Staging** - staging.misra.digitransolutions.in
- **Production** - misra.digitransolutions.in

### Step 3: Click "Run Test"
Watch the test execute in real-time with step-by-step output.

### Step 4: Check Results
- ✅ **Green "Success"** = All tests passed
- ❌ **Red "Error"** = See error message and troubleshooting

---

## Two Ways to Use Test Button

### Option A: Test Against Deployed Backend (Recommended)

**Best for**: Most users, quick testing, no local setup

**Steps**:
1. Open `test-button.html` in browser
2. Select "Development", "Staging", or "Production"
3. Click "Run Test"

**Requirements**:
- Backend deployed to AWS ✓ (already done)
- TEST_MODE_ENABLED=true on Lambda functions
- Network access to deployed backend

**Pros**:
- ✅ No local setup needed
- ✅ Tests real deployed backend
- ✅ Fastest to get started
- ✅ Works from any machine

**Cons**:
- ❌ Can't debug backend code locally
- ❌ Depends on AWS deployment

---

### Option B: Deploy Backend Locally (Advanced)

**Best for**: Backend developers, debugging, local development

**Prerequisites**:
- AWS SAM CLI installed
- Docker running
- AWS credentials configured

**Steps**:
```bash
# 1. Start local Lambda environment
cd packages/backend
sam local start-api --port 3001

# 2. In another terminal, open test-button.html
# 3. Select "Local Development"
# 4. Click "Run Test"
```

**Pros**:
- ✅ Debug backend code locally
- ✅ No AWS deployment needed
- ✅ Fast iteration
- ✅ Full control

**Cons**:
- ❌ Requires Docker
- ❌ Requires SAM CLI installation
- ❌ Slower startup

---

## Common Issues & Solutions

### Issue 1: "net::ERR_NAME_NOT_RESOLVED"
```
Error: Failed to fetch from api-dev.misra.digitransolutions.in
```

**Cause**: Domain doesn't exist or isn't deployed

**Solutions**:
1. Verify backend is deployed to AWS
2. Check domain name is correct
3. Try different environment (staging/production)
4. Check DNS resolution: `nslookup api-dev.misra.digitransolutions.in`

---

### Issue 2: "net::ERR_CONNECTION_REFUSED"
```
Error: Failed to connect to localhost:3001
```

**Cause**: Backend not running locally

**Solutions**:
1. If using "Local Development": Start SAM CLI
   ```bash
   cd packages/backend
   sam local start-api --port 3001
   ```
2. If using deployed: Check AWS Lambda functions are running
3. Verify port 3001 is not in use: `netstat -an | grep 3001`

---

### Issue 3: CORS Error
```
Error: Access to XMLHttpRequest blocked by CORS policy
```

**Cause**: Browser blocked cross-origin request

**Solutions**:
1. Check backend CORS headers are set
2. Verify domain is whitelisted
3. Check browser console for detailed error
4. Try from different domain or localhost

---

### Issue 4: "Test mode not enabled"
```
Error: Test mode not enabled
```

**Cause**: TEST_MODE_ENABLED environment variable not set

**Solutions**:
1. Set TEST_MODE_ENABLED=true on Lambda functions
2. Redeploy backend: `cdk deploy`
3. Wait 2-3 minutes for changes to propagate
4. Check CloudWatch logs for confirmation

---

### Issue 5: "Missing script: dev"
```
npm error Missing script: "dev"
```

**Cause**: Trying to run `npm run dev` (doesn't exist)

**Explanation**: Backend is serverless (AWS Lambda), not a traditional Node.js app

**Solution**: Use Option A (deployed backend) or Option B (SAM CLI)

---

## Architecture Explanation

### Why No `npm run dev`?

The MISRA backend is **serverless architecture**:

```
Traditional Node.js:
npm run dev → Local dev server → Listens on port 3000

MISRA Serverless:
AWS CDK → Lambda functions → API Gateway → Public endpoints
```

### How It Works

1. **Source Code** → TypeScript functions
2. **Build** → Compiled JavaScript
3. **CDK** → Infrastructure as code
4. **Deploy** → AWS Lambda + API Gateway
5. **Run** → Automatically scaled, no server management

### Testing Options

| Method | Setup Time | Best For |
|--------|-----------|----------|
| Test Button + Deployed | 1 minute | Quick testing |
| Test Button + SAM CLI | 10 minutes | Local development |
| Playwright E2E Tests | 5 minutes | Automated testing |
| CLI Test Runner | 5 minutes | Manual testing |

---

## Test Button Features

### Configuration
- ✅ Environment switching (local, dev, staging, production)
- ✅ Custom URL configuration
- ✅ Automatic URL population

### Execution
- ✅ Step-by-step progress tracking
- ✅ Real-time output logging
- ✅ Connectivity verification
- ✅ Error handling and recovery

### Output
- ✅ Detailed test logs
- ✅ Status badges (running, success, error)
- ✅ Troubleshooting suggestions
- ✅ Clear pass/fail indication

---

## Files Involved

### Test Button
- **UI**: `packages/backend/test-button.html`
- **Documentation**: This file

### Backend
- **Test Endpoint**: `packages/backend/src/functions/auth/test-login.ts`
- **CDK Stack**: `packages/backend/src/infrastructure/misra-platform-stack.ts`
- **Build Config**: `packages/backend/tsconfig.json`

### Testing
- **E2E Tests**: `packages/backend/src/__tests__/integration/misra-compliance-e2e.test.ts`
- **CLI Runner**: `packages/backend/run-misra-test.ts`

---

## Step-by-Step Walkthrough

### Using Deployed Backend

```
1. Open test-button.html in browser
   └─ File → Open File → packages/backend/test-button.html

2. Select environment
   └─ Dropdown: Choose "Development" or "Staging"

3. Verify URLs are correct
   └─ App URL: https://dev.misra.digitransolutions.in
   └─ Backend URL: https://api-dev.misra.digitransolutions.in

4. Click "Run Test"
   └─ Watch progress in real-time

5. Check results
   └─ Green badge = Success
   └─ Red badge = Error (check message)

6. Review output
   └─ See detailed logs of each step
   └─ Check for any warnings or errors
```

### Using Local Backend (SAM CLI)

```
1. Install SAM CLI
   └─ https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html

2. Start local backend
   └─ cd packages/backend
   └─ sam local start-api --port 3001

3. Open test-button.html in browser
   └─ File → Open File → packages/backend/test-button.html

4. Select "Local Development"
   └─ URLs auto-populate to localhost:3000 and localhost:3001

5. Click "Run Test"
   └─ Watch progress in real-time

6. Check results
   └─ Green badge = Success
   └─ Red badge = Error (check message)
```

---

## Troubleshooting Checklist

- [ ] Test button HTML file exists: `packages/backend/test-button.html`
- [ ] Browser can open the file (no 404 errors)
- [ ] Environment is selected from dropdown
- [ ] URLs are correctly populated
- [ ] Backend is running (deployed or local SAM)
- [ ] TEST_MODE_ENABLED=true is set
- [ ] Network connectivity to backend verified
- [ ] Browser console shows no CORS errors
- [ ] CloudWatch logs show no Lambda errors
- [ ] Cognito user pool is accessible

---

## Next Steps

1. **Choose your approach**:
   - Option A: Use deployed backend (recommended)
   - Option B: Deploy locally with SAM CLI

2. **Open test button**: `packages/backend/test-button.html`

3. **Run test**: Click "Run Test" button

4. **Check results**: Verify success or debug errors

5. **Review logs**: Check CloudWatch for backend errors

---

## Additional Resources

- **Backend Architecture**: `BACKEND_ARCHITECTURE_EXPLAINED.md`
- **Setup Options**: `TEST_BUTTON_LOCAL_SETUP_OPTIONS.md`
- **Quick Start**: `TEST_BUTTON_QUICK_START_DEPLOYED.md`
- **E2E Test Guide**: `packages/backend/MISRA_E2E_TEST_GUIDE.md`

---

## Support

If you encounter issues:

1. **Check browser console**: F12 → Console tab
2. **Check CloudWatch logs**: AWS Console → CloudWatch → Logs
3. **Review error message**: Test button shows detailed errors
4. **Check troubleshooting section**: See "Common Issues & Solutions" above
5. **Review documentation**: See "Additional Resources" above

