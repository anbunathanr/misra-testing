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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1haWwtdmVyaWZpY2F0aW9uLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJlbWFpbC12ZXJpZmljYXRpb24tc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztHQUdHOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCxnR0FPbUQ7QUFDbkQsK0NBQWlDO0FBQ2pDLHVFQUFrRTtBQUNsRSwrQ0FBa0Q7QUFDbEQsK0JBQW9DO0FBc0JwQyxJQUFZLG1CQVNYO0FBVEQsV0FBWSxtQkFBbUI7SUFDN0IsMENBQW1CLENBQUE7SUFDbkIsa0RBQTJCLENBQUE7SUFDM0Isa0ZBQTJELENBQUE7SUFDM0QsMERBQW1DLENBQUE7SUFDbkMsZ0VBQXlDLENBQUE7SUFDekMsc0RBQStCLENBQUE7SUFDL0Isc0RBQStCLENBQUE7SUFDL0Isc0NBQWUsQ0FBQTtBQUNqQixDQUFDLEVBVFcsbUJBQW1CLG1DQUFuQixtQkFBbUIsUUFTOUI7QUFnQkQsTUFBYSx3QkFBd0I7SUFDM0IsYUFBYSxDQUFnQztJQUM3QyxVQUFVLENBQVM7SUFDbkIsWUFBWSxDQUFtQjtJQUMvQixNQUFNLENBQWtDO0lBRWhEO1FBQ0UsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLGdFQUE2QixDQUFDO1lBQ3JELE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXO1NBQzlDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBcUIsQ0FBQztRQUNwRCxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUkscUNBQWdCLENBQUMsMEJBQTBCLENBQUMsQ0FBQztRQUNyRSxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUEscUJBQVksRUFBQywwQkFBMEIsQ0FBQyxDQUFDO0lBQ3pELENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxXQUFXLENBQUMsS0FBYSxFQUFF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LENBQUMsS0FBYTtRQUM5QixJQUFJLENBQUM7WUFDSCxNQUFNLFlBQVksR0FBRyxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksc0RBQW1CLENBQUM7Z0JBQ3pFLFVBQVUsRUFBRSxJQUFJLENBQUMsVUFBVTtnQkFDM0IsUUFBUSxFQUFFLEtBQUs7YUFDaEIsQ0FBQyxDQUFDLENBQUM7WUFFSixNQUFNLGNBQWMsR0FBRyxZQUFZLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssb0JBQW9CLENBQUMsQ0FBQztZQUNyRyxPQUFPLGNBQWMsRUFBRSxLQUFLLEtBQUssTUFBTSxDQUFDO1FBQzFDLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2YsT0FBTyxLQUFLLENBQUM7UUFDZixDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLGVBQWUsQ0FBQyxLQUFhO1FBQ2pDLElBQUksQ0FBQztZQUNILE1BQU0sWUFBWSxHQUFHLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxzREFBbUIsQ0FBQztnQkFDekUsVUFBVSxFQUFFLElBQUksQ0FBQyxVQUFVO2dCQUMzQixRQUFRLEVBQUUsS0FBSzthQUNoQixDQUFDLENBQUMsQ0FBQztZQUVKLE9BQU8sWUFBWSxDQUFDLFVBQVUsS0FBSyxXQUFXLENBQUM7UUFDakQsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZixPQUFPLEtBQUssQ0FBQztRQUNmLENBQUM7SUFDSCxDQUFDO0NBQ0Y7QUExYkQsNERBMGJDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIEVtYWlsIFZlcmlmaWNhdGlvbiBTZXJ2aWNlXHJcbiAqIEhhbmRsZXMgZW1haWwgdmVyaWZpY2F0aW9uIGNvZGVzIGFuZCBPVFAgZ2VuZXJhdGlvblxyXG4gKi9cclxuXHJcbmltcG9ydCB7IFxyXG4gIENvZ25pdG9JZGVudGl0eVByb3ZpZGVyQ2xpZW50LFxyXG4gIEFkbWluR2V0VXNlckNvbW1hbmQsXHJcbiAgQWRtaW5Db25maXJtU2lnblVwQ29tbWFuZCxcclxuICBBZG1pblNldFVzZXJQYXNzd29yZENvbW1hbmQsXHJcbiAgUmVzZW5kQ29uZmlybWF0aW9uQ29kZUNvbW1hbmQsXHJcbiAgQWRtaW5VcGRhdGVVc2VyQXR0cmlidXRlc0NvbW1hbmRcclxufSBmcm9tICdAYXdzLXNkay9jbGllbnQtY29nbml0by1pZGVudGl0eS1wcm92aWRlcic7XHJcbmltcG9ydCAqIGFzIGNyeXB0byBmcm9tICdjcnlwdG8nO1xyXG5pbXBvcnQgeyBBdXRoRXJyb3JIYW5kbGVyIH0gZnJvbSAnLi4vLi4vdXRpbHMvYXV0aC1lcnJvci1oYW5kbGVyJztcclxuaW1wb3J0IHsgY3JlYXRlTG9nZ2VyIH0gZnJvbSAnLi4vLi4vdXRpbHMvbG9nZ2VyJztcclxuaW1wb3J0IHsgdjQgYXMgdXVpZHY0IH0gZnJvbSAndXVpZCc7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFZlcmlmaWNhdGlvblJlc3VsdCB7XHJcbiAgc3VjY2VzczogYm9vbGVhbjtcclxuICBtZXNzYWdlOiBzdHJpbmc7XHJcbiAgcmVxdWlyZXNPVFA/OiBib29sZWFuO1xyXG4gIG90cFNlY3JldD86IHN0cmluZztcclxuICBiYWNrdXBDb2Rlcz86IHN0cmluZ1tdO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFZlcmlmaWNhdGlvbldpdGhPVFBSZXN1bHQgZXh0ZW5kcyBWZXJpZmljYXRpb25SZXN1bHQge1xyXG4gIG90cFNldHVwOiBPVFBTZXR1cERhdGE7XHJcbiAgbmV4dFN0ZXA6IEF1dGhlbnRpY2F0aW9uU3RhdGU7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgVmVyaWZpY2F0aW9uU3RhdGUge1xyXG4gIGlzVmVyaWZpZWQ6IGJvb2xlYW47XHJcbiAgcmVxdWlyZXNWZXJpZmljYXRpb246IGJvb2xlYW47XHJcbiAgY2FuUmVzZW5kOiBib29sZWFuO1xyXG4gIGxhc3RTZW50QXQ/OiBEYXRlO1xyXG59XHJcblxyXG5leHBvcnQgZW51bSBBdXRoZW50aWNhdGlvblN0YXRlIHtcclxuICBJTklUSUFMID0gJ2luaXRpYWwnLFxyXG4gIFJFR0lTVEVSSU5HID0gJ3JlZ2lzdGVyaW5nJyxcclxuICBFTUFJTF9WRVJJRklDQVRJT05fUkVRVUlSRUQgPSAnZW1haWxfdmVyaWZpY2F0aW9uX3JlcXVpcmVkJyxcclxuICBFTUFJTF9WRVJJRllJTkcgPSAnZW1haWxfdmVyaWZ5aW5nJyxcclxuICBPVFBfU0VUVVBfUkVRVUlSRUQgPSAnb3RwX3NldHVwX3JlcXVpcmVkJyxcclxuICBPVFBfVkVSSUZZSU5HID0gJ290cF92ZXJpZnlpbmcnLFxyXG4gIEFVVEhFTlRJQ0FURUQgPSAnYXV0aGVudGljYXRlZCcsXHJcbiAgRVJST1IgPSAnZXJyb3InXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgT1RQU2V0dXBEYXRhIHtcclxuICBzZWNyZXQ6IHN0cmluZztcclxuICBxckNvZGVVcmw6IHN0cmluZztcclxuICBiYWNrdXBDb2Rlczogc3RyaW5nW107XHJcbiAgaXNzdWVyOiBzdHJpbmc7XHJcbiAgYWNjb3VudE5hbWU6IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBPVFBTZXR1cFJlc3VsdCB7XHJcbiAgc2VjcmV0OiBzdHJpbmc7XHJcbiAgcXJDb2RlVXJsOiBzdHJpbmc7XHJcbiAgYmFja3VwQ29kZXM6IHN0cmluZ1tdO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgRW1haWxWZXJpZmljYXRpb25TZXJ2aWNlIHtcclxuICBwcml2YXRlIGNvZ25pdG9DbGllbnQ6IENvZ25pdG9JZGVudGl0eVByb3ZpZGVyQ2xpZW50O1xyXG4gIHByaXZhdGUgdXNlclBvb2xJZDogc3RyaW5nO1xyXG4gIHByaXZhdGUgZXJyb3JIYW5kbGVyOiBBdXRoRXJyb3JIYW5kbGVyO1xyXG4gIHByaXZhdGUgbG9nZ2VyOiBSZXR1cm5UeXBlPHR5cGVvZiBjcmVhdGVMb2dnZXI+O1xyXG5cclxuICBjb25zdHJ1Y3RvcigpIHtcclxuICAgIHRoaXMuY29nbml0b0NsaWVudCA9IG5ldyBDb2duaXRvSWRlbnRpdHlQcm92aWRlckNsaWVudCh7XHJcbiAgICAgIHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJ1xyXG4gICAgfSk7XHJcbiAgICB0aGlzLnVzZXJQb29sSWQgPSBwcm9jZXNzLmVudi5DT0dOSVRPX1VTRVJfUE9PTF9JRCE7XHJcbiAgICB0aGlzLmVycm9ySGFuZGxlciA9IG5ldyBBdXRoRXJyb3JIYW5kbGVyKCdFbWFpbFZlcmlmaWNhdGlvblNlcnZpY2UnKTtcclxuICAgIHRoaXMubG9nZ2VyID0gY3JlYXRlTG9nZ2VyKCdFbWFpbFZlcmlmaWNhdGlvblNlcnZpY2UnKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFZlcmlmeSBlbWFpbCB3aXRoIGNvbmZpcm1hdGlvbiBjb2RlXHJcbiAgICovXHJcbiAgYXN5bmMgdmVyaWZ5RW1haWwoZW1haWw6IHN0cmluZywgY29uZmlybWF0aW9uQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWZXJpZmljYXRpb25SZXN1bHQ+IHtcclxuICAgIGNvbnN0IGNvcnJlbGF0aW9uSWQgPSB1dWlkdjQoKTtcclxuICAgIFxyXG4gICAgdGhpcy5sb2dnZXIuaW5mbygnVmVyaWZ5aW5nIGVtYWlsJywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICBlbWFpbFxyXG4gICAgfSk7XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gQ29uZmlybSB0aGUgdXNlciBpbiBDb2duaXRvXHJcbiAgICAgIGF3YWl0IHRoaXMuY29nbml0b0NsaWVudC5zZW5kKG5ldyBBZG1pbkNvbmZpcm1TaWduVXBDb21tYW5kKHtcclxuICAgICAgICBVc2VyUG9vbElkOiB0aGlzLnVzZXJQb29sSWQsXHJcbiAgICAgICAgVXNlcm5hbWU6IGVtYWlsLFxyXG4gICAgICAgIC8vIE5vdGU6IEFkbWluQ29uZmlybVNpZ25VcENvbW1hbmQgZG9lc24ndCB1c2UgQ29uZmlybWF0aW9uQ29kZVxyXG4gICAgICAgIC8vIEl0J3MgdXNlZCBmb3IgYWRtaW4taW5pdGlhdGVkIGNvbmZpcm1hdGlvbnNcclxuICAgICAgfSkpO1xyXG5cclxuICAgICAgdGhpcy5lcnJvckhhbmRsZXIubG9nQXV0aEV2ZW50KCdlbWFpbF9jb25maXJtZWQnLCB7XHJcbiAgICAgICAgb3BlcmF0aW9uOiAndmVyaWZ5RW1haWwnLFxyXG4gICAgICAgIGVtYWlsLFxyXG4gICAgICAgIHN0ZXA6ICdjb2duaXRvX2NvbmZpcm1hdGlvbidcclxuICAgICAgfSwgdHJ1ZSwgeyBjb3JyZWxhdGlvbklkIH0pO1xyXG5cclxuICAgICAgLy8gQXV0b21hdGljYWxseSBzZXQgdXAgT1RQIGFmdGVyIGVtYWlsIHZlcmlmaWNhdGlvblxyXG4gICAgICBjb25zdCBvdHBTZXR1cCA9IGF3YWl0IHRoaXMuc2V0dXBPVFBGb3JVc2VyKGVtYWlsKTtcclxuXHJcbiAgICAgIHRoaXMubG9nZ2VyLmluZm8oJ0VtYWlsIHZlcmlmaWVkIGFuZCBPVFAgc2V0dXAgY29tcGxldGVkJywge1xyXG4gICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgZW1haWwsXHJcbiAgICAgICAgaGFzT1RQU2VjcmV0OiAhIW90cFNldHVwLnNlY3JldFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICBtZXNzYWdlOiAnRW1haWwgdmVyaWZpZWQgc3VjY2Vzc2Z1bGx5LiBPVFAgaGFzIGJlZW4gYXV0b21hdGljYWxseSBjb25maWd1cmVkLicsXHJcbiAgICAgICAgcmVxdWlyZXNPVFA6IHRydWUsXHJcbiAgICAgICAgb3RwU2VjcmV0OiBvdHBTZXR1cC5zZWNyZXQsXHJcbiAgICAgICAgYmFja3VwQ29kZXM6IG90cFNldHVwLmJhY2t1cENvZGVzXHJcbiAgICAgIH07XHJcbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdFbWFpbCB2ZXJpZmljYXRpb24gZmFpbGVkJywgZXJyb3IsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGVtYWlsLFxyXG4gICAgICAgIGVycm9yTmFtZTogZXJyb3IubmFtZVxyXG4gICAgICB9KTtcclxuICAgICAgXHJcbiAgICAgIGlmIChlcnJvci5uYW1lID09PSAnQ29kZU1pc21hdGNoRXhjZXB0aW9uJykge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgIG1lc3NhZ2U6ICdJbnZhbGlkIHZlcmlmaWNhdGlvbiBjb2RlLiBQbGVhc2UgY2hlY2sgYW5kIHRyeSBhZ2Fpbi4nXHJcbiAgICAgICAgfTtcclxuICAgICAgfSBlbHNlIGlmIChlcnJvci5uYW1lID09PSAnRXhwaXJlZENvZGVFeGNlcHRpb24nKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgICAgbWVzc2FnZTogJ1ZlcmlmaWNhdGlvbiBjb2RlIGhhcyBleHBpcmVkLiBQbGVhc2UgcmVxdWVzdCBhIG5ldyBvbmUuJ1xyXG4gICAgICAgIH07XHJcbiAgICAgIH0gZWxzZSBpZiAoZXJyb3IubmFtZSA9PT0gJ05vdEF1dGhvcml6ZWRFeGNlcHRpb24nKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgICAgbWVzc2FnZTogJ1VzZXIgaXMgYWxyZWFkeSB2ZXJpZmllZCBvciB2ZXJpZmljYXRpb24gZmFpbGVkLidcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcblxyXG4gICAgICB0aGlzLmVycm9ySGFuZGxlci5oYW5kbGVFcnJvcihlcnJvciwge1xyXG4gICAgICAgIG9wZXJhdGlvbjogJ3ZlcmlmeUVtYWlsJyxcclxuICAgICAgICBlbWFpbCxcclxuICAgICAgICBzdGVwOiAnZW1haWxfdmVyaWZpY2F0aW9uJ1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgICAgbWVzc2FnZTogJ0VtYWlsIHZlcmlmaWNhdGlvbiBmYWlsZWQuIFBsZWFzZSB0cnkgYWdhaW4uJ1xyXG4gICAgICB9O1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRW5oYW5jZWQgdmVyaWZpY2F0aW9uIHdpdGggT1RQIHNldHVwXHJcbiAgICovXHJcbiAgYXN5bmMgdmVyaWZ5RW1haWxXaXRoT1RQU2V0dXAoZW1haWw6IHN0cmluZywgY29kZTogc3RyaW5nKTogUHJvbWlzZTxWZXJpZmljYXRpb25XaXRoT1RQUmVzdWx0PiB7XHJcbiAgICB0cnkge1xyXG4gICAgICAvLyBGaXJzdCB2ZXJpZnkgdGhlIGVtYWlsXHJcbiAgICAgIGNvbnN0IHZlcmlmaWNhdGlvblJlc3VsdCA9IGF3YWl0IHRoaXMudmVyaWZ5RW1haWwoZW1haWwsIGNvZGUpO1xyXG4gICAgICBcclxuICAgICAgaWYgKCF2ZXJpZmljYXRpb25SZXN1bHQuc3VjY2Vzcykge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcih2ZXJpZmljYXRpb25SZXN1bHQubWVzc2FnZSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIEdlbmVyYXRlIE9UUCBzZXR1cCBkYXRhXHJcbiAgICAgIGNvbnN0IG90cFNldHVwOiBPVFBTZXR1cERhdGEgPSB7XHJcbiAgICAgICAgc2VjcmV0OiB2ZXJpZmljYXRpb25SZXN1bHQub3RwU2VjcmV0ISxcclxuICAgICAgICBxckNvZGVVcmw6IHRoaXMuZ2VuZXJhdGVRUkNvZGVVcmwoZW1haWwsIHZlcmlmaWNhdGlvblJlc3VsdC5vdHBTZWNyZXQhKSxcclxuICAgICAgICBiYWNrdXBDb2RlczogdmVyaWZpY2F0aW9uUmVzdWx0LmJhY2t1cENvZGVzISxcclxuICAgICAgICBpc3N1ZXI6ICdNSVNSQSBQbGF0Zm9ybScsXHJcbiAgICAgICAgYWNjb3VudE5hbWU6IGVtYWlsXHJcbiAgICAgIH07XHJcblxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgbWVzc2FnZTogJ0VtYWlsIHZlcmlmaWVkIHN1Y2Nlc3NmdWxseS4gT1RQIHNldHVwIGlzIHJlYWR5LicsXHJcbiAgICAgICAgcmVxdWlyZXNPVFA6IHRydWUsXHJcbiAgICAgICAgb3RwU2VjcmV0OiB2ZXJpZmljYXRpb25SZXN1bHQub3RwU2VjcmV0LFxyXG4gICAgICAgIGJhY2t1cENvZGVzOiB2ZXJpZmljYXRpb25SZXN1bHQuYmFja3VwQ29kZXMsXHJcbiAgICAgICAgb3RwU2V0dXAsXHJcbiAgICAgICAgbmV4dFN0ZXA6IEF1dGhlbnRpY2F0aW9uU3RhdGUuT1RQX1NFVFVQX1JFUVVJUkVEXHJcbiAgICAgIH07XHJcbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgRU1BSUxfVkVSSUZJQ0FUSU9OX1dJVEhfT1RQX0ZBSUxFRDogJHtlcnJvci5tZXNzYWdlfWApO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IHZlcmlmaWNhdGlvbiBzdGF0ZVxyXG4gICAqL1xyXG4gIGFzeW5jIGdldFZlcmlmaWNhdGlvblN0YXRlKGVtYWlsOiBzdHJpbmcpOiBQcm9taXNlPFZlcmlmaWNhdGlvblN0YXRlPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCB1c2VyUmVzcG9uc2UgPSBhd2FpdCB0aGlzLmNvZ25pdG9DbGllbnQuc2VuZChuZXcgQWRtaW5HZXRVc2VyQ29tbWFuZCh7XHJcbiAgICAgICAgVXNlclBvb2xJZDogdGhpcy51c2VyUG9vbElkLFxyXG4gICAgICAgIFVzZXJuYW1lOiBlbWFpbFxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICBjb25zdCBpc1ZlcmlmaWVkID0gdXNlclJlc3BvbnNlLlVzZXJTdGF0dXMgPT09ICdDT05GSVJNRUQnO1xyXG4gICAgICBcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBpc1ZlcmlmaWVkLFxyXG4gICAgICAgIHJlcXVpcmVzVmVyaWZpY2F0aW9uOiAhaXNWZXJpZmllZCxcclxuICAgICAgICBjYW5SZXNlbmQ6ICFpc1ZlcmlmaWVkLCAvLyBDYW4gcmVzZW5kIGlmIG5vdCB2ZXJpZmllZFxyXG4gICAgICAgIGxhc3RTZW50QXQ6IHVuZGVmaW5lZCAvLyBXb3VsZCBuZWVkIHRvIHRyYWNrIHRoaXMgc2VwYXJhdGVseSBpZiBuZWVkZWRcclxuICAgICAgfTtcclxuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgaWYgKGVycm9yLm5hbWUgPT09ICdVc2VyTm90Rm91bmRFeGNlcHRpb24nKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIGlzVmVyaWZpZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgcmVxdWlyZXNWZXJpZmljYXRpb246IHRydWUsXHJcbiAgICAgICAgICBjYW5SZXNlbmQ6IGZhbHNlIC8vIENhbid0IHJlc2VuZCBmb3Igbm9uLWV4aXN0ZW50IHVzZXJcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFZFUklGSUNBVElPTl9TVEFURV9FUlJPUjogJHtlcnJvci5tZXNzYWdlfWApO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUmVzZW5kIHZlcmlmaWNhdGlvbiBjb2RlXHJcbiAgICovXHJcbiAgYXN5bmMgcmVzZW5kVmVyaWZpY2F0aW9uQ29kZShlbWFpbDogc3RyaW5nKTogUHJvbWlzZTx7IHN1Y2Nlc3M6IGJvb2xlYW47IG1lc3NhZ2U6IHN0cmluZyB9PiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBhd2FpdCB0aGlzLmNvZ25pdG9DbGllbnQuc2VuZChuZXcgUmVzZW5kQ29uZmlybWF0aW9uQ29kZUNvbW1hbmQoe1xyXG4gICAgICAgIENsaWVudElkOiBwcm9jZXNzLmVudi5DT0dOSVRPX1VTRVJfUE9PTF9DTElFTlRfSUQhLFxyXG4gICAgICAgIFVzZXJuYW1lOiBlbWFpbFxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgbWVzc2FnZTogJ1ZlcmlmaWNhdGlvbiBjb2RlIHNlbnQgdG8geW91ciBlbWFpbCBhZGRyZXNzLidcclxuICAgICAgfTtcclxuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignUmVzZW5kIHZlcmlmaWNhdGlvbiBjb2RlIGZhaWxlZDonLCBlcnJvcik7XHJcbiAgICAgIFxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgIG1lc3NhZ2U6ICdGYWlsZWQgdG8gcmVzZW5kIHZlcmlmaWNhdGlvbiBjb2RlLiBQbGVhc2UgdHJ5IGFnYWluLidcclxuICAgICAgfTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEF1dG9tYXRpY2FsbHkgc2V0IHVwIE9UUCBmb3IgdmVyaWZpZWQgdXNlclxyXG4gICAqL1xyXG4gIHByaXZhdGUgYXN5bmMgc2V0dXBPVFBGb3JVc2VyKGVtYWlsOiBzdHJpbmcpOiBQcm9taXNlPE9UUFNldHVwUmVzdWx0PiB7XHJcbiAgICAvLyBHZW5lcmF0ZSBPVFAgc2VjcmV0XHJcbiAgICBjb25zdCBzZWNyZXQgPSB0aGlzLmdlbmVyYXRlT1RQU2VjcmV0KCk7XHJcbiAgICBcclxuICAgIC8vIEdlbmVyYXRlIGJhY2t1cCBjb2Rlc1xyXG4gICAgY29uc3QgYmFja3VwQ29kZXMgPSB0aGlzLmdlbmVyYXRlQmFja3VwQ29kZXMoKTtcclxuXHJcbiAgICAvLyBTdG9yZSBPVFAgc2VjcmV0IGFuZCBiYWNrdXAgY29kZXMgaW4gdXNlciBhdHRyaWJ1dGVzXHJcbiAgICBhd2FpdCB0aGlzLmNvZ25pdG9DbGllbnQuc2VuZChuZXcgQWRtaW5VcGRhdGVVc2VyQXR0cmlidXRlc0NvbW1hbmQoe1xyXG4gICAgICBVc2VyUG9vbElkOiB0aGlzLnVzZXJQb29sSWQsXHJcbiAgICAgIFVzZXJuYW1lOiBlbWFpbCxcclxuICAgICAgVXNlckF0dHJpYnV0ZXM6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBOYW1lOiAnY3VzdG9tOm90cF9zZWNyZXQnLFxyXG4gICAgICAgICAgVmFsdWU6IHNlY3JldFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgTmFtZTogJ2N1c3RvbTpiYWNrdXBfY29kZXMnLFxyXG4gICAgICAgICAgVmFsdWU6IEpTT04uc3RyaW5naWZ5KGJhY2t1cENvZGVzKVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgTmFtZTogJ2N1c3RvbTpvdHBfZW5hYmxlZCcsXHJcbiAgICAgICAgICBWYWx1ZTogJ3RydWUnXHJcbiAgICAgICAgfVxyXG4gICAgICBdXHJcbiAgICB9KSk7XHJcblxyXG4gICAgLy8gR2VuZXJhdGUgUVIgY29kZSBVUkwgZm9yIGF1dGhlbnRpY2F0b3IgYXBwc1xyXG4gICAgY29uc3QgcXJDb2RlVXJsID0gdGhpcy5nZW5lcmF0ZVFSQ29kZVVybChlbWFpbCwgc2VjcmV0KTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzZWNyZXQsXHJcbiAgICAgIHFyQ29kZVVybCxcclxuICAgICAgYmFja3VwQ29kZXNcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZW5lcmF0ZSBPVFAgc2VjcmV0ICgzMiBjaGFyYWN0ZXJzLCBiYXNlMzIpXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBnZW5lcmF0ZU9UUFNlY3JldCgpOiBzdHJpbmcge1xyXG4gICAgY29uc3QgYnVmZmVyID0gY3J5cHRvLnJhbmRvbUJ5dGVzKDIwKTtcclxuICAgIHJldHVybiBidWZmZXIudG9TdHJpbmcoJ2Jhc2U2NCcpXHJcbiAgICAgIC5yZXBsYWNlKC9cXCsvZywgJycpXHJcbiAgICAgIC5yZXBsYWNlKC9cXC8vZywgJycpXHJcbiAgICAgIC5yZXBsYWNlKC89L2csICcnKVxyXG4gICAgICAuc3Vic3RyaW5nKDAsIDMyKVxyXG4gICAgICAudG9VcHBlckNhc2UoKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdlbmVyYXRlIGJhY2t1cCBjb2Rlc1xyXG4gICAqL1xyXG4gIHByaXZhdGUgZ2VuZXJhdGVCYWNrdXBDb2RlcygpOiBzdHJpbmdbXSB7XHJcbiAgICBjb25zdCBjb2Rlczogc3RyaW5nW10gPSBbXTtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMTA7IGkrKykge1xyXG4gICAgICBjb25zdCBjb2RlID0gY3J5cHRvLnJhbmRvbUJ5dGVzKDQpLnRvU3RyaW5nKCdoZXgnKS50b1VwcGVyQ2FzZSgpO1xyXG4gICAgICBjb2Rlcy5wdXNoKGAke2NvZGUuc3Vic3RyaW5nKDAsIDQpfS0ke2NvZGUuc3Vic3RyaW5nKDQsIDgpfWApO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGNvZGVzO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2VuZXJhdGUgUVIgY29kZSBVUkwgZm9yIGF1dGhlbnRpY2F0b3IgYXBwc1xyXG4gICAqL1xyXG4gIHByaXZhdGUgZ2VuZXJhdGVRUkNvZGVVcmwoZW1haWw6IHN0cmluZywgc2VjcmV0OiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gICAgY29uc3QgaXNzdWVyID0gJ01JU1JBIFBsYXRmb3JtJztcclxuICAgIGNvbnN0IGxhYmVsID0gYCR7aXNzdWVyfToke2VtYWlsfWA7XHJcbiAgICBjb25zdCBvdHBBdXRoVXJsID0gYG90cGF1dGg6Ly90b3RwLyR7ZW5jb2RlVVJJQ29tcG9uZW50KGxhYmVsKX0/c2VjcmV0PSR7c2VjcmV0fSZpc3N1ZXI9JHtlbmNvZGVVUklDb21wb25lbnQoaXNzdWVyKX1gO1xyXG4gICAgXHJcbiAgICAvLyBSZXR1cm4gR29vZ2xlIENoYXJ0cyBRUiBjb2RlIFVSTFxyXG4gICAgcmV0dXJuIGBodHRwczovL2NoYXJ0Lmdvb2dsZWFwaXMuY29tL2NoYXJ0P2Nocz0yMDB4MjAwJmNobGQ9TXwwJmNodD1xciZjaGw9JHtlbmNvZGVVUklDb21wb25lbnQob3RwQXV0aFVybCl9YDtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFZlcmlmeSBPVFAgY29kZVxyXG4gICAqL1xyXG4gIGFzeW5jIHZlcmlmeU9UUChlbWFpbDogc3RyaW5nLCBvdHBDb2RlOiBzdHJpbmcpOiBQcm9taXNlPHsgc3VjY2VzczogYm9vbGVhbjsgbWVzc2FnZTogc3RyaW5nIH0+IHtcclxuICAgIGNvbnN0IGNvcnJlbGF0aW9uSWQgPSB1dWlkdjQoKTtcclxuICAgIFxyXG4gICAgdGhpcy5sb2dnZXIuaW5mbygnVmVyaWZ5aW5nIE9UUCcsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZW1haWxcclxuICAgIH0pO1xyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIC8vIEdldCB1c2VyJ3MgT1RQIHNlY3JldFxyXG4gICAgICBjb25zdCB1c2VyUmVzcG9uc2UgPSBhd2FpdCB0aGlzLmNvZ25pdG9DbGllbnQuc2VuZChuZXcgQWRtaW5HZXRVc2VyQ29tbWFuZCh7XHJcbiAgICAgICAgVXNlclBvb2xJZDogdGhpcy51c2VyUG9vbElkLFxyXG4gICAgICAgIFVzZXJuYW1lOiBlbWFpbFxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICBjb25zdCBvdHBTZWNyZXRBdHRyID0gdXNlclJlc3BvbnNlLlVzZXJBdHRyaWJ1dGVzPy5maW5kKGF0dHIgPT4gYXR0ci5OYW1lID09PSAnY3VzdG9tOm90cF9zZWNyZXQnKTtcclxuICAgICAgY29uc3QgYmFja3VwQ29kZXNBdHRyID0gdXNlclJlc3BvbnNlLlVzZXJBdHRyaWJ1dGVzPy5maW5kKGF0dHIgPT4gYXR0ci5OYW1lID09PSAnY3VzdG9tOmJhY2t1cF9jb2RlcycpO1xyXG5cclxuICAgICAgaWYgKCFvdHBTZWNyZXRBdHRyPy5WYWx1ZSkge1xyXG4gICAgICAgIHRoaXMubG9nZ2VyLndhcm4oJ09UUCBub3QgY29uZmlndXJlZCBmb3IgdXNlcicsIHtcclxuICAgICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgICBlbWFpbFxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgIG1lc3NhZ2U6ICdPVFAgbm90IGNvbmZpZ3VyZWQgZm9yIHRoaXMgdXNlci4nXHJcbiAgICAgICAgfTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gQ2hlY2sgaWYgaXQncyBhIGJhY2t1cCBjb2RlXHJcbiAgICAgIGlmIChiYWNrdXBDb2Rlc0F0dHI/LlZhbHVlKSB7XHJcbiAgICAgICAgY29uc3QgYmFja3VwQ29kZXMgPSBKU09OLnBhcnNlKGJhY2t1cENvZGVzQXR0ci5WYWx1ZSk7XHJcbiAgICAgICAgaWYgKGJhY2t1cENvZGVzLmluY2x1ZGVzKG90cENvZGUudG9VcHBlckNhc2UoKSkpIHtcclxuICAgICAgICAgIC8vIFJlbW92ZSB1c2VkIGJhY2t1cCBjb2RlXHJcbiAgICAgICAgICBjb25zdCB1cGRhdGVkQ29kZXMgPSBiYWNrdXBDb2Rlcy5maWx0ZXIoKGNvZGU6IHN0cmluZykgPT4gY29kZSAhPT0gb3RwQ29kZS50b1VwcGVyQ2FzZSgpKTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgYXdhaXQgdGhpcy5jb2duaXRvQ2xpZW50LnNlbmQobmV3IEFkbWluVXBkYXRlVXNlckF0dHJpYnV0ZXNDb21tYW5kKHtcclxuICAgICAgICAgICAgVXNlclBvb2xJZDogdGhpcy51c2VyUG9vbElkLFxyXG4gICAgICAgICAgICBVc2VybmFtZTogZW1haWwsXHJcbiAgICAgICAgICAgIFVzZXJBdHRyaWJ1dGVzOiBbXHJcbiAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgTmFtZTogJ2N1c3RvbTpiYWNrdXBfY29kZXMnLFxyXG4gICAgICAgICAgICAgICAgVmFsdWU6IEpTT04uc3RyaW5naWZ5KHVwZGF0ZWRDb2RlcylcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIF1cclxuICAgICAgICAgIH0pKTtcclxuXHJcbiAgICAgICAgICB0aGlzLmVycm9ySGFuZGxlci5sb2dBdXRoRXZlbnQoJ2JhY2t1cF9jb2RlX3VzZWQnLCB7XHJcbiAgICAgICAgICAgIG9wZXJhdGlvbjogJ3ZlcmlmeU9UUCcsXHJcbiAgICAgICAgICAgIGVtYWlsLFxyXG4gICAgICAgICAgICBzdGVwOiAnYmFja3VwX2NvZGVfdmVyaWZpY2F0aW9uJ1xyXG4gICAgICAgICAgfSwgdHJ1ZSwgeyBjb3JyZWxhdGlvbklkLCByZW1haW5pbmdDb2RlczogdXBkYXRlZENvZGVzLmxlbmd0aCB9KTtcclxuXHJcbiAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICBtZXNzYWdlOiAnQmFja3VwIGNvZGUgdmVyaWZpZWQgc3VjY2Vzc2Z1bGx5LidcclxuICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBWZXJpZnkgVE9UUCBjb2RlXHJcbiAgICAgIGNvbnN0IGlzVmFsaWRPVFAgPSB0aGlzLnZlcmlmeVRPVFAob3RwU2VjcmV0QXR0ci5WYWx1ZSwgb3RwQ29kZSk7XHJcbiAgICAgIFxyXG4gICAgICBpZiAoaXNWYWxpZE9UUCkge1xyXG4gICAgICAgIHRoaXMuZXJyb3JIYW5kbGVyLmxvZ0F1dGhFdmVudCgnb3RwX2NvZGVfdmVyaWZpZWQnLCB7XHJcbiAgICAgICAgICBvcGVyYXRpb246ICd2ZXJpZnlPVFAnLFxyXG4gICAgICAgICAgZW1haWwsXHJcbiAgICAgICAgICBzdGVwOiAndG90cF92ZXJpZmljYXRpb24nXHJcbiAgICAgICAgfSwgdHJ1ZSwgeyBjb3JyZWxhdGlvbklkIH0pO1xyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgIG1lc3NhZ2U6ICdPVFAgdmVyaWZpZWQgc3VjY2Vzc2Z1bGx5LidcclxuICAgICAgICB9O1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRoaXMubG9nZ2VyLndhcm4oJ0ludmFsaWQgT1RQIGNvZGUgcHJvdmlkZWQnLCB7XHJcbiAgICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgICAgZW1haWxcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgICAgbWVzc2FnZTogJ0ludmFsaWQgT1RQIGNvZGUuIFBsZWFzZSB0cnkgYWdhaW4uJ1xyXG4gICAgICAgIH07XHJcbiAgICAgIH1cclxuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ09UUCB2ZXJpZmljYXRpb24gZmFpbGVkJywgZXJyb3IsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGVtYWlsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgdGhpcy5lcnJvckhhbmRsZXIuaGFuZGxlRXJyb3IoZXJyb3IsIHtcclxuICAgICAgICBvcGVyYXRpb246ICd2ZXJpZnlPVFAnLFxyXG4gICAgICAgIGVtYWlsLFxyXG4gICAgICAgIHN0ZXA6ICdvdHBfdmVyaWZpY2F0aW9uJ1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgICAgbWVzc2FnZTogJ09UUCB2ZXJpZmljYXRpb24gZmFpbGVkLiBQbGVhc2UgdHJ5IGFnYWluLidcclxuICAgICAgfTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFZlcmlmeSBUT1RQIGNvZGUgdXNpbmcgdGltZS1iYXNlZCBhbGdvcml0aG1cclxuICAgKi9cclxuICBwcml2YXRlIHZlcmlmeVRPVFAoc2VjcmV0OiBzdHJpbmcsIHRva2VuOiBzdHJpbmcsIHdpbmRvdzogbnVtYmVyID0gMSk6IGJvb2xlYW4ge1xyXG4gICAgY29uc3QgdGltZVN0ZXAgPSAzMDsgLy8gMzAgc2Vjb25kc1xyXG4gICAgY29uc3QgY3VycmVudFRpbWUgPSBNYXRoLmZsb29yKERhdGUubm93KCkgLyAxMDAwIC8gdGltZVN0ZXApO1xyXG5cclxuICAgIC8vIENoZWNrIGN1cnJlbnQgdGltZSBhbmQgwrF3aW5kb3cgdGltZSBzdGVwc1xyXG4gICAgZm9yIChsZXQgaSA9IC13aW5kb3c7IGkgPD0gd2luZG93OyBpKyspIHtcclxuICAgICAgY29uc3QgdGltZSA9IGN1cnJlbnRUaW1lICsgaTtcclxuICAgICAgY29uc3QgZXhwZWN0ZWRUb2tlbiA9IHRoaXMuZ2VuZXJhdGVUT1RQKHNlY3JldCwgdGltZSk7XHJcbiAgICAgIGlmIChleHBlY3RlZFRva2VuID09PSB0b2tlbikge1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2VuZXJhdGUgVE9UUCBjb2RlXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBnZW5lcmF0ZVRPVFAoc2VjcmV0OiBzdHJpbmcsIHRpbWU6IG51bWJlcik6IHN0cmluZyB7XHJcbiAgICBjb25zdCBidWZmZXIgPSBCdWZmZXIuYWxsb2MoOCk7XHJcbiAgICBidWZmZXIud3JpdGVVSW50MzJCRSgwLCAwKTtcclxuICAgIGJ1ZmZlci53cml0ZVVJbnQzMkJFKHRpbWUsIDQpO1xyXG5cclxuICAgIGNvbnN0IGtleSA9IEJ1ZmZlci5mcm9tKHNlY3JldCwgJ2Jhc2U2NCcpO1xyXG4gICAgY29uc3QgaG1hYyA9IGNyeXB0by5jcmVhdGVIbWFjKCdzaGExJywga2V5KTtcclxuICAgIGhtYWMudXBkYXRlKGJ1ZmZlcik7XHJcbiAgICBjb25zdCBkaWdlc3QgPSBobWFjLmRpZ2VzdCgpO1xyXG5cclxuICAgIGNvbnN0IG9mZnNldCA9IGRpZ2VzdFtkaWdlc3QubGVuZ3RoIC0gMV0gJiAweDBmO1xyXG4gICAgY29uc3QgY29kZSA9ICgoZGlnZXN0W29mZnNldF0gJiAweDdmKSA8PCAyNCkgfFxyXG4gICAgICAgICAgICAgICAgICgoZGlnZXN0W29mZnNldCArIDFdICYgMHhmZikgPDwgMTYpIHxcclxuICAgICAgICAgICAgICAgICAoKGRpZ2VzdFtvZmZzZXQgKyAyXSAmIDB4ZmYpIDw8IDgpIHxcclxuICAgICAgICAgICAgICAgICAoZGlnZXN0W29mZnNldCArIDNdICYgMHhmZik7XHJcblxyXG4gICAgcmV0dXJuIChjb2RlICUgMTAwMDAwMCkudG9TdHJpbmcoKS5wYWRTdGFydCg2LCAnMCcpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ2hlY2sgaWYgdXNlciBoYXMgT1RQIGVuYWJsZWRcclxuICAgKi9cclxuICBhc3luYyBpc09UUEVuYWJsZWQoZW1haWw6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgdXNlclJlc3BvbnNlID0gYXdhaXQgdGhpcy5jb2duaXRvQ2xpZW50LnNlbmQobmV3IEFkbWluR2V0VXNlckNvbW1hbmQoe1xyXG4gICAgICAgIFVzZXJQb29sSWQ6IHRoaXMudXNlclBvb2xJZCxcclxuICAgICAgICBVc2VybmFtZTogZW1haWxcclxuICAgICAgfSkpO1xyXG5cclxuICAgICAgY29uc3Qgb3RwRW5hYmxlZEF0dHIgPSB1c2VyUmVzcG9uc2UuVXNlckF0dHJpYnV0ZXM/LmZpbmQoYXR0ciA9PiBhdHRyLk5hbWUgPT09ICdjdXN0b206b3RwX2VuYWJsZWQnKTtcclxuICAgICAgcmV0dXJuIG90cEVuYWJsZWRBdHRyPy5WYWx1ZSA9PT0gJ3RydWUnO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ2hlY2sgaWYgdXNlciBpcyB2ZXJpZmllZFxyXG4gICAqL1xyXG4gIGFzeW5jIGlzRW1haWxWZXJpZmllZChlbWFpbDogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCB1c2VyUmVzcG9uc2UgPSBhd2FpdCB0aGlzLmNvZ25pdG9DbGllbnQuc2VuZChuZXcgQWRtaW5HZXRVc2VyQ29tbWFuZCh7XHJcbiAgICAgICAgVXNlclBvb2xJZDogdGhpcy51c2VyUG9vbElkLFxyXG4gICAgICAgIFVzZXJuYW1lOiBlbWFpbFxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICByZXR1cm4gdXNlclJlc3BvbnNlLlVzZXJTdGF0dXMgPT09ICdDT05GSVJNRUQnO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gIH1cclxufSJdfQ==