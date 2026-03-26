#!/usr/bin/env pwsh

Write-Host "Fixing 503 Errors - Deploying Updated Lambda Functions" -ForegroundColor Cyan

# Step 1: Build backend
Write-Host "`nBuilding backend..." -ForegroundColor Yellow
cd packages/backend
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed" -ForegroundColor Red
    exit 1
}

# Step 2: Update Lambda functions with fixed code
Write-Host "`nUpdating Lambda functions..." -ForegroundColor Yellow

# Update get-projects function
Write-Host "Updating misra-get-projects..." -ForegroundColor Yellow
aws lambda update-function-code --function-name misra-get-projects --zip-file fileb://packages/backend/dist-zips/projects/get-projects/index.zip
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to update misra-get-projects" -ForegroundColor Red
}

# Update create-project function
Write-Host "Updating misra-create-project..." -ForegroundColor Yellow
aws lambda update-function-code --function-name misra-create-project --zip-file fileb://packages/backend/dist-zips/projects/create-project/index.zip
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to update misra-create-project" -ForegroundColor Red
}

# Update get-files function
Write-Host "Updating misra-get-files..." -ForegroundColor Yellow
aws lambda update-function-code --function-name misra-get-files --zip-file fileb://packages/backend/dist-zips/file/get-files/index.zip
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to update misra-get-files" -ForegroundColor Red
}

# Update query-analysis function
Write-Host "Updating misra-query-analysis..." -ForegroundColor Yellow
aws lambda update-function-code --function-name misra-query-analysis --zip-file fileb://packages/backend/dist-zips/analysis/query-results/index.zip
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to update misra-query-analysis" -ForegroundColor Red
}

# Update get-user-stats function
Write-Host "Updating misra-get-user-stats..." -ForegroundColor Yellow
aws lambda update-function-code --function-name misra-get-user-stats --zip-file fileb://packages/backend/dist-zips/analysis/get-user-stats/index.zip
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to update misra-get-user-stats" -ForegroundColor Red
}

# Update generate-insights function
Write-Host "Updating misra-generate-insights..." -ForegroundColor Yellow
aws lambda update-function-code --function-name misra-generate-insights --zip-file fileb://packages/backend/dist-zips/ai/generate-insights/index.zip
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to update misra-generate-insights" -ForegroundColor Red
}

# Wait for functions to be fully deployed
Write-Host "`nWaiting for Lambda functions to be fully deployed..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Verify function status
Write-Host "`nVerifying Lambda function status..." -ForegroundColor Yellow
$functions = @("misra-get-projects", "misra-create-project", "misra-get-files", "misra-query-analysis", "misra-get-user-stats", "misra-generate-insights")
foreach ($func in $functions) {
    $status = aws lambda get-function --function-name $func --query 'Configuration.LastUpdateStatus' --output text
    if ($status -eq "Successful") {
        Write-Host "${func}: OK" -ForegroundColor Green
    } else {
        Write-Host "${func}: ${status}" -ForegroundColor Yellow
    }
}

Write-Host "`nDeployment complete!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Go to your Vercel URL"
Write-Host "2. Login with your credentials"
Write-Host "3. Click 'Projects' - should see demo projects"
Write-Host "4. Try creating a new project"
Write-Host "5. All endpoints should return 200 (no more 503 errors)"