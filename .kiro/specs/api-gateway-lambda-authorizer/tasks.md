# Implementation Plan: API Gateway Lambda Authorizer

## Overview

This implementation plan converts the Lambda Authorizer design into actionable coding tasks. The implementation follows a 6-phase deployment strategy to safely migrate JWT authentication from individual Lambda functions to API Gateway level, eliminating 503 timeout errors and improving performance.

The approach is incremental: create the authorizer, test it in isolation, deploy to one route as a canary, refactor backend functions in batches, roll out to all routes, and finally clean up legacy code. Each phase includes validation checkpoints to ensure stability before proceeding.

## Tasks

- [x] 1. Create Lambda Authorizer function and infrastructure
  - [x] 1.1 Implement Lambda Authorizer handler function
    - Create `packages/backend/src/functions/auth/authorizer.ts`
    - Implement `handler` function that accepts `AuthorizerEvent` and returns `AuthorizerResponse`
    - Extract JWT token from Authorization header using `JWTService.extractTokenFromHeader()`
    - Call `JWTService.verifyAccessToken()` to validate token
    - Generate IAM policy document using `generatePolicy()` helper
    - Return Allow policy with user context for valid tokens
    - Return Deny policy for invalid/missing tokens
    - Add comprehensive error handling for all failure scenarios
    - Add CloudWatch logging for authorization attempts (success/failure)
    - _Requirements: 1.1, 1.2, 1.5, 1.6, 1.7, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.4, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [x] 1.2 Implement policy generation helper function
    - Create `generatePolicy()` function in authorizer.ts
    - Accept parameters: principalId, effect (Allow/Deny), resource ARN, optional context
    - Generate wildcard API Gateway ARN from resource (format: `arn:aws:execute-api:region:account:apiId/*`)
    - Build IAM policy document with Version "2012-10-17" and Action "execute-api:Invoke"
    - Include user context (userId, email, organizationId, role) for Allow policies
    - Ensure all context values are strings (API Gateway requirement)
    - Return properly formatted AuthorizerResponse
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.4_

  - [x] 1.3 Add Lambda Authorizer to CDK infrastructure stack
    - Open `packages/backend/src/infrastructure/misra-platform-stack.ts`
    - Create Lambda function resource for authorizer (functionName: 'misra-platform-authorizer')
    - Set runtime to Node.js 20.x, handler to 'index.handler'
    - Set timeout to 5 seconds to prevent API Gateway timeouts
    - Set memory to 256MB for optimal performance
    - Add environment variable JWT_SECRET_NAME pointing to jwtSecret
    - Grant Secrets Manager read access: `jwtSecret.grantRead(authorizerFunction)`
    - Set reservedConcurrentExecutions to 0 (use account-level concurrency)
    - _Requirements: 1.1, 1.3, 1.4, 8.1, 8.2_

  - [x] 1.4 Create HTTP API authorizer configuration in CDK
    - In misra-platform-stack.ts, create HttpLambdaAuthorizer resource
    - Set authorizerName to 'jwt-authorizer'
    - Set identitySource to ['$request.header.Authorization']
    - Set responseTypes to [HttpLambdaResponseType.SIMPLE]
    - Set resultsCacheTtl to 300 seconds (5 minutes)
    - Reference the authorizerFunction Lambda
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 10.2, 10.3, 10.4_

