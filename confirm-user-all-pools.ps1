# Script to confirm a Cognito user across all pools
# Usage: .\confirm-user-all-pools.ps1 -Email "your-email@example.com"

param(
    [Parameter(Mandatory=$true)]
    [string]$Email
)

Write-Host "Finding all User Pools..." -ForegroundColor Cyan

# Get all user pool IDs
$allPools = aws cognito-idp list-user-pools --max-results 20 --output json | ConvertFrom-Json

if (-not $allPools.UserPools) {
    Write-Host "Error: No user pools found" -ForegroundColor Red
    exit 1
}

Write-Host "Found $($allPools.UserPools.Count) user pools" -ForegroundColor Green
Write-Host ""

$userFound = $false
$confirmedPool = $null

# Check each pool for the user
foreach ($pool in $allPools.UserPools) {
    Write-Host "Checking pool: $($pool.Name) ($($pool.Id))..." -ForegroundColor Cyan
    
    try {
        $userInfo = aws cognito-idp admin-get-user --user-pool-id $pool.Id --username $Email 2>&1 | Out-String
        
        if ($LASTEXITCODE -eq 0) {
            $userFound = $true
            $userData = $userInfo | ConvertFrom-Json
            $userStatus = $userData.UserStatus
            
            Write-Host "  Found user! Status: $userStatus" -ForegroundColor Yellow
            
            if ($userStatus -eq "CONFIRMED") {
                Write-Host "  User is already confirmed in this pool!" -ForegroundColor Green
                $confirmedPool = $pool.Id
            } else {
                Write-Host "  Confirming user..." -ForegroundColor Cyan
                aws cognito-idp admin-confirm-sign-up --user-pool-id $pool.Id --username $Email
                
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "  User confirmed successfully!" -ForegroundColor Green
                    $confirmedPool = $pool.Id
                } else {
                    Write-Host "  Failed to confirm user" -ForegroundColor Red
                }
            }
            Write-Host ""
        }
    } catch {
        # User not in this pool, continue
    }
}

if (-not $userFound) {
    Write-Host "User '$Email' not found in any pool" -ForegroundColor Red
    Write-Host ""
    Write-Host "Available pools:" -ForegroundColor Yellow
    foreach ($pool in $allPools.UserPools) {
        Write-Host "  - $($pool.Name) ($($pool.Id))" -ForegroundColor White
    }
    Write-Host ""
    Write-Host "Make sure you registered with this email first" -ForegroundColor Yellow
    exit 1
}

if ($confirmedPool) {
    Write-Host "Success!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Cyan
    Write-Host "1. Go to: https://aibts-platform.vercel.app/login" -ForegroundColor White
    Write-Host "2. Enter your email: $Email" -ForegroundColor White
    Write-Host "3. Enter your password" -ForegroundColor White
    Write-Host "4. Click 'Sign In'" -ForegroundColor White
    Write-Host ""
    Write-Host "Done!" -ForegroundColor Green
} else {
    Write-Host "Failed to confirm user" -ForegroundColor Red
    exit 1
}
