# File Upload 500 Error - Quick Fix Reference

## The Problem
```
❌ File upload returns 500 error
❌ Error message: "Failed to get upload URL"
❌ Workflow stops at file upload step
```

## The Root Cause
```
CDK sets:        FILE_BUCKET
Code expects:    FILE_STORAGE_BUCKET_NAME
Result:          Environment variable not found → S3 fails → 500 error
```

## The Fix
**File**: `packages/backend/src/infrastructure/production-misra-stack.ts`

**Change**: Replace `FILE_BUCKET` with `FILE_STORAGE_BUCKET_NAME` in 3 Lambda functions:
1. Upload Function (line ~280)
2. Get Files Function (line ~300)
3. Analyze File Function (line ~320)

**Before**:
```typescript
environment: {
  FILE_BUCKET: fileStorageBucket.bucketName,
  // ...
}
```

**After**:
```typescript
environment: {
  FILE_STORAGE_BUCKET_NAME: fileStorageBucket.bucketName,
  // ...
}
```

## Deployment
```bash
npm run build          # Build Lambda functions
npx cdk deploy         # Deploy to AWS
```

## Testing
1. Start workflow
2. Verify authentication completes
3. Verify file upload returns presigned URL (200 OK)
4. Verify file appears in S3
5. Verify analysis completes
6. Verify results display

## Expected Result
✅ File upload works  
✅ Autonomous workflow completes  
✅ Results are displayed  

---

**Status**: FIXED ✅  
**Deployment**: IN PROGRESS 🔄  
**Testing**: PENDING ⏳
