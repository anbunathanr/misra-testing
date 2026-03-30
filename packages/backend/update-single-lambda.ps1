# Update a single Lambda function with bundled code
# Usage: .\update-single-lambda.ps1 -FunctionName "misra-platform-login" -ZipPath "dist-zips/auth/login/index.zip"

param(
    [Parameter(Mandatory=$true)]
    [string]$FunctionName,
    
    [Parameter(Mandatory=$true)]
    [string]$ZipPath
)

Write-Host "Updating Lambda function: $FunctionName" -ForegroundColor Cyan
Write-Host "Using zip file: $ZipPath" -ForegroundColor Cyan

# Check if zip file exists
if (-not (Test-Path $ZipPath)) {
    Write-Host "Error: Zip file not found at $ZipPath" -ForegroundColor Red
    exit 1
}

# Get zip file size
$zipSize = (Get-Item $ZipPath).Length
Write-Host "Zip file size: $zipSize bytes" -ForegroundColor Yellow

# Update Lambda function code
Write-Host "`nUpdating function code..." -ForegroundColor Yellow
aws lambda update-function-code `
    --function-name $FunctionName `
    --zip-file "fileb://$ZipPath"

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nFunction code updated successfully!" -ForegroundColor Green
    
    # Wait for update to complete
    Write-Host "Waiting for function to be ready..." -ForegroundColor Yellow
    aws lambda wait function-updated --function-name $FunctionName
    
    # Get updated function info
    Write-Host "`nUpdated function details:" -ForegroundColor Cyan
    aws lambda get-function --function-name $FunctionName --query 'Configuration.[CodeSize,LastModified,Handler,State]' --output json
    
    Write-Host "`nDone! You can now test the function." -ForegroundColor Green
} else {
    Write-Host "`nError updating function code" -ForegroundColor Red
    exit 1
}
