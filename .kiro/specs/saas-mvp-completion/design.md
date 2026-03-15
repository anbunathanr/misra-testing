# SaaS MVP Completion - Design Document

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Browser                             │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  React Frontend (Vercel/S3+CloudFront)                     │ │
│  │  - Login/Register Pages                                     │ │
│  │  - Dashboard, Projects, Test Cases, Test Suites            │ │
│  │  - Test Execution Monitoring                               │ │
│  │  - AI Test Generation UI                                   │ │
│  └────────────────────────────────────────────────────────────┘ │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AWS API Gateway                               │
│  - CORS Enabled                                                  │
│  - JWT Authorizer (Cognito or Custom)                           │
│  - Rate Limiting                                                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ Auth Lambda  │   │ Test Exec    │   │ AI Gen       │
│              │   │ Lambdas      │   │ Lambdas      │
│ - Register   │   │ - Trigger    │   │ - Analyze    │
│ - Login      │   │ - Status     │   │ - Generate   │
│ - Profile    │   │ - Results    │   │ - Batch      │
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       │                  │                  │
       ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AWS Services                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Cognito    │  │  DynamoDB    │  │   Secrets    │          │
│  │  User Pool   │  │  - Users     │  │   Manager    │          │
│  │              │  │  - Projects  │  │  - OpenAI    │          │
│  └──────────────┘  │  - TestCases │  │    API Key   │          │
│                    │  - Executions│  └──────────────┘          │
│                    └──────────────┘                             │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │      S3      │  │     SQS      │  │  CloudWatch  │          │
│  │ Screenshots  │  │ Exec Queue   │  │    Logs      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │   OpenAI     │
                    │     API      │
                    └──────────────┘
```

---

## Phase 1: Frontend Deployment

### 1.1 Deployment Options

#### Option A: Vercel (Recommended for Speed)

**Pros:**
- Fastest deployment (< 10 minutes)
- Automatic HTTPS
- CDN included
- Git integration
- Zero configuration
- Free tier available

**Cons:**
- Less control over infrastructure
- Vendor lock-in

**Implementation:**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy from frontend directory
cd packages/frontend
vercel --prod
```

**Configuration:**
```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "env": {
    "VITE_API_URL": "https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com"
  }
}
```

#### Option B: AWS S3 + CloudFront (Recommended for Control)

**Pros:**
- Full control over infrastructure
- Integrates with existing AWS setup
- Cost-effective
- Highly scalable

**Cons:**
- More setup required
- Manual SSL certificate management

**Implementation:**

1. **Create S3 Bucket for Static Hosting**
```typescript
// packages/backend/src/infrastructure/frontend-hosting.ts
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';

export class FrontendHosting extends Construct {
  public readonly distribution: cloudfront.Distribution;
  
  constructor(scope: Construct, id: string) {
    super(scope, id);
    
    // S3 bucket for frontend
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: 'aibts-frontend',
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.RETAIN,
    });
    
    // CloudFront distribution
    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
    });
    
    // Deploy frontend files
    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deploy.Source.asset('../frontend/dist')],
      destinationBucket: websiteBucket,
      distribution: this.distribution,
      distributionPaths: ['/*'],
    });
  }
}
```

2. **Build and Deploy Script**
```powershell
# deploy-frontend.ps1
Write-Host "Building frontend..." -ForegroundColor Cyan
cd packages/frontend
npm run build

Write-Host "Deploying to S3..." -ForegroundColor Cyan
aws s3 sync dist/ s3://aibts-frontend --delete

Write-Host "Invalidating CloudFront cache..." -ForegroundColor Cyan
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"

Write-Host "Frontend deployed successfully!" -ForegroundColor Green
```

### 1.2 Environment Configuration

**Frontend Environment Variables:**
```typescript
// packages/frontend/.env.production
VITE_API_URL=https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com
VITE_APP_NAME=AIBTS Platform
VITE_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_COGNITO_REGION=us-east-1
```

**Build Configuration:**
```typescript
// packages/frontend/vite.config.ts
export default defineConfig({
  build: {
    sourcemap: false, // Disable in production
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          mui: ['@mui/material', '@mui/icons-material'],
          redux: ['@reduxjs/toolkit', 'react-redux'],
        },
      },
    },
  },
});
```

---

## Phase 2: Complete Test Execution

### 2.1 Suite Execution Results Endpoint

**Endpoint:** `GET /executions/suite/{suiteExecutionId}/results`

**Implementation:**
```typescript
// packages/backend/src/functions/executions/get-suite-results.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { TestExecutionDBService } from '../../services/test-execution-db-service';

const dbService = new TestExecutionDBService();

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const suiteExecutionId = event.pathParameters?.suiteExecutionId;
    
    if (!suiteExecutionId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Suite execution ID required' }),
      };
    }
    
    // Get suite execution record
    const suiteExecution = await dbService.getSuiteExecution(suiteExecutionId);
    
    if (!suiteExecution) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Suite execution not found' }),
      };
    }
    
    // Get all individual test executions
    const executions = await dbService.getExecutionsBySuiteId(suiteExecutionId);
    
    // Calculate summary
    const summary = {
      total: executions.length,
      passed: executions.filter(e => e.result === 'passed').length,
      failed: executions.filter(e => e.result === 'failed').length,
      error: executions.filter(e => e.result === 'error').length,
    };
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        suiteExecutionId,
        suiteId: suiteExecution.suiteId,
        status: suiteExecution.status,
        summary,
        executions: executions.map(e => ({
          executionId: e.executionId,
          testCaseId: e.testCaseId,
          result: e.result,
          duration: e.duration,
          errorMessage: e.errorMessage,
        })),
        startedAt: suiteExecution.startedAt,
        completedAt: suiteExecution.completedAt,
      }),
    };
  } catch (error) {
    console.error('Error getting suite results:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
```

### 2.2 Authentication Middleware

**JWT Validation:**
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

**Usage:**
```typescript
// packages/backend/src/functions/projects/get-projects.ts
import { withAuth } from '../../middleware/auth-middleware';

export const handler = withAuth(async (event, authContext) => {
  // authContext.userId is available here
  const projects = await projectService.getProjectsByUserId(authContext.userId);
  
  return {
    statusCode: 200,
    body: JSON.stringify({ projects }),
  };
});
```

### 2.3 Error Handling and Logging

**Structured Logging:**
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
  
  debug(message: string, meta?: any) {
    this.log(LogLevel.DEBUG, message, meta);
  }
  
  info(message: string, meta?: any) {
    this.log(LogLevel.INFO, message, meta);
  }
  
  warn(message: string, meta?: any) {
    this.log(LogLevel.WARN, message, meta);
  }
  
  error(message: string, error?: Error, meta?: any) {
    this.log(LogLevel.ERROR, message, {
      ...meta,
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : undefined,
    });
  }
}
```

**Error Response Handler:**
```typescript
// packages/backend/src/utils/error-handler.ts
import { Logger } from './logger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function handleError(error: any, logger: Logger) {
  if (error instanceof AppError) {
    logger.warn('Application error', { error: error.message, code: error.code });
    return {
      statusCode: error.statusCode,
      body: JSON.stringify({
        error: error.message,
        code: error.code,
        requestId: process.env.AWS_REQUEST_ID,
      }),
    };
  }
  
  logger.error('Unexpected error', error);
  return {
    statusCode: 500,
    body: JSON.stringify({
      error: 'Internal server error',
      requestId: process.env.AWS_REQUEST_ID,
    }),
  };
}
```

---

## Phase 3: Authentication System

### 3.1 AWS Cognito Setup (Recommended)

**Infrastructure:**
```typescript
// packages/backend/src/infrastructure/cognito-auth.ts
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export class CognitoAuth extends Construct {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  
  constructor(scope: Construct, id: string) {
    super(scope, id);
    
    // Create User Pool
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: 'aibts-users',
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        fullname: {
          required: true,
          mutable: true,
        },
      },
      removalPolicy: RemovalPolicy.RETAIN,
    });
    
    // Create User Pool Client
    this.userPoolClient = this.userPool.addClient('WebClient', {
      userPoolClientName: 'aibts-web-client',
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: false,
          implicitCodeGrant: false,
        },
      },
    });
    
    // Output values
    new CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });
    
    new CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });
  }
}
```

**API Gateway Authorizer:**
```typescript
// In minimal-stack.ts or misra-platform-stack.ts
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';

// Create Cognito authorizer
const cognitoAuthorizer = new authorizers.HttpUserPoolAuthorizer(
  'CognitoAuthorizer',
  cognitoAuth.userPool,
  {
    userPoolClients: [cognitoAuth.userPoolClient],
    identitySource: ['$request.header.Authorization'],
  }
);

// Apply to routes
api.addRoutes({
  path: '/projects',
  methods: [apigatewayv2.HttpMethod.GET],
  integration: projectsIntegration,
  authorizer: cognitoAuthorizer, // Add this
});
```

### 3.2 Frontend Authentication

**Cognito Integration:**
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
      
      userPool.signUp(email, password, attributes, [], (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
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
          const token = session.getIdToken().getJwtToken();
          resolve(token);
        },
        onFailure: (err) => {
          reject(err);
        },
      });
    });
  }
  
  async logout(): Promise<void> {
    const user = userPool.getCurrentUser();
    if (user) {
      user.signOut();
    }
  }
  
  getCurrentUser(): CognitoUser | null {
    return userPool.getCurrentUser();
  }
  
  async getToken(): Promise<string | null> {
    return new Promise((resolve) => {
      const user = this.getCurrentUser();
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
}

export const authService = new AuthService();
```

**Protected Route Component:**
```typescript
// packages/frontend/src/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};
```

**API Interceptor:**
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

## Phase 4: Real OpenAI Integration

### 4.1 Store API Key in Secrets Manager

**Create Secret:**
```bash
aws secretsmanager create-secret \
  --name aibts/openai-api-key \
  --description "OpenAI API key for AIBTS" \
  --secret-string "sk-YOUR-OPENAI-API-KEY"
```

**CDK Infrastructure:**
```typescript
// packages/backend/src/infrastructure/secrets.ts
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

export class Secrets extends Construct {
  public readonly openAiApiKey: secretsmanager.ISecret;
  
  constructor(scope: Construct, id: string) {
    super(scope, id);
    
    // Reference existing secret
    this.openAiApiKey = secretsmanager.Secret.fromSecretNameV2(
      this,
      'OpenAIApiKey',
      'aibts/openai-api-key'
    );
  }
}
```

**Grant Lambda Access:**
```typescript
// In stack where Lambda functions are defined
const secrets = new Secrets(this, 'Secrets');

// Grant read access to AI generation functions
secrets.openAiApiKey.grantRead(aiAnalyzeFunction);
secrets.openAiApiKey.grantRead(aiGenerateFunction);
secrets.openAiApiKey.grantRead(aiBatchFunction);

// Add environment variable
aiAnalyzeFunction.addEnvironment(
  'OPENAI_API_KEY_SECRET_NAME',
  'aibts/openai-api-key'
);
```

### 4.2 Update AI Engine

**Retrieve API Key:**
```typescript
// packages/backend/src/services/ai-test-generation/ai-engine.ts
import { SecretsManager } from 'aws-sdk';
import OpenAI from 'openai';

const secretsManager = new SecretsManager();
let openaiClient: OpenAI | null = null;

async function getOpenAIClient(): Promise<OpenAI> {
  if (openaiClient) return openaiClient;
  
  // Check if we should use mock
  if (process.env.USE_MOCK_AI === 'true') {
    throw new Error('Mock AI enabled, real OpenAI client not available');
  }
  
  // Get API key from Secrets Manager
  const secretName = process.env.OPENAI_API_KEY_SECRET_NAME || 'aibts/openai-api-key';
  const secret = await secretsManager
    .getSecretValue({ SecretId: secretName })
    .promise();
    
  const apiKey = secret.SecretString;
  if (!apiKey) {
    throw new Error('OpenAI API key not found in Secrets Manager');
  }
  
  openaiClient = new OpenAI({ apiKey });
  return openaiClient;
}

export class AIEngine {
  async generateTestCase(prompt: string, options: AIGenerationOptions): Promise<TestCase> {
    const client = await getOpenAIClient();
    
    const response = await client.chat.completions.create({
      model: options.model || 'gpt-4',
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
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 2000,
    });
    
    // Track usage
    const usage = response.usage;
    await this.trackUsage({
      promptTokens: usage?.prompt_tokens || 0,
      completionTokens: usage?.completion_tokens || 0,
      totalTokens: usage?.total_tokens || 0,
      model: options.model || 'gpt-4',
    });
    
    // Parse and return test case
    const content = response.choices[0].message.content;
    return this.parseTestCase(content);
  }
}
```

### 4.3 Cost Tracking

**Track Usage:**
```typescript
// packages/backend/src/services/ai-test-generation/cost-tracker.ts
export class CostTracker {
  private readonly MODEL_COSTS = {
    'gpt-4': {
      prompt: 0.03 / 1000, // $0.03 per 1K tokens
      completion: 0.06 / 1000, // $0.06 per 1K tokens
    },
    'gpt-3.5-turbo': {
      prompt: 0.0015 / 1000,
      completion: 0.002 / 1000,
    },
  };
  
  async trackUsage(params: {
    userId: string;
    promptTokens: number;
    completionTokens: number;
    model: string;
  }): Promise<void> {
    const costs = this.MODEL_COSTS[params.model] || this.MODEL_COSTS['gpt-3.5-turbo'];
    
    const cost =
      params.promptTokens * costs.prompt +
      params.completionTokens * costs.completion;
    
    // Save to DynamoDB
    await this.dbService.recordUsage({
      userId: params.userId,
      timestamp: Date.now(),
      model: params.model,
      promptTokens: params.promptTokens,
      completionTokens: params.completionTokens,
      totalTokens: params.promptTokens + params.completionTokens,
      cost,
    });
    
    // Check limits
    await this.checkLimits(params.userId);
  }
  
  async checkLimits(userId: string): Promise<void> {
    const usage = await this.dbService.getMonthlyUsage(userId);
    const limits = await this.dbService.getUserLimits(userId);
    
    if (usage.totalCost >= limits.monthlyCostLimit) {
      throw new Error('Monthly cost limit exceeded');
    }
    
    const todayUsage = await this.dbService.getTodayUsage(userId);
    if (todayUsage.callCount >= limits.dailyCallLimit) {
      throw new Error('Daily call limit exceeded');
    }
  }
}
```

---

## Integration Points

### Frontend → Backend
- All API calls include JWT token in Authorization header
- Token retrieved from Cognito session
- Automatic token refresh before expiration

### Backend → OpenAI
- API key retrieved from Secrets Manager on cold start
- Cached for subsequent invocations
- Usage tracked per request

### Backend → DynamoDB
- User data synced from Cognito to DynamoDB
- Test execution results stored
- AI usage tracked

---

## Security Considerations

1. **API Keys**: Never expose in code, logs, or responses
2. **JWT Tokens**: Short expiration (1-24 hours), secure storage
3. **CORS**: Restrict to frontend domain only
4. **Rate Limiting**: Prevent abuse and control costs
5. **Input Validation**: Sanitize all user inputs
6. **Error Messages**: Don't leak sensitive information

---

## Testing Strategy

### Unit Tests
- Test authentication middleware
- Test error handlers
- Test cost tracking logic

### Integration Tests
- Test complete auth flow (register → login → API call)
- Test AI generation with real API
- Test frontend deployment

### Manual Tests
- Register new user
- Login and access protected pages
- Generate AI test case
- Execute test and view results
- Check cost tracking

---

## Deployment Checklist

- [ ] OpenAI API key in Secrets Manager
- [ ] Cognito User Pool created
- [ ] Frontend built and deployed
- [ ] Backend updated with auth middleware
- [ ] Environment variables configured
- [ ] CORS configured for frontend domain
- [ ] Test complete user flow
- [ ] Monitor CloudWatch logs
- [ ] Set up cost alerts

---

## Rollback Plan

If issues occur:
1. Revert to previous backend deployment
2. Disable authentication temporarily (allow anonymous access)
3. Switch back to mock AI service
4. Roll back frontend to previous version

---

## Success Criteria

- [ ] Frontend accessible via public URL
- [ ] Users can register and login
- [ ] Protected routes require authentication
- [ ] AI test generation uses real OpenAI API
- [ ] Cost tracking working correctly
- [ ] Complete test execution workflow functional
- [ ] No critical errors in CloudWatch logs
- [ ] Response times within acceptable limits
