#!/usr/bin/env pwsh

Write-Host "Updating Lambda Functions with Bundled Code" -ForegroundColor Cyan

# Get all misra Lambda functions
$functions = @(
    "misra-get-projects",
    "misra-create-project",
    "misra-update-project",
    "misra-get-test-suites",
    "misra-create-test-suite",
    "misra-update-test-suite",
    "misra-get-test-cases",
    "misra-create-test-case",
    "misra-update-test-case",
    "misra-get-files",
    "misra-upload-file",
    "misra-query-analysis",
    "misra-get-user-stats",
    "misra-trigger-execution",
    "misra-get-execution-status",
    "misra-get-execution-results",
    "misra-get-execution-history",
    "misra-get-suite-execution-results",
    "misra-generate-insights",
    "misra-login",
    "misra-refresh",
    "misra-get-profile",
    "misra-get-preferences",
    "misra-update-preferences",
    "misra-get-history",
    "misra-get-notification",
    "misra-get-templates",
    "misra-create-template",
    "misra-update-template"
)

# Mapping of function names to their bundled code paths
$functionMap = @{
    "misra-get-projects" = "projects/get-projects"
    "misra-create-project" = "projects/create-project"
    "misra-update-project" = "projects/update-project"
    "misra-get-test-suites" = "test-suites/get-suites"
    "misra-create-test-suite" = "test-suites/create-suite"
    "misra-update-test-suite" = "test-suites/update-suite"
    "misra-get-test-cases" = "test-cases/get-test-cases"
    "misra-create-test-case" = "test-cases/create-test-case"
    "misra-update-test-case" = "test-cases/update-test-case"
    "misra-get-files" = "file/get-files"
    "misra-upload-file" = "file/upload"
    "misra-query-analysis" = "analysis/query-results"
    "misra-get-user-stats" = "analysis/get-user-stats"
    "misra-trigger-execution" = "executions/trigger"
    "misra-get-execution-status" = "executions/get-status"
    "misra-get-execution-results" = "executions/get-results"
    "misra-get-execution-history" = "executions/get-history"
    "misra-get-suite-execution-results" = "executions/get-suite-results"
    "misra-generate-insights" = "ai/generate-insights"
    "misra-login" = "auth/login"
    "misra-refresh" = "auth/refresh"
    "misra-get-profile" = "auth/get-profile"
    "misra-get-preferences" = "notifications/get-preferences"
    "misra-update-preferences" = "notifications/update-preferences"
    "misra-get-history" = "notifications/get-history"
    "misra-get-notification" = "notifications/get-notification"
    "misra-get-templates" = "notifications/get-templates"
    "misra-create-template" = "notifications/create-template"
    "misra-update-template" = "notifications/update-template"
}

$updated = 0
$failed = 0

foreach ($func in $functions) {
    $bundledPath = $functionMap[$func]
    if (-not $bundledPath) {
        Write-Host "No mapping for $func" -ForegroundColor Yellow
        continue
    }
    
    $codeDir = "packages/backend/dist-lambdas/$bundledPath"
    $zipFile = "packages/backend/lambda-$func.zip"
    
    if (-not (Test-Path $codeDir)) {
        Write-Host "Code directory not found: $codeDir" -ForegroundColor Red
        $failed++
        continue
    }
    
    # Create zip file
    Write-Host "Creating zip for $func..." -ForegroundColor Gray
    Compress-Archive -Path "$codeDir/*" -DestinationPath $zipFile -Force -ErrorAction SilentlyContinue
    
    # Update Lambda function
    Write-Host "Updating $func..." -ForegroundColor Yellow
    $result = aws lambda update-function-code --function-name $func --zip-file "fileb://$zipFile" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Updated $func" -ForegroundColor Green
        $updated++
        Remove-Item $zipFile -Force -ErrorAction SilentlyContinue
    } else {
        Write-Host "Failed to update $func" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
        $failed++
    }
}

Write-Host "`nSummary:" -ForegroundColor Cyan
Write-Host "Updated: $updated" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor Red

if ($failed -eq 0) {
    Write-Host "`nAll Lambda functions updated successfully!" -ForegroundColor Green
    Write-Host "`nWaiting for Lambda functions to be ready..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    Write-Host "Lambda functions are ready!" -ForegroundColor Green
} else {
    Write-Host "`nSome Lambda functions failed to update" -ForegroundColor Yellow
}
