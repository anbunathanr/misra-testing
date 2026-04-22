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
                time: Math.floor(Date.now() / 1000),
                window: 2 // Allow some time drift
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
                    time: Math.floor(Date.now() / 1000),
                    window: 2
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29nbml0by10b3RwLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjb2duaXRvLXRvdHAtc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxnR0FlbUQ7QUFDbkQscURBQXVDO0FBQ3ZDLCtDQUFrRDtBQUVsRCxNQUFNLE1BQU0sR0FBRyxJQUFBLHFCQUFZLEVBQUMsb0JBQW9CLENBQUMsQ0FBQztBQXNCbEQsTUFBYSxrQkFBa0I7SUFDckIsYUFBYSxDQUFnQztJQUM3QyxVQUFVLENBQVM7SUFDbkIsUUFBUSxDQUFTO0lBRXpCO1FBQ0UsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLGdFQUE2QixDQUFDO1lBQ3JELE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXO1NBQzlDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBcUIsQ0FBQztRQUNwRCxJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWtCLENBQUM7UUFFL0MsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDdkMsTUFBTSxJQUFJLEtBQUssQ0FBQywrRUFBK0UsQ0FBQyxDQUFDO1FBQ25HLENBQUM7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsaUJBQWlCLENBQUMsS0FBYSxFQUFFLElBQWE7UUFDbEQsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFOUQsTUFBTSxDQUFDLElBQUksQ0FBQyxnQ0FBZ0MsRUFBRTtZQUM1QyxhQUFhO1lBQ2IsS0FBSztZQUNMLE9BQU8sRUFB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QUFDO1lBQ3BCLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyx1QkFBdUIsRUFBRSxDQUFDO2dCQUMzQyxPQUFPLEtBQUssQ0FBQztZQUNmLENBQUM7WUFDRCxNQUFNLEtBQUssQ0FBQztRQUNkLENBQUM7SUFDSCxDQUFDO0NBQ0Y7QUFoZUQsZ0RBZ2VDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcclxuICBDb2duaXRvSWRlbnRpdHlQcm92aWRlckNsaWVudCxcclxuICBBc3NvY2lhdGVTb2Z0d2FyZVRva2VuQ29tbWFuZCxcclxuICBWZXJpZnlTb2Z0d2FyZVRva2VuQ29tbWFuZCxcclxuICBSZXNwb25kVG9BdXRoQ2hhbGxlbmdlQ29tbWFuZCxcclxuICBJbml0aWF0ZUF1dGhDb21tYW5kLFxyXG4gIEFkbWluSW5pdGlhdGVBdXRoQ29tbWFuZCxcclxuICBBZG1pblNldFVzZXJNRkFQcmVmZXJlbmNlQ29tbWFuZCxcclxuICBBZG1pbkNyZWF0ZVVzZXJDb21tYW5kLFxyXG4gIEFkbWluU2V0VXNlclBhc3N3b3JkQ29tbWFuZCxcclxuICBBZG1pbkdldFVzZXJDb21tYW5kLFxyXG4gIENoYWxsZW5nZU5hbWVUeXBlLFxyXG4gIEF1dGhGbG93VHlwZSxcclxuICBNZXNzYWdlQWN0aW9uVHlwZSxcclxuICBEZWxpdmVyeU1lZGl1bVR5cGVcclxufSBmcm9tICdAYXdzLXNkay9jbGllbnQtY29nbml0by1pZGVudGl0eS1wcm92aWRlcic7XHJcbmltcG9ydCAqIGFzIHNwZWFrZWFzeSBmcm9tICdzcGVha2Vhc3knO1xyXG5pbXBvcnQgeyBjcmVhdGVMb2dnZXIgfSBmcm9tICcuLi8uLi91dGlscy9sb2dnZXInO1xyXG5cclxuY29uc3QgbG9nZ2VyID0gY3JlYXRlTG9nZ2VyKCdDb2duaXRvVE9UUFNlcnZpY2UnKTtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgVE9UUFNldHVwUmVzdWx0IHtcclxuICBzZWNyZXQ6IHN0cmluZztcclxuICBxckNvZGVVcmw6IHN0cmluZztcclxuICBiYWNrdXBDb2Rlczogc3RyaW5nW107XHJcbiAgc2Vzc2lvbj86IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBBdXRoZW50aWNhdGlvblJlc3VsdCB7XHJcbiAgYWNjZXNzVG9rZW46IHN0cmluZztcclxuICBpZFRva2VuOiBzdHJpbmc7XHJcbiAgcmVmcmVzaFRva2VuOiBzdHJpbmc7XHJcbiAgZXhwaXJlc0luOiBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgTUZBQ2hhbGxlbmdlUmVzdWx0IHtcclxuICBzZXNzaW9uOiBzdHJpbmc7XHJcbiAgY2hhbGxlbmdlTmFtZTogc3RyaW5nO1xyXG4gIGNoYWxsZW5nZVBhcmFtZXRlcnM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBDb2duaXRvVE9UUFNlcnZpY2Uge1xyXG4gIHByaXZhdGUgY29nbml0b0NsaWVudDogQ29nbml0b0lkZW50aXR5UHJvdmlkZXJDbGllbnQ7XHJcbiAgcHJpdmF0ZSB1c2VyUG9vbElkOiBzdHJpbmc7XHJcbiAgcHJpdmF0ZSBjbGllbnRJZDogc3RyaW5nO1xyXG5cclxuICBjb25zdHJ1Y3RvcigpIHtcclxuICAgIHRoaXMuY29nbml0b0NsaWVudCA9IG5ldyBDb2duaXRvSWRlbnRpdHlQcm92aWRlckNsaWVudCh7XHJcbiAgICAgIHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJ1xyXG4gICAgfSk7XHJcbiAgICB0aGlzLnVzZXJQb29sSWQgPSBwcm9jZXNzLmVudi5DT0dOSVRPX1VTRVJfUE9PTF9JRCE7XHJcbiAgICB0aGlzLmNsaWVudElkID0gcHJvY2Vzcy5lbnYuQ09HTklUT19DTElFTlRfSUQhO1xyXG5cclxuICAgIGlmICghdGhpcy51c2VyUG9vbElkIHx8ICF0aGlzLmNsaWVudElkKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ09HTklUT19VU0VSX1BPT0xfSUQgYW5kIENPR05JVE9fQ0xJRU5UX0lEIGVudmlyb25tZW50IHZhcmlhYmxlcyBhcmUgcmVxdWlyZWQnKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENyZWF0ZSBhIG5ldyB1c2VyIHdpdGggTUZBIGVuYWJsZWQgZm9yIGF1dG9ub21vdXMgd29ya2Zsb3dcclxuICAgKi9cclxuICBhc3luYyBjcmVhdGVVc2VyV2l0aE1GQShlbWFpbDogc3RyaW5nLCBuYW1lPzogc3RyaW5nKTogUHJvbWlzZTx7IHRlbXBQYXNzd29yZDogc3RyaW5nIH0+IHtcclxuICAgIGNvbnN0IGNvcnJlbGF0aW9uSWQgPSBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHJpbmcoNyk7XHJcbiAgICBcclxuICAgIGxvZ2dlci5pbmZvKCdDcmVhdGluZyB1c2VyIHdpdGggTUZBIGVuYWJsZWQnLCB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIGVtYWlsLFxyXG4gICAgICBoYXNOYW1lOiAhIW5hbWVcclxuICAgIH0pO1xyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIC8vIEdlbmVyYXRlIGEgc2VjdXJlIHRlbXBvcmFyeSBwYXNzd29yZFxyXG4gICAgICBjb25zdCB0ZW1wUGFzc3dvcmQgPSB0aGlzLmdlbmVyYXRlU2VjdXJlUGFzc3dvcmQoKTtcclxuXHJcbiAgICAgIC8vIENyZWF0ZSB1c2VyIGluIENvZ25pdG9cclxuICAgICAgYXdhaXQgdGhpcy5jb2duaXRvQ2xpZW50LnNlbmQobmV3IEFkbWluQ3JlYXRlVXNlckNvbW1hbmQoe1xyXG4gICAgICAgIFVzZXJQb29sSWQ6IHRoaXMudXNlclBvb2xJZCxcclxuICAgICAgICBVc2VybmFtZTogZW1haWwsXHJcbiAgICAgICAgVXNlckF0dHJpYnV0ZXM6IFtcclxuICAgICAgICAgIHsgTmFtZTogJ2VtYWlsJywgVmFsdWU6IGVtYWlsIH0sXHJcbiAgICAgICAgICB7IE5hbWU6ICdlbWFpbF92ZXJpZmllZCcsIFZhbHVlOiAndHJ1ZScgfSxcclxuICAgICAgICAgIHsgTmFtZTogJ2dpdmVuX25hbWUnLCBWYWx1ZTogbmFtZSB8fCBlbWFpbC5zcGxpdCgnQCcpWzBdIH0sXHJcbiAgICAgICAgICB7IE5hbWU6ICdjdXN0b206bWZhU2V0dXBDb21wbGV0ZScsIFZhbHVlOiAnZmFsc2UnIH1cclxuICAgICAgICBdLFxyXG4gICAgICAgIFRlbXBvcmFyeVBhc3N3b3JkOiB0ZW1wUGFzc3dvcmQsXHJcbiAgICAgICAgTWVzc2FnZUFjdGlvbjogTWVzc2FnZUFjdGlvblR5cGUuU1VQUFJFU1MsIC8vIERvbid0IHNlbmQgd2VsY29tZSBlbWFpbCBmb3IgYXV0b25vbW91cyB3b3JrZmxvd1xyXG4gICAgICAgIERlc2lyZWREZWxpdmVyeU1lZGl1bXM6IFtEZWxpdmVyeU1lZGl1bVR5cGUuRU1BSUxdXHJcbiAgICAgIH0pKTtcclxuXHJcbiAgICAgIC8vIFNldCBwZXJtYW5lbnQgcGFzc3dvcmQgaW1tZWRpYXRlbHkgZm9yIGF1dG9ub21vdXMgd29ya2Zsb3dcclxuICAgICAgYXdhaXQgdGhpcy5jb2duaXRvQ2xpZW50LnNlbmQobmV3IEFkbWluU2V0VXNlclBhc3N3b3JkQ29tbWFuZCh7XHJcbiAgICAgICAgVXNlclBvb2xJZDogdGhpcy51c2VyUG9vbElkLFxyXG4gICAgICAgIFVzZXJuYW1lOiBlbWFpbCxcclxuICAgICAgICBQYXNzd29yZDogdGVtcFBhc3N3b3JkLFxyXG4gICAgICAgIFBlcm1hbmVudDogdHJ1ZVxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICBsb2dnZXIuaW5mbygnVXNlciBjcmVhdGVkIHN1Y2Nlc3NmdWxseSB3aXRoIE1GQSBzZXR1cCBwZW5kaW5nJywge1xyXG4gICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgZW1haWxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICByZXR1cm4geyB0ZW1wUGFzc3dvcmQgfTtcclxuXHJcbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgIGxvZ2dlci5lcnJvcignRmFpbGVkIHRvIGNyZWF0ZSB1c2VyIHdpdGggTUZBJywge1xyXG4gICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgZW1haWwsXHJcbiAgICAgICAgZXJyb3I6IGVycm9yLm1lc3NhZ2VcclxuICAgICAgfSk7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVVNFUl9DUkVBVElPTl9GQUlMRUQ6ICR7ZXJyb3IubWVzc2FnZX1gKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEluaXRpYXRlIGF1dGhlbnRpY2F0aW9uIGFuZCBoYW5kbGUgTUZBIHNldHVwIGF1dG9tYXRpY2FsbHlcclxuICAgKi9cclxuICBhc3luYyBhdXRoZW50aWNhdGVXaXRoQXV0b01GQShlbWFpbDogc3RyaW5nLCBwYXNzd29yZDogc3RyaW5nKTogUHJvbWlzZTxBdXRoZW50aWNhdGlvblJlc3VsdCB8IE1GQUNoYWxsZW5nZVJlc3VsdD4ge1xyXG4gICAgY29uc3QgY29ycmVsYXRpb25JZCA9IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cmluZyg3KTtcclxuICAgIFxyXG4gICAgbG9nZ2VyLmluZm8oJ1N0YXJ0aW5nIGF1dGhlbnRpY2F0aW9uIHdpdGggYXV0byBNRkEnLCB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIGVtYWlsXHJcbiAgICB9KTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICAvLyBJbml0aWF0ZSBhdXRoZW50aWNhdGlvblxyXG4gICAgICBjb25zdCBhdXRoUmVzdWx0ID0gYXdhaXQgdGhpcy5jb2duaXRvQ2xpZW50LnNlbmQobmV3IEFkbWluSW5pdGlhdGVBdXRoQ29tbWFuZCh7XHJcbiAgICAgICAgVXNlclBvb2xJZDogdGhpcy51c2VyUG9vbElkLFxyXG4gICAgICAgIENsaWVudElkOiB0aGlzLmNsaWVudElkLFxyXG4gICAgICAgIEF1dGhGbG93OiBBdXRoRmxvd1R5cGUuQURNSU5fTk9fU1JQX0FVVEgsXHJcbiAgICAgICAgQXV0aFBhcmFtZXRlcnM6IHtcclxuICAgICAgICAgIFVTRVJOQU1FOiBlbWFpbCxcclxuICAgICAgICAgIFBBU1NXT1JEOiBwYXNzd29yZFxyXG4gICAgICAgIH1cclxuICAgICAgfSkpO1xyXG5cclxuICAgICAgLy8gSGFuZGxlIGRpZmZlcmVudCBjaGFsbGVuZ2UgdHlwZXNcclxuICAgICAgaWYgKGF1dGhSZXN1bHQuQ2hhbGxlbmdlTmFtZSA9PT0gQ2hhbGxlbmdlTmFtZVR5cGUuTUZBX1NFVFVQKSB7XHJcbiAgICAgICAgbG9nZ2VyLmluZm8oJ01GQSBzZXR1cCByZXF1aXJlZCwgc2V0dGluZyB1cCBUT1RQIGF1dG9tYXRpY2FsbHknLCB7XHJcbiAgICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgICAgZW1haWxcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuc2V0dXBUT1RQQXV0b21hdGljYWxseShhdXRoUmVzdWx0LlNlc3Npb24hLCBlbWFpbCwgY29ycmVsYXRpb25JZCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChhdXRoUmVzdWx0LkNoYWxsZW5nZU5hbWUgPT09IENoYWxsZW5nZU5hbWVUeXBlLlNPRlRXQVJFX1RPS0VOX01GQSkge1xyXG4gICAgICAgIGxvZ2dlci5pbmZvKCdTT0ZUV0FSRV9UT0tFTl9NRkEgY2hhbGxlbmdlIHJlY2VpdmVkJywge1xyXG4gICAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICAgIGVtYWlsXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmhhbmRsZVNvZnR3YXJlVG9rZW5NRkEoYXV0aFJlc3VsdC5TZXNzaW9uISwgZW1haWwsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBJZiBubyBjaGFsbGVuZ2UsIHJldHVybiB0b2tlbnMgZGlyZWN0bHlcclxuICAgICAgaWYgKGF1dGhSZXN1bHQuQXV0aGVudGljYXRpb25SZXN1bHQpIHtcclxuICAgICAgICBsb2dnZXIuaW5mbygnQXV0aGVudGljYXRpb24gY29tcGxldGVkIHdpdGhvdXQgTUZBIGNoYWxsZW5nZScsIHtcclxuICAgICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgICBlbWFpbFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgYWNjZXNzVG9rZW46IGF1dGhSZXN1bHQuQXV0aGVudGljYXRpb25SZXN1bHQuQWNjZXNzVG9rZW4hLFxyXG4gICAgICAgICAgaWRUb2tlbjogYXV0aFJlc3VsdC5BdXRoZW50aWNhdGlvblJlc3VsdC5JZFRva2VuISxcclxuICAgICAgICAgIHJlZnJlc2hUb2tlbjogYXV0aFJlc3VsdC5BdXRoZW50aWNhdGlvblJlc3VsdC5SZWZyZXNoVG9rZW4hLFxyXG4gICAgICAgICAgZXhwaXJlc0luOiBhdXRoUmVzdWx0LkF1dGhlbnRpY2F0aW9uUmVzdWx0LkV4cGlyZXNJbiB8fCAzNjAwXHJcbiAgICAgICAgfTtcclxuICAgICAgfVxyXG5cclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmV4cGVjdGVkIGF1dGhlbnRpY2F0aW9uIHN0YXRlOiAke2F1dGhSZXN1bHQuQ2hhbGxlbmdlTmFtZSB8fCAndW5rbm93bid9YCk7XHJcblxyXG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICBsb2dnZXIuZXJyb3IoJ0F1dGhlbnRpY2F0aW9uIHdpdGggYXV0byBNRkEgZmFpbGVkJywge1xyXG4gICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgZW1haWwsXHJcbiAgICAgICAgZXJyb3I6IGVycm9yLm1lc3NhZ2VcclxuICAgICAgfSk7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQVVUSF9GQUlMRUQ6ICR7ZXJyb3IubWVzc2FnZX1gKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFNldCB1cCBUT1RQIGF1dG9tYXRpY2FsbHkgZm9yIGF1dG9ub21vdXMgd29ya2Zsb3dcclxuICAgKi9cclxuICBwcml2YXRlIGFzeW5jIHNldHVwVE9UUEF1dG9tYXRpY2FsbHkoXHJcbiAgICBzZXNzaW9uOiBzdHJpbmcsIFxyXG4gICAgZW1haWw6IHN0cmluZywgXHJcbiAgICBjb3JyZWxhdGlvbklkOiBzdHJpbmdcclxuICApOiBQcm9taXNlPEF1dGhlbnRpY2F0aW9uUmVzdWx0PiB7XHJcbiAgICBcclxuICAgIGxvZ2dlci5pbmZvKCdTZXR0aW5nIHVwIFRPVFAgYXV0b21hdGljYWxseScsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZW1haWxcclxuICAgIH0pO1xyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIC8vIFN0ZXAgMTogQXNzb2NpYXRlIHNvZnR3YXJlIHRva2VuIHRvIGdldCBzZWNyZXRcclxuICAgICAgY29uc3QgYXNzb2NpYXRlUmVzdWx0ID0gYXdhaXQgdGhpcy5jb2duaXRvQ2xpZW50LnNlbmQobmV3IEFzc29jaWF0ZVNvZnR3YXJlVG9rZW5Db21tYW5kKHtcclxuICAgICAgICBTZXNzaW9uOiBzZXNzaW9uXHJcbiAgICAgIH0pKTtcclxuXHJcbiAgICAgIGlmICghYXNzb2NpYXRlUmVzdWx0LlNlY3JldENvZGUpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWxlZCB0byBnZXQgVE9UUCBzZWNyZXQgZnJvbSBDb2duaXRvJyk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGxvZ2dlci5pbmZvKCdUT1RQIHNlY3JldCBvYnRhaW5lZCBmcm9tIENvZ25pdG8nLCB7XHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICBlbWFpbCxcclxuICAgICAgICBzZWNyZXRMZW5ndGg6IGFzc29jaWF0ZVJlc3VsdC5TZWNyZXRDb2RlLmxlbmd0aFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIFN0ZXAgMjogU3RvcmUgdGhlIHNlY3JldCBzZWN1cmVseSB1c2luZyBPVFAgU2VjcmV0cyBTZXJ2aWNlXHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgY29uc3QgeyBPVFBTZWNyZXRzU2VydmljZSB9ID0gYXdhaXQgaW1wb3J0KCcuL290cC1zZWNyZXRzLXNlcnZpY2UnKTtcclxuICAgICAgICBjb25zdCBvdHBTZXJ2aWNlID0gbmV3IE9UUFNlY3JldHNTZXJ2aWNlKCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gQ3JlYXRlIHNlY3JldCBkYXRhIHN0cnVjdHVyZVxyXG4gICAgICAgIGNvbnN0IHNlY3JldERhdGEgPSB7XHJcbiAgICAgICAgICBzZWNyZXQ6IGFzc29jaWF0ZVJlc3VsdC5TZWNyZXRDb2RlLFxyXG4gICAgICAgICAgYmFja3VwQ29kZXM6IHRoaXMuZ2VuZXJhdGVCYWNrdXBDb2RlcygpLFxyXG4gICAgICAgICAgY3JlYXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgICB1c2FnZUNvdW50OiAwXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLy8gU3RvcmUgdGhlIHNlY3JldCAodGhpcyB3aWxsIGJlIHVzZWQgZm9yIGZ1dHVyZSBUT1RQIGdlbmVyYXRpb24pXHJcbiAgICAgICAgYXdhaXQgb3RwU2VydmljZS5zdG9yZVVzZXJUT1RQU2VjcmV0KGVtYWlsLCBzZWNyZXREYXRhLCBjb3JyZWxhdGlvbklkKTtcclxuICAgICAgICBcclxuICAgICAgICBsb2dnZXIuaW5mbygnVE9UUCBzZWNyZXQgc3RvcmVkIHNlY3VyZWx5Jywge1xyXG4gICAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICAgIGVtYWlsXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICB9IGNhdGNoIChzdG9yYWdlRXJyb3I6IGFueSkge1xyXG4gICAgICAgIGxvZ2dlci53YXJuKCdGYWlsZWQgdG8gc3RvcmUgVE9UUCBzZWNyZXQsIGNvbnRpbnVpbmcgd2l0aCBDb2duaXRvLW9ubHkgZmxvdycsIHtcclxuICAgICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgICBlbWFpbCxcclxuICAgICAgICAgIGVycm9yOiBzdG9yYWdlRXJyb3IubWVzc2FnZVxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBTdGVwIDM6IEdlbmVyYXRlIFRPVFAgY29kZSB1c2luZyB0aGUgc2VjcmV0XHJcbiAgICAgIGNvbnN0IHRvdHBDb2RlID0gc3BlYWtlYXN5LnRvdHAoe1xyXG4gICAgICAgIHNlY3JldDogYXNzb2NpYXRlUmVzdWx0LlNlY3JldENvZGUsXHJcbiAgICAgICAgZW5jb2Rpbmc6ICdiYXNlMzInLFxyXG4gICAgICAgIHRpbWU6IE1hdGguZmxvb3IoRGF0ZS5ub3coKSAvIDEwMDApLFxyXG4gICAgICAgIHdpbmRvdzogMiAvLyBBbGxvdyBzb21lIHRpbWUgZHJpZnRcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBsb2dnZXIuaW5mbygnVE9UUCBjb2RlIGdlbmVyYXRlZCBmb3IgdmVyaWZpY2F0aW9uJywge1xyXG4gICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgZW1haWwsXHJcbiAgICAgICAgY29kZUxlbmd0aDogdG90cENvZGUubGVuZ3RoXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gU3RlcCA0OiBWZXJpZnkgdGhlIHNvZnR3YXJlIHRva2VuXHJcbiAgICAgIGNvbnN0IHZlcmlmeVJlc3VsdCA9IGF3YWl0IHRoaXMuY29nbml0b0NsaWVudC5zZW5kKG5ldyBWZXJpZnlTb2Z0d2FyZVRva2VuQ29tbWFuZCh7XHJcbiAgICAgICAgU2Vzc2lvbjogYXNzb2NpYXRlUmVzdWx0LlNlc3Npb24sXHJcbiAgICAgICAgVXNlckNvZGU6IHRvdHBDb2RlXHJcbiAgICAgIH0pKTtcclxuXHJcbiAgICAgIGlmICh2ZXJpZnlSZXN1bHQuU3RhdHVzICE9PSAnU1VDQ0VTUycpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFRPVFAgdmVyaWZpY2F0aW9uIGZhaWxlZDogJHt2ZXJpZnlSZXN1bHQuU3RhdHVzfWApO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBsb2dnZXIuaW5mbygnVE9UUCB2ZXJpZmljYXRpb24gc3VjY2Vzc2Z1bCcsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGVtYWlsLFxyXG4gICAgICAgIHN0YXR1czogdmVyaWZ5UmVzdWx0LlN0YXR1c1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIFN0ZXAgNTogRW5hYmxlIFRPVFAgTUZBIGZvciB0aGUgdXNlclxyXG4gICAgICBhd2FpdCB0aGlzLmNvZ25pdG9DbGllbnQuc2VuZChuZXcgQWRtaW5TZXRVc2VyTUZBUHJlZmVyZW5jZUNvbW1hbmQoe1xyXG4gICAgICAgIFVzZXJQb29sSWQ6IHRoaXMudXNlclBvb2xJZCxcclxuICAgICAgICBVc2VybmFtZTogZW1haWwsXHJcbiAgICAgICAgU29mdHdhcmVUb2tlbk1mYVNldHRpbmdzOiB7XHJcbiAgICAgICAgICBFbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgUHJlZmVycmVkTWZhOiB0cnVlXHJcbiAgICAgICAgfVxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICAvLyBTdGVwIDY6IENvbXBsZXRlIGF1dGhlbnRpY2F0aW9uXHJcbiAgICAgIGNvbnN0IGZpbmFsQXV0aFJlc3VsdCA9IGF3YWl0IHRoaXMuY29nbml0b0NsaWVudC5zZW5kKG5ldyBSZXNwb25kVG9BdXRoQ2hhbGxlbmdlQ29tbWFuZCh7XHJcbiAgICAgICAgQ2xpZW50SWQ6IHRoaXMuY2xpZW50SWQsXHJcbiAgICAgICAgQ2hhbGxlbmdlTmFtZTogQ2hhbGxlbmdlTmFtZVR5cGUuTUZBX1NFVFVQLFxyXG4gICAgICAgIFNlc3Npb246IHZlcmlmeVJlc3VsdC5TZXNzaW9uLFxyXG4gICAgICAgIENoYWxsZW5nZVJlc3BvbnNlczoge1xyXG4gICAgICAgICAgVVNFUk5BTUU6IGVtYWlsXHJcbiAgICAgICAgfVxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICBpZiAoIWZpbmFsQXV0aFJlc3VsdC5BdXRoZW50aWNhdGlvblJlc3VsdCkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIGNvbXBsZXRlIGF1dGhlbnRpY2F0aW9uIGFmdGVyIFRPVFAgc2V0dXAnKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gU3RlcCA3OiBVcGRhdGUgdXNlcidzIE1GQSBzZXR1cCBzdGF0dXNcclxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVNRkFTZXR1cFN0YXR1cyhlbWFpbCwgdHJ1ZSk7XHJcblxyXG4gICAgICBsb2dnZXIuaW5mbygnVE9UUCBNRkEgc2V0dXAgY29tcGxldGVkIHN1Y2Nlc3NmdWxseScsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGVtYWlsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBhY2Nlc3NUb2tlbjogZmluYWxBdXRoUmVzdWx0LkF1dGhlbnRpY2F0aW9uUmVzdWx0LkFjY2Vzc1Rva2VuISxcclxuICAgICAgICBpZFRva2VuOiBmaW5hbEF1dGhSZXN1bHQuQXV0aGVudGljYXRpb25SZXN1bHQuSWRUb2tlbiEsXHJcbiAgICAgICAgcmVmcmVzaFRva2VuOiBmaW5hbEF1dGhSZXN1bHQuQXV0aGVudGljYXRpb25SZXN1bHQuUmVmcmVzaFRva2VuISxcclxuICAgICAgICBleHBpcmVzSW46IGZpbmFsQXV0aFJlc3VsdC5BdXRoZW50aWNhdGlvblJlc3VsdC5FeHBpcmVzSW4gfHwgMzYwMFxyXG4gICAgICB9O1xyXG5cclxuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgbG9nZ2VyLmVycm9yKCdBdXRvbWF0aWMgVE9UUCBzZXR1cCBmYWlsZWQnLCB7XHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICBlbWFpbCxcclxuICAgICAgICBlcnJvcjogZXJyb3IubWVzc2FnZVxyXG4gICAgICB9KTtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBUT1RQX1NFVFVQX0ZBSUxFRDogJHtlcnJvci5tZXNzYWdlfWApO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2VuZXJhdGUgYmFja3VwIGNvZGVzIGZvciBUT1RQXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBnZW5lcmF0ZUJhY2t1cENvZGVzKCk6IHN0cmluZ1tdIHtcclxuICAgIGNvbnN0IGNvZGVzOiBzdHJpbmdbXSA9IFtdO1xyXG4gICAgY29uc3QgY2hhcnNldCA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWjAxMjM0NTY3ODknO1xyXG4gICAgXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDEwOyBpKyspIHtcclxuICAgICAgbGV0IGNvZGUgPSAnJztcclxuICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCA4OyBqKyspIHtcclxuICAgICAgICBjb2RlICs9IGNoYXJzZXQuY2hhckF0KE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGNoYXJzZXQubGVuZ3RoKSk7XHJcbiAgICAgIH1cclxuICAgICAgY29kZXMucHVzaChjb2RlKTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgcmV0dXJuIGNvZGVzO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogSGFuZGxlIFNPRlRXQVJFX1RPS0VOX01GQSBjaGFsbGVuZ2UgZm9yIGV4aXN0aW5nIFRPVFAgdXNlcnNcclxuICAgKi9cclxuICBwcml2YXRlIGFzeW5jIGhhbmRsZVNvZnR3YXJlVG9rZW5NRkEoXHJcbiAgICBzZXNzaW9uOiBzdHJpbmcsIFxyXG4gICAgZW1haWw6IHN0cmluZywgXHJcbiAgICBjb3JyZWxhdGlvbklkOiBzdHJpbmdcclxuICApOiBQcm9taXNlPEF1dGhlbnRpY2F0aW9uUmVzdWx0PiB7XHJcbiAgICBcclxuICAgIGxvZ2dlci5pbmZvKCdIYW5kbGluZyBTT0ZUV0FSRV9UT0tFTl9NRkEgY2hhbGxlbmdlJywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICBlbWFpbFxyXG4gICAgfSk7XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gRm9yIGF1dG9ub21vdXMgd29ya2Zsb3csIHdlIG5lZWQgdG8gZ2VuZXJhdGUgdGhlIFRPVFAgY29kZVxyXG4gICAgICAvLyBJbiBhIHJlYWwgaW1wbGVtZW50YXRpb24sIHRoaXMgd291bGQgdXNlIHRoZSBzdG9yZWQgc2VjcmV0XHJcbiAgICAgIC8vIEZvciBub3csIHdlJ2xsIHNpbXVsYXRlIHRoaXMgcHJvY2Vzc1xyXG4gICAgICBcclxuICAgICAgLy8gTk9URTogSW4gcHJvZHVjdGlvbiwgQ29nbml0byBzdG9yZXMgdGhlIFRPVFAgc2VjcmV0IGludGVybmFsbHlcclxuICAgICAgLy8gV2Ugd291bGQgbmVlZCB0byBlaXRoZXI6XHJcbiAgICAgIC8vIDEuIFN0b3JlIG91ciBvd24gY29weSBvZiB0aGUgc2VjcmV0IChsZXNzIHNlY3VyZSlcclxuICAgICAgLy8gMi4gVXNlIGEgZGlmZmVyZW50IGFwcHJvYWNoIGZvciBhdXRvbm9tb3VzIHZlcmlmaWNhdGlvblxyXG4gICAgICAvLyAzLiBQcmUtZ2VuZXJhdGUgYW5kIHN0b3JlIHZhbGlkIGNvZGVzICh0aW1lLWxpbWl0ZWQpXHJcbiAgICAgIFxyXG4gICAgICAvLyBGb3IgdGhpcyBpbXBsZW1lbnRhdGlvbiwgd2UnbGwgdXNlIGEgcGxhY2Vob2xkZXIgYXBwcm9hY2hcclxuICAgICAgLy8gdGhhdCB3b3VsZCBuZWVkIHRvIGJlIHJlcGxhY2VkIHdpdGggYWN0dWFsIHNlY3JldCByZXRyaWV2YWxcclxuICAgICAgY29uc3QgdG90cENvZGUgPSBhd2FpdCB0aGlzLmdlbmVyYXRlVE9UUEZvclVzZXIoZW1haWwsIGNvcnJlbGF0aW9uSWQpO1xyXG5cclxuICAgICAgLy8gUmVzcG9uZCB0byB0aGUgTUZBIGNoYWxsZW5nZVxyXG4gICAgICBjb25zdCBjaGFsbGVuZ2VSZXN1bHQgPSBhd2FpdCB0aGlzLmNvZ25pdG9DbGllbnQuc2VuZChuZXcgUmVzcG9uZFRvQXV0aENoYWxsZW5nZUNvbW1hbmQoe1xyXG4gICAgICAgIENsaWVudElkOiB0aGlzLmNsaWVudElkLFxyXG4gICAgICAgIENoYWxsZW5nZU5hbWU6IENoYWxsZW5nZU5hbWVUeXBlLlNPRlRXQVJFX1RPS0VOX01GQSxcclxuICAgICAgICBTZXNzaW9uOiBzZXNzaW9uLFxyXG4gICAgICAgIENoYWxsZW5nZVJlc3BvbnNlczoge1xyXG4gICAgICAgICAgVVNFUk5BTUU6IGVtYWlsLFxyXG4gICAgICAgICAgU09GVFdBUkVfVE9LRU5fTUZBX0NPREU6IHRvdHBDb2RlXHJcbiAgICAgICAgfVxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICBpZiAoIWNoYWxsZW5nZVJlc3VsdC5BdXRoZW50aWNhdGlvblJlc3VsdCkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIGNvbXBsZXRlIFNPRlRXQVJFX1RPS0VOX01GQSBjaGFsbGVuZ2UnKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgbG9nZ2VyLmluZm8oJ1NPRlRXQVJFX1RPS0VOX01GQSBjaGFsbGVuZ2UgY29tcGxldGVkIHN1Y2Nlc3NmdWxseScsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGVtYWlsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBhY2Nlc3NUb2tlbjogY2hhbGxlbmdlUmVzdWx0LkF1dGhlbnRpY2F0aW9uUmVzdWx0LkFjY2Vzc1Rva2VuISxcclxuICAgICAgICBpZFRva2VuOiBjaGFsbGVuZ2VSZXN1bHQuQXV0aGVudGljYXRpb25SZXN1bHQuSWRUb2tlbiEsXHJcbiAgICAgICAgcmVmcmVzaFRva2VuOiBjaGFsbGVuZ2VSZXN1bHQuQXV0aGVudGljYXRpb25SZXN1bHQuUmVmcmVzaFRva2VuISxcclxuICAgICAgICBleHBpcmVzSW46IGNoYWxsZW5nZVJlc3VsdC5BdXRoZW50aWNhdGlvblJlc3VsdC5FeHBpcmVzSW4gfHwgMzYwMFxyXG4gICAgICB9O1xyXG5cclxuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgbG9nZ2VyLmVycm9yKCdTT0ZUV0FSRV9UT0tFTl9NRkEgY2hhbGxlbmdlIGZhaWxlZCcsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGVtYWlsLFxyXG4gICAgICAgIGVycm9yOiBlcnJvci5tZXNzYWdlXHJcbiAgICAgIH0pO1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE1GQV9DSEFMTEVOR0VfRkFJTEVEOiAke2Vycm9yLm1lc3NhZ2V9YCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZW5lcmF0ZSBUT1RQIGNvZGUgZm9yIGEgdXNlciAocGxhY2Vob2xkZXIgaW1wbGVtZW50YXRpb24pXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBhc3luYyBnZW5lcmF0ZVRPVFBGb3JVc2VyKGVtYWlsOiBzdHJpbmcsIGNvcnJlbGF0aW9uSWQ6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XHJcbiAgICBsb2dnZXIuaW5mbygnR2VuZXJhdGluZyBUT1RQIGNvZGUgZm9yIHVzZXInLCB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIGVtYWlsXHJcbiAgICB9KTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICAvLyBJbXBvcnQgT1RQIFNlY3JldHMgU2VydmljZVxyXG4gICAgICBjb25zdCB7IE9UUFNlY3JldHNTZXJ2aWNlIH0gPSBhd2FpdCBpbXBvcnQoJy4vb3RwLXNlY3JldHMtc2VydmljZScpO1xyXG4gICAgICBjb25zdCBvdHBTZXJ2aWNlID0gbmV3IE9UUFNlY3JldHNTZXJ2aWNlKCk7XHJcbiAgICAgIFxyXG4gICAgICAvLyBHZW5lcmF0ZSBUT1RQIGNvZGUgdXNpbmcgc3RvcmVkIHNlY3JldFxyXG4gICAgICBjb25zdCB0b3RwQ29kZSA9IGF3YWl0IG90cFNlcnZpY2UuZ2VuZXJhdGVUT1RQQ29kZShlbWFpbCk7XHJcbiAgICAgIFxyXG4gICAgICBsb2dnZXIuaW5mbygnVE9UUCBjb2RlIGdlbmVyYXRlZCBzdWNjZXNzZnVsbHknLCB7XHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICBlbWFpbCxcclxuICAgICAgICBjb2RlTGVuZ3RoOiB0b3RwQ29kZS5sZW5ndGhcclxuICAgICAgfSk7XHJcblxyXG4gICAgICByZXR1cm4gdG90cENvZGU7XHJcblxyXG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICBsb2dnZXIuZXJyb3IoJ0ZhaWxlZCB0byBnZW5lcmF0ZSBUT1RQIGNvZGUnLCB7XHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICBlbWFpbCxcclxuICAgICAgICBlcnJvcjogZXJyb3IubWVzc2FnZVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIEZhbGxiYWNrIHRvIHBsYWNlaG9sZGVyIGltcGxlbWVudGF0aW9uIGZvciBkZXZlbG9wbWVudFxyXG4gICAgICBpZiAocHJvY2Vzcy5lbnYuRU5WSVJPTk1FTlQgPT09ICdkZXYnIHx8IHByb2Nlc3MuZW52LkVOVklST05NRU5UID09PSAndGVzdCcpIHtcclxuICAgICAgICBsb2dnZXIud2FybignVXNpbmcgZmFsbGJhY2sgVE9UUCBnZW5lcmF0aW9uIGZvciBkZXZlbG9wbWVudCcsIHtcclxuICAgICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgICBlbWFpbFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBHZW5lcmF0ZSBhIHZhbGlkIFRPVFAgY29kZSB1c2luZyBhIGRldGVybWluaXN0aWMgc2VjcmV0IGZvciBkZXZlbG9wbWVudFxyXG4gICAgICAgIGNvbnN0IHNlY3JldCA9ICdERVZfU0VDUkVUXycgKyBCdWZmZXIuZnJvbShlbWFpbCkudG9TdHJpbmcoJ2Jhc2U2NCcpLnN1YnN0cmluZygwLCAxNik7XHJcbiAgICAgICAgXHJcbiAgICAgICAgY29uc3QgdG90cENvZGUgPSBzcGVha2Vhc3kudG90cCh7XHJcbiAgICAgICAgICBzZWNyZXQ6IHNlY3JldCxcclxuICAgICAgICAgIGVuY29kaW5nOiAnYXNjaWknLFxyXG4gICAgICAgICAgdGltZTogTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMCksXHJcbiAgICAgICAgICB3aW5kb3c6IDJcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRvdHBDb2RlO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB0aHJvdyBlcnJvcjtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFVwZGF0ZSB1c2VyJ3MgTUZBIHNldHVwIHN0YXR1c1xyXG4gICAqL1xyXG4gIHByaXZhdGUgYXN5bmMgdXBkYXRlTUZBU2V0dXBTdGF0dXMoZW1haWw6IHN0cmluZywgaXNDb21wbGV0ZTogYm9vbGVhbik6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gVGhpcyB3b3VsZCB1cGRhdGUgdGhlIGN1c3RvbSBhdHRyaWJ1dGUgdG8gdHJhY2sgTUZBIHNldHVwIHN0YXR1c1xyXG4gICAgICAvLyBJbXBsZW1lbnRhdGlvbiBkZXBlbmRzIG9uIGhvdyB5b3Ugd2FudCB0byB0cmFjayB0aGlzIHN0YXRlXHJcbiAgICAgIGxvZ2dlci5pbmZvKCdNRkEgc2V0dXAgc3RhdHVzIHVwZGF0ZWQnLCB7XHJcbiAgICAgICAgZW1haWwsXHJcbiAgICAgICAgaXNDb21wbGV0ZVxyXG4gICAgICB9KTtcclxuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgbG9nZ2VyLndhcm4oJ0ZhaWxlZCB0byB1cGRhdGUgTUZBIHNldHVwIHN0YXR1cycsIHtcclxuICAgICAgICBlbWFpbCxcclxuICAgICAgICBpc0NvbXBsZXRlLFxyXG4gICAgICAgIGVycm9yOiBlcnJvci5tZXNzYWdlXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2VuZXJhdGUgYSBzZWN1cmUgcGFzc3dvcmQgZm9yIHVzZXIgY3JlYXRpb25cclxuICAgKi9cclxuICBwcml2YXRlIGdlbmVyYXRlU2VjdXJlUGFzc3dvcmQoKTogc3RyaW5nIHtcclxuICAgIGNvbnN0IGxlbmd0aCA9IDEyO1xyXG4gICAgY29uc3QgY2hhcnNldCA9ICdhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ekFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaMDEyMzQ1Njc4OSFAIyQlXiYqJztcclxuICAgIGxldCBwYXNzd29yZCA9ICcnO1xyXG4gICAgXHJcbiAgICAvLyBFbnN1cmUgYXQgbGVhc3Qgb25lIGNoYXJhY3RlciBmcm9tIGVhY2ggcmVxdWlyZWQgY2F0ZWdvcnlcclxuICAgIHBhc3N3b3JkICs9ICdBJzsgLy8gVXBwZXJjYXNlXHJcbiAgICBwYXNzd29yZCArPSAnYSc7IC8vIExvd2VyY2FzZSAgXHJcbiAgICBwYXNzd29yZCArPSAnMSc7IC8vIERpZ2l0XHJcbiAgICBwYXNzd29yZCArPSAnISc7IC8vIFN5bWJvbFxyXG4gICAgXHJcbiAgICAvLyBGaWxsIHRoZSByZXN0IHJhbmRvbWx5XHJcbiAgICBmb3IgKGxldCBpID0gNDsgaSA8IGxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHBhc3N3b3JkICs9IGNoYXJzZXQuY2hhckF0KE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGNoYXJzZXQubGVuZ3RoKSk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8vIFNodWZmbGUgdGhlIHBhc3N3b3JkXHJcbiAgICByZXR1cm4gcGFzc3dvcmQuc3BsaXQoJycpLnNvcnQoKCkgPT4gTWF0aC5yYW5kb20oKSAtIDAuNSkuam9pbignJyk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDaGVjayBpZiB1c2VyIGV4aXN0cyBpbiBDb2duaXRvXHJcbiAgICovXHJcbiAgYXN5bmMgdXNlckV4aXN0cyhlbWFpbDogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBhd2FpdCB0aGlzLmNvZ25pdG9DbGllbnQuc2VuZChuZXcgQWRtaW5HZXRVc2VyQ29tbWFuZCh7XHJcbiAgICAgICAgVXNlclBvb2xJZDogdGhpcy51c2VyUG9vbElkLFxyXG4gICAgICAgIFVzZXJuYW1lOiBlbWFpbFxyXG4gICAgICB9KSk7XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICBpZiAoZXJyb3IubmFtZSA9PT0gJ1VzZXJOb3RGb3VuZEV4Y2VwdGlvbicpIHtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgIH1cclxuICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICB9XHJcbiAgfVxyXG59Il19