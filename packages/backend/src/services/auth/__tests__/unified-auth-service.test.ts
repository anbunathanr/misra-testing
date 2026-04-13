import { UnifiedAuthService } from '../unified-auth-service';

// Mock AWS SDK clients
jest.mock('@aws-sdk/client-cognito-identity-provider');
jest.mock('../jwt-service');
jest.mock('../../user/user-service');

describe('UnifiedAuthService', () => {
  let authService: UnifiedAuthService;
  let mockJWTService: any;
  let mockUserService: any;
  let mockCognitoClient: any;

  beforeEach(() => {
    // Set up environment variables for tests
    process.env.COGNITO_CLIENT_ID = 'test-client-id';
    process.env.COGNITO_USER_POOL_ID = 'test-user-pool-id';
    process.env.AWS_REGION = 'us-east-1';
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock JWT Service
    mockJWTService = {
      generateTokenPair: jest.fn().mockResolvedValue({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 3600 // 1 hour
      })
    };

    // Mock User Service
    mockUserService = {
      getUserByEmail: jest.fn(),
      createUser: jest.fn(),
      updateLastLogin: jest.fn()
    };

    // Mock Cognito Client
    mockCognitoClient = {
      send: jest.fn()
    };

    authService = new UnifiedAuthService();
    
    // Replace the private instances with mocks
    (authService as any).jwtService = mockJWTService;
    (authService as any).userService = mockUserService;
    (authService as any).cognitoClient = mockCognitoClient;
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.COGNITO_CLIENT_ID;
    delete process.env.COGNITO_USER_POOL_ID;
  });

  describe('authenticate', () => {
    it('should use login flow when password is provided', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
        organizationId: 'org-123',
        role: 'developer'
      };

      // Mock successful Cognito authentication
      mockCognitoClient.send.mockResolvedValue({
        AuthenticationResult: {
          IdToken: 'header.' + Buffer.from(JSON.stringify({ sub: 'cognito-sub' })).toString('base64url') + '.signature'
        }
      });

      mockUserService.getUserByEmail.mockResolvedValue(mockUser);

      const result = await authService.authenticate({
        email: 'test@example.com',
        password: 'password123'
      });

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.expiresIn).toBe(3600);
      expect(result.isNewUser).toBe(false);
      expect(result.message).toContain('Login successful');
    });

    it('should use quick registration flow when no password is provided', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
        organizationId: 'org-123',
        role: 'developer'
      };

      // Mock user doesn't exist in Cognito
      mockCognitoClient.send
        .mockRejectedValueOnce({ name: 'UserNotFoundException' }) // First call - check if user exists
        .mockResolvedValueOnce({}) // Create user
        .mockResolvedValueOnce({}) // Set password
        .mockResolvedValueOnce({ // Get user after creation
          UserAttributes: [{ Name: 'sub', Value: 'new-cognito-sub' }]
        });

      mockUserService.getUserByEmail.mockResolvedValue(null);
      mockUserService.createUser.mockResolvedValue(mockUser);

      const result = await authService.authenticate({
        email: 'test@example.com',
        name: 'Test User'
      });

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.expiresIn).toBe(3600);
      expect(result.isNewUser).toBe(true);
      expect(result.message).toContain('Account created successfully');
    });

    it('should validate email format', async () => {
      await expect(authService.authenticate({
        email: 'invalid-email'
      })).rejects.toThrow('INVALID_EMAIL');
    });
  });

  describe('quickRegister', () => {
    it('should create new user when user does not exist', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'newuser@example.com',
        organizationId: 'org-123',
        role: 'developer'
      };

      // Mock user doesn't exist in Cognito
      mockCognitoClient.send
        .mockRejectedValueOnce({ name: 'UserNotFoundException' })
        .mockResolvedValueOnce({}) // Create user
        .mockResolvedValueOnce({}) // Set password
        .mockResolvedValueOnce({ // Get user after creation
          UserAttributes: [{ Name: 'sub', Value: 'new-cognito-sub' }]
        });

      mockUserService.getUserByEmail.mockResolvedValue(null);
      mockUserService.createUser.mockResolvedValue(mockUser);

      const result = await authService.quickRegister('newuser@example.com', 'New User');

      expect(result.isNewUser).toBe(true);
      expect(result.user.email).toBe('newuser@example.com');
      expect(mockUserService.createUser).toHaveBeenCalled();
    });

    it('should login existing user', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'existing@example.com',
        organizationId: 'org-123',
        role: 'developer'
      };

      // Mock user exists in Cognito
      mockCognitoClient.send.mockResolvedValue({
        UserAttributes: [{ Name: 'sub', Value: 'existing-cognito-sub' }]
      });

      mockUserService.getUserByEmail.mockResolvedValue(mockUser);

      const result = await authService.quickRegister('existing@example.com');

      expect(result.isNewUser).toBe(false);
      expect(result.user.email).toBe('existing@example.com');
      expect(mockUserService.updateLastLogin).toHaveBeenCalledWith(mockUser.userId);
    });
  });

  describe('login', () => {
    it('should authenticate with valid credentials', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
        organizationId: 'org-123',
        role: 'developer'
      };

      // Mock successful Cognito authentication
      mockCognitoClient.send.mockResolvedValue({
        AuthenticationResult: {
          IdToken: 'header.' + Buffer.from(JSON.stringify({ sub: 'cognito-sub' })).toString('base64url') + '.signature'
        }
      });

      mockUserService.getUserByEmail.mockResolvedValue(mockUser);

      const result = await authService.login('test@example.com', 'password123');

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.user.email).toBe('test@example.com');
      expect(result.message).toContain('Login successful');
    });

    it('should handle invalid credentials', async () => {
      mockCognitoClient.send.mockRejectedValue({
        name: 'NotAuthorizedException',
        message: 'Incorrect username or password'
      });

      await expect(authService.login('test@example.com', 'wrongpassword'))
        .rejects.toThrow('INVALID_CREDENTIALS');
    });

    it('should handle unconfirmed user', async () => {
      mockCognitoClient.send.mockRejectedValue({
        name: 'UserNotConfirmedException',
        message: 'User is not confirmed'
      });

      await expect(authService.login('test@example.com', 'password123'))
        .rejects.toThrow('USER_NOT_CONFIRMED');
    });
  });

  describe('retry mechanism', () => {
    it('should retry on transient failures', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
        organizationId: 'org-123',
        role: 'developer'
      };

      // First call fails, second succeeds
      mockCognitoClient.send
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({
          AuthenticationResult: {
            IdToken: 'header.' + Buffer.from(JSON.stringify({ sub: 'cognito-sub' })).toString('base64url') + '.signature'
          }
        });

      mockUserService.getUserByEmail.mockResolvedValue(mockUser);

      const result = await authService.login('test@example.com', 'password123', {
        maxRetries: 1,
        baseDelay: 10,
        maxDelay: 100
      });

      expect(result.accessToken).toBe('mock-access-token');
      expect(mockCognitoClient.send).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable errors', async () => {
      mockCognitoClient.send.mockRejectedValue({
        name: 'NotAuthorizedException',
        message: 'Incorrect username or password'
      });

      await expect(authService.login('test@example.com', 'wrongpassword', {
        maxRetries: 2
      })).rejects.toThrow('INVALID_CREDENTIALS');

      expect(mockCognitoClient.send).toHaveBeenCalledTimes(1);
    });

    it('should exhaust retries and throw appropriate error', async () => {
      mockCognitoClient.send.mockRejectedValue(new Error('Service unavailable'));

      await expect(authService.login('test@example.com', 'password123', {
        maxRetries: 2,
        baseDelay: 10,
        maxDelay: 100
      })).rejects.toThrow('LOGIN_RETRY_EXHAUSTED');

      expect(mockCognitoClient.send).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('token expiration', () => {
    it('should generate tokens with 1-hour expiration', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
        organizationId: 'org-123',
        role: 'developer'
      };

      mockCognitoClient.send.mockResolvedValue({
        AuthenticationResult: {
          IdToken: 'header.' + Buffer.from(JSON.stringify({ sub: 'cognito-sub' })).toString('base64url') + '.signature'
        }
      });

      mockUserService.getUserByEmail.mockResolvedValue(mockUser);

      const result = await authService.login('test@example.com', 'password123');

      expect(result.expiresIn).toBe(3600); // 1 hour in seconds
      expect(mockJWTService.generateTokenPair).toHaveBeenCalledWith({
        userId: mockUser.userId,
        email: mockUser.email,
        organizationId: mockUser.organizationId,
        role: mockUser.role
      });
    });
  });
});