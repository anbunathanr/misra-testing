# AIBTS Platform - AWS Deployment Script
# This script automates the deployment process for fresh AWS accounts

Write-Host "🚀 AIBTS Platform - AWS Deployment Script" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
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

# Function to prompt for input
function Get-UserInput {
    param(
        [string]$Prompt,
        [string]$Default = ""
    )
    if ($Default) {
        $input = Read-Host "$Prompt (default: $Default)"
        if ([string]::IsNullOrWhiteSpace($input)) {
            return $Default
        }
        return $input
    }
    else {
        return Read-Host $Prompt
    }
}

# Step 1: Check Prerequisites
Write-Host "📋 Step 1: Checking Prerequisites..." -ForegroundColor Yellow
Write-Host ""

$prerequisites = @{
    "node" = "Node.js"
    "npm" = "NPM"
    "aws" = "AWS CLI"
    "git" = "Git"
}

$missingPrereqs = @()

foreach ($cmd in $prerequisites.Keys) {
    if (Test-Command $cmd) {
        Write-Host "✅ $($prerequisites[$cmd]) is installed" -ForegroundColor Green
    }
    else {
        Write-Host "❌ $($prerequisites[$cmd]) is NOT installed" -ForegroundColor Red
        $missingPrereqs += $prerequisites[$cmd]
    }
}

if ($missingPrereqs.Count -gt 0) {
    Write-Host ""
    Write-Host "⚠️  Missing prerequisites: $($missingPrereqs -join ', ')" -ForegroundColor Red
    Write-Host "Please install missing tools and run this script again." -ForegroundColor Red
    Write-Host ""
    Write-Host "Installation guides:" -ForegroundColor Yellow
    Write-Host "- Node.js: https://nodejs.org/" -ForegroundColor Cyan
    Write-Host "- AWS CLI: https://aws.amazon.com/cli/" -ForegroundColor Cyan
    Write-Host "- Git: https://git-scm.com/" -ForegroundColor Cyan
    exit 1
}

Write-Host ""

# Step 2: Verify AWS Configuration
Write-Host "🔐 Step 2: Verifying AWS Configuration..." -ForegroundColor Yellow
Write-Host ""

try {
    $awsIdentity = aws sts get-caller-identity --output json | ConvertFrom-Json
    $awsAccountId = $awsIdentity.Account
    $awsUserId = $awsIdentity.UserId
    $awsArn = $awsIdentity.Arn
    
    Write-Host "✅ AWS CLI is configured" -ForegroundColor Green
    Write-Host "   Account ID: $awsAccountId" -ForegroundColor Cyan
    Write-Host "   User: $awsArn" -ForegroundColor Cyan
    Write-Host ""
}
catch {
    Write-Host "❌ AWS CLI is not configured" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please run: aws configure" -ForegroundColor Yellow
    Write-Host "You'll need:" -ForegroundColor Yellow
    Write-Host "- AWS Access Key ID" -ForegroundColor Cyan
    Write-Host "- AWS Secret Access Key" -ForegroundColor Cyan
    Write-Host "- Default region (us-east-1 recommended)" -ForegroundColor Cyan
    exit 1
}

# Step 3: Get Configuration
Write-Host "⚙️  Step 3: Configuration..." -ForegroundColor Yellow
Write-Host ""

$region = Get-UserInput "AWS Region" "us-east-1"
$hfApiKey = Get-UserInput "Hugging Face API Key (get from https://huggingface.co/settings/tokens)"

if ([string]::IsNullOrWhiteSpace($hfApiKey)) {
    Write-Host "❌ Hugging Face API Key is required" -ForegroundColor Red
    Write-Host ""
    Write-Host "Get your free API key:" -ForegroundColor Yellow
    Write-Host "1. Go to https://huggingface.co/" -ForegroundColor Cyan
    Write-Host "2. Sign up or sign in" -ForegroundColor Cyan
    Write-Host "3. Go to Settings → Access Tokens" -ForegroundColor Cyan
    Write-Host "4. Create a new token with 'Read' access" -ForegroundColor Cyan
    exit 1
}

Write-Host ""
Write-Host "Configuration:" -ForegroundColor Green
Write-Host "- AWS Account ID: $awsAccountId" -ForegroundColor Cyan
Write-Host "- AWS Region: $region" -ForegroundColor Cyan
Write-Host "- Hugging Face API Key: ****${hfApiKey.Substring([Math]::Max(0, $hfApiKey.Length - 4))}" -ForegroundColor Cyan
Write-Host ""

