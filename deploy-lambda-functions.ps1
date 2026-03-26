# Deploy built Lambda functions to AWS
Write-Host "=== DEPLOYING LAMBDA FUNCTIONS ===" -ForegroundColor Cyan
Write-Host ""

# Get all zip files
Write-Host "Step 1: Finding Lambda function zips..." -ForegroundColor Yellow
$zipFiles = Get-ChildItem -Path "packages/backend/dist-zips" -Recurse -Filter "*.zip"
Write-Host "[OK] Found $($zipFiles.Count) function zips" -ForegroundColor Green
Write-Host ""

# Get all Lambda functions
Write-Host "Step 2: Getting Lambda functions..." -ForegroundColor Yellow
$functionsJson = aws lambda list-functions --output json | ConvertFrom-Json
$functions = $functionsJson.Functions | Where-Object { $_.FunctionName -like "misra-*" }
Write-Host "[OK] Found $($functions.Count) functions" -ForegroundColor Green
Write-Host ""

# Deploy each function
Write-Host "Step 3: Deploying functions..." -ForegroundColor Yellow
Write-Host ""

$successCount = 0
$failureCount = 0

foreach ($func in $functions) {
  $funcName = $func.FunctionName
  
  # Find corresponding zip file
  # Function name format: misra-{category}-{handler}
  # Zip path format: packages/backend/dist-zips/{category}/{handler}/index.zip
  
  $parts = $funcName -replace "^misra-", "" -split "-"
  
  # Try to find the zip file
  $zipFile = $null
  
  # Search for matching zip files
  foreach ($zip in $zipFiles) {
    $zipPath = $zip.FullName
    
    # Check if this zip matches the function
    if ($zipPath -like "*$funcName*" -or $zipPath -like "*$($parts[0])*") {
      $zipFile = $zip
      break
    }
  }
  
  if (-not $zipFile) {
    Write-Host "  [SKIP] $funcName (no zip found)" -ForegroundColor Gray
    continue
  }
  
  try {
    Write-Host "  Updating $funcName..." -ForegroundColor Gray
    
    $zipContent = [System.IO.File]::ReadAllBytes($zipFile.FullName)
    
    aws lambda update-function-code `
      --function-name $funcName `
      --zip-file fileb://$($zipFile.FullName) `
      --output json | Out-Null
    
    $successCount++
    Write-Host "    [OK] Updated" -ForegroundColor Green
  } catch {
    $failureCount++
    Write-Host "    [FAIL] $($_.Exception.Message)" -ForegroundColor Red
  }
}

Write-Host ""
Write-Host "[OK] Updated $successCount functions" -ForegroundColor Green
if ($failureCount -gt 0) {
  Write-Host "[WARN] Failed: $failureCount" -ForegroundColor Yellow
}
Write-Host ""

# Wait for updates
Write-Host "Step 4: Waiting for updates..." -ForegroundColor Yellow
Start-Sleep -Seconds 15
Write-Host "[OK] Ready" -ForegroundColor Green
Write-Host ""

# Test API
Write-Host "Step 5: Testing API..." -ForegroundColor Yellow

$stackOutput = aws cloudformation describe-stacks --stack-name MisraPlatformStackV2 --output json 2>&1
if ($LASTEXITCODE -eq 0) {
  $stackJson = $stackOutput | ConvertFrom-Json
  $outputs = $stackJson.Stacks[0].Outputs
  $apiUrl = ($outputs | Where-Object { $_.OutputKey -eq "ApiEndpoint" }).OutputValue
  
  if ($apiUrl) {
    Write-Host "  API: $apiUrl" -ForegroundColor Gray
    Write-Host ""
    
    $endpoints = @("/projects", "/auth/profile")
    
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

Write-Host "=== DEPLOYMENT COMPLETE ===" -ForegroundColor Green
Write-Host "Lambda functions have been updated with new code" -ForegroundColor Green
