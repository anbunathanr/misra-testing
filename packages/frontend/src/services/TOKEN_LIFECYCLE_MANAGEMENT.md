# JWT Token Lifecycle Management

## Overview

This document describes the JWT token lifecycle management implementation in the authentication service. The system automatically handles token refresh, session restoration, and token validation to ensure users maintain valid sessions without interruption.

## Features

### 1. Automatic Token Refresh

The system automatically refreshes access tokens before they expire:

- **Refresh Buffer**: Tokens are refreshed 5 minutes before expiration
- **Automatic Scheduling**: Token refresh is scheduled automatically when tokens are stored
- **Background Refresh**: Refresh happens in the background without user interaction
- **Fallback Handling**: If refresh fails, the user is logged out gracefully

### 2. Session Restoration on Page Load

When the application loads, the system attempts to restore the user's session:

- **Token Validation**: Checks if stored tokens are still valid
- **Automatic Refresh**: Refreshes tokens if they're close to expiration
- **Graceful Degradation**: Falls back to login if session cannot be restored
- **State Persistence**: Maintains authentication state across page refreshes

### 3. Token Validation and Renewal

The system validates tokens before making API requests:

- **Pre-Request Validation**: Checks token validity before each API call
- **Automatic Renewal**: Refreshes tokens if needed before requests
- **401 Handling**: Automatically retries requests after token refresh on 401 errors
- **Logout on Failure**: Logs out user if token refresh fails

## Implementation Details

### AuthService Methods

#### `storeTokens(accessToken, refreshToken, expiresIn)`
Stores tokens with expiration tracking and schedules automatic refresh.

```typescript
authService.storeTokens(accessToken, refreshToken, 3600); // 1 hour expiration
```

#### `getTokenData()`
Retrieves stored token data with expiration information. Returns `null` if tokens are expired.

```typescript
const tokenData = authService.getTokenData();
if (tokenData) {
  console.log('Token expires at:', new Date(tokenData.expiresAt));
}
```

#### `needsRefresh()`
Checks if the token needs to be refreshed (within 5 minutes of expiration).

```typescript
if (authService.needsRefresh()) {
  await authService.refreshAccessToken();
}
```

#### `refreshAccessToken()`
Refreshes the access token using the refresh token. Returns the new access token or `null` if refresh fails.

```typescript
const newToken = await authService.refreshAccessToken();
if (newToken) {
  // Token refreshed successfully
} else {
  // Refresh failed, user needs to log in again
}
```

#### `restoreSession()`
Restores the user session from localStorage on page load. Automatically refreshes tokens if needed.

```typescript
const session = await authService.restoreSession();
if (session) {
  // Session restored successfully
  console.log('User:', session.user);
  console.log('Token:', session.token);
}
```

#### `validateAndRefreshToken()`
Validates the current token and refreshes it if needed. Returns the valid token or `null`.

```typescript
const validToken = await authService.validateAndRefreshToken();
if (validToken) {
  // Use the valid token for API requests
}
```

#### `clearTokens()`
Clears all stored tokens and cancels any scheduled refresh timers.

```typescript
authService.clearTokens();
```

### Redux Integration

The authentication slice has been updated to use the new token lifecycle management:

#### `checkAuth` Thunk
Now uses `restoreSession()` to automatically restore and refresh tokens on app load.

```typescript
dispatch(checkAuth());
```

#### `loginUser` Thunk
Automatically stores tokens with lifecycle management after successful login.

```typescript
dispatch(loginUser({ email, password }));
```

#### `logoutUser` Thunk
Clears all tokens and cancels refresh timers on logout.

```typescript
dispatch(logoutUser());
```

### API Integration

The base API query has been enhanced with automatic token refresh:

#### Pre-Request Token Refresh
Before making API requests, the system checks if the token needs refresh and refreshes it automatically.

#### 401 Error Handling
If an API request returns 401 (Unauthorized), the system:
1. Attempts to refresh the token
2. Retries the original request with the new token
3. Logs out the user if refresh fails

## Storage Structure

### localStorage Keys

- **`token`**: Current access token (for backward compatibility)
- **`tokenData`**: JSON object containing:
  - `accessToken`: Current access token
  - `refreshToken`: Refresh token for obtaining new access tokens
  - `expiresAt`: Unix timestamp when the token expires
- **`user`**: User information (email, name, sub)

### Example tokenData Structure

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": 1704067200000
}
```

## Configuration

### Token Refresh Buffer

The refresh buffer is set to 5 minutes before expiration. This can be adjusted by modifying the `TOKEN_REFRESH_BUFFER` constant in `AuthService`:

```typescript
private readonly TOKEN_REFRESH_BUFFER = 5 * 60 * 1000; // 5 minutes in milliseconds
```

### Default Token Expiration

If the backend doesn't provide an `expiresIn` value, the default expiration is 1 hour (3600 seconds).

## Error Handling

### Token Refresh Failures

When token refresh fails:
1. All tokens are cleared from localStorage
2. The refresh timer is cancelled
3. The user is logged out
4. The user is redirected to the login page

### Network Errors

Network errors during token refresh are handled gracefully:
1. Error is logged to console
2. Tokens are cleared
3. User is logged out

### Expired Tokens

When retrieving token data, if the token is expired:
1. Token data is automatically cleared from localStorage
2. `getTokenData()` returns `null`
3. Subsequent operations will require re-authentication

## Testing

### Manual Testing

1. **Login and Token Storage**:
   - Log in to the application
   - Check localStorage for `tokenData`
   - Verify `expiresAt` timestamp is in the future

2. **Automatic Refresh**:
   - Set a short expiration time (e.g., 2 minutes)
   - Wait for the refresh buffer time
   - Verify token is refreshed automatically
   - Check console logs for refresh messages

3. **Session Restoration**:
   - Log in to the application
   - Refresh the page
   - Verify session is restored without re-login
   - Check console logs for restoration messages

4. **Token Expiration**:
   - Manually set `expiresAt` to a past timestamp in localStorage
   - Refresh the page
   - Verify user is logged out

5. **API Request with Token Refresh**:
   - Set token to expire soon
   - Make an API request
   - Verify token is refreshed before the request
   - Verify request succeeds with new token

### Integration Testing

The token lifecycle management integrates with:
- Redux authentication slice
- RTK Query base query
- AuthStateManager for authentication flows
- All API endpoints requiring authentication

## Security Considerations

1. **Token Storage**: Tokens are stored in localStorage, which is vulnerable to XSS attacks. Consider using httpOnly cookies for production.

2. **Refresh Token Security**: Refresh tokens should be rotated on each use to prevent replay attacks.

3. **Token Expiration**: Short-lived access tokens (1 hour) minimize the impact of token theft.

4. **Automatic Logout**: Failed refresh attempts result in automatic logout to prevent unauthorized access.

5. **HTTPS Only**: All token transmission should occur over HTTPS in production.

## Future Enhancements

1. **Token Rotation**: Implement refresh token rotation for enhanced security
2. **Sliding Sessions**: Extend session expiration on user activity
3. **Multiple Tab Support**: Synchronize token refresh across browser tabs
4. **Offline Support**: Handle token refresh when network is unavailable
5. **Token Revocation**: Implement server-side token revocation checks

## Troubleshooting

### Token Not Refreshing

Check:
- Console logs for refresh attempts
- Network tab for `/auth/refresh` requests
- `tokenData` in localStorage for correct expiration time
- Refresh timer is scheduled (check console logs)

### Session Not Restoring

Check:
- `tokenData` exists in localStorage
- Token is not expired
- User data exists in localStorage
- Console logs for restoration attempts

### 401 Errors After Refresh

Check:
- Refresh token is valid
- Backend `/auth/refresh` endpoint is working
- New token is being stored correctly
- Redux state is updated with new token

## Related Files

- `packages/frontend/src/services/auth-service.ts` - Main implementation
- `packages/frontend/src/store/slices/authSlice.ts` - Redux integration
- `packages/frontend/src/store/api.ts` - API query enhancement
- `packages/frontend/src/services/auth-state-manager.ts` - State management integration
