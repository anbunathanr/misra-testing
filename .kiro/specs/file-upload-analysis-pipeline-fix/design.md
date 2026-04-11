# Design Document: File Upload Analysis Pipeline Fix

## Overview

This design addresses six critical bugs in the file upload → analysis → results pipeline. The fixes ensure files are properly built, validated, queued, stored, and displayed throughout the system.

---

## Bug 1.1: Lambda Build Script Not Including upload.ts

### Problem
The esbuild.lambda.js build script does not include `upload.ts` in the Lambda build process, causing deployments to use stale code.

### Root Cause
The build script scans for handler files but may not properly include all TypeScript files in the functions directory, or the upload.ts file is not being recognized as a handler.

### Solution
**Update esbuild.lambda.js to explicitly include upload.ts:**
- Verify that `upload.ts` is recognized as a handler file (ends with `.ts`, not `.test.ts` or `.spec.ts`)
- Ensure the build process includes all handler files from the file/upload directory
- Add explicit logging to confirm upload.ts is being built
- Verify the bundled output includes all required dependencies

### Implementation Details
1. Modify the handler file detection logic to ensure `.ts` files are properly identified
2. Add console logging to show which files are being built
3. Verify the output directory contains the built upload handler
4. Test that the built Lambda includes all required imports and dependencies

### Expected Behavior
- When `npm run build:lambdas` executes, upload.ts is included in the build output
- The dist-lambdas/file/upload/index.js file is created with current code
- The dist-zips/file/upload/index.zip contains the bundled handler

---

## Bug 1.2: FileMetadataValidator Rejecting Cognito UUIDs

### Problem
Cognito user IDs are 36-character UUIDs (e.g., `550e8400-e29b-41d4-a716-446655440000`), but FileMetadataValidator only allows 3-32 characters for user_id, causing validation failures.

### Root Cause
The validator's `validateUserId()` method uses regex `/^[a-zA-Z0-9-_@.]{3,32}$/` which limits user_id to 32 characters maximum.

### Solution
**Update FileMetadataValidator to accept Cognito UUIDs:**
- Change user_id validation regex to allow up to 128 characters
- Support alphanumeric characters, hyphens, underscores, @ symbols, and dots
- Maintain backward compatibility with existing user ID formats

### Implementation Details
1. Update regex pattern in `validateUserId()` method:
   - Old: `/^[a-zA-Z0-9-_@.]{3,32}$/`
   - New: `/^[a-zA-Z0-9-_@.]{3,128}$/`
2. This accommodates:
   - Cognito sub UUIDs (36 chars): `550e8400-e29b-41d4-a716-446655440000`
   - Custom user IDs up to 128 chars
   - Existing 3-32 char IDs (backward compatible)

### Expected Behavior
- Cognito UUIDs (36 chars) pass validation
- Custom user IDs up to 128 chars pass validation
- User IDs shorter than 3 chars still fail
- User IDs longer than 128 chars fail

---

## Bug 1.3: Incomplete SQS Messages Missing fileName and s3Key

### Problem
The upload Lambda sends SQS messages to trigger analysis, but the messages are missing `fileName` and `s3Key` fields required by the analyze-file Lambda, causing analysis to fail.

### Root Cause
The SQS message payload in upload.ts is incomplete. The analyze-file Lambda expects: `fileId`, `fileName`, `s3Key`, `language`, `userId`, `organizationId`.

### Solution
**Ensure SQS message includes all required fields:**
- Include `fileName` from the upload request
- Include `s3Key` generated during presigned URL creation
- Include `language` derived from file extension
- Include `userId` and `organizationId` from authenticated user context

### Implementation Details
1. In upload.ts, build complete SQS message:
   ```
   {
     fileId: uploadResponse.fileId,
     fileName: uploadRequest.fileName,
     s3Key: s3Key,
     language: language,
     userId: user.userId,
     organizationId: user.organizationId || 'default-org'
   }
   ```
2. Ensure s3Key is consistent between FileMetadata record and SQS message
3. Derive language from file extension: `.c`/`.h` → 'C', `.cpp`/`.hpp` → 'CPP'

### Expected Behavior
- SQS message contains all 6 required fields
- analyze-file Lambda can parse message without errors
- fileName and s3Key are available for analysis processing

---

## Bug 1.4: Wrong DynamoDB Table References

### Problem
The analyze-file Lambda references `FILE_METADATA_TABLE` environment variable set to `"misra-platform-file-metadata-dev"`, but the actual deployed table is named `"FileMetadata-dev"`.

### Root Cause
Environment variable default value doesn't match the actual table name created by CDK infrastructure. The FileMetadataTable construct creates tables named `FileMetadata-{environment}`.

### Solution
**Correct environment variable defaults and Lambda configuration:**
- Update analyze-file.ts default: `'misra-platform-file-metadata-dev'` → `'FileMetadata-dev'`
- Ensure Lambda environment variables are set correctly during CDK deployment
- Verify table names match between infrastructure and Lambda code

### Implementation Details
1. In analyze-file.ts, update line:
   ```typescript
   const fileMetadataTable = process.env.FILE_METADATA_TABLE || 'FileMetadata-dev';
   ```
