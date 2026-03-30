# Update all Lambda functions with bundled code
# This script updates all Lambda functions in the MisraPlatformStack with their bundled code

Write-Host "=== Updating All Lambda Functions with Bundled Code ===" -ForegroundColor Cyan
Write-Host ""

# Define all Lambda functions and their zip paths
$functions = @(
    # Auth functions
    @{ Name = "misra-platform-login"; Zip = "dist-zips/auth/login/index.zip" }
    @{ Name = "misra-platform-register"; Zip = "dist-zips/auth/register/index.zip" }
    @{ Name = "misra-platform-refresh"; Zip = "dist-zips/auth/refresh/index.zip" }
    @{ Name = "aibts-get-profile"; Zip = "dist-zips/auth/get-profile/index.zip" }
    
    # File functions
    @{ Name = "misra-platform-file-upload"; Zip = "dist-zips/file/upload/index.zip" }
    @{ Name = "misra-platform-upload-complete"; Zip = "dist-zips/file/upload-complete/index.zip" }
    @{ Name = "misra-platform-get-files"; Zip = "dist-zips/file/get-files/index.zip" }
    
    # Project functions
    @{ Name = "misra-platform-create-project"; Zip = "dist-zips/projects/create-project/index.zip" }
    @{ Name = "misra-platform-get-projects"; Zip = "dist-zips/projects/get-projects-minimal/index.zip" }
    @{ Name = "misra-platform-update-project"; Zip = "dist-zips/projects/update-project/index.zip" }
    
    # Test Suite functions
    @{ Name = "misra-platform-create-test-suite"; Zip = "dist-zips/test-suites/create-suite/index.zip" }
    @{ Name = "misra-platform-get-test-suites"; Zip = "dist-zips/test-suites/get-suites/index.zip" }
    @{ Name = "misra-platform-update-test-suite"; Zip = "dist-zips/test-suites/update-suite/index.zip" }
    
    # Test Case functions
    @{ Name = "misra-platform-create-test-case"; Zip = "dist-zips/test-cases/create-test-case/index.zip" }
    @{ Name = "misra-platform-get-test-cases"; Zip = "dist-zips/test-cases/get-test-cases/index.zip" }
    @{ Name = "misra-platform-update-test-case"; Zip = "dist-zips/test-cases/update-test-case/index.zip" }
    
    # Test Execution functions
    @{ Name = "aibts-trigger-execution"; Zip = "dist-zips/executions/trigger/index.zip" }
    @{ Name = "aibts-test-executor"; Zip = "dist-zips/executions/executor/index.zip" }
    @{ Name = "aibts-get-execution-status"; Zip = "dist-zips/executions/get-status/index.zip" }
    @{ Name = "aibts-get-execution-results"; Zip = "dist-zips/executions/get-results/index.zip" }
    @{ Name = "aibts-get-execution-history"; Zip = "dist-zips/executions/get-history/index.zip" }
    @{ Name = "aibts-get-suite-results"; Zip = "dist-zips/executions/get-suite-results/index.zip" }
    
    # Notification functions
    @{ Name = "aibts-notification-processor"; Zip = "dist-zips/notifications/processor/index.zip" }
    @{ Name = "aibts-scheduled-reports"; Zip = "dist-zips/notifications/scheduled-reports/index.zip" }
    @{ Name = "aibts-get-preferences"; Zip = "dist-zips/notifications/get-preferences/index.zip" }
    @{ Name = "aibts-update-preferences"; Zip = "dist-zips/notifications/update-preferences/index.zip" }
    @{ Name = "aibts-get-history"; Zip = "dist-zips/notifications/get-history/index.zip" }
    @{ Name = "aibts-get-notification"; Zip = "dist-zips/notifications/get-notification/index.zip" }
    @{ Name = "aibts-create-template"; Zip = "dist-zips/notifications/create-template/index.zip" }
    @{ Name = "aibts-update-template"; Zip = "dist-zips/notifications/update-template/index.zip" }
    @{ Name = "aibts-get-templates"; Zip = "dist-zips/notifications/get-templates/index.zip" }
    @{ Name = "aibts-seed-templates"; Zip = "dist-zips/notifications/seed-templates/index.zip" }
    
    # AI Test Generation functions
    @{ Name = "aibts-ai-generate"; Zip = "dist-zips/ai-test-generation/generate/index.zip" }
    @{ Name = "aibts-ai-analyze"; Zip = "dist-zips/ai-test-generation/analyze/index.zip" }
    @{ Name = "aibts-ai-batch"; Zip = "dist-zips/ai-test-generation/batch/index.zip" }
    @{ Name = "aibts-ai-get-usage"; Zip = "dist-zips/ai-test-generation/get-usage/index.zip" }
    
    # Analysis functions
    @{ Name = "misra-platform-analyze-file"; Zip = "dist-zips/analysis/analyze-file/index.zip" }
    @{ Name = "misra-platform-query-results"; Zip = "dist-zips/analysis/query-results/index.zip" }
    @{ Name = "misra-platform-get-user-stats"; Zip = "dist-zips/analysis/get-user-stats/index.zip" }
    
    # AI Insights functions
    @{ Name = "misra-platform-generate-insights"; Zip = "dist-zips/ai/generate-insights/index.zip" }
)

$successCount = 0
$failCount = 0
$skippedCount = 0
$currentIndex = 0

foreach ($func in $functions) {
    $currentIndex++
    $functionName = $func.Name
    $zipPath = $func.Zip
    
    Write-Host "[$currentIndex/$($functions.Count)] Processing: $functionName" -ForegroundColor Yellow
    
    # Check if zip file exists
    if (-not (Test-Path $zipPath)) {
        Write-Host "  Warning: Zip file not found at $zipPath" -ForegroundColor DarkYellow
        $skippedCount++
        continue
    }
    
    # Check if function exists
    $functionExists = $false
    try {
        aws lambda get-function --function-name $functionName --query 'Configuration.FunctionName' --output text 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            $functionExists = $true
        }
    } catch {
        # Function doesn't exist
    }
    
    if (-not $functionExists) {
        Write-Host "  Warning: Function does not exist in AWS" -ForegroundColor DarkYellow
        $skippedCount++
        continue
    }
    
    # Update function code
    $updateResult = aws lambda update-function-code --function-name $functionName --zip-file "fileb://$zipPath" --query '[CodeSize,LastModified]' --output json 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        try {
            $info = $updateResult | ConvertFrom-Json
            Write-Host "  Success: Updated (Size: $($info[0]) bytes)" -ForegroundColor Green
            $successCount++
        } catch {
            Write-Host "  Success: Updated" -ForegroundColor Green
            $successCount++
        }
    } else {
        Write-Host "  Error: Failed to update" -ForegroundColor Red
        $failCount++
    }
    
    # Small delay to avoid rate limiting
    Start-Sleep -Milliseconds 500
}

Write-Host ""
Write-Host "=== Update Summary ===" -ForegroundColor Cyan
Write-Host "Successfully updated: $successCount" -ForegroundColor Green
Write-Host "Failed: $failCount" -ForegroundColor Red
Write-Host "Skipped: $skippedCount" -ForegroundColor Yellow
Write-Host ""

if ($failCount -eq 0 -and $successCount -gt 0) {
    Write-Host "All Lambda functions updated successfully!" -ForegroundColor Green
    Write-Host "You can now test your API endpoints." -ForegroundColor Cyan
} elseif ($failCount -gt 0) {
    Write-Host "Some functions failed to update. Please check the errors above." -ForegroundColor Red
    exit 1
} else {
    Write-Host "No functions were updated. Please check if the zip files exist." -ForegroundColor Yellow
}
