# Authentication Error Handling System

## Overview

The authentication error handling system provides comprehensive error management for authentication services with correlation IDs, error transformation, and detailed logging for monitoring and troubleshooting.

## Components

### AuthErrorHandler

The `AuthErrorHandler` class is the central component that handles all authentication-related errors.

**Location**: `packages/backend/src/utils/auth-error-handler.ts`

**Key Features**:
- Automatic correlation ID generation for error tracking
- Error transformation from technical to user-friendly messages
- Comprehensive logging with structured data
- Retry logic support with exponential backoff
- API Gateway response formatting

### Integration Points

The error handler is integrated into:

1. **UnifiedAuthService** - Core authentication orchestration
2. **EmailVerificationService** - Email verification and OTP setup
3. **API Endpoints**:
   - `/api/auth/initiate-flow`
   - `/api/auth/verify-email-with-otp`
   - `/api/auth/complete-otp-setup`

## Error Types and Handling

### Email Validation Errors

**Error Code**: `INVALID_EMAIL`
- **Status Code**: 400
- **Retryable**: No
- **User Message**: "Please provide a valid email address."
- **Suggestion**: "Check your email address format and try again."

### Email Verification Errors

#### Invalid Verification Code
**Error Code**: `INVALID_VERIFICATION_CODE`
- **Status Code**: 400
- **Retryable**: Yes
- **User Message**: "The verification code you entered is incorrect."
- **Suggestion**: "Please check the code in your email and try again. The code is case-sensitive."

#### Expired Code
**Error Code**: `CODE_EXPIRED`
- **Status Code**: 400
- **Retryable**: Yes
- **User Message**: "Your verification code has expired."
- **Suggestion**: "Please request a new verification code and try again."

#### Already Verified
**Error Code**: `ALREADY_VERIFIED`
- **Status Code**: 400
- **Retryable**: No
- **User Message**: "This email address is already verified."
- **Suggestion**: "You can proceed to the next step."

### OTP Errors

#### Invalid OTP Code
**Error Code**: `INVALID_OTP_CODE`
- **Status Code**: 400
- **Retryable**: Yes
- **User Message**: "The OTP code you entered is incorrect."
- **Suggestion**: "Please check your authenticator app and enter the current 6-digit code. You can also use a backup code."

#### OTP Not Configured
**Error Code**: `OTP_NOT_CONFIGURED`
- **Status Code**: 400
- **Retryable**: No
- **User Message**: "OTP is not set up for your account."
- **Suggestion**: "Please complete email verification first to set up OTP."

#### OTP Setup Failed
**Error Code**: `OTP_SETUP_FAILED`
- **Status Code**: 500
- **Retryable**: Yes
- **User Message**: "Failed to set up two-factor authentication."
- **Suggestion**: "Please try again. If the problem persists, contact support with reference: {correlationId}"

### Authentication Flow Errors

#### User Not Confirmed
**Error Code**: `USER_NOT_CONFIRMED`
- **Status Code**: 403
- **Retryable**: No
- **User Message**: "Your email address has not been verified."
- **Suggestion**: "Please check your email for the verification code."

#### Invalid Credentials
**Error Code**: `INVALID_CREDENTIALS`
- **Status Code**: 401
- **Retryable**: Yes
- **User Message**: "Invalid email or password."
- **Suggestion**: "Please check your credentials and try again."

#### Auth Flow Error
**Error Code**: `AUTH_FLOW_ERROR`
- **Status Code**: 500
- **Retryable**: Yes
- **User Message**: "Unable to start the authentication process."
- **Suggestion**: "Please try again in a few moments. If the problem persists, contact support."

### System Errors

#### Service Error
**Error Code**: `SERVICE_ERROR`
- **Status Code**: 503
- **Retryable**: Yes
- **User Message**: "Our authentication service is temporarily unavailable."
- **Suggestion**: "Please try again in a few moments."

#### Timeout Error
**Error Code**: `TIMEOUT_ERROR`
- **Status Code**: 504
- **Retryable**: Yes
- **User Message**: "The request took too long to complete."
- **Suggestion**: "Please check your internet connection and try again."

#### User Creation Failed
**Error Code**: `USER_CREATION_FAILED`
- **Status Code**: 500
- **Retryable**: Yes
- **User Message**: "Unable to create your account."
- **Suggestion**: "Please try again. If the problem persists, contact support with reference: {correlationId}"

