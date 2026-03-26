# Step-by-Step Clean Deployment

## Current Status
- ✓ Lambda functions built and bundled (86 functions)
- ✓ CDK stack deployed (MisraPlatformStackV2)
- ✓ API Gateway created with routes
- ✗ Lambda functions not being created by CDK (path issue)

## Issue
The CDK stack is trying to load Lambda functions from relative paths that don't exist at deployment time. The `dist-zips` directory is local but CDK needs absolute paths or S3 references.

## Solution: Deploy Lambda Functions Manually

Since the CDK stack is already deployed with API Gateway and routes, we can deploy the Lambda functions manually and they'll automatically integrate.

### Step 1: Deploy Register Function

```powershell
# Create function from bundled code
aws lambda create-function `
  --function-name misra-register `
  --runtime nodejs20.x `
  --role arn:aws:iam::982479882798:role/lambda-basic-execution `
  --handler index.handler `
  --zip-file fileb://packages/backend/dist-zips/auth/register/index.zip `
  --timeout 30 `
  --memory-size 256

# Or update if it exists
aws lambda update-function-code `
  --function-name misra-register `
  --zip-file fileb://packages/backend/dist-zips/auth/register/index.zip
```

### Step 2: Deploy Login Function

```powershell
aws lambda create-function `
  --function-name misra-login `
  --runtime nodejs20.x `
  --role arn:aws:iam::982479882798:role/lambda-basic-execution `
  --handler index.handler `
  --zip-file fileb://packages/backend/dist-zips/auth/login/index.zip `
  --timeout 30 `
  --memory-size 256
```

### Step 3: Deploy All Other Functions

```powershell
# Script to deploy all functions
$functions = @(
    @{name="get-projects"; path="projects/get-projects"},
    @{name="create-project"; path="projects/create-project"},
    @{name="update-project"; path="projects/update-project"},
    @{name="get-test-suites"; path="test-suites/get-suites"},
    @{name="create-test-suite"; path="test-suites/create-suite"},
    @{name="update-test-suite"; path="test-suites/update-suite"},
    @{name="get-test-cases"; path="test-cases/get-test-cases"},
    @{name="create-test-case"; path="test-cases/create-test-case"},
    @{name="update-test-case"; path="test-cases/update-test-case"},
    @{name="get-files"; path="file/get-files"},
    @{name="upload-file"; path="file/upload"},
    @{name="query-analysis"; path="analysis/query-results"},
    @{name="get-user-stats"; path="analysis/get-user-stats"},
    @{name="trigger-execution"; path="executions/trigger"},
    @{name="get-execution-status"; path="executions/get-status"},
    @{name="get-execution-results"; path="executions/get-results"},
    @{name="get-execution-history"; path="executions/get-history"},
    @{name="get-suite-execution-results"; path="executions/get-suite-results"},
    @{name="generate-insights"; path="ai/generate-insights"},
    @{name="refresh"; path="auth/refresh"},
    @{name="get-profile"; path="auth/get-profile"},
    @{name="get-preferences"; path="notifications/get-preferences"},
    @{name="update-preferences"; path="notifications/update-preferences"},
    @{name="get-history"; path="notifications/get-history"},
    @{name="get-notification"; path="notifications/get-notification"},
    @{name="get-templates"; path="notifications/get-templates"},
    @{name="create-template"; path="notifications/create-template"},
    @{name="update-template"; path="notifications/update-template"}
)

foreach ($func in $functions) {
    $zipPath = "packages/backend/dist-zips/$($func.path)/index.zip"
    $functionName = "misra-$($func.name)"
    
    if (Test-Path $zipPath) {
        Write-Host "Deploying $functionName..."
        
        # Try to create, if exists update
        $exists = aws lambda get-function --function-name $functionName 2>&1 | Select-String "FunctionArn"
        
        if ($exists) {
            aws lambda update-function-code `
              --function-name $functionName `
              --zip-file fileb://$zipPath | Out-Null
        } else {
            aws lambda create-function `
              --function-name $functionName `
              --runtime nodejs20.x `
              --role arn:aws:iam::982479882798:role/lambda-basic-execution `
              --handler index.handler `
              --zip-file fileb://$zipPath `
              --timeout 30 `
              --memory-size 256 | Out-Null
        }
        
        Write-Host "✓ $functionName deployed"
    } else {
        Write-Host "✗ $zipPath not found"
    }
}
```

## Next Steps

1. Deploy all Lambda functions
2. Test API endpoints
3. Build and deploy frontend
4. Test end-to-end flow

## Testing

```powershell
$apiEndpoint = "https://ljvcr2fpl3.execute-api.us-east-1.amazonaws.com"

# Test register
$body = @{
    email = "test@example.com"
    password = "Test123456"
    name = "Test User"
} | ConvertTo-Json

Invoke-RestMethod -Uri "$apiEndpoint/auth/register" -Method POST -Body $body -ContentType "application/json"
```
