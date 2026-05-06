@echo off
REM Batch script to start Chrome with remote debugging on Windows

echo.
echo ========================================
echo Chrome Remote Debugging Launcher
echo ========================================
echo.

REM Close all Chrome windows
echo [*] Closing all Chrome windows...
taskkill /F /IM chrome.exe >nul 2>&1
timeout /t 2 /nobreak >nul

REM Start Chrome with remote debugging
echo [*] Starting Chrome with remote debugging...
echo     Port: 9222
echo     URL: http://localhost:9222
echo.

set CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe

REM Check if Chrome exists
if not exist "%CHROME_PATH%" (
    echo [ERROR] Chrome not found at: %CHROME_PATH%
    echo [INFO] Please install Chrome or update the path
    pause
    exit /b 1
)

REM Start Chrome
"%CHROME_PATH%" --remote-debugging-port=9222

echo.
echo [SUCCESS] Chrome started with remote debugging
echo [INFO] Keep this window open while running the test
pause
