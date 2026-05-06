# PowerShell script to start Chrome with remote debugging on Windows

# Close all Chrome windows first
Write-Host "🔴 Closing all Chrome windows..." -ForegroundColor Yellow
Get-Process chrome -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Start Chrome with remote debugging
Write-Host "🟢 Starting Chrome with remote debugging..." -ForegroundColor Green
Write-Host "   Port: 9222" -ForegroundColor Cyan
Write-Host "   URL: http://localhost:9222" -ForegroundColor Cyan

$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"

# Check if Chrome exists
if (-not (Test-Path $chromePath)) {
    Write-Host "❌ Chrome not found at: $chromePath" -ForegroundColor Red
    Write-Host "💡 Please install Chrome or update the path" -ForegroundColor Yellow
    exit 1
}

# Start Chrome with remote debugging
& $chromePath --remote-debugging-port=9222

Write-Host "✅ Chrome started with remote debugging" -ForegroundColor Green
Write-Host "💡 Keep this window open while running the test" -ForegroundColor Cyan
