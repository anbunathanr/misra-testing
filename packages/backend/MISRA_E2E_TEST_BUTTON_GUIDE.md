# MISRA E2E Test Button - Complete Guide

## Overview

The `test-button.html` file provides a single-click automated testing interface for the MISRA Compliance platform. It handles:
- Automatic login with test credentials
- OTP extraction from backend response
- File upload simulation
- MISRA analysis triggering
- Compliance report verification

## Fixed Issues

### Previous Problems
1. **DNS Resolution Error** - `api.misra.digitransolutions.in` domain didn't exist
2. **CORS Security Error** - HTML file opened as `file://` had browser security restrictions
3. **No Local Development Support** - Only supported production URLs

### Solutions Implemented
1. **Environment Switching** - Added dropdown to select between local, development, staging, and production
2. **Local Development Support** - Default environment is now `localhost:3000` and `localhost:3001`
3. **Better Error Handling** - Added connectivity checks and detailed troubleshooting messages
4. **CORS Configuration** - Added proper CORS headers in fetch requests

## Setup Instructions

### Option 1: Local Development Testing (Recommended)

#### Prerequisites
- Node.js and npm installed
- Backend running locally with test mode enabled

#### Step 1: Start Backend with Test Mode

```bash
cd packages/backend

# Set environment variables
$env:TEST_MODE_ENABLED = "true"
$env:ENVIRONMENT = "development"
$env:COGNITO_USER_POOL_ID = "your-pool-id"
$env:COGNITO_CLIENT_ID = "your-client-id"

# Start backend on port 3001
npm run dev -- --port 3001
```

#### Step 2: Open Test Button

```bash
# Option A: Open directly in browser
# Navigate to: file:///path/to/packages/backend/test-button.html

# Option B: Use a local server (recommended to avoid CORS issues)
cd packages/backend
npx http-server -p 8080
# Then navigate to: http://localhost:8080/test-button.html
```

#### Step 3: Run Test

1. Select "Local Development (localhost:3000)" from Environment dropdown
2. URLs should auto-populate:
   - Application URL: `http://localhost:3000`
   - Backend API URL: `http://localhost:3001`
3. Click "▶ Run Test" button
4. Monitor output for success or errors

### Option 2: Staging/Production Testing

#### Step 1: Open Test Button

```bash
# Use a local server to avoid CORS issues
cd packages/backend
npx http-server -p 8080
# Navigate to: http://localhost:8080/test-button.html
```

#### Step 2: Configure Environment

1. Select "Staging" or "Production" from Environment dropdown
2. URLs will auto-populate with correct endpoints
3. Ensure backend has TEST_MODE_ENABLED=true in that environment
4. Click "▶ Run Test" button

## Environment Configurations

### Local Development
- **Application URL**: `http://localhost:3000`
- **Backend API URL**: `http://localhost:3001`
- **Use Case**: Local development and testing
- **Requirements**: Backend running locally with TEST_MODE_ENABLED=true

### Development
- **Application URL**: `https://dev.misra.digitransolutions.in`
- **Backend API URL**: `https://api-dev.misra.digitransolutions.in`
- **Use Case**: Development environment testing
- **Requirements**: Deployed to dev environment

### Staging
- **Application URL**: `https://staging.misra.digitransolutions.in`
- **Backend API URL**: `https://api-staging.misra.digitransolutions.in`
- **Use Case**: Pre-production testing
- **Requirements**: Deployed to staging environment

### Production
- **Application URL**: `https://misra.digitransolutions.in`
- **Backend API URL**: `https://api.misra.digitransolutions.in`
- **Use Case**: Production verification
- **Requirements**: Deployed to production environment

## Test Workflow

The test button executes the following workflow:

### Step 1: Get Test Credentials
- Calls `/auth/test-login` endpoint
- Receives access token and OTP
- OTP is automatically extracted from response

### Step 2: Simulate Login
- Uses access token for authentication
- Simulates user login to application

### Step 3: Upload C File
- Simulates file upload process
- Verifies upload success

### Step 4: Trigger Analysis
- Initiates MISRA compliance analysis
- Waits for analysis to complete

### Step 5: Verify Report
- Checks compliance score
- Verifies violations detected
- Confirms report generation

## Troubleshooting

