# Test Button Setup - Corrected Instructions

## Issue Found

The initial quick start guide had incorrect instructions. The backend doesn't have a `dev` script because it's designed to be deployed via AWS CDK, not run as a local development server.

## Correct Setup Approaches

### Approach A: Test Against Deployed Backend (Recommended)

**Best for**: Testing against development, staging, or production environments

**Steps:**
1. Ensure backend is deployed to AWS with TEST_MODE_ENABLED=true
2. Open test button via local web server:
   ```bash
   cd packages/backend
   npx http-server -p 8080
   # Navigate to: http://localhost:8080/test-button.html
   ```
3. Select environment from dropdown (Development, Staging, or Production)
4. URLs auto-populate with correct endpoints
5. Click "▶ Run Test" button

**Advantages:**
- No local setup required
- Tests against real deployed infrastructure
- Fastest to get started

**Requirements:**
- Backend deployed to AWS
- TEST_MODE_ENABLED=true in environment variables
- Internet connection

### Approach B: Deploy Backend Locally (Advanced)

**Best for**: Local development and testing without AWS deployment

**Steps:**
1. Build backend:
   ```bash
   cd packages/backend
   npm run build
   npm run synth
   ```

2. Deploy to AWS (or run locally with SAM CLI):
   ```bash
   # Option 1: Deploy to AWS
   npm run deploy
   
   # Option 2: Run locally with SAM CLI (requires SAM installed)
   sam local start-api
   ```

3. Open test button:
   ```bash
   cd packages/backend
   npx http-server -p 8080
   # Navigate to: http://localhost:8080/test-button.html
   ```

4. Configure for local:
   - Select "Local Development (localhost:3000)" from dropdown
   - Update Backend API URL to your local endpoint
   - Click "▶ Run Test" button

**Advantages:**
- Full control over backend
- Can debug locally
- No AWS deployment needed (with SAM CLI)

**Requirements:**
- Node.js and npm installed
- AWS CDK installed (for deployment)
- AWS credentials configured (for deployment)
- SAM CLI installed (for local Lambda execution)

## What Changed

### Before (Incorrect)
```bash
npm run dev -- --port 3001  # ❌ This script doesn't exist
```

### After (Correct)
```bash
npm run build
npm run synth
npm run deploy  # Deploy to AWS
# OR
sam local start-api  # Run locally
```

## Backend Architecture

The backend is built with:
- **AWS Lambda** - Serverless compute
- **AWS CDK** - Infrastructure as Code
- **TypeScript** - Type-safe code
- **AWS Services** - DynamoDB, S3, Cognito, etc.

It's not designed to run as a traditional Node.js dev server. Instead, it's deployed as Lambda functions via CDK.

## Available npm Scripts

```json
{
  "build": "tsc && node esbuild.lambda.js",
  "build:lambdas": "node esbuild.lambda.js",
  "test": "jest",
  "test:misra": "ts-node run-misra-test.ts",
  "test:misra:headless": "HEADLESS=true ts-node run-misra-test.ts",
  "test:misra:debug": "HEADLESS=false ts-node run-misra-test.ts",
  "lint": "eslint src --ext ts --report-unused-disable-directives --max-warnings 0",
  "deploy": "npm run build && cdk deploy",
  "synth": "npm run build && cdk synth"
}
```

## Recommended Workflow

1. **For Quick Testing**: Use Approach A (test against deployed backend)
2. **For Development**: Use Approach B (deploy locally or to AWS)
3. **For CI/CD**: Integrate test button into automated testing pipeline

## Documentation Files

- `TEST_BUTTON_QUICK_START.md` - Quick reference with correct setup
- `MISRA_E2E_TEST_BUTTON_GUIDE.md` - Comprehensive guide with all details
- `test-button.html` - The actual test button UI
- `packages/backend/src/functions/auth/test-login.ts` - Backend endpoint

## Next Steps

1. Choose your approach (A or B)
2. Follow the correct setup instructions
3. Open test button in browser
4. Select environment and run test
5. Check output for success/failure

All documentation has been updated with correct instructions.