2. In CDK stack, ensure Lambda functions receive correct environment variables:
   ```typescript
   environment: {
     FILE_METADATA_TABLE: fileMetadataTable.table.tableName,
     ANALYSIS_RESULTS_TABLE: analysisResultsTable.table.tableName
   }
   ```
3. Verify both upload.ts and analyze-file.ts use consistent table names

### Expected Behavior
- analyze-file Lambda can successfully update FileMetadata records
- UpdateItemCommand succeeds without "ResourceNotFoundException"
- File metadata status updates are persisted correctly

---

## Bug 1.5: Frontend State Loss on Tab Switch

### Problem
When a user uploads files in the "Upload Files" tab and switches to "Analysis Results" tab, the uploaded files disappear from view because FileUpload component uses local React state that resets on tab switch.

### Root Cause
FileUpload component maintains file list in local state (`useState`). When the component unmounts (tab switch), state is lost. The component doesn't fetch files from the backend API.

### Solution
**Use backend API to fetch and display files:**
- FileUpload component should display files from `useGetFilesQuery()` hook
- Remove reliance on local state for file persistence
- Fetch files from backend on component mount and when tab becomes active
- Display both uploaded files and analysis status from backend

### Implementation Details
1. In FileUpload.tsx:
   - Add `useGetFilesQuery()` hook to fetch files from backend
   - Display fetched files in addition to local upload state
   - Refresh file list after successful upload
   - Show analysis status from backend (pending, in_progress, completed, failed)

2. Ensure FileHistory.tsx continues to use `useGetFilesQuery()` for consistency

3. Both components should show the same file list from backend

### Expected Behavior
- Files uploaded in "Upload Files" tab remain visible when switching to "Analysis Results" tab
- File list is fetched from backend API, not local state
- Analysis status updates are reflected in real-time
- Switching tabs doesn't lose file data

---

## Bug 1.6: Empty Query Results from get-files Lambda

### Problem
The get-files Lambda returns empty results even when files have been uploaded, because it queries the wrong table or metadata was never written due to validation failure.

### Root Cause
Multiple potential causes:
1. FileMetadata records not created due to validator rejecting Cognito UUIDs (Bug 1.2)
2. get-files Lambda queries wrong table name
3. FileMetadataService.getUserFiles() uses incorrect table reference

### Solution
**Ensure get-files Lambda queries correct table and finds files:**
- Verify get-files Lambda uses correct FILE_METADATA_TABLE environment variable
- Ensure FileMetadataService queries the correct table
- Confirm FileMetadata records are created successfully (after fixing Bug 1.2)
- Use UserIndex GSI to query files by user_id

### Implementation Details
1. In get-files.ts:
   - Verify environment variable: `FILE_METADATA_TABLE` defaults to `'FileMetadata-dev'`
   - Use UserIndex GSI to query by user_id
   - Return all files for authenticated user

2. In FileMetadataService:
   - Ensure `getUserFiles()` method queries correct table
   - Use UserIndex for efficient user-based queries
   - Handle pagination with limit parameter

3. Verify DynamoDBClientWrapper uses correct table name

### Expected Behavior
- get-files Lambda returns all files for authenticated user
- Query uses UserIndex GSI for efficient lookup
- Results include file_id, filename, file_type, file_size, analysis_status, upload_timestamp
- Empty results only when user has no uploaded files

---

## Preservation Requirements

### 3.1 File Upload Success
- Presigned URLs continue to be generated with fileId, uploadUrl, downloadUrl, expiresIn
- S3 upload continues to work with presigned URLs
- File validation (extension, size) continues to work

### 3.2 File Validation
- Invalid file extensions continue to be rejected
- Files > 10MB continue to be rejected
- Empty files continue to be rejected
- Error messages remain clear and helpful

### 3.3 Analysis Processing
- MISRA analysis continues to run on valid files
- Analysis results continue to be stored in AnalysisResults table
- Violations continue to be detected and categorized

### 3.4 File Metadata Updates
- File metadata continues to be updated with violations_count, compliance_percentage, analysis_duration
- Status transitions continue: pending → in_progress → completed/failed

### 3.5 Frontend Polling
- Frontend continues to poll for file updates every 10 seconds
- Analysis progress continues to be reflected in real-time

### 3.6 Authentication
- Unauthenticated requests continue to return 401 Unauthorized
- User context continues to be extracted from Lambda Authorizer

### 3.7 Initial Status
- New files continue to have analysis_status = "pending"
- Status continues to transition to "in_progress" when analysis starts

### 3.8 Error Handling
- Failed analysis continues to set analysis_status = "failed"
- Error messages continue to be stored with error_timestamp

---

## Summary of Changes

| Bug | Component | Change | Impact |
|-----|-----------|--------|--------|
| 1.1 | esbuild.lambda.js | Verify upload.ts is included in build | Deployment uses current code |
| 1.2 | FileMetadataValidator | Increase user_id max length to 128 | Cognito UUIDs accepted |
| 1.3 | upload.ts | Include fileName, s3Key in SQS message | analyze-file Lambda receives complete data |
| 1.4 | analyze-file.ts | Fix table name default to 'FileMetadata-dev' | Metadata updates succeed |
| 1.5 | FileUpload.tsx | Use useGetFilesQuery() for file list | Files persist across tab switches |
| 1.6 | get-files.ts | Verify correct table and GSI usage | Query returns uploaded files |

