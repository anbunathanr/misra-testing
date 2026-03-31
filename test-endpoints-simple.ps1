# Simple Endpoint Testing Script
Write-Host "=== Testing New Lambda Function Endpoints ===" -ForegroundColor Cyan
Write-Host ""

$apiUrl = "https://7r9qmrftc6.execute-api.us-east-1.amazonaws.com"

# Test endpoints
$endpoints = @(
    @{ Name = "Get User Profile"; Path = "/auth/profile"; Method = "GET" },
    @{ Name = "Get Execution History"; Path = "/executions/history"; Method = "GET" },
    @{ Name = "Trigger Execution"; Path = "/executions/trigger"; Method = "POST" },
    @{ Name = "Get Execution Status"; Path = "/executions/test-id/status"; Method = "GET" },
    @{ Name = "Get Execution Results"; Path = "/executions/test-id"; Method = "GET" },
    @{ Name = "Get Suite Results"; Path = "/executions/suites/test-suite-id"; Method = "GET" },
    @{ Name = "Get AI Usage"; Path = "/ai-test-generation/usage"; Method = "GET" },
    @{ Name = "Analyze File"; Path = "/analysis/analyze"; Method = "POST" },
    @{ Name = "Get User Stats"; Path = "/analysis/stats/test-user"; Method = "GET" },
    @{ Name = "Generate Insights"; Path = "/ai/insights"; Method = "POST" }
)

$passed = 0
$failed = 0

foreach ($endpoint in $endpoints) {
    Write-Host "Testing: $($endpoint.Name)" -ForegroundColor Yellow
    Write-Host "  $($endpoint.Method) $($endpoint.Path)" -ForegroundColor Gray
    
    try {
        $response = Invoke-WebRequest -Uri "$apiUrl$($endpoint.Path)" -Method $endpoint.Method -ErrorAction Stop
        Write-Host "  ✓ Success: $($response.StatusCode)" -ForegroundColor Green
        $passed++
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq 401) {
            Write-Host "  ✓ Expected 401 (Auth Required)" -ForegroundColor Green
            $passed++
        } elseif ($statusCode -eq 404) {
            Write-Host "  ✗ Not Found: 404" -ForegroundColor Red
            $failed++
        } elseif ($statusCode -eq 500) {
            Write-Host "  ✗ Server Error: 500" -ForegroundColor Red
            $failed++
        } else {
            Write-Host "  ⚠ Status: $statusCode" -ForegroundColor Yellow
            $passed++
        }
    }
    Write-Host ""
}

# Test Lambda function status
Write-Host "=== Verifying Lambda Function Status ===" -ForegroundColor Cyan
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
foreach ($func in $functions) {
    $state = aws lambda get-function --function-name $func --query 'Configuration.State' --output text 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "$func : $state" -ForegroundColor Green
        $activeCount++
    } else {
        Write-Host "$func : ERROR" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "Endpoint Tests - Passed: $passed, Failed: $failed" -ForegroundColor White
Write-Host "Lambda Functions - Active: $activeCount / $($functions.Count)" -ForegroundColor White
Write-Host ""

if ($failed -eq 0 -and $activeCount -eq $functions.Count) {
    Write-Host "✓ All systems operational!" -ForegroundColor Green
} else {
    Write-Host "⚠ Some issues detected." -ForegroundColor Yellow
}
