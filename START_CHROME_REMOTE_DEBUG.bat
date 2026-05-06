@echo off
REM Start Chrome with Remote Debugging Port 9222
REM This allows Playwright to connect to your existing Chrome browser

echo.
echo ========================================
echo  Starting Chrome with Remote Debugging
echo ========================================
echo.

REM Check if Chrome is already running
tasklist /FI "IMAGENAME eq chrome.exe" 2>NUL | find /I /N "chrome.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo ⚠️  Chrome is already running
    echo Please close all Chrome windows first
    echo.
    pause
    exit /b 1
)

REM Start Chrome with remote debugging port
echo 🚀 Starting Chrome with --remote-debugging-port=9222...
echo.

start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --no-first-run --no-default-browser-check

echo.
echo ✅ Chrome is starting...
echo.
echo 📌 IMPORTANT:
echo    - Keep this window open
echo    - Chrome will open normally
echo    - You should see "DevTools listening on ws://127.0.0.1:9222"
echo.
echo 🔧 Next steps:
echo    1. Open a NEW PowerShell or Command Prompt window
echo    2. Run: npm run test:complete
echo    3. Follow the browser prompts
echo.
echo 💡 MISRA will open in YOUR browser (same tab as localhost)
echo    NOT in a separate Playwright window
echo.
pause
