#!/usr/bin/env pwsh

Write-Host "🔧 Fixing 503 Errors - Deploying Updated Lambda Functions" -ForegroundColor Cyan

# Step 1: Build backend
Write-Host "`n📦 Building backend..." -ForegroundColor Yellow
cd packages/backend
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}

# Step 2: Deploy CDK
Write-Host "`n🚀 Deploying CDK stack..." -ForegroundColor Yellow
cdk deploy --require-approval never
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment failed" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ Deployment complete!" -ForegroundColor Green
Write-Host "`n📝 Next steps:" -ForegroundColor Cyan
Write-Host "1. Go to your Vercel URL"
Write-Host "2. Login with your credentials"
Write-Host "3. Click 'Projects' - should see demo projects"
Write-Host "4. Try creating a new project"
Write-Host "5. All endpoints should return 200 (no more 503 errors)"
