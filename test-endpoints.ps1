$apiUrl = "https://hpw21wk64f.execute-api.us-east-1.amazonaws.com"
$token = "demo-token"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Write-Host "=== Testing All Endpoints ===" -ForegroundColor Green
Write-Host ""

# Test 1: GET /projects
Write-Host "1. Testing GET /projects..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$apiUrl/projects" -Headers $headers -Method GET -ErrorAction Stop
    Write-Host "✅ Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor White
} catch {
    Write-Host "❌ Error: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}
Write-Host ""

# Test 2: POST /projects
Write-Host "2. Testing POST /projects..." -ForegroundColor Cyan
$projectBody = @{
    name = "Test Project"
    targetUrl = "https://example.com"
    environment = "dev"
    description = "Test project for demo"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$apiUrl/projects" -Headers $headers -Method POST -Body $projectBody -ErrorAction Stop
    Write-Host "✅ Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor White
} catch {
    Write-Host "❌ Error: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}
Write-Host ""

# Test 3: GET /files
Write-Host "3. Testing GET /files..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$apiUrl/files" -Headers $headers -Method GET -ErrorAction Stop
    Write-Host "✅ Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor White
} catch {
    Write-Host "❌ Error: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}
Write-Host ""

# Test 4: GET /analysis/stats/{userId}
Write-Host "4. Testing GET /analysis/stats/test-user..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$apiUrl/analysis/stats/test-user" -Headers $headers -Method GET -ErrorAction Stop
    Write-Host "✅ Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor White
} catch {
    Write-Host "❌ Error: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}
Write-Host ""

# Test 5: GET /analysis/query
Write-Host "5. Testing GET /analysis/query..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$apiUrl/analysis/query?userId=test-user&limit=100" -Headers $headers -Method GET -ErrorAction Stop
    Write-Host "✅ Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor White
} catch {
    Write-Host "❌ Error: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}
Write-Host ""

# Test 6: POST /ai/insights
Write-Host "6. Testing POST /ai/insights..." -ForegroundColor Cyan
$insightsBody = @{
    data = "test data"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$apiUrl/ai/insights" -Headers $headers -Method POST -Body $insightsBody -ErrorAction Stop
    Write-Host "✅ Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor White
} catch {
    Write-Host "❌ Error: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}
Write-Host ""

Write-Host "=== All Tests Complete ===" -ForegroundColor Green
