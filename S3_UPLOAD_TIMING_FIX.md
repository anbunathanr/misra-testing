# S3 Upload Timing Issue - Root Cause and Fix

## Problem Identified

The workflow fails with error: **"The specified key does not exist"** when Lambda tries to download the file from S3.

**Root Cause**: The frontend is queuing the analysis **BEFORE** the S3 file upload completes.

### Timeline of Events

1. ✅ Frontend gets presigned URL from backend
2. ✅ Frontend starts S3 upload (async fetch PUT request)
3. ❌ Frontend immediately queues analysis via SQS (without waiting for upload to complete)
4. ❌ Lambda receives SQS message and tries to download file
5. ❌ File doesn't exist yet (upload still in progress)
6. ❌ Lambda fails with "The specified key does not exist"
7. ✅ File eventually appears in S3 (upload completes)

### Verification

- ✅ Lambda has correct S3 permissions (verified IAM policy)
- ✅ S3 bucket exists and is accessible
- ✅ Files ARE being uploaded to S3 (verified with `aws s3 ls`)
- ✅ S3 key format is correct
- ❌ **Timing issue**: File doesn't exist when Lambda tries to read it

## Solution

The frontend needs to **wait for the S3 upload to complete** before queuing the analysis.

### Current Code (Broken)

```typescript
// production-workflow-service.ts - executeFileUploadStep
const s3UploadResponse = await fetch(uploadData.uploadUrl, {
  method: 'PUT',
  headers: { 'Content-Type': 'text/plain' },
  body: fileContent
});

if (!s3UploadResponse.ok) {
  throw new Error('Failed to upload file to S3');
}

// ❌ PROBLEM: Returns immediately without verifying upload completed
return {
  success: true,
  fileId: uploadData.fileId,
  s3Key: uploadData.s3Key,
  ...
};
```

### Fixed Code

```typescript
// production-workflow-service.ts - executeFileUploadStep
const s3UploadResponse = await fetch(uploadData.uploadUrl, {
  method: 'PUT',
  headers: { 'Content-Type': 'text/plain' },
  body: fileContent
});

if (!s3UploadResponse.ok) {
  const errorText = await s3UploadResponse.text();
  throw new Error(`S3 upload failed: ${s3UploadResponse.status} - ${errorText}`);
}

// ✅ VERIFY: Check that upload completed successfully
const etag = s3UploadResponse.headers.get('etag');
if (!etag) {
  throw new Error('S3 upload did not return ETag - upload may have failed');
}

logs.push(`✅ File uploaded successfully to S3 (ETag: ${etag})`);

// ✅ WAIT: Add a small delay to ensure S3 consistency
// S3 has eventual consistency - wait a bit before queuing analysis
await new Promise(resolve => setTimeout(resolve, 500));

return {
  success: true,
  fileId: uploadData.fileId,
  s3Key: uploadData.s3Key,
  ...
};
```

## Implementation Steps

### Step 1: Update Frontend Upload Verification

File: `packages/frontend/src/services/production-workflow-service.ts`

In `executeFileUploadStep` method, after the S3 upload:

```typescript
// Verify upload completed with ETag
const etag = s3UploadResponse.headers.get('etag');
if (!etag) {
  throw new Error('S3 upload verification failed - no ETag returned');
}

logs.push(`✅ File uploaded successfully to S3 (ETag: ${etag})`);

// Add delay for S3 eventual consistency
// S3 is eventually consistent - wait before queuing analysis
await new Promise(resolve => setTimeout(resolve, 500));
```

### Step 2: Add Retry Logic to Lambda

File: `packages/backend/src/functions/analysis/analyze-file.ts`

The Lambda already has retry logic for S3 downloads:

```typescript
const fileContent = await enhancedRetryService.executeWithRetry(
  () => downloadFileFromS3(s3Key),
  { 
    maxAttempts: 3,  // ✅ Already retries 3 times
    initialDelayMs: 1000,
    retryableErrors: ['timeout', 'ETIMEDOUT', 'ECONNRESET', 'NetworkError', 'ServiceUnavailable']
  }
);
```

**Need to add**: Include "NoSuchKey" error to retryable errors:

```typescript
retryableErrors: [
  'timeout', 
  'ETIMEDOUT', 
  'ECONNRESET', 
  'NetworkError', 
  'ServiceUnavailable',
  'NoSuchKey'  // ✅ Add this to retry on "key does not exist"
]
```

### Step 3: Improve Error Logging

The Lambda should log more details about S3 errors:

```typescript
catch (error) {
  console.error('Error downloading file from S3:', {
    bucket: bucketName,
    key: s3Key,
    error: error instanceof Error ? error.message : String(error),
    errorCode: (error as any)?.Code,
    errorName: (error as any)?.name,
    timestamp: new Date().toISOString()
  });
  throw new Error(`Failed to download file from S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
}
```

## Testing the Fix

### Test 1: Verify S3 Upload Completes

1. Run workflow
2. Check browser console for "ETag" in S3 upload response
3. Verify file appears in S3 within 1 second

### Test 2: Verify Lambda Can Download

1. Run workflow
2. Check CloudWatch logs for "File downloaded successfully"
3. Verify analysis completes

### Test 3: End-to-End Workflow

1. Run workflow with email: `sanjsr125@gmail.com`
2. Monitor progress: should reach 100%
3. Check results: should show MISRA violations

## Files to Modify

1. **packages/frontend/src/services/production-workflow-service.ts**
   - Add ETag verification
   - Add 500ms delay after S3 upload
   - Add better error logging

2. **packages/backend/src/functions/analysis/analyze-file.ts**
   - Add "NoSuchKey" to retryable errors
   - Improve error logging

## Expected Behavior After Fix

1. ✅ Frontend uploads file to S3
2. ✅ Frontend verifies upload with ETag
3. ✅ Frontend waits 500ms for S3 consistency
4. ✅ Frontend queues analysis
5. ✅ Lambda downloads file successfully
6. ✅ Analysis completes
7. ✅ Workflow reaches 100%

## Why This Happens

S3 has **eventual consistency** for new objects:
- When you PUT an object, it's immediately available in the region where you uploaded it
- However, there can be a brief delay (usually < 1 second) before it's fully consistent
- If Lambda tries to GET the object during this window, it might get "NoSuchKey"

The fix ensures:
1. Frontend waits for upload to complete (ETag verification)
2. Frontend adds a small delay for S3 consistency
3. Lambda retries if object isn't found yet

