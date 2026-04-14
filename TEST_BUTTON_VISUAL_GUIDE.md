# Test Button - Visual Guide

## The Error You Got

```
PS D:\Code\misra-testing\packages\backend> npm run dev -- --port 3001
npm error Missing script: "dev"
```

### Why This Happened

You tried to start a local dev server, but the backend is **serverless** (AWS Lambda).

```
❌ What You Tried:
   npm run dev
   └─ Looks for "dev" script in package.json
   └─ Script doesn't exist
   └─ Error!

✅ What You Should Do:
   Option A: Use deployed backend (easiest)
   Option B: Use SAM CLI for local backend
```

---

## Option A: Use Deployed Backend (Recommended)

### Step 1: Open Test Button
```
File Location:
packages/backend/test-button.html

How to Open:
1. Right-click on file
2. Select "Open with" → Browser
   OR
3. Drag file into browser window
   OR
4. File → Open → Select file
```

### Step 2: Select Environment
```
┌─────────────────────────────────────┐
│ Environment                         │
├─────────────────────────────────────┤
│ ▼ Local Development (localhost)     │
│   Development                       │
│   Staging                           │
│   Production                        │
└─────────────────────────────────────┘

Choose: Development, Staging, or Production
(Local Development requires SAM CLI)
```

### Step 3: Click Run Test
```
┌──────────────────────────────────────┐
│ ▶ Run Test        Clear              │
└──────────────────────────────────────┘

Click the blue "Run Test" button
```

### Step 4: Watch Progress
```
1. Login      ✓ Completed
2. Upload     ⟳ Running
3. Analyze    ○ Pending
4. Verify     ○ Pending

Test Output:
[TEST] Step 1: Getting test credentials...
[TEST] ✓ Got access token
[TEST] ✓ Got OTP: 123456
...
```

### Step 5: Check Results
```
Success Case:
┌─────────────────────────────────────┐
│ Test Output              ✓ Success   │
├─────────────────────────────────────┤
│ ✓ All tests passed successfully!    │
└─────────────────────────────────────┘

Error Case:
┌─────────────────────────────────────┐
│ Test Output              ✗ Error     │
├─────────────────────────────────────┤
│ ✗ Test failed: Connection refused   │
│ Troubleshooting:                    │
│ 1. Check backend is running         │
│ 2. Verify TEST_MODE_ENABLED=true    │
│ 3. Check CORS configuration         │
└─────────────────────────────────────┘
```

---

## Option B: Deploy Backend Locally (Advanced)

### Prerequisites
```
✓ AWS SAM CLI installed
✓ Docker running
✓ AWS credentials configured
```

### Step 1: Start Local Backend
```bash
cd packages/backend
sam local start-api --port 3001

# Output:
# Mounting TestLoginFunction at http://127.0.0.1:3001/auth/test-login
# You can now browse to http://127.0.0.1:3001
```

### Step 2: Open Test Button
```
Same as Option A, Step 1
```

### Step 3: Select Local Development
```
┌─────────────────────────────────────┐
│ Environment                         │
├─────────────────────────────────────┤
│ ▼ Local Development (localhost)     │
│   Development                       │
│   Staging                           │
│   Production                        │
└─────────────────────────────────────┘

Select: Local Development
(URLs auto-populate to localhost)
```

### Step 4: Run Test
```
Same as Option A, Steps 3-5
```

---

## Architecture Comparison

### Traditional Node.js App
```
┌──────────────────┐
│  npm run dev     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Local Dev Server │
│  Port 3000       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Browser         │
│  localhost:3000  │
└──────────────────┘
```

### MISRA Serverless Backend
```
┌──────────────────┐
│  AWS CDK         │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  AWS Lambda      │
│  Functions       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  API Gateway     │
│  Public URL      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Browser         │
│  https://api...  │
└──────────────────┘
```

---

## Decision Tree

```
Do you want to test the backend?
│
├─ YES, quickly (2 minutes)
│  └─ Use Option A (Deployed Backend)
│     └─ Open test-button.html
│     └─ Select environment
│     └─ Click "Run Test"
│
└─ YES, but I need to debug code locally (15 minutes)
   └─ Use Option B (Local SAM)
      └─ Install SAM CLI
      └─ Run: sam local start-api --port 3001
      └─ Open test-button.html
      └─ Select "Local Development"
      └─ Click "Run Test"
```

---

## Common Issues - Visual Guide

### Issue 1: "net::ERR_NAME_NOT_RESOLVED"
```
Error Message:
Failed to fetch from api-dev.misra.digitransolutions.in

Cause:
Domain doesn't exist or isn't deployed

Fix:
1. Try different environment (staging/production)
2. Check backend is deployed to AWS
3. Verify domain name is correct
```

### Issue 2: "net::ERR_CONNECTION_REFUSED"
```
Error Message:
Failed to connect to localhost:3001

Cause:
Backend not running locally

Fix (if using Local Development):
1. Open terminal
2. cd packages/backend
3. sam local start-api --port 3001
4. Wait for "You can now browse to..."
5. Try test again

Fix (if using deployed):
1. Check AWS Lambda functions are running
2. Try different environment
3. Check network connectivity
```

### Issue 3: CORS Error
```
Error Message:
Access to XMLHttpRequest blocked by CORS policy

Cause:
Browser blocked cross-origin request

Fix:
1. Check browser console (F12)
2. See detailed error message
3. Verify backend CORS headers
4. Check domain is whitelisted
```

---

## File Locations

```
Project Root
│
├─ packages/
│  └─ backend/
│     ├─ test-button.html ◄─── OPEN THIS IN BROWSER
│     ├─ src/
│     │  └─ functions/
│     │     └─ auth/
│     │        └─ test-login.ts (backend endpoint)
│     └─ package.json (no "dev" script)
│
└─ Documentation/
   ├─ IMMEDIATE_NEXT_STEPS.md ◄─── READ THIS FIRST
   ├─ MISRA_TEST_BUTTON_COMPLETE_GUIDE.md
   ├─ BACKEND_ARCHITECTURE_EXPLAINED.md
   └─ TEST_BUTTON_VISUAL_GUIDE.md (this file)
```

---

## Quick Reference

| What | Where | How |
|------|-------|-----|
| Open Test Button | `packages/backend/test-button.html` | Right-click → Open with Browser |
| Select Environment | Dropdown in test button | Choose Development/Staging/Production |
| Run Test | Blue button | Click "Run Test" |
| Check Results | Output section | Green = Success, Red = Error |
| Debug Errors | Browser console | F12 → Console tab |
| View Logs | CloudWatch | AWS Console → CloudWatch → Logs |

---

## Success Indicators

### ✅ Test Passed
```
Status: ✓ Success (green badge)
Output: ✓ All tests passed successfully!
Steps: All 4 steps completed (green checkmarks)
```

### ❌ Test Failed
```
Status: ✗ Error (red badge)
Output: ✗ Test failed: [error message]
Steps: Some steps incomplete
Troubleshooting: Suggestions provided in output
```

---

## Next Action

```
1. Open: packages/backend/test-button.html
2. Select: Development (or Staging/Production)
3. Click: "Run Test"
4. Wait: For test to complete
5. Check: Results (green or red badge)
6. Report: Success or error message
```

**That's it!** You're ready to test.

