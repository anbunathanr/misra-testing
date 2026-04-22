"use strict";
/**
 * Email Verification Service
 * Handles email verification codes and OTP generation
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailVerificationService = exports.AuthenticationState = void 0;
const client_cognito_identity_provider_1 = require("@aws-sdk/client-cognito-identity-provider");
const crypto = __importStar(require("crypto"));
const auth_error_handler_1 = require("../../utils/auth-error-handler");
const logger_1 = require("../../utils/logger");
const uuid_1 = require("uuid");
var AuthenticationState;
(function (AuthenticationState) {
    AuthenticationState["INITIAL"] = "initial";
    AuthenticationState["REGISTERING"] = "registering";
    AuthenticationState["EMAIL_VERIFICATION_REQUIRED"] = "email_verification_required";
    AuthenticationState["EMAIL_VERIFYING"] = "email_verifying";
    AuthenticationState["OTP_SETUP_REQUIRED"] = "otp_setup_required";
    AuthenticationState["OTP_VERIFYING"] = "otp_verifying";
    AuthenticationState["AUTHENTICATED"] = "authenticated";
    AuthenticationState["ERROR"] = "error";
})(AuthenticationState || (exports.AuthenticationState = AuthenticationState = {}));
class EmailVerificationService {
    cognitoClient;
    userPoolId;
    errorHandler;
    logger;
    constructor() {
        this.cognitoClient = new client_cognito_identity_provider_1.CognitoIdentityProviderClient({
            region: process.env.AWS_REGION || 'us-east-1'
        });
        this.userPoolId = process.env.COGNITO_USER_POOL_ID;
        this.errorHandler = new auth_error_handler_1.AuthErrorHandler('EmailVerificationService');
        this.logger = (0, logger_1.createLogger)('EmailVerificationService');
    }
    /**
     * Verify email with confirmation code
     */
    async verifyEmail(email, confirmationCode) {
        const correlationId = (0, uuid_1.v4)();
        this.logger.info('Verifying email', {
            correlationId,
            email
        });
        try {
            // Confirm the user in Cognito
            await this.cognitoClient.send(new client_cognito_identity_provider_1.AdminConfirmSignUpCommand({
                UserPoolId: this.userPoolId,
                Username: email
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
        }
        catch (error) {
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
            }
            else if (error.name === 'ExpiredCodeException') {
                return {
                    success: false,
                    message: 'Verification code has expired. Please request a new one.'
                };
            }
            else if (error.name === 'NotAuthorizedException') {
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
    async verifyEmailWithOTPSetup(email, code) {
        try {
            // First verify the email
            const verificationResult = await this.verifyEmail(email, code);
            if (!verificationResult.success) {
                throw new Error(verificationResult.message);
            }
            // Generate OTP setup data
            const otpSetup = {
                secret: verificationResult.otpSecret,
                qrCodeUrl: this.generateQRCodeUrl(email, verificationResult.otpSecret),
                backupCodes: verificationResult.backupCodes,
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
        }
        catch (error) {
            throw new Error(`EMAIL_VERIFICATION_WITH_OTP_FAILED: ${error.message}`);
        }
    }
    /**
     * Get verification state
     */
    async getVerificationState(email) {
        try {
            const userResponse = await this.cognitoClient.send(new client_cognito_identity_provider_1.AdminGetUserCommand({
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
        }
        catch (error) {
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
    async resendVerificationCode(email) {
        try {
            await this.cognitoClient.send(new client_cognito_identity_provider_1.ResendConfirmationCodeCommand({
                ClientId: process.env.COGNITO_USER_POOL_CLIENT_ID,
                Username: email
            }));
            return {
                success: true,
                message: 'Verification code sent to your email address.'
            };
        }
        catch (error) {
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
    async setupOTPForUser(email) {
        // Generate OTP secret
        const secret = this.generateOTPSecret();
        // Generate backup codes
        const backupCodes = this.generateBackupCodes();
        // Store OTP secret and backup codes in user attributes
        await this.cognitoClient.send(new client_cognito_identity_provider_1.AdminUpdateUserAttributesCommand({
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
    generateOTPSecret() {
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
    generateBackupCodes() {
        const codes = [];
        for (let i = 0; i < 10; i++) {
            const code = crypto.randomBytes(4).toString('hex').toUpperCase();
            codes.push(`${code.substring(0, 4)}-${code.substring(4, 8)}`);
        }
        return codes;
    }
    /**
     * Generate QR code URL for authenticator apps
     */
    generateQRCodeUrl(email, secret) {
        const issuer = 'MISRA Platform';
        const label = `${issuer}:${email}`;
        const otpAuthUrl = `otpauth://totp/${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
        // Return Google Charts QR code URL
        return `https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=${encodeURIComponent(otpAuthUrl)}`;
    }
    /**
     * Verify OTP code
     */
    async verifyOTP(email, otpCode) {
        const correlationId = (0, uuid_1.v4)();
        this.logger.info('Verifying OTP', {
            correlationId,
            email
        });
        try {
            // Get user's OTP secret
            const userResponse = await this.cognitoClient.send(new client_cognito_identity_provider_1.AdminGetUserCommand({
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
                    const updatedCodes = backupCodes.filter((code) => code !== otpCode.toUpperCase());
                    await this.cognitoClient.send(new client_cognito_identity_provider_1.AdminUpdateUserAttributesCommand({
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
            }
            else {
                this.logger.warn('Invalid OTP code provided', {
                    correlationId,
                    email
                });
                return {
                    success: false,
                    message: 'Invalid OTP code. Please try again.'
                };
            }
        }
        catch (error) {
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
    verifyTOTP(secret, token, window = 1) {
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
    generateTOTP(secret, time) {
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
    async isOTPEnabled(email) {
        try {
            const userResponse = await this.cognitoClient.send(new client_cognito_identity_provider_1.AdminGetUserCommand({
                UserPoolId: this.userPoolId,
                Username: email
            }));
            const otpEnabledAttr = userResponse.UserAttributes?.find(attr => attr.Name === 'custom:otp_enabled');
            return otpEnabledAttr?.Value === 'true';
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Check if user is verified
     */
    async isEmailVerified(email) {
        try {
            const userResponse = await this.cognitoClient.send(new client_cognito_identity_provider_1.AdminGetUserCommand({
                UserPoolId: this.userPoolId,
                Username: email
            }));
            return userResponse.UserStatus === 'CONFIRMED';
        }
        catch (error) {
            return false;
        }
    }
}
exports.EmailVerificationService = EmailVerificationService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1haWwtdmVyaWZpY2F0aW9uLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJlbWFpbC12ZXJpZmljYXRpb24tc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztHQUdHOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCxnR0FPbUQ7QUFDbkQsK0NBQWlDO0FBQ2pDLHVFQUFrRTtBQUNsRSwrQ0FBa0Q7QUFDbEQsK0JBQW9DO0FBc0JwQyxJQUFZLG1CQVNYO0FBVEQsV0FBWSxtQkFBbUI7SUFDN0IsMENBQW1CLENBQUE7SUFDbkIsa0RBQTJCLENBQUE7SUFDM0Isa0ZBQTJELENBQUE7SUFDM0QsMERBQW1DLENBQUE7SUFDbkMsZ0VBQXlDLENBQUE7SUFDekMsc0RBQStCLENBQUE7SUFDL0Isc0RBQStCLENBQUE7SUFDL0Isc0NBQWUsQ0FBQTtBQUNqQixDQUFDLEVBVFcsbUJBQW1CLG1DQUFuQixtQkFBbUIsUUFTOUI7QUFnQkQsTUFBYSx3QkFBd0I7SUFDM0IsYUFBYSxDQUFnQztJQUM3QyxVQUFVLENBQVM7SUFDbkIsWUFBWSxDQUFtQjtJQUMvQixNQUFNLENBQWtDO0lBRWhEO1FBQ0UsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLGdFQUE2QixDQUFDO1lBQ3JELE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXO1NBQzlDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBcUIsQ0FBQztRQUNwRCxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUkscUNBQWdCLENBQUMsMEJBQTBCLENBQUMsQ0FBQztRQUNyRSxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUEscUJBQVksRUFBQywwQkFBMEIsQ0FBQyxDQUFDO0lBQ3pELENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxXQUFXLENBQUMsS0FBYSxFQUFF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WUFDSCxNQUFNLFlBQVksR0FBRyxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksc0RBQW1CLENBQUM7Z0JBQ3pFLFVBQVUsRUFBRSxJQUFJLENBQUMsVUFBVTtnQkFDM0IsUUFBUSxFQUFFLEtBQUs7YUFDaEIsQ0FBQyxDQUFDLENBQUM7WUFFSixNQUFNLGNBQWMsR0FBRyxZQUFZLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssb0JBQW9CLENBQUMsQ0FBQztZQUNyRyxPQUFPLGNBQWMsRUFBRSxLQUFLLEtBQUssTUFBTSxDQUFDO1FBQzFDLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2YsT0FBTyxLQUFLLENBQUM7UUFDZixDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLGVBQWUsQ0FBQyxLQUFhO1FBQ2pDLElBQUksQ0FBQztZQUNILE1BQU0sWUFBWSxHQUFHLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxzREFBbUIsQ0FBQztnQkFDekUsVUFBVSxFQUFFLElBQUksQ0FBQyxVQUFVO2dCQUMzQixRQUFRLEVBQUUsS0FBSzthQUNoQixDQUFDLENBQUMsQ0FBQztZQUVKLE9BQU8sWUFBWSxDQUFDLFVBQVUsS0FBSyxXQUFXLENBQUM7UUFDakQsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZixPQUFPLEtBQUssQ0FBQztRQUNmLENBQUM7SUFDSCxDQUFDO0NBQ0Y7QUF4YkQsNERBd2JDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIEVtYWlsIFZlcmlmaWNhdGlvbiBTZXJ2aWNlXHJcbiAqIEhhbmRsZXMgZW1haWwgdmVyaWZpY2F0aW9uIGNvZGVzIGFuZCBPVFAgZ2VuZXJhdGlvblxyXG4gKi9cclxuXHJcbmltcG9ydCB7IFxyXG4gIENvZ25pdG9JZGVudGl0eVByb3ZpZGVyQ2xpZW50LFxyXG4gIEFkbWluR2V0VXNlckNvbW1hbmQsXHJcbiAgQWRtaW5Db25maXJtU2lnblVwQ29tbWFuZCxcclxuICBBZG1pblNldFVzZXJQYXNzd29yZENvbW1hbmQsXHJcbiAgUmVzZW5kQ29uZmlybWF0aW9uQ29kZUNvbW1hbmQsXHJcbiAgQWRtaW5VcGRhdGVVc2VyQXR0cmlidXRlc0NvbW1hbmRcclxufSBmcm9tICdAYXdzLXNkay9jbGllbnQtY29nbml0by1pZGVudGl0eS1wcm92aWRlcic7XHJcbmltcG9ydCAqIGFzIGNyeXB0byBmcm9tICdjcnlwdG8nO1xyXG5pbXBvcnQgeyBBdXRoRXJyb3JIYW5kbGVyIH0gZnJvbSAnLi4vLi4vdXRpbHMvYXV0aC1lcnJvci1oYW5kbGVyJztcclxuaW1wb3J0IHsgY3JlYXRlTG9nZ2VyIH0gZnJvbSAnLi4vLi4vdXRpbHMvbG9nZ2VyJztcclxuaW1wb3J0IHsgdjQgYXMgdXVpZHY0IH0gZnJvbSAndXVpZCc7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFZlcmlmaWNhdGlvblJlc3VsdCB7XHJcbiAgc3VjY2VzczogYm9vbGVhbjtcclxuICBtZXNzYWdlOiBzdHJpbmc7XHJcbiAgcmVxdWlyZXNPVFA/OiBib29sZWFuO1xyXG4gIG90cFNlY3JldD86IHN0cmluZztcclxuICBiYWNrdXBDb2Rlcz86IHN0cmluZ1tdO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFZlcmlmaWNhdGlvbldpdGhPVFBSZXN1bHQgZXh0ZW5kcyBWZXJpZmljYXRpb25SZXN1bHQge1xyXG4gIG90cFNldHVwOiBPVFBTZXR1cERhdGE7XHJcbiAgbmV4dFN0ZXA6IEF1dGhlbnRpY2F0aW9uU3RhdGU7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgVmVyaWZpY2F0aW9uU3RhdGUge1xyXG4gIGlzVmVyaWZpZWQ6IGJvb2xlYW47XHJcbiAgcmVxdWlyZXNWZXJpZmljYXRpb246IGJvb2xlYW47XHJcbiAgY2FuUmVzZW5kOiBib29sZWFuO1xyXG4gIGxhc3RTZW50QXQ/OiBEYXRlO1xyXG59XHJcblxyXG5leHBvcnQgZW51bSBBdXRoZW50aWNhdGlvblN0YXRlIHtcclxuICBJTklUSUFMID0gJ2luaXRpYWwnLFxyXG4gIFJFR0lTVEVSSU5HID0gJ3JlZ2lzdGVyaW5nJyxcclxuICBFTUFJTF9WRVJJRklDQVRJT05fUkVRVUlSRUQgPSAnZW1haWxfdmVyaWZpY2F0aW9uX3JlcXVpcmVkJyxcclxuICBFTUFJTF9WRVJJRllJTkcgPSAnZW1haWxfdmVyaWZ5aW5nJyxcclxuICBPVFBfU0VUVVBfUkVRVUlSRUQgPSAnb3RwX3NldHVwX3JlcXVpcmVkJyxcclxuICBPVFBfVkVSSUZZSU5HID0gJ290cF92ZXJpZnlpbmcnLFxyXG4gIEFVVEhFTlRJQ0FURUQgPSAnYXV0aGVudGljYXRlZCcsXHJcbiAgRVJST1IgPSAnZXJyb3InXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgT1RQU2V0dXBEYXRhIHtcclxuICBzZWNyZXQ6IHN0cmluZztcclxuICBxckNvZGVVcmw6IHN0cmluZztcclxuICBiYWNrdXBDb2Rlczogc3RyaW5nW107XHJcbiAgaXNzdWVyOiBzdHJpbmc7XHJcbiAgYWNjb3VudE5hbWU6IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBPVFBTZXR1cFJlc3VsdCB7XHJcbiAgc2VjcmV0OiBzdHJpbmc7XHJcbiAgcXJDb2RlVXJsOiBzdHJpbmc7XHJcbiAgYmFja3VwQ29kZXM6IHN0cmluZ1tdO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgRW1haWxWZXJpZmljYXRpb25TZXJ2aWNlIHtcclxuICBwcml2YXRlIGNvZ25pdG9DbGllbnQ6IENvZ25pdG9JZGVudGl0eVByb3ZpZGVyQ2xpZW50O1xyXG4gIHByaXZhdGUgdXNlclBvb2xJZDogc3RyaW5nO1xyXG4gIHByaXZhdGUgZXJyb3JIYW5kbGVyOiBBdXRoRXJyb3JIYW5kbGVyO1xyXG4gIHByaXZhdGUgbG9nZ2VyOiBSZXR1cm5UeXBlPHR5cGVvZiBjcmVhdGVMb2dnZXI+O1xyXG5cclxuICBjb25zdHJ1Y3RvcigpIHtcclxuICAgIHRoaXMuY29nbml0b0NsaWVudCA9IG5ldyBDb2duaXRvSWRlbnRpdHlQcm92aWRlckNsaWVudCh7XHJcbiAgICAgIHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJ1xyXG4gICAgfSk7XHJcbiAgICB0aGlzLnVzZXJQb29sSWQgPSBwcm9jZXNzLmVudi5DT0dOSVRPX1VTRVJfUE9PTF9JRCE7XHJcbiAgICB0aGlzLmVycm9ySGFuZGxlciA9IG5ldyBBdXRoRXJyb3JIYW5kbGVyKCdFbWFpbFZlcmlmaWNhdGlvblNlcnZpY2UnKTtcclxuICAgIHRoaXMubG9nZ2VyID0gY3JlYXRlTG9nZ2VyKCdFbWFpbFZlcmlmaWNhdGlvblNlcnZpY2UnKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFZlcmlmeSBlbWFpbCB3aXRoIGNvbmZpcm1hdGlvbiBjb2RlXHJcbiAgICovXHJcbiAgYXN5bmMgdmVyaWZ5RW1haWwoZW1haWw6IHN0cmluZywgY29uZmlybWF0aW9uQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWZXJpZmljYXRpb25SZXN1bHQ+IHtcclxuICAgIGNvbnN0IGNvcnJlbGF0aW9uSWQgPSB1dWlkdjQoKTtcclxuICAgIFxyXG4gICAgdGhpcy5sb2dnZXIuaW5mbygnVmVyaWZ5aW5nIGVtYWlsJywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICBlbWFpbFxyXG4gICAgfSk7XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gQ29uZmlybSB0aGUgdXNlciBpbiBDb2duaXRvXHJcbiAgICAgIGF3YWl0IHRoaXMuY29nbml0b0NsaWVudC5zZW5kKG5ldyBBZG1pbkNvbmZpcm1TaWduVXBDb21tYW5kKHtcclxuICAgICAgICBVc2VyUG9vbElkOiB0aGlzLnVzZXJQb29sSWQsXHJcbiAgICAgICAgVXNlcm5hbWU6IGVtYWlsXHJcbiAgICAgIH0pKTtcclxuXHJcbiAgICAgIHRoaXMuZXJyb3JIYW5kbGVyLmxvZ0F1dGhFdmVudCgnZW1haWxfY29uZmlybWVkJywge1xyXG4gICAgICAgIG9wZXJhdGlvbjogJ3ZlcmlmeUVtYWlsJyxcclxuICAgICAgICBlbWFpbCxcclxuICAgICAgICBzdGVwOiAnY29nbml0b19jb25maXJtYXRpb24nXHJcbiAgICAgIH0sIHRydWUsIHsgY29ycmVsYXRpb25JZCB9KTtcclxuXHJcbiAgICAgIC8vIEF1dG9tYXRpY2FsbHkgc2V0IHVwIE9UUCBhZnRlciBlbWFpbCB2ZXJpZmljYXRpb25cclxuICAgICAgY29uc3Qgb3RwU2V0dXAgPSBhd2FpdCB0aGlzLnNldHVwT1RQRm9yVXNlcihlbWFpbCk7XHJcblxyXG4gICAgICB0aGlzLmxvZ2dlci5pbmZvKCdFbWFpbCB2ZXJpZmllZCBhbmQgT1RQIHNldHVwIGNvbXBsZXRlZCcsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGVtYWlsLFxyXG4gICAgICAgIGhhc09UUFNlY3JldDogISFvdHBTZXR1cC5zZWNyZXRcclxuICAgICAgfSk7XHJcblxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgbWVzc2FnZTogJ0VtYWlsIHZlcmlmaWVkIHN1Y2Nlc3NmdWxseS4gT1RQIGhhcyBiZWVuIGF1dG9tYXRpY2FsbHkgY29uZmlndXJlZC4nLFxyXG4gICAgICAgIHJlcXVpcmVzT1RQOiB0cnVlLFxyXG4gICAgICAgIG90cFNlY3JldDogb3RwU2V0dXAuc2VjcmV0LFxyXG4gICAgICAgIGJhY2t1cENvZGVzOiBvdHBTZXR1cC5iYWNrdXBDb2Rlc1xyXG4gICAgICB9O1xyXG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcignRW1haWwgdmVyaWZpY2F0aW9uIGZhaWxlZCcsIGVycm9yLCB7XHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICBlbWFpbCxcclxuICAgICAgICBlcnJvck5hbWU6IGVycm9yLm5hbWVcclxuICAgICAgfSk7XHJcbiAgICAgIFxyXG4gICAgICBpZiAoZXJyb3IubmFtZSA9PT0gJ0NvZGVNaXNtYXRjaEV4Y2VwdGlvbicpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgICAgICBtZXNzYWdlOiAnSW52YWxpZCB2ZXJpZmljYXRpb24gY29kZS4gUGxlYXNlIGNoZWNrIGFuZCB0cnkgYWdhaW4uJ1xyXG4gICAgICAgIH07XHJcbiAgICAgIH0gZWxzZSBpZiAoZXJyb3IubmFtZSA9PT0gJ0V4cGlyZWRDb2RlRXhjZXB0aW9uJykge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgIG1lc3NhZ2U6ICdWZXJpZmljYXRpb24gY29kZSBoYXMgZXhwaXJlZC4gUGxlYXNlIHJlcXVlc3QgYSBuZXcgb25lLidcclxuICAgICAgICB9O1xyXG4gICAgICB9IGVsc2UgaWYgKGVycm9yLm5hbWUgPT09ICdOb3RBdXRob3JpemVkRXhjZXB0aW9uJykge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgIG1lc3NhZ2U6ICdVc2VyIGlzIGFscmVhZHkgdmVyaWZpZWQgb3IgdmVyaWZpY2F0aW9uIGZhaWxlZC4nXHJcbiAgICAgICAgfTtcclxuICAgICAgfVxyXG5cclxuICAgICAgdGhpcy5lcnJvckhhbmRsZXIuaGFuZGxlRXJyb3IoZXJyb3IsIHtcclxuICAgICAgICBvcGVyYXRpb246ICd2ZXJpZnlFbWFpbCcsXHJcbiAgICAgICAgZW1haWwsXHJcbiAgICAgICAgc3RlcDogJ2VtYWlsX3ZlcmlmaWNhdGlvbidcclxuICAgICAgfSk7XHJcblxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgIG1lc3NhZ2U6ICdFbWFpbCB2ZXJpZmljYXRpb24gZmFpbGVkLiBQbGVhc2UgdHJ5IGFnYWluLidcclxuICAgICAgfTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEVuaGFuY2VkIHZlcmlmaWNhdGlvbiB3aXRoIE9UUCBzZXR1cFxyXG4gICAqL1xyXG4gIGFzeW5jIHZlcmlmeUVtYWlsV2l0aE9UUFNldHVwKGVtYWlsOiBzdHJpbmcsIGNvZGU6IHN0cmluZyk6IFByb21pc2U8VmVyaWZpY2F0aW9uV2l0aE9UUFJlc3VsdD4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gRmlyc3QgdmVyaWZ5IHRoZSBlbWFpbFxyXG4gICAgICBjb25zdCB2ZXJpZmljYXRpb25SZXN1bHQgPSBhd2FpdCB0aGlzLnZlcmlmeUVtYWlsKGVtYWlsLCBjb2RlKTtcclxuICAgICAgXHJcbiAgICAgIGlmICghdmVyaWZpY2F0aW9uUmVzdWx0LnN1Y2Nlc3MpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IodmVyaWZpY2F0aW9uUmVzdWx0Lm1lc3NhZ2UpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBHZW5lcmF0ZSBPVFAgc2V0dXAgZGF0YVxyXG4gICAgICBjb25zdCBvdHBTZXR1cDogT1RQU2V0dXBEYXRhID0ge1xyXG4gICAgICAgIHNlY3JldDogdmVyaWZpY2F0aW9uUmVzdWx0Lm90cFNlY3JldCEsXHJcbiAgICAgICAgcXJDb2RlVXJsOiB0aGlzLmdlbmVyYXRlUVJDb2RlVXJsKGVtYWlsLCB2ZXJpZmljYXRpb25SZXN1bHQub3RwU2VjcmV0ISksXHJcbiAgICAgICAgYmFja3VwQ29kZXM6IHZlcmlmaWNhdGlvblJlc3VsdC5iYWNrdXBDb2RlcyEsXHJcbiAgICAgICAgaXNzdWVyOiAnTUlTUkEgUGxhdGZvcm0nLFxyXG4gICAgICAgIGFjY291bnROYW1lOiBlbWFpbFxyXG4gICAgICB9O1xyXG5cclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgIG1lc3NhZ2U6ICdFbWFpbCB2ZXJpZmllZCBzdWNjZXNzZnVsbHkuIE9UUCBzZXR1cCBpcyByZWFkeS4nLFxyXG4gICAgICAgIHJlcXVpcmVzT1RQOiB0cnVlLFxyXG4gICAgICAgIG90cFNlY3JldDogdmVyaWZpY2F0aW9uUmVzdWx0Lm90cFNlY3JldCxcclxuICAgICAgICBiYWNrdXBDb2RlczogdmVyaWZpY2F0aW9uUmVzdWx0LmJhY2t1cENvZGVzLFxyXG4gICAgICAgIG90cFNldHVwLFxyXG4gICAgICAgIG5leHRTdGVwOiBBdXRoZW50aWNhdGlvblN0YXRlLk9UUF9TRVRVUF9SRVFVSVJFRFxyXG4gICAgICB9O1xyXG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEVNQUlMX1ZFUklGSUNBVElPTl9XSVRIX09UUF9GQUlMRUQ6ICR7ZXJyb3IubWVzc2FnZX1gKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCB2ZXJpZmljYXRpb24gc3RhdGVcclxuICAgKi9cclxuICBhc3luYyBnZXRWZXJpZmljYXRpb25TdGF0ZShlbWFpbDogc3RyaW5nKTogUHJvbWlzZTxWZXJpZmljYXRpb25TdGF0ZT4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgdXNlclJlc3BvbnNlID0gYXdhaXQgdGhpcy5jb2duaXRvQ2xpZW50LnNlbmQobmV3IEFkbWluR2V0VXNlckNvbW1hbmQoe1xyXG4gICAgICAgIFVzZXJQb29sSWQ6IHRoaXMudXNlclBvb2xJZCxcclxuICAgICAgICBVc2VybmFtZTogZW1haWxcclxuICAgICAgfSkpO1xyXG5cclxuICAgICAgY29uc3QgaXNWZXJpZmllZCA9IHVzZXJSZXNwb25zZS5Vc2VyU3RhdHVzID09PSAnQ09ORklSTUVEJztcclxuICAgICAgXHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgaXNWZXJpZmllZCxcclxuICAgICAgICByZXF1aXJlc1ZlcmlmaWNhdGlvbjogIWlzVmVyaWZpZWQsXHJcbiAgICAgICAgY2FuUmVzZW5kOiAhaXNWZXJpZmllZCwgLy8gQ2FuIHJlc2VuZCBpZiBub3QgdmVyaWZpZWRcclxuICAgICAgICBsYXN0U2VudEF0OiB1bmRlZmluZWQgLy8gV291bGQgbmVlZCB0byB0cmFjayB0aGlzIHNlcGFyYXRlbHkgaWYgbmVlZGVkXHJcbiAgICAgIH07XHJcbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgIGlmIChlcnJvci5uYW1lID09PSAnVXNlck5vdEZvdW5kRXhjZXB0aW9uJykge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBpc1ZlcmlmaWVkOiBmYWxzZSxcclxuICAgICAgICAgIHJlcXVpcmVzVmVyaWZpY2F0aW9uOiB0cnVlLFxyXG4gICAgICAgICAgY2FuUmVzZW5kOiBmYWxzZSAvLyBDYW4ndCByZXNlbmQgZm9yIG5vbi1leGlzdGVudCB1c2VyXHJcbiAgICAgICAgfTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBWRVJJRklDQVRJT05fU1RBVEVfRVJST1I6ICR7ZXJyb3IubWVzc2FnZX1gKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFJlc2VuZCB2ZXJpZmljYXRpb24gY29kZVxyXG4gICAqL1xyXG4gIGFzeW5jIHJlc2VuZFZlcmlmaWNhdGlvbkNvZGUoZW1haWw6IHN0cmluZyk6IFByb21pc2U8eyBzdWNjZXNzOiBib29sZWFuOyBtZXNzYWdlOiBzdHJpbmcgfT4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgYXdhaXQgdGhpcy5jb2duaXRvQ2xpZW50LnNlbmQobmV3IFJlc2VuZENvbmZpcm1hdGlvbkNvZGVDb21tYW5kKHtcclxuICAgICAgICBDbGllbnRJZDogcHJvY2Vzcy5lbnYuQ09HTklUT19VU0VSX1BPT0xfQ0xJRU5UX0lEISxcclxuICAgICAgICBVc2VybmFtZTogZW1haWxcclxuICAgICAgfSkpO1xyXG5cclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgIG1lc3NhZ2U6ICdWZXJpZmljYXRpb24gY29kZSBzZW50IHRvIHlvdXIgZW1haWwgYWRkcmVzcy4nXHJcbiAgICAgIH07XHJcbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1Jlc2VuZCB2ZXJpZmljYXRpb24gY29kZSBmYWlsZWQ6JywgZXJyb3IpO1xyXG4gICAgICBcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICBtZXNzYWdlOiAnRmFpbGVkIHRvIHJlc2VuZCB2ZXJpZmljYXRpb24gY29kZS4gUGxlYXNlIHRyeSBhZ2Fpbi4nXHJcbiAgICAgIH07XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBBdXRvbWF0aWNhbGx5IHNldCB1cCBPVFAgZm9yIHZlcmlmaWVkIHVzZXJcclxuICAgKi9cclxuICBwcml2YXRlIGFzeW5jIHNldHVwT1RQRm9yVXNlcihlbWFpbDogc3RyaW5nKTogUHJvbWlzZTxPVFBTZXR1cFJlc3VsdD4ge1xyXG4gICAgLy8gR2VuZXJhdGUgT1RQIHNlY3JldFxyXG4gICAgY29uc3Qgc2VjcmV0ID0gdGhpcy5nZW5lcmF0ZU9UUFNlY3JldCgpO1xyXG4gICAgXHJcbiAgICAvLyBHZW5lcmF0ZSBiYWNrdXAgY29kZXNcclxuICAgIGNvbnN0IGJhY2t1cENvZGVzID0gdGhpcy5nZW5lcmF0ZUJhY2t1cENvZGVzKCk7XHJcblxyXG4gICAgLy8gU3RvcmUgT1RQIHNlY3JldCBhbmQgYmFja3VwIGNvZGVzIGluIHVzZXIgYXR0cmlidXRlc1xyXG4gICAgYXdhaXQgdGhpcy5jb2duaXRvQ2xpZW50LnNlbmQobmV3IEFkbWluVXBkYXRlVXNlckF0dHJpYnV0ZXNDb21tYW5kKHtcclxuICAgICAgVXNlclBvb2xJZDogdGhpcy51c2VyUG9vbElkLFxyXG4gICAgICBVc2VybmFtZTogZW1haWwsXHJcbiAgICAgIFVzZXJBdHRyaWJ1dGVzOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgTmFtZTogJ2N1c3RvbTpvdHBfc2VjcmV0JyxcclxuICAgICAgICAgIFZhbHVlOiBzZWNyZXRcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIE5hbWU6ICdjdXN0b206YmFja3VwX2NvZGVzJyxcclxuICAgICAgICAgIFZhbHVlOiBKU09OLnN0cmluZ2lmeShiYWNrdXBDb2RlcylcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIE5hbWU6ICdjdXN0b206b3RwX2VuYWJsZWQnLFxyXG4gICAgICAgICAgVmFsdWU6ICd0cnVlJ1xyXG4gICAgICAgIH1cclxuICAgICAgXVxyXG4gICAgfSkpO1xyXG5cclxuICAgIC8vIEdlbmVyYXRlIFFSIGNvZGUgVVJMIGZvciBhdXRoZW50aWNhdG9yIGFwcHNcclxuICAgIGNvbnN0IHFyQ29kZVVybCA9IHRoaXMuZ2VuZXJhdGVRUkNvZGVVcmwoZW1haWwsIHNlY3JldCk7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc2VjcmV0LFxyXG4gICAgICBxckNvZGVVcmwsXHJcbiAgICAgIGJhY2t1cENvZGVzXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2VuZXJhdGUgT1RQIHNlY3JldCAoMzIgY2hhcmFjdGVycywgYmFzZTMyKVxyXG4gICAqL1xyXG4gIHByaXZhdGUgZ2VuZXJhdGVPVFBTZWNyZXQoKTogc3RyaW5nIHtcclxuICAgIGNvbnN0IGJ1ZmZlciA9IGNyeXB0by5yYW5kb21CeXRlcygyMCk7XHJcbiAgICByZXR1cm4gYnVmZmVyLnRvU3RyaW5nKCdiYXNlNjQnKVxyXG4gICAgICAucmVwbGFjZSgvXFwrL2csICcnKVxyXG4gICAgICAucmVwbGFjZSgvXFwvL2csICcnKVxyXG4gICAgICAucmVwbGFjZSgvPS9nLCAnJylcclxuICAgICAgLnN1YnN0cmluZygwLCAzMilcclxuICAgICAgLnRvVXBwZXJDYXNlKCk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZW5lcmF0ZSBiYWNrdXAgY29kZXNcclxuICAgKi9cclxuICBwcml2YXRlIGdlbmVyYXRlQmFja3VwQ29kZXMoKTogc3RyaW5nW10ge1xyXG4gICAgY29uc3QgY29kZXM6IHN0cmluZ1tdID0gW107XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDEwOyBpKyspIHtcclxuICAgICAgY29uc3QgY29kZSA9IGNyeXB0by5yYW5kb21CeXRlcyg0KS50b1N0cmluZygnaGV4JykudG9VcHBlckNhc2UoKTtcclxuICAgICAgY29kZXMucHVzaChgJHtjb2RlLnN1YnN0cmluZygwLCA0KX0tJHtjb2RlLnN1YnN0cmluZyg0LCA4KX1gKTtcclxuICAgIH1cclxuICAgIHJldHVybiBjb2RlcztcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdlbmVyYXRlIFFSIGNvZGUgVVJMIGZvciBhdXRoZW50aWNhdG9yIGFwcHNcclxuICAgKi9cclxuICBwcml2YXRlIGdlbmVyYXRlUVJDb2RlVXJsKGVtYWlsOiBzdHJpbmcsIHNlY3JldDogc3RyaW5nKTogc3RyaW5nIHtcclxuICAgIGNvbnN0IGlzc3VlciA9ICdNSVNSQSBQbGF0Zm9ybSc7XHJcbiAgICBjb25zdCBsYWJlbCA9IGAke2lzc3Vlcn06JHtlbWFpbH1gO1xyXG4gICAgY29uc3Qgb3RwQXV0aFVybCA9IGBvdHBhdXRoOi8vdG90cC8ke2VuY29kZVVSSUNvbXBvbmVudChsYWJlbCl9P3NlY3JldD0ke3NlY3JldH0maXNzdWVyPSR7ZW5jb2RlVVJJQ29tcG9uZW50KGlzc3Vlcil9YDtcclxuICAgIFxyXG4gICAgLy8gUmV0dXJuIEdvb2dsZSBDaGFydHMgUVIgY29kZSBVUkxcclxuICAgIHJldHVybiBgaHR0cHM6Ly9jaGFydC5nb29nbGVhcGlzLmNvbS9jaGFydD9jaHM9MjAweDIwMCZjaGxkPU18MCZjaHQ9cXImY2hsPSR7ZW5jb2RlVVJJQ29tcG9uZW50KG90cEF1dGhVcmwpfWA7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBWZXJpZnkgT1RQIGNvZGVcclxuICAgKi9cclxuICBhc3luYyB2ZXJpZnlPVFAoZW1haWw6IHN0cmluZywgb3RwQ29kZTogc3RyaW5nKTogUHJvbWlzZTx7IHN1Y2Nlc3M6IGJvb2xlYW47IG1lc3NhZ2U6IHN0cmluZyB9PiB7XHJcbiAgICBjb25zdCBjb3JyZWxhdGlvbklkID0gdXVpZHY0KCk7XHJcbiAgICBcclxuICAgIHRoaXMubG9nZ2VyLmluZm8oJ1ZlcmlmeWluZyBPVFAnLCB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIGVtYWlsXHJcbiAgICB9KTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICAvLyBHZXQgdXNlcidzIE9UUCBzZWNyZXRcclxuICAgICAgY29uc3QgdXNlclJlc3BvbnNlID0gYXdhaXQgdGhpcy5jb2duaXRvQ2xpZW50LnNlbmQobmV3IEFkbWluR2V0VXNlckNvbW1hbmQoe1xyXG4gICAgICAgIFVzZXJQb29sSWQ6IHRoaXMudXNlclBvb2xJZCxcclxuICAgICAgICBVc2VybmFtZTogZW1haWxcclxuICAgICAgfSkpO1xyXG5cclxuICAgICAgY29uc3Qgb3RwU2VjcmV0QXR0ciA9IHVzZXJSZXNwb25zZS5Vc2VyQXR0cmlidXRlcz8uZmluZChhdHRyID0+IGF0dHIuTmFtZSA9PT0gJ2N1c3RvbTpvdHBfc2VjcmV0Jyk7XHJcbiAgICAgIGNvbnN0IGJhY2t1cENvZGVzQXR0ciA9IHVzZXJSZXNwb25zZS5Vc2VyQXR0cmlidXRlcz8uZmluZChhdHRyID0+IGF0dHIuTmFtZSA9PT0gJ2N1c3RvbTpiYWNrdXBfY29kZXMnKTtcclxuXHJcbiAgICAgIGlmICghb3RwU2VjcmV0QXR0cj8uVmFsdWUpIHtcclxuICAgICAgICB0aGlzLmxvZ2dlci53YXJuKCdPVFAgbm90IGNvbmZpZ3VyZWQgZm9yIHVzZXInLCB7XHJcbiAgICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgICAgZW1haWxcclxuICAgICAgICB9KTtcclxuICAgICAgICBcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgICAgICBtZXNzYWdlOiAnT1RQIG5vdCBjb25maWd1cmVkIGZvciB0aGlzIHVzZXIuJ1xyXG4gICAgICAgIH07XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIENoZWNrIGlmIGl0J3MgYSBiYWNrdXAgY29kZVxyXG4gICAgICBpZiAoYmFja3VwQ29kZXNBdHRyPy5WYWx1ZSkge1xyXG4gICAgICAgIGNvbnN0IGJhY2t1cENvZGVzID0gSlNPTi5wYXJzZShiYWNrdXBDb2Rlc0F0dHIuVmFsdWUpO1xyXG4gICAgICAgIGlmIChiYWNrdXBDb2Rlcy5pbmNsdWRlcyhvdHBDb2RlLnRvVXBwZXJDYXNlKCkpKSB7XHJcbiAgICAgICAgICAvLyBSZW1vdmUgdXNlZCBiYWNrdXAgY29kZVxyXG4gICAgICAgICAgY29uc3QgdXBkYXRlZENvZGVzID0gYmFja3VwQ29kZXMuZmlsdGVyKChjb2RlOiBzdHJpbmcpID0+IGNvZGUgIT09IG90cENvZGUudG9VcHBlckNhc2UoKSk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIGF3YWl0IHRoaXMuY29nbml0b0NsaWVudC5zZW5kKG5ldyBBZG1pblVwZGF0ZVVzZXJBdHRyaWJ1dGVzQ29tbWFuZCh7XHJcbiAgICAgICAgICAgIFVzZXJQb29sSWQ6IHRoaXMudXNlclBvb2xJZCxcclxuICAgICAgICAgICAgVXNlcm5hbWU6IGVtYWlsLFxyXG4gICAgICAgICAgICBVc2VyQXR0cmlidXRlczogW1xyXG4gICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIE5hbWU6ICdjdXN0b206YmFja3VwX2NvZGVzJyxcclxuICAgICAgICAgICAgICAgIFZhbHVlOiBKU09OLnN0cmluZ2lmeSh1cGRhdGVkQ29kZXMpXHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBdXHJcbiAgICAgICAgICB9KSk7XHJcblxyXG4gICAgICAgICAgdGhpcy5lcnJvckhhbmRsZXIubG9nQXV0aEV2ZW50KCdiYWNrdXBfY29kZV91c2VkJywge1xyXG4gICAgICAgICAgICBvcGVyYXRpb246ICd2ZXJpZnlPVFAnLFxyXG4gICAgICAgICAgICBlbWFpbCxcclxuICAgICAgICAgICAgc3RlcDogJ2JhY2t1cF9jb2RlX3ZlcmlmaWNhdGlvbidcclxuICAgICAgICAgIH0sIHRydWUsIHsgY29ycmVsYXRpb25JZCwgcmVtYWluaW5nQ29kZXM6IHVwZGF0ZWRDb2Rlcy5sZW5ndGggfSk7XHJcblxyXG4gICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgbWVzc2FnZTogJ0JhY2t1cCBjb2RlIHZlcmlmaWVkIHN1Y2Nlc3NmdWxseS4nXHJcbiAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gVmVyaWZ5IFRPVFAgY29kZVxyXG4gICAgICBjb25zdCBpc1ZhbGlkT1RQID0gdGhpcy52ZXJpZnlUT1RQKG90cFNlY3JldEF0dHIuVmFsdWUsIG90cENvZGUpO1xyXG4gICAgICBcclxuICAgICAgaWYgKGlzVmFsaWRPVFApIHtcclxuICAgICAgICB0aGlzLmVycm9ySGFuZGxlci5sb2dBdXRoRXZlbnQoJ290cF9jb2RlX3ZlcmlmaWVkJywge1xyXG4gICAgICAgICAgb3BlcmF0aW9uOiAndmVyaWZ5T1RQJyxcclxuICAgICAgICAgIGVtYWlsLFxyXG4gICAgICAgICAgc3RlcDogJ3RvdHBfdmVyaWZpY2F0aW9uJ1xyXG4gICAgICAgIH0sIHRydWUsIHsgY29ycmVsYXRpb25JZCB9KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICBtZXNzYWdlOiAnT1RQIHZlcmlmaWVkIHN1Y2Nlc3NmdWxseS4nXHJcbiAgICAgICAgfTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB0aGlzLmxvZ2dlci53YXJuKCdJbnZhbGlkIE9UUCBjb2RlIHByb3ZpZGVkJywge1xyXG4gICAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICAgIGVtYWlsXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgIG1lc3NhZ2U6ICdJbnZhbGlkIE9UUCBjb2RlLiBQbGVhc2UgdHJ5IGFnYWluLidcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdPVFAgdmVyaWZpY2F0aW9uIGZhaWxlZCcsIGVycm9yLCB7XHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICBlbWFpbFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIHRoaXMuZXJyb3JIYW5kbGVyLmhhbmRsZUVycm9yKGVycm9yLCB7XHJcbiAgICAgICAgb3BlcmF0aW9uOiAndmVyaWZ5T1RQJyxcclxuICAgICAgICBlbWFpbCxcclxuICAgICAgICBzdGVwOiAnb3RwX3ZlcmlmaWNhdGlvbidcclxuICAgICAgfSk7XHJcblxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgIG1lc3NhZ2U6ICdPVFAgdmVyaWZpY2F0aW9uIGZhaWxlZC4gUGxlYXNlIHRyeSBhZ2Fpbi4nXHJcbiAgICAgIH07XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBWZXJpZnkgVE9UUCBjb2RlIHVzaW5nIHRpbWUtYmFzZWQgYWxnb3JpdGhtXHJcbiAgICovXHJcbiAgcHJpdmF0ZSB2ZXJpZnlUT1RQKHNlY3JldDogc3RyaW5nLCB0b2tlbjogc3RyaW5nLCB3aW5kb3c6IG51bWJlciA9IDEpOiBib29sZWFuIHtcclxuICAgIGNvbnN0IHRpbWVTdGVwID0gMzA7IC8vIDMwIHNlY29uZHNcclxuICAgIGNvbnN0IGN1cnJlbnRUaW1lID0gTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMCAvIHRpbWVTdGVwKTtcclxuXHJcbiAgICAvLyBDaGVjayBjdXJyZW50IHRpbWUgYW5kIMKxd2luZG93IHRpbWUgc3RlcHNcclxuICAgIGZvciAobGV0IGkgPSAtd2luZG93OyBpIDw9IHdpbmRvdzsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IHRpbWUgPSBjdXJyZW50VGltZSArIGk7XHJcbiAgICAgIGNvbnN0IGV4cGVjdGVkVG9rZW4gPSB0aGlzLmdlbmVyYXRlVE9UUChzZWNyZXQsIHRpbWUpO1xyXG4gICAgICBpZiAoZXhwZWN0ZWRUb2tlbiA9PT0gdG9rZW4pIHtcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdlbmVyYXRlIFRPVFAgY29kZVxyXG4gICAqL1xyXG4gIHByaXZhdGUgZ2VuZXJhdGVUT1RQKHNlY3JldDogc3RyaW5nLCB0aW1lOiBudW1iZXIpOiBzdHJpbmcge1xyXG4gICAgY29uc3QgYnVmZmVyID0gQnVmZmVyLmFsbG9jKDgpO1xyXG4gICAgYnVmZmVyLndyaXRlVUludDMyQkUoMCwgMCk7XHJcbiAgICBidWZmZXIud3JpdGVVSW50MzJCRSh0aW1lLCA0KTtcclxuXHJcbiAgICBjb25zdCBrZXkgPSBCdWZmZXIuZnJvbShzZWNyZXQsICdiYXNlNjQnKTtcclxuICAgIGNvbnN0IGhtYWMgPSBjcnlwdG8uY3JlYXRlSG1hYygnc2hhMScsIGtleSk7XHJcbiAgICBobWFjLnVwZGF0ZShidWZmZXIpO1xyXG4gICAgY29uc3QgZGlnZXN0ID0gaG1hYy5kaWdlc3QoKTtcclxuXHJcbiAgICBjb25zdCBvZmZzZXQgPSBkaWdlc3RbZGlnZXN0Lmxlbmd0aCAtIDFdICYgMHgwZjtcclxuICAgIGNvbnN0IGNvZGUgPSAoKGRpZ2VzdFtvZmZzZXRdICYgMHg3ZikgPDwgMjQpIHxcclxuICAgICAgICAgICAgICAgICAoKGRpZ2VzdFtvZmZzZXQgKyAxXSAmIDB4ZmYpIDw8IDE2KSB8XHJcbiAgICAgICAgICAgICAgICAgKChkaWdlc3Rbb2Zmc2V0ICsgMl0gJiAweGZmKSA8PCA4KSB8XHJcbiAgICAgICAgICAgICAgICAgKGRpZ2VzdFtvZmZzZXQgKyAzXSAmIDB4ZmYpO1xyXG5cclxuICAgIHJldHVybiAoY29kZSAlIDEwMDAwMDApLnRvU3RyaW5nKCkucGFkU3RhcnQoNiwgJzAnKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENoZWNrIGlmIHVzZXIgaGFzIE9UUCBlbmFibGVkXHJcbiAgICovXHJcbiAgYXN5bmMgaXNPVFBFbmFibGVkKGVtYWlsOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHVzZXJSZXNwb25zZSA9IGF3YWl0IHRoaXMuY29nbml0b0NsaWVudC5zZW5kKG5ldyBBZG1pbkdldFVzZXJDb21tYW5kKHtcclxuICAgICAgICBVc2VyUG9vbElkOiB0aGlzLnVzZXJQb29sSWQsXHJcbiAgICAgICAgVXNlcm5hbWU6IGVtYWlsXHJcbiAgICAgIH0pKTtcclxuXHJcbiAgICAgIGNvbnN0IG90cEVuYWJsZWRBdHRyID0gdXNlclJlc3BvbnNlLlVzZXJBdHRyaWJ1dGVzPy5maW5kKGF0dHIgPT4gYXR0ci5OYW1lID09PSAnY3VzdG9tOm90cF9lbmFibGVkJyk7XHJcbiAgICAgIHJldHVybiBvdHBFbmFibGVkQXR0cj8uVmFsdWUgPT09ICd0cnVlJztcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENoZWNrIGlmIHVzZXIgaXMgdmVyaWZpZWRcclxuICAgKi9cclxuICBhc3luYyBpc0VtYWlsVmVyaWZpZWQoZW1haWw6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgdXNlclJlc3BvbnNlID0gYXdhaXQgdGhpcy5jb2duaXRvQ2xpZW50LnNlbmQobmV3IEFkbWluR2V0VXNlckNvbW1hbmQoe1xyXG4gICAgICAgIFVzZXJQb29sSWQ6IHRoaXMudXNlclBvb2xJZCxcclxuICAgICAgICBVc2VybmFtZTogZW1haWxcclxuICAgICAgfSkpO1xyXG5cclxuICAgICAgcmV0dXJuIHVzZXJSZXNwb25zZS5Vc2VyU3RhdHVzID09PSAnQ09ORklSTUVEJztcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICB9XHJcbn0iXX0=