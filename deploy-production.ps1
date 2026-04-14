#!/usr/bin/env pwsh

Write-Host "MISRA Compliance Platform - Production Deployment" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green

# Step 1: Deploy Backend to AWS
Write-Host "`nStep 1: Deploying Backend Infrastructure..." -ForegroundColor Yellow
Set-Location packages/backend

# Build and deploy backend
Write-Host "Building Lambda functions..." -ForegroundColor Cyan
npm run build

Write-Host "Deploying to AWS..." -ForegroundColor Cyan
npx cdk deploy --all --require-approval never

if ($LASTEXITCODE -ne 0) {
    Write-Host "Backend deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Backend deployed successfully!" -ForegroundColor Green

# Step 2: Build and Deploy Frontend
Write-Host "`nStep 2: Building and Deploying Frontend..." -ForegroundColor Yellow
Set-Location ../frontend

# Install dependencies and build
Write-Host "Installing dependencies..." -ForegroundColor Cyan
npm install

Write-Host "Building production frontend..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Frontend build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Frontend built successfully!" -ForegroundColor Green

# Step 3: Deploy to Vercel (or your preferred hosting)
Write-Host "`nStep 3: Deploying to Production..." -ForegroundColor Yellow
Write-Host "Frontend is ready for deployment to Vercel/Netlify" -ForegroundColor Cyan
Write-Host "Build files are in: packages/frontend/dist" -ForegroundColor Cyan

# Return to root
Set-Location ../..

Write-Host "`nProduction Deployment Complete!" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
Write-Host "Backend: Deployed to AWS" -ForegroundColor Green
Write-Host "Frontend: Ready for hosting deployment" -ForegroundColor Green
Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "1. Deploy frontend build to Vercel/Netlify" -ForegroundColor White
Write-Host "2. Configure custom domain" -ForegroundColor White
Write-Host "3. Test the production system" -ForegroundColor White
Write-Host "4. Monitor CloudWatch logs" -ForegroundColor White