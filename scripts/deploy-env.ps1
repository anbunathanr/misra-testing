# Environment-specific deployment script for MISRA Platform (PowerShell)
# Usage: .\scripts\deploy-env.ps1 -Environment <env> [-SkipTests] [-SkipBuild] [-SkipFrontend] [-DryRun]
# Example: .\scripts\deploy-env.ps1 -Environment dev -SkipTests

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('dev', 'staging', 'production')]
    [string]$Environment,
    
    [switch]$SkipTests,
    [switch]$SkipBuild,
    [switch]$SkipFrontend,
    [switch]$DryRun,
    [switch]$Help
)

# Show help if requested
if ($Help) {
    Write-Host @"
Usage: .\scripts\deploy-env.ps1 -Environment <env> [options]

Environments:
  dev         Deploy to development environment
  staging     Deploy to staging environment
  production  Deploy to production environment

Options:
  -SkipTests      Skip running tests before deployment
  -SkipBuild      Skip building Lambda functions
  -SkipFrontend   Skip frontend deployment
  -DryRun         Show what would be deployed without actually deploying
  -Help           Show this help message

Examples:
  .\scripts\deploy-env.ps1 -Environment dev
  .\scripts\deploy-env.ps1 -Environment staging -SkipTests
  .\scripts\deploy-env.ps1 -Environment production -DryRun
"@
    exit 0
}

# Script configuration
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$BackendDir = Join-Path $ProjectRoot "packages\backend"
$FrontendDir = Join-Path $ProjectRoot "packages\frontend"

# Helper functions
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Print deployment banner
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  MISRA Platform Deployment" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Environment: $Environment" -ForegroundColor Cyan
Write-Host "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Info "Checking prerequisites..."

# Check AWS CLI
try {
    $awsVersion = aws --version 2>&1
    Write-Success "AWS CLI installed: $awsVersion"
} catch {
    Write-Error "AWS CLI not found. Please install AWS CLI first."
    exit 1
}

# Check AWS credentials
try {
    $identity = aws sts get-caller-identity 2>&1 | ConvertFrom-Json
    $awsAccount = $identity.Account
    $awsRegion = aws configure get region
    Write-Success "AWS credentials configured (Account: $awsAccount, Region: $awsRegion)"
} catch {
    Write-Error "AWS credentials not configured. Run 'aws configure' first."
    exit 1
}

# Check CDK
try {
    $cdkVersion = cdk --version 2>&1
    Write-Success "AWS CDK installed: $cdkVersion"
} catch {
    Write-Error "AWS CDK not found. Install with: npm install -g aws-cdk"
    exit 1
}

# Check Node.js
try {
    $nodeVersion = node --version 2>&1
    Write-Success "Node.js installed: $nodeVersion"
} catch {
    Write-Error "Node.js not found. Please install Node.js 18+ first."
    exit 1
}

# Check npm
try {
    $npmVersion = npm --version 2>&1
    Write-Success "npm installed: $npmVersion"
} catch {
    Write-Error "npm not found. Please install npm first."
    exit 1
}

Write-Host ""

# Run tests if not skipped
if (-not $SkipTests) {
    Write-Info "Running tests..."
    Set-Location $ProjectRoot
    
    if (-not $DryRun) {
        npm run test
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Tests failed. Aborting deployment."
            exit 1
        }
        Write-Success "All tests passed"
    } else {
        Write-Warning "DRY RUN: Would run tests"
    }
    Write-Host ""
} else {
    Write-Warning "Skipping tests"
    Write-Host ""
}

# Install dependencies
Write-Info "Installing dependencies..."
Set-Location $ProjectRoot

if (-not $DryRun) {
    npm ci
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install dependencies"
        exit 1
    }
    Write-Success "Dependencies installed"
} else {
    Write-Warning "DRY RUN: Would install dependencies"
}
Write-Host ""

# Build backend
if (-not $SkipBuild) {
    Write-Info "Building backend..."
    Set-Location $BackendDir
    
    if (-not $DryRun) {
        npm run build
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Backend build failed"
            exit 1
        }
        Write-Success "Backend built successfully"
    } else {
        Write-Warning "DRY RUN: Would build backend"
    }
    Write-Host ""
} else {
    Write-Warning "Skipping backend build"
    Write-Host ""
}

# Deploy backend infrastructure
Write-Info "Deploying backend infrastructure to $Environment..."
Set-Location $BackendDir

