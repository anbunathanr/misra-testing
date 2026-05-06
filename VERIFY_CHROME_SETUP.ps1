# Verify Chrome Remote Debugging Setup
# Run this script to check if Chrome is properly configured

Write-Host "🔍 Checking Chrome Remote Debugging Setup..." -ForegroundColor Cyan
Write-Host ""

# Check if Chrome is running
$chromeProcess = Get-Process chrome -ErrorAction SilentlyContinue
if ($chromeProcess) {
    Write-Host "✅ Chrome is running" -ForegroundColor Green
    Write-Host "   Process ID: $($chromeProcess.Id)" -ForegroundColor Gray
} else {
    Write-Host "❌ Chrome is NOT running" -ForegroundColor Red
    Write-Host "   Please start Chrome with: & `"C:\Program Files\Google\Chrome\Application\chrome.exe`" --remote-debugging-port=9222" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Check if port 9222 is listening
$portCheck = netstat -ano | Select-String ":9222"
if ($portCheck) {
    Write-Host "✅ Port 9222 is listening" -ForegroundColor Green
    Write-Host "   Chrome DevTools Protocol is active" -ForegroundColor Gray
} else {
    Write-Host "❌ Port 9222 is NOT listening" -ForegroundColor Red
    Write-Host "   Chrome was NOT started with --remote-debugging-port=9222" -ForegroundColor Yellow
    Write-Host "   Please close Chrome and restart with:" -ForegroundColor Yellow
    Write-Host "   & `"C:\Program Files\Google\Chrome\Application\chrome.exe`" --remote-debugging-port=9222" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Try to connect to Chrome DevTools Protocol
Write-Host "🔌 Testing Chrome DevTools Protocol connection..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:9222/json/version" -ErrorAction Stop
    Write-Host "✅ Successfully connected to Chrome DevTools Protocol" -ForegroundColor Green
    Write-Host "   Response: $($response.StatusCode)" -ForegroundColor Gray
    
    $versionInfo = $response.Content | ConvertFrom-Json
    Write-Host "   Chrome Version: $($versionInfo.Browser)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Failed to connect to Chrome DevTools Protocol" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "✅ All checks passed! Chrome is ready for remote debugging." -ForegroundColor Green
Write-Host ""
Write-Host "You can now run: npm run test:complete" -ForegroundColor Cyan
