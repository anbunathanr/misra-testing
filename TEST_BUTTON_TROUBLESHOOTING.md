# Test Button - Troubleshooting Guide

## Error: net::ERR_CONNECTION_REFUSED on :3001

This error means the test button is trying to connect to `http://localhost:3001` but nothing is listening on that port.

### Root Cause

The backend is not running. The backend is deployed via AWS CDK as Lambda functions, not as a local development server.

### Solution

You have two options:

## Option 1: Test Against Deployed Backend (Recommended)

This is the easiest approach - test against your development, staging, or production environment.

### Steps

1. **Open test button**
   ```bash
   cd packages/backend
   npx http-server -p 8080
   # Navigate to: http://localhost:8080/test-button.html
   ```

2. **Change environment from "Local Development" to "Development", "Staging", or "Production"**
   - Click the Environment dropdown
   - Select "Development", "Staging", or "Production"
   - URLs will auto-populate with correct endpoints

3. **Verify backend is deployed**
   - Ensure your backend is deployed to AWS with TEST_MODE_ENABLED=true
   - Check CloudWatch logs if test fails

4. **Run test**
   - Click "▶ Run Test" button

### Advantages
- No local setup required
- Tests against real infrastructure
- Fastest to get started

### Requirements
- Backend deployed to AWS
- TEST_MODE_ENABLED=true in environment variables
- Internet connection

---

## Option 2: Deploy Backend Locally (Advanced)

For local development and testing.

### Prerequisites
- Node.js and npm installed
- AWS CDK installed: `npm install -g aws-cdk`
- AWS credentials configured: `aws configure`

### Steps

1. **Build backend**
   ```bash
   cd packages/backend
   npm run build
   npm run synth
   ```

2. **Deploy to AWS**
   ```bash
   npm run deploy
   ```

   Or run locally with SAM CLI (requires SAM installed):
   ```bash
   sam local start-api
   ```

3. **Open test button**
   ```bash
   cd packages/backend
   npx http-server -p 8080
   # Navigate to: http://localhost:8080/test-button.html
   ```

4. **Configure for local**
   - Keep "Local Development (localhost:3000)" selected
   - Update Backend API URL to your local endpoint (e.g., http://localhost:3001)
   - Click "▶ Run Test" button

### Advantages
- Full control over backend
- Can debug locally
- No AWS deployment needed (with SAM CLI)

### Requirements
- Node.js and npm
- AWS CDK
- AWS credentials (for deployment)
- SAM CLI (for local Lambda execution)

---

## Common Errors and Fixes

### Error: net::ERR_CONNECTION_REFUSED

**Cause:** Backend not running on the specified port

**Fix:**
1. Verify backend is deployed (Option 1) or running locally (Option 2)
2. Check port number is correct (default: 3001 for local)
3. Check firewall isn't blocking the port

### Error: Failed to get test credentials: 403

**Cause:** TEST_MODE_ENABLED not set or environment is production

**Fix:**
1. Verify TEST_MODE_ENABLED=true in environment variables
2. Ensure ENVIRONMENT is not "production"
3. Restart backend after changing variables

### Error: Invalid response from test-login endpoint

**Cause:** Endpoint not returning expected response format

**Fix:**
1. Verify `/auth/test-login` endpoint exists
2. Check endpoint returns both `accessToken` and `testOtp`
3. Review backend logs for errors

### Error: CORS error in browser console

**Cause:** Backend not configured for CORS

**Fix:**
1. Verify backend has CORS headers configured
2. Use local web server instead of file:// protocol
3. Check browser console for detailed error

---

## Quick Diagnosis

### Is backend running?

**Check if port 3001 is listening:**
```bash
# Windows PowerShell
netstat -ano | findstr :3001

# macOS/Linux
lsof -i :3001
```

If nothing shows up, backend is not running.

### Is backend deployed?

**Check AWS Lambda functions:**
```bash
aws lambda list-functions --region us-east-1
```

Look for functions related to your MISRA platform.

### Is TEST_MODE_ENABLED?

**Check environment variables:**
```bash
# For deployed Lambda
aws lambda get-function-configuration --function-name <function-name> --region us-east-1 | grep TEST_MODE_ENABLED
```

---

## Recommended Workflow

1. **For Quick Testing**: Use Option 1 (test against deployed backend)
   - Fastest to get started
   - No local setup required
   - Tests real infrastructure

2. **For Development**: Use Option 2 (deploy locally)
   - Full control over backend
   - Can debug issues
   - Iterate quickly

3. **For CI/CD**: Integrate test button into automated testing
   - Run tests automatically
   - Verify deployments
   - Catch regressions

---

## Next Steps

1. Choose your approach (Option 1 or 2)
2. Follow the setup steps
3. Open test button in browser
4. Select environment and run test
5. Check output for success/failure

If you still have issues, check the browser console (F12) for detailed error messages.
