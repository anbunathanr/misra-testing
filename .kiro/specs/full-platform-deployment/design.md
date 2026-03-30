# Bugfix Design: Full Platform Deployment Issues

## Overview

This design document outlines the strategy for fixing critical deployment issues in the AIBTS platform. The platform was previously deployed with MinimalStack (only AI features), but app.ts is now configured to deploy MisraPlatformStack (full platform). This mismatch is causing multiple production issues.

### Current State

- **Deployed Stack**: MinimalStack (only AI features)
- **Expected Stack**: MisraPlatformStack (full platform with CRUD operations)
- **Frontend**: React application deployed on Vercel
- **Working Features**: Authentication, AI Test Generation, 2 DynamoDB tables for AI usage
- **Broken Features**: Projects, Test Suites, Test Cases, Test Executions (no backend tables)

### Target State

Complete MisraPlatformStack deployment containing:
- All DynamoDB tables (Users, Projects, TestSuites, TestCases, TestExecutions, Notifications, AI Usage, etc.)
- All Lambda functions for complete platform (50+ functions)
- Complete API Gateway with all endpoints
- S3 buckets for file storage and screenshots
- SNS topics and SQS queues for notifications and test execution
- CloudWatch monitoring and alarms
- EventBridge rules for scheduled reports

### Bugfix Strategy

We will use a two-phase approach:

1. **Phase 1: Quick Fix** - Fix payload format version mismatch to resolve 503 errors
2. **Phase 2: Full Deployment** - Deploy MisraPlatformStack to create missing resources

## Components and Interfaces

### Bugfix Architecture

```mermaid
graph TB
    subgraph "Current State (MinimalStack)"
        CS_API[API Gateway - Partial]
        CS_Lambda[4 AI Lambda Functions]
        CS_Tables[2 DynamoDB Tables - AI only]
    end
    
    subgraph "Target State (MisraPlatformStack)"
        MP_API[API Gateway - Complete]
        MP_Lambda[50+ Lambda Functions]
        MP_Tables[DynamoDB Tables - All]
    end
    
    subgraph "Bugfix Actions"
        QF[Quick Fix: Payload Format]
        FD[Full Deployment]
    end
    
    CS_API --> QF
    QF --> MP_API
    CS_Tables --> FD
    CS_Lambda --> FD
    FD --> MP_Tables
    FD --> MP_Lambda

## Architecture

### Deployment Strategy: Direct Deployment

We will use a simple, direct deployment approach:

1. **Phase 1: AWS Account Setup**
   - Create new AWS account
   - Configure IAM user with admin access
   - Install and configure AWS CLI
   - Create required secrets (OpenAI/Hugging Face API keys)

2. **Phase 2: CDK Bootstrap**
   - Bootstrap CDK in the AWS account
   - Verify CDK toolkit stack created

3. **Phase 3: Deploy MisraPlatformStack**
   - Run `cdk deploy MisraPlatformStack`
   - Wait for deployment to complete (~10-15 minutes)
   - Capture CloudFormation outputs

4. **Phase 4: Configure and Deploy Frontend**
   - Update frontend environment variables with API Gateway URL
   - Deploy frontend to Vercel (free)
   - Test end-to-end functionality

5. **Phase 5: Seed Default Data**
   - Invoke seed-templates Lambda to create default notification templates
   - Create first test user
   - Verify all features working

## Components and Interfaces

### Stack Architecture

```mermaid
graph TB
    subgraph "AWS Account (Fresh)"
        MP_API[API Gateway - Complete]
        MP_Lambda[50+ Lambda Functions]
        MP_Tables[DynamoDB Tables]
        MP_S3[S3 Buckets]
        MP_SNS[SNS Topics]
        MP_SQS[SQS Queues]
        MP_CW[CloudWatch Monitoring]
        MP_EB[EventBridge Rules]
        MP_SF[Step Functions]
    end
    
    Frontend[Frontend on Vercel]
    Users[End Users]
    
    Users --> Frontend
    Frontend --> MP_API
    MP_API --> MP_Lambda
    MP_Lambda --> MP_Tables
    MP_Lambda --> MP_S3
    MP_Lambda --> MP_SNS
    MP_Lambda --> MP_SQS
    MP_EB --> MP_Lambda
    MP_SF --> MP_Lambda
```

### Infrastructure Components

| Component | Purpose | Configuration |
|-----------|---------|---------------|
| **DynamoDB Tables** | Data storage | PAY_PER_REQUEST billing, AWS-managed encryption |
| **Lambda Functions** | Business logic | Node.js 20.x, 256MB-2048MB memory |
| **API Gateway** | HTTP API endpoints | HTTP API (not REST), CORS enabled |
| **S3 Buckets** | File and screenshot storage | Versioned, encrypted, lifecycle policies |
| **SQS Queues** | Async processing | Test execution queue, notification queue, DLQs |
| **SNS Topics** | Notifications | Email, SMS, webhook delivery |
| **EventBridge** | Scheduled tasks | Daily/weekly reports, event routing |
| **CloudWatch** | Monitoring | Alarms, dashboards, logs |
| **Step Functions** | Workflow orchestration | Analysis workflow |
| **Secrets Manager** | API key storage | OpenAI, Hugging Face, N8N keys |

### API Endpoint Structure

MisraPlatformStack provides comprehensive API endpoints:

**Authentication** (JWT-based, no Cognito):
```
POST /auth/login
POST /auth/refresh
```

**File Management**:
```
POST /files/upload
GET  /files
GET  /reports/{fileId}
```

**Project Management**:
```
POST /projects
GET  /projects
PUT  /projects/{projectId}
```

**Test Suite Management**:
```
POST /test-suites
GET  /test-suites
PUT  /test-suites/{suiteId}
```

**Test Case Management**:
```
POST /test-cases
GET  /test-cases
PUT  /test-cases/{testCaseId}
```

**Test Execution**:
```
POST /executions/trigger
GET  /executions/{executionId}/status
GET  /executions/{executionId}
GET  /executions/history
GET  /executions/suites/{suiteExecutionId}
```

**Notifications**:
```
GET  /notifications/preferences
POST /notifications/preferences
GET  /notifications/history
GET  /notifications/history/{notificationId}
POST /notifications/templates
PUT  /notifications/templates/{templateId}
GET  /notifications/templates
```

**AI Test Generation**:
```
POST /ai-test-generation/analyze
POST /ai-test-generation/generate
POST /ai-test-generation/batch
GET  /ai-test-generation/usage
```

**Analysis & Insights**:
```
GET  /analysis/query
GET  /analysis/stats/{userId}
POST /ai/insights
POST /ai/feedback
```

## Data Models

### Deployment Configuration

```typescript
interface DeploymentConfig {
  awsAccountId: string;
  awsRegion: string;
  stackName: string;
  environment: 'dev' | 'staging' | 'prod';
  secrets: {
    openaiApiKey?: string;
    huggingfaceApiKey?: string;
    n8nWebhookUrl?: string;
    n8nApiKey?: string;
  };
}

interface DeploymentOutputs {
  apiGatewayUrl: string;
  fileStorageBucketName: string;
  screenshotsBucketName: string;
  testExecutionQueueUrl: string;
  notificationQueueUrl: string;
  dashboardUrl: string;
}

interface ValidationCheck {
  name: string;
  type: 'api' | 'data' | 'auth' | 'function';
  endpoint?: string;
  expectedResult: any;
  actualResult?: any;
  passed?: boolean;
}
```

### Frontend Configuration

```typescript
interface FrontendConfig {
  apiUrl: string;
  awsRegion: string;
  environment: 'development' | 'production';
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Stack Deployment Completeness

*For any* resource defined in MisraPlatformStack, after deployment completes, that resource should exist in AWS and be accessible via AWS API calls.

**Validates: Requirements 1, 2, 3, 4, 5, 6, 7, 8, 9**

### Property 2: API Endpoint Availability

*For any* API endpoint defined in the API Gateway configuration, after deployment completes, that endpoint should return a valid HTTP response (not 404) when called with appropriate authentication.

**Validates: Requirements 9**

### Property 3: Lambda Function Operational Status

*For any* Lambda function deployed in MisraPlatformStack, that function should be in "Active" state and successfully execute test invocations without errors.

**Validates: Requirements 3, 4, 5, 6, 7**

### Property 4: DynamoDB Table Accessibility

*For any* DynamoDB table created by MisraPlatformStack, that table should be in "ACTIVE" status and support read/write operations.

**Validates: Requirements 1**

### Property 5: Cost Constraint Compliance

*For any* 24-hour period after deployment, the total AWS cost for all MisraPlatformStack resources should not exceed $0.20 (monthly target $5 / 30 days).

**Validates: Requirements 10**

### Property 6: Frontend-Backend Integration

*For any* API endpoint called by the frontend application, after frontend configuration update, those calls should succeed with valid responses (2xx status codes).

**Validates: Requirements 14, 18**

### Property 7: Notification System Functionality

*For any* test execution completion event, the notification system should process the event and create appropriate notification records in the history table.

**Validates: Requirements 7, 8**

### Property 8: CloudWatch Monitoring Active

*For any* CloudWatch alarm defined in MisraPlatformStack, that alarm should be in "OK" or "INSUFFICIENT_DATA" state after deployment (not "ALARM" state).

**Validates: Requirements 11**

### Property 9: Secrets Accessibility

*For any* Lambda function that requires access to secrets, that function should be able to read the secret value from Secrets Manager without permission errors.

**Validates: Requirements 16, 17**

### Property 10: Rollback Safety

*For any* deployment failure, executing `cdk destroy` should successfully remove all created resources and return the AWS account to its pre-deployment state.

**Validates: Requirements 14**

## Error Handling

### Deployment Failure Scenarios

1. **CDK Bootstrap Failure**
   - **Detection**: `cdk bootstrap` command returns non-zero exit code
   - **Handling**: Check AWS credentials, verify IAM permissions
   - **Recovery**: Fix credentials/permissions, retry bootstrap
   - **Rollback**: No resources created yet, safe to retry

2. **CDK Deployment Failure**
   - **Detection**: `cdk deploy` command returns non-zero exit code
   - **Handling**: Capture CloudFormation error messages, identify failing resource
   - **Recovery**: Fix infrastructure code, retry deployment
   - **Rollback**: CDK automatically rolls back failed stack changes, or run `cdk destroy`

3. **API Gateway Endpoint Validation Failure**
   - **Detection**: Automated tests fail after deployment
   - **Handling**: Check Lambda function logs, verify IAM permissions
   - **Recovery**: Fix Lambda functions or API Gateway configuration, redeploy
   - **Rollback**: Run `cdk destroy` to remove stack

4. **Frontend Configuration Update Failure**
   - **Detection**: Frontend cannot connect to API or receives errors
   - **Handling**: Verify API Gateway URL is correct, check CORS configuration
   - **Recovery**: Update frontend environment variables, redeploy
   - **Rollback**: No backend changes needed

5. **Cost Overrun Detection**
   - **Detection**: CloudWatch billing alarm triggers
   - **Handling**: Identify expensive resources via Cost Explorer
   - **Recovery**: Optimize resource configuration (reduce Lambda memory, adjust DynamoDB capacity)
   - **Rollback**: If costs cannot be controlled, run `cdk destroy`

6. **Secrets Manager Access Failure**
   - **Detection**: Lambda functions fail with "AccessDeniedException" for secrets
   - **Handling**: Verify secrets exist, check IAM permissions
   - **Recovery**: Create missing secrets, update IAM policies
   - **Rollback**: No rollback needed, fix permissions

### Validation Checkpoints

Each phase must pass validation before proceeding:

**Phase 1 Validation (AWS Setup)**
- AWS CLI installed and configured
- AWS credentials valid
- IAM user has AdministratorAccess
- Target region set correctly

**Phase 2 Validation (CDK Bootstrap)**
- CDK toolkit stack exists
- S3 bucket for CDK assets created
- ECR repository for Docker images created

**Phase 3 Validation (Deploy)**
- MisraPlatformStack deploys without errors
- All Lambda functions pass smoke tests
- All DynamoDB tables created successfully
- API Gateway endpoints respond to health checks
- CloudWatch alarms in OK state

**Phase 4 Validation (Frontend)**
- Frontend builds successfully
- Frontend deployed to Vercel
- All API calls from frontend succeed
- User can login and access features

**Phase 5 Validation (Seed Data)**
- Default notification templates created
- Test user created successfully
- All features accessible

### Monitoring and Alerting

```typescript
interface DeploymentMonitoring {
  cloudWatchAlarms: {
    lambdaErrors: boolean;
    apiGateway5xxErrors: boolean;
    dynamoDBThrottling: boolean;
    costOverrun: boolean;
    dlqDepth: boolean;
  };
  
  healthChecks: {
    apiEndpoints: string[];
    checkInterval: number; // seconds
    failureThreshold: number;
  };
  
  rollbackTriggers: {
    errorRateThreshold: number; // percentage
    latencyThreshold: number; // milliseconds
    availabilityThreshold: number; // percentage
  };
}
```

## Testing Strategy

### Pre-Deployment Testing

1. **Infrastructure Code Validation**
   - Run `cdk synth` to validate CloudFormation template generation
   - Review generated template for resource conflicts
   - Verify all construct IDs are unique

2. **Local Lambda Testing**
   - Unit tests for all Lambda functions (already exist)
   - Integration tests with local DynamoDB (already exist)
   - Property-based tests for critical functions (already exist)

3. **Cost Estimation**
   - Use AWS Pricing Calculator to estimate monthly costs
   - Review DynamoDB capacity modes (PAY_PER_REQUEST vs PROVISIONED)
   - Verify Lambda memory allocations are appropriate

### Migration Testing

1. **Cognito User Migration Script Testing**
   - Test with small subset of users first
   - Verify user attributes preserved correctly
   - Test authentication with migrated users

2. **Data Migration Script Testing**
   - Test with sample AI usage records
   - Verify data integrity after migration
   - Test query patterns on migrated data

3. **Rollback Procedure Testing**
   - Practice rollback in test environment
   - Verify rollback completes within acceptable time
   - Confirm original state restored correctly

### Post-Deployment Testing

1. **Smoke Tests**
   - Test each API endpoint with valid requests
   - Verify authentication flow end-to-end
   - Test AI test generation workflow
   - Test test execution workflow
   - Test notification system

2. **Integration Tests**
   - Run existing integration test suite
   - Verify cross-service communication
   - Test event-driven workflows (SQS, SNS, EventBridge)

3. **Load Testing**
   - Simulate realistic user load
   - Monitor Lambda concurrency and throttling
   - Check DynamoDB performance
   - Verify auto-scaling behavior

4. **Cost Monitoring**
   - Track actual costs for 48 hours
   - Compare against estimates
   - Identify any unexpected charges

### Property-Based Testing

Implement property tests for critical deployment properties:

```typescript
// Property Test 1: User Migration Completeness
describe('Property: User Data Preservation', () => {
  it('should preserve all user data during migration', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(cognitoUserGenerator(), { minLength: 1, maxLength: 100 }),
        async (users) => {
          // Export users from source
          const exported = await exportCognitoUsers(sourcePoolId, users);
          
          // Import to target
          const imported = await importCognitoUsers(targetPoolId, exported);
          
          // Verify all users migrated
          expect(imported.length).toBe(users.length);
          
          // Verify data integrity
          for (const user of users) {
            const migratedUser = await getCognitoUser(targetPoolId, user.username);
            expect(migratedUser.email).toBe(user.email);
            expect(migratedUser.attributes).toEqual(user.attributes);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Property Test 2: API Endpoint Equivalence
describe('Property: API Endpoint Functional Equivalence', () => {
  it('should maintain API functionality after migration', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          endpoint: fc.constantFrom(...aiEndpoints),
          payload: validPayloadGenerator(),
          authToken: validTokenGenerator()
        }),
        async ({ endpoint, payload, authToken }) => {
          // Call old API
          const oldResponse = await callAPI(oldApiUrl + endpoint, payload, authToken);
          
          // Call new API
          const newResponse = await callAPI(newApiUrl + endpoint, payload, authToken);
          
          // Verify equivalent responses
          expect(newResponse.statusCode).toBe(oldResponse.statusCode);
          expect(newResponse.body).toMatchObject(oldResponse.body);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Property Test 3: Data Migration Integrity
describe('Property: AI Usage Data Completeness', () => {
  it('should migrate all AI usage records without data loss', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(aiUsageRecordGenerator(), { minLength: 1, maxLength: 1000 }),
        async (records) => {
          // Write to source table
          await batchWriteRecords(sourceTableName, records);
          
          // Migrate
          const migrationResult = await migrateAIUsageData(sourceTableName, targetTableName);
          
          // Verify all records migrated
          expect(migrationResult.recordsMigrated).toBe(records.length);
          
          // Verify data integrity
          for (const record of records) {
            const migratedRecord = await getRecord(targetTableName, record.userId, record.timestamp);
            expect(migratedRecord).toEqual(record);
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});
```

### Testing Configuration

- **Unit Tests**: Run before deployment (existing test suite)
- **Property Tests**: Minimum 100 iterations per test
- **Integration Tests**: Run after deployment in staging environment
- **Load Tests**: Run in production with monitoring
- **Cost Tests**: Monitor for 48 hours post-deployment

### Test Tagging

All property tests must include tags referencing design properties:

```typescript
// Feature: full-platform-deployment, Property 1: User Data Preservation
// Feature: full-platform-deployment, Property 2: AI Usage Data Completeness
// Feature: full-platform-deployment, Property 3: API Endpoint Functional Equivalence
```

## Deployment Procedures

### Phase 1: AWS Account Setup

```bash
# 1. Create AWS Account
# Follow guide at: https://aws.amazon.com/free/
# - Sign up for AWS Free Tier
# - Provide payment method (required but won't be charged if staying in free tier)
# - Enable MFA on root account

# 2. Create IAM Admin User
# Via AWS Console:
# - Go to IAM → Users → Add user
# - Username: admin-user
# - Enable "Programmatic access" and "AWS Management Console access"
# - Attach policy: AdministratorAccess
# - Save access keys securely

# 3. Install AWS CLI (Windows PowerShell)
msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi

# 4. Configure AWS credentials
aws configure
# AWS Access Key ID: <from IAM user creation>
# AWS Secret Access Key: <from IAM user creation>
# Default region: us-east-1
# Default output format: json

# 5. Verify configuration
aws sts get-caller-identity
# Should show your account ID and user ARN
```

### Phase 2: Create Secrets (Optional)

```bash
# Option 1: OpenAI API Key (costs $3-4/month for AI features)
aws secretsmanager create-secret \
  --name aibts/openai-api-key \
  --secret-string "sk-YOUR-OPENAI-KEY-HERE" \
  --region us-east-1

# Option 2: Hugging Face API Key (FREE tier available)
aws secretsmanager create-secret \
  --name aibts/huggingface-api-key \
  --secret-string "hf_YOUR-HUGGINGFACE-KEY-HERE" \
  --region us-east-1

# Option 3: N8N Integration (optional, for advanced workflows)
aws secretsmanager create-secret \
  --name aibts/n8n-webhook-url \
  --secret-string "https://your-n8n-instance.com/webhook/..." \
  --region us-east-1

aws secretsmanager create-secret \
  --name aibts/n8n-api-key \
  --secret-string "your-n8n-api-key" \
  --region us-east-1
```

### Phase 3: CDK Bootstrap

```bash
# 1. Install CDK CLI globally
npm install -g aws-cdk

# 2. Navigate to backend directory
cd packages/backend

# 3. Install dependencies
npm install

# 4. Bootstrap CDK (first time only)
npx cdk bootstrap aws://ACCOUNT-ID/us-east-1
# Replace ACCOUNT-ID with your AWS account ID from Phase 1 step 5

# 5. Verify bootstrap
aws cloudformation describe-stacks --stack-name CDKToolkit
# Should show stack in CREATE_COMPLETE status
```

### Phase 4: Deploy MisraPlatformStack

```bash
# 1. Synthesize CloudFormation template (optional, for review)
npx cdk synth

# 2. Review changes (optional)
npx cdk diff

# 3. Deploy stack
npx cdk deploy MisraPlatformStack --require-approval never

# Deployment takes ~10-15 minutes
# Watch for CloudFormation outputs at the end

# 4. Capture outputs to file
aws cloudformation describe-stacks \
  --stack-name MisraPlatformStack \
  --query 'Stacks[0].Outputs' \
  --output json > platform-stack-outputs.json

# 5. Extract API Gateway URL
$API_URL = aws cloudformation describe-stacks \
  --stack-name MisraPlatformStack \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' \
  --output text

echo "API Gateway URL: $API_URL"
```

### Phase 5: Seed Default Notification Templates

```bash
# Invoke seed-templates Lambda function
aws lambda invoke \
  --function-name aibts-seed-templates \
  --region us-east-1 \
  response.json

# Check response
cat response.json
# Should show: {"statusCode": 200, "message": "Templates seeded successfully"}
```

### Phase 6: Configure and Deploy Frontend

```bash
# 1. Navigate to frontend directory
cd packages/frontend

# 2. Create production environment file
echo "VITE_API_URL=$API_URL" > .env.production
echo "VITE_AWS_REGION=us-east-1" >> .env.production

# 3. Install Vercel CLI (if not already installed)
npm install -g vercel

# 4. Build frontend
npm run build

# 5. Deploy to Vercel
vercel --prod

# Follow prompts:
# - Link to existing project or create new
# - Confirm settings
# - Wait for deployment

# 6. Note the Vercel URL (e.g., https://your-app.vercel.app)
```

### Phase 7: Validation and Testing

```bash
# 1. Test API health
curl $API_URL/health
# Should return 200 OK

# 2. Test authentication endpoint
curl -X POST $API_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# 3. Open frontend in browser
# Navigate to your Vercel URL
# Try to:
# - Register a new user
# - Login
# - Create a project
# - Create a test suite
# - Create a test case
# - Trigger a test execution

# 4. Monitor CloudWatch logs
# Go to AWS Console → CloudWatch → Log groups
# Check for any errors in Lambda function logs

# 5. Check CloudWatch alarms
# Go to AWS Console → CloudWatch → Alarms
# All alarms should be in "OK" or "INSUFFICIENT_DATA" state

# 6. Monitor costs
# Go to AWS Console → Billing Dashboard
# Check current month charges (should be near $0 initially)
```

## Rollback Procedures

### Rollback from Phase 3 (CDK Bootstrap Failed)

```bash
# No resources created yet, safe to retry
# Fix AWS credentials or IAM permissions
# Retry bootstrap command
```

### Rollback from Phase 4 (Deploy Failed)

```bash
# CDK automatically rolls back failed deployments
# If stack is in failed state, destroy it:
npx cdk destroy MisraPlatformStack --force

# Or via AWS CLI:
aws cloudformation delete-stack --stack-name MisraPlatformStack

# Wait for deletion to complete:
aws cloudformation wait stack-delete-complete --stack-name MisraPlatformStack

# Fix infrastructure code issues
# Retry deployment
```

### Rollback from Phase 6 (Frontend Deployment Failed)

```bash
# Backend is fine, just fix frontend
# No need to destroy backend stack

# Fix frontend configuration
# Rebuild and redeploy:
cd packages/frontend
npm run build
vercel --prod
```

### Complete Rollback (Start Over)

```bash
# 1. Destroy MisraPlatformStack
npx cdk destroy MisraPlatformStack

# 2. Delete CDK toolkit stack (if needed)
aws cloudformation delete-stack --stack-name CDKToolkit

# 3. Delete secrets (if created)
aws secretsmanager delete-secret \
  --secret-id aibts/openai-api-key \
  --force-delete-without-recovery

aws secretsmanager delete-secret \
  --secret-id aibts/huggingface-api-key \
  --force-delete-without-recovery

# 4. Verify all resources deleted
aws cloudformation list-stacks \
  --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
  --query 'StackSummaries[?StackName==`MisraPlatformStack`]'
# Should return empty array

# 5. Start over from Phase 1
```

## Cost Optimization

### Resource Configuration

1. **DynamoDB Tables**
   - Use PAY_PER_REQUEST billing mode (already configured)
   - No provisioned capacity charges
   - Only pay for actual reads/writes

2. **Lambda Functions**
   - Right-size memory allocations:
     - Small functions (auth, CRUD): 256 MB
     - Medium functions (AI generation): 1024 MB
     - Large functions (browser automation): 2048 MB
   - Use appropriate timeouts to avoid unnecessary charges

3. **API Gateway**
   - HTTP API (cheaper than REST API) - already configured
   - No caching required for MVP

4. **S3 Buckets**
   - Use S3 Standard for active files
   - Lifecycle policies to move old files to Glacier
   - Delete old screenshots after 30 days

5. **CloudWatch**
   - Use default log retention (never expire) for now
   - Can adjust later if costs increase
   - Alarms are free up to 10 alarms

6. **SNS/SQS**
   - First 1M SNS requests free per month
   - First 1M SQS requests free per month
   - Should stay within free tier

### Estimated Monthly Costs

| Service | Usage | Cost |
|---------|-------|------|
| Lambda | 100K invocations, 1GB-sec | $0.20 |
| DynamoDB | 1M reads, 500K writes | $1.50 |
| API Gateway | 100K requests | $0.10 |
| S3 | 10GB storage, 10K requests | $0.30 |
| CloudWatch | Logs, metrics, alarms | $2.00 |
| Cognito | 1K MAU | Free |
| SNS/SQS | 100K messages | Free |
| **Total** | | **~$4.10/month** |

Well within the $5-15/month target.

### Cost Monitoring

```typescript
// CloudWatch alarm for cost overrun
const costAlarm = new cloudwatch.Alarm(this, 'MonthlyCostAlarm', {
  alarmName: 'aibts-monthly-cost-overrun',
  alarmDescription: 'Alert when estimated monthly cost exceeds $15',
  metric: new cloudwatch.Metric({
    namespace: 'AWS/Billing',
    metricName: 'EstimatedCharges',
    dimensionsMap: {
      Currency: 'USD',
    },
    statistic: 'Maximum',
    period: cdk.Duration.hours(6),
  }),
  threshold: 15,
  evaluationPeriods: 1,
  comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
});
```

## Security Considerations

### Authentication and Authorization

- Cognito handles user authentication
- JWT tokens for API authorization
- Lambda authorizers validate tokens
- RBAC middleware enforces permissions

### Data Protection

- All DynamoDB tables use AWS-managed encryption
- S3 buckets use server-side encryption
- Secrets stored in AWS Secrets Manager
- No sensitive data in CloudWatch logs

### Network Security

- API Gateway uses HTTPS only
- CORS configured for frontend domain only
- Lambda functions in VPC not required (serverless)
- S3 buckets block public access

### IAM Permissions

- Lambda functions use least-privilege IAM roles
- Each function only has access to required resources
- No wildcard permissions
- Regular IAM policy audits

## Success Criteria

Deployment is considered successful when:

1. ✅ MisraPlatformStack deploys without errors
2. ✅ All DynamoDB tables created and in ACTIVE status
3. ✅ All Lambda functions deployed and in Active state
4. ✅ All API endpoints return successful responses
5. ✅ Frontend connects to API Gateway successfully
6. ✅ User can register and login
7. ✅ User can create projects, test suites, and test cases
8. ✅ Test execution workflow functional
9. ✅ AI test generation features functional
10. ✅ Notification system functional
11. ✅ No errors in CloudWatch logs
12. ✅ All CloudWatch alarms in OK state
13. ✅ Costs within $1-5/month target
14. ✅ Frontend deployed to Vercel successfully
15. ✅ Documentation updated with deployment outputs

## Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| AWS Account Setup | 1 hour | None |
| Create Secrets | 15 minutes | AWS account ready |
| CDK Bootstrap | 10 minutes | AWS CLI configured |
| Deploy MisraPlatformStack | 10-15 minutes | CDK bootstrapped |
| Seed Templates | 2 minutes | Stack deployed |
| Configure & Deploy Frontend | 20 minutes | Stack deployed |
| Validation & Testing | 1 hour | Frontend deployed |
| **Total** | **~3 hours** | |

## Risks and Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| AWS account creation issues | High | Low | Follow AWS documentation, contact support if needed |
| CDK deployment fails | Medium | Medium | Review CloudFormation errors, fix infrastructure code |
| API endpoint incompatibility | Medium | Low | Thorough testing, verify all endpoints |
| Cost overrun | Medium | Low | Cost estimation, monitoring, alarms |
| Frontend breaks after deployment | Medium | Low | Test thoroughly, quick rollback procedure |
| Secrets not accessible | Medium | Low | Verify IAM permissions, check secret names |
| Performance issues | Low | Low | Load testing, monitoring, auto-scaling |

## Conclusion

This design provides a straightforward, low-risk approach to deploying the complete AIBTS platform infrastructure to a fresh AWS account. With no existing resources to migrate, the deployment is simple and fast. The estimated cost of $1-5/month is well within the free tier limits, and the deployment can be completed in approximately 3 hours including testing.
