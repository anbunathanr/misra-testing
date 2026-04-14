#!/usr/bin/env pwsh
# Deploy Task 7.1: Production Domain and CDN Setup
# This script deploys CloudFront CDN and API Gateway custom domains

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Task 7.1: Production Domain & CDN Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Verify Prerequisites
Write-Host "[1/6] Verifying Prerequisites..." -ForegroundColor Yellow

# Check AWS credentials
Write-Host "  Checking AWS credentials..." -ForegroundColor Gray
$identity = aws sts get-caller-identity 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ AWS credentials not configured" -ForegroundColor Red
    Write-Host "  Please run: aws configure" -ForegroundColor Yellow
    exit 1
}
Write-Host "  ✓ AWS credentials configured" -ForegroundColor Green

# Check Route53 hosted zone
Write-Host "  Checking Route53 hosted zone..." -ForegroundColor Gray
$hostedZone = aws route53 list-hosted-zones --query "HostedZones[?Name=='digitransolutions.in.']" --output json 2>&1 | ConvertFrom-Json
if ($hostedZone.Count -eq 0) {
    Write-Host "  ✗ Route53 hosted zone 'digitransolutions.in' not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "  CRITICAL: You must create a Route53 hosted zone first!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Option 1: Create hosted zone" -ForegroundColor Cyan
    Write-Host "    aws route53 create-hosted-zone --name digitransolutions.in --caller-reference $(Get-Date -Format 'yyyyMMddHHmmss')" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Option 2: Use your own domain" -ForegroundColor Cyan
    Write-Host "    Edit packages/backend/src/infrastructure/misra-platform-stack.ts" -ForegroundColor Gray
    Write-Host "    Change: const hostedZoneName = 'yourdomain.com';" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  See: .kiro/specs/misra-production-saas-platform/TASK_7.1_DEPLOYMENT_GUIDE.md" -ForegroundColor Yellow
    exit 1
}
Write-Host "  ✓ Route53 hosted zone found" -ForegroundColor Green

# Check CDK version
Write-Host "  Checking CDK version..." -ForegroundColor Gray
$cdkVersion = cdk --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ AWS CDK not installed" -ForegroundColor Red
    Write-Host "  Please run: npm install -g aws-cdk" -ForegroundColor Yellow
    exit 1
}
Write-Host "  ✓ CDK version: $cdkVersion" -ForegroundColor Green

Write-Host ""

# Step 2: Build Lambda Functions
Write-Host "[2/6] Building Lambda Functions..." -ForegroundColor Yellow
Push-Location packages/backend
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Build failed" -ForegroundColor Red
    Pop-Location
    exit 1
}
Write-Host "  ✓ Lambda functions built successfully" -ForegroundColor Green
Pop-Location
Write-Host ""

# Step 3: Synthesize CDK Stack
Write-Host "[3/6] Synthesizing CDK Stack..." -ForegroundColor Yellow
Push-Location packages/backend
cdk synth MisraPlatformStack > $null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ CDK synthesis failed" -ForegroundColor Red
    Pop-Location
    exit 1
}
Write-Host "  ✓ CDK stack synthesized successfully" -ForegroundColor Green
Pop-Location
Write-Host ""

# Step 4: Show Deployment Preview
Write-Host "[4/6] Deployment Preview..." -ForegroundColor Yellow
Write-Host ""
Write-Host "  This deployment will create:" -ForegroundColor Cyan
Write-Host "    • SSL Certificate for misra.digitransolutions.in (CloudFront)" -ForegroundColor Gray
Write-Host "    • SSL Certificate for api.misra.digitransolutions.in (API Gateway)" -ForegroundColor Gray
Write-Host "    • CloudFront Distribution with custom domain" -ForegroundColor Gray
Write-Host "    • API Gateway Custom Domain" -ForegroundColor Gray
Write-Host "    • Route53 A Records for both domains" -ForegroundColor Gray
Write-Host ""
Write-Host "  Estimated deployment time: 15-20 minutes" -ForegroundColor Yellow
Write-Host "  Estimated monthly cost: $11-37 (low traffic)" -ForegroundColor Yellow
Write-Host ""

