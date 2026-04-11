# Implementation Tasks: File Upload Analysis Pipeline Fix

## Phase 1: Backend Lambda Fixes

### 1.1 Fix Lambda Build Script
- [x] 1.1.1 Review esbuild.lambda.js handler detection logic
  - Verify that `.ts` files are properly identified as handlers
  - Confirm upload.ts is recognized (not filtered out)
  - Check that test files (*.test.ts, *.spec.ts) are excluded
  - _Requirements: 2.1_

- [x] 1.1.2 Add logging to build script
  - Log each function directory being processed
  - Log each handler file found
  - Log output directory for each handler
  - Verify upload.ts appears in logs
  - _Requirements: 2.1_

- [x] 1.1.3 Test build script execution
  - Run `npm run build:lambdas` in packages/backend
  - Verify dist-lambdas/file/upload/index.js is created
  - Verify dist-zips/file/upload/index.zip is created
  - Confirm file sizes are reasonable (not empty)
  - _Requirements: 2.1_

### 1.2 Fix FileMetadataValidator User ID Length
- [x] 1.2.1 Update validateUserId() method
  - Change regex from `/^[a-zA-Z0-9-_@.]{3,32}$/` to `/^[a-zA-Z0-9-_@.]{3,128}$/`
  - File: packages/backend/src/validation/file-metadata-validator.ts
  - Update error message to reflect new limit
  - _Requirements: 2.2_

- [x] 1.2.2 Test validator with Cognito UUIDs
  - Test with 36-char Cognito UUID: `550e8400-e29b-41d4-a716-446655440000`
  - Test with custom 50-char user ID
  - Test with 128-char user ID (max)
  - Test with 129-char user ID (should fail)
  - Test with 2-char user ID (should fail)
  - _Requirements: 2.2_

### 1.3 Fix SQS Message Payload in upload.ts
- [x] 1.3.1 Update SQS message to include all required fields
  - File: packages/backend/src/functions/file/upload.ts
  - Ensure message includes: fileId, fileName, s3Key, language, userId, organizationId
  - Derive language from file extension (.c/.h → 'C', .cpp/.hpp → 'CPP')
  - Use consistent s3Key between FileMetadata record and SQS message
  - _Requirements: 2.3_

- [x] 1.3.2 Verify SQS message format
  - Message body is valid JSON
  - All required fields are present
  - Field types are correct (string, not object)
  - organizationId defaults to 'default-org' if not provided
  - _Requirements: 2.3_

### 1.4 Fix DynamoDB Table References in analyze-file.ts
- [x] 1.4.1 Update FILE_METADATA_TABLE default value
  - File: packages/backend/src/functions/analysis/analyze-file.ts
  - Change from `'misra-platform-file-metadata-dev'` to `'FileMetadata-dev'`
  - Verify ANALYSIS_RESULTS_TABLE default is correct
  - _Requirements: 2.4_

- [x] 1.4.2 Verify table name consistency
  - Check upload.ts uses same table name
  - Check get-files.ts uses same table name
  - Verify CDK infrastructure creates tables with correct names
  - _Requirements: 2.4_

- [x] 1.4.3 Test analyze-file Lambda with correct table
  - Verify UpdateItemCommand succeeds
  - Confirm file metadata status updates are persisted
  - Check that violations_count, compliance_percentage are stored
  - _Requirements: 2.4_

### 1.5 Fix get-files Lambda Query
- [x] 1.5.1 Verify get-files Lambda table reference
  - File: packages/backend/src/functions/file/get-files.ts
  - Ensure FILE_METADATA_TABLE environment variable is used
  - Verify default value matches actual table name
  - _Requirements: 2.6_

- [x] 1.5.2 Verify FileMetadataService query logic
  - File: packages/backend/src/services/file-metadata-service.ts
  - Confirm getUserFiles() queries correct table
  - Verify UserIndex GSI is used for efficient lookup
  - Check that query filters by user_id correctly
  - _Requirements: 2.6_

- [x] 1.5.3 Test get-files Lambda returns results
  - Upload a file and verify metadata is created
  - Call get-files Lambda for that user
  - Verify results include all uploaded files
  - Check that results include file_id, filename, file_type, file_size, analysis_status, upload_timestamp
  - _Requirements: 2.6_

---

## Phase 2: Validator and Data Model Fixes

### 2.1 Update FileMetadata Type Definitions
- [x] 2.1.1 Review FileMetadata type definition
  - File: packages/backend/src/types/file-metadata.ts
  - Ensure user_id field supports up to 128 characters
  - Verify all required fields are defined
  - _Requirements: 2.2_

### 2.2 Test FileMetadata Creation with Cognito Users
- [x] 2.2.1 Create test for FileMetadata with Cognito UUID
  - Test creating FileMetadata with 36-char Cognito UUID
  - Verify record is created successfully in DynamoDB
  - Confirm validator accepts the UUID
  - _Requirements: 2.2_

---

## Phase 3: Frontend Fixes

### 3.1 Update FileUpload Component to Use Backend API
- [x] 3.1.1 Modify FileUpload.tsx to fetch files from backend
  - File: packages/frontend/src/components/FileUpload.tsx
  - Add `useGetFilesQuery()` hook to fetch files
  - Display fetched files in addition to local upload state
  - Show analysis_status from backend (pending, in_progress, completed, failed)
  - _Requirements: 2.5_

- [x] 3.1.2 Refresh file list after successful upload
  - After successful S3 upload, trigger file list refresh
  - Use RTK Query's refetch or invalidate tags
  - Display updated file list with new upload
  - _Requirements: 2.5_

- [x] 3.1.3 Test FileUpload component across tab switches
  - Upload file in "Upload Files" tab
  - Switch to "Analysis Results" tab
  - Verify file remains visible
  - Switch back to "Upload Files" tab
  - Verify file is still visible
  - _Requirements: 2.5_

### 3.2 Verify FileHistory Component Uses Backend API
- [x] 3.2.1 Confirm FileHistory.tsx uses useGetFilesQuery()
  - File: packages/frontend/src/components/FileHistory.tsx
  - Verify it fetches files from backend
  - Check that it displays analysis_status correctly
  - _Requirements: 2.5_

---

## Phase 4: Integration Testing

### 4.1 End-to-End File Upload Pipeline Test
- [x] 4.1.1 Test complete upload → analysis → results flow
  - Authenticate as Cognito user
  - Upload a C/C++ file
  - Verify FileMetadata record is created
  - Verify SQS message is sent
  - Verify analyze-file Lambda processes message
  - Verify analysis results are stored
  - Verify get-files Lambda returns the file
  - Verify frontend displays file with analysis status
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

### 4.2 Test File Persistence Across Tab Switches
- [x] 4.2.1 Verify files persist when switching tabs
  - Upload file in "Upload Files" tab
  - Switch to "Analysis Results" tab
  - Verify file is visible
  - Switch back to "Upload Files" tab
  - Verify file is still visible
  - Verify analysis status updates are reflected
  - _Requirements: 2.5_

### 4.3 Test with Multiple Files
- [x] 4.3.1 Upload multiple files and verify all are returned
  - Upload 3 different C/C++ files
  - Verify all 3 files appear in get-files results
  - Verify each file has correct metadata
  - Verify analysis status is tracked per file
  - _Requirements: 2.6_

### 4.4 Test Error Scenarios
- [x] 4.4.1 Test invalid file rejection
  - Attempt to upload .txt file (should fail)
  - Attempt to upload file > 10MB (should fail)
  - Verify error messages are clear
  - Verify file is not created in DynamoDB
  - _Requirements: 3.2_

- [x] 4.4.2 Test analysis failure handling
  - Upload file that causes analysis to fail
  - Verify analysis_status is set to "failed"
  - Verify error_message is stored
  - Verify error_timestamp is recorded
  - _Requirements: 3.9_

