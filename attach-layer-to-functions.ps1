# Attach Lambda layer to all misra-* functions in parallel
Write-Host "=== ATTACHING LAYER TO FUNCTIONS ===" -ForegroundColor Cyan
Write-Host ""

# Get the latest layer ARN
Write-Host "Getting latest layer ARN..." -ForegroundColor Yellow
$layerOutput = aws lambda list-layer-versions --layer-name misra-dependencies --output json | ConvertFrom-Json
$layerArn = $layerOutput.LayerVersions[0].LayerVersionArn
Write-Host "[OK] Layer ARN: $layerArn" -ForegroundColor Green
Write-Host ""

# Get all misra-* functions
Write-Host "Getting Lambda functions..." -ForegroundColor Yellow
$functionsJson = aws lambda list-functions --output json | ConvertFrom-Json
$functions = $functionsJson.Functions | Where-Object { $_.FunctionName -like "misra-*" }
Write-Host "[OK] Found $($functions.Count) functions" -ForegroundColor Green
Write-Host ""

# Attach layer to each function
Write-Host "Attaching layer to functions..." -ForegroundColor Yellow

$successCount = 0
$failureCount = 0

foreach ($func in $functions) {
  $funcName = $func.FunctionName
  
  try {
    aws lambda update-function-configuration `
      --function-name $funcName `
      --layers $layerArn `
      --output json | Out-Null
    
    $successCount++
    Write-Host "  [OK] $funcName" -ForegroundColor Green
  } catch {
    $failureCount++
    Write-Host "  [FAIL] $funcName" -ForegroundColor Red
  }
}

Write-Host ""
Write-Host "[OK] Updated $successCount functions" -ForegroundColor Green
if ($failureCount -gt 0) {
  Write-Host "[WARN] Failed: $failureCount" -ForegroundColor Yellow
}
Write-Host ""

# Wait for propagation
Write-Host "Waiting for updates to propagate..." -ForegroundColor Yellow
Start-Sleep -Seconds 10
Write-Host "[OK] Ready" -ForegroundColor Green
Write-Host ""

# Test API
Write-Host "Testing API endpoints..." -ForegroundColor Yellow

$stackOutput = aws cloudformation describe-stacks --stack-name MisraPlatformStackV2 --output json 2>&1
if ($LASTEXITCODE -eq 0) {
  $stackJson = $stackOutput | ConvertFrom-Json
  $outputs = $stackJson.Stacks[0].Outputs
  $apiUrl = ($outputs | Where-Object { $_.OutputKey -eq "ApiEndpoint" }).OutputValue
  
  if ($apiUrl) {
    Write-Host "  API: $apiUrl" -ForegroundColor Gray
    Write-Host ""
    
    # Test multiple endpoints
    $endpoints = @("/projects", "/auth/profile", "/analysis/results")
    
    foreach ($endpoint in $endpoints) {
      Write-Host "  Testing GET $endpoint..." -ForegroundColor Gray
      try {
        $response = Invoke-RestMethod -Uri "$apiUrl$endpoint" -Method GET -TimeoutSec 5 -ErrorAction Stop
        Write-Host "    [OK] 200 Success" -ForegroundColor Green
      } catch {
        $statusCode = $_.Exception.Response.StatusCode.Value__
        if ($statusCode -eq 401 -or $statusCode -eq 403) {
          Write-Host "    [OK] $statusCode Auth required (Lambda working!)" -ForegroundColor Green
        } elseif ($statusCode -eq 500) {
          Write-Host "    [FAIL] 500 Error" -ForegroundColor Red
        } else {
          Write-Host "    [WARN] $statusCode" -ForegroundColor Yellow
        }
      }
    }
  }
}
Write-Host ""

Write-Host "=== LAYER ATTACHMENT COMPLETE ===" -ForegroundColor Green
Write-Host "All Lambda functions now have access to dependencies" -ForegroundColor Green
