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
        results.push({ check: 'User exists', ...userValidation });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1haWwtdmVyaWZpY2F0aW9uLXNlcnZpY2UtdmFsaWRhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImVtYWlsLXZlcmlmaWNhdGlvbi1zZXJ2aWNlLXZhbGlkYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7R0FHRzs7O0FBRUgsNkVBQXdFO0FBR3hFLE1BQWEsaUNBQWlDO0lBQ3BDLE9BQU8sQ0FBMkI7SUFFMUMsWUFBWSxPQUFrQztRQUM1QyxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sSUFBSSxJQUFJLHFEQUF3QixFQUFFLENBQUM7SUFDM0QsQ0FBQztJQUVEOztPQUVHO0lBQ0gsa0JBQWtCLENBQUMsSUFBWTtRQUM3QixNQUFNLFNBQVMsR0FBRyxTQUFTLENBQUM7UUFFNUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUMxQixPQUFPO2dCQUNMLEtBQUssRUFBRSxLQUFLO2dCQUNaLE9BQU8sRUFBRSxxREFBcUQ7YUFDL0QsQ0FBQztRQUNKLENBQUM7UUFFRCxPQUFPO1lBQ0wsS0FBSyxFQUFFLElBQUk7WUFDWCxPQUFPLEVBQUUsdUJBQXVCO1NBQ2pDLENBQUM7SUFDSixDQUFDO0lBRUQ7O09BRUc7SUFDSCxtQkFBbUIsQ0FBQyxLQUFhO1FBQy9CLE1BQU0sVUFBVSxHQUFHLDRCQUE0QixDQUFDO1FBRWhELElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDNUIsT0FBTztnQkFDTCxLQUFLLEVBQUUsS0FBSztnQkFDWixPQUFPLEVBQUUsNkRBQTZEO2FBQ3ZFLENBQUM7UUFDSixDQUFDO1FBRUQsT0FBTztZQUNMLEtBQUssRUFBRSxJQUFJO1lBQ1gsT0FBTyxFQUFFLHdCQUF3QjtTQUNsQyxDQUFDO0lBQ0osQ0FBQztJQUVEOztPQUVHO0lBQ0gsc0JBQXNCLENBQUMsU0FBZSxFQUFFLE1BQVksSUFBSSxJQUFJLEVB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Y0FBYyxFQUFFLEdBQUcsZUFBZSxFQUFFLENBQUMsQ0FBQztRQUU1RCx1QkFBdUI7UUFDdkIsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3JELE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsYUFBYSxFQUFFLEdBQUcsY0FBYyxFQUFFLENBQUMsQ0FBQztRQUUxRCx1QkFBdUI7UUFDdkIsTUFBTSxjQUFjLEdBQUcsTUFBTSxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDNUQsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxhQUFhLEVBQUUsR0FBRyxjQUFjLEVBQUUsQ0FBQyxDQUFDO1FBRTFELGlDQUFpQztRQUNqQyxJQUFJLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUMxQixNQUFNLEtBQUssR0FBRyxNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDN0QsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQzlELE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsb0JBQW9CLEVBQUUsR0FBRyxlQUFlLEVBQUUsQ0FBQyxDQUFDO1FBQ3BFLENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRXZELE9BQU87WUFDTCxRQUFRO1lBQ1IsT0FBTztTQUNSLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFyUUQsOEVBcVFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIEVtYWlsVmVyaWZpY2F0aW9uU2VydmljZSBJbnRlZ3JhdGlvbiBWYWxpZGF0aW9uIE1ldGhvZHNcclxuICogVmFsaWRhdGVzIHNlcnZpY2UgaW50ZWdyYXRpb24gYW5kIGNvbXBhdGliaWxpdHlcclxuICovXHJcblxyXG5pbXBvcnQgeyBFbWFpbFZlcmlmaWNhdGlvblNlcnZpY2UgfSBmcm9tICcuL2VtYWlsLXZlcmlmaWNhdGlvbi1zZXJ2aWNlJztcclxuaW1wb3J0IHsgVmVyaWZpY2F0aW9uUmVzdWx0LCBWZXJpZmljYXRpb25TdGF0ZSwgT1RQU2V0dXBEYXRhIH0gZnJvbSAnLi9lbWFpbC12ZXJpZmljYXRpb24tc2VydmljZSc7XHJcblxyXG5leHBvcnQgY2xhc3MgRW1haWxWZXJpZmljYXRpb25TZXJ2aWNlVmFsaWRhdG9yIHtcclxuICBwcml2YXRlIHNlcnZpY2U6IEVtYWlsVmVyaWZpY2F0aW9uU2VydmljZTtcclxuXHJcbiAgY29uc3RydWN0b3Ioc2VydmljZT86IEVtYWlsVmVyaWZpY2F0aW9uU2VydmljZSkge1xyXG4gICAgdGhpcy5zZXJ2aWNlID0gc2VydmljZSB8fCBuZXcgRW1haWxWZXJpZmljYXRpb25TZXJ2aWNlKCk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBWYWxpZGF0ZSBlbWFpbCB2ZXJpZmljYXRpb24gY29kZSBmb3JtYXQgKDYgZGlnaXRzKVxyXG4gICAqL1xyXG4gIHZhbGlkYXRlQ29kZUZvcm1hdChjb2RlOiBzdHJpbmcpOiB7IHZhbGlkOiBib29sZWFuOyBtZXNzYWdlOiBzdHJpbmcgfSB7XHJcbiAgICBjb25zdCBjb2RlUmVnZXggPSAvXlxcZHs2fSQvO1xyXG4gICAgXHJcbiAgICBpZiAoIWNvZGVSZWdleC50ZXN0KGNvZGUpKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgdmFsaWQ6IGZhbHNlLFxyXG4gICAgICAgIG1lc3NhZ2U6ICdJbnZhbGlkIGNvZGUgZm9ybWF0LiBFeHBlY3RlZCA2LWRpZ2l0IG51bWVyaWMgY29kZS4nXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgdmFsaWQ6IHRydWUsXHJcbiAgICAgIG1lc3NhZ2U6ICdDb2RlIGZvcm1hdCBpcyB2YWxpZC4nXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogVmFsaWRhdGUgZW1haWwgZm9ybWF0IGJlZm9yZSB2ZXJpZmljYXRpb25cclxuICAgKi9cclxuICB2YWxpZGF0ZUVtYWlsRm9ybWF0KGVtYWlsOiBzdHJpbmcpOiB7IHZhbGlkOiBib29sZWFuOyBtZXNzYWdlOiBzdHJpbmcgfSB7XHJcbiAgICBjb25zdCBlbWFpbFJlZ2V4ID0gL15bXlxcc0BdK0BbXlxcc0BdK1xcLlteXFxzQF0rJC87XHJcbiAgICBcclxuICAgIGlmICghZW1haWxSZWdleC50ZXN0KGVtYWlsKSkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHZhbGlkOiBmYWxzZSxcclxuICAgICAgICBtZXNzYWdlOiAnSW52YWxpZCBlbWFpbCBmb3JtYXQuIFBsZWFzZSBwcm92aWRlIGEgdmFsaWQgZW1haWwgYWRkcmVzcy4nXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgdmFsaWQ6IHRydWUsXHJcbiAgICAgIG1lc3NhZ2U6ICdFbWFpbCBmb3JtYXQgaXMgdmFsaWQuJ1xyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFZhbGlkYXRlIGNvZGUgZXhwaXJhdGlvbiAoMTUgbWludXRlcylcclxuICAgKi9cclxuICB2YWxpZGF0ZUNvZGVFeHBpcmF0aW9uKGNyZWF0ZWRBdDogRGF0ZSwgbm93OiBEYXRlID0gbmV3IERhdGUoKSk6IHsgdmFsaWQ6IGJvb2xlYW47IG1lc3NhZ2U6IHN0cmluZyB9IHtcclxuICAgIGNvbnN0IGZpZnRlZW5NaW51dGVzID0gMTUgKiA2MCAqIDEwMDA7IC8vIDE1IG1pbnV0ZXMgaW4gbWlsbGlzZWNvbmRzXHJcbiAgICBjb25zdCB0aW1lRGlmZiA9IG5vdy5nZXRUaW1lKCkgLSBjcmVhdGVkQXQuZ2V0VGltZSgpO1xyXG5cclxuICAgIGlmICh0aW1lRGlmZiA+IGZpZnRlZW5NaW51dGVzKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgdmFsaWQ6IGZhbHNlLFxyXG4gICAgICAgIG1lc3NhZ2U6ICdWZXJpZmljYXRpb24gY29kZSBoYXMgZXhwaXJlZC4gUGxlYXNlIHJlcXVlc3QgYSBuZXcgb25lLidcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB2YWxpZDogdHJ1ZSxcclxuICAgICAgbWVzc2FnZTogJ1ZlcmlmaWNhdGlvbiBjb2RlIGlzIHN0aWxsIHZhbGlkLidcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBWYWxpZGF0ZSB1c2VyIGV4aXN0cyBpbiBDb2duaXRvXHJcbiAgICovXHJcbiAgYXN5bmMgdmFsaWRhdGVVc2VyRXhpc3RzKGVtYWlsOiBzdHJpbmcpOiBQcm9taXNlPHsgZXhpc3RzOiBib29sZWFuOyBtZXNzYWdlOiBzdHJpbmcgfT4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3Qgc3RhdGUgPSBhd2FpdCB0aGlzLnNlcnZpY2UuZ2V0VmVyaWZpY2F0aW9uU3RhdGUoZW1haWwpO1xyXG4gICAgICBcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBleGlzdHM6IHRydWUsXHJcbiAgICAgICAgbWVzc2FnZTogJ1VzZXIgZXhpc3RzIGluIENvZ25pdG8uJ1xyXG4gICAgICB9O1xyXG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICBpZiAoZXJyb3IubWVzc2FnZS5pbmNsdWRlcygnVXNlck5vdEZvdW5kRXhjZXB0aW9uJykpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgZXhpc3RzOiBmYWxzZSxcclxuICAgICAgICAgIG1lc3NhZ2U6ICdVc2VyIG5vdCBmb3VuZCBpbiBDb2duaXRvLidcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICB0aHJvdyBlcnJvcjtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFZhbGlkYXRlIHZlcmlmaWNhdGlvbiBzdGF0ZSB0cmFuc2l0aW9uc1xyXG4gICAqL1xyXG4gIHZhbGlkYXRlU3RhdGVUcmFuc2l0aW9uKFxyXG4gICAgY3VycmVudFN0YXRlOiBzdHJpbmcsXHJcbiAgICBuZXh0U3RhdGU6IHN0cmluZ1xyXG4gICk6IHsgdmFsaWQ6IGJvb2xlYW47IG1lc3NhZ2U6IHN0cmluZyB9IHtcclxuICAgIGNvbnN0IHZhbGlkVHJhbnNpdGlvbnM6IFJlY29yZDxzdHJpbmcsIHN0cmluZ1tdPiA9IHtcclxuICAgICAgJ2luaXRpYWwnOiBbJ3JlZ2lzdGVyaW5nJ10sXHJcbiAgICAgICdyZWdpc3RlcmluZyc6IFsnZW1haWxfdmVyaWZpY2F0aW9uX3JlcXVpcmVkJ10sXHJcbiAgICAgICdlbWFpbF92ZXJpZmljYXRpb25fcmVxdWlyZWQnOiBbJ2VtYWlsX3ZlcmlmeWluZyddLFxyXG4gICAgICAnZW1haWxfdmVyaWZ5aW5nJzogWydvdHBfc2V0dXBfcmVxdWlyZWQnXSxcclxuICAgICAgJ290cF9zZXR1cF9yZXF1aXJlZCc6IFsnb3RwX3ZlcmlmeWluZyddLFxyXG4gICAgICAnb3RwX3ZlcmlmeWluZyc6IFsnYXV0aGVudGljYXRlZCddLFxyXG4gICAgICAnYXV0aGVudGljYXRlZCc6IFtdLFxyXG4gICAgICAnZXJyb3InOiBbJ2luaXRpYWwnLCAnZW1haWxfdmVyaWZpY2F0aW9uX3JlcXVpcmVkJywgJ290cF9zZXR1cF9yZXF1aXJlZCddXHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnN0IGFsbG93ZWROZXh0U3RhdGVzID0gdmFsaWRUcmFuc2l0aW9uc1tjdXJyZW50U3RhdGVdIHx8IFtdO1xyXG4gICAgXHJcbiAgICBpZiAoYWxsb3dlZE5leHRTdGF0ZXMuaW5jbHVkZXMobmV4dFN0YXRlKSB8fCBjdXJyZW50U3RhdGUgPT09IG5leHRTdGF0ZSkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHZhbGlkOiB0cnVlLFxyXG4gICAgICAgIG1lc3NhZ2U6IGBTdGF0ZSB0cmFuc2l0aW9uIGZyb20gJyR7Y3VycmVudFN0YXRlfScgdG8gJyR7bmV4dFN0YXRlfScgaXMgdmFsaWQuYFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHZhbGlkOiBmYWxzZSxcclxuICAgICAgbWVzc2FnZTogYEludmFsaWQgc3RhdGUgdHJhbnNpdGlvbiBmcm9tICcke2N1cnJlbnRTdGF0ZX0nIHRvICcke25leHRTdGF0ZX0nLmBcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBWYWxpZGF0ZSBPVFAgc2V0dXAgZGF0YSBzdHJ1Y3R1cmVcclxuICAgKi9cclxuICB2YWxpZGF0ZU9UUFNldHVwRGF0YShvdHBTZXR1cDogT1RQU2V0dXBEYXRhKTogeyB2YWxpZDogYm9vbGVhbjsgbWVzc2FnZTogc3RyaW5nIH0ge1xyXG4gICAgY29uc3QgcmVxdWlyZWRGaWVsZHMgPSBbJ3NlY3JldCcsICdxckNvZGVVcmwnLCAnYmFja3VwQ29kZXMnLCAnaXNzdWVyJywgJ2FjY291bnROYW1lJ107XHJcbiAgICBcclxuICAgIGNvbnN0IG1pc3NpbmdGaWVsZHMgPSByZXF1aXJlZEZpZWxkcy5maWx0ZXIoZmllbGQgPT4gIW90cFNldHVwW2ZpZWxkIGFzIGtleW9mIE9UUFNldHVwRGF0YV0pO1xyXG4gICAgXHJcbiAgICBpZiAobWlzc2luZ0ZpZWxkcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgdmFsaWQ6IGZhbHNlLFxyXG4gICAgICAgIG1lc3NhZ2U6IGBNaXNzaW5nIHJlcXVpcmVkIGZpZWxkcyBpbiBPVFAgc2V0dXAgZGF0YTogJHttaXNzaW5nRmllbGRzLmpvaW4oJywgJyl9YFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFZhbGlkYXRlIHNlY3JldCBmb3JtYXQgKDMyIGNoYXJhY3RlcnMsIGJhc2UzMilcclxuICAgIGlmICh0eXBlb2Ygb3RwU2V0dXAuc2VjcmV0ID09PSAnc3RyaW5nJyAmJiBvdHBTZXR1cC5zZWNyZXQubGVuZ3RoICE9PSAzMikge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHZhbGlkOiBmYWxzZSxcclxuICAgICAgICBtZXNzYWdlOiAnSW52YWxpZCBPVFAgc2VjcmV0IGZvcm1hdC4gRXhwZWN0ZWQgMzItY2hhcmFjdGVyIGJhc2UzMiBzdHJpbmcuJ1xyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFZhbGlkYXRlIGJhY2t1cCBjb2RlcyBmb3JtYXRcclxuICAgIGlmIChBcnJheS5pc0FycmF5KG90cFNldHVwLmJhY2t1cENvZGVzKSkge1xyXG4gICAgICBjb25zdCBpbnZhbGlkQ29kZXMgPSBvdHBTZXR1cC5iYWNrdXBDb2Rlcy5maWx0ZXIoXHJcbiAgICAgICAgY29kZSA9PiB0eXBlb2YgY29kZSAhPT0gJ3N0cmluZycgfHwgIWNvZGUubWF0Y2goL15bQS1aMC05XXs0fS1bQS1aMC05XXs0fSQvKVxyXG4gICAgICApO1xyXG4gICAgICBcclxuICAgICAgaWYgKGludmFsaWRDb2Rlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIHZhbGlkOiBmYWxzZSxcclxuICAgICAgICAgIG1lc3NhZ2U6IGBJbnZhbGlkIGJhY2t1cCBjb2RlIGZvcm1hdC4gRXhwZWN0ZWQgZm9ybWF0OiBYWFhYLVhYWFhgXHJcbiAgICAgICAgfTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHZhbGlkOiB0cnVlLFxyXG4gICAgICBtZXNzYWdlOiAnT1RQIHNldHVwIGRhdGEgc3RydWN0dXJlIGlzIHZhbGlkLidcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBWYWxpZGF0ZSB2ZXJpZmljYXRpb24gcmVzdWx0IHN0cnVjdHVyZVxyXG4gICAqL1xyXG4gIHZhbGlkYXRlVmVyaWZpY2F0aW9uUmVzdWx0KHJlc3VsdDogVmVyaWZpY2F0aW9uUmVzdWx0KTogeyB2YWxpZDogYm9vbGVhbjsgbWVzc2FnZTogc3RyaW5nIH0ge1xyXG4gICAgaWYgKHR5cGVvZiByZXN1bHQuc3VjY2VzcyAhPT0gJ2Jvb2xlYW4nKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgdmFsaWQ6IGZhbHNlLFxyXG4gICAgICAgIG1lc3NhZ2U6ICdJbnZhbGlkIHZlcmlmaWNhdGlvbiByZXN1bHQ6IHN1Y2Nlc3MgZmllbGQgbXVzdCBiZSBib29sZWFuLidcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAodHlwZW9mIHJlc3VsdC5tZXNzYWdlICE9PSAnc3RyaW5nJykge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHZhbGlkOiBmYWxzZSxcclxuICAgICAgICBtZXNzYWdlOiAnSW52YWxpZCB2ZXJpZmljYXRpb24gcmVzdWx0OiBtZXNzYWdlIGZpZWxkIG11c3QgYmUgc3RyaW5nLidcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAocmVzdWx0LnJlcXVpcmVzT1RQICYmICghcmVzdWx0Lm90cFNlY3JldCB8fCAhcmVzdWx0LmJhY2t1cENvZGVzKSkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHZhbGlkOiBmYWxzZSxcclxuICAgICAgICBtZXNzYWdlOiAnSW52YWxpZCB2ZXJpZmljYXRpb24gcmVzdWx0OiByZXF1aXJlc09UUCBpcyB0cnVlIGJ1dCBPVFAgZGF0YSBpcyBtaXNzaW5nLidcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB2YWxpZDogdHJ1ZSxcclxuICAgICAgbWVzc2FnZTogJ1ZlcmlmaWNhdGlvbiByZXN1bHQgc3RydWN0dXJlIGlzIHZhbGlkLidcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBWYWxpZGF0ZSB2ZXJpZmljYXRpb24gc3RhdGUgc3RydWN0dXJlXHJcbiAgICovXHJcbiAgdmFsaWRhdGVWZXJpZmljYXRpb25TdGF0ZShzdGF0ZTogVmVyaWZpY2F0aW9uU3RhdGUpOiB7IHZhbGlkOiBib29sZWFuOyBtZXNzYWdlOiBzdHJpbmcgfSB7XHJcbiAgICBpZiAodHlwZW9mIHN0YXRlLmlzVmVyaWZpZWQgIT09ICdib29sZWFuJykge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHZhbGlkOiBmYWxzZSxcclxuICAgICAgICBtZXNzYWdlOiAnSW52YWxpZCB2ZXJpZmljYXRpb24gc3RhdGU6IGlzVmVyaWZpZWQgZmllbGQgbXVzdCBiZSBib29sZWFuLidcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAodHlwZW9mIHN0YXRlLnJlcXVpcmVzVmVyaWZpY2F0aW9uICE9PSAnYm9vbGVhbicpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICB2YWxpZDogZmFsc2UsXHJcbiAgICAgICAgbWVzc2FnZTogJ0ludmFsaWQgdmVyaWZpY2F0aW9uIHN0YXRlOiByZXF1aXJlc1ZlcmlmaWNhdGlvbiBmaWVsZCBtdXN0IGJlIGJvb2xlYW4uJ1xyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0eXBlb2Ygc3RhdGUuY2FuUmVzZW5kICE9PSAnYm9vbGVhbicpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICB2YWxpZDogZmFsc2UsXHJcbiAgICAgICAgbWVzc2FnZTogJ0ludmFsaWQgdmVyaWZpY2F0aW9uIHN0YXRlOiBjYW5SZXNlbmQgZmllbGQgbXVzdCBiZSBib29sZWFuLidcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB2YWxpZDogdHJ1ZSxcclxuICAgICAgbWVzc2FnZTogJ1ZlcmlmaWNhdGlvbiBzdGF0ZSBzdHJ1Y3R1cmUgaXMgdmFsaWQuJ1xyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFJ1biBhbGwgdmFsaWRhdGlvbiBjaGVja3NcclxuICAgKi9cclxuICBhc3luYyBydW5GdWxsVmFsaWRhdGlvbihlbWFpbDogc3RyaW5nLCBjb2RlOiBzdHJpbmcpOiBQcm9taXNlPHtcclxuICAgIGFsbFZhbGlkOiBib29sZWFuO1xyXG4gICAgcmVzdWx0czogQXJyYXk8eyBjaGVjazogc3RyaW5nOyB2YWxpZDogYm9vbGVhbjsgbWVzc2FnZTogc3RyaW5nIH0+O1xyXG4gIH0+IHtcclxuICAgIGNvbnN0IHJlc3VsdHM6IEFycmF5PHsgY2hlY2s6IHN0cmluZzsgdmFsaWQ6IGJvb2xlYW47IG1lc3NhZ2U6IHN0cmluZyB9PiA9IFtdO1xyXG5cclxuICAgIC8vIFZhbGlkYXRlIGVtYWlsIGZvcm1hdFxyXG4gICAgY29uc3QgZW1haWxWYWxpZGF0aW9uID0gdGhpcy52YWxpZGF0ZUVtYWlsRm9ybWF0KGVtYWlsKTtcclxuICAgIHJlc3VsdHMucHVzaCh7IGNoZWNrOiAnRW1haWwgZm9ybWF0JywgLi4uZW1haWxWYWxpZGF0aW9uIH0pO1xyXG5cclxuICAgIC8vIFZhbGlkYXRlIGNvZGUgZm9ybWF0XHJcbiAgICBjb25zdCBjb2RlVmFsaWRhdGlvbiA9IHRoaXMudmFsaWRhdGVDb2RlRm9ybWF0KGNvZGUpO1xyXG4gICAgcmVzdWx0cy5wdXNoKHsgY2hlY2s6ICdDb2RlIGZvcm1hdCcsIC4uLmNvZGVWYWxpZGF0aW9uIH0pO1xyXG5cclxuICAgIC8vIFZhbGlkYXRlIHVzZXIgZXhpc3RzXHJcbiAgICBjb25zdCB1c2VyVmFsaWRhdGlvbiA9IGF3YWl0IHRoaXMudmFsaWRhdGVVc2VyRXhpc3RzKGVtYWlsKTtcclxuICAgIHJlc3VsdHMucHVzaCh7IGNoZWNrOiAnVXNlciBleGlzdHMnLCAuLi51c2VyVmFsaWRhdGlvbiB9KTtcclxuXHJcbiAgICAvLyBJZiB1c2VyIGV4aXN0cywgdmFsaWRhdGUgc3RhdGVcclxuICAgIGlmICh1c2VyVmFsaWRhdGlvbi5leGlzdHMpIHtcclxuICAgICAgY29uc3Qgc3RhdGUgPSBhd2FpdCB0aGlzLnNlcnZpY2UuZ2V0VmVyaWZpY2F0aW9uU3RhdGUoZW1haWwpO1xyXG4gICAgICBjb25zdCBzdGF0ZVZhbGlkYXRpb24gPSB0aGlzLnZhbGlkYXRlVmVyaWZpY2F0aW9uU3RhdGUoc3RhdGUpO1xyXG4gICAgICByZXN1bHRzLnB1c2goeyBjaGVjazogJ1ZlcmlmaWNhdGlvbiBzdGF0ZScsIC4uLnN0YXRlVmFsaWRhdGlvbiB9KTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBhbGxWYWxpZCA9IHJlc3VsdHMuZXZlcnkocmVzdWx0ID0+IHJlc3VsdC52YWxpZCk7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgYWxsVmFsaWQsXHJcbiAgICAgIHJlc3VsdHNcclxuICAgIH07XHJcbiAgfVxyXG59XHJcbiJdfQ==