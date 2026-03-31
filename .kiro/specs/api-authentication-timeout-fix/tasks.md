# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Token Verification Timeout on Secrets Manager Call
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to concrete failing cases - valid JWT token with uncached secret and Secrets Manager timeout/failure
  - Test that verifyAccessToken() times out when getJWTSecret() attempts to fetch from Secrets Manager and the call hangs (from Bug Condition in design)
  - Mock SecretsManagerClient to simulate timeout (5+ second delay), permission denied (AccessDeniedException), or non-existent secret (ResourceNotFoundException)
  - Test that token verification either times out or fails to complete within 2 seconds
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found: specific timeout durations, error types, and failure modes
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.4_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Authentication Flows Remain Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (token generation, cached token verification)
  - Test that generateTokenPair() produces valid tokens with correct expiration times and structure
  - Test that verifyAccessToken() with cached secret returns correct payload
  - Test that expired tokens return "Token expired" error
  - Test that malformed tokens return "Invalid token" error
  - Test that refreshAccessToken() successfully generates new access tokens
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements
  - Property-based testing generates many test cases for stronger guarantees across various token payloads, user roles, and expiration times
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix JWT token verification timeout

  - [x] 3.1 Implement module-level secret caching
    - Move jwtSecret cache from instance-level to module-level (declare `let cachedJwtSecret: string | null = null` at module level)
    - Update getJWTSecret() to check module-level cache first
    - Update cache after successful Secrets Manager retrieval
    - _Bug_Condition: isBugCondition(input) where jwtService.jwtSecret IS null and secretsManagerCall times out_
    - _Expected_Behavior: Token verification completes within 2 seconds using cached secret (expectedBehavior from design)_
    - _Preservation: Token generation and cached verification remain unchanged (Preservation Requirements from design)_
    - _Requirements: 1.1, 1.2, 2.1, 2.2_

  - [x] 3.2 Add timeout handling to Secrets Manager call
    - Configure SecretsManagerClient with requestTimeout and connectionTimeout of 3 seconds
    - Wrap Secrets Manager call in Promise.race() with 3-second timeout
    - Throw clear timeout error if secret retrieval exceeds 3 seconds
    - _Bug_Condition: isBugCondition(input) where secretsManagerCall.duration > 3000ms_
    - _Expected_Behavior: Secret retrieval fails gracefully with timeout error within 3 seconds (expectedBehavior from design)_
    - _Preservation: Error handling for invalid tokens remains unchanged (Preservation Requirements from design)_
    - _Requirements: 1.2, 1.3, 2.2, 2.4_

  - [x] 3.3 Add environment variable fallback for JWT secret
    - Check process.env.JWT_SECRET before attempting Secrets Manager call
    - Log warning when using environment variable fallback
    - Update module-level cache when using environment variable
    - _Bug_Condition: isBugCondition(input) where secret.notExists in Secrets Manager_
    - _Expected_Behavior: Token verification uses environment variable fallback when Secrets Manager unavailable (expectedBehavior from design)_
    - _Preservation: Token verification logic remains unchanged when secret is available (Preservation Requirements from design)_
    - _Requirements: 2.2, 2.4_

  - [x] 3.4 Improve error handling for Secrets Manager failures
    - Catch specific AWS SDK errors (AccessDeniedException, ResourceNotFoundException, TimeoutError)
    - Log detailed error information for debugging
    - Throw descriptive errors that can be returned as HTTP 401 with clear messages
    - _Bug_Condition: isBugCondition(input) where iamPermissions.missing OR secret.notExists_
    - _Expected_Behavior: Token verification fails gracefully with clear error message (expectedBehavior from design)_
    - _Preservation: Existing error messages for expired/invalid tokens remain unchanged (Preservation Requirements from design)_
    - _Requirements: 1.4, 2.4, 3.2_

  - [x] 3.5 Verify IAM permissions in infrastructure stack
    - Audit all Lambda functions that use JWT authentication in misra-platform-stack.ts
    - Ensure jwtSecret.grantRead() is called for create-project, get-projects, and all authenticated endpoints
    - Add missing permission grants if any are found
    - _Bug_Condition: isBugCondition(input) where iamPermissions.missing_
    - _Expected_Behavior: All authenticated Lambda functions have secretsmanager:GetSecretValue permission (expectedBehavior from design)_
    - _Preservation: Existing IAM permissions for other resources remain unchanged (Preservation Requirements from design)_
    - _Requirements: 1.4, 2.4_

  - [x] 3.6 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Token Verification Completes Within Timeout
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - Verify that token verification completes within 2 seconds with proper caching and timeout handling
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.4_

  - [x] 3.7 Verify preservation tests still pass
    - **Property 2: Preservation** - Authentication Flows Remain Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - Confirm that token generation, cached verification, expiration handling, and refresh flows still work correctly
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. Checkpoint - Ensure all tests pass
  - Run all unit tests for JWTService
  - Run all property-based tests for authentication flows
  - Run integration test for create-project endpoint with JWT authentication
  - Verify that all tests pass and no regressions are introduced
  - Ask the user if questions arise
