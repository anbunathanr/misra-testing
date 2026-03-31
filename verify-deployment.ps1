# Verify Deployment Status
Write-Host "=== Verifying Lambda Deployment ===" -ForegroundColor Cyan
Write-Host ""

$functions = @(
    "aibts-get-profile",
    "aibts-trigger-execution",
    "aibts-test-executor",
    "aibts-get-execution-status",
    "aibts-get-execution-results",
    "aibts-get-execution-history",
    "aibts-get-suite-results",
    "aibts-ai-get-usage",
    "misra-platform-analyze-file",
    "misra-platform-get-user-stats",
    "misra-platform-generate-insights"
)

$activeCount = 0
$totalCount = $functions.Count

foreach ($func in $functions) {
    $state = aws lambda get-function --function-name $func --query 'Configuration.State' --output text 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] $func : $state" -ForegroundColor Green
        $activeCount++
    } else {
        Write-Host "[ERROR] $func : Not Found" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "Active Lambda Functions: $activeCount / $totalCount" -ForegroundColor White
Write-Host ""

if ($activeCount -eq $totalCount) {
    Write-Host "SUCCESS: All Lambda functions are deployed and active!" -ForegroundColor Green
} else {
    Write-Host "WARNING: Some Lambda functions are missing or inactive." -ForegroundColor Yellow
}
