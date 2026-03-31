# API Authentication Timeout Fix - Bugfix Design

## Overview

This bugfix addresses Lambda function timeouts occurring during JWT token verification when the JWTService attempts to fetch secrets from AWS Secrets Manager. The issue manifests as HTTP 503 Service Unavailable errors when users attempt to create projects or access other authenticated endpoints. The root cause is the synchronous, uncached retrieval of JWT secrets from Secrets Manager on every token verification, combined with potential network latency, missing IAM permissions, or non-existent secrets. The fix will implement proper secret caching, timeout handling, and graceful error responses to ensure token verification completes within 2 seconds.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when JWT token verification attempts to fetch secrets from AWS Secrets Manager and the operation times out or hangs
- **Property (P)**: The desired behavior when token verification occurs - secrets should be retrieved from cache or fetched with proper timeout handling, completing within 2 seconds
- **Preservation**: Existing authentication flows (login, token generation, token expiration handling) that must remain unchanged by the fix
- **JWTService**: The service class in `packages/backend/src/services/auth/jwt-service.ts` that handles JWT token generation and verification
- **getJWTSecret()**: The private method in JWTService that retrieves the JWT secret from AWS Secrets Manager
- **verifyAccessToken()**: The method that verifies JWT tokens and calls getJWTSecret() on every invocation
- **Lambda Cold Start**: The initialization phase when a Lambda function is first invoked or after being idle, which can add latency to Secrets Manager calls

## Bug Details

### Bug Condition

The bug manifests when an authenticated API endpoint (e.g., create-project, get-projects, create-test-case) attempts to verify a JWT token. The `JWTService.verifyAccessToken()` method calls `getJWTSecret()`, which attempts to fetch the secret from AWS Secrets Manager. If the secret is not cached, the AWS SDK call to Secrets Manager hangs, times out, or fails due to network issues, missing IAM permissions, or a non-existent secret. This causes the Lambda function to exceed its timeout (30-60 seconds), resulting in API Gateway returning HTTP 503 Service Unavailable.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { token: string, lambdaContext: LambdaContext }
  OUTPUT: boolean
  
  RETURN input.token IS valid JWT format
         AND jwtService.jwtSecret IS null (not cached)
         AND (
           secretsManagerCall.duration > 3000ms
           OR secretsManagerCall.fails
           OR iamPermissions.missing
           OR secret.notExists
         )
         AND lambdaFunction.executionTime > lambdaFunction.timeout
END FUNCTION
```

### Examples

- **Example 1**: User submits create project form → Lambda calls verifyAccessToken() → getJWTSecret() attempts to fetch from Secrets Manager → AWS SDK call hangs for 60+ seconds → Lambda times out → API Gateway returns 503
- **Example 2**: User refreshes projects page → Lambda calls verifyAccessToken() → getJWTSecret() has no cached secret → Secrets Manager call fails due to missing IAM permission → Lambda times out → API Gateway returns 503
- **Example 3**: User creates test case → Lambda calls verifyAccessToken() during cold start → Network latency to Secrets Manager is high → Secret retrieval takes 45 seconds → Lambda times out → API Gateway returns 503
- **Edge Case**: User logs in successfully (generateTokenPair works) → Immediately tries to create project → verifyAccessToken fails with timeout → User sees 503 despite having valid token

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Login flow must continue to generate JWT tokens using JWTService.generateTokenPair()
- Token expiration handling must continue to return HTTP 401 Unauthorized for expired tokens
- Token format validation must continue to return HTTP 401 Unauthorized for malformed tokens
- Refresh token flow must continue to work using JWTService.refreshAccessToken()
- All authenticated endpoints must continue to verify tokens before processing requests

**Scope:**
All inputs that do NOT involve JWT token verification (public endpoints, token generation during login/register) should be completely unaffected by this fix. This includes:
- POST /auth/login - token generation
- POST /auth/register - user registration and token generation
- POST /auth/refresh - refresh token exchange
- Any public endpoints that don't require authentication

## Hypothesized Root Cause

Based on the bug description and code analysis, the most likely issues are:

1. **No Secret Caching**: The `getJWTSecret()` method has a caching mechanism (`if (this.jwtSecret) return this.jwtSecret`), but the JWTService instance may not be reused across Lambda invocations, causing the cache to be lost on every cold start

2. **No Timeout on Secrets Manager Call**: The AWS SDK call to Secrets Manager has no explicit timeout configuration, allowing it to hang indefinitely or until the Lambda function times out

3. **Missing IAM Permissions**: The Lambda functions may not have the necessary IAM permissions to read from Secrets Manager, causing the call to fail or hang while waiting for permission checks

4. **Non-Existent Secret**: The secret `misra-platform-jwt-secret` may not exist in AWS Secrets Manager, causing the retrieval to fail

5. **Lambda Instance Reuse**: Each Lambda invocation may create a new JWTService instance, preventing the in-memory cache from being effective across multiple requests

## Correctness Properties

Property 1: Bug Condition - Token Verification Completes Within Timeout

_For any_ authenticated API request where a valid JWT token is provided, the fixed JWTService SHALL complete token verification (including secret retrieval) within 2 seconds, either by using a cached secret or by fetching from Secrets Manager with proper timeout handling.

**Validates: Requirements 2.1, 2.2, 2.4**

Property 2: Preservation - Authentication Flows Remain Unchanged

_For any_ authentication operation that does NOT involve token verification (login, register, token generation), the fixed JWTService SHALL produce exactly the same behavior as the original code, preserving all existing token generation and refresh functionality.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `packages/backend/src/services/auth/jwt-service.ts`

**Function**: `getJWTSecret()` and class-level caching

**Specific Changes**:
1. **Add Timeout to Secrets Manager Call**: Configure the AWS SDK client with a connection timeout and request timeout of 3 seconds maximum
   - Add `requestTimeout` and `connectionTimeout` to SecretsManagerClient configuration
   - Wrap the Secrets Manager call in a Promise.race() with a 3-second timeout

2. **Implement Module-Level Secret Cache**: Move the secret cache from instance-level to module-level to persist across Lambda invocations
   - Declare `let cachedJwtSecret: string | null = null` at module level
   - Check module-level cache before attempting Secrets Manager call
   - Update cache after successful retrieval

3. **Add Graceful Error Handling**: Provide clear error messages when secret retrieval fails
   - Catch specific AWS SDK errors (timeout, permission denied, secret not found)
   - Log detailed error information for debugging
   - Throw descriptive errors that can be returned as HTTP 401 with clear messages

4. **Add Environment Variable Fallback**: Allow JWT secret to be provided via environment variable for development/testing
   - Check `process.env.JWT_SECRET` before attempting Secrets Manager call
   - Log warning when using environment variable fallback

5. **Verify IAM Permissions**: Ensure Lambda functions have `secretsmanager:GetSecretValue` permission for the JWT secret
   - Confirm `jwtSecret.grantRead()` is called for all authenticated Lambda functions in infrastructure stack
   - Add missing permission grants if any are found

**File**: `packages/backend/src/infrastructure/misra-platform-stack.ts`

**Changes**:
1. **Verify Permission Grants**: Audit all Lambda functions that use JWT authentication to ensure they have `jwtSecret.grantRead()` called
2. **Add Missing Grants**: Add permission grants for any Lambda functions that are missing them

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code by simulating timeout scenarios, then verify the fix works correctly with proper caching and timeout handling while preserving existing authentication behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis by simulating Secrets Manager timeouts and permission issues.

**Test Plan**: Write tests that mock the Secrets Manager client to simulate various failure scenarios (timeout, permission denied, secret not found). Run these tests on the UNFIXED code to observe failures and understand the root cause. Use integration tests to verify the actual Lambda timeout behavior.

**Test Cases**:
1. **Secrets Manager Timeout Test**: Mock SecretsManagerClient to delay response by 5 seconds, verify that verifyAccessToken() times out (will fail on unfixed code)
2. **Missing IAM Permission Test**: Mock SecretsManagerClient to throw AccessDeniedException, verify that verifyAccessToken() fails gracefully (will fail on unfixed code)
3. **Non-Existent Secret Test**: Mock SecretsManagerClient to throw ResourceNotFoundException, verify that verifyAccessToken() fails gracefully (will fail on unfixed code)
4. **Cold Start Cache Miss Test**: Create new JWTService instance, call verifyAccessToken(), verify that getJWTSecret() is called and times out (will fail on unfixed code)

**Expected Counterexamples**:
- Token verification hangs indefinitely when Secrets Manager call times out
- Lambda function exceeds timeout and returns 503 instead of 401
- Possible causes: no timeout configuration, no caching across invocations, missing error handling

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds (token verification with uncached secret), the fixed function produces the expected behavior (completes within 2 seconds with proper error handling).

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  startTime := getCurrentTime()
  result := jwtService_fixed.verifyAccessToken(input.token)
  duration := getCurrentTime() - startTime
  
  ASSERT duration < 2000ms
  ASSERT (result IS valid_token_payload) OR (result IS clear_error_message)
  ASSERT NOT (result IS 503_timeout_error)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold (token generation, valid cached token verification), the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT jwtService_original.generateTokenPair(input) = jwtService_fixed.generateTokenPair(input)
  ASSERT jwtService_original.verifyAccessToken(input.cachedToken) = jwtService_fixed.verifyAccessToken(input.cachedToken)
  ASSERT jwtService_original.refreshAccessToken(input) = jwtService_fixed.refreshAccessToken(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain (various token payloads, expiration times, user roles)
- It catches edge cases that manual unit tests might miss (boundary conditions, unusual token formats)
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for token generation and cached token verification, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Token Generation Preservation**: Verify that generateTokenPair() produces valid tokens with correct expiration times after fix
2. **Cached Token Verification Preservation**: Verify that verifyAccessToken() with cached secret produces same results as before fix
3. **Token Expiration Preservation**: Verify that expired tokens continue to return "Token expired" error after fix
4. **Invalid Token Preservation**: Verify that malformed tokens continue to return "Invalid token" error after fix

### Unit Tests

- Test getJWTSecret() with mocked Secrets Manager client (timeout, success, failure scenarios)
- Test module-level cache persistence across multiple JWTService instances
- Test environment variable fallback when Secrets Manager is unavailable
- Test error handling for various AWS SDK exceptions
- Test verifyAccessToken() with cached vs uncached secrets

### Property-Based Tests

- Generate random JWT payloads and verify that token generation/verification produces consistent results
- Generate random timeout scenarios and verify that all complete within 2 seconds or fail gracefully
- Test that cache invalidation works correctly across many invocations
- Verify that all authentication flows (login, refresh, verify) work correctly with the fixed code

### Integration Tests

- Test full create-project flow with JWT authentication in deployed Lambda environment
- Test cold start scenario where Lambda has no cached secret
- Test warm Lambda scenario where secret is already cached
- Test IAM permission verification by temporarily removing permissions and verifying graceful failure
- Test that multiple concurrent requests reuse the cached secret correctly
