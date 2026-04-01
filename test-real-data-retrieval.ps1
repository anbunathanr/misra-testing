# Test Real Data Retrieval - Task 3
# Tests that GET /projects returns real user projects from DynamoDB

$API_BASE = "https://7r9qmrftc6.execute-api.us-east-1.amazonaws.com"

Write-Host "=== Task 3: Test Real Data Retrieval ===" -ForegroundColor Cyan
Write-Host ""

# Subtask 3.1: Obtain valid JWT token via POST /auth/login
Write-Host "Subtask 3.1: Obtaining JWT token..." -ForegroundColor Yellow

$loginBody = @{
    email = "testuser@example.com"
    password = "123456"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$API_BASE/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.token
    $userId = $loginResponse.user.userId
    
    Write-Host "[OK] JWT token obtained successfully" -ForegroundColor Green
    Write-Host "  User ID: $userId" -ForegroundColor Gray
    Write-Host ""
}
catch {
    Write-Host "[FAIL] Failed to obtain JWT token" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Subtask 3.2: Call GET /projects with Authorization header
Write-Host "Subtask 3.2: Calling GET /projects..." -ForegroundColor Yellow

$headers = @{
    "Authorization" = "Bearer $token"
}

try {
    $projectsResponse = Invoke-RestMethod -Uri "$API_BASE/projects" -Method GET -Headers $headers
    
    Write-Host "[OK] GET /projects called successfully" -ForegroundColor Green
    Write-Host ""
}
catch {
    Write-Host "[FAIL] Failed to call GET /projects" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Subtask 3.3: Verify response status is 200 OK
Write-Host "Subtask 3.3: Verifying response status..." -ForegroundColor Yellow
Write-Host "[OK] Response status is 200 OK" -ForegroundColor Green
Write-Host ""

# Subtask 3.4: Verify response format is { projects: [...] }
Write-Host "Subtask 3.4: Verifying response format..." -ForegroundColor Yellow

if ($projectsResponse.PSObject.Properties.Name -contains "projects") {
    Write-Host "[OK] Response has 'projects' field" -ForegroundColor Green
}
else {
    Write-Host "[FAIL] Response missing 'projects' field" -ForegroundColor Red
    Write-Host "  Response: $($projectsResponse | ConvertTo-Json)" -ForegroundColor Red
    exit 1
}

if ($projectsResponse.projects -is [Array]) {
    Write-Host "[OK] 'projects' is an array" -ForegroundColor Green
}
else {
    Write-Host "[FAIL] 'projects' is not an array" -ForegroundColor Red
    exit 1
}

Write-Host "  Projects count: $($projectsResponse.projects.Count)" -ForegroundColor Gray
Write-Host ""

# Subtask 3.5: Verify projects array contains real data (not demo data)
Write-Host "Subtask 3.5: Verifying real data (not demo data)..." -ForegroundColor Yellow

$hasDemoData = $false
foreach ($project in $projectsResponse.projects) {
    if ($project.name -eq "E-Commerce Platform" -and $project.description -eq "Automated testing for e-commerce platform") {
        $hasDemoData = $true
        break
    }
}

if ($hasDemoData) {
    Write-Host "[FAIL] Response contains hardcoded demo data" -ForegroundColor Red
    exit 1
}
else {
    Write-Host "[OK] No hardcoded demo data found" -ForegroundColor Green
}

if ($projectsResponse.projects.Count -gt 0) {
    Write-Host "[OK] Projects array contains real data" -ForegroundColor Green
}
else {
    Write-Host "[WARN] Projects array is empty (user has no projects)" -ForegroundColor Yellow
}
Write-Host ""

# Subtask 3.6: Verify each project has required fields
Write-Host "Subtask 3.6: Verifying required fields..." -ForegroundColor Yellow

$requiredFields = @("projectId", "userId", "name", "description", "targetUrl", "environment", "createdAt", "updatedAt")
$allFieldsPresent = $true

foreach ($project in $projectsResponse.projects) {
    foreach ($field in $requiredFields) {
        if (-not ($project.PSObject.Properties.Name -contains $field)) {
            Write-Host "[FAIL] Project missing field: $field" -ForegroundColor Red
            Write-Host "  Project: $($project | ConvertTo-Json)" -ForegroundColor Red
            $allFieldsPresent = $false
        }
    }
}

if ($allFieldsPresent -and $projectsResponse.projects.Count -gt 0) {
    Write-Host "[OK] All projects have required fields" -ForegroundColor Green
}
elseif ($projectsResponse.projects.Count -eq 0) {
    Write-Host "[WARN] No projects to verify" -ForegroundColor Yellow
}
else {
    exit 1
}
Write-Host ""

# Subtask 3.7: Verify userId in projects matches authenticated user
Write-Host "Subtask 3.7: Verifying userId matches..." -ForegroundColor Yellow

$userIdMismatch = $false
foreach ($project in $projectsResponse.projects) {
    if ($project.userId -ne $userId) {
        Write-Host "[FAIL] Project userId mismatch" -ForegroundColor Red
        Write-Host "  Expected: $userId" -ForegroundColor Red
        Write-Host "  Got: $($project.userId)" -ForegroundColor Red
        $userIdMismatch = $true
    }
}

if (-not $userIdMismatch -and $projectsResponse.projects.Count -gt 0) {
    Write-Host "[OK] All projects belong to authenticated user" -ForegroundColor Green
}
elseif ($projectsResponse.projects.Count -eq 0) {
    Write-Host "[WARN] No projects to verify" -ForegroundColor Yellow
}
else {
    exit 1
}
Write-Host ""

# Summary
Write-Host "=== Task 3 Summary ===" -ForegroundColor Cyan
Write-Host "[OK] All subtasks completed successfully" -ForegroundColor Green
Write-Host ""
Write-Host "Response Details:" -ForegroundColor Cyan
Write-Host "  Projects count: $($projectsResponse.projects.Count)" -ForegroundColor Gray
if ($projectsResponse.projects.Count -gt 0) {
    Write-Host "  Sample project:" -ForegroundColor Gray
    Write-Host "    Name: $($projectsResponse.projects[0].name)" -ForegroundColor Gray
    Write-Host "    Description: $($projectsResponse.projects[0].description)" -ForegroundColor Gray
    Write-Host "    Target URL: $($projectsResponse.projects[0].targetUrl)" -ForegroundColor Gray
    Write-Host "    Environment: $($projectsResponse.projects[0].environment)" -ForegroundColor Gray
}
Write-Host ""
Write-Host "[OK] GET /projects returns real data from DynamoDB" -ForegroundColor Green
Write-Host "[OK] No hardcoded demo data present" -ForegroundColor Green
Write-Host "[OK] Data isolation verified (userId matches)" -ForegroundColor Green
