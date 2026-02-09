# Test File Upload Script
$API_URL = "https://ucy8ohc4vk.execute-api.us-east-1.amazonaws.com"

Write-Host "=== MISRA Platform File Upload Test ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Login
Write-Host "Step 1: Logging in..." -ForegroundColor Yellow
$loginBody = @{
    email = "admin@misra-platform.com"
    password = "password123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$API_URL/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    Write-Host "Login successful" -ForegroundColor Green
    Write-Host "  User: $($loginResponse.user.email)" -ForegroundColor Gray
    Write-Host "  Role: $($loginResponse.user.role)" -ForegroundColor Gray
    $token = $loginResponse.accessToken
} catch {
    Write-Host "Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 2: Request upload URL
Write-Host "Step 2: Requesting upload URL..." -ForegroundColor Yellow
$uploadRequestBody = @{
    fileName = "test.c"
    fileSize = 1024
    contentType = "text/plain"
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    $uploadResponse = Invoke-RestMethod -Uri "$API_URL/files/upload" -Method POST -Headers $headers -Body $uploadRequestBody
    Write-Host "Upload URL generated successfully" -ForegroundColor Green
    Write-Host "  File ID: $($uploadResponse.fileId)" -ForegroundColor Gray
    Write-Host "  Expires in: $($uploadResponse.expiresIn) seconds" -ForegroundColor Gray
    $uploadUrl = $uploadResponse.uploadUrl
    Write-Host "  Upload URL length: $($uploadUrl.Length) chars" -ForegroundColor Gray
} catch {
    Write-Host "Failed to get upload URL" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    
    try {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "  Details: $errorBody" -ForegroundColor Red
    } catch {}
    
    exit 1
}

Write-Host ""

# Step 3: Upload file to S3
Write-Host "Step 3: Uploading file to S3..." -ForegroundColor Yellow

$testContent = "#include <stdio.h>`n`nint main() {`n    return 0;`n}"
$testFilePath = "test-upload.c"
$testContent | Out-File -FilePath $testFilePath -Encoding ASCII -NoNewline

try {
    $fileBytes = [System.IO.File]::ReadAllBytes($testFilePath)
    $uploadHeaders = @{
        "Content-Type" = "text/plain"
    }
    
    Invoke-RestMethod -Uri $uploadUrl -Method PUT -Headers $uploadHeaders -Body $fileBytes
    Write-Host "File uploaded to S3 successfully" -ForegroundColor Green
} catch {
    Write-Host "Failed to upload file to S3" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    Remove-Item $testFilePath -ErrorAction SilentlyContinue
    exit 1
}

Remove-Item $testFilePath -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "=== All tests passed ===" -ForegroundColor Green
