"use strict";
/**
 * EmailVerificationService Integration Validation Methods
 * Validates service integration and compatibility
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailVerificationServiceValidator = void 0;
const email_verification_service_1 = require("./email-verification-service");
class EmailVerificationServiceValidator {
    service;
    constructor(service) {
        this.service = service || new email_verification_service_1.EmailVerificationService();
    }
    /**
     * Validate email verification code format (6 digits)
     */
    validateCodeFormat(code) {
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
    validateEmailFormat(email) {
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
    validateCodeExpiration(createdAt, now = new Date()) {
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
    async validateUserExists(email) {
        try {
            const state = await this.service.getVerificationState(email);
            return {
                exists: true,
                message: 'User exists in Cognito.'
            };
        }
        catch (error) {
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
    validateStateTransition(currentState, nextState) {
        const validTransitions = {
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
    validateOTPSetupData(otpSetup) {
        const requiredFields = ['secret', 'qrCodeUrl', 'backupCodes', 'issuer', 'accountName'];
        const missingFields = requiredFields.filter(field => !otpSetup[field]);
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
            const invalidCodes = otpSetup.backupCodes.filter(code => typeof code !== 'string' || !code.match(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/));
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
    validateVerificationResult(result) {
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
    validateVerificationState(state) {
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
    async runFullValidation(email, code) {
        const results = [];
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
exports.EmailVerificationServiceValidator = EmailVerificationServiceValidator;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1haWwtdmVyaWZpY2F0aW9uLXNlcnZpY2UtdmFsaWRhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImVtYWlsLXZlcmlmaWNhdGlvbi1zZXJ2aWNlLXZhbGlkYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7R0FHRzs7O0FBRUgsNkVBQXdFO0FBR3hFLE1BQWEsaUNBQWlDO0lBQ3BDLE9BQU8sQ0FBMkI7SUFFMUMsWUFBWSxPQUFrQztRQUM1QyxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sSUFBSSxJQUFJLHFEQUF3QixFQUFFLENBQUM7SUFDM0QsQ0FBQztJQUVEOztPQUVHO0lBQ0gsa0JBQWtCLENBQUMsSUFBWTtRQUM3QixNQUFNLFNBQVMsR0FBRyxTQUFTLENBQUM7UUFFNUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUMxQixPQUFPO2dCQUNMLEtBQUssRUFBRSxLQUFLO2dCQUNaLE9BQU8sRUFBRSxxREFBcUQ7YUFDL0QsQ0FBQztRQUNKLENBQUM7UUFFRCxPQUFPO1lBQ0wsS0FBSyxFQUFFLElBQUk7WUFDWCxPQUFPLEVBQUUsdUJBQXVCO1NBQ2pDLENBQUM7SUFDSixDQUFDO0lBRUQ7O09BRUc7SUFDSCxtQkFBbUIsQ0FBQyxLQUFhO1FBQy9CLE1BQU0sVUFBVSxHQUFHLDRCQUE0QixDQUFDO1FBRWhELElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDNUIsT0FBTztnQkFDTCxLQUFLLEVBQUUsS0FBSztnQkFDWixPQUFPLEVBQUUsNkRBQTZEO2FBQ3ZFLENBQUM7UUFDSixDQUFDO1FBRUQsT0FBTztZQUNMLEtBQUssRUFBRSxJQUFJO1lBQ1gsT0FBTyxFQUFFLHdCQUF3QjtTQUNsQyxDQUFDO0lBQ0osQ0FBQztJQUVEOztPQUVHO0lBQ0gsc0JBQXNCLENBQUMsU0FBZSxFQUFFLE1BQVksSUFBSSxJQUFJLEVB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Y0FBYyxFQUFFLEdBQUcsZUFBZSxFQUFFLENBQUMsQ0FBQztRQUU1RCx1QkFBdUI7UUFDdkIsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3JELE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsYUFBYSxFQUFFLEdBQUcsY0FBYyxFQUFFLENBQUMsQ0FBQztRQUUxRCx1QkFBdUI7UUFDdkIsTUFBTSxjQUFjLEdBQUcsTUFBTSxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDNUQsT0FBTyxDQUFDLElBQUksQ0FBQztZQUNYLEtBQUssRUFBRSxhQUFhO1lBQ3BCLEtBQUssRUFBRSxjQUFjLENBQUMsTUFBTTtZQUM1QixPQUFPLEVBQUUsY0FBYyxDQUFDLE9BQU87U0FDaEMsQ0FBQyxDQUFDO1FBRUgsaUNBQWlDO1FBQ2pDLElBQUksY0FBYyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzFCLE1BQU0sS0FBSyxHQUFHLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUM3RCxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMseUJBQXlCLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDOUQsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxvQkFBb0IsRUFBRSxHQUFHLGVBQWUsRUFBRSxDQUFDLENBQUM7UUFDcEUsQ0FBQztRQUVELE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFdkQsT0FBTztZQUNMLFFBQVE7WUFDUixPQUFPO1NBQ1IsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQXpRRCw4RUF5UUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogRW1haWxWZXJpZmljYXRpb25TZXJ2aWNlIEludGVncmF0aW9uIFZhbGlkYXRpb24gTWV0aG9kc1xyXG4gKiBWYWxpZGF0ZXMgc2VydmljZSBpbnRlZ3JhdGlvbiBhbmQgY29tcGF0aWJpbGl0eVxyXG4gKi9cclxuXHJcbmltcG9ydCB7IEVtYWlsVmVyaWZpY2F0aW9uU2VydmljZSB9IGZyb20gJy4vZW1haWwtdmVyaWZpY2F0aW9uLXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBWZXJpZmljYXRpb25SZXN1bHQsIFZlcmlmaWNhdGlvblN0YXRlLCBPVFBTZXR1cERhdGEgfSBmcm9tICcuL2VtYWlsLXZlcmlmaWNhdGlvbi1zZXJ2aWNlJztcclxuXHJcbmV4cG9ydCBjbGFzcyBFbWFpbFZlcmlmaWNhdGlvblNlcnZpY2VWYWxpZGF0b3Ige1xyXG4gIHByaXZhdGUgc2VydmljZTogRW1haWxWZXJpZmljYXRpb25TZXJ2aWNlO1xyXG5cclxuICBjb25zdHJ1Y3RvcihzZXJ2aWNlPzogRW1haWxWZXJpZmljYXRpb25TZXJ2aWNlKSB7XHJcbiAgICB0aGlzLnNlcnZpY2UgPSBzZXJ2aWNlIHx8IG5ldyBFbWFpbFZlcmlmaWNhdGlvblNlcnZpY2UoKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFZhbGlkYXRlIGVtYWlsIHZlcmlmaWNhdGlvbiBjb2RlIGZvcm1hdCAoNiBkaWdpdHMpXHJcbiAgICovXHJcbiAgdmFsaWRhdGVDb2RlRm9ybWF0KGNvZGU6IHN0cmluZyk6IHsgdmFsaWQ6IGJvb2xlYW47IG1lc3NhZ2U6IHN0cmluZyB9IHtcclxuICAgIGNvbnN0IGNvZGVSZWdleCA9IC9eXFxkezZ9JC87XHJcbiAgICBcclxuICAgIGlmICghY29kZVJlZ2V4LnRlc3QoY29kZSkpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICB2YWxpZDogZmFsc2UsXHJcbiAgICAgICAgbWVzc2FnZTogJ0ludmFsaWQgY29kZSBmb3JtYXQuIEV4cGVjdGVkIDYtZGlnaXQgbnVtZXJpYyBjb2RlLidcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB2YWxpZDogdHJ1ZSxcclxuICAgICAgbWVzc2FnZTogJ0NvZGUgZm9ybWF0IGlzIHZhbGlkLidcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBWYWxpZGF0ZSBlbWFpbCBmb3JtYXQgYmVmb3JlIHZlcmlmaWNhdGlvblxyXG4gICAqL1xyXG4gIHZhbGlkYXRlRW1haWxGb3JtYXQoZW1haWw6IHN0cmluZyk6IHsgdmFsaWQ6IGJvb2xlYW47IG1lc3NhZ2U6IHN0cmluZyB9IHtcclxuICAgIGNvbnN0IGVtYWlsUmVnZXggPSAvXlteXFxzQF0rQFteXFxzQF0rXFwuW15cXHNAXSskLztcclxuICAgIFxyXG4gICAgaWYgKCFlbWFpbFJlZ2V4LnRlc3QoZW1haWwpKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgdmFsaWQ6IGZhbHNlLFxyXG4gICAgICAgIG1lc3NhZ2U6ICdJbnZhbGlkIGVtYWlsIGZvcm1hdC4gUGxlYXNlIHByb3ZpZGUgYSB2YWxpZCBlbWFpbCBhZGRyZXNzLidcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB2YWxpZDogdHJ1ZSxcclxuICAgICAgbWVzc2FnZTogJ0VtYWlsIGZvcm1hdCBpcyB2YWxpZC4nXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogVmFsaWRhdGUgY29kZSBleHBpcmF0aW9uICgxNSBtaW51dGVzKVxyXG4gICAqL1xyXG4gIHZhbGlkYXRlQ29kZUV4cGlyYXRpb24oY3JlYXRlZEF0OiBEYXRlLCBub3c6IERhdGUgPSBuZXcgRGF0ZSgpKTogeyB2YWxpZDogYm9vbGVhbjsgbWVzc2FnZTogc3RyaW5nIH0ge1xyXG4gICAgY29uc3QgZmlmdGVlbk1pbnV0ZXMgPSAxNSAqIDYwICogMTAwMDsgLy8gMTUgbWludXRlcyBpbiBtaWxsaXNlY29uZHNcclxuICAgIGNvbnN0IHRpbWVEaWZmID0gbm93LmdldFRpbWUoKSAtIGNyZWF0ZWRBdC5nZXRUaW1lKCk7XHJcblxyXG4gICAgaWYgKHRpbWVEaWZmID4gZmlmdGVlbk1pbnV0ZXMpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICB2YWxpZDogZmFsc2UsXHJcbiAgICAgICAgbWVzc2FnZTogJ1ZlcmlmaWNhdGlvbiBjb2RlIGhhcyBleHBpcmVkLiBQbGVhc2UgcmVxdWVzdCBhIG5ldyBvbmUuJ1xyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHZhbGlkOiB0cnVlLFxyXG4gICAgICBtZXNzYWdlOiAnVmVyaWZpY2F0aW9uIGNvZGUgaXMgc3RpbGwgdmFsaWQuJ1xyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFZhbGlkYXRlIHVzZXIgZXhpc3RzIGluIENvZ25pdG9cclxuICAgKi9cclxuICBhc3luYyB2YWxpZGF0ZVVzZXJFeGlzdHMoZW1haWw6IHN0cmluZyk6IFByb21pc2U8eyBleGlzdHM6IGJvb2xlYW47IG1lc3NhZ2U6IHN0cmluZyB9PiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBzdGF0ZSA9IGF3YWl0IHRoaXMuc2VydmljZS5nZXRWZXJpZmljYXRpb25TdGF0ZShlbWFpbCk7XHJcbiAgICAgIFxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIGV4aXN0czogdHJ1ZSxcclxuICAgICAgICBtZXNzYWdlOiAnVXNlciBleGlzdHMgaW4gQ29nbml0by4nXHJcbiAgICAgIH07XHJcbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgIGlmIChlcnJvci5tZXNzYWdlLmluY2x1ZGVzKCdVc2VyTm90Rm91bmRFeGNlcHRpb24nKSkge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBleGlzdHM6IGZhbHNlLFxyXG4gICAgICAgICAgbWVzc2FnZTogJ1VzZXIgbm90IGZvdW5kIGluIENvZ25pdG8uJ1xyXG4gICAgICAgIH07XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogVmFsaWRhdGUgdmVyaWZpY2F0aW9uIHN0YXRlIHRyYW5zaXRpb25zXHJcbiAgICovXHJcbiAgdmFsaWRhdGVTdGF0ZVRyYW5zaXRpb24oXHJcbiAgICBjdXJyZW50U3RhdGU6IHN0cmluZyxcclxuICAgIG5leHRTdGF0ZTogc3RyaW5nXHJcbiAgKTogeyB2YWxpZDogYm9vbGVhbjsgbWVzc2FnZTogc3RyaW5nIH0ge1xyXG4gICAgY29uc3QgdmFsaWRUcmFuc2l0aW9uczogUmVjb3JkPHN0cmluZywgc3RyaW5nW10+ID0ge1xyXG4gICAgICAnaW5pdGlhbCc6IFsncmVnaXN0ZXJpbmcnXSxcclxuICAgICAgJ3JlZ2lzdGVyaW5nJzogWydlbWFpbF92ZXJpZmljYXRpb25fcmVxdWlyZWQnXSxcclxuICAgICAgJ2VtYWlsX3ZlcmlmaWNhdGlvbl9yZXF1aXJlZCc6IFsnZW1haWxfdmVyaWZ5aW5nJ10sXHJcbiAgICAgICdlbWFpbF92ZXJpZnlpbmcnOiBbJ290cF9zZXR1cF9yZXF1aXJlZCddLFxyXG4gICAgICAnb3RwX3NldHVwX3JlcXVpcmVkJzogWydvdHBfdmVyaWZ5aW5nJ10sXHJcbiAgICAgICdvdHBfdmVyaWZ5aW5nJzogWydhdXRoZW50aWNhdGVkJ10sXHJcbiAgICAgICdhdXRoZW50aWNhdGVkJzogW10sXHJcbiAgICAgICdlcnJvcic6IFsnaW5pdGlhbCcsICdlbWFpbF92ZXJpZmljYXRpb25fcmVxdWlyZWQnLCAnb3RwX3NldHVwX3JlcXVpcmVkJ11cclxuICAgIH07XHJcblxyXG4gICAgY29uc3QgYWxsb3dlZE5leHRTdGF0ZXMgPSB2YWxpZFRyYW5zaXRpb25zW2N1cnJlbnRTdGF0ZV0gfHwgW107XHJcbiAgICBcclxuICAgIGlmIChhbGxvd2VkTmV4dFN0YXRlcy5pbmNsdWRlcyhuZXh0U3RhdGUpIHx8IGN1cnJlbnRTdGF0ZSA9PT0gbmV4dFN0YXRlKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgdmFsaWQ6IHRydWUsXHJcbiAgICAgICAgbWVzc2FnZTogYFN0YXRlIHRyYW5zaXRpb24gZnJvbSAnJHtjdXJyZW50U3RhdGV9JyB0byAnJHtuZXh0U3RhdGV9JyBpcyB2YWxpZC5gXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgdmFsaWQ6IGZhbHNlLFxyXG4gICAgICBtZXNzYWdlOiBgSW52YWxpZCBzdGF0ZSB0cmFuc2l0aW9uIGZyb20gJyR7Y3VycmVudFN0YXRlfScgdG8gJyR7bmV4dFN0YXRlfScuYFxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFZhbGlkYXRlIE9UUCBzZXR1cCBkYXRhIHN0cnVjdHVyZVxyXG4gICAqL1xyXG4gIHZhbGlkYXRlT1RQU2V0dXBEYXRhKG90cFNldHVwOiBPVFBTZXR1cERhdGEpOiB7IHZhbGlkOiBib29sZWFuOyBtZXNzYWdlOiBzdHJpbmcgfSB7XHJcbiAgICBjb25zdCByZXF1aXJlZEZpZWxkcyA9IFsnc2VjcmV0JywgJ3FyQ29kZVVybCcsICdiYWNrdXBDb2RlcycsICdpc3N1ZXInLCAnYWNjb3VudE5hbWUnXTtcclxuICAgIFxyXG4gICAgY29uc3QgbWlzc2luZ0ZpZWxkcyA9IHJlcXVpcmVkRmllbGRzLmZpbHRlcihmaWVsZCA9PiAhb3RwU2V0dXBbZmllbGQgYXMga2V5b2YgT1RQU2V0dXBEYXRhXSk7XHJcbiAgICBcclxuICAgIGlmIChtaXNzaW5nRmllbGRzLmxlbmd0aCA+IDApIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICB2YWxpZDogZmFsc2UsXHJcbiAgICAgICAgbWVzc2FnZTogYE1pc3NpbmcgcmVxdWlyZWQgZmllbGRzIGluIE9UUCBzZXR1cCBkYXRhOiAke21pc3NpbmdGaWVsZHMuam9pbignLCAnKX1gXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gVmFsaWRhdGUgc2VjcmV0IGZvcm1hdCAoMzIgY2hhcmFjdGVycywgYmFzZTMyKVxyXG4gICAgaWYgKHR5cGVvZiBvdHBTZXR1cC5zZWNyZXQgPT09ICdzdHJpbmcnICYmIG90cFNldHVwLnNlY3JldC5sZW5ndGggIT09IDMyKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgdmFsaWQ6IGZhbHNlLFxyXG4gICAgICAgIG1lc3NhZ2U6ICdJbnZhbGlkIE9UUCBzZWNyZXQgZm9ybWF0LiBFeHBlY3RlZCAzMi1jaGFyYWN0ZXIgYmFzZTMyIHN0cmluZy4nXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gVmFsaWRhdGUgYmFja3VwIGNvZGVzIGZvcm1hdFxyXG4gICAgaWYgKEFycmF5LmlzQXJyYXkob3RwU2V0dXAuYmFja3VwQ29kZXMpKSB7XHJcbiAgICAgIGNvbnN0IGludmFsaWRDb2RlcyA9IG90cFNldHVwLmJhY2t1cENvZGVzLmZpbHRlcihcclxuICAgICAgICBjb2RlID0+IHR5cGVvZiBjb2RlICE9PSAnc3RyaW5nJyB8fCAhY29kZS5tYXRjaCgvXltBLVowLTldezR9LVtBLVowLTldezR9JC8pXHJcbiAgICAgICk7XHJcbiAgICAgIFxyXG4gICAgICBpZiAoaW52YWxpZENvZGVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgdmFsaWQ6IGZhbHNlLFxyXG4gICAgICAgICAgbWVzc2FnZTogYEludmFsaWQgYmFja3VwIGNvZGUgZm9ybWF0LiBFeHBlY3RlZCBmb3JtYXQ6IFhYWFgtWFhYWGBcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgdmFsaWQ6IHRydWUsXHJcbiAgICAgIG1lc3NhZ2U6ICdPVFAgc2V0dXAgZGF0YSBzdHJ1Y3R1cmUgaXMgdmFsaWQuJ1xyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFZhbGlkYXRlIHZlcmlmaWNhdGlvbiByZXN1bHQgc3RydWN0dXJlXHJcbiAgICovXHJcbiAgdmFsaWRhdGVWZXJpZmljYXRpb25SZXN1bHQocmVzdWx0OiBWZXJpZmljYXRpb25SZXN1bHQpOiB7IHZhbGlkOiBib29sZWFuOyBtZXNzYWdlOiBzdHJpbmcgfSB7XHJcbiAgICBpZiAodHlwZW9mIHJlc3VsdC5zdWNjZXNzICE9PSAnYm9vbGVhbicpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICB2YWxpZDogZmFsc2UsXHJcbiAgICAgICAgbWVzc2FnZTogJ0ludmFsaWQgdmVyaWZpY2F0aW9uIHJlc3VsdDogc3VjY2VzcyBmaWVsZCBtdXN0IGJlIGJvb2xlYW4uJ1xyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0eXBlb2YgcmVzdWx0Lm1lc3NhZ2UgIT09ICdzdHJpbmcnKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgdmFsaWQ6IGZhbHNlLFxyXG4gICAgICAgIG1lc3NhZ2U6ICdJbnZhbGlkIHZlcmlmaWNhdGlvbiByZXN1bHQ6IG1lc3NhZ2UgZmllbGQgbXVzdCBiZSBzdHJpbmcuJ1xyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChyZXN1bHQucmVxdWlyZXNPVFAgJiYgKCFyZXN1bHQub3RwU2VjcmV0IHx8ICFyZXN1bHQuYmFja3VwQ29kZXMpKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgdmFsaWQ6IGZhbHNlLFxyXG4gICAgICAgIG1lc3NhZ2U6ICdJbnZhbGlkIHZlcmlmaWNhdGlvbiByZXN1bHQ6IHJlcXVpcmVzT1RQIGlzIHRydWUgYnV0IE9UUCBkYXRhIGlzIG1pc3NpbmcuJ1xyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHZhbGlkOiB0cnVlLFxyXG4gICAgICBtZXNzYWdlOiAnVmVyaWZpY2F0aW9uIHJlc3VsdCBzdHJ1Y3R1cmUgaXMgdmFsaWQuJ1xyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFZhbGlkYXRlIHZlcmlmaWNhdGlvbiBzdGF0ZSBzdHJ1Y3R1cmVcclxuICAgKi9cclxuICB2YWxpZGF0ZVZlcmlmaWNhdGlvblN0YXRlKHN0YXRlOiBWZXJpZmljYXRpb25TdGF0ZSk6IHsgdmFsaWQ6IGJvb2xlYW47IG1lc3NhZ2U6IHN0cmluZyB9IHtcclxuICAgIGlmICh0eXBlb2Ygc3RhdGUuaXNWZXJpZmllZCAhPT0gJ2Jvb2xlYW4nKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgdmFsaWQ6IGZhbHNlLFxyXG4gICAgICAgIG1lc3NhZ2U6ICdJbnZhbGlkIHZlcmlmaWNhdGlvbiBzdGF0ZTogaXNWZXJpZmllZCBmaWVsZCBtdXN0IGJlIGJvb2xlYW4uJ1xyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0eXBlb2Ygc3RhdGUucmVxdWlyZXNWZXJpZmljYXRpb24gIT09ICdib29sZWFuJykge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHZhbGlkOiBmYWxzZSxcclxuICAgICAgICBtZXNzYWdlOiAnSW52YWxpZCB2ZXJpZmljYXRpb24gc3RhdGU6IHJlcXVpcmVzVmVyaWZpY2F0aW9uIGZpZWxkIG11c3QgYmUgYm9vbGVhbi4nXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHR5cGVvZiBzdGF0ZS5jYW5SZXNlbmQgIT09ICdib29sZWFuJykge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHZhbGlkOiBmYWxzZSxcclxuICAgICAgICBtZXNzYWdlOiAnSW52YWxpZCB2ZXJpZmljYXRpb24gc3RhdGU6IGNhblJlc2VuZCBmaWVsZCBtdXN0IGJlIGJvb2xlYW4uJ1xyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHZhbGlkOiB0cnVlLFxyXG4gICAgICBtZXNzYWdlOiAnVmVyaWZpY2F0aW9uIHN0YXRlIHN0cnVjdHVyZSBpcyB2YWxpZC4nXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUnVuIGFsbCB2YWxpZGF0aW9uIGNoZWNrc1xyXG4gICAqL1xyXG4gIGFzeW5jIHJ1bkZ1bGxWYWxpZGF0aW9uKGVtYWlsOiBzdHJpbmcsIGNvZGU6IHN0cmluZyk6IFByb21pc2U8e1xyXG4gICAgYWxsVmFsaWQ6IGJvb2xlYW47XHJcbiAgICByZXN1bHRzOiBBcnJheTx7IGNoZWNrOiBzdHJpbmc7IHZhbGlkOiBib29sZWFuOyBtZXNzYWdlOiBzdHJpbmcgfT47XHJcbiAgfT4ge1xyXG4gICAgY29uc3QgcmVzdWx0czogQXJyYXk8eyBjaGVjazogc3RyaW5nOyB2YWxpZDogYm9vbGVhbjsgbWVzc2FnZTogc3RyaW5nIH0+ID0gW107XHJcblxyXG4gICAgLy8gVmFsaWRhdGUgZW1haWwgZm9ybWF0XHJcbiAgICBjb25zdCBlbWFpbFZhbGlkYXRpb24gPSB0aGlzLnZhbGlkYXRlRW1haWxGb3JtYXQoZW1haWwpO1xyXG4gICAgcmVzdWx0cy5wdXNoKHsgY2hlY2s6ICdFbWFpbCBmb3JtYXQnLCAuLi5lbWFpbFZhbGlkYXRpb24gfSk7XHJcblxyXG4gICAgLy8gVmFsaWRhdGUgY29kZSBmb3JtYXRcclxuICAgIGNvbnN0IGNvZGVWYWxpZGF0aW9uID0gdGhpcy52YWxpZGF0ZUNvZGVGb3JtYXQoY29kZSk7XHJcbiAgICByZXN1bHRzLnB1c2goeyBjaGVjazogJ0NvZGUgZm9ybWF0JywgLi4uY29kZVZhbGlkYXRpb24gfSk7XHJcblxyXG4gICAgLy8gVmFsaWRhdGUgdXNlciBleGlzdHNcclxuICAgIGNvbnN0IHVzZXJWYWxpZGF0aW9uID0gYXdhaXQgdGhpcy52YWxpZGF0ZVVzZXJFeGlzdHMoZW1haWwpO1xyXG4gICAgcmVzdWx0cy5wdXNoKHsgXHJcbiAgICAgIGNoZWNrOiAnVXNlciBleGlzdHMnLCBcclxuICAgICAgdmFsaWQ6IHVzZXJWYWxpZGF0aW9uLmV4aXN0cywgXHJcbiAgICAgIG1lc3NhZ2U6IHVzZXJWYWxpZGF0aW9uLm1lc3NhZ2UgXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBJZiB1c2VyIGV4aXN0cywgdmFsaWRhdGUgc3RhdGVcclxuICAgIGlmICh1c2VyVmFsaWRhdGlvbi5leGlzdHMpIHtcclxuICAgICAgY29uc3Qgc3RhdGUgPSBhd2FpdCB0aGlzLnNlcnZpY2UuZ2V0VmVyaWZpY2F0aW9uU3RhdGUoZW1haWwpO1xyXG4gICAgICBjb25zdCBzdGF0ZVZhbGlkYXRpb24gPSB0aGlzLnZhbGlkYXRlVmVyaWZpY2F0aW9uU3RhdGUoc3RhdGUpO1xyXG4gICAgICByZXN1bHRzLnB1c2goeyBjaGVjazogJ1ZlcmlmaWNhdGlvbiBzdGF0ZScsIC4uLnN0YXRlVmFsaWRhdGlvbiB9KTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBhbGxWYWxpZCA9IHJlc3VsdHMuZXZlcnkocmVzdWx0ID0+IHJlc3VsdC52YWxpZCk7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgYWxsVmFsaWQsXHJcbiAgICAgIHJlc3VsdHNcclxuICAgIH07XHJcbiAgfVxyXG59XHJcbiJdfQ==