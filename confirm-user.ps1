# Quick script to confirm a Cognito user
# Usage: .\confirm-user.ps1 -Email "your-email@example.com"

param(
    [Parameter(Mandatory=$true)]
    [string]$Email
)

Write-Host "Finding User Pool..." -ForegroundColor Cyan

# Get User Pool ID - using the correct pool name
$userPoolId = aws cognito-idp list-user-pools --max-results 10 --query 'UserPools[?Name==`misra-platform-users`].Id' --output text

if (-not $userPoolId) {
    Write-Host "Error: Could not find user pool 'misra-platform-users'" -ForegroundColor Red
    Write-Host "Make sure AWS CLI is configured and you have access to Cognito" -ForegroundColor Yellow
    exit 1
}

Write-Host "Found User Pool: $userPoolId" -ForegroundColor Green
Write-Host ""

Write-Host "Checking user status..." -ForegroundColor Cyan

# Check if user exists
try {
    $userInfo = aws cognito-idp admin-get-user --user-pool-id $userPoolId --username $Email 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: User '$Email' not found" -ForegroundColor Red
        Write-Host "Make sure you registered with this email first" -ForegroundColor Yellow
        exit 1
    }
    
    # Parse user status
    $userStatus = ($userInfo | ConvertFrom-Json).UserStatus
    
    Write-Host "Current Status: $userStatus" -ForegroundColor Yellow
    Write-Host ""
    
    if ($userStatus -eq "CONFIRMED") {
        Write-Host "User is already confirmed!" -ForegroundColor Green
        Write-Host "You can now login at: https://aibts-platform.vercel.app/login" -ForegroundColor Cyan
        exit 0
    }
    
} catch {
    Write-Host "Error checking user: $_" -ForegroundColor Red
    exit 1
}

Write-Host "Confirming user..." -ForegroundColor Cyan

# Confirm the user
try {
    aws cognito-idp admin-confirm-sign-up --user-pool-id $userPoolId --username $Email
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "User confirmed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "You can now login!" -ForegroundColor Green
        Write-Host "URL: https://aibts-platform.vercel.app/login" -ForegroundColor Cyan
        Write-Host "Email: $Email" -ForegroundColor Cyan
        Write-Host ""
        
        # Verify confirmation
        Write-Host "Verifying confirmation..." -ForegroundColor Cyan
        $verifyInfo = aws cognito-idp admin-get-user --user-pool-id $userPoolId --username $Email | ConvertFrom-Json
        $newStatus = $verifyInfo.UserStatus
        
        if ($newStatus -eq "CONFIRMED") {
            Write-Host "Verified: User status is CONFIRMED" -ForegroundColor Green
        } else {
            Write-Host "Warning: User status is $newStatus" -ForegroundColor Yellow
        }
        
    } else {
        Write-Host "Error: Failed to confirm user" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "Error confirming user: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Go to: https://aibts-platform.vercel.app/login" -ForegroundColor White
Write-Host "2. Enter your email: $Email" -ForegroundColor White
Write-Host "3. Enter your password" -ForegroundColor White
Write-Host "4. Click 'Sign In'" -ForegroundColor White
Write-Host ""
Write-Host "Done!" -ForegroundColor Green
