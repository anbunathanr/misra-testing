/**
 * Integration Tests: Complete Authentication Flow
 *
 * End-to-end tests for the complete authentication flow:
 * 1. User registration with email verification
 * 2. Email verification with automatic OTP setup
 * 3. OTP setup completion and session establishment
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

// Mock services before any imports
const mockGenerateTokenPair = jest.fn();
const mockGetUserByEmail = jest.fn();
const mockCreateUser = jest.fn();
const mockVerifyEmail = jest.fn();
const mockIsEmailVerified = jest.fn();
const mockIsOTPEnabled = jest.fn();
const mockVerifyOTP = jest.fn();
const mockSetupOTPForUser = jest.fn();

jest.mock('../../services/auth/jwt-service', () => ({
  JWTService: jest.fn().mockImplementation(() => ({
    generateTokenPair: mockGenerateTokenPair,
  })),
}));

jest.mock('../../services/user/user-service', () => ({
  UserService: jest.fn().mockImplementation(() => ({
    getUserByEmail: mockGetUserByEmail,
    createUser: mockCreateUser,
  })),
}));

jest.mock('../../services/auth/email-verification-service', () => ({
  EmailVerificationService: jest.fn().mockImplementation(() => ({
    verifyEmail: mockVerifyEmail,
    isEmailVerified: mockIsEmailVerified,
    isOTPEnabled: mockIsOTPEnabled,
    verifyOTP: mockVerifyOTP,
    setupOTPForUser: mockSetupOTPForUser,
  })),
}));

import { handler as initiateFlowHandler } from '../../functions/auth/initiate-flow';
import { handler as verifyEmailWithOTPHandler } from '../../functions/auth/verify-email-with-otp';
import { handler as completeOTPSetupHandler } from '../../functions/auth/complete-otp-setup';
import { UnifiedAuthService } from '../../services/auth/unified-auth-service';
import { AuthenticationState } from '../../services/auth/unified-auth-service';
import { APIGatewayProxyEvent } from 'aws-lambda';

// Mock data
const MOCK_USER = {
  userId: 'user-abc-123',
  email: 'test@example.com',
  name: 'Test User',
  organizationId: 'org-xyz-456',
  role: 'developer' as const,
};

const MOCK_OTP_SETUP = {
  secret: 'JBSWY3DPEHPK3PXP',
  qrCodeUrl: 'https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=otpauth://totp/MISRA%20Platform:test%40example.com%3Fsecret%3DJBSWY3DPEHPK3PXP%26issuer%3DMISRA%20Platform',
  backupCodes: ['ABCD-1234', 'EFGH-5678', 'IJKL-9012'],
  issuer: 'MISRA Platform',
  accountName: 'test@example.com',
};

const MOCK_TOKEN_PAIR = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  expiresIn: 3600,
};

// Mock Cognito client
const mockSend = jest.fn();
jest.mock('@aws-sdk/client-cognito-identity-provider', () => ({
  CognitoIdentityProviderClient: jest.fn().mockImplementation(() => ({
    send: mockSend,
  })),
  AdminCreateUserCommand: jest.fn(),
  AdminSetUserPasswordCommand: jest.fn(),
  AdminGetUserCommand: jest.fn(),
  AdminConfirmSignUpCommand: jest.fn(),
  ResendConfirmationCodeCommand: jest.fn(),
  AdminUpdateUserAttributesCommand: jest.fn(),
  InitiateAuthCommand: jest.fn(),
}));

// Mock environment variables
beforeAll(() => {
  process.env.COGNITO_USER_POOL_ID = 'us-east-1_testpool';
  process.env.COGNITO_CLIENT_ID = 'testclientid';
  process.env.AWS_REGION = 'us-east-1';
});

beforeEach(() => {
  jest.clearAllMocks();
  
  // Reset environment variables
  delete process.env.COGNITO_USER_POOL_ID;
  delete process.env.COGNITO_CLIENT_ID;
  delete process.env.AWS_REGION;
  
  // Setup default mocks
  process.env.COGNITO_USER_POOL_ID = 'us-east-1_testpool';
  process.env.COGNITO_CLIENT_ID = 'testclientid';
  process.env.AWS_REGION = 'us-east-1';
  
  // Mock successful token generation
  mockGenerateTokenPair.mockResolvedValue(MOCK_TOKEN_PAIR);
  
  // Mock user service
  mockGetUserByEmail.mockResolvedValue(null);
  mockCreateUser.mockResolvedValue(MOCK_USER);
  
  // Mock email verification service
  mockVerifyEmail.mockResolvedValue({
    success: true,
    message: 'Email verified successfully',
    requiresOTP: true,
    otpSecret: MOCK_OTP_SETUP.secret,
    backupCodes: MOCK_OTP_SETUP.backupCodes,
  });
  
  mockIsEmailVerified.mockResolvedValue(false);
  mockIsOTPEnabled.mockResolvedValue(false);
  mockVerifyOTP.mockResolvedValue({
    success: true,
    message: 'OTP verified successfully',
  });
  
  mockSetupOTPForUser.mockResolvedValue({
    secret: MOCK_OTP_SETUP.secret,
    qrCodeUrl: MOCK_OTP_SETUP.qrCodeUrl,
    backupCodes: MOCK_OTP_SETUP.backupCodes,
  });
  
  // Mock Cognito responses
  mockSend.mockImplementation((command) => {
    if (command instanceof require('@aws-sdk/client-cognito-identity-provider').AdminGetUserCommand) {
      return {
        UserAttributes: [
          { Name: 'sub', Value: MOCK_USER.userId },
          { Name: 'email', Value: MOCK_USER.email },
        ],
        UserStatus: 'CONFIRMED',
      };
    }
    
    if (command instanceof require('@aws-sdk/client-cognito-identity-provider').AdminCreateUserCommand) {
      return { User: { Username: MOCK_USER.email } };
    }
    
    if (command instanceof require('@aws-sdk/client-cognito-identity-provider').AdminConfirmSignUpCommand) {
      return {};
    }
    
    if (command instanceof require('@aws-sdk/client-cognito-identity-provider').AdminUpdateUserAttributesCommand) {
      return {};
    }
    
    if (command instanceof require('@aws-sdk/client-cognito-identity-provider').InitiateAuthCommand) {
      return {
        AuthenticationResult: {
          IdToken: 'mock.id.token.' + Buffer.from(JSON.stringify({
            sub: MOCK_USER.userId,
            email: MOCK_USER.email,
          })).toString('base64'),
        },
      };
    }
    
    return {};
  });
});

// --------------------------------------------------------------------------- //
// Test Suite: Complete Authentication Flow
// --------------------------------------------------------------------------- //

describe('Complete Authentication Flow Integration Tests', () => {
  // ------------------------------------------------------------------------- //
  // Test 1: Initiate authentication flow for new user
  // ------------------------------------------------------------------------- //
  describe('Test 1: Initiate authentication flow for new user', () => {
    it('should create user and require email verification', async () => {
      // Arrange
      const event: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        path: '/auth/initiate-flow',
        headers: {},
        multiValueHeaders: {},
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        pathParameters: null,
        stageVariables: null,
        isBase64Encoded: false,
        body: JSON.stringify({
          email: MOCK_USER.email,
          name: MOCK_USER.name,
        }),
        requestContext: {
          accountId: '123456789012',
          apiId: 'test-api',
          httpMethod: 'POST',
          identity: {} as any,
          path: '/auth/initiate-flow',
          protocol: 'HTTP/1.1',
          requestId: 'req-test-1',
          requestTimeEpoch: Date.now(),
          resourceId: 'resource-id',
          resourcePath: '/auth/initiate-flow',
          stage: 'prod',
        },
        resource: '/auth/initiate-flow',
      } as unknown as APIGatewayProxyEvent;

      // Act
      const response = await initiateFlowHandler(event);

      // Assert
      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.state).toBe('email_verification_required');
      expect(body.requiresEmailVerification).toBe(true);
      expect(body.requiresOTPSetup).toBe(false);
      expect(body.message).toContain('verify your email address');
    });

    it('should return error for invalid email', async () => {
      // Arrange
      const event: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        path: '/auth/initiate-flow',
        headers: {},
        multiValueHeaders: {},
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        pathParameters: null,
        stageVariables: null,
        isBase64Encoded: false,
        body: JSON.stringify({
          email: 'invalid-email',
        }),
        requestContext: {
          accountId: '123456789012',
          apiId: 'test-api',
          httpMethod: 'POST',
          identity: {} as any,
          path: '/auth/initiate-flow',
          protocol: 'HTTP/1.1',
          requestId: 'req-test-2',
          requestTimeEpoch: Date.now(),
          resourceId: 'resource-id',
          resourcePath: '/auth/initiate-flow',
          stage: 'prod',
        },
        resource: '/auth/initiate-flow',
      } as unknown as APIGatewayProxyEvent;

      // Act
      const response = await initiateFlowHandler(event);

      // Assert
      expect(response.statusCode).toBe(400);
      
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe('INVALID_EMAIL');
    });

    it('should return error for missing email', async () => {
      // Arrange
      const event: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        path: '/auth/initiate-flow',
        headers: {},
        multiValueHeaders: {},
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        pathParameters: null,
        stageVariables: null,
        isBase64Encoded: false,
        body: JSON.stringify({
          name: 'Test User',
        }),
        requestContext: {
          accountId: '123456789012',
          apiId: 'test-api',
          httpMethod: 'POST',
          identity: {} as any,
          path: '/auth/initiate-flow',
          protocol: 'HTTP/1.1',
          requestId: 'req-test-3',
          requestTimeEpoch: Date.now(),
          resourceId: 'resource-id',
          resourcePath: '/auth/initiate-flow',
          stage: 'prod',
        },
        resource: '/auth/initiate-flow',
      } as unknown as APIGatewayProxyEvent;

      // Act
      const response = await initiateFlowHandler(event);

      // Assert
      expect(response.statusCode).toBe(400);
      
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe('MISSING_EMAIL');
    });
  });

  // ------------------------------------------------------------------------- //
  // Test 2: Email verification with automatic OTP setup
  // ------------------------------------------------------------------------- //
  describe('Test 2: Email verification with automatic OTP setup', () => {
    it('should verify email and return OTP setup data', async () => {
      // Arrange
      const event: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        path: '/auth/verify-email-with-otp',
        headers: {},
        multiValueHeaders: {},
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        pathParameters: null,
        stageVariables: null,
        isBase64Encoded: false,
        body: JSON.stringify({
          email: MOCK_USER.email,
          confirmationCode: '123456',
        }),
        requestContext: {
          accountId: '123456789012',
          apiId: 'test-api',
          httpMethod: 'POST',
          identity: {} as any,
          path: '/auth/verify-email-with-otp',
          protocol: 'HTTP/1.1',
          requestId: 'req-test-4',
          requestTimeEpoch: Date.now(),
          resourceId: 'resource-id',
          resourcePath: '/auth/verify-email-with-otp',
          stage: 'prod',
        },
        resource: '/auth/verify-email-with-otp',
      } as unknown as APIGatewayProxyEvent;

      // Act
      const response = await verifyEmailWithOTPHandler(event);

      // Assert
      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toContain('Email verified successfully');
      expect(body.otpSetup).toBeDefined();
      expect(body.otpSetup.secret).toBe(MOCK_OTP_SETUP.secret);
      expect(body.otpSetup.qrCodeUrl).toBeDefined();
      expect(body.otpSetup.qrCodeUrl).toContain('https://chart.googleapis.com/chart');
      expect(body.otpSetup.backupCodes).toEqual(MOCK_OTP_SETUP.backupCodes);
      expect(body.nextStep).toBe('otp_setup_required');
    });

    it('should return error for invalid confirmation code format', async () => {
      // Arrange
      const event: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        path: '/auth/verify-email-with-otp',
        headers: {},
        multiValueHeaders: {},
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        pathParameters: null,
        stageVariables: null,
        isBase64Encoded: false,
        body: JSON.stringify({
          email: MOCK_USER.email,
          confirmationCode: 'invalid',
        }),
        requestContext: {
          accountId: '123456789012',
          apiId: 'test-api',
          httpMethod: 'POST',
          identity: {} as any,
          path: '/auth/verify-email-with-otp',
          protocol: 'HTTP/1.1',
          requestId: 'req-test-5',
          requestTimeEpoch: Date.now(),
          resourceId: 'resource-id',
          resourcePath: '/auth/verify-email-with-otp',
          stage: 'prod',
        },
        resource: '/auth/verify-email-with-otp',
      } as unknown as APIGatewayProxyEvent;

      // Act
      const response = await verifyEmailWithOTPHandler(event);

      // Assert
      expect(response.statusCode).toBe(400);
      
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe('INVALID_CODE_FORMAT');
    });

    it('should return error for missing confirmation code', async () => {
      // Arrange
      const event: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        path: '/auth/verify-email-with-otp',
        headers: {},
        multiValueHeaders: {},
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        pathParameters: null,
        stageVariables: null,
        isBase64Encoded: false,
        body: JSON.stringify({
          email: MOCK_USER.email,
        }),
        requestContext: {
          accountId: '123456789012',
          apiId: 'test-api',
          httpMethod: 'POST',
          identity: {} as any,
          path: '/auth/verify-email-with-otp',
          protocol: 'HTTP/1.1',
          requestId: 'req-test-6',
          requestTimeEpoch: Date.now(),
          resourceId: 'resource-id',
          resourcePath: '/auth/verify-email-with-otp',
          stage: 'prod',
        },
        resource: '/auth/verify-email-with-otp',
      } as unknown as APIGatewayProxyEvent;

      // Act
      const response = await verifyEmailWithOTPHandler(event);

      // Assert
      expect(response.statusCode).toBe(400);
      
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe('MISSING_FIELDS');
    });
  });

  // ------------------------------------------------------------------------- //
  // Test 3: Complete OTP setup and establish session
  // ------------------------------------------------------------------------- //
  describe('Test 3: Complete OTP setup and establish session', () => {
    it('should verify OTP and establish user session', async () => {
      // Arrange
      const event: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        path: '/auth/complete-otp-setup',
        headers: {},
        multiValueHeaders: {},
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        pathParameters: null,
        stageVariables: null,
        isBase64Encoded: false,
        body: JSON.stringify({
          email: MOCK_USER.email,
          otpCode: '123456',
        }),
        requestContext: {
          accountId: '123456789012',
          apiId: 'test-api',
          httpMethod: 'POST',
          identity: {} as any,
          path: '/auth/complete-otp-setup',
          protocol: 'HTTP/1.1',
          requestId: 'req-test-7',
          requestTimeEpoch: Date.now(),
          resourceId: 'resource-id',
          resourcePath: '/auth/complete-otp-setup',
          stage: 'prod',
        },
        resource: '/auth/complete-otp-setup',
      } as unknown as APIGatewayProxyEvent;

      // Act
      const response = await completeOTPSetupHandler(event);

      // Assert
      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toContain('OTP setup completed successfully');
      expect(body.userSession).toBeDefined();
      expect(body.userSession.userId).toBe(MOCK_USER.userId);
      expect(body.userSession.email).toBe(MOCK_USER.email);
      expect(body.tokens).toBeDefined();
      expect(body.tokens.accessToken).toBe(MOCK_TOKEN_PAIR.accessToken);
      expect(body.tokens.refreshToken).toBe(MOCK_TOKEN_PAIR.refreshToken);
      expect(body.tokens.expiresIn).toBe(MOCK_TOKEN_PAIR.expiresIn);
    });

    it('should return error for invalid OTP code format', async () => {
      // Arrange
      const event: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        path: '/auth/complete-otp-setup',
        headers: {},
        multiValueHeaders: {},
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        pathParameters: null,
        stageVariables: null,
        isBase64Encoded: false,
        body: JSON.stringify({
          email: MOCK_USER.email,
          otpCode: 'invalid',
        }),
        requestContext: {
          accountId: '123456789012',
          apiId: 'test-api',
          httpMethod: 'POST',
          identity: {} as any,
          path: '/auth/complete-otp-setup',
          protocol: 'HTTP/1.1',
          requestId: 'req-test-8',
          requestTimeEpoch: Date.now(),
          resourceId: 'resource-id',
          resourcePath: '/auth/complete-otp-setup',
          stage: 'prod',
        },
        resource: '/auth/complete-otp-setup',
      } as unknown as APIGatewayProxyEvent;

      // Act
      const response = await completeOTPSetupHandler(event);

      // Assert
      expect(response.statusCode).toBe(400);
      
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe('INVALID_OTP_FORMAT');
    });

    it('should return error for missing OTP code', async () => {
      // Arrange
      const event: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        path: '/auth/complete-otp-setup',
        headers: {},
        multiValueHeaders: {},
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        pathParameters: null,
        stageVariables: null,
        isBase64Encoded: false,
        body: JSON.stringify({
          email: MOCK_USER.email,
        }),
        requestContext: {
          accountId: '123456789012',
          apiId: 'test-api',
          httpMethod: 'POST',
          identity: {} as any,
          path: '/auth/complete-otp-setup',
          protocol: 'HTTP/1.1',
          requestId: 'req-test-9',
          requestTimeEpoch: Date.now(),
          resourceId: 'resource-id',
          resourcePath: '/auth/complete-otp-setup',
          stage: 'prod',
        },
        resource: '/auth/complete-otp-setup',
      } as unknown as APIGatewayProxyEvent;

      // Act
      const response = await completeOTPSetupHandler(event);

      // Assert
      expect(response.statusCode).toBe(400);
      
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe('MISSING_FIELDS');
    });
  });

  // ------------------------------------------------------------------------- //
  // Test 4: Complete authentication flow end-to-end
  // ------------------------------------------------------------------------- //
  describe('Test 4: Complete authentication flow end-to-end', () => {
    it('should complete full authentication flow from registration to session', async () => {
      // Step 1: Initiate authentication flow
      const initiateEvent: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        path: '/auth/initiate-flow',
        headers: {},
        multiValueHeaders: {},
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        pathParameters: null,
        stageVariables: null,
        isBase64Encoded: false,
        body: JSON.stringify({
          email: MOCK_USER.email,
          name: MOCK_USER.name,
        }),
        requestContext: {
          accountId: '123456789012',
          apiId: 'test-api',
          httpMethod: 'POST',
          identity: {} as any,
          path: '/auth/initiate-flow',
          protocol: 'HTTP/1.1',
          requestId: 'req-test-10',
          requestTimeEpoch: Date.now(),
          resourceId: 'resource-id',
          resourcePath: '/auth/initiate-flow',
          stage: 'prod',
        },
        resource: '/auth/initiate-flow',
      } as unknown as APIGatewayProxyEvent;

      const initiateResponse = await initiateFlowHandler(initiateEvent);
      expect(initiateResponse.statusCode).toBe(200);
      
      const initiateBody = JSON.parse(initiateResponse.body);
      expect(initiateBody.state).toBe('email_verification_required');
      expect(initiateBody.requiresEmailVerification).toBe(true);

      // Step 2: Verify email with OTP setup
      const verifyEvent: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        path: '/auth/verify-email-with-otp',
        headers: {},
        multiValueHeaders: {},
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        pathParameters: null,
        stageVariables: null,
        isBase64Encoded: false,
        body: JSON.stringify({
          email: MOCK_USER.email,
          confirmationCode: '123456',
        }),
        requestContext: {
          accountId: '123456789012',
          apiId: 'test-api',
          httpMethod: 'POST',
          identity: {} as any,
          path: '/auth/verify-email-with-otp',
          protocol: 'HTTP/1.1',
          requestId: 'req-test-11',
          requestTimeEpoch: Date.now(),
          resourceId: 'resource-id',
          resourcePath: '/auth/verify-email-with-otp',
          stage: 'prod',
        },
        resource: '/auth/verify-email-with-otp',
      } as unknown as APIGatewayProxyEvent;

      const verifyResponse = await verifyEmailWithOTPHandler(verifyEvent);
      expect(verifyResponse.statusCode).toBe(200);
      
      const verifyBody = JSON.parse(verifyResponse.body);
      expect(verifyBody.success).toBe(true);
      expect(verifyBody.otpSetup).toBeDefined();
      expect(verifyBody.nextStep).toBe('otp_setup_required');

      // Step 3: Complete OTP setup
      const completeEvent: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        path: '/auth/complete-otp-setup',
        headers: {},
        multiValueHeaders: {},
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        pathParameters: null,
        stageVariables: null,
        isBase64Encoded: false,
        body: JSON.stringify({
          email: MOCK_USER.email,
          otpCode: '123456',
        }),
        requestContext: {
          accountId: '123456789012',
          apiId: 'test-api',
          httpMethod: 'POST',
          identity: {} as any,
          path: '/auth/complete-otp-setup',
          protocol: 'HTTP/1.1',
          requestId: 'req-test-12',
          requestTimeEpoch: Date.now(),
          resourceId: 'resource-id',
          resourcePath: '/auth/complete-otp-setup',
          stage: 'prod',
        },
        resource: '/auth/complete-otp-setup',
      } as unknown as APIGatewayProxyEvent;

      const completeResponse = await completeOTPSetupHandler(completeEvent);
      expect(completeResponse.statusCode).toBe(200);
      
      const completeBody = JSON.parse(completeResponse.body);
      expect(completeBody.success).toBe(true);
      expect(completeBody.userSession).toBeDefined();
      expect(completeBody.tokens).toBeDefined();
    });
  });

  // ------------------------------------------------------------------------- //
  // Test 5: Error handling and recovery
  // ------------------------------------------------------------------------- //
  describe('Test 5: Error handling and recovery', () => {
    it('should handle email verification failure gracefully', async () => {
      // Mock verification failure
      mockVerifyEmail.mockResolvedValue({
        success: false,
        message: 'Invalid verification code',
      });

      const event: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        path: '/auth/verify-email-with-otp',
        headers: {},
        multiValueHeaders: {},
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        pathParameters: null,
        stageVariables: null,
        isBase64Encoded: false,
        body: JSON.stringify({
          email: MOCK_USER.email,
          confirmationCode: '000000', // Wrong code
        }),
        requestContext: {
          accountId: '123456789012',
          apiId: 'test-api',
          httpMethod: 'POST',
          identity: {} as any,
          path: '/auth/verify-email-with-otp',
          protocol: 'HTTP/1.1',
          requestId: 'req-test-13',
          requestTimeEpoch: Date.now(),
          resourceId: 'resource-id',
          resourcePath: '/auth/verify-email-with-otp',
          stage: 'prod',
        },
        resource: '/auth/verify-email-with-otp',
      } as unknown as APIGatewayProxyEvent;

      const response = await verifyEmailWithOTPHandler(event);

      expect(response.statusCode).toBe(400);
      
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
      expect(body.error.message).toContain('verification code');
    });

    it('should handle OTP verification failure gracefully', async () => {
      // Mock OTP verification failure
      mockVerifyOTP.mockResolvedValue({
        success: false,
        message: 'Invalid OTP code',
      });

      const event: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        path: '/auth/complete-otp-setup',
        headers: {},
        multiValueHeaders: {},
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        pathParameters: null,
        stageVariables: null,
        isBase64Encoded: false,
        body: JSON.stringify({
          email: MOCK_USER.email,
          otpCode: '000000', // Wrong code
        }),
        requestContext: {
          accountId: '123456789012',
          apiId: 'test-api',
          httpMethod: 'POST',
          identity: {} as any,
          path: '/auth/complete-otp-setup',
          protocol: 'HTTP/1.1',
          requestId: 'req-test-14',
          requestTimeEpoch: Date.now(),
          resourceId: 'resource-id',
          resourcePath: '/auth/complete-otp-setup',
          stage: 'prod',
        },
        resource: '/auth/complete-otp-setup',
      } as unknown as APIGatewayProxyEvent;

      const response = await completeOTPSetupHandler(event);

      expect(response.statusCode).toBe(400);
      
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
      expect(body.error.message).toContain('OTP code');
    });
  });
});
