import { OTPSecretsService, TOTPSecretData } from '../otp-secrets-service';
import { SecretsManagerClient } from '@aws-sdk/client-secrets-manager';

// Mock AWS SDK
jest.mock('@aws-sdk/client-secrets-manager');

// Mock speakeasy
jest.mock('speakeasy', () => ({
  generateSecret: jest.fn(),
  totp: jest.fn()
}));

// Mock crypto
jest.mock('crypto', () => ({
  createCipher: jest.fn(),
  createDecipher: jest.fn()
}));

const mockSecretsManagerClient = SecretsManagerClient as jest.MockedClass<typeof SecretsManagerClient>;
const mockSpeakeasy = require('speakeasy');
const mockCrypto = require('crypto');

describe('OTPSecretsService', () => {
  let otpService: OTPSecretsService;
  let mockSend: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock environment variables
    process.env.AWS_REGION = 'us-east-1';
    process.env.OTP_SECRET_NAME = 'test-otp-secret';
    
    // Mock SecretsManager client
    mockSend = jest.fn();
    mockSecretsManagerClient.prototype.send = mockSend;
    
    // Mock crypto functions
    const mockCipher = {
      update: jest.fn().mockReturnValue('encrypted'),
      final: jest.fn().mockReturnValue('data')
    };
    const mockDecipher = {
      update: jest.fn().mockReturnValue('{"secret":"test"}'),
      final: jest.fn().mockReturnValue('')
    };
    mockCrypto.createCipher.mockReturnValue(mockCipher);
    mockCrypto.createDecipher.mockReturnValue(mockDecipher);
    
    otpService = new OTPSecretsService();
  });

  afterEach(() => {
    delete process.env.AWS_REGION;
    delete process.env.OTP_SECRET_NAME;
  });

  describe('constructor', () => {
    it('should initialize with environment variables', () => {
      expect(otpService).toBeInstanceOf(OTPSecretsService);
    });

    it('should throw error if OTP_SECRET_NAME is not provided', () => {
      delete process.env.OTP_SECRET_NAME;
      expect(() => new OTPSecretsService()).toThrow('OTP_SECRET_NAME environment variable is required');
    });
  });

  describe('initialize', () => {
    it('should load configuration from Secrets Manager', async () => {
      const mockSecretData = {
        masterKey: 'test-master-key',
        totpConfig: JSON.stringify({
          issuer: 'Test Platform',
          algorithm: 'SHA1',
          digits: 6,
          period: 30,
          window: 2
        })
      };

      mockSend.mockResolvedValueOnce({
        SecretString: JSON.stringify(mockSecretData)
      });

      await otpService.initialize();

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: { SecretId: 'test-otp-secret' }
        })
      );
    });

    it('should throw error if secret configuration not found', async () => {
      mockSend.mockResolvedValueOnce({
        SecretString: null
      });

      await expect(otpService.initialize()).rejects.toThrow('OTP_SERVICE_INIT_FAILED');
    });

    it('should throw error if Secrets Manager call fails', async () => {
      mockSend.mockRejectedValueOnce(new Error('Access denied'));

      await expect(otpService.initialize()).rejects.toThrow('OTP_SERVICE_INIT_FAILED');
    });
  });

  describe('generateTOTPSecret', () => {
    beforeEach(async () => {
      // Mock initialization
      const mockSecretData = {
        masterKey: 'test-master-key',
        totpConfig: JSON.stringify({
          issuer: 'Test Platform',
          algorithm: 'SHA1',
          digits: 6,
          period: 30,
          window: 2
        })
      };

      mockSend.mockResolvedValueOnce({
        SecretString: JSON.stringify(mockSecretData)
      });

      await otpService.initialize();
      jest.clearAllMocks();
    });

    it('should generate TOTP secret for user', async () => {
      const mockSecret = {
        base32: 'JBSWY3DPEHPK3PXP'
      };

      mockSpeakeasy.generateSecret.mockReturnValue(mockSecret);
      mockSend.mockResolvedValueOnce({}); // For storing the secret

      const result = await otpService.generateTOTPSecret('test-user');

      expect(result).toEqual({
        secret: 'JBSWY3DPEHPK3PXP',
        backupCodes: expect.any(Array),
        createdAt: expect.any(String),
        usageCount: 0
      });

      expect(result.backupCodes).toHaveLength(10);
      expect(mockSpeakeasy.generateSecret).toHaveBeenCalledWith({
        name: 'MISRA Platform (test-user)',
        issuer: 'Test Platform',
        length: 32
      });
    });

    it('should store generated secret securely', async () => {
      const mockSecret = {
        base32: 'JBSWY3DPEHPK3PXP'
      };

      mockSpeakeasy.generateSecret.mockReturnValue(mockSecret);
      mockSend.mockResolvedValueOnce({}); // For storing the secret

      await otpService.generateTOTPSecret('test-user');

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            SecretId: 'test-otp-secret/users/test-user',
            SecretString: expect.any(String)
          })
        })
      );
    });

    it('should handle secret generation failure', async () => {
      mockSpeakeasy.generateSecret.mockImplementation(() => {
        throw new Error('Generation failed');
      });

      await expect(otpService.generateTOTPSecret('test-user')).rejects.toThrow('TOTP_GENERATION_FAILED');
    });
  });

  describe('getUserTOTPSecret', () => {
    beforeEach(async () => {
      // Mock initialization
      const mockSecretData = {
        masterKey: 'test-master-key',
        totpConfig: JSON.stringify({
          issuer: 'Test Platform',
          algorithm: 'SHA1',
          digits: 6,
          period: 30,
          window: 2
        })
      };

      mockSend.mockResolvedValueOnce({
        SecretString: JSON.stringify(mockSecretData)
      });

      await otpService.initialize();
      jest.clearAllMocks();
    });

    it('should retrieve TOTP secret for user', async () => {
      const mockEncryptedData = {
        encrypted: 'encrypteddata',
        algorithm: 'aes-256-cbc',
        timestamp: new Date().toISOString()
      };

      mockSend.mockResolvedValueOnce({
        SecretString: JSON.stringify(mockEncryptedData)
      });

      const result = await otpService.getUserTOTPSecret('test-user');

      expect(result).toEqual({
        secret: 'test'
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: { SecretId: 'test-otp-secret/users/test-user' }
        })
      );
    });

    it('should return null if secret not found', async () => {
      const error = new Error('Not found');
      error.name = 'ResourceNotFoundException';
      mockSend.mockRejectedValueOnce(error);

      const result = await otpService.getUserTOTPSecret('test-user');

      expect(result).toBeNull();
    });

    it('should throw error for other failures', async () => {
      mockSend.mockRejectedValueOnce(new Error('Access denied'));

      await expect(otpService.getUserTOTPSecret('test-user')).rejects.toThrow('TOTP_RETRIEVAL_FAILED');
    });
  });

  describe('generateTOTPCode', () => {
    beforeEach(async () => {
      // Mock initialization
      const mockSecretData = {
        masterKey: 'test-master-key',
        totpConfig: JSON.stringify({
          issuer: 'Test Platform',
          algorithm: 'SHA1',
          digits: 6,
          period: 30,
          window: 2
        })
      };

      mockSend.mockResolvedValueOnce({
        SecretString: JSON.stringify(mockSecretData)
      });

      await otpService.initialize();
      jest.clearAllMocks();
    });

    it('should generate TOTP code for user', async () => {
      // Mock getting user secret
      const mockEncryptedData = {
        encrypted: 'encrypteddata',
        algorithm: 'aes-256-cbc',
        timestamp: new Date().toISOString()
      };

      mockSend
        .mockResolvedValueOnce({
          SecretString: JSON.stringify(mockEncryptedData)
        })
        .mockResolvedValueOnce({}); // For updating usage

      mockSpeakeasy.totp.mockReturnValue('123456');

      const result = await otpService.generateTOTPCode('test-user');

      expect(result).toBe('123456');
      expect(mockSpeakeasy.totp).toHaveBeenCalledWith({
        secret: 'test',
        encoding: 'base32',
        algorithm: 'sha1',
        digits: 6,
        step: 30,
        window: 2
      });
    });

    it('should throw error if user secret not found', async () => {
      const error = new Error('Not found');
      error.name = 'ResourceNotFoundException';
      mockSend.mockRejectedValueOnce(error);

      await expect(otpService.generateTOTPCode('test-user')).rejects.toThrow('TOTP secret not found for user');
    });
  });

  describe('verifyTOTPCode', () => {
    beforeEach(async () => {
      // Mock initialization
      const mockSecretData = {
        masterKey: 'test-master-key',
        totpConfig: JSON.stringify({
          issuer: 'Test Platform',
          algorithm: 'SHA1',
          digits: 6,
          period: 30,
          window: 2
        })
      };

      mockSend.mockResolvedValueOnce({
        SecretString: JSON.stringify(mockSecretData)
      });

      await otpService.initialize();
      jest.clearAllMocks();
    });

    it('should verify valid TOTP code', async () => {
      // Mock getting user secret
      const mockEncryptedData = {
        encrypted: 'encrypteddata',
        algorithm: 'aes-256-cbc',
        timestamp: new Date().toISOString()
      };

      mockSend
        .mockResolvedValueOnce({
          SecretString: JSON.stringify(mockEncryptedData)
        })
        .mockResolvedValueOnce({}); // For updating usage

      mockSpeakeasy.totp.verify.mockReturnValue(true);

      const result = await otpService.verifyTOTPCode('test-user', '123456');

      expect(result).toBe(true);
      expect(mockSpeakeasy.totp.verify).toHaveBeenCalledWith({
        secret: 'test',
        encoding: 'base32',
        token: '123456',
        algorithm: 'sha1',
        digits: 6,
        step: 30,
        window: 2
      });
    });

    it('should return false for invalid TOTP code', async () => {
      // Mock getting user secret
      const mockEncryptedData = {
        encrypted: 'encrypteddata',
        algorithm: 'aes-256-cbc',
        timestamp: new Date().toISOString()
      };

      mockSend.mockResolvedValueOnce({
        SecretString: JSON.stringify(mockEncryptedData)
      });

      mockSpeakeasy.totp.verify.mockReturnValue(false);

      const result = await otpService.verifyTOTPCode('test-user', '654321');

      expect(result).toBe(false);
    });

    it('should throw error if user secret not found', async () => {
      const error = new Error('Not found');
      error.name = 'ResourceNotFoundException';
      mockSend.mockRejectedValueOnce(error);

      await expect(otpService.verifyTOTPCode('test-user', '123456')).rejects.toThrow('TOTP secret not found for user');
    });
  });

  describe('deleteTOTPSecret', () => {
    it('should mark secret as deleted', async () => {
      mockSend.mockResolvedValueOnce({});

      await otpService.deleteTOTPSecret('test-user');

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            SecretId: 'test-otp-secret/users/test-user',
            SecretString: expect.stringContaining('"deleted":true')
          })
        })
      );
    });

    it('should handle deletion failure', async () => {
      mockSend.mockRejectedValueOnce(new Error('Access denied'));

      await expect(otpService.deleteTOTPSecret('test-user')).rejects.toThrow('TOTP_DELETION_FAILED');
    });
  });
});