#!/usr/bin/env pwsh

# Cleanup and Deploy Production Infrastructure for MISRA Platform (Task 7.2)
# This script handles existing resource conflicts and deploys production infrastructure

Write-Host "Starting Production Infrastructure Cleanup and Deployment" -ForegroundColor Green
Write-Host "=========================================================" -ForegroundColor Green

# Set error handling
$ErrorActionPreference = "Stop"

# Check if we're in the correct directory
if (-not (Test-Path "packages/backend")) {
    Write-Host "Error: Please run this script from the project root directory" -ForegroundColor Red
    exit 1
}

# Navigate to backend directory
Set-Location "packages/backend"

Write-Host "Step 1: Cleaning up existing resources..." -ForegroundColor Yellow

# Delete existing CloudWatch log groups
$logGroups = @(
    "/aws/lambda/misra-platform-analyze-file-prod",
    "/aws/lambda/misra-platform-get-analysis-results-prod", 
    "/aws/lambda/misra-platform-upload-file-prod",
    "/aws/lambda/misra-platform-create-project-prod",
    "/aws/lambda/misra-platform-get-projects-prod",
    "/aws/lambda/misra-platform-authorizer-prod"
)

foreach ($logGroup in $logGroups) {
    try {
        aws logs delete-log-group --log-group-name $logGroup --region us-east-1 2>$null
        Write-Host "  Deleted log group: $logGroup" -ForegroundColor Gray
    } catch {
        Write-Host "  Log group not found or already deleted: $logGroup" -ForegroundColor Gray
    }
}

# Delete existing DynamoDB tables
$tables = @(
    "misra-platform-users-prod",
    "misra-platform-projects-prod", 
    "misra-platform-file-metadata-prod",
    "misra-platform-analysis-results-prod",
    "misra-platform-sample-files-prod"
)

foreach ($table in $tables) {
    try {
        aws dynamodb delete-table --table-name $table --region us-east-1 2>$null
        Write-Host "  Initiated deletion of table: $table" -ForegroundColor Gray
    } catch {
        Write-Host "  Table not found or already deleted: $table" -ForegroundColor Gray
    }
}

# Delete existing S3 buckets
$buckets = @(
    "misra-platform-files-prod-982479882798",
    "misra-platform-logs-prod-982479882798"
)

foreach ($bucket in $buckets) {
    try {
        # Empty bucket first
        aws s3 rm s3://$bucket --recursive 2>$null
        # Delete bucket
        aws s3 rb s3://$bucket --force 2>$null
        Write-Host "  Deleted S3 bucket: $bucket" -ForegroundColor Gray
    } catch {
        Write-Host "  Bucket not found or already deleted: $bucket" -ForegroundColor Gray
    }
}

Write-Host "Step 2: Waiting for resource cleanup to complete..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

Write-Host "Step 3: Building Lambda functions..." -ForegroundColor Yellow
try {
    if (Test-Path "build-lambdas.js") {
        node build-lambdas.js
    } else {
        npm run build
    }
    Write-Host "Lambda functions built successfully" -ForegroundColor Green
} catch {
    Write-Host "Failed to build Lambda functions: $_" -ForegroundColor Red
    exit 1
}

Write-Host "Step 4: Deploying production infrastructure..." -ForegroundColor Yellow
try {
    # Deploy with automatic approval
    npx cdk deploy --app "npx ts-node src/infrastructure/production-app.ts" MisraPlatformProductionStack --require-approval never --outputs-file production-outputs.json
    
    Write-Host "Production infrastructure deployed successfully!" -ForegroundColor Green
    Write-Host "=========================================================" -ForegroundColor Green
    
    # Display outputs if available
    if (Test-Path "production-outputs.json") {
        $outputs = Get-Content "production-outputs.json" | ConvertFrom-Json
        Write-Host "Deployment Outputs:" -ForegroundColor Cyan
        
        $stackOutputs = $outputs.MisraPlatformProductionStack
        if ($stackOutputs) {
            foreach ($property in $stackOutputs.PSObject.Properties) {
                Write-Host "  $($property.Name): $($property.Value)" -ForegroundColor White
            }
        }
    }
    
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "  1. Update Secrets Manager with actual API keys" -ForegroundColor White
    Write-Host "  2. Configure API Gateway to use the new Lambda functions" -ForegroundColor White
    Write-Host "  3. Update frontend environment variables" -ForegroundColor White
    Write-Host "  4. Test the complete production workflow" -ForegroundColor White
    
} catch {
    Write-Host "Deployment failed: $_" -ForegroundColor Red
    Write-Host "Check CloudFormation console for detailed error messages" -ForegroundColor Yellow
    exit 1
}

# Return to project root
Set-Location "../.."

Write-Host "Task 7.2 Production Infrastructure Deployment Complete!" -ForegroundColor Green