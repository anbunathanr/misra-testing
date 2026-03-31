# 🔧 Complete Login Troubleshooting Guide

## Your Current Error

```
Failed to load resource: the server responded with a status of 401 ()
API login failed, falling back to Cognito: Invalid email or password
Login failed: Incorrect username or password.
```

---

## Root Cause

**You don't have a registered account yet!** The platform requires registration before login.

---

## ✅ Complete Solution

### Option 1: Register via Web UI (Recommended - 2 minutes)

#### 1. Navigate to Registration
```
URL: https://aibts-platform.vercel.app/register
```

#### 2. Fill Registration Form
```
Full Name: John Doe
Email: john.doe@example.com
Password: TestUser123!
Confirm Password: TestUser123!
```

#### 3. Submit Registration
- Click "Sign Up" button
- Wait for confirmation

#### 4. Verify Email
- Check your email inbox
- Look for 6-digit verification code
- Enter code on verification page
- Click "Verify Email"

#### 5. Login
- You'll be redirected to login
- Enter same email and password
- Click "Sign In"
- ✅ Success!

---

### Option 2: Register via AWS CLI (Advanced)

```powershell
# Step 1: Get User Pool ID
$userPoolId = aws cognito-idp list-user-pools --max-results 10 --query 'UserPools[?Name==`misra-platform-user-pool`].Id' --output text

# Step 2: Get Client ID
$clientId = aws cognito-idp list-user-pool-clients --user-pool-id $userPoolId --query 'UserPoolClients[0].ClientId' --output text

# Step 3: Register User
aws cognito-idp sign-up `
    --client-id $clientId `
    --username "your-email@example.com" `
    --password "TestUser123!" `
    --user-attributes Name=email,Value="your-email@example.com" Name=name,Value="Your Name"

# Step 4: Confirm User (Skip email verification)
aws cognito-idp admin-confirm-sign-up `
    --user-pool-id $userPoolId `
    --username "your-email@example.com"

# Step 5: Now you can login!
```

---

## 🔍 Detailed Troubleshooting

### Error 1: "User already exists"

**Cause**: Email is already registered

**Solutions**:
1. Try logging in with that email
2. Reset password if you forgot it
3. Use a different email address

**Check if user exists**:
```powershell
$userPoolId = aws cognito-idp list-user-pools --max-results 10 --query 'UserPools[?Name==`misra-platform-user-pool`].Id' --output text
aws cognito-idp list-users --user-pool-id $userPoolId
```

---

### Error 2: "Password does not meet requirements"

**Cause**: Password doesn't meet Cognito requirements

**Requirements**:
- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)

**Good Examples**:
- ✅ `TestUser123!`
- ✅ `MyPassword2024`
- ✅ `SecurePass456`
- ✅ `Welcome123`

**Bad Examples**:
- ❌ `password` (no uppercase, no number)
- ❌ `PASSWORD123` (no lowercase)
- ❌ `Password` (no number)
- ❌ `Pass1` (too short)

---

### Error 3: "Email not verified"

**Cause**: You registered but didn't verify email

**Solutions**:

**Option A: Verify via Web UI**
1. Go to login page
2. Click "Resend verification code"
3. Check email for new code
4. Enter code to verify

**Option B: Verify via AWS CLI**
```powershell
$userPoolId = aws cognito-idp list-user-pools --max-results 10 --query 'UserPools[?Name==`misra-platform-user-pool`].Id' --output text

aws cognito-idp admin-confirm-sign-up `
    --user-pool-id $userPoolId `
    --username "your-email@example.com"
```

---

### Error 4: "Verification code not received"

**Cause**: Email delivery delay or spam filter

**Solutions**:
1. **Check spam/junk folder**
2. **Wait 5-10 minutes** (email can be delayed)
3. **Click "Resend"** on verification page
4. **Use AWS CLI** to manually confirm (see Option B above)
5. **Check email configuration**:
   ```powershell
   aws cognito-idp describe-user-pool --user-pool-id YOUR_POOL_ID --query 'UserPool.EmailConfiguration'
   ```

---

### Error 5: "401 Unauthorized" after login

**Cause**: Token issue or session expired

**Solutions**:
1. **Clear browser cache and cookies**
2. **Try incognito/private mode**
3. **Check if Cognito is working**:
   ```powershell
   aws cognito-idp list-user-pools --max-results 10
   ```
4. **Verify API Gateway is accessible**:
   ```powershell
   curl https://7r9qmrftc6.execute-api.us-east-1.amazonaws.com/auth/login
   ```

---

### Error 6: "Cannot connect to API"

**Cause**: API Gateway or Lambda issues

**Solutions**:
1. **Verify Lambda functions are active**:
   ```powershell
   .\verify-deployment.ps1
   ```

2. **Check login Lambda logs**:
   ```powershell
   aws logs tail /aws/lambda/misra-platform-login --follow
   ```

3. **Test API Gateway**:
   ```powershell
   curl https://7r9qmrftc6.execute-api.us-east-1.amazonaws.com/health
   ```

---

## 🎯 Step-by-Step Verification

Run these commands to verify everything is working:

### 1. Check Cognito User Pool
```powershell
aws cognito-idp list-user-pools --max-results 10
```
**Expected**: Should show `misra-platform-user-pool`

### 2. Check Lambda Functions
```powershell
aws lambda list-functions --query 'Functions[?contains(FunctionName, `misra-platform`)].FunctionName'
```
**Expected**: Should show `misra-platform-login` and other functions

### 3. Check API Gateway
```powershell
aws apigatewayv2 get-apis --query 'Items[?Name==`misra-platform-api`]'
```
**Expected**: Should show API with ID `7r9qmrftc6`

### 4. Test Login Endpoint
```powershell
curl -X POST https://7r9qmrftc6.execute-api.us-east-1.amazonaws.com/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"test@example.com","password":"test"}'
```
**Expected**: Should return 401 (expected for wrong credentials) or 200 (if credentials are correct)

---

## 📋 Registration Checklist

Complete this checklist to successfully register and login:

- [ ] Navigate to https://aibts-platform.vercel.app/register
- [ ] Fill in Full Name
- [ ] Fill in Email (valid email you can access)
- [ ] Create Password (8+ chars, uppercase, lowercase, number)
- [ ] Confirm Password (must match)
- [ ] Click "Sign Up"
- [ ] Check email inbox (and spam folder)
- [ ] Find 6-digit verification code
- [ ] Enter verification code
- [ ] Click "Verify Email"
- [ ] Redirected to login page
- [ ] Enter same email and password
- [ ] Click "Sign In"
- [ ] ✅ Successfully logged in!

---

## 🚀 After Successful Login

Once logged in, you should see:

1. **Dashboard** page
2. **Sidebar** with navigation
3. **Projects** menu item
4. **Test Suites** menu item
5. **Test Cases** menu item
6. **Test Executions** menu item

Now you can start creating projects and tests!

---

## 💡 Pro Tips

1. **Use a real email**: You need to verify it
2. **Save your password**: Use a password manager
3. **Test with temporary email**: Use services like temp-mail.org for testing
4. **Multiple test accounts**: You can register multiple accounts

---

## 🔐 Security Notes

- Passwords are hashed and stored securely in AWS Cognito
- Email verification is required for security
- Sessions expire after 1 hour of inactivity
- You can reset your password if forgotten

---

## 📞 Still Need Help?

### Check CloudWatch Logs
```powershell
# Login function logs
aws logs tail /aws/lambda/misra-platform-login --follow

# All Lambda errors
aws logs filter-log-events `
    --log-group-name /aws/lambda/misra-platform-login `
    --filter-pattern "ERROR" `
    --max-items 10
```

### Verify User Status
```powershell
$userPoolId = aws cognito-idp list-user-pools --max-results 10 --query 'UserPools[?Name==`misra-platform-user-pool`].Id' --output text

aws cognito-idp admin-get-user `
    --user-pool-id $userPoolId `
    --username "your-email@example.com"
```

### Reset User Password (if needed)
```powershell
aws cognito-idp admin-set-user-password `
    --user-pool-id $userPoolId `
    --username "your-email@example.com" `
    --password "NewPassword123!" `
    --permanent
```

---

## 📚 Related Guides

After successful login, check these guides:
- `COMPLETE_TESTING_GUIDE_WITH_FIELDS.md` - Complete testing guide
- `APP_TESTING_EXAMPLES.md` - Test examples
- `TEST_COMPLETE_WORKFLOW.md` - End-to-end workflow

---

**Status**: Registration required  
**Action**: Register at https://aibts-platform.vercel.app/register  
**Time**: 2-3 minutes