### 4.5 Test Preservation Requirements
- [x] 4.5.1 Verify presigned URL generation still works
  - Upload file and verify presigned URL is returned
  - Verify URL contains fileId, uploadUrl, downloadUrl, expiresIn
  - Verify URL is valid and can be used for S3 upload
  - _Requirements: 3.1_

- [x] 4.5.2 Verify authentication still required
  - Attempt to upload without authentication
  - Verify 401 Unauthorized is returned
  - Attempt to get files without authentication
  - Verify 401 Unauthorized is returned
  - _Requirements: 3.6_

- [x] 4.5.3 Verify analysis status transitions
  - Upload file and verify status is "pending"
  - Verify status changes to "in_progress" when analysis starts
  - Verify status changes to "completed" when analysis finishes
  - Verify violations_count and compliance_percentage are set
  - _Requirements: 3.7, 3.8, 3.4_

---

## Phase 5: Deployment and Verification

### 5.1 Build and Deploy Backend
- [x] 5.1.1 Build Lambda functions
  - Run `npm run build:lambdas` in packages/backend
  - Verify all functions build successfully
  - Verify upload.ts is included in build
  - _Requirements: 2.1_

- [x] 5.1.2 Deploy CDK stack
  - Run `cdk deploy` to deploy infrastructure
  - Verify FileMetadata-dev table is created
  - Verify AnalysisResults-dev table is created
  - Verify Lambda functions are deployed with correct environment variables
  - _Requirements: 2.4_

- [x] 5.1.3 Verify Lambda environment variables
  - Check upload Lambda has FILE_METADATA_TABLE set correctly
  - Check analyze-file Lambda has FILE_METADATA_TABLE and ANALYSIS_RESULTS_TABLE set correctly
  - Check get-files Lambda has FILE_METADATA_TABLE set correctly
  - _Requirements: 2.4_

### 5.2 Deploy Frontend
- [x] 5.2.1 Build frontend
  - Run `npm run build` in packages/frontend
  - Verify build succeeds
  - _Requirements: 2.5_

- [x] 5.2.2 Deploy frontend to Vercel
  - Deploy updated frontend
  - Verify FileUpload component uses backend API
  - Verify FileHistory component displays files
  - _Requirements: 2.5_

### 5.3 Smoke Tests
- [x] 5.3.1 Test upload endpoint
  - Call upload Lambda with valid file
  - Verify presigned URL is returned
  - Verify FileMetadata record is created
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 5.3.2 Test analysis endpoint
  - Verify analyze-file Lambda processes SQS messages
  - Verify analysis results are stored
  - Verify file metadata is updated
  - _Requirements: 2.4_

- [x] 5.3.3 Test get-files endpoint
  - Call get-files Lambda
  - Verify uploaded files are returned
  - Verify results include all required fields
  - _Requirements: 2.6_

- [x] 5.3.4 Test frontend
  - Upload file through UI
  - Verify file appears in file list
  - Switch tabs and verify file persists
  - Verify analysis status updates
  - _Requirements: 2.5_

---

## Checkpoint

- [x] 6.1 All bugs fixed and tested
  - Bug 1.1: Lambda build includes upload.ts ✓
  - Bug 1.2: Validator accepts Cognito UUIDs ✓
  - Bug 1.3: SQS messages include all fields ✓
  - Bug 1.4: DynamoDB table references correct ✓
  - Bug 1.5: Frontend files persist across tabs ✓
  - Bug 1.6: get-files returns uploaded files ✓
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 6.2 All preservation requirements verified
  - File upload success ✓
  - File validation ✓
  - Analysis processing ✓
  - File metadata updates ✓
  - Frontend polling ✓
  - Authentication ✓
  - Initial status ✓
  - Error handling ✓
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

- [x] 6.3 End-to-end pipeline verified
  - Upload → Analysis → Results display works
  - Files persist across UI interactions
  - All error scenarios handled correctly
  - _Requirements: All_

