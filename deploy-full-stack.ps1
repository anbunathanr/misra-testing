# Deploy Full AIBTS Platform Stack
# This script deploys the complete platform with all endpoints

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AIBTS Full Platform Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "packages/backend")) {
    Write-Host "Error: Must run from project root directory" -ForegroundColor Red
    exit 1
}

# Verify AWS credentials
Write-Host "Step 1: Verifying AWS credentials..." -ForegroundColor Yellow
$awsAccount = aws sts get-caller-identity --query Account --output text 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: AWS credentials not configured" -ForegroundColor Red
    Write-Host "Run: aws configure" -ForegroundColor Yellow
    exit 1
}
Write-Host "AWS Account: $awsAccount" -ForegroundColor Green
Write-Host ""

# Set environment variables
Write-Host "Step 2: Setting environment variables..." -ForegroundColor Yellow
$env:CDK_DEFAULT_ACCOUNT = $awsAccount
$env:CDK_DEFAULT_REGION = "us-east-1"
$env:USE_HUGGINGFACE = "true"
Write-Host "Environment variables set" -ForegroundColor Green
Write-Host ""

# Build backend
Write-Host "Step 3: Building backend..." -ForegroundColor Yellow
Set-Location packages/backend
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Backend build failed" -ForegroundColor Red
    Set-Location ../..
    exit 1
}
Write-Host "Backend built successfully" -ForegroundColor Green
Write-Host ""

# Deploy full stack
Write-Host "Step 4: Deploying full platform stack..." -ForegroundColor Yellow
Write-Host "This will take 10-15 minutes..." -ForegroundColor Cyan
Write-Host ""
npx cdk deploy MisraPlatformStack --require-approval never

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  Deployment Failed" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "1. Table already exists - Run: npx cdk destroy MinimalStack" -ForegroundColor White
    Write-Host "2. Secret not found - Verify secrets exist in Secrets Manager" -ForegroundColor White
    Write-Host "3. CDK version mismatch - Check package.json has CDK 2.150.0" -ForegroundColor White
    Write-Host ""
    Set-Location ../..
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Deployment Successful!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Get outputs
Write-Host "Fetching deployment outputs..." -ForegroundColor Yellow
$outputs = aws cloudformation describe-stacks --stack-name MisraPlatformStack --query 'Stacks[0].Outputs' --output json | ConvertFrom-Json

$apiUrl = ($outputs | Where-Object { $_.OutputKey -eq "APIEndpoint" }).OutputValue
$userPoolId = ($outputs | Where-Object { $_.OutputKey -eq "UserPoolId" }).OutputValue
$clientId = ($outputs | Where-Object { $_.OutputKey -eq "UserPoolClientId" }).OutputValue

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deployment Information" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "API Endpoint: $apiUrl" -ForegroundColor White
Write-Host "User Pool ID: $userPoolId" -ForegroundColor White
Write-Host "Client ID: $clientId" -ForegroundColor White
Write-Host ""

# Save to file
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$envContent = @"
# Full Platform Deployment - $timestamp

API_ENDPOINT=$apiUrl
USER_POOL_ID=$userPoolId
CLIENT_ID=$clientId
AWS_REGION=us-east-1
AWS_ACCOUNT=$awsAccount

# Vercel Environment Variables
VITE_API_URL=$apiUrl
VITE_AWS_REGION=us-east-1
VITE_USER_POOL_ID=$userPoolId
VITE_USER_POOL_CLIENT_ID=$clientId
"@

Set-Location ../..
$envContent | Out-File -FilePath "FULL_STACK_DEPLOYMENT_INFO.txt" -Encoding UTF8

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Next Steps" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Update Vercel Environment Variables:" -ForegroundColor Yellow
Write-Host "   - Go to: https://vercel.com/dashboard" -ForegroundColor White
Write-Host "   - Project Settings -> Environment Variables" -ForegroundColor White
Write-Host "   - Update VITE_API_URL to: $apiUrl" -ForegroundColor White
if ($userPoolId -ne $null) {
    Write-Host "   - Update VITE_USER_POOL_ID to: $userPoolId" -ForegroundColor White
    Write-Host "   - Update VITE_USER_POOL_CLIENT_ID to: $clientId" -ForegroundColor White
}
Write-Host ""
Write-Host "2. Redeploy Frontend on Vercel" -ForegroundColor Yellow
Write-Host "   - Go to Deployments tab" -ForegroundColor White
Write-Host "   - Click ellipsis on latest deployment" -ForegroundColor White
Write-Host "   - Click Redeploy" -ForegroundColor White
Write-Host ""
Write-Host "3. Test Application" -ForegroundColor Yellow
Write-Host "   - Open: https://aibts-platform.vercel.app" -ForegroundColor White
Write-Host "   - Check console for errors" -ForegroundColor White
Write-Host "   - Try creating a project" -ForegroundColor White
Write-Host ""
Write-Host "Deployment info saved to: FULL_STACK_DEPLOYMENT_INFO.txt" -ForegroundColor Green
Write-Host ""
