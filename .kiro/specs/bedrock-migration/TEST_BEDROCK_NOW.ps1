# ============================================================================
# Bedrock Migration - Task 11.2 Testing Script
# ============================================================================
# This script tests Bedrock by:
# 1. Logging in to get an auth token
# 2. Making a test generation request to the API
# 3. Monitoring CloudWatch logs for Bedrock indicators
# ============================================================================

# Configuration
$appUrl = "https://aibts-platform.vercel.app"
$email = "test@example.com"  # Change to your test account email
$password = "TestPassword123!"  # Change to your test account password

Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "Bedrock Migration - Task 11.2 Testing" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# Step 1: Login to get auth token
# ============================================================================
Write-Host "Step 1: Logging in to get auth token..." -ForegroundColor Yellow
Write-Host "Email: $email" -ForegroundColor Gray

$loginUrl = "$appUrl/api/auth/login"
$loginBody = @{
    email = $email
    password = $password
} | ConvertTo-Json

try {
    $loginResponse = Invoke-WebRequest -Uri $loginUrl -Method POST -Body $loginBody -ContentType "application/json" -ErrorAction Stop
    $loginData = $loginResponse.Content | ConvertFrom-Json
    $token = $loginData.token
    
    Write-Host "✅ Login successful!" -ForegroundColor Green
    Write-Host "Token: $($token.Substring(0, 20))..." -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "❌ Login failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Make sure you have a test account created" -ForegroundColor Gray
    Write-Host "2. Update the email and password in this script" -ForegroundColor Gray
    Write-Host "3. Check that the app is deployed at $appUrl" -ForegroundColor Gray
    exit 1
}

# ============================================================================
# Step 2: Make test generation request
# ============================================================================
Write-Host "Step 2: Making test generation request..." -ForegroundColor Yellow

$generateUrl = "$appUrl/api/ai-test-generation/generate"

$requestBody = @{
    analysis = @{
        url = "https://example.com/login"
        elements = @(
            @{
                selector = "input[name='email']"
                type = "input"
                label = "Email"
            },
            @{
                selector = "input[name='password']"
                type = "input"
                label = "Password"
            },
            @{
                selector = "button[type='submit']"
                type = "button"
                label = "Login"
            }
        )
    }
    scenario = "User logs in with valid credentials"
    projectId = "bedrock-test-project"
    suiteId = "bedrock-test-suite"
} | ConvertTo-Json -Depth 10

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    Write-Host "Sending request to: $generateUrl" -ForegroundColor Gray
    $response = Invoke-WebRequest -Uri $generateUrl -Method POST -Body $requestBody -Headers $headers -ErrorAction Stop
    $result = $response.Content | ConvertFrom-Json
    
    Write-Host "✅ Test generation successful!" -ForegroundColor Green
    Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor Gray
    Write-Host "Test Name: $($result.testCase.name)" -ForegroundColor Gray
    Write-Host "Cost: \$$($result.cost)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "❌ Test generation failed!" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    # Try to parse error response
    try {
        $errorResponse = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorResponse)
        $errorBody = $reader.ReadToEnd()
        $errorData = $errorBody | ConvertFrom-Json
        Write-Host "Error Details: $($errorData.error)" -ForegroundColor Red
        if ($errorData.message) {
            Write-Host "Message: $($errorData.message)" -ForegroundColor Red
        }
    } catch {
        # Couldn't parse error response
    }
    
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "1. If 401 Unauthorized: Token is invalid, try logging in again" -ForegroundColor Gray
    Write-Host "2. If 400 Bad Request: Check request body format" -ForegroundColor Gray
    Write-Host "3. If 429 Too Many Requests: Rate limit hit, wait 10-15 minutes" -ForegroundColor Gray
    Write-Host "4. If 500 Internal Server Error: Check CloudWatch logs" -ForegroundColor Gray
    Write-Host ""
}

# ============================================================================
# Step 3: Monitor CloudWatch logs
# ============================================================================
Write-Host "Step 3: Monitoring CloudWatch logs..." -ForegroundColor Yellow
Write-Host "Looking for Bedrock indicators in logs..." -ForegroundColor Gray
Write-Host ""

# Get AWS credentials from environment or config
$awsRegion = "us-east-1"
$logGroupName = "/aws/lambda/aibts-ai-generate"

Write-Host "Log Group: $logGroupName" -ForegroundColor Gray
Write-Host "Region: $awsRegion" -ForegroundColor Gray
Write-Host ""

# Try to get recent logs
try {
    Write-Host "Fetching recent logs (last 5 minutes)..." -ForegroundColor Gray
    
    # Get logs from the last 5 minutes
    $startTime = [int64]((Get-Date).AddMinutes(-5).ToUniversalTime() | Get-Date -UFormat %s) * 1000
    $endTime = [int64]((Get-Date).ToUniversalTime() | Get-Date -UFormat %s) * 1000
    
    $logsResponse = aws logs filter-log-events `
        --log-group-name $logGroupName `
        --start-time $startTime `
        --end-time $endTime `
        --region $awsRegion `
        --query 'events[*].message' `
        --output text 2>$null
    
    if ($logsResponse) {
        Write-Host "✅ Found logs!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Recent log entries:" -ForegroundColor Gray
        Write-Host "---" -ForegroundColor Gray
        
        # Display logs
        $logsResponse -split "`n" | ForEach-Object {
            if ($_ -match "BEDROCK|Bedrock|bedrock") {
                Write-Host $_ -ForegroundColor Green
            } elseif ($_ -match "ERROR|Error|error") {
                Write-Host $_ -ForegroundColor Red
            } else {
                Write-Host $_
            }
        }
        
        Write-Host "---" -ForegroundColor Gray
        Write-Host ""
        
        # Check for Bedrock indicators
        if ($logsResponse -match "Creating AI engine for provider: BEDROCK") {
            Write-Host "✅ Bedrock engine created!" -ForegroundColor Green
        }
        if ($logsResponse -match "Invoking Bedrock model") {
            Write-Host "✅ Bedrock model invoked!" -ForegroundColor Green
        }
        if ($logsResponse -match "us.anthropic.claude-sonnet-4-6") {
            Write-Host "✅ Claude Sonnet 4.6 model used!" -ForegroundColor Green
        }
    } else {
        Write-Host "⚠️  No logs found yet" -ForegroundColor Yellow
        Write-Host "This is normal if the Lambda just executed" -ForegroundColor Gray
        Write-Host "CloudWatch logs may take 30-60 seconds to appear" -ForegroundColor Gray
    }
} catch {
    Write-Host "⚠️  Could not fetch CloudWatch logs" -ForegroundColor Yellow
    Write-Host "Make sure AWS CLI is configured with credentials" -ForegroundColor Gray
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "Testing Complete!" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Success Indicators:" -ForegroundColor Yellow
Write-Host "✅ Response status code: 200" -ForegroundColor Gray
Write-Host "✅ Response contains testCase object" -ForegroundColor Gray
Write-Host "✅ Response contains cost value" -ForegroundColor Gray
Write-Host "✅ CloudWatch logs show Bedrock being used" -ForegroundColor Gray
Write-Host "✅ Test code generated by Claude Sonnet 4.6" -ForegroundColor Gray
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. If all indicators passed: Task 11.2 is COMPLETE" -ForegroundColor Gray
Write-Host "2. Proceed to Task 12: Canary deployment (10% traffic)" -ForegroundColor Gray
Write-Host "3. Monitor metrics and error rates during rollout" -ForegroundColor Gray
Write-Host ""
