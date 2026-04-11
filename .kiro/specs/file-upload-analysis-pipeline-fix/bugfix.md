# Bugfix Requirements Document

## Introduction

The MISRA analysis platform has a broken file upload → analysis → results display pipeline. Files upload to S3 successfully, but the subsequent analysis workflow fails at multiple points, resulting in files disappearing from the UI, analysis never running, and results always showing empty. This bugfix addresses five critical issues: Lambda deployment configuration, user ID validation, SQS message format, DynamoDB table references, and frontend state management.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the build script (esbuild.lambda.js) runs THEN the system does not include upload.ts in the Lambda build, causing the upload Lambda to use stale code

1.2 WHEN a Cognito user (with 36-character UUID sub) uploads a file THEN the FileMetadataValidator rejects the user_id because it only allows 3-32 characters

1.3 WHEN the upload Lambda sends an SQS message THEN the system sends incomplete messages missing fileName and s3Key fields required by analyze-file Lambda

1.4 WHEN the analyze-file Lambda attempts to access DynamoDB THEN the system references FILE_METADATA_TABLE environment variable pointing to non-existent table name "misra-platform-file-metadata-dev" instead of "FileMetadata-dev"

1.5 WHEN a user switches from "Upload Files" tab to "Analysis Results" tab THEN the system loses uploaded file state because FileUploadMISRA component uses local React state that resets on tab switch

1.6 WHEN the get-files Lambda queries DynamoDB THEN the system returns empty results because it queries the wrong table or the metadata was never written due to validation failure

### Expected Behavior (Correct)

2.1 WHEN the build script (esbuild.lambda.js) runs THEN the system SHALL include upload.ts in the Lambda build process so deployment uses current code

2.2 WHEN a Cognito user (with 36-character UUID sub) uploads a file THEN the FileMetadataValidator SHALL accept user_id values up to 128 characters to accommodate Cognito sub UUIDs

2.3 WHEN the upload Lambda sends an SQS message THEN the system SHALL include complete message payload with fileId, fileName, s3Key, language, userId, and organizationId fields

2.4 WHEN the analyze-file Lambda attempts to access DynamoDB THEN the system SHALL reference the correct table name "FileMetadata-dev" matching the actual deployed table

2.5 WHEN a user switches from "Upload Files" tab to "Analysis Results" tab THEN the system SHALL maintain file visibility by fetching uploaded files from the backend API using useGetFilesQuery

2.6 WHEN the get-files Lambda queries DynamoDB THEN the system SHALL return all files for the authenticated user from the correct FileMetadata-dev table

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a file is successfully uploaded to S3 THEN the system SHALL CONTINUE TO return presigned URLs with fileId, uploadUrl, downloadUrl, and expiresIn

3.2 WHEN file validation fails (invalid extension, size > 10MB, empty file) THEN the system SHALL CONTINUE TO reject the upload with appropriate error messages

3.3 WHEN the analyze-file Lambda processes a valid file THEN the system SHALL CONTINUE TO run MISRA analysis and store results in misra-platform-analysis-results table

3.4 WHEN analysis completes successfully THEN the system SHALL CONTINUE TO update file metadata with violations_count, compliance_percentage, and analysis_duration

3.5 WHEN the frontend polls for file updates THEN the system SHALL CONTINUE TO refresh every 10 seconds to show analysis progress

3.6 WHEN a user is not authenticated THEN the system SHALL CONTINUE TO return 401 Unauthorized and prevent file operations

3.7 WHEN the upload Lambda creates file metadata THEN the system SHALL CONTINUE TO set analysis_status to "pending" initially

3.8 WHEN the analyze-file Lambda starts processing THEN the system SHALL CONTINUE TO update analysis_status to "in_progress"

3.9 WHEN analysis fails due to errors THEN the system SHALL CONTINUE TO update analysis_status to "failed" with error_message and error_timestamp
