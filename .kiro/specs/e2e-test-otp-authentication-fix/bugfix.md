# Bugfix Requirements Document

## Introduction

The e2e test for the MISRA Platform is failing due to **incorrect authentication success criteria for Single Page Applications (SPAs)**. The test expects URL navigation away from `/login` after OTP verification, but the MISRA Platform is a React SPA where authentication does NOT guarantee immediate page navigation. The test successfully sends OTP, enters it correctly, and clicks verify, but fails with `expect(page).not.toHaveURL(/login/)` because the URL remains `/login` after successful authentication. The ACTUAL root cause is that the test uses URL-based success verification (`page.url().includes('/login')`) instead of checking for authenticated UI elements (like "Sign Out" button), which is the correct approach for SPAs where session/token is set asynchronously and URL may not change immediately.

## Bug Analysis

### Current Behavior (Defect)

**PRIMARY DEFECT - Incorrect SPA Authentication Verification:**

1.1 WHEN the e2e test verifies authentication success using `page.url().includes('/login')` THEN the test fails even when authentication succeeds because the URL may remain `/login` in a React SPA after successful auth

1.2 WHEN the e2e test uses `await page.waitForLoadState('networkidle')` after OTP verification THEN it is unreliable for SPAs because async authentication (token setting, state updates) may complete after network idle

1.3 WHEN the e2e test checks `if (page.url().includes('/login')) { throw new Error('Login failed') }` THEN it incorrectly treats successful authentication as failure because URL navigation is NOT guaranteed in SPAs

1.4 WHEN authentication completes successfully in the SPA THEN the URL may remain `/login` temporarily or permanently while the session/token is set asynchronously and UI updates occur

**SECONDARY DEFECT - IMAP Email Fetching Issues:**

1.5 WHEN the e2e test searches for OTP emails using `search({ since: fiveMinutesAgo })` THEN the search may miss emails if there's any delay in email delivery or clock skew

1.6 WHEN the e2e test fetches messages using `slice(-10)` THEN it only retrieves the last 10 messages, which may miss the OTP email if there are many recent emails in the mailbox

1.7 WHEN the e2e test uses OTP regex patterns to extract the code THEN the patterns may not match the actual OTP email format, causing extraction to fail

1.8 WHEN the e2e test waits 5 seconds after triggering OTP send THEN it tries only once to fetch the email, which fails if email delivery takes longer than 5 seconds

### Expected Behavior (Correct)

**PRIMARY FIX - Correct SPA Authentication Verification:**

2.1 WHEN the e2e test verifies authentication success THEN it SHALL check for authenticated UI elements (e.g., "Sign Out" button) instead of URL navigation

2.2 WHEN the e2e test clicks the OTP verify button THEN it SHALL wait for the "Sign Out" button to become visible using `await expect(signOutBtn).toBeVisible({ timeout: 15000 })` as the success condition

2.3 WHEN the e2e test waits for authentication THEN it SHALL use UI-based verification (presence of authenticated elements) instead of `waitForLoadState('networkidle')` or URL checks

2.4 WHEN authentication succeeds in the SPA THEN the test SHALL consider it successful when authenticated UI elements appear, regardless of whether the URL changes

**SECONDARY FIX - Improved IMAP Email Fetching:**

2.5 WHEN the e2e test searches for OTP emails THEN it SHALL search for UNSEEN (unread) messages instead of using time-based filtering to avoid missing emails due to delivery delays

2.6 WHEN the e2e test fetches messages THEN it SHALL fetch the last 20-30 messages instead of only 10 to ensure the OTP email is included

2.7 WHEN the e2e test extracts the OTP code THEN it SHALL use improved regex patterns that match the actual OTP email format sent by the backend

2.8 WHEN the e2e test waits for an OTP email THEN it SHALL implement proper polling (retry every 3-5 seconds for up to 60 seconds) instead of trying only once after 5 seconds

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the backend `/auth/generate-otp` endpoint is called with a valid email THEN the system SHALL CONTINUE TO generate a 6-digit OTP, store it in DynamoDB with a 10-minute TTL, and send it via AWS SES

