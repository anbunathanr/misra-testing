# Requirements Document

## Introduction

This document specifies the requirements for implementing an API Gateway Lambda Authorizer to centralize JWT token verification at the API Gateway level. The current implementation performs JWT verification inside each Lambda function, causing performance issues and 503 timeout errors. Moving authentication to the API Gateway level will improve performance, reduce code duplication, and align with the architecture diagram and KIRO specification requirements.

## Glossary

- **Lambda_Authorizer**: An AWS Lambda function that validates JWT tokens and returns IAM policy documents for API Gateway authorization
- **API_Gateway**: AWS API Gateway HTTP API that routes requests to backend Lambda functions
- **JWT_Service**: Existing service class that verifies JWT tokens with module-level caching and timeout handling
- **IAM_Policy**: AWS Identity and Access Management policy document that allows or denies access to API Gateway routes
- **Request_Context**: API Gateway request context that passes authenticated user information to downstream Lambda functions
- **Authenticated_Route**: API Gateway route that requires JWT token verification before invoking the backend Lambda function
- **Backend_Lambda**: Lambda function that handles business logic after authentication is verified

## Requirements

### Requirement 1: Lambda Authorizer Function Creation

**User Story:** As a platform architect, I want a Lambda Authorizer function at the API Gateway level, so that JWT verification happens once per request instead of in each Lambda function.

#### Acceptance Criteria

1. THE Lambda_Authorizer SHALL be created as a new Lambda function in the infrastructure stack
2. THE Lambda_Authorizer SHALL use the existing JWT_Service for token verification
3. THE Lambda_Authorizer SHALL have a timeout of 5 seconds to prevent API Gateway timeouts
4. THE Lambda_Authorizer SHALL have 256MB memory allocation for optimal performance
5. WHEN the Lambda_Authorizer is invoked, THE Lambda_Authorizer SHALL extract the JWT token from the Authorization header
6. WHEN the Authorization header is missing, THE Lambda_Authorizer SHALL return an IAM_Policy denying access
7. WHEN the Authorization header format is invalid, THE Lambda_Authorizer SHALL return an IAM_Policy denying access

### Requirement 2: JWT Token Verification

**User Story:** As a security engineer, I want JWT tokens verified using the existing JWT_Service, so that we maintain consistent authentication logic with caching and timeout handling.

#### Acceptance Criteria

1. WHEN a JWT token is provided, THE Lambda_Authorizer SHALL call JWT_Service.verifyAccessToken() to validate the token
2. WHEN the JWT token is valid, THE Lambda_Authorizer SHALL extract the user payload (userId, email, organizationId, role)
3. WHEN the JWT token is expired, THE Lambda_Authorizer SHALL return an IAM_Policy denying access
4. WHEN the JWT token is invalid, THE Lambda_Authorizer SHALL return an IAM_Policy denying access
5. WHEN JWT_Service throws an error, THE Lambda_Authorizer SHALL return an IAM_Policy denying access
6. THE Lambda_Authorizer SHALL leverage JWT_Service module-level caching to avoid repeated Secrets Manager calls
7. THE Lambda_Authorizer SHALL complete token verification within 3 seconds to prevent timeouts

### Requirement 3: IAM Policy Generation

**User Story:** As a platform architect, I want the Lambda Authorizer to return IAM policy documents, so that API Gateway can enforce authorization decisions.

#### Acceptance Criteria

1. WHEN JWT verification succeeds, THE Lambda_Authorizer SHALL generate an IAM_Policy allowing access to all API routes
2. WHEN JWT verification fails, THE Lambda_Authorizer SHALL generate an IAM_Policy denying access to all API routes
3. THE IAM_Policy SHALL include the principalId set to the authenticated user's userId
4. THE IAM_Policy SHALL specify the API Gateway ARN as the resource
5. THE IAM_Policy SHALL use "Allow" effect for valid tokens and "Deny" effect for invalid tokens
6. THE Lambda_Authorizer SHALL return the IAM_Policy in the format required by API Gateway HTTP API authorizers

### Requirement 4: User Context Propagation

**User Story:** As a backend developer, I want authenticated user information passed to Lambda functions, so that I can access user context without re-verifying the JWT token.

#### Acceptance Criteria

