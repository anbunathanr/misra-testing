# MISRA Platform - Production Setup Script
# This script automates the configuration of frontend environment variables

Write-Host "🚀 MISRA Platform - Production Setup" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if AWS CLI is installed
Write-Host "Checking prerequisites..." -ForegroundColor Yellow
if (!(Get-Command aws -ErrorAction SilentlyContinue)) {
    Write-Host "❌ AWS CLI not found. Please install AWS CLI first." -ForegroundColor Red
    Write-Host "   Download from: https://aws.amazon.com/cli/" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ AWS CLI found" -ForegroundColor Green

# Check if backend is deployed
Write-Host ""
Write-Host "Checking AWS backend deployment..." -ForegroundColor Yellow

$stackName = "MisraPlatformProductionStack"

try {
    $stackStatus = aws cloudformation describe-stacks --stack-name $stackName --query 'Stacks[0].StackStatus' --output text 2>$null
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Backend stack not found: $stackName" -ForegroundColor Red
        Write-Host "   Please deploy the backend first using:" -ForegroundColor Yellow
        Write-Host "   cd packages/backend && cdk deploy" -ForegroundColor Yellow
        exit 1
    }
    
    if ($stackStatus -ne "CREATE_COMPLETE" -and $stackStatus -ne "UPDATE_COMPLETE") {
        Write-Host "⚠️  Stack status: $stackStatus" -ForegroundColor Yellow
        Write-Host "   Stack may not be fully deployed yet." -ForegroundColor Yellow
        $continue = Read-Host "Continue anyway? (y/n)"
        if ($continue -ne "y") {
            exit 1
        }
    }
    
    Write-Host "✅ Backend stack found: $stackStatus" -ForegroundColor Green
} catch {
    Write-Host "❌ Error checking backend deployment: $_" -ForegroundColor Red
    exit 1
}

# Get AWS configuration from CloudFormation outputs
Write-Host ""
Write-Host "Retrieving AWS configuration..." -ForegroundColor Yellow

try {
    # Get API Gateway URL
    Write-Host "  - Getting API Gateway URL..." -ForegroundColor Gray
    $apiUrl = aws cloudformation describe-stacks `
        --stack-name $stackName `
        --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' `
        --output text 2>$null
    
    if ([string]::IsNullOrEmpty($apiUrl)) {
        Write-Host "    ⚠️  API URL not found in outputs" -ForegroundColor Yellow
        $apiUrl = Read-Host "    Please enter API Gateway URL manually"
    } else {
        Write-Host "    ✅ API URL: $apiUrl" -ForegroundColor Green
    }
    
    # Get Cognito User Pool ID
    Write-Host "  - Getting Cognito User Pool ID..." -ForegroundColor Gray
    $userPoolId = aws cloudformation describe-stacks `
        --stack-name $stackName `
        --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' `
        --output text 2>$null
    
    if ([string]::IsNullOrEmpty($userPoolId)) {
        Write-Host "    ⚠️  User Pool ID not found in outputs" -ForegroundColor Yellow
        $userPoolId = Read-Host "    Please enter Cognito User Pool ID manually"
    } else {
        Write-Host "    ✅ User Pool ID: $userPoolId" -ForegroundColor Green
    }
    
    # Get Cognito Client ID
    Write-Host "  - Getting Cognito Client ID..." -ForegroundColor Gray
    $clientId = aws cloudformation describe-stacks `
        --stack-name $stackName `
        --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' `
        --output text 2>$null
    
    if ([string]::IsNullOrEmpty($clientId)) {
        Write-Host "    ⚠️  Client ID not found in outputs" -ForegroundColor Yellow
        $clientId = Read-Host "    Please enter Cognito Client ID manually"
    } else {
        Write-Host "    ✅ Client ID: $clientId" -ForegroundColor Green
    }
    
    # Get AWS Region
    Write-Host "  - Getting AWS Region..." -ForegroundColor Gray
    $region = aws configure get region 2>$null
    
    if ([string]::IsNullOrEmpty($region)) {
        $region = "us-east-1"
        Write-Host "    ⚠️  Using default region: $region" -ForegroundColor Yellow
    } else {
        Write-Host "    ✅ Region: $region" -ForegroundColor Green
    }
    
} catch {
    Write-Host "❌ Error retrieving AWS configuration: $_" -ForegroundColor Red
    exit 1
}

# Create frontend environment files
Write-Host ""
Write-Host "Creating frontend environment files..." -ForegroundColor Yellow

$frontendDir = "packages/frontend"

if (!(Test-Path $frontendDir)) {
    Write-Host "❌ Frontend directory not found: $frontendDir" -ForegroundColor Red
    exit 1
}

# Create .env.production
$envProduction = @"
# API Configuration
VITE_API_URL=$apiUrl
VITE_ENVIRONMENT=production

# AWS Cognito Configuration
VITE_COGNITO_USER_POOL_ID=$userPoolId
VITE_COGNITO_CLIENT_ID=$clientId
VITE_COGNITO_REGION=$region

# Feature Flags
VITE_USE_MOCK_BACKEND=false
VITE_ENABLE_REAL_AUTH=true
VITE_ENABLE_FILE_UPLOAD=true
VITE_ENABLE_ANALYSIS=true

# Optional: Analytics
VITE_ENABLE_ANALYTICS=false
"@

$envProductionPath = Join-Path $frontendDir ".env.production"
$envProduction | Out-File -FilePath $envProductionPath -Encoding UTF8
Write-Host "✅ Created: $envProductionPath" -ForegroundColor Green

# Create .env.local
$envLocal = @"
# API Configuration (use your deployed backend)
VITE_API_URL=$apiUrl
VITE_ENVIRONMENT=development

# AWS Cognito Configuration
VITE_COGNITO_USER_POOL_ID=$userPoolId
VITE_COGNITO_CLIENT_ID=$clientId
VITE_COGNITO_REGION=$region

# Feature Flags (enable real backend)
VITE_USE_MOCK_BACKEND=false
VITE_ENABLE_REAL_AUTH=true
VITE_ENABLE_FILE_UPLOAD=true
VITE_ENABLE_ANALYSIS=true

# Debug Mode
VITE_DEBUG_MODE=true
VITE_LOG_LEVEL=debug
"@

$envLocalPath = Join-Path $frontendDir ".env.local"
$envLocal | Out-File -FilePath $envLocalPath -Encoding UTF8
Write-Host "✅ Created: $envLocalPath" -ForegroundColor Green

# Summary
Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Configuration Summary:" -ForegroundColor Yellow
Write-Host "  API URL:        $apiUrl" -ForegroundColor White
Write-Host "  User Pool ID:   $userPoolId" -ForegroundColor White
Write-Host "  Client ID:      $clientId" -ForegroundColor White
Write-Host "  Region:         $region" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. cd packages/frontend" -ForegroundColor White
Write-Host "  2. npm install" -ForegroundColor White
Write-Host "  3. npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "  Then open: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "For production build:" -ForegroundColor Yellow
Write-Host "  npm run build" -ForegroundColor White
Write-Host ""
Write-Host "📚 See PRODUCTION_INTEGRATION_GUIDE.md for detailed instructions" -ForegroundColor Cyan
Write-Host ""
