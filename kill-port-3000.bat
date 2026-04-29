@echo off
echo Killing processes on port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    echo Killing process %%a
    taskkill /f /pid %%a >nul 2>&1
)
echo Done! Port 3000 should now be available.
pause