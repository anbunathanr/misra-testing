# 🔐 How to Register and Login to AIBTS Platform

## ❌ Current Issue

You're seeing this error:
```
Login failed: Incorrect username or password
API login failed, falling back to Cognito: Invalid email or password
```

**Reason**: You don't have a registered account yet!

---

## ✅ Solution: Register First, Then Login

### Step 1: Go to Registration Page

1. Open your browser
2. Navigate to: **https://aibts-platform.vercel.app/register**
3. Or click "Register" / "Sign Up" link on the login page

### Step 2: Fill in Registration Form

```
Email: your-email@example.com
Password: YourSecurePassword123!
Confirm Password: YourSecurePassword123!
```

**Password Requirements:**
- At least 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- At least one special character (!@#$%^&*)

**Good Password Examples:**
- `TestUser123!`
- `MyPassword2024@`
- `SecurePass#456`

### Step 3: Verify Your Email

After registration, you'll receive a verification email:

1. Check your email inbox
2. Look for email from AWS Cognito / AIBTS Platform
3. Click the verification link in the email
4. Your account will be activated

**Note**: Check your spam folder if you don't see the email within 5 minutes.

### Step 4: Login

Once your email is verified:

1. Go to: **https://aibts-platform.vercel.app/login**
2. Enter your email
3. Enter your password
4. Click "Sign In"

You should now be logged in successfully!

---

## 🚀 Quick Start Commands

### Option 1: Register via Web UI (Recommended)

```
1. Go to: https://aibts-platform.vercel.app/register
2. Fill in the form
3. Click "Register"
4. Verify your email
5. Login at: https://aibts-platform.vercel.app/login
```

### Option 2: Register via AWS CLI (Advanced)

If you prefer using AWS CLI:

```powershell
# Get your Cognito User Pool ID
$userPoolId = aws cognito-idp list-user-pools --max-results 10 --query 'UserPools[?Name==`misra-platform-user-pool`].Id' --output text

# Register a new user
aws cognito-idp sign-up `
    --client-id YOUR_CLIENT_ID `
    --username "your-email@example.com" `
    --password "YourPassword123!" `
    --user-attributes Name=email,Value="your-email@example.com"

# Confirm the user (admin command - skips email verification)
aws cognito-idp admin-confirm-sign-up `
    --user-pool-id $userPoolId `
    --username "your-email@example.com"
```

---

## 🔍 Troubleshooting

### Issue: "User already exists"

**Solution**: The email is already registered. Try to login or reset your password.

### Issue: "Password does not meet requirements"

**Solution**: Make sure your password has:
- At least 8 characters
- Uppercase letter
- Lowercase letter
- Number
- Special character

### Issue: "Email not verified"

**Solution**: 
1. Check your email for verification link
2. Click the link to verify
3. Try logging in again

### Issue: "Verification email not received"

**Solution**:
1. Check spam/junk folder
2. Wait 5-10 minutes
3. Try resending verification email
4. Or use AWS CLI to manually confirm (see Option 2 above)

### Issue: Still can't login after registration

**Solution**:
1. Clear browser cache and cookies
2. Try incognito/private browsing mode
3. Check CloudWatch logs for errors:
   ```powershell
   aws logs tail /aws/lambda/misra-platform-login --follow
   ```

---

## 📋 Registration Checklist

Before you can use the platform:

- [ ] Navigate to registration page
- [ ] Fill in email and password
- [ ] Password meets all requirements
- [ ] Click "Register" button
- [ ] Check email for verification link
- [ ] Click verification link
- [ ] Email is verified
- [ ] Navigate to login page
- [ ] Enter same email and password
- [ ] Successfully logged in

---

## 🎯 After Successful Login

Once you're logged in, you'll see:

1. **Dashboard** - Overview of your projects and tests
2. **Projects** - Create and manage test projects
3. **Test Suites** - Organize your test cases
4. **Test Cases** - Create individual tests
5. **Test Executions** - Run and monitor tests

Now you can follow the testing guides:
- `COMPLETE_TESTING_GUIDE_WITH_FIELDS.md`
- `APP_TESTING_EXAMPLES.md`
- `TEST_COMPLETE_WORKFLOW.md`

---

## 💡 Pro Tips

1. **Use a real email**: You need to verify it, so use an email you can access
2. **Save your password**: Store it securely (password manager recommended)
3. **Test account**: For testing, you can use a temporary email service
4. **Multiple accounts**: You can register multiple accounts for testing

---

## 🔐 Security Notes

- Your password is securely hashed and stored in AWS Cognito
- Email verification is required for security
- Sessions expire after inactivity
- You can reset your password if you forget it

---

## 📞 Need Help?

If you're still having issues:

1. Check CloudWatch logs:
   ```powershell
   aws logs tail /aws/lambda/misra-platform-login --follow
   ```

2. Verify Cognito User Pool exists:
   ```powershell
   aws cognito-idp list-user-pools --max-results 10
   ```

3. Check if user was created:
   ```powershell
   aws cognito-idp list-users --user-pool-id YOUR_POOL_ID
   ```

---

**Status**: Registration required before login  
**Next Action**: Register at https://aibts-platform.vercel.app/register

