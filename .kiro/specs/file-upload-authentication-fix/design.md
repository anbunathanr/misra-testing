# File Upload Authentication Fix Bugfix Design

## Overview

This design addresses the authentication timing bug where file uploads fail with 401 "You need to log in to access this resource" errors during the automated workflow. The bug occurs because the authentication flow requires OTP setup completion before storing authentication tokens, while the automated workflow attempts file uploads immediately after email verification. The fix will modify the authentication flow to issue temporary authentication tokens after email verification, allowing file uploads to succeed before OTP setup completion.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when file uploads are attempted after email verification but before OTP setup completion
- **Property (P)**: The desired behavior when file uploads are attempted - they should succeed with proper authentication even before OTP setup
- **Preservation**: Existing authentication security and OTP setup flow that must remain unchanged by the fix
- **AuthStateManager**: The frontend service in `packages/frontend/src/services/auth-state-manager.ts` that manages authentication state transitions
- **getUserFromContext**: The backend function in `packages/backend/src/utils/auth-util.ts` that extracts user context from API Gateway events
- **otp_setup_required**: The authentication state between email verification and OTP setup completion

## Bug Details

### Bug Condition

The bug manifests when a user completes email verification successfully but attempts to upload files before completing OTP setup. The `handleEmailVerification` function transitions to `otp_setup_required` state but doesn't store authentication tokens until `completeOTPSetup` is called, while the file upload handler requires valid authentication tokens in the Authorization header.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type FileUploadRequest
  OUTPUT: boolean
  
  RETURN input.authState == 'otp_setup_required'
         AND input.hasValidTokens == false
         AND input.attemptingFileUpload == true
END FUNCTION
```

### Examples

- **Email Verification Complete**: User completes email verification, receives OTP setup data, but no tokens stored in localStorage
- **File Upload Attempt**: Automated workflow or user attempts file upload, API call includes no Authorization header
- **401 Error Response**: Backend returns "You need to log in to access this resource" because getUserFromContext finds no valid tokens
- **OTP Setup Required**: User must complete OTP setup before any authenticated operations work

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- OTP setup flow must continue to work exactly as before for security compliance
- Full authentication tokens must still be issued only after OTP setup completion
- Existing token refresh and session management must remain unchanged

**Scope:**
All authentication flows that do NOT involve the intermediate state between email verification and OTP setup should be completely unaffected by this fix. This includes:
- Complete registration flow (email verification + OTP setup in sequence)
- Login flow for existing users with OTP already configured
- Token refresh and session restoration for fully authenticated users

## Hypothesized Root Cause

Based on the bug description, the most likely issues are:

1. **Missing Temporary Token Issuance**: The `handleEmailVerification` function successfully verifies email but doesn't issue any authentication tokens
   - Email verification completes successfully
   - OTP setup data is returned but no tokens are provided
   - State transitions to `otp_setup_required` without authentication capability

2. **Incomplete Authentication State**: The frontend doesn't store any tokens after email verification
   - `AuthStateManager.handleEmailVerification` receives OTP setup data but no tokens
   - No tokens are stored in localStorage or Redux state
   - API calls fail because no Authorization header is set

3. **Backend Token Validation Gap**: The backend expects full authentication for file uploads
   - `getUserFromContext` requires valid JWT tokens in Authorization header
   - No provision for intermediate authentication state after email verification

4. **Workflow Timing Issue**: Automated workflow attempts file uploads too early in authentication flow
   - File uploads triggered immediately after email verification
   - No coordination with OTP setup completion requirement

## Correctness Properties

Property 1: Bug Condition - File Upload After Email Verification

_For any_ file upload request where the user has completed email verification but not yet completed OTP setup (isBugCondition returns true), the fixed authentication system SHALL provide temporary authentication tokens that allow file uploads to succeed while maintaining security requirements.

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation - Full Authentication Flow Security

_For any_ authentication flow that does NOT involve the intermediate state between email verification and OTP setup (isBugCondition returns false), the fixed system SHALL produce exactly the same authentication behavior as the original system, preserving all security measures and token issuance patterns.

**Validates: Requirements 3.1, 3.2, 3.3**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `packages/backend/src/functions/auth/verify-email-with-otp.ts`

**Function**: Email verification handler

**Specific Changes**:
1. **Issue Temporary Tokens**: After successful email verification, generate temporary authentication tokens with limited scope
   - Create JWT tokens with `email_verified` scope but not full access
   - Set shorter expiration time (e.g., 1 hour) for temporary tokens
   - Include necessary user context (userId, email, organizationId)

2. **Token Scope Management**: Implement token scope validation to allow file operations with temporary tokens
   - Add `temp_authenticated` scope for post-email-verification state
   - Allow file upload operations with temporary tokens
   - Restrict other sensitive operations to full authentication only

**File**: `packages/frontend/src/services/auth-state-manager.ts`

**Function**: `handleEmailVerification`

**Specific Changes**:
3. **Store Temporary Tokens**: Store temporary tokens after email verification completion
   - Extract tokens from email verification response
   - Store in localStorage with appropriate keys
   - Update Redux auth state with temporary authentication status

4. **State Management Enhancement**: Update authentication state to reflect temporary authentication
   - Add intermediate state tracking for temporary authentication
   - Ensure OTP setup flow continues to work with temporary tokens
   - Clear temporary tokens when full authentication is achieved

**File**: `packages/backend/src/utils/auth-util.ts`

**Function**: `getUserFromContext`

**Specific Changes**:
5. **Temporary Token Support**: Enhance token validation to accept temporary tokens for file operations
   - Validate temporary token signatures and expiration
   - Extract user context from temporary tokens
   - Allow file upload operations with temporary authentication scope

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that simulate the complete authentication flow up to email verification, then attempt file uploads. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Email Verification + File Upload Test**: Complete email verification, then attempt file upload (will fail on unfixed code)
2. **Token Storage Test**: Verify no tokens are stored after email verification (will fail on unfixed code)
3. **API Authorization Test**: Check Authorization header is empty during file upload attempts (will fail on unfixed code)
4. **OTP Setup Continuation Test**: Verify OTP setup still works after email verification (should pass on unfixed code)

**Expected Counterexamples**:
- File upload returns 401 "You need to log in to access this resource"
- Possible causes: no tokens stored, no Authorization header, backend rejects unauthenticated requests

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := fileUploadWithTemporaryAuth(input)
  ASSERT expectedBehavior(result)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalAuthFlow(input) = fixedAuthFlow(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for complete authentication flows and existing user logins, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Complete Registration Flow Preservation**: Observe that full registration (email + OTP) works correctly on unfixed code, then write test to verify this continues after fix
2. **Existing User Login Preservation**: Observe that login for users with OTP already configured works correctly on unfixed code, then write test to verify this continues after fix
3. **Token Refresh Preservation**: Observe that token refresh for fully authenticated users works correctly on unfixed code, then write test to verify this continues after fix

### Unit Tests

- Test temporary token generation after email verification
- Test temporary token validation in getUserFromContext
- Test file upload success with temporary tokens
- Test OTP setup completion upgrades temporary tokens to full tokens

### Property-Based Tests

- Generate random authentication states and verify file uploads work correctly after email verification
- Generate random user registration flows and verify preservation of existing authentication behavior
- Test that all non-file-upload operations continue to work across many scenarios

### Integration Tests

- Test complete authentication flow with file uploads at each stage
- Test automated workflow with file uploads after email verification
- Test that security is maintained with temporary token scope limitations