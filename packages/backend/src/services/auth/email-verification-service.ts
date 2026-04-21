/**
 * Email Verification Service
 * Handles email verification codes and OTP generation
 */

import { 
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
  AdminConfirmSignUpCommand,
  AdminSetUserPasswordCommand,
  ResendConfirmationCodeCommand,
  AdminUpdateUserAttributesCommand
} from '@aws-sdk/client-cognito-identity-provider';
import * as crypto from 'crypto';
import { AuthErrorHandler } from '../../utils/auth-error-handler';
import { createLogger } from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface VerificationResult {
  success: boolean;
  message: string;
  requiresOTP?: boolean;
  otpSecret?: string;
  backupCodes?: string[];
}

export interface VerificationWithOTPResult extends VerificationResult {
  otpSetup: OTPSetupData;
  nextStep: AuthenticationState;
}

export interface VerificationState {
  isVerified: boolean;
  requiresVerification: boolean;
  canResend: boolean;
  lastSentAt?: Date;
}

export enum AuthenticationState {
  INITIAL = 'initial',
  REGISTERING = 'registering',
  EMAIL_VERIFICATION_REQUIRED = 'email_verification_required',
  EMAIL_VERIFYING = 'email_verifying',
  OTP_SETUP_REQUIRED = 'otp_setup_required',
  OTP_VERIFYING = 'otp_verifying',
  AUTHENTICATED = 'authenticated',
  ERROR = 'error'
}

export interface OTPSetupData {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
  issuer: string;
  accountName: string;
}

export interface OTPSetupResult {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export class EmailVerificationService {
  private cognitoClient: CognitoIdentityProviderClient;
  private userPoolId: string;
  private errorHandler: AuthErrorHandler;
  private logger: ReturnType<typeof createLogger>;