- [x] 2. Write tests for Lambda Authorizer
  - [x] 2.1 Write unit tests for Lambda Authorizer
    - Create `packages/backend/src/functions/auth/__tests__/authorizer.test.ts`
    - Test: Valid JWT token returns allow policy with user context
    - Test: Missing Authorization header returns deny policy
    - Test: Malformed Authorization header (no "Bearer " prefix) returns deny policy
    - Test: Expired JWT token returns deny policy
    - Test: Invalid JWT signature returns deny policy
    - Test: JWT_Service error returns deny policy
    - Test: Policy contains correct principalId matching userId
    - Test: Policy contains correct resource ARN with wildcard
    - Test: Policy conforms to API Gateway HTTP API format (Version "2012-10-17", Action "execute-api:Invoke")
    - Test: Context contains all required user fields (userId, email, organizationId, role)
    - Test: Context values are strings
    - Test: Deny policies do not include context
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [x]  2.2 Write property-based test for token extraction
    - **Property 1: Token extraction from Authorization header**
    - **Validates: Requirements 1.5**
    - Create `packages/backend/src/functions/auth/__tests__/authorizer.property.test.ts`
    - Use fast-check library with 100 iterations
    - Generate random tokens (10-500 characters)
    - Verify extractTokenFromHeader correctly extracts token from "Bearer <token>" format
    - _Requirements: 12.7_

  - [x] 2.3 Write property-based test for invalid inputs
    - **Property 2: Invalid inputs return deny policies**
    - **Validates: Requirements 1.7, 2.4, 2.5, 9.6**
    - Generate invalid inputs: undefined, empty string, no "Bearer " prefix, malformed headers
    - Verify all invalid inputs return deny policy with principalId "unauthorized"
    - Run 100 iterations with fast-check
    - _Requirements: 12.7_

  - [x] 2.4 Write property-based test for valid token policy format
    - **Property 3: Valid token generates properly formatted allow policy**
    - **Validates: Requirements 3.1, 3.3, 3.4, 3.6**
    - Generate random valid user payloads (userId, email, organizationId, role)
    - Create JWT tokens using JWTService.generateTokenPair()
    - Verify policy structure: Version "2012-10-17", Action "execute-api:Invoke", Effect "Allow"
    - Verify resource ARN matches API Gateway format
    - Verify principalId matches userId
    - Run 100 iterations with fast-check
    - _Requirements: 12.7_

  - [x] 2.5 Write property-based test for user context propagation
    - **Property 4: Valid token includes complete user context**
    - **Validates: Requirements 2.2, 4.1, 4.2, 4.4**
    - Generate random valid user payloads
    - Verify context contains all fields: userId, email, organizationId, role
    - Verify all context values are strings
    - Run 100 iterations with fast-check
    - _Requirements: 12.7_

- [x] 3. Checkpoint - Verify Lambda Authorizer works in isolation
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Deploy Lambda Authorizer and test independently
  - [x] 4.1 Build and deploy Lambda Authorizer
    - Run build script to compile TypeScript and bundle Lambda
    - Deploy CDK stack with new authorizer function
    - Verify Lambda function created in AWS Console
    - Verify Lambda has correct IAM permissions for Secrets Manager
    - Check CloudWatch Logs for any deployment errors
    - _Requirements: 1.1, 8.1, 8.2_

  - [x] 4.2 Test Lambda Authorizer with sample events
    - Create test event with valid JWT token in Authorization header
    - Invoke Lambda directly via AWS Console or CLI
    - Verify response contains Allow policy with user context
    - Create test event with invalid token
    - Verify response contains Deny policy
    - Check CloudWatch Logs for authorization logs
    - Verify Secrets Manager access works (check logs for secret retrieval)
    - _Requirements: 2.1, 2.6, 9.1, 9.2, 9.4_

- [x] 5. Checkpoint - Verify authorizer deployed and functional
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Attach authorizer to one route for canary testing
  - [x] 6.1 Attach authorizer to single low-traffic route
    - Open `packages/backend/src/infrastructure/misra-platform-stack.ts`
    - Find the route definition for GET /notifications/preferences
    - Add `authorizer: authorizer` parameter to the route configuration
    - Deploy CDK stack changes
    - _Requirements: 5.5, 5.6, 6.1_

  - [x] 6.2 Test canary route with valid and invalid tokens
    - Use curl or Postman to call GET /notifications/preferences with valid JWT token
    - Verify 200 response and correct data returned
    - Call same endpoint with invalid token
    - Verify 401 Unauthorized response
    - Call same endpoint without Authorization header
    - Verify 401 Unauthorized response
    - Check API Gateway CloudWatch Logs for authorization events
    - _Requirements: 11.1, 11.2, 11.4, 11.5_

  - [x] 6.3 Monitor canary route for 24 hours
    - Check CloudWatch metrics for Lambda Authorizer (invocation count, errors, duration)
    - Check API Gateway metrics (4xx errors, 5xx errors, latency)
    - Verify no increase in error rates
    - Verify performance improvement (reduced latency)
    - Check CloudWatch Logs for any unexpected errors
    - _Requirements: 10.1, 10.5, 10.6_

