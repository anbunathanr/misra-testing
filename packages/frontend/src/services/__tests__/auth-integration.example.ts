/**
 * Integration Example: AuthErrorHandler with AuthStateManager
 * 
 * This example demonstrates how to use AuthErrorHandler together with
 * AuthStateManager for comprehensive authentication error handling.
 */

import { authErrorHandler, AuthError } from '../auth-error-handler';
import { AuthStateManager, AuthenticationState } from '../auth-state-manager';

/**
 * Enhanced AuthStateManager with integrated error handling
 */
export class EnhancedAuthStateManager extends AuthStateManager {
  /**
   * Override handleAuthError to use AuthErrorHandler
   */
  handleAuthError(error: any): void {
    // Create structured auth error using AuthErrorHandler
    const authError = authErrorHandler.createAuthError(
      error,
      this.currentState,
      {
        email: this.userInfo?.email,
        operation: this.getOperationName(this.currentState)
      }
    );

    // Log error for monitoring
    authErrorHandler.logError(authError, {
      userId: this.userInfo?.userId,
      email: this.userInfo?.email,
      currentState: this.currentState
    });

    // Get handling strategy
    const strategy = authErrorHandler.getHandlingStrategy(authError);

    // Execute strategy
    this.executeErrorStrategy(authError, strategy);

    // Call parent implementation to update state
    super.handleAuthError(authError);
  }

  /**
   * Execute error handling strategy
   */
  private executeErrorStrategy(
    authError: AuthError,
    strategy: ReturnType<typeof authErrorHandler.getHandlingStrategy>
  ): void {
    switch (strategy.action) {
      case 'show_modal':
        if (strategy.modal === 'email_verification') {
          this.showEmailVerificationModal();
        } else if (strategy.modal === 'otp_setup') {
          // OTP setup modal will be shown automatically
        }
        break;

      case 'retry':
        if (strategy.autoRetry && strategy.retryDelayMs) {
          setTimeout(() => {
            this.retryCurrentStep();
          }, strategy.retryDelayMs);
        }
        break;

      case 'offer_resend':
        // This will be handled by the modal component
        break;

      case 'redirect':
        if (strategy.redirectTo) {
          window.location.href = strategy.redirectTo;
        }
        break;

      case 'contact_support':
        // Show support contact information
        console.error('Please contact support with correlation ID:', authError.correlationId);
        break;
    }
  }

  /**
   * Enhanced retry with exponential backoff
   */
  async retryCurrentStep(): Promise<void> {
    const operationId = this.getOperationId();

    try {
      await authErrorHandler.executeWithRetry(
        async () => {
          // Call parent retry implementation
          await super.retryCurrentStep();
        },
        operationId,
        {
          maxAttempts: 3,
          initialDelayMs: 1000,
          maxDelayMs: 10000,
          backoffMultiplier: 2
        }
      );

      // Reset retry count on success
      authErrorHandler.resetRetryCount(operationId);
    } catch (error) {
      // Error will be handled by handleAuthError
      throw error;
    }
  }

  /**
   * Get operation name for current state
   */
  private getOperationName(state: AuthenticationState): string {
    const operationNames: Record<AuthenticationState, string> = {
      [AuthenticationState.INITIAL]: 'initialization',
      [AuthenticationState.REGISTERING]: 'registration',
      [AuthenticationState.EMAIL_VERIFICATION_REQUIRED]: 'email-verification-required',
      [AuthenticationState.EMAIL_VERIFYING]: 'email-verification',
      [AuthenticationState.OTP_SETUP_REQUIRED]: 'otp-setup-required',
      [AuthenticationState.OTP_VERIFYING]: 'otp-verification',
      [AuthenticationState.AUTHENTICATED]: 'authenticated',
      [AuthenticationState.ERROR]: 'error'
    };

    return operationNames[state] || 'unknown';
  }

  /**
   * Get unique operation ID for retry tracking
   */
  private getOperationId(): string {
    const email = this.userInfo?.email || 'unknown';
    const operation = this.getOperationName(this.currentState);
    return `${operation}-${email}`;
  }

  /**
   * Get recovery options for current error
   */
  getRecoveryOptions() {
    const error = this.authenticationContext.error;
    if (!error) return [];

    return authErrorHandler.getRecoveryOptions(error, {
      onRetry: async () => {
        await this.retryCurrentStep();
      },
      onResend: async () => {
        // Resend verification code
        if (this.currentState === AuthenticationState.EMAIL_VERIFICATION_REQUIRED) {
          // Trigger resend logic
          console.log('Resending verification code...');
        }
      },
      onUseBackupCode: async () => {
        // Show backup code input
        console.log('Switching to backup code input...');
      },
      onContactSupport: () => {
        // Show support contact
        console.log('Contact support with ID:', error.correlationId);
      }
    });
  }
}

