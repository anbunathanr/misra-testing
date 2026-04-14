# AuthErrorHandler Usage Examples

This document provides comprehensive examples of how to use the `AuthErrorHandler` class for managing authentication errors in the frontend.

## Basic Usage

### Creating an AuthError

```typescript
import { authErrorHandler } from '../auth-error-handler';
import { AuthenticationState } from '../auth-state-manager';

// Create an error from a caught exception
try {
  await someAuthOperation();
} catch (error) {
  const authError = authErrorHandler.createAuthError(
    error,
    AuthenticationState.EMAIL_VERIFYING,
    { email: 'user@example.com', operation: 'email-verification' }
  );
  
  console.log(authError.userMessage); // User-friendly message
  console.log(authError.suggestion); // Actionable suggestion
  console.log(authError.retryable); // Whether error can be retried
}
```

## Error Handling Strategies

### Getting a Handling Strategy

```typescript
const authError = authErrorHandler.createAuthError(
  new Error('INVALID_VERIFICATION_CODE'),
  AuthenticationState.EMAIL_VERIFYING
);

const strategy = authErrorHandler.getHandlingStrategy(authError);

switch (strategy.action) {
  case 'show_error':
    // Display error message to user
    showErrorMessage(authError.userMessage);
    if (strategy.allowRetry) {
      showRetryButton();
    }
    break;
    
  case 'show_modal':
    // Show specific modal
    if (strategy.modal === 'email_verification') {
      openEmailVerificationModal();
    }
    break;
    
  case 'offer_resend':
    // Offer to resend verification code
    showResendOption();
    break;
    
  case 'retry':
    // Automatically retry with backoff
    if (strategy.autoRetry) {
      setTimeout(() => retryOperation(), strategy.retryDelayMs);
    }
    break;
}
```

## Recovery Options

### Providing Recovery Options to Users

```typescript
const authError = authErrorHandler.createAuthError(
  new Error('INVALID_VERIFICATION_CODE'),
  AuthenticationState.EMAIL_VERIFYING
);

const recoveryOptions = authErrorHandler.getRecoveryOptions(authError, {
  onRetry: async () => {
    // Retry the verification
    await verifyEmail(code);
  },
  onResend: async () => {
    // Resend verification code
    await resendVerificationCode();
  }
});

// Display recovery options to user
recoveryOptions.forEach(option => {
  const button = createButton(option.label, option.primary);
  button.onclick = () => option.action();
});
```

## Retry with Exponential Backoff

### Automatic Retry Logic

```typescript
import { authErrorHandler } from '../auth-error-handler';

async function verifyEmailWithRetry(email: string, code: string) {
  return authErrorHandler.executeWithRetry(
    async () => {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw authErrorHandler.createAuthError(
          error,
          AuthenticationState.EMAIL_VERIFYING
        );
      }
      
      return response.json();
    },
    `verify-email-${email}`, // Operation ID for tracking retries
    {
      maxAttempts: 3,
      initialDelayMs: 1000,
      maxDelayMs: 10000,
      backoffMultiplier: 2
    }
  );
}
```

## Integration with React Components

### Email Verification Modal Example

```typescript
import React, { useState } from 'react';
import { authErrorHandler } from '../services/auth-error-handler';
import { AuthenticationState } from '../services/auth-state-manager';

function EmailVerificationModal({ email, onSuccess }) {
  const [error, setError] = useState(null);
  const [recoveryOptions, setRecoveryOptions] = useState([]);
  
  const handleVerify = async (code: string) => {
    try {
      await authErrorHandler.executeWithRetry(
        async () => {
          const response = await fetch('/api/auth/verify-email', {
            method: 'POST',
            body: JSON.stringify({ email, code })
          });
          
          if (!response.ok) {
            throw new Error('Verification failed');
          }
          
          return response.json();
        },
        `verify-${email}`
      );
      
      onSuccess();
    } catch (err) {
      const authError = authErrorHandler.createAuthError(
        err,
        AuthenticationState.EMAIL_VERIFYING
      );
      
      setError(authError);
      
      // Get recovery options
      const options = authErrorHandler.getRecoveryOptions(authError, {
        onRetry: () => handleVerify(code),
        onResend: async () => {
          await resendCode();
          setError(null);
        }
      });
      
      setRecoveryOptions(options);
      
      // Log error for monitoring
      authErrorHandler.logError(authError, { email });
    }
  };
  
  return (
    <div>
      {error && (
        <div className="error-container">
          <p>{error.userMessage}</p>
          <p className="suggestion">{error.suggestion}</p>
          
          <div className="recovery-options">
            {recoveryOptions.map((option, index) => (
              <button
                key={index}
                onClick={option.action}
                className={option.primary ? 'primary' : 'secondary'}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

## Error Classification Examples

### Network Errors

```typescript
// Network error - retryable with automatic backoff
const networkError = new Error('Network request failed');
const authError = authErrorHandler.createAuthError(
  networkError,
  AuthenticationState.REGISTERING
);

console.log(authError.code); // 'NETWORK_ERROR'
console.log(authError.retryable); // true
console.log(authError.userMessage); // 'Unable to connect to the server...'
```

### Validation Errors

```typescript
// Invalid code - not retryable, user needs to enter correct code
const validationError = new Error('INVALID_VERIFICATION_CODE');
const authError = authErrorHandler.createAuthError(
  validationError,
  AuthenticationState.EMAIL_VERIFYING
);