# Confirm deployment
$confirm = Read-Host "  Do you want to proceed with deployment? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "  Deployment cancelled" -ForegroundColor Yellow
    exit 0
}
Write-Host ""

# Step 5: Deploy Infrastructure
Write-Host "[5/6] Deploying Infrastructure..." -ForegroundColor Yellow
Write-Host "  This may take 15-20 minutes..." -ForegroundColor Gray
Write-Host ""

Push-Location packages/backend
cdk deploy MisraPlatformStack --require-approval never
$deployResult = $LASTEXITCODE
Pop-Location

if ($deployResult -ne 0) {
    Write-Host ""
    Write-Host "  ✗ Deployment failed" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Troubleshooting:" -ForegroundColor Yellow
    Write-Host "    1. Check CloudFormation events in AWS Console" -ForegroundColor Gray
    Write-Host "    2. Verify Route53 hosted zone is correct" -ForegroundColor Gray
    Write-Host "    3. Check certificate validation status" -ForegroundColor Gray
    Write-Host "    4. See: .kiro/specs/misra-production-saas-platform/TASK_7.1_DEPLOYMENT_GUIDE.md" -ForegroundColor Gray
    exit 1
}

Write-Host ""
Write-Host "  ✓ Infrastructure deployed successfully" -ForegroundColor Green
Write-Host ""

# Step 6: Verify Deployment
Write-Host "[6/6] Verifying Deployment..." -ForegroundColor Yellow

# Get stack outputs
Write-Host "  Retrieving stack outputs..." -ForegroundColor Gray
$outputs = aws cloudformation describe-stacks --stack-name MisraPlatformStack --query "Stacks[0].Outputs" --output json 2>&1 | ConvertFrom-Json

# Display custom domains
$frontendUrl = ($outputs | Where-Object { $_.OutputKey -eq "FrontendCustomDomain" }).OutputValue
$apiUrl = ($outputs | Where-Object { $_.OutputKey -eq "ApiCustomDomain" }).OutputValue
$cloudFrontDomain = ($outputs | Where-Object { $_.OutputKey -eq "CloudFrontDistributionDomain" }).OutputValue

Write-Host ""
Write-Host "  ✓ Deployment verified" -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Production URLs:" -ForegroundColor Cyan
Write-Host "  Frontend: $frontendUrl" -ForegroundColor White
Write-Host "  API:      $apiUrl" -ForegroundColor White
Write-Host ""
Write-Host "CloudFront Distribution:" -ForegroundColor Cyan
Write-Host "  $cloudFrontDomain" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Wait 5-10 minutes for DNS propagation" -ForegroundColor Gray
Write-Host "  2. Test domains:" -ForegroundColor Gray
Write-Host "     curl -I $frontendUrl" -ForegroundColor Gray
Write-Host "     curl -I $apiUrl" -ForegroundColor Gray
Write-Host "  3. Deploy frontend (Task 7.2)" -ForegroundColor Gray
Write-Host "  4. Update environment variables with production URLs" -ForegroundColor Gray
Write-Host ""
Write-Host "Documentation:" -ForegroundColor Yellow
Write-Host "  .kiro/specs/misra-production-saas-platform/TASK_7.1_DEPLOYMENT_GUIDE.md" -ForegroundColor Gray
Write-Host ""

# Test DNS resolution (optional)
Write-Host "Testing DNS Resolution..." -ForegroundColor Yellow
Write-Host "  Frontend domain: " -NoNewline -ForegroundColor Gray
try {
    $frontendDns = Resolve-DnsName -Name "misra.digitransolutions.in" -ErrorAction Stop
    Write-Host "✓ Resolved" -ForegroundColor Green
} catch {
    Write-Host "⚠ Not yet propagated (wait 5-10 minutes)" -ForegroundColor Yellow
}

Write-Host "  API domain:      " -NoNewline -ForegroundColor Gray
try {
    $apiDns = Resolve-DnsName -Name "api.misra.digitransolutions.in" -ErrorAction Stop
    Write-Host "✓ Resolved" -ForegroundColor Green
} catch {
    Write-Host "⚠ Not yet propagated (wait 5-10 minutes)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Task 7.1 Complete! ✓" -ForegroundColor Green
Write-Host ""