3.2 WHEN the backend sends OTP emails via AWS SES THEN the system SHALL CONTINUE TO successfully deliver emails to the user's inbox (this behavior is working correctly)

3.3 WHEN the backend `/auth/verify-otp` endpoint is called with valid email + OTP THEN the system SHALL CONTINUE TO verify the OTP, authenticate the user with Cognito, and return JWT tokens

3.4 WHEN the React SPA receives authentication tokens THEN the system SHALL CONTINUE TO set the session/token asynchronously and update the UI to show authenticated elements

3.5 WHEN the e2e test connects to Gmail via IMAP THEN the system SHALL CONTINUE TO successfully authenticate and establish a connection

3.6 WHEN the e2e test successfully extracts an OTP and enters it THEN the OTP verification SHALL CONTINUE TO work correctly on the backend

3.7 WHEN a user manually logs in with OTP through the UI THEN the system SHALL CONTINUE TO work correctly (this is not broken - only the test verification logic is wrong)

3.8 WHEN the TEST_OTP_BYPASS environment variable is set to "123456" and the OTP "123456" is provided THEN the system SHALL CONTINUE TO bypass OTP validation for testing purposes (optional fallback)

## Root Cause Analysis

### Evidence

1. **OTP is successfully sent** ✅ - Backend generates and sends OTP via AWS SES
2. **OTP is correctly entered** ✅ - Test successfully extracts OTP from email and enters it
3. **Verify button is clicked** ✅ - Test clicks the verify button
4. **Test fails with URL check** ❌ - Test fails with: `expect(page).not.toHaveURL(/login/)`
5. **URL remains `/login`** - Current URL: `https://misra.digitransolutions.in/login`
6. **Authentication actually succeeds** - Backend returns tokens, session is created, but test doesn't verify correctly

### Incorrect Previous Analysis

The previous analyses focused on IMAP issues (envelope data corruption, search logic, etc.), but these are SECONDARY problems. The ACTUAL root cause is that the test uses incorrect success criteria for SPA authentication.

### Correct Root Cause - PRIMARY ISSUE

**The test uses URL-based authentication verification, which is WRONG for SPAs:**

```typescript
// CURRENT (WRONG) - From e2e-automation.spec.ts
await page.waitForLoadState('networkidle');
if (page.url().includes('/login')) {
  throw new Error('Login failed - still on login page');
}
```

**Why this is wrong for SPAs:**
- `waitForLoadState('networkidle')` is unreliable after async authentication
- URL check is NOT a reliable success condition for SPAs
- React SPAs set session/token asynchronously
- URL may remain `/login` temporarily or permanently after successful auth
- UI updates (like "Sign Out" button) are the TRUE indicator of success

**The CORRECT approach for SPAs:**

```typescript
// CORRECT - Check for authenticated UI element
await verifyButton.click();
const signOutBtn = page.getByRole('button', { name: /sign out/i });
await expect(signOutBtn).toBeVisible({ timeout: 15000 });
```

### Secondary Issue - IMAP Improvements

The IMAP email fetching logic has flaws (time-based search, limited message count, weak regex), but these are SECONDARY optimizations. The primary fix is correcting the authentication verification logic.

### Fix Direction

**PRIMARY FIX (Critical):**
Replace URL-based authentication checks with UI-based verification in `packages/backend/tests/e2e-automation.spec.ts`:

1. Remove `if (page.url().includes('/login'))` checks after OTP verification
2. Replace with `await expect(signOutBtn).toBeVisible({ timeout: 15000 })`
3. Use authenticated UI elements as success criteria, not URL navigation

**SECONDARY FIX (Optimization):**
Improve IMAP email fetching logic:

1. Search for UNSEEN messages instead of time-based
2. Fetch more messages (20-30 instead of 10)
3. Improve OTP regex patterns
4. Implement proper polling with retries
5. Add better logging

### Scope

This is **purely a test code issue**. Backend authentication, OTP generation, and email sending all work correctly. The IMAP improvements are valuable but secondary to fixing the authentication verification logic.