console.log(authError.code); // 'INVALID_VERIFICATION_CODE'
console.log(authError.retryable); // false
console.log(authError.userMessage); // 'The verification code you entered is incorrect...'
```

### Expired Codes

```typescript
// Expired code - retryable, but needs resend
const expiredError = new Error('CODE_EXPIRED');
const authError = authErrorHandler.createAuthError(
  expiredError,
  AuthenticationState.EMAIL_VERIFYING
);

const strategy = authErrorHandler.getHandlingStrategy(authError);
console.log(strategy.action); // 'offer_resend'
```

## Retry Count Management

### Tracking and Resetting Retries

```typescript
const operationId = 'verify-user@example.com';

// Check current retry count
const retryCount = authErrorHandler.getRetryCount(operationId);
console.log(`Current retries: ${retryCount}`);

// Check if can retry
const canRetry = authErrorHandler.canRetry(operationId, { maxAttempts: 3 });
if (canRetry) {
  // Perform retry
  await authErrorHandler.executeWithRetry(operation, operationId);
}

// Reset retry count after success or when starting fresh
authErrorHandler.resetRetryCount(operationId);
```

## Error Logging

### Logging Errors for Monitoring

```typescript
const authError = authErrorHandler.createAuthError(
  new Error('Service unavailable'),
  AuthenticationState.OTP_VERIFYING
);

// Log with additional context
authErrorHandler.logError(authError, {
  userId: 'user-123',
  email: 'user@example.com',
  userAgent: navigator.userAgent,
  timestamp: new Date().toISOString()
});

// This logs to console with structured format:
// [AuthErrorHandler] {
//   code: 'SERVICE_UNAVAILABLE',
//   message: 'Service unavailable',
//   correlationId: 'auth-1234567890-abc123',
//   step: 'otp_verifying',
//   timestamp: '2024-01-01T00:00:00.000Z',
//   retryable: true,
//   userId: 'user-123',
//   email: 'user@example.com',
//   ...
// }
```

## Complete Authentication Flow Example

```typescript
import { authErrorHandler } from '../services/auth-error-handler';
import { AuthStateManager, AuthenticationState } from '../services/auth-state-manager';

class AuthenticationFlow {
  private authStateManager: AuthStateManager;
  
  constructor() {
    this.authStateManager = new AuthStateManager();
  }
  
  async register(email: string, name: string) {
    try {
      await authErrorHandler.executeWithRetry(
        async () => {
          await this.authStateManager.initiateRegistration(email, name);
        },
        `register-${email}`,
        { maxAttempts: 3 }
      );
    } catch (error) {
      const authError = authErrorHandler.createAuthError(
        error,
        AuthenticationState.REGISTERING
      );
      
      this.handleAuthError(authError);
    }
  }
  
  async verifyEmail(code: string) {
    try {
      await authErrorHandler.executeWithRetry(
        async () => {
          await this.authStateManager.handleEmailVerification(code);
        },
        `verify-${this.authStateManager.userInfo?.email}`,
        { maxAttempts: 2 } // Fewer retries for user input errors
      );
    } catch (error) {
      const authError = authErrorHandler.createAuthError(
        error,
        AuthenticationState.EMAIL_VERIFYING
      );
      
      this.handleAuthError(authError);
    }
  }
  
  private handleAuthError(authError: AuthError) {
    const strategy = authErrorHandler.getHandlingStrategy(authError);
    
    // Log error
    authErrorHandler.logError(authError, {
      userEmail: this.authStateManager.userInfo?.email
    });
    
    // Handle based on strategy
    switch (strategy.action) {
      case 'show_modal':
        this.showModal(strategy.modal);
        break;
        
      case 'show_error':
        this.displayError(authError);
        if (strategy.allowRetry) {
          this.showRecoveryOptions(authError);
        }
        break;
        
      case 'retry':
        if (strategy.autoRetry) {
          setTimeout(() => this.retryCurrentOperation(), strategy.retryDelayMs);
        }
        break;
        
      case 'offer_resend':
        this.showResendOption();
        break;
        
      case 'redirect':
        window.location.href = strategy.redirectTo;
        break;
        
      case 'contact_support':
        this.showSupportContact(authError.correlationId);
        break;
    }
  }
  
  private showRecoveryOptions(authError: AuthError) {
    const options = authErrorHandler.getRecoveryOptions(authError, {
      onRetry: () => this.retryCurrentOperation(),
      onResend: () => this.resendVerificationCode(),
      onUseBackupCode: () => this.showBackupCodeInput(),
      onContactSupport: () => this.showSupportContact(authError.correlationId)
    });
    
    // Display options to user
    this.displayRecoveryOptions(options);
  }
}
```

## Best Practices

1. **Always use correlation IDs**: They help track errors across systems
   ```typescript
   authErrorHandler.logError(authError, { correlationId: authError.correlationId });
   ```

2. **Provide context when creating errors**: Include operation details
   ```typescript
   authErrorHandler.createAuthError(error, state, {
     email: user.email,
     operation: 'email-verification'
   });
   ```

3. **Use appropriate retry configurations**: Different operations need different retry strategies
   ```typescript
   // Network operations - more retries
   { maxAttempts: 5, initialDelayMs: 1000 }
   
   // User input validation - fewer retries
   { maxAttempts: 2, initialDelayMs: 500 }
   ```

4. **Reset retry counts appropriately**: Clear counts after success or when starting fresh
   ```typescript
   authErrorHandler.resetRetryCount(operationId);
   ```

5. **Log errors with context**: Include user and operation details for debugging
   ```typescript
   authErrorHandler.logError(authError, {
     userId: user.id,
     email: user.email,
     operation: 'otp-verification'
   });
   ```
