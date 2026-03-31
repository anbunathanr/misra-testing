# Fix 503 Error on Project Creation

## Problem
The `POST /projects` endpoint returns 503 (Service Unavailable) because the Lambda function is timing out during JWT verification.

## Root Cause
The Lambda function (`misra-platform-create-project`) is trying to verify JWT tokens by fetching JWKS keys from Cognito, which is causing timeouts.

## Quick Fix Options

### Option 1: Use API Gateway Cognito Authorizer (Recommended)
Configure API Gateway to handle authentication, so the Lambda doesn't need to verify tokens.

### Option 2: Increase Lambda Timeout & Add Environment Variables
The Lambda needs proper environment variables for Cognito configuration.

## Current Lambda Configuration
- Timeout: 30 seconds
- Memory: 128 MB
- Runtime: nodejs20.x
- State: Active

## Missing Environment Variables
The Lambda likely needs:
- `USER_POOL_ID`: Cognito User Pool ID
- `USER_POOL_CLIENT_ID`: Cognito App Client ID  
- `AWS_REGION`: us-east-1

## Immediate Workaround

Since this is a demo/testing environment, I'll create a simplified version that bypasses JWT verification temporarily.

### Steps:
1. Update Lambda environment variables
2. Increase timeout to 60 seconds
3. Test the endpoint

## Commands to Fix

```powershell
# Set environment variables
aws lambda update-function-configuration `
  --function-name misra-platform-create-project `
  --environment "Variables={USER_POOL_ID=us-east-1_W0pQQHwUE,AWS_REGION=us-east-1,DYNAMODB_TABLE=misra-platform-projects}" `
  --timeout 60

# Wait for update to complete
Start-Sleep -Seconds 5

# Test the function
# (Try creating a project in the UI again)
```

## Alternative: Direct DynamoDB Access (Temporary)

For immediate testing, you can create projects directly in DynamoDB:

```powershell
aws dynamodb put-item `
  --table-name misra-platform-projects `
  --item '{
    "projectId": {"S": "proj-test-001"},
    "userId": {"S": "YOUR_USER_ID"},
    "name": {"S": "Test Project"},
    "description": {"S": "My test project"},
    "targetUrl": {"S": "https://example.com"},
    "environment": {"S": "Development"},
    "createdAt": {"S": "'$(Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ")'"},
    "updatedAt": {"S": "'$(Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ")'"}
  }'
```

## Long-term Solution

The proper fix requires updating the CDK stack to:
1. Add Cognito Authorizer to API Gateway
2. Remove JWT verification from Lambda functions
3. Use `event.requestContext.authorizer.claims` for user info
