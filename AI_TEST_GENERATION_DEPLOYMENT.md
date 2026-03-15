# AI Test Generation Feature - Deployment Guide

## Overview

This guide covers the deployment and configuration of the AI-Based Test Generation feature for the AIBTS platform.

## Prerequisites

1. **OpenAI API Key**: You need an active OpenAI API account with access to GPT-4 or GPT-3.5-turbo
2. **AWS Account**: Configured with appropriate permissions for Lambda, DynamoDB, and API Gateway
3. **Node.js**: Version 20.x or higher
4. **AWS CDK**: Version 2.x installed globally

## Infrastructure Components

The AI Test Generation feature adds the following infrastructure:

### DynamoDB Tables
- **AIUsage**: Tracks OpenAI API usage, token consumption, and costs
  - Partition Key: `userId`
  - Sort Key: `timestamp`
  - GSI: `ProjectIndex` (projectId + timestamp)

### Lambda Functions
- **aibts-ai-analyze**: Analyzes web applications to identify testable elements
  - Timeout: 5 minutes
  - Memory: 2048 MB (for Puppeteer)
  
- **aibts-ai-generate**: Generates single test case from analysis and scenario
  - Timeout: 2 minutes
  - Memory: 1024 MB
  
- **aibts-ai-batch**: Generates multiple test cases in batch
  - Timeout: 15 minutes
  - Memory: 2048 MB
  
- **aibts-ai-usage**: Retrieves usage statistics and cost estimates
  - Timeout: 30 seconds
  - Memory: 256 MB

### API Gateway Routes
- `POST /ai-test-generation/analyze` - Analyze web application
- `POST /ai-test-generation/generate` - Generate single test case
- `POST /ai-test-generation/batch` - Generate multiple test cases
- `GET /ai-test-generation/usage` - Get usage statistics

## Environment Variables

### Required Variables

```bash
# OpenAI API Configuration
OPENAI_API_KEY=sk-...  # Your OpenAI API key (REQUIRED)
```

### Optional Configuration Variables

```bash
# Model Selection (default: gpt-4)
AI_MODEL=gpt-4  # or gpt-3.5-turbo

# Model Parameters
AI_MAX_TOKENS=2000
AI_TEMPERATURE=0.7

# Usage Limits
USER_MONTHLY_COST_LIMIT=100  # USD per user per month
USER_DAILY_CALL_LIMIT=100    # API calls per user per day
PROJECT_MONTHLY_COST_LIMIT=50  # USD per project per month
PROJECT_DAILY_CALL_LIMIT=50    # API calls per project per day

# Retry Configuration
AI_RETRY_MAX_ATTEMPTS=3
AI_RETRY_INITIAL_DELAY_MS=1000
AI_RETRY_MAX_DELAY_MS=4000
AI_RETRY_BACKOFF_MULTIPLIER=2

# Timeout Configuration
AI_ANALYSIS_TIMEOUT_MS=30000      # 30 seconds
AI_GENERATION_TIMEOUT_MS=60000    # 60 seconds
AI_BATCH_TIMEOUT_MS=300000        # 5 minutes

# Batch Processing
AI_BATCH_MAX_CONCURRENCY=3        # Parallel scenario processing
AI_BATCH_MAX_SCENARIOS=20         # Max scenarios per batch
```

## Deployment Steps

### 1. Set Environment Variables

Create a `.env` file in the `packages/backend` directory:

```bash
cp .env.example .env
```

Edit `.env` and set your OpenAI API key:

```bash
OPENAI_API_KEY=sk-your-actual-api-key-here
```

### 2. Install Dependencies

```bash
cd packages/backend
npm install
```

### 3. Build the Backend

```bash
npm run build
```

### 4. Deploy Infrastructure

```bash
# Bootstrap CDK (first time only)
cdk bootstrap

# Deploy the stack
cdk deploy
```

The deployment will:
- Create the AIUsage DynamoDB table
- Deploy 4 Lambda functions for AI test generation
- Configure API Gateway routes
- Set up IAM permissions

### 5. Verify Deployment

After deployment, verify the infrastructure:

```bash
# Check Lambda functions
aws lambda list-functions --query 'Functions[?starts_with(FunctionName, `aibts-ai`)].FunctionName'

# Check DynamoDB table
aws dynamodb describe-table --table-name AIUsage

# Check API Gateway
aws apigatewayv2 get-apis --query 'Items[?Name==`misra-platform-api`]'
```

## Configuration Management

### Default Configuration

The system uses sensible defaults defined in `packages/backend/src/config/ai-test-generation-config.ts`:

- **Model**: GPT-4
- **User Limit**: $100/month
- **Project Limit**: $50/month
- **Retry**: 3 attempts with exponential backoff
- **Batch Concurrency**: 3 parallel scenarios

### Customizing Configuration

You can customize the configuration by:

1. **Environment Variables**: Set variables in `.env` or Lambda environment
2. **Code Changes**: Modify `defaultConfig` in `ai-test-generation-config.ts`

### Cost Management

The system enforces usage limits to prevent unexpected costs:

- **Per-User Limits**: Monthly cost cap and daily API call limit
- **Per-Project Limits**: Monthly cost cap and daily API call limit
- **Fail-Open**: If limit check fails, requests are allowed (prevents service disruption)

Monitor costs using the usage statistics endpoint:

```bash
GET /ai-test-generation/usage?userId=<userId>&startDate=2024-01-01&endDate=2024-01-31
```

## Testing the Deployment

### 1. Test Analysis Endpoint

```bash
curl -X POST https://your-api-gateway-url/ai-test-generation/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -d '{
    "url": "https://example.com",
    "options": {
      "timeout": 30000
    }
  }'
```

### 2. Test Generation Endpoint

```bash
curl -X POST https://your-api-gateway-url/ai-test-generation/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -d '{
    "analysis": { ... },
    "scenario": "Test user login with valid credentials",
    "projectId": "project-uuid",
    "suiteId": "suite-uuid"
  }'
```

### 3. Test Batch Endpoint

```bash
curl -X POST https://your-api-gateway-url/ai-test-generation/batch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -d '{
    "url": "https://example.com",
    "scenarios": [
      "Test user login",
      "Test user registration",
      "Test password reset"
    ],
    "projectId": "project-uuid",
    "suiteId": "suite-uuid"
  }'
```

### 4. Test Usage Stats Endpoint

```bash
curl -X GET "https://your-api-gateway-url/ai-test-generation/usage?userId=user-uuid" \
  -H "Authorization: Bearer <your-jwt-token>"
```

## Monitoring

### CloudWatch Metrics

Monitor the following metrics in CloudWatch:

- **Lambda Invocations**: Track API usage
- **Lambda Errors**: Identify failures
- **Lambda Duration**: Monitor performance
- **DynamoDB Read/Write Capacity**: Track database usage

### CloudWatch Logs

Lambda function logs are available in CloudWatch Logs:

- `/aws/lambda/aibts-ai-analyze`
- `/aws/lambda/aibts-ai-generate`
- `/aws/lambda/aibts-ai-batch`
- `/aws/lambda/aibts-ai-usage`

### Cost Tracking

Monitor OpenAI API costs:

1. Check usage statistics via API endpoint
2. Review AIUsage DynamoDB table
3. Set up CloudWatch alarms for cost thresholds

## Troubleshooting

### Common Issues

#### 1. OpenAI API Key Not Set

**Error**: "OpenAI API key is not configured"

**Solution**: Set `OPENAI_API_KEY` environment variable in Lambda function configuration

#### 2. Usage Limit Exceeded

**Error**: "Usage limit exceeded"

**Solution**: 
- Check current usage via `/ai-test-generation/usage` endpoint
- Increase limits in configuration
- Wait for monthly reset

#### 3. Analysis Timeout

**Error**: "Failed to analyze application: timeout"

**Solution**:
- Increase `AI_ANALYSIS_TIMEOUT_MS` environment variable
- Check if target website is accessible
- Verify Lambda has sufficient memory (2048 MB recommended)

#### 4. Puppeteer Errors

**Error**: "Failed to launch browser"

**Solution**:
- Ensure Lambda has 2048 MB memory
- Check Lambda timeout is sufficient (5 minutes for analysis)
- Verify Puppeteer dependencies are included in deployment package

### Debug Mode

Enable detailed logging by setting:

```bash
LOG_LEVEL=debug
```

## Security Considerations

1. **API Key Protection**: Store OpenAI API key in AWS Secrets Manager (recommended) or environment variables
2. **Authentication**: All endpoints require JWT authentication
3. **Authorization**: Users can only view their own usage statistics
4. **Rate Limiting**: Enforced via usage limits
5. **Input Validation**: All inputs are validated before processing

## Rollback Procedure

If issues occur after deployment:

```bash
# Rollback to previous version
cdk deploy --rollback

# Or manually delete the stack
cdk destroy
```

## Next Steps

1. **Frontend Integration**: Integrate AI test generation UI components
2. **Learning Engine**: Implement learning from test execution results (Task 11)
3. **Property Tests**: Add property-based tests for correctness validation
4. **Monitoring Dashboard**: Create CloudWatch dashboard for AI test generation metrics

## Support

For issues or questions:
- Check CloudWatch Logs for error details
- Review the design document: `.kiro/specs/ai-test-generation/design.md`
- Review the requirements: `.kiro/specs/ai-test-generation/requirements.md`
