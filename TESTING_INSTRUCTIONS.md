# Testing Instructions - Autonomous Authentication Workflow

## Current Status

✅ **All fixes deployed**:
- Simplified authentication flow
- Updated OTP verification endpoint
- User password reset to `TestPass123!@#`
- Lambda functions deployed to AWS

## Test Scenario 1: Existing User (sanjanar0011@gmail.com)

### Prerequisites
- Frontend running on http://localhost:3000
- Backend deployed to AWS
- User password reset to `TestPass123!@#`

### Test Steps

1. **Navigate to Automated Analysis Page**
   ```
   URL: http://localhost:3000/automated-analysis
   ```

2. **Enter User Details**
   ```
   Email: sanjanar0011@gmail.com
   Name: Sanjana
   ```

3. **Click "Start Automated Analysis"**

4. **Monitor Console Logs**
   ```
   Expected sequence:
   ✅ Auth progress: registering (20%)
   ✅ Registration returns 409 (user exists)
   ✅ Auth progress: fetching_otp (40%)
   ✅ OTP fetched successfully
   ✅ Auth progress: verifying_otp (60%)
   ✅ OTP verified successfully
   ✅ Auth progress: logging_in (80%)
   ✅ Real tokens obtained
   ✅ Auth progress: complete (100%)
   ✅ Authentication successful
   ```

5. **Verify File Upload**
   ```
   Expected:
   ✅ File upload succeeds (200 OK)
   ✅ Presigned URL obtained
   ✅ File uploaded to S3
   ```

6. **Verify Analysis**
   ```
   Expected:
   ✅ Analysis triggered
   ✅ Progress updates received
   ✅ Analysis completes
   ✅ Results displayed
   ```

### Success Criteria
- [ ] Authentication completes without errors
- [ ] File upload returns 200 OK (not 401)
- [ ] Analysis starts and completes
- [ ] Results are displayed correctly
- [ ] No errors in browser console

## Test Scenario 2: New User

### Test Steps

1. **Navigate to Automated Analysis Page**
   ```
   URL: http://localhost:3000/automated-analysis
   ```

2. **Enter Unique User Details**
   ```
   Email: test-user-$(date +%s)@example.com
   Name: Test User
   ```

3. **Click "Start Automated Analysis"**

4. **Monitor Console Logs**
   ```
   Expected sequence:
   ✅ Auth progress: registering (20%)
   ✅ Registration succeeds (200 OK)
   ✅ Auth progress: fetching_otp (40%)
   ✅ OTP fetched successfully
   ✅ Auth progress: verifying_otp (60%)
   ✅ OTP verified successfully
   ✅ Auth progress: logging_in (80%)
   ✅ Real tokens obtained
   ✅ Auth progress: complete (100%)
   ✅ Authentication successful
   ```

5. **Verify Complete Workflow**
   - [ ] File upload succeeds
   - [ ] Analysis completes
   - [ ] Results displayed

## Troubleshooting

### If Authentication Fails

#### Error: "Invalid email or password"
```
Cause: Password mismatch
Solution: 
1. Check user exists in Cognito console
2. Reset password to TestPass123!@#
3. Retry workflow
```

#### Error: "User not confirmed"
```
Cause: User created but not confirmed
Solution:
1. Check Cognito console → Users
2. Manually confirm user
3. Retry workflow
```

#### Error: "Auth flow not enabled"
```
Cause: Cognito User Pool Client doesn't have admin auth flows
Solution:
1. Check Cognito console → App clients
2. Enable ALLOW_ADMIN_USER_PASSWORD_AUTH
3. Redeploy
```

### If File Upload Fails (401)

#### Error: "401 Unauthorized"
```
Cause: Token validation failed
Solution:
1. Check CloudWatch logs for authorizer
2. Verify token format in Authorization header
3. Check token expiration
```

#### Error: "Failed to get upload URL"
```
Cause: File upload Lambda error
Solution:
1. Check CloudWatch logs for upload Lambda
2. Verify S3 bucket permissions
3. Check DynamoDB table access
```

