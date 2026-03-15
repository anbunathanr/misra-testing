# Phase 5: Integration Testing Guide

## Overview

This guide provides step-by-step instructions for testing the complete AIBTS system after Phase 5 deployment.

## Prerequisites

- Backend deployed to AWS
- Frontend deployed to Vercel
- Hugging Face API token configured
- AWS Cognito User Pool created

## Testing Checklist

### 1. Pre-Deployment Verification

- [ ] Hugging Face token in AWS Secrets Manager
- [ ] Backend built successfully
- [ ] Frontend built successfully
- [ ] Environment variables configured
- [ ] CORS configured for Vercel URL

### 2. Automated Tests

Run the automated test script:

```powershell
.\test-phase5.ps1
```

This will test:
- ✅ Health endpoint
- ✅ CORS configuration
- ✅ Authentication required
- ✅ Frontend accessibility
- ✅ API response times
- ✅ Error handling

### 3. Manual End-to-End Testing

#### Test 3.1: User Registration

1. Navigate to https://aibts-platform.vercel.app/register
2. Fill in the registration form:
   - Full Name: "Test User"
   - Email: "test@example.com"
   - Password: "TestPass123"
   - Confirm Password: "TestPass123"
3. Click "Register"
4. **Expected**: Success message, redirect to login

**Verification**:
- [ ] Registration form displays correctly
- [ ] Password validation works
- [ ] Success message appears
- [ ] Redirected to login page
- [ ] User created in Cognito (check AWS Console)

#### Test 3.2: User Login

1. Navigate to https://aibts-platform.vercel.app/login
2. Enter credentials:
   - Email: "test@example.com"
   - Password: "TestPass123"
3. Click "Login"
4. **Expected**: Redirect to dashboard

**Verification**:
- [ ] Login form displays correctly
- [ ] Password visibility toggle works
- [ ] Success redirect to dashboard
- [ ] Token stored in localStorage
- [ ] User info displayed in header

#### Test 3.3: Create Project

1. From dashboard, click "Projects" in sidebar
2. Click "Create Project" button
3. Fill in project details:
   - Name: "Test Project"
   - Description: "Testing AIBTS system"
   - Base URL: "https://example.com"
4. Click "Create"
5. **Expected**: Project created, appears in list

**Verification**:
- [ ] Projects page loads
- [ ] Create form displays
- [ ] Project created successfully
- [ ] Project appears in list
- [ ] Project stored in DynamoDB

#### Test 3.4: Generate AI Test Cases

1. Navigate to "Test Cases" page
2. Click "Generate with AI" button
3. Fill in generation form:
   - Project: "Test Project"
   - URL: "https://example.com/login"
   - Description: "Test login functionality"
4. Click "Generate"
5. **Expected**: Test case generated, appears in list

**Verification**:
- [ ] AI generation form displays
- [ ] Loading state shows during generation
- [ ] Test case generated (may take 10-30 seconds)
- [ ] Test case appears in list
- [ ] Test case has valid steps
- [ ] Hugging Face API called (check CloudWatch logs)
- [ ] Cost tracked in DynamoDB

#### Test 3.5: Create Test Suite

1. Navigate to "Test Suites" page
2. Click "Create Suite" button
3. Fill in suite details:
   - Name: "Login Tests"
   - Description: "Test login functionality"
   - Project: "Test Project"
4. Add test cases to suite
5. Click "Create"
6. **Expected**: Suite created, appears in list

**Verification**:
- [ ] Test Suites page loads
- [ ] Create form displays
- [ ] Suite created successfully
- [ ] Suite appears in list
- [ ] Test cases linked to suite

#### Test 3.6: Execute Test Suite

1. From Test Suites page, click "Execute" on a suite
2. Wait for execution to complete
3. **Expected**: Execution starts, progress shown

**Verification**:
- [ ] Execution starts
- [ ] Progress indicator shows
- [ ] Execution completes (or fails gracefully)
- [ ] Results displayed
- [ ] Screenshots captured (if applicable)
- [ ] Execution stored in DynamoDB

#### Test 3.7: View Results

