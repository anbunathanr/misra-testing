# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - File Upload Authentication Failure After Email Verification
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: For deterministic bugs, scope the property to the concrete failing case(s) to ensure reproducibility
  - Test implementation details from Bug Condition in design: `isBugCondition(input) where input.authState == 'otp_setup_required' AND input.hasValidTokens == false AND input.attemptingFileUpload == true`
  - The test assertions should match the Expected Behavior Properties from design: file uploads should succeed with temporary authentication tokens
  - Create test file: `packages/backend/src/functions/file/__tests__/file-upload-auth-bug.property.test.ts`
  - Test scenario: Complete email verification → attempt file upload → expect success (will fail on unfixed code)
  - Simulate user in `otp_setup_required` state attempting file upload
  - Verify file upload returns 401 error on unfixed code (confirms bug exists)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found to understand root cause
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.1, 2.2_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Full Authentication Flow Security
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (complete authentication flows)
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements
  - Property-based testing generates many test cases for stronger guarantees
  - Create test file: `packages/backend/src/functions/auth/__tests__/auth-flow-preservation.property.test.ts`
  - Test scenarios:
    - Complete registration flow (email verification + OTP setup) → verify full tokens issued
    - Existing user login with OTP configured → verify authentication works
    - Fully authenticated user file uploads → verify success
    - Unauthenticated file upload attempts → verify 401 errors
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. Fix for file upload authentication timing bug

  - [x] 3.1 Implement temporary token issuance after email verification
    - Modify `packages/backend/src/functions/auth/verify-email-with-otp.ts`
    - After successful email verification, generate temporary authentication tokens
    - Create JWT tokens with `temp_authenticated` scope and limited expiration (1 hour)
    - Include necessary user context (userId, email, organizationId) in temporary tokens
    - Return temporary tokens in email verification response
    - _Bug_Condition: isBugCondition(input) where input.authState == 'otp_setup_required' AND input.hasValidTokens == false_
    - _Expected_Behavior: Issue temporary tokens that allow file operations while maintaining security_
    - _Preservation: Full authentication flow continues to work exactly as before_
    - _Requirements: 2.1, 2.3_

  - [x] 3.2 Update frontend to store temporary tokens
    - Modify `packages/frontend/src/services/auth-state-manager.ts`
    - Update `handleEmailVerification` function to extract and store temporary tokens
    - Store temporary tokens in localStorage with appropriate keys
    - Update Redux auth state to reflect temporary authentication status
    - Ensure OTP setup flow continues to work with temporary tokens
    - _Bug_Condition: Frontend doesn't store tokens after email verification_
    - _Expected_Behavior: Store temporary tokens and update auth state appropriately_
    - _Preservation: OTP setup flow and full authentication continue unchanged_
    - _Requirements: 2.3, 2.4_

  - [x] 3.3 Enhance backend token validation for temporary tokens
    - Modify `packages/backend/src/utils/auth-util.ts`
    - Update `getUserFromContext` function to accept temporary tokens for file operations
    - Validate temporary token signatures and expiration
    - Extract user context from temporary tokens
    - Allow file upload operations with `temp_authenticated` scope
    - Maintain security by restricting other sensitive operations to full authentication
    - _Bug_Condition: Backend rejects requests without full authentication tokens_
    - _Expected_Behavior: Accept temporary tokens for file operations while maintaining security_
    - _Preservation: Full authentication token validation continues unchanged_
    - _Requirements: 2.2, 2.4_

  - [x] 3.4 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - File Upload Authentication Success After Email Verification
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - Verify file uploads succeed for users in `otp_setup_required` state
    - _Requirements: Expected Behavior Properties from design (2.1, 2.2)_

  - [x] 3.5 Verify preservation tests still pass
    - **Property 2: Preservation** - Full Authentication Flow Security
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all authentication flows still work after fix (no regressions)
    - Verify complete registration flow still works
    - Verify existing user login still works
    - Verify fully authenticated user operations still work
    - Verify unauthenticated requests still return 401 errors

- [x] 4. Checkpoint - Ensure all tests pass
  - Run all property-based tests to ensure bug is fixed and no regressions introduced
  - Verify file uploads work for users in `otp_setup_required` state
  - Verify all existing authentication flows continue to work
  - Ensure all tests pass, ask the user if questions arise