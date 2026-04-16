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
                ConfirmationCode: confirmationCode
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1haWwtdmVyaWZpY2F0aW9uLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJlbWFpbC12ZXJpZmljYXRpb24tc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztHQUdHOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCxnR0FPbUQ7QUFDbkQsK0NBQWlDO0FBQ2pDLHVFQUFrRTtBQUNsRSwrQ0FBa0Q7QUFDbEQsK0JBQW9DO0FBc0JwQyxJQUFZLG1CQVNYO0FBVEQsV0FBWSxtQkFBbUI7SUFDN0IsMENBQW1CLENBQUE7SUFDbkIsa0RBQTJCLENBQUE7SUFDM0Isa0ZBQTJELENBQUE7SUFDM0QsMERBQW1DLENBQUE7SUFDbkMsZ0VBQXlDLENBQUE7SUFDekMsc0RBQStCLENBQUE7SUFDL0Isc0RBQStCLENBQUE7SUFDL0Isc0NBQWUsQ0FBQTtBQUNqQixDQUFDLEVBVFcsbUJBQW1CLG1DQUFuQixtQkFBbUIsUUFTOUI7QUFnQkQsTUFBYSx3QkFBd0I7SUFDM0IsYUFBYSxDQUFnQztJQUM3QyxVQUFVLENBQVM7SUFDbkIsWUFBWSxDQUFtQjtJQUMvQixNQUFNLENBQWtDO0lBRWhEO1FBQ0UsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLGdFQUE2QixDQUFDO1lBQ3JELE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXO1NBQzlDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBcUIsQ0FBQztRQUNwRCxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUkscUNBQWdCLENBQUMsMEJBQTBCLENBQUMsQ0FBQztRQUNyRSxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUEscUJBQVksRUFBQywwQkFBMEIsQ0FBQyxDQUFDO0lBQ3pELENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxXQUFXLENBQUMsS0FBYSxFQUFF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QUFDLEtBQWE7UUFDOUIsSUFBSSxDQUFDO1lBQ0gsTUFBTSxZQUFZLEdBQUcsTUFBTSxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLHNEQUFtQixDQUFDO2dCQUN6RSxVQUFVLEVBQUUsSUFBSSxDQUFDLFVBQVU7Z0JBQzNCLFFBQVEsRUFBRSxLQUFLO2FBQ2hCLENBQUMsQ0FBQyxDQUFDO1lBRUosTUFBTSxjQUFjLEdBQUcsWUFBWSxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLG9CQUFvQixDQUFDLENBQUM7WUFDckcsT0FBTyxjQUFjLEVBQUUsS0FBSyxLQUFLLE1BQU0sQ0FBQztRQUMxQyxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNmLE9BQU8sS0FBSyxDQUFDO1FBQ2YsQ0FBQztJQUNILENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxlQUFlLENBQUMsS0FBYTtRQUNqQyxJQUFJLENBQUM7WUFDSCxNQUFNLFlBQVksR0FBRyxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksc0RBQW1CLENBQUM7Z0JBQ3pFLFVBQVUsRUFBRSxJQUFJLENBQUMsVUFBVTtnQkFDM0IsUUFBUSxFQUFFLEtBQUs7YUFDaEIsQ0FBQyxDQUFDLENBQUM7WUFFSixPQUFPLFlBQVksQ0FBQyxVQUFVLEtBQUssV0FBVyxDQUFDO1FBQ2pELENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2YsT0FBTyxLQUFLLENBQUM7UUFDZixDQUFDO0lBQ0gsQ0FBQztDQUNGO0FBemJELDREQXliQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBFbWFpbCBWZXJpZmljYXRpb24gU2VydmljZVxyXG4gKiBIYW5kbGVzIGVtYWlsIHZlcmlmaWNhdGlvbiBjb2RlcyBhbmQgT1RQIGdlbmVyYXRpb25cclxuICovXHJcblxyXG5pbXBvcnQgeyBcclxuICBDb2duaXRvSWRlbnRpdHlQcm92aWRlckNsaWVudCxcclxuICBBZG1pbkdldFVzZXJDb21tYW5kLFxyXG4gIEFkbWluQ29uZmlybVNpZ25VcENvbW1hbmQsXHJcbiAgQWRtaW5TZXRVc2VyUGFzc3dvcmRDb21tYW5kLFxyXG4gIFJlc2VuZENvbmZpcm1hdGlvbkNvZGVDb21tYW5kLFxyXG4gIEFkbWluVXBkYXRlVXNlckF0dHJpYnV0ZXNDb21tYW5kXHJcbn0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWNvZ25pdG8taWRlbnRpdHktcHJvdmlkZXInO1xyXG5pbXBvcnQgKiBhcyBjcnlwdG8gZnJvbSAnY3J5cHRvJztcclxuaW1wb3J0IHsgQXV0aEVycm9ySGFuZGxlciB9IGZyb20gJy4uLy4uL3V0aWxzL2F1dGgtZXJyb3ItaGFuZGxlcic7XHJcbmltcG9ydCB7IGNyZWF0ZUxvZ2dlciB9IGZyb20gJy4uLy4uL3V0aWxzL2xvZ2dlcic7XHJcbmltcG9ydCB7IHY0IGFzIHV1aWR2NCB9IGZyb20gJ3V1aWQnO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBWZXJpZmljYXRpb25SZXN1bHQge1xyXG4gIHN1Y2Nlc3M6IGJvb2xlYW47XHJcbiAgbWVzc2FnZTogc3RyaW5nO1xyXG4gIHJlcXVpcmVzT1RQPzogYm9vbGVhbjtcclxuICBvdHBTZWNyZXQ/OiBzdHJpbmc7XHJcbiAgYmFja3VwQ29kZXM/OiBzdHJpbmdbXTtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBWZXJpZmljYXRpb25XaXRoT1RQUmVzdWx0IGV4dGVuZHMgVmVyaWZpY2F0aW9uUmVzdWx0IHtcclxuICBvdHBTZXR1cDogT1RQU2V0dXBEYXRhO1xyXG4gIG5leHRTdGVwOiBBdXRoZW50aWNhdGlvblN0YXRlO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFZlcmlmaWNhdGlvblN0YXRlIHtcclxuICBpc1ZlcmlmaWVkOiBib29sZWFuO1xyXG4gIHJlcXVpcmVzVmVyaWZpY2F0aW9uOiBib29sZWFuO1xyXG4gIGNhblJlc2VuZDogYm9vbGVhbjtcclxuICBsYXN0U2VudEF0PzogRGF0ZTtcclxufVxyXG5cclxuZXhwb3J0IGVudW0gQXV0aGVudGljYXRpb25TdGF0ZSB7XHJcbiAgSU5JVElBTCA9ICdpbml0aWFsJyxcclxuICBSRUdJU1RFUklORyA9ICdyZWdpc3RlcmluZycsXHJcbiAgRU1BSUxfVkVSSUZJQ0FUSU9OX1JFUVVJUkVEID0gJ2VtYWlsX3ZlcmlmaWNhdGlvbl9yZXF1aXJlZCcsXHJcbiAgRU1BSUxfVkVSSUZZSU5HID0gJ2VtYWlsX3ZlcmlmeWluZycsXHJcbiAgT1RQX1NFVFVQX1JFUVVJUkVEID0gJ290cF9zZXR1cF9yZXF1aXJlZCcsXHJcbiAgT1RQX1ZFUklGWUlORyA9ICdvdHBfdmVyaWZ5aW5nJyxcclxuICBBVVRIRU5USUNBVEVEID0gJ2F1dGhlbnRpY2F0ZWQnLFxyXG4gIEVSUk9SID0gJ2Vycm9yJ1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIE9UUFNldHVwRGF0YSB7XHJcbiAgc2VjcmV0OiBzdHJpbmc7XHJcbiAgcXJDb2RlVXJsOiBzdHJpbmc7XHJcbiAgYmFja3VwQ29kZXM6IHN0cmluZ1tdO1xyXG4gIGlzc3Vlcjogc3RyaW5nO1xyXG4gIGFjY291bnROYW1lOiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgT1RQU2V0dXBSZXN1bHQge1xyXG4gIHNlY3JldDogc3RyaW5nO1xyXG4gIHFyQ29kZVVybDogc3RyaW5nO1xyXG4gIGJhY2t1cENvZGVzOiBzdHJpbmdbXTtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEVtYWlsVmVyaWZpY2F0aW9uU2VydmljZSB7XHJcbiAgcHJpdmF0ZSBjb2duaXRvQ2xpZW50OiBDb2duaXRvSWRlbnRpdHlQcm92aWRlckNsaWVudDtcclxuICBwcml2YXRlIHVzZXJQb29sSWQ6IHN0cmluZztcclxuICBwcml2YXRlIGVycm9ySGFuZGxlcjogQXV0aEVycm9ySGFuZGxlcjtcclxuICBwcml2YXRlIGxvZ2dlcjogUmV0dXJuVHlwZTx0eXBlb2YgY3JlYXRlTG9nZ2VyPjtcclxuXHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICB0aGlzLmNvZ25pdG9DbGllbnQgPSBuZXcgQ29nbml0b0lkZW50aXR5UHJvdmlkZXJDbGllbnQoe1xyXG4gICAgICByZWdpb246IHByb2Nlc3MuZW52LkFXU19SRUdJT04gfHwgJ3VzLWVhc3QtMSdcclxuICAgIH0pO1xyXG4gICAgdGhpcy51c2VyUG9vbElkID0gcHJvY2Vzcy5lbnYuQ09HTklUT19VU0VSX1BPT0xfSUQhO1xyXG4gICAgdGhpcy5lcnJvckhhbmRsZXIgPSBuZXcgQXV0aEVycm9ySGFuZGxlcignRW1haWxWZXJpZmljYXRpb25TZXJ2aWNlJyk7XHJcbiAgICB0aGlzLmxvZ2dlciA9IGNyZWF0ZUxvZ2dlcignRW1haWxWZXJpZmljYXRpb25TZXJ2aWNlJyk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBWZXJpZnkgZW1haWwgd2l0aCBjb25maXJtYXRpb24gY29kZVxyXG4gICAqL1xyXG4gIGFzeW5jIHZlcmlmeUVtYWlsKGVtYWlsOiBzdHJpbmcsIGNvbmZpcm1hdGlvbkNvZGU6IHN0cmluZyk6IFByb21pc2U8VmVyaWZpY2F0aW9uUmVzdWx0PiB7XHJcbiAgICBjb25zdCBjb3JyZWxhdGlvbklkID0gdXVpZHY0KCk7XHJcbiAgICBcclxuICAgIHRoaXMubG9nZ2VyLmluZm8oJ1ZlcmlmeWluZyBlbWFpbCcsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZW1haWxcclxuICAgIH0pO1xyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIC8vIENvbmZpcm0gdGhlIHVzZXIgaW4gQ29nbml0b1xyXG4gICAgICBhd2FpdCB0aGlzLmNvZ25pdG9DbGllbnQuc2VuZChuZXcgQWRtaW5Db25maXJtU2lnblVwQ29tbWFuZCh7XHJcbiAgICAgICAgVXNlclBvb2xJZDogdGhpcy51c2VyUG9vbElkLFxyXG4gICAgICAgIFVzZXJuYW1lOiBlbWFpbCxcclxuICAgICAgICBDb25maXJtYXRpb25Db2RlOiBjb25maXJtYXRpb25Db2RlXHJcbiAgICAgIH0pKTtcclxuXHJcbiAgICAgIHRoaXMuZXJyb3JIYW5kbGVyLmxvZ0F1dGhFdmVudCgnZW1haWxfY29uZmlybWVkJywge1xyXG4gICAgICAgIG9wZXJhdGlvbjogJ3ZlcmlmeUVtYWlsJyxcclxuICAgICAgICBlbWFpbCxcclxuICAgICAgICBzdGVwOiAnY29nbml0b19jb25maXJtYXRpb24nXHJcbiAgICAgIH0sIHRydWUsIHsgY29ycmVsYXRpb25JZCB9KTtcclxuXHJcbiAgICAgIC8vIEF1dG9tYXRpY2FsbHkgc2V0IHVwIE9UUCBhZnRlciBlbWFpbCB2ZXJpZmljYXRpb25cclxuICAgICAgY29uc3Qgb3RwU2V0dXAgPSBhd2FpdCB0aGlzLnNldHVwT1RQRm9yVXNlcihlbWFpbCk7XHJcblxyXG4gICAgICB0aGlzLmxvZ2dlci5pbmZvKCdFbWFpbCB2ZXJpZmllZCBhbmQgT1RQIHNldHVwIGNvbXBsZXRlZCcsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGVtYWlsLFxyXG4gICAgICAgIGhhc09UUFNlY3JldDogISFvdHBTZXR1cC5zZWNyZXRcclxuICAgICAgfSk7XHJcblxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgbWVzc2FnZTogJ0VtYWlsIHZlcmlmaWVkIHN1Y2Nlc3NmdWxseS4gT1RQIGhhcyBiZWVuIGF1dG9tYXRpY2FsbHkgY29uZmlndXJlZC4nLFxyXG4gICAgICAgIHJlcXVpcmVzT1RQOiB0cnVlLFxyXG4gICAgICAgIG90cFNlY3JldDogb3RwU2V0dXAuc2VjcmV0LFxyXG4gICAgICAgIGJhY2t1cENvZGVzOiBvdHBTZXR1cC5iYWNrdXBDb2Rlc1xyXG4gICAgICB9O1xyXG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcignRW1haWwgdmVyaWZpY2F0aW9uIGZhaWxlZCcsIGVycm9yLCB7XHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICBlbWFpbCxcclxuICAgICAgICBlcnJvck5hbWU6IGVycm9yLm5hbWVcclxuICAgICAgfSk7XHJcbiAgICAgIFxyXG4gICAgICBpZiAoZXJyb3IubmFtZSA9PT0gJ0NvZGVNaXNtYXRjaEV4Y2VwdGlvbicpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgICAgICBtZXNzYWdlOiAnSW52YWxpZCB2ZXJpZmljYXRpb24gY29kZS4gUGxlYXNlIGNoZWNrIGFuZCB0cnkgYWdhaW4uJ1xyXG4gICAgICAgIH07XHJcbiAgICAgIH0gZWxzZSBpZiAoZXJyb3IubmFtZSA9PT0gJ0V4cGlyZWRDb2RlRXhjZXB0aW9uJykge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgIG1lc3NhZ2U6ICdWZXJpZmljYXRpb24gY29kZSBoYXMgZXhwaXJlZC4gUGxlYXNlIHJlcXVlc3QgYSBuZXcgb25lLidcclxuICAgICAgICB9O1xyXG4gICAgICB9IGVsc2UgaWYgKGVycm9yLm5hbWUgPT09ICdOb3RBdXRob3JpemVkRXhjZXB0aW9uJykge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgIG1lc3NhZ2U6ICdVc2VyIGlzIGFscmVhZHkgdmVyaWZpZWQgb3IgdmVyaWZpY2F0aW9uIGZhaWxlZC4nXHJcbiAgICAgICAgfTtcclxuICAgICAgfVxyXG5cclxuICAgICAgdGhpcy5lcnJvckhhbmRsZXIuaGFuZGxlRXJyb3IoZXJyb3IsIHtcclxuICAgICAgICBvcGVyYXRpb246ICd2ZXJpZnlFbWFpbCcsXHJcbiAgICAgICAgZW1haWwsXHJcbiAgICAgICAgc3RlcDogJ2VtYWlsX3ZlcmlmaWNhdGlvbidcclxuICAgICAgfSk7XHJcblxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgIG1lc3NhZ2U6ICdFbWFpbCB2ZXJpZmljYXRpb24gZmFpbGVkLiBQbGVhc2UgdHJ5IGFnYWluLidcclxuICAgICAgfTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEVuaGFuY2VkIHZlcmlmaWNhdGlvbiB3aXRoIE9UUCBzZXR1cFxyXG4gICAqL1xyXG4gIGFzeW5jIHZlcmlmeUVtYWlsV2l0aE9UUFNldHVwKGVtYWlsOiBzdHJpbmcsIGNvZGU6IHN0cmluZyk6IFByb21pc2U8VmVyaWZpY2F0aW9uV2l0aE9UUFJlc3VsdD4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gRmlyc3QgdmVyaWZ5IHRoZSBlbWFpbFxyXG4gICAgICBjb25zdCB2ZXJpZmljYXRpb25SZXN1bHQgPSBhd2FpdCB0aGlzLnZlcmlmeUVtYWlsKGVtYWlsLCBjb2RlKTtcclxuICAgICAgXHJcbiAgICAgIGlmICghdmVyaWZpY2F0aW9uUmVzdWx0LnN1Y2Nlc3MpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IodmVyaWZpY2F0aW9uUmVzdWx0Lm1lc3NhZ2UpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBHZW5lcmF0ZSBPVFAgc2V0dXAgZGF0YVxyXG4gICAgICBjb25zdCBvdHBTZXR1cDogT1RQU2V0dXBEYXRhID0ge1xyXG4gICAgICAgIHNlY3JldDogdmVyaWZpY2F0aW9uUmVzdWx0Lm90cFNlY3JldCEsXHJcbiAgICAgICAgcXJDb2RlVXJsOiB0aGlzLmdlbmVyYXRlUVJDb2RlVXJsKGVtYWlsLCB2ZXJpZmljYXRpb25SZXN1bHQub3RwU2VjcmV0ISksXHJcbiAgICAgICAgYmFja3VwQ29kZXM6IHZlcmlmaWNhdGlvblJlc3VsdC5iYWNrdXBDb2RlcyEsXHJcbiAgICAgICAgaXNzdWVyOiAnTUlTUkEgUGxhdGZvcm0nLFxyXG4gICAgICAgIGFjY291bnROYW1lOiBlbWFpbFxyXG4gICAgICB9O1xyXG5cclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgIG1lc3NhZ2U6ICdFbWFpbCB2ZXJpZmllZCBzdWNjZXNzZnVsbHkuIE9UUCBzZXR1cCBpcyByZWFkeS4nLFxyXG4gICAgICAgIHJlcXVpcmVzT1RQOiB0cnVlLFxyXG4gICAgICAgIG90cFNlY3JldDogdmVyaWZpY2F0aW9uUmVzdWx0Lm90cFNlY3JldCxcclxuICAgICAgICBiYWNrdXBDb2RlczogdmVyaWZpY2F0aW9uUmVzdWx0LmJhY2t1cENvZGVzLFxyXG4gICAgICAgIG90cFNldHVwLFxyXG4gICAgICAgIG5leHRTdGVwOiBBdXRoZW50aWNhdGlvblN0YXRlLk9UUF9TRVRVUF9SRVFVSVJFRFxyXG4gICAgICB9O1xyXG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEVNQUlMX1ZFUklGSUNBVElPTl9XSVRIX09UUF9GQUlMRUQ6ICR7ZXJyb3IubWVzc2FnZX1gKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCB2ZXJpZmljYXRpb24gc3RhdGVcclxuICAgKi9cclxuICBhc3luYyBnZXRWZXJpZmljYXRpb25TdGF0ZShlbWFpbDogc3RyaW5nKTogUHJvbWlzZTxWZXJpZmljYXRpb25TdGF0ZT4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgdXNlclJlc3BvbnNlID0gYXdhaXQgdGhpcy5jb2duaXRvQ2xpZW50LnNlbmQobmV3IEFkbWluR2V0VXNlckNvbW1hbmQoe1xyXG4gICAgICAgIFVzZXJQb29sSWQ6IHRoaXMudXNlclBvb2xJZCxcclxuICAgICAgICBVc2VybmFtZTogZW1haWxcclxuICAgICAgfSkpO1xyXG5cclxuICAgICAgY29uc3QgaXNWZXJpZmllZCA9IHVzZXJSZXNwb25zZS5Vc2VyU3RhdHVzID09PSAnQ09ORklSTUVEJztcclxuICAgICAgXHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgaXNWZXJpZmllZCxcclxuICAgICAgICByZXF1aXJlc1ZlcmlmaWNhdGlvbjogIWlzVmVyaWZpZWQsXHJcbiAgICAgICAgY2FuUmVzZW5kOiAhaXNWZXJpZmllZCwgLy8gQ2FuIHJlc2VuZCBpZiBub3QgdmVyaWZpZWRcclxuICAgICAgICBsYXN0U2VudEF0OiB1bmRlZmluZWQgLy8gV291bGQgbmVlZCB0byB0cmFjayB0aGlzIHNlcGFyYXRlbHkgaWYgbmVlZGVkXHJcbiAgICAgIH07XHJcbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgIGlmIChlcnJvci5uYW1lID09PSAnVXNlck5vdEZvdW5kRXhjZXB0aW9uJykge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBpc1ZlcmlmaWVkOiBmYWxzZSxcclxuICAgICAgICAgIHJlcXVpcmVzVmVyaWZpY2F0aW9uOiB0cnVlLFxyXG4gICAgICAgICAgY2FuUmVzZW5kOiBmYWxzZSAvLyBDYW4ndCByZXNlbmQgZm9yIG5vbi1leGlzdGVudCB1c2VyXHJcbiAgICAgICAgfTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBWRVJJRklDQVRJT05fU1RBVEVfRVJST1I6ICR7ZXJyb3IubWVzc2FnZX1gKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFJlc2VuZCB2ZXJpZmljYXRpb24gY29kZVxyXG4gICAqL1xyXG4gIGFzeW5jIHJlc2VuZFZlcmlmaWNhdGlvbkNvZGUoZW1haWw6IHN0cmluZyk6IFByb21pc2U8eyBzdWNjZXNzOiBib29sZWFuOyBtZXNzYWdlOiBzdHJpbmcgfT4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgYXdhaXQgdGhpcy5jb2duaXRvQ2xpZW50LnNlbmQobmV3IFJlc2VuZENvbmZpcm1hdGlvbkNvZGVDb21tYW5kKHtcclxuICAgICAgICBDbGllbnRJZDogcHJvY2Vzcy5lbnYuQ09HTklUT19VU0VSX1BPT0xfQ0xJRU5UX0lEISxcclxuICAgICAgICBVc2VybmFtZTogZW1haWxcclxuICAgICAgfSkpO1xyXG5cclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgIG1lc3NhZ2U6ICdWZXJpZmljYXRpb24gY29kZSBzZW50IHRvIHlvdXIgZW1haWwgYWRkcmVzcy4nXHJcbiAgICAgIH07XHJcbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1Jlc2VuZCB2ZXJpZmljYXRpb24gY29kZSBmYWlsZWQ6JywgZXJyb3IpO1xyXG4gICAgICBcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICBtZXNzYWdlOiAnRmFpbGVkIHRvIHJlc2VuZCB2ZXJpZmljYXRpb24gY29kZS4gUGxlYXNlIHRyeSBhZ2Fpbi4nXHJcbiAgICAgIH07XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBBdXRvbWF0aWNhbGx5IHNldCB1cCBPVFAgZm9yIHZlcmlmaWVkIHVzZXJcclxuICAgKi9cclxuICBwcml2YXRlIGFzeW5jIHNldHVwT1RQRm9yVXNlcihlbWFpbDogc3RyaW5nKTogUHJvbWlzZTxPVFBTZXR1cFJlc3VsdD4ge1xyXG4gICAgLy8gR2VuZXJhdGUgT1RQIHNlY3JldFxyXG4gICAgY29uc3Qgc2VjcmV0ID0gdGhpcy5nZW5lcmF0ZU9UUFNlY3JldCgpO1xyXG4gICAgXHJcbiAgICAvLyBHZW5lcmF0ZSBiYWNrdXAgY29kZXNcclxuICAgIGNvbnN0IGJhY2t1cENvZGVzID0gdGhpcy5nZW5lcmF0ZUJhY2t1cENvZGVzKCk7XHJcblxyXG4gICAgLy8gU3RvcmUgT1RQIHNlY3JldCBhbmQgYmFja3VwIGNvZGVzIGluIHVzZXIgYXR0cmlidXRlc1xyXG4gICAgYXdhaXQgdGhpcy5jb2duaXRvQ2xpZW50LnNlbmQobmV3IEFkbWluVXBkYXRlVXNlckF0dHJpYnV0ZXNDb21tYW5kKHtcclxuICAgICAgVXNlclBvb2xJZDogdGhpcy51c2VyUG9vbElkLFxyXG4gICAgICBVc2VybmFtZTogZW1haWwsXHJcbiAgICAgIFVzZXJBdHRyaWJ1dGVzOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgTmFtZTogJ2N1c3RvbTpvdHBfc2VjcmV0JyxcclxuICAgICAgICAgIFZhbHVlOiBzZWNyZXRcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIE5hbWU6ICdjdXN0b206YmFja3VwX2NvZGVzJyxcclxuICAgICAgICAgIFZhbHVlOiBKU09OLnN0cmluZ2lmeShiYWNrdXBDb2RlcylcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIE5hbWU6ICdjdXN0b206b3RwX2VuYWJsZWQnLFxyXG4gICAgICAgICAgVmFsdWU6ICd0cnVlJ1xyXG4gICAgICAgIH1cclxuICAgICAgXVxyXG4gICAgfSkpO1xyXG5cclxuICAgIC8vIEdlbmVyYXRlIFFSIGNvZGUgVVJMIGZvciBhdXRoZW50aWNhdG9yIGFwcHNcclxuICAgIGNvbnN0IHFyQ29kZVVybCA9IHRoaXMuZ2VuZXJhdGVRUkNvZGVVcmwoZW1haWwsIHNlY3JldCk7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc2VjcmV0LFxyXG4gICAgICBxckNvZGVVcmwsXHJcbiAgICAgIGJhY2t1cENvZGVzXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2VuZXJhdGUgT1RQIHNlY3JldCAoMzIgY2hhcmFjdGVycywgYmFzZTMyKVxyXG4gICAqL1xyXG4gIHByaXZhdGUgZ2VuZXJhdGVPVFBTZWNyZXQoKTogc3RyaW5nIHtcclxuICAgIGNvbnN0IGJ1ZmZlciA9IGNyeXB0by5yYW5kb21CeXRlcygyMCk7XHJcbiAgICByZXR1cm4gYnVmZmVyLnRvU3RyaW5nKCdiYXNlNjQnKVxyXG4gICAgICAucmVwbGFjZSgvXFwrL2csICcnKVxyXG4gICAgICAucmVwbGFjZSgvXFwvL2csICcnKVxyXG4gICAgICAucmVwbGFjZSgvPS9nLCAnJylcclxuICAgICAgLnN1YnN0cmluZygwLCAzMilcclxuICAgICAgLnRvVXBwZXJDYXNlKCk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZW5lcmF0ZSBiYWNrdXAgY29kZXNcclxuICAgKi9cclxuICBwcml2YXRlIGdlbmVyYXRlQmFja3VwQ29kZXMoKTogc3RyaW5nW10ge1xyXG4gICAgY29uc3QgY29kZXM6IHN0cmluZ1tdID0gW107XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDEwOyBpKyspIHtcclxuICAgICAgY29uc3QgY29kZSA9IGNyeXB0by5yYW5kb21CeXRlcyg0KS50b1N0cmluZygnaGV4JykudG9VcHBlckNhc2UoKTtcclxuICAgICAgY29kZXMucHVzaChgJHtjb2RlLnN1YnN0cmluZygwLCA0KX0tJHtjb2RlLnN1YnN0cmluZyg0LCA4KX1gKTtcclxuICAgIH1cclxuICAgIHJldHVybiBjb2RlcztcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdlbmVyYXRlIFFSIGNvZGUgVVJMIGZvciBhdXRoZW50aWNhdG9yIGFwcHNcclxuICAgKi9cclxuICBwcml2YXRlIGdlbmVyYXRlUVJDb2RlVXJsKGVtYWlsOiBzdHJpbmcsIHNlY3JldDogc3RyaW5nKTogc3RyaW5nIHtcclxuICAgIGNvbnN0IGlzc3VlciA9ICdNSVNSQSBQbGF0Zm9ybSc7XHJcbiAgICBjb25zdCBsYWJlbCA9IGAke2lzc3Vlcn06JHtlbWFpbH1gO1xyXG4gICAgY29uc3Qgb3RwQXV0aFVybCA9IGBvdHBhdXRoOi8vdG90cC8ke2VuY29kZVVSSUNvbXBvbmVudChsYWJlbCl9P3NlY3JldD0ke3NlY3JldH0maXNzdWVyPSR7ZW5jb2RlVVJJQ29tcG9uZW50KGlzc3Vlcil9YDtcclxuICAgIFxyXG4gICAgLy8gUmV0dXJuIEdvb2dsZSBDaGFydHMgUVIgY29kZSBVUkxcclxuICAgIHJldHVybiBgaHR0cHM6Ly9jaGFydC5nb29nbGVhcGlzLmNvbS9jaGFydD9jaHM9MjAweDIwMCZjaGxkPU18MCZjaHQ9cXImY2hsPSR7ZW5jb2RlVVJJQ29tcG9uZW50KG90cEF1dGhVcmwpfWA7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBWZXJpZnkgT1RQIGNvZGVcclxuICAgKi9cclxuICBhc3luYyB2ZXJpZnlPVFAoZW1haWw6IHN0cmluZywgb3RwQ29kZTogc3RyaW5nKTogUHJvbWlzZTx7IHN1Y2Nlc3M6IGJvb2xlYW47IG1lc3NhZ2U6IHN0cmluZyB9PiB7XHJcbiAgICBjb25zdCBjb3JyZWxhdGlvbklkID0gdXVpZHY0KCk7XHJcbiAgICBcclxuICAgIHRoaXMubG9nZ2VyLmluZm8oJ1ZlcmlmeWluZyBPVFAnLCB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIGVtYWlsXHJcbiAgICB9KTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICAvLyBHZXQgdXNlcidzIE9UUCBzZWNyZXRcclxuICAgICAgY29uc3QgdXNlclJlc3BvbnNlID0gYXdhaXQgdGhpcy5jb2duaXRvQ2xpZW50LnNlbmQobmV3IEFkbWluR2V0VXNlckNvbW1hbmQoe1xyXG4gICAgICAgIFVzZXJQb29sSWQ6IHRoaXMudXNlclBvb2xJZCxcclxuICAgICAgICBVc2VybmFtZTogZW1haWxcclxuICAgICAgfSkpO1xyXG5cclxuICAgICAgY29uc3Qgb3RwU2VjcmV0QXR0ciA9IHVzZXJSZXNwb25zZS5Vc2VyQXR0cmlidXRlcz8uZmluZChhdHRyID0+IGF0dHIuTmFtZSA9PT0gJ2N1c3RvbTpvdHBfc2VjcmV0Jyk7XHJcbiAgICAgIGNvbnN0IGJhY2t1cENvZGVzQXR0ciA9IHVzZXJSZXNwb25zZS5Vc2VyQXR0cmlidXRlcz8uZmluZChhdHRyID0+IGF0dHIuTmFtZSA9PT0gJ2N1c3RvbTpiYWNrdXBfY29kZXMnKTtcclxuXHJcbiAgICAgIGlmICghb3RwU2VjcmV0QXR0cj8uVmFsdWUpIHtcclxuICAgICAgICB0aGlzLmxvZ2dlci53YXJuKCdPVFAgbm90IGNvbmZpZ3VyZWQgZm9yIHVzZXInLCB7XHJcbiAgICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgICAgZW1haWxcclxuICAgICAgICB9KTtcclxuICAgICAgICBcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgICAgICBtZXNzYWdlOiAnT1RQIG5vdCBjb25maWd1cmVkIGZvciB0aGlzIHVzZXIuJ1xyXG4gICAgICAgIH07XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIENoZWNrIGlmIGl0J3MgYSBiYWNrdXAgY29kZVxyXG4gICAgICBpZiAoYmFja3VwQ29kZXNBdHRyPy5WYWx1ZSkge1xyXG4gICAgICAgIGNvbnN0IGJhY2t1cENvZGVzID0gSlNPTi5wYXJzZShiYWNrdXBDb2Rlc0F0dHIuVmFsdWUpO1xyXG4gICAgICAgIGlmIChiYWNrdXBDb2Rlcy5pbmNsdWRlcyhvdHBDb2RlLnRvVXBwZXJDYXNlKCkpKSB7XHJcbiAgICAgICAgICAvLyBSZW1vdmUgdXNlZCBiYWNrdXAgY29kZVxyXG4gICAgICAgICAgY29uc3QgdXBkYXRlZENvZGVzID0gYmFja3VwQ29kZXMuZmlsdGVyKChjb2RlOiBzdHJpbmcpID0+IGNvZGUgIT09IG90cENvZGUudG9VcHBlckNhc2UoKSk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIGF3YWl0IHRoaXMuY29nbml0b0NsaWVudC5zZW5kKG5ldyBBZG1pblVwZGF0ZVVzZXJBdHRyaWJ1dGVzQ29tbWFuZCh7XHJcbiAgICAgICAgICAgIFVzZXJQb29sSWQ6IHRoaXMudXNlclBvb2xJZCxcclxuICAgICAgICAgICAgVXNlcm5hbWU6IGVtYWlsLFxyXG4gICAgICAgICAgICBVc2VyQXR0cmlidXRlczogW1xyXG4gICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIE5hbWU6ICdjdXN0b206YmFja3VwX2NvZGVzJyxcclxuICAgICAgICAgICAgICAgIFZhbHVlOiBKU09OLnN0cmluZ2lmeSh1cGRhdGVkQ29kZXMpXHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBdXHJcbiAgICAgICAgICB9KSk7XHJcblxyXG4gICAgICAgICAgdGhpcy5lcnJvckhhbmRsZXIubG9nQXV0aEV2ZW50KCdiYWNrdXBfY29kZV91c2VkJywge1xyXG4gICAgICAgICAgICBvcGVyYXRpb246ICd2ZXJpZnlPVFAnLFxyXG4gICAgICAgICAgICBlbWFpbCxcclxuICAgICAgICAgICAgc3RlcDogJ2JhY2t1cF9jb2RlX3ZlcmlmaWNhdGlvbidcclxuICAgICAgICAgIH0sIHRydWUsIHsgY29ycmVsYXRpb25JZCwgcmVtYWluaW5nQ29kZXM6IHVwZGF0ZWRDb2Rlcy5sZW5ndGggfSk7XHJcblxyXG4gICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgbWVzc2FnZTogJ0JhY2t1cCBjb2RlIHZlcmlmaWVkIHN1Y2Nlc3NmdWxseS4nXHJcbiAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gVmVyaWZ5IFRPVFAgY29kZVxyXG4gICAgICBjb25zdCBpc1ZhbGlkT1RQID0gdGhpcy52ZXJpZnlUT1RQKG90cFNlY3JldEF0dHIuVmFsdWUsIG90cENvZGUpO1xyXG4gICAgICBcclxuICAgICAgaWYgKGlzVmFsaWRPVFApIHtcclxuICAgICAgICB0aGlzLmVycm9ySGFuZGxlci5sb2dBdXRoRXZlbnQoJ290cF9jb2RlX3ZlcmlmaWVkJywge1xyXG4gICAgICAgICAgb3BlcmF0aW9uOiAndmVyaWZ5T1RQJyxcclxuICAgICAgICAgIGVtYWlsLFxyXG4gICAgICAgICAgc3RlcDogJ3RvdHBfdmVyaWZpY2F0aW9uJ1xyXG4gICAgICAgIH0sIHRydWUsIHsgY29ycmVsYXRpb25JZCB9KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICBtZXNzYWdlOiAnT1RQIHZlcmlmaWVkIHN1Y2Nlc3NmdWxseS4nXHJcbiAgICAgICAgfTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB0aGlzLmxvZ2dlci53YXJuKCdJbnZhbGlkIE9UUCBjb2RlIHByb3ZpZGVkJywge1xyXG4gICAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICAgIGVtYWlsXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgIG1lc3NhZ2U6ICdJbnZhbGlkIE9UUCBjb2RlLiBQbGVhc2UgdHJ5IGFnYWluLidcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdPVFAgdmVyaWZpY2F0aW9uIGZhaWxlZCcsIGVycm9yLCB7XHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICBlbWFpbFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIHRoaXMuZXJyb3JIYW5kbGVyLmhhbmRsZUVycm9yKGVycm9yLCB7XHJcbiAgICAgICAgb3BlcmF0aW9uOiAndmVyaWZ5T1RQJyxcclxuICAgICAgICBlbWFpbCxcclxuICAgICAgICBzdGVwOiAnb3RwX3ZlcmlmaWNhdGlvbidcclxuICAgICAgfSk7XHJcblxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgIG1lc3NhZ2U6ICdPVFAgdmVyaWZpY2F0aW9uIGZhaWxlZC4gUGxlYXNlIHRyeSBhZ2Fpbi4nXHJcbiAgICAgIH07XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBWZXJpZnkgVE9UUCBjb2RlIHVzaW5nIHRpbWUtYmFzZWQgYWxnb3JpdGhtXHJcbiAgICovXHJcbiAgcHJpdmF0ZSB2ZXJpZnlUT1RQKHNlY3JldDogc3RyaW5nLCB0b2tlbjogc3RyaW5nLCB3aW5kb3c6IG51bWJlciA9IDEpOiBib29sZWFuIHtcclxuICAgIGNvbnN0IHRpbWVTdGVwID0gMzA7IC8vIDMwIHNlY29uZHNcclxuICAgIGNvbnN0IGN1cnJlbnRUaW1lID0gTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMCAvIHRpbWVTdGVwKTtcclxuXHJcbiAgICAvLyBDaGVjayBjdXJyZW50IHRpbWUgYW5kIMKxd2luZG93IHRpbWUgc3RlcHNcclxuICAgIGZvciAobGV0IGkgPSAtd2luZG93OyBpIDw9IHdpbmRvdzsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IHRpbWUgPSBjdXJyZW50VGltZSArIGk7XHJcbiAgICAgIGNvbnN0IGV4cGVjdGVkVG9rZW4gPSB0aGlzLmdlbmVyYXRlVE9UUChzZWNyZXQsIHRpbWUpO1xyXG4gICAgICBpZiAoZXhwZWN0ZWRUb2tlbiA9PT0gdG9rZW4pIHtcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdlbmVyYXRlIFRPVFAgY29kZVxyXG4gICAqL1xyXG4gIHByaXZhdGUgZ2VuZXJhdGVUT1RQKHNlY3JldDogc3RyaW5nLCB0aW1lOiBudW1iZXIpOiBzdHJpbmcge1xyXG4gICAgY29uc3QgYnVmZmVyID0gQnVmZmVyLmFsbG9jKDgpO1xyXG4gICAgYnVmZmVyLndyaXRlVUludDMyQkUoMCwgMCk7XHJcbiAgICBidWZmZXIud3JpdGVVSW50MzJCRSh0aW1lLCA0KTtcclxuXHJcbiAgICBjb25zdCBrZXkgPSBCdWZmZXIuZnJvbShzZWNyZXQsICdiYXNlNjQnKTtcclxuICAgIGNvbnN0IGhtYWMgPSBjcnlwdG8uY3JlYXRlSG1hYygnc2hhMScsIGtleSk7XHJcbiAgICBobWFjLnVwZGF0ZShidWZmZXIpO1xyXG4gICAgY29uc3QgZGlnZXN0ID0gaG1hYy5kaWdlc3QoKTtcclxuXHJcbiAgICBjb25zdCBvZmZzZXQgPSBkaWdlc3RbZGlnZXN0Lmxlbmd0aCAtIDFdICYgMHgwZjtcclxuICAgIGNvbnN0IGNvZGUgPSAoKGRpZ2VzdFtvZmZzZXRdICYgMHg3ZikgPDwgMjQpIHxcclxuICAgICAgICAgICAgICAgICAoKGRpZ2VzdFtvZmZzZXQgKyAxXSAmIDB4ZmYpIDw8IDE2KSB8XHJcbiAgICAgICAgICAgICAgICAgKChkaWdlc3Rbb2Zmc2V0ICsgMl0gJiAweGZmKSA8PCA4KSB8XHJcbiAgICAgICAgICAgICAgICAgKGRpZ2VzdFtvZmZzZXQgKyAzXSAmIDB4ZmYpO1xyXG5cclxuICAgIHJldHVybiAoY29kZSAlIDEwMDAwMDApLnRvU3RyaW5nKCkucGFkU3RhcnQoNiwgJzAnKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENoZWNrIGlmIHVzZXIgaGFzIE9UUCBlbmFibGVkXHJcbiAgICovXHJcbiAgYXN5bmMgaXNPVFBFbmFibGVkKGVtYWlsOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHVzZXJSZXNwb25zZSA9IGF3YWl0IHRoaXMuY29nbml0b0NsaWVudC5zZW5kKG5ldyBBZG1pbkdldFVzZXJDb21tYW5kKHtcclxuICAgICAgICBVc2VyUG9vbElkOiB0aGlzLnVzZXJQb29sSWQsXHJcbiAgICAgICAgVXNlcm5hbWU6IGVtYWlsXHJcbiAgICAgIH0pKTtcclxuXHJcbiAgICAgIGNvbnN0IG90cEVuYWJsZWRBdHRyID0gdXNlclJlc3BvbnNlLlVzZXJBdHRyaWJ1dGVzPy5maW5kKGF0dHIgPT4gYXR0ci5OYW1lID09PSAnY3VzdG9tOm90cF9lbmFibGVkJyk7XHJcbiAgICAgIHJldHVybiBvdHBFbmFibGVkQXR0cj8uVmFsdWUgPT09ICd0cnVlJztcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENoZWNrIGlmIHVzZXIgaXMgdmVyaWZpZWRcclxuICAgKi9cclxuICBhc3luYyBpc0VtYWlsVmVyaWZpZWQoZW1haWw6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgdXNlclJlc3BvbnNlID0gYXdhaXQgdGhpcy5jb2duaXRvQ2xpZW50LnNlbmQobmV3IEFkbWluR2V0VXNlckNvbW1hbmQoe1xyXG4gICAgICAgIFVzZXJQb29sSWQ6IHRoaXMudXNlclBvb2xJZCxcclxuICAgICAgICBVc2VybmFtZTogZW1haWxcclxuICAgICAgfSkpO1xyXG5cclxuICAgICAgcmV0dXJuIHVzZXJSZXNwb25zZS5Vc2VyU3RhdHVzID09PSAnQ09ORklSTUVEJztcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICB9XHJcbn0iXX0=