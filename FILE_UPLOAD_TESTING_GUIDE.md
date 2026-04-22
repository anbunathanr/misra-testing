# File Upload Testing Guide - After Fix

## Overview
The file upload 500 error has been fixed by correcting the environment variable name from `FILE_BUCKET` to `FILE_STORAGE_BUCKET_NAME` in the CDK stack.

## Pre-Test Checklist
- [ ] CDK deployment completed successfully
- [ ] Lambda functions updated with new environment variables
- [ ] Frontend is running on http://localhost:3000
- [ ] Browser console is open (F12)
- [ ] CloudWatch Logs are accessible

## Test Scenario: Complete Autonomous Workflow

### Step 1: Start Workflow
1. Open http://localhost:3000
2. Click "Start Analysis" button
3. Enter email: `test-upload-001@example.com`
4. Enter name: `Test User`
5. Click "Start Automated Workflow"

### Step 2: Monitor Authentication
**Expected Logs**:
```
✅ User registered successfully
✅ OTP fetched successfully
✅ OTP verified successfully
✅ User logged in successfully
```

**Success Criteria**:
- No 409 errors (or handled gracefully)
- No 401 errors
- Access token is returned

### Step 3: Monitor File Upload
**Expected Logs**:
```
📞 Calling productionWorkflowService.startAutomatedWorkflow...
📊 Progress update: {currentStep: 1, completedSteps: Array(0), overallProgress: 0, ...}
📊 Progress update: {currentStep: 1, completedSteps: Array(1), overallProgress: 25, ...}
📊 Progress update: {currentStep: 2, completedSteps: Array(1), overallProgress: 25, ...}
```

**Success Criteria**:
- No 500 errors on `/files/upload`
- Response includes `uploadUrl` and `fileId`
- Progress updates show step 2 (file upload) completing

### Step 4: Monitor File Upload to S3
**Expected Behavior**:
- Frontend receives presigned URL
- File is uploaded to S3 using presigned URL
- S3 returns 200 OK

**Success Criteria**:
- No CORS errors
- No S3 permission errors
- File appears in S3 bucket

### Step 5: Monitor Analysis
**Expected Logs**:
```
📊 Progress update: {currentStep: 3, completedSteps: Array(2), overallProgress: 50, ...}
📊 Progress update: {currentStep: 4, completedSteps: Array(3), overallProgress: 75, ...}
📊 Progress update: {currentStep: 5, completedSteps: Array(4), overallProgress: 100, ...}
```

**Success Criteria**:
- Analysis Lambda is triggered
- MISRA rules are processed
- Results are returned

### Step 6: Monitor Results Display
**Expected Logs**:
```
✅ Workflow service returned: {success: true, ...}
🏁 Workflow finished, setting running to false
```

**Success Criteria**:
- Results dashboard displays
- Compliance score is shown
- Violations are listed

## Detailed Testing

### Test 1: File Upload Success
**Objective**: Verify file upload returns presigned URL

**Steps**:
1. Start workflow
2. Wait for authentication to complete
3. Check console for file upload response

**Expected Response**:
```json
{
  "fileId": "550e8400-e29b-41d4-a716-446655440000",
  "uploadUrl": "https://misra-files-982479882798-us-east-1.s3.amazonaws.com/...",
  "downloadUrl": "https://misra-files-982479882798-us-east-1.s3.amazonaws.com/...",
  "expiresIn": 900
}
```

**Success Criteria**:
- Status code: 200
- Response includes all required fields
- uploadUrl is valid and signed

### Test 2: S3 Upload Success
**Objective**: Verify file is uploaded to S3

**Steps**:
1. Complete file upload step
2. Check S3 bucket in AWS Console
3. Verify file exists at correct path

**Expected Path**:
```
s3://misra-files-982479882798-us-east-1/users/{userId}/{fileId}/{fileName}
```

**Success Criteria**:
- File exists in S3
- File size matches uploaded file
- Metadata is correct

### Test 3: Analysis Trigger
**Objective**: Verify analysis is triggered after upload

**Steps**:
1. Complete file upload
2. Monitor CloudWatch logs for analysis Lambda
3. Check analysis results in DynamoDB

**Expected Logs**:
```
[misra-analysis-analyze-file] Starting MISRA analysis
[misra-analysis-analyze-file] Processing file: {fileName}
[misra-analysis-analyze-file] Analysis completed: {violations: N}
```

**Success Criteria**:
- Analysis Lambda is invoked
- MISRA rules are processed
- Results are stored in DynamoDB

### Test 4: Multiple File Uploads
**Objective**: Verify system handles multiple uploads

**Steps**:
1. Complete first workflow
2. Start second workflow with different email
3. Verify both files are uploaded independently

**Success Criteria**:
- Both files are uploaded successfully
- Files are stored in separate S3 paths
- Each user's files are isolated

## CloudWatch Monitoring

### Lambda Logs to Check
1. **misra-file-upload**
   - Look for: "File upload completed successfully"
   - Error: "Failed to generate upload URL"

2. **misra-analysis-analyze-file**
   - Look for: "Analysis completed"
   - Error: "Failed to retrieve file content"

3. **misra-auth-auto-login**
   - Look for: "Auto-login successful"
   - Error: "Authentication failed"

### Key Metrics
- **Invocations**: Should increase with each upload
- **Errors**: Should be 0 after fix
- **Duration**: Upload should complete in <5 seconds
- **Throttles**: Should be 0

## Troubleshooting

### Issue: Still Getting 500 Error
**Cause**: Deployment not completed
**Solution**:
1. Check CloudFormation stack status
2. Verify Lambda environment variables in AWS Console
3. Check Lambda function code was updated

### Issue: File Upload Succeeds but Analysis Doesn't Start
**Cause**: SQS queue not configured
**Solution**:
1. Check if ANALYSIS_QUEUE_URL is set
2. Verify SQS queue exists
3. Check Lambda permissions for SQS

### Issue: File Uploaded but Not Found in S3
**Cause**: S3 bucket name mismatch
**Solution**:
1. Verify bucket name in Lambda environment
2. Check S3 bucket exists
3. Verify Lambda has S3 permissions

### Issue: Presigned URL Expires Too Quickly
**Cause**: Expiration time too short
**Solution**:
1. Check `getPresignedUrlExpiration('upload')` returns 900 (15 minutes)
2. Verify S3 config is correct
3. Check system time is synchronized

## Success Checklist

- [ ] Authentication completes without errors
- [ ] File upload returns 200 OK with presigned URL
- [ ] File is uploaded to S3 successfully
- [ ] Analysis Lambda is triggered
- [ ] MISRA rules are processed
- [ ] Results are displayed in dashboard
- [ ] Multiple users can upload files independently
- [ ] CloudWatch logs show no errors
- [ ] S3 bucket contains uploaded files
- [ ] DynamoDB contains analysis results

## Performance Expectations

| Step | Expected Time | Actual Time |
|------|---|---|
| Authentication | 5-10s | ___ |
| File Upload | 2-5s | ___ |
| S3 Upload | 1-3s | ___ |
| Analysis | 30-60s | ___ |
| Results Display | 1-2s | ___ |
| **Total** | **40-80s** | ___ |

## Next Steps After Successful Testing

1. ✅ Test with multiple different emails
2. ✅ Test with different file types (.c, .cpp, .h, .hpp)
3. ✅ Test with different file sizes
4. ✅ Test error scenarios (invalid files, large files)
5. ✅ Performance testing under load
6. ✅ Security testing (malicious files, path traversal)

---

**Test Date**: ___________
**Tester**: ___________
**Result**: ✅ PASS / ❌ FAIL
**Notes**: ___________