$confirm = Read-Host "Continue with deployment? (y/n)"
if ($confirm -ne 'y' -and $confirm -ne 'Y') {
    Write-Host "Deployment cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""

# Step 4: Install Global Dependencies
Write-Host "📦 Step 4: Installing Global Dependencies..." -ForegroundColor Yellow
Write-Host ""

if (-not (Test-Command "cdk")) {
    Write-Host "Installing AWS CDK..." -ForegroundColor Cyan
    npm install -g aws-cdk
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install AWS CDK" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ AWS CDK installed" -ForegroundColor Green
}
else {
    Write-Host "✅ AWS CDK already installed" -ForegroundColor Green
}

if (-not (Test-Command "vercel")) {
    Write-Host "Installing Vercel CLI..." -ForegroundColor Cyan
    npm install -g vercel
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install Vercel CLI" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Vercel CLI installed" -ForegroundColor Green
}
else {
    Write-Host "✅ Vercel CLI already installed" -ForegroundColor Green
}

Write-Host ""

# Step 5: Install Project Dependencies
Write-Host "📦 Step 5: Installing Project Dependencies..." -ForegroundColor Yellow
Write-Host ""

Write-Host "Installing root dependencies..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install root dependencies" -ForegroundColor Red
    exit 1
}

Write-Host "Installing backend dependencies..." -ForegroundColor Cyan
Set-Location packages/backend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install backend dependencies" -ForegroundColor Red
    exit 1
}

Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
Set-Location ../frontend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install frontend dependencies" -ForegroundColor Red
    exit 1
}

Set-Location ../..
Write-Host "✅ All dependencies installed" -ForegroundColor Green
Write-Host ""

# Step 6: Bootstrap CDK
Write-Host "🏗️  Step 6: Bootstrapping AWS CDK..." -ForegroundColor Yellow
Write-Host ""

Set-Location packages/backend

$env:CDK_DEFAULT_ACCOUNT = $awsAccountId
$env:CDK_DEFAULT_REGION = $region

Write-Host "Bootstrapping CDK for account $awsAccountId in region $region..." -ForegroundColor Cyan
cdk bootstrap "aws://$awsAccountId/$region"
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  CDK bootstrap failed or already bootstrapped" -ForegroundColor Yellow
}
else {
    Write-Host "✅ CDK bootstrapped successfully" -ForegroundColor Green
}

Write-Host ""

# Step 7: Store Hugging Face API Key
Write-Host "🔑 Step 7: Storing Hugging Face API Key in Secrets Manager..." -ForegroundColor Yellow
Write-Host ""

