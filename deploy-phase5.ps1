# Phase 5 Deployment Script
# This script deploys the complete AIBTS system with Cognito and Hugging Face

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "AIBTS Phase 5 Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Hugging Face token is in Secrets Manager
Write-Host "Step 1: Checking Hugging Face API token..." -ForegroundColor Yellow
$hfSecret = aws secretsmanager describe-secret --secret-id aibts/huggingface-api-key --region us-east-1 2>$null

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Hugging Face API token not found in Secrets Manager" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please create the secret first:" -ForegroundColor Yellow
    Write-Host "1. Get token from https://huggingface.co/settings/tokens" -ForegroundColor White
    Write-Host "2. Run: aws secretsmanager create-secret --name aibts/huggingface-api-key --secret-string `"hf_YOUR_TOKEN`" --region us-east-1" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "✅ Hugging Face API token found" -ForegroundColor Green
Write-Host ""

# Install backend dependencies
Write-Host "Step 2: Installing backend dependencies..." -ForegroundColor Yellow
Set-Location packages/backend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install backend dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Backend dependencies installed" -ForegroundColor Green
Write-Host ""

# Build backend
Write-Host "Step 3: Building backend..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to build backend" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Backend built successfully" -ForegroundColor Green
Write-Host ""

# Deploy backend
Write-Host "Step 4: Deploying backend to AWS..." -ForegroundColor Yellow
Write-Host "This may take 5-10 minutes..." -ForegroundColor Gray
cdk deploy MinimalStack --require-approval never
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to deploy backend" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Backend deployed successfully" -ForegroundColor Green
Write-Host ""

# Get CloudFormation outputs
Write-Host "Step 5: Getting CloudFormation outputs..." -ForegroundColor Yellow
$outputs = aws cloudformation describe-stacks --stack-name MinimalStack --region us-east-1 --query "Stacks[0].Outputs" --output json | ConvertFrom-Json

$apiUrl = ($outputs | Where-Object { $_.OutputKey -eq "ApiUrl" }).OutputValue
$userPoolId = ($outputs | Where-Object { $_.OutputKey -eq "UserPoolId" }).OutputValue
$userPoolClientId = ($outputs | Where-Object { $_.OutputKey -eq "UserPoolClientId" }).OutputValue

Write-Host "API URL: $apiUrl" -ForegroundColor White
Write-Host "User Pool ID: $userPoolId" -ForegroundColor White
Write-Host "User Pool Client ID: $userPoolClientId" -ForegroundColor White
Write-Host ""

# Update frontend environment
Write-Host "Step 6: Updating frontend environment..." -ForegroundColor Yellow
Set-Location ../../packages/frontend

$envContent = @"
VITE_API_URL=$apiUrl
VITE_COGNITO_USER_POOL_ID=$userPoolId
VITE_COGNITO_CLIENT_ID=$userPoolClientId
VITE_COGNITO_REGION=us-east-1
"@

$envContent | Out-File -FilePath .env.production -Encoding utf8
Write-Host "✅ Frontend environment updated" -ForegroundColor Green
Write-Host ""

# Install frontend dependencies
Write-Host "Step 7: Installing frontend dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install frontend dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Frontend dependencies installed" -ForegroundColor Green
Write-Host ""

# Build frontend
Write-Host "Step 8: Building frontend..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to build frontend" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Frontend built successfully" -ForegroundColor Green
Write-Host ""

# Deploy frontend to Vercel
Write-Host "Step 9: Deploying frontend to Vercel..." -ForegroundColor Yellow
vercel --prod --yes
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to deploy frontend" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Frontend deployed successfully" -ForegroundColor Green
Write-Host ""

# Return to root
Set-Location ../..

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deployment Complete! 🚀" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Test user registration at https://aibts-platform.vercel.app/register" -ForegroundColor White
Write-Host "2. Test user login" -ForegroundColor White
Write-Host "3. Test AI test generation" -ForegroundColor White
Write-Host "4. Monitor CloudWatch logs: aws logs tail /aws/lambda/aibts-ai-generate --follow" -ForegroundColor White
Write-Host ""
Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "API URL: $apiUrl" -ForegroundColor White
Write-Host "Frontend URL: https://aibts-platform.vercel.app" -ForegroundColor White
Write-Host "User Pool ID: $userPoolId" -ForegroundColor White
Write-Host ""
