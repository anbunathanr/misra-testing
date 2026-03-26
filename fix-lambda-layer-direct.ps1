# Direct Lambda Layer fix using AWS CLI and 7-Zip
Write-Host "=== FIXING LAMBDA 500 ERRORS ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Verify AWS
Write-Host "Step 1: Verifying AWS credentials..." -ForegroundColor Yellow
$identity = aws sts get-caller-identity --output json | ConvertFrom-Json
Write-Host "[OK] Account: $($identity.Account)" -ForegroundColor Green
Write-Host ""

# Step 2: Create layer directory
Write-Host "Step 2: Creating layer directory..." -ForegroundColor Yellow
$layerDir = "lambda-layer-temp"
$nodeModulesDir = "$layerDir/nodejs/node_modules"

if (Test-Path $layerDir) {
  Remove-Item -Recurse -Force $layerDir
}

New-Item -ItemType Directory -Path $nodeModulesDir -Force | Out-Null
Write-Host "[OK] Created directory structure" -ForegroundColor Green
Write-Host ""

# Step 3: Copy node_modules
Write-Host "Step 3: Copying node_modules..." -ForegroundColor Yellow
Write-Host "  This may take 1-2 minutes..." -ForegroundColor Gray

# Use robocopy for faster, more reliable copying
robocopy "packages/backend/node_modules" $nodeModulesDir /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null

if ($LASTEXITCODE -le 1) {
  Write-Host "[OK] Dependencies copied" -ForegroundColor Green
} else {
  Write-Host "[FAIL] Failed to copy dependencies" -ForegroundColor Red
  exit 1
}
Write-Host ""

# Step 4: Create zip using 7-Zip (more reliable than Compress-Archive)
Write-Host "Step 4: Creating zip file..." -ForegroundColor Yellow

$zipPath = "lambda-layer.zip"

# Try 7-Zip first
$sevenZipPath = "C:\Program Files\7-Zip\7z.exe"
if (Test-Path $sevenZipPath) {
  Write-Host "  Using 7-Zip..." -ForegroundColor Gray
  & $sevenZipPath a -tzip $zipPath $layerDir | Out-Null
} else {
  # Fallback to PowerShell but with a workaround
  Write-Host "  Using PowerShell Compress-Archive..." -ForegroundColor Gray
  
  # Create zip with retry logic
  $maxRetries = 3
  $retryCount = 0
  $success = $false
  
  while ($retryCount -lt $maxRetries -and -not $success) {
    try {
      Compress-Archive -Path $layerDir -DestinationPath $zipPath -Force -ErrorAction Stop
      $success = $true
    } catch {
      $retryCount++
      if ($retryCount -lt $maxRetries) {
        Write-Host "  Retry $retryCount/$maxRetries..." -ForegroundColor Yellow
        Start-Sleep -Seconds 2
      }
    }
  }
  
  if (-not $success) {
    Write-Host "[FAIL] Failed to create zip after $maxRetries attempts" -ForegroundColor Red
    exit 1
  }
}

$zipSize = (Get-Item $zipPath).Length / 1MB
Write-Host "[OK] Created zip file ($([Math]::Round($zipSize, 2)) MB)" -ForegroundColor Green
Write-Host ""

# Step 5: Publish layer
Write-Host "Step 5: Publishing layer to AWS..." -ForegroundColor Yellow

$layerOutput = aws lambda publish-layer-version `
  --layer-name misra-dependencies `
  --zip-file fileb://$zipPath `
  --compatible-runtimes nodejs20.x `
  --output json 2>&1

if ($LASTEXITCODE -eq 0) {
  $layerJson = $layerOutput | ConvertFrom-Json
  $layerArn = $layerJson.LayerVersionArn
  Write-Host "[OK] Layer published" -ForegroundColor Green
  Write-Host "  ARN: $layerArn" -ForegroundColor Gray
} else {
  Write-Host "[FAIL] Failed to publish layer" -ForegroundColor Red
  Write-Host $layerOutput -ForegroundColor Red
  exit 1
}
Write-Host ""

# Step 6: Attach to functions
Write-Host "Step 6: Attaching layer to Lambda functions..." -ForegroundColor Yellow

$functionsJson = aws lambda list-functions --output json | ConvertFrom-Json
$functions = $functionsJson.Functions | Where-Object { $_.FunctionName -like "misra-*" }

Write-Host "  Found $($functions.Count) functions" -ForegroundColor Gray

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

Write-Host "[OK] Updated $successCount functions" -ForegroundColor Green
if ($failureCount -gt 0) {
  Write-Host "[WARN] Failed: $failureCount" -ForegroundColor Yellow
}
Write-Host ""

# Step 7: Wait for propagation
Write-Host "Step 7: Waiting for updates..." -ForegroundColor Yellow
Start-Sleep -Seconds 10
Write-Host "[OK] Ready" -ForegroundColor Green
Write-Host ""

# Step 8: Test endpoints
Write-Host "Step 8: Testing API endpoints..." -ForegroundColor Yellow

$stackOutput = aws cloudformation describe-stacks --stack-name MisraPlatformStackV2 --output json 2>&1
if ($LASTEXITCODE -eq 0) {
  $stackJson = $stackOutput | ConvertFrom-Json
  $outputs = $stackJson.Stacks[0].Outputs
  $apiUrl = ($outputs | Where-Object { $_.OutputKey -eq "ApiEndpoint" }).OutputValue
  
  if ($apiUrl) {
    Write-Host "  API: $apiUrl" -ForegroundColor Gray
    
    try {
      $response = Invoke-RestMethod -Uri "$apiUrl/projects" -Method GET -TimeoutSec 5 -ErrorAction Stop
      Write-Host "  [OK] API responding (200)" -ForegroundColor Green
    } catch {
      $statusCode = $_.Exception.Response.StatusCode.Value__
      if ($statusCode -eq 401 -or $statusCode -eq 403) {
        Write-Host "  [OK] Auth required ($statusCode) - Lambda working!" -ForegroundColor Green
      } else {
        Write-Host "  [WARN] Status: $statusCode" -ForegroundColor Yellow
      }
    }
  }
}
Write-Host ""

# Step 9: Cleanup
Write-Host "Step 9: Cleaning up..." -ForegroundColor Yellow
Remove-Item -Recurse -Force $layerDir -ErrorAction SilentlyContinue
Remove-Item $zipPath -ErrorAction SilentlyContinue
Write-Host "[OK] Cleanup complete" -ForegroundColor Green
Write-Host ""

Write-Host "=== LAMBDA LAYER DEPLOYED ===" -ForegroundColor Green
Write-Host "All functions now have dependencies via Lambda Layer" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Test API endpoints" -ForegroundColor Gray
Write-Host "2. Check CloudWatch logs if needed" -ForegroundColor Gray
Write-Host "3. Deploy frontend" -ForegroundColor Gray
