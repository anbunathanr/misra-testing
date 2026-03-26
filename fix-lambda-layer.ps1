# Fix Lambda 500 errors by creating and attaching a Lambda Layer with dependencies

Write-Host "Fixing Lambda Dependencies..." -ForegroundColor Cyan

# Step 1: Create layer directory structure
Write-Host "Creating Lambda Layer structure..." -ForegroundColor Yellow
$layerDir = "lambda-layer"
$nodeModulesDir = "$layerDir/nodejs/node_modules"

if (Test-Path $layerDir) {
  Remove-Item -Recurse -Force $layerDir
}

New-Item -ItemType Directory -Path $nodeModulesDir -Force | Out-Null

# Step 2: Copy node_modules to layer
Write-Host "Copying dependencies to layer..." -ForegroundColor Yellow
Copy-Item -Path "packages/backend/node_modules/*" -Destination $nodeModulesDir -Recurse -Force

# Step 3: Create zip file
Write-Host "Creating layer zip file..." -ForegroundColor Yellow
$zipPath = "lambda-layer.zip"
if (Test-Path $zipPath) {
  Remove-Item $zipPath
}

Compress-Archive -Path $layerDir -DestinationPath $zipPath -Force
Write-Host "Created zip file" -ForegroundColor Green

# Step 4: Upload layer to AWS
Write-Host "Uploading layer to AWS..." -ForegroundColor Yellow
$layerArn = aws lambda publish-layer-version --layer-name misra-dependencies --zip-file fileb://$zipPath --compatible-runtimes nodejs20.x --query 'LayerVersionArn' --output text

if ($LASTEXITCODE -eq 0) {
  Write-Host "Layer created: $layerArn" -ForegroundColor Green
} else {
  Write-Host "Failed to create layer" -ForegroundColor Red
  exit 1
}

# Step 5: Get all Lambda functions
Write-Host "Attaching layer to all Lambda functions..." -ForegroundColor Yellow
$functions = aws lambda list-functions --query 'Functions[?starts_with(FunctionName, `misra-`)].FunctionName' --output text

$functionArray = $functions -split '\s+' | Where-Object { $_ }
Write-Host "Found $($functionArray.Count) Lambda functions"

foreach ($func in $functionArray) {
  Write-Host "  Updating $func..." -ForegroundColor Gray
  
  $config = aws lambda get-function-configuration --function-name $func --output json | ConvertFrom-Json
  
  $layers = @($layerArn)
  if ($config.Layers) {
    $layers += $config.Layers | ForEach-Object { $_.Arn }
  }
  
  aws lambda update-function-configuration --function-name $func --layers $layers --output text | Out-Null
  
  Write-Host "  Updated $func" -ForegroundColor Green
}

# Step 6: Wait for updates
Write-Host "Waiting for Lambda updates..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Step 7: Test API
Write-Host "Testing API endpoints..." -ForegroundColor Yellow
$api = "https://4tltzxk06i.execute-api.us-east-1.amazonaws.com"

Write-Host "Testing GET /projects..." -ForegroundColor Gray
try {
  $resp = Invoke-RestMethod -Uri "$api/projects" -Method GET -ErrorAction Stop
  Write-Host "Projects endpoint works!" -ForegroundColor Green
}
catch {
  Write-Host "Projects endpoint failed: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}

# Step 8: Cleanup
Write-Host "Cleaning up..." -ForegroundColor Yellow
Remove-Item -Recurse -Force $layerDir
Remove-Item $zipPath
Write-Host "Cleanup complete" -ForegroundColor Green

Write-Host "Lambda dependencies fixed!" -ForegroundColor Green
