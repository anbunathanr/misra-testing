# ⚡ Quick Fix: Login Issue

## Problem
You're getting "Incorrect username or password" error because **you don't have an account yet**.

## Solution (2 minutes)

### Step 1: Register
1. Go to: **https://aibts-platform.vercel.app/register**
2. Fill in:
   - **Full Name**: Your Name
   - **Email**: your-email@example.com
   - **Password**: TestUser123! (or any password with uppercase, lowercase, number)
   - **Confirm Password**: TestUser123! (same as above)
3. Click "Sign Up"

### Step 2: Verify Email
1. Check your email inbox
2. Find the verification code (6 digits)
3. Enter the code on the verification page
4. Click "Verify Email"

### Step 3: Login
1. You'll be redirected to login page
2. Enter your email and password
3. Click "Sign In"
4. ✅ You're in!

---

## Password Requirements
- At least 8 characters
- One uppercase letter (A-Z)
- One lowercase letter (a-z)
- One number (0-9)

**Good Examples:**
- `TestUser123!`
- `MyPassword2024`
- `SecurePass456`

---

## Still Having Issues?

### Issue: "User already exists"
→ Email is already registered. Try logging in or reset password.

### Issue: "Didn't receive verification code"
→ Check spam folder or click "Resend" on verification page.

### Issue: "Password doesn't meet requirements"
→ Make sure it has uppercase, lowercase, and number.

---

## Quick Commands to Check

```powershell
# Check if Cognito User Pool exists
aws cognito-idp list-user-pools --max-results 10

# List registered users (after registration)
aws cognito-idp list-users --user-pool-id YOUR_POOL_ID
```

---

**Next**: After successful login, follow `COMPLETE_TESTING_GUIDE_WITH_FIELDS.md` to start testing!

