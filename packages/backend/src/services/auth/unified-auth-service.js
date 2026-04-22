"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnifiedAuthService = exports.AuthenticationState = void 0;
const client_cognito_identity_provider_1 = require("@aws-sdk/client-cognito-identity-provider");
const jwt_service_1 = require("./jwt-service");
const user_service_1 = require("../user/user-service");
const email_verification_service_1 = require("./email-verification-service");
const auth_monitoring_service_1 = require("./auth-monitoring-service");
const uuid_1 = require("uuid");
const auth_error_handler_1 = require("../../utils/auth-error-handler");
const logger_1 = require("../../utils/logger");
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
class UnifiedAuthService {
    cognitoClient;
    jwtService;
    userService;
    emailVerificationService;
    monitoringService;
    errorHandler;
    logger;
    defaultRetryConfig = {
        maxRetries: 3,
        baseDelay: 1000, // 1 second
        maxDelay: 5000 // 5 seconds
    };
    constructor() {
        this.cognitoClient = new client_cognito_identity_provider_1.CognitoIdentityProviderClient({
            region: process.env.AWS_REGION || 'us-east-1'
        });
        this.jwtService = new jwt_service_1.JWTService();
        this.userService = new user_service_1.UserService();
        this.emailVerificationService = new email_verification_service_1.EmailVerificationService();
        this.monitoringService = auth_monitoring_service_1.authMonitoringService;
        this.errorHandler = new auth_error_handler_1.AuthErrorHandler('UnifiedAuthService');
        this.logger = (0, logger_1.createLogger)('UnifiedAuthService');
    }
    /**
     * Unified authentication method that handles both quick registration and existing user login
     */
    async authenticate(request, retryConfig) {
        const config = { ...this.defaultRetryConfig, ...retryConfig };
        return this.executeWithRetry(() => this.performAuthentication(request), config, 'authentication');
    }
    /**
     * Quick registration flow - creates user if doesn't exist, logs in if exists
     */
    async quickRegister(email, name, retryConfig) {
        const config = { ...this.defaultRetryConfig, ...retryConfig };
        return this.executeWithRetry(() => this.performQuickRegistration(email, name), config, 'quick registration');
    }
    /**
     * Standard login flow - requires password
     */
    async login(email, password, retryConfig) {
        const config = { ...this.defaultRetryConfig, ...retryConfig };
        return this.executeWithRetry(() => this.performLogin(email, password), config, 'login');
    }
    /**
     * Enhanced authentication flow initiation
     */
    async initiateAuthenticationFlow(email, name) {
        const correlationId = (0, uuid_1.v4)();
        this.logger.info('Initiating authentication flow', {
            correlationId,
            email,
            hasName: !!name
        });
        // Monitor flow initiation
        this.monitoringService.onAuthFlowInitiated(correlationId, email);
        if (!this.isValidEmail(email)) {
            const error = new Error('INVALID_EMAIL: Valid email address is required');
            this.errorHandler.handleError(error, {
                operation: 'initiateAuthenticationFlow',
                email,
                step: 'validation'
            });
            throw error;
        }
        try {
            // Check if user exists and their verification status
            const userExists = await this.checkUserExists(email);
            if (!userExists) {
                // Create new user - this will require email verification
                await this.createCognitoUser(email, name || email.split('@')[0]);
                this.errorHandler.logAuthEvent('user_created', {
                    operation: 'initiateAuthenticationFlow',
                    email,
                    step: 'registration'
                }, true, { correlationId });
                return {
                    state: AuthenticationState.EMAIL_VERIFICATION_REQUIRED,
                    requiresEmailVerification: true,
                    requiresOTPSetup: false,
                    message: 'Account created successfully. Please check your email for the verification code.'
                };
            }
            // User exists, check their status
            const isEmailVerified = await this.emailVerificationService.isEmailVerified(email);
            const isOTPEnabled = await this.emailVerificationService.isOTPEnabled(email);
            this.logger.info('User authentication state checked', {
                correlationId,
                email,
                isEmailVerified,
                isOTPEnabled
            });
            if (!isEmailVerified) {
                return {
                    state: AuthenticationState.EMAIL_VERIFICATION_REQUIRED,
                    requiresEmailVerification: true,
                    requiresOTPSetup: false,
                    message: 'Please verify your email address to continue.'
                };
            }
            if (!isOTPEnabled) {
                return {
                    state: AuthenticationState.OTP_SETUP_REQUIRED,
                    requiresEmailVerification: false,
                    requiresOTPSetup: true,
                    message: 'Please complete OTP setup for enhanced security.'
                };
            }
            // User is fully set up
            return {
                state: AuthenticationState.AUTHENTICATED,
                requiresEmailVerification: false,
                requiresOTPSetup: false,
                message: 'User is ready for authentication.'
            };
        }
        catch (error) {
            this.monitoringService.onError(correlationId, email, error.message, 'flow_initiation');
            this.errorHandler.handleError(error, {
                operation: 'initiateAuthenticationFlow',
                email,
                step: 'flow_initiation'
            });
            throw new Error(`AUTH_FLOW_ERROR: ${error.message}`);
        }
    }
    /**
     * Handle email verification completion with automatic OTP setup
     */
    async handleEmailVerificationComplete(email, verificationCode) {
        const correlationId = (0, uuid_1.v4)();
        this.logger.info('Handling email verification completion', {
            correlationId,
            email
        });
        // Monitor email verification start
        this.monitoringService.onEmailVerificationStarted(correlationId, email);
        const startTime = Date.now();
        try {
            // Verify email using EmailVerificationService
            const verificationResult = await this.emailVerificationService.verifyEmail(email, verificationCode);
            if (!verificationResult.success) {
                const error = new Error(`EMAIL_VERIFICATION_FAILED: ${verificationResult.message}`);
                const durationMs = Date.now() - startTime;
                this.monitoringService.onEmailVerificationFailed(correlationId, email, verificationResult.message, durationMs);
                this.errorHandler.handleError(error, {
                    operation: 'handleEmailVerificationComplete',
                    email,
                    step: 'email_verification'
                });
                throw error;
            }
            this.errorHandler.logAuthEvent('email_verified', {
                operation: 'handleEmailVerificationComplete',
                email,
                step: 'email_verification'
            }, true, { correlationId });
            // Monitor email verification completion
            const durationMs = Date.now() - startTime;
            this.monitoringService.onEmailVerificationCompleted(correlationId, email, durationMs);
            // Email verification automatically sets up OTP, so return the setup data
            if (verificationResult.otpSecret && verificationResult.backupCodes) {
                this.logger.info('OTP setup data generated', {
                    correlationId,
                    email,
                    hasSecret: !!verificationResult.otpSecret,
                    backupCodesCount: verificationResult.backupCodes.length
                });
                // Generate temporary tokens to allow file operations before OTP setup completion
                let temporaryTokens;
                try {
                    // Get user information to create token payload
                    const userInfo = await this.userService.getUserByEmail(email);
                    if (userInfo) {
                        temporaryTokens = await this.jwtService.generateTemporaryTokenPair({
                            userId: userInfo.userId,
                            email: userInfo.email,
                            organizationId: userInfo.organizationId,
                            role: userInfo.role || 'developer' // Default role if not specified
                        });
                        this.logger.info('Temporary tokens generated for email verified user', {
                            correlationId,
                            email,
                            userId: userInfo.userId,
                            scope: temporaryTokens.scope,
                            expiresIn: temporaryTokens.expiresIn
                        });
                    }
                }
                catch (tokenError) {
                    // Log the error but don't fail the entire flow
                    this.logger.warn('Failed to generate temporary tokens, continuing without them', {
                        correlationId,
                        email,
                        error: tokenError.message
                    });
                }
                return {
                    otpSetup: {
                        secret: verificationResult.otpSecret,
                        qrCodeUrl: this.generateQRCodeUrl(email, verificationResult.otpSecret),
                        backupCodes: verificationResult.backupCodes,
                        issuer: 'MISRA Platform',
                        accountName: email
                    },
                    temporaryTokens,
                    nextStep: AuthenticationState.OTP_SETUP_REQUIRED,
                    message: 'Email verified successfully. Please complete OTP setup.'
                };
            }
            const error = new Error('OTP_SETUP_FAILED: Failed to generate OTP setup data');
            this.errorHandler.handleError(error, {
                operation: 'handleEmailVerificationComplete',
                email,
                step: 'otp_generation'
            });
            throw error;
        }
        catch (error) {
            this.monitoringService.onError(correlationId, email, error.message, 'email_verification_complete');
            this.errorHandler.handleError(error, {
                operation: 'handleEmailVerificationComplete',
                email,
                step: 'email_verification_complete'
            });
            throw new Error(`EMAIL_VERIFICATION_ERROR: ${error.message}`);
        }
    }
    /**
     * Complete OTP setup and establish user session
     */
    async completeOTPSetup(email, otpCode) {
        const correlationId = (0, uuid_1.v4)();
        this.logger.info('Completing OTP setup', {
            correlationId,
            email
        });
        // Monitor OTP setup start
        this.monitoringService.onOTPSetupStarted(correlationId, email);
        const startTime = Date.now();
        try {
            // Verify OTP code
            const otpResult = await this.emailVerificationService.verifyOTP(email, otpCode);
            if (!otpResult.success) {
                const error = new Error(`OTP_VERIFICATION_FAILED: ${otpResult.message}`);
                const durationMs = Date.now() - startTime;
                this.monitoringService.onOTPSetupFailed(correlationId, email, otpResult.message, durationMs);
                this.errorHandler.handleError(error, {
                    operation: 'completeOTPSetup',
                    email,
                    step: 'otp_verification'
                });
                throw error;
            }
            this.errorHandler.logAuthEvent('otp_verified', {
                operation: 'completeOTPSetup',
                email,
                step: 'otp_verification'
            }, true, { correlationId });
            // Monitor OTP setup completion
            const durationMs = Date.now() - startTime;
            this.monitoringService.onOTPSetupCompleted(correlationId, email, durationMs);
            // Get user information
            const cognitoUser = await this.cognitoClient.send(new client_cognito_identity_provider_1.AdminGetUserCommand({
                UserPoolId: process.env.COGNITO_USER_POOL_ID,
                Username: email
            }));
            const subAttribute = cognitoUser.UserAttributes?.find(attr => attr.Name === 'sub');
            const cognitoSub = subAttribute?.Value || (0, uuid_1.v4)();
            // Get or create user in our system
            const user = await this.getOrCreateUser(email, cognitoSub);
            this.logger.info('User retrieved for session creation', {
                correlationId,
                userId: user.userId,
                email: user.email
            });
            // Generate JWT tokens
            const tokenPair = await this.jwtService.generateTokenPair({
                userId: user.userId,
                email: user.email,
                organizationId: user.organizationId,
                role: user.role
            });
            // Monitor session creation
            this.monitoringService.onSessionCreated(correlationId, email, user.userId, durationMs);
            this.errorHandler.logAuthEvent('session_created', {
                operation: 'completeOTPSetup',
                email,
                userId: user.userId,
                step: 'session_creation'
            }, true, { correlationId });
            return {
                accessToken: tokenPair.accessToken,
                refreshToken: tokenPair.refreshToken,
                user: {
                    userId: user.userId,
                    email: user.email,
                    name: user.email.split('@')[0],
                    organizationId: user.organizationId,
                    role: user.role
                },
                expiresIn: tokenPair.expiresIn,
                isNewUser: false,
                message: 'OTP setup completed successfully. You are now logged in.'
            };
        }
        catch (error) {
            this.monitoringService.onError(correlationId, email, error.message, 'otp_setup_complete');
            this.errorHandler.handleError(error, {
                operation: 'completeOTPSetup',
                email,
                step: 'otp_setup_complete'
            });
            throw new Error(`OTP_SETUP_ERROR: ${error.message}`);
        }
    }
    /**
     * Get authentication state for a user
     */
    async getAuthenticationState(email) {
        const correlationId = (0, uuid_1.v4)();
        this.logger.info('Getting authentication state', {
            correlationId,
            email
        });
        try {
            const userExists = await this.checkUserExists(email);
            if (!userExists) {
                return AuthenticationState.INITIAL;
            }
            const isEmailVerified = await this.emailVerificationService.isEmailVerified(email);
            const isOTPEnabled = await this.emailVerificationService.isOTPEnabled(email);
            if (!isEmailVerified) {
                return AuthenticationState.EMAIL_VERIFICATION_REQUIRED;
            }
            if (!isOTPEnabled) {
                return AuthenticationState.OTP_SETUP_REQUIRED;
            }
            return AuthenticationState.AUTHENTICATED;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.monitoringService.onError(correlationId, email, errorMessage, 'state_check');
            return AuthenticationState.ERROR;
        }
    }
    /**
     * Validate authentication step
     */
    async validateAuthenticationStep(email, step) {
        const correlationId = (0, uuid_1.v4)();
        this.logger.info('Validating authentication step', {
            correlationId,
            email,
            step
        });
        try {
            const currentState = await this.getAuthenticationState(email);
            // Define valid state transitions
            const validTransitions = {
                [AuthenticationState.INITIAL]: [AuthenticationState.REGISTERING],
                [AuthenticationState.REGISTERING]: [AuthenticationState.EMAIL_VERIFICATION_REQUIRED],
                [AuthenticationState.EMAIL_VERIFICATION_REQUIRED]: [AuthenticationState.EMAIL_VERIFYING],
                [AuthenticationState.EMAIL_VERIFYING]: [AuthenticationState.OTP_SETUP_REQUIRED],
                [AuthenticationState.OTP_SETUP_REQUIRED]: [AuthenticationState.OTP_VERIFYING],
                [AuthenticationState.OTP_VERIFYING]: [AuthenticationState.AUTHENTICATED],
                [AuthenticationState.AUTHENTICATED]: [],
                [AuthenticationState.ERROR]: [AuthenticationState.INITIAL, AuthenticationState.EMAIL_VERIFICATION_REQUIRED, AuthenticationState.OTP_SETUP_REQUIRED]
            };
            return validTransitions[currentState]?.includes(step) || currentState === step;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.monitoringService.onError(correlationId, email, errorMessage, 'step_validation');
            return false;
        }
    }
    async performAuthentication(request) {
        if (!this.isValidEmail(request.email)) {
            throw new Error('INVALID_EMAIL: Valid email address is required');
        }
        // If password is provided, use standard login flow
        if (request.password) {
            return this.performLogin(request.email, request.password);
        }
        // Otherwise, use quick registration flow
        return this.performQuickRegistration(request.email, request.name);
    }
    async performQuickRegistration(email, name) {
        const userName = name || email.split('@')[0];
        let cognitoSub;
        let isNewUser = false;
        // Check if user already exists in Cognito
        try {
            const existingUser = await this.cognitoClient.send(new client_cognito_identity_provider_1.AdminGetUserCommand({
                UserPoolId: process.env.COGNITO_USER_POOL_ID,
                Username: email
            }));
            // Check if user is confirmed (email verified)
            if (existingUser.UserStatus !== 'CONFIRMED') {
                throw new Error('USER_NOT_CONFIRMED: Please verify your email address before logging in. Check your email for the verification code.');
            }
            cognitoSub = existingUser.Username;
            isNewUser = false;
        }
        catch (error) {
            if (error.name === 'UserNotFoundException') {
                // Create new user - this will require email verification
                isNewUser = true;
                cognitoSub = await this.createCognitoUser(email, userName);
                // Throw error to indicate verification is required
                throw new Error('EMAIL_VERIFICATION_REQUIRED: Account created successfully. Please check your email for the verification code to complete registration.');
            }
            else if (error.message.includes('USER_NOT_CONFIRMED')) {
                // Re-throw confirmation error
                throw error;
            }
            else {
                throw new Error(`COGNITO_ERROR: ${error.message}`);
            }
        }
        // Get or create user in our DynamoDB
        const user = await this.getOrCreateUser(email, cognitoSub);
        // Generate JWT tokens with 1-hour expiration
        const tokenPair = await this.jwtService.generateTokenPair({
            userId: user.userId,
            email: user.email,
            organizationId: user.organizationId,
            role: user.role
        });
        return {
            accessToken: tokenPair.accessToken,
            refreshToken: tokenPair.refreshToken,
            user: {
                userId: user.userId,
                email: user.email,
                name: userName,
                organizationId: user.organizationId,
                role: user.role
            },
            expiresIn: tokenPair.expiresIn,
            isNewUser,
            message: isNewUser
                ? 'Account created successfully. Session valid for 1 hour.'
                : 'Welcome back! Session valid for 1 hour.'
        };
    }
    async performLogin(email, password) {
        const clientId = process.env.COGNITO_CLIENT_ID;
        if (!clientId) {
            throw new Error('CONFIG_ERROR: Cognito client not configured');
        }
        // Authenticate against Cognito
        let cognitoSub;
        try {
            const authResult = await this.cognitoClient.send(new client_cognito_identity_provider_1.InitiateAuthCommand({
                AuthFlow: 'USER_PASSWORD_AUTH',
                ClientId: clientId,
                AuthParameters: {
                    USERNAME: email,
                    PASSWORD: password,
                },
            }));
            if (!authResult.AuthenticationResult?.IdToken) {
                throw new Error('INVALID_CREDENTIALS: Invalid email or password');
            }
            // Decode Cognito ID token to get sub
            const parts = authResult.AuthenticationResult.IdToken.split('.');
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
            cognitoSub = payload.sub;
        }
        catch (cognitoError) {
            if (cognitoError.name === 'NotAuthorizedException' ||
                cognitoError.name === 'UserNotFoundException') {
                throw new Error('INVALID_CREDENTIALS: Invalid email or password');
            }
            if (cognitoError.name === 'UserNotConfirmedException') {
                throw new Error('USER_NOT_CONFIRMED: User is not confirmed. Please verify your email.');
            }
            throw new Error(`AUTH_ERROR: ${cognitoError.message}`);
        }
        // Get or create user in our DynamoDB
        const user = await this.getOrCreateUser(email, cognitoSub);
        // Generate JWT tokens with 1-hour expiration
        const tokenPair = await this.jwtService.generateTokenPair({
            userId: user.userId,
            email: user.email,
            organizationId: user.organizationId,
            role: user.role
        });
        return {
            accessToken: tokenPair.accessToken,
            refreshToken: tokenPair.refreshToken,
            user: {
                userId: user.userId,
                email: user.email,
                name: user.email.split('@')[0], // Default name from email
                organizationId: user.organizationId,
                role: user.role
            },
            expiresIn: tokenPair.expiresIn,
            isNewUser: false,
            message: 'Login successful. Session valid for 1 hour.'
        };
    }
    async createCognitoUser(email, userName) {
        const tempPassword = this.generateTempPassword();
        const permanentPassword = this.generateSecurePassword();
        try {
            // Create user in Cognito
            await this.cognitoClient.send(new client_cognito_identity_provider_1.AdminCreateUserCommand({
                UserPoolId: process.env.COGNITO_USER_POOL_ID,
                Username: email,
                TemporaryPassword: tempPassword,
                MessageAction: 'SUPPRESS', // Don't send welcome email
                UserAttributes: [
                    { Name: 'email', Value: email },
                    { Name: 'email_verified', Value: 'true' },
                    { Name: 'name', Value: userName }
                ]
            }));
            // Set permanent password for seamless experience
            await this.cognitoClient.send(new client_cognito_identity_provider_1.AdminSetUserPasswordCommand({
                UserPoolId: process.env.COGNITO_USER_POOL_ID,
                Username: email,
                Password: permanentPassword,
                Permanent: true
            }));
            // Get the Cognito sub from the created user
            const newUser = await this.cognitoClient.send(new client_cognito_identity_provider_1.AdminGetUserCommand({
                UserPoolId: process.env.COGNITO_USER_POOL_ID,
                Username: email
            }));
            const subAttribute = newUser.UserAttributes?.find(attr => attr.Name === 'sub');
            return subAttribute?.Value || (0, uuid_1.v4)();
        }
        catch (createError) {
            throw new Error(`USER_CREATION_FAILED: ${createError.message}`);
        }
    }
    async getOrCreateUser(email, cognitoSub) {
        // Check if user exists in our DynamoDB
        let user = await this.userService.getUserByEmail(email);
        if (!user) {
            // Create user in our system
            try {
                user = await this.userService.createUser({
                    email,
                    organizationId: cognitoSub, // Use Cognito sub as organization ID
                    role: 'developer',
                    preferences: {
                        theme: 'light',
                        notifications: {
                            email: true,
                            webhook: false
                        },
                        defaultMisraRuleSet: 'MISRA_C_2012'
                    }
                });
            }
            catch (userError) {
                throw new Error(`USER_CREATION_FAILED: ${userError.message}`);
            }
        }
        else {
            // Update last login for existing user
            await this.userService.updateLastLogin(user.userId);
        }
        return user;
    }
    async executeWithRetry(operation, config, operationType) {
        let lastError;
        for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
            try {
                return await operation();
            }
            catch (error) {
                lastError = error;
                // Don't retry on certain error types
                if (this.isNonRetryableError(error)) {
                    throw error;
                }
                // If this was the last attempt, throw the error
                if (attempt === config.maxRetries) {
                    throw new Error(`${operationType.toUpperCase()}_RETRY_EXHAUSTED: Failed after ${config.maxRetries + 1} attempts. Last error: ${error.message}`);
                }
                // Calculate delay with exponential backoff
                const delay = Math.min(config.baseDelay * Math.pow(2, attempt), config.maxDelay);
                console.warn(`${operationType} attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error.message);
                await this.sleep(delay);
            }
        }
        throw lastError;
    }
    isNonRetryableError(error) {
        const message = error.message;
        // Don't retry validation errors
        if (message.includes('INVALID_EMAIL') ||
            message.includes('INVALID_CREDENTIALS') ||
            message.includes('USER_NOT_CONFIRMED') ||
            message.includes('CONFIG_ERROR')) {
            return true;
        }
        return false;
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    generateTempPassword() {
        return Math.random().toString(36).slice(-12) + 'A1!';
    }
    generateSecurePassword() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < 16; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password + 'A1!'; // Ensure it meets Cognito requirements
    }
    /**
     * Check if user exists in Cognito
     */
    async checkUserExists(email) {
        const correlationId = (0, uuid_1.v4)();
        this.logger.info('Checking if user exists', {
            correlationId,
            email
        });
        try {
            await this.cognitoClient.send(new client_cognito_identity_provider_1.AdminGetUserCommand({
                UserPoolId: process.env.COGNITO_USER_POOL_ID,
                Username: email
            }));
            return true;
        }
        catch (error) {
            if (error.name === 'UserNotFoundException') {
                return false;
            }
            this.monitoringService.onError(correlationId, email, error.message, 'user_check');
            throw error;
        }
    }
    /**
     * Generate QR code URL for OTP setup
     */
    generateQRCodeUrl(email, secret) {
        const correlationId = (0, uuid_1.v4)();
        this.logger.info('Generating QR code URL', {
            correlationId,
            email
        });
        const issuer = 'MISRA Platform';
        const label = `${issuer}:${email}`;
        const otpAuthUrl = `otpauth://totp/${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
        // Return Google Charts QR code URL
        return `https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=${encodeURIComponent(otpAuthUrl)}`;
    }
}
exports.UnifiedAuthService = UnifiedAuthService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW5pZmllZC1hdXRoLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1bmlmaWVkLWF1dGgtc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxnR0FPbUQ7QUFDbkQsK0NBQStEO0FBQy9ELHVEQUFtRDtBQUNuRCw2RUFBd0U7QUFDeEUsdUVBQXlGO0FBQ3pGLCtCQUFvQztBQUNwQyx1RUFBa0U7QUFDbEUsK0NBQWtEO0FBMkJsRCxJQUFZLG1CQVNYO0FBVEQsV0FBWSxtQkFBbUI7SUFDN0IsMENBQW1CLENBQUE7SUFDbkIsa0RBQTJCLENBQUE7SUFDM0Isa0ZBQTJELENBQUE7SUFDM0QsMERBQW1DLENBQUE7SUFDbkMsZ0VBQXlDLENBQUE7SUFDekMsc0RBQStCLENBQUE7SUFDL0Isc0RBQStCLENBQUE7SUFDL0Isc0NBQWUsQ0FBQTtBQUNqQixDQUFDLEVBVFcsbUJBQW1CLG1DQUFuQixtQkFBbUIsUUFTOUI7QUE2QkQsTUFBYSxrQkFBa0I7SUFDckIsYUFBYSxDQUFnQztJQUM3QyxVQUFVLENBQWE7SUFDdkIsV0FBVyxDQUFjO0lBQ3pCLHdCQUF3QixDQUEyQjtJQUNuRCxpQkFBaUIsQ0FBd0I7SUFDekMsWUFBWSxDQUFtQjtJQUMvQixNQUFNLENBQWtDO0lBQ3hDLGtCQUFrQixHQUFnQjtRQUN4QyxVQUFVLEVBQUUsQ0FBQztRQUNiLFNBQVMsRUFBRSxJQUFJLEVBQUUsV0FBVztRQUM1QixRQUFRLEVBQUUsSUFBSSxDQUFHLFlBQVk7S0FDOUIsQ0FBQztJQUVGO1FBQ0UsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLGdFQUE2QixDQUFDO1lBQ3JELE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXO1NBQzlDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSx3QkFBVSxFQUFFLENBQUM7UUFDbkMsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLDBCQUFXLEVBQUUsQ0FBQztRQUNyQyxJQUFJLENBQUMsd0JBQXdCLEdBQUcsSUFBSSxxREFBd0IsRUFBRSxDQUFDO1FBQy9ELElBQUksQ0FBQyxpQkFBaUIsR0FBRywrQ0FBcUIsQ0FBQztRQUMvQyxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUkscUNBQWdCLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUMvRCxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUEscUJBQVksRUFBQyxvQkFBb0IsQ0FBQyxDQUFDO0lBQ25ELENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxZQUFZLENBQUMsT0FBb0IsRUFBRSxXQUFrQztRQUN6RSxNQUFNLE1BQU0sR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEdBQUcsV0FBVyxFQUFFLENBQUM7UUFFOUQsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQzFCLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxPQUFPLENBQUMsRUFDekMsTUFBTSxFQUNOLGdCQUFnQixDQUNqQixDQUFDO0lBQ0osQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLGFBQWEsQ0FBQyxLQUFhLEVBQUUsSUFBYSxFQUFFLFdBQWtDO1FBQ2xGLE1BQU0sTUFBTSxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxXQUFXLEVBQUUsQ0FBQztRQUU5RCxPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FDMUIsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsRUFDaEQsTUFBTSxFQUNOLG9CQUFvQixDQUNyQixDQUFDO0lBQ0osQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFhLEVBQUUsUUFBZ0IsRUFBRSxXQUFrQztRQUM3RSxNQUFNLE1BQU0sR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEdBQUcsV0FBVyxFQUFFLENBQUM7UUFFOUQsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQzFCLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxFQUN4QyxNQUFNLEVBQ04sT0FBTyxDQUNSLENBQUM7SUFDSixDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsMEJBQTBCLENBQUMsS0FBYSxFQUFFLElBQWE7UUFDM0QsTUFBTSxhQUFhLEdBQUcsSUFBQSxTQUFNLEdBQUUsQ0FBQztRQUUvQixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxnQ0FBZ0MsRUFBRTtZQUNqRCxhQUFhO1lBQ2IsS0FBSztZQUNMLE9BQU8sRUFBRSxDQUFDLENBQUMsSUFBSTtTQUNoQixDQUFDLENBQUM7UUFFSCwwQkFBMEI7UUFDMUIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLG1CQUFtQixDQUFDLGFBQWEsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUVqRSxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzlCLE1BQU0sS0FBSyxHQUFHLElBQUksS0FBSyxDQUFDLGdEQUFnRCxDQUFDLENBQUM7WUFDMUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFO2dCQUNuQyxTQUFTLEVBQUUsNEJBQTRCO2dCQUN2QyxLQUFLO2dCQUNMLElBQUksRUFBRSxZQUFZO2FBQ25CLENBQUMsQ0FBQztZQUNILE1BQU0sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUVELElBQUksQ0FBQztZQUNILHFEQUFxRDtZQUNyRCxNQUFNLFVBQVUsR0FBRyxNQUFNLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUM7WUFFckQsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUNoQix5REFBeUQ7Z0JBQ3pELE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssRUFBRSxJQUFJLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUVqRSxJQUFJLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQyxjQUFjLEVBQUU7b0JBQzdDLFNBQVMsRUFBRSw0QkFBNEI7b0JBQ3ZDLEtBQUs7b0JBQ0wsSUFBSSxFQUFFLGNBQWM7aUJBQ3JCLEVBQUUsSUFBSSxFQUFFLEVBQUUsYUFBYSxFQUFFLENBQUMsQ0FBQztnQkFFNUIsT0FBTztvQkFDTCxLQUFLLEVBQUUsbUJBQW1CLENBQUMsMkJBQTJCO29CQUN0RCx5QkFBeUIsRUFBRSxJQUFJO29CQUMvQixnQkFBZ0IsRUFBRSxLQUFLO29CQUN2QixPQUFPLEVBQUUsa0ZBQWtGO2lCQUM1RixDQUFDO1lBQ0osQ0FBQztZQUVELGtDQUFrQztZQUNsQyxNQUFNLGVBQWUsR0FBRyxNQUFNLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDbkYsTUFBTSxZQUFZLEdBQUcsTUFBTSxJQUFJLENBQUMsd0JBQXdCLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBRTdFLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLG1DQUFtQyxFQUFFO2dCQUNwRCxhQUFhO2dCQUNiLEtBQUs7Z0JBQ0wsZUFBZTtnQkFDZixZQUFZO2FBQ2IsQ0FBQyxDQUFDO1lBRUgsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO2dCQUNyQixPQUFPO29CQUNMLEtBQUssRUFBRSxtQkFBbUIsQ0FBQywyQkFBMkI7b0JBQ3RELHlCQUF5QixFQUFFLElBQUk7b0JBQy9CLGdCQUFnQixFQUFFLEtBQUs7b0JBQ3ZCLE9BQU8sRUFBRSwrQ0FBK0M7aUJBQ3pELENBQUM7WUFDSixDQUFDO1lBRUQsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO2dCQUNsQixPQUFPO29CQUNMLEtBQUssRUFBRSxtQkFBbUIsQ0FBQyxrQkFBa0I7b0JBQzdDLHlCQUF5QixFQUFFLEtBQUs7b0JBQ2hDLGdCQUFnQixFQUFFLElBQUk7b0JBQ3RCLE9BQU8sRUFBRSxrREFBa0Q7aUJBQzVELENBQUM7WUFDSixDQUFDO1lBRUQsdUJBQXVCO1lBQ3ZCLE9BQU87Z0JBQ0wsS0FBSyxFQUFFLG1CQUFtQixDQUFDLGFBQWE7Z0JBQ3hDLHlCQUF5QixFQUFFLEtBQUs7Z0JBQ2hDLGdCQUFnQixFQUFFLEtBQUs7Z0JBQ3ZCLE9BQU8sRUFBRSxtQ0FBbUM7YUFDN0MsQ0FBQztRQUNKLENBQUM7UUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO1lBQ3BCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsT0FBTyxFQUFFLGlCQUFpQixDQUFDLENBQUM7WUFDdkYsSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFO2dCQUNuQyxTQUFTLEVBQUUsNEJBQTRCO2dCQUN2QyxLQUFLO2dCQUNMLElBQUksRUFBRSxpQkFBaUI7YUFDeEIsQ0FBQyxDQUFDO1lBQ0gsTUFBTSxJQUFJLEtBQUssQ0FBQyxvQkFBb0IsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7UUFDdkQsQ0FBQztJQUNILENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQywrQkFBK0IsQ0FBQyxLQUFhLEVBQUUsZ0JBQXdCO1FBQzNFLE1BQU0sYUFBYSxHQUFHLElBQUEsU0FBTSxHQUFFLENBQUM7UUFFL0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsd0NBQXdDLEVBQUU7WUFDekQsYUFBYTtZQUNiLEtBQUs7U0FDTixDQUFDLENBQUM7UUFFSCxtQ0FBbUM7UUFDbkMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLDBCQUEwQixDQUFDLGFBQWEsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN4RSxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFFN0IsSUFBSSxDQUFDO1lBQ0gsOENBQThDO1lBQzlDLE1BQU0sa0JBQWtCLEdBQUcsTUFBTSxJQUFJLENBQUMsd0JBQXdCLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1lBRXBHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDaEMsTUFBTSxLQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMsOEJBQThCLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7Z0JBQ3BGLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxTQUFTLENBQUM7Z0JBQzFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyx5QkFBeUIsQ0FBQyxhQUFhLEVBQUUsS0FBSyxFQUFFLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxVQUFVLENBQUMsQ0FBQztnQkFDL0csSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFO29CQUNuQyxTQUFTLEVBQUUsaUNBQWlDO29CQUM1QyxLQUFLO29CQUNMLElBQUksRUFBRSxvQkFBb0I7aUJBQzNCLENBQUMsQ0FBQztnQkFDSCxNQUFNLEtBQUssQ0FBQztZQUNkLENBQUM7WUFFRCxJQUFJLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsRUFBRTtnQkFDL0MsU0FBUyxFQUFFLGlDQUFpQztnQkFDNUMsS0FBSztnQkFDTCxJQUFJLEVBQUUsb0JBQW9CO2FBQzNCLEVBQUUsSUFBSSxFQUFFLEVBQUUsYUFBYSxFQUFFLENBQUMsQ0FBQztZQUU1Qix3Q0FBd0M7WUFDeEMsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLFNBQVMsQ0FBQztZQUMxQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsNEJBQTRCLENBQUMsYUFBYSxFQUFFLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQztZQUV0Rix5RUFBeUU7WUFDekUsSUFBSSxrQkFBa0IsQ0FBQyxTQUFTLElBQUksa0JBQWtCLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQ25FLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLDBCQUEwQixFQUFFO29CQUMzQyxhQUFhO29CQUNiLEtBQUs7b0JBQ0wsU0FBUyxFQUFFLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTO29CQUN6QyxnQkFBZ0IsRUFBRSxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsTUFBTTtpQkFDeEQsQ0FBQyxDQUFDO2dCQUVILGlGQUFpRjtnQkFDakYsSUFBSSxlQUErQyxDQUFDO2dCQUVwRCxJQUFJLENBQUM7b0JBQ0gsK0NBQStDO29CQUMvQyxNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDO29CQUU5RCxJQUFJLFFBQVEsRUFBRSxDQUFDO3dCQUNiLGVBQWUsR0FBRyxNQUFNLElBQUksQ0FBQyxVQUFVLENBQUMsMEJBQTBCLENBQUM7NEJBQ2pFLE1BQU0sRUFBRSxRQUFRLENBQUMsTUFBTTs0QkFDdkIsS0FBSyxFQUFFLFFBQVEsQ0FBQyxLQUFLOzRCQUNyQixjQUFjLEVBQUUsUUFBUSxDQUFDLGNBQWM7NEJBQ3ZDLElBQUksRUFBRSxRQUFRLENBQUMsSUFBSSxJQUFJLFdBQVcsQ0FBQyxnQ0FBZ0M7eUJBQ3BFLENBQUMsQ0FBQzt3QkFFSCxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxvREFBb0QsRUFBRTs0QkFDckUsYUFBYTs0QkFDYixLQUFLOzRCQUNMLE1BQU0sRUFBRSxRQUFRLENBQUMsTUFBTTs0QkFDdkIsS0FBSyxFQUFFLGVBQWUsQ0FBQyxLQUFLOzRCQUM1QixTQUFTLEVBQUUsZUFBZSxDQUFDLFNBQVM7eUJBQ3JDLENBQUMsQ0FBQztvQkFDTCxDQUFDO2dCQUNILENBQUM7Z0JBQUMsT0FBTyxVQUFlLEVBQUUsQ0FBQztvQkFDekIsK0NBQStDO29CQUMvQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyw4REFBOEQsRUFBRTt3QkFDL0UsYUFBYTt3QkFDYixLQUFLO3dCQUNMLEtBQUssRUFBRSxVQUFVLENBQUMsT0FBTztxQkFDMUIsQ0FBQyxDQUFDO2dCQUNMLENBQUM7Z0JBRUQsT0FBTztvQkFDTCxRQUFRLEVBQUU7d0JBQ1IsTUFBTSxFQUFFLGtCQUFrQixDQUFDLFNBQVM7d0JBQ3BDLFNBQVMsRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxFQUFFLGtCQUFrQixDQUFDLFNBQVMsQ0FBQzt3QkFDdEUsV0FBVyxFQUFFLGtCQUFrQixDQUFDLFdBQVc7d0JBQzNDLE1BQU0sRUFBRSxnQkFBZ0I7d0JBQ3hCLFdBQVcsRUFBRSxLQUFLO3FCQUNuQjtvQkFDRCxlQUFlO29CQUNmLFFBQVEsRUFBRSxtQkFBbUIsQ0FBQyxrQkFBa0I7b0JBQ2hELE9BQU8sRUFBRSx5REFBeUQ7aUJBQ25FLENBQUM7WUFDSixDQUFDO1lBRUQsTUFBTSxLQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMscURBQXFELENBQUMsQ0FBQztZQUMvRSxJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUU7Z0JBQ25DLFNBQVMsRUFBRSxpQ0FBaUM7Z0JBQzVDLEtBQUs7Z0JBQ0wsSUFBSSxFQUFFLGdCQUFnQjthQUN2QixDQUFDLENBQUM7WUFDSCxNQUFNLEtBQUssQ0FBQztRQUNkLENBQUM7UUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO1lBQ3BCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsT0FBTyxFQUFFLDZCQUE2QixDQUFDLENBQUM7WUFDbkcsSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFO2dCQUNuQyxTQUFTLEVBQUUsaUNBQWlDO2dCQUM1QyxLQUFLO2dCQUNMLElBQUksRUFBRSw2QkFBNkI7YUFDcEMsQ0FBQyxDQUFDO1lBQ0gsTUFBTSxJQUFJLEtBQUssQ0FBQyw2QkFBNkIsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7UUFDaEUsQ0FBQztJQUNILENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFhLEVBQUUsT0FBZTtRQUNuRCxNQUFNLGFBQWEsR0FBRyxJQUFBLFNBQU0sR0FBRSxDQUFDO1FBRS9CLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLHNCQUFzQixFQUFFO1lBQ3ZDLGFBQWE7WUFDYixLQUFLO1NBQ04sQ0FBQyxDQUFDO1FBRUgsMEJBQTBCO1FBQzFCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxpQkFBaUIsQ0FBQyxhQUFhLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDL0QsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBRTdCLElBQUksQ0FBQztZQUNILGtCQUFrQjtZQUNsQixNQUFNLFNBQVMsR0FBRyxNQUFNLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBRWhGLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ3ZCLE1BQU0sS0FBSyxHQUFHLElBQUksS0FBSyxDQUFDLDRCQUE0QixTQUFTLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztnQkFDekUsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLFNBQVMsQ0FBQztnQkFDMUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGdCQUFnQixDQUFDLGFBQWEsRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDLE9BQU8sRUFBRSxVQUFVLENBQUMsQ0FBQztnQkFDN0YsSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFO29CQUNuQyxTQUFTLEVBQUUsa0JBQWtCO29CQUM3QixLQUFLO29CQUNMLElBQUksRUFBRSxrQkFBa0I7aUJBQ3pCLENBQUMsQ0FBQztnQkFDSCxNQUFNLEtBQUssQ0FBQztZQUNkLENBQUM7WUFFRCxJQUFJLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQyxjQUFjLEVBQUU7Z0JBQzdDLFNBQVMsRUFBRSxrQkFBa0I7Z0JBQzdCLEtBQUs7Z0JBQ0wsSUFBSSxFQUFFLGtCQUFrQjthQUN6QixFQUFFLElBQUksRUFBRSxFQUFFLGFBQWEsRUFBRSxDQUFDLENBQUM7WUFFNUIsK0JBQStCO1lBQy9CLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxTQUFTLENBQUM7WUFDMUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLG1CQUFtQixDQUFDLGFBQWEsRUFBRSxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFFN0UsdUJBQXVCO1lBQ3ZCLE1BQU0sV0FBVyxHQUFHLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxzREFBbUIsQ0FBQztnQkFDeEUsVUFBVSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0JBQXFCO2dCQUM3QyxRQUFRLEVBQUUsS0FBSzthQUNoQixDQUFDLENBQUMsQ0FBQztZQUVKLE1BQU0sWUFBWSxHQUFHLFdBQVcsQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxLQUFLLENBQUMsQ0FBQztZQUNuRixNQUFNLFVBQVUsR0FBRyxZQUFZLEVBQUUsS0FBSyxJQUFJLElBQUEsU0FBTSxHQUFFLENBQUM7WUFFbkQsbUNBQW1DO1lBQ25DLE1BQU0sSUFBSSxHQUFHLE1BQU0sSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFFM0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMscUNBQXFDLEVBQUU7Z0JBQ3RELGFBQWE7Z0JBQ2IsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNO2dCQUNuQixLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7YUFDbEIsQ0FBQyxDQUFDO1lBRUgsc0JBQXNCO1lBQ3RCLE1BQU0sU0FBUyxHQUFHLE1BQU0sSUFBSSxDQUFDLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQztnQkFDeEQsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNO2dCQUNuQixLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7Z0JBQ2pCLGNBQWMsRUFBRSxJQUFJLENBQUMsY0FBYztnQkFDbkMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO2FBQ2hCLENBQUMsQ0FBQztZQUVILDJCQUEyQjtZQUMzQixJQUFJLENBQUMsaUJBQWlCLENBQUMsZ0JBQWdCLENBQUMsYUFBYSxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBRXZGLElBQUksQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDLGlCQUFpQixFQUFFO2dCQUNoRCxTQUFTLEVBQUUsa0JBQWtCO2dCQUM3QixLQUFLO2dCQUNMLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTTtnQkFDbkIsSUFBSSxFQUFFLGtCQUFrQjthQUN6QixFQUFFLElBQUksRUFBRSxFQUFFLGFBQWEsRUFBRSxDQUFDLENBQUM7WUFFNUIsT0FBTztnQkFDTCxXQUFXLEVBQUUsU0FBUyxDQUFDLFdBQVc7Z0JBQ2xDLFlBQVksRUFBRSxTQUFTLENBQUMsWUFBWTtnQkFDcEMsSUFBSSxFQUFFO29CQUNKLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTTtvQkFDbkIsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO29CQUNqQixJQUFJLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUM5QixjQUFjLEVBQUUsSUFBSSxDQUFDLGNBQWM7b0JBQ25DLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtpQkFDaEI7Z0JBQ0QsU0FBUyxFQUFFLFNBQVMsQ0FBQyxTQUFTO2dCQUM5QixTQUFTLEVBQUUsS0FBSztnQkFDaEIsT0FBTyxFQUFFLDBEQUEwRDthQUNwRSxDQUFDO1FBQ0osQ0FBQztRQUFDLE9BQU8sS0FBVSxFQUFFLENBQUM7WUFDcEIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxPQUFPLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztZQUMxRixJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUU7Z0JBQ25DLFNBQVMsRUFBRSxrQkFBa0I7Z0JBQzdCLEtBQUs7Z0JBQ0wsSUFBSSxFQUFFLG9CQUFvQjthQUMzQixDQUFDLENBQUM7WUFDSCxNQUFNLElBQUksS0FBSyxDQUFDLG9CQUFvQixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztRQUN2RCxDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLHNCQUFzQixDQUFDLEtBQWE7UUFDeEMsTUFBTSxhQUFhLEdBQUcsSUFBQSxTQUFNLEdBQUUsQ0FBQztRQUUvQixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyw4QkFBOEIsRUFBRTtZQUMvQyxhQUFhO1lBQ2IsS0FBSztTQUNOLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQztZQUNILE1BQU0sVUFBVSxHQUFHLE1BQU0sSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUVyRCxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQ2hCLE9BQU8sbUJBQW1CLENBQUMsT0FBTyxDQUFDO1lBQ3JDLENBQUM7WUFFRCxNQUFNLGVBQWUsR0FBRyxNQUFNLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDbkYsTUFBTSxZQUFZLEdBQUcsTUFBTSxJQUFJLENBQUMsd0JBQXdCLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBRTdFLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztnQkFDckIsT0FBTyxtQkFBbUIsQ0FBQywyQkFBMkIsQ0FBQztZQUN6RCxDQUFDO1lBRUQsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO2dCQUNsQixPQUFPLG1CQUFtQixDQUFDLGtCQUFrQixDQUFDO1lBQ2hELENBQUM7WUFFRCxPQUFPLG1CQUFtQixDQUFDLGFBQWEsQ0FBQztRQUMzQyxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNmLE1BQU0sWUFBWSxHQUFHLEtBQUssWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUM1RSxJQUFJLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRSxLQUFLLEVBQUUsWUFBWSxFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBQ2xGLE9BQU8sbUJBQW1CLENBQUMsS0FBSyxDQUFDO1FBQ25DLENBQUM7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsMEJBQTBCLENBQUMsS0FBYSxFQUFFLElBQXlCO1FBQ3ZFLE1BQU0sYUFBYSxHQUFHLElBQUEsU0FBTSxHQUFFLENBQUM7UUFFL0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsZ0NBQWdDLEVBQUU7WUFDakQsYUFBYTtZQUNiLEtBQUs7WUFDTCxJQUFJO1NBQ0wsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDO1lBQ0gsTUFBTSxZQUFZLEdBQUcsTUFBTSxJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFDLENBQUM7WUFFOUQsaUNBQWlDO1lBQ2pDLE1BQU0sZ0JBQWdCLEdBQXVEO2dCQUMzRSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsbUJBQW1CLENBQUMsV0FBVyxDQUFDO2dCQUNoRSxDQUFDLG1CQUFtQixDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsbUJBQW1CLENBQUMsMkJBQTJCLENBQUM7Z0JBQ3BGLENBQUMsbUJBQW1CLENBQUMsMkJBQTJCLENBQUMsRUFBRSxDQUFDLG1CQUFtQixDQUFDLGVBQWUsQ0FBQztnQkFDeEYsQ0FBQyxtQkFBbUIsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDLG1CQUFtQixDQUFDLGtCQUFrQixDQUFDO2dCQUMvRSxDQUFDLG1CQUFtQixDQUFDLGtCQUFrQixDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxhQUFhLENBQUM7Z0JBQzdFLENBQUMsbUJBQW1CLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxhQUFhLENBQUM7Z0JBQ3hFLENBQUMsbUJBQW1CLENBQUMsYUFBYSxDQUFDLEVBQUUsRUFBRTtnQkFDdkMsQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sRUFBRSxtQkFBbUIsQ0FBQywyQkFBMkIsRUFBRSxtQkFBbUIsQ0FBQyxrQkFBa0IsQ0FBQzthQUNwSixDQUFDO1lBRUYsT0FBTyxnQkFBZ0IsQ0FBQyxZQUFZLENBQUMsRUFBRSxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksWUFBWSxLQUFLLElBQUksQ0FBQztRQUNqRixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNmLE1BQU0sWUFBWSxHQUFHLEtBQUssWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUM1RSxJQUFJLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRSxLQUFLLEVBQUUsWUFBWSxFQUFFLGlCQUFpQixDQUFDLENBQUM7WUFDdEYsT0FBTyxLQUFLLENBQUM7UUFDZixDQUFDO0lBQ0gsQ0FBQztJQUVPLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxPQUFvQjtRQUN0RCxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN0QyxNQUFNLElBQUksS0FBSyxDQUFDLGdEQUFnRCxDQUFDLENBQUM7UUFDcEUsQ0FBQztRQUVELG1EQUFtRDtRQUNuRCxJQUFJLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNyQixPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDNUQsQ0FBQztRQUVELHlDQUF5QztRQUN6QyxPQUFPLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNwRSxDQUFDO0lBRU8sS0FBSyxDQUFDLHdCQUF3QixDQUFDLEtBQWEsRUFBRSxJQUFhO1FBQ2pFLE1BQU0sUUFBUSxHQUFHLElBQUksSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzdDLElBQUksVUFBa0IsQ0FBQztRQUN2QixJQUFJLFNBQVMsR0FBRyxLQUFLLENBQUM7UUFFdEIsMENBQTBDO1FBQzFDLElBQUksQ0FBQztZQUNILE1BQU0sWUFBWSxHQUFHLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxzREFBbUIsQ0FBQztnQkFDekUsVUFBVSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0JBQXFCO2dCQUM3QyxRQUFRLEVBQUUsS0FBSzthQUNoQixDQUFDLENBQUMsQ0FBQztZQUVKLDhDQUE4QztZQUM5QyxJQUFJLFlBQVksQ0FBQyxVQUFVLEtBQUssV0FBVyxFQUFFLENBQUM7Z0JBQzVDLE1BQU0sSUFBSSxLQUFLLENBQUMscUhBQXFILENBQUMsQ0FBQztZQUN6SSxDQUFDO1lBRUQsVUFBVSxHQUFHLFlBQVksQ0FBQyxRQUFTLENBQUM7WUFDcEMsU0FBUyxHQUFHLEtBQUssQ0FBQztRQUNwQixDQUFDO1FBQUMsT0FBTyxLQUFVLEVBQUUsQ0FBQztZQUNwQixJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssdUJBQXVCLEVBQUUsQ0FBQztnQkFDM0MseURBQXlEO2dCQUN6RCxTQUFTLEdBQUcsSUFBSSxDQUFDO2dCQUNqQixVQUFVLEdBQUcsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO2dCQUUzRCxtREFBbUQ7Z0JBQ25ELE1BQU0sSUFBSSxLQUFLLENBQUMsd0lBQXdJLENBQUMsQ0FBQztZQUM1SixDQUFDO2lCQUFNLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsb0JBQW9CLENBQUMsRUFBRSxDQUFDO2dCQUN4RCw4QkFBOEI7Z0JBQzlCLE1BQU0sS0FBSyxDQUFDO1lBQ2QsQ0FBQztpQkFBTSxDQUFDO2dCQUNOLE1BQU0sSUFBSSxLQUFLLENBQUMsa0JBQWtCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1lBQ3JELENBQUM7UUFDSCxDQUFDO1FBRUQscUNBQXFDO1FBQ3JDLE1BQU0sSUFBSSxHQUFHLE1BQU0sSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFFM0QsNkNBQTZDO1FBQzdDLE1BQU0sU0FBUyxHQUFHLE1BQU0sSUFBSSxDQUFDLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQztZQUN4RCxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU07WUFDbkIsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO1lBQ2pCLGNBQWMsRUFBRSxJQUFJLENBQUMsY0FBYztZQUNuQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7U0FDaEIsQ0FBQyxDQUFDO1FBRUgsT0FBTztZQUNMLFdBQVcsRUFBRSxTQUFTLENBQUMsV0FBVztZQUNsQyxZQUFZLEVBQUUsU0FBUyxDQUFDLFlBQVk7WUFDcEMsSUFBSSxFQUFFO2dCQUNKLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTTtnQkFDbkIsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO2dCQUNqQixJQUFJLEVBQUUsUUFBUTtnQkFDZCxjQUFjLEVBQUUsSUFBSSxDQUFDLGNBQWM7Z0JBQ25DLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTthQUNoQjtZQUNELFNBQVMsRUFBRSxTQUFTLENBQUMsU0FBUztZQUM5QixTQUFTO1lBQ1QsT0FBTyxFQUFFLFNBQVM7Z0JBQ2hCLENBQUMsQ0FBQyx5REFBeUQ7Z0JBQzNELENBQUMsQ0FBQyx5Q0FBeUM7U0FDOUMsQ0FBQztJQUNKLENBQUM7SUFFTyxLQUFLLENBQUMsWUFBWSxDQUFDLEtBQWEsRUFBRSxRQUFnQjtRQUN4RCxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDO1FBQy9DLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNkLE1BQU0sSUFBSSxLQUFLLENBQUMsNkNBQTZDLENBQUMsQ0FBQztRQUNqRSxDQUFDO1FBRUQsK0JBQStCO1FBQy9CLElBQUksVUFBa0IsQ0FBQztRQUN2QixJQUFJLENBQUM7WUFDSCxNQUFNLFVBQVUsR0FBRyxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksc0RBQW1CLENBQUM7Z0JBQ3ZFLFFBQVEsRUFBRSxvQkFBb0I7Z0JBQzlCLFFBQVEsRUFBRSxRQUFRO2dCQUNsQixjQUFjLEVBQUU7b0JBQ2QsUUFBUSxFQUFFLEtBQUs7b0JBQ2YsUUFBUSxFQUFFLFFBQVE7aUJBQ25CO2FBQ0YsQ0FBQyxDQUFDLENBQUM7WUFFSixJQUFJLENBQUMsVUFBVSxDQUFDLG9CQUFvQixFQUFFLE9BQU8sRUFBRSxDQUFDO2dCQUM5QyxNQUFNLElBQUksS0FBSyxDQUFDLGdEQUFnRCxDQUFDLENBQUM7WUFDcEUsQ0FBQztZQUVELHFDQUFxQztZQUNyQyxNQUFNLEtBQUssR0FBRyxVQUFVLENBQUMsb0JBQW9CLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNqRSxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQ2hGLFVBQVUsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDO1FBQzNCLENBQUM7UUFBQyxPQUFPLFlBQWlCLEVBQUUsQ0FBQztZQUMzQixJQUNFLFlBQVksQ0FBQyxJQUFJLEtBQUssd0JBQXdCO2dCQUM5QyxZQUFZLENBQUMsSUFBSSxLQUFLLHVCQUF1QixFQUM3QyxDQUFDO2dCQUNELE1BQU0sSUFBSSxLQUFLLENBQUMsZ0RBQWdELENBQUMsQ0FBQztZQUNwRSxDQUFDO1lBQ0QsSUFBSSxZQUFZLENBQUMsSUFBSSxLQUFLLDJCQUEyQixFQUFFLENBQUM7Z0JBQ3RELE1BQU0sSUFBSSxLQUFLLENBQUMsc0VBQXNFLENBQUMsQ0FBQztZQUMxRixDQUFDO1lBQ0QsTUFBTSxJQUFJLEtBQUssQ0FBQyxlQUFlLFlBQVksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1FBQ3pELENBQUM7UUFFRCxxQ0FBcUM7UUFDckMsTUFBTSxJQUFJLEdBQUcsTUFBTSxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQztRQUUzRCw2Q0FBNkM7UUFDN0MsTUFBTSxTQUFTLEdBQUcsTUFBTSxJQUFJLENBQUMsVUFBVSxDQUFDLGlCQUFpQixDQUFDO1lBQ3hELE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTTtZQUNuQixLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7WUFDakIsY0FBYyxFQUFFLElBQUksQ0FBQyxjQUFjO1lBQ25DLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtTQUNoQixDQUFDLENBQUM7UUFFSCxPQUFPO1lBQ0wsV0FBVyxFQUFFLFNBQVMsQ0FBQyxXQUFXO1lBQ2xDLFlBQVksRUFBRSxTQUFTLENBQUMsWUFBWTtZQUNwQyxJQUFJLEVBQUU7Z0JBQ0osTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNO2dCQUNuQixLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7Z0JBQ2pCLElBQUksRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSwwQkFBMEI7Z0JBQzFELGNBQWMsRUFBRSxJQUFJLENBQUMsY0FBYztnQkFDbkMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO2FBQ2hCO1lBQ0QsU0FBUyxFQUFFLFNBQVMsQ0FBQyxTQUFTO1lBQzlCLFNBQVMsRUFBRSxLQUFLO1lBQ2hCLE9BQU8sRUFBRSw2Q0FBNkM7U0FDdkQsQ0FBQztJQUNKLENBQUM7SUFFTyxLQUFLLENBQUMsaUJBQWlCLENBQUMsS0FBYSxFQUFFLFFBQWdCO1FBQzdELE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1FBQ2pELE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUM7UUFFeEQsSUFBSSxDQUFDO1lBQ0gseUJBQXlCO1lBQ3pCLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSx5REFBc0IsQ0FBQztnQkFDdkQsVUFBVSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0JBQXFCO2dCQUM3QyxRQUFRLEVBQUUsS0FBSztnQkFDZixpQkFBaUIsRUFBRSxZQUFZO2dCQUMvQixhQUFhLEVBQUUsVUFBVSxFQUFFLDJCQUEyQjtnQkFDdEQsY0FBYyxFQUFFO29CQUNkLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFO29CQUMvQixFQUFFLElBQUksRUFBRSxnQkFBZ0IsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFO29CQUN6QyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRTtpQkFDbEM7YUFDRixDQUFDLENBQUMsQ0FBQztZQUVKLGlEQUFpRDtZQUNqRCxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksOERBQTJCLENBQUM7Z0JBQzVELFVBQVUsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLG9CQUFxQjtnQkFDN0MsUUFBUSxFQUFFLEtBQUs7Z0JBQ2YsUUFBUSxFQUFFLGlCQUFpQjtnQkFDM0IsU0FBUyxFQUFFLElBQUk7YUFDaEIsQ0FBQyxDQUFDLENBQUM7WUFFSiw0Q0FBNEM7WUFDNUMsTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLHNEQUFtQixDQUFDO2dCQUNwRSxVQUFVLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBcUI7Z0JBQzdDLFFBQVEsRUFBRSxLQUFLO2FBQ2hCLENBQUMsQ0FBQyxDQUFDO1lBRUosTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLEtBQUssQ0FBQyxDQUFDO1lBQy9FLE9BQU8sWUFBWSxFQUFFLEtBQUssSUFBSSxJQUFBLFNBQU0sR0FBRSxDQUFDO1FBRXpDLENBQUM7UUFBQyxPQUFPLFdBQWdCLEVBQUUsQ0FBQztZQUMxQixNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixXQUFXLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztRQUNsRSxDQUFDO0lBQ0gsQ0FBQztJQUVPLEtBQUssQ0FBQyxlQUFlLENBQUMsS0FBYSxFQUFFLFVBQWtCO1FBQzdELHVDQUF1QztRQUN2QyxJQUFJLElBQUksR0FBRyxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRXhELElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNWLDRCQUE0QjtZQUM1QixJQUFJLENBQUM7Z0JBQ0gsSUFBSSxHQUFHLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUM7b0JBQ3ZDLEtBQUs7b0JBQ0wsY0FBYyxFQUFFLFVBQVUsRUFBRSxxQ0FBcUM7b0JBQ2pFLElBQUksRUFBRSxXQUFXO29CQUNqQixXQUFXLEVBQUU7d0JBQ1gsS0FBSyxFQUFFLE9BQU87d0JBQ2QsYUFBYSxFQUFFOzRCQUNiLEtBQUssRUFBRSxJQUFJOzRCQUNYLE9BQU8sRUFBRSxLQUFLO3lCQUNmO3dCQUNELG1CQUFtQixFQUFFLGNBQWM7cUJBQ3BDO2lCQUNGLENBQUMsQ0FBQztZQUNMLENBQUM7WUFBQyxPQUFPLFNBQWMsRUFBRSxDQUFDO2dCQUN4QixNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixTQUFTLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztZQUNoRSxDQUFDO1FBQ0gsQ0FBQzthQUFNLENBQUM7WUFDTixzQ0FBc0M7WUFDdEMsTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDdEQsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUVPLEtBQUssQ0FBQyxnQkFBZ0IsQ0FDNUIsU0FBMkIsRUFDM0IsTUFBbUIsRUFDbkIsYUFBcUI7UUFFckIsSUFBSSxTQUFnQixDQUFDO1FBRXJCLEtBQUssSUFBSSxPQUFPLEdBQUcsQ0FBQyxFQUFFLE9BQU8sSUFBSSxNQUFNLENBQUMsVUFBVSxFQUFFLE9BQU8sRUFBRSxFQUFFLENBQUM7WUFDOUQsSUFBSSxDQUFDO2dCQUNILE9BQU8sTUFBTSxTQUFTLEVBQUUsQ0FBQztZQUMzQixDQUFDO1lBQUMsT0FBTyxLQUFVLEVBQUUsQ0FBQztnQkFDcEIsU0FBUyxHQUFHLEtBQUssQ0FBQztnQkFFbEIscUNBQXFDO2dCQUNyQyxJQUFJLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO29CQUNwQyxNQUFNLEtBQUssQ0FBQztnQkFDZCxDQUFDO2dCQUVELGdEQUFnRDtnQkFDaEQsSUFBSSxPQUFPLEtBQUssTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDO29CQUNsQyxNQUFNLElBQUksS0FBSyxDQUFDLEdBQUcsYUFBYSxDQUFDLFdBQVcsRUFBRSxrQ0FBa0MsTUFBTSxDQUFDLFVBQVUsR0FBRyxDQUFDLDBCQUEwQixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztnQkFDbEosQ0FBQztnQkFFRCwyQ0FBMkM7Z0JBQzNDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQ3BCLE1BQU0sQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLEVBQ3ZDLE1BQU0sQ0FBQyxRQUFRLENBQ2hCLENBQUM7Z0JBRUYsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLGFBQWEsWUFBWSxPQUFPLEdBQUcsQ0FBQyx3QkFBd0IsS0FBSyxLQUFLLEVBQUUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUN2RyxNQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDMUIsQ0FBQztRQUNILENBQUM7UUFFRCxNQUFNLFNBQVUsQ0FBQztJQUNuQixDQUFDO0lBRU8sbUJBQW1CLENBQUMsS0FBWTtRQUN0QyxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDO1FBRTlCLGdDQUFnQztRQUNoQyxJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDO1lBQ2pDLE9BQU8sQ0FBQyxRQUFRLENBQUMscUJBQXFCLENBQUM7WUFDdkMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQztZQUN0QyxPQUFPLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUM7WUFDckMsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDO0lBRU8sS0FBSyxDQUFDLEVBQVU7UUFDdEIsT0FBTyxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUN6RCxDQUFDO0lBRU8sWUFBWSxDQUFDLEtBQWE7UUFDaEMsTUFBTSxVQUFVLEdBQUcsNEJBQTRCLENBQUM7UUFDaEQsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2hDLENBQUM7SUFFTyxvQkFBb0I7UUFDMUIsT0FBTyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQztJQUN2RCxDQUFDO0lBRU8sc0JBQXNCO1FBQzVCLE1BQU0sS0FBSyxHQUFHLHdFQUF3RSxDQUFDO1FBQ3ZGLElBQUksUUFBUSxHQUFHLEVBQUUsQ0FBQztRQUNsQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDNUIsUUFBUSxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDckUsQ0FBQztRQUNELE9BQU8sUUFBUSxHQUFHLEtBQUssQ0FBQyxDQUFDLHVDQUF1QztJQUNsRSxDQUFDO0lBRUQ7O09BRUc7SUFDSyxLQUFLLENBQUMsZUFBZSxDQUFDLEtBQWE7UUFDekMsTUFBTSxhQUFhLEdBQUcsSUFBQSxTQUFNLEdBQUUsQ0FBQztRQUUvQixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyx5QkFBeUIsRUFBRTtZQUMxQyxhQUFhO1lBQ2IsS0FBSztTQUNOLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQztZQUNILE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxzREFBbUIsQ0FBQztnQkFDcEQsVUFBVSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0JBQXFCO2dCQUM3QyxRQUFRLEVBQUUsS0FBSzthQUNoQixDQUFDLENBQUMsQ0FBQztZQUNKLE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQztRQUFDLE9BQU8sS0FBVSxFQUFFLENBQUM7WUFDcEIsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLHVCQUF1QixFQUFFLENBQUM7Z0JBQzNDLE9BQU8sS0FBSyxDQUFDO1lBQ2YsQ0FBQztZQUNELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsT0FBTyxFQUFFLFlBQVksQ0FBQyxDQUFDO1lBQ2xGLE1BQU0sS0FBSyxDQUFDO1FBQ2QsQ0FBQztJQUNILENBQUM7SUFFRDs7T0FFRztJQUNLLGlCQUFpQixDQUFDLEtBQWEsRUFBRSxNQUFjO1FBQ3JELE1BQU0sYUFBYSxHQUFHLElBQUEsU0FBTSxHQUFFLENBQUM7UUFFL0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsd0JBQXdCLEVBQUU7WUFDekMsYUFBYTtZQUNiLEtBQUs7U0FDTixDQUFDLENBQUM7UUFFSCxNQUFNLE1BQU0sR0FBRyxnQkFBZ0IsQ0FBQztRQUNoQyxNQUFNLEtBQUssR0FBRyxHQUFHLE1BQU0sSUFBSSxLQUFLLEVBQUUsQ0FBQztRQUNuQyxNQUFNLFVBQVUsR0FBRyxrQkFBa0Isa0JBQWtCLENBQUMsS0FBSyxDQUFDLFdBQVcsTUFBTSxXQUFXLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7UUFFdkgsbUNBQW1DO1FBQ25DLE9BQU8sc0VBQXNFLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7SUFDaEgsQ0FBQztDQUNGO0FBM3dCRCxnREEyd0JDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgXHJcbiAgQ29nbml0b0lkZW50aXR5UHJvdmlkZXJDbGllbnQsIFxyXG4gIEFkbWluQ3JlYXRlVXNlckNvbW1hbmQsIFxyXG4gIEFkbWluU2V0VXNlclBhc3N3b3JkQ29tbWFuZCxcclxuICBBZG1pbkluaXRpYXRlQXV0aENvbW1hbmQsXHJcbiAgQWRtaW5HZXRVc2VyQ29tbWFuZCxcclxuICBJbml0aWF0ZUF1dGhDb21tYW5kXHJcbn0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWNvZ25pdG8taWRlbnRpdHktcHJvdmlkZXInO1xyXG5pbXBvcnQgeyBKV1RTZXJ2aWNlLCBUZW1wb3JhcnlUb2tlblBhaXIgfSBmcm9tICcuL2p3dC1zZXJ2aWNlJztcclxuaW1wb3J0IHsgVXNlclNlcnZpY2UgfSBmcm9tICcuLi91c2VyL3VzZXItc2VydmljZSc7XHJcbmltcG9ydCB7IEVtYWlsVmVyaWZpY2F0aW9uU2VydmljZSB9IGZyb20gJy4vZW1haWwtdmVyaWZpY2F0aW9uLXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBBdXRoTW9uaXRvcmluZ1NlcnZpY2UsIGF1dGhNb25pdG9yaW5nU2VydmljZSB9IGZyb20gJy4vYXV0aC1tb25pdG9yaW5nLXNlcnZpY2UnO1xyXG5pbXBvcnQgeyB2NCBhcyB1dWlkdjQgfSBmcm9tICd1dWlkJztcclxuaW1wb3J0IHsgQXV0aEVycm9ySGFuZGxlciB9IGZyb20gJy4uLy4uL3V0aWxzL2F1dGgtZXJyb3ItaGFuZGxlcic7XHJcbmltcG9ydCB7IGNyZWF0ZUxvZ2dlciB9IGZyb20gJy4uLy4uL3V0aWxzL2xvZ2dlcic7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEF1dGhGbG93UmVzdWx0IHtcclxuICBzdGF0ZTogQXV0aGVudGljYXRpb25TdGF0ZTtcclxuICByZXF1aXJlc0VtYWlsVmVyaWZpY2F0aW9uOiBib29sZWFuO1xyXG4gIHJlcXVpcmVzT1RQU2V0dXA6IGJvb2xlYW47XHJcbiAgbWVzc2FnZTogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIE9UUFNldHVwUmVzdWx0IHtcclxuICBvdHBTZXR1cDoge1xyXG4gICAgc2VjcmV0OiBzdHJpbmc7XHJcbiAgICBxckNvZGVVcmw6IHN0cmluZztcclxuICAgIGJhY2t1cENvZGVzOiBzdHJpbmdbXTtcclxuICAgIGlzc3Vlcjogc3RyaW5nO1xyXG4gICAgYWNjb3VudE5hbWU6IHN0cmluZztcclxuICB9O1xyXG4gIHRlbXBvcmFyeVRva2Vucz86IHtcclxuICAgIGFjY2Vzc1Rva2VuOiBzdHJpbmc7XHJcbiAgICByZWZyZXNoVG9rZW46IHN0cmluZztcclxuICAgIGV4cGlyZXNJbjogbnVtYmVyO1xyXG4gICAgc2NvcGU6ICd0ZW1wX2F1dGhlbnRpY2F0ZWQnO1xyXG4gIH07XHJcbiAgbmV4dFN0ZXA6IEF1dGhlbnRpY2F0aW9uU3RhdGU7XHJcbiAgbWVzc2FnZTogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgZW51bSBBdXRoZW50aWNhdGlvblN0YXRlIHtcclxuICBJTklUSUFMID0gJ2luaXRpYWwnLFxyXG4gIFJFR0lTVEVSSU5HID0gJ3JlZ2lzdGVyaW5nJyxcclxuICBFTUFJTF9WRVJJRklDQVRJT05fUkVRVUlSRUQgPSAnZW1haWxfdmVyaWZpY2F0aW9uX3JlcXVpcmVkJyxcclxuICBFTUFJTF9WRVJJRllJTkcgPSAnZW1haWxfdmVyaWZ5aW5nJyxcclxuICBPVFBfU0VUVVBfUkVRVUlSRUQgPSAnb3RwX3NldHVwX3JlcXVpcmVkJyxcclxuICBPVFBfVkVSSUZZSU5HID0gJ290cF92ZXJpZnlpbmcnLFxyXG4gIEFVVEhFTlRJQ0FURUQgPSAnYXV0aGVudGljYXRlZCcsXHJcbiAgRVJST1IgPSAnZXJyb3InXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQXV0aFJlcXVlc3Qge1xyXG4gIGVtYWlsOiBzdHJpbmc7XHJcbiAgcGFzc3dvcmQ/OiBzdHJpbmc7IC8vIE9wdGlvbmFsIGZvciBxdWljayByZWdpc3RyYXRpb25cclxuICBuYW1lPzogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEF1dGhSZXN1bHQge1xyXG4gIGFjY2Vzc1Rva2VuOiBzdHJpbmc7XHJcbiAgcmVmcmVzaFRva2VuOiBzdHJpbmc7XHJcbiAgdXNlcjoge1xyXG4gICAgdXNlcklkOiBzdHJpbmc7XHJcbiAgICBlbWFpbDogc3RyaW5nO1xyXG4gICAgbmFtZTogc3RyaW5nO1xyXG4gICAgb3JnYW5pemF0aW9uSWQ6IHN0cmluZztcclxuICAgIHJvbGU6IHN0cmluZztcclxuICB9O1xyXG4gIGV4cGlyZXNJbjogbnVtYmVyO1xyXG4gIGlzTmV3VXNlcjogYm9vbGVhbjtcclxuICBtZXNzYWdlOiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgUmV0cnlDb25maWcge1xyXG4gIG1heFJldHJpZXM6IG51bWJlcjtcclxuICBiYXNlRGVsYXk6IG51bWJlcjsgLy8gbWlsbGlzZWNvbmRzXHJcbiAgbWF4RGVsYXk6IG51bWJlcjsgLy8gbWlsbGlzZWNvbmRzXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBVbmlmaWVkQXV0aFNlcnZpY2Uge1xyXG4gIHByaXZhdGUgY29nbml0b0NsaWVudDogQ29nbml0b0lkZW50aXR5UHJvdmlkZXJDbGllbnQ7XHJcbiAgcHJpdmF0ZSBqd3RTZXJ2aWNlOiBKV1RTZXJ2aWNlO1xyXG4gIHByaXZhdGUgdXNlclNlcnZpY2U6IFVzZXJTZXJ2aWNlO1xyXG4gIHByaXZhdGUgZW1haWxWZXJpZmljYXRpb25TZXJ2aWNlOiBFbWFpbFZlcmlmaWNhdGlvblNlcnZpY2U7XHJcbiAgcHJpdmF0ZSBtb25pdG9yaW5nU2VydmljZTogQXV0aE1vbml0b3JpbmdTZXJ2aWNlO1xyXG4gIHByaXZhdGUgZXJyb3JIYW5kbGVyOiBBdXRoRXJyb3JIYW5kbGVyO1xyXG4gIHByaXZhdGUgbG9nZ2VyOiBSZXR1cm5UeXBlPHR5cGVvZiBjcmVhdGVMb2dnZXI+O1xyXG4gIHByaXZhdGUgZGVmYXVsdFJldHJ5Q29uZmlnOiBSZXRyeUNvbmZpZyA9IHtcclxuICAgIG1heFJldHJpZXM6IDMsXHJcbiAgICBiYXNlRGVsYXk6IDEwMDAsIC8vIDEgc2Vjb25kXHJcbiAgICBtYXhEZWxheTogNTAwMCAgIC8vIDUgc2Vjb25kc1xyXG4gIH07XHJcblxyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgdGhpcy5jb2duaXRvQ2xpZW50ID0gbmV3IENvZ25pdG9JZGVudGl0eVByb3ZpZGVyQ2xpZW50KHsgXHJcbiAgICAgIHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJyBcclxuICAgIH0pO1xyXG4gICAgdGhpcy5qd3RTZXJ2aWNlID0gbmV3IEpXVFNlcnZpY2UoKTtcclxuICAgIHRoaXMudXNlclNlcnZpY2UgPSBuZXcgVXNlclNlcnZpY2UoKTtcclxuICAgIHRoaXMuZW1haWxWZXJpZmljYXRpb25TZXJ2aWNlID0gbmV3IEVtYWlsVmVyaWZpY2F0aW9uU2VydmljZSgpO1xyXG4gICAgdGhpcy5tb25pdG9yaW5nU2VydmljZSA9IGF1dGhNb25pdG9yaW5nU2VydmljZTtcclxuICAgIHRoaXMuZXJyb3JIYW5kbGVyID0gbmV3IEF1dGhFcnJvckhhbmRsZXIoJ1VuaWZpZWRBdXRoU2VydmljZScpO1xyXG4gICAgdGhpcy5sb2dnZXIgPSBjcmVhdGVMb2dnZXIoJ1VuaWZpZWRBdXRoU2VydmljZScpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogVW5pZmllZCBhdXRoZW50aWNhdGlvbiBtZXRob2QgdGhhdCBoYW5kbGVzIGJvdGggcXVpY2sgcmVnaXN0cmF0aW9uIGFuZCBleGlzdGluZyB1c2VyIGxvZ2luXHJcbiAgICovXHJcbiAgYXN5bmMgYXV0aGVudGljYXRlKHJlcXVlc3Q6IEF1dGhSZXF1ZXN0LCByZXRyeUNvbmZpZz86IFBhcnRpYWw8UmV0cnlDb25maWc+KTogUHJvbWlzZTxBdXRoUmVzdWx0PiB7XHJcbiAgICBjb25zdCBjb25maWcgPSB7IC4uLnRoaXMuZGVmYXVsdFJldHJ5Q29uZmlnLCAuLi5yZXRyeUNvbmZpZyB9O1xyXG4gICAgXHJcbiAgICByZXR1cm4gdGhpcy5leGVjdXRlV2l0aFJldHJ5KFxyXG4gICAgICAoKSA9PiB0aGlzLnBlcmZvcm1BdXRoZW50aWNhdGlvbihyZXF1ZXN0KSxcclxuICAgICAgY29uZmlnLFxyXG4gICAgICAnYXV0aGVudGljYXRpb24nXHJcbiAgICApO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUXVpY2sgcmVnaXN0cmF0aW9uIGZsb3cgLSBjcmVhdGVzIHVzZXIgaWYgZG9lc24ndCBleGlzdCwgbG9ncyBpbiBpZiBleGlzdHNcclxuICAgKi9cclxuICBhc3luYyBxdWlja1JlZ2lzdGVyKGVtYWlsOiBzdHJpbmcsIG5hbWU/OiBzdHJpbmcsIHJldHJ5Q29uZmlnPzogUGFydGlhbDxSZXRyeUNvbmZpZz4pOiBQcm9taXNlPEF1dGhSZXN1bHQ+IHtcclxuICAgIGNvbnN0IGNvbmZpZyA9IHsgLi4udGhpcy5kZWZhdWx0UmV0cnlDb25maWcsIC4uLnJldHJ5Q29uZmlnIH07XHJcbiAgICBcclxuICAgIHJldHVybiB0aGlzLmV4ZWN1dGVXaXRoUmV0cnkoXHJcbiAgICAgICgpID0+IHRoaXMucGVyZm9ybVF1aWNrUmVnaXN0cmF0aW9uKGVtYWlsLCBuYW1lKSxcclxuICAgICAgY29uZmlnLFxyXG4gICAgICAncXVpY2sgcmVnaXN0cmF0aW9uJ1xyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFN0YW5kYXJkIGxvZ2luIGZsb3cgLSByZXF1aXJlcyBwYXNzd29yZFxyXG4gICAqL1xyXG4gIGFzeW5jIGxvZ2luKGVtYWlsOiBzdHJpbmcsIHBhc3N3b3JkOiBzdHJpbmcsIHJldHJ5Q29uZmlnPzogUGFydGlhbDxSZXRyeUNvbmZpZz4pOiBQcm9taXNlPEF1dGhSZXN1bHQ+IHtcclxuICAgIGNvbnN0IGNvbmZpZyA9IHsgLi4udGhpcy5kZWZhdWx0UmV0cnlDb25maWcsIC4uLnJldHJ5Q29uZmlnIH07XHJcbiAgICBcclxuICAgIHJldHVybiB0aGlzLmV4ZWN1dGVXaXRoUmV0cnkoXHJcbiAgICAgICgpID0+IHRoaXMucGVyZm9ybUxvZ2luKGVtYWlsLCBwYXNzd29yZCksXHJcbiAgICAgIGNvbmZpZyxcclxuICAgICAgJ2xvZ2luJ1xyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEVuaGFuY2VkIGF1dGhlbnRpY2F0aW9uIGZsb3cgaW5pdGlhdGlvblxyXG4gICAqL1xyXG4gIGFzeW5jIGluaXRpYXRlQXV0aGVudGljYXRpb25GbG93KGVtYWlsOiBzdHJpbmcsIG5hbWU/OiBzdHJpbmcpOiBQcm9taXNlPEF1dGhGbG93UmVzdWx0PiB7XHJcbiAgICBjb25zdCBjb3JyZWxhdGlvbklkID0gdXVpZHY0KCk7XHJcbiAgICBcclxuICAgIHRoaXMubG9nZ2VyLmluZm8oJ0luaXRpYXRpbmcgYXV0aGVudGljYXRpb24gZmxvdycsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZW1haWwsXHJcbiAgICAgIGhhc05hbWU6ICEhbmFtZVxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gTW9uaXRvciBmbG93IGluaXRpYXRpb25cclxuICAgIHRoaXMubW9uaXRvcmluZ1NlcnZpY2Uub25BdXRoRmxvd0luaXRpYXRlZChjb3JyZWxhdGlvbklkLCBlbWFpbCk7XHJcblxyXG4gICAgaWYgKCF0aGlzLmlzVmFsaWRFbWFpbChlbWFpbCkpIHtcclxuICAgICAgY29uc3QgZXJyb3IgPSBuZXcgRXJyb3IoJ0lOVkFMSURfRU1BSUw6IFZhbGlkIGVtYWlsIGFkZHJlc3MgaXMgcmVxdWlyZWQnKTtcclxuICAgICAgdGhpcy5lcnJvckhhbmRsZXIuaGFuZGxlRXJyb3IoZXJyb3IsIHtcclxuICAgICAgICBvcGVyYXRpb246ICdpbml0aWF0ZUF1dGhlbnRpY2F0aW9uRmxvdycsXHJcbiAgICAgICAgZW1haWwsXHJcbiAgICAgICAgc3RlcDogJ3ZhbGlkYXRpb24nXHJcbiAgICAgIH0pO1xyXG4gICAgICB0aHJvdyBlcnJvcjtcclxuICAgIH1cclxuXHJcbiAgICB0cnkge1xyXG4gICAgICAvLyBDaGVjayBpZiB1c2VyIGV4aXN0cyBhbmQgdGhlaXIgdmVyaWZpY2F0aW9uIHN0YXR1c1xyXG4gICAgICBjb25zdCB1c2VyRXhpc3RzID0gYXdhaXQgdGhpcy5jaGVja1VzZXJFeGlzdHMoZW1haWwpO1xyXG4gICAgICBcclxuICAgICAgaWYgKCF1c2VyRXhpc3RzKSB7XHJcbiAgICAgICAgLy8gQ3JlYXRlIG5ldyB1c2VyIC0gdGhpcyB3aWxsIHJlcXVpcmUgZW1haWwgdmVyaWZpY2F0aW9uXHJcbiAgICAgICAgYXdhaXQgdGhpcy5jcmVhdGVDb2duaXRvVXNlcihlbWFpbCwgbmFtZSB8fCBlbWFpbC5zcGxpdCgnQCcpWzBdKTtcclxuICAgICAgICBcclxuICAgICAgICB0aGlzLmVycm9ySGFuZGxlci5sb2dBdXRoRXZlbnQoJ3VzZXJfY3JlYXRlZCcsIHtcclxuICAgICAgICAgIG9wZXJhdGlvbjogJ2luaXRpYXRlQXV0aGVudGljYXRpb25GbG93JyxcclxuICAgICAgICAgIGVtYWlsLFxyXG4gICAgICAgICAgc3RlcDogJ3JlZ2lzdHJhdGlvbidcclxuICAgICAgICB9LCB0cnVlLCB7IGNvcnJlbGF0aW9uSWQgfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIHN0YXRlOiBBdXRoZW50aWNhdGlvblN0YXRlLkVNQUlMX1ZFUklGSUNBVElPTl9SRVFVSVJFRCxcclxuICAgICAgICAgIHJlcXVpcmVzRW1haWxWZXJpZmljYXRpb246IHRydWUsXHJcbiAgICAgICAgICByZXF1aXJlc09UUFNldHVwOiBmYWxzZSxcclxuICAgICAgICAgIG1lc3NhZ2U6ICdBY2NvdW50IGNyZWF0ZWQgc3VjY2Vzc2Z1bGx5LiBQbGVhc2UgY2hlY2sgeW91ciBlbWFpbCBmb3IgdGhlIHZlcmlmaWNhdGlvbiBjb2RlLidcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBVc2VyIGV4aXN0cywgY2hlY2sgdGhlaXIgc3RhdHVzXHJcbiAgICAgIGNvbnN0IGlzRW1haWxWZXJpZmllZCA9IGF3YWl0IHRoaXMuZW1haWxWZXJpZmljYXRpb25TZXJ2aWNlLmlzRW1haWxWZXJpZmllZChlbWFpbCk7XHJcbiAgICAgIGNvbnN0IGlzT1RQRW5hYmxlZCA9IGF3YWl0IHRoaXMuZW1haWxWZXJpZmljYXRpb25TZXJ2aWNlLmlzT1RQRW5hYmxlZChlbWFpbCk7XHJcblxyXG4gICAgICB0aGlzLmxvZ2dlci5pbmZvKCdVc2VyIGF1dGhlbnRpY2F0aW9uIHN0YXRlIGNoZWNrZWQnLCB7XHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICBlbWFpbCxcclxuICAgICAgICBpc0VtYWlsVmVyaWZpZWQsXHJcbiAgICAgICAgaXNPVFBFbmFibGVkXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgaWYgKCFpc0VtYWlsVmVyaWZpZWQpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgc3RhdGU6IEF1dGhlbnRpY2F0aW9uU3RhdGUuRU1BSUxfVkVSSUZJQ0FUSU9OX1JFUVVJUkVELFxyXG4gICAgICAgICAgcmVxdWlyZXNFbWFpbFZlcmlmaWNhdGlvbjogdHJ1ZSxcclxuICAgICAgICAgIHJlcXVpcmVzT1RQU2V0dXA6IGZhbHNlLFxyXG4gICAgICAgICAgbWVzc2FnZTogJ1BsZWFzZSB2ZXJpZnkgeW91ciBlbWFpbCBhZGRyZXNzIHRvIGNvbnRpbnVlLidcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoIWlzT1RQRW5hYmxlZCkge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBzdGF0ZTogQXV0aGVudGljYXRpb25TdGF0ZS5PVFBfU0VUVVBfUkVRVUlSRUQsXHJcbiAgICAgICAgICByZXF1aXJlc0VtYWlsVmVyaWZpY2F0aW9uOiBmYWxzZSxcclxuICAgICAgICAgIHJlcXVpcmVzT1RQU2V0dXA6IHRydWUsXHJcbiAgICAgICAgICBtZXNzYWdlOiAnUGxlYXNlIGNvbXBsZXRlIE9UUCBzZXR1cCBmb3IgZW5oYW5jZWQgc2VjdXJpdHkuJ1xyXG4gICAgICAgIH07XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFVzZXIgaXMgZnVsbHkgc2V0IHVwXHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdGU6IEF1dGhlbnRpY2F0aW9uU3RhdGUuQVVUSEVOVElDQVRFRCxcclxuICAgICAgICByZXF1aXJlc0VtYWlsVmVyaWZpY2F0aW9uOiBmYWxzZSxcclxuICAgICAgICByZXF1aXJlc09UUFNldHVwOiBmYWxzZSxcclxuICAgICAgICBtZXNzYWdlOiAnVXNlciBpcyByZWFkeSBmb3IgYXV0aGVudGljYXRpb24uJ1xyXG4gICAgICB9O1xyXG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICB0aGlzLm1vbml0b3JpbmdTZXJ2aWNlLm9uRXJyb3IoY29ycmVsYXRpb25JZCwgZW1haWwsIGVycm9yLm1lc3NhZ2UsICdmbG93X2luaXRpYXRpb24nKTtcclxuICAgICAgdGhpcy5lcnJvckhhbmRsZXIuaGFuZGxlRXJyb3IoZXJyb3IsIHtcclxuICAgICAgICBvcGVyYXRpb246ICdpbml0aWF0ZUF1dGhlbnRpY2F0aW9uRmxvdycsXHJcbiAgICAgICAgZW1haWwsXHJcbiAgICAgICAgc3RlcDogJ2Zsb3dfaW5pdGlhdGlvbidcclxuICAgICAgfSk7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQVVUSF9GTE9XX0VSUk9SOiAke2Vycm9yLm1lc3NhZ2V9YCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBIYW5kbGUgZW1haWwgdmVyaWZpY2F0aW9uIGNvbXBsZXRpb24gd2l0aCBhdXRvbWF0aWMgT1RQIHNldHVwXHJcbiAgICovXHJcbiAgYXN5bmMgaGFuZGxlRW1haWxWZXJpZmljYXRpb25Db21wbGV0ZShlbWFpbDogc3RyaW5nLCB2ZXJpZmljYXRpb25Db2RlOiBzdHJpbmcpOiBQcm9taXNlPE9UUFNldHVwUmVzdWx0PiB7XHJcbiAgICBjb25zdCBjb3JyZWxhdGlvbklkID0gdXVpZHY0KCk7XHJcbiAgICBcclxuICAgIHRoaXMubG9nZ2VyLmluZm8oJ0hhbmRsaW5nIGVtYWlsIHZlcmlmaWNhdGlvbiBjb21wbGV0aW9uJywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICBlbWFpbFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gTW9uaXRvciBlbWFpbCB2ZXJpZmljYXRpb24gc3RhcnRcclxuICAgIHRoaXMubW9uaXRvcmluZ1NlcnZpY2Uub25FbWFpbFZlcmlmaWNhdGlvblN0YXJ0ZWQoY29ycmVsYXRpb25JZCwgZW1haWwpO1xyXG4gICAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICAvLyBWZXJpZnkgZW1haWwgdXNpbmcgRW1haWxWZXJpZmljYXRpb25TZXJ2aWNlXHJcbiAgICAgIGNvbnN0IHZlcmlmaWNhdGlvblJlc3VsdCA9IGF3YWl0IHRoaXMuZW1haWxWZXJpZmljYXRpb25TZXJ2aWNlLnZlcmlmeUVtYWlsKGVtYWlsLCB2ZXJpZmljYXRpb25Db2RlKTtcclxuXHJcbiAgICAgIGlmICghdmVyaWZpY2F0aW9uUmVzdWx0LnN1Y2Nlc3MpIHtcclxuICAgICAgICBjb25zdCBlcnJvciA9IG5ldyBFcnJvcihgRU1BSUxfVkVSSUZJQ0FUSU9OX0ZBSUxFRDogJHt2ZXJpZmljYXRpb25SZXN1bHQubWVzc2FnZX1gKTtcclxuICAgICAgICBjb25zdCBkdXJhdGlvbk1zID0gRGF0ZS5ub3coKSAtIHN0YXJ0VGltZTtcclxuICAgICAgICB0aGlzLm1vbml0b3JpbmdTZXJ2aWNlLm9uRW1haWxWZXJpZmljYXRpb25GYWlsZWQoY29ycmVsYXRpb25JZCwgZW1haWwsIHZlcmlmaWNhdGlvblJlc3VsdC5tZXNzYWdlLCBkdXJhdGlvbk1zKTtcclxuICAgICAgICB0aGlzLmVycm9ySGFuZGxlci5oYW5kbGVFcnJvcihlcnJvciwge1xyXG4gICAgICAgICAgb3BlcmF0aW9uOiAnaGFuZGxlRW1haWxWZXJpZmljYXRpb25Db21wbGV0ZScsXHJcbiAgICAgICAgICBlbWFpbCxcclxuICAgICAgICAgIHN0ZXA6ICdlbWFpbF92ZXJpZmljYXRpb24nXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHRoaXMuZXJyb3JIYW5kbGVyLmxvZ0F1dGhFdmVudCgnZW1haWxfdmVyaWZpZWQnLCB7XHJcbiAgICAgICAgb3BlcmF0aW9uOiAnaGFuZGxlRW1haWxWZXJpZmljYXRpb25Db21wbGV0ZScsXHJcbiAgICAgICAgZW1haWwsXHJcbiAgICAgICAgc3RlcDogJ2VtYWlsX3ZlcmlmaWNhdGlvbidcclxuICAgICAgfSwgdHJ1ZSwgeyBjb3JyZWxhdGlvbklkIH0pO1xyXG5cclxuICAgICAgLy8gTW9uaXRvciBlbWFpbCB2ZXJpZmljYXRpb24gY29tcGxldGlvblxyXG4gICAgICBjb25zdCBkdXJhdGlvbk1zID0gRGF0ZS5ub3coKSAtIHN0YXJ0VGltZTtcclxuICAgICAgdGhpcy5tb25pdG9yaW5nU2VydmljZS5vbkVtYWlsVmVyaWZpY2F0aW9uQ29tcGxldGVkKGNvcnJlbGF0aW9uSWQsIGVtYWlsLCBkdXJhdGlvbk1zKTtcclxuXHJcbiAgICAgIC8vIEVtYWlsIHZlcmlmaWNhdGlvbiBhdXRvbWF0aWNhbGx5IHNldHMgdXAgT1RQLCBzbyByZXR1cm4gdGhlIHNldHVwIGRhdGFcclxuICAgICAgaWYgKHZlcmlmaWNhdGlvblJlc3VsdC5vdHBTZWNyZXQgJiYgdmVyaWZpY2F0aW9uUmVzdWx0LmJhY2t1cENvZGVzKSB7XHJcbiAgICAgICAgdGhpcy5sb2dnZXIuaW5mbygnT1RQIHNldHVwIGRhdGEgZ2VuZXJhdGVkJywge1xyXG4gICAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICAgIGVtYWlsLFxyXG4gICAgICAgICAgaGFzU2VjcmV0OiAhIXZlcmlmaWNhdGlvblJlc3VsdC5vdHBTZWNyZXQsXHJcbiAgICAgICAgICBiYWNrdXBDb2Rlc0NvdW50OiB2ZXJpZmljYXRpb25SZXN1bHQuYmFja3VwQ29kZXMubGVuZ3RoXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIEdlbmVyYXRlIHRlbXBvcmFyeSB0b2tlbnMgdG8gYWxsb3cgZmlsZSBvcGVyYXRpb25zIGJlZm9yZSBPVFAgc2V0dXAgY29tcGxldGlvblxyXG4gICAgICAgIGxldCB0ZW1wb3JhcnlUb2tlbnM6IFRlbXBvcmFyeVRva2VuUGFpciB8IHVuZGVmaW5lZDtcclxuICAgICAgICBcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgLy8gR2V0IHVzZXIgaW5mb3JtYXRpb24gdG8gY3JlYXRlIHRva2VuIHBheWxvYWRcclxuICAgICAgICAgIGNvbnN0IHVzZXJJbmZvID0gYXdhaXQgdGhpcy51c2VyU2VydmljZS5nZXRVc2VyQnlFbWFpbChlbWFpbCk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIGlmICh1c2VySW5mbykge1xyXG4gICAgICAgICAgICB0ZW1wb3JhcnlUb2tlbnMgPSBhd2FpdCB0aGlzLmp3dFNlcnZpY2UuZ2VuZXJhdGVUZW1wb3JhcnlUb2tlblBhaXIoe1xyXG4gICAgICAgICAgICAgIHVzZXJJZDogdXNlckluZm8udXNlcklkLFxyXG4gICAgICAgICAgICAgIGVtYWlsOiB1c2VySW5mby5lbWFpbCxcclxuICAgICAgICAgICAgICBvcmdhbml6YXRpb25JZDogdXNlckluZm8ub3JnYW5pemF0aW9uSWQsXHJcbiAgICAgICAgICAgICAgcm9sZTogdXNlckluZm8ucm9sZSB8fCAnZGV2ZWxvcGVyJyAvLyBEZWZhdWx0IHJvbGUgaWYgbm90IHNwZWNpZmllZFxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMubG9nZ2VyLmluZm8oJ1RlbXBvcmFyeSB0b2tlbnMgZ2VuZXJhdGVkIGZvciBlbWFpbCB2ZXJpZmllZCB1c2VyJywge1xyXG4gICAgICAgICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgICAgICAgZW1haWwsXHJcbiAgICAgICAgICAgICAgdXNlcklkOiB1c2VySW5mby51c2VySWQsXHJcbiAgICAgICAgICAgICAgc2NvcGU6IHRlbXBvcmFyeVRva2Vucy5zY29wZSxcclxuICAgICAgICAgICAgICBleHBpcmVzSW46IHRlbXBvcmFyeVRva2Vucy5leHBpcmVzSW5cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSBjYXRjaCAodG9rZW5FcnJvcjogYW55KSB7XHJcbiAgICAgICAgICAvLyBMb2cgdGhlIGVycm9yIGJ1dCBkb24ndCBmYWlsIHRoZSBlbnRpcmUgZmxvd1xyXG4gICAgICAgICAgdGhpcy5sb2dnZXIud2FybignRmFpbGVkIHRvIGdlbmVyYXRlIHRlbXBvcmFyeSB0b2tlbnMsIGNvbnRpbnVpbmcgd2l0aG91dCB0aGVtJywge1xyXG4gICAgICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgICAgICBlbWFpbCxcclxuICAgICAgICAgICAgZXJyb3I6IHRva2VuRXJyb3IubWVzc2FnZVxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgb3RwU2V0dXA6IHtcclxuICAgICAgICAgICAgc2VjcmV0OiB2ZXJpZmljYXRpb25SZXN1bHQub3RwU2VjcmV0LFxyXG4gICAgICAgICAgICBxckNvZGVVcmw6IHRoaXMuZ2VuZXJhdGVRUkNvZGVVcmwoZW1haWwsIHZlcmlmaWNhdGlvblJlc3VsdC5vdHBTZWNyZXQpLFxyXG4gICAgICAgICAgICBiYWNrdXBDb2RlczogdmVyaWZpY2F0aW9uUmVzdWx0LmJhY2t1cENvZGVzLFxyXG4gICAgICAgICAgICBpc3N1ZXI6ICdNSVNSQSBQbGF0Zm9ybScsXHJcbiAgICAgICAgICAgIGFjY291bnROYW1lOiBlbWFpbFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHRlbXBvcmFyeVRva2VucyxcclxuICAgICAgICAgIG5leHRTdGVwOiBBdXRoZW50aWNhdGlvblN0YXRlLk9UUF9TRVRVUF9SRVFVSVJFRCxcclxuICAgICAgICAgIG1lc3NhZ2U6ICdFbWFpbCB2ZXJpZmllZCBzdWNjZXNzZnVsbHkuIFBsZWFzZSBjb21wbGV0ZSBPVFAgc2V0dXAuJ1xyXG4gICAgICAgIH07XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnN0IGVycm9yID0gbmV3IEVycm9yKCdPVFBfU0VUVVBfRkFJTEVEOiBGYWlsZWQgdG8gZ2VuZXJhdGUgT1RQIHNldHVwIGRhdGEnKTtcclxuICAgICAgdGhpcy5lcnJvckhhbmRsZXIuaGFuZGxlRXJyb3IoZXJyb3IsIHtcclxuICAgICAgICBvcGVyYXRpb246ICdoYW5kbGVFbWFpbFZlcmlmaWNhdGlvbkNvbXBsZXRlJyxcclxuICAgICAgICBlbWFpbCxcclxuICAgICAgICBzdGVwOiAnb3RwX2dlbmVyYXRpb24nXHJcbiAgICAgIH0pO1xyXG4gICAgICB0aHJvdyBlcnJvcjtcclxuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgdGhpcy5tb25pdG9yaW5nU2VydmljZS5vbkVycm9yKGNvcnJlbGF0aW9uSWQsIGVtYWlsLCBlcnJvci5tZXNzYWdlLCAnZW1haWxfdmVyaWZpY2F0aW9uX2NvbXBsZXRlJyk7XHJcbiAgICAgIHRoaXMuZXJyb3JIYW5kbGVyLmhhbmRsZUVycm9yKGVycm9yLCB7XHJcbiAgICAgICAgb3BlcmF0aW9uOiAnaGFuZGxlRW1haWxWZXJpZmljYXRpb25Db21wbGV0ZScsXHJcbiAgICAgICAgZW1haWwsXHJcbiAgICAgICAgc3RlcDogJ2VtYWlsX3ZlcmlmaWNhdGlvbl9jb21wbGV0ZSdcclxuICAgICAgfSk7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgRU1BSUxfVkVSSUZJQ0FUSU9OX0VSUk9SOiAke2Vycm9yLm1lc3NhZ2V9YCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDb21wbGV0ZSBPVFAgc2V0dXAgYW5kIGVzdGFibGlzaCB1c2VyIHNlc3Npb25cclxuICAgKi9cclxuICBhc3luYyBjb21wbGV0ZU9UUFNldHVwKGVtYWlsOiBzdHJpbmcsIG90cENvZGU6IHN0cmluZyk6IFByb21pc2U8QXV0aFJlc3VsdD4ge1xyXG4gICAgY29uc3QgY29ycmVsYXRpb25JZCA9IHV1aWR2NCgpO1xyXG4gICAgXHJcbiAgICB0aGlzLmxvZ2dlci5pbmZvKCdDb21wbGV0aW5nIE9UUCBzZXR1cCcsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZW1haWxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIE1vbml0b3IgT1RQIHNldHVwIHN0YXJ0XHJcbiAgICB0aGlzLm1vbml0b3JpbmdTZXJ2aWNlLm9uT1RQU2V0dXBTdGFydGVkKGNvcnJlbGF0aW9uSWQsIGVtYWlsKTtcclxuICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gVmVyaWZ5IE9UUCBjb2RlXHJcbiAgICAgIGNvbnN0IG90cFJlc3VsdCA9IGF3YWl0IHRoaXMuZW1haWxWZXJpZmljYXRpb25TZXJ2aWNlLnZlcmlmeU9UUChlbWFpbCwgb3RwQ29kZSk7XHJcblxyXG4gICAgICBpZiAoIW90cFJlc3VsdC5zdWNjZXNzKSB7XHJcbiAgICAgICAgY29uc3QgZXJyb3IgPSBuZXcgRXJyb3IoYE9UUF9WRVJJRklDQVRJT05fRkFJTEVEOiAke290cFJlc3VsdC5tZXNzYWdlfWApO1xyXG4gICAgICAgIGNvbnN0IGR1cmF0aW9uTXMgPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lO1xyXG4gICAgICAgIHRoaXMubW9uaXRvcmluZ1NlcnZpY2Uub25PVFBTZXR1cEZhaWxlZChjb3JyZWxhdGlvbklkLCBlbWFpbCwgb3RwUmVzdWx0Lm1lc3NhZ2UsIGR1cmF0aW9uTXMpO1xyXG4gICAgICAgIHRoaXMuZXJyb3JIYW5kbGVyLmhhbmRsZUVycm9yKGVycm9yLCB7XHJcbiAgICAgICAgICBvcGVyYXRpb246ICdjb21wbGV0ZU9UUFNldHVwJyxcclxuICAgICAgICAgIGVtYWlsLFxyXG4gICAgICAgICAgc3RlcDogJ290cF92ZXJpZmljYXRpb24nXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHRoaXMuZXJyb3JIYW5kbGVyLmxvZ0F1dGhFdmVudCgnb3RwX3ZlcmlmaWVkJywge1xyXG4gICAgICAgIG9wZXJhdGlvbjogJ2NvbXBsZXRlT1RQU2V0dXAnLFxyXG4gICAgICAgIGVtYWlsLFxyXG4gICAgICAgIHN0ZXA6ICdvdHBfdmVyaWZpY2F0aW9uJ1xyXG4gICAgICB9LCB0cnVlLCB7IGNvcnJlbGF0aW9uSWQgfSk7XHJcblxyXG4gICAgICAvLyBNb25pdG9yIE9UUCBzZXR1cCBjb21wbGV0aW9uXHJcbiAgICAgIGNvbnN0IGR1cmF0aW9uTXMgPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lO1xyXG4gICAgICB0aGlzLm1vbml0b3JpbmdTZXJ2aWNlLm9uT1RQU2V0dXBDb21wbGV0ZWQoY29ycmVsYXRpb25JZCwgZW1haWwsIGR1cmF0aW9uTXMpO1xyXG5cclxuICAgICAgLy8gR2V0IHVzZXIgaW5mb3JtYXRpb25cclxuICAgICAgY29uc3QgY29nbml0b1VzZXIgPSBhd2FpdCB0aGlzLmNvZ25pdG9DbGllbnQuc2VuZChuZXcgQWRtaW5HZXRVc2VyQ29tbWFuZCh7XHJcbiAgICAgICAgVXNlclBvb2xJZDogcHJvY2Vzcy5lbnYuQ09HTklUT19VU0VSX1BPT0xfSUQhLFxyXG4gICAgICAgIFVzZXJuYW1lOiBlbWFpbFxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICBjb25zdCBzdWJBdHRyaWJ1dGUgPSBjb2duaXRvVXNlci5Vc2VyQXR0cmlidXRlcz8uZmluZChhdHRyID0+IGF0dHIuTmFtZSA9PT0gJ3N1YicpO1xyXG4gICAgICBjb25zdCBjb2duaXRvU3ViID0gc3ViQXR0cmlidXRlPy5WYWx1ZSB8fCB1dWlkdjQoKTtcclxuXHJcbiAgICAgIC8vIEdldCBvciBjcmVhdGUgdXNlciBpbiBvdXIgc3lzdGVtXHJcbiAgICAgIGNvbnN0IHVzZXIgPSBhd2FpdCB0aGlzLmdldE9yQ3JlYXRlVXNlcihlbWFpbCwgY29nbml0b1N1Yik7XHJcblxyXG4gICAgICB0aGlzLmxvZ2dlci5pbmZvKCdVc2VyIHJldHJpZXZlZCBmb3Igc2Vzc2lvbiBjcmVhdGlvbicsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIHVzZXJJZDogdXNlci51c2VySWQsXHJcbiAgICAgICAgZW1haWw6IHVzZXIuZW1haWxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBHZW5lcmF0ZSBKV1QgdG9rZW5zXHJcbiAgICAgIGNvbnN0IHRva2VuUGFpciA9IGF3YWl0IHRoaXMuand0U2VydmljZS5nZW5lcmF0ZVRva2VuUGFpcih7XHJcbiAgICAgICAgdXNlcklkOiB1c2VyLnVzZXJJZCxcclxuICAgICAgICBlbWFpbDogdXNlci5lbWFpbCxcclxuICAgICAgICBvcmdhbml6YXRpb25JZDogdXNlci5vcmdhbml6YXRpb25JZCxcclxuICAgICAgICByb2xlOiB1c2VyLnJvbGVcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBNb25pdG9yIHNlc3Npb24gY3JlYXRpb25cclxuICAgICAgdGhpcy5tb25pdG9yaW5nU2VydmljZS5vblNlc3Npb25DcmVhdGVkKGNvcnJlbGF0aW9uSWQsIGVtYWlsLCB1c2VyLnVzZXJJZCwgZHVyYXRpb25Ncyk7XHJcblxyXG4gICAgICB0aGlzLmVycm9ySGFuZGxlci5sb2dBdXRoRXZlbnQoJ3Nlc3Npb25fY3JlYXRlZCcsIHtcclxuICAgICAgICBvcGVyYXRpb246ICdjb21wbGV0ZU9UUFNldHVwJyxcclxuICAgICAgICBlbWFpbCxcclxuICAgICAgICB1c2VySWQ6IHVzZXIudXNlcklkLFxyXG4gICAgICAgIHN0ZXA6ICdzZXNzaW9uX2NyZWF0aW9uJ1xyXG4gICAgICB9LCB0cnVlLCB7IGNvcnJlbGF0aW9uSWQgfSk7XHJcblxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIGFjY2Vzc1Rva2VuOiB0b2tlblBhaXIuYWNjZXNzVG9rZW4sXHJcbiAgICAgICAgcmVmcmVzaFRva2VuOiB0b2tlblBhaXIucmVmcmVzaFRva2VuLFxyXG4gICAgICAgIHVzZXI6IHtcclxuICAgICAgICAgIHVzZXJJZDogdXNlci51c2VySWQsXHJcbiAgICAgICAgICBlbWFpbDogdXNlci5lbWFpbCxcclxuICAgICAgICAgIG5hbWU6IHVzZXIuZW1haWwuc3BsaXQoJ0AnKVswXSxcclxuICAgICAgICAgIG9yZ2FuaXphdGlvbklkOiB1c2VyLm9yZ2FuaXphdGlvbklkLFxyXG4gICAgICAgICAgcm9sZTogdXNlci5yb2xlXHJcbiAgICAgICAgfSxcclxuICAgICAgICBleHBpcmVzSW46IHRva2VuUGFpci5leHBpcmVzSW4sXHJcbiAgICAgICAgaXNOZXdVc2VyOiBmYWxzZSxcclxuICAgICAgICBtZXNzYWdlOiAnT1RQIHNldHVwIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHkuIFlvdSBhcmUgbm93IGxvZ2dlZCBpbi4nXHJcbiAgICAgIH07XHJcbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgIHRoaXMubW9uaXRvcmluZ1NlcnZpY2Uub25FcnJvcihjb3JyZWxhdGlvbklkLCBlbWFpbCwgZXJyb3IubWVzc2FnZSwgJ290cF9zZXR1cF9jb21wbGV0ZScpO1xyXG4gICAgICB0aGlzLmVycm9ySGFuZGxlci5oYW5kbGVFcnJvcihlcnJvciwge1xyXG4gICAgICAgIG9wZXJhdGlvbjogJ2NvbXBsZXRlT1RQU2V0dXAnLFxyXG4gICAgICAgIGVtYWlsLFxyXG4gICAgICAgIHN0ZXA6ICdvdHBfc2V0dXBfY29tcGxldGUnXHJcbiAgICAgIH0pO1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE9UUF9TRVRVUF9FUlJPUjogJHtlcnJvci5tZXNzYWdlfWApO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IGF1dGhlbnRpY2F0aW9uIHN0YXRlIGZvciBhIHVzZXJcclxuICAgKi9cclxuICBhc3luYyBnZXRBdXRoZW50aWNhdGlvblN0YXRlKGVtYWlsOiBzdHJpbmcpOiBQcm9taXNlPEF1dGhlbnRpY2F0aW9uU3RhdGU+IHtcclxuICAgIGNvbnN0IGNvcnJlbGF0aW9uSWQgPSB1dWlkdjQoKTtcclxuICAgIFxyXG4gICAgdGhpcy5sb2dnZXIuaW5mbygnR2V0dGluZyBhdXRoZW50aWNhdGlvbiBzdGF0ZScsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZW1haWxcclxuICAgIH0pO1xyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHVzZXJFeGlzdHMgPSBhd2FpdCB0aGlzLmNoZWNrVXNlckV4aXN0cyhlbWFpbCk7XHJcbiAgICAgIFxyXG4gICAgICBpZiAoIXVzZXJFeGlzdHMpIHtcclxuICAgICAgICByZXR1cm4gQXV0aGVudGljYXRpb25TdGF0ZS5JTklUSUFMO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zdCBpc0VtYWlsVmVyaWZpZWQgPSBhd2FpdCB0aGlzLmVtYWlsVmVyaWZpY2F0aW9uU2VydmljZS5pc0VtYWlsVmVyaWZpZWQoZW1haWwpO1xyXG4gICAgICBjb25zdCBpc09UUEVuYWJsZWQgPSBhd2FpdCB0aGlzLmVtYWlsVmVyaWZpY2F0aW9uU2VydmljZS5pc09UUEVuYWJsZWQoZW1haWwpO1xyXG5cclxuICAgICAgaWYgKCFpc0VtYWlsVmVyaWZpZWQpIHtcclxuICAgICAgICByZXR1cm4gQXV0aGVudGljYXRpb25TdGF0ZS5FTUFJTF9WRVJJRklDQVRJT05fUkVRVUlSRUQ7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmICghaXNPVFBFbmFibGVkKSB7XHJcbiAgICAgICAgcmV0dXJuIEF1dGhlbnRpY2F0aW9uU3RhdGUuT1RQX1NFVFVQX1JFUVVJUkVEO1xyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm4gQXV0aGVudGljYXRpb25TdGF0ZS5BVVRIRU5USUNBVEVEO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpO1xyXG4gICAgICB0aGlzLm1vbml0b3JpbmdTZXJ2aWNlLm9uRXJyb3IoY29ycmVsYXRpb25JZCwgZW1haWwsIGVycm9yTWVzc2FnZSwgJ3N0YXRlX2NoZWNrJyk7XHJcbiAgICAgIHJldHVybiBBdXRoZW50aWNhdGlvblN0YXRlLkVSUk9SO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogVmFsaWRhdGUgYXV0aGVudGljYXRpb24gc3RlcFxyXG4gICAqL1xyXG4gIGFzeW5jIHZhbGlkYXRlQXV0aGVudGljYXRpb25TdGVwKGVtYWlsOiBzdHJpbmcsIHN0ZXA6IEF1dGhlbnRpY2F0aW9uU3RhdGUpOiBQcm9taXNlPGJvb2xlYW4+IHtcclxuICAgIGNvbnN0IGNvcnJlbGF0aW9uSWQgPSB1dWlkdjQoKTtcclxuICAgIFxyXG4gICAgdGhpcy5sb2dnZXIuaW5mbygnVmFsaWRhdGluZyBhdXRoZW50aWNhdGlvbiBzdGVwJywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICBlbWFpbCxcclxuICAgICAgc3RlcFxyXG4gICAgfSk7XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgY3VycmVudFN0YXRlID0gYXdhaXQgdGhpcy5nZXRBdXRoZW50aWNhdGlvblN0YXRlKGVtYWlsKTtcclxuICAgICAgXHJcbiAgICAgIC8vIERlZmluZSB2YWxpZCBzdGF0ZSB0cmFuc2l0aW9uc1xyXG4gICAgICBjb25zdCB2YWxpZFRyYW5zaXRpb25zOiBSZWNvcmQ8QXV0aGVudGljYXRpb25TdGF0ZSwgQXV0aGVudGljYXRpb25TdGF0ZVtdPiA9IHtcclxuICAgICAgICBbQXV0aGVudGljYXRpb25TdGF0ZS5JTklUSUFMXTogW0F1dGhlbnRpY2F0aW9uU3RhdGUuUkVHSVNURVJJTkddLFxyXG4gICAgICAgIFtBdXRoZW50aWNhdGlvblN0YXRlLlJFR0lTVEVSSU5HXTogW0F1dGhlbnRpY2F0aW9uU3RhdGUuRU1BSUxfVkVSSUZJQ0FUSU9OX1JFUVVJUkVEXSxcclxuICAgICAgICBbQXV0aGVudGljYXRpb25TdGF0ZS5FTUFJTF9WRVJJRklDQVRJT05fUkVRVUlSRURdOiBbQXV0aGVudGljYXRpb25TdGF0ZS5FTUFJTF9WRVJJRllJTkddLFxyXG4gICAgICAgIFtBdXRoZW50aWNhdGlvblN0YXRlLkVNQUlMX1ZFUklGWUlOR106IFtBdXRoZW50aWNhdGlvblN0YXRlLk9UUF9TRVRVUF9SRVFVSVJFRF0sXHJcbiAgICAgICAgW0F1dGhlbnRpY2F0aW9uU3RhdGUuT1RQX1NFVFVQX1JFUVVJUkVEXTogW0F1dGhlbnRpY2F0aW9uU3RhdGUuT1RQX1ZFUklGWUlOR10sXHJcbiAgICAgICAgW0F1dGhlbnRpY2F0aW9uU3RhdGUuT1RQX1ZFUklGWUlOR106IFtBdXRoZW50aWNhdGlvblN0YXRlLkFVVEhFTlRJQ0FURURdLFxyXG4gICAgICAgIFtBdXRoZW50aWNhdGlvblN0YXRlLkFVVEhFTlRJQ0FURURdOiBbXSxcclxuICAgICAgICBbQXV0aGVudGljYXRpb25TdGF0ZS5FUlJPUl06IFtBdXRoZW50aWNhdGlvblN0YXRlLklOSVRJQUwsIEF1dGhlbnRpY2F0aW9uU3RhdGUuRU1BSUxfVkVSSUZJQ0FUSU9OX1JFUVVJUkVELCBBdXRoZW50aWNhdGlvblN0YXRlLk9UUF9TRVRVUF9SRVFVSVJFRF1cclxuICAgICAgfTtcclxuXHJcbiAgICAgIHJldHVybiB2YWxpZFRyYW5zaXRpb25zW2N1cnJlbnRTdGF0ZV0/LmluY2x1ZGVzKHN0ZXApIHx8IGN1cnJlbnRTdGF0ZSA9PT0gc3RlcDtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKTtcclxuICAgICAgdGhpcy5tb25pdG9yaW5nU2VydmljZS5vbkVycm9yKGNvcnJlbGF0aW9uSWQsIGVtYWlsLCBlcnJvck1lc3NhZ2UsICdzdGVwX3ZhbGlkYXRpb24nKTtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyBwZXJmb3JtQXV0aGVudGljYXRpb24ocmVxdWVzdDogQXV0aFJlcXVlc3QpOiBQcm9taXNlPEF1dGhSZXN1bHQ+IHtcclxuICAgIGlmICghdGhpcy5pc1ZhbGlkRW1haWwocmVxdWVzdC5lbWFpbCkpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJTlZBTElEX0VNQUlMOiBWYWxpZCBlbWFpbCBhZGRyZXNzIGlzIHJlcXVpcmVkJyk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gSWYgcGFzc3dvcmQgaXMgcHJvdmlkZWQsIHVzZSBzdGFuZGFyZCBsb2dpbiBmbG93XHJcbiAgICBpZiAocmVxdWVzdC5wYXNzd29yZCkge1xyXG4gICAgICByZXR1cm4gdGhpcy5wZXJmb3JtTG9naW4ocmVxdWVzdC5lbWFpbCwgcmVxdWVzdC5wYXNzd29yZCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gT3RoZXJ3aXNlLCB1c2UgcXVpY2sgcmVnaXN0cmF0aW9uIGZsb3dcclxuICAgIHJldHVybiB0aGlzLnBlcmZvcm1RdWlja1JlZ2lzdHJhdGlvbihyZXF1ZXN0LmVtYWlsLCByZXF1ZXN0Lm5hbWUpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyBwZXJmb3JtUXVpY2tSZWdpc3RyYXRpb24oZW1haWw6IHN0cmluZywgbmFtZT86IHN0cmluZyk6IFByb21pc2U8QXV0aFJlc3VsdD4ge1xyXG4gICAgY29uc3QgdXNlck5hbWUgPSBuYW1lIHx8IGVtYWlsLnNwbGl0KCdAJylbMF07XHJcbiAgICBsZXQgY29nbml0b1N1Yjogc3RyaW5nO1xyXG4gICAgbGV0IGlzTmV3VXNlciA9IGZhbHNlO1xyXG5cclxuICAgIC8vIENoZWNrIGlmIHVzZXIgYWxyZWFkeSBleGlzdHMgaW4gQ29nbml0b1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgZXhpc3RpbmdVc2VyID0gYXdhaXQgdGhpcy5jb2duaXRvQ2xpZW50LnNlbmQobmV3IEFkbWluR2V0VXNlckNvbW1hbmQoe1xyXG4gICAgICAgIFVzZXJQb29sSWQ6IHByb2Nlc3MuZW52LkNPR05JVE9fVVNFUl9QT09MX0lEISxcclxuICAgICAgICBVc2VybmFtZTogZW1haWxcclxuICAgICAgfSkpO1xyXG5cclxuICAgICAgLy8gQ2hlY2sgaWYgdXNlciBpcyBjb25maXJtZWQgKGVtYWlsIHZlcmlmaWVkKVxyXG4gICAgICBpZiAoZXhpc3RpbmdVc2VyLlVzZXJTdGF0dXMgIT09ICdDT05GSVJNRUQnKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVU0VSX05PVF9DT05GSVJNRUQ6IFBsZWFzZSB2ZXJpZnkgeW91ciBlbWFpbCBhZGRyZXNzIGJlZm9yZSBsb2dnaW5nIGluLiBDaGVjayB5b3VyIGVtYWlsIGZvciB0aGUgdmVyaWZpY2F0aW9uIGNvZGUuJyk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvZ25pdG9TdWIgPSBleGlzdGluZ1VzZXIuVXNlcm5hbWUhO1xyXG4gICAgICBpc05ld1VzZXIgPSBmYWxzZTtcclxuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgaWYgKGVycm9yLm5hbWUgPT09ICdVc2VyTm90Rm91bmRFeGNlcHRpb24nKSB7XHJcbiAgICAgICAgLy8gQ3JlYXRlIG5ldyB1c2VyIC0gdGhpcyB3aWxsIHJlcXVpcmUgZW1haWwgdmVyaWZpY2F0aW9uXHJcbiAgICAgICAgaXNOZXdVc2VyID0gdHJ1ZTtcclxuICAgICAgICBjb2duaXRvU3ViID0gYXdhaXQgdGhpcy5jcmVhdGVDb2duaXRvVXNlcihlbWFpbCwgdXNlck5hbWUpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFRocm93IGVycm9yIHRvIGluZGljYXRlIHZlcmlmaWNhdGlvbiBpcyByZXF1aXJlZFxyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignRU1BSUxfVkVSSUZJQ0FUSU9OX1JFUVVJUkVEOiBBY2NvdW50IGNyZWF0ZWQgc3VjY2Vzc2Z1bGx5LiBQbGVhc2UgY2hlY2sgeW91ciBlbWFpbCBmb3IgdGhlIHZlcmlmaWNhdGlvbiBjb2RlIHRvIGNvbXBsZXRlIHJlZ2lzdHJhdGlvbi4nKTtcclxuICAgICAgfSBlbHNlIGlmIChlcnJvci5tZXNzYWdlLmluY2x1ZGVzKCdVU0VSX05PVF9DT05GSVJNRUQnKSkge1xyXG4gICAgICAgIC8vIFJlLXRocm93IGNvbmZpcm1hdGlvbiBlcnJvclxyXG4gICAgICAgIHRocm93IGVycm9yO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgQ09HTklUT19FUlJPUjogJHtlcnJvci5tZXNzYWdlfWApO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gR2V0IG9yIGNyZWF0ZSB1c2VyIGluIG91ciBEeW5hbW9EQlxyXG4gICAgY29uc3QgdXNlciA9IGF3YWl0IHRoaXMuZ2V0T3JDcmVhdGVVc2VyKGVtYWlsLCBjb2duaXRvU3ViKTtcclxuXHJcbiAgICAvLyBHZW5lcmF0ZSBKV1QgdG9rZW5zIHdpdGggMS1ob3VyIGV4cGlyYXRpb25cclxuICAgIGNvbnN0IHRva2VuUGFpciA9IGF3YWl0IHRoaXMuand0U2VydmljZS5nZW5lcmF0ZVRva2VuUGFpcih7XHJcbiAgICAgIHVzZXJJZDogdXNlci51c2VySWQsXHJcbiAgICAgIGVtYWlsOiB1c2VyLmVtYWlsLFxyXG4gICAgICBvcmdhbml6YXRpb25JZDogdXNlci5vcmdhbml6YXRpb25JZCxcclxuICAgICAgcm9sZTogdXNlci5yb2xlXHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBhY2Nlc3NUb2tlbjogdG9rZW5QYWlyLmFjY2Vzc1Rva2VuLFxyXG4gICAgICByZWZyZXNoVG9rZW46IHRva2VuUGFpci5yZWZyZXNoVG9rZW4sXHJcbiAgICAgIHVzZXI6IHtcclxuICAgICAgICB1c2VySWQ6IHVzZXIudXNlcklkLFxyXG4gICAgICAgIGVtYWlsOiB1c2VyLmVtYWlsLFxyXG4gICAgICAgIG5hbWU6IHVzZXJOYW1lLFxyXG4gICAgICAgIG9yZ2FuaXphdGlvbklkOiB1c2VyLm9yZ2FuaXphdGlvbklkLFxyXG4gICAgICAgIHJvbGU6IHVzZXIucm9sZVxyXG4gICAgICB9LFxyXG4gICAgICBleHBpcmVzSW46IHRva2VuUGFpci5leHBpcmVzSW4sXHJcbiAgICAgIGlzTmV3VXNlcixcclxuICAgICAgbWVzc2FnZTogaXNOZXdVc2VyIFxyXG4gICAgICAgID8gJ0FjY291bnQgY3JlYXRlZCBzdWNjZXNzZnVsbHkuIFNlc3Npb24gdmFsaWQgZm9yIDEgaG91ci4nXHJcbiAgICAgICAgOiAnV2VsY29tZSBiYWNrISBTZXNzaW9uIHZhbGlkIGZvciAxIGhvdXIuJ1xyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgYXN5bmMgcGVyZm9ybUxvZ2luKGVtYWlsOiBzdHJpbmcsIHBhc3N3b3JkOiBzdHJpbmcpOiBQcm9taXNlPEF1dGhSZXN1bHQ+IHtcclxuICAgIGNvbnN0IGNsaWVudElkID0gcHJvY2Vzcy5lbnYuQ09HTklUT19DTElFTlRfSUQ7XHJcbiAgICBpZiAoIWNsaWVudElkKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ09ORklHX0VSUk9SOiBDb2duaXRvIGNsaWVudCBub3QgY29uZmlndXJlZCcpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEF1dGhlbnRpY2F0ZSBhZ2FpbnN0IENvZ25pdG9cclxuICAgIGxldCBjb2duaXRvU3ViOiBzdHJpbmc7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBhdXRoUmVzdWx0ID0gYXdhaXQgdGhpcy5jb2duaXRvQ2xpZW50LnNlbmQobmV3IEluaXRpYXRlQXV0aENvbW1hbmQoe1xyXG4gICAgICAgIEF1dGhGbG93OiAnVVNFUl9QQVNTV09SRF9BVVRIJyxcclxuICAgICAgICBDbGllbnRJZDogY2xpZW50SWQsXHJcbiAgICAgICAgQXV0aFBhcmFtZXRlcnM6IHtcclxuICAgICAgICAgIFVTRVJOQU1FOiBlbWFpbCxcclxuICAgICAgICAgIFBBU1NXT1JEOiBwYXNzd29yZCxcclxuICAgICAgICB9LFxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICBpZiAoIWF1dGhSZXN1bHQuQXV0aGVudGljYXRpb25SZXN1bHQ/LklkVG9rZW4pIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0lOVkFMSURfQ1JFREVOVElBTFM6IEludmFsaWQgZW1haWwgb3IgcGFzc3dvcmQnKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gRGVjb2RlIENvZ25pdG8gSUQgdG9rZW4gdG8gZ2V0IHN1YlxyXG4gICAgICBjb25zdCBwYXJ0cyA9IGF1dGhSZXN1bHQuQXV0aGVudGljYXRpb25SZXN1bHQuSWRUb2tlbi5zcGxpdCgnLicpO1xyXG4gICAgICBjb25zdCBwYXlsb2FkID0gSlNPTi5wYXJzZShCdWZmZXIuZnJvbShwYXJ0c1sxXSwgJ2Jhc2U2NHVybCcpLnRvU3RyaW5nKCd1dGY4JykpO1xyXG4gICAgICBjb2duaXRvU3ViID0gcGF5bG9hZC5zdWI7XHJcbiAgICB9IGNhdGNoIChjb2duaXRvRXJyb3I6IGFueSkge1xyXG4gICAgICBpZiAoXHJcbiAgICAgICAgY29nbml0b0Vycm9yLm5hbWUgPT09ICdOb3RBdXRob3JpemVkRXhjZXB0aW9uJyB8fFxyXG4gICAgICAgIGNvZ25pdG9FcnJvci5uYW1lID09PSAnVXNlck5vdEZvdW5kRXhjZXB0aW9uJ1xyXG4gICAgICApIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0lOVkFMSURfQ1JFREVOVElBTFM6IEludmFsaWQgZW1haWwgb3IgcGFzc3dvcmQnKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoY29nbml0b0Vycm9yLm5hbWUgPT09ICdVc2VyTm90Q29uZmlybWVkRXhjZXB0aW9uJykge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVVNFUl9OT1RfQ09ORklSTUVEOiBVc2VyIGlzIG5vdCBjb25maXJtZWQuIFBsZWFzZSB2ZXJpZnkgeW91ciBlbWFpbC4nKTtcclxuICAgICAgfVxyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEFVVEhfRVJST1I6ICR7Y29nbml0b0Vycm9yLm1lc3NhZ2V9YCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gR2V0IG9yIGNyZWF0ZSB1c2VyIGluIG91ciBEeW5hbW9EQlxyXG4gICAgY29uc3QgdXNlciA9IGF3YWl0IHRoaXMuZ2V0T3JDcmVhdGVVc2VyKGVtYWlsLCBjb2duaXRvU3ViKTtcclxuXHJcbiAgICAvLyBHZW5lcmF0ZSBKV1QgdG9rZW5zIHdpdGggMS1ob3VyIGV4cGlyYXRpb25cclxuICAgIGNvbnN0IHRva2VuUGFpciA9IGF3YWl0IHRoaXMuand0U2VydmljZS5nZW5lcmF0ZVRva2VuUGFpcih7XHJcbiAgICAgIHVzZXJJZDogdXNlci51c2VySWQsXHJcbiAgICAgIGVtYWlsOiB1c2VyLmVtYWlsLFxyXG4gICAgICBvcmdhbml6YXRpb25JZDogdXNlci5vcmdhbml6YXRpb25JZCxcclxuICAgICAgcm9sZTogdXNlci5yb2xlXHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBhY2Nlc3NUb2tlbjogdG9rZW5QYWlyLmFjY2Vzc1Rva2VuLFxyXG4gICAgICByZWZyZXNoVG9rZW46IHRva2VuUGFpci5yZWZyZXNoVG9rZW4sXHJcbiAgICAgIHVzZXI6IHtcclxuICAgICAgICB1c2VySWQ6IHVzZXIudXNlcklkLFxyXG4gICAgICAgIGVtYWlsOiB1c2VyLmVtYWlsLFxyXG4gICAgICAgIG5hbWU6IHVzZXIuZW1haWwuc3BsaXQoJ0AnKVswXSwgLy8gRGVmYXVsdCBuYW1lIGZyb20gZW1haWxcclxuICAgICAgICBvcmdhbml6YXRpb25JZDogdXNlci5vcmdhbml6YXRpb25JZCxcclxuICAgICAgICByb2xlOiB1c2VyLnJvbGVcclxuICAgICAgfSxcclxuICAgICAgZXhwaXJlc0luOiB0b2tlblBhaXIuZXhwaXJlc0luLFxyXG4gICAgICBpc05ld1VzZXI6IGZhbHNlLFxyXG4gICAgICBtZXNzYWdlOiAnTG9naW4gc3VjY2Vzc2Z1bC4gU2Vzc2lvbiB2YWxpZCBmb3IgMSBob3VyLidcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFzeW5jIGNyZWF0ZUNvZ25pdG9Vc2VyKGVtYWlsOiBzdHJpbmcsIHVzZXJOYW1lOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xyXG4gICAgY29uc3QgdGVtcFBhc3N3b3JkID0gdGhpcy5nZW5lcmF0ZVRlbXBQYXNzd29yZCgpO1xyXG4gICAgY29uc3QgcGVybWFuZW50UGFzc3dvcmQgPSB0aGlzLmdlbmVyYXRlU2VjdXJlUGFzc3dvcmQoKTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICAvLyBDcmVhdGUgdXNlciBpbiBDb2duaXRvXHJcbiAgICAgIGF3YWl0IHRoaXMuY29nbml0b0NsaWVudC5zZW5kKG5ldyBBZG1pbkNyZWF0ZVVzZXJDb21tYW5kKHtcclxuICAgICAgICBVc2VyUG9vbElkOiBwcm9jZXNzLmVudi5DT0dOSVRPX1VTRVJfUE9PTF9JRCEsXHJcbiAgICAgICAgVXNlcm5hbWU6IGVtYWlsLFxyXG4gICAgICAgIFRlbXBvcmFyeVBhc3N3b3JkOiB0ZW1wUGFzc3dvcmQsXHJcbiAgICAgICAgTWVzc2FnZUFjdGlvbjogJ1NVUFBSRVNTJywgLy8gRG9uJ3Qgc2VuZCB3ZWxjb21lIGVtYWlsXHJcbiAgICAgICAgVXNlckF0dHJpYnV0ZXM6IFtcclxuICAgICAgICAgIHsgTmFtZTogJ2VtYWlsJywgVmFsdWU6IGVtYWlsIH0sXHJcbiAgICAgICAgICB7IE5hbWU6ICdlbWFpbF92ZXJpZmllZCcsIFZhbHVlOiAndHJ1ZScgfSxcclxuICAgICAgICAgIHsgTmFtZTogJ25hbWUnLCBWYWx1ZTogdXNlck5hbWUgfVxyXG4gICAgICAgIF1cclxuICAgICAgfSkpO1xyXG5cclxuICAgICAgLy8gU2V0IHBlcm1hbmVudCBwYXNzd29yZCBmb3Igc2VhbWxlc3MgZXhwZXJpZW5jZVxyXG4gICAgICBhd2FpdCB0aGlzLmNvZ25pdG9DbGllbnQuc2VuZChuZXcgQWRtaW5TZXRVc2VyUGFzc3dvcmRDb21tYW5kKHtcclxuICAgICAgICBVc2VyUG9vbElkOiBwcm9jZXNzLmVudi5DT0dOSVRPX1VTRVJfUE9PTF9JRCEsXHJcbiAgICAgICAgVXNlcm5hbWU6IGVtYWlsLFxyXG4gICAgICAgIFBhc3N3b3JkOiBwZXJtYW5lbnRQYXNzd29yZCxcclxuICAgICAgICBQZXJtYW5lbnQ6IHRydWVcclxuICAgICAgfSkpO1xyXG5cclxuICAgICAgLy8gR2V0IHRoZSBDb2duaXRvIHN1YiBmcm9tIHRoZSBjcmVhdGVkIHVzZXJcclxuICAgICAgY29uc3QgbmV3VXNlciA9IGF3YWl0IHRoaXMuY29nbml0b0NsaWVudC5zZW5kKG5ldyBBZG1pbkdldFVzZXJDb21tYW5kKHtcclxuICAgICAgICBVc2VyUG9vbElkOiBwcm9jZXNzLmVudi5DT0dOSVRPX1VTRVJfUE9PTF9JRCEsXHJcbiAgICAgICAgVXNlcm5hbWU6IGVtYWlsXHJcbiAgICAgIH0pKTtcclxuICAgICAgXHJcbiAgICAgIGNvbnN0IHN1YkF0dHJpYnV0ZSA9IG5ld1VzZXIuVXNlckF0dHJpYnV0ZXM/LmZpbmQoYXR0ciA9PiBhdHRyLk5hbWUgPT09ICdzdWInKTtcclxuICAgICAgcmV0dXJuIHN1YkF0dHJpYnV0ZT8uVmFsdWUgfHwgdXVpZHY0KCk7XHJcblxyXG4gICAgfSBjYXRjaCAoY3JlYXRlRXJyb3I6IGFueSkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFVTRVJfQ1JFQVRJT05fRkFJTEVEOiAke2NyZWF0ZUVycm9yLm1lc3NhZ2V9YCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFzeW5jIGdldE9yQ3JlYXRlVXNlcihlbWFpbDogc3RyaW5nLCBjb2duaXRvU3ViOiBzdHJpbmcpOiBQcm9taXNlPGFueT4ge1xyXG4gICAgLy8gQ2hlY2sgaWYgdXNlciBleGlzdHMgaW4gb3VyIER5bmFtb0RCXHJcbiAgICBsZXQgdXNlciA9IGF3YWl0IHRoaXMudXNlclNlcnZpY2UuZ2V0VXNlckJ5RW1haWwoZW1haWwpO1xyXG5cclxuICAgIGlmICghdXNlcikge1xyXG4gICAgICAvLyBDcmVhdGUgdXNlciBpbiBvdXIgc3lzdGVtXHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgdXNlciA9IGF3YWl0IHRoaXMudXNlclNlcnZpY2UuY3JlYXRlVXNlcih7XHJcbiAgICAgICAgICBlbWFpbCxcclxuICAgICAgICAgIG9yZ2FuaXphdGlvbklkOiBjb2duaXRvU3ViLCAvLyBVc2UgQ29nbml0byBzdWIgYXMgb3JnYW5pemF0aW9uIElEXHJcbiAgICAgICAgICByb2xlOiAnZGV2ZWxvcGVyJyxcclxuICAgICAgICAgIHByZWZlcmVuY2VzOiB7XHJcbiAgICAgICAgICAgIHRoZW1lOiAnbGlnaHQnLFxyXG4gICAgICAgICAgICBub3RpZmljYXRpb25zOiB7XHJcbiAgICAgICAgICAgICAgZW1haWw6IHRydWUsXHJcbiAgICAgICAgICAgICAgd2ViaG9vazogZmFsc2VcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZGVmYXVsdE1pc3JhUnVsZVNldDogJ01JU1JBX0NfMjAxMidcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgfSBjYXRjaCAodXNlckVycm9yOiBhbnkpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVTRVJfQ1JFQVRJT05fRkFJTEVEOiAke3VzZXJFcnJvci5tZXNzYWdlfWApO1xyXG4gICAgICB9XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAvLyBVcGRhdGUgbGFzdCBsb2dpbiBmb3IgZXhpc3RpbmcgdXNlclxyXG4gICAgICBhd2FpdCB0aGlzLnVzZXJTZXJ2aWNlLnVwZGF0ZUxhc3RMb2dpbih1c2VyLnVzZXJJZCk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHVzZXI7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFzeW5jIGV4ZWN1dGVXaXRoUmV0cnk8VD4oXHJcbiAgICBvcGVyYXRpb246ICgpID0+IFByb21pc2U8VD4sXHJcbiAgICBjb25maWc6IFJldHJ5Q29uZmlnLFxyXG4gICAgb3BlcmF0aW9uVHlwZTogc3RyaW5nXHJcbiAgKTogUHJvbWlzZTxUPiB7XHJcbiAgICBsZXQgbGFzdEVycm9yOiBFcnJvcjtcclxuICAgIFxyXG4gICAgZm9yIChsZXQgYXR0ZW1wdCA9IDA7IGF0dGVtcHQgPD0gY29uZmlnLm1heFJldHJpZXM7IGF0dGVtcHQrKykge1xyXG4gICAgICB0cnkge1xyXG4gICAgICAgIHJldHVybiBhd2FpdCBvcGVyYXRpb24oKTtcclxuICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICAgIGxhc3RFcnJvciA9IGVycm9yO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIERvbid0IHJldHJ5IG9uIGNlcnRhaW4gZXJyb3IgdHlwZXNcclxuICAgICAgICBpZiAodGhpcy5pc05vblJldHJ5YWJsZUVycm9yKGVycm9yKSkge1xyXG4gICAgICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIElmIHRoaXMgd2FzIHRoZSBsYXN0IGF0dGVtcHQsIHRocm93IHRoZSBlcnJvclxyXG4gICAgICAgIGlmIChhdHRlbXB0ID09PSBjb25maWcubWF4UmV0cmllcykge1xyXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGAke29wZXJhdGlvblR5cGUudG9VcHBlckNhc2UoKX1fUkVUUllfRVhIQVVTVEVEOiBGYWlsZWQgYWZ0ZXIgJHtjb25maWcubWF4UmV0cmllcyArIDF9IGF0dGVtcHRzLiBMYXN0IGVycm9yOiAke2Vycm9yLm1lc3NhZ2V9YCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIENhbGN1bGF0ZSBkZWxheSB3aXRoIGV4cG9uZW50aWFsIGJhY2tvZmZcclxuICAgICAgICBjb25zdCBkZWxheSA9IE1hdGgubWluKFxyXG4gICAgICAgICAgY29uZmlnLmJhc2VEZWxheSAqIE1hdGgucG93KDIsIGF0dGVtcHQpLFxyXG4gICAgICAgICAgY29uZmlnLm1heERlbGF5XHJcbiAgICAgICAgKTtcclxuICAgICAgICBcclxuICAgICAgICBjb25zb2xlLndhcm4oYCR7b3BlcmF0aW9uVHlwZX0gYXR0ZW1wdCAke2F0dGVtcHQgKyAxfSBmYWlsZWQsIHJldHJ5aW5nIGluICR7ZGVsYXl9bXM6YCwgZXJyb3IubWVzc2FnZSk7XHJcbiAgICAgICAgYXdhaXQgdGhpcy5zbGVlcChkZWxheSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIFxyXG4gICAgdGhyb3cgbGFzdEVycm9yITtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgaXNOb25SZXRyeWFibGVFcnJvcihlcnJvcjogRXJyb3IpOiBib29sZWFuIHtcclxuICAgIGNvbnN0IG1lc3NhZ2UgPSBlcnJvci5tZXNzYWdlO1xyXG4gICAgXHJcbiAgICAvLyBEb24ndCByZXRyeSB2YWxpZGF0aW9uIGVycm9yc1xyXG4gICAgaWYgKG1lc3NhZ2UuaW5jbHVkZXMoJ0lOVkFMSURfRU1BSUwnKSB8fCBcclxuICAgICAgICBtZXNzYWdlLmluY2x1ZGVzKCdJTlZBTElEX0NSRURFTlRJQUxTJykgfHxcclxuICAgICAgICBtZXNzYWdlLmluY2x1ZGVzKCdVU0VSX05PVF9DT05GSVJNRUQnKSB8fFxyXG4gICAgICAgIG1lc3NhZ2UuaW5jbHVkZXMoJ0NPTkZJR19FUlJPUicpKSB7XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIHNsZWVwKG1zOiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgbXMpKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgaXNWYWxpZEVtYWlsKGVtYWlsOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICAgIGNvbnN0IGVtYWlsUmVnZXggPSAvXlteXFxzQF0rQFteXFxzQF0rXFwuW15cXHNAXSskLztcclxuICAgIHJldHVybiBlbWFpbFJlZ2V4LnRlc3QoZW1haWwpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBnZW5lcmF0ZVRlbXBQYXNzd29yZCgpOiBzdHJpbmcge1xyXG4gICAgcmV0dXJuIE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnNsaWNlKC0xMikgKyAnQTEhJztcclxuICB9XHJcblxyXG4gIHByaXZhdGUgZ2VuZXJhdGVTZWN1cmVQYXNzd29yZCgpOiBzdHJpbmcge1xyXG4gICAgY29uc3QgY2hhcnMgPSAnQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkhQCMkJV4mKic7XHJcbiAgICBsZXQgcGFzc3dvcmQgPSAnJztcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMTY7IGkrKykge1xyXG4gICAgICBwYXNzd29yZCArPSBjaGFycy5jaGFyQXQoTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogY2hhcnMubGVuZ3RoKSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcGFzc3dvcmQgKyAnQTEhJzsgLy8gRW5zdXJlIGl0IG1lZXRzIENvZ25pdG8gcmVxdWlyZW1lbnRzXHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDaGVjayBpZiB1c2VyIGV4aXN0cyBpbiBDb2duaXRvXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBhc3luYyBjaGVja1VzZXJFeGlzdHMoZW1haWw6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4ge1xyXG4gICAgY29uc3QgY29ycmVsYXRpb25JZCA9IHV1aWR2NCgpO1xyXG4gICAgXHJcbiAgICB0aGlzLmxvZ2dlci5pbmZvKCdDaGVja2luZyBpZiB1c2VyIGV4aXN0cycsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZW1haWxcclxuICAgIH0pO1xyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIGF3YWl0IHRoaXMuY29nbml0b0NsaWVudC5zZW5kKG5ldyBBZG1pbkdldFVzZXJDb21tYW5kKHtcclxuICAgICAgICBVc2VyUG9vbElkOiBwcm9jZXNzLmVudi5DT0dOSVRPX1VTRVJfUE9PTF9JRCEsXHJcbiAgICAgICAgVXNlcm5hbWU6IGVtYWlsXHJcbiAgICAgIH0pKTtcclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgIGlmIChlcnJvci5uYW1lID09PSAnVXNlck5vdEZvdW5kRXhjZXB0aW9uJykge1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgfVxyXG4gICAgICB0aGlzLm1vbml0b3JpbmdTZXJ2aWNlLm9uRXJyb3IoY29ycmVsYXRpb25JZCwgZW1haWwsIGVycm9yLm1lc3NhZ2UsICd1c2VyX2NoZWNrJyk7XHJcbiAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2VuZXJhdGUgUVIgY29kZSBVUkwgZm9yIE9UUCBzZXR1cFxyXG4gICAqL1xyXG4gIHByaXZhdGUgZ2VuZXJhdGVRUkNvZGVVcmwoZW1haWw6IHN0cmluZywgc2VjcmV0OiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gICAgY29uc3QgY29ycmVsYXRpb25JZCA9IHV1aWR2NCgpO1xyXG4gICAgXHJcbiAgICB0aGlzLmxvZ2dlci5pbmZvKCdHZW5lcmF0aW5nIFFSIGNvZGUgVVJMJywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICBlbWFpbFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgaXNzdWVyID0gJ01JU1JBIFBsYXRmb3JtJztcclxuICAgIGNvbnN0IGxhYmVsID0gYCR7aXNzdWVyfToke2VtYWlsfWA7XHJcbiAgICBjb25zdCBvdHBBdXRoVXJsID0gYG90cGF1dGg6Ly90b3RwLyR7ZW5jb2RlVVJJQ29tcG9uZW50KGxhYmVsKX0/c2VjcmV0PSR7c2VjcmV0fSZpc3N1ZXI9JHtlbmNvZGVVUklDb21wb25lbnQoaXNzdWVyKX1gO1xyXG4gICAgXHJcbiAgICAvLyBSZXR1cm4gR29vZ2xlIENoYXJ0cyBRUiBjb2RlIFVSTFxyXG4gICAgcmV0dXJuIGBodHRwczovL2NoYXJ0Lmdvb2dsZWFwaXMuY29tL2NoYXJ0P2Nocz0yMDB4MjAwJmNobGQ9TXwwJmNodD1xciZjaGw9JHtlbmNvZGVVUklDb21wb25lbnQob3RwQXV0aFVybCl9YDtcclxuICB9XHJcbn0iXX0=