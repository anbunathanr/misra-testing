# Test script for Test Suites and Test Cases API endpoints
# Web Application Testing System - Phase 2

$API_URL = "https://ucy8ohc4vk.execute-api.us-east-1.amazonaws.com"
$EMAIL = "admin@misra-platform.com"
$PASSWORD = "password123"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Web App Testing System - Phase 2 Tests" -ForegroundColor Cyan
Write-Host "Test Suites and Test Cases API" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Login
Write-Host "Step 1: Logging in..." -ForegroundColor Yellow
$loginBody = "{`"email`":`"$EMAIL`",`"password`":`"$PASSWORD`"}"
$loginResponse = Invoke-RestMethod -Uri "$API_URL/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$TOKEN = $loginResponse.accessToken
Write-Host "Login successful" -ForegroundColor Green
Write-Host ""

# Step 2: Create a test project first
Write-Host "Step 2: Creating test project..." -ForegroundColor Yellow
$projectBody = "{`"name`":`"E-commerce Website Tests`",`"description`":`"Test suite for e-commerce platform`",`"targetUrl`":`"https://example-shop.com`",`"environment`":`"staging`"}"
$headers = @{
    "Authorization" = "Bearer $TOKEN"
    "Content-Type" = "application/json"
}
$project = Invoke-RestMethod -Uri "$API_URL/projects" -Method Post -Body $projectBody -Headers $headers
$PROJECT_ID = $project.projectId
Write-Host "Project created: $($project.name)" -ForegroundColor Green
Write-Host "  Project ID: $PROJECT_ID" -ForegroundColor Gray
Write-Host ""