/**
 * Example usage in a React component
 */
export class AuthenticationFlowExample {
  private authManager: EnhancedAuthStateManager;

  constructor() {
    this.authManager = new EnhancedAuthStateManager();
    this.setupListeners();
  }

  private setupListeners(): void {
    // Listen to state changes
    this.authManager.addStateChangeListener((context) => {
      console.log('Auth state changed:', context.state);

      if (context.error) {
        this.handleError(context.error);
      }
    });
  }

  private handleError(error: AuthError): void {
    // Get recovery options
    const recoveryOptions = this.authManager.getRecoveryOptions();

    // Display error to user
    console.log('Error:', error.userMessage);
    console.log('Suggestion:', error.suggestion);

    // Display recovery options
    recoveryOptions.forEach((option) => {
      console.log(`Recovery option: ${option.label} (primary: ${option.primary})`);
    });
  }

  async register(email: string, name: string): Promise<void> {
    try {
      await this.authManager.initiateRegistration(email, name);
    } catch (error) {
      // Error is automatically handled by EnhancedAuthStateManager
      console.error('Registration failed:', error);
    }
  }

  async verifyEmail(code: string): Promise<void> {
    try {
      await this.authManager.handleEmailVerification(code);
    } catch (error) {
      // Error is automatically handled by EnhancedAuthStateManager
      console.error('Email verification failed:', error);
    }
  }

  async completeOTPSetup(otpCode: string): Promise<void> {
    try {
      await this.authManager.completeOTPSetup(otpCode);
    } catch (error) {
      // Error is automatically handled by EnhancedAuthStateManager
      console.error('OTP setup failed:', error);
    }
  }
}

/**
 * Example: Using AuthErrorHandler directly for custom operations
 */
export async function customAuthOperation(email: string): Promise<void> {
  const operationId = `custom-operation-${email}`;

  try {
    await authErrorHandler.executeWithRetry(
      async () => {
        const response = await fetch('/api/auth/custom-operation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Operation failed');
        }

        return response.json();
      },
      operationId,
      {
        maxAttempts: 3,
        initialDelayMs: 1000,
        maxDelayMs: 5000,
        backoffMultiplier: 2
      }
    );

    // Success - reset retry count
    authErrorHandler.resetRetryCount(operationId);
  } catch (error) {
    // Create structured error
    const authError = authErrorHandler.createAuthError(
      error,
      AuthenticationState.REGISTERING,
      { email, operation: 'custom-operation' }
    );

    // Log error
    authErrorHandler.logError(authError, { email });

    // Get handling strategy
    const strategy = authErrorHandler.getHandlingStrategy(authError);

    // Handle based on strategy
    if (strategy.action === 'retry' && strategy.autoRetry) {
      // Will be retried automatically by executeWithRetry
    } else if (strategy.action === 'show_error') {
      console.error(authError.userMessage);
      console.log('Suggestion:', authError.suggestion);
    }

    throw authError;
  }
}

/**
 * Example: React Hook for authentication with error handling
 */
export function useAuthWithErrorHandling() {
  const authManager = new EnhancedAuthStateManager();

  const handleOperation = async <T>(
    operation: () => Promise<T>,
    operationId: string,
    state: AuthenticationState
  ): Promise<T> => {
    try {
      return await authErrorHandler.executeWithRetry(
        operation,
        operationId,
        {
          maxAttempts: 3,
          initialDelayMs: 1000,
          maxDelayMs: 10000,
          backoffMultiplier: 2
        }
      );
    } catch (error) {
      const authError = authErrorHandler.createAuthError(error, state);
      authErrorHandler.logError(authError);
      throw authError;
    }
  };

  return {
    register: (email: string, name: string) =>
      handleOperation(
        () => authManager.initiateRegistration(email, name),
        `register-${email}`,
        AuthenticationState.REGISTERING
      ),

    verifyEmail: (code: string) =>
      handleOperation(
        () => authManager.handleEmailVerification(code),
        `verify-${authManager.userInfo?.email}`,
        AuthenticationState.EMAIL_VERIFYING
      ),

    completeOTP: (otpCode: string) =>
      handleOperation(
        () => authManager.completeOTPSetup(otpCode),
        `otp-${authManager.userInfo?.email}`,
        AuthenticationState.OTP_VERIFYING
      ),

    getRecoveryOptions: () => authManager.getRecoveryOptions(),
    
    authManager
  };
}
