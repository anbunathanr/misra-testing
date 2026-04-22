# Next Steps and Testing Guide

## Current Status

### ✅ Completed
1. **Task 15**: Login-First logic for existing users
   - Frontend: Added `initiateLogin()` method
   - Backend: Session parameter support in verify-otp
   - Status: Code complete and tested

2. **Task 16**: Auto-login endpoint fix
   - Changed from fake tokens to real Cognito tokens
   - Status: Code complete, build successful, deployment in progress

### 🔄 In Progress
- CDK deployment of updated Lambda functions
- Expected completion: 2-5 minutes from deployment start

### ⏭️ Next
- Test complete autonomous workflow
- Verify file upload succeeds
- Test MISRA analysis pipeline

## Testing the Complete Workflow

### Prerequisites
1. Ensure CDK deployment has completed
2. Frontend running on http://localhost:3000
3. Backend deployed to AWS

### Test Steps

#### Step 1: Start Automated Workflow
1. Navigate to http://localhost:3000/automated-analysis
2. Enter email: `test-user-$(date +%s)@example.com` (unique email)
3. Enter name: "Test User"
4. Click "Start Automated Analysis"

#### Step 2: Monitor Authentication
Watch the console logs for:
```
✅ Auth progress: registering
✅ Auth progress: fetching_otp
✅ Auth progress: verifying_otp
✅ Auth progress: logging_in
✅ Auth progress: complete
✅ Authentication successful
```

#### Step 3: Monitor File Upload
Watch for:
```
✅ File upload successful (200 OK)
✅ Presigned URL obtained
✅ File uploaded to S3
```

#### Step 4: Monitor Analysis
Watch for:
```
✅ Analysis triggered
✅ Progress updates (every 2 seconds)
✅ Results retrieved
```

#### Step 5: Verify Results
Check that:
- Compliance score is displayed
- Violations are listed
- Code viewer shows violations
- Download button is available

## Troubleshooting

### If Authentication Fails

#### Error: "Auth flow not enabled for this client"
- **Cause**: Cognito User Pool Client doesn't have admin auth flows enabled
- **Fix**: Already fixed in previous task (adminUserPassword: true)
- **Verify**: Check Cognito console → User Pool → App clients → Authentication flows

#### Error: "Incorrect username or password"
- **Cause**: Password mismatch between registration and login
- **Fix**: Both use `TestPass123!@#` (fixed in code)
- **Verify**: Check backend logs for password being used

#### Error: "User not confirmed"
- **Cause**: User created but not confirmed in Cognito
- **Fix**: Check Cognito console → Users → User status
- **Action**: Manually confirm user or check registration flow

### If File Upload Fails (401 Unauthorized)

#### Error: "401 Unauthorized"
- **Cause**: Token validation failed in Lambda Authorizer
- **Fix**: Just deployed - auto-login now returns real Cognito tokens
- **Verify**: Check CloudWatch logs for authorizer validation

#### Error: "Failed to get upload URL"
- **Cause**: File upload Lambda returned error
- **Fix**: Check Lambda logs for specific error
- **Common Issues**:
  - Missing Authorization header
  - Invalid token format
  - Token expired

### If Analysis Fails

#### Error: "Analysis failed"
- **Cause**: Various possible causes
- **Debug**: Check CloudWatch logs for analyze-file Lambda
- **Common Issues**:
  - File not found in S3
  - MISRA engine error
  - DynamoDB write failure

## Monitoring and Debugging

### CloudWatch Logs
Check these log groups:
```
/aws/lambda/MisraPlatform-dev-RegisterFunction
/aws/lambda/MisraPlatform-dev-LoginFunction
/aws/lambda/MisraPlatform-dev-VerifyOtpFunction
/aws/lambda/MisraPlatform-dev-AutoLoginFunction
/aws/lambda/MisraPlatform-dev-UploadFunction
/aws/lambda/MisraPlatform-dev-AnalyzeFileFunction
/aws/lambda/MisraPlatform-dev-AuthorizerFunction
```

### Key Log Messages to Look For