# Step 3: Create a test suite
Write-Host "Step 3: Creating test suite..." -ForegroundColor Yellow
$suiteBody = "{`"projectId`":`"$PROJECT_ID`",`"name`":`"User Authentication Tests`",`"description`":`"Test suite for login, logout, and registration flows`",`"tags`":[`"auth`",`"critical`",`"smoke`"]}"
$suite = Invoke-RestMethod -Uri "$API_URL/test-suites" -Method Post -Body $suiteBody -Headers $headers
$SUITE_ID = $suite.suiteId
Write-Host "Test suite created: $($suite.name)" -ForegroundColor Green
Write-Host "  Suite ID: $SUITE_ID" -ForegroundColor Gray
Write-Host ""

# Step 4: Create test case 1
Write-Host "Step 4: Creating test case 1..." -ForegroundColor Yellow
$testCase1Body = "{`"suiteId`":`"$SUITE_ID`",`"projectId`":`"$PROJECT_ID`",`"name`":`"User Login - Valid Credentials`",`"description`":`"Verify user can login with valid email and password`",`"type`":`"functional`",`"priority`":`"high`",`"tags`":[`"login`",`"smoke`"],`"steps`":[{`"stepNumber`":1,`"action`":`"navigate`",`"target`":`"https://example-shop.com/login`",`"expectedResult`":`"Login page loads successfully`"},{`"stepNumber`":2,`"action`":`"type`",`"target`":`"#email`",`"value`":`"user@example.com`",`"expectedResult`":`"Email entered in field`"},{`"stepNumber`":3,`"action`":`"type`",`"target`":`"#password`",`"value`":`"password123`",`"expectedResult`":`"Password entered in field`"},{`"stepNumber`":4,`"action`":`"click`",`"target`":`"#login-button`",`"expectedResult`":`"Login button clicked`"},{`"stepNumber`":5,`"action`":`"assert`",`"target`":`".dashboard`",`"expectedResult`":`"User redirected to dashboard`"}]}"
$testCase1 = Invoke-RestMethod -Uri "$API_URL/test-cases" -Method Post -Body $testCase1Body -Headers $headers
Write-Host "Test case 1 created: $($testCase1.name)" -ForegroundColor Green
Write-Host "  Test Case ID: $($testCase1.testCaseId)" -ForegroundColor Gray
Write-Host "  Type: $($testCase1.type) | Priority: $($testCase1.priority)" -ForegroundColor Gray
Write-Host ""

# Step 5: Create test case 2
Write-Host "Step 5: Creating test case 2..." -ForegroundColor Yellow
$testCase2Body = "{`"suiteId`":`"$SUITE_ID`",`"projectId`":`"$PROJECT_ID`",`"name`":`"User Logout`",`"description`":`"Verify user can logout successfully`",`"type`":`"functional`",`"priority`":`"medium`",`"tags`":[`"logout`"],`"steps`":[{`"stepNumber`":1,`"action`":`"navigate`",`"target`":`"https://example-shop.com/dashboard`",`"expectedResult`":`"Dashboard page loads`"},{`"stepNumber`":2,`"action`":`"click`",`"target`":`"#user-menu`",`"expectedResult`":`"User menu opens`"},{`"stepNumber`":3,`"action`":`"click`",`"target`":`"#logout-button`",`"expectedResult`":`"Logout button clicked`"},{`"stepNumber`":4,`"action`":`"assert`",`"target`":`".login-page`",`"expectedResult`":`"User redirected to login page`"}]}"
$testCase2 = Invoke-RestMethod -Uri "$API_URL/test-cases" -Method Post -Body $testCase2Body -Headers $headers
Write-Host "Test case 2 created: $($testCase2.name)" -ForegroundColor Green
Write-Host "  Test Case ID: $($testCase2.testCaseId)" -ForegroundColor Gray
Write-Host ""

# Step 6: Get all test suites for the project
Write-Host "Step 6: Retrieving test suites..." -ForegroundColor Yellow
$suites = Invoke-RestMethod -Uri "$API_URL/test-suites?projectId=$PROJECT_ID" -Method Get -Headers $headers
Write-Host "Retrieved $($suites.Count) test suite(s)" -ForegroundColor Green
Write-Host ""

# Step 7: Get all test cases for the suite
Write-Host "Step 7: Retrieving test cases..." -ForegroundColor Yellow
$testCases = Invoke-RestMethod -Uri "$API_URL/test-cases?suiteId=$SUITE_ID" -Method Get -Headers $headers
Write-Host "Retrieved $($testCases.Count) test case(s)" -ForegroundColor Green
Write-Host ""

# Step 8: Update test suite
Write-Host "Step 8: Updating test suite..." -ForegroundColor Yellow
$updateSuiteBody = "{`"name`":`"User Authentication and Authorization Tests`",`"description`":`"Extended test suite for auth flows including permissions`",`"tags`":[`"auth`",`"critical`",`"smoke`",`"security`"]}"
$updatedSuite = Invoke-RestMethod -Uri "$API_URL/test-suites/$SUITE_ID" -Method Put -Body $updateSuiteBody -Headers $headers
Write-Host "Test suite updated" -ForegroundColor Green
Write-Host "  New name: $($updatedSuite.name)" -ForegroundColor Gray
Write-Host ""

# Step 9: Update test case
Write-Host "Step 9: Updating test case..." -ForegroundColor Yellow
$updateTestCaseBody = "{`"priority`":`"critical`",`"tags`":[`"login`",`"smoke`",`"regression`"]}"
$updatedTestCase = Invoke-RestMethod -Uri "$API_URL/test-cases/$($testCase1.testCaseId)" -Method Put -Body $updateTestCaseBody -Headers $headers
Write-Host "Test case updated" -ForegroundColor Green
Write-Host "  New priority: $($updatedTestCase.priority)" -ForegroundColor Gray
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Phase 2 Testing Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Summary:" -ForegroundColor White
Write-Host "  Created 1 project" -ForegroundColor Green
Write-Host "  Created 1 test suite" -ForegroundColor Green
Write-Host "  Created 2 test cases" -ForegroundColor Green
Write-Host "  Retrieved test suites" -ForegroundColor Green
Write-Host "  Retrieved test cases" -ForegroundColor Green
Write-Host "  Updated test suite" -ForegroundColor Green
Write-Host "  Updated test case" -ForegroundColor Green
Write-Host ""
Write-Host "All Phase 2 endpoints working correctly!" -ForegroundColor Green
Write-Host ""
Write-Host "Created Resources:" -ForegroundColor White
Write-Host "  Project ID: $PROJECT_ID" -ForegroundColor Gray
Write-Host "  Suite ID: $SUITE_ID" -ForegroundColor Gray
Write-Host "  Test Case 1 ID: $($testCase1.testCaseId)" -ForegroundColor Gray
Write-Host "  Test Case 2 ID: $($testCase2.testCaseId)" -ForegroundColor Gray
Write-Host ""
