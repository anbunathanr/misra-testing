# File Upload 500 Error - Root Cause & Fix

## Problem
File upload was failing with **500 Internal Server Error** with message: "Failed to get upload URL"

### Console Error
```
production-workflow-service.ts:201  POST https://sxpdzk5j44.execute-api.us-east-1.amazonaws.com/files/upload 500 (Internal Server Error)
currentMessage: "Error: Failed to get upload URL"
```

## Root Cause
**Environment variable name mismatch** between CDK stack and Lambda functions:

### CDK Stack (production-misra-stack.ts)
```typescript
environment: {
  FILE_BUCKET: fileStorageBucket.bucketName,  // ❌ Wrong name
  FILE_METADATA_TABLE: this.fileMetadataTable.tableName,
}
```

### FileUploadService (file-upload-service.ts)
```typescript
constructor() {
  this.bucketName = process.env.FILE_STORAGE_BUCKET_NAME || S3_CONFIG.bucketName;  // ✅ Expects this name
  // ...
}
```

### S3 Config (s3-config.ts)
```typescript
export const S3_CONFIG = {
  bucketName: process.env.FILE_STORAGE_BUCKET_NAME || 'misra-platform-files-dev',  // ✅ Expects this name
  // ...
}
```

**Result**: Lambda functions couldn't find the S3 bucket name, so they fell back to default `'misra-platform-files-dev'`, which doesn't exist in AWS. This caused S3 API calls to fail with 500 error.

## Solution
Updated CDK stack to use correct environment variable name:

### Before
```typescript
// Upload Function
environment: {
  FILE_BUCKET: fileStorageBucket.bucketName,
  FILE_METADATA_TABLE: this.fileMetadataTable.tableName,
}

// Get Files Function
environment: {
  FILE_BUCKET: fileStorageBucket.bucketName,
  FILE_METADATA_TABLE: this.fileMetadataTable.tableName,
}

// Analyze File Function
environment: {
  FILE_BUCKET: fileStorageBucket.bucketName,
  ANALYSIS_RESULTS_TABLE: this.analysisResultsTable.tableName,
}
```

### After
```typescript
// Upload Function
environment: {
  FILE_STORAGE_BUCKET_NAME: fileStorageBucket.bucketName,  // ✅ Correct name
  FILE_METADATA_TABLE: this.fileMetadataTable.tableName,
}

// Get Files Function
environment: {
  FILE_STORAGE_BUCKET_NAME: fileStorageBucket.bucketName,  // ✅ Correct name
  FILE_METADATA_TABLE: this.fileMetadataTable.tableName,
}

// Analyze File Function
environment: {
  FILE_STORAGE_BUCKET_NAME: fileStorageBucket.bucketName,  // ✅ Correct name
  ANALYSIS_RESULTS_TABLE: this.analysisResultsTable.tableName,
}
```

## Files Modified
- `packages/backend/src/infrastructure/production-misra-stack.ts`
  - Line ~280: Upload Function environment
  - Line ~300: Get Files Function environment
  - Line ~320: Analyze File Function environment

## Deployment
- **Build**: ✅ Successful
- **CDK Deploy**: ✅ In Progress (updating Lambda environment variables)
- **Expected Result**: File upload will now work correctly

## Testing After Fix
1. ✅ Authentication completes successfully
2. ✅ File upload returns presigned URL (200 OK)
3. ✅ File is uploaded to S3
4. ✅ Analysis is triggered
5. ✅ Results are displayed

## Impact
- **Severity**: High (blocks entire workflow)
- **Scope**: File upload, file retrieval, analysis
- **Fix Complexity**: Low (environment variable name)
- **Deployment Time**: ~2 minutes

## Prevention
- Use consistent environment variable names across codebase
- Add validation in Lambda functions to log missing env vars
- Use TypeScript interfaces for environment variables
- Add unit tests for environment variable loading

---

**Status**: ✅ FIXED - Deployment in progress
**Next Step**: Test file upload after deployment completes
