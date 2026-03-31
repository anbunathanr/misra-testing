# Test Complete Workflow Guide

## ✅ Prerequisites Complete
- All 11 Lambda functions deployed and Active
- Frontend environment variables configured correctly
- API Gateway URL: https://7r9qmrftc6.execute-api.us-east-1.amazonaws.com
- Frontend URL: https://aibts-platform.vercel.app

---

## 🎯 Complete Workflow Test

### Step 1: Login to Platform (2 minutes)

1. Open browser and navigate to: https://aibts-platform.vercel.app
2. Click "Login" or navigate to `/login`
3. Enter your credentials:
   - Email: [your registered email]
   - Password: [your password]
4. Click "Sign In"
5. Verify you're redirected to the Dashboard

**Expected Result**: Successfully logged in and viewing Dashboard

---

### Step 2: Create a Project (3 minutes)

1. Navigate to "Projects" from the sidebar
2. Click "Create New Project" button
3. Fill in project details:
   - **Name**: "Test Execution Demo"
   - **Description**: "Testing the complete workflow"
   - **Status**: "Active"
4. Click "Create Project"

**Expected Result**: 
- Project created successfully
- New project appears in the projects list
- Success notification displayed

---

### Step 3: Create a Test Suite (3 minutes)

1. Navigate to "Test Suites" from the sidebar
2. Click "Create New Suite" button
3. Fill in suite details:
   - **Name**: "Login Flow Tests"
   - **Description**: "Tests for user login functionality"
   - **Project**: Select "Test Execution Demo"
4. Click "Create Suite"

**Expected Result**:
- Test suite created successfully
- New suite appears in the suites list
- Success notification displayed

---

### Step 4: Add Test Cases (5 minutes)

1. Navigate to "Test Cases" from the sidebar
2. Click "Create New Test Case" button
3. Create Test Case 1:
   - **Name**: "Valid Login Test"
   - **Description**: "Test login with valid credentials"
   - **Suite**: Select "Login Flow Tests"
   - **Steps**:
     ```json
     [
       {
         "action": "navigate",
         "url": "https://aibts-platform.vercel.app/login"
       },
       {
         "action": "type",
         "selector": "input[type='email']",
         "value": "test@example.com"
       },
       {
         "action": "type",
         "selector": "input[type='password']",
         "value": "Test123!"
       },
       {
         "action": "click",
         "selector": "button[type='submit']"
       },
       {
         "action": "waitForNavigation",
         "url": "/dashboard"
       }
     ]
     ```
4. Click "Create Test Case"

5. Create Test Case 2:
   - **Name**: "Invalid Login Test"
   - **Description**: "Test login with invalid credentials"
   - **Suite**: Select "Login Flow Tests"
   - **Steps**:
     ```json
     [
       {
         "action": "navigate",
         "url": "https://aibts-platform.vercel.app/login"
       },
       {
         "action": "type",
         "selector": "input[type='email']",
         "value": "invalid@example.com"
       },
       {
         "action": "type",
         "selector": "input[type='password']",
         "value": "wrong"
       },
       {
         "action": "click",
         "selector": "button[type='submit']"
       },
       {
         "action": "waitForSelector",
         "selector": ".error-message"
       }
     ]
     ```
6. Click "Create Test Case"

**Expected Result**:
- Both test cases created successfully
- Test cases appear in the list
- Test cases are linked to the suite

---

### Step 5: Trigger Test Execution (2 minutes)

1. Navigate to "Test Executions" from the sidebar
2. Click "Trigger Execution" or "Execute Suite" button
3. Select:
   - **Suite**: "Login Flow Tests"
   - **Environment**: "Production"
4. Click "Start Execution"

**Expected Result**:
- Execution triggered successfully
- Execution ID displayed
- Status shows "Queued" or "Running"
- Redirected to execution details page

---

### Step 6: Monitor Execution Status (3 minutes)

1. Stay on the execution details page
2. Watch the status update automatically:
   - Queued → Running → Completed
3. Observe:
   - Progress bar updating
   - Individual test case statuses
   - Real-time logs (if available)

**Expected Result**:
- Status updates in real-time
- Progress indicator shows completion percentage
- Individual test results appear as they complete

---

### Step 7: View Execution Results (5 minutes)

1. Once execution completes, review:
   - **Overall Status**: Pass/Fail
   - **Total Tests**: 2
   - **Passed**: X
   - **Failed**: Y
   - **Duration**: Execution time

2. Click on each test case to view:
   - Step-by-step execution details
   - Screenshots (if captured)
   - Error messages (if any)
   - Execution logs

3. Check the execution history:
   - Navigate to "Execution History"
   - Verify your execution appears in the list
   - Check timestamp and status

**Expected Result**:
- Detailed results for each test case
- Screenshots available for visual verification
- Clear pass/fail indicators
- Execution history updated

---

## 🔍 Verification Checklist

After completing the workflow, verify:

- [ ] Can login successfully
- [ ] Can create projects
- [ ] Can create test suites
- [ ] Can create test cases
- [ ] Can trigger test execution
- [ ] Execution status updates in real-time
- [ ] Can view execution results
- [ ] Can view execution history
- [ ] Screenshots are captured (if applicable)
- [ ] No errors in browser console
- [ ] No 500 errors from API

---

## 🐛 Troubleshooting

### Issue: Cannot trigger execution
**Solution**: 
- Check CloudWatch logs: `aws logs tail /aws/lambda/aibts-trigger-execution --follow`
- Verify JWT token is valid
- Check SQS queue permissions

### Issue: Execution stuck in "Queued" status
**Solution**:
- Check SQS trigger is configured: `aws lambda get-event-source-mapping --uuid e2807455-9ae4-4bf7-9e6b-5d7c5e1d9ffa`
- Check test executor logs: `aws logs tail /aws/lambda/aibts-test-executor --follow`
- Verify SQS queue has messages: `aws sqs get-queue-attributes --queue-url https://sqs.us-east-1.amazonaws.com/[account-id]/misra-platform-test-execution --attribute-names ApproximateNumberOfMessages`

### Issue: 401 Unauthorized errors
**Solution**:
- Logout and login again to refresh JWT token
- Check token expiration in browser DevTools
- Verify Cognito configuration

### Issue: Test execution fails
**Solution**:
- Check test case steps are valid JSON
- Verify selectors exist on target page
- Check browser service logs
- Review screenshot for visual debugging

---

## 📊 Success Metrics

A successful workflow test should show:

- ✅ All API calls return 200/201 (except expected 401s)
- ✅ Test execution completes within expected time
- ✅ Results are accurately recorded
- ✅ Screenshots are captured and accessible
- ✅ Execution history is updated
- ✅ No errors in CloudWatch logs

---

## 🎉 Next Steps After Successful Test

Once the complete workflow test passes:

1. **Add JWT Authorization to New Routes** (Optional)
   - Secure profile and analyze-file endpoints
   - See DEPLOYMENT_NEXT_STEPS.md for commands

2. **Set Up CloudWatch Alarms** (Recommended)
   - Monitor Lambda errors
   - Track execution failures
   - Alert on performance issues

3. **Performance Testing** (Optional)
   - Test with multiple concurrent executions
   - Verify system handles load
   - Optimize Lambda memory/timeout if needed

4. **Production Readiness**
   - Review security settings
   - Set up backup procedures
   - Document operational procedures
   - Train team on platform usage

---

**Platform Status**: Ready for production use! 🚀
