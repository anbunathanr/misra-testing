import { APIGatewayProxyEvent } from 'aws-lambda';

// Mock the UnifiedAuthService
const mockAuthenticate = jest.fn();
jest.mock('../../../services/auth/unified-auth-service', () => {
  return {
    UnifiedAuthService: jest.fn().mockImplementation(() => ({
      authenticate: mockAuthenticate
    }))
  };
});

import { handler } from '../seamless-auth';

describe('Seamless Auth Lambda', () => {
  const createEvent = (body: any): APIGatewayProxyEvent => ({
    body: JSON.stringify(body),
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: '/auth/seamless',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as any,
    resource: ''
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('successful authentication', () => {
    it('should handle quick registration (no password)', async () => {
      const mockAuthResult = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        user: {
          userId: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          organizationId: 'org-123',
          role: 'developer'
        },
        expiresIn: 3600,
        isNewUser: true,
        message: 'Account created successfully. Session valid for 1 hour.'
      };

      mockAuthenticate.mockResolvedValue(mockAuthResult);

      const event = createEvent({
        email: 'test@example.com',
        name: 'Test User'
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      
      const response = JSON.parse(result.body);
      expect(response.accessToken).toBe('mock-access-token');
      expect(response.expiresIn).toBe(3600);
      expect(response.isNewUser).toBe(true);
      expect(response.message).toContain('Account created successfully');

      expect(mockAuthenticate).toHaveBeenCalledWith(
        {
          email: 'test@example.com',
          password: undefined,
          name: 'Test User'
        },
        {
          maxRetries: 3,
          baseDelay: 1000,
          maxDelay: 5000
        }
      );
    });

    it('should handle standard login (with password)', async () => {
      const mockAuthResult = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        user: {
          userId: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          organizationId: 'org-123',
          role: 'developer'
        },
        expiresIn: 3600,
        isNewUser: false,
        message: 'Login successful. Session valid for 1 hour.'
      };

      mockAuthenticate.mockResolvedValue(mockAuthResult);

      const event = createEvent({
        email: 'test@example.com',
        password: 'password123'
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      
      const response = JSON.parse(result.body);
      expect(response.accessToken).toBe('mock-access-token');
      expect(response.expiresIn).toBe(3600);
      expect(response.isNewUser).toBe(false);
      expect(response.message).toContain('Login successful');

      expect(mockAuthenticate).toHaveBeenCalledWith(
        {
          email: 'test@example.com',
          password: 'password123',
          name: undefined
        },
        {
          maxRetries: 3,
          baseDelay: 1000,
          maxDelay: 5000
        }
      );
    });
  });

  describe('error handling', () => {
    it('should return error for missing body', async () => {
      const event = { ...createEvent({}), body: null };
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      
      const response = JSON.parse(result.body);
      expect(response.error.code).toBe('MISSING_BODY');
      expect(response.error.message).toBe('Request body is required');
    });

    it('should return error for missing email', async () => {
      const event = createEvent({ name: 'Test User' });
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      
      const response = JSON.parse(result.body);
      expect(response.error.code).toBe('INVALID_EMAIL');
      expect(response.error.message).toBe('Valid email address is required');
    });

    it('should handle invalid credentials error', async () => {
      mockAuthenticate.mockRejectedValue(
        new Error('INVALID_CREDENTIALS: Invalid email or password')
      );

      const event = createEvent({
        email: 'test@example.com',
        password: 'wrongpassword'
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
      
      const response = JSON.parse(result.body);
      expect(response.error.code).toBe('INVALID_CREDENTIALS');
      expect(response.error.message).toContain('Invalid email or password');
      expect(response.error.retryable).toBe(false);
    });

    it('should handle user not confirmed error', async () => {
      mockAuthenticate.mockRejectedValue(
        new Error('USER_NOT_CONFIRMED: User is not confirmed')
      );

      const event = createEvent({
        email: 'test@example.com',
        password: 'password123'
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
      
      const response = JSON.parse(result.body);
      expect(response.error.code).toBe('USER_NOT_CONFIRMED');
      expect(response.error.message).toContain('verify your email');
      expect(response.error.retryable).toBe(false);
    });

    it('should handle retry exhausted error', async () => {
      mockAuthenticate.mockRejectedValue(
        new Error('AUTHENTICATION_RETRY_EXHAUSTED: Failed after 3 attempts')
      );

      const event = createEvent({
        email: 'test@example.com',
        password: 'password123'
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(503);
      
      const response = JSON.parse(result.body);
      expect(response.error.code).toBe('SERVICE_TEMPORARILY_UNAVAILABLE');
      expect(response.error.message).toContain('temporarily unavailable');
      expect(response.error.retryable).toBe(true);
    });

    it('should handle user creation failed error', async () => {
      mockAuthenticate.mockRejectedValue(
        new Error('USER_CREATION_FAILED: Failed to create user account')
      );

      const event = createEvent({
        email: 'test@example.com'
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      
      const response = JSON.parse(result.body);
      expect(response.error.code).toBe('USER_CREATION_FAILED');
      expect(response.error.message).toContain('Failed to create user account');
      expect(response.error.retryable).toBe(true);
    });

    it('should handle config error', async () => {
      mockAuthenticate.mockRejectedValue(
        new Error('CONFIG_ERROR: Cognito client not configured')
      );

      const event = createEvent({
        email: 'test@example.com',
        password: 'password123'
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      
      const response = JSON.parse(result.body);
      expect(response.error.code).toBe('CONFIG_ERROR');
      expect(response.error.message).toContain('configuration error');
      expect(response.error.retryable).toBe(true);
    });

    it('should handle generic errors', async () => {
      mockAuthenticate.mockRejectedValue(
        new Error('Unexpected error')
      );

      const event = createEvent({
        email: 'test@example.com'
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      
      const response = JSON.parse(result.body);
      expect(response.error.code).toBe('AUTHENTICATION_ERROR');
      expect(response.error.message).toBe('Authentication failed. Please try again.');
      expect(response.error.retryable).toBe(true);
    });
  });

  describe('response format', () => {
    it('should have proper CORS headers', async () => {
      const mockAuthResult = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        user: {
          userId: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          organizationId: 'org-123',
          role: 'developer'
        },
        expiresIn: 3600,
        isNewUser: false,
        message: 'Login successful'
      };

      mockAuthenticate.mockResolvedValue(mockAuthResult);

      const event = createEvent({
        email: 'test@example.com',
        password: 'password123'
      });

      const result = await handler(event);

      expect(result.headers).toEqual({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      });
    });

    it('should include error metadata', async () => {
      mockAuthenticate.mockRejectedValue(
        new Error('INVALID_EMAIL: Valid email address is required')
      );

      const event = createEvent({ email: 'invalid-email' });
      const result = await handler(event);

      const response = JSON.parse(result.body);
      expect(response.error.timestamp).toBeDefined();
      expect(response.error.requestId).toBeDefined();
      expect(response.error.retryable).toBeDefined();
      expect(typeof response.error.timestamp).toBe('string');
      expect(typeof response.error.requestId).toBe('string');
      expect(typeof response.error.retryable).toBe('boolean');
    });
  });
});