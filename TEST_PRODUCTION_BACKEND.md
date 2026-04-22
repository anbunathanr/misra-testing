# Testing the Production Backend

## Quick Test Commands

### 1. Test Health Endpoint (No Auth Required)

```bash
curl -X GET https://pkgjbizs63.execute-api.us-east-1.amazonaws.com/dev/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-04-22T...",
  "environment": "dev"
}
```

### 2. Check Cognito User Pool

```bash
# List users in the pool
aws cognito-idp list-users --user-pool-id us-east-1_uEQr80iZX

# Get user pool details
aws cognito-idp describe-user-pool --user-pool-id us-east-1_uEQr80iZX
```

### 3. Check DynamoDB Tables

```bash
# List all tables
aws dynamodb list-tables

# Scan users table
aws dynamodb scan --table-name misra-platform-users-dev --limit 5

# Scan file metadata table
aws dynamodb scan --table-name misra-platform-file-metadata-dev --limit 5
```

### 4. Check S3 Bucket

```bash
# List files in bucket
aws s3 ls s3://misra-platform-files-dev-982479882798/

# Check bucket configuration
aws s3api get-bucket-cors --bucket misra-platform-files-dev-982479882798
```

### 5. Check Secrets Manager

```bash
# List all secrets
aws secretsmanager list-secrets --query 'SecretList[?contains(Name, `misra-platform`)].Name'

# Get JWT secret (first 100 chars)
aws secretsmanager get-secret-value --secret-id misra-platform/jwt-secret-dev --query 'SecretString' | head -c 100
```

## Frontend Testing

### 1. Open the Application

Navigate to: `http://localhost:3000/`

### 2. Test User Registration

1. Click "Register" or "Sign Up"
2. Enter email: `test@example.com`
3. Enter password: `TestPassword123!`
4. Submit

Expected: Email verification code sent to your email

### 3. Verify Email

1. Check your email for verification code
2. Enter code in the verification form
3. Submit

Expected: Email verified, proceed to login

### 4. Test Login

1. Enter email: `test@example.com`
2. Enter password: `TestPassword123!`
3. Submit

Expected: Redirected to dashboard or MFA setup

### 5. Set Up MFA (if required)

1. Scan QR code with authenticator app (Google Authenticator, Authy, etc.)
2. Enter 6-digit code from app
3. Submit

Expected: MFA setup complete, logged in

### 6. Test File Upload

1. Click "Upload File" or "Analyze Code"
2. Select a C/C++ file
3. Submit

Expected: File uploaded to S3, analysis triggered

### 7. Check Analysis Results

1. Wait for analysis to complete
2. View MISRA violations
3. Check compliance percentage

Expected: Real MISRA analysis results from Lambda

## Monitoring

### CloudWatch Logs

```bash
# View Lambda Authorizer logs
aws logs tail /aws/lambda/misra-platform-authorizer-dev --follow

# View API Gateway logs
aws logs tail /aws/apigateway/misra-platform-dev --follow
```

### CloudFormation Stack

```bash
# Get stack status
aws cloudformation describe-stacks --stack-name MisraPlatform-dev --query 'Stacks[0].StackStatus'

# Get stack events
aws cloudformation describe-stack-events --stack-name MisraPlatform-dev --query 'StackEvents[0:10]'
```

## Troubleshooting

### CORS Error

If you see: `Access to fetch at '...' from origin 'http://localhost:3000' has been blocked by CORS policy`

**Solution**: The API Gateway CORS is configured for all origins in dev. Check:
1. Browser console for exact error
2. API Gateway logs: `aws logs tail /aws/apigateway/misra-platform-dev`
3. Verify API URL in `.env.local`

### 404 Not Found

If you see: `POST https://pkgjbizs63.execute-api.us-east-1.amazonaws.com/dev/auth/... 404`

**Solution**: The endpoint hasn't been implemented yet. This is expected for Phase 2.
- Health endpoint works: `/dev/health`
- Other endpoints will be added in next phase

### Authentication Failed

If login fails:

```bash
# Check if user exists
aws cognito-idp admin-get-user --user-pool-id us-east-1_uEQr80iZX --username test@example.com

# Check user status
aws cognito-idp admin-get-user --user-pool-id us-east-1_uEQr80iZX --username test@example.com --query 'UserStatus'
```

### MFA Issues

If MFA setup fails:

```bash
# Check user attributes
aws cognito-idp admin-get-user --user-pool-id us-east-1_uEQr80iZX --username test@example.com --query 'UserAttributes'

# Disable MFA for testing (if needed)
aws cognito-idp admin-set-user-mfa-preference --user-pool-id us-east-1_uEQr80iZX --username test@example.com --sms-mfa-settings Enabled=false --software-token-mfa-settings Enabled=false
```

## Performance Testing

### Load Test Health Endpoint

```bash
# Using Apache Bench (if installed)
ab -n 100 -c 10 https://pkgjbizs63.execute-api.us-east-1.amazonaws.com/dev/health

# Using curl in a loop
for i in {1..10}; do curl -s https://pkgjbizs63.execute-api.us-east-1.amazonaws.com/dev/health | jq '.status'; done
```

## Next Steps

1. **Implement Auth Endpoints**: Create Lambda functions for login, register, verify email
2. **Implement File Endpoints**: Create Lambda functions for file upload and retrieval
3. **Implement Analysis Endpoints**: Create Lambda functions for triggering MISRA analysis
4. **Add CloudWatch Monitoring**: Re-enable monitoring dashboard
5. **Set Up CI/CD**: Automate deployments

---

**API Gateway URL**: https://pkgjbizs63.execute-api.us-east-1.amazonaws.com/dev/
**Cognito User Pool**: us-east-1_uEQr80iZX
**Frontend**: http://localhost:3000/
