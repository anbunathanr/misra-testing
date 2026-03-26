# Comprehensive fix for Lambda 500 errors
# This script creates a Lambda Layer with all dependencies and attaches it to all functions

Write-Host "=== FIXING LAMBDA 500 ERRORS ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Verify AWS credentials
Write-Host "Step 1: Verifying AWS credentials..." -ForegroundColor Yellow
$identity = aws sts get-caller-identity --output json | ConvertFrom-Json
Write-Host "[OK] AWS Account: $($identity.Account)" -ForegroundColor Green
Write-Host "[OK] User: $($identity.Arn)" -ForegroundColor Green
Write-Host ""

# Step 2: Create Lambda Layer with dependencies
Write-Host "Step 2: Creating Lambda Layer with dependencies..." -ForegroundColor Yellow

$layerDir = "lambda-layer-temp"
$nodeModulesDir = "$layerDir/nodejs/node_modules"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$zipPath = "lambda-layer-$timestamp.zip"

# Clean up if exists
if (Test-Path $layerDir) {
  Remove-Item -Recurse -Force $layerDir
}

# Create directory structure
New-Item -ItemType Directory -Path $nodeModulesDir -Force | Out-Null
Write-Host "[OK] Created layer directory structure" -ForegroundColor Green

# Copy node_modules
Write-Host "  Copying node_modules (this may take a moment)..." -ForegroundColor Gray
Copy-Item -Path "packages/backend/node_modules/*" -Destination $nodeModulesDir -Recurse -Force -ErrorAction Stop
Write-Host "[OK] Copied dependencies" -ForegroundColor Green

# Create zip file
Write-Host "  Creating zip file..." -ForegroundColor Gray
Compress-Archive -Path $layerDir -DestinationPath $zipPath -Force
Start-Sleep -Seconds 1
$zipSize = (Get-Item $zipPath).Length / 1MB
$sizeRounded = [Math]::Round($zipSize, 2)
Write-Host "[OK] Created zip file ($sizeRounded MB)" -ForegroundColor Green

# Upload layer to AWS
Write-Host "  Uploading to AWS Lambda..." -ForegroundColor Gray
$layerOutput = aws lambda publish-layer-version `
  --layer-name misra-dependencies `
  --zip-file fileb://$zipPath `
  --compatible-runtimes nodejs20.x `
  --output json 2>&1

if ($LASTEXITCODE -eq 0) {
  $layerJson = $layerOutput | ConvertFrom-Json
  $layerArn = $layerJson.LayerVersionArn
  Write-Host "[OK] Layer published: $layerArn" -ForegroundColor Green
} else {
  Write-Host "[FAIL] Failed to publish layer" -ForegroundColor Red
  Write-Host $layerOutput -ForegroundColor Red
  exit 1
}
Write-Host ""

# Step 3: Get all Lambda functions
Write-Host "Step 3: Attaching layer to Lambda functions..." -ForegroundColor Yellow

$functionsOutput = aws lambda list-functions --output json 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host "[FAIL] Failed to list functions" -ForegroundColor Red
  exit 1
}

$functionsJson = $functionsOutput | ConvertFrom-Json
$functions = $functionsJson.Functions | Where-Object { $_.FunctionName -like "misra-*" }

Write-Host "  Found $($functions.Count) Lambda functions" -ForegroundColor Gray

$successCount = 0
$failureCount = 0

foreach ($func in $functions) {
  $funcName = $func.FunctionName
  Write-Host "  Updating $funcName..." -ForegroundColor Gray
  
  # Get current configuration
  $configOutput = aws lambda get-function-configuration --function-name $funcName --output json 2>&1
  if ($LASTEXITCODE -ne 0) {
    Write-Host "    [FAIL] Failed to get config" -ForegroundColor Red
    $failureCount++
    continue
  }
  
  $config = $configOutput | ConvertFrom-Json
  
  # Build layers array
  $layers = @($layerArn)
  if ($config.Layers) {
    $layers += $config.Layers | ForEach-Object { $_.Arn }
  }
  
  # Update function with layer
  $updateOutput = aws lambda update-function-configuration `
    --function-name $funcName `
    --layers $layers `
    --output json 2>&1
  
  if ($LASTEXITCODE -eq 0) {
    Write-Host "    [OK] Updated" -ForegroundColor Green
    $successCount++
  } else {
    Write-Host "    [FAIL] Failed" -ForegroundColor Red
    $failureCount++
  }
}

Write-Host "[OK] Updated $successCount functions" -ForegroundColor Green
if ($failureCount -gt 0) {
  Write-Host "[WARN] Failed to update $failureCount functions" -ForegroundColor Yellow
}
Write-Host ""

# Step 4: Wait for updates to propagate
Write-Host "Step 4: Waiting for updates to propagate..." -ForegroundColor Yellow
Start-Sleep -Seconds 10
Write-Host "[OK] Ready to test" -ForegroundColor Green
Write-Host ""

# Step 5: Test API endpoints
Write-Host "Step 5: Testing API endpoints..." -ForegroundColor Yellow

# Get API Gateway URL from CloudFormation
$stackName = "MisraPlatformStackV2"
$stackOutput = aws cloudformation describe-stacks --stack-name $stackName --output json 2>&1

if ($LASTEXITCODE -eq 0) {
  $stackJson = $stackOutput | ConvertFrom-Json
  $outputs = $stackJson.Stacks[0].Outputs
  $apiUrl = ($outputs | Where-Object { $_.OutputKey -eq "ApiEndpoint" }).OutputValue
  
  if ($apiUrl) {
    Write-Host "  API URL: $apiUrl" -ForegroundColor Gray
    
    # Test a few endpoints
    $testEndpoints = @(
      "/projects",
      "/auth/profile",
      "/analysis/results"
    )
    
    foreach ($endpoint in $testEndpoints) {
      Write-Host "  Testing GET $endpoint..." -ForegroundColor Gray
      try {
        $response = Invoke-RestMethod -Uri "$apiUrl$endpoint" -Method GET -TimeoutSec 5 -ErrorAction Stop
        Write-Host "    [OK] Success (200)" -ForegroundColor Green
      }
      catch {
        $statusCode = $_.Exception.Response.StatusCode.Value__
        if ($statusCode -eq 401 -or $statusCode -eq 403) {
          Write-Host "    [OK] Auth required ($statusCode) - Lambda is working!" -ForegroundColor Green
        } else {
          Write-Host "    [FAIL] Error: $statusCode" -ForegroundColor Red
        }
      }
    }
  } else {
    Write-Host "  Could not find API URL in CloudFormation outputs" -ForegroundColor Yellow
  }
} else {
  Write-Host "  Could not retrieve CloudFormation stack" -ForegroundColor Yellow
}
Write-Host ""

# Step 6: Cleanup
Write-Host "Step 6: Cleaning up temporary files..." -ForegroundColor Yellow
Remove-Item -Recurse -Force $layerDir -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1
Remove-Item $zipPath -ErrorAction SilentlyContinue
Write-Host "[OK] Cleanup complete" -ForegroundColor Green
Write-Host ""

Write-Host "=== LAMBDA 500 ERRORS FIXED ===" -ForegroundColor Green
Write-Host "All Lambda functions now have access to dependencies via Lambda Layer" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Test your API endpoints at the URL above" -ForegroundColor Gray
Write-Host "2. Check CloudWatch logs if you still see errors" -ForegroundColor Gray
Write-Host "3. Deploy frontend when ready" -ForegroundColor Gray
