# Multi-Tenant Authentication Testing Guide

## Test Environment

- **Frontend**: http://localhost:3000
- **API Endpoint**: https://sxpdzk5j44.execute-api.us-east-1.amazonaws.com
- **Cognito User Pool**: us-east-1_uEQr80iZX

## Test Cases

### Test 1: New User Registration (First Time)
**Email**: `test-user-001@example.com`
**Expected Flow**:
1. Frontend calls `/auth/register` with email + generated password
2. Backend creates new Cognito user
3. Returns 201 (Created)
4. Frontend proceeds to OTP verification
5. OTP is fetched from email
6. OTP is verified
7. User is logged in

**Steps**:
1. Open http://localhost:3000
2. Click "Start Analysis" button
3. Enter email: `test-user-001@example.com`
4. Enter name: `Test User 001`
5. Click "Start Automated Workflow"
6. Monitor console logs for:
   - ✅ User registered successfully
   - ✅ OTP fetched successfully
   - ✅ OTP verified successfully
   - ✅ User logged in successfully

**Success Criteria**:
- No 409 errors
- No 401 errors
- Workflow completes successfully
- User is authenticated

---

### Test 2: Existing User (409 Handling)
**Email**: `sanjanar0011@gmail.com` (from previous tests)
**Expected Flow**:
1. Frontend calls `/auth/register` with email + generated password
2. Backend returns 409 (User Exists)
3. Frontend gracefully handles 409
4. Frontend proceeds to OTP verification with same password
5. OTP is fetched and verified
6. User is logged in

**Steps**:
1. Open http://localhost:3000
2. Click "Start Analysis" button
3. Enter email: `sanjanar0011@gmail.com`
4. Enter name: `Sanjana R`
5. Click "Start Automated Workflow"
6. Monitor console logs for:
   - ℹ️ User already exists
   - ✅ OTP fetched successfully
   - ✅ OTP verified successfully
   - ✅ User logged in successfully

**Success Criteria**:
- 409 error is handled gracefully (not shown to user)
- Workflow continues to OTP verification
- User is authenticated

---

### Test 3: Different Email Domain
**Email**: `user@company.co.uk`
**Expected Flow**:
1. New user registration
2. OTP verification
3. Successful login

**Steps**:
1. Open http://localhost:3000
2. Click "Start Analysis" button
3. Enter email: `user@company.co.uk`
4. Enter name: `Company User`
5. Click "Start Automated Workflow"
6. Monitor for successful completion

**Success Criteria**:
- System works with different email domains
- No domain-specific errors
- User is authenticated

---

### Test 4: Multiple Concurrent Users
**Emails**: 
- `user-a@test.com`
- `user-b@test.com`
- `user-c@test.com`

**Expected Flow**:
- Each user gets unique credentials
- Each user can authenticate independently
- No credential conflicts

**Steps**:
1. Open 3 browser tabs
2. In each tab, start workflow with different email
3. Monitor that each user authenticates independently

**Success Criteria**:
- Each user gets unique tokens
- No cross-user authentication issues
- All users can access their own data

---

## Monitoring

### Console Logs to Watch

**Success Indicators**:
```
✅ User registered successfully: [email]
✅ OTP fetched successfully: [OTP]
✅ OTP verified successfully
✅ User logged in successfully
🏁 Workflow finished, setting running to false
```

**Error Indicators**:
```
❌ Registration failed: [error]
❌ OTP fetch failed: [error]
❌ OTP verification failed: [error]
❌ Auto-login failed: [error]
```

### CloudWatch Logs

**Lambda Functions to Monitor**:
1. `misra-auth-register` - User registration
2. `misra-auth-verify-otp` - OTP verification
3. `misra-auth-auto-login` - Auto-login
4. `misra-auth-fetch-otp` - OTP fetching

**Log Patterns**:
- Look for correlation IDs to trace requests
- Check for Cognito API errors
- Monitor IAM permission errors

### API Responses

**Register Endpoint** (`POST /auth/register`):
```json
// Success (201)
{
  "userId": "cognito-user-id",
  "email": "user@example.com",
  "message": "User registered successfully",
  "requiresEmailVerification": true
}

// User Exists (409)
{
  "error": {
    "code": "USER_EXISTS",
    "message": "User with this email already exists"
  }
}
```

**Verify OTP Endpoint** (`POST /auth/verify-otp`):
```json
// Success (200)
{
  "success": true,
  "accessToken": "...",
  "idToken": "...",
  "refreshToken": "...",
  "message": "TOTP MFA verification completed successfully"
}

// Failure (400)
{
  "error": {
    "code": "OTP_VERIFICATION_FAILED",
    "message": "Invalid OTP code"
  }
}
```

**Auto-Login Endpoint** (`POST /auth/auto-login`):
```json
// Success (200)
{
  "accessToken": "...",
  "refreshToken": "...",
  "expiresIn": 3600,
  "user": {
    "userId": "...",
    "email": "user@example.com",
    "name": "User"
  }
}

// Failure (500)
{
  "error": {
    "code": "AUTO_LOGIN_FAILED",
    "message": "Authentication failed - no tokens returned from Cognito"
  }
}
```

---

## Troubleshooting

### Issue: 401 Unauthorized on Auto-Login
**Cause**: IAM permissions not applied
**Solution**: 
1. Verify CDK deployment completed
2. Check CloudFormation stack status
3. Verify IAM policy is attached to Lambda role

### Issue: 409 User Exists, but OTP verification fails
**Cause**: Password mismatch between registration and verification
**Solution**:
1. Ensure same password is used in both calls
2. Check if user password was changed in Cognito
3. Reset user password in Cognito console

### Issue: OTP not received in email
**Cause**: SES in Sandbox Mode or email not verified
**Solution**:
1. Check SES configuration
2. Verify email address in SES
3. Request production access from AWS

### Issue: TOTP verification fails
**Cause**: Time synchronization issue or invalid TOTP secret
**Solution**:
1. Check server time synchronization
2. Verify TOTP secret is correct
3. Check Cognito MFA settings

---

## Success Checklist

- [ ] Test 1: New user registration works
- [ ] Test 2: Existing user (409) handled gracefully
- [ ] Test 3: Different email domain works
- [ ] Test 4: Multiple concurrent users work
- [ ] Console logs show success messages
- [ ] CloudWatch logs show no errors
- [ ] API responses are correct
- [ ] Users can access protected endpoints
- [ ] Tokens are valid and signed by Cognito
- [ ] Multi-tenant isolation is maintained

---

**Last Updated**: April 22, 2026
**Status**: Ready for Testing
