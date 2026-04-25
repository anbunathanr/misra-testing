# S3 File Upload Diagnostic Report

## Issue Summary
The workflow is failing at Step 3 (Analysis) with error: **"The specified key does not exist"**

This means the file was never actually uploaded to S3, even though:
- ✅ Frontend receives presigned URL from backend
- ✅ Frontend logs show successful S3 upload response
- ✅ Backend queues analysis with correct s3Key
- ❌ Lambda tries to download file from S3 and fails

## Root Cause Analysis

### The Handoff Problem
1. **Frontend uploads file to S3** using presigned URL
2. **Backend generates presigned URL** with s3Key: `users/{userId}/{fileId}/{fileName}`
3. **Frontend sends PUT request** to presigned URL
4. **Frontend logs show 200 OK response** (but file may not actually be in S3)
5. **Backend queues analysis** with the s3Key
6. **Lambda tries to download** from S3 using s3Key
7. **Lambda fails** with "The specified key does not exist"

### Possible Causes

#### 1. **Presigned URL Mismatch**
- Presigned URL is generated for one bucket/key
- Frontend is uploading to a different location
- **Check**: Compare presigned URL with actual S3 key format

#### 2. **File Content Not Being Sent**
- Frontend is sending empty or malformed file content
- S3 receives PUT request but with no body
- **Check**: Verify file content is being sent in request body

#### 3. **CORS Issue**
- S3 CORS policy doesn't allow PUT from frontend origin
- Request fails but returns 200 (browser caches response)
- **Check**: Verify CORS headers in S3 bucket configuration

#### 4. **Presigned URL Expiration**
- URL expires before file is uploaded
- **Check**: Verify URL expiration time (should be 15 minutes)

#### 5. **S3 Bucket Permissions**
- Lambda doesn't have GetObject permission on S3
- File exists but Lambda can't read it
- **Check**: Verify Lambda IAM role has s3:GetObject permission

## Diagnostic Steps

### Step 1: Verify Presigned URL Format
```
Expected format:
https://misra-files-{accountId}-us-east-1.s3.us-east-1.amazonaws.com/users/{userId}/{fileId}/{fileName}

From logs:
https://misra-files-976193236457-us-east-1.s3.us-east-1.amazonaws.com/users/b4b84448-2011-7073-9f57-b24d1658b14b/d55415f0-24ed-4cab-9fc1-e3e7c4ab8364/high_compliance.cpp
```

### Step 2: Check S3 Bucket for Uploaded Files
```bash
aws s3 ls s3://misra-files-976193236457-us-east-1/users/ --recursive
```

Expected output:
```
2024-04-25 12:34:56        1234 users/b4b84448-2011-7073-9f57-b24d1658b14b/d55415f0-24ed-4cab-9fc1-e3e7c4ab8364/high_compliance.cpp
```

### Step 3: Monitor Browser Network Tab
1. Open DevTools → Network tab
2. Run workflow
3. Look for PUT request to S3
4. Check:
   - Status code (should be 200)
   - Response headers (should include ETag)
   - Request body (should contain file content)

### Step 4: Check CloudWatch Logs
```
/aws/lambda/MisraPlatform-dev-UploadFunction
- Look for: "Presigned URL generated successfully"
- Look for: "s3Key" in logs

/aws/lambda/MisraPlatform-dev-AnalyzeFileFunction
- Look for: "Downloading file from S3"
- Look for: "Error downloading file from S3"
```

### Step 5: Verify Lambda IAM Permissions
Check that the AnalyzeFileFunction Lambda has:
```json
{
  "Effect": "Allow",
  "Action": [
    "s3:GetObject",
    "s3:GetObjectVersion"
  ],
  "Resource": "arn:aws:s3:::misra-files-*/*"
}
```

## Enhanced Logging Added

### Frontend Changes
- Added detailed S3 upload response logging
- Added file content preview logging
- Added error response body logging
- Added presigned URL prefix logging

### Backend Changes
- Already logs s3Key in upload response
- Already logs s3Key in SQS message
- Already logs S3 download attempt

## Next Steps

1. **Run workflow again** with new logging
2. **Check browser console** for detailed S3 upload response
3. **Check CloudWatch logs** for Lambda execution details
4. **Verify file exists in S3** using AWS CLI
5. **Check Lambda IAM permissions** if file exists but Lambda can't read it

## Test Command

```bash
# After running workflow, check if file exists in S3
aws s3 ls s3://misra-files-976193236457-us-east-1/users/b4b84448-2011-7073-9f57-b24d1658b14b/ --recursive

# If file exists, check Lambda permissions
aws iam get-role-policy --role-name MisraPlatform-dev-AnalyzeFileFunction --policy-name S3Access
```

## Expected Behavior After Fix

1. ✅ Frontend uploads file to S3 via presigned URL
2. ✅ File appears in S3 bucket at correct path
3. ✅ Backend queues analysis with correct s3Key
4. ✅ Lambda downloads file from S3 successfully
5. ✅ Analysis completes and results are returned
6. ✅ Workflow reaches 100% completion

## Current Status

- ✅ Backend code returns s3Key in upload response
- ✅ Frontend code captures s3Key from response
- ✅ Backend code sends s3Key in SQS message
- ✅ Lambda code uses s3Key to download from S3
- ⏳ **VERIFICATION NEEDED**: File actually exists in S3 after upload