#### Token Generation Failed
**Error Code**: `TOKEN_GENERATION_FAILED`
- **Status Code**: 500
- **Retryable**: Yes
- **User Message**: "Authentication successful but unable to create your session."
- **Suggestion**: "Please try logging in again."

## Usage Examples

### In Services

```typescript
import { AuthErrorHandler } from '../../utils/auth-error-handler';

class MyAuthService {
  private errorHandler: AuthErrorHandler;

  constructor() {
    this.errorHandler = new AuthErrorHandler('MyAuthService');
  }

  async someAuthOperation(email: string) {
    const correlationId = uuidv4();
    
    try {
      // Perform operation
      this.errorHandler.logAuthEvent('operation_started', {
        operation: 'someAuthOperation',
        email,
        step: 'processing'
      }, true, { correlationId });
      
      // ... operation logic
      
    } catch (error: any) {
      this.errorHandler.handleError(error, {
        operation: 'someAuthOperation',
        email,
        step: 'processing'
      });
      throw error;
    }
  }
}
```

### In API Endpoints

```typescript
import { authErrorHandler } from '../../utils/auth-error-handler';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // ... endpoint logic
    
  } catch (error: any) {
    const authError = authErrorHandler.handleError(error, {
      operation: 'my-endpoint',
      email: request?.email,
      step: 'processing'
    });
    
    return authErrorHandler.toAPIResponse(authError);
  }
};
```

## Correlation IDs

Every error is assigned a unique correlation ID (UUID v4) that:
- Appears in all log entries related to the error
- Is returned to the client in the `X-Correlation-ID` header
- Is included in user-facing error messages for support reference
- Enables end-to-end tracing of authentication flows

## Logging

### Log Levels

- **ERROR**: Technical errors with full stack traces
- **WARN**: Transformed errors ready for user consumption
- **INFO**: Successful authentication events

### Log Structure

All logs are structured JSON for CloudWatch Insights:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "ERROR",
  "context": "UnifiedAuthService",
  "message": "Authentication error occurred",
  "correlationId": "uuid-here",
  "operation": "verify-email",
  "email": "user@example.com",
  "step": "email_verification",
  "errorName": "CodeMismatchException",
  "errorMessage": "Invalid verification code",
  "error": {
    "message": "...",
    "stack": "...",
    "name": "..."
  }
}
```

## Retry Logic

### Exponential Backoff

The error handler provides retry delay calculation with:
- Base delay: 1000ms (configurable)
- Exponential multiplier: 2^attemptCount
- Maximum delay: 30000ms (30 seconds)
- Jitter: ±30% to prevent thundering herd

### Retryable vs Non-Retryable

**Non-Retryable Errors**:
- `INVALID_EMAIL`
- `INVALID_CREDENTIALS`
- `ALREADY_VERIFIED`
- `OTP_NOT_CONFIGURED`
- `USER_NOT_CONFIRMED`

**Retryable Errors**:
- All verification failures
- Service unavailability
- Timeouts
- OTP verification failures
- Setup failures

## Monitoring

### CloudWatch Queries

**Find errors by correlation ID**:
```
fields @timestamp, message, correlationId, operation, step
| filter correlationId = "your-correlation-id"
| sort @timestamp desc
```

**Authentication failure rate**:
```
fields @timestamp, operation, success
| filter context = "UnifiedAuthService"
| stats count(*) by success, operation
```

**Error distribution**:
```
fields @timestamp, code, userMessage
| filter level = "WARN"
| stats count(*) by code
```

## Testing

Comprehensive unit tests are available at:
`packages/backend/src/utils/__tests__/auth-error-handler.test.ts`

Run tests:
```bash
npm test -- auth-error-handler.test.ts
```

## Best Practices

1. **Always use correlation IDs**: Generate at the start of operations
2. **Log before throwing**: Use `handleError()` before re-throwing
3. **Provide context**: Include operation, email, userId, and step
4. **User-friendly messages**: Never expose technical details to users
5. **Support references**: Include correlation ID in support suggestions
6. **Structured logging**: Use the logger for all authentication events

## Requirements Validation

This implementation satisfies:
- **Requirement 4.4**: Correlation IDs for error tracking and debugging
- **Requirement 4.6**: Comprehensive logging for monitoring and troubleshooting
- **Requirement 10.6**: Production-ready error handling and logging

## Future Enhancements

- Integration with external monitoring services (DataDog, New Relic)
- Error rate alerting thresholds
- Automatic incident creation for critical errors
- User-facing error analytics dashboard
