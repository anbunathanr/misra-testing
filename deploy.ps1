# MISRA Platform Deployment Script
# This script automates the deployment process

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "MISRA Platform Deployment Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

# Check AWS CLI
try {
    $awsVersion = aws --version 2>&1
    Write-Host "✓ AWS CLI installed: $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ AWS CLI not found. Please install AWS CLI first." -ForegroundColor Red
    exit 1
}

# Check AWS credentials
try {
    $identity = aws sts get-caller-identity 2>&1 | ConvertFrom-Json
    Write-Host "✓ AWS credentials configured" -ForegroundColor Green
    Write-Host "  Account: $($identity.Account)" -ForegroundColor Gray
    Write-Host "  User: $($identity.Arn)" -ForegroundColor Gray
} catch {
    Write-Host "✗ AWS credentials not configured. Run 'aws configure' first." -ForegroundColor Red
    exit 1
}

# Check CDK
try {
    $cdkVersion = cdk --version 2>&1
    Write-Host "✓ AWS CDK installed: $cdkVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ AWS CDK not found. Install with: npm install -g aws-cdk" -ForegroundColor Red
    exit 1
}

# Check Node.js
try {
    $nodeVersion = node --version 2>&1
    Write-Host "✓ Node.js installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js not found. Please install Node.js 20+ first." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Step 1: Install Dependencies" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Install backend dependencies
Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
Set-Location packages/backend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to install backend dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Backend dependencies installed" -ForegroundColor Green

# Install frontend dependencies
Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
Set-Location ../frontend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to install frontend dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Frontend dependencies installed" -ForegroundColor Green

Set-Location ../..

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Step 2: Build Backend" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Set-Location packages/backend
Write-Host "Building backend..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Backend build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Backend built successfully" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Step 3: Deploy to AWS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "IMPORTANT: Before deploying, ensure you have:" -ForegroundColor Yellow
Write-Host "1. Created AWS Secrets Manager secrets for:" -ForegroundColor Yellow
Write-Host "   - misra-platform/jwt-secret" -ForegroundColor Yellow
Write-Host "   - misra-platform/n8n-webhook-url" -ForegroundColor Yellow
Write-Host "   - misra-platform/n8n-api-key" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. Bootstrapped CDK (first time only):" -ForegroundColor Yellow
Write-Host "   cdk bootstrap" -ForegroundColor Yellow
Write-Host ""

$deploy = Read-Host "Do you want to proceed with deployment? (yes/no)"
if ($deploy -ne "yes") {
    Write-Host "Deployment cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Deploying infrastructure..." -ForegroundColor Yellow
cdk deploy --require-approval never

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Deployment failed" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Backend deployed successfully!" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Step 4: Get API Gateway URL" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "Check the CDK output above for the API Gateway URL" -ForegroundColor Yellow
Write-Host "It should look like: https://xxxxxxxxxx.execute-api.REGION.amazonaws.com" -ForegroundColor Yellow
Write-Host ""

$apiUrl = Read-Host "Enter the API Gateway URL (or press Enter to skip frontend build)"

if ($apiUrl) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Step 5: Configure and Build Frontend" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan

    Set-Location ../frontend

    # Create .env file
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    "VITE_API_URL=$apiUrl" | Out-File -FilePath .env -Encoding utf8
    Write-Host "✓ .env file created" -ForegroundColor Green

    # Build frontend
    Write-Host "Building frontend..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Frontend build failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Frontend built successfully" -ForegroundColor Green

    Write-Host ""
    Write-Host "Frontend build is ready in: packages/frontend/dist/" -ForegroundColor Green
    Write-Host ""
    Write-Host "To deploy frontend to S3:" -ForegroundColor Yellow
    Write-Host "1. Create S3 bucket: aws s3 mb s3://misra-platform-frontend" -ForegroundColor Gray
    Write-Host "2. Upload files: aws s3 sync dist/ s3://misra-platform-frontend" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Or run locally: npm run dev" -ForegroundColor Yellow
}

Set-Location ../..

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Test the API endpoints" -ForegroundColor Gray
Write-Host "2. Create test users in DynamoDB" -ForegroundColor Gray
Write-Host "3. Deploy frontend to S3 or run locally" -ForegroundColor Gray
Write-Host "4. Test all features end-to-end" -ForegroundColor Gray
Write-Host ""
Write-Host "For detailed instructions, see DEPLOYMENT_GUIDE.md" -ForegroundColor Cyan
Write-Host ""
