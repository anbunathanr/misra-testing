# Deploy Phase 3: 50% Traffic Rollout
# This script increases Bedrock traffic from 10% to 50%

param(
    [Parameter(Mandatory=$true)]
    [string]$OpenAIApiKey,
    
    [string]$Region = "us-east-1",
    [string]$ModelId = "anthropic.claude-3-5-sonnet-20241022-v2:0"
)

Write-Host "=== Phase 3: Deploying 50% Traffic Rollout ===" -ForegroundColor Cyan
Write-Host ""

# Verify prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow
$currentPercentage = aws lambda get-function-configuration `
    --function-name aibts-ai-generate `
    --query 'Environment.Variables.BEDROCK_TRAFFIC_PERCENTAGE' `
    --output text

if ($currentPercentage -ne "10") {
    Write-Host "WARNING: Current traffic percentage is $currentPercentage, expected 10%" -ForegroundColor Red
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        Write-Host "Deployment cancelled" -ForegroundColor Red
        exit 1
    }
}

Write-Host "Current traffic: $currentPercentage%" -ForegroundColor Green
Write-Host ""

# Update Lambda functions
$functions = @("aibts-ai-analyze", "aibts-ai-generate", "aibts-ai-batch")

foreach ($function in $functions) {
    Write-Host "Updating $function to 50% traffic..." -ForegroundColor Yellow
    
    aws lambda update-function-configuration `
        --function-name $function `
        --environment "Variables={
            AI_PROVIDER=OPENAI,
            BEDROCK_TRAFFIC_PERCENTAGE=50,
            BEDROCK_REGION=$Region,
            BEDROCK_MODEL_ID=$ModelId,
            BEDROCK_TIMEOUT=30000,
            ENABLE_BEDROCK_MONITORING=true,
            AI_USAGE_TABLE=AIUsage,
            TEST_CASES_TABLE_NAME=TestCases,
            OPENAI_API_KEY=$OpenAIApiKey
        }" | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ $function updated successfully" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to update $function" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "=== Deployment Complete ===" -ForegroundColor Green
Write-Host ""

# Verify deployment
Write-Host "Verifying deployment..." -ForegroundColor Yellow
$newPercentage = aws lambda get-function-configuration `
    --function-name aibts-ai-generate `
    --query 'Environment.Variables.BEDROCK_TRAFFIC_PERCENTAGE' `
    --output text

Write-Host "New traffic percentage: $newPercentage%" -ForegroundColor Green
Write-Host ""

# Next steps
Write-Host "=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. Monitor CloudWatch dashboard for 48 hours"
Write-Host "2. Check logs: aws logs tail /aws/lambda/aibts-ai-generate --follow"
Write-Host "3. Review metrics after 48 hours"
Write-Host "4. If successful, proceed to 100% with deploy-phase3-100-percent.ps1"
Write-Host ""
Write-Host "Dashboard URL:" -ForegroundColor Yellow
Write-Host "https://console.aws.amazon.com/cloudwatch/home?region=$Region#dashboards:name=AIBTS-Bedrock-Migration"
