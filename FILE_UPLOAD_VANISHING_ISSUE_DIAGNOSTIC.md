# File Upload Vanishing Issue - Comprehensive Diagnostic & Fix

## Executive Summary

**Problem**: Files upload to S3 successfully (200 status) but vanish from UI when switching tabs. No analysis happens.

**Root Cause**: The `upload.ts` Lambda silently catches DynamoDB write errors, returning 200 OK even when metadata creation fails. When `get-files` queries the UserIndex, it finds no records because they were never written.

**Impact**: Users see successful uploads but files disappear, creating a broken user experience.

---

## Root Cause Analysis

### 1. The Silent Failure in upload.ts (Lines 95-103)

```typescript
try {
  // ... DynamoDB PutItem
  await dynamoClient.send(new PutItemCommand({...}));
  console.log(`FileMetadata record created...`);
} catch (metadataError) {
  console.error('Error creating FileMetadata record:', metadataError);
  // ❌ CRITICAL: No throw! Upload still returns 200 OK
}
```

**Problem**: The catch block only logs the error but doesn't throw. This means:
- DynamoDB write fails (permissions, table doesn't exist, network error, etc.)
- Error is logged but swallowed
- Upload handler continues and returns 200 OK
- Frontend thinks file is ready
- File metadata never exists in DynamoDB

### 2. The Query Chain That Fails

```
Frontend calls get-files
  ↓
get-files.ts calls fileMetadataService.getUserFiles()
  ↓
FileMetadataService.getUserFiles() queries UserIndex
  ↓
UserIndex queries by user_id (partition key)
  ↓
Returns empty array (no records exist)
  ↓
Frontend shows empty file list
  ↓
User sees "vanished" files
```

### 3. Why This Happens

**Scenario 1: IAM Permissions Missing**
- upload.ts Lambda doesn't have `dynamodb:PutItem` permission
- DynamoDB write fails with AccessDenied
- Error is caught and logged
- Upload returns 200 OK anyway

**Scenario 2: Table Doesn't Exist**
- FILE_METADATA_TABLE env var points to wrong table name
- PutItem fails with ResourceNotFoundException
- Error is caught and logged
- Upload returns 200 OK anyway

**Scenario 3: Network/Throttling Issues**
- DynamoDB is temporarily unavailable
- PutItem fails with ThrottlingException
- Error is caught and logged
- Upload returns 200 OK anyway

---

## Current Issues in Code

### Issue 1: Silent Error Catching (upload.ts:95-103)
**Severity**: CRITICAL
**Location**: `packages/backend/src/functions/file/upload.ts`
**Problem**: Metadata creation errors are silently caught
**Impact**: Files appear uploaded but don't exist in database

### Issue 2: No Error Context in Responses
**Severity**: HIGH
**Location**: `packages/backend/src/functions/file/upload.ts`
**Problem**: Error responses don't include fileId for debugging
**Impact**: Hard to trace which files failed

### Issue 3: SQS Message Sent Before Metadata Verified
**Severity**: HIGH
**Location**: `packages/backend/src/functions/file/upload.ts` (lines 105-125)
**Problem**: SQS message is sent even if metadata creation fails
**Impact**: Analysis job queued for non-existent file

### Issue 4: No Logging of Exact Failure Point
**Severity**: MEDIUM
**Location**: `packages/backend/src/functions/file/upload.ts`
**Problem**: Logs don't distinguish between different failure types
**Impact**: Hard to diagnose issues in production

### Issue 5: IAM Permissions Not Verified
**Severity**: HIGH
**Location**: `packages/backend/src/infrastructure/misra-platform-stack.ts` (line 776)
**Problem**: Need to verify upload Lambda has correct permissions
**Impact**: May not have permission to write to DynamoDB

---

## Verification Checklist

### ✓ IAM Permissions
- [ ] upload Lambda has `dynamodb:PutItem` on FileMetadata table
- [ ] upload Lambda has `sqs:SendMessage` on analysis queue
- [ ] upload Lambda has `s3:PutObject` on file storage bucket

### ✓ Environment Variables
- [ ] FILE_METADATA_TABLE is set correctly
- [ ] ANALYSIS_QUEUE_URL is set correctly
- [ ] AWS_REGION is set correctly

### ✓ DynamoDB Table
- [ ] FileMetadata table exists
- [ ] UserIndex GSI exists with user_id partition key
- [ ] Table has proper read/write capacity or on-demand billing

### ✓ S3 Bucket
- [ ] File storage bucket exists
- [ ] Upload Lambda can write to bucket
- [ ] Presigned URLs are generated correctly

---

## Fix Strategy

### Phase 1: Fix upload.ts Error Handling
1. Remove silent catch block
2. Throw error if metadata creation fails
3. Return 500 status code on metadata failure
4. Include fileId in error response

### Phase 2: Add Comprehensive Logging
1. Log before each operation
2. Log operation result
3. Log any errors with full context
4. Include fileId, userId, timestamp in all logs

### Phase 3: Verify IAM Permissions
1. Check stack.ts grants correct permissions
2. Verify upload Lambda role has DynamoDB access
3. Test permissions in deployment

### Phase 4: Add Validation
1. Verify metadata was written before sending SQS message
2. Add retry logic for transient failures
3. Add health checks for dependencies

### Phase 5: End-to-End Testing
1. Test successful upload flow
2. Test with missing IAM permissions
3. Test with missing environment variables
4. Test with DynamoDB throttling
5. Verify files appear in UI after upload

---

## Implementation Details

### Fix 1: Remove Silent Error Catching

**Before**:
```typescript
try {
  await dynamoClient.send(new PutItemCommand({...}));
  console.log(`FileMetadata record created...`);
} catch (metadataError) {
  console.error('Error creating FileMetadata record:', metadataError);
  // Silently continues!
}
```

**After**:
```typescript
try {
  console.log(`Creating FileMetadata for file ${uploadResponse.fileId}, user ${user.userId}`);
  await dynamoClient.send(new PutItemCommand({...}));
  console.log(`✓ FileMetadata record created successfully for file ${uploadResponse.fileId}`);
} catch (metadataError) {
  console.error(`✗ Failed to create FileMetadata for file ${uploadResponse.fileId}:`, metadataError);
  
  // Determine error type and return appropriate status
  if (metadataError instanceof Error) {
    if (metadataError.name === 'AccessDenied' || metadataError.message.includes('AccessDenied')) {
      return errorResponse(500, 'METADATA_PERMISSION_ERROR', 
        `Failed to save file metadata: Permission denied. FileId: ${uploadResponse.fileId}`);
    }
    if (metadataError.name === 'ResourceNotFoundException') {
      return errorResponse(500, 'METADATA_TABLE_ERROR', 
        `Failed to save file metadata: Table not found. FileId: ${uploadResponse.fileId}`);
    }
    if (metadataError.name === 'ThrottlingException') {
      return errorResponse(503, 'METADATA_THROTTLED', 
        `Failed to save file metadata: Service temporarily unavailable. FileId: ${uploadResponse.fileId}`);
    }
  }
  
  return errorResponse(500, 'METADATA_CREATION_FAILED', 
    `Failed to create file metadata. FileId: ${uploadResponse.fileId}. Error: ${metadataError instanceof Error ? metadataError.message : 'Unknown error'}`);
}
```

### Fix 2: Only Send SQS Message After Metadata Verified

**Before**:
```typescript
// Create metadata (may fail silently)
try { await dynamoClient.send(...); } catch { }

// Send SQS message (even if metadata failed!)
if (analysisQueueUrl) {
  try { await sqsClient.send(...); } catch { }
}
```

**After**:
```typescript
// Create metadata (will throw if fails)
console.log(`Creating FileMetadata for file ${uploadResponse.fileId}, user ${user.userId}`);
await dynamoClient.send(new PutItemCommand({...}));
console.log(`✓ FileMetadata record created successfully for file ${uploadResponse.fileId}`);

// Only send SQS message if metadata was successfully created
const analysisQueueUrl = process.env.ANALYSIS_QUEUE_URL;
if (analysisQueueUrl) {
  try {
    console.log(`Queuing analysis for file ${uploadResponse.fileId}, language: ${language}`);
    await sqsClient.send(new SendMessageCommand({...}));
    console.log(`✓ Analysis queued successfully for file ${uploadResponse.fileId}`);
  } catch (sqsError) {
    console.error(`✗ Failed to queue analysis for file ${uploadResponse.fileId}:`, sqsError);
    // Log but don't fail - metadata is already saved
    // Analysis can be triggered manually or via retry
  }
} else {
  console.warn('ANALYSIS_QUEUE_URL is not set - analysis will not be triggered automatically');
}
```

### Fix 3: Add Detailed Logging

Add logging at each step:
```typescript
console.log(`[UPLOAD] Starting file upload for user ${user.userId}`);
console.log(`[UPLOAD] File: ${uploadRequest.fileName}, Size: ${uploadRequest.fileSize} bytes`);
console.log(`[UPLOAD] Generated fileId: ${uploadResponse.fileId}`);
console.log(`[UPLOAD] S3 Key: ${s3Key}`);
console.log(`[UPLOAD] Creating metadata in DynamoDB table: ${FILE_METADATA_TABLE}`);
// ... operation ...
console.log(`[UPLOAD] ✓ Upload complete for file ${uploadResponse.fileId}`);
```

### Fix 4: Verify IAM Permissions in Stack

**Current** (line 776):
```typescript
fileMetadataTable.grantReadWriteData(fileUploadFunction);
```

**Verify**: This should grant:
- `dynamodb:PutItem`
- `dynamodb:GetItem`
- `dynamodb:UpdateItem`
- `dynamodb:Query`

Check that the role has these permissions by running:
```bash
aws iam get-role-policy --role-name <upload-lambda-role> --policy-name <policy-name>
```

---

## Testing Plan

### Test 1: Successful Upload
1. Upload valid C file
2. Verify 200 response with fileId
3. Verify file appears in get-files
4. Verify file appears in UI

### Test 2: Missing IAM Permissions
1. Remove DynamoDB permissions from upload Lambda
2. Upload file
3. Verify 500 error with METADATA_PERMISSION_ERROR
4. Verify file NOT in get-files
5. Verify error logged with fileId

### Test 3: Missing Environment Variable
1. Unset FILE_METADATA_TABLE
2. Upload file
3. Verify 500 error with METADATA_TABLE_ERROR
4. Verify error logged with fileId

### Test 4: DynamoDB Throttling
1. Simulate DynamoDB throttling
2. Upload file
3. Verify 503 error with METADATA_THROTTLED
4. Verify error logged with fileId

### Test 5: SQS Failure (Non-Critical)
1. Make SQS queue unavailable
2. Upload file
3. Verify 200 response (metadata saved)
4. Verify file appears in get-files
5. Verify SQS error logged but upload succeeds

---

## Deployment Steps

1. **Update upload.ts** with error handling fixes
2. **Add comprehensive logging** to all operations
3. **Verify IAM permissions** in stack.ts
4. **Deploy to dev environment**
5. **Run test suite** (all 5 tests above)
6. **Monitor CloudWatch logs** for errors
7. **Deploy to production** with monitoring

---

## Monitoring & Alerts

### CloudWatch Metrics to Monitor
- `FileUploadErrors` - Count of failed uploads
- `MetadataCreationErrors` - Count of metadata creation failures
- `SQSQueueErrors` - Count of SQS send failures
- `FileUploadLatency` - Time to complete upload

### CloudWatch Alarms to Create
- Alert if `MetadataCreationErrors` > 0 in 5 minutes
- Alert if `FileUploadErrors` > 5 in 5 minutes
- Alert if `FileUploadLatency` > 5 seconds

### Logs to Monitor
- Search for `✗ Failed to create FileMetadata` - indicates metadata failures
- Search for `METADATA_PERMISSION_ERROR` - indicates IAM issues
- Search for `METADATA_TABLE_ERROR` - indicates table doesn't exist

---

## Rollback Plan

If issues occur after deployment:
1. Revert upload.ts to previous version
2. Monitor error rates
3. Investigate root cause
4. Fix and redeploy

---

## Success Criteria

✓ Files no longer vanish after upload
✓ All uploads return appropriate status codes (200 or 5xx)
✓ Error responses include fileId for debugging
✓ All operations are logged with context
✓ IAM permissions are verified and correct
✓ End-to-end tests pass
✓ No silent failures in production