1. Navigate to "Test Executions" page
2. Click on an execution to view details
3. **Expected**: Detailed results displayed

**Verification**:
- [ ] Executions list displays
- [ ] Execution details load
- [ ] Pass/fail status shown
- [ ] Individual test results shown
- [ ] Screenshots viewable (if any)
- [ ] Execution time displayed

#### Test 3.8: Logout

1. Click user menu in header
2. Click "Logout"
3. **Expected**: Redirect to login, token cleared

**Verification**:
- [ ] Logout button works
- [ ] Redirected to login page
- [ ] Token removed from localStorage
- [ ] Cannot access protected routes
- [ ] Must login again to access dashboard

### 4. Error Scenario Testing

#### Test 4.1: Invalid Login

1. Try to login with wrong password
2. **Expected**: Error message displayed

**Verification**:
- [ ] Error message shows
- [ ] No redirect
- [ ] Form remains accessible

#### Test 4.2: Expired Token

1. Login successfully
2. Manually expire token (set expiration in past)
3. Try to make API call
4. **Expected**: Redirect to login

**Verification**:
- [ ] Token expiration detected
- [ ] Redirect to login
- [ ] Error message shown

#### Test 4.3: Network Failure

1. Disconnect network
2. Try to create project
3. **Expected**: Error message displayed

**Verification**:
- [ ] Network error detected
- [ ] User-friendly error message
- [ ] No crash or blank screen

#### Test 4.4: Rate Limit Exceeded

1. Make multiple AI generation requests quickly
2. **Expected**: Rate limit error after limit reached

**Verification**:
- [ ] Rate limit enforced
- [ ] Clear error message
- [ ] Remaining quota shown

### 5. Edge Case Testing

#### Test 5.1: Empty Data Sets

1. Try to create test suite with no test cases
2. **Expected**: Validation error

**Verification**:
- [ ] Validation prevents empty suite
- [ ] Error message clear

#### Test 5.2: Long Test Names

1. Try to create test with 300+ character name
2. **Expected**: Validation error or truncation

**Verification**:
- [ ] Long names handled gracefully
- [ ] No database errors

#### Test 5.3: Special Characters

1. Try to create project with name: `<script>alert('xss')</script>`
2. **Expected**: Input sanitized

**Verification**:
- [ ] XSS attempt blocked
- [ ] Input sanitized
- [ ] No script execution

#### Test 5.4: Concurrent Requests

1. Open two browser tabs
2. Create projects in both simultaneously
3. **Expected**: Both succeed

**Verification**:
- [ ] No race conditions
- [ ] Both projects created
- [ ] No data corruption

### 6. Performance Testing

#### Test 6.1: Frontend Load Time

1. Clear browser cache
2. Navigate to https://aibts-platform.vercel.app
3. Measure load time (use browser DevTools)
4. **Target**: <3 seconds

**Verification**:
- [ ] Initial load <3 seconds
- [ ] Bundle size <1MB
- [ ] Lazy loading works
- [ ] No console errors

#### Test 6.2: API Response Times

1. Make various API calls
2. Measure response times
3. **Target**: <2 seconds for CRUD operations

**Verification**:
- [ ] GET /projects <2s
- [ ] POST /projects <2s
- [ ] GET /test-cases <2s
- [ ] POST /test-cases <2s

#### Test 6.3: AI Generation Performance

1. Generate test case
2. Measure time from request to response
3. **Target**: <30 seconds

**Verification**:
- [ ] Generation completes <30s
- [ ] Loading state shown
- [ ] No timeout errors
- [ ] Result quality acceptable

### 7. Security Testing

#### Test 7.1: Authentication

1. Try to access /dashboard without login
2. **Expected**: Redirect to login

**Verification**:
- [ ] Protected routes require auth
- [ ] Redirect works
- [ ] No data leak

#### Test 7.2: Authorization

1. Try to access another user's project
2. **Expected**: 403 Forbidden

**Verification**:
- [ ] User isolation works
- [ ] Cannot access other user's data
- [ ] Proper error message

#### Test 7.3: Token Security

1. Inspect token in localStorage
2. Verify token format
3. **Expected**: JWT token, no sensitive data

**Verification**:
- [ ] Token is JWT
- [ ] No password in token
- [ ] Expiration set correctly

#### Test 7.4: API Key Security

1. Check CloudWatch logs
2. Verify API keys not logged
3. **Expected**: No API keys in logs

**Verification**:
- [ ] Hugging Face key not in logs
- [ ] AWS keys not in logs
- [ ] Secrets Manager used correctly

### 8. Monitoring and Logging

#### Test 8.1: CloudWatch Logs

```bash
# View AI generation logs
aws logs tail /aws/lambda/aibts-ai-generate --follow

# View API logs
aws logs tail /aws/lambda/aibts-projects-create --follow
```

**Verification**:
- [ ] Logs structured (JSON)
- [ ] Request IDs present
- [ ] Error logs detailed
- [ ] No sensitive data logged

#### Test 8.2: CloudWatch Metrics

1. Check Lambda metrics in AWS Console
2. Verify metrics collected
3. **Expected**: Invocations, errors, duration tracked

**Verification**:
- [ ] Invocation count tracked
- [ ] Error rate tracked
- [ ] Duration tracked
- [ ] No anomalies

#### Test 8.3: Cost Tracking

1. Check DynamoDB ai-usage table
2. Verify usage tracked
3. **Expected**: Costs calculated correctly

**Verification**:
- [ ] Usage records created
- [ ] Costs calculated
- [ ] Limits enforced
- [ ] Usage displayed in UI

## Test Results Template

Use this template to document test results:

```markdown
## Test Execution: [Date]

### Environment
- Frontend URL: https://aibts-platform.vercel.app
- API URL: https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com
- Tester: [Name]

### Results Summary
- Total Tests: X
- Passed: X
- Failed: X
- Skipped: X

### Failed Tests
1. [Test Name]
   - Expected: [Expected behavior]
   - Actual: [Actual behavior]
   - Error: [Error message]
   - Screenshot: [Link]

### Performance Metrics
- Frontend Load Time: X seconds
- API Response Time: X seconds
- AI Generation Time: X seconds

### Issues Found
1. [Issue description]
   - Severity: High/Medium/Low
   - Steps to reproduce: [Steps]
   - Workaround: [If any]

### Recommendations
1. [Recommendation]
2. [Recommendation]
```

## Troubleshooting

### Issue: Cannot register user

**Possible causes**:
- Cognito User Pool not deployed
- Email verification required but not configured
- Password doesn't meet policy

**Solution**:
1. Check Cognito User Pool exists
2. Verify email settings
3. Check password policy

### Issue: AI generation fails

**Possible causes**:
- Hugging Face API token invalid
- Rate limit exceeded
- Model cold start

**Solution**:
1. Verify token in Secrets Manager
2. Check Hugging Face dashboard for quota
3. Wait 30-60 seconds and retry

### Issue: CORS errors

**Possible causes**:
- Vercel URL not in CORS config
- API Gateway CORS not configured

**Solution**:
1. Update `minimal-stack.ts` with Vercel URL
2. Redeploy backend
3. Clear browser cache

### Issue: Token expired

**Possible causes**:
- Token lifetime too short
- No token refresh implemented

**Solution**:
1. Login again
2. Check token expiration in Cognito settings
3. Implement automatic refresh (future enhancement)

## Success Criteria

Phase 5 testing is complete when:

- [ ] All automated tests pass
- [ ] All manual tests pass
- [ ] No critical bugs found
- [ ] Performance meets targets
- [ ] Security review passed
- [ ] Documentation complete
- [ ] System ready for production

## Next Steps

After testing is complete:

1. Document all issues found
2. Fix critical issues
3. Re-test
4. Update documentation
5. Deploy to production
6. Set up monitoring
7. Create rollback plan

## Support

For issues or questions:
- Check CloudWatch logs
- Review DynamoDB tables
- Check AWS Console
- Review this guide

---

**Last Updated**: [Date]
**Version**: 1.0
**Status**: Ready for testing
