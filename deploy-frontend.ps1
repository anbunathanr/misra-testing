# AIBTS Frontend Deployment Script
# This script deploys the frontend to Vercel

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AIBTS Frontend Deployment to Vercel  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if Vercel CLI is installed
Write-Host "[1/5] Checking Vercel CLI..." -ForegroundColor Yellow
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue

if (-not $vercelInstalled) {
    Write-Host "Vercel CLI not found. Installing..." -ForegroundColor Yellow
    npm install -g vercel
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to install Vercel CLI" -ForegroundColor Red
        exit 1
    }
    Write-Host "Vercel CLI installed successfully!" -ForegroundColor Green
} else {
    Write-Host "Vercel CLI already installed" -ForegroundColor Green
}

Write-Host ""

# Step 2: Navigate to frontend directory
Write-Host "[2/5] Navigating to frontend directory..." -ForegroundColor Yellow
Set-Location packages/frontend

# Step 3: Install dependencies
Write-Host "[3/5] Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to install dependencies" -ForegroundColor Red
    Set-Location ../..
    exit 1
}
Write-Host "Dependencies installed successfully!" -ForegroundColor Green

Write-Host ""

# Step 4: Build frontend
Write-Host "[4/5] Building frontend for production..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed" -ForegroundColor Red
    Set-Location ../..
    exit 1
}
Write-Host "Build completed successfully!" -ForegroundColor Green

Write-Host ""

# Step 5: Deploy to Vercel
Write-Host "[5/5] Deploying to Vercel..." -ForegroundColor Yellow
Write-Host ""
Write-Host "IMPORTANT: When prompted:" -ForegroundColor Cyan
Write-Host "  - Set up and deploy? Yes" -ForegroundColor White
Write-Host "  - Which scope? Choose your account" -ForegroundColor White
Write-Host "  - Link to existing project? No (first time) or Yes (subsequent)" -ForegroundColor White
Write-Host "  - Project name? aibts-platform (or your preferred name)" -ForegroundColor White
Write-Host "  - Directory? ./ (current directory)" -ForegroundColor White
Write-Host "  - Override settings? No" -ForegroundColor White
Write-Host ""

vercel --prod

if ($LASTEXITCODE -ne 0) {
    Write-Host "Deployment failed" -ForegroundColor Red
    Set-Location ../..
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Deployment Successful!                " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Your frontend is now live!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Note the deployment URL from above" -ForegroundColor White
Write-Host "2. Test the application in your browser" -ForegroundColor White
Write-Host "3. Update API Gateway CORS to allow your frontend URL" -ForegroundColor White
Write-Host ""

# Return to root directory
Set-Location ../..
