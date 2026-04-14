/**
 * Tests for Authentication Error Handler
 */

import { AuthErrorHandler } from '../auth-error-handler';

describe('AuthErrorHandler', () => {
  let errorHandler: AuthErrorHandler;

  beforeEach(() => {
    errorHandler = new AuthErrorHandler('TestContext');
  });

  describe('handleError', () => {
    it('should handle INVALID_EMAIL errors', () => {
      const error = new Error('INVALID_EMAIL: Valid email address is required');
      const authError = errorHandler.handleError(error, {
        operation: 'test',
        email: 'invalid-email',
        step: 'validation'
      });

      expect(authError.code).toBe('INVALID_EMAIL');
      expect(authError.userMessage).toBe('Please provide a valid email address.');
      expect(authError.retryable).toBe(false);
      expect(authError.statusCode).toBe(400);
      expect(authError.correlationId).toBeDefined();
      expect(authError.timestamp).toBeInstanceOf(Date);
    });

    it('should handle EMAIL_VERIFICATION_FAILED with invalid code', () => {
      const error = new Error('EMAIL_VERIFICATION_FAILED: Invalid verification code');
      const authError = errorHandler.handleError(error, {
        operation: 'verify',
        email: 'test@example.com',
        step: 'email_verification'
      });

      expect(authError.code).toBe('INVALID_VERIFICATION_CODE');
      expect(authError.userMessage).toBe('The verification code you entered is incorrect.');
      expect(authError.retryable).toBe(true);
      expect(authError.statusCode).toBe(400);
      expect(authError.suggestion).toContain('check the code');
    });

    it('should handle EMAIL_VERIFICATION_FAILED with expired code', () => {
      const error = new Error('EMAIL_VERIFICATION_FAILED: Code has expired');
      const authError = errorHandler.handleError(error, {
        operation: 'verify',
        email: 'test@example.com',
        step: 'email_verification'
      });

      expect(authError.code).toBe('CODE_EXPIRED');
      expect(authError.userMessage).toBe('Your verification code has expired.');
      expect(authError.retryable).toBe(true);
      expect(authError.statusCode).toBe(400);
      expect(authError.suggestion).toContain('request a new verification code');
    });

    it('should handle OTP_VERIFICATION_FAILED errors', () => {
      const error = new Error('OTP_VERIFICATION_FAILED: Invalid OTP code');
      const authError = errorHandler.handleError(error, {
        operation: 'verify-otp',
        email: 'test@example.com',
        step: 'otp_verification'
      });

      expect(authError.code).toBe('INVALID_OTP_CODE');
      expect(authError.userMessage).toBe('The OTP code you entered is incorrect.');
      expect(authError.retryable).toBe(true);
      expect(authError.statusCode).toBe(400);
      expect(authError.suggestion).toContain('authenticator app');
    });

    it('should handle OTP_SETUP_FAILED errors', () => {
      const error = new Error('OTP_SETUP_FAILED: Failed to generate OTP');
      const authError = errorHandler.handleError(error, {
        operation: 'setup-otp',
        email: 'test@example.com',
        step: 'otp_setup'
      });

      expect(authError.code).toBe('OTP_SETUP_FAILED');
      expect(authError.userMessage).toBe('Failed to set up two-factor authentication.');
      expect(authError.retryable).toBe(true);
      expect(authError.statusCode).toBe(500);
      expect(authError.suggestion).toContain('contact support');
    });

    it('should handle USER_NOT_CONFIRMED errors', () => {
      const error = new Error('USER_NOT_CONFIRMED: Email not verified');
      const authError = errorHandler.handleError(error, {
        operation: 'login',
        email: 'test@example.com',
        step: 'authentication'
      });

      expect(authError.code).toBe('USER_NOT_CONFIRMED');
      expect(authError.userMessage).toBe('Your email address has not been verified.');
      expect(authError.retryable).toBe(false);
      expect(authError.statusCode).toBe(403);
    });

    it('should handle INVALID_CREDENTIALS errors', () => {
      const error = new Error('INVALID_CREDENTIALS: Wrong password');
      const authError = errorHandler.handleError(error, {
        operation: 'login',
        email: 'test@example.com',
        step: 'login'
      });

      expect(authError.code).toBe('INVALID_CREDENTIALS');
      expect(authError.userMessage).toBe('Invalid email or password.');
      expect(authError.retryable).toBe(true);
      expect(authError.statusCode).toBe(401);
    });

    it('should handle timeout errors', () => {
      const error = new Error('Request timeout');
      error.name = 'TimeoutError';
      const authError = errorHandler.handleError(error, {
        operation: 'verify',
        email: 'test@example.com'
      });

      expect(authError.code).toBe('TIMEOUT_ERROR');
      expect(authError.userMessage).toBe('The request took too long to complete.');
      expect(authError.retryable).toBe(true);
      expect(authError.statusCode).toBe(504);
    });

    it('should handle service errors', () => {
      const error = new Error('Service unavailable');
      error.name = 'ServiceException';
      const authError = errorHandler.handleError(error, {
        operation: 'verify',
        email: 'test@example.com'
      });

      expect(authError.code).toBe('SERVICE_ERROR');
      expect(authError.userMessage).toBe('Our authentication service is temporarily unavailable.');
      expect(authError.retryable).toBe(true);
      expect(authError.statusCode).toBe(503);
    });

    it('should handle unknown errors', () => {
      const error = new Error('Something unexpected happened');
      const authError = errorHandler.handleError(error, {
        operation: 'test',
        email: 'test@example.com'
      });

      expect(authError.code).toBe('UNKNOWN_ERROR');
      expect(authError.userMessage).toBe('An unexpected error occurred.');
      expect(authError.retryable).toBe(true);
      expect(authError.statusCode).toBe(500);
      expect(authError.suggestion).toContain('contact support');
    });

    it('should include correlation ID in all errors', () => {
      const error = new Error('Test error');
      const authError = errorHandler.handleError(error, {
        operation: 'test',
        email: 'test@example.com'
      });

      expect(authError.correlationId).toBeDefined();
      expect(authError.correlationId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should preserve step information', () => {
      const error = new Error('Test error');
      const authError = errorHandler.handleError(error, {
        operation: 'test',
        email: 'test@example.com',
        step: 'custom_step'
      });

      expect(authError.step).toBe('custom_step');
    });
  });

  describe('toAPIResponse', () => {
    it('should convert AuthError to API Gateway response', () => {
      const error = new Error('INVALID_EMAIL: Test');
      const authError = errorHandler.handleError(error, {
        operation: 'test',
        email: 'test@example.com'
      });

      const response = errorHandler.toAPIResponse(authError);

      expect(response.statusCode).toBe(400);
      expect(response.headers).toHaveProperty('Content-Type', 'application/json');
      expect(response.headers).toHaveProperty('Access-Control-Allow-Origin', '*');
      expect(response.headers).toHaveProperty('X-Correlation-ID', authError.correlationId);

      const body = JSON.parse(response.body);
      expect(body.error).toHaveProperty('code', 'INVALID_EMAIL');
      expect(body.error).toHaveProperty('message', authError.userMessage);
      expect(body.error).toHaveProperty('retryable', false);
      expect(body.error).toHaveProperty('suggestion');
      expect(body.error).toHaveProperty('correlationId');
      expect(body.error).toHaveProperty('timestamp');
    });
  });

  describe('isRetryable', () => {
    it('should return false for non-retryable errors', () => {
      const errors = [
        new Error('INVALID_EMAIL: Test'),
        new Error('INVALID_CREDENTIALS: Test'),
        new Error('ALREADY_VERIFIED: Test'),
        new Error('OTP_NOT_CONFIGURED: Test')
      ];

      errors.forEach(error => {
        expect(errorHandler.isRetryable(error)).toBe(false);
      });
    });

    it('should return true for retryable errors', () => {
      const errors = [
        new Error('EMAIL_VERIFICATION_FAILED: Invalid code'),
        new Error('OTP_VERIFICATION_FAILED: Invalid code'),
        new Error('SERVICE_ERROR: Unavailable'),
        new Error('TIMEOUT_ERROR: Timeout')
      ];

      errors.forEach(error => {
        expect(errorHandler.isRetryable(error)).toBe(true);
      });
    });
  });

  describe('getRetryDelay', () => {
    it('should calculate exponential backoff delay', () => {
      const baseDelay = 1000;
      
      const delay0 = errorHandler.getRetryDelay(0, baseDelay);
      expect(delay0).toBeGreaterThanOrEqual(baseDelay);
      expect(delay0).toBeLessThanOrEqual(baseDelay * 1.3);

      const delay1 = errorHandler.getRetryDelay(1, baseDelay);
      expect(delay1).toBeGreaterThanOrEqual(baseDelay * 2);
      expect(delay1).toBeLessThanOrEqual(baseDelay * 2 * 1.3);

      const delay2 = errorHandler.getRetryDelay(2, baseDelay);
      expect(delay2).toBeGreaterThanOrEqual(baseDelay * 4);
      expect(delay2).toBeLessThanOrEqual(baseDelay * 4 * 1.3);
    });

    it('should cap delay at maximum', () => {
      const baseDelay = 1000;
      const maxDelay = 30000;
      
      const delay = errorHandler.getRetryDelay(10, baseDelay);
      expect(delay).toBeLessThanOrEqual(maxDelay * 1.3);
    });

    it('should add jitter to prevent thundering herd', () => {
      const baseDelay = 1000;
      const delays = Array.from({ length: 10 }, () => 
        errorHandler.getRetryDelay(1, baseDelay)
      );

      // All delays should be different due to jitter
      const uniqueDelays = new Set(delays);
      expect(uniqueDelays.size).toBeGreaterThan(1);
    });
  });

  describe('logAuthEvent', () => {
    it('should log successful authentication events', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      errorHandler.logAuthEvent('user_login', {
        operation: 'login',
        email: 'test@example.com',
        userId: 'user-123',
        step: 'authentication'
      }, true, { sessionId: 'session-456' });

      expect(consoleSpy).toHaveBeenCalled();
      const logEntry = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(logEntry.level).toBe('INFO');
      expect(logEntry.message).toContain('user_login');
      expect(logEntry.success).toBe(true);

      consoleSpy.mockRestore();
    });

    it('should log failed authentication events', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      errorHandler.logAuthEvent('user_login', {
        operation: 'login',
        email: 'test@example.com',
        step: 'authentication'
      }, false);

      expect(consoleSpy).toHaveBeenCalled();
      const logEntry = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(logEntry.level).toBe('WARN');
      expect(logEntry.message).toContain('failed');
      expect(logEntry.success).toBe(false);

      consoleSpy.mockRestore();
    });
  });
});
