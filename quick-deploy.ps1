# Quick Deployment Script for AIBTS Platform
# Run this after AWS account is set up and AWS CLI is configured

param(
    [Parameter(Mandatory=$false)]
    [string]$AwsAccountId,
    
    [Parameter(Mandatory=$false)]
    [string]$AwsRegion = "us-east-1",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBootstrap,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipFrontend
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "AIBTS Platform Quick Deployment Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function to check if command exists
function Test-Command {
    param($Command)
    try {
        if (Get-Command $Command -ErrorAction Stop) {
            return $true
        }
    }
    catch {
        return $false
    }
}

# Step 1: Verify prerequisites
Write-Host "Step 1: Verifying prerequisites..." -ForegroundColor Yellow

if (-not (Test-Command "aws")) {
    Write-Host "❌ AWS CLI not found. Please install AWS CLI v2." -ForegroundColor Red
    Write-Host "   Download from: https://aws.amazon.com/cli/" -ForegroundColor Red
    exit 1
}

if (-not (Test-Command "node")) {
    Write-Host "❌ Node.js not found. Please install Node.js 20.x or later." -ForegroundColor Red
    Write-Host "   Download from: https://nodejs.org/" -ForegroundColor Red
    exit 1
}

if (-not (Test-Command "cdk")) {
    Write-Host "⚠️  CDK CLI not found. Installing..." -ForegroundColor Yellow
    npm install -g aws-cdk
}

Write-Host "✅ Prerequisites verified" -ForegroundColor Green
Write-Host ""

# Step 2: Verify AWS credentials
Write-Host "Step 2: Verifying AWS credentials..." -ForegroundColor Yellow

try {
    $identity = aws sts get-caller-identity --output json | ConvertFrom-Json
    $accountId = $identity.Account
    Write-Host "✅ AWS credentials verified" -ForegroundColor Green
    Write-Host "   Account ID: $accountId" -ForegroundColor Gray
    Write-Host "   User ARN: $($identity.Arn)" -ForegroundColor Gray
    
    if ($AwsAccountId -and $AwsAccountId -ne $accountId) {
        Write-Host "⚠️  Warning: Provided account ID doesn't match configured credentials" -ForegroundColor Yellow
    }
    
    $AwsAccountId = $accountId
}
catch {
    Write-Host "❌ AWS credentials not configured or invalid" -ForegroundColor Red
    Write-Host "   Run: aws configure" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 3: Install backend dependencies
Write-Host "Step 3: Installing backend dependencies..." -ForegroundColor Yellow
Push-Location packages/backend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install backend dependencies" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location
Write-Host "✅ Backend dependencies installed" -ForegroundColor Green
Write-Host ""

# Step 4: CDK Bootstrap (if not skipped)
if (-not $SkipBootstrap) {
    Write-Host "Step 4: Bootstrapping CDK..." -ForegroundColor Yellow
    Push-Location packages/backend
    
    $bootstrapTarget = "aws://$AwsAccountId/$AwsRegion"
    Write-Host "   Bootstrapping: $bootstrapTarget" -ForegroundColor Gray
    
    npx cdk bootstrap $bootstrapTarget
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ CDK bootstrap failed" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    
    Pop-Location
    Write-Host "✅ CDK bootstrapped successfully" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "Step 4: Skipping CDK bootstrap (--SkipBootstrap flag)" -ForegroundColor Yellow
    Write-Host ""
}

# Step 5: Synthesize CDK template
Write-Host "Step 5: Synthesizing CDK template..." -ForegroundColor Yellow
Push-Location packages/backend
npx cdk synth
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ CDK synthesis failed" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location
Write-Host "✅ CDK template synthesized" -ForegroundColor Green
Write-Host ""

# Step 6: Deploy MisraPlatformStack
Write-Host "Step 6: Deploying MisraPlatformStack..." -ForegroundColor Yellow
Write-Host "   This will take 10-15 minutes..." -ForegroundColor Gray
Write-Host ""

Push-Location packages/backend
npx cdk deploy MisraPlatformStack --require-approval never
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Stack deployment failed" -ForegroundColor Red
    Write-Host "   Check CloudFormation console for details" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location
Write-Host "✅ Stack deployed successfully" -ForegroundColor Green
Write-Host ""

# Step 7: Capture deployment outputs
Write-Host "Step 7: Capturing deployment outputs..." -ForegroundColor Yellow

$outputs = aws cloudformation describe-stacks `
    --stack-name MisraPlatformStack `
    --query 'Stacks[0].Outputs' `
    --output json | ConvertFrom-Json

# Save to file
$outputs | ConvertTo-Json -Depth 10 | Out-File -FilePath "platform-stack-outputs.json"

# Extract key values
$apiUrl = ($outputs | Where-Object { $_.OutputKey -eq "ApiGatewayUrl" }).OutputValue
$screenshotsBucket = ($outputs | Where-Object { $_.OutputKey -eq "ScreenshotsBucketName" }).OutputValue
$dashboardUrl = ($outputs | Where-Object { $_.OutputKey -eq "NotificationDashboardUrl" }).OutputValue

Write-Host "✅ Deployment outputs captured" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Key Outputs:" -ForegroundColor Cyan
Write-Host "   API Gateway URL: $apiUrl" -ForegroundColor White
Write-Host "   Screenshots Bucket: $screenshotsBucket" -ForegroundColor White
Write-Host "   Dashboard URL: $dashboardUrl" -ForegroundColor White
Write-Host ""

# Step 8: Seed notification templates
Write-Host "Step 8: Seeding notification templates..." -ForegroundColor Yellow

try {
    aws lambda invoke `
        --function-name aibts-seed-templates `
        --region $AwsRegion `
        seed-response.json | Out-Null
    
    $seedResponse = Get-Content seed-response.json | ConvertFrom-Json
    Write-Host "✅ Notification templates seeded" -ForegroundColor Green
    Remove-Item seed-response.json -ErrorAction SilentlyContinue
}
catch {
    Write-Host "⚠️  Warning: Failed to seed templates (you can do this manually later)" -ForegroundColor Yellow
}
Write-Host ""

# Step 9: Configure and deploy frontend (if not skipped)
if (-not $SkipFrontend) {
    Write-Host "Step 9: Configuring and deploying frontend..." -ForegroundColor Yellow
    
    # Create .env.production
    Push-Location packages/frontend
    
    @"
VITE_API_URL=$apiUrl
VITE_AWS_REGION=$AwsRegion
"@ | Out-File -FilePath ".env.production" -Encoding UTF8
    
    Write-Host "   Created .env.production" -ForegroundColor Gray
    
    # Install dependencies
    Write-Host "   Installing frontend dependencies..." -ForegroundColor Gray
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install frontend dependencies" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    
    # Build
    Write-Host "   Building frontend..." -ForegroundColor Gray
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Frontend build failed" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    
    Write-Host "✅ Frontend built successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "📦 Frontend is ready to deploy to Vercel" -ForegroundColor Cyan
    Write-Host "   Run: cd packages/frontend && vercel --prod" -ForegroundColor White
    
    Pop-Location
} else {
    Write-Host "Step 9: Skipping frontend deployment (--SkipFrontend flag)" -ForegroundColor Yellow
}
Write-Host ""

# Step 10: Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Deploy frontend to Vercel:" -ForegroundColor White
Write-Host "      cd packages/frontend" -ForegroundColor Gray
Write-Host "      vercel --prod" -ForegroundColor Gray
Write-Host ""
Write-Host "   2. Test the API:" -ForegroundColor White
Write-Host "      curl $apiUrl/health" -ForegroundColor Gray
Write-Host ""
Write-Host "   3. Monitor in CloudWatch:" -ForegroundColor White
Write-Host "      $dashboardUrl" -ForegroundColor Gray
Write-Host ""
Write-Host "   4. Set up billing alerts in AWS Console" -ForegroundColor White
Write-Host ""
Write-Host "📄 Deployment outputs saved to: platform-stack-outputs.json" -ForegroundColor Cyan
Write-Host ""
Write-Host "🎉 Your AIBTS platform is ready!" -ForegroundColor Green