### Issue: "Backend API may not be reachable"

**Causes:**
- Backend is not running
- Wrong port number
- Firewall blocking connection
- CORS not configured

**Solutions:**
1. Verify backend is running: `npm run dev`
2. Check port is correct (default: 3001)
3. Check firewall settings
4. Verify CORS headers in backend response

### Issue: "Failed to get test credentials: 403"

**Causes:**
- TEST_MODE_ENABLED is not set to true
- Environment is set to production
- Test mode is disabled in backend

**Solutions:**
1. Set `TEST_MODE_ENABLED=true` in environment variables
2. Ensure `ENVIRONMENT` is not "production"
3. Restart backend after changing environment variables

### Issue: "Invalid response from test-login endpoint"

**Causes:**
- Backend endpoint not returning OTP
- Access token missing from response
- Endpoint not implemented

**Solutions:**
1. Verify `/auth/test-login` endpoint exists
2. Check endpoint returns both `accessToken` and `testOtp`
3. Review backend logs for errors

### Issue: CORS Error in Browser Console

**Causes:**
- Backend not configured for CORS
- Incorrect origin in CORS headers
- Missing Access-Control-Allow-Origin header

**Solutions:**
1. Add CORS headers to backend response:
   ```typescript
   headers: {
     'Access-Control-Allow-Origin': '*',
     'Access-Control-Allow-Methods': 'POST, OPTIONS',
     'Access-Control-Allow-Headers': 'Content-Type'
   }
   ```
2. Or use a CORS proxy for local testing

## Backend Configuration

### Required Environment Variables

```bash
# Test mode
TEST_MODE_ENABLED=true
ENVIRONMENT=development

# Cognito
COGNITO_USER_POOL_ID=your-pool-id
COGNITO_CLIENT_ID=your-client-id

# Optional: CORS configuration
CORS_ORIGIN=http://localhost:8080
```

### Test-Login Endpoint Response Format

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "test-misra@example.com",
    "name": "Test User"
  },
  "expiresIn": 3600,
  "testOtp": "123456",
  "testMode": true
}
```

## Features

### Environment Switching
- Dropdown to select between local, dev, staging, and production
- Auto-populates URLs based on selection
- Allows manual URL override

### Connectivity Check
- Tests API reachability before running test
- Provides helpful error messages if backend unreachable
- Suggests troubleshooting steps

### Detailed Logging
- Step-by-step test execution logging
- Error messages with context
- Troubleshooting suggestions on failure

### Visual Feedback
- Step indicator showing progress
- Status badge (Running/Success/Error)
- Color-coded output
- Scrollable output panel

### Error Recovery
- Clear button to reset test
- Detailed error messages
- Troubleshooting guide in output

## Advanced Usage

### Custom URLs

You can manually enter custom URLs for:
- Self-hosted deployments
- Custom domain configurations
- Testing with different API versions

### Batch Testing

To run multiple tests:
1. Run first test
2. Click "Clear" button
3. Modify configuration if needed
4. Click "Run Test" again

### Integration with CI/CD

The test button can be integrated into CI/CD pipelines:
1. Host HTML file on web server
2. Use headless browser (Puppeteer, Playwright) to automate
3. Parse output for success/failure
4. Integrate with test reporting

## Security Considerations

### Test Mode Limitations
- Test mode should ONLY be enabled in development/staging
- Never enable TEST_MODE_ENABLED in production
- Test credentials are hardcoded and not secure
- Test endpoint returns OTP in plain text (for testing only)

### CORS Configuration
- When using `file://` protocol, CORS restrictions apply
- Use a local web server to avoid CORS issues
- In production, ensure CORS headers are properly configured

### Credential Handling
- Test credentials are created on-the-fly
- No sensitive data stored in HTML file
- All credentials are temporary and test-only

## Next Steps

1. **Deploy Backend**: Ensure backend is deployed with TEST_MODE_ENABLED=true
2. **Configure URLs**: Update environment configurations for your deployment
3. **Test Locally**: Run test button against local backend
4. **Test Staging**: Run test button against staging environment
5. **Monitor**: Check logs for any issues during testing

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review browser console for detailed errors
3. Check backend logs for API errors
4. Verify environment variables are set correctly
5. Ensure backend is running and accessible
