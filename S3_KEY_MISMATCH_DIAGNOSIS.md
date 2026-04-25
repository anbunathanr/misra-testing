# S3 File Key Mismatch Diagnosis - Task 16 (Continued)

## Problem Statement
File upload succeeds (reaches 50% progress), but Lambda analysis fails with:
```
Failed to download file from S3: The specified key does not exist.
```

## Root Cause Analysis

### Investigation Performed
1. **Traced S3 key generation flow**:
   - `file-upload-service.ts`: Generates s3Key using `getUserFileKey(userId, fileId, sanitizedFileName)`
   - Format: `users/{userId}/{fileId}/{sanitizedFileName}`
   - Filename is sanitized (unsafe chars replaced with underscores)

2. **Verified s3Key storage**:
   - `upload.ts`: Stores `uploadResponse.s3Key` in FileMetadata DynamoDB table
   - `upload.ts`: Queues analysis with same `uploadResponse.s3Key` in SQS message

3. **Confirmed s3Key usage in analysis**:
   - `analyze-file.ts`: Receives s3Key from SQS message
   - Uses s3Key directly in `downloadFileFromS3(s3Key)` function
   - S3 GetObjectCommand uses exact key from message

### Key Findings
- **S3 key generation is correct**: Uses sanitized filename consistently
- **S3 key storage is correct**: Stored in DynamoDB with proper format
- **S3 key passing is correct**: Passed through SQS message to Lambda
- **S3 key usage is correct**: Used directly in GetObjectCommand

### Likely Root Causes
1. **File not actually uploaded to S3**: Presigned URL upload may have failed silently
   - Frontend shows success but file never reached S3
   - S3 key is correct, but object doesn't exist at that key

2. **Presigned URL expiration**: Upload URL may have expired before file was uploaded
   - User took too long to upload
   - Network delay caused timeout

3. **S3 bucket permissions**: Lambda may lack GetObject permission
   - Already verified in CDK stack, but worth double-checking

4. **Bucket name mismatch**: Environment variable may be incorrect
   - `FILE_STORAGE_BUCKET_NAME` env var not set correctly

## Fixes Applied

### Enhanced Logging (Deployed)
Added detailed logging to diagnose the issue:

1. **In `file-upload-service.ts`**:
   - Logs s3Key generation with bucket name and region
   - Logs presigned URL generation success/failure

2. **In `upload.ts`**:
   - Logs s3Key being stored in FileMetadata
   - Logs s3Key being queued in SQS message

3. **In `analyze-file.ts`**:
   - Logs bucket name, key, and region before S3 GetObject
   - Logs S3 error code and name for better diagnostics
   - Logs file size on successful download

### Deployment Status
- ✅ Backend built successfully
- ✅ Backend deployed to AWS (CloudFormation UPDATE_COMPLETE)
- ✅ Changes committed and pushed to GitHub

## Next Steps for Testing

1. **Monitor CloudWatch Logs**:
   - Check upload function logs for s3Key being stored
   - Check analyze-file function logs for S3 download attempt
   - Look for error codes (NoSuchKey, AccessDenied, etc.)

2. **Test with New File Upload**:
   - Use email: `sanjsr125@gmail.com` (already authenticated)
   - Upload a test C file
   - Monitor logs in real-time
   - Check if file appears in S3 bucket

3. **Verify S3 Bucket**:
   - List objects in S3 bucket with prefix `users/`
   - Confirm file exists with expected key format
   - Check file size and metadata

4. **Check Environment Variables**:
   - Verify `FILE_STORAGE_BUCKET_NAME` is set correctly
   - Verify `AWS_REGION` is set to `us-east-1`

## Expected Behavior After Fix

1. **Upload Phase**:
   - Frontend gets presigned URL
   - Frontend uploads file to S3 using presigned URL
   - Backend stores s3Key in FileMetadata
   - Backend queues analysis in SQS

2. **Analysis Phase**:
   - Lambda receives SQS message with s3Key
   - Lambda logs: "Attempting to download from S3" with bucket, key, region
   - Lambda successfully downloads file from S3
   - Lambda logs: "File downloaded successfully from S3" with size
   - Analysis proceeds normally

3. **Expected Logs**:
   ```
   [upload.ts] Creating FileMetadata record with s3Key: users/{userId}/{fileId}/{fileName}
   [upload.ts] Queuing analysis with s3Key: users/{userId}/{fileId}/{fileName}
   [analyze-file.ts] Attempting to download from S3 with bucket: misra-platform-files-dev, key: users/{userId}/{fileId}/{fileName}
   [analyze-file.ts] File downloaded successfully from S3 with size: {bytes}
   ```

## Files Modified
- `packages/backend/src/functions/file/upload.ts` - Added s3Key logging
- `packages/backend/src/functions/analysis/analyze-file.ts` - Added detailed S3 error logging
- `packages/backend/src/services/file/file-upload-service.ts` - Already had logging

## Deployment Info
- **Timestamp**: 2026-04-25
- **Stack**: MisraPlatform-dev
- **Status**: UPDATE_COMPLETE
- **Region**: us-east-1
- **Commit**: ee7bbb0 - "Add detailed S3 key logging to diagnose file upload issue"

## Testing Instructions

1. **Clear browser cache**:
   ```
   Ctrl+Shift+R (hard refresh)
   Clear Local Storage
   ```

2. **Test workflow**:
   - Navigate to automated analysis page
   - Use email: `sanjsr125@gmail.com`
   - Upload a test C file
   - Monitor progress to 100%

3. **Check logs**:
   - CloudWatch Logs → `/aws/lambda/MisraPlatform-dev-UploadFunction`
   - CloudWatch Logs → `/aws/lambda/MisraPlatform-dev-AnalyzeFileFunction`
   - Look for s3Key and S3 download logs

4. **Verify S3**:
   ```bash
   aws s3 ls s3://misra-platform-files-dev/users/ --recursive
   ```

## Success Criteria
- ✅ File uploads successfully to S3
- ✅ s3Key is logged correctly in upload function
- ✅ s3Key is logged correctly in analyze function
- ✅ Lambda successfully downloads file from S3
- ✅ Analysis completes and reaches 100%
- ✅ Results are displayed in dashboard
