import { CognitoTOTPService } from '../cognito-totp-service';
import { 
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminInitiateAuthCommand,
  AssociateSoftwareTokenCommand,
  VerifySoftwareTokenCommand,
  AdminSetUserMFAPreferenceCommand,
  RespondToAuthChallengeCommand,
  AdminGetUserCommand,
  ChallengeNameType,
  AuthFlowType
} from '@aws-sdk/client-cognito-identity-provider';
import { mockClient } from 'aws-sdk-client-mock';

// Mock the Cognito client
const cognitoMock = mockClient(CognitoIdentityProviderClient);

// Mock speakeasy
jest.mock('speakeasy', () => ({
  totp: jest.fn(() => '123456')
}));

// Mock environment variables
process.env.COGNITO_USER_POOL_ID = 'test-user-pool-id';
process.env.COGNITO_CLIENT_ID = 'test-client-id';
process.env.AWS_REGION = 'us-east-1';

describe('CognitoTOTPService', () => {
  let service: CognitoTOTPService;

  beforeEach(() => {
    cognitoMock.reset();
    service = new CognitoTOTPService();
  });

  describe('createUserWithMFA', () => {
    it('should create a user with MFA enabled successfully', async () => {
      // Mock successful user creation
      cognitoMock.on(AdminCreateUserCommand).resolves({});
      cognitoMock.on(AdminSetUserPasswordCommand).resolves({});

      const result = await service.createUserWithMFA('test@example.com', 'Test User');

      expect(result.tempPassword).toBeDefined();
      expect(result.tempPassword.length).toBeGreaterThan(8);

      // Verify the correct commands were called
      expect(cognitoMock.commandCalls(AdminCreateUserCommand)).toHaveLength(1);
      expect(cognitoMock.commandCalls(AdminSetUserPasswordCommand)).toHaveLength(1);

      // Check user creation parameters
      const createUserCall = cognitoMock.commandCalls(AdminCreateUserCommand)[0];
      expect(createUserCall.args[0].input.Username).toBe('test@example.com');
      expect(createUserCall.args[0].input.UserAttributes).toContainEqual({
        Name: 'email',
        Value: 'test@example.com'
      });
      expect(createUserCall.args[0].input.UserAttributes).toContainEqual({
        Name: 'given_name',
        Value: 'Test User'
      });
    });

    it('should handle user creation failure', async () => {
      cognitoMock.on(AdminCreateUserCommand).rejects(new Error('User already exists'));

      await expect(service.createUserWithMFA('test@example.com'))
        .rejects.toThrow('USER_CREATION_FAILED: User already exists');
    });
  });

  describe('authenticateWithAutoMFA', () => {
    it('should handle MFA_SETUP challenge and complete TOTP setup', async () => {
      const mockSession = 'mock-session-token';
      const mockSecretCode = 'JBSWY3DPEHPK3PXP';
      const mockAccessToken = 'mock-access-token';
      const mockIdToken = 'mock-id-token';
      const mockRefreshToken = 'mock-refresh-token';

      // Mock the authentication flow
      cognitoMock.on(AdminInitiateAuthCommand).resolves({
        ChallengeName: ChallengeNameType.MFA_SETUP,
        Session: mockSession
      });

      cognitoMock.on(AssociateSoftwareTokenCommand).resolves({
        SecretCode: mockSecretCode,
        Session: mockSession
      });

      cognitoMock.on(VerifySoftwareTokenCommand).resolves({
        Status: 'SUCCESS',
        Session: mockSession
      });

      cognitoMock.on(AdminSetUserMFAPreferenceCommand).resolves({});

      cognitoMock.on(RespondToAuthChallengeCommand).resolves({
        AuthenticationResult: {
          AccessToken: mockAccessToken,
          IdToken: mockIdToken,
          RefreshToken: mockRefreshToken,
          ExpiresIn: 3600
        }
      });

      const result = await service.authenticateWithAutoMFA('test@example.com', 'password123');

      expect(result).toEqual({
        accessToken: mockAccessToken,
        idToken: mockIdToken,
        refreshToken: mockRefreshToken,
        expiresIn: 3600
      });

      // Verify all the expected calls were made
      expect(cognitoMock.commandCalls(AdminInitiateAuthCommand)).toHaveLength(1);
      expect(cognitoMock.commandCalls(AssociateSoftwareTokenCommand)).toHaveLength(1);
      expect(cognitoMock.commandCalls(VerifySoftwareTokenCommand)).toHaveLength(1);
      expect(cognitoMock.commandCalls(AdminSetUserMFAPreferenceCommand)).toHaveLength(1);
      expect(cognitoMock.commandCalls(RespondToAuthChallengeCommand)).toHaveLength(1);
    });

    it('should handle SOFTWARE_TOKEN_MFA challenge for existing users', async () => {
      const mockSession = 'mock-session-token';
      const mockAccessToken = 'mock-access-token';
      const mockIdToken = 'mock-id-token';
      const mockRefreshToken = 'mock-refresh-token';

      // Mock authentication with existing MFA
      cognitoMock.on(AdminInitiateAuthCommand).resolves({
        ChallengeName: ChallengeNameType.SOFTWARE_TOKEN_MFA,
        Session: mockSession
      });

      cognitoMock.on(RespondToAuthChallengeCommand).resolves({
        AuthenticationResult: {
          AccessToken: mockAccessToken,
          IdToken: mockIdToken,
          RefreshToken: mockRefreshToken,
          ExpiresIn: 3600
        }
      });

      const result = await service.authenticateWithAutoMFA('test@example.com', 'password123');

      expect(result).toEqual({
        accessToken: mockAccessToken,
        idToken: mockIdToken,
        refreshToken: mockRefreshToken,
        expiresIn: 3600
      });

      // Should not call TOTP setup commands for existing users
      expect(cognitoMock.commandCalls(AssociateSoftwareTokenCommand)).toHaveLength(0);
      expect(cognitoMock.commandCalls(VerifySoftwareTokenCommand)).toHaveLength(0);
    });

    it('should handle authentication without MFA challenge', async () => {
      const mockAccessToken = 'mock-access-token';
      const mockIdToken = 'mock-id-token';
      const mockRefreshToken = 'mock-refresh-token';

      // Mock direct authentication success
      cognitoMock.on(AdminInitiateAuthCommand).resolves({
        AuthenticationResult: {
          AccessToken: mockAccessToken,
          IdToken: mockIdToken,
          RefreshToken: mockRefreshToken,
          ExpiresIn: 3600
        }
      });

      const result = await service.authenticateWithAutoMFA('test@example.com', 'password123');

      expect(result).toEqual({
        accessToken: mockAccessToken,
        idToken: mockIdToken,
        refreshToken: mockRefreshToken,
        expiresIn: 3600
      });
    });

    it('should handle authentication failure', async () => {
      cognitoMock.on(AdminInitiateAuthCommand).rejects(new Error('Invalid credentials'));

      await expect(service.authenticateWithAutoMFA('test@example.com', 'wrongpassword'))
        .rejects.toThrow('AUTH_FAILED: Invalid credentials');
    });

    it('should handle TOTP verification failure', async () => {
      const mockSession = 'mock-session-token';
      const mockSecretCode = 'JBSWY3DPEHPK3PXP';

      cognitoMock.on(AdminInitiateAuthCommand).resolves({
        ChallengeName: ChallengeNameType.MFA_SETUP,
        Session: mockSession
      });

      cognitoMock.on(AssociateSoftwareTokenCommand).resolves({
        SecretCode: mockSecretCode,
        Session: mockSession
      });

      cognitoMock.on(VerifySoftwareTokenCommand).resolves({
        Status: 'FAILURE',
        Session: mockSession
      });

      await expect(service.authenticateWithAutoMFA('test@example.com', 'password123'))
        .rejects.toThrow('TOTP_SETUP_FAILED: TOTP verification failed: FAILURE');
    });
  });

  describe('userExists', () => {
    it('should return true if user exists', async () => {
      cognitoMock.on(AdminGetUserCommand).resolves({
        Username: 'test@example.com',
        UserAttributes: []
      });

      const exists = await service.userExists('test@example.com');
      expect(exists).toBe(true);
    });

    it('should return false if user does not exist', async () => {
      const error = new Error('User does not exist');
      error.name = 'UserNotFoundException';
      cognitoMock.on(AdminGetUserCommand).rejects(error);

      const exists = await service.userExists('test@example.com');
      expect(exists).toBe(false);
    });

    it('should throw error for other Cognito errors', async () => {
      cognitoMock.on(AdminGetUserCommand).rejects(new Error('Service unavailable'));

      await expect(service.userExists('test@example.com'))
        .rejects.toThrow('Service unavailable');
    });
  });

  describe('generateSecurePassword', () => {
    it('should generate a password with required characteristics', () => {
      // Access the private method through reflection for testing
      const password = (service as any).generateSecurePassword();

      expect(password).toHaveLength(12);
      expect(password).toMatch(/[A-Z]/); // Uppercase
      expect(password).toMatch(/[a-z]/); // Lowercase
      expect(password).toMatch(/[0-9]/); // Digit
      expect(password).toMatch(/[!@#$%^&*]/); // Symbol
    });
  });
});

describe('CognitoTOTPService Integration', () => {
  it('should handle complete autonomous workflow', async () => {
    const service = new CognitoTOTPService();
    const email = 'integration@example.com';

    // Mock the complete flow
    cognitoMock.on(AdminGetUserCommand).rejects({ name: 'UserNotFoundException' });
    cognitoMock.on(AdminCreateUserCommand).resolves({});
    cognitoMock.on(AdminSetUserPasswordCommand).resolves({});
    
    cognitoMock.on(AdminInitiateAuthCommand).resolves({
      ChallengeName: ChallengeNameType.MFA_SETUP,
      Session: 'session-token'
    });

    cognitoMock.on(AssociateSoftwareTokenCommand).resolves({
      SecretCode: 'JBSWY3DPEHPK3PXP',
      Session: 'session-token'
    });

    cognitoMock.on(VerifySoftwareTokenCommand).resolves({
      Status: 'SUCCESS',
      Session: 'session-token'
    });

    cognitoMock.on(AdminSetUserMFAPreferenceCommand).resolves({});

    cognitoMock.on(RespondToAuthChallengeCommand).resolves({
      AuthenticationResult: {
        AccessToken: 'access-token',
        IdToken: 'id-token',
        RefreshToken: 'refresh-token',
        ExpiresIn: 3600
      }
    });

    // Test the complete flow
    const userExists = await service.userExists(email);
    expect(userExists).toBe(false);

    const createResult = await service.createUserWithMFA(email, 'Test User');
    expect(createResult.tempPassword).toBeDefined();

    const authResult = await service.authenticateWithAutoMFA(email, createResult.tempPassword);
    expect(authResult).toHaveProperty('accessToken');
    expect(authResult).toHaveProperty('idToken');
    expect(authResult).toHaveProperty('refreshToken');
  });
});