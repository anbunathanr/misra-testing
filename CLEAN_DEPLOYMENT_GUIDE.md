# Clean Deployment Guide - Start Fresh

This guide walks through deploying the MISRA Platform SaaS from scratch, validating each step.

## Prerequisites

- AWS Account with credentials configured
- Node.js 20+
- npm or yarn
- AWS CDK CLI installed: `npm install -g aws-cdk`

## Phase 1: Clean Up Existing Deployment

### Step 1.1: Destroy Old Stacks

```powershell
# List all stacks
aws cloudformation list-stacks --query 'StackSummaries[?StackStatus!=`DELETE_COMPLETE`].StackName' --output text

# Destroy MisraPlatformStackV2 (the one we'll use)
cdk destroy MisraPlatformStackV2 --force

# Wait for deletion to complete
aws cloudformation wait stack-delete-complete --stack-name MisraPlatformStackV2
```

### Step 1.2: Clean Up Lambda Functions

```powershell
# List all Lambda functions
aws lambda list-functions --query 'Functions[*].FunctionName' --output text

# Delete manually created functions (if any)
aws lambda delete-function --function-name misra-register
aws lambda delete-function --function-name misra-platform-register
```

### Step 1.3: Verify Clean State

```powershell
# Should return empty or minimal functions
aws lambda list-functions --query 'Functions[*].FunctionName' --output text

# Should return empty
aws apigateway get-rest-apis --query 'items[*].name' --output text
```

## Phase 2: Build Backend

### Step 2.1: Install Dependencies

```powershell
cd packages/backend
npm install
```

### Step 2.2: Build Lambda Functions

```powershell
# Build all Lambda functions
npm run build:lambdas

# Verify dist-zips directory has all functions
Get-ChildItem dist-zips -Recurse | Where-Object {$_.Name -eq "index.zip"} | Measure-Object
```

Expected output: Should show multiple index.zip files for each function.

### Step 2.3: Verify Build Output

```powershell
# Check that auth functions are bundled
Get-ChildItem dist-zips/auth -Recurse

# Should show:
# - register/index.zip
# - login/index.zip
# - refresh/index.zip
# - get-profile/index.zip
```

## Phase 3: Deploy Infrastructure

### Step 3.1: Deploy CDK Stack

```powershell
cd packages/backend

# Synthesize the stack (generates CloudFormation template)
cdk synth MisraPlatformStackV2

# Deploy the stack
cdk deploy MisraPlatformStackV2 --require-approval never

# Wait for deployment to complete (5-10 minutes)
```

### Step 3.2: Verify Deployment

```powershell
# Check stack status
aws cloudformation describe-stacks --stack-name MisraPlatformStackV2 --query 'Stacks[0].StackStatus' --output text

# Should return: CREATE_COMPLETE

# Get API Gateway endpoint
aws cloudformation describe-stacks --stack-name MisraPlatformStackV2 --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' --output text

# Save this URL - you'll need it for testing
```

### Step 3.3: Verify Lambda Functions Deployed

```powershell
# List deployed Lambda functions
aws lambda list-functions --query 'Functions[?starts_with(FunctionName, `misra-`)].FunctionName' --output text

# Should include:
# - misra-register
# - misra-login
# - misra-get-projects
# - misra-create-project
# - etc.
```

### Step 3.4: Verify API Gateway Routes

```powershell
# Get API ID
$apiId = aws apigatewayv2 get-apis --query 'Items[0].ApiId' --output text

# List routes
aws apigatewayv2 get-routes --api-id $apiId --query 'Items[*].[RouteKey,Target]' --output table

# Should show routes like:
# - POST /auth/register
# - POST /auth/login
# - GET /projects
# - POST /projects
# - etc.
```

## Phase 4: Test Backend API

### Step 4.1: Get API Endpoint

```powershell
$apiEndpoint = aws cloudformation describe-stacks --stack-name MisraPlatformStackV2 --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' --output text

Write-Host "API Endpoint: $apiEndpoint"
```

### Step 4.2: Test Health Check (GET /projects)

```powershell
$response = Invoke-RestMethod -Uri "$apiEndpoint/projects" -Method GET -ErrorAction SilentlyContinue

Write-Host "Response: $($response | ConvertTo-Json)"

# Expected: Should return a response (may be empty or error, but should not timeout)
```

### Step 4.3: Test Register Endpoint

```powershell
$body = @{
    email = "test@example.com"
    password = "Test123456"
    name = "Test User"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "$apiEndpoint/auth/register" -Method POST -Body $body -ContentType "application/json" -ErrorAction SilentlyContinue

Write-Host "Response: $($response | ConvertTo-Json)"

# Expected: Should return 201 or error response (not 500)
```

### Step 4.4: Check CloudWatch Logs

```powershell
# Get log group name
$logGroupName = "/aws/lambda/misra-register"

# Get latest log stream
$logStream = aws logs describe-log-streams --log-group-name $logGroupName --order-by LastEventTime --descending --limit 1 --query 'logStreams[0].logStreamName' --output text

# Get log events
aws logs get-log-events --log-group-name $logGroupName --log-stream-name $logStream --limit 50 --query 'events[*].message' --output text
```

## Phase 5: Build Frontend

### Step 5.1: Install Dependencies

```powershell
cd packages/frontend
npm install
```

### Step 5.2: Update Environment Variables

```powershell
# Update .env with API endpoint
$apiEndpoint = aws cloudformation describe-stacks --stack-name MisraPlatformStackV2 --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' --output text

# Create .env file
@"
VITE_API_URL=$apiEndpoint
VITE_COGNITO_DOMAIN=
VITE_COGNITO_CLIENT_ID=
VITE_COGNITO_REDIRECT_URI=http://localhost:5173
"@ | Out-File -FilePath .env -Encoding UTF8
```

### Step 5.3: Build Frontend

```powershell
npm run build

# Verify dist directory
Get-ChildItem dist | Measure-Object
```

## Phase 6: Deploy Frontend

### Step 6.1: Create S3 Bucket

```powershell
$bucketName = "misra-platform-frontend-$(Get-Random -Minimum 10000 -Maximum 99999)"

aws s3 mb "s3://$bucketName" --region us-east-1

# Enable website hosting
aws s3 website "s3://$bucketName" --index-document index.html --error-document index.html

# Make bucket public
aws s3api put-bucket-policy --bucket $bucketName --policy @"{
  `"Version`": `"2012-10-17`",
  `"Statement`": [
    {
      `"Sid`": `"PublicRead`",
      `"Effect`": `"Allow`",
      `"Principal`": `"*`",
      `"Action`": `"s3:GetObject`",
      `"Resource`": `"arn:aws:s3:::$bucketName/*`"
    }
  ]
}"
```

### Step 6.2: Upload Frontend Files

```powershell
aws s3 sync dist "s3://$bucketName" --delete

# Verify upload
aws s3 ls "s3://$bucketName" --recursive | Measure-Object
```

### Step 6.3: Get Frontend URL

```powershell
$frontendUrl = "http://$bucketName.s3-website-us-east-1.amazonaws.com"

Write-Host "Frontend URL: $frontendUrl"
```

## Phase 7: End-to-End Testing

### Step 7.1: Test Frontend Access

```powershell
# Open in browser
Start-Process "$frontendUrl"

# Or test with curl
curl -I "$frontendUrl"
```

### Step 7.2: Test Registration Flow

1. Navigate to frontend URL
2. Click "Register"
3. Enter test credentials
4. Submit form
5. Check browser console for errors

### Step 7.3: Test Login Flow

1. After registration, try to login
2. Check if token is stored
3. Verify dashboard loads

## Validation Checklist

- [ ] CDK stack deployed successfully
- [ ] API Gateway created with routes
- [ ] Lambda functions deployed
- [ ] CloudWatch logs accessible
- [ ] API endpoints respond (no 500 errors)
- [ ] Frontend builds without errors
- [ ] Frontend S3 bucket created and public
- [ ] Frontend accessible via browser
- [ ] Registration endpoint works
- [ ] Login endpoint works
- [ ] Frontend can call backend API

## Troubleshooting

### Lambda Functions Return 500

1. Check CloudWatch logs: `aws logs tail /aws/lambda/misra-register --follow`
2. Verify environment variables: `aws lambda get-function-configuration --function-name misra-register`
3. Check IAM permissions for DynamoDB access

### API Gateway Not Found

1. Verify stack deployed: `aws cloudformation describe-stacks --stack-name MisraPlatformStackV2`
2. Check outputs: `aws cloudformation describe-stacks --stack-name MisraPlatformStackV2 --query 'Stacks[0].Outputs'`

### Frontend Can't Call Backend

1. Check CORS settings in API Gateway
2. Verify API endpoint in .env file
3. Check browser console for CORS errors

## Next Steps

Once all validations pass:
1. Create test users in DynamoDB
2. Set up monitoring and alerts
3. Configure custom domain
4. Set up CI/CD pipeline
5. Enable authentication
