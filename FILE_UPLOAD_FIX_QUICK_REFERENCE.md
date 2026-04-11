# File Upload Fix - Quick Reference

## The Problem (In 30 Seconds)

Files upload to S3 successfully (200 status) but vanish from UI when switching tabs.

**Why**: `upload.ts` silently catches DynamoDB errors. Metadata never gets written. `get-files` finds nothing. Files appear to vanish.

## The Fix (In 30 Seconds)

Removed silent catch block. Now throws error if metadata creation fails. Returns 500 instead of 200. Error includes fileId for debugging.

## What Changed

### Before
```typescript
try {
  await dynamoClient.send(new PutItemCommand({...}));
} catch (metadataError) {
  console.error('Error creating FileMetadata record:', metadataError);
  // ❌ Silently continues, returns 200 OK
}
```

### After
```typescript
try {
  await dynamoClient.send(new PutItemCommand({...}));
} catch (metadataError) {
  console.error(`✗ CRITICAL: Failed to create FileMetadata for file ${uploadResponse.fileId}:`, metadataError);
  
  // Determine error type and return appropriate status
  if (errorName === 'AccessDenied') {
    return errorResponse(500, 'METADATA_PERMISSION_ERROR', 
      `Failed to save file metadata: Permission denied. FileId: ${uploadResponse.fileId}...`);
  }
  // ... other error types ...
  
  return errorResponse(500, 'METADATA_CREATION_FAILED', ...);
}
```

## Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| METADATA_PERMISSION_ERROR | 500 | Lambda lacks DynamoDB permissions |
| METADATA_TABLE_ERROR | 500 | DynamoDB table doesn't exist |
| METADATA_THROTTLED | 503 | DynamoDB temporarily unavailable |
| METADATA_VALIDATION_ERROR | 400 | Invalid metadata data |
| METADATA_CREATION_FAILED | 500 | Other metadata creation errors |

## Logging

All operations now logged with `[UPLOAD]` prefix:

```
[UPLOAD] ✓ FileMetadata record created successfully for file abc-123
[UPLOAD] ✗ CRITICAL: Failed to create FileMetadata for file abc-123
[UPLOAD] ✗ IAM Permission Error: Lambda does not have permission...
[UPLOAD] ✓ Upload complete for file abc-123
```

## Testing Checklist

- [ ] Successful upload returns 200 and file appears in UI
- [ ] Missing IAM permissions returns 500 with METADATA_PERMISSION_ERROR
- [ ] Missing table returns 500 with METADATA_TABLE_ERROR
- [ ] DynamoDB throttling returns 503 with METADATA_THROTTLED
- [ ] SQS failure returns 200 (metadata already saved)
- [ ] Invalid file type returns 400 before metadata creation
- [ ] File size validation returns 400 before metadata creation
- [ ] Files don't vanish when switching tabs

## Deployment

```bash
# Build
cd packages/backend
npm run build

# Deploy
npm run deploy -- --context environment=dev

# Verify
aws logs tail /aws/lambda/file-upload --follow
```

## Monitoring

```bash
# Watch for errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/file-upload \
  --filter-pattern "✗ CRITICAL"

# Watch for success
aws logs filter-log-events \
  --log-group-name /aws/lambda/file-upload \
  --filter-pattern "✓ Upload complete"
```

## Rollback

```bash
git checkout HEAD~1 packages/backend/src/functions/file/upload.ts
npm run build
npm run deploy -- --context environment=dev
```

## Key Files

- **Fixed file**: `packages/backend/src/functions/file/upload.ts`
- **Diagnostic**: `FILE_UPLOAD_VANISHING_ISSUE_DIAGNOSTIC.md`
- **Testing**: `FILE_UPLOAD_FIX_TESTING_GUIDE.md`
- **Deployment**: `FILE_UPLOAD_FIX_DEPLOYMENT_CHECKLIST.md`
- **Summary**: `FILE_UPLOAD_FIX_SUMMARY.md`

## Success Criteria

✓ Files no longer vanish
✓ Upload failures return 500 (not 200)
✓ Error responses include fileId
✓ All operations logged
✓ No silent failures

## Common Issues

### Issue: Files still vanishing
**Check**: CloudWatch logs for `✗ CRITICAL: Failed to create FileMetadata`

### Issue: Upload returns 500
**Check**: Error code in response (METADATA_PERMISSION_ERROR, METADATA_TABLE_ERROR, etc.)

### Issue: Analysis doesn't run
**Check**: ANALYSIS_QUEUE_URL environment variable is set

## Support

For detailed information:
- Root cause analysis: `FILE_UPLOAD_VANISHING_ISSUE_DIAGNOSTIC.md`
- Testing procedures: `FILE_UPLOAD_FIX_TESTING_GUIDE.md`
- Deployment steps: `FILE_UPLOAD_FIX_DEPLOYMENT_CHECKLIST.md`
