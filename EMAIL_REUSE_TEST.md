# Email Reuse Testing Guide

## Problem
You're frustrated having to use new email addresses for each test. The system should allow reusing the same email.

## Solution Applied
1. **Auto-logout before authentication**: Modified `auto-auth-service.ts` to always logout before starting new authentication
2. **Consistent demo password**: All users use `DemoPass123!@#` password
3. **Existing user handling**: System already handles 409 Conflict (user exists) by skipping OTP and going directly to login

## How to Test Email Reuse

### Step 1: Clear Browser Cache (Critical!)
1. Open Developer Tools (F12)
2. Go to Application tab → Storage → Local Storage
3. Click "Clear site data" or manually clear:
   - Local Storage
   - Session Storage  
   - Cookies
4. Hard refresh browser (Ctrl+Shift+R)

### Step 2: Use Same Email Repeatedly
You can now use the same email (e.g., `sanjjsr125@gmail.com`) repeatedly:

**First run:**
- Email: `sanjjsr125@gmail.com`
- Flow: Register → OTP → Login → Upload → Analyze

**Second run (same email):**
- Email: `sanjjsr125@gmail.com` 
- Flow: Login (skip OTP) → Upload → Analyze

### Step 3: Verify Fix Works
The system will:
1. Logout any existing session
2. Detect user already exists (409)
3. Skip OTP verification
4. Login directly with demo password
5. Continue workflow

## Technical Details

**Why email reuse was failing:**
- Browser cached authentication state
- System thought you were already logged in
- Different session states caused confusion

**What we fixed:**
- Always logout before starting authentication
- Clear local storage between tests
- Consistent password across all flows

## Quick Test Commands
```bash
# Clear browser cache manually
# Then test with same email multiple times
```

**You should now be able to use the same email address repeatedly without issues!**