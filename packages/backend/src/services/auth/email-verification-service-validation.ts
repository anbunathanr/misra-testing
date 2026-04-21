/**
 * EmailVerificationService Integration Validation Methods
 * Validates service integration and compatibility
 */

import { EmailVerificationService } from './email-verification-service';
import { VerificationResult, VerificationState, OTPSetupData } from './email-verification-service';

export class EmailVerificationServiceValidator {
  private service: EmailVerificationService;

  constructor(service?: EmailVerificationService) {
    this.service = service || new EmailVerificationService();
  }

  /**
   * Validate email verification code format (6 digits)
   */
  validateCodeFormat(code: string): { valid: boolean; message: string } {
    const codeRegex = /^\d{6}$/;
    
    if (!codeRegex.test(code)) {
      return {
        valid: false,
        message: 'Invalid code format. Expected 6-digit numeric code.'
      };
    }

    return {
      valid: true,
      message: 'Code format is valid.'
    };
  }

  /**
   * Validate email format before verification
   */
  validateEmailFormat(email: string): { valid: boolean; message: string } {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
      return {
        valid: false,
        message: 'Invalid email format. Please provide a valid email address.'
      };
    }

    return {
      valid: true,
      message: 'Email format is valid.'
    };
  }

  /**
   * Validate code expiration (15 minutes)
   */
  validateCodeExpiration(createdAt: Date, now: Date = new Date()): { valid: boolean; message: string } {
    const fifteenMinutes = 15 * 60 * 1000; // 15 minutes in milliseconds
    const timeDiff = now.getTime() - createdAt.getTime();

    if (timeDiff > fifteenMinutes) {
      return {
        valid: false,
        message: 'Verification code has expired. Please request a new one.'
      };
    }

    return {
      valid: true,
      message: 'Verification code is still valid.'
    };
  }

  /**
   * Validate user exists in Cognito
   */
  async validateUserExists(email: string): Promise<{ exists: boolean; message: string }> {
    try {
      const state = await this.service.getVerificationState(email);
      
      return {
        exists: true,
        message: 'User exists in Cognito.'
      };
    } catch (error: any) {
      if (error.message.includes('UserNotFoundException')) {
        return {
          exists: false,
          message: 'User not found in Cognito.'
        };
      }
      
      throw error;
    }
  }

  /**
   * Validate verification state transitions
   */
  validateStateTransition(
    currentState: string,
    nextState: string
  ): { valid: boolean; message: string } {
    const validTransitions: Record<string, string[]> = {
      'initial': ['registering'],
      'registering': ['email_verification_required'],
      'email_verification_required': ['email_verifying'],
      'email_verifying': ['otp_setup_required'],
      'otp_setup_required': ['otp_verifying'],
      'otp_verifying': ['authenticated'],
      'authenticated': [],
      'error': ['initial', 'email_verification_required', 'otp_setup_required']
    };

    const allowedNextStates = validTransitions[currentState] || [];
    
    if (allowedNextStates.includes(nextState) || currentState === nextState) {
      return {
        valid: true,
        message: `State transition from '${currentState}' to '${nextState}' is valid.`
      };
    }

    return {
      valid: false,
      message: `Invalid state transition from '${currentState}' to '${nextState}'.`
    };
  }

  /**
   * Validate OTP setup data structure
   */
  validateOTPSetupData(otpSetup: OTPSetupData): { valid: boolean; message: string } {
    const requiredFields = ['secret', 'qrCodeUrl', 'backupCodes', 'issuer', 'accountName'];
    
    const missingFields = requiredFields.filter(field => !otpSetup[field as keyof OTPSetupData]);
    
    if (missingFields.length > 0) {
      return {
        valid: false,
        message: `Missing required fields in OTP setup data: ${missingFields.join(', ')}`
      };
    }

    // Validate secret format (32 characters, base32)
    if (typeof otpSetup.secret === 'string' && otpSetup.secret.length !== 32) {
      return {
        valid: false,
        message: 'Invalid OTP secret format. Expected 32-character base32 string.'
      };
    }

    // Validate backup codes format
    if (Array.isArray(otpSetup.backupCodes)) {
      const invalidCodes = otpSetup.backupCodes.filter(
        code => typeof code !== 'string' || !code.match(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/)
      );
      
      if (invalidCodes.length > 0) {
        return {
          valid: false,
          message: `Invalid backup code format. Expected format: XXXX-XXXX`
        };
      }
    }

    return {
      valid: true,
      message: 'OTP setup data structure is valid.'
    };
  }

  /**
   * Validate verification result structure
   */
  validateVerificationResult(result: VerificationResult): { valid: boolean; message: string } {
    if (typeof result.success !== 'boolean') {
      return {
        valid: false,
        message: 'Invalid verification result: success field must be boolean.'
      };
    }

    if (typeof result.message !== 'string') {
      return {
        valid: false,
        message: 'Invalid verification result: message field must be string.'
      };
    }

    if (result.requiresOTP && (!result.otpSecret || !result.backupCodes)) {
      return {
        valid: false,
        message: 'Invalid verification result: requiresOTP is true but OTP data is missing.'
      };
    }

    return {
      valid: true,
      message: 'Verification result structure is valid.'
    };
  }

  /**
   * Validate verification state structure
   */
  validateVerificationState(state: VerificationState): { valid: boolean; message: string } {
    if (typeof state.isVerified !== 'boolean') {
      return {
        valid: false,
        message: 'Invalid verification state: isVerified field must be boolean.'
      };
    }

    if (typeof state.requiresVerification !== 'boolean') {
      return {
        valid: false,
        message: 'Invalid verification state: requiresVerification field must be boolean.'
      };
    }

    if (typeof state.canResend !== 'boolean') {
      return {
        valid: false,
        message: 'Invalid verification state: canResend field must be boolean.'
      };
    }

    return {
      valid: true,
      message: 'Verification state structure is valid.'
    };
  }

  /**
   * Run all validation checks
   */
  async runFullValidation(email: string, code: string): Promise<{
    allValid: boolean;
    results: Array<{ check: string; valid: boolean; message: string }>;
  }> {
    const results: Array<{ check: string; valid: boolean; message: string }> = [];

    // Validate email format
    const emailValidation = this.validateEmailFormat(email);
    results.push({ check: 'Email format', ...emailValidation });

    // Validate code format
    const codeValidation = this.validateCodeFormat(code);
    results.push({ check: 'Code format', ...codeValidation });

    // Validate user exists
    const userValidation = await this.validateUserExists(email);
    results.push({ 
      check: 'User exists', 
      valid: userValidation.exists, 
      message: userValidation.message 
    });

    // If user exists, validate state
    if (userValidation.exists) {
      const state = await this.service.getVerificationState(email);
      const stateValidation = this.validateVerificationState(state);
      results.push({ check: 'Verification state', ...stateValidation });
    }

    const allValid = results.every(result => result.valid);

    return {
      allValid,
      results
    };
  }
}
