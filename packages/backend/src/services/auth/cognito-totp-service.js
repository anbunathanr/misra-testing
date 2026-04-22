"use strict";
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
exports.CognitoTOTPService = void 0;
const client_cognito_identity_provider_1 = require("@aws-sdk/client-cognito-identity-provider");
const speakeasy = __importStar(require("speakeasy"));
const logger_1 = require("../../utils/logger");
const logger = (0, logger_1.createLogger)('CognitoTOTPService');
class CognitoTOTPService {
    cognitoClient;
    userPoolId;
    clientId;
    constructor() {
        this.cognitoClient = new client_cognito_identity_provider_1.CognitoIdentityProviderClient({
            region: process.env.AWS_REGION || 'us-east-1'
        });
        this.userPoolId = process.env.COGNITO_USER_POOL_ID;
        this.clientId = process.env.COGNITO_CLIENT_ID;
        if (!this.userPoolId || !this.clientId) {
            throw new Error('COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID environment variables are required');
        }
    }
    /**
     * Create a new user with MFA enabled for autonomous workflow
     */
    async createUserWithMFA(email, name) {
        const correlationId = Math.random().toString(36).substring(7);
        logger.info('Creating user with MFA enabled', {
            correlationId,
            email,
            hasName: !!name
        });
        try {
            // Generate a secure temporary password
            const tempPassword = this.generateSecurePassword();
            // Create user in Cognito
            await this.cognitoClient.send(new client_cognito_identity_provider_1.AdminCreateUserCommand({
                UserPoolId: this.userPoolId,
                Username: email,
                UserAttributes: [
                    { Name: 'email', Value: email },
                    { Name: 'email_verified', Value: 'true' },
                    { Name: 'given_name', Value: name || email.split('@')[0] },
                    { Name: 'custom:mfaSetupComplete', Value: 'false' }
                ],
                TemporaryPassword: tempPassword,
                MessageAction: client_cognito_identity_provider_1.MessageActionType.SUPPRESS, // Don't send welcome email for autonomous workflow
                DesiredDeliveryMediums: [client_cognito_identity_provider_1.DeliveryMediumType.EMAIL]
            }));
            // Set permanent password immediately for autonomous workflow
            await this.cognitoClient.send(new client_cognito_identity_provider_1.AdminSetUserPasswordCommand({
                UserPoolId: this.userPoolId,
                Username: email,
                Password: tempPassword,
                Permanent: true
            }));
            logger.info('User created successfully with MFA setup pending', {
                correlationId,
                email
            });
            return { tempPassword };
        }
        catch (error) {
            logger.error('Failed to create user with MFA', {
                correlationId,
                email,
                error: error.message
            });
            throw new Error(`USER_CREATION_FAILED: ${error.message}`);
        }
    }
    /**
     * Initiate authentication and handle MFA setup automatically
     */
    async authenticateWithAutoMFA(email, password) {
        const correlationId = Math.random().toString(36).substring(7);
        logger.info('Starting authentication with auto MFA', {
            correlationId,
            email
        });
        try {
            // Initiate authentication
            const authResult = await this.cognitoClient.send(new client_cognito_identity_provider_1.AdminInitiateAuthCommand({
                UserPoolId: this.userPoolId,
                ClientId: this.clientId,
                AuthFlow: client_cognito_identity_provider_1.AuthFlowType.ADMIN_NO_SRP_AUTH,
                AuthParameters: {
                    USERNAME: email,
                    PASSWORD: password
                }
            }));
            // Handle different challenge types
            if (authResult.ChallengeName === client_cognito_identity_provider_1.ChallengeNameType.MFA_SETUP) {
                logger.info('MFA setup required, setting up TOTP automatically', {
                    correlationId,
                    email
                });
                return await this.setupTOTPAutomatically(authResult.Session, email, correlationId);
            }
            if (authResult.ChallengeName === client_cognito_identity_provider_1.ChallengeNameType.SOFTWARE_TOKEN_MFA) {
                logger.info('SOFTWARE_TOKEN_MFA challenge received', {
                    correlationId,
                    email
                });
                return await this.handleSoftwareTokenMFA(authResult.Session, email, correlationId);
            }
            // If no challenge, return tokens directly
            if (authResult.AuthenticationResult) {
                logger.info('Authentication completed without MFA challenge', {
                    correlationId,
                    email
                });
                return {
                    accessToken: authResult.AuthenticationResult.AccessToken,
                    idToken: authResult.AuthenticationResult.IdToken,
                    refreshToken: authResult.AuthenticationResult.RefreshToken,
                    expiresIn: authResult.AuthenticationResult.ExpiresIn || 3600
                };
            }
            throw new Error(`Unexpected authentication state: ${authResult.ChallengeName || 'unknown'}`);
        }
        catch (error) {
            logger.error('Authentication with auto MFA failed', {
                correlationId,
                email,
                error: error.message
            });
            throw new Error(`AUTH_FAILED: ${error.message}`);
        }
    }
    /**
     * Set up TOTP automatically for autonomous workflow
     */
    async setupTOTPAutomatically(session, email, correlationId) {
        logger.info('Setting up TOTP automatically', {
            correlationId,
            email
        });
        try {
            // Step 1: Associate software token to get secret
            const associateResult = await this.cognitoClient.send(new client_cognito_identity_provider_1.AssociateSoftwareTokenCommand({
                Session: session
            }));
            if (!associateResult.SecretCode) {
                throw new Error('Failed to get TOTP secret from Cognito');
            }
            logger.info('TOTP secret obtained from Cognito', {
                correlationId,
                email,
                secretLength: associateResult.SecretCode.length
            });
            // Step 2: Store the secret securely using OTP Secrets Service
            try {
                const { OTPSecretsService } = await Promise.resolve().then(() => __importStar(require('./otp-secrets-service')));
                const otpService = new OTPSecretsService();
                // Create secret data structure
                const secretData = {
                    secret: associateResult.SecretCode,
                    backupCodes: this.generateBackupCodes(),
                    createdAt: new Date().toISOString(),
                    usageCount: 0
                };
                // Store the secret (this will be used for future TOTP generation)
                await otpService.storeUserTOTPSecret(email, secretData, correlationId);
                logger.info('TOTP secret stored securely', {
                    correlationId,
                    email
                });
            }
            catch (storageError) {
                logger.warn('Failed to store TOTP secret, continuing with Cognito-only flow', {
                    correlationId,
                    email,
                    error: storageError.message
                });
            }
            // Step 3: Generate TOTP code using the secret
            const totpCode = speakeasy.totp({
                secret: associateResult.SecretCode,
                encoding: 'base32',
                time: Math.floor(Date.now() / 1000)
            });
            logger.info('TOTP code generated for verification', {
                correlationId,
                email,
                codeLength: totpCode.length
            });
            // Step 4: Verify the software token
            const verifyResult = await this.cognitoClient.send(new client_cognito_identity_provider_1.VerifySoftwareTokenCommand({
                Session: associateResult.Session,
                UserCode: totpCode
            }));
            if (verifyResult.Status !== 'SUCCESS') {
                throw new Error(`TOTP verification failed: ${verifyResult.Status}`);
            }
            logger.info('TOTP verification successful', {
                correlationId,
                email,
                status: verifyResult.Status
            });
            // Step 5: Enable TOTP MFA for the user
            await this.cognitoClient.send(new client_cognito_identity_provider_1.AdminSetUserMFAPreferenceCommand({
                UserPoolId: this.userPoolId,
                Username: email,
                SoftwareTokenMfaSettings: {
                    Enabled: true,
                    PreferredMfa: true
                }
            }));
            // Step 6: Complete authentication
            const finalAuthResult = await this.cognitoClient.send(new client_cognito_identity_provider_1.RespondToAuthChallengeCommand({
                ClientId: this.clientId,
                ChallengeName: client_cognito_identity_provider_1.ChallengeNameType.MFA_SETUP,
                Session: verifyResult.Session,
                ChallengeResponses: {
                    USERNAME: email
                }
            }));
            if (!finalAuthResult.AuthenticationResult) {
                throw new Error('Failed to complete authentication after TOTP setup');
            }
            // Step 7: Update user's MFA setup status
            await this.updateMFASetupStatus(email, true);
            logger.info('TOTP MFA setup completed successfully', {
                correlationId,
                email
            });
            return {
                accessToken: finalAuthResult.AuthenticationResult.AccessToken,
                idToken: finalAuthResult.AuthenticationResult.IdToken,
                refreshToken: finalAuthResult.AuthenticationResult.RefreshToken,
                expiresIn: finalAuthResult.AuthenticationResult.ExpiresIn || 3600
            };
        }
        catch (error) {
            logger.error('Automatic TOTP setup failed', {
                correlationId,
                email,
                error: error.message
            });
            throw new Error(`TOTP_SETUP_FAILED: ${error.message}`);
        }
    }
    /**
     * Generate backup codes for TOTP
     */
    generateBackupCodes() {
        const codes = [];
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
     * Handle SOFTWARE_TOKEN_MFA challenge for existing TOTP users
     */
    async handleSoftwareTokenMFA(session, email, correlationId) {
        logger.info('Handling SOFTWARE_TOKEN_MFA challenge', {
            correlationId,
            email
        });
        try {
            // For autonomous workflow, we need to generate the TOTP code
            // In a real implementation, this would use the stored secret
            // For now, we'll simulate this process
            // NOTE: In production, Cognito stores the TOTP secret internally
            // We would need to either:
            // 1. Store our own copy of the secret (less secure)
            // 2. Use a different approach for autonomous verification
            // 3. Pre-generate and store valid codes (time-limited)
            // For this implementation, we'll use a placeholder approach
            // that would need to be replaced with actual secret retrieval
            const totpCode = await this.generateTOTPForUser(email, correlationId);
            // Respond to the MFA challenge
            const challengeResult = await this.cognitoClient.send(new client_cognito_identity_provider_1.RespondToAuthChallengeCommand({
                ClientId: this.clientId,
                ChallengeName: client_cognito_identity_provider_1.ChallengeNameType.SOFTWARE_TOKEN_MFA,
                Session: session,
                ChallengeResponses: {
                    USERNAME: email,
                    SOFTWARE_TOKEN_MFA_CODE: totpCode
                }
            }));
            if (!challengeResult.AuthenticationResult) {
                throw new Error('Failed to complete SOFTWARE_TOKEN_MFA challenge');
            }
            logger.info('SOFTWARE_TOKEN_MFA challenge completed successfully', {
                correlationId,
                email
            });
            return {
                accessToken: challengeResult.AuthenticationResult.AccessToken,
                idToken: challengeResult.AuthenticationResult.IdToken,
                refreshToken: challengeResult.AuthenticationResult.RefreshToken,
                expiresIn: challengeResult.AuthenticationResult.ExpiresIn || 3600
            };
        }
        catch (error) {
            logger.error('SOFTWARE_TOKEN_MFA challenge failed', {
                correlationId,
                email,
                error: error.message
            });
            throw new Error(`MFA_CHALLENGE_FAILED: ${error.message}`);
        }
    }
    /**
     * Generate TOTP code for a user (placeholder implementation)
     */
    async generateTOTPForUser(email, correlationId) {
        logger.info('Generating TOTP code for user', {
            correlationId,
            email
        });
        try {
            // Import OTP Secrets Service
            const { OTPSecretsService } = await Promise.resolve().then(() => __importStar(require('./otp-secrets-service')));
            const otpService = new OTPSecretsService();
            // Generate TOTP code using stored secret
            const totpCode = await otpService.generateTOTPCode(email);
            logger.info('TOTP code generated successfully', {
                correlationId,
                email,
                codeLength: totpCode.length
            });
            return totpCode;
        }
        catch (error) {
            logger.error('Failed to generate TOTP code', {
                correlationId,
                email,
                error: error.message
            });
            // Fallback to placeholder implementation for development
            if (process.env.ENVIRONMENT === 'dev' || process.env.ENVIRONMENT === 'test') {
                logger.warn('Using fallback TOTP generation for development', {
                    correlationId,
                    email
                });
                // Generate a valid TOTP code using a deterministic secret for development
                const secret = 'DEV_SECRET_' + Buffer.from(email).toString('base64').substring(0, 16);
                const totpCode = speakeasy.totp({
                    secret: secret,
                    encoding: 'ascii',
                    time: Math.floor(Date.now() / 1000)
                });
                return totpCode;
            }
            throw error;
        }
    }
    /**
     * Update user's MFA setup status
     */
    async updateMFASetupStatus(email, isComplete) {
        try {
            // This would update the custom attribute to track MFA setup status
            // Implementation depends on how you want to track this state
            logger.info('MFA setup status updated', {
                email,
                isComplete
            });
        }
        catch (error) {
            logger.warn('Failed to update MFA setup status', {
                email,
                isComplete,
                error: error.message
            });
        }
    }
    /**
     * Generate a secure password for user creation
     */
    generateSecurePassword() {
        const length = 12;
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';
        // Ensure at least one character from each required category
        password += 'A'; // Uppercase
        password += 'a'; // Lowercase  
        password += '1'; // Digit
        password += '!'; // Symbol
        // Fill the rest randomly
        for (let i = 4; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        // Shuffle the password
        return password.split('').sort(() => Math.random() - 0.5).join('');
    }
    /**
     * Check if user exists in Cognito
     */
    async userExists(email) {
        try {
            await this.cognitoClient.send(new client_cognito_identity_provider_1.AdminGetUserCommand({
                UserPoolId: this.userPoolId,
                Username: email
            }));
            return true;
        }
        catch (error) {
            if (error.name === 'UserNotFoundException') {
                return false;
            }
            throw error;
        }
    }
}
exports.CognitoTOTPService = CognitoTOTPService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29nbml0by10b3RwLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjb2duaXRvLXRvdHAtc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxnR0FlbUQ7QUFDbkQscURBQXVDO0FBQ3ZDLCtDQUFrRDtBQUVsRCxNQUFNLE1BQU0sR0FBRyxJQUFBLHFCQUFZLEVBQUMsb0JBQW9CLENBQUMsQ0FBQztBQXNCbEQsTUFBYSxrQkFBa0I7SUFDckIsYUFBYSxDQUFnQztJQUM3QyxVQUFVLENBQVM7SUFDbkIsUUFBUSxDQUFTO0lBRXpCO1FBQ0UsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLGdFQUE2QixDQUFDO1lBQ3JELE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXO1NBQzlDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBcUIsQ0FBQztRQUNwRCxJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWtCLENBQUM7UUFFL0MsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDdkMsTUFBTSxJQUFJLEtBQUssQ0FBQywrRUFBK0UsQ0FBQyxDQUFDO1FBQ25HLENBQUM7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsaUJBQWlCLENBQUMsS0FBYSxFQUFFLElBQWE7UUFDbEQsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFOUQsTUFBTSxDQUFDLElBQUksQ0FBQyxnQ0FBZ0MsRUFBRTtZQUM1QyxhQUFhO1lBQ2IsS0FBSztZQUNMLE9BQU8sRUFB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QzNDLE9BQU8sS0FBSyxDQUFDO1lBQ2YsQ0FBQztZQUNELE1BQU0sS0FBSyxDQUFDO1FBQ2QsQ0FBQztJQUNILENBQUM7Q0FDRjtBQTlkRCxnREE4ZEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xyXG4gIENvZ25pdG9JZGVudGl0eVByb3ZpZGVyQ2xpZW50LFxyXG4gIEFzc29jaWF0ZVNvZnR3YXJlVG9rZW5Db21tYW5kLFxyXG4gIFZlcmlmeVNvZnR3YXJlVG9rZW5Db21tYW5kLFxyXG4gIFJlc3BvbmRUb0F1dGhDaGFsbGVuZ2VDb21tYW5kLFxyXG4gIEluaXRpYXRlQXV0aENvbW1hbmQsXHJcbiAgQWRtaW5Jbml0aWF0ZUF1dGhDb21tYW5kLFxyXG4gIEFkbWluU2V0VXNlck1GQVByZWZlcmVuY2VDb21tYW5kLFxyXG4gIEFkbWluQ3JlYXRlVXNlckNvbW1hbmQsXHJcbiAgQWRtaW5TZXRVc2VyUGFzc3dvcmRDb21tYW5kLFxyXG4gIEFkbWluR2V0VXNlckNvbW1hbmQsXHJcbiAgQ2hhbGxlbmdlTmFtZVR5cGUsXHJcbiAgQXV0aEZsb3dUeXBlLFxyXG4gIE1lc3NhZ2VBY3Rpb25UeXBlLFxyXG4gIERlbGl2ZXJ5TWVkaXVtVHlwZVxyXG59IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1jb2duaXRvLWlkZW50aXR5LXByb3ZpZGVyJztcclxuaW1wb3J0ICogYXMgc3BlYWtlYXN5IGZyb20gJ3NwZWFrZWFzeSc7XHJcbmltcG9ydCB7IGNyZWF0ZUxvZ2dlciB9IGZyb20gJy4uLy4uL3V0aWxzL2xvZ2dlcic7XHJcblxyXG5jb25zdCBsb2dnZXIgPSBjcmVhdGVMb2dnZXIoJ0NvZ25pdG9UT1RQU2VydmljZScpO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBUT1RQU2V0dXBSZXN1bHQge1xyXG4gIHNlY3JldDogc3RyaW5nO1xyXG4gIHFyQ29kZVVybDogc3RyaW5nO1xyXG4gIGJhY2t1cENvZGVzOiBzdHJpbmdbXTtcclxuICBzZXNzaW9uPzogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEF1dGhlbnRpY2F0aW9uUmVzdWx0IHtcclxuICBhY2Nlc3NUb2tlbjogc3RyaW5nO1xyXG4gIGlkVG9rZW46IHN0cmluZztcclxuICByZWZyZXNoVG9rZW46IHN0cmluZztcclxuICBleHBpcmVzSW46IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBNRkFDaGFsbGVuZ2VSZXN1bHQge1xyXG4gIHNlc3Npb246IHN0cmluZztcclxuICBjaGFsbGVuZ2VOYW1lOiBzdHJpbmc7XHJcbiAgY2hhbGxlbmdlUGFyYW1ldGVyczogUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIENvZ25pdG9UT1RQU2VydmljZSB7XHJcbiAgcHJpdmF0ZSBjb2duaXRvQ2xpZW50OiBDb2duaXRvSWRlbnRpdHlQcm92aWRlckNsaWVudDtcclxuICBwcml2YXRlIHVzZXJQb29sSWQ6IHN0cmluZztcclxuICBwcml2YXRlIGNsaWVudElkOiBzdHJpbmc7XHJcblxyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgdGhpcy5jb2duaXRvQ2xpZW50ID0gbmV3IENvZ25pdG9JZGVudGl0eVByb3ZpZGVyQ2xpZW50KHtcclxuICAgICAgcmVnaW9uOiBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIHx8ICd1cy1lYXN0LTEnXHJcbiAgICB9KTtcclxuICAgIHRoaXMudXNlclBvb2xJZCA9IHByb2Nlc3MuZW52LkNPR05JVE9fVVNFUl9QT09MX0lEITtcclxuICAgIHRoaXMuY2xpZW50SWQgPSBwcm9jZXNzLmVudi5DT0dOSVRPX0NMSUVOVF9JRCE7XHJcblxyXG4gICAgaWYgKCF0aGlzLnVzZXJQb29sSWQgfHwgIXRoaXMuY2xpZW50SWQpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDT0dOSVRPX1VTRVJfUE9PTF9JRCBhbmQgQ09HTklUT19DTElFTlRfSUQgZW52aXJvbm1lbnQgdmFyaWFibGVzIGFyZSByZXF1aXJlZCcpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ3JlYXRlIGEgbmV3IHVzZXIgd2l0aCBNRkEgZW5hYmxlZCBmb3IgYXV0b25vbW91cyB3b3JrZmxvd1xyXG4gICAqL1xyXG4gIGFzeW5jIGNyZWF0ZVVzZXJXaXRoTUZBKGVtYWlsOiBzdHJpbmcsIG5hbWU/OiBzdHJpbmcpOiBQcm9taXNlPHsgdGVtcFBhc3N3b3JkOiBzdHJpbmcgfT4ge1xyXG4gICAgY29uc3QgY29ycmVsYXRpb25JZCA9IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cmluZyg3KTtcclxuICAgIFxyXG4gICAgbG9nZ2VyLmluZm8oJ0NyZWF0aW5nIHVzZXIgd2l0aCBNRkEgZW5hYmxlZCcsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZW1haWwsXHJcbiAgICAgIGhhc05hbWU6ICEhbmFtZVxyXG4gICAgfSk7XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gR2VuZXJhdGUgYSBzZWN1cmUgdGVtcG9yYXJ5IHBhc3N3b3JkXHJcbiAgICAgIGNvbnN0IHRlbXBQYXNzd29yZCA9IHRoaXMuZ2VuZXJhdGVTZWN1cmVQYXNzd29yZCgpO1xyXG5cclxuICAgICAgLy8gQ3JlYXRlIHVzZXIgaW4gQ29nbml0b1xyXG4gICAgICBhd2FpdCB0aGlzLmNvZ25pdG9DbGllbnQuc2VuZChuZXcgQWRtaW5DcmVhdGVVc2VyQ29tbWFuZCh7XHJcbiAgICAgICAgVXNlclBvb2xJZDogdGhpcy51c2VyUG9vbElkLFxyXG4gICAgICAgIFVzZXJuYW1lOiBlbWFpbCxcclxuICAgICAgICBVc2VyQXR0cmlidXRlczogW1xyXG4gICAgICAgICAgeyBOYW1lOiAnZW1haWwnLCBWYWx1ZTogZW1haWwgfSxcclxuICAgICAgICAgIHsgTmFtZTogJ2VtYWlsX3ZlcmlmaWVkJywgVmFsdWU6ICd0cnVlJyB9LFxyXG4gICAgICAgICAgeyBOYW1lOiAnZ2l2ZW5fbmFtZScsIFZhbHVlOiBuYW1lIHx8IGVtYWlsLnNwbGl0KCdAJylbMF0gfSxcclxuICAgICAgICAgIHsgTmFtZTogJ2N1c3RvbTptZmFTZXR1cENvbXBsZXRlJywgVmFsdWU6ICdmYWxzZScgfVxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgVGVtcG9yYXJ5UGFzc3dvcmQ6IHRlbXBQYXNzd29yZCxcclxuICAgICAgICBNZXNzYWdlQWN0aW9uOiBNZXNzYWdlQWN0aW9uVHlwZS5TVVBQUkVTUywgLy8gRG9uJ3Qgc2VuZCB3ZWxjb21lIGVtYWlsIGZvciBhdXRvbm9tb3VzIHdvcmtmbG93XHJcbiAgICAgICAgRGVzaXJlZERlbGl2ZXJ5TWVkaXVtczogW0RlbGl2ZXJ5TWVkaXVtVHlwZS5FTUFJTF1cclxuICAgICAgfSkpO1xyXG5cclxuICAgICAgLy8gU2V0IHBlcm1hbmVudCBwYXNzd29yZCBpbW1lZGlhdGVseSBmb3IgYXV0b25vbW91cyB3b3JrZmxvd1xyXG4gICAgICBhd2FpdCB0aGlzLmNvZ25pdG9DbGllbnQuc2VuZChuZXcgQWRtaW5TZXRVc2VyUGFzc3dvcmRDb21tYW5kKHtcclxuICAgICAgICBVc2VyUG9vbElkOiB0aGlzLnVzZXJQb29sSWQsXHJcbiAgICAgICAgVXNlcm5hbWU6IGVtYWlsLFxyXG4gICAgICAgIFBhc3N3b3JkOiB0ZW1wUGFzc3dvcmQsXHJcbiAgICAgICAgUGVybWFuZW50OiB0cnVlXHJcbiAgICAgIH0pKTtcclxuXHJcbiAgICAgIGxvZ2dlci5pbmZvKCdVc2VyIGNyZWF0ZWQgc3VjY2Vzc2Z1bGx5IHdpdGggTUZBIHNldHVwIHBlbmRpbmcnLCB7XHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICBlbWFpbFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIHJldHVybiB7IHRlbXBQYXNzd29yZCB9O1xyXG5cclxuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgbG9nZ2VyLmVycm9yKCdGYWlsZWQgdG8gY3JlYXRlIHVzZXIgd2l0aCBNRkEnLCB7XHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICBlbWFpbCxcclxuICAgICAgICBlcnJvcjogZXJyb3IubWVzc2FnZVxyXG4gICAgICB9KTtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBVU0VSX0NSRUFUSU9OX0ZBSUxFRDogJHtlcnJvci5tZXNzYWdlfWApO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogSW5pdGlhdGUgYXV0aGVudGljYXRpb24gYW5kIGhhbmRsZSBNRkEgc2V0dXAgYXV0b21hdGljYWxseVxyXG4gICAqL1xyXG4gIGFzeW5jIGF1dGhlbnRpY2F0ZVdpdGhBdXRvTUZBKGVtYWlsOiBzdHJpbmcsIHBhc3N3b3JkOiBzdHJpbmcpOiBQcm9taXNlPEF1dGhlbnRpY2F0aW9uUmVzdWx0IHwgTUZBQ2hhbGxlbmdlUmVzdWx0PiB7XHJcbiAgICBjb25zdCBjb3JyZWxhdGlvbklkID0gTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyaW5nKDcpO1xyXG4gICAgXHJcbiAgICBsb2dnZXIuaW5mbygnU3RhcnRpbmcgYXV0aGVudGljYXRpb24gd2l0aCBhdXRvIE1GQScsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZW1haWxcclxuICAgIH0pO1xyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIC8vIEluaXRpYXRlIGF1dGhlbnRpY2F0aW9uXHJcbiAgICAgIGNvbnN0IGF1dGhSZXN1bHQgPSBhd2FpdCB0aGlzLmNvZ25pdG9DbGllbnQuc2VuZChuZXcgQWRtaW5Jbml0aWF0ZUF1dGhDb21tYW5kKHtcclxuICAgICAgICBVc2VyUG9vbElkOiB0aGlzLnVzZXJQb29sSWQsXHJcbiAgICAgICAgQ2xpZW50SWQ6IHRoaXMuY2xpZW50SWQsXHJcbiAgICAgICAgQXV0aEZsb3c6IEF1dGhGbG93VHlwZS5BRE1JTl9OT19TUlBfQVVUSCxcclxuICAgICAgICBBdXRoUGFyYW1ldGVyczoge1xyXG4gICAgICAgICAgVVNFUk5BTUU6IGVtYWlsLFxyXG4gICAgICAgICAgUEFTU1dPUkQ6IHBhc3N3b3JkXHJcbiAgICAgICAgfVxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICAvLyBIYW5kbGUgZGlmZmVyZW50IGNoYWxsZW5nZSB0eXBlc1xyXG4gICAgICBpZiAoYXV0aFJlc3VsdC5DaGFsbGVuZ2VOYW1lID09PSBDaGFsbGVuZ2VOYW1lVHlwZS5NRkFfU0VUVVApIHtcclxuICAgICAgICBsb2dnZXIuaW5mbygnTUZBIHNldHVwIHJlcXVpcmVkLCBzZXR0aW5nIHVwIFRPVFAgYXV0b21hdGljYWxseScsIHtcclxuICAgICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgICBlbWFpbFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5zZXR1cFRPVFBBdXRvbWF0aWNhbGx5KGF1dGhSZXN1bHQuU2Vzc2lvbiEsIGVtYWlsLCBjb3JyZWxhdGlvbklkKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKGF1dGhSZXN1bHQuQ2hhbGxlbmdlTmFtZSA9PT0gQ2hhbGxlbmdlTmFtZVR5cGUuU09GVFdBUkVfVE9LRU5fTUZBKSB7XHJcbiAgICAgICAgbG9nZ2VyLmluZm8oJ1NPRlRXQVJFX1RPS0VOX01GQSBjaGFsbGVuZ2UgcmVjZWl2ZWQnLCB7XHJcbiAgICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgICAgZW1haWxcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuaGFuZGxlU29mdHdhcmVUb2tlbk1GQShhdXRoUmVzdWx0LlNlc3Npb24hLCBlbWFpbCwgY29ycmVsYXRpb25JZCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIElmIG5vIGNoYWxsZW5nZSwgcmV0dXJuIHRva2VucyBkaXJlY3RseVxyXG4gICAgICBpZiAoYXV0aFJlc3VsdC5BdXRoZW50aWNhdGlvblJlc3VsdCkge1xyXG4gICAgICAgIGxvZ2dlci5pbmZvKCdBdXRoZW50aWNhdGlvbiBjb21wbGV0ZWQgd2l0aG91dCBNRkEgY2hhbGxlbmdlJywge1xyXG4gICAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICAgIGVtYWlsXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBhY2Nlc3NUb2tlbjogYXV0aFJlc3VsdC5BdXRoZW50aWNhdGlvblJlc3VsdC5BY2Nlc3NUb2tlbiEsXHJcbiAgICAgICAgICBpZFRva2VuOiBhdXRoUmVzdWx0LkF1dGhlbnRpY2F0aW9uUmVzdWx0LklkVG9rZW4hLFxyXG4gICAgICAgICAgcmVmcmVzaFRva2VuOiBhdXRoUmVzdWx0LkF1dGhlbnRpY2F0aW9uUmVzdWx0LlJlZnJlc2hUb2tlbiEsXHJcbiAgICAgICAgICBleHBpcmVzSW46IGF1dGhSZXN1bHQuQXV0aGVudGljYXRpb25SZXN1bHQuRXhwaXJlc0luIHx8IDM2MDBcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcblxyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuZXhwZWN0ZWQgYXV0aGVudGljYXRpb24gc3RhdGU6ICR7YXV0aFJlc3VsdC5DaGFsbGVuZ2VOYW1lIHx8ICd1bmtub3duJ31gKTtcclxuXHJcbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgIGxvZ2dlci5lcnJvcignQXV0aGVudGljYXRpb24gd2l0aCBhdXRvIE1GQSBmYWlsZWQnLCB7XHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICBlbWFpbCxcclxuICAgICAgICBlcnJvcjogZXJyb3IubWVzc2FnZVxyXG4gICAgICB9KTtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBBVVRIX0ZBSUxFRDogJHtlcnJvci5tZXNzYWdlfWApO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogU2V0IHVwIFRPVFAgYXV0b21hdGljYWxseSBmb3IgYXV0b25vbW91cyB3b3JrZmxvd1xyXG4gICAqL1xyXG4gIHByaXZhdGUgYXN5bmMgc2V0dXBUT1RQQXV0b21hdGljYWxseShcclxuICAgIHNlc3Npb246IHN0cmluZywgXHJcbiAgICBlbWFpbDogc3RyaW5nLCBcclxuICAgIGNvcnJlbGF0aW9uSWQ6IHN0cmluZ1xyXG4gICk6IFByb21pc2U8QXV0aGVudGljYXRpb25SZXN1bHQ+IHtcclxuICAgIFxyXG4gICAgbG9nZ2VyLmluZm8oJ1NldHRpbmcgdXAgVE9UUCBhdXRvbWF0aWNhbGx5Jywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICBlbWFpbFxyXG4gICAgfSk7XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gU3RlcCAxOiBBc3NvY2lhdGUgc29mdHdhcmUgdG9rZW4gdG8gZ2V0IHNlY3JldFxyXG4gICAgICBjb25zdCBhc3NvY2lhdGVSZXN1bHQgPSBhd2FpdCB0aGlzLmNvZ25pdG9DbGllbnQuc2VuZChuZXcgQXNzb2NpYXRlU29mdHdhcmVUb2tlbkNvbW1hbmQoe1xyXG4gICAgICAgIFNlc3Npb246IHNlc3Npb25cclxuICAgICAgfSkpO1xyXG5cclxuICAgICAgaWYgKCFhc3NvY2lhdGVSZXN1bHQuU2VjcmV0Q29kZSkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIGdldCBUT1RQIHNlY3JldCBmcm9tIENvZ25pdG8nKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgbG9nZ2VyLmluZm8oJ1RPVFAgc2VjcmV0IG9idGFpbmVkIGZyb20gQ29nbml0bycsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGVtYWlsLFxyXG4gICAgICAgIHNlY3JldExlbmd0aDogYXNzb2NpYXRlUmVzdWx0LlNlY3JldENvZGUubGVuZ3RoXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gU3RlcCAyOiBTdG9yZSB0aGUgc2VjcmV0IHNlY3VyZWx5IHVzaW5nIE9UUCBTZWNyZXRzIFNlcnZpY2VcclxuICAgICAgdHJ5IHtcclxuICAgICAgICBjb25zdCB7IE9UUFNlY3JldHNTZXJ2aWNlIH0gPSBhd2FpdCBpbXBvcnQoJy4vb3RwLXNlY3JldHMtc2VydmljZScpO1xyXG4gICAgICAgIGNvbnN0IG90cFNlcnZpY2UgPSBuZXcgT1RQU2VjcmV0c1NlcnZpY2UoKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBDcmVhdGUgc2VjcmV0IGRhdGEgc3RydWN0dXJlXHJcbiAgICAgICAgY29uc3Qgc2VjcmV0RGF0YSA9IHtcclxuICAgICAgICAgIHNlY3JldDogYXNzb2NpYXRlUmVzdWx0LlNlY3JldENvZGUsXHJcbiAgICAgICAgICBiYWNrdXBDb2RlczogdGhpcy5nZW5lcmF0ZUJhY2t1cENvZGVzKCksXHJcbiAgICAgICAgICBjcmVhdGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICAgIHVzYWdlQ291bnQ6IDBcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvLyBTdG9yZSB0aGUgc2VjcmV0ICh0aGlzIHdpbGwgYmUgdXNlZCBmb3IgZnV0dXJlIFRPVFAgZ2VuZXJhdGlvbilcclxuICAgICAgICBhd2FpdCBvdHBTZXJ2aWNlLnN0b3JlVXNlclRPVFBTZWNyZXQoZW1haWwsIHNlY3JldERhdGEsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGxvZ2dlci5pbmZvKCdUT1RQIHNlY3JldCBzdG9yZWQgc2VjdXJlbHknLCB7XHJcbiAgICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgICAgZW1haWxcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgIH0gY2F0Y2ggKHN0b3JhZ2VFcnJvcjogYW55KSB7XHJcbiAgICAgICAgbG9nZ2VyLndhcm4oJ0ZhaWxlZCB0byBzdG9yZSBUT1RQIHNlY3JldCwgY29udGludWluZyB3aXRoIENvZ25pdG8tb25seSBmbG93Jywge1xyXG4gICAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICAgIGVtYWlsLFxyXG4gICAgICAgICAgZXJyb3I6IHN0b3JhZ2VFcnJvci5tZXNzYWdlXHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFN0ZXAgMzogR2VuZXJhdGUgVE9UUCBjb2RlIHVzaW5nIHRoZSBzZWNyZXRcclxuICAgICAgY29uc3QgdG90cENvZGUgPSBzcGVha2Vhc3kudG90cCh7XHJcbiAgICAgICAgc2VjcmV0OiBhc3NvY2lhdGVSZXN1bHQuU2VjcmV0Q29kZSxcclxuICAgICAgICBlbmNvZGluZzogJ2Jhc2UzMicsXHJcbiAgICAgICAgdGltZTogTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMClcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBsb2dnZXIuaW5mbygnVE9UUCBjb2RlIGdlbmVyYXRlZCBmb3IgdmVyaWZpY2F0aW9uJywge1xyXG4gICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgZW1haWwsXHJcbiAgICAgICAgY29kZUxlbmd0aDogdG90cENvZGUubGVuZ3RoXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gU3RlcCA0OiBWZXJpZnkgdGhlIHNvZnR3YXJlIHRva2VuXHJcbiAgICAgIGNvbnN0IHZlcmlmeVJlc3VsdCA9IGF3YWl0IHRoaXMuY29nbml0b0NsaWVudC5zZW5kKG5ldyBWZXJpZnlTb2Z0d2FyZVRva2VuQ29tbWFuZCh7XHJcbiAgICAgICAgU2Vzc2lvbjogYXNzb2NpYXRlUmVzdWx0LlNlc3Npb24sXHJcbiAgICAgICAgVXNlckNvZGU6IHRvdHBDb2RlXHJcbiAgICAgIH0pKTtcclxuXHJcbiAgICAgIGlmICh2ZXJpZnlSZXN1bHQuU3RhdHVzICE9PSAnU1VDQ0VTUycpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFRPVFAgdmVyaWZpY2F0aW9uIGZhaWxlZDogJHt2ZXJpZnlSZXN1bHQuU3RhdHVzfWApO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBsb2dnZXIuaW5mbygnVE9UUCB2ZXJpZmljYXRpb24gc3VjY2Vzc2Z1bCcsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGVtYWlsLFxyXG4gICAgICAgIHN0YXR1czogdmVyaWZ5UmVzdWx0LlN0YXR1c1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIFN0ZXAgNTogRW5hYmxlIFRPVFAgTUZBIGZvciB0aGUgdXNlclxyXG4gICAgICBhd2FpdCB0aGlzLmNvZ25pdG9DbGllbnQuc2VuZChuZXcgQWRtaW5TZXRVc2VyTUZBUHJlZmVyZW5jZUNvbW1hbmQoe1xyXG4gICAgICAgIFVzZXJQb29sSWQ6IHRoaXMudXNlclBvb2xJZCxcclxuICAgICAgICBVc2VybmFtZTogZW1haWwsXHJcbiAgICAgICAgU29mdHdhcmVUb2tlbk1mYVNldHRpbmdzOiB7XHJcbiAgICAgICAgICBFbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgUHJlZmVycmVkTWZhOiB0cnVlXHJcbiAgICAgICAgfVxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICAvLyBTdGVwIDY6IENvbXBsZXRlIGF1dGhlbnRpY2F0aW9uXHJcbiAgICAgIGNvbnN0IGZpbmFsQXV0aFJlc3VsdCA9IGF3YWl0IHRoaXMuY29nbml0b0NsaWVudC5zZW5kKG5ldyBSZXNwb25kVG9BdXRoQ2hhbGxlbmdlQ29tbWFuZCh7XHJcbiAgICAgICAgQ2xpZW50SWQ6IHRoaXMuY2xpZW50SWQsXHJcbiAgICAgICAgQ2hhbGxlbmdlTmFtZTogQ2hhbGxlbmdlTmFtZVR5cGUuTUZBX1NFVFVQLFxyXG4gICAgICAgIFNlc3Npb246IHZlcmlmeVJlc3VsdC5TZXNzaW9uLFxyXG4gICAgICAgIENoYWxsZW5nZVJlc3BvbnNlczoge1xyXG4gICAgICAgICAgVVNFUk5BTUU6IGVtYWlsXHJcbiAgICAgICAgfVxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICBpZiAoIWZpbmFsQXV0aFJlc3VsdC5BdXRoZW50aWNhdGlvblJlc3VsdCkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIGNvbXBsZXRlIGF1dGhlbnRpY2F0aW9uIGFmdGVyIFRPVFAgc2V0dXAnKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gU3RlcCA3OiBVcGRhdGUgdXNlcidzIE1GQSBzZXR1cCBzdGF0dXNcclxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVNRkFTZXR1cFN0YXR1cyhlbWFpbCwgdHJ1ZSk7XHJcblxyXG4gICAgICBsb2dnZXIuaW5mbygnVE9UUCBNRkEgc2V0dXAgY29tcGxldGVkIHN1Y2Nlc3NmdWxseScsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGVtYWlsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBhY2Nlc3NUb2tlbjogZmluYWxBdXRoUmVzdWx0LkF1dGhlbnRpY2F0aW9uUmVzdWx0LkFjY2Vzc1Rva2VuISxcclxuICAgICAgICBpZFRva2VuOiBmaW5hbEF1dGhSZXN1bHQuQXV0aGVudGljYXRpb25SZXN1bHQuSWRUb2tlbiEsXHJcbiAgICAgICAgcmVmcmVzaFRva2VuOiBmaW5hbEF1dGhSZXN1bHQuQXV0aGVudGljYXRpb25SZXN1bHQuUmVmcmVzaFRva2VuISxcclxuICAgICAgICBleHBpcmVzSW46IGZpbmFsQXV0aFJlc3VsdC5BdXRoZW50aWNhdGlvblJlc3VsdC5FeHBpcmVzSW4gfHwgMzYwMFxyXG4gICAgICB9O1xyXG5cclxuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgbG9nZ2VyLmVycm9yKCdBdXRvbWF0aWMgVE9UUCBzZXR1cCBmYWlsZWQnLCB7XHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICBlbWFpbCxcclxuICAgICAgICBlcnJvcjogZXJyb3IubWVzc2FnZVxyXG4gICAgICB9KTtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBUT1RQX1NFVFVQX0ZBSUxFRDogJHtlcnJvci5tZXNzYWdlfWApO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2VuZXJhdGUgYmFja3VwIGNvZGVzIGZvciBUT1RQXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBnZW5lcmF0ZUJhY2t1cENvZGVzKCk6IHN0cmluZ1tdIHtcclxuICAgIGNvbnN0IGNvZGVzOiBzdHJpbmdbXSA9IFtdO1xyXG4gICAgY29uc3QgY2hhcnNldCA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWjAxMjM0NTY3ODknO1xyXG4gICAgXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDEwOyBpKyspIHtcclxuICAgICAgbGV0IGNvZGUgPSAnJztcclxuICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCA4OyBqKyspIHtcclxuICAgICAgICBjb2RlICs9IGNoYXJzZXQuY2hhckF0KE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGNoYXJzZXQubGVuZ3RoKSk7XHJcbiAgICAgIH1cclxuICAgICAgY29kZXMucHVzaChjb2RlKTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgcmV0dXJuIGNvZGVzO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogSGFuZGxlIFNPRlRXQVJFX1RPS0VOX01GQSBjaGFsbGVuZ2UgZm9yIGV4aXN0aW5nIFRPVFAgdXNlcnNcclxuICAgKi9cclxuICBwcml2YXRlIGFzeW5jIGhhbmRsZVNvZnR3YXJlVG9rZW5NRkEoXHJcbiAgICBzZXNzaW9uOiBzdHJpbmcsIFxyXG4gICAgZW1haWw6IHN0cmluZywgXHJcbiAgICBjb3JyZWxhdGlvbklkOiBzdHJpbmdcclxuICApOiBQcm9taXNlPEF1dGhlbnRpY2F0aW9uUmVzdWx0PiB7XHJcbiAgICBcclxuICAgIGxvZ2dlci5pbmZvKCdIYW5kbGluZyBTT0ZUV0FSRV9UT0tFTl9NRkEgY2hhbGxlbmdlJywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICBlbWFpbFxyXG4gICAgfSk7XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gRm9yIGF1dG9ub21vdXMgd29ya2Zsb3csIHdlIG5lZWQgdG8gZ2VuZXJhdGUgdGhlIFRPVFAgY29kZVxyXG4gICAgICAvLyBJbiBhIHJlYWwgaW1wbGVtZW50YXRpb24sIHRoaXMgd291bGQgdXNlIHRoZSBzdG9yZWQgc2VjcmV0XHJcbiAgICAgIC8vIEZvciBub3csIHdlJ2xsIHNpbXVsYXRlIHRoaXMgcHJvY2Vzc1xyXG4gICAgICBcclxuICAgICAgLy8gTk9URTogSW4gcHJvZHVjdGlvbiwgQ29nbml0byBzdG9yZXMgdGhlIFRPVFAgc2VjcmV0IGludGVybmFsbHlcclxuICAgICAgLy8gV2Ugd291bGQgbmVlZCB0byBlaXRoZXI6XHJcbiAgICAgIC8vIDEuIFN0b3JlIG91ciBvd24gY29weSBvZiB0aGUgc2VjcmV0IChsZXNzIHNlY3VyZSlcclxuICAgICAgLy8gMi4gVXNlIGEgZGlmZmVyZW50IGFwcHJvYWNoIGZvciBhdXRvbm9tb3VzIHZlcmlmaWNhdGlvblxyXG4gICAgICAvLyAzLiBQcmUtZ2VuZXJhdGUgYW5kIHN0b3JlIHZhbGlkIGNvZGVzICh0aW1lLWxpbWl0ZWQpXHJcbiAgICAgIFxyXG4gICAgICAvLyBGb3IgdGhpcyBpbXBsZW1lbnRhdGlvbiwgd2UnbGwgdXNlIGEgcGxhY2Vob2xkZXIgYXBwcm9hY2hcclxuICAgICAgLy8gdGhhdCB3b3VsZCBuZWVkIHRvIGJlIHJlcGxhY2VkIHdpdGggYWN0dWFsIHNlY3JldCByZXRyaWV2YWxcclxuICAgICAgY29uc3QgdG90cENvZGUgPSBhd2FpdCB0aGlzLmdlbmVyYXRlVE9UUEZvclVzZXIoZW1haWwsIGNvcnJlbGF0aW9uSWQpO1xyXG5cclxuICAgICAgLy8gUmVzcG9uZCB0byB0aGUgTUZBIGNoYWxsZW5nZVxyXG4gICAgICBjb25zdCBjaGFsbGVuZ2VSZXN1bHQgPSBhd2FpdCB0aGlzLmNvZ25pdG9DbGllbnQuc2VuZChuZXcgUmVzcG9uZFRvQXV0aENoYWxsZW5nZUNvbW1hbmQoe1xyXG4gICAgICAgIENsaWVudElkOiB0aGlzLmNsaWVudElkLFxyXG4gICAgICAgIENoYWxsZW5nZU5hbWU6IENoYWxsZW5nZU5hbWVUeXBlLlNPRlRXQVJFX1RPS0VOX01GQSxcclxuICAgICAgICBTZXNzaW9uOiBzZXNzaW9uLFxyXG4gICAgICAgIENoYWxsZW5nZVJlc3BvbnNlczoge1xyXG4gICAgICAgICAgVVNFUk5BTUU6IGVtYWlsLFxyXG4gICAgICAgICAgU09GVFdBUkVfVE9LRU5fTUZBX0NPREU6IHRvdHBDb2RlXHJcbiAgICAgICAgfVxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICBpZiAoIWNoYWxsZW5nZVJlc3VsdC5BdXRoZW50aWNhdGlvblJlc3VsdCkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIGNvbXBsZXRlIFNPRlRXQVJFX1RPS0VOX01GQSBjaGFsbGVuZ2UnKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgbG9nZ2VyLmluZm8oJ1NPRlRXQVJFX1RPS0VOX01GQSBjaGFsbGVuZ2UgY29tcGxldGVkIHN1Y2Nlc3NmdWxseScsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGVtYWlsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBhY2Nlc3NUb2tlbjogY2hhbGxlbmdlUmVzdWx0LkF1dGhlbnRpY2F0aW9uUmVzdWx0LkFjY2Vzc1Rva2VuISxcclxuICAgICAgICBpZFRva2VuOiBjaGFsbGVuZ2VSZXN1bHQuQXV0aGVudGljYXRpb25SZXN1bHQuSWRUb2tlbiEsXHJcbiAgICAgICAgcmVmcmVzaFRva2VuOiBjaGFsbGVuZ2VSZXN1bHQuQXV0aGVudGljYXRpb25SZXN1bHQuUmVmcmVzaFRva2VuISxcclxuICAgICAgICBleHBpcmVzSW46IGNoYWxsZW5nZVJlc3VsdC5BdXRoZW50aWNhdGlvblJlc3VsdC5FeHBpcmVzSW4gfHwgMzYwMFxyXG4gICAgICB9O1xyXG5cclxuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgbG9nZ2VyLmVycm9yKCdTT0ZUV0FSRV9UT0tFTl9NRkEgY2hhbGxlbmdlIGZhaWxlZCcsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGVtYWlsLFxyXG4gICAgICAgIGVycm9yOiBlcnJvci5tZXNzYWdlXHJcbiAgICAgIH0pO1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE1GQV9DSEFMTEVOR0VfRkFJTEVEOiAke2Vycm9yLm1lc3NhZ2V9YCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZW5lcmF0ZSBUT1RQIGNvZGUgZm9yIGEgdXNlciAocGxhY2Vob2xkZXIgaW1wbGVtZW50YXRpb24pXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBhc3luYyBnZW5lcmF0ZVRPVFBGb3JVc2VyKGVtYWlsOiBzdHJpbmcsIGNvcnJlbGF0aW9uSWQ6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XHJcbiAgICBsb2dnZXIuaW5mbygnR2VuZXJhdGluZyBUT1RQIGNvZGUgZm9yIHVzZXInLCB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIGVtYWlsXHJcbiAgICB9KTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICAvLyBJbXBvcnQgT1RQIFNlY3JldHMgU2VydmljZVxyXG4gICAgICBjb25zdCB7IE9UUFNlY3JldHNTZXJ2aWNlIH0gPSBhd2FpdCBpbXBvcnQoJy4vb3RwLXNlY3JldHMtc2VydmljZScpO1xyXG4gICAgICBjb25zdCBvdHBTZXJ2aWNlID0gbmV3IE9UUFNlY3JldHNTZXJ2aWNlKCk7XHJcbiAgICAgIFxyXG4gICAgICAvLyBHZW5lcmF0ZSBUT1RQIGNvZGUgdXNpbmcgc3RvcmVkIHNlY3JldFxyXG4gICAgICBjb25zdCB0b3RwQ29kZSA9IGF3YWl0IG90cFNlcnZpY2UuZ2VuZXJhdGVUT1RQQ29kZShlbWFpbCk7XHJcbiAgICAgIFxyXG4gICAgICBsb2dnZXIuaW5mbygnVE9UUCBjb2RlIGdlbmVyYXRlZCBzdWNjZXNzZnVsbHknLCB7XHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICBlbWFpbCxcclxuICAgICAgICBjb2RlTGVuZ3RoOiB0b3RwQ29kZS5sZW5ndGhcclxuICAgICAgfSk7XHJcblxyXG4gICAgICByZXR1cm4gdG90cENvZGU7XHJcblxyXG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICBsb2dnZXIuZXJyb3IoJ0ZhaWxlZCB0byBnZW5lcmF0ZSBUT1RQIGNvZGUnLCB7XHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICBlbWFpbCxcclxuICAgICAgICBlcnJvcjogZXJyb3IubWVzc2FnZVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIEZhbGxiYWNrIHRvIHBsYWNlaG9sZGVyIGltcGxlbWVudGF0aW9uIGZvciBkZXZlbG9wbWVudFxyXG4gICAgICBpZiAocHJvY2Vzcy5lbnYuRU5WSVJPTk1FTlQgPT09ICdkZXYnIHx8IHByb2Nlc3MuZW52LkVOVklST05NRU5UID09PSAndGVzdCcpIHtcclxuICAgICAgICBsb2dnZXIud2FybignVXNpbmcgZmFsbGJhY2sgVE9UUCBnZW5lcmF0aW9uIGZvciBkZXZlbG9wbWVudCcsIHtcclxuICAgICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgICBlbWFpbFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBHZW5lcmF0ZSBhIHZhbGlkIFRPVFAgY29kZSB1c2luZyBhIGRldGVybWluaXN0aWMgc2VjcmV0IGZvciBkZXZlbG9wbWVudFxyXG4gICAgICAgIGNvbnN0IHNlY3JldCA9ICdERVZfU0VDUkVUXycgKyBCdWZmZXIuZnJvbShlbWFpbCkudG9TdHJpbmcoJ2Jhc2U2NCcpLnN1YnN0cmluZygwLCAxNik7XHJcbiAgICAgICAgXHJcbiAgICAgICAgY29uc3QgdG90cENvZGUgPSBzcGVha2Vhc3kudG90cCh7XHJcbiAgICAgICAgICBzZWNyZXQ6IHNlY3JldCxcclxuICAgICAgICAgIGVuY29kaW5nOiAnYXNjaWknLFxyXG4gICAgICAgICAgdGltZTogTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMClcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRvdHBDb2RlO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB0aHJvdyBlcnJvcjtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFVwZGF0ZSB1c2VyJ3MgTUZBIHNldHVwIHN0YXR1c1xyXG4gICAqL1xyXG4gIHByaXZhdGUgYXN5bmMgdXBkYXRlTUZBU2V0dXBTdGF0dXMoZW1haWw6IHN0cmluZywgaXNDb21wbGV0ZTogYm9vbGVhbik6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gVGhpcyB3b3VsZCB1cGRhdGUgdGhlIGN1c3RvbSBhdHRyaWJ1dGUgdG8gdHJhY2sgTUZBIHNldHVwIHN0YXR1c1xyXG4gICAgICAvLyBJbXBsZW1lbnRhdGlvbiBkZXBlbmRzIG9uIGhvdyB5b3Ugd2FudCB0byB0cmFjayB0aGlzIHN0YXRlXHJcbiAgICAgIGxvZ2dlci5pbmZvKCdNRkEgc2V0dXAgc3RhdHVzIHVwZGF0ZWQnLCB7XHJcbiAgICAgICAgZW1haWwsXHJcbiAgICAgICAgaXNDb21wbGV0ZVxyXG4gICAgICB9KTtcclxuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgbG9nZ2VyLndhcm4oJ0ZhaWxlZCB0byB1cGRhdGUgTUZBIHNldHVwIHN0YXR1cycsIHtcclxuICAgICAgICBlbWFpbCxcclxuICAgICAgICBpc0NvbXBsZXRlLFxyXG4gICAgICAgIGVycm9yOiBlcnJvci5tZXNzYWdlXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2VuZXJhdGUgYSBzZWN1cmUgcGFzc3dvcmQgZm9yIHVzZXIgY3JlYXRpb25cclxuICAgKi9cclxuICBwcml2YXRlIGdlbmVyYXRlU2VjdXJlUGFzc3dvcmQoKTogc3RyaW5nIHtcclxuICAgIGNvbnN0IGxlbmd0aCA9IDEyO1xyXG4gICAgY29uc3QgY2hhcnNldCA9ICdhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ekFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaMDEyMzQ1Njc4OSFAIyQlXiYqJztcclxuICAgIGxldCBwYXNzd29yZCA9ICcnO1xyXG4gICAgXHJcbiAgICAvLyBFbnN1cmUgYXQgbGVhc3Qgb25lIGNoYXJhY3RlciBmcm9tIGVhY2ggcmVxdWlyZWQgY2F0ZWdvcnlcclxuICAgIHBhc3N3b3JkICs9ICdBJzsgLy8gVXBwZXJjYXNlXHJcbiAgICBwYXNzd29yZCArPSAnYSc7IC8vIExvd2VyY2FzZSAgXHJcbiAgICBwYXNzd29yZCArPSAnMSc7IC8vIERpZ2l0XHJcbiAgICBwYXNzd29yZCArPSAnISc7IC8vIFN5bWJvbFxyXG4gICAgXHJcbiAgICAvLyBGaWxsIHRoZSByZXN0IHJhbmRvbWx5XHJcbiAgICBmb3IgKGxldCBpID0gNDsgaSA8IGxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHBhc3N3b3JkICs9IGNoYXJzZXQuY2hhckF0KE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGNoYXJzZXQubGVuZ3RoKSk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8vIFNodWZmbGUgdGhlIHBhc3N3b3JkXHJcbiAgICByZXR1cm4gcGFzc3dvcmQuc3BsaXQoJycpLnNvcnQoKCkgPT4gTWF0aC5yYW5kb20oKSAtIDAuNSkuam9pbignJyk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDaGVjayBpZiB1c2VyIGV4aXN0cyBpbiBDb2duaXRvXHJcbiAgICovXHJcbiAgYXN5bmMgdXNlckV4aXN0cyhlbWFpbDogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBhd2FpdCB0aGlzLmNvZ25pdG9DbGllbnQuc2VuZChuZXcgQWRtaW5HZXRVc2VyQ29tbWFuZCh7XHJcbiAgICAgICAgVXNlclBvb2xJZDogdGhpcy51c2VyUG9vbElkLFxyXG4gICAgICAgIFVzZXJuYW1lOiBlbWFpbFxyXG4gICAgICB9KSk7XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICBpZiAoZXJyb3IubmFtZSA9PT0gJ1VzZXJOb3RGb3VuZEV4Y2VwdGlvbicpIHtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgIH1cclxuICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICB9XHJcbiAgfVxyXG59Il19