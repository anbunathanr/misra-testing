# SaaS MVP Implementation Guide

## Quick Start - Get Everything Done

This guide will help you complete all four critical tasks to transform your AIBTS platform into a production-ready SaaS product.

**Spec Location:** `.kiro/specs/saas-mvp-completion/`

---

## Overview

You need to complete:
1. ✅ Deploy the frontend (1-2 days)
2. ✅ Complete test execution feature (3-5 days)
3. ✅ Set up authentication (3-5 days)
4. ✅ Add real OpenAI integration (1-2 days)

**Total Time:** 10-17 days (2-3.5 weeks)

---

## Phase 1: Frontend Deployment (Days 1-2)

### Option A: Deploy to Vercel (Fastest - 1 hour)

```powershell
# 1. Install Vercel CLI
npm install -g vercel

# 2. Navigate to frontend
cd packages/frontend

# 3. Create production environment file
@"
VITE_API_URL=https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com
VITE_APP_NAME=AIBTS Platform
"@ | Out-File -FilePath .env.production -Encoding utf8

# 4. Build frontend
npm run build

# 5. Deploy to Vercel
vercel --prod

# 6. Note the deployment URL (e.g., https://aibts.vercel.app)
```

### Option B: Deploy to AWS S3 + CloudFront (More control - 2-3 hours)

```powershell
# 1. Build frontend
cd packages/frontend
npm run build

# 2. Create S3 bucket
aws s3 mb s3://aibts-frontend

# 3. Enable static website hosting
aws s3 website s3://aibts-frontend `
  --index-document index.html `
  --error-document index.html

# 4. Upload files
aws s3 sync dist/ s3://aibts-frontend --acl public-read

# 5. Create CloudFront distribution (via AWS Console or CDK)
# See design.md for CDK implementation

# 6. Note the CloudFront URL
```

### Update CORS

```powershell
# Update API Gateway CORS to allow your frontend URL
# Add to packages/backend/src/infrastructure/minimal-stack.ts

# In the API Gateway configuration, add:
# allowOrigins: ['https://your-frontend-url.vercel.app']
# allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
# allowHeaders: ['Content-Type', 'Authorization']

# Redeploy backend
cd packages/backend
npm run build
cdk deploy AITestGenerationStack
```

---

## Phase 2: Complete Test Execution (Days 3-7)

### Task 1: Suite Execution Results Endpoint

The endpoint is already implemented! Just need to test it:

```powershell
# Test the endpoint
$body = @{
  suiteId = "suite-123"
  projectId = "proj-123"
} | ConvertTo-Json

Invoke-WebRequest `
  -Uri "https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com/executions/suite/suite-exec-123/results" `
  -Method GET `
  -Headers @{"Authorization"="Bearer YOUR_TOKEN"}
```

### Task 2: Add Authentication Middleware

Create the auth middleware:

```typescript
// packages/backend/src/middleware/auth-middleware.ts
import { APIGatewayProxyEvent } from 'aws-lambda';
import * as jwt from 'jsonwebtoken';
import { SecretsManager } from 'aws-sdk';

const secretsManager = new SecretsManager();
let jwtSecret: string | null = null;

async function getJWTSecret(): Promise<string> {
  if (jwtSecret) return jwtSecret;
  
  const secret = await secretsManager
    .getSecretValue({ SecretId: 'aibts/jwt-secret' })
    .promise();
    
  jwtSecret = secret.SecretString!;
  return jwtSecret;
}

export interface AuthContext {
  userId: string;
  email: string;
  role: string;
}

export async function validateToken(
  event: APIGatewayProxyEvent
): Promise<AuthContext> {
  const authHeader = event.headers.Authorization || event.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }
  
  const token = authHeader.substring(7);
  const secret = await getJWTSecret();
  
  try {
    const decoded = jwt.verify(token, secret) as AuthContext;
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

export function withAuth(
  handler: (event: APIGatewayProxyEvent, context: AuthContext) => Promise<any>
) {
  return async (event: APIGatewayProxyEvent) => {
    try {
      const authContext = await validateToken(event);
      return await handler(event, authContext);
    } catch (error) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: error.message }),
      };
    }
  };
}
```

### Task 3: Add Logging and Error Handling

Create logger utility:

```typescript
// packages/backend/src/utils/logger.ts
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export class Logger {
  constructor(private context: string) {}
  
  private log(level: LogLevel, message: string, meta?: any) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
      requestId: process.env.AWS_REQUEST_ID,
      ...meta,
    };
    
    console.log(JSON.stringify(logEntry));
  }
  
  info(message: string, meta?: any) {
    this.log(LogLevel.INFO, message, meta);
  }
  
  error(message: string, error?: Error, meta?: any) {
    this.log(LogLevel.ERROR, message, {
      ...meta,
      error: error ? {
        message: error.message,
        stack: error.stack,
      } : undefined,
    });
  }
}
```

---

## Phase 3: Authentication System (Days 8-12)

### Step 1: Create AWS Cognito User Pool

```typescript
// packages/backend/src/infrastructure/cognito-auth.ts
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';
import { RemovalPolicy, CfnOutput } from 'aws-cdk-lib';

export class CognitoAuth extends Construct {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  
  constructor(scope: Construct, id: string) {
    super(scope, id);
    
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: 'aibts-users',
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
      },
      standardAttributes: {
        email: { required: true, mutable: true },
        fullname: { required: true, mutable: true },
      },
      removalPolicy: RemovalPolicy.RETAIN,
    });
    
    this.userPoolClient = this.userPool.addClient('WebClient', {
      userPoolClientName: 'aibts-web-client',
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
    });
    
    new CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
    });
    
    new CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
    });
  }
}
```

Add to your stack:

```typescript
// In minimal-stack.ts or misra-platform-stack.ts
import { CognitoAuth } from './cognito-auth';

// In constructor
const cognitoAuth = new CognitoAuth(this, 'CognitoAuth');
```

Deploy:

```powershell
cd packages/backend
npm run build
cdk deploy
```

### Step 2: Configure Frontend for Cognito

```powershell
# Install Cognito SDK
cd packages/frontend
npm install amazon-cognito-identity-js

# Update .env.production with Cognito details from CDK output
@"
VITE_API_URL=https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com
VITE_APP_NAME=AIBTS Platform
VITE_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_COGNITO_REGION=us-east-1
"@ | Out-File -FilePath .env.production -Encoding utf8
```

### Step 3: Implement Auth Service

```typescript
// packages/frontend/src/services/auth-service.ts
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
} from 'amazon-cognito-identity-js';

const userPool = new CognitoUserPool({
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
});

export class AuthService {
  async register(email: string, password: string, name: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const attributes = [
        new CognitoUserAttribute({ Name: 'email', Value: email }),
        new CognitoUserAttribute({ Name: 'name', Value: name }),
      ];
      
      userPool.signUp(email, password, attributes, [], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
  
  async login(email: string, password: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const user = new CognitoUser({
        Username: email,
        Pool: userPool,
      });
      
      const authDetails = new AuthenticationDetails({
        Username: email,
        Password: password,
      });
      
      user.authenticateUser(authDetails, {
        onSuccess: (session) => {
          resolve(session.getIdToken().getJwtToken());
        },
        onFailure: reject,
      });
    });
  }
  
  async getToken(): Promise<string | null> {
    return new Promise((resolve) => {
      const user = userPool.getCurrentUser();
      if (!user) {
        resolve(null);
        return;
      }
      
      user.getSession((err: any, session: any) => {
        if (err || !session) {
          resolve(null);
          return;
        }
        resolve(session.getIdToken().getJwtToken());
      });
    });
  }
  
  logout(): void {
    const user = userPool.getCurrentUser();
    if (user) user.signOut();
  }
}

export const authService = new AuthService();
```

### Step 4: Update API to Include Auth Token

```typescript
// packages/frontend/src/store/api/baseApi.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { authService } from '../../services/auth-service';

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL,
    prepareHeaders: async (headers) => {
      const token = await authService.getToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  endpoints: () => ({}),
});
```

---

## Phase 4: Real OpenAI Integration (Days 13-14)

### Step 1: Store OpenAI API Key

```powershell
# Get your OpenAI API key from platform.openai.com

# Store in AWS Secrets Manager
aws secretsmanager create-secret `
  --name aibts/openai-api-key `
  --description "OpenAI API key for AIBTS" `
  --secret-string "sk-YOUR-OPENAI-API-KEY-HERE"
```

### Step 2: Grant Lambda Access

```typescript
// In minimal-stack.ts where AI functions are defined
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

// Get secret
const openAiSecret = secretsmanager.Secret.fromSecretNameV2(
  this,
  'OpenAISecret',
  'aibts/openai-api-key'
);

// Grant read access
openAiSecret.grantRead(aiAnalyzeFunction);
openAiSecret.grantRead(aiGenerateFunction);
openAiSecret.grantRead(aiBatchFunction);

// Add environment variable
aiAnalyzeFunction.addEnvironment('OPENAI_API_KEY_SECRET_NAME', 'aibts/openai-api-key');
aiAnalyzeFunction.addEnvironment('USE_MOCK_AI', 'false');
```

### Step 3: Update AI Engine

```typescript
// packages/backend/src/services/ai-test-generation/ai-engine.ts
import { SecretsManager } from 'aws-sdk';
import OpenAI from 'openai';

const secretsManager = new SecretsManager();
let openaiClient: OpenAI | null = null;

async function getOpenAIClient(): Promise<OpenAI> {
  if (openaiClient) return openaiClient;
  
  const secretName = process.env.OPENAI_API_KEY_SECRET_NAME || 'aibts/openai-api-key';
  const secret = await secretsManager
    .getSecretValue({ SecretId: secretName })
    .promise();
    
  const apiKey = secret.SecretString;
  if (!apiKey) {
    throw new Error('OpenAI API key not found');
  }
  
  openaiClient = new OpenAI({ apiKey });
  return openaiClient;
}

export class AIEngine {
  async generateTestCase(prompt: string, options: any): Promise<any> {
    const client = await getOpenAIClient();
    
    const response = await client.chat.completions.create({
      model: options.model || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert test automation engineer...',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
    });
    
    return this.parseTestCase(response.choices[0].message.content);
  }
}
```

### Step 4: Deploy and Test

```powershell
# Deploy backend
cd packages/backend
npm run build
cdk deploy AITestGenerationStack

# Test AI generation
$body = @{
  url = "https://example.com"
  testScenarios = @("Test login functionality")
} | ConvertTo-Json

Invoke-WebRequest `
  -Uri "https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com/ai-test-generation/generate" `
  -Method POST `
  -Body $body `
  -ContentType "application/json" `
  -Headers @{"Authorization"="Bearer YOUR_TOKEN"}
```

---

## Final Checklist

### Before Going Live

- [ ] Frontend deployed and accessible
- [ ] Cognito User Pool created
- [ ] Users can register and login
- [ ] All API endpoints require authentication
- [ ] OpenAI API key configured
- [ ] AI generation working with real API
- [ ] Cost tracking enabled
- [ ] Error handling implemented
- [ ] Logging configured
- [ ] CORS configured correctly
- [ ] Environment variables set
- [ ] Documentation updated

### Test Complete Flow

```powershell
# 1. Register new user (via frontend)
# 2. Login (via frontend)
# 3. Create project
# 4. Generate AI test cases
# 5. Create test suite
# 6. Execute tests
# 7. View results
# 8. Check usage/costs
```

---

## Troubleshooting

### Frontend not loading
- Check CORS configuration
- Verify API URL in environment variables
- Check browser console for errors

### Authentication failing
- Verify Cognito User Pool ID and Client ID
- Check JWT token format
- Verify API Gateway authorizer configured

### AI generation not working
- Verify OpenAI API key in Secrets Manager
- Check Lambda has permission to read secret
- Verify USE_MOCK_AI=false
- Check CloudWatch logs for errors

### API calls failing
- Verify token included in Authorization header
- Check token not expired
- Verify endpoint requires authentication
- Check CloudWatch logs

---

## Next Steps After MVP

Once everything is working:

1. **Add Payment System** (Stripe integration)
2. **Set Up Monitoring** (CloudWatch dashboards, alerts)
3. **Implement Usage Tiers** (Free, Pro, Enterprise)
4. **Add Email Notifications** (AWS SES)
5. **Create Marketing Website** (Landing page, pricing)
6. **Set Up Custom Domain** (Route53, SSL certificate)
7. **Implement CI/CD** (GitHub Actions)
8. **Add Analytics** (Google Analytics, Mixpanel)

---

## Support

If you get stuck:
1. Check CloudWatch logs for detailed errors
2. Review the design document in `.kiro/specs/saas-mvp-completion/design.md`
3. Check the tasks list in `.kiro/specs/saas-mvp-completion/tasks.md`
4. Test each component individually before integration

---

**You've got this! Let's build a SaaS product! 🚀**
