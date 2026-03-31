# Test All New Lambda Function Endpoints
# This script tests all 11 newly deployed Lambda functions

Write-Host "=== Testing New Lambda Function Endpoints ===" -ForegroundColor Cyan
Write-Host ""

$apiUrl = "https://7r9qmrftc6.execute-api.us-east-1.amazonaws.com"
$testResults = @()

# Function to test endpoint
function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Path,
        [string]$Body = $null,
        [bool]$RequiresAuth = $false
    )
    
    Write-Host "Testing: $Name" -ForegroundColor Yellow
    Write-Host "  Method: $Method $Path" -ForegroundColor Gray
    
    $statusCode = 0
    $result = "FAIL"
    
    try {
        $headers = @{
            "Content-Type" = "application/json"
        }
        
        $params = @{
            Uri = "$apiUrl$Path"
            Method = $Method
            Headers = $headers
            ErrorAction = "Stop"
        }
        
        if ($Body) {
            $params.Body = $Body
        }
        
        $response = Invoke-WebRequest @params
        $statusCode = $response.StatusCode
        
        if ($statusCode -eq 200 -or $statusCode -eq 201) {
            Write-Host "  ✓ Success: $statusCode" -ForegroundColor Green
            $result = "PASS"
        } elseif ($statusCode -eq 401 -and $RequiresAuth) {
            Write-Host "  ✓ Expected 401 (Auth Required): $statusCode" -ForegroundColor Green
            $result = "PASS"
        } else {
            Write-Host "  ⚠ Unexpected: $statusCode" -ForegroundColor Yellow
            $result = "WARN"
        }
    } catch {
        if ($_.Exception.Response) {
            $statusCode = $_.Exception.Response.StatusCode.value__
        }
        
        if ($statusCode -eq 401 -and $RequiresAuth) {
            Write-Host "  ✓ Expected 401 (Auth Required)" -ForegroundColor Green
            $result = "PASS"
        } elseif ($statusCode -eq 404) {
            Write-Host "  ✗ Not Found: 404" -ForegroundColor Red
            $result = "FAIL"
        } elseif ($statusCode -eq 500) {
            Write-Host "  ✗ Server Error: 500" -ForegroundColor Red
            $result = "FAIL"
        } elseif ($statusCode -eq 403) {
            Write-Host "  ⚠ Forbidden: 403" -ForegroundColor Yellow
            $result = "WARN"
        } else {
            Write-Host "  ✗ Error: $statusCode - $($_.Exception.Message)" -ForegroundColor Red
            $result = "FAIL"
        }
    }
    
    Write-Host ""
    
    return @{
        Name = $Name
        Path = $Path
        Result = $result
        StatusCode = $statusCode
    }
}

# Test 1: Profile Endpoint
$testResults += Test-Endpoint -Name "Get User Profile" -Method "GET" -Path "/auth/profile" -RequiresAuth $true

# Test 2: Execution History
$testResults += Test-Endpoint -Name "Get Execution History" -Method "GET" -Path "/executions/history" -RequiresAuth $true

# Test 3: Trigger Execution (without auth - should fail)
$testResults += Test-Endpoint -Name "Trigger Execution" -Method "POST" -Path "/executions/trigger" -RequiresAuth $true

# Test 4: Get Execution Status (with dummy ID)
$testResults += Test-Endpoint -Name "Get Execution Status" -Method "GET" -Path "/executions/test-id/status" -RequiresAuth $true

# Test 5: Get Execution Results (with dummy ID)
$testResults += Test-Endpoint -Name "Get Execution Results" -Method "GET" -Path "/executions/test-id" -RequiresAuth $true

# Test 6: Get Suite Results (with dummy ID)
$testResults += Test-Endpoint -Name "Get Suite Results" -Method "GET" -Path "/executions/suites/test-suite-id" -RequiresAuth $true

# Test 7: AI Usage
$testResults += Test-Endpoint -Name "Get AI Usage" -Method "GET" -Path "/ai-test-generation/usage" -RequiresAuth $true

# Test 8: Analyze File
$testResults += Test-Endpoint -Name "Analyze File" -Method "POST" -Path "/analysis/analyze" -RequiresAuth $false

# Test 9: Get User Stats (with dummy user ID)
$testResults += Test-Endpoint -Name "Get User Stats" -Method "GET" -Path "/analysis/stats/test-user" -RequiresAuth $true

# Test 10: Generate Insights
$testResults += Test-Endpoint -Name "Generate Insights" -Method "POST" -Path "/ai/insights" -RequiresAuth $true

# Test 11: Verify Lambda Functions are Active
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

$lambdaStatus = @()
foreach ($func in $functions) {
    $state = aws lambda get-function --function-name $func --query 'Configuration.State' --output text 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "$func : $state" -ForegroundColor Green
        $lambdaStatus += @{ Function = $func; State = $state }
    } else {
        Write-Host "$func : ERROR" -ForegroundColor Red
        $lambdaStatus += @{ Function = $func; State = "ERROR" }
    }
}

Write-Host ""
Write-Host "=== Test Summary ===" -ForegroundColor Cyan
Write-Host ""

$passed = ($testResults | Where-Object { $_.Result -eq "PASS" }).Count
$warned = ($testResults | Where-Object { $_.Result -eq "WARN" }).Count
$failed = ($testResults | Where-Object { $_.Result -eq "FAIL" }).Count

Write-Host "Endpoint Tests:" -ForegroundColor White
Write-Host "  Passed: $passed" -ForegroundColor Green
Write-Host "  Warnings: $warned" -ForegroundColor Yellow
Write-Host "  Failed: $failed" -ForegroundColor Red
Write-Host ""

$activeLambdas = ($lambdaStatus | Where-Object { $_.State -eq "Active" }).Count
Write-Host "Lambda Functions:" -ForegroundColor White
Write-Host "  Active: $activeLambdas / $($functions.Count)" -ForegroundColor Green
Write-Host ""

if ($failed -eq 0 -and $activeLambdas -eq $functions.Count) {
    Write-Host "✓ All systems operational!" -ForegroundColor Green
} else {
    Write-Host "⚠ Some issues detected. Review the output above." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. Check CloudWatch logs for any errors" -ForegroundColor White
Write-Host "2. Test with valid authentication tokens" -ForegroundColor White
Write-Host "3. Test the complete workflow (create project -> test suite -> execute)" -ForegroundColor White
Write-Host "4. Monitor performance and set up alarms" -ForegroundColor White
Write-Host ""