if (-not $DryRun) {
    # Set environment context
    $env:CDK_DEPLOY_ENVIRONMENT = $Environment
    
    # Deploy with CDK
    cdk deploy --context environment=$Environment --require-approval never --outputs-file "cdk-outputs-$Environment.json"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Backend deployment failed"
        exit 1
    }
    
    Write-Success "Backend deployed successfully"
    
    # Extract outputs
    $outputFile = "cdk-outputs-$Environment.json"
    if (Test-Path $outputFile) {
        $outputs = Get-Content $outputFile | ConvertFrom-Json
        $stackOutputs = $outputs.PSObject.Properties.Value
        
        $apiUrl = $stackOutputs.ApiUrl
        $userPoolId = $stackOutputs.UserPoolId
        $userPoolClientId = $stackOutputs.UserPoolClientId
        
        Write-Info "Deployment outputs:"
        Write-Host "  API URL: $apiUrl"
        Write-Host "  User Pool ID: $userPoolId"
        Write-Host "  User Pool Client ID: $userPoolClientId"
    }
} else {
    Write-Warning "DRY RUN: Would deploy backend with: cdk deploy --context environment=$Environment"
}
Write-Host ""

# Deploy frontend
if (-not $SkipFrontend) {
    Write-Info "Building and deploying frontend..."
    Set-Location $FrontendDir
    
    if (-not $DryRun) {
        # Create environment file
        if ($apiUrl) {
            @"
VITE_API_URL=$apiUrl
VITE_USER_POOL_ID=$userPoolId
VITE_USER_POOL_CLIENT_ID=$userPoolClientId
VITE_ENVIRONMENT=$Environment
"@ | Out-File -FilePath ".env.production" -Encoding utf8
            Write-Success "Frontend environment file created"
        }
        
        # Build frontend
        npm run build
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Frontend build failed"
            exit 1
        }
        Write-Success "Frontend built successfully"
        
        # Deploy to S3
        $bucketName = "misra-platform-frontend-$Environment-$awsAccount"
        Write-Info "Deploying frontend to S3 bucket: $bucketName"
        
        aws s3 sync dist/ "s3://$bucketName" --delete
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Frontend deployment to S3 failed"
            exit 1
        }
        Write-Success "Frontend deployed to S3"
        
        # Invalidate CloudFront cache
        $distributionId = aws cloudfront list-distributions --query "DistributionList.Items[?Origins.Items[?DomainName=='$bucketName.s3.amazonaws.com']].Id" --output text
        
        if ($distributionId) {
            Write-Info "Invalidating CloudFront cache..."
            aws cloudfront create-invalidation --distribution-id $distributionId --paths "/*" | Out-Null
            Write-Success "CloudFront cache invalidated"
        }
    } else {
        Write-Warning "DRY RUN: Would build and deploy frontend"
    }
    Write-Host ""
} else {
    Write-Warning "Skipping frontend deployment"
    Write-Host ""
}

# Run smoke tests
Write-Info "Running smoke tests..."
if (-not $DryRun -and $apiUrl) {
    # Health check
    try {
        $response = Invoke-WebRequest -Uri "$apiUrl/health" -Method Get -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Success "Health check passed"
        }
    } catch {
        Write-Warning "Health check failed - API may still be initializing"
    }
} else {
    Write-Warning "DRY RUN: Would run smoke tests"
}
Write-Host ""

# Print deployment summary
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Deployment Summary" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Environment: $Environment" -ForegroundColor Cyan
Write-Host "Status: SUCCESS" -ForegroundColor Green
Write-Host "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
if (-not $DryRun) {
    Write-Host "API URL: $apiUrl" -ForegroundColor Cyan
    Write-Host "Frontend: s3://misra-platform-frontend-$Environment-$awsAccount" -ForegroundColor Cyan
}
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Write-Success "Deployment completed successfully!"

# Save deployment metadata
if (-not $DryRun) {
    $deploymentsDir = Join-Path $ProjectRoot "deployments"
    if (-not (Test-Path $deploymentsDir)) {
        New-Item -ItemType Directory -Path $deploymentsDir | Out-Null
    }
    
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $deploymentLog = Join-Path $deploymentsDir "$Environment-$timestamp.json"
    
    $gitCommit = try { git rev-parse HEAD 2>$null } catch { "unknown" }
    $gitBranch = try { git rev-parse --abbrev-ref HEAD 2>$null } catch { "unknown" }
    
    @{
        environment = $Environment
        timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        awsAccount = $awsAccount
        awsRegion = $awsRegion
        apiUrl = $apiUrl
        userPoolId = $userPoolId
        userPoolClientId = $userPoolClientId
        deployedBy = $env:USERNAME
        gitCommit = $gitCommit
        gitBranch = $gitBranch
    } | ConvertTo-Json | Out-File -FilePath $deploymentLog -Encoding utf8
    
    Write-Info "Deployment metadata saved to: $deploymentLog"
}

Set-Location $ProjectRoot
exit 0
