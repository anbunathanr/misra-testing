/**
 * EmailVerificationService Integration Validation Methods
 * Validates service integration and compatibility
 */
import { EmailVerificationService } from './email-verification-service';
import { VerificationResult, VerificationState, OTPSetupData } from './email-verification-service';
export declare class EmailVerificationServiceValidator {
    private service;
    constructor(service?: EmailVerificationService);
    /**
     * Validate email verification code format (6 digits)
     */
    validateCodeFormat(code: string): {
        valid: boolean;
        message: string;
    };
    /**
     * Validate email format before verification
     */
    validateEmailFormat(email: string): {
        valid: boolean;
        message: string;
    };
    /**
     * Validate code expiration (15 minutes)
     */
    validateCodeExpiration(createdAt: Date, now?: Date): {
        valid: boolean;
        message: string;
    };
    /**
     * Validate user exists in Cognito
     */
    validateUserExists(email: string): Promise<{
        exists: boolean;
        message: string;
    }>;
    /**
     * Validate verification state transitions
     */
    validateStateTransition(currentState: string, nextState: string): {
        valid: boolean;
        message: string;
    };
    /**
     * Validate OTP setup data structure
     */
    validateOTPSetupData(otpSetup: OTPSetupData): {
        valid: boolean;
        message: string;
    };
    /**
     * Validate verification result structure
     */
    validateVerificationResult(result: VerificationResult): {
        valid: boolean;
        message: string;
    };
    /**
     * Validate verification state structure
     */
    validateVerificationState(state: VerificationState): {
        valid: boolean;
        message: string;
    };
    /**
     * Run all validation checks
     */
    runFullValidation(email: string, code: string): Promise<{
        allValid: boolean;
        results: Array<{
            check: string;
            valid: boolean;
            message: string;
        }>;
    }>;
}