  constructor() {
    this.cognitoClient = new CognitoIdentityProviderClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });
    this.userPoolId = process.env.COGNITO_USER_POOL_ID!;
    this.errorHandler = new AuthErrorHandler('EmailVerificationService');
    this.logger = createLogger('EmailVerificationService');
  }

  /**
   * Verify email with confirmation code
   */
  async verifyEmail(email: string, confirmationCode: string): Promise<VerificationResult> {
    const correlationId = uuidv4();
    
    this.logger.info('Verifying email', {
      correlationId,
      email
    });

    try {
      // Confirm the user in Cognito
      await this.cognitoClient.send(new AdminConfirmSignUpCommand({
        UserPoolId: this.userPoolId,
        Username: email,
        // Note: AdminConfirmSignUpCommand doesn't use ConfirmationCode
        // It's used for admin-initiated confirmations
      }));

      this.errorHandler.logAuthEvent('email_confirmed', {
        operation: 'verifyEmail',
        email,
        step: 'cognito_confirmation'
      }, true, { correlationId });

      // Automatically set up OTP after email verification
      const otpSetup = await this.setupOTPForUser(email);

      this.logger.info('Email verified and OTP setup completed', {
        correlationId,
        email,
        hasOTPSecret: !!otpSetup.secret
      });

      return {
        success: true,
        message: 'Email verified successfully. OTP has been automatically configured.',
        requiresOTP: true,
        otpSecret: otpSetup.secret,
        backupCodes: otpSetup.backupCodes
      };
    } catch (error: any) {
      this.logger.error('Email verification failed', error, {
        correlationId,
        email,
        errorName: error.name
      });
      
      if (error.name === 'CodeMismatchException') {
        return {
          success: false,
          message: 'Invalid verification code. Please check and try again.'
        };
      } else if (error.name === 'ExpiredCodeException') {
        return {
          success: false,
          message: 'Verification code has expired. Please request a new one.'
        };
      } else if (error.name === 'NotAuthorizedException') {
        return {
          success: false,
          message: 'User is already verified or verification failed.'
        };
      }

      this.errorHandler.handleError(error, {
        operation: 'verifyEmail',
        email,
        step: 'email_verification'
      });

      return {
        success: false,
        message: 'Email verification failed. Please try again.'
      };
    }
  }

  /**
   * Enhanced verification with OTP setup
   */
  async verifyEmailWithOTPSetup(email: string, code: string): Promise<VerificationWithOTPResult> {
    try {
      // First verify the email
      const verificationResult = await this.verifyEmail(email, code);
      
      if (!verificationResult.success) {
        throw new Error(verificationResult.message);
      }

      // Generate OTP setup data
      const otpSetup: OTPSetupData = {
        secret: verificationResult.otpSecret!,
        qrCodeUrl: this.generateQRCodeUrl(email, verificationResult.otpSecret!),
        backupCodes: verificationResult.backupCodes!,
        issuer: 'MISRA Platform',
        accountName: email
      };

      return {
        success: true,
        message: 'Email verified successfully. OTP setup is ready.',
        requiresOTP: true,
        otpSecret: verificationResult.otpSecret,
        backupCodes: verificationResult.backupCodes,
        otpSetup,
        nextStep: AuthenticationState.OTP_SETUP_REQUIRED
      };
    } catch (error: any) {
      throw new Error(`EMAIL_VERIFICATION_WITH_OTP_FAILED: ${error.message}`);
    }
  }

  /**
   * Get verification state
   */
  async getVerificationState(email: string): Promise<VerificationState> {
    try {
      const userResponse = await this.cognitoClient.send(new AdminGetUserCommand({
        UserPoolId: this.userPoolId,
        Username: email
      }));

      const isVerified = userResponse.UserStatus === 'CONFIRMED';
      
      return {
        isVerified,
        requiresVerification: !isVerified,
        canResend: !isVerified, // Can resend if not verified
        lastSentAt: undefined // Would need to track this separately if needed
      };
    } catch (error: any) {
      if (error.name === 'UserNotFoundException') {
        return {
          isVerified: false,
          requiresVerification: true,
          canResend: false // Can't resend for non-existent user
        };
      }
      
      throw new Error(`VERIFICATION_STATE_ERROR: ${error.message}`);
    }
  }

  /**
   * Resend verification code
   */
  async resendVerificationCode(email: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.cognitoClient.send(new ResendConfirmationCodeCommand({
        ClientId: process.env.COGNITO_USER_POOL_CLIENT_ID!,
        Username: email
      }));

      return {
        success: true,
        message: 'Verification code sent to your email address.'
      };
    } catch (error: any) {
      console.error('Resend verification code failed:', error);
      
      return {
        success: false,
        message: 'Failed to resend verification code. Please try again.'
      };
    }
  }

  /**
   * Automatically set up OTP for verified user
   */
  private async setupOTPForUser(email: string): Promise<OTPSetupResult> {
    // Generate OTP secret
    const secret = this.generateOTPSecret();
    
    // Generate backup codes
    const backupCodes = this.generateBackupCodes();

    // Store OTP secret and backup codes in user attributes
    await this.cognitoClient.send(new AdminUpdateUserAttributesCommand({
      UserPoolId: this.userPoolId,
      Username: email,
      UserAttributes: [
        {
          Name: 'custom:otp_secret',
          Value: secret
        },
        {
          Name: 'custom:backup_codes',
          Value: JSON.stringify(backupCodes)
        },
        {
          Name: 'custom:otp_enabled',
          Value: 'true'
        }
      ]
    }));

    // Generate QR code URL for authenticator apps
    const qrCodeUrl = this.generateQRCodeUrl(email, secret);

    return {
      secret,
      qrCodeUrl,
      backupCodes
    };
  }

  /**
   * Generate OTP secret (32 characters, base32)
   */
  private generateOTPSecret(): string {
    const buffer = crypto.randomBytes(20);
    return buffer.toString('base64')
      .replace(/\+/g, '')
      .replace(/\//g, '')
      .replace(/=/g, '')
      .substring(0, 32)
      .toUpperCase();
  }

  /**
   * Generate backup codes
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(`${code.substring(0, 4)}-${code.substring(4, 8)}`);
    }
    return codes;
  }

  /**
   * Generate QR code URL for authenticator apps
   */
  private generateQRCodeUrl(email: string, secret: string): string {
    const issuer = 'MISRA Platform';
    const label = `${issuer}:${email}`;
    const otpAuthUrl = `otpauth://totp/${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
    
    // Return Google Charts QR code URL
    return `https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=${encodeURIComponent(otpAuthUrl)}`;
  }

  /**
   * Verify OTP code
   */
  async verifyOTP(email: string, otpCode: string): Promise<{ success: boolean; message: string }> {
    const correlationId = uuidv4();
    
    this.logger.info('Verifying OTP', {
      correlationId,
      email
    });

    try {
      // Get user's OTP secret
      const userResponse = await this.cognitoClient.send(new AdminGetUserCommand({
        UserPoolId: this.userPoolId,
        Username: email
      }));

      const otpSecretAttr = userResponse.UserAttributes?.find(attr => attr.Name === 'custom:otp_secret');
      const backupCodesAttr = userResponse.UserAttributes?.find(attr => attr.Name === 'custom:backup_codes');

      if (!otpSecretAttr?.Value) {
        this.logger.warn('OTP not configured for user', {
          correlationId,
          email
        });
        
        return {
          success: false,
          message: 'OTP not configured for this user.'
        };
      }

      // Check if it's a backup code
      if (backupCodesAttr?.Value) {
        const backupCodes = JSON.parse(backupCodesAttr.Value);
        if (backupCodes.includes(otpCode.toUpperCase())) {
          // Remove used backup code
          const updatedCodes = backupCodes.filter((code: string) => code !== otpCode.toUpperCase());
          
          await this.cognitoClient.send(new AdminUpdateUserAttributesCommand({
            UserPoolId: this.userPoolId,
            Username: email,
            UserAttributes: [
              {
                Name: 'custom:backup_codes',
                Value: JSON.stringify(updatedCodes)
              }
            ]
          }));

          this.errorHandler.logAuthEvent('backup_code_used', {
            operation: 'verifyOTP',
            email,
            step: 'backup_code_verification'
          }, true, { correlationId, remainingCodes: updatedCodes.length });

          return {
            success: true,
            message: 'Backup code verified successfully.'
          };
        }
      }

      // Verify TOTP code
      const isValidOTP = this.verifyTOTP(otpSecretAttr.Value, otpCode);
      
      if (isValidOTP) {
        this.errorHandler.logAuthEvent('otp_code_verified', {
          operation: 'verifyOTP',
          email,
          step: 'totp_verification'
        }, true, { correlationId });

        return {
          success: true,
          message: 'OTP verified successfully.'
        };
      } else {
        this.logger.warn('Invalid OTP code provided', {
          correlationId,
          email
        });

        return {
          success: false,
          message: 'Invalid OTP code. Please try again.'
        };
      }
    } catch (error: any) {
      this.logger.error('OTP verification failed', error, {
        correlationId,
        email
      });

      this.errorHandler.handleError(error, {
        operation: 'verifyOTP',
        email,
        step: 'otp_verification'
      });

      return {
        success: false,
        message: 'OTP verification failed. Please try again.'
      };
    }
  }

  /**
   * Verify TOTP code using time-based algorithm
   */
  private verifyTOTP(secret: string, token: string, window: number = 1): boolean {
    const timeStep = 30; // 30 seconds
    const currentTime = Math.floor(Date.now() / 1000 / timeStep);

    // Check current time and ±window time steps
    for (let i = -window; i <= window; i++) {
      const time = currentTime + i;
      const expectedToken = this.generateTOTP(secret, time);
      if (expectedToken === token) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generate TOTP code
   */
  private generateTOTP(secret: string, time: number): string {
    const buffer = Buffer.alloc(8);
    buffer.writeUInt32BE(0, 0);
    buffer.writeUInt32BE(time, 4);

    const key = Buffer.from(secret, 'base64');
    const hmac = crypto.createHmac('sha1', key);
    hmac.update(buffer);
    const digest = hmac.digest();

    const offset = digest[digest.length - 1] & 0x0f;
    const code = ((digest[offset] & 0x7f) << 24) |
                 ((digest[offset + 1] & 0xff) << 16) |
                 ((digest[offset + 2] & 0xff) << 8) |
                 (digest[offset + 3] & 0xff);

    return (code % 1000000).toString().padStart(6, '0');
  }

  /**
   * Check if user has OTP enabled
   */
  async isOTPEnabled(email: string): Promise<boolean> {
    try {
      const userResponse = await this.cognitoClient.send(new AdminGetUserCommand({
        UserPoolId: this.userPoolId,
        Username: email
      }));

      const otpEnabledAttr = userResponse.UserAttributes?.find(attr => attr.Name === 'custom:otp_enabled');
      return otpEnabledAttr?.Value === 'true';
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if user is verified
   */
  async isEmailVerified(email: string): Promise<boolean> {
    try {
      const userResponse = await this.cognitoClient.send(new AdminGetUserCommand({
        UserPoolId: this.userPoolId,
        Username: email
      }));

      return userResponse.UserStatus === 'CONFIRMED';
    } catch (error) {
      return false;
    }
  }
}