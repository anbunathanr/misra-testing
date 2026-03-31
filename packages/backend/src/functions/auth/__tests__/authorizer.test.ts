// Mock JWTService before importing the handler
const mockExtractTokenFromHeader = jest.fn();
const mockVerifyAccessToken = jest.fn();

jest.mock('../../../services/auth/jwt-service', () => {
  return {
    JWTService: jest.fn().mockImplementation(() => {
      return {
        extractTokenFromHeader: mockExtractTokenFromHeader,
        verifyAccessToken: mockVerifyAccessToken,
      };
    }),
  };
});

import { handler, AuthorizerEvent, AuthorizerResponse } from '../authorizer';

describe('Lambda Authorizer Handler', () => {
  // Helper function to create mock authorizer events
  const createMockEvent = (authHeader?: string): AuthorizerEvent => ({
    type: 'REQUEST',
    methodArn: 'arn:aws:execute-api:us-east-1:123456789012:abc123/prod/GET/projects',
    headers: authHeader ? { authorization: authHeader } : {},
    requestContext: {
      accountId: '123456789012',
      apiId: 'abc123',
      domainName: 'api.example.com',
      requestId: 'test-request-id',
    },
  });

  // Helper function to create mock user payload
  const createMockUser = () => ({
    userId: 'user-123',
    email: 'test@example.com',
    organizationId: 'org-456',
    role: 'developer' as const,
  });

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('Valid JWT Token Scenarios', () => {
    it('should return allow policy with user context for valid JWT token', async () => {
      // Arrange
      const mockUser = createMockUser();
      const validToken = 'valid.jwt.token';
      const event = createMockEvent(`Bearer ${validToken}`);

      mockExtractTokenFromHeader.mockReturnValue(validToken);
      mockVerifyAccessToken.mockResolvedValue(mockUser);

      // Act
      const response = await handler(event);

      // Assert
      expect(response.policyDocument.Statement[0].Effect).toBe('Allow');
      expect(response.principalId).toBe(mockUser.userId);
      expect(response.context).toEqual({
        userId: mockUser.userId,
        email: mockUser.email,
        organizationId: mockUser.organizationId,
        role: mockUser.role,
      });
    });

    it('should call JWTService.extractTokenFromHeader with authorization header', async () => {
      // Arrange
      const mockUser = createMockUser();
      const validToken = 'valid.jwt.token';
      const authHeader = `Bearer ${validToken}`;
      const event = createMockEvent(authHeader);

      mockExtractTokenFromHeader.mockReturnValue(validToken);
      mockVerifyAccessToken.mockResolvedValue(mockUser);

      // Act
      await handler(event);

      // Assert
      expect(mockExtractTokenFromHeader).toHaveBeenCalledWith(authHeader);
    });

    it('should call JWTService.verifyAccessToken with extracted token', async () => {
      // Arrange
      const mockUser = createMockUser();
      const validToken = 'valid.jwt.token';
      const event = createMockEvent(`Bearer ${validToken}`);

      mockExtractTokenFromHeader.mockReturnValue(validToken);
      mockVerifyAccessToken.mockResolvedValue(mockUser);

      // Act
      await handler(event);

      // Assert
      expect(mockVerifyAccessToken).toHaveBeenCalledWith(validToken);
    });
  });

  describe('Missing Authorization Header', () => {
    it('should return deny policy when Authorization header is missing', async () => {
      // Arrange
      const event = createMockEvent(); // No auth header

      // Act
      const response = await handler(event);

      // Assert
      expect(response.policyDocument.Statement[0].Effect).toBe('Deny');
      expect(response.principalId).toBe('unauthorized');
      expect(response.context).toBeUndefined();
    });

    it('should not call JWTService when Authorization header is missing', async () => {
      // Arrange
      const event = createMockEvent();

      // Act
      await handler(event);

      // Assert
      expect(mockExtractTokenFromHeader).not.toHaveBeenCalled();
      expect(mockVerifyAccessToken).not.toHaveBeenCalled();
    });
  });

  describe('Malformed Authorization Header', () => {
    it('should return deny policy when Authorization header has no "Bearer " prefix', async () => {
      // Arrange
      const event = createMockEvent('InvalidTokenFormat');
      mockExtractTokenFromHeader.mockReturnValue(null);

      // Act
      const response = await handler(event);

      // Assert
      expect(response.policyDocument.Statement[0].Effect).toBe('Deny');
      expect(response.principalId).toBe('unauthorized');
      expect(response.context).toBeUndefined();
    });

    it('should return deny policy for empty Authorization header', async () => {
      // Arrange
      const event = createMockEvent('');
      mockExtractTokenFromHeader.mockReturnValue(null);

      // Act
      const response = await handler(event);

      // Assert
      expect(response.policyDocument.Statement[0].Effect).toBe('Deny');
      expect(response.principalId).toBe('unauthorized');
    });

    it('should return deny policy for "Bearer " without token', async () => {
      // Arrange
      const event = createMockEvent('Bearer ');
      mockExtractTokenFromHeader.mockReturnValue(null);

      // Act
      const response = await handler(event);

      // Assert
      expect(response.policyDocument.Statement[0].Effect).toBe('Deny');
      expect(response.principalId).toBe('unauthorized');
    });
  });

  describe('Expired JWT Token', () => {
    it('should return deny policy when JWT token is expired', async () => {
      // Arrange
      const expiredToken = 'expired.jwt.token';
      const event = createMockEvent(`Bearer ${expiredToken}`);

      mockExtractTokenFromHeader.mockReturnValue(expiredToken);
      mockVerifyAccessToken.mockRejectedValue(new Error('Token expired'));

      // Act
      const response = await handler(event);

      // Assert
      expect(response.policyDocument.Statement[0].Effect).toBe('Deny');
      expect(response.principalId).toBe('unauthorized');
      expect(response.context).toBeUndefined();
    });
  });

  describe('Invalid JWT Signature', () => {
    it('should return deny policy when JWT signature is invalid', async () => {
      // Arrange
      const invalidToken = 'invalid.jwt.token';
      const event = createMockEvent(`Bearer ${invalidToken}`);

      mockExtractTokenFromHeader.mockReturnValue(invalidToken);
      mockVerifyAccessToken.mockRejectedValue(new Error('Invalid token'));

      // Act
      const response = await handler(event);

      // Assert
      expect(response.policyDocument.Statement[0].Effect).toBe('Deny');
      expect(response.principalId).toBe('unauthorized');
      expect(response.context).toBeUndefined();
    });
  });

  describe('JWT_Service Error Handling', () => {
    it('should return deny policy when JWT_Service throws an error', async () => {
      // Arrange
      const token = 'some.jwt.token';
      const event = createMockEvent(`Bearer ${token}`);

      mockExtractTokenFromHeader.mockReturnValue(token);
      mockVerifyAccessToken.mockRejectedValue(new Error('JWT verification failed'));

      // Act
      const response = await handler(event);

      // Assert
      expect(response.policyDocument.Statement[0].Effect).toBe('Deny');
      expect(response.principalId).toBe('unauthorized');
      expect(response.context).toBeUndefined();
    });

    it('should return deny policy when Secrets Manager fails', async () => {
      // Arrange
      const token = 'some.jwt.token';
      const event = createMockEvent(`Bearer ${token}`);

      mockExtractTokenFromHeader.mockReturnValue(token);
      mockVerifyAccessToken.mockRejectedValue(
        new Error('Failed to retrieve JWT secret from Secrets Manager')
      );

      // Act
      const response = await handler(event);

      // Assert
      expect(response.policyDocument.Statement[0].Effect).toBe('Deny');
      expect(response.principalId).toBe('unauthorized');
    });
  });

  describe('Policy Structure Validation', () => {
    it('should include correct principalId matching userId for allow policy', async () => {
      // Arrange
      const mockUser = createMockUser();
      const validToken = 'valid.jwt.token';
      const event = createMockEvent(`Bearer ${validToken}`);

      mockExtractTokenFromHeader.mockReturnValue(validToken);
      mockVerifyAccessToken.mockResolvedValue(mockUser);

      // Act
      const response = await handler(event);

      // Assert
      expect(response.principalId).toBe(mockUser.userId);
    });

    it('should contain correct resource ARN with wildcard', async () => {
      // Arrange
      const mockUser = createMockUser();
      const validToken = 'valid.jwt.token';
      const event = createMockEvent(`Bearer ${validToken}`);

      mockExtractTokenFromHeader.mockReturnValue(validToken);
      mockVerifyAccessToken.mockResolvedValue(mockUser);

      // Act
      const response = await handler(event);

      // Assert
      expect(response.policyDocument.Statement[0].Resource).toBe(
        'arn:aws:execute-api:us-east-1:123456789012:abc123/prod/*'
      );
      expect(response.policyDocument.Statement[0].Resource).toMatch(/\/\*$/);
    });

    it('should conform to API Gateway HTTP API format with Version "2012-10-17"', async () => {
      // Arrange
      const mockUser = createMockUser();
      const validToken = 'valid.jwt.token';
      const event = createMockEvent(`Bearer ${validToken}`);

      mockExtractTokenFromHeader.mockReturnValue(validToken);
      mockVerifyAccessToken.mockResolvedValue(mockUser);

      // Act
      const response = await handler(event);

      // Assert
      expect(response.policyDocument.Version).toBe('2012-10-17');
    });

    it('should conform to API Gateway HTTP API format with Action "execute-api:Invoke"', async () => {
      // Arrange
      const mockUser = createMockUser();
      const validToken = 'valid.jwt.token';
      const event = createMockEvent(`Bearer ${validToken}`);

      mockExtractTokenFromHeader.mockReturnValue(validToken);
      mockVerifyAccessToken.mockResolvedValue(mockUser);

      // Act
      const response = await handler(event);

      // Assert
      expect(response.policyDocument.Statement[0].Action).toBe('execute-api:Invoke');
    });
  });

  describe('User Context Validation', () => {
    it('should contain all required user fields in context', async () => {
      // Arrange
      const mockUser = createMockUser();
      const validToken = 'valid.jwt.token';
      const event = createMockEvent(`Bearer ${validToken}`);

      mockExtractTokenFromHeader.mockReturnValue(validToken);
      mockVerifyAccessToken.mockResolvedValue(mockUser);

      // Act
      const response = await handler(event);

      // Assert
      expect(response.context).toBeDefined();
      expect(response.context?.userId).toBe(mockUser.userId);
      expect(response.context?.email).toBe(mockUser.email);
      expect(response.context?.organizationId).toBe(mockUser.organizationId);
      expect(response.context?.role).toBe(mockUser.role);
    });

    it('should ensure all context values are strings', async () => {
      // Arrange
      const mockUser = createMockUser();
      const validToken = 'valid.jwt.token';
      const event = createMockEvent(`Bearer ${validToken}`);

      mockExtractTokenFromHeader.mockReturnValue(validToken);
      mockVerifyAccessToken.mockResolvedValue(mockUser);

      // Act
      const response = await handler(event);

      // Assert
      expect(typeof response.context?.userId).toBe('string');
      expect(typeof response.context?.email).toBe('string');
      expect(typeof response.context?.organizationId).toBe('string');
      expect(typeof response.context?.role).toBe('string');
    });
  });

  describe('Deny Policy Validation', () => {
    it('should not include context for deny policies', async () => {
      // Arrange
      const event = createMockEvent(); // Missing auth header

      // Act
      const response = await handler(event);

      // Assert
      expect(response.policyDocument.Statement[0].Effect).toBe('Deny');
      expect(response.context).toBeUndefined();
    });

    it('should set principalId to "unauthorized" for deny policies', async () => {
      // Arrange
      const invalidToken = 'invalid.jwt.token';
      const event = createMockEvent(`Bearer ${invalidToken}`);

      mockExtractTokenFromHeader.mockReturnValue(invalidToken);
      mockVerifyAccessToken.mockRejectedValue(new Error('Invalid token'));

      // Act
      const response = await handler(event);

      // Assert
      expect(response.principalId).toBe('unauthorized');
    });
  });

  describe('Case-Insensitive Authorization Header', () => {
    it('should handle lowercase "authorization" header', async () => {
      // Arrange
      const mockUser = createMockUser();
      const validToken = 'valid.jwt.token';
      const event: AuthorizerEvent = {
        type: 'REQUEST',
        methodArn: 'arn:aws:execute-api:us-east-1:123456789012:abc123/prod/GET/projects',
        headers: { authorization: `Bearer ${validToken}` },
        requestContext: {
          accountId: '123456789012',
          apiId: 'abc123',
          domainName: 'api.example.com',
          requestId: 'test-request-id',
        },
      };

      mockExtractTokenFromHeader.mockReturnValue(validToken);
      mockVerifyAccessToken.mockResolvedValue(mockUser);

      // Act
      const response = await handler(event);

      // Assert
      expect(response.policyDocument.Statement[0].Effect).toBe('Allow');
    });

    it('should handle uppercase "Authorization" header', async () => {
      // Arrange
      const mockUser = createMockUser();
      const validToken = 'valid.jwt.token';
      const event: AuthorizerEvent = {
        type: 'REQUEST',
        methodArn: 'arn:aws:execute-api:us-east-1:123456789012:abc123/prod/GET/projects',
        headers: { Authorization: `Bearer ${validToken}` },
        requestContext: {
          accountId: '123456789012',
          apiId: 'abc123',
          domainName: 'api.example.com',
          requestId: 'test-request-id',
        },
      };

      mockExtractTokenFromHeader.mockReturnValue(validToken);
      mockVerifyAccessToken.mockResolvedValue(mockUser);

      // Act
      const response = await handler(event);

      // Assert
      expect(response.policyDocument.Statement[0].Effect).toBe('Allow');
    });
  });

  describe('Requirements Validation', () => {
    it('validates Requirement 12.1: Valid JWT token returns allow policy with user context', async () => {
      // Arrange
      const mockUser = createMockUser();
      const validToken = 'valid.jwt.token';
      const event = createMockEvent(`Bearer ${validToken}`);

      mockExtractTokenFromHeader.mockReturnValue(validToken);
      mockVerifyAccessToken.mockResolvedValue(mockUser);

      // Act
      const response = await handler(event);

      // Assert
      expect(response.policyDocument.Statement[0].Effect).toBe('Allow');
      expect(response.context).toBeDefined();
      expect(response.context?.userId).toBe(mockUser.userId);
    });

    it('validates Requirement 12.2: Missing Authorization header returns deny policy', async () => {
      // Arrange
      const event = createMockEvent();

      // Act
      const response = await handler(event);

      // Assert
      expect(response.policyDocument.Statement[0].Effect).toBe('Deny');
    });

    it('validates Requirement 12.3: Malformed Authorization header returns deny policy', async () => {
      // Arrange
      const event = createMockEvent('InvalidFormat');
      mockExtractTokenFromHeader.mockReturnValue(null);

      // Act
      const response = await handler(event);

      // Assert
      expect(response.policyDocument.Statement[0].Effect).toBe('Deny');
    });

    it('validates Requirement 12.4: Expired JWT token returns deny policy', async () => {
      // Arrange
      const expiredToken = 'expired.jwt.token';
      const event = createMockEvent(`Bearer ${expiredToken}`);

      mockExtractTokenFromHeader.mockReturnValue(expiredToken);
      mockVerifyAccessToken.mockRejectedValue(new Error('Token expired'));

      // Act
      const response = await handler(event);

      // Assert
      expect(response.policyDocument.Statement[0].Effect).toBe('Deny');
    });
  });
});
