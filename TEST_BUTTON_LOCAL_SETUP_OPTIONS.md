# Test Button Local Setup - Two Valid Options

## Current Situation
You're trying to run the test button locally, but the backend is deployed as AWS Lambda functions via CDK, not a traditional Node.js dev server. There's no `npm run dev` script in the backend.

## Option A: Test Against Deployed Backend (Recommended for Most Users)

This is the **easiest and recommended approach**. Your backend is already deployed to AWS.

### Steps:
1. Open `packages/backend/test-button.html` in your browser
2. Select the appropriate environment from the dropdown:
   - **Development**: `https://api-dev.misra.digitransolutions.in`
   - **Staging**: `https://api-staging.misra.digitransolutions.in`
   - **Production**: `https://api.misra.digitransolutions.in`
3. Click "Run Test"

### Requirements:
- Backend must be deployed to AWS (already done)
- TEST_MODE_ENABLED=true environment variable set on Lambda functions
- Network access to the deployed backend

### Troubleshooting:
- If you get `net::ERR_NAME_NOT_RESOLVED`: The domain doesn't exist or isn't deployed
- If you get CORS errors: Backend CORS headers may need adjustment
- Check CloudWatch logs for backend errors

---

## Option B: Deploy Backend Locally (Advanced)

This approach deploys the backend locally using AWS SAM CLI or CDK.

### Prerequisites:
- AWS SAM CLI installed: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html
- Docker running (SAM uses Docker to run Lambda functions locally)
- AWS credentials configured locally

### Steps:

#### 1. Start Local Lambda Environment
```bash
cd packages/backend
sam local start-api --port 3001 --env-vars env.json
```

#### 2. Create env.json with Test Mode Enabled
```json
{
  "TestLoginFunction": {
    "TEST_MODE_ENABLED": "true",
    "ENVIRONMENT": "local",
    "COGNITO_USER_POOL_ID": "your-pool-id",
    "COGNITO_CLIENT_ID": "your-client-id"
  }
}
```

#### 3. Open Test Button
- Open `packages/backend/test-button.html` in your browser
- Select "Local Development" from environment dropdown
- Click "Run Test"

### Troubleshooting:
- If SAM fails to start: Ensure Docker is running
- If Lambda functions fail: Check CloudWatch logs in SAM output
- If CORS errors: SAM automatically adds CORS headers

---

## Which Option Should I Choose?

| Scenario | Option |
|----------|--------|
| I just want to test the application | **Option A** (Deployed Backend) |
| I'm developing backend code locally | **Option B** (Local SAM) |
| I want the fastest setup | **Option A** (Deployed Backend) |
| I need to debug Lambda functions | **Option B** (Local SAM) |
| I don't have Docker installed | **Option A** (Deployed Backend) |

---

## Current Test Button Features

The test button (`test-button.html`) includes:
- ✅ Environment switching (local, dev, staging, production)
- ✅ Automatic URL configuration
- ✅ Connectivity verification
- ✅ Step-by-step test execution
- ✅ Real-time output logging
- ✅ Error handling and troubleshooting

## Next Steps

1. **Choose your approach** (Option A or B)
2. **Follow the steps** for your chosen option
3. **Open the test button** in your browser
4. **Click "Run Test"** to execute the E2E test

---

## Files Involved

- **Test Button UI**: `packages/backend/test-button.html`
- **Backend Endpoint**: `packages/backend/src/functions/auth/test-login.ts`
- **CDK Stack**: `packages/backend/src/infrastructure/misra-platform-stack.ts`
- **Environment Config**: `.env` or AWS Lambda environment variables

