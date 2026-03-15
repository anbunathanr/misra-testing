# Phase 5 Testing Script
# This script tests the complete AIBTS system end-to-end

param(
    [string]$ApiUrl = "https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com",
    [string]$Email = "test@example.com",
    [string]$Password = "TestPass123"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "AIBTS Phase 5 Testing" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$testResults = @()

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET",
        [hashtable]$Headers = @{},
        [string]$Body = $null
    )
    
    Write-Host "Testing: $Name..." -ForegroundColor Yellow
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            Headers = $Headers
            TimeoutSec = 30
        }
        
        if ($Body) {
            $params.Body = $Body
            $params.ContentType = "application/json"
        }
        
        $response = Invoke-WebRequest @params -UseBasicParsing
        
        if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
            Write-Host "✅ $Name - PASSED (Status: $($response.StatusCode))" -ForegroundColor Green
            $script:testResults += @{ Name = $Name; Status = "PASSED"; StatusCode = $response.StatusCode }
            return $response
        } else {
            Write-Host "❌ $Name - FAILED (Status: $($response.StatusCode))" -ForegroundColor Red
            $script:testResults += @{ Name = $Name; Status = "FAILED"; StatusCode = $response.StatusCode }
            return $null
        }
    } catch {
        Write-Host "❌ $Name - FAILED (Error: $($_.Exception.Message))" -ForegroundColor Red
        $script:testResults += @{ Name = $Name; Status = "FAILED"; Error = $_.Exception.Message }
        return $null
    }
}

# Test 1: Health Check
Write-Host ""
Write-Host "Test 1: Health Check" -ForegroundColor Cyan
Write-Host "-------------------" -ForegroundColor Cyan
Test-Endpoint -Name "Health Check" -Url "$ApiUrl/health"

# Test 2: CORS Configuration
Write-Host ""
Write-Host "Test 2: CORS Configuration" -ForegroundColor Cyan
Write-Host "-------------------------" -ForegroundColor Cyan
try {
    $headers = @{
        "Origin" = "https://aibts-platform.vercel.app"
        "Access-Control-Request-Method" = "POST"
        "Access-Control-Request-Headers" = "Content-Type,Authorization"
    }
    $response = Invoke-WebRequest -Uri "$ApiUrl/projects" -Method OPTIONS -Headers $headers -UseBasicParsing
    
    if ($response.Headers["Access-Control-Allow-Origin"]) {
        Write-Host "✅ CORS - PASSED" -ForegroundColor Green
        $testResults += @{ Name = "CORS Configuration"; Status = "PASSED" }
    } else {
        Write-Host "❌ CORS - FAILED (No CORS headers)" -ForegroundColor Red
        $testResults += @{ Name = "CORS Configuration"; Status = "FAILED" }
    }
} catch {
    Write-Host "❌ CORS - FAILED (Error: $($_.Exception.Message))" -ForegroundColor Red
    $testResults += @{ Name = "CORS Configuration"; Status = "FAILED"; Error = $_.Exception.Message }
}

# Test 3: Authentication Required
Write-Host ""
Write-Host "Test 3: Authentication Required" -ForegroundColor Cyan
Write-Host "-------------------------------" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$ApiUrl/projects" -Method GET -UseBasicParsing -ErrorAction Stop
    Write-Host "❌ Authentication - FAILED (Endpoint not protected)" -ForegroundColor Red
    $testResults += @{ Name = "Authentication Required"; Status = "FAILED"; Reason = "Endpoint not protected" }
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✅ Authentication - PASSED (401 Unauthorized)" -ForegroundColor Green
        $testResults += @{ Name = "Authentication Required"; Status = "PASSED" }
    } else {
        Write-Host "❌ Authentication - FAILED (Wrong status code: $($_.Exception.Response.StatusCode))" -ForegroundColor Red
        $testResults += @{ Name = "Authentication Required"; Status = "FAILED"; StatusCode = $_.Exception.Response.StatusCode }
    }
}

# Test 4: Frontend Accessibility
Write-Host ""
Write-Host "Test 4: Frontend Accessibility" -ForegroundColor Cyan
Write-Host "------------------------------" -ForegroundColor Cyan
Test-Endpoint -Name "Frontend Home" -Url "https://aibts-platform.vercel.app"
Test-Endpoint -Name "Frontend Login" -Url "https://aibts-platform.vercel.app/login"
Test-Endpoint -Name "Frontend Register" -Url "https://aibts-platform.vercel.app/register"

# Test 5: API Response Times
Write-Host ""
Write-Host "Test 5: API Response Times" -ForegroundColor Cyan
Write-Host "-------------------------" -ForegroundColor Cyan
$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
try {
    Invoke-WebRequest -Uri "$ApiUrl/health" -Method GET -UseBasicParsing | Out-Null
    $stopwatch.Stop()
    $responseTime = $stopwatch.ElapsedMilliseconds
    
    if ($responseTime -lt 2000) {
        Write-Host "✅ Response Time - PASSED ($responseTime ms)" -ForegroundColor Green
        $testResults += @{ Name = "API Response Time"; Status = "PASSED"; Time = "$responseTime ms" }
    } else {
        Write-Host "⚠️  Response Time - SLOW ($responseTime ms)" -ForegroundColor Yellow
        $testResults += @{ Name = "API Response Time"; Status = "SLOW"; Time = "$responseTime ms" }
    }
} catch {
    Write-Host "❌ Response Time - FAILED" -ForegroundColor Red
    $testResults += @{ Name = "API Response Time"; Status = "FAILED" }
}

# Test 6: Error Handling
Write-Host ""
Write-Host "Test 6: Error Handling" -ForegroundColor Cyan
Write-Host "---------------------" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$ApiUrl/nonexistent" -Method GET -UseBasicParsing -ErrorAction Stop
    Write-Host "❌ Error Handling - FAILED (Should return 404)" -ForegroundColor Red
    $testResults += @{ Name = "Error Handling"; Status = "FAILED" }
} catch {
    if ($_.Exception.Response.StatusCode -eq 404 -or $_.Exception.Response.StatusCode -eq 403) {
        Write-Host "✅ Error Handling - PASSED (Proper error response)" -ForegroundColor Green
        $testResults += @{ Name = "Error Handling"; Status = "PASSED" }
    } else {
        Write-Host "❌ Error Handling - FAILED (Wrong status code)" -ForegroundColor Red
        $testResults += @{ Name = "Error Handling"; Status = "FAILED" }
    }
}

# Test Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$passed = ($testResults | Where-Object { $_.Status -eq "PASSED" }).Count
$failed = ($testResults | Where-Object { $_.Status -eq "FAILED" }).Count
$total = $testResults.Count

Write-Host "Total Tests: $total" -ForegroundColor White
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor Red
Write-Host ""

if ($failed -eq 0) {
    Write-Host "🎉 All tests passed!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Some tests failed. Review the results above." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Detailed Results:" -ForegroundColor Yellow
$testResults | ForEach-Object {
    $status = if ($_.Status -eq "PASSED") { "✅" } else { "❌" }
    Write-Host "$status $($_.Name) - $($_.Status)" -ForegroundColor White
}

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Register a user at https://aibts-platform.vercel.app/register" -ForegroundColor White
Write-Host "2. Login with your credentials" -ForegroundColor White
Write-Host "3. Create a project and test AI generation" -ForegroundColor White
Write-Host "4. Monitor logs: aws logs tail /aws/lambda/aibts-ai-generate --follow" -ForegroundColor White
Write-Host ""
