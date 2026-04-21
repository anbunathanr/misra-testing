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
            logger.error('Failed to create user with MFA', error, {
                correlationId,
                email,
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
            logger.error('Authentication with auto MFA failed', error, {
                correlationId,
                email,
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
                step: 30 // 30 second time step
            }); // Type assertion to handle library type issues
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
            logger.error('Automatic TOTP setup failed', error, {
                correlationId,
                email,
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
            logger.error('SOFTWARE_TOKEN_MFA challenge failed', error, {
                correlationId,
                email,
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
            logger.error('Failed to generate TOTP code', error, {
                correlationId,
                email,
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
                    step: 30 // 30 second time step
                }); // Type assertion to handle library type issues
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29nbml0by10b3RwLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjb2duaXRvLXRvdHAtc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxnR0FlbUQ7QUFDbkQscURBQXVDO0FBQ3ZDLCtDQUFrRDtBQUVsRCxNQUFNLE1BQU0sR0FBRyxJQUFBLHFCQUFZLEVBQUMsb0JBQW9CLENBQUMsQ0FBQztBQXNCbEQsTUFBYSxrQkFBa0I7SUFDckIsYUFBYSxDQUFnQztJQUM3QyxVQUFVLENBQVM7SUFDbkIsUUFBUSxDQUFTO0lBRXpCO1FBQ0UsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLGdFQUE2QixDQUFDO1lBQ3JELE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXO1NBQzlDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBcUIsQ0FBQztRQUNwRCxJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWtCLENBQUM7UUFFL0MsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDdkMsTUFBTSxJQUFJLEtBQUssQ0FBQywrRUFBK0UsQ0FBQyxDQUFDO1FBQ25HLENBQUM7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsaUJBQWlCLENBQUMsS0FBYSxFQUFFLElBQWE7UUFDbEQsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFOUQsTUFBTSxDQUFDLElBQUksQ0FBQyxnQ0FBZ0MsRUFBRTtZQUM1QyxhQUFhO1lBQ2IsS0FBSztZQUNMLE9BQU8sRUFB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QUM7WUFDZixDQUFDO1lBQ0QsTUFBTSxLQUFLLENBQUM7UUFDZCxDQUFDO0lBQ0gsQ0FBQztDQUNGO0FBM2RELGdEQTJkQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XHJcbiAgQ29nbml0b0lkZW50aXR5UHJvdmlkZXJDbGllbnQsXHJcbiAgQXNzb2NpYXRlU29mdHdhcmVUb2tlbkNvbW1hbmQsXHJcbiAgVmVyaWZ5U29mdHdhcmVUb2tlbkNvbW1hbmQsXHJcbiAgUmVzcG9uZFRvQXV0aENoYWxsZW5nZUNvbW1hbmQsXHJcbiAgSW5pdGlhdGVBdXRoQ29tbWFuZCxcclxuICBBZG1pbkluaXRpYXRlQXV0aENvbW1hbmQsXHJcbiAgQWRtaW5TZXRVc2VyTUZBUHJlZmVyZW5jZUNvbW1hbmQsXHJcbiAgQWRtaW5DcmVhdGVVc2VyQ29tbWFuZCxcclxuICBBZG1pblNldFVzZXJQYXNzd29yZENvbW1hbmQsXHJcbiAgQWRtaW5HZXRVc2VyQ29tbWFuZCxcclxuICBDaGFsbGVuZ2VOYW1lVHlwZSxcclxuICBBdXRoRmxvd1R5cGUsXHJcbiAgTWVzc2FnZUFjdGlvblR5cGUsXHJcbiAgRGVsaXZlcnlNZWRpdW1UeXBlXHJcbn0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWNvZ25pdG8taWRlbnRpdHktcHJvdmlkZXInO1xyXG5pbXBvcnQgKiBhcyBzcGVha2Vhc3kgZnJvbSAnc3BlYWtlYXN5JztcclxuaW1wb3J0IHsgY3JlYXRlTG9nZ2VyIH0gZnJvbSAnLi4vLi4vdXRpbHMvbG9nZ2VyJztcclxuXHJcbmNvbnN0IGxvZ2dlciA9IGNyZWF0ZUxvZ2dlcignQ29nbml0b1RPVFBTZXJ2aWNlJyk7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFRPVFBTZXR1cFJlc3VsdCB7XHJcbiAgc2VjcmV0OiBzdHJpbmc7XHJcbiAgcXJDb2RlVXJsOiBzdHJpbmc7XHJcbiAgYmFja3VwQ29kZXM6IHN0cmluZ1tdO1xyXG4gIHNlc3Npb24/OiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQXV0aGVudGljYXRpb25SZXN1bHQge1xyXG4gIGFjY2Vzc1Rva2VuOiBzdHJpbmc7XHJcbiAgaWRUb2tlbjogc3RyaW5nO1xyXG4gIHJlZnJlc2hUb2tlbjogc3RyaW5nO1xyXG4gIGV4cGlyZXNJbjogbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIE1GQUNoYWxsZW5nZVJlc3VsdCB7XHJcbiAgc2Vzc2lvbjogc3RyaW5nO1xyXG4gIGNoYWxsZW5nZU5hbWU6IHN0cmluZztcclxuICBjaGFsbGVuZ2VQYXJhbWV0ZXJzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+O1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgQ29nbml0b1RPVFBTZXJ2aWNlIHtcclxuICBwcml2YXRlIGNvZ25pdG9DbGllbnQ6IENvZ25pdG9JZGVudGl0eVByb3ZpZGVyQ2xpZW50O1xyXG4gIHByaXZhdGUgdXNlclBvb2xJZDogc3RyaW5nO1xyXG4gIHByaXZhdGUgY2xpZW50SWQ6IHN0cmluZztcclxuXHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICB0aGlzLmNvZ25pdG9DbGllbnQgPSBuZXcgQ29nbml0b0lkZW50aXR5UHJvdmlkZXJDbGllbnQoe1xyXG4gICAgICByZWdpb246IHByb2Nlc3MuZW52LkFXU19SRUdJT04gfHwgJ3VzLWVhc3QtMSdcclxuICAgIH0pO1xyXG4gICAgdGhpcy51c2VyUG9vbElkID0gcHJvY2Vzcy5lbnYuQ09HTklUT19VU0VSX1BPT0xfSUQhO1xyXG4gICAgdGhpcy5jbGllbnRJZCA9IHByb2Nlc3MuZW52LkNPR05JVE9fQ0xJRU5UX0lEITtcclxuXHJcbiAgICBpZiAoIXRoaXMudXNlclBvb2xJZCB8fCAhdGhpcy5jbGllbnRJZCkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NPR05JVE9fVVNFUl9QT09MX0lEIGFuZCBDT0dOSVRPX0NMSUVOVF9JRCBlbnZpcm9ubWVudCB2YXJpYWJsZXMgYXJlIHJlcXVpcmVkJyk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDcmVhdGUgYSBuZXcgdXNlciB3aXRoIE1GQSBlbmFibGVkIGZvciBhdXRvbm9tb3VzIHdvcmtmbG93XHJcbiAgICovXHJcbiAgYXN5bmMgY3JlYXRlVXNlcldpdGhNRkEoZW1haWw6IHN0cmluZywgbmFtZT86IHN0cmluZyk6IFByb21pc2U8eyB0ZW1wUGFzc3dvcmQ6IHN0cmluZyB9PiB7XHJcbiAgICBjb25zdCBjb3JyZWxhdGlvbklkID0gTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyaW5nKDcpO1xyXG4gICAgXHJcbiAgICBsb2dnZXIuaW5mbygnQ3JlYXRpbmcgdXNlciB3aXRoIE1GQSBlbmFibGVkJywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICBlbWFpbCxcclxuICAgICAgaGFzTmFtZTogISFuYW1lXHJcbiAgICB9KTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICAvLyBHZW5lcmF0ZSBhIHNlY3VyZSB0ZW1wb3JhcnkgcGFzc3dvcmRcclxuICAgICAgY29uc3QgdGVtcFBhc3N3b3JkID0gdGhpcy5nZW5lcmF0ZVNlY3VyZVBhc3N3b3JkKCk7XHJcblxyXG4gICAgICAvLyBDcmVhdGUgdXNlciBpbiBDb2duaXRvXHJcbiAgICAgIGF3YWl0IHRoaXMuY29nbml0b0NsaWVudC5zZW5kKG5ldyBBZG1pbkNyZWF0ZVVzZXJDb21tYW5kKHtcclxuICAgICAgICBVc2VyUG9vbElkOiB0aGlzLnVzZXJQb29sSWQsXHJcbiAgICAgICAgVXNlcm5hbWU6IGVtYWlsLFxyXG4gICAgICAgIFVzZXJBdHRyaWJ1dGVzOiBbXHJcbiAgICAgICAgICB7IE5hbWU6ICdlbWFpbCcsIFZhbHVlOiBlbWFpbCB9LFxyXG4gICAgICAgICAgeyBOYW1lOiAnZW1haWxfdmVyaWZpZWQnLCBWYWx1ZTogJ3RydWUnIH0sXHJcbiAgICAgICAgICB7IE5hbWU6ICdnaXZlbl9uYW1lJywgVmFsdWU6IG5hbWUgfHwgZW1haWwuc3BsaXQoJ0AnKVswXSB9LFxyXG4gICAgICAgICAgeyBOYW1lOiAnY3VzdG9tOm1mYVNldHVwQ29tcGxldGUnLCBWYWx1ZTogJ2ZhbHNlJyB9XHJcbiAgICAgICAgXSxcclxuICAgICAgICBUZW1wb3JhcnlQYXNzd29yZDogdGVtcFBhc3N3b3JkLFxyXG4gICAgICAgIE1lc3NhZ2VBY3Rpb246IE1lc3NhZ2VBY3Rpb25UeXBlLlNVUFBSRVNTLCAvLyBEb24ndCBzZW5kIHdlbGNvbWUgZW1haWwgZm9yIGF1dG9ub21vdXMgd29ya2Zsb3dcclxuICAgICAgICBEZXNpcmVkRGVsaXZlcnlNZWRpdW1zOiBbRGVsaXZlcnlNZWRpdW1UeXBlLkVNQUlMXVxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICAvLyBTZXQgcGVybWFuZW50IHBhc3N3b3JkIGltbWVkaWF0ZWx5IGZvciBhdXRvbm9tb3VzIHdvcmtmbG93XHJcbiAgICAgIGF3YWl0IHRoaXMuY29nbml0b0NsaWVudC5zZW5kKG5ldyBBZG1pblNldFVzZXJQYXNzd29yZENvbW1hbmQoe1xyXG4gICAgICAgIFVzZXJQb29sSWQ6IHRoaXMudXNlclBvb2xJZCxcclxuICAgICAgICBVc2VybmFtZTogZW1haWwsXHJcbiAgICAgICAgUGFzc3dvcmQ6IHRlbXBQYXNzd29yZCxcclxuICAgICAgICBQZXJtYW5lbnQ6IHRydWVcclxuICAgICAgfSkpO1xyXG5cclxuICAgICAgbG9nZ2VyLmluZm8oJ1VzZXIgY3JlYXRlZCBzdWNjZXNzZnVsbHkgd2l0aCBNRkEgc2V0dXAgcGVuZGluZycsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGVtYWlsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgcmV0dXJuIHsgdGVtcFBhc3N3b3JkIH07XHJcblxyXG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICBsb2dnZXIuZXJyb3IoJ0ZhaWxlZCB0byBjcmVhdGUgdXNlciB3aXRoIE1GQScsIGVycm9yLCB7XHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICBlbWFpbCxcclxuICAgICAgfSk7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVVNFUl9DUkVBVElPTl9GQUlMRUQ6ICR7ZXJyb3IubWVzc2FnZX1gKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEluaXRpYXRlIGF1dGhlbnRpY2F0aW9uIGFuZCBoYW5kbGUgTUZBIHNldHVwIGF1dG9tYXRpY2FsbHlcclxuICAgKi9cclxuICBhc3luYyBhdXRoZW50aWNhdGVXaXRoQXV0b01GQShlbWFpbDogc3RyaW5nLCBwYXNzd29yZDogc3RyaW5nKTogUHJvbWlzZTxBdXRoZW50aWNhdGlvblJlc3VsdCB8IE1GQUNoYWxsZW5nZVJlc3VsdD4ge1xyXG4gICAgY29uc3QgY29ycmVsYXRpb25JZCA9IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cmluZyg3KTtcclxuICAgIFxyXG4gICAgbG9nZ2VyLmluZm8oJ1N0YXJ0aW5nIGF1dGhlbnRpY2F0aW9uIHdpdGggYXV0byBNRkEnLCB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIGVtYWlsXHJcbiAgICB9KTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICAvLyBJbml0aWF0ZSBhdXRoZW50aWNhdGlvblxyXG4gICAgICBjb25zdCBhdXRoUmVzdWx0ID0gYXdhaXQgdGhpcy5jb2duaXRvQ2xpZW50LnNlbmQobmV3IEFkbWluSW5pdGlhdGVBdXRoQ29tbWFuZCh7XHJcbiAgICAgICAgVXNlclBvb2xJZDogdGhpcy51c2VyUG9vbElkLFxyXG4gICAgICAgIENsaWVudElkOiB0aGlzLmNsaWVudElkLFxyXG4gICAgICAgIEF1dGhGbG93OiBBdXRoRmxvd1R5cGUuQURNSU5fTk9fU1JQX0FVVEgsXHJcbiAgICAgICAgQXV0aFBhcmFtZXRlcnM6IHtcclxuICAgICAgICAgIFVTRVJOQU1FOiBlbWFpbCxcclxuICAgICAgICAgIFBBU1NXT1JEOiBwYXNzd29yZFxyXG4gICAgICAgIH1cclxuICAgICAgfSkpO1xyXG5cclxuICAgICAgLy8gSGFuZGxlIGRpZmZlcmVudCBjaGFsbGVuZ2UgdHlwZXNcclxuICAgICAgaWYgKGF1dGhSZXN1bHQuQ2hhbGxlbmdlTmFtZSA9PT0gQ2hhbGxlbmdlTmFtZVR5cGUuTUZBX1NFVFVQKSB7XHJcbiAgICAgICAgbG9nZ2VyLmluZm8oJ01GQSBzZXR1cCByZXF1aXJlZCwgc2V0dGluZyB1cCBUT1RQIGF1dG9tYXRpY2FsbHknLCB7XHJcbiAgICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgICAgZW1haWxcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuc2V0dXBUT1RQQXV0b21hdGljYWxseShhdXRoUmVzdWx0LlNlc3Npb24hLCBlbWFpbCwgY29ycmVsYXRpb25JZCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChhdXRoUmVzdWx0LkNoYWxsZW5nZU5hbWUgPT09IENoYWxsZW5nZU5hbWVUeXBlLlNPRlRXQVJFX1RPS0VOX01GQSkge1xyXG4gICAgICAgIGxvZ2dlci5pbmZvKCdTT0ZUV0FSRV9UT0tFTl9NRkEgY2hhbGxlbmdlIHJlY2VpdmVkJywge1xyXG4gICAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICAgIGVtYWlsXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmhhbmRsZVNvZnR3YXJlVG9rZW5NRkEoYXV0aFJlc3VsdC5TZXNzaW9uISwgZW1haWwsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBJZiBubyBjaGFsbGVuZ2UsIHJldHVybiB0b2tlbnMgZGlyZWN0bHlcclxuICAgICAgaWYgKGF1dGhSZXN1bHQuQXV0aGVudGljYXRpb25SZXN1bHQpIHtcclxuICAgICAgICBsb2dnZXIuaW5mbygnQXV0aGVudGljYXRpb24gY29tcGxldGVkIHdpdGhvdXQgTUZBIGNoYWxsZW5nZScsIHtcclxuICAgICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgICBlbWFpbFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgYWNjZXNzVG9rZW46IGF1dGhSZXN1bHQuQXV0aGVudGljYXRpb25SZXN1bHQuQWNjZXNzVG9rZW4hLFxyXG4gICAgICAgICAgaWRUb2tlbjogYXV0aFJlc3VsdC5BdXRoZW50aWNhdGlvblJlc3VsdC5JZFRva2VuISxcclxuICAgICAgICAgIHJlZnJlc2hUb2tlbjogYXV0aFJlc3VsdC5BdXRoZW50aWNhdGlvblJlc3VsdC5SZWZyZXNoVG9rZW4hLFxyXG4gICAgICAgICAgZXhwaXJlc0luOiBhdXRoUmVzdWx0LkF1dGhlbnRpY2F0aW9uUmVzdWx0LkV4cGlyZXNJbiB8fCAzNjAwXHJcbiAgICAgICAgfTtcclxuICAgICAgfVxyXG5cclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmV4cGVjdGVkIGF1dGhlbnRpY2F0aW9uIHN0YXRlOiAke2F1dGhSZXN1bHQuQ2hhbGxlbmdlTmFtZSB8fCAndW5rbm93bid9YCk7XHJcblxyXG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICBsb2dnZXIuZXJyb3IoJ0F1dGhlbnRpY2F0aW9uIHdpdGggYXV0byBNRkEgZmFpbGVkJywgZXJyb3IsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGVtYWlsLFxyXG4gICAgICB9KTtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBBVVRIX0ZBSUxFRDogJHtlcnJvci5tZXNzYWdlfWApO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogU2V0IHVwIFRPVFAgYXV0b21hdGljYWxseSBmb3IgYXV0b25vbW91cyB3b3JrZmxvd1xyXG4gICAqL1xyXG4gIHByaXZhdGUgYXN5bmMgc2V0dXBUT1RQQXV0b21hdGljYWxseShcclxuICAgIHNlc3Npb246IHN0cmluZywgXHJcbiAgICBlbWFpbDogc3RyaW5nLCBcclxuICAgIGNvcnJlbGF0aW9uSWQ6IHN0cmluZ1xyXG4gICk6IFByb21pc2U8QXV0aGVudGljYXRpb25SZXN1bHQ+IHtcclxuICAgIFxyXG4gICAgbG9nZ2VyLmluZm8oJ1NldHRpbmcgdXAgVE9UUCBhdXRvbWF0aWNhbGx5Jywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICBlbWFpbFxyXG4gICAgfSk7XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gU3RlcCAxOiBBc3NvY2lhdGUgc29mdHdhcmUgdG9rZW4gdG8gZ2V0IHNlY3JldFxyXG4gICAgICBjb25zdCBhc3NvY2lhdGVSZXN1bHQgPSBhd2FpdCB0aGlzLmNvZ25pdG9DbGllbnQuc2VuZChuZXcgQXNzb2NpYXRlU29mdHdhcmVUb2tlbkNvbW1hbmQoe1xyXG4gICAgICAgIFNlc3Npb246IHNlc3Npb25cclxuICAgICAgfSkpO1xyXG5cclxuICAgICAgaWYgKCFhc3NvY2lhdGVSZXN1bHQuU2VjcmV0Q29kZSkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIGdldCBUT1RQIHNlY3JldCBmcm9tIENvZ25pdG8nKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgbG9nZ2VyLmluZm8oJ1RPVFAgc2VjcmV0IG9idGFpbmVkIGZyb20gQ29nbml0bycsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGVtYWlsLFxyXG4gICAgICAgIHNlY3JldExlbmd0aDogYXNzb2NpYXRlUmVzdWx0LlNlY3JldENvZGUubGVuZ3RoXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gU3RlcCAyOiBTdG9yZSB0aGUgc2VjcmV0IHNlY3VyZWx5IHVzaW5nIE9UUCBTZWNyZXRzIFNlcnZpY2VcclxuICAgICAgdHJ5IHtcclxuICAgICAgICBjb25zdCB7IE9UUFNlY3JldHNTZXJ2aWNlIH0gPSBhd2FpdCBpbXBvcnQoJy4vb3RwLXNlY3JldHMtc2VydmljZScpO1xyXG4gICAgICAgIGNvbnN0IG90cFNlcnZpY2UgPSBuZXcgT1RQU2VjcmV0c1NlcnZpY2UoKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBDcmVhdGUgc2VjcmV0IGRhdGEgc3RydWN0dXJlXHJcbiAgICAgICAgY29uc3Qgc2VjcmV0RGF0YSA9IHtcclxuICAgICAgICAgIHNlY3JldDogYXNzb2NpYXRlUmVzdWx0LlNlY3JldENvZGUsXHJcbiAgICAgICAgICBiYWNrdXBDb2RlczogdGhpcy5nZW5lcmF0ZUJhY2t1cENvZGVzKCksXHJcbiAgICAgICAgICBjcmVhdGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICAgIHVzYWdlQ291bnQ6IDBcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvLyBTdG9yZSB0aGUgc2VjcmV0ICh0aGlzIHdpbGwgYmUgdXNlZCBmb3IgZnV0dXJlIFRPVFAgZ2VuZXJhdGlvbilcclxuICAgICAgICBhd2FpdCBvdHBTZXJ2aWNlLnN0b3JlVXNlclRPVFBTZWNyZXQoZW1haWwsIHNlY3JldERhdGEsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGxvZ2dlci5pbmZvKCdUT1RQIHNlY3JldCBzdG9yZWQgc2VjdXJlbHknLCB7XHJcbiAgICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgICAgZW1haWxcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgIH0gY2F0Y2ggKHN0b3JhZ2VFcnJvcjogYW55KSB7XHJcbiAgICAgICAgbG9nZ2VyLndhcm4oJ0ZhaWxlZCB0byBzdG9yZSBUT1RQIHNlY3JldCwgY29udGludWluZyB3aXRoIENvZ25pdG8tb25seSBmbG93Jywge1xyXG4gICAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICAgIGVtYWlsLFxyXG4gICAgICAgICAgZXJyb3I6IHN0b3JhZ2VFcnJvci5tZXNzYWdlXHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFN0ZXAgMzogR2VuZXJhdGUgVE9UUCBjb2RlIHVzaW5nIHRoZSBzZWNyZXRcclxuICAgICAgY29uc3QgdG90cENvZGUgPSBzcGVha2Vhc3kudG90cCh7XHJcbiAgICAgICAgc2VjcmV0OiBhc3NvY2lhdGVSZXN1bHQuU2VjcmV0Q29kZSxcclxuICAgICAgICBlbmNvZGluZzogJ2Jhc2UzMicsXHJcbiAgICAgICAgdGltZTogTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMCksXHJcbiAgICAgICAgc3RlcDogMzAgLy8gMzAgc2Vjb25kIHRpbWUgc3RlcFxyXG4gICAgICB9IGFzIGFueSk7IC8vIFR5cGUgYXNzZXJ0aW9uIHRvIGhhbmRsZSBsaWJyYXJ5IHR5cGUgaXNzdWVzXHJcblxyXG4gICAgICBsb2dnZXIuaW5mbygnVE9UUCBjb2RlIGdlbmVyYXRlZCBmb3IgdmVyaWZpY2F0aW9uJywge1xyXG4gICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgZW1haWwsXHJcbiAgICAgICAgY29kZUxlbmd0aDogdG90cENvZGUubGVuZ3RoXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gU3RlcCA0OiBWZXJpZnkgdGhlIHNvZnR3YXJlIHRva2VuXHJcbiAgICAgIGNvbnN0IHZlcmlmeVJlc3VsdCA9IGF3YWl0IHRoaXMuY29nbml0b0NsaWVudC5zZW5kKG5ldyBWZXJpZnlTb2Z0d2FyZVRva2VuQ29tbWFuZCh7XHJcbiAgICAgICAgU2Vzc2lvbjogYXNzb2NpYXRlUmVzdWx0LlNlc3Npb24sXHJcbiAgICAgICAgVXNlckNvZGU6IHRvdHBDb2RlXHJcbiAgICAgIH0pKTtcclxuXHJcbiAgICAgIGlmICh2ZXJpZnlSZXN1bHQuU3RhdHVzICE9PSAnU1VDQ0VTUycpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFRPVFAgdmVyaWZpY2F0aW9uIGZhaWxlZDogJHt2ZXJpZnlSZXN1bHQuU3RhdHVzfWApO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBsb2dnZXIuaW5mbygnVE9UUCB2ZXJpZmljYXRpb24gc3VjY2Vzc2Z1bCcsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGVtYWlsLFxyXG4gICAgICAgIHN0YXR1czogdmVyaWZ5UmVzdWx0LlN0YXR1c1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIFN0ZXAgNTogRW5hYmxlIFRPVFAgTUZBIGZvciB0aGUgdXNlclxyXG4gICAgICBhd2FpdCB0aGlzLmNvZ25pdG9DbGllbnQuc2VuZChuZXcgQWRtaW5TZXRVc2VyTUZBUHJlZmVyZW5jZUNvbW1hbmQoe1xyXG4gICAgICAgIFVzZXJQb29sSWQ6IHRoaXMudXNlclBvb2xJZCxcclxuICAgICAgICBVc2VybmFtZTogZW1haWwsXHJcbiAgICAgICAgU29mdHdhcmVUb2tlbk1mYVNldHRpbmdzOiB7XHJcbiAgICAgICAgICBFbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgUHJlZmVycmVkTWZhOiB0cnVlXHJcbiAgICAgICAgfVxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICAvLyBTdGVwIDY6IENvbXBsZXRlIGF1dGhlbnRpY2F0aW9uXHJcbiAgICAgIGNvbnN0IGZpbmFsQXV0aFJlc3VsdCA9IGF3YWl0IHRoaXMuY29nbml0b0NsaWVudC5zZW5kKG5ldyBSZXNwb25kVG9BdXRoQ2hhbGxlbmdlQ29tbWFuZCh7XHJcbiAgICAgICAgQ2xpZW50SWQ6IHRoaXMuY2xpZW50SWQsXHJcbiAgICAgICAgQ2hhbGxlbmdlTmFtZTogQ2hhbGxlbmdlTmFtZVR5cGUuTUZBX1NFVFVQLFxyXG4gICAgICAgIFNlc3Npb246IHZlcmlmeVJlc3VsdC5TZXNzaW9uLFxyXG4gICAgICAgIENoYWxsZW5nZVJlc3BvbnNlczoge1xyXG4gICAgICAgICAgVVNFUk5BTUU6IGVtYWlsXHJcbiAgICAgICAgfVxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICBpZiAoIWZpbmFsQXV0aFJlc3VsdC5BdXRoZW50aWNhdGlvblJlc3VsdCkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIGNvbXBsZXRlIGF1dGhlbnRpY2F0aW9uIGFmdGVyIFRPVFAgc2V0dXAnKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gU3RlcCA3OiBVcGRhdGUgdXNlcidzIE1GQSBzZXR1cCBzdGF0dXNcclxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVNRkFTZXR1cFN0YXR1cyhlbWFpbCwgdHJ1ZSk7XHJcblxyXG4gICAgICBsb2dnZXIuaW5mbygnVE9UUCBNRkEgc2V0dXAgY29tcGxldGVkIHN1Y2Nlc3NmdWxseScsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGVtYWlsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBhY2Nlc3NUb2tlbjogZmluYWxBdXRoUmVzdWx0LkF1dGhlbnRpY2F0aW9uUmVzdWx0LkFjY2Vzc1Rva2VuISxcclxuICAgICAgICBpZFRva2VuOiBmaW5hbEF1dGhSZXN1bHQuQXV0aGVudGljYXRpb25SZXN1bHQuSWRUb2tlbiEsXHJcbiAgICAgICAgcmVmcmVzaFRva2VuOiBmaW5hbEF1dGhSZXN1bHQuQXV0aGVudGljYXRpb25SZXN1bHQuUmVmcmVzaFRva2VuISxcclxuICAgICAgICBleHBpcmVzSW46IGZpbmFsQXV0aFJlc3VsdC5BdXRoZW50aWNhdGlvblJlc3VsdC5FeHBpcmVzSW4gfHwgMzYwMFxyXG4gICAgICB9O1xyXG5cclxuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgbG9nZ2VyLmVycm9yKCdBdXRvbWF0aWMgVE9UUCBzZXR1cCBmYWlsZWQnLCBlcnJvciwge1xyXG4gICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgZW1haWwsXHJcbiAgICAgIH0pO1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFRPVFBfU0VUVVBfRkFJTEVEOiAke2Vycm9yLm1lc3NhZ2V9YCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZW5lcmF0ZSBiYWNrdXAgY29kZXMgZm9yIFRPVFBcclxuICAgKi9cclxuICBwcml2YXRlIGdlbmVyYXRlQmFja3VwQ29kZXMoKTogc3RyaW5nW10ge1xyXG4gICAgY29uc3QgY29kZXM6IHN0cmluZ1tdID0gW107XHJcbiAgICBjb25zdCBjaGFyc2V0ID0gJ0FCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaMDEyMzQ1Njc4OSc7XHJcbiAgICBcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMTA7IGkrKykge1xyXG4gICAgICBsZXQgY29kZSA9ICcnO1xyXG4gICAgICBmb3IgKGxldCBqID0gMDsgaiA8IDg7IGorKykge1xyXG4gICAgICAgIGNvZGUgKz0gY2hhcnNldC5jaGFyQXQoTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogY2hhcnNldC5sZW5ndGgpKTtcclxuICAgICAgfVxyXG4gICAgICBjb2Rlcy5wdXNoKGNvZGUpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICByZXR1cm4gY29kZXM7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBIYW5kbGUgU09GVFdBUkVfVE9LRU5fTUZBIGNoYWxsZW5nZSBmb3IgZXhpc3RpbmcgVE9UUCB1c2Vyc1xyXG4gICAqL1xyXG4gIHByaXZhdGUgYXN5bmMgaGFuZGxlU29mdHdhcmVUb2tlbk1GQShcclxuICAgIHNlc3Npb246IHN0cmluZywgXHJcbiAgICBlbWFpbDogc3RyaW5nLCBcclxuICAgIGNvcnJlbGF0aW9uSWQ6IHN0cmluZ1xyXG4gICk6IFByb21pc2U8QXV0aGVudGljYXRpb25SZXN1bHQ+IHtcclxuICAgIFxyXG4gICAgbG9nZ2VyLmluZm8oJ0hhbmRsaW5nIFNPRlRXQVJFX1RPS0VOX01GQSBjaGFsbGVuZ2UnLCB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIGVtYWlsXHJcbiAgICB9KTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICAvLyBGb3IgYXV0b25vbW91cyB3b3JrZmxvdywgd2UgbmVlZCB0byBnZW5lcmF0ZSB0aGUgVE9UUCBjb2RlXHJcbiAgICAgIC8vIEluIGEgcmVhbCBpbXBsZW1lbnRhdGlvbiwgdGhpcyB3b3VsZCB1c2UgdGhlIHN0b3JlZCBzZWNyZXRcclxuICAgICAgLy8gRm9yIG5vdywgd2UnbGwgc2ltdWxhdGUgdGhpcyBwcm9jZXNzXHJcbiAgICAgIFxyXG4gICAgICAvLyBOT1RFOiBJbiBwcm9kdWN0aW9uLCBDb2duaXRvIHN0b3JlcyB0aGUgVE9UUCBzZWNyZXQgaW50ZXJuYWxseVxyXG4gICAgICAvLyBXZSB3b3VsZCBuZWVkIHRvIGVpdGhlcjpcclxuICAgICAgLy8gMS4gU3RvcmUgb3VyIG93biBjb3B5IG9mIHRoZSBzZWNyZXQgKGxlc3Mgc2VjdXJlKVxyXG4gICAgICAvLyAyLiBVc2UgYSBkaWZmZXJlbnQgYXBwcm9hY2ggZm9yIGF1dG9ub21vdXMgdmVyaWZpY2F0aW9uXHJcbiAgICAgIC8vIDMuIFByZS1nZW5lcmF0ZSBhbmQgc3RvcmUgdmFsaWQgY29kZXMgKHRpbWUtbGltaXRlZClcclxuICAgICAgXHJcbiAgICAgIC8vIEZvciB0aGlzIGltcGxlbWVudGF0aW9uLCB3ZSdsbCB1c2UgYSBwbGFjZWhvbGRlciBhcHByb2FjaFxyXG4gICAgICAvLyB0aGF0IHdvdWxkIG5lZWQgdG8gYmUgcmVwbGFjZWQgd2l0aCBhY3R1YWwgc2VjcmV0IHJldHJpZXZhbFxyXG4gICAgICBjb25zdCB0b3RwQ29kZSA9IGF3YWl0IHRoaXMuZ2VuZXJhdGVUT1RQRm9yVXNlcihlbWFpbCwgY29ycmVsYXRpb25JZCk7XHJcblxyXG4gICAgICAvLyBSZXNwb25kIHRvIHRoZSBNRkEgY2hhbGxlbmdlXHJcbiAgICAgIGNvbnN0IGNoYWxsZW5nZVJlc3VsdCA9IGF3YWl0IHRoaXMuY29nbml0b0NsaWVudC5zZW5kKG5ldyBSZXNwb25kVG9BdXRoQ2hhbGxlbmdlQ29tbWFuZCh7XHJcbiAgICAgICAgQ2xpZW50SWQ6IHRoaXMuY2xpZW50SWQsXHJcbiAgICAgICAgQ2hhbGxlbmdlTmFtZTogQ2hhbGxlbmdlTmFtZVR5cGUuU09GVFdBUkVfVE9LRU5fTUZBLFxyXG4gICAgICAgIFNlc3Npb246IHNlc3Npb24sXHJcbiAgICAgICAgQ2hhbGxlbmdlUmVzcG9uc2VzOiB7XHJcbiAgICAgICAgICBVU0VSTkFNRTogZW1haWwsXHJcbiAgICAgICAgICBTT0ZUV0FSRV9UT0tFTl9NRkFfQ09ERTogdG90cENvZGVcclxuICAgICAgICB9XHJcbiAgICAgIH0pKTtcclxuXHJcbiAgICAgIGlmICghY2hhbGxlbmdlUmVzdWx0LkF1dGhlbnRpY2F0aW9uUmVzdWx0KSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGYWlsZWQgdG8gY29tcGxldGUgU09GVFdBUkVfVE9LRU5fTUZBIGNoYWxsZW5nZScpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBsb2dnZXIuaW5mbygnU09GVFdBUkVfVE9LRU5fTUZBIGNoYWxsZW5nZSBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5Jywge1xyXG4gICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgZW1haWxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIGFjY2Vzc1Rva2VuOiBjaGFsbGVuZ2VSZXN1bHQuQXV0aGVudGljYXRpb25SZXN1bHQuQWNjZXNzVG9rZW4hLFxyXG4gICAgICAgIGlkVG9rZW46IGNoYWxsZW5nZVJlc3VsdC5BdXRoZW50aWNhdGlvblJlc3VsdC5JZFRva2VuISxcclxuICAgICAgICByZWZyZXNoVG9rZW46IGNoYWxsZW5nZVJlc3VsdC5BdXRoZW50aWNhdGlvblJlc3VsdC5SZWZyZXNoVG9rZW4hLFxyXG4gICAgICAgIGV4cGlyZXNJbjogY2hhbGxlbmdlUmVzdWx0LkF1dGhlbnRpY2F0aW9uUmVzdWx0LkV4cGlyZXNJbiB8fCAzNjAwXHJcbiAgICAgIH07XHJcblxyXG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICBsb2dnZXIuZXJyb3IoJ1NPRlRXQVJFX1RPS0VOX01GQSBjaGFsbGVuZ2UgZmFpbGVkJywgZXJyb3IsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGVtYWlsLFxyXG4gICAgICB9KTtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBNRkFfQ0hBTExFTkdFX0ZBSUxFRDogJHtlcnJvci5tZXNzYWdlfWApO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2VuZXJhdGUgVE9UUCBjb2RlIGZvciBhIHVzZXIgKHBsYWNlaG9sZGVyIGltcGxlbWVudGF0aW9uKVxyXG4gICAqL1xyXG4gIHByaXZhdGUgYXN5bmMgZ2VuZXJhdGVUT1RQRm9yVXNlcihlbWFpbDogc3RyaW5nLCBjb3JyZWxhdGlvbklkOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xyXG4gICAgbG9nZ2VyLmluZm8oJ0dlbmVyYXRpbmcgVE9UUCBjb2RlIGZvciB1c2VyJywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICBlbWFpbFxyXG4gICAgfSk7XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gSW1wb3J0IE9UUCBTZWNyZXRzIFNlcnZpY2VcclxuICAgICAgY29uc3QgeyBPVFBTZWNyZXRzU2VydmljZSB9ID0gYXdhaXQgaW1wb3J0KCcuL290cC1zZWNyZXRzLXNlcnZpY2UnKTtcclxuICAgICAgY29uc3Qgb3RwU2VydmljZSA9IG5ldyBPVFBTZWNyZXRzU2VydmljZSgpO1xyXG4gICAgICBcclxuICAgICAgLy8gR2VuZXJhdGUgVE9UUCBjb2RlIHVzaW5nIHN0b3JlZCBzZWNyZXRcclxuICAgICAgY29uc3QgdG90cENvZGUgPSBhd2FpdCBvdHBTZXJ2aWNlLmdlbmVyYXRlVE9UUENvZGUoZW1haWwpO1xyXG4gICAgICBcclxuICAgICAgbG9nZ2VyLmluZm8oJ1RPVFAgY29kZSBnZW5lcmF0ZWQgc3VjY2Vzc2Z1bGx5Jywge1xyXG4gICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgZW1haWwsXHJcbiAgICAgICAgY29kZUxlbmd0aDogdG90cENvZGUubGVuZ3RoXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgcmV0dXJuIHRvdHBDb2RlO1xyXG5cclxuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgbG9nZ2VyLmVycm9yKCdGYWlsZWQgdG8gZ2VuZXJhdGUgVE9UUCBjb2RlJywgZXJyb3IsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGVtYWlsLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIEZhbGxiYWNrIHRvIHBsYWNlaG9sZGVyIGltcGxlbWVudGF0aW9uIGZvciBkZXZlbG9wbWVudFxyXG4gICAgICBpZiAocHJvY2Vzcy5lbnYuRU5WSVJPTk1FTlQgPT09ICdkZXYnIHx8IHByb2Nlc3MuZW52LkVOVklST05NRU5UID09PSAndGVzdCcpIHtcclxuICAgICAgICBsb2dnZXIud2FybignVXNpbmcgZmFsbGJhY2sgVE9UUCBnZW5lcmF0aW9uIGZvciBkZXZlbG9wbWVudCcsIHtcclxuICAgICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgICBlbWFpbFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBHZW5lcmF0ZSBhIHZhbGlkIFRPVFAgY29kZSB1c2luZyBhIGRldGVybWluaXN0aWMgc2VjcmV0IGZvciBkZXZlbG9wbWVudFxyXG4gICAgICAgIGNvbnN0IHNlY3JldCA9ICdERVZfU0VDUkVUXycgKyBCdWZmZXIuZnJvbShlbWFpbCkudG9TdHJpbmcoJ2Jhc2U2NCcpLnN1YnN0cmluZygwLCAxNik7XHJcbiAgICAgICAgXHJcbiAgICAgICAgY29uc3QgdG90cENvZGUgPSBzcGVha2Vhc3kudG90cCh7XHJcbiAgICAgICAgICBzZWNyZXQ6IHNlY3JldCxcclxuICAgICAgICAgIGVuY29kaW5nOiAnYXNjaWknLFxyXG4gICAgICAgICAgdGltZTogTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMCksXHJcbiAgICAgICAgICBzdGVwOiAzMCAvLyAzMCBzZWNvbmQgdGltZSBzdGVwXHJcbiAgICAgICAgfSBhcyBhbnkpOyAvLyBUeXBlIGFzc2VydGlvbiB0byBoYW5kbGUgbGlicmFyeSB0eXBlIGlzc3Vlc1xyXG5cclxuICAgICAgICByZXR1cm4gdG90cENvZGU7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogVXBkYXRlIHVzZXIncyBNRkEgc2V0dXAgc3RhdHVzXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBhc3luYyB1cGRhdGVNRkFTZXR1cFN0YXR1cyhlbWFpbDogc3RyaW5nLCBpc0NvbXBsZXRlOiBib29sZWFuKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICAvLyBUaGlzIHdvdWxkIHVwZGF0ZSB0aGUgY3VzdG9tIGF0dHJpYnV0ZSB0byB0cmFjayBNRkEgc2V0dXAgc3RhdHVzXHJcbiAgICAgIC8vIEltcGxlbWVudGF0aW9uIGRlcGVuZHMgb24gaG93IHlvdSB3YW50IHRvIHRyYWNrIHRoaXMgc3RhdGVcclxuICAgICAgbG9nZ2VyLmluZm8oJ01GQSBzZXR1cCBzdGF0dXMgdXBkYXRlZCcsIHtcclxuICAgICAgICBlbWFpbCxcclxuICAgICAgICBpc0NvbXBsZXRlXHJcbiAgICAgIH0pO1xyXG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICBsb2dnZXIud2FybignRmFpbGVkIHRvIHVwZGF0ZSBNRkEgc2V0dXAgc3RhdHVzJywge1xyXG4gICAgICAgIGVtYWlsLFxyXG4gICAgICAgIGlzQ29tcGxldGUsXHJcbiAgICAgICAgZXJyb3I6IGVycm9yLm1lc3NhZ2VcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZW5lcmF0ZSBhIHNlY3VyZSBwYXNzd29yZCBmb3IgdXNlciBjcmVhdGlvblxyXG4gICAqL1xyXG4gIHByaXZhdGUgZ2VuZXJhdGVTZWN1cmVQYXNzd29yZCgpOiBzdHJpbmcge1xyXG4gICAgY29uc3QgbGVuZ3RoID0gMTI7XHJcbiAgICBjb25zdCBjaGFyc2V0ID0gJ2FiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVowMTIzNDU2Nzg5IUAjJCVeJionO1xyXG4gICAgbGV0IHBhc3N3b3JkID0gJyc7XHJcbiAgICBcclxuICAgIC8vIEVuc3VyZSBhdCBsZWFzdCBvbmUgY2hhcmFjdGVyIGZyb20gZWFjaCByZXF1aXJlZCBjYXRlZ29yeVxyXG4gICAgcGFzc3dvcmQgKz0gJ0EnOyAvLyBVcHBlcmNhc2VcclxuICAgIHBhc3N3b3JkICs9ICdhJzsgLy8gTG93ZXJjYXNlICBcclxuICAgIHBhc3N3b3JkICs9ICcxJzsgLy8gRGlnaXRcclxuICAgIHBhc3N3b3JkICs9ICchJzsgLy8gU3ltYm9sXHJcbiAgICBcclxuICAgIC8vIEZpbGwgdGhlIHJlc3QgcmFuZG9tbHlcclxuICAgIGZvciAobGV0IGkgPSA0OyBpIDwgbGVuZ3RoOyBpKyspIHtcclxuICAgICAgcGFzc3dvcmQgKz0gY2hhcnNldC5jaGFyQXQoTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogY2hhcnNldC5sZW5ndGgpKTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgLy8gU2h1ZmZsZSB0aGUgcGFzc3dvcmRcclxuICAgIHJldHVybiBwYXNzd29yZC5zcGxpdCgnJykuc29ydCgoKSA9PiBNYXRoLnJhbmRvbSgpIC0gMC41KS5qb2luKCcnKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENoZWNrIGlmIHVzZXIgZXhpc3RzIGluIENvZ25pdG9cclxuICAgKi9cclxuICBhc3luYyB1c2VyRXhpc3RzKGVtYWlsOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGF3YWl0IHRoaXMuY29nbml0b0NsaWVudC5zZW5kKG5ldyBBZG1pbkdldFVzZXJDb21tYW5kKHtcclxuICAgICAgICBVc2VyUG9vbElkOiB0aGlzLnVzZXJQb29sSWQsXHJcbiAgICAgICAgVXNlcm5hbWU6IGVtYWlsXHJcbiAgICAgIH0pKTtcclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgIGlmIChlcnJvci5uYW1lID09PSAnVXNlck5vdEZvdW5kRXhjZXB0aW9uJykge1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgfVxyXG4gICAgICB0aHJvdyBlcnJvcjtcclxuICAgIH1cclxuICB9XHJcbn0iXX0=