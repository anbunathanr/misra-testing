# Rollback Phase 3 Deployment
# This script rolls back Bedrock traffic to a specified percentage

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("0", "10", "50")]
    [string]$TargetPercentage,
    
    [Parameter(Mandatory=$true)]
    [string]$OpenAIApiKey,
    
    [string]$Region = "us-east-1",
    [string]$ModelId = "anthropic.claude-3-5-sonnet-20241022-v2:0"
)

Write-Host "=== Phase 3: Rollback to $TargetPercentage% Traffic ===" -ForegroundColor Red
Write-Host ""

# Get current state
Write-Host "Checking current state..." -ForegroundColor Yellow
$currentProvider = aws lambda get-function-configuration `
    --function-name aibts-ai-generate `
    --query 'Environment.Variables.AI_PROVIDER' `
    --output text

$currentPercentage = aws lambda get-function-configuration `
    --function-name aibts-ai-generate `
    --query 'Environment.Variables.BEDROCK_TRAFFIC_PERCENTAGE' `
    --output text

Write-Host "Current Provider: $currentProvider" -ForegroundColor Yellow
Write-Host "Current Traffic: $currentPercentage%" -ForegroundColor Yellow
Write-Host ""

# Confirm rollback
Write-Host "This will rollback to $TargetPercentage% Bedrock traffic." -ForegroundColor Red
$reason = Read-Host "Reason for rollback"
Write-Host ""
$confirm = Read-Host "Proceed with rollback? (y/n)"
if ($confirm -ne "y") {
    Write-Host "Rollback cancelled" -ForegroundColor Yellow
    exit 0
}

Write-Host ""

# Determine AI_PROVIDER based on target percentage
$aiProvider = if ($TargetPercentage -eq "0") { "OPENAI" } else { "OPENAI" }

# Update Lambda functions
$functions = @("aibts-ai-analyze", "aibts-ai-generate", "aibts-ai-batch")

foreach ($function in $functions) {
    Write-Host "Rolling back $function to $TargetPercentage% traffic..." -ForegroundColor Yellow
    
    aws lambda update-function-configuration `
        --function-name $function `
        --environment "Variables={
            AI_PROVIDER=$aiProvider,
            BEDROCK_TRAFFIC_PERCENTAGE=$TargetPercentage,
            BEDROCK_REGION=$Region,
            BEDROCK_MODEL_ID=$ModelId,
            BEDROCK_TIMEOUT=30000,
            ENABLE_BEDROCK_MONITORING=true,
            AI_USAGE_TABLE=AIUsage,
            TEST_CASES_TABLE_NAME=TestCases,
            OPENAI_API_KEY=$OpenAIApiKey
        }" | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ $function rolled back successfully" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to rollback $function" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "=== Rollback Complete ===" -ForegroundColor Green
Write-Host ""

# Verify rollback
Write-Host "Verifying rollback..." -ForegroundColor Yellow
$newProvider = aws lambda get-function-configuration `
    --function-name aibts-ai-generate `
    --query 'Environment.Variables.AI_PROVIDER' `
    --output text

$newPercentage = aws lambda get-function-configuration `
    --function-name aibts-ai-generate `
    --query 'Environment.Variables.BEDROCK_TRAFFIC_PERCENTAGE' `
    --output text

Write-Host "New Provider: $newProvider" -ForegroundColor Green
Write-Host "New Traffic: $newPercentage%" -ForegroundColor Green
Write-Host ""

# Log rollback
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$logEntry = @"

=== Rollback Log ===
Timestamp: $timestamp
From: $currentProvider @ $currentPercentage%
To: $newProvider @ $newPercentage%
Reason: $reason
"@

Add-Content -Path ".kiro/specs/bedrock-migration/rollback-log.txt" -Value $logEntry

Write-Host "Rollback logged to rollback-log.txt" -ForegroundColor Green
Write-Host ""

# Next steps
Write-Host "=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. Verify services are operational"
Write-Host "2. Investigate root cause of rollback"
Write-Host "3. Document incident and resolution"
Write-Host "4. Test fix in development environment"
Write-Host "5. Plan re-deployment when ready"
Write-Host ""
Write-Host "Monitor logs:" -ForegroundColor Yellow
Write-Host "aws logs tail /aws/lambda/aibts-ai-generate --follow"
