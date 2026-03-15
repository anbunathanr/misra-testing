# Post-Deployment Testing Guide

**Date**: March 9, 2026  
**Status**: Ready for Testing

---

## 🎯 Testing Checklist

Follow these steps to verify your deployment is working correctly.

---

## Step 1: Verify Application Loads

### Action:
1. Open your browser (Chrome, Firefox, or Edge recommended)
2. Go to: **https://aibts-platform.vercel.app**
3. Wait for the page to load

### Expected Result:
- ✅ Page loads without errors
- ✅ Login/Register page is visible
- ✅ No blank white screen
- ✅ AIBTS branding/logo visible

### If Page Doesn't Load:
- Wait 30 seconds and refresh (Ctrl + R)
- Try in incognito/private window (Ctrl + Shift + N)
- Clear browser cache (Ctrl + Shift + Delete)

---

## Step 2: Check Browser Console

### Action:
1. Press **F12** to open Developer Tools
2. Click on the **Console** tab
3. Look for any error messages

### Expected Result:
- ✅ No red error messages
- ✅ No "UserPoolId and ClientId are required" error
- ✅ No CORS errors
- ✅ May see some info/log messages (that's normal)

### Common Errors to Check:

#### ✅ GOOD - No Errors:
```
[No errors in console]
```

#### ❌ BAD - Environment Variable Error:
```
Error: Both UserPoolId and ClientId are required
```
**Solution**: Environment variables not loaded. Check Vercel dashboard.

#### ❌ BAD - CORS Error:
```
Access to fetch at 'https://jtv0za1wb5...' has been blocked by CORS policy
```
**Solution**: CORS configuration issue. Contact support.

---

## Step 3: Test User Registration

### Action:
1. Click **"Register"** or **"Sign Up"** button
2. Fill in the registration form:
   - **Email**: Use a real email you can access
   - **Password**: At least 8 characters (e.g., `TestPass123!`)
3. Click **"Register"** or **"Sign Up"**

### Expected Result:
- ✅ Form submits without errors
- ✅ You see a message about verification code
- ✅ No error messages displayed

### Possible Outcomes:

#### ✅ SUCCESS:
```
"Please check your email for verification code"
or
"Registration successful! Check your email"
```

#### ❌ ERROR - Network Issue:
```
"Network error" or "Failed to register"
```
**Check**: Browser console for specific error
**Solution**: Verify API endpoint is correct

#### ❌ ERROR - Validation:
```
"Password must be at least 8 characters"
```
**Solution**: Use a stronger password

---

## Step 4: Check Email for Verification Code

### Action:
1. Open your email inbox
2. Look for email from: **no-reply@verificationemail.com** or similar
3. Subject: "Your verification code" or similar
4. Find the 6-digit verification code

### Expected Result:
- ✅ Email received within 1-2 minutes
- ✅ Email contains 6-digit code (e.g., 123456)

### If Email Not Received:
1. **Check spam/junk folder**
2. **Wait 5 minutes** (sometimes delayed)
3. **Check email address** was entered correctly
4. **Request new code** if available in the app

### Email Example:
```
Subject: Your verification code

Thank you for signing up to AIBTS Platform! 
Your verification code is 123456

This code will expire in 24 hours.
```

---

## Step 5: Complete Email Verification

### Action:
1. Go back to the application
2. Enter the 6-digit verification code
3. Click **"Verify"** or **"Confirm"**

### Expected Result:
- ✅ Code accepted
- ✅ Message: "Email verified successfully"
- ✅ Redirected to login page or dashboard

### Possible Outcomes:

#### ✅ SUCCESS:
```
"Email verified successfully!"
```
→ Proceed to login

#### ❌ ERROR - Invalid Code:
```
"Invalid verification code"
```
**Solution**: Double-check the code, try again

#### ❌ ERROR - Expired Code:
```
"Verification code has expired"
```
**Solution**: Request a new verification code

---

## Step 6: Test Login

### Action:
1. Go to login page (if not already there)
2. Enter your credentials:
   - **Email**: The email you registered with
   - **Password**: The password you used
3. Click **"Login"** or **"Sign In"**

### Expected Result:
- ✅ Login successful
- ✅ Redirected to dashboard
- ✅ You see the main application interface
- ✅ Your email/username displayed in header

### Possible Outcomes:

#### ✅ SUCCESS:
```
Redirected to dashboard
User menu shows your email
```

#### ❌ ERROR - Wrong Credentials:
```
"Incorrect username or password"
```
**Solution**: Check email and password, try again

#### ❌ ERROR - Not Verified:
```
"User is not confirmed"
```
**Solution**: Complete email verification first

---

## Step 7: Verify Dashboard Access

### Action:
1. After successful login, explore the dashboard
2. Check navigation menu
3. Try clicking different sections

### Expected Result:
- ✅ Dashboard loads with data or empty state
- ✅ Navigation menu works
- ✅ No errors in console
- ✅ Can access different pages

### What to Check:
- Header shows your email/username
- Sidebar navigation is visible
- Main content area displays
- No JavaScript errors in console

---

## Step 8: Test API Connectivity (Optional)

### Action:
1. Open Developer Tools (F12)
2. Go to **Network** tab
3. Refresh the page or navigate to different sections
4. Look for API calls to your backend

### Expected Result:
- ✅ API calls to `https://jtv0za1wb5.execute-api.us-east-1.amazonaws.com`
- ✅ Status codes: 200 (success) or 401 (unauthorized, but means API is reachable)
- ✅ No CORS errors
- ✅ Responses contain JSON data

### What to Look For:

#### ✅ GOOD - Successful API Call:
```
Request URL: https://jtv0za1wb5.execute-api.us-east-1.amazonaws.com/...
Status: 200 OK
Response: { "data": ... }
```

#### ✅ ACCEPTABLE - Unauthorized (means API is working):
```
Status: 401 Unauthorized
Response: { "message": "Unauthorized" }
```
This is normal if you're not logged in or token expired.

#### ❌ BAD - CORS Error:
```
Status: (failed)
Error: CORS policy blocked
```
**Solution**: CORS configuration issue

---

## Step 9: Test Logout (Optional)

### Action:
1. Find logout button (usually in header or user menu)
2. Click **"Logout"** or **"Sign Out"**

### Expected Result:
- ✅ Logged out successfully
- ✅ Redirected to login page
- ✅ Cannot access dashboard without logging in again

---

## Step 10: Verify AWS Resources (Optional)

### Action:
Check that user was created in AWS Cognito:

```powershell
aws cognito-idp list-users --user-pool-id us-east-1_XPMiT3cNj --region us-east-1
```

### Expected Result:
- ✅ Your user appears in the list
- ✅ Email is verified
- ✅ User status is CONFIRMED

---

## 🎉 Success Criteria

Your deployment is fully working when:

- [x] Application loads without errors
- [x] No console errors about environment variables
- [x] User registration works
- [x] Verification email received
- [x] Email verification successful
- [x] Login works
- [x] Dashboard accessible
- [x] API calls working
- [x] No CORS errors

---

## 🐛 Troubleshooting

### Issue 1: Application Not Loading
**Symptoms**: Blank page, infinite loading
**Solutions**:
1. Check Vercel deployment status
2. Clear browser cache
3. Try incognito window
4. Check browser console for errors

### Issue 2: Environment Variable Errors
**Symptoms**: "UserPoolId and ClientId are required"
**Solutions**:
1. Verify all 4 env vars set in Vercel
2. Redeploy the application
3. Clear browser cache
4. Hard refresh (Ctrl + Shift + R)

### Issue 3: Registration Fails
**Symptoms**: Error message on registration
**Solutions**:
1. Check browser console for specific error
2. Verify password meets requirements (8+ chars)
3. Try different email address
4. Check API endpoint is correct

### Issue 4: No Verification Email
**Symptoms**: Email not received after 5 minutes
**Solutions**:
1. Check spam/junk folder
2. Verify email address was correct
3. Check Cognito console for user status
4. Request new verification code

### Issue 5: Login Fails
**Symptoms**: "Incorrect username or password"
**Solutions**:
1. Verify email is correct
2. Check password (case-sensitive)
3. Ensure email was verified
4. Try password reset if available

### Issue 6: CORS Errors
**Symptoms**: API calls blocked by CORS policy
**Solutions**:
1. Verify CORS configuration in MinimalStack
2. Check Vercel URL is in allowed origins
3. Redeploy backend if needed

---

## 📊 Testing Results Template

Use this template to document your testing:

```
=== AIBTS Platform Testing Results ===
Date: March 9, 2026
Tester: [Your Name]

1. Application Load:        [ ] Pass  [ ] Fail
2. Console Errors:          [ ] Pass  [ ] Fail
3. User Registration:       [ ] Pass  [ ] Fail
4. Verification Email:      [ ] Pass  [ ] Fail
5. Email Verification:      [ ] Pass  [ ] Fail
6. Login:                   [ ] Pass  [ ] Fail
7. Dashboard Access:        [ ] Pass  [ ] Fail
8. API Connectivity:        [ ] Pass  [ ] Fail

Overall Status: [ ] SUCCESS  [ ] ISSUES FOUND

Notes:
_______________________________________
_______________________________________
_______________________________________
```

---

## 🎯 Next Steps After Testing

### If All Tests Pass:
1. ✅ Deployment is complete and working!
2. Start using the application
3. Invite team members
4. Monitor usage and costs
5. Set up monitoring/alerts (optional)

### If Tests Fail:
1. Document the specific error
2. Check troubleshooting section
3. Review browser console errors
4. Check Vercel deployment logs
5. Verify AWS resources are active

---

## 📞 Support

If you encounter issues:

1. **Check Documentation**:
   - AWS_INFRASTRUCTURE_STATUS.md
   - DEPLOYMENT_FINAL_STATUS.md
   - VERCEL_ENVIRONMENT_SETUP.md

2. **Verify Configuration**:
   - Vercel environment variables
   - AWS resources status
   - CORS configuration

3. **Check Logs**:
   - Browser console
   - Vercel deployment logs
   - AWS CloudWatch logs

---

**Testing Date**: March 9, 2026  
**Application URL**: https://aibts-platform.vercel.app  
**API Endpoint**: https://jtv0za1wb5.execute-api.us-east-1.amazonaws.com  
**Status**: Ready for Testing
