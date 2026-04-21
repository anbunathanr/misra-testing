import {
  SecretsManagerClient,
  GetSecretValueCommand,
  PutSecretValueCommand,
  CreateSecretCommand,
  UpdateSecretCommand,
  ResourceNotFoundException
} from '@aws-sdk/client-secrets-manager';
import * as speakeasy from 'speakeasy';
import * as crypto from 'crypto';
import { createLogger } from '../../utils/logger';

const logger = createLogger('OTPSecretsService');

export interface TOTPSecretData {
  secret: string;
  backupCodes: string[];
  createdAt: string;
  lastUsed?: string;
  usageCount: number;
}

export interface OTPConfiguration {
  issuer: string;
  algorithm: 'SHA1' | 'SHA256' | 'SHA512';
  digits: number;
  period: number;
  window: number;
}

export class OTPSecretsService {
  private secretsClient: SecretsManagerClient;
  private otpSecretName: string;
  private masterKey: string | null = null;
  private otpConfig: OTPConfiguration | null = null;

  constructor() {
    this.secretsClient = new SecretsManagerClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });
    
    this.otpSecretName = process.env.OTP_SECRET_NAME || 'misra-platform/otp-secrets-dev';
    
    if (!this.otpSecretName) {
      throw new Error('OTP_SECRET_NAME environment variable is required');
    }
  }

  /**
   * Initialize the service by loading configuration from Secrets Manager
   */
  async initialize(): Promise<void> {
    const correlationId = Math.random().toString(36).substring(7);
    
    logger.info('Initializing OTP Secrets Service', {
      correlationId,
      secretName: this.otpSecretName
    });

    try {
      const command = new GetSecretValueCommand({
        SecretId: this.otpSecretName
      });

      const response = await this.secretsClient.send(command);
      
      if (!response.SecretString) {
        throw new Error('OTP secret configuration not found');
      }

      const secretData = JSON.parse(response.SecretString);
      
      // Extract master key for encryption
      this.masterKey = secretData.masterKey;
      
      // Extract TOTP configuration
      this.otpConfig = JSON.parse(secretData.totpConfig);
      
      logger.info('OTP Secrets Service initialized successfully', {
        correlationId,
        hasConfig: !!this.otpConfig,
        hasMasterKey: !!this.masterKey
      });

    } catch (error: any) {
      logger.error('Failed to initialize OTP Secrets Service', {
        correlationId,
        error: error.message
      });
      throw new Error(`OTP_SERVICE_INIT_FAILED: ${error.message}`);
    }
  }

  /**
   * Generate a new TOTP secret for a user
   */
  async generateTOTPSecret(userId: string): Promise<TOTPSecretData> {
    const correlationId = Math.random().toString(36).substring(7);
    
    logger.info('Generating TOTP secret for user', {
      correlationId,
      userId
    });

    await this.ensureInitialized();

    try {
      // Generate TOTP secret
      const secret = speakeasy.generateSecret({
        name: `MISRA Platform (${userId})`,
        issuer: this.otpConfig!.issuer,
        length: 32
      });

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();

      const secretData: TOTPSecretData = {
        secret: secret.base32!,
        backupCodes,
        createdAt: new Date().toISOString(),
        usageCount: 0
      };

      // Store encrypted secret for the user
      await this._storeUserTOTPSecret(userId, secretData, correlationId);

      logger.info('TOTP secret generated successfully', {
        correlationId,
        userId,
        backupCodesCount: backupCodes.length
      });

      return secretData;

    } catch (error: any) {
      logger.error('Failed to generate TOTP secret', {
        correlationId,
        userId,
        error: error.message
      });
      throw new Error(`TOTP_GENERATION_FAILED: ${error.message}`);
    }
  }

  /**
   * Retrieve TOTP secret for a user
   */
  async getUserTOTPSecret(userId: string): Promise<TOTPSecretData | null> {
    const correlationId = Math.random().toString(36).substring(7);
    
    logger.info('Retrieving TOTP secret for user', {
      correlationId,
      userId
    });

    await this.ensureInitialized();

    try {
      const userSecretName = `${this.otpSecretName}/users/${userId}`;
      
      const command = new GetSecretValueCommand({
        SecretId: userSecretName
      });

      const response = await this.secretsClient.send(command);
      
      if (!response.SecretString) {
        logger.info('No TOTP secret found for user', {
          correlationId,
          userId
        });
        return null;
      }

      // Decrypt and parse secret data
      const encryptedData = JSON.parse(response.SecretString);
      const secretData = this.decryptSecretData(encryptedData);

      logger.info('TOTP secret retrieved successfully', {
        correlationId,
        userId,
        createdAt: secretData.createdAt,
        usageCount: secretData.usageCount
      });

      return secretData;

    } catch (error: any) {
      if (error.name === 'ResourceNotFoundException') {
        logger.info('TOTP secret not found for user', {
          correlationId,
          userId
        });
        return null;
      }

      logger.error('Failed to retrieve TOTP secret', {
        correlationId,
        userId,
        error: error.message
      });
      throw new Error(`TOTP_RETRIEVAL_FAILED: ${error.message}`);
    }
  }

  /**
   * Generate TOTP code for a user
   */
  async generateTOTPCode(userId: string): Promise<string> {
    const correlationId = Math.random().toString(36).substring(7);
    
    logger.info('Generating TOTP code for user', {
      correlationId,
      userId
    });

    const secretData = await this.getUserTOTPSecret(userId);
    
    if (!secretData) {
      throw new Error('TOTP secret not found for user');
    }

    try {
      const totpCode = speakeasy.totp({
        secret: secretData.secret,
        encoding: 'base32',
        algorithm: this.otpConfig!.algorithm.toLowerCase() as any,
        digits: this.otpConfig!.digits,
        step: this.otpConfig!.period,
        window: this.otpConfig!.window
      } as any);

      // Update usage statistics
      await this.updateSecretUsage(userId, correlationId);

      logger.info('TOTP code generated successfully', {
        correlationId,
        userId,
        codeLength: totpCode.length
      });

      return totpCode;

    } catch (error: any) {
      logger.error('Failed to generate TOTP code', {
        correlationId,
        userId,
        error: error.message
      });
      throw new Error(`TOTP_CODE_GENERATION_FAILED: ${error.message}`);
    }
  }

  /**
   * Verify TOTP code for a user
   */
  async verifyTOTPCode(userId: string, code: string): Promise<boolean> {
    const correlationId = Math.random().toString(36).substring(7);
    
    logger.info('Verifying TOTP code for user', {
      correlationId,
      userId,
      codeLength: code.length
    });

    const secretData = await this.getUserTOTPSecret(userId);
    
    if (!secretData) {
      throw new Error('TOTP secret not found for user');
    }

    try {
      const isValid = speakeasy.totp.verify({
        secret: secretData.secret,
        encoding: 'base32',
        token: code,
        algorithm: this.otpConfig!.algorithm.toLowerCase() as any,
        digits: this.otpConfig!.digits,
        step: this.otpConfig!.period,
        window: this.otpConfig!.window
      } as any);

      if (isValid) {
        // Update usage statistics
        await this.updateSecretUsage(userId, correlationId);
      }

      logger.info('TOTP code verification completed', {
        correlationId,
        userId,
        isValid
      });

      return isValid;

    } catch (error: any) {
      logger.error('Failed to verify TOTP code', {
        correlationId,
        userId,
        error: error.message
      });
      throw new Error(`TOTP_VERIFICATION_FAILED: ${error.message}`);
    }
  }

  /**
   * Delete TOTP secret for a user
   */
  async deleteTOTPSecret(userId: string): Promise<void> {
    const correlationId = Math.random().toString(36).substring(7);
    
    logger.info('Deleting TOTP secret for user', {
      correlationId,
      userId
    });

    try {
      const userSecretName = `${this.otpSecretName}/users/${userId}`;
      
      // Note: AWS Secrets Manager doesn't have a direct delete command
      // We'll mark it as deleted by updating with empty data
      const command = new PutSecretValueCommand({
        SecretId: userSecretName,
        SecretString: JSON.stringify({
          deleted: true,
          deletedAt: new Date().toISOString()
        })
      });

      await this.secretsClient.send(command);

      logger.info('TOTP secret deleted successfully', {
        correlationId,
        userId
      });

    } catch (error: any) {
      logger.error('Failed to delete TOTP secret', {
        correlationId,
        userId,
        error: error.message
      });
      throw new Error(`TOTP_DELETION_FAILED: ${error.message}`);
    }
  }

  /**
   * Store encrypted TOTP secret for a user (public method for external use)
   */
  async storeUserTOTPSecret(
    userId: string, 
    secretData: TOTPSecretData, 
    correlationId: string
  ): Promise<void> {
    await this.ensureInitialized();
    return this._storeUserTOTPSecret(userId, secretData, correlationId);
  }

  /**
   * Store encrypted TOTP secret for a user (private implementation)
   */
  private async _storeUserTOTPSecret(
    userId: string, 
    secretData: TOTPSecretData, 
    correlationId: string
  ): Promise<void> {
    const userSecretName = `${this.otpSecretName}/users/${userId}`;
    
    // Encrypt secret data
    const encryptedData = this.encryptSecretData(secretData);
    
    try {
      // Try to update existing secret first
      const updateCommand = new PutSecretValueCommand({
        SecretId: userSecretName,
        SecretString: JSON.stringify(encryptedData)
      });

      await this.secretsClient.send(updateCommand);

    } catch (error: any) {
      if (error.name === 'ResourceNotFoundException') {
        // Create new secret if it doesn't exist
        const createCommand = new CreateSecretCommand({
          Name: userSecretName,
          Description: `TOTP secret for user ${userId}`,
          SecretString: JSON.stringify(encryptedData)
        });

        await this.secretsClient.send(createCommand);
      } else {
        throw error;
      }
    }

    logger.info('User TOTP secret stored successfully', {
      correlationId,
      userId,
      secretName: userSecretName
    });
  }

  /**
   * Update secret usage statistics
   */
  private async updateSecretUsage(userId: string, correlationId: string): Promise<void> {
    try {
      const secretData = await this.getUserTOTPSecret(userId);
      
      if (secretData) {
        secretData.lastUsed = new Date().toISOString();
        secretData.usageCount += 1;
        
        await this._storeUserTOTPSecret(userId, secretData, correlationId);
      }

    } catch (error: any) {
      // Log but don't fail the main operation
      logger.warn('Failed to update secret usage statistics', {
        correlationId,
        userId,
        error: error.message
      });
    }
  }

  /**
   * Generate backup codes
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    
    for (let i = 0; i < 10; i++) {
      let code = '';
      for (let j = 0; j < 8; j++) {
        code += charset.charAt(Math.floor(Math.random() * charset.length));
      }
      codes.push(code);
    }
    
    return codes;
  }

  /**
   * Encrypt secret data using master key
   */
  private encryptSecretData(data: TOTPSecretData): any {
    if (!this.masterKey) {
      throw new Error('Master key not available for encryption');
    }

    const cipher = crypto.createCipher('aes-256-cbc', this.masterKey);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encrypted,
      algorithm: 'aes-256-cbc',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Decrypt secret data using master key
   */
  private decryptSecretData(encryptedData: any): TOTPSecretData {
    if (!this.masterKey) {
      throw new Error('Master key not available for decryption');
    }

    const decipher = crypto.createDecipher('aes-256-cbc', this.masterKey);
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }

  /**
   * Ensure service is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.masterKey || !this.otpConfig) {
      await this.initialize();
    }
  }
}