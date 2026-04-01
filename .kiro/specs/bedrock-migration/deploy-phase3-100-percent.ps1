# Deploy Phase 3: 100% Traffic Rollout
# This script increases Bedrock traffic from 50% to 100%

param(
    [Parameter(Mandatory=$true)]
    [string]$OpenAIApiKey,
    
    [string]$Region = "us-east-1",
    [string]$ModelId = "anthropic.claude-3-5-sonnet-20241022-v2:0"
)

Write-Host "=== Phase 3: Deploying 100% Traffic Rollout ===" -ForegroundColor Cyan
Write-Host ""

# Verify prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow
$currentPercentage = aws lambda get-function-configuration `
    --function-name aibts-ai-generate `
    --query 'Environment.Variables.BEDROCK_TRAFFIC_PERCENTAGE' `
    --output text

if ($currentPercentage -ne "50") {
    Write-Host "WARNING: Current traffic percentage is $currentPercentage, expected 50%" -ForegroundColor Red
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        Write-Host "Deployment cancelled" -ForegroundColor Red
        exit 1
    }
}

Write-Host "Current traffic: $currentPercentage%" -ForegroundColor Green
Write-Host ""

# Confirm deployment
Write-Host "This will route 100% of traffic to Bedrock." -ForegroundColor Yellow
Write-Host "OpenAI will remain available as fallback." -ForegroundColor Yellow
$confirm = Read-Host "Proceed with 100% rollout? (y/n)"
if ($confirm -ne "y") {
    Write-Host "Deployment cancelled" -ForegroundColor Red
    exit 0
}

Write-Host ""

# Update Lambda functions
$functions = @("aibts-ai-analyze", "aibts-ai-generate", "aibts-ai-batch")

foreach ($function in $functions) {
    Write-Host "Updating $function to 100% traffic..." -ForegroundColor Yellow
    
    aws lambda update-function-configuration `
        --function-name $function `
        --environment "Variables={
            AI_PROVIDER=BEDROCK,
            BEDROCK_TRAFFIC_PERCENTAGE=100,
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
$newProvider = aws lambda get-function-configuration `
    --function-name aibts-ai-generate `
    --query 'Environment.Variables.AI_PROVIDER' `
    --output text

$newPercentage = aws lambda get-function-configuration `
    --function-name aibts-ai-generate `
    --query 'Environment.Variables.BEDROCK_TRAFFIC_PERCENTAGE' `
    --output text

Write-Host "AI Provider: $newProvider" -ForegroundColor Green
Write-Host "Traffic percentage: $newPercentage%" -ForegroundColor Green
Write-Host ""

# Next steps
Write-Host "=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. Monitor CloudWatch dashboard intensively for first 4 hours"
Write-Host "2. Check logs continuously: aws logs tail /aws/lambda/aibts-ai-generate --follow"
Write-Host "3. Monitor for 48 hours total"
Write-Host "4. Collect final metrics and user feedback"
Write-Host "5. If successful, proceed to Phase 4 (Full Migration)"
Write-Host ""
Write-Host "Dashboard URL:" -ForegroundColor Yellow
Write-Host "https://console.aws.amazon.com/cloudwatch/home?region=$Region#dashboards:name=AIBTS-Bedrock-Migration"
Write-Host ""
Write-Host "Emergency Rollback:" -ForegroundColor Red
Write-Host ".\rollback-phase3.ps1 -TargetPercentage 50"
