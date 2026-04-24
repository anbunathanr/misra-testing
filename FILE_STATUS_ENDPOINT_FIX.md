# File Status Endpoint Fix - 500 Error Resolution

## Problem
The `/files/{fileId}/status` endpoint was returning a 500 Internal Server Error when the frontend tried to poll for file analysis status.

## Root Cause
The `get-file-status.ts` Lambda function was attempting to retrieve file metadata from DynamoDB using only the partition key (`fileId`), but the FileMetadata table has a composite key structure:
- **Partition Key**: `fileId`
- **Sort Key**: `userId`

DynamoDB requires both keys to be provided in a `GetCommand` operation when a table has a composite key.

## Solution Implemented
Updated `packages/backend/src/functions/file/get-file-status.ts`:

1. **Extract userId from authorizer context**: Added code to extract the authenticated user's ID from the Lambda authorizer context
2. **Provide both keys to GetCommand**: Modified the DynamoDB query to include both `fileId` and `userId` in the Key object
3. **Enhanced error handling**: Added validation to ensure userId is present and improved logging

### Key Changes
```typescript
// Extract userId from authorizer context
const userId = event.requestContext?.authorizer?.claims?.sub || event.requestContext?.authorizer?.principalId;
if (!userId) {
  return errorResponse(401, 'UNAUTHORIZED', 'User authentication required', correlationId);
}

// Get file metadata with both partition and sort keys
const fileMetadata = await dynamoClient.send(new GetCommand({
  TableName: fileMetadataTable,
  Key: { fileId, userId }  // Both keys required
}));
```

## Deployment
- ✅ Backend built successfully
- ✅ Deployed to AWS (51.21s deployment time)
- ✅ GetFileStatusFunction updated
- ✅ Changes committed and pushed to GitHub

## Testing
The endpoint should now:
1. Accept authenticated requests to `/files/{fileId}/status`
2. Extract the user ID from the JWT token
3. Query DynamoDB with both fileId and userId
4. Return file metadata and analysis status
5. Include proper CORS headers in all responses

## Files Modified
- `packages/backend/src/functions/file/get-file-status.ts`

## Commit
- Message: "fix: extract userId from authorizer context in get-file-status endpoint - fixes 500 error"
- Hash: 8b34d67