1. WHEN JWT verification succeeds, THE Lambda_Authorizer SHALL include user information in the Request_Context
2. THE Request_Context SHALL contain userId, email, organizationId, and role from the JWT payload
3. THE Request_Context SHALL be accessible to Backend_Lambda functions via event.requestContext.authorizer
4. THE Request_Context SHALL serialize user information as JSON strings for API Gateway compatibility
5. WHEN a Backend_Lambda accesses the Request_Context, THE Backend_Lambda SHALL receive the complete user payload without additional JWT verification

### Requirement 5: API Gateway Integration

**User Story:** As a platform architect, I want the Lambda Authorizer attached to all authenticated routes, so that authentication is enforced consistently across the API.

#### Acceptance Criteria

1. THE Lambda_Authorizer SHALL be configured as an HTTP API authorizer in the infrastructure stack
2. THE Lambda_Authorizer SHALL use "REQUEST" authorizer type for token-based authentication
3. THE Lambda_Authorizer SHALL have identity source configured to read from the Authorization header
4. THE Lambda_Authorizer SHALL enable result caching with a TTL of 300 seconds (5 minutes)
5. THE Lambda_Authorizer SHALL be attached to all Authenticated_Route endpoints in the API_Gateway
6. THE Lambda_Authorizer SHALL NOT be attached to public routes (/auth/login, /auth/register)
7. WHEN an Authenticated_Route is invoked without the Lambda_Authorizer, THE API_Gateway SHALL return a 401 Unauthorized error

### Requirement 6: Authenticated Routes Configuration

**User Story:** As a platform architect, I want all authenticated endpoints to use the Lambda Authorizer, so that JWT verification is centralized and consistent.

#### Acceptance Criteria

1. THE following routes SHALL be configured with the Lambda_Authorizer:
   - /projects (POST, GET)
   - /projects/{projectId} (PUT)
   - /test-suites (POST, GET)
   - /test-suites/{suiteId} (PUT)
   - /test-cases (POST, GET)
   - /test-cases/{testCaseId} (PUT)
   - /executions/trigger (POST)
   - /executions/{executionId}/status (GET)
   - /executions/{executionId} (GET)
   - /executions/history (GET)
   - /executions/suites/{suiteExecutionId} (GET)
   - /files/upload (POST)
   - /files (GET)
   - /notifications/preferences (GET, POST)
   - /notifications/history (GET)
   - /notifications/history/{notificationId} (GET)
   - /notifications/templates (POST, GET)
   - /notifications/templates/{templateId} (PUT)
   - /ai-test-generation/analyze (POST)
   - /ai-test-generation/generate (POST)
   - /ai-test-generation/batch (POST)
   - /ai-test-generation/usage (GET)
   - /ai/insights (POST)
   - /ai/feedback (POST)
   - /analysis/query (GET)
   - /analysis/stats/{userId} (GET)
   - /reports/{fileId} (GET)

2. THE following routes SHALL NOT use the Lambda_Authorizer (public routes):
   - /auth/login (POST)
   - /auth/register (POST)
   - /auth/refresh (POST)

### Requirement 7: Backend Lambda Refactoring

**User Story:** As a backend developer, I want JWT verification code removed from individual Lambda functions, so that authentication logic is not duplicated and performance is improved.

#### Acceptance Criteria

1. THE following Lambda functions SHALL be refactored to remove JWT verification code:
   - create-project
   - get-projects
   - update-project
   - create-test-suite
   - get-test-suites
   - update-test-suite
   - create-test-case
   - get-test-cases
   - update-test-case
   - trigger-execution
   - get-execution-status
   - get-execution-results
   - get-execution-history
   - get-suite-results
   - file-upload
   - get-files
   - get-preferences
   - update-preferences
   - get-history
   - get-notification
   - create-template
   - update-template
   - get-templates
   - ai-analyze
   - ai-generate
   - ai-batch
   - ai-get-usage
   - ai-insights
   - ai-feedback
   - query-results
   - user-stats
   - get-report

2. WHEN a Backend_Lambda is refactored, THE Backend_Lambda SHALL access user information from event.requestContext.authorizer instead of verifying the JWT token
3. WHEN a Backend_Lambda is refactored, THE Backend_Lambda SHALL NOT import or instantiate JWT_Service
4. WHEN a Backend_Lambda is refactored, THE Backend_Lambda SHALL NOT call JWT_Service.verifyAccessToken()
5. WHEN a Backend_Lambda is refactored, THE Backend_Lambda SHALL maintain the same business logic and error handling
6. WHEN a Backend_Lambda accesses user context, THE Backend_Lambda SHALL parse the user information from the Request_Context

### Requirement 8: IAM Permissions

**User Story:** As a platform architect, I want the Lambda Authorizer to have proper IAM permissions, so that it can access AWS Secrets Manager for JWT secret retrieval.

#### Acceptance Criteria

1. THE Lambda_Authorizer SHALL be granted read access to the JWT secret in AWS Secrets Manager
2. THE Lambda_Authorizer SHALL have permission to write logs to CloudWatch Logs
3. THE Lambda_Authorizer SHALL NOT have permissions to access DynamoDB tables
4. THE Lambda_Authorizer SHALL NOT have permissions to access S3 buckets
5. THE Lambda_Authorizer SHALL NOT have permissions to invoke other Lambda functions

### Requirement 9: Error Handling and Logging

**User Story:** As a platform operator, I want comprehensive error logging in the Lambda Authorizer, so that I can troubleshoot authentication issues.

#### Acceptance Criteria

1. WHEN the Lambda_Authorizer is invoked, THE Lambda_Authorizer SHALL log the request event (excluding sensitive token data)
2. WHEN JWT verification fails, THE Lambda_Authorizer SHALL log the failure reason (token expired, invalid signature, etc.)
3. WHEN an unexpected error occurs, THE Lambda_Authorizer SHALL log the error details and stack trace
4. WHEN the Lambda_Authorizer returns a policy, THE Lambda_Authorizer SHALL log whether access was allowed or denied
5. THE Lambda_Authorizer SHALL NOT log the full JWT token value in any log statements
6. WHEN Secrets Manager access fails, THE Lambda_Authorizer SHALL log the specific error and return a deny policy

### Requirement 10: Performance and Caching

**User Story:** As a platform architect, I want the Lambda Authorizer to use caching effectively, so that authentication is fast and does not cause timeouts.

#### Acceptance Criteria

1. THE Lambda_Authorizer SHALL leverage JWT_Service module-level caching for the JWT secret
2. THE API_Gateway SHALL cache Lambda_Authorizer results for 300 seconds (5 minutes) based on the Authorization header
3. WHEN a cached authorization result exists, THE API_Gateway SHALL NOT invoke the Lambda_Authorizer
4. WHEN the JWT token changes, THE API_Gateway SHALL invoke the Lambda_Authorizer with the new token
5. THE Lambda_Authorizer SHALL complete execution in under 500ms for cached JWT secrets
6. THE Lambda_Authorizer SHALL complete execution in under 3 seconds for uncached JWT secrets (first invocation)
7. WHEN the Lambda_Authorizer exceeds 5 seconds execution time, THE API_Gateway SHALL return a 500 Internal Server Error

### Requirement 11: Backward Compatibility

**User Story:** As a platform operator, I want the refactoring to maintain backward compatibility, so that existing API clients continue to work without changes.

#### Acceptance Criteria

1. THE API_Gateway SHALL continue to accept JWT tokens in the Authorization header with "Bearer " prefix
2. THE API_Gateway SHALL return the same HTTP status codes for authentication failures (401 Unauthorized)
3. THE Backend_Lambda functions SHALL return the same response formats after refactoring
4. WHEN an API client sends a valid JWT token, THE API_Gateway SHALL process the request identically to the previous implementation
5. WHEN an API client sends an invalid JWT token, THE API_Gateway SHALL reject the request identically to the previous implementation

### Requirement 12: Testing and Validation

**User Story:** As a quality engineer, I want comprehensive tests for the Lambda Authorizer, so that authentication behavior is verified and regressions are prevented.

#### Acceptance Criteria

1. THE Lambda_Authorizer SHALL have unit tests covering valid token scenarios
2. THE Lambda_Authorizer SHALL have unit tests covering invalid token scenarios (expired, malformed, missing)
3. THE Lambda_Authorizer SHALL have unit tests covering error scenarios (Secrets Manager failures, JWT_Service errors)
4. THE Lambda_Authorizer SHALL have integration tests verifying IAM_Policy generation
5. THE Lambda_Authorizer SHALL have integration tests verifying Request_Context propagation to Backend_Lambda functions
6. THE refactored Backend_Lambda functions SHALL have updated tests that mock the Request_Context instead of JWT verification
7. WHEN all tests pass, THE Lambda_Authorizer SHALL be considered ready for deployment
