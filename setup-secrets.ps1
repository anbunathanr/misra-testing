# AWS Secrets Manager Setup Script
# This script helps you create the required secrets

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "AWS Secrets Manager Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get AWS region
$region = Read-Host "Enter AWS region (default: us-east-1)"
if (-not $region) {
    $region = "us-east-1"
}

Write-Host ""
Write-Host "Creating secrets in region: $region" -ForegroundColor Yellow
Write-Host ""

# JWT Secret
Write-Host "1. JWT Secret" -ForegroundColor Cyan
Write-Host "   This is used to sign JWT tokens for authentication" -ForegroundColor Gray
$jwtSecret = Read-Host "Enter JWT secret (or press Enter to generate random)"
if (-not $jwtSecret) {
    # Generate random 64-character string
    $jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})
    Write-Host "   Generated: $jwtSecret" -ForegroundColor Green
}

try {
    $result = aws secretsmanager create-secret --name misra-platform/jwt-secret --secret-string $jwtSecret --region $region 2>&1
    Write-Host "   Success: JWT secret created" -ForegroundColor Green
} catch {
    Write-Host "   Warning: Failed to create JWT secret (may already exist)" -ForegroundColor Yellow
}

Write-Host ""

# n8n Webhook URL
Write-Host "2. n8n Webhook URL" -ForegroundColor Cyan
Write-Host "   This is the URL for n8n authentication webhook" -ForegroundColor Gray
$n8nUrl = Read-Host "Enter n8n webhook URL (or press Enter to use placeholder)"
if (-not $n8nUrl) {
    $n8nUrl = "https://your-n8n-instance.com/webhook/auth"
    Write-Host "   Using placeholder: $n8nUrl" -ForegroundColor Yellow
}

try {
    $result = aws secretsmanager create-secret --name misra-platform/n8n-webhook-url --secret-string $n8nUrl --region $region 2>&1
    Write-Host "   Success: n8n webhook URL created" -ForegroundColor Green
} catch {
    Write-Host "   Warning: Failed to create n8n webhook URL (may already exist)" -ForegroundColor Yellow
}

Write-Host ""

# n8n API Key
Write-Host "3. n8n API Key" -ForegroundColor Cyan
Write-Host "   This is the API key for n8n authentication" -ForegroundColor Gray
$n8nKey = Read-Host "Enter n8n API key (or press Enter to use placeholder)"
if (-not $n8nKey) {
    $n8nKey = "your-n8n-api-key-here"
    Write-Host "   Using placeholder: $n8nKey" -ForegroundColor Yellow
}

try {
    $result = aws secretsmanager create-secret --name misra-platform/n8n-api-key --secret-string $n8nKey --region $region 2>&1
    Write-Host "   Success: n8n API key created" -ForegroundColor Green
} catch {
    Write-Host "   Warning: Failed to create n8n API key (may already exist)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Secrets Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Created secrets:" -ForegroundColor Yellow
Write-Host "  - misra-platform/jwt-secret" -ForegroundColor Gray
Write-Host "  - misra-platform/n8n-webhook-url" -ForegroundColor Gray
Write-Host "  - misra-platform/n8n-api-key" -ForegroundColor Gray
Write-Host ""
Write-Host "You can now run the deployment script" -ForegroundColor Cyan
Write-Host ""
