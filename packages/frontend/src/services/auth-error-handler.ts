/**
 * Authentication Error Handler
 * Specialized error handling for authentication flows with retry mechanisms and user-friendly messaging
 */

import { AuthenticationState } from './auth-state-manager';

export interface AuthError {
  code: string;
  message: string;
  userMessage: string;
  retryable: boolean;
  suggestion: string;
  correlationId: string;
  timestamp: Date;
  step: AuthenticationState;
}

export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export interface ErrorHandlingStrategy {
  action: 'retry' | 'show_error' | 'show_modal' | 'offer_resend' | 'redirect' | 'contact_support';
  modal?: 'email_verification' | 'otp_setup';
  allowRetry: boolean;
  autoRetry: boolean;
  retryDelayMs?: number;
  redirectTo?: string;
}

export interface RecoveryOption {
  label: string;
  action: () => Promise<void>;
  primary: boolean;
}

/**
 * Authentication Error Handler
 * Provides centralized error management for authentication flows
 */
export class AuthErrorHandler {
  private defaultRetryConfig: RetryConfig = {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2
  };

  private retryAttempts: Map<string, number> = new Map();

  /**
   * Create an AuthError from a generic error
   */
  createAuthError(
    error: any,
    step: AuthenticationState,
    context?: { email?: string; operation?: string }
  ): AuthError {
    const correlationId = this.generateCorrelationId();
    const errorMessage = this.extractErrorMessage(error);
    const errorCode = this.classifyError(errorMessage, error);

    return {
      code: errorCode,
      message: errorMessage,
      userMessage: this.getUserFriendlyMessage(errorCode, errorMessage),
      retryable: this.isRetryable(errorCode),
      suggestion: this.getSuggestion(errorCode, step),
      correlationId,
      timestamp: new Date(),
      step
    };
  }

  /**
   * Classify error into specific error codes
   */
  private classifyError(message: string, error: any): string {
    const lowerMessage = message.toLowerCase();

    // Authentication-specific errors
    if (lowerMessage.includes('email_verification_required') || lowerMessage.includes('email not verified')) {
      return 'EMAIL_VERIFICATION_REQUIRED';
    }
    if (lowerMessage.includes('invalid_verification_code') || lowerMessage.includes('invalid verification code')) {
      return 'INVALID_VERIFICATION_CODE';
    }
    if (lowerMessage.includes('code_expired') || lowerMessage.includes('expired')) {
      return 'CODE_EXPIRED';
    }
    if (lowerMessage.includes('invalid_otp') || lowerMessage.includes('invalid otp')) {
      return 'INVALID_OTP';
    }
    if (lowerMessage.includes('user_not_confirmed') || lowerMessage.includes('not confirmed')) {
      return 'USER_NOT_CONFIRMED';
    }
    if (lowerMessage.includes('user_not_found') || lowerMessage.includes('user does not exist')) {
      return 'USER_NOT_FOUND';
    }
    if (lowerMessage.includes('otp_setup_required') || lowerMessage.includes('otp setup required')) {
      return 'OTP_SETUP_REQUIRED';
    }
    if (lowerMessage.includes('invalid_backup_code') || lowerMessage.includes('invalid backup code')) {
      return 'INVALID_BACKUP_CODE';
    }
    if (lowerMessage.includes('backup_code_already_used') || lowerMessage.includes('backup_code_used') || lowerMessage.includes('already used')) {
      return 'BACKUP_CODE_ALREADY_USED';
    }

    // Network and service errors
    if (lowerMessage.includes('network') || lowerMessage.includes('fetch failed')) {
      return 'NETWORK_ERROR';
    }
    if (lowerMessage.includes('timeout')) {
      return 'TIMEOUT_ERROR';
    }
    if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many')) {
      return 'RATE_LIMIT_EXCEEDED';
    }
    if (lowerMessage.includes('service unavailable') || lowerMessage.includes('503') || lowerMessage.includes('service_unavailable')) {
      return 'SERVICE_UNAVAILABLE';
    }

