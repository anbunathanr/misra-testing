# Backend Architecture Explained

## Why There's No `npm run dev` Script

The MISRA platform backend is **not a traditional Node.js application**. It's a **serverless architecture** deployed on AWS Lambda.

### Traditional Node.js App
```
npm run dev
  ↓
Starts local dev server on port 3000
  ↓
Listens for HTTP requests
  ↓
Responds to requests
```

### MISRA Platform Backend (Serverless)
```
AWS CDK
  ↓
Deploys Lambda functions to AWS
  ↓
API Gateway routes requests to Lambda
  ↓
Lambda functions execute and respond
  ↓
No local dev server needed
```

---

## Architecture Overview

### Components

1. **AWS Lambda Functions**
   - Individual functions for each API endpoint
   - Deployed via AWS CDK
   - Automatically scaled by AWS
   - No server management needed

2. **API Gateway**
   - Routes HTTP requests to Lambda functions
   - Handles CORS, authentication, rate limiting
   - Provides public API endpoints

3. **DynamoDB**
   - Stores user data, files, analysis results
   - Serverless database (auto-scaling)

4. **S3**
   - Stores uploaded C files
   - Stores analysis reports

5. **Cognito**
   - User authentication and authorization
   - Manages user pools and tokens

### Deployment Flow

```
Source Code
    ↓
npm run build (compiles TypeScript)
    ↓
AWS CDK (infrastructure as code)
    ↓
CloudFormation (creates AWS resources)
    ↓
Lambda Functions (deployed and running)
    ↓
API Gateway (public endpoints)
    ↓
Ready to receive requests
```

---

## How to Run Backend Locally

### Option 1: Use Deployed Backend (Recommended)
- Backend is already running on AWS
- Just use the test button with deployed environment
- No local setup needed

### Option 2: Deploy Locally with SAM CLI
```bash
cd packages/backend
sam local start-api --port 3001
```

This starts a local Lambda environment that mimics AWS Lambda.

### Option 3: Deploy to AWS
```bash
cd packages/backend
npm run build
cdk deploy
```

This deploys the backend to your AWS account.

---

## File Structure

```
packages/backend/
├── src/
│   ├── functions/          # Lambda function handlers
│   │   ├── auth/           # Authentication endpoints
│   │   ├── analysis/       # MISRA analysis endpoints
│   │   ├── file/           # File upload endpoints
│   │   └── ...
│   ├── infrastructure/     # CDK stack definitions
│   │   └── misra-platform-stack.ts
│   ├── services/           # Business logic
│   └── types/              # TypeScript types
├── tsconfig.json           # TypeScript config
├── package.json            # Dependencies
└── cdk.json                # CDK config
```

---

## Available Scripts

```bash
# Build TypeScript
npm run build

# Run tests
npm run test

# Deploy to AWS
cdk deploy

# Deploy to AWS (specific stack)
cdk deploy MisraPlatformStack

# Destroy AWS resources
cdk destroy

# View CDK diff
cdk diff

# Synthesize CloudFormation template
cdk synth
```

**Note**: There is NO `npm run dev` because this is serverless architecture, not a traditional dev server.

---

## Testing the Backend

### Option A: Use Test Button (Easiest)
```
1. Open packages/backend/test-button.html
2. Select environment
3. Click "Run Test"
```

### Option B: Use Playwright E2E Tests
```bash
cd packages/backend
npm run test -- misra-compliance-e2e.test.ts
```

### Option C: Use CLI Test Runner
```bash
cd packages/backend
npx ts-node run-misra-test.ts
```

### Option D: Manual API Testing
```bash
# Get test credentials
curl -X POST http://localhost:3001/auth/test-login

# Use the returned token for other requests
curl -H "Authorization: Bearer <token>" http://localhost:3001/analysis/results
```

---

## Environment Variables

### For Local Development (SAM)
```
TEST_MODE_ENABLED=true
ENVIRONMENT=local
COGNITO_USER_POOL_ID=local-pool-id
COGNITO_CLIENT_ID=local-client-id
```

### For AWS Deployment
```
TEST_MODE_ENABLED=true (optional, for testing)
ENVIRONMENT=development|staging|production
COGNITO_USER_POOL_ID=<actual-pool-id>
COGNITO_CLIENT_ID=<actual-client-id>
AWS_REGION=us-east-1
```

---

## Key Differences from Traditional Node.js

| Aspect | Traditional | Serverless (MISRA) |
|--------|-------------|-------------------|
| Dev Server | `npm run dev` | No local server |
| Deployment | Manual or CI/CD | AWS CDK |
| Scaling | Manual | Automatic |
| Cost | Pay per server | Pay per request |
| Cold Starts | N/A | ~100-500ms first call |
| Testing | Local dev server | SAM CLI or deployed |

---

## Next Steps

1. **Understand the architecture** ✓ (you're reading this)
2. **Choose testing approach**:
   - Option A: Use deployed backend (easiest)
   - Option B: Deploy locally with SAM CLI
3. **Run the test button** and verify it works
4. **Check CloudWatch logs** if issues occur

---

## Useful Resources

- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [AWS SAM CLI Documentation](https://docs.aws.amazon.com/serverless-application-model/)
- [API Gateway Documentation](https://docs.aws.amazon.com/apigateway/)

