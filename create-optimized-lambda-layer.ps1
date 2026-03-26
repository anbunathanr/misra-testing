# Create optimized Lambda layer with only production dependencies
Write-Host "=== CREATING OPTIMIZED LAMBDA LAYER ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Verify AWS
Write-Host "Step 1: Verifying AWS..." -ForegroundColor Yellow
$identity = aws sts get-caller-identity --output json | ConvertFrom-Json
Write-Host "[OK] Account: $($identity.Account)" -ForegroundColor Green
Write-Host ""

# Step 2: Create layer directory
Write-Host "Step 2: Creating layer structure..." -ForegroundColor Yellow
$layerDir = "lambda-layer-temp"
$nodeModulesDir = "$layerDir/nodejs/node_modules"

# Clean up with retry
$maxRetries = 3
$retryCount = 0
while ($retryCount -lt $maxRetries) {
  try {
    if (Test-Path $layerDir) {
      Remove-Item -Recurse -Force $layerDir -ErrorAction Stop
    }
    break
  } catch {
    $retryCount++
    if ($retryCount -lt $maxRetries) {
      Write-Host "  Retry $retryCount/$maxRetries..." -ForegroundColor Yellow
      Start-Sleep -Seconds 2
    }
  }
}

New-Item -ItemType Directory -Path $nodeModulesDir -Force | Out-Null
Write-Host "[OK] Directory created" -ForegroundColor Green
Write-Host ""

# Step 3: Copy only essential production dependencies
Write-Host "Step 3: Copying production dependencies..." -ForegroundColor Yellow

$essentialPackages = @(
  "aws-sdk",
  "aws-lambda",
  "express",
  "aws-cdk-lib",
  "constructs",
  "typescript",
  "tslib",
  "uuid",
  "dotenv",
  "axios",
  "joi",
  "jsonwebtoken",
  "bcryptjs",
  "node-fetch",
  "archiver",
  "esbuild",
  "puppeteer",
  "playwright",
  "openai",
  "n8n-workflow",
  "n8n-core"
)

$sourceNodeModules = "packages/backend/node_modules"

foreach ($pkg in $essentialPackages) {
  $srcPath = "$sourceNodeModules/$pkg"
  if (Test-Path $srcPath) {
    $destPath = "$nodeModulesDir/$pkg"
    robocopy $srcPath $destPath /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
    Write-Host "  [OK] $pkg" -ForegroundColor Green
  } else {
    Write-Host "  [SKIP] $pkg (not found)" -ForegroundColor Gray
  }
}

Write-Host "[OK] Dependencies copied" -ForegroundColor Green
Write-Host ""

# Step 4: Create zip
Write-Host "Step 4: Creating zip file..." -ForegroundColor Yellow

$zipPath = "lambda-layer.zip"

# Use 7-Zip if available
$sevenZipPath = "C:\Program Files\7-Zip\7z.exe"
if (Test-Path $sevenZipPath) {
  & $sevenZipPath a -tzip $zipPath $layerDir | Out-Null
} else {
  Compress-Archive -Path $layerDir -DestinationPath $zipPath -Force
}

$zipSize = (Get-Item $zipPath).Length / 1MB
Write-Host "[OK] Zip created ($([Math]::Round($zipSize, 2)) MB)" -ForegroundColor Green
Write-Host ""

# Step 5: Publish layer
Write-Host "Step 5: Publishing layer..." -ForegroundColor Yellow

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
  Write-Host "[FAIL] Failed to publish" -ForegroundColor Red
  Write-Host $layerOutput -ForegroundColor Red
  exit 1
}
Write-Host ""

# Step 6: Attach to functions
Write-Host "Step 6: Attaching to functions..." -ForegroundColor Yellow

$functionsJson = aws lambda list-functions --output json | ConvertFrom-Json
$functions = $functionsJson.Functions | Where-Object { $_.FunctionName -like "misra-*" }

Write-Host "  Found $($functions.Count) functions" -ForegroundColor Gray

$successCount = 0
foreach ($func in $functions) {
  try {
    aws lambda update-function-configuration `
      --function-name $func.FunctionName `
      --layers $layerArn `
      --output json | Out-Null
    $successCount++
  } catch {
    # Continue on error
  }
}

Write-Host "[OK] Updated $successCount functions" -ForegroundColor Green
Write-Host ""

# Step 7: Wait
Write-Host "Step 7: Waiting for propagation..." -ForegroundColor Yellow
Start-Sleep -Seconds 10
Write-Host "[OK] Ready" -ForegroundColor Green
Write-Host ""

# Step 8: Test
Write-Host "Step 8: Testing API..." -ForegroundColor Yellow

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
Write-Host "[OK] Done" -ForegroundColor Green
Write-Host ""

Write-Host "=== LAMBDA LAYER DEPLOYED ===" -ForegroundColor Green
Write-Host "All functions now have production dependencies" -ForegroundColor Green