    // HTTP status-based classification
    if (error?.status === 401 || lowerMessage.includes('unauthorized')) {
      return 'UNAUTHORIZED';
    }
    if (error?.status === 403 || lowerMessage.includes('forbidden')) {
      return 'FORBIDDEN';
    }
    if (error?.status === 404 || lowerMessage.includes('not found')) {
      return 'NOT_FOUND';
    }
    if (error?.status === 500 || lowerMessage.includes('internal server')) {
      return 'INTERNAL_SERVER_ERROR';
    }

    // Configuration errors
    if (lowerMessage.includes('config') || lowerMessage.includes('configuration')) {
      return 'CONFIG_ERROR';
    }

    return 'AUTH_ERROR';
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryable(errorCode: string): boolean {
    const nonRetryableErrors = [
      'INVALID_VERIFICATION_CODE',
      'INVALID_OTP',
      'INVALID_BACKUP_CODE',
      'BACKUP_CODE_ALREADY_USED',
      'USER_NOT_CONFIRMED',
      'USER_NOT_FOUND',
      'CONFIG_ERROR',
      'FORBIDDEN',
      'NOT_FOUND'
    ];

    return !nonRetryableErrors.includes(errorCode);
  }

  /**
   * Get user-friendly error message
   */
  private getUserFriendlyMessage(errorCode: string, originalMessage: string): string {
    const messages: Record<string, string> = {
      EMAIL_VERIFICATION_REQUIRED: 'Please check your email and enter the verification code to continue.',
      INVALID_VERIFICATION_CODE: 'The verification code you entered is incorrect. Please try again.',
      CODE_EXPIRED: 'The verification code has expired. Please request a new one.',
      INVALID_OTP: 'The OTP code you entered is incorrect. Please check your authenticator app and try again.',
      USER_NOT_CONFIRMED: 'Your email address needs to be verified before you can continue.',
      USER_NOT_FOUND: 'No account found with this email address. Please register first.',
      OTP_SETUP_REQUIRED: 'You need to set up two-factor authentication to continue.',
      INVALID_BACKUP_CODE: 'The backup code you entered is invalid. Please check and try again.',
      BACKUP_CODE_ALREADY_USED: 'This backup code has already been used. Please use a different code.',
      NETWORK_ERROR: 'Unable to connect to the server. Please check your internet connection.',
      TIMEOUT_ERROR: 'The request took too long to complete. Please try again.',
      RATE_LIMIT_EXCEEDED: 'Too many attempts. Please wait a moment before trying again.',
      SERVICE_UNAVAILABLE: 'The authentication service is temporarily unavailable. Please try again in a moment.',
      UNAUTHORIZED: 'Your session has expired. Please log in again.',
      FORBIDDEN: 'You don\'t have permission to perform this action.',
      NOT_FOUND: 'The requested resource was not found.',
      INTERNAL_SERVER_ERROR: 'Our servers are experiencing issues. Please try again later.',
      CONFIG_ERROR: 'There is a configuration issue. Please contact support.',
      AUTH_ERROR: 'An unexpected error occurred during authentication. Please try again.'
    };

    return messages[errorCode] || messages.AUTH_ERROR;
  }

  /**
   * Get actionable suggestion for error recovery
   */
  private getSuggestion(errorCode: string, step: AuthenticationState): string {
    const suggestions: Record<string, string> = {
      EMAIL_VERIFICATION_REQUIRED: 'Check your email inbox and spam folder for the verification code.',
      INVALID_VERIFICATION_CODE: 'Double-check the code in your email and enter it carefully.',
      CODE_EXPIRED: 'Click "Resend Code" to get a new verification code.',
      INVALID_OTP: 'Make sure your device time is correct and try entering the code again.',
      USER_NOT_CONFIRMED: 'Please verify your email address first.',
      USER_NOT_FOUND: 'Click "Register" to create a new account.',
      OTP_SETUP_REQUIRED: 'Follow the instructions to set up your authenticator app.',
      INVALID_BACKUP_CODE: 'Backup codes are 8 characters long. Check your saved codes.',
      BACKUP_CODE_ALREADY_USED: 'Each backup code can only be used once. Try another code.',
      NETWORK_ERROR: 'Check your internet connection and try again.',
      TIMEOUT_ERROR: 'Please try again. If the problem persists, check your connection.',
      RATE_LIMIT_EXCEEDED: 'Wait a few minutes before attempting again.',
      SERVICE_UNAVAILABLE: 'Please try again in a few minutes.',
      UNAUTHORIZED: 'Please log in again to continue.',
      FORBIDDEN: 'Contact support if you believe this is an error.',
      NOT_FOUND: 'Please check the URL or start from the login page.',
      INTERNAL_SERVER_ERROR: 'Please try again later. If the issue persists, contact support.',
      CONFIG_ERROR: 'Please contact support with error code: ' + errorCode,
      AUTH_ERROR: 'Please try again. If the issue persists, contact support.'
    };

    return suggestions[errorCode] || suggestions.AUTH_ERROR;
  }