- [x] 7. Checkpoint - Verify canary deployment successful
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Create helper utility for extracting user context
  - [x] 8.1 Implement getUserFromContext helper function
    - Create `packages/backend/src/utils/auth-util.ts`
    - Implement `getUserFromContext(event: APIGatewayProxyEvent)` function
    - Extract user fields from event.requestContext.authorizer
    - Return object with userId, email, organizationId, role
    - Handle missing context gracefully (return empty strings)
    - Add TypeScript types for return value
    - _Requirements: 4.3, 4.5, 7.2, 7.6_

  - [x] 8.2 Write unit tests for getUserFromContext
    - Create `packages/backend/src/utils/__tests__/auth-util.test.ts`
    - Test: Extracts user context from valid event
    - Test: Returns all required fields
    - Test: Handles missing authorizer context
    - Test: Returns correct TypeScript types
    - _Requirements: 12.6_

- [ ] 9. Refactor Batch 1: Notification Lambda functions (7 functions)
  - [x] 9.1 Refactor get-preferences function
    - Open `packages/backend/src/functions/notifications/get-preferences.ts`
    - Remove `withAuth` wrapper and `AuthenticatedEvent` import
    - Remove `JWTService` import
    - Change handler signature to accept `APIGatewayProxyEvent`
    - Replace `event.user` with `getUserFromContext(event)`
    - Add CORS headers to response
    - Verify business logic unchanged
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 9.2 Refactor update-preferences function
    - Apply same refactoring pattern as get-preferences
    - Remove auth middleware, use getUserFromContext
    - Add CORS headers
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 9.3 Refactor get-history function
    - Apply same refactoring pattern
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 9.4 Refactor get-notification function
    - Apply same refactoring pattern
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 9.5 Refactor create-template function
    - Apply same refactoring pattern
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 9.6 Refactor update-template function
    - Apply same refactoring pattern
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 9.7 Refactor get-templates function
    - Apply same refactoring pattern
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 9.8 Update tests for Batch 1 functions
    - Update all test files for notification functions
    - Remove JWT token mocking
    - Mock request context instead with authorizer fields
    - Verify business logic tests still pass
    - _Requirements: 12.6_

  - [x] 9.9 Remove JWT secret grants for Batch 1 in CDK
    - Open `packages/backend/src/infrastructure/misra-platform-stack.ts`
    - Remove `jwtSecret.grantRead()` calls for all 7 notification functions
    - Remove JWT_SECRET_NAME environment variable from all 7 functions
    - _Requirements: 8.1_

  - [x] 9.10 Deploy and monitor Batch 1
    - Build and deploy updated Lambda functions
    - Test each notification endpoint with valid token
    - Verify all endpoints return correct responses
    - Monitor CloudWatch metrics for 24 hours
    - Check for errors or performance issues
    - _Requirements: 11.3, 11.4_

- [ ] 10. Checkpoint - Verify Batch 1 refactoring successful
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Refactor Batch 2: Project/Suite/Case management functions (9 functions)
  - [x] 11.1 Refactor create-project function
    - Open `packages/backend/src/functions/projects/create-project.ts`
    - Apply refactoring pattern: remove withAuth, use getUserFromContext
    - Update tests to mock request context
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 11.2 Refactor get-projects function
    - Apply same refactoring pattern
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 11.3 Refactor update-project function
    - Apply same refactoring pattern
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 11.4 Refactor create-test-suite function
    - Open `packages/backend/src/functions/test-suites/create-suite.ts`
    - Apply refactoring pattern
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 11.5 Refactor get-test-suites function
    - Apply same refactoring pattern
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 11.6 Refactor update-test-suite function
    - Apply same refactoring pattern
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 11.7 Refactor create-test-case function
    - Open `packages/backend/src/functions/test-cases/create-test-case.ts`
    - Apply refactoring pattern
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 11.8 Refactor get-test-cases function
    - Apply same refactoring pattern
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 11.9 Refactor update-test-case function
    - Apply same refactoring pattern
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 11.10 Update tests for Batch 2 functions
    - Update all test files to mock request context instead of JWT tokens
    - _Requirements: 12.6_

  - [x] 11.11 Remove JWT secret grants for Batch 2 in CDK
    - Remove jwtSecret.grantRead() and JWT_SECRET_NAME for all 9 functions
    - _Requirements: 8.1_

  - [x] 11.12 Deploy and monitor Batch 2
    - Deploy updated functions
    - Test all project/suite/case endpoints
    - Monitor for 24 hours
    - _Requirements: 11.3, 11.4_

- [ ] 12. Checkpoint - Verify Batch 2 refactoring successful
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Refactor Batch 3: Test execution functions (5 functions)
  - [x] 13.1 Refactor trigger-execution function
    - Open `packages/backend/src/functions/executions/trigger.ts`
    - Apply refactoring pattern
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 13.2 Refactor get-execution-status function
    - Open `packages/backend/src/functions/executions/get-status.ts`
    - Apply refactoring pattern
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 13.3 Refactor get-execution-results function
    - Open `packages/backend/src/functions/executions/get-results.ts`
    - Apply refactoring pattern
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 13.4 Refactor get-execution-history function
    - Open `packages/backend/src/functions/executions/get-history.ts`
    - Apply refactoring pattern
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 13.5 Refactor get-suite-results function
    - Open `packages/backend/src/functions/executions/get-suite-results.ts`
    - Apply refactoring pattern
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 13.6 Update tests for Batch 3 functions
    - Update all test files to mock request context
    - _Requirements: 12.6_

  - [x] 13.7 Remove JWT secret grants for Batch 3 in CDK
    - Remove jwtSecret.grantRead() and JWT_SECRET_NAME for all 5 functions
    - _Requirements: 8.1_

  - [x] 13.8 Deploy and monitor Batch 3
    - Deploy updated functions
    - Test all execution endpoints
    - Monitor for 24 hours
    - _Requirements: 11.3, 11.4_

- [ ] 14. Checkpoint - Verify Batch 3 refactoring successful
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Refactor Batch 4: AI and analysis functions (9 functions)
  - [x] 15.1 Refactor ai-analyze function
    - Open `packages/backend/src/functions/ai-test-generation/analyze.ts`
    - Apply refactoring pattern
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 15.2 Refactor ai-generate function
    - Open `packages/backend/src/functions/ai-test-generation/generate.ts`
    - Apply refactoring pattern
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 15.3 Refactor ai-batch function
    - Open `packages/backend/src/functions/ai-test-generation/batch.ts`
    - Apply refactoring pattern
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 15.4 Refactor ai-get-usage function
    - Open `packages/backend/src/functions/ai-test-generation/get-usage.ts`
    - Apply refactoring pattern
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 15.5 Refactor generate-insights function
    - Open `packages/backend/src/functions/ai/generate-insights.ts`
    - Apply refactoring pattern
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 15.6 Refactor submit-feedback function
    - Open `packages/backend/src/functions/ai/submit-feedback.ts`
    - Apply refactoring pattern
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 15.7 Refactor query-results function
    - Open `packages/backend/src/functions/analysis/query-results.ts`
    - Apply refactoring pattern
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 15.8 Refactor get-user-stats function
    - Open `packages/backend/src/functions/analysis/get-user-stats.ts`
    - Apply refactoring pattern
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 15.9 Refactor get-violation-report function
    - Open `packages/backend/src/functions/reports/get-violation-report.ts`
    - Apply refactoring pattern
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 15.10 Update tests for Batch 4 functions
    - Update all test files to mock request context
    - _Requirements: 12.6_

  - [x] 15.11 Remove JWT secret grants for Batch 4 in CDK
    - Remove jwtSecret.grantRead() and JWT_SECRET_NAME for all 9 functions
    - _Requirements: 8.1_

  - [x] 15.12 Deploy and monitor Batch 4
    - Deploy updated functions
    - Test all AI and analysis endpoints
    - Monitor for 24 hours
    - _Requirements: 11.3, 11.4_

- [ ] 16. Checkpoint - Verify Batch 4 refactoring successful
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 17. Refactor Batch 5: File management functions (2 functions)
  - [x] 17.1 Refactor file-upload function
    - Open `packages/backend/src/functions/file/upload.ts`
    - Apply refactoring pattern
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 17.2 Refactor get-files function
    - Open `packages/backend/src/functions/file/get-files.ts`
    - Apply refactoring pattern
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 17.3 Update tests for Batch 5 functions
    - Update test files to mock request context
    - _Requirements: 12.6_

  - [x] 17.4 Remove JWT secret grants for Batch 5 in CDK
    - Remove jwtSecret.grantRead() and JWT_SECRET_NAME for both functions
    - _Requirements: 8.1_

  - [x] 17.5 Deploy and monitor Batch 5
    - Deploy updated functions
    - Test file upload and get-files endpoints
    - Monitor for 24 hours
    - _Requirements: 11.3, 11.4_

- [ ] 18. Checkpoint - Verify all backend functions refactored
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 19. Attach authorizer to all protected routes
  - [x] 19.1 Update CDK stack to attach authorizer to all routes
    - Open `packages/backend/src/infrastructure/misra-platform-stack.ts`
    - Add `authorizer: authorizer` to all protected route definitions
    - Protected routes: /projects, /test-suites, /test-cases, /executions, /files, /notifications, /ai-test-generation, /ai, /analysis, /reports
    - Verify public routes do NOT have authorizer: /auth/login, /auth/register, /auth/refresh
    - _Requirements: 5.5, 5.6, 5.7, 6.1, 6.2_

  - [x] 19.2 Deploy infrastructure changes
    - Deploy CDK stack with authorizer attached to all routes
    - Verify deployment successful
    - _Requirements: 5.5_

  - [x] 19.3 Test all protected endpoints
    - Test each protected endpoint with valid JWT token
    - Verify all return correct responses
    - Test with invalid token, verify 401 responses
    - Test public endpoints without token, verify they still work
    - _Requirements: 11.1, 11.2, 11.4, 11.5_

  - [x] 19.4 Monitor for 48 hours
    - Check CloudWatch metrics for Lambda Authorizer
    - Check API Gateway metrics (latency, errors)
    - Verify no increase in error rates
    - Verify performance improvements (reduced latency, no 503 errors)
    - Check CloudWatch Logs for any issues
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

- [ ] 20. Checkpoint - Verify full rollout successful
  - Ensure all tests pass, ask the user if questions arise.

- [ ]  21. Write property-based test for refactored function behavior
  - **Property 5: Refactored functions maintain behavior**
  - **Validates: Requirements 7.5**
  - Create property test in `packages/backend/src/functions/projects/__tests__/create-project.property.test.ts`
  - Generate random user contexts and project data
  - Verify refactored function produces same output for same input
  - Verify response structure consistent
  - Run 100 iterations with fast-check
  - _Requirements: 12.7_

- [ ] 22. Write integration tests for end-to-end auth flow
  - Create `packages/backend/src/__tests__/integration/auth-flow.test.ts`
  - Test: Valid JWT token allows access to protected route
  - Test: Invalid JWT token denies access (401)
  - Test: Missing JWT token denies access (401)
  - Test: Expired JWT token denies access (401)
  - Test: Public routes accessible without JWT token
  - Test: User context correctly propagated to backend Lambda
  - Test: API Gateway caching works (same token, multiple requests)
  - Test: Different tokens invoke authorizer separately
  - _Requirements: 12.5_

- [ ] 23. Cleanup legacy authentication code
  - [x] 23.1 Remove auth-middleware.ts file
    - Delete `packages/backend/src/middleware/auth-middleware.ts`
    - Verify no imports remain in codebase
    - _Requirements: 7.3_

  - [x] 23.2 Update documentation
    - Update README with new authentication architecture
    - Document how to access user context in Lambda functions
    - Document Lambda Authorizer configuration
    - Add troubleshooting guide for common auth issues
    - _Requirements: 11.1, 11.2_

  - [x] 23.3 Archive old code for reference
    - Create backup branch with old authentication code
    - Tag release with "pre-lambda-authorizer" for rollback reference
    - _Requirements: 11.1_

- [ ] 24. Final checkpoint - Verify cleanup complete and system stable
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property-based tests and integration tests that can be skipped for faster MVP
- Each batch of backend function refactoring is deployed and monitored separately to minimize risk
- Checkpoints ensure incremental validation before proceeding to next phase
- The 6-phase deployment strategy allows safe rollback at any point
- All tasks reference specific requirements for traceability
- Lambda Authorizer uses existing JWTService for consistent authentication logic
- API Gateway caching (5 minutes) dramatically reduces authentication latency
- Expected performance improvement: 95% reduction in auth latency, elimination of 503 errors