### If Analysis Fails

#### Error: "Analysis failed"
```
Cause: Various possible causes
Solution:
1. Check CloudWatch logs for analyze-file Lambda
2. Verify file exists in S3
3. Check MISRA engine logs
4. Verify DynamoDB write permissions
```

## CloudWatch Logs to Monitor

### Key Log Groups
```
/aws/lambda/MisraPlatform-dev-RegisterFunction
/aws/lambda/MisraPlatform-dev-VerifyOtpFunction
/aws/lambda/MisraPlatform-dev-AutoLoginFunction
/aws/lambda/MisraPlatform-dev-UploadFunction
/aws/lambda/MisraPlatform-dev-AnalyzeFileFunction
/aws/lambda/MisraPlatform-dev-AuthorizerFunction
```

### Key Log Messages

#### Successful Authentication
```
[VerifyOtp] TOTP code verified successfully
[AutoLogin] Auto-login successful
[Authorizer] Token validation successful
```

#### Failed Authentication
```
[VerifyOtp] TOTP verification failed
[AutoLogin] Auto-login failed
[Authorizer] Token validation failed
```

## Performance Expectations

### Timing
- Authentication: 2-5 seconds
- OTP fetch: 1-3 seconds (with retries)
- File upload: 1-2 seconds
- Analysis: 10-30 seconds
- **Total workflow: 15-45 seconds**

### Resource Usage
- Lambda invocations: ~8-10
- DynamoDB writes: ~5-7
- S3 operations: 2
- Cognito operations: 4-5

## Success Indicators

When everything is working:
1. ✅ Workflow completes in 15-45 seconds
2. ✅ No 401 errors in file upload
3. ✅ Analysis results displayed correctly
4. ✅ CloudWatch logs show successful execution
5. ✅ No errors in browser console

## Test Results Template

```
Test Date: [DATE]
Test User: [EMAIL]
Test Type: [New/Existing]

Results:
- Registration: [PASS/FAIL]
- OTP Fetch: [PASS/FAIL]
- OTP Verification: [PASS/FAIL]
- Auto-Login: [PASS/FAIL]
- File Upload: [PASS/FAIL]
- Analysis: [PASS/FAIL]
- Results Display: [PASS/FAIL]

Total Time: [SECONDS]
Errors: [NONE/LIST]

Notes:
[ANY OBSERVATIONS]
```

## Next Steps After Testing

### If All Tests Pass ✅
1. Proceed to file upload optimization
2. Implement progress tracking
3. Add real-time updates
4. Optimize analysis performance
5. Deploy to production

### If Tests Fail ❌
1. Check CloudWatch logs
2. Review error messages
3. Verify AWS configuration
4. Check Cognito settings
5. Retry with debugging enabled

## Contact and Support

For issues:
1. Check CloudWatch logs first
2. Review error messages in browser console
3. Check this troubleshooting guide
4. Review code comments in modified files

## Quick Reference

### Test User Credentials
```
Email: sanjanar0011@gmail.com
Password: TestPass123!@#
Status: Existing user (409 on registration)
```

### API Endpoints
```
Register: POST /auth/register
Login: POST /auth/login
Verify OTP: POST /auth/verify-otp
Auto-Login: POST /auth/auto-login
Fetch OTP: POST /auth/fetch-otp
Upload: POST /files/upload
Analyze: POST /analysis/analyze
Results: GET /analysis/results/{fileId}
```

### Environment Variables
```
VITE_API_URL=https://sxpdzk5j44.execute-api.us-east-1.amazonaws.com
COGNITO_USER_POOL_ID=us-east-1_8H5k62Dxh
COGNITO_CLIENT_ID=k0kvhf70emgo0d6j0ljhck3d7
```

---

**Last Updated**: After email validation fix
**Status**: Ready for testing
**Deployment**: Complete ✅