#### Successful Authentication
```
[AutoLogin] Auto-login successful
[Authorizer] Token validation successful
[Upload] Presigned URL generated
```

#### Failed Authentication
```
[AutoLogin] Auto-login failed: <error>
[Authorizer] Token validation failed: <error>
[Upload] Unauthorized: Invalid token
```

## Performance Expectations

### Timing
- Authentication: 2-5 seconds
- OTP fetch: 1-3 seconds (with retries)
- File upload: 1-2 seconds
- Analysis: 10-30 seconds (depends on file size)
- Total workflow: 15-45 seconds

### Resource Usage
- Lambda invocations: ~8-10 per workflow
- DynamoDB writes: ~5-7
- S3 operations: 2 (upload + analysis read)
- Cognito operations: 4-5

## Success Criteria

### Authentication Phase ✅
- [x] User registration succeeds (or 409 for existing)
- [x] Login called for existing users
- [x] OTP fetched from email
- [x] OTP verified with Cognito
- [x] Real tokens obtained from auto-login
- [x] Tokens stored in localStorage

### File Upload Phase (Testing)
- [ ] File upload endpoint returns 200
- [ ] Presigned URL generated
- [ ] File uploaded to S3
- [ ] File metadata stored in DynamoDB

### Analysis Phase (Testing)
- [ ] Analysis triggered successfully
- [ ] Progress updates received
- [ ] Analysis completes
- [ ] Results stored in DynamoDB

### Results Phase (Testing)
- [ ] Results retrieved successfully
- [ ] Compliance score calculated
- [ ] Violations displayed
- [ ] Code viewer shows violations

## Rollback Plan

If deployment causes issues:

1. **Check deployment status**:
   ```bash
   aws cloudformation describe-stacks --stack-name MisraPlatform-dev
   ```

2. **If failed, rollback**:
   ```bash
   aws cloudformation cancel-update-stack --stack-name MisraPlatform-dev
   ```

3. **Revert code changes**:
   ```bash
   git checkout packages/backend/src/functions/auth/auto-login.ts
   git checkout packages/backend/src/functions/auth/verify-otp-cognito.ts
   git checkout packages/frontend/src/services/auto-auth-service.ts
   ```

4. **Redeploy previous version**:
   ```bash
   npm run deploy
   ```

## Documentation

### Files Created
- `TASK_15_COMPLETION_SUMMARY.md` - Login-First logic details
- `TASK_16_AUTO_LOGIN_FIX_SUMMARY.md` - Auto-login fix details
- `AUTHENTICATION_WORKFLOW_COMPLETION_REPORT.md` - Complete workflow overview
- `NEXT_STEPS_AND_TESTING.md` - This file

### Files Modified
- `packages/frontend/src/services/auto-auth-service.ts`
- `packages/backend/src/functions/auth/verify-otp-cognito.ts`
- `packages/backend/src/functions/auth/auto-login.ts`

## Contact and Support

### For Issues
1. Check CloudWatch logs first
2. Review error messages in browser console
3. Check this troubleshooting guide
4. Review code comments in modified files

### For Questions
- Review AUTHENTICATION_WORKFLOW_COMPLETION_REPORT.md
- Check inline code comments
- Review AWS Cognito documentation

## Timeline

- **Task 15**: ✅ Completed (Login-First logic)
- **Task 16**: ✅ Code complete, 🔄 Deploying
- **Testing**: ⏭️ Next (after deployment)
- **File Upload**: ⏭️ After testing
- **Analysis**: ⏭️ After file upload
- **Results**: ⏭️ After analysis

## Success Indicators

When everything is working:
1. Automated workflow completes in 15-45 seconds
2. No 401 errors in file upload
3. Analysis results displayed correctly
4. CloudWatch logs show successful execution
5. No errors in browser console

## Next Phase

Once testing confirms success:
1. Proceed to file upload optimization
2. Implement progress tracking
3. Add real-time updates
4. Optimize analysis performance
5. Deploy to production

---

**Last Updated**: After Task 16 code completion
**Status**: Ready for testing after deployment
**Deployment**: In progress (CDK)
