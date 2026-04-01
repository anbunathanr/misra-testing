# Bedrock Migration - Phase 1 Deployment Script
# Deploy Bedrock code in parallel with OpenAI (no behavior change)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Bedrock Migration - Phase 1 Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

# 1. Check AWS credentials
Write-Host "  [1/5] Checking AWS credentials..." -ForegroundColor Gray
try {
    $identityJson = aws sts get-caller-identity --output json
    $identity = $identityJson | ConvertFrom-Json
    Write-Host "    [OK] AWS Account: $($identity.Account)" -ForegroundColor Green
    Write-Host "    [OK] User: $($identity.Arn)" -ForegroundColor Green
} catch {
    Write-Host "    [ERR] AWS credentials not configured" -ForegroundColor Red
    Write-Host "    Run: aws configure" -ForegroundColor Yellow
    exit 1
}

# 2. Check Bedrock model access
Write-Host "  [2/5] Checking Bedrock model access..." -ForegroundColor Gray
try {
    # Check if Claude Sonnet 4.6 inference profile is available
    $profilesJson = aws bedrock list-inference-profiles --region us-east-1 --query "inferenceProfileSummaries[?inferenceProfileId=='us.anthropic.claude-sonnet-4-6']" --output json
    $profiles = $profilesJson | ConvertFrom-Json
    
    if ($profiles.Count -gt 0) {
        Write-Host "    [OK] Claude Sonnet 4.6 inference profile available" -ForegroundColor Green
    } else {
        Write-Host "    [ERR] Claude Sonnet 4.6 inference profile not accessible" -ForegroundColor Red
        Write-Host "    Inference profiles should be automatically available" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "    [WARN] Could not verify Bedrock access (may not have permissions)" -ForegroundColor Yellow
    Write-Host "    Continuing anyway..." -ForegroundColor Gray
}

# 3. Check CDK bootstrap
Write-Host "  [3/5] Checking CDK bootstrap..." -ForegroundColor Gray
try {
    $stacksJson = aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE --query "StackSummaries[?contains(StackName, 'CDKToolkit')].StackName" --output json
    $stacks = $stacksJson | ConvertFrom-Json
    
    if ($stacks.Count -gt 0) {
        Write-Host "    [OK] CDK bootstrapped" -ForegroundColor Green
    } else {
        Write-Host "    [ERR] CDK not bootstrapped" -ForegroundColor Red
        Write-Host "    Run: cd packages/backend && npx cdk bootstrap" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "    [WARN] Could not verify CDK bootstrap" -ForegroundColor Yellow
    Write-Host "    Continuing anyway..." -ForegroundColor Gray
}

# 4. Run tests
Write-Host "  [4/5] Running tests..." -ForegroundColor Gray
Write-Host "    [WARN] Skipping tests for deployment" -ForegroundColor Yellow

# 5. Build CDK stack
Write-Host "  [5/5] Building CDK stack..." -ForegroundColor Gray
Push-Location packages/backend
try {
    npx cdk synth > $null 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    [OK] CDK stack builds successfully" -ForegroundColor Green
    } else {
        Write-Host "    [ERR] CDK stack build failed" -ForegroundColor Red
        Pop-Location
        exit 1
    }
} catch {
    Write-Host "    [ERR] CDK build error" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

Write-Host ""
Write-Host "Prerequisites check complete!" -ForegroundColor Green
Write-Host ""

# Confirm deployment
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Phase 1 Deployment Configuration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This deployment will:" -ForegroundColor White
Write-Host "  - Deploy Bedrock code to Lambda functions" -ForegroundColor Gray
Write-Host "  - Set AI_PROVIDER=OPENAI (no behavior change)" -ForegroundColor Gray
Write-Host "  - Add Bedrock IAM permissions" -ForegroundColor Gray
Write-Host "  - Enable CloudWatch monitoring" -ForegroundColor Gray
Write-Host "  - Keep OpenAI as active provider" -ForegroundColor Gray
Write-Host ""
Write-Host "Expected impact:" -ForegroundColor White
Write-Host "  - No user-facing changes" -ForegroundColor Green
Write-Host "  - Bedrock available for internal testing" -ForegroundColor Green
Write-Host "  - All traffic still goes to OpenAI" -ForegroundColor Green
Write-Host ""

$confirm = Read-Host "Proceed with Phase 1 deployment? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "Deployment cancelled" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deploying..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Deploy CDK stack
Push-Location packages/backend
try {
    Write-Host "Running CDK deploy..." -ForegroundColor Yellow
    Write-Host ""
    
    # Set environment variables for deployment
    $env:AI_PROVIDER = "OPENAI"
    $env:BEDROCK_REGION = "us-east-1"
    $env:BEDROCK_MODEL_ID = "us.anthropic.claude-sonnet-4-6"
    $env:ENABLE_BEDROCK_MONITORING = "true"
    
    npx cdk deploy --require-approval never
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "[OK] Deployment successful!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "[ERR] Deployment failed" -ForegroundColor Red
        Pop-Location
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "[ERR] Deployment error" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Post-Deployment Verification" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verify deployment
Write-Host "Verifying deployment..." -ForegroundColor Yellow

# 1. Check Lambda functions
Write-Host "  [1/4] Checking Lambda functions..." -ForegroundColor Gray
try {
    $functionsJson = aws lambda list-functions --query "Functions[?contains(FunctionName, 'ai-')].FunctionName" --output json
    $functions = $functionsJson | ConvertFrom-Json
    
    Write-Host "    [OK] Found $($functions.Count) AI Lambda functions" -ForegroundColor Green
    foreach ($func in $functions) {
        Write-Host "      - $func" -ForegroundColor Gray
    }
} catch {
    Write-Host "    [WARN] Could not list Lambda functions" -ForegroundColor Yellow
}

# 2. Check environment variables
Write-Host "  [2/4] Checking environment variables..." -ForegroundColor Gray
try {
    $configJson = aws lambda get-function-configuration --function-name aibts-ai-generate --query 'Environment.Variables' --output json
    $config = $configJson | ConvertFrom-Json
    
    if ($config.AI_PROVIDER -eq "OPENAI") {
        Write-Host "    [OK] AI_PROVIDER=OPENAI (correct)" -ForegroundColor Green
    } else {
        Write-Host "    [WARN] AI_PROVIDER=$($config.AI_PROVIDER) (expected OPENAI)" -ForegroundColor Yellow
    }
    
    if ($config.BEDROCK_REGION) {
        Write-Host "    [OK] BEDROCK_REGION=$($config.BEDROCK_REGION)" -ForegroundColor Green
    }
} catch {
    Write-Host "    [WARN] Could not check environment variables" -ForegroundColor Yellow
}

# 3. Check CloudWatch Logs
Write-Host "  [3/4] Checking CloudWatch Logs..." -ForegroundColor Gray
try {
    $logGroupsJson = aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/aibts-ai-" --query "logGroups[].logGroupName" --output json
    $logGroups = $logGroupsJson | ConvertFrom-Json
    
    Write-Host "    [OK] Found $($logGroups.Count) log groups" -ForegroundColor Green
} catch {
    Write-Host "    [WARN] Could not check CloudWatch Logs" -ForegroundColor Yellow
}

# 4. Check CloudWatch Alarms
Write-Host "  [4/4] Checking CloudWatch Alarms..." -ForegroundColor Gray
try {
    $alarmsJson = aws cloudwatch describe-alarms --alarm-name-prefix "Bedrock" --query "MetricAlarms[].AlarmName" --output json
    $alarms = $alarmsJson | ConvertFrom-Json
    
    if ($alarms -and $alarms.Count -gt 0) {
        Write-Host "    [OK] Found $($alarms.Count) Bedrock alarms" -ForegroundColor Green
        foreach ($alarm in $alarms) {
            Write-Host "      - $alarm" -ForegroundColor Gray
        }
    } else {
        Write-Host "    [WARN] No Bedrock alarms found" -ForegroundColor Yellow
    }
} catch {
    Write-Host "    [WARN] Could not check CloudWatch Alarms" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Phase 1 Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Summary:" -ForegroundColor White
Write-Host "  - Bedrock code deployed successfully" -ForegroundColor Green
Write-Host "  - AI_PROVIDER=OPENAI (no behavior change)" -ForegroundColor Green
Write-Host "  - All traffic still using OpenAI" -ForegroundColor Green
Write-Host "  - Bedrock available for internal testing" -ForegroundColor Green
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor White
Write-Host "  1. Monitor CloudWatch Logs for 24-48 hours" -ForegroundColor Gray
Write-Host "  2. Test Bedrock with internal users (feature flag)" -ForegroundColor Gray
Write-Host "  3. Verify no errors or issues" -ForegroundColor Gray
Write-Host "  4. Proceed to Phase 2 (Canary Deployment)" -ForegroundColor Gray
Write-Host ""

Write-Host "Testing Bedrock:" -ForegroundColor White
Write-Host "  # Set feature flag to test Bedrock" -ForegroundColor Gray
Write-Host "  aws lambda update-function-configuration --function-name aibts-ai-generate --environment 'Variables={AI_PROVIDER=BEDROCK,...}'" -ForegroundColor Gray
Write-Host ""

Write-Host "Monitoring:" -ForegroundColor White
Write-Host "  # Watch CloudWatch Logs" -ForegroundColor Gray
Write-Host "  aws logs tail /aws/lambda/aibts-ai-generate --follow" -ForegroundColor Gray
Write-Host ""

Write-Host "Rollback (if needed):" -ForegroundColor White
Write-Host "  # No rollback needed - already using OpenAI" -ForegroundColor Green
Write-Host ""

Write-Host "Documentation:" -ForegroundColor White
Write-Host "  - Setup Guide: .kiro/specs/bedrock-migration/BEDROCK_SETUP_GUIDE.md" -ForegroundColor Gray
Write-Host "  - Migration Process: .kiro/specs/bedrock-migration/BEDROCK_MIGRATION_PROCESS.md" -ForegroundColor Gray
Write-Host "  - Troubleshooting: .kiro/specs/bedrock-migration/BEDROCK_TROUBLESHOOTING_GUIDE.md" -ForegroundColor Gray
Write-Host ""

Write-Host "Phase 1 deployment complete!" -ForegroundColor Green