try {
    aws secretsmanager create-secret `
        --name aibts/huggingface-api-key `
        --description "Hugging Face API key for AIBTS AI test generation" `
        --secret-string $hfApiKey `
        --region $region 2>$null
    
    Write-Host "✅ Hugging Face API key stored in Secrets Manager" -ForegroundColor Green
}
catch {
    Write-Host "⚠️  Secret may already exist, attempting to update..." -ForegroundColor Yellow
    try {
        aws secretsmanager update-secret `
            --secret-id aibts/huggingface-api-key `
            --secret-string $hfApiKey `
            --region $region
        Write-Host "✅ Hugging Face API key updated in Secrets Manager" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Failed to store Hugging Face API key" -ForegroundColor Red
        Write-Host "You may need to manually create the secret in AWS Secrets Manager" -ForegroundColor Yellow
    }
}

Write-Host ""

# Step 8: Build and Deploy Backend
Write-Host "🚀 Step 8: Building and Deploying Backend..." -ForegroundColor Yellow
Write-Host ""

Write-Host "Building backend..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Backend build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Backend built successfully" -ForegroundColor Green
Write-Host ""

Write-Host "Deploying CDK stack (this may take 5-10 minutes)..." -ForegroundColor Cyan
cdk deploy MinimalStack --require-approval never --outputs-file outputs.json
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ CDK deployment failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Backend deployed successfully" -ForegroundColor Green
Write-Host ""

# Step 9: Extract Stack Outputs
Write-Host "📝 Step 9: Extracting Stack Outputs..." -ForegroundColor Yellow
Write-Host ""

if (Test-Path outputs.json) {
    $outputs = Get-Content outputs.json | ConvertFrom-Json
    $stackOutputs = $outputs.MinimalStack
    
    $apiUrl = $stackOutputs.ApiGatewayUrl
    $userPoolId = $stackOutputs.UserPoolId
    $userPoolClientId = $stackOutputs.UserPoolClientId
    
    Write-Host "Stack Outputs:" -ForegroundColor Green
    Write-Host "- API Gateway URL: $apiUrl" -ForegroundColor Cyan
    Write-Host "- User Pool ID: $userPoolId" -ForegroundColor Cyan
    Write-Host "- User Pool Client ID: $userPoolClientId" -ForegroundColor Cyan
    Write-Host ""
    
    # Save outputs to file
    @"
API_GATEWAY_URL=$apiUrl
USER_POOL_ID=$userPoolId
USER_POOL_CLIENT_ID=$userPoolClientId
AWS_REGION=$region
"@ | Out-File -FilePath "deployment-outputs.txt" -Encoding UTF8
    
    Write-Host "✅ Outputs saved to deployment-outputs.txt" -ForegroundColor Green
}
else {
    Write-Host "⚠️  Could not find outputs.json" -ForegroundColor Yellow
    Write-Host "Please manually extract outputs from CloudFormation console" -ForegroundColor Yellow
    $apiUrl = Read-Host "Enter API Gateway URL"
    $userPoolId = Read-Host "Enter User Pool ID"
    $userPoolClientId = Read-Host "Enter User Pool Client ID"
}

Write-Host ""

# Step 10: Seed Notification Templates
Write-Host "📧 Step 10: Seeding Notification Templates..." -ForegroundColor Yellow
Write-Host ""

aws lambda invoke `
    --function-name aibts-seed-templates `
    --region $region `
    response.json

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Notification templates seeded" -ForegroundColor Green
}
else {
    Write-Host "⚠️  Failed to seed notification templates" -ForegroundColor Yellow
}

Write-Host ""

# Step 11: Configure and Deploy Frontend
Write-Host "🎨 Step 11: Configuring and Deploying Frontend..." -ForegroundColor Yellow
Write-Host ""

Set-Location ../frontend

# Create .env.production
$envContent = @"
VITE_API_URL=$apiUrl
VITE_AWS_REGION=$region
VITE_USER_POOL_ID=$userPoolId
VITE_USER_POOL_CLIENT_ID=$userPoolClientId
"@

$envContent | Out-File -FilePath ".env.production" -Encoding UTF8
Write-Host "✅ .env.production created" -ForegroundColor Green
Write-Host ""

Write-Host "Building frontend..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Frontend built successfully" -ForegroundColor Green
Write-Host ""

Write-Host "Deploying to Vercel..." -ForegroundColor Cyan
Write-Host "⚠️  You may need to login to Vercel and follow the prompts" -ForegroundColor Yellow
Write-Host ""

vercel --prod
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Vercel deployment may have failed or requires manual intervention" -ForegroundColor Yellow
    Write-Host "You can manually deploy by running: vercel --prod" -ForegroundColor Yellow
}
else {
    Write-Host "✅ Frontend deployed to Vercel" -ForegroundColor Green
}

Set-Location ../..

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your AIBTS Platform is now live!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Deployment Summary:" -ForegroundColor Yellow
Write-Host "- Backend API: $apiUrl" -ForegroundColor Cyan
Write-Host "- AWS Region: $region" -ForegroundColor Cyan
Write-Host "- User Pool ID: $userPoolId" -ForegroundColor Cyan
Write-Host ""
Write-Host "📚 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Note your Vercel frontend URL from the output above" -ForegroundColor Cyan
Write-Host "2. Update API Gateway CORS with your Vercel URL" -ForegroundColor Cyan
Write-Host "3. Open your frontend URL in a browser" -ForegroundColor Cyan
Write-Host "4. Register a new user account" -ForegroundColor Cyan
Write-Host "5. Check your email for verification code" -ForegroundColor Cyan
Write-Host "6. Start using the platform!" -ForegroundColor Cyan
Write-Host ""
Write-Host "📖 Documentation:" -ForegroundColor Yellow
Write-Host "- Full deployment guide: FRESH_AWS_DEPLOYMENT_GUIDE.md" -ForegroundColor Cyan
Write-Host "- Quick start guide: QUICK_START_GUIDE.md" -ForegroundColor Cyan
Write-Host "- Troubleshooting: CDK_DEPLOYMENT_TROUBLESHOOTING.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "💰 Estimated Monthly Cost: ~$1.50 (within AWS free tier)" -ForegroundColor Green
Write-Host ""
Write-Host "🆘 Need Help?" -ForegroundColor Yellow
Write-Host "Check CloudWatch logs: aws logs tail /aws/lambda/aibts-FUNCTION-NAME --follow" -ForegroundColor Cyan
Write-Host ""
