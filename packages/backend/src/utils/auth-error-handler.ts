/**
 * Authentication Error Handler
 * Specialized error handling for authentication services with correlation IDs,
 * error transformation, and comprehensive logging
 */

import { v4 as uuidv4 } from 'uuid';
import { Logger, createLogger } from './logger';
import { APIGatewayProxyResult } from 'aws-lambda';

export interface AuthError {
  code: string;
  message: string;
  userMessage: string;
  retryable: boolean;
  suggestion: string;
  correlationId: string;
  timestamp: Date;
  step?: string;
  statusCode: number;
}

export interface AuthErrorContext {
  operation: string;
  email?: string;
  userId?: string;
  step?: string;
  metadata?: Record<string, any>;
}

export class AuthErrorHandler {
  private logger: Logger;

  constructor(context: string = 'AuthErrorHandler') {
    this.logger = createLogger(context);
  }

  /**
   * Handle authentication errors with correlation ID and proper logging
   */
  handleError(error: Error, context: AuthErrorContext): AuthError {
    const correlationId = uuidv4();
    const timestamp = new Date();

    // Log the error with correlation ID
    this.logger.error('Authentication error occurred', error, {
      correlationId,
      operation: context.operation,
      email: context.email,
      userId: context.userId,
      step: context.step,
      metadata: context.metadata,
      errorName: error.name,
      errorMessage: error.message
    });

    // Transform error to user-friendly format
    const authError = this.transformError(error, correlationId, timestamp, context);

    // Log the transformed error for monitoring
    this.logger.warn('Authentication error transformed for user', {
      correlationId,
      code: authError.code,
      userMessage: authError.userMessage,
      retryable: authError.retryable,
      step: authError.step
    });

    return authError;
  }

  /**
   * Transform technical errors into user-friendly errors
   */
  private transformError(
    error: Error,
    correlationId: string,
    timestamp: Date,
    context: AuthErrorContext
  ): AuthError {
    const message = error.message;

    // Email verification errors
    if (message.includes('INVALID_EMAIL')) {
      return {
        code: 'INVALID_EMAIL',
        message: message,
        userMessage: 'Please provide a valid email address.',
        retryable: false,
        suggestion: 'Check your email address format and try again.',
        correlationId,
        timestamp,
        step: context.step,
        statusCode: 400
      };
    }

    if (message.includes('EMAIL_VERIFICATION_FAILED')) {
      const details = message.split(': ')[1] || '';
      
      if (details.includes('Invalid verification code')) {
        return {
          code: 'INVALID_VERIFICATION_CODE',
          message: message,
          userMessage: 'The verification code you entered is incorrect.',
          retryable: true,
          suggestion: 'Please check the code in your email and try again. The code is case-sensitive.',
          correlationId,
          timestamp,
          step: context.step || 'email_verification',
          statusCode: 400
        };
      }

      if (details.includes('expired')) {
        return {
          code: 'CODE_EXPIRED',
          message: message,
          userMessage: 'Your verification code has expired.',
          retryable: true,
          suggestion: 'Please request a new verification code and try again.',
          correlationId,
          timestamp,
          step: context.step || 'email_verification',
          statusCode: 400
        };
      }

      if (details.includes('already verified')) {
        return {
          code: 'ALREADY_VERIFIED',
          message: message,
          userMessage: 'This email address is already verified.',
          retryable: false,
          suggestion: 'You can proceed to the next step.',
          correlationId,
          timestamp,
          step: context.step || 'email_verification',
          statusCode: 400
        };
      }
    }

    // OTP errors
    if (message.includes('OTP_VERIFICATION_FAILED')) {
      const details = message.split(': ')[1] || '';
      
      if (details.includes('Invalid OTP code')) {
        return {
          code: 'INVALID_OTP_CODE',
          message: message,
          userMessage: 'The OTP code you entered is incorrect.',
          retryable: true,
          suggestion: 'Please check your authenticator app and enter the current 6-digit code. You can also use a backup code.',
          correlationId,
          timestamp,
          step: context.step || 'otp_verification',
          statusCode: 400
        };
      }

      if (details.includes('OTP not configured')) {
        return {
          code: 'OTP_NOT_CONFIGURED',
          message: message,
          userMessage: 'OTP is not set up for your account.',
          retryable: false,
          suggestion: 'Please complete email verification first to set up OTP.',
          correlationId,
          timestamp,
          step: context.step || 'otp_setup',
          statusCode: 400
        };
      }
    }

    if (message.includes('OTP_SETUP_FAILED')) {
      return {
        code: 'OTP_SETUP_FAILED',
        message: message,
        userMessage: 'Failed to set up two-factor authentication.',
        retryable: true,
        suggestion: 'Please try again. If the problem persists, contact support with reference: ' + correlationId,
        correlationId,
        timestamp,
        step: context.step || 'otp_setup',
        statusCode: 500
      };
    }

    // Authentication flow errors
    if (message.includes('AUTH_FLOW_ERROR')) {
      return {
        code: 'AUTH_FLOW_ERROR',
        message: message,
        userMessage: 'Unable to start the authentication process.',
        retryable: true,
        suggestion: 'Please try again in a few moments. If the problem persists, contact support.',
        correlationId,
        timestamp,
        step: context.step || 'initiation',
        statusCode: 500
      };
    }

    if (message.includes('USER_NOT_CONFIRMED')) {
      return {
        code: 'USER_NOT_CONFIRMED',
        message: message,
        userMessage: 'Your email address has not been verified.',
        retryable: false,
        suggestion: 'Please check your email for the verification code.',
        correlationId,
        timestamp,
        step: context.step || 'authentication',
        statusCode: 403
      };
    }

    if (message.includes('INVALID_CREDENTIALS')) {
      return {
        code: 'INVALID_CREDENTIALS',
        message: message,
        userMessage: 'Invalid email or password.',
        retryable: true,
        suggestion: 'Please check your credentials and try again.',
        correlationId,
        timestamp,
        step: context.step || 'login',
        statusCode: 401
      };
    }

    // User management errors
    if (message.includes('USER_CREATION_FAILED')) {
      return {
        code: 'USER_CREATION_FAILED',
        message: message,
        userMessage: 'Unable to create your account.',
        retryable: true,
        suggestion: 'Please try again. If the problem persists, contact support with reference: ' + correlationId,
        correlationId,
        timestamp,
        step: context.step || 'registration',
        statusCode: 500
      };
    }

    // Token errors
    if (message.includes('TOKEN_GENERATION_FAILED')) {
      return {
        code: 'TOKEN_GENERATION_FAILED',
        message: message,
        userMessage: 'Authentication successful but unable to create your session.',
        retryable: true,
        suggestion: 'Please try logging in again.',
        correlationId,
        timestamp,
        step: context.step || 'session_creation',
        statusCode: 500
      };
    }

    // Network and service errors
    if (message.includes('COGNITO_ERROR') || error.name === 'ServiceException') {
      return {
        code: 'SERVICE_ERROR',
        message: message,
        userMessage: 'Our authentication service is temporarily unavailable.',
        retryable: true,
        suggestion: 'Please try again in a few moments.',
        correlationId,
        timestamp,
        step: context.step,
        statusCode: 503
      };
    }

    if (error.name === 'TimeoutError' || message.includes('timeout')) {
      return {
        code: 'TIMEOUT_ERROR',
        message: message,
        userMessage: 'The request took too long to complete.',
        retryable: true,
        suggestion: 'Please check your internet connection and try again.',
        correlationId,
        timestamp,
        step: context.step,
        statusCode: 504
      };
    }

    // Generic error
    return {
      code: 'UNKNOWN_ERROR',
      message: message,
      userMessage: 'An unexpected error occurred.',
      retryable: true,
      suggestion: 'Please try again. If the problem persists, contact support with reference: ' + correlationId,
      correlationId,
      timestamp,
      step: context.step,
      statusCode: 500
    };
  }

  /**
   * Convert AuthError to API Gateway response
   */
  toAPIResponse(authError: AuthError): APIGatewayProxyResult {
    return {
      statusCode: authError.statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'X-Correlation-ID': authError.correlationId
      },
      body: JSON.stringify({
        error: {
          code: authError.code,
          message: authError.userMessage,
          retryable: authError.retryable,
          suggestion: authError.suggestion,
          correlationId: authError.correlationId,
          timestamp: authError.timestamp.toISOString(),
          step: authError.step
        }
      })
    };
  }

  /**
   * Log authentication event for monitoring
   */
  logAuthEvent(
    event: string,
    context: AuthErrorContext,
    success: boolean,
    metadata?: Record<string, any>
  ): void {
    const correlationId = uuidv4();

    if (success) {
      this.logger.info(`Authentication event: ${event}`, {
        correlationId,
        event,
        operation: context.operation,
        email: context.email,
        userId: context.userId,
        step: context.step,
        success: true,
        ...metadata
      });
    } else {
      this.logger.warn(`Authentication event failed: ${event}`, {
        correlationId,
        event,
        operation: context.operation,
        email: context.email,
        userId: context.userId,
        step: context.step,
        success: false,
        ...metadata
      });
    }
  }

  /**
   * Check if error is retryable
   */
  isRetryable(error: Error): boolean {
    const message = error.message;
    
    // Non-retryable errors
    if (
      message.includes('INVALID_EMAIL') ||
      message.includes('INVALID_CREDENTIALS') ||
      message.includes('ALREADY_VERIFIED') ||
      message.includes('OTP_NOT_CONFIGURED')
    ) {
      return false;
    }

    // Most other errors are retryable
    return true;
  }

  /**
   * Get retry delay based on attempt count (exponential backoff)
   */
  getRetryDelay(attemptCount: number, baseDelay: number = 1000): number {
    const maxDelay = 30000; // 30 seconds
    const delay = Math.min(baseDelay * Math.pow(2, attemptCount), maxDelay);
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.3 * delay;
    return Math.floor(delay + jitter);
  }
}

/**
 * Create a singleton instance for the application
 */
export const authErrorHandler = new AuthErrorHandler();
