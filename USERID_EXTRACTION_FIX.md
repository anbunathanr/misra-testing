# UserId Extraction Fix for File Status Endpoint

## Problem
The `/files/{fileId}/status` endpoint was returning **401 Unauthorized** errors during the automated workflow, even though the user was properly authenticated.

## Root Cause
The `get-file-status.ts` Lambda function was trying to extract `userId` from the authorizer context incorrectly:
- It was looking for `event.requestContext?.authorizer?.claims?.sub` (REST API format)
- But AWS HTTP API passes authorizer context differently - directly as `event.requestContext?.authorizer?.userId`
- The function was failing to extract the userId and returning 401

## Solution
Updated `get-file-status.ts` to use the same `getUserFromContext()` utility function that the file upload function uses:

### Changes Made
1. **Import the utility**: Added `import { getUserFromContext } from '../../utils/auth-util';`
2. **Use the utility**: Replaced manual userId extraction with:
   ```typescript
   const user = await getUserFromContext(event);
   if (!user.userId) {
     return errorResponse(401, 'UNAUTHORIZED', 'User authentication required', correlationId);
   }
   const userId = user.userId;
   ```

### Why This Works
The `getUserFromContext()` utility handles multiple authorizer formats:
- **Primary**: Lambda Authorizer context (`event.requestContext?.authorizer?.userId`)
- **Fallback**: JWT token validation from Authorization header
- **Cognito JWT**: Extracts `sub` claim from Cognito tokens

This ensures compatibility with HTTP API's authorizer context format.

## Files Modified
- `packages/backend/src/functions/file/get-file-status.ts`

## Deployment Status
- ✅ Code changes committed and pushed to GitHub
- ⏳ Backend deployment in progress (CDK stack update)
- ⏳ Waiting for deployment to complete

## Testing
Once deployment completes, the workflow should:
1. ✅ Authenticate user successfully
2. ✅ Upload file to S3
3. ✅ Poll `/files/{fileId}/status` endpoint WITHOUT 401 errors
4. ✅ Retrieve analysis results
5. ✅ Display MISRA violations

## Next Steps
1. Wait for backend deployment to complete
2. Hard refresh browser (Ctrl+Shift+R)
3. Clear Local Storage
4. Test the complete automated workflow
5. Verify no 401 errors appear in console
