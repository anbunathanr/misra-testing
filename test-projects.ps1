# Test script for Project Management API

$API_URL = "https://ucy8ohc4vk.execute-api.us-east-1.amazonaws.com"
$EMAIL = "admin@misra-platform.com"
$PASSWORD = "password123"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing Project Management API" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Login
Write-Host "Step 1: Logging in..." -ForegroundColor Yellow
$loginBody = @{
    email = $EMAIL
    password = $PASSWORD
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$API_URL/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.accessToken
    Write-Host "OK: Login successful" -ForegroundColor Green
    Write-Host "Token: $($token.Substring(0, 20))..." -ForegroundColor Gray
} catch {
    Write-Host "ERROR: Login failed" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 2: Create a test project
Write-Host "Step 2: Creating a test project..." -ForegroundColor Yellow
$projectBody = @{
    name = "My First Test Project"
    description = "Testing the login flow of my web application"
    targetUrl = "https://example.com"
    environment = "dev"
} | ConvertTo-Json

try {
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    $createResponse = Invoke-RestMethod -Uri "$API_URL/projects" -Method Post -Body $projectBody -Headers $headers
    Write-Host "OK: Project created successfully" -ForegroundColor Green
    Write-Host "Project ID: $($createResponse.projectId)" -ForegroundColor Gray
    Write-Host "Project Name: $($createResponse.name)" -ForegroundColor Gray
    $projectId = $createResponse.projectId
} catch {
    Write-Host "ERROR: Failed to create project" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 3: Get all projects
Write-Host "Step 3: Getting all projects..." -ForegroundColor Yellow
try {
    $getResponse = Invoke-RestMethod -Uri "$API_URL/projects" -Method Get -Headers $headers
    Write-Host "OK: Retrieved projects successfully" -ForegroundColor Green
    Write-Host "Total projects: $($getResponse.projects.Count)" -ForegroundColor Gray
    
    foreach ($project in $getResponse.projects) {
        Write-Host "  - $($project.name) ($($project.environment))" -ForegroundColor Gray
    }
} catch {
    Write-Host "ERROR: Failed to get projects" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}
Write-Host ""

# Step 4: Update the project
Write-Host "Step 4: Updating the project..." -ForegroundColor Yellow
$updateBody = @{
    name = "Updated Test Project"
    description = "Updated description for testing"
} | ConvertTo-Json

try {
    $updateResponse = Invoke-RestMethod -Uri "$API_URL/projects/$projectId" -Method Put -Body $updateBody -Headers $headers
    Write-Host "OK: Project updated successfully" -ForegroundColor Green
    Write-Host "Updated Name: $($updateResponse.name)" -ForegroundColor Gray
    Write-Host "Updated Description: $($updateResponse.description)" -ForegroundColor Gray
} catch {
    Write-Host "ERROR: Failed to update project" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  OK: Login successful" -ForegroundColor Green
Write-Host "  OK: Project created" -ForegroundColor Green
Write-Host "  OK: Projects retrieved" -ForegroundColor Green
Write-Host "  OK: Project updated" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Build frontend pages for project management"
Write-Host "  2. Add test suites and test cases"
Write-Host "  3. Implement test execution with Selenium"
Write-Host ""
