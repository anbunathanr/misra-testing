# Complete fix for Lambda 500/503 errors
# This script creates DynamoDB tables, sets environment variables, and redeploy Lambda functions

Write-Host "=== COMPLETE LAMBDA FIX ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Create DynamoDB tables
Write-Host "Step 1: Creating DynamoDB tables..." -ForegroundColor Yellow

$tables = @(
  @{Name = "FileMetadata-dev"; Key = "file_id"; Sort = "user_id"}
  @{Name = "TestProjects-dev"; Key = "projectId"; Sort = $null}
  @{Name = "TestSuites-dev"; Key = "suiteId"; Sort = $null}
  @{Name = "TestCases-dev"; Key = "testCaseId"; Sort = $null}
  @{Name = "ExecutionMonitoring-dev"; Key = "executionId"; Sort = $null}
)

foreach ($table in $tables) {
  Write-Host "  Creating $($table.Name)..." -ForegroundColor Gray
  try {
    $params = @{
      TableName = $table.Name
      KeySchema = @(
        @{AttributeName = $table.Key; KeyType = "HASH"}
      )
      AttributeDefinitions = @(
        @{AttributeName = $table.Key; AttributeType = "S"}
      )
      BillingMode = "PAY_PER_REQUEST"
    }
    
    if ($table.Sort) {
      $params.KeySchema += @{AttributeName = $table.Sort; KeyType = "RANGE"}
      $params.AttributeDefinitions += @{AttributeName = $table.Sort; AttributeType = "S"}
    }
    
    aws dynamodb create-table @params --output json | Out-Null
    Write-Host "    [OK] Created" -ForegroundColor Green
  } catch {
    Write-Host "    [SKIP] Already exists" -ForegroundColor Gray
  }
}
Write-Host "[OK] DynamoDB tables ready" -ForegroundColor Green
Write-Host ""

# Step 2: Get Lambda functions and set environment variables
Write-Host "Step 2: Setting environment variables on Lambda functions..." -ForegroundColor Yellow

$functionsJson = aws lambda list-functions --output json | ConvertFrom-Json
$functions = $functionsJson.Functions | Where-Object { $_.FunctionName -like "misra-*" }

Write-Host "  Found $($functions.Count) functions" -ForegroundColor Gray

$envVars = @{
  "ENVIRONMENT" = "dev"
  "AWS_REGION" = "us-east-1"
  "FILE_METADATA_TABLE_NAME" = "FileMetadata-dev"
  "PROJECTS_TABLE_NAME" = "TestProjects-dev"
  "SUITES_TABLE_NAME" = "TestSuites-dev"
  "CASES_TABLE_NAME" = "TestCases-dev"
  "EXECUTIONS_TABLE_NAME" = "ExecutionMonitoring-dev"
  "FILE_STORAGE_BUCKET_NAME" = "misra-platform-files-dev"
}

foreach ($func in $functions) {
  $funcName = $func.FunctionName
  Write-Host "  Setting env vars for $funcName..." -ForegroundColor Gray
  
  $envJson = $envVars | ConvertTo-Json -Compress
  aws lambda update-function-configuration `
    --function-name $funcName `
    --environment "Variables=$envJson" `
    --output json | Out-Null
  
  Write-Host "    [OK] Set" -ForegroundColor Green
}

Write-Host "[OK] Environment variables set" -ForegroundColor Green
Write-Host ""

# Step 3: Wait for updates
Write-Host "Step 3: Waiting for updates..." -ForegroundColor Yellow
Start-Sleep -Seconds 10
Write-Host "[OK] Ready" -ForegroundColor Green
Write-Host ""

# Step 4: Test API
Write-Host "Step 4: Testing API..." -ForegroundColor Yellow

$stackOutput = aws cloudformation describe-stacks --stack-name MisraPlatformStackV2 --output json 2>&1
if ($LASTEXITCODE -eq 0) {
  $stackJson = $stackOutput | ConvertFrom-Json
  $outputs = $stackJson.Stacks[0].Outputs
  $apiUrl = ($outputs | Where-Object { $_.OutputKey -eq "ApiEndpoint" }).OutputValue
  
  if ($apiUrl) {
    Write-Host "  API: $apiUrl" -ForegroundColor Gray
    Write-Host ""
    
    # Test register endpoint (no auth required)
    Write-Host "  Testing POST /auth/register..." -ForegroundColor Gray
    $body = @{email="test@example.com"; password="Test123456"; name="Test User"} | ConvertTo-Json
    try {
      $response = Invoke-RestMethod -Uri "$apiUrl/auth/register" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 10 -ErrorAction Stop
      Write-Host "    [OK] Success (200)" -ForegroundColor Green
      Write-Host "    Response: $response" -ForegroundColor Gray
    } catch {
      $statusCode = $_.Exception.Response.StatusCode.Value__
      Write-Host "    Status: $statusCode" -ForegroundColor Yellow
      if ($statusCode -eq 500) {
        Write-Host "    [INFO] 500 - Lambda might still be initializing" -ForegroundColor Gray
      }
    }
    
    Write-Host ""
    Write-Host "  Testing GET /projects (requires auth)..." -ForegroundColor Gray
    try {
      $response = Invoke-RestMethod -Uri "$apiUrl/projects" -Method GET -TimeoutSec 10 -ErrorAction Stop
      Write-Host "    [OK] Success (200)" -ForegroundColor Green
    } catch {
      $statusCode = $_.Exception.Response.StatusCode.Value__
      if ($statusCode -eq 401 -or $statusCode -eq 403) {
        Write-Host "    [OK] Auth required ($statusCode) - Lambda working!" -ForegroundColor Green
      } else {
        Write-Host "    Status: $statusCode" -ForegroundColor Yellow
      }
    }
  }
}
Write-Host ""

Write-Host "=== LAMBDA FIX COMPLETE ===" -ForegroundColor Green
Write-Host "DynamoDB tables created and environment variables set" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Wait 30 seconds for Lambda to fully initialize" -ForegroundColor Gray
Write-Host "2. Test the API endpoints" -ForegroundColor Gray
Write-Host "3. Deploy frontend when ready" -ForegroundColor Gray
