#!/usr/bin/env pwsh

# Deploy Production Infrastructure for MISRA Platform (Task 7.2)
# This script deploys production Lambda functions, DynamoDB tables, and S3 buckets
# with proper encryption, versioning, and production-grade configurations

Write-Host "Starting Production Infrastructure Deployment (Task 7.2)" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green

# Set error handling
$ErrorActionPreference = "Stop"

# Check if we're in the correct directory
if (-not (Test-Path "packages/backend")) {
    Write-Host "Error: Please run this script from the project root directory" -ForegroundColor Red
    exit 1
}

# Navigate to backend directory
Set-Location "packages/backend"

Write-Host "Building Lambda functions..." -ForegroundColor Yellow
try {
    # Build Lambda functions
    if (Test-Path "build-lambdas.js") {
        node build-lambdas.js
    } else {
        Write-Host "build-lambdas.js not found, using npm run build" -ForegroundColor Yellow
        npm run build
    }
    Write-Host "Lambda functions built successfully" -ForegroundColor Green
} catch {
    Write-Host "Failed to build Lambda functions: $_" -ForegroundColor Red
    exit 1
}

Write-Host "Installing CDK dependencies..." -ForegroundColor Yellow
try {
    npm install
    Write-Host "Dependencies installed successfully" -ForegroundColor Green
} catch {
    Write-Host "Failed to install dependencies: $_" -ForegroundColor Red
    exit 1
}

Write-Host "Synthesizing CDK stack..." -ForegroundColor Yellow
try {
    # Synthesize the production stack
    npx cdk synth --app "npx ts-node src/infrastructure/production-app.ts" MisraPlatformProductionStack
    Write-Host "CDK stack synthesized successfully" -ForegroundColor Green
} catch {
    Write-Host "Failed to synthesize CDK stack: $_" -ForegroundColor Red
    Write-Host "This might be due to missing dependencies or TypeScript compilation errors" -ForegroundColor Yellow
    exit 1
}

Write-Host "Deploying production infrastructure..." -ForegroundColor Yellow
Write-Host "This will create:" -ForegroundColor Cyan
Write-Host "  Production S3 bucket with versioning and KMS encryption" -ForegroundColor Cyan
Write-Host "  Production DynamoDB tables with encryption at rest" -ForegroundColor Cyan
Write-Host "  Production Lambda functions with reserved concurrency" -ForegroundColor Cyan
Write-Host "  Secrets Manager for JWT and OpenAI API keys" -ForegroundColor Cyan
Write-Host "  CloudWatch log groups with proper retention" -ForegroundColor Cyan

$confirmation = Read-Host "Do you want to proceed with the deployment? (y/N)"
if ($confirmation -ne "y" -and $confirmation -ne "Y") {
    Write-Host "Deployment cancelled by user" -ForegroundColor Yellow
    exit 0
}

try {
    # Deploy the production stack
    npx cdk deploy --app "npx ts-node src/infrastructure/production-app.ts" MisraPlatformProductionStack --require-approval never
    
    Write-Host "Production infrastructure deployed successfully!" -ForegroundColor Green
    Write-Host "=================================================" -ForegroundColor Green
    
    Write-Host "Deployment Summary:" -ForegroundColor Cyan
    Write-Host "  All Lambda functions deployed with production environment variables" -ForegroundColor White
    Write-Host "  DynamoDB tables configured with appropriate capacity and encryption" -ForegroundColor White
    Write-Host "  S3 buckets set up with versioning and server-side encryption" -ForegroundColor White
    Write-Host "  Secrets Manager configured for secure credential storage" -ForegroundColor White
    Write-Host "  CloudWatch logging enabled for all components" -ForegroundColor White
    
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "  1. Update Secrets Manager with actual API keys:" -ForegroundColor White
    Write-Host "     - misra-platform-jwt-secret-prod" -ForegroundColor Gray
    Write-Host "     - misra-platform-openai-secret-prod" -ForegroundColor Gray
    Write-Host "  2. Configure API Gateway to use the new Lambda functions" -ForegroundColor White
    Write-Host "  3. Update frontend environment variables with new endpoints" -ForegroundColor White
    Write-Host "  4. Test the complete production workflow" -ForegroundColor White
    
} catch {
    Write-Host "Deployment failed: $_" -ForegroundColor Red
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "  AWS credentials not configured" -ForegroundColor Gray
    Write-Host "  Insufficient IAM permissions" -ForegroundColor Gray
    Write-Host "  Resource conflicts (table names already exist)" -ForegroundColor Gray
    Write-Host "  CDK bootstrap not run in this region" -ForegroundColor Gray
    
    Write-Host "Troubleshooting steps:" -ForegroundColor Yellow
    Write-Host "  1. Run: aws configure list" -ForegroundColor Gray
    Write-Host "  2. Run: npx cdk bootstrap" -ForegroundColor Gray
    Write-Host "  3. Check CloudFormation console for detailed error messages" -ForegroundColor Gray
    
    exit 1
}

# Return to project root
Set-Location "../.."

Write-Host "Task 7.2 Production Infrastructure Deployment Complete!" -ForegroundColor Green