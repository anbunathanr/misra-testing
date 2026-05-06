# Windows Setup Guide - Chrome Remote Debugging

## Problem

PowerShell doesn't recognize the `--remote-debugging-port` flag syntax. This is because PowerShell interprets `--` as a special operator.

## Solution

Use one of these methods to start Chrome with remote debugging on Windows:

---

## Method 1: Using Batch Script (Easiest) ✅

### Step 1: Run the Batch Script

Double-click `start-chrome-windows.bat` or run in Command Prompt:

```cmd
start-chrome-windows.bat
```

### What It Does:
1. Closes all Chrome windows
2. Starts Chrome with `--remote-debugging-port=9222`
3. Keeps the window open

### Result:
```
========================================
Chrome Remote Debugging Launcher
========================================

[*] Closing all Chrome windows...
[*] Starting Chrome with remote debugging...
    Port: 9222
    URL: http://localhost:9222

[SUCCESS] Chrome started with remote debugging
[INFO] Keep this window open while running the test
```

---

## Method 2: Using PowerShell Script

### Step 1: Run the PowerShell Script

```powershell
.\start-chrome-windows.ps1
```

### If You Get Execution Policy Error:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\start-chrome-windows.ps1
```

### What It Does:
1. Closes all Chrome windows
2. Starts Chrome with `--remote-debugging-port=9222`
3. Keeps the window open

---

## Method 3: Using Command Prompt (CMD)

### Step 1: Open Command Prompt

Press `Win + R`, type `cmd`, press Enter

### Step 2: Close Chrome

```cmd
taskkill /F /IM chrome.exe
```

### Step 3: Start Chrome with Remote Debugging

```cmd
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
```

### Result:
```
[1234] DevTools listening on ws://127.0.0.1:9222/devtools/browser/...
```

---

## Method 4: Using PowerShell (Correct Syntax)

### Step 1: Open PowerShell

Press `Win + X`, select "Windows PowerShell" or "Terminal"

### Step 2: Close Chrome

```powershell
Stop-Process -Name chrome -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
```

### Step 3: Start Chrome with Remote Debugging

```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
```

**Key:** Use `&` operator to call the executable

---

## Verification

After starting Chrome, you should see:

```
[1234] DevTools listening on ws://127.0.0.1:9222/devtools/browser/...
```

Or visit: `http://localhost:9222` in another browser to see the DevTools interface.

---

## Next Steps

### Step 1: Keep Chrome Running

Leave the Chrome window/terminal open while running the test.

### Step 2: Run the Test

In a **new terminal/PowerShell window**:

```bash
npm run test:complete
```

### Step 3: What You'll See

1. Server starts on available port
2. Localhost opens in your browser
3. You register and verify OTP
4. You click TEST
5. MISRA loads in your browser tab ✅
6. Downloads appear in your browser ✅
7. AI verification runs ✅

---

## Troubleshooting

### Chrome Not Found

**Error:**
```
[ERROR] Chrome not found at: C:\Program Files\Google\Chrome\Application\chrome.exe
```

**Solution:**
1. Check if Chrome is installed
2. Verify the path is correct
3. Update the path in the script if needed

**Alternative paths:**
```
C:\Program Files (x86)\Google\Chrome\Application\chrome.exe
C:\Users\YourUsername\AppData\Local\Google\Chrome\Application\chrome.exe
```

### Port Already in Use

**Error:**
```
[1234] listen EADDRINUSE: address already in use :::9222
```

**Solution:**
1. Close other Chrome instances
2. Use a different port: `--remote-debugging-port=9223`
3. Kill the process: `netstat -ano | findstr :9222`

### PowerShell Execution Policy

**Error:**
```
cannot be loaded because running scripts is disabled on this system
```

**Solution:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## Quick Reference

| Method | Command | Difficulty |
|--------|---------|-----------|
| Batch Script | `start-chrome-windows.bat` | ⭐ Easy |
| PowerShell Script | `.\start-chrome-windows.ps1` | ⭐ Easy |
| CMD | `"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222` | ⭐⭐ Medium |
| PowerShell | `& "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222` | ⭐⭐ Medium |

---

## Complete Workflow

### Terminal 1: Start Chrome
```
Run: start-chrome-windows.bat
Keep this window open
```

### Terminal 2: Run Test
```
Run: npm run test:complete
```

### Browser: Complete Registration
```
1. Enter name, email, mobile
2. Click "Send OTP"
3. Enter OTP from email
4. Click "Verify & Login"
5. Click "TEST" button
```

### Result
```
✅ MISRA loads in your browser
✅ Downloads visible in your browser
✅ AI verification runs
✅ Report generated
```

---

## Files Provided

- `start-chrome-windows.bat` - Batch script (easiest)
- `start-chrome-windows.ps1` - PowerShell script
- `WINDOWS_SETUP_GUIDE.md` - This guide

---

## Summary

**Use the batch script for easiest setup:**

```
1. Double-click: start-chrome-windows.bat
2. Run: npm run test:complete
3. Complete registration in browser
4. Click TEST button
5. Done! ✅
```

