# Manual Testing Guide - Complete Today

## Overview
This guide will help you complete the remaining 5 manual testing tasks in ~30 minutes.

**System URLs:**
- Frontend: https://aibts-platform.vercel.app
- Backend API: https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com/

---

## Task 1: Test Registration Flow (5 minutes)
**Task ID: 10.3**

### Steps:
1. Open https://aibts-platform.vercel.app/register
2. Fill in the registration form:
   - Email: your-email@example.com
   - Name: Your Name
   - Password: (minimum 8 characters, must include uppercase, lowercase, and digits)
3. Click "Register"
4. Check your email for verification code
5. Enter the verification code
6. Verify success message appears

### Success Criteria:
- ✅ Registration form submits without errors
- ✅ Verification email received
- ✅ Account verified successfully
- ✅ User created in Cognito (check AWS Console)

### If Issues Occur:
- Check browser console for errors
- Check CloudWatch logs: `/aws/lambda/aibts-ai-*`
- Verify Cognito User Pool exists in AWS Console

---

## Task 2: Test Login Flow (5 minutes)
**Task ID: 11.4**

### Steps:
1. Go to https://aibts-platform.vercel.app/login
2. Enter your registered credentials:
   - Email: your-email@example.com
   - Password: (your password)
3. Click "Login"
4. Verify you're redirected to the dashboard
5. Check that your name appears in the header/sidebar
6. Open browser DevTools → Application → Local Storage
7. Verify token is stored

### Test Invalid Credentials:
1. Logout (if logged in)
2. Try to login with wrong password
3. Verify error message appears
4. Verify you're NOT redirected

### Success Criteria:
- ✅ Login succeeds with valid credentials
- ✅ Redirected to dashboard after login
- ✅ User info displayed correctly
- ✅ Token stored in localStorage
- ✅ Invalid credentials show error message

---

## Task 3: Test Authenticated API Calls (5 minutes)
**Task ID: 13.2**

### Steps:
1. Login to the application (if not already logged in)
2. Open browser DevTools → Network tab
3. Navigate to "Projects" page
4. Click "Create Project" or view existing projects
5. In Network tab, find the API request
6. Click on the request to view details
7. Check "Request Headers" section
8. Verify "Authorization" header is present with format: `Bearer <token>`
9. Check "Response" tab
10. Verify response is successful (status 200)

### Test Unauthenticated Access:
1. Open DevTools → Application → Local Storage
2. Delete the auth token
3. Try to navigate to Projects page
4. Verify you're redirected to login page

### Success Criteria:
- ✅ API requests include Authorization header
- ✅ Token format is correct (Bearer <token>)
- ✅ API calls succeed when authenticated
- ✅ Redirected to login when not authenticated

---

## Task 4: Execute Complete User Journey (10 minutes)
**Task ID: 19.2**

### Full Workflow Test:
1. **Register** (if not already done)
   - Register new user
   - Verify email
   
2. **Login**
   - Login with credentials
   - Verify dashboard loads

3. **Create Project**
   - Navigate to Projects
   - Click "Create Project"
   - Fill in:
     - Name: "Test Project"
     - Description: "My first test project"
     - Target URL: "https://example.com"
     - Environment: "dev"
   - Submit
   - Verify project appears in list

4. **Create Test Case**
   - Navigate to Test Cases
   - Click "Create Test Case"
   - Fill in test case details
   - Submit
   - Verify test case appears in list

5. **Create Test Suite**
   - Navigate to Test Suites
   - Click "Create Test Suite"
   - Fill in suite details
   - Add test cases to suite
   - Submit
   - Verify suite appears in list

6. **View Profile**
   - Navigate to Profile page
   - Verify user information displayed
   - Check email, name, role

7. **Logout**
   - Click logout button
   - Verify redirected to login page
   - Verify token cleared from localStorage

### Success Criteria:
- ✅ Complete workflow executes without errors
- ✅ All data persists correctly
- ✅ Navigation works smoothly
- ✅ Logout clears session properly

---

## Task 5: Execute Smoke Tests (5 minutes)
**Task ID: 23.4**

### Automated Tests:
Run the automated test script:
```powershell
.\test-phase5.ps1
```

### Manual Verification:
1. **Frontend Accessibility**
   - Open https://aibts-platform.vercel.app
   - Verify home page loads
   - Check for console errors (DevTools → Console)

2. **User Registration**
   - Already tested in Task 1 ✅

3. **User Login**
   - Already tested in Task 2 ✅

4. **API Integration**
   - Already tested in Task 3 ✅

5. **Monitor CloudWatch Logs**
   ```powershell
   # Check for errors in Lambda logs
   aws logs tail /aws/lambda/aibts-ai-generate --follow
   
   # Filter for errors
   aws logs filter-pattern "ERROR" --log-group-name /aws/lambda/aibts-ai-generate
   ```

### Success Criteria:
- ✅ Automated tests pass (5/8 expected)
- ✅ Frontend loads without errors
- ✅ No critical errors in CloudWatch logs
- ✅ All manual tests completed successfully

---

## Optional: Test AI Generation (if Hugging Face quota available)

### Steps:
1. Login to application
2. Navigate to Test Cases
3. Click "Generate with AI" (if available)
4. Enter target URL: https://example.com
5. Click "Generate"
6. Wait 10-30 seconds
7. Verify test case is generated
8. Check CloudWatch logs for AI API calls

### Success Criteria:
- ✅ AI generation completes successfully
- ✅ Test case quality is good
- ✅ Cost tracked in DynamoDB
- ✅ No errors in logs

---

## Completion Checklist

After completing all tasks, verify:

- [ ] Task 10.3 - Registration flow tested ✅
- [ ] Task 11.4 - Login flow tested ✅
- [ ] Task 13.2 - Authenticated API calls tested ✅
- [ ] Task 19.2 - Complete user journey tested ✅
- [ ] Task 23.4 - Smoke tests executed ✅

---

## Troubleshooting

### Registration Issues
- **Email not received**: Check spam folder, verify Cognito email settings
- **Verification fails**: Check Cognito User Pool in AWS Console
- **Password rejected**: Ensure 8+ chars with uppercase, lowercase, digits

### Login Issues
- **Invalid credentials**: Verify user is confirmed in Cognito
- **Token not stored**: Check browser localStorage permissions
- **Redirect fails**: Check React Router configuration

### API Issues
- **401 Unauthorized**: Token expired or invalid, try logging in again
- **CORS errors**: Verify API Gateway CORS configuration
- **500 errors**: Check CloudWatch logs for Lambda errors

### CloudWatch Commands
```powershell
# List log groups
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/aibts

# Tail logs
aws logs tail /aws/lambda/aibts-ai-generate --follow

# Filter errors
aws logs filter-pattern "ERROR" --log-group-name /aws/lambda/aibts-ai-generate --start-time 1h
```

---

## Next Steps After Testing

Once all tests pass:

1. **Update tasks.md** - Mark all tasks as complete
2. **Create completion report** - Document test results
3. **Configure monitoring** (optional) - Set up CloudWatch dashboards
4. **Plan next features** - Based on user feedback

---

## Support

If you encounter issues:
1. Check browser console for errors
2. Check CloudWatch logs for backend errors
3. Verify AWS resources exist (Cognito, Lambda, API Gateway)
4. Review deployment documentation

**Status**: Ready to test! 🚀