  /**
   * Determine error handling strategy
   */
  getHandlingStrategy(error: AuthError): ErrorHandlingStrategy {
    switch (error.code) {
      case 'EMAIL_VERIFICATION_REQUIRED':
        return {
          action: 'show_modal',
          modal: 'email_verification',
          allowRetry: false,
          autoRetry: false
        };

      case 'INVALID_VERIFICATION_CODE':
        return {
          action: 'show_error',
          allowRetry: true,
          autoRetry: false
        };

      case 'CODE_EXPIRED':
        return {
          action: 'offer_resend',
          allowRetry: true,
          autoRetry: false
        };

      case 'OTP_SETUP_REQUIRED':
        return {
          action: 'show_modal',
          modal: 'otp_setup',
          allowRetry: false,
          autoRetry: false
        };

      case 'INVALID_OTP':
      case 'INVALID_BACKUP_CODE':
        return {
          action: 'show_error',
          allowRetry: true,
          autoRetry: false
        };

      case 'USER_NOT_FOUND':
        return {
          action: 'redirect',
          redirectTo: '/register',
          allowRetry: false,
          autoRetry: false
        };

      case 'NETWORK_ERROR':
      case 'TIMEOUT_ERROR':
      case 'SERVICE_UNAVAILABLE':
        return {
          action: 'retry',
          allowRetry: true,
          autoRetry: true,
          retryDelayMs: this.calculateRetryDelay(error.correlationId)
        };

      case 'RATE_LIMIT_EXCEEDED':
        return {
          action: 'show_error',
          allowRetry: true,
          autoRetry: false,
          retryDelayMs: 60000 // 1 minute
        };

      case 'CONFIG_ERROR':
      case 'INTERNAL_SERVER_ERROR':
        return {
          action: 'contact_support',
          allowRetry: false,
          autoRetry: false
        };

      default:
        return {
          action: 'show_error',
          allowRetry: error.retryable,
          autoRetry: false
        };
    }
  }

  /**
   * Get recovery options for an error
   */
  getRecoveryOptions(
    error: AuthError,
    callbacks: {
      onRetry?: () => Promise<void>;
      onResend?: () => Promise<void>;
      onUseBackupCode?: () => Promise<void>;
      onContactSupport?: () => void;
    }
  ): RecoveryOption[] {
    const options: RecoveryOption[] = [];

    switch (error.code) {
      case 'INVALID_VERIFICATION_CODE':
        if (callbacks.onRetry) {
          options.push({
            label: 'Try Again',
            action: callbacks.onRetry,
            primary: true
          });
        }
        if (callbacks.onResend) {
          options.push({
            label: 'Resend Code',
            action: callbacks.onResend,
            primary: false
          });
        }
        break;

      case 'CODE_EXPIRED':
        if (callbacks.onResend) {
          options.push({
            label: 'Resend Code',
            action: callbacks.onResend,
            primary: true
          });
        }
        break;

      case 'INVALID_OTP':
        if (callbacks.onRetry) {
          options.push({
            label: 'Try Again',
            action: callbacks.onRetry,
            primary: true
          });
        }
        if (callbacks.onUseBackupCode) {
          options.push({
            label: 'Use Backup Code',
            action: callbacks.onUseBackupCode,
            primary: false
          });
        }
        break;

      case 'NETWORK_ERROR':
      case 'TIMEOUT_ERROR':
      case 'SERVICE_UNAVAILABLE':
        if (callbacks.onRetry) {
          options.push({
            label: 'Retry',
            action: callbacks.onRetry,
            primary: true
          });
        }
        break;

      case 'INTERNAL_SERVER_ERROR':
      case 'CONFIG_ERROR':
        if (callbacks.onContactSupport) {
          options.push({
            label: 'Contact Support',
            action: async () => callbacks.onContactSupport?.(),
            primary: true
          });
        }
        break;

      default:
        if (error.retryable && callbacks.onRetry) {
          options.push({
            label: 'Try Again',
            action: callbacks.onRetry,
            primary: true
          });
        }
    }

    return options;
  }

  /**
   * Execute operation with exponential backoff retry
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationId: string,
    config?: Partial<RetryConfig>
  ): Promise<T> {
    const retryConfig = { ...this.defaultRetryConfig, ...config };
    const currentAttempt = this.retryAttempts.get(operationId) || 0;

    try {
      const result = await operation();
      // Success - reset retry count
      this.retryAttempts.delete(operationId);
      return result;
    } catch (error) {
      const authError = error as AuthError;
      
      // Check if error is retryable
      if (!authError.retryable || currentAttempt >= retryConfig.maxAttempts) {
        this.retryAttempts.delete(operationId);
        throw error;
      }

      // Increment retry count
      this.retryAttempts.set(operationId, currentAttempt + 1);

      // Calculate delay with exponential backoff
      const delay = this.calculateBackoffDelay(
        currentAttempt,
        retryConfig.initialDelayMs,
        retryConfig.maxDelayMs,
        retryConfig.backoffMultiplier
      );

      // Wait before retry
      await this.sleep(delay);

      // Retry operation
      return this.executeWithRetry(operation, operationId, config);
    }
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(
    attempt: number,
    initialDelay: number,
    maxDelay: number,
    multiplier: number
  ): number {
    const exponentialDelay = initialDelay * Math.pow(multiplier, attempt);
    const jitter = Math.random() * 0.1 * exponentialDelay; // Add 10% jitter
    return Math.min(exponentialDelay + jitter, maxDelay);
  }

  /**
   * Calculate retry delay for a specific correlation ID
   */
  private calculateRetryDelay(correlationId: string): number {
    const attempt = this.retryAttempts.get(correlationId) || 0;
    return this.calculateBackoffDelay(
      attempt,
      this.defaultRetryConfig.initialDelayMs,
      this.defaultRetryConfig.maxDelayMs,
      this.defaultRetryConfig.backoffMultiplier
    );
  }

  /**
   * Reset retry count for an operation
   */
  resetRetryCount(operationId: string): void {
    this.retryAttempts.delete(operationId);
  }

  /**
   * Get current retry count for an operation
   */
  getRetryCount(operationId: string): number {
    return this.retryAttempts.get(operationId) || 0;
  }

  /**
   * Check if operation can be retried
   */
  canRetry(operationId: string, config?: Partial<RetryConfig>): boolean {
    const retryConfig = { ...this.defaultRetryConfig, ...config };
    const currentAttempt = this.retryAttempts.get(operationId) || 0;
    return currentAttempt < retryConfig.maxAttempts;
  }

  /**
   * Extract error message from various error types
   */
  private extractErrorMessage(error: any): string {
    if (typeof error === 'string') {
      return error;
    }
    if (error instanceof Error) {
      return error.message;
    }
    if (error?.error?.message) {
      return error.error.message;
    }
    if (error?.message) {
      return error.message;
    }
    return 'An unknown error occurred';
  }

  /**
   * Generate unique correlation ID for error tracking
   */
  private generateCorrelationId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    return `auth-${timestamp}-${random}`;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log error for monitoring (can be extended with external logging service)
   */
  logError(error: AuthError, context?: Record<string, any>): void {
    console.error('[AuthErrorHandler]', {
      code: error.code,
      message: error.message,
      correlationId: error.correlationId,
      step: error.step,
      timestamp: error.timestamp,
      retryable: error.retryable,
      ...context
    });
  }
}

// Export singleton instance
export const authErrorHandler = new AuthErrorHandler();
