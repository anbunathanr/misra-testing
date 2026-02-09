# PowerShell script to create test users in DynamoDB
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Creating Test Users in DynamoDB" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$tableName = "misra-platform-users"

# Test User 1 - Admin
Write-Host "Creating Admin User..." -ForegroundColor Yellow
aws dynamodb put-item --table-name $tableName --item file://test-users/admin.json
if ($LASTEXITCODE -eq 0) {
    Write-Host "Admin user created successfully" -ForegroundColor Green
} else {
    Write-Host "Failed to create admin user" -ForegroundColor Red
}

# Test User 2 - Developer
Write-Host "Creating Developer User..." -ForegroundColor Yellow
aws dynamodb put-item --table-name $tableName --item file://test-users/developer.json
if ($LASTEXITCODE -eq 0) {
    Write-Host "Developer user created successfully" -ForegroundColor Green
} else {
    Write-Host "Failed to create developer user" -ForegroundColor Red
}

# Test User 3 - Viewer
Write-Host "Creating Viewer User..." -ForegroundColor Yellow
aws dynamodb put-item --table-name $tableName --item file://test-users/viewer.json
if ($LASTEXITCODE -eq 0) {
    Write-Host "Viewer user created successfully" -ForegroundColor Green
} else {
    Write-Host "Failed to create viewer user" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Users Created!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Test Credentials:" -ForegroundColor Yellow
Write-Host "1. Admin User:" -ForegroundColor White
Write-Host "   Email: admin@misra-platform.com" -ForegroundColor Gray
Write-Host "   Password: password123" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Developer User:" -ForegroundColor White
Write-Host "   Email: developer@misra-platform.com" -ForegroundColor Gray
Write-Host "   Password: password123" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Viewer User:" -ForegroundColor White
Write-Host "   Email: viewer@misra-platform.com" -ForegroundColor Gray
Write-Host "   Password: password123" -ForegroundColor Gray
Write-Host ""
Write-Host "Note: These are test users with placeholder password hashes." -ForegroundColor Yellow
Write-Host "In production, use proper password hashing with bcrypt." -ForegroundColor Yellow
