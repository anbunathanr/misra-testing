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
            this.monitoringService.onError(correlationId, email, error.message, 'state_check');
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
            this.monitoringService.onError(correlationId, email, error.message, 'step_validation');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW5pZmllZC1hdXRoLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1bmlmaWVkLWF1dGgtc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxnR0FPbUQ7QUFDbkQsK0NBQStEO0FBQy9ELHVEQUFtRDtBQUNuRCw2RUFBd0U7QUFDeEUsdUVBQXlGO0FBQ3pGLCtCQUFvQztBQUNwQyx1RUFBa0U7QUFDbEUsK0NBQWtEO0FBMkJsRCxJQUFZLG1CQVNYO0FBVEQsV0FBWSxtQkFBbUI7SUFDN0IsMENBQW1CLENBQUE7SUFDbkIsa0RBQTJCLENBQUE7SUFDM0Isa0ZBQTJELENBQUE7SUFDM0QsMERBQW1DLENBQUE7SUFDbkMsZ0VBQXlDLENBQUE7SUFDekMsc0RBQStCLENBQUE7SUFDL0Isc0RBQStCLENBQUE7SUFDL0Isc0NBQWUsQ0FBQTtBQUNqQixDQUFDLEVBVFcsbUJBQW1CLG1DQUFuQixtQkFBbUIsUUFTOUI7QUE2QkQsTUFBYSxrQkFBa0I7SUFDckIsYUFBYSxDQUFnQztJQUM3QyxVQUFVLENBQWE7SUFDdkIsV0FBVyxDQUFjO0lBQ3pCLHdCQUF3QixDQUEyQjtJQUNuRCxpQkFBaUIsQ0FBd0I7SUFDekMsWUFBWSxDQUFtQjtJQUMvQixNQUFNLENBQWtDO0lBQ3hDLGtCQUFrQixHQUFnQjtRQUN4QyxVQUFVLEVBQUUsQ0FBQztRQUNiLFNBQVMsRUFBRSxJQUFJLEVBQUUsV0FBVztRQUM1QixRQUFRLEVBQUUsSUFBSSxDQUFHLFlBQVk7S0FDOUIsQ0FBQztJQUVGO1FBQ0UsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLGdFQUE2QixDQUFDO1lBQ3JELE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXO1NBQzlDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSx3QkFBVSxFQUFFLENBQUM7UUFDbkMsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLDBCQUFXLEVB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XHJcbiAgQ29nbml0b0lkZW50aXR5UHJvdmlkZXJDbGllbnQsIFxyXG4gIEFkbWluQ3JlYXRlVXNlckNvbW1hbmQsIFxyXG4gIEFkbWluU2V0VXNlclBhc3N3b3JkQ29tbWFuZCxcclxuICBBZG1pbkluaXRpYXRlQXV0aENvbW1hbmQsXHJcbiAgQWRtaW5HZXRVc2VyQ29tbWFuZCxcclxuICBJbml0aWF0ZUF1dGhDb21tYW5kXHJcbn0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWNvZ25pdG8taWRlbnRpdHktcHJvdmlkZXInO1xyXG5pbXBvcnQgeyBKV1RTZXJ2aWNlLCBUZW1wb3JhcnlUb2tlblBhaXIgfSBmcm9tICcuL2p3dC1zZXJ2aWNlJztcclxuaW1wb3J0IHsgVXNlclNlcnZpY2UgfSBmcm9tICcuLi91c2VyL3VzZXItc2VydmljZSc7XHJcbmltcG9ydCB7IEVtYWlsVmVyaWZpY2F0aW9uU2VydmljZSB9IGZyb20gJy4vZW1haWwtdmVyaWZpY2F0aW9uLXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBBdXRoTW9uaXRvcmluZ1NlcnZpY2UsIGF1dGhNb25pdG9yaW5nU2VydmljZSB9IGZyb20gJy4vYXV0aC1tb25pdG9yaW5nLXNlcnZpY2UnO1xyXG5pbXBvcnQgeyB2NCBhcyB1dWlkdjQgfSBmcm9tICd1dWlkJztcclxuaW1wb3J0IHsgQXV0aEVycm9ySGFuZGxlciB9IGZyb20gJy4uLy4uL3V0aWxzL2F1dGgtZXJyb3ItaGFuZGxlcic7XHJcbmltcG9ydCB7IGNyZWF0ZUxvZ2dlciB9IGZyb20gJy4uLy4uL3V0aWxzL2xvZ2dlcic7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEF1dGhGbG93UmVzdWx0IHtcclxuICBzdGF0ZTogQXV0aGVudGljYXRpb25TdGF0ZTtcclxuICByZXF1aXJlc0VtYWlsVmVyaWZpY2F0aW9uOiBib29sZWFuO1xyXG4gIHJlcXVpcmVzT1RQU2V0dXA6IGJvb2xlYW47XHJcbiAgbWVzc2FnZTogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIE9UUFNldHVwUmVzdWx0IHtcclxuICBvdHBTZXR1cDoge1xyXG4gICAgc2VjcmV0OiBzdHJpbmc7XHJcbiAgICBxckNvZGVVcmw6IHN0cmluZztcclxuICAgIGJhY2t1cENvZGVzOiBzdHJpbmdbXTtcclxuICAgIGlzc3Vlcjogc3RyaW5nO1xyXG4gICAgYWNjb3VudE5hbWU6IHN0cmluZztcclxuICB9O1xyXG4gIHRlbXBvcmFyeVRva2Vucz86IHtcclxuICAgIGFjY2Vzc1Rva2VuOiBzdHJpbmc7XHJcbiAgICByZWZyZXNoVG9rZW46IHN0cmluZztcclxuICAgIGV4cGlyZXNJbjogbnVtYmVyO1xyXG4gICAgc2NvcGU6ICd0ZW1wX2F1dGhlbnRpY2F0ZWQnO1xyXG4gIH07XHJcbiAgbmV4dFN0ZXA6IEF1dGhlbnRpY2F0aW9uU3RhdGU7XHJcbiAgbWVzc2FnZTogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgZW51bSBBdXRoZW50aWNhdGlvblN0YXRlIHtcclxuICBJTklUSUFMID0gJ2luaXRpYWwnLFxyXG4gIFJFR0lTVEVSSU5HID0gJ3JlZ2lzdGVyaW5nJyxcclxuICBFTUFJTF9WRVJJRklDQVRJT05fUkVRVUlSRUQgPSAnZW1haWxfdmVyaWZpY2F0aW9uX3JlcXVpcmVkJyxcclxuICBFTUFJTF9WRVJJRllJTkcgPSAnZW1haWxfdmVyaWZ5aW5nJyxcclxuICBPVFBfU0VUVVBfUkVRVUlSRUQgPSAnb3RwX3NldHVwX3JlcXVpcmVkJyxcclxuICBPVFBfVkVSSUZZSU5HID0gJ290cF92ZXJpZnlpbmcnLFxyXG4gIEFVVEhFTlRJQ0FURUQgPSAnYXV0aGVudGljYXRlZCcsXHJcbiAgRVJST1IgPSAnZXJyb3InXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQXV0aFJlcXVlc3Qge1xyXG4gIGVtYWlsOiBzdHJpbmc7XHJcbiAgcGFzc3dvcmQ/OiBzdHJpbmc7IC8vIE9wdGlvbmFsIGZvciBxdWljayByZWdpc3RyYXRpb25cclxuICBuYW1lPzogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEF1dGhSZXN1bHQge1xyXG4gIGFjY2Vzc1Rva2VuOiBzdHJpbmc7XHJcbiAgcmVmcmVzaFRva2VuOiBzdHJpbmc7XHJcbiAgdXNlcjoge1xyXG4gICAgdXNlcklkOiBzdHJpbmc7XHJcbiAgICBlbWFpbDogc3RyaW5nO1xyXG4gICAgbmFtZTogc3RyaW5nO1xyXG4gICAgb3JnYW5pemF0aW9uSWQ6IHN0cmluZztcclxuICAgIHJvbGU6IHN0cmluZztcclxuICB9O1xyXG4gIGV4cGlyZXNJbjogbnVtYmVyO1xyXG4gIGlzTmV3VXNlcjogYm9vbGVhbjtcclxuICBtZXNzYWdlOiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgUmV0cnlDb25maWcge1xyXG4gIG1heFJldHJpZXM6IG51bWJlcjtcclxuICBiYXNlRGVsYXk6IG51bWJlcjsgLy8gbWlsbGlzZWNvbmRzXHJcbiAgbWF4RGVsYXk6IG51bWJlcjsgLy8gbWlsbGlzZWNvbmRzXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBVbmlmaWVkQXV0aFNlcnZpY2Uge1xyXG4gIHByaXZhdGUgY29nbml0b0NsaWVudDogQ29nbml0b0lkZW50aXR5UHJvdmlkZXJDbGllbnQ7XHJcbiAgcHJpdmF0ZSBqd3RTZXJ2aWNlOiBKV1RTZXJ2aWNlO1xyXG4gIHByaXZhdGUgdXNlclNlcnZpY2U6IFVzZXJTZXJ2aWNlO1xyXG4gIHByaXZhdGUgZW1haWxWZXJpZmljYXRpb25TZXJ2aWNlOiBFbWFpbFZlcmlmaWNhdGlvblNlcnZpY2U7XHJcbiAgcHJpdmF0ZSBtb25pdG9yaW5nU2VydmljZTogQXV0aE1vbml0b3JpbmdTZXJ2aWNlO1xyXG4gIHByaXZhdGUgZXJyb3JIYW5kbGVyOiBBdXRoRXJyb3JIYW5kbGVyO1xyXG4gIHByaXZhdGUgbG9nZ2VyOiBSZXR1cm5UeXBlPHR5cGVvZiBjcmVhdGVMb2dnZXI+O1xyXG4gIHByaXZhdGUgZGVmYXVsdFJldHJ5Q29uZmlnOiBSZXRyeUNvbmZpZyA9IHtcclxuICAgIG1heFJldHJpZXM6IDMsXHJcbiAgICBiYXNlRGVsYXk6IDEwMDAsIC8vIDEgc2Vjb25kXHJcbiAgICBtYXhEZWxheTogNTAwMCAgIC8vIDUgc2Vjb25kc1xyXG4gIH07XHJcblxyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgdGhpcy5jb2duaXRvQ2xpZW50ID0gbmV3IENvZ25pdG9JZGVudGl0eVByb3ZpZGVyQ2xpZW50KHsgXHJcbiAgICAgIHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJyBcclxuICAgIH0pO1xyXG4gICAgdGhpcy5qd3RTZXJ2aWNlID0gbmV3IEpXVFNlcnZpY2UoKTtcclxuICAgIHRoaXMudXNlclNlcnZpY2UgPSBuZXcgVXNlclNlcnZpY2UoKTtcclxuICAgIHRoaXMuZW1haWxWZXJpZmljYXRpb25TZXJ2aWNlID0gbmV3IEVtYWlsVmVyaWZpY2F0aW9uU2VydmljZSgpO1xyXG4gICAgdGhpcy5tb25pdG9yaW5nU2VydmljZSA9IGF1dGhNb25pdG9yaW5nU2VydmljZTtcclxuICAgIHRoaXMuZXJyb3JIYW5kbGVyID0gbmV3IEF1dGhFcnJvckhhbmRsZXIoJ1VuaWZpZWRBdXRoU2VydmljZScpO1xyXG4gICAgdGhpcy5sb2dnZXIgPSBjcmVhdGVMb2dnZXIoJ1VuaWZpZWRBdXRoU2VydmljZScpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogVW5pZmllZCBhdXRoZW50aWNhdGlvbiBtZXRob2QgdGhhdCBoYW5kbGVzIGJvdGggcXVpY2sgcmVnaXN0cmF0aW9uIGFuZCBleGlzdGluZyB1c2VyIGxvZ2luXHJcbiAgICovXHJcbiAgYXN5bmMgYXV0aGVudGljYXRlKHJlcXVlc3Q6IEF1dGhSZXF1ZXN0LCByZXRyeUNvbmZpZz86IFBhcnRpYWw8UmV0cnlDb25maWc+KTogUHJvbWlzZTxBdXRoUmVzdWx0PiB7XHJcbiAgICBjb25zdCBjb25maWcgPSB7IC4uLnRoaXMuZGVmYXVsdFJldHJ5Q29uZmlnLCAuLi5yZXRyeUNvbmZpZyB9O1xyXG4gICAgXHJcbiAgICByZXR1cm4gdGhpcy5leGVjdXRlV2l0aFJldHJ5KFxyXG4gICAgICAoKSA9PiB0aGlzLnBlcmZvcm1BdXRoZW50aWNhdGlvbihyZXF1ZXN0KSxcclxuICAgICAgY29uZmlnLFxyXG4gICAgICAnYXV0aGVudGljYXRpb24nXHJcbiAgICApO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUXVpY2sgcmVnaXN0cmF0aW9uIGZsb3cgLSBjcmVhdGVzIHVzZXIgaWYgZG9lc24ndCBleGlzdCwgbG9ncyBpbiBpZiBleGlzdHNcclxuICAgKi9cclxuICBhc3luYyBxdWlja1JlZ2lzdGVyKGVtYWlsOiBzdHJpbmcsIG5hbWU/OiBzdHJpbmcsIHJldHJ5Q29uZmlnPzogUGFydGlhbDxSZXRyeUNvbmZpZz4pOiBQcm9taXNlPEF1dGhSZXN1bHQ+IHtcclxuICAgIGNvbnN0IGNvbmZpZyA9IHsgLi4udGhpcy5kZWZhdWx0UmV0cnlDb25maWcsIC4uLnJldHJ5Q29uZmlnIH07XHJcbiAgICBcclxuICAgIHJldHVybiB0aGlzLmV4ZWN1dGVXaXRoUmV0cnkoXHJcbiAgICAgICgpID0+IHRoaXMucGVyZm9ybVF1aWNrUmVnaXN0cmF0aW9uKGVtYWlsLCBuYW1lKSxcclxuICAgICAgY29uZmlnLFxyXG4gICAgICAncXVpY2sgcmVnaXN0cmF0aW9uJ1xyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFN0YW5kYXJkIGxvZ2luIGZsb3cgLSByZXF1aXJlcyBwYXNzd29yZFxyXG4gICAqL1xyXG4gIGFzeW5jIGxvZ2luKGVtYWlsOiBzdHJpbmcsIHBhc3N3b3JkOiBzdHJpbmcsIHJldHJ5Q29uZmlnPzogUGFydGlhbDxSZXRyeUNvbmZpZz4pOiBQcm9taXNlPEF1dGhSZXN1bHQ+IHtcclxuICAgIGNvbnN0IGNvbmZpZyA9IHsgLi4udGhpcy5kZWZhdWx0UmV0cnlDb25maWcsIC4uLnJldHJ5Q29uZmlnIH07XHJcbiAgICBcclxuICAgIHJldHVybiB0aGlzLmV4ZWN1dGVXaXRoUmV0cnkoXHJcbiAgICAgICgpID0+IHRoaXMucGVyZm9ybUxvZ2luKGVtYWlsLCBwYXNzd29yZCksXHJcbiAgICAgIGNvbmZpZyxcclxuICAgICAgJ2xvZ2luJ1xyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEVuaGFuY2VkIGF1dGhlbnRpY2F0aW9uIGZsb3cgaW5pdGlhdGlvblxyXG4gICAqL1xyXG4gIGFzeW5jIGluaXRpYXRlQXV0aGVudGljYXRpb25GbG93KGVtYWlsOiBzdHJpbmcsIG5hbWU/OiBzdHJpbmcpOiBQcm9taXNlPEF1dGhGbG93UmVzdWx0PiB7XHJcbiAgICBjb25zdCBjb3JyZWxhdGlvbklkID0gdXVpZHY0KCk7XHJcbiAgICBcclxuICAgIHRoaXMubG9nZ2VyLmluZm8oJ0luaXRpYXRpbmcgYXV0aGVudGljYXRpb24gZmxvdycsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZW1haWwsXHJcbiAgICAgIGhhc05hbWU6ICEhbmFtZVxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gTW9uaXRvciBmbG93IGluaXRpYXRpb25cclxuICAgIHRoaXMubW9uaXRvcmluZ1NlcnZpY2Uub25BdXRoRmxvd0luaXRpYXRlZChjb3JyZWxhdGlvbklkLCBlbWFpbCk7XHJcblxyXG4gICAgaWYgKCF0aGlzLmlzVmFsaWRFbWFpbChlbWFpbCkpIHtcclxuICAgICAgY29uc3QgZXJyb3IgPSBuZXcgRXJyb3IoJ0lOVkFMSURfRU1BSUw6IFZhbGlkIGVtYWlsIGFkZHJlc3MgaXMgcmVxdWlyZWQnKTtcclxuICAgICAgdGhpcy5lcnJvckhhbmRsZXIuaGFuZGxlRXJyb3IoZXJyb3IsIHtcclxuICAgICAgICBvcGVyYXRpb246ICdpbml0aWF0ZUF1dGhlbnRpY2F0aW9uRmxvdycsXHJcbiAgICAgICAgZW1haWwsXHJcbiAgICAgICAgc3RlcDogJ3ZhbGlkYXRpb24nXHJcbiAgICAgIH0pO1xyXG4gICAgICB0aHJvdyBlcnJvcjtcclxuICAgIH1cclxuXHJcbiAgICB0cnkge1xyXG4gICAgICAvLyBDaGVjayBpZiB1c2VyIGV4aXN0cyBhbmQgdGhlaXIgdmVyaWZpY2F0aW9uIHN0YXR1c1xyXG4gICAgICBjb25zdCB1c2VyRXhpc3RzID0gYXdhaXQgdGhpcy5jaGVja1VzZXJFeGlzdHMoZW1haWwpO1xyXG4gICAgICBcclxuICAgICAgaWYgKCF1c2VyRXhpc3RzKSB7XHJcbiAgICAgICAgLy8gQ3JlYXRlIG5ldyB1c2VyIC0gdGhpcyB3aWxsIHJlcXVpcmUgZW1haWwgdmVyaWZpY2F0aW9uXHJcbiAgICAgICAgYXdhaXQgdGhpcy5jcmVhdGVDb2duaXRvVXNlcihlbWFpbCwgbmFtZSB8fCBlbWFpbC5zcGxpdCgnQCcpWzBdKTtcclxuICAgICAgICBcclxuICAgICAgICB0aGlzLmVycm9ySGFuZGxlci5sb2dBdXRoRXZlbnQoJ3VzZXJfY3JlYXRlZCcsIHtcclxuICAgICAgICAgIG9wZXJhdGlvbjogJ2luaXRpYXRlQXV0aGVudGljYXRpb25GbG93JyxcclxuICAgICAgICAgIGVtYWlsLFxyXG4gICAgICAgICAgc3RlcDogJ3JlZ2lzdHJhdGlvbidcclxuICAgICAgICB9LCB0cnVlLCB7IGNvcnJlbGF0aW9uSWQgfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIHN0YXRlOiBBdXRoZW50aWNhdGlvblN0YXRlLkVNQUlMX1ZFUklGSUNBVElPTl9SRVFVSVJFRCxcclxuICAgICAgICAgIHJlcXVpcmVzRW1haWxWZXJpZmljYXRpb246IHRydWUsXHJcbiAgICAgICAgICByZXF1aXJlc09UUFNldHVwOiBmYWxzZSxcclxuICAgICAgICAgIG1lc3NhZ2U6ICdBY2NvdW50IGNyZWF0ZWQgc3VjY2Vzc2Z1bGx5LiBQbGVhc2UgY2hlY2sgeW91ciBlbWFpbCBmb3IgdGhlIHZlcmlmaWNhdGlvbiBjb2RlLidcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBVc2VyIGV4aXN0cywgY2hlY2sgdGhlaXIgc3RhdHVzXHJcbiAgICAgIGNvbnN0IGlzRW1haWxWZXJpZmllZCA9IGF3YWl0IHRoaXMuZW1haWxWZXJpZmljYXRpb25TZXJ2aWNlLmlzRW1haWxWZXJpZmllZChlbWFpbCk7XHJcbiAgICAgIGNvbnN0IGlzT1RQRW5hYmxlZCA9IGF3YWl0IHRoaXMuZW1haWxWZXJpZmljYXRpb25TZXJ2aWNlLmlzT1RQRW5hYmxlZChlbWFpbCk7XHJcblxyXG4gICAgICB0aGlzLmxvZ2dlci5pbmZvKCdVc2VyIGF1dGhlbnRpY2F0aW9uIHN0YXRlIGNoZWNrZWQnLCB7XHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICBlbWFpbCxcclxuICAgICAgICBpc0VtYWlsVmVyaWZpZWQsXHJcbiAgICAgICAgaXNPVFBFbmFibGVkXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgaWYgKCFpc0VtYWlsVmVyaWZpZWQpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgc3RhdGU6IEF1dGhlbnRpY2F0aW9uU3RhdGUuRU1BSUxfVkVSSUZJQ0FUSU9OX1JFUVVJUkVELFxyXG4gICAgICAgICAgcmVxdWlyZXNFbWFpbFZlcmlmaWNhdGlvbjogdHJ1ZSxcclxuICAgICAgICAgIHJlcXVpcmVzT1RQU2V0dXA6IGZhbHNlLFxyXG4gICAgICAgICAgbWVzc2FnZTogJ1BsZWFzZSB2ZXJpZnkgeW91ciBlbWFpbCBhZGRyZXNzIHRvIGNvbnRpbnVlLidcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoIWlzT1RQRW5hYmxlZCkge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBzdGF0ZTogQXV0aGVudGljYXRpb25TdGF0ZS5PVFBfU0VUVVBfUkVRVUlSRUQsXHJcbiAgICAgICAgICByZXF1aXJlc0VtYWlsVmVyaWZpY2F0aW9uOiBmYWxzZSxcclxuICAgICAgICAgIHJlcXVpcmVzT1RQU2V0dXA6IHRydWUsXHJcbiAgICAgICAgICBtZXNzYWdlOiAnUGxlYXNlIGNvbXBsZXRlIE9UUCBzZXR1cCBmb3IgZW5oYW5jZWQgc2VjdXJpdHkuJ1xyXG4gICAgICAgIH07XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFVzZXIgaXMgZnVsbHkgc2V0IHVwXHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdGU6IEF1dGhlbnRpY2F0aW9uU3RhdGUuQVVUSEVOVElDQVRFRCxcclxuICAgICAgICByZXF1aXJlc0VtYWlsVmVyaWZpY2F0aW9uOiBmYWxzZSxcclxuICAgICAgICByZXF1aXJlc09UUFNldHVwOiBmYWxzZSxcclxuICAgICAgICBtZXNzYWdlOiAnVXNlciBpcyByZWFkeSBmb3IgYXV0aGVudGljYXRpb24uJ1xyXG4gICAgICB9O1xyXG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICB0aGlzLm1vbml0b3JpbmdTZXJ2aWNlLm9uRXJyb3IoY29ycmVsYXRpb25JZCwgZW1haWwsIGVycm9yLm1lc3NhZ2UsICdmbG93X2luaXRpYXRpb24nKTtcclxuICAgICAgdGhpcy5lcnJvckhhbmRsZXIuaGFuZGxlRXJyb3IoZXJyb3IsIHtcclxuICAgICAgICBvcGVyYXRpb246ICdpbml0aWF0ZUF1dGhlbnRpY2F0aW9uRmxvdycsXHJcbiAgICAgICAgZW1haWwsXHJcbiAgICAgICAgc3RlcDogJ2Zsb3dfaW5pdGlhdGlvbidcclxuICAgICAgfSk7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQVVUSF9GTE9XX0VSUk9SOiAke2Vycm9yLm1lc3NhZ2V9YCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBIYW5kbGUgZW1haWwgdmVyaWZpY2F0aW9uIGNvbXBsZXRpb24gd2l0aCBhdXRvbWF0aWMgT1RQIHNldHVwXHJcbiAgICovXHJcbiAgYXN5bmMgaGFuZGxlRW1haWxWZXJpZmljYXRpb25Db21wbGV0ZShlbWFpbDogc3RyaW5nLCB2ZXJpZmljYXRpb25Db2RlOiBzdHJpbmcpOiBQcm9taXNlPE9UUFNldHVwUmVzdWx0PiB7XHJcbiAgICBjb25zdCBjb3JyZWxhdGlvbklkID0gdXVpZHY0KCk7XHJcbiAgICBcclxuICAgIHRoaXMubG9nZ2VyLmluZm8oJ0hhbmRsaW5nIGVtYWlsIHZlcmlmaWNhdGlvbiBjb21wbGV0aW9uJywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICBlbWFpbFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gTW9uaXRvciBlbWFpbCB2ZXJpZmljYXRpb24gc3RhcnRcclxuICAgIHRoaXMubW9uaXRvcmluZ1NlcnZpY2Uub25FbWFpbFZlcmlmaWNhdGlvblN0YXJ0ZWQoY29ycmVsYXRpb25JZCwgZW1haWwpO1xyXG4gICAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICAvLyBWZXJpZnkgZW1haWwgdXNpbmcgRW1haWxWZXJpZmljYXRpb25TZXJ2aWNlXHJcbiAgICAgIGNvbnN0IHZlcmlmaWNhdGlvblJlc3VsdCA9IGF3YWl0IHRoaXMuZW1haWxWZXJpZmljYXRpb25TZXJ2aWNlLnZlcmlmeUVtYWlsKGVtYWlsLCB2ZXJpZmljYXRpb25Db2RlKTtcclxuXHJcbiAgICAgIGlmICghdmVyaWZpY2F0aW9uUmVzdWx0LnN1Y2Nlc3MpIHtcclxuICAgICAgICBjb25zdCBlcnJvciA9IG5ldyBFcnJvcihgRU1BSUxfVkVSSUZJQ0FUSU9OX0ZBSUxFRDogJHt2ZXJpZmljYXRpb25SZXN1bHQubWVzc2FnZX1gKTtcclxuICAgICAgICBjb25zdCBkdXJhdGlvbk1zID0gRGF0ZS5ub3coKSAtIHN0YXJ0VGltZTtcclxuICAgICAgICB0aGlzLm1vbml0b3JpbmdTZXJ2aWNlLm9uRW1haWxWZXJpZmljYXRpb25GYWlsZWQoY29ycmVsYXRpb25JZCwgZW1haWwsIHZlcmlmaWNhdGlvblJlc3VsdC5tZXNzYWdlLCBkdXJhdGlvbk1zKTtcclxuICAgICAgICB0aGlzLmVycm9ySGFuZGxlci5oYW5kbGVFcnJvcihlcnJvciwge1xyXG4gICAgICAgICAgb3BlcmF0aW9uOiAnaGFuZGxlRW1haWxWZXJpZmljYXRpb25Db21wbGV0ZScsXHJcbiAgICAgICAgICBlbWFpbCxcclxuICAgICAgICAgIHN0ZXA6ICdlbWFpbF92ZXJpZmljYXRpb24nXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHRoaXMuZXJyb3JIYW5kbGVyLmxvZ0F1dGhFdmVudCgnZW1haWxfdmVyaWZpZWQnLCB7XHJcbiAgICAgICAgb3BlcmF0aW9uOiAnaGFuZGxlRW1haWxWZXJpZmljYXRpb25Db21wbGV0ZScsXHJcbiAgICAgICAgZW1haWwsXHJcbiAgICAgICAgc3RlcDogJ2VtYWlsX3ZlcmlmaWNhdGlvbidcclxuICAgICAgfSwgdHJ1ZSwgeyBjb3JyZWxhdGlvbklkIH0pO1xyXG5cclxuICAgICAgLy8gTW9uaXRvciBlbWFpbCB2ZXJpZmljYXRpb24gY29tcGxldGlvblxyXG4gICAgICBjb25zdCBkdXJhdGlvbk1zID0gRGF0ZS5ub3coKSAtIHN0YXJ0VGltZTtcclxuICAgICAgdGhpcy5tb25pdG9yaW5nU2VydmljZS5vbkVtYWlsVmVyaWZpY2F0aW9uQ29tcGxldGVkKGNvcnJlbGF0aW9uSWQsIGVtYWlsLCBkdXJhdGlvbk1zKTtcclxuXHJcbiAgICAgIC8vIEVtYWlsIHZlcmlmaWNhdGlvbiBhdXRvbWF0aWNhbGx5IHNldHMgdXAgT1RQLCBzbyByZXR1cm4gdGhlIHNldHVwIGRhdGFcclxuICAgICAgaWYgKHZlcmlmaWNhdGlvblJlc3VsdC5vdHBTZWNyZXQgJiYgdmVyaWZpY2F0aW9uUmVzdWx0LmJhY2t1cENvZGVzKSB7XHJcbiAgICAgICAgdGhpcy5sb2dnZXIuaW5mbygnT1RQIHNldHVwIGRhdGEgZ2VuZXJhdGVkJywge1xyXG4gICAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICAgIGVtYWlsLFxyXG4gICAgICAgICAgaGFzU2VjcmV0OiAhIXZlcmlmaWNhdGlvblJlc3VsdC5vdHBTZWNyZXQsXHJcbiAgICAgICAgICBiYWNrdXBDb2Rlc0NvdW50OiB2ZXJpZmljYXRpb25SZXN1bHQuYmFja3VwQ29kZXMubGVuZ3RoXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIEdlbmVyYXRlIHRlbXBvcmFyeSB0b2tlbnMgdG8gYWxsb3cgZmlsZSBvcGVyYXRpb25zIGJlZm9yZSBPVFAgc2V0dXAgY29tcGxldGlvblxyXG4gICAgICAgIGxldCB0ZW1wb3JhcnlUb2tlbnM6IFRlbXBvcmFyeVRva2VuUGFpciB8IHVuZGVmaW5lZDtcclxuICAgICAgICBcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgLy8gR2V0IHVzZXIgaW5mb3JtYXRpb24gdG8gY3JlYXRlIHRva2VuIHBheWxvYWRcclxuICAgICAgICAgIGNvbnN0IHVzZXJJbmZvID0gYXdhaXQgdGhpcy51c2VyU2VydmljZS5nZXRVc2VyQnlFbWFpbChlbWFpbCk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIGlmICh1c2VySW5mbykge1xyXG4gICAgICAgICAgICB0ZW1wb3JhcnlUb2tlbnMgPSBhd2FpdCB0aGlzLmp3dFNlcnZpY2UuZ2VuZXJhdGVUZW1wb3JhcnlUb2tlblBhaXIoe1xyXG4gICAgICAgICAgICAgIHVzZXJJZDogdXNlckluZm8udXNlcklkLFxyXG4gICAgICAgICAgICAgIGVtYWlsOiB1c2VySW5mby5lbWFpbCxcclxuICAgICAgICAgICAgICBvcmdhbml6YXRpb25JZDogdXNlckluZm8ub3JnYW5pemF0aW9uSWQsXHJcbiAgICAgICAgICAgICAgcm9sZTogdXNlckluZm8ucm9sZSB8fCAnZGV2ZWxvcGVyJyAvLyBEZWZhdWx0IHJvbGUgaWYgbm90IHNwZWNpZmllZFxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMubG9nZ2VyLmluZm8oJ1RlbXBvcmFyeSB0b2tlbnMgZ2VuZXJhdGVkIGZvciBlbWFpbCB2ZXJpZmllZCB1c2VyJywge1xyXG4gICAgICAgICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgICAgICAgZW1haWwsXHJcbiAgICAgICAgICAgICAgdXNlcklkOiB1c2VySW5mby51c2VySWQsXHJcbiAgICAgICAgICAgICAgc2NvcGU6IHRlbXBvcmFyeVRva2Vucy5zY29wZSxcclxuICAgICAgICAgICAgICBleHBpcmVzSW46IHRlbXBvcmFyeVRva2Vucy5leHBpcmVzSW5cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSBjYXRjaCAodG9rZW5FcnJvcjogYW55KSB7XHJcbiAgICAgICAgICAvLyBMb2cgdGhlIGVycm9yIGJ1dCBkb24ndCBmYWlsIHRoZSBlbnRpcmUgZmxvd1xyXG4gICAgICAgICAgdGhpcy5sb2dnZXIud2FybignRmFpbGVkIHRvIGdlbmVyYXRlIHRlbXBvcmFyeSB0b2tlbnMsIGNvbnRpbnVpbmcgd2l0aG91dCB0aGVtJywge1xyXG4gICAgICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgICAgICBlbWFpbCxcclxuICAgICAgICAgICAgZXJyb3I6IHRva2VuRXJyb3IubWVzc2FnZVxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgb3RwU2V0dXA6IHtcclxuICAgICAgICAgICAgc2VjcmV0OiB2ZXJpZmljYXRpb25SZXN1bHQub3RwU2VjcmV0LFxyXG4gICAgICAgICAgICBxckNvZGVVcmw6IHRoaXMuZ2VuZXJhdGVRUkNvZGVVcmwoZW1haWwsIHZlcmlmaWNhdGlvblJlc3VsdC5vdHBTZWNyZXQpLFxyXG4gICAgICAgICAgICBiYWNrdXBDb2RlczogdmVyaWZpY2F0aW9uUmVzdWx0LmJhY2t1cENvZGVzLFxyXG4gICAgICAgICAgICBpc3N1ZXI6ICdNSVNSQSBQbGF0Zm9ybScsXHJcbiAgICAgICAgICAgIGFjY291bnROYW1lOiBlbWFpbFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHRlbXBvcmFyeVRva2VucyxcclxuICAgICAgICAgIG5leHRTdGVwOiBBdXRoZW50aWNhdGlvblN0YXRlLk9UUF9TRVRVUF9SRVFVSVJFRCxcclxuICAgICAgICAgIG1lc3NhZ2U6ICdFbWFpbCB2ZXJpZmllZCBzdWNjZXNzZnVsbHkuIFBsZWFzZSBjb21wbGV0ZSBPVFAgc2V0dXAuJ1xyXG4gICAgICAgIH07XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnN0IGVycm9yID0gbmV3IEVycm9yKCdPVFBfU0VUVVBfRkFJTEVEOiBGYWlsZWQgdG8gZ2VuZXJhdGUgT1RQIHNldHVwIGRhdGEnKTtcclxuICAgICAgdGhpcy5lcnJvckhhbmRsZXIuaGFuZGxlRXJyb3IoZXJyb3IsIHtcclxuICAgICAgICBvcGVyYXRpb246ICdoYW5kbGVFbWFpbFZlcmlmaWNhdGlvbkNvbXBsZXRlJyxcclxuICAgICAgICBlbWFpbCxcclxuICAgICAgICBzdGVwOiAnb3RwX2dlbmVyYXRpb24nXHJcbiAgICAgIH0pO1xyXG4gICAgICB0aHJvdyBlcnJvcjtcclxuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgdGhpcy5tb25pdG9yaW5nU2VydmljZS5vbkVycm9yKGNvcnJlbGF0aW9uSWQsIGVtYWlsLCBlcnJvci5tZXNzYWdlLCAnZW1haWxfdmVyaWZpY2F0aW9uX2NvbXBsZXRlJyk7XHJcbiAgICAgIHRoaXMuZXJyb3JIYW5kbGVyLmhhbmRsZUVycm9yKGVycm9yLCB7XHJcbiAgICAgICAgb3BlcmF0aW9uOiAnaGFuZGxlRW1haWxWZXJpZmljYXRpb25Db21wbGV0ZScsXHJcbiAgICAgICAgZW1haWwsXHJcbiAgICAgICAgc3RlcDogJ2VtYWlsX3ZlcmlmaWNhdGlvbl9jb21wbGV0ZSdcclxuICAgICAgfSk7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgRU1BSUxfVkVSSUZJQ0FUSU9OX0VSUk9SOiAke2Vycm9yLm1lc3NhZ2V9YCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDb21wbGV0ZSBPVFAgc2V0dXAgYW5kIGVzdGFibGlzaCB1c2VyIHNlc3Npb25cclxuICAgKi9cclxuICBhc3luYyBjb21wbGV0ZU9UUFNldHVwKGVtYWlsOiBzdHJpbmcsIG90cENvZGU6IHN0cmluZyk6IFByb21pc2U8QXV0aFJlc3VsdD4ge1xyXG4gICAgY29uc3QgY29ycmVsYXRpb25JZCA9IHV1aWR2NCgpO1xyXG4gICAgXHJcbiAgICB0aGlzLmxvZ2dlci5pbmZvKCdDb21wbGV0aW5nIE9UUCBzZXR1cCcsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZW1haWxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIE1vbml0b3IgT1RQIHNldHVwIHN0YXJ0XHJcbiAgICB0aGlzLm1vbml0b3JpbmdTZXJ2aWNlLm9uT1RQU2V0dXBTdGFydGVkKGNvcnJlbGF0aW9uSWQsIGVtYWlsKTtcclxuICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gVmVyaWZ5IE9UUCBjb2RlXHJcbiAgICAgIGNvbnN0IG90cFJlc3VsdCA9IGF3YWl0IHRoaXMuZW1haWxWZXJpZmljYXRpb25TZXJ2aWNlLnZlcmlmeU9UUChlbWFpbCwgb3RwQ29kZSk7XHJcblxyXG4gICAgICBpZiAoIW90cFJlc3VsdC5zdWNjZXNzKSB7XHJcbiAgICAgICAgY29uc3QgZXJyb3IgPSBuZXcgRXJyb3IoYE9UUF9WRVJJRklDQVRJT05fRkFJTEVEOiAke290cFJlc3VsdC5tZXNzYWdlfWApO1xyXG4gICAgICAgIGNvbnN0IGR1cmF0aW9uTXMgPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lO1xyXG4gICAgICAgIHRoaXMubW9uaXRvcmluZ1NlcnZpY2Uub25PVFBTZXR1cEZhaWxlZChjb3JyZWxhdGlvbklkLCBlbWFpbCwgb3RwUmVzdWx0Lm1lc3NhZ2UsIGR1cmF0aW9uTXMpO1xyXG4gICAgICAgIHRoaXMuZXJyb3JIYW5kbGVyLmhhbmRsZUVycm9yKGVycm9yLCB7XHJcbiAgICAgICAgICBvcGVyYXRpb246ICdjb21wbGV0ZU9UUFNldHVwJyxcclxuICAgICAgICAgIGVtYWlsLFxyXG4gICAgICAgICAgc3RlcDogJ290cF92ZXJpZmljYXRpb24nXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHRoaXMuZXJyb3JIYW5kbGVyLmxvZ0F1dGhFdmVudCgnb3RwX3ZlcmlmaWVkJywge1xyXG4gICAgICAgIG9wZXJhdGlvbjogJ2NvbXBsZXRlT1RQU2V0dXAnLFxyXG4gICAgICAgIGVtYWlsLFxyXG4gICAgICAgIHN0ZXA6ICdvdHBfdmVyaWZpY2F0aW9uJ1xyXG4gICAgICB9LCB0cnVlLCB7IGNvcnJlbGF0aW9uSWQgfSk7XHJcblxyXG4gICAgICAvLyBNb25pdG9yIE9UUCBzZXR1cCBjb21wbGV0aW9uXHJcbiAgICAgIGNvbnN0IGR1cmF0aW9uTXMgPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lO1xyXG4gICAgICB0aGlzLm1vbml0b3JpbmdTZXJ2aWNlLm9uT1RQU2V0dXBDb21wbGV0ZWQoY29ycmVsYXRpb25JZCwgZW1haWwsIGR1cmF0aW9uTXMpO1xyXG5cclxuICAgICAgLy8gR2V0IHVzZXIgaW5mb3JtYXRpb25cclxuICAgICAgY29uc3QgY29nbml0b1VzZXIgPSBhd2FpdCB0aGlzLmNvZ25pdG9DbGllbnQuc2VuZChuZXcgQWRtaW5HZXRVc2VyQ29tbWFuZCh7XHJcbiAgICAgICAgVXNlclBvb2xJZDogcHJvY2Vzcy5lbnYuQ09HTklUT19VU0VSX1BPT0xfSUQhLFxyXG4gICAgICAgIFVzZXJuYW1lOiBlbWFpbFxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICBjb25zdCBzdWJBdHRyaWJ1dGUgPSBjb2duaXRvVXNlci5Vc2VyQXR0cmlidXRlcz8uZmluZChhdHRyID0+IGF0dHIuTmFtZSA9PT0gJ3N1YicpO1xyXG4gICAgICBjb25zdCBjb2duaXRvU3ViID0gc3ViQXR0cmlidXRlPy5WYWx1ZSB8fCB1dWlkdjQoKTtcclxuXHJcbiAgICAgIC8vIEdldCBvciBjcmVhdGUgdXNlciBpbiBvdXIgc3lzdGVtXHJcbiAgICAgIGNvbnN0IHVzZXIgPSBhd2FpdCB0aGlzLmdldE9yQ3JlYXRlVXNlcihlbWFpbCwgY29nbml0b1N1Yik7XHJcblxyXG4gICAgICB0aGlzLmxvZ2dlci5pbmZvKCdVc2VyIHJldHJpZXZlZCBmb3Igc2Vzc2lvbiBjcmVhdGlvbicsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIHVzZXJJZDogdXNlci51c2VySWQsXHJcbiAgICAgICAgZW1haWw6IHVzZXIuZW1haWxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBHZW5lcmF0ZSBKV1QgdG9rZW5zXHJcbiAgICAgIGNvbnN0IHRva2VuUGFpciA9IGF3YWl0IHRoaXMuand0U2VydmljZS5nZW5lcmF0ZVRva2VuUGFpcih7XHJcbiAgICAgICAgdXNlcklkOiB1c2VyLnVzZXJJZCxcclxuICAgICAgICBlbWFpbDogdXNlci5lbWFpbCxcclxuICAgICAgICBvcmdhbml6YXRpb25JZDogdXNlci5vcmdhbml6YXRpb25JZCxcclxuICAgICAgICByb2xlOiB1c2VyLnJvbGVcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBNb25pdG9yIHNlc3Npb24gY3JlYXRpb25cclxuICAgICAgdGhpcy5tb25pdG9yaW5nU2VydmljZS5vblNlc3Npb25DcmVhdGVkKGNvcnJlbGF0aW9uSWQsIGVtYWlsLCB1c2VyLnVzZXJJZCwgZHVyYXRpb25Ncyk7XHJcblxyXG4gICAgICB0aGlzLmVycm9ySGFuZGxlci5sb2dBdXRoRXZlbnQoJ3Nlc3Npb25fY3JlYXRlZCcsIHtcclxuICAgICAgICBvcGVyYXRpb246ICdjb21wbGV0ZU9UUFNldHVwJyxcclxuICAgICAgICBlbWFpbCxcclxuICAgICAgICB1c2VySWQ6IHVzZXIudXNlcklkLFxyXG4gICAgICAgIHN0ZXA6ICdzZXNzaW9uX2NyZWF0aW9uJ1xyXG4gICAgICB9LCB0cnVlLCB7IGNvcnJlbGF0aW9uSWQgfSk7XHJcblxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIGFjY2Vzc1Rva2VuOiB0b2tlblBhaXIuYWNjZXNzVG9rZW4sXHJcbiAgICAgICAgcmVmcmVzaFRva2VuOiB0b2tlblBhaXIucmVmcmVzaFRva2VuLFxyXG4gICAgICAgIHVzZXI6IHtcclxuICAgICAgICAgIHVzZXJJZDogdXNlci51c2VySWQsXHJcbiAgICAgICAgICBlbWFpbDogdXNlci5lbWFpbCxcclxuICAgICAgICAgIG5hbWU6IHVzZXIuZW1haWwuc3BsaXQoJ0AnKVswXSxcclxuICAgICAgICAgIG9yZ2FuaXphdGlvbklkOiB1c2VyLm9yZ2FuaXphdGlvbklkLFxyXG4gICAgICAgICAgcm9sZTogdXNlci5yb2xlXHJcbiAgICAgICAgfSxcclxuICAgICAgICBleHBpcmVzSW46IHRva2VuUGFpci5leHBpcmVzSW4sXHJcbiAgICAgICAgaXNOZXdVc2VyOiBmYWxzZSxcclxuICAgICAgICBtZXNzYWdlOiAnT1RQIHNldHVwIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHkuIFlvdSBhcmUgbm93IGxvZ2dlZCBpbi4nXHJcbiAgICAgIH07XHJcbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgIHRoaXMubW9uaXRvcmluZ1NlcnZpY2Uub25FcnJvcihjb3JyZWxhdGlvbklkLCBlbWFpbCwgZXJyb3IubWVzc2FnZSwgJ290cF9zZXR1cF9jb21wbGV0ZScpO1xyXG4gICAgICB0aGlzLmVycm9ySGFuZGxlci5oYW5kbGVFcnJvcihlcnJvciwge1xyXG4gICAgICAgIG9wZXJhdGlvbjogJ2NvbXBsZXRlT1RQU2V0dXAnLFxyXG4gICAgICAgIGVtYWlsLFxyXG4gICAgICAgIHN0ZXA6ICdvdHBfc2V0dXBfY29tcGxldGUnXHJcbiAgICAgIH0pO1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE9UUF9TRVRVUF9FUlJPUjogJHtlcnJvci5tZXNzYWdlfWApO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IGF1dGhlbnRpY2F0aW9uIHN0YXRlIGZvciBhIHVzZXJcclxuICAgKi9cclxuICBhc3luYyBnZXRBdXRoZW50aWNhdGlvblN0YXRlKGVtYWlsOiBzdHJpbmcpOiBQcm9taXNlPEF1dGhlbnRpY2F0aW9uU3RhdGU+IHtcclxuICAgIGNvbnN0IGNvcnJlbGF0aW9uSWQgPSB1dWlkdjQoKTtcclxuICAgIFxyXG4gICAgdGhpcy5sb2dnZXIuaW5mbygnR2V0dGluZyBhdXRoZW50aWNhdGlvbiBzdGF0ZScsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZW1haWxcclxuICAgIH0pO1xyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHVzZXJFeGlzdHMgPSBhd2FpdCB0aGlzLmNoZWNrVXNlckV4aXN0cyhlbWFpbCk7XHJcbiAgICAgIFxyXG4gICAgICBpZiAoIXVzZXJFeGlzdHMpIHtcclxuICAgICAgICByZXR1cm4gQXV0aGVudGljYXRpb25TdGF0ZS5JTklUSUFMO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zdCBpc0VtYWlsVmVyaWZpZWQgPSBhd2FpdCB0aGlzLmVtYWlsVmVyaWZpY2F0aW9uU2VydmljZS5pc0VtYWlsVmVyaWZpZWQoZW1haWwpO1xyXG4gICAgICBjb25zdCBpc09UUEVuYWJsZWQgPSBhd2FpdCB0aGlzLmVtYWlsVmVyaWZpY2F0aW9uU2VydmljZS5pc09UUEVuYWJsZWQoZW1haWwpO1xyXG5cclxuICAgICAgaWYgKCFpc0VtYWlsVmVyaWZpZWQpIHtcclxuICAgICAgICByZXR1cm4gQXV0aGVudGljYXRpb25TdGF0ZS5FTUFJTF9WRVJJRklDQVRJT05fUkVRVUlSRUQ7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmICghaXNPVFBFbmFibGVkKSB7XHJcbiAgICAgICAgcmV0dXJuIEF1dGhlbnRpY2F0aW9uU3RhdGUuT1RQX1NFVFVQX1JFUVVJUkVEO1xyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm4gQXV0aGVudGljYXRpb25TdGF0ZS5BVVRIRU5USUNBVEVEO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgdGhpcy5tb25pdG9yaW5nU2VydmljZS5vbkVycm9yKGNvcnJlbGF0aW9uSWQsIGVtYWlsLCAoZXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2UsICdzdGF0ZV9jaGVjaycpO1xyXG4gICAgICByZXR1cm4gQXV0aGVudGljYXRpb25TdGF0ZS5FUlJPUjtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFZhbGlkYXRlIGF1dGhlbnRpY2F0aW9uIHN0ZXBcclxuICAgKi9cclxuICBhc3luYyB2YWxpZGF0ZUF1dGhlbnRpY2F0aW9uU3RlcChlbWFpbDogc3RyaW5nLCBzdGVwOiBBdXRoZW50aWNhdGlvblN0YXRlKTogUHJvbWlzZTxib29sZWFuPiB7XHJcbiAgICBjb25zdCBjb3JyZWxhdGlvbklkID0gdXVpZHY0KCk7XHJcbiAgICBcclxuICAgIHRoaXMubG9nZ2VyLmluZm8oJ1ZhbGlkYXRpbmcgYXV0aGVudGljYXRpb24gc3RlcCcsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZW1haWwsXHJcbiAgICAgIHN0ZXBcclxuICAgIH0pO1xyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IGN1cnJlbnRTdGF0ZSA9IGF3YWl0IHRoaXMuZ2V0QXV0aGVudGljYXRpb25TdGF0ZShlbWFpbCk7XHJcbiAgICAgIFxyXG4gICAgICAvLyBEZWZpbmUgdmFsaWQgc3RhdGUgdHJhbnNpdGlvbnNcclxuICAgICAgY29uc3QgdmFsaWRUcmFuc2l0aW9uczogUmVjb3JkPEF1dGhlbnRpY2F0aW9uU3RhdGUsIEF1dGhlbnRpY2F0aW9uU3RhdGVbXT4gPSB7XHJcbiAgICAgICAgW0F1dGhlbnRpY2F0aW9uU3RhdGUuSU5JVElBTF06IFtBdXRoZW50aWNhdGlvblN0YXRlLlJFR0lTVEVSSU5HXSxcclxuICAgICAgICBbQXV0aGVudGljYXRpb25TdGF0ZS5SRUdJU1RFUklOR106IFtBdXRoZW50aWNhdGlvblN0YXRlLkVNQUlMX1ZFUklGSUNBVElPTl9SRVFVSVJFRF0sXHJcbiAgICAgICAgW0F1dGhlbnRpY2F0aW9uU3RhdGUuRU1BSUxfVkVSSUZJQ0FUSU9OX1JFUVVJUkVEXTogW0F1dGhlbnRpY2F0aW9uU3RhdGUuRU1BSUxfVkVSSUZZSU5HXSxcclxuICAgICAgICBbQXV0aGVudGljYXRpb25TdGF0ZS5FTUFJTF9WRVJJRllJTkddOiBbQXV0aGVudGljYXRpb25TdGF0ZS5PVFBfU0VUVVBfUkVRVUlSRURdLFxyXG4gICAgICAgIFtBdXRoZW50aWNhdGlvblN0YXRlLk9UUF9TRVRVUF9SRVFVSVJFRF06IFtBdXRoZW50aWNhdGlvblN0YXRlLk9UUF9WRVJJRllJTkddLFxyXG4gICAgICAgIFtBdXRoZW50aWNhdGlvblN0YXRlLk9UUF9WRVJJRllJTkddOiBbQXV0aGVudGljYXRpb25TdGF0ZS5BVVRIRU5USUNBVEVEXSxcclxuICAgICAgICBbQXV0aGVudGljYXRpb25TdGF0ZS5BVVRIRU5USUNBVEVEXTogW10sXHJcbiAgICAgICAgW0F1dGhlbnRpY2F0aW9uU3RhdGUuRVJST1JdOiBbQXV0aGVudGljYXRpb25TdGF0ZS5JTklUSUFMLCBBdXRoZW50aWNhdGlvblN0YXRlLkVNQUlMX1ZFUklGSUNBVElPTl9SRVFVSVJFRCwgQXV0aGVudGljYXRpb25TdGF0ZS5PVFBfU0VUVVBfUkVRVUlSRURdXHJcbiAgICAgIH07XHJcblxyXG4gICAgICByZXR1cm4gdmFsaWRUcmFuc2l0aW9uc1tjdXJyZW50U3RhdGVdPy5pbmNsdWRlcyhzdGVwKSB8fCBjdXJyZW50U3RhdGUgPT09IHN0ZXA7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICB0aGlzLm1vbml0b3JpbmdTZXJ2aWNlLm9uRXJyb3IoY29ycmVsYXRpb25JZCwgZW1haWwsIChlcnJvciBhcyBFcnJvcikubWVzc2FnZSwgJ3N0ZXBfdmFsaWRhdGlvbicpO1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFzeW5jIHBlcmZvcm1BdXRoZW50aWNhdGlvbihyZXF1ZXN0OiBBdXRoUmVxdWVzdCk6IFByb21pc2U8QXV0aFJlc3VsdD4ge1xyXG4gICAgaWYgKCF0aGlzLmlzVmFsaWRFbWFpbChyZXF1ZXN0LmVtYWlsKSkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0lOVkFMSURfRU1BSUw6IFZhbGlkIGVtYWlsIGFkZHJlc3MgaXMgcmVxdWlyZWQnKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBJZiBwYXNzd29yZCBpcyBwcm92aWRlZCwgdXNlIHN0YW5kYXJkIGxvZ2luIGZsb3dcclxuICAgIGlmIChyZXF1ZXN0LnBhc3N3b3JkKSB7XHJcbiAgICAgIHJldHVybiB0aGlzLnBlcmZvcm1Mb2dpbihyZXF1ZXN0LmVtYWlsLCByZXF1ZXN0LnBhc3N3b3JkKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBPdGhlcndpc2UsIHVzZSBxdWljayByZWdpc3RyYXRpb24gZmxvd1xyXG4gICAgcmV0dXJuIHRoaXMucGVyZm9ybVF1aWNrUmVnaXN0cmF0aW9uKHJlcXVlc3QuZW1haWwsIHJlcXVlc3QubmFtZSk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFzeW5jIHBlcmZvcm1RdWlja1JlZ2lzdHJhdGlvbihlbWFpbDogc3RyaW5nLCBuYW1lPzogc3RyaW5nKTogUHJvbWlzZTxBdXRoUmVzdWx0PiB7XHJcbiAgICBjb25zdCB1c2VyTmFtZSA9IG5hbWUgfHwgZW1haWwuc3BsaXQoJ0AnKVswXTtcclxuICAgIGxldCBjb2duaXRvU3ViOiBzdHJpbmc7XHJcbiAgICBsZXQgaXNOZXdVc2VyID0gZmFsc2U7XHJcblxyXG4gICAgLy8gQ2hlY2sgaWYgdXNlciBhbHJlYWR5IGV4aXN0cyBpbiBDb2duaXRvXHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBleGlzdGluZ1VzZXIgPSBhd2FpdCB0aGlzLmNvZ25pdG9DbGllbnQuc2VuZChuZXcgQWRtaW5HZXRVc2VyQ29tbWFuZCh7XHJcbiAgICAgICAgVXNlclBvb2xJZDogcHJvY2Vzcy5lbnYuQ09HTklUT19VU0VSX1BPT0xfSUQhLFxyXG4gICAgICAgIFVzZXJuYW1lOiBlbWFpbFxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICAvLyBDaGVjayBpZiB1c2VyIGlzIGNvbmZpcm1lZCAoZW1haWwgdmVyaWZpZWQpXHJcbiAgICAgIGlmIChleGlzdGluZ1VzZXIuVXNlclN0YXR1cyAhPT0gJ0NPTkZJUk1FRCcpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VTRVJfTk9UX0NPTkZJUk1FRDogUGxlYXNlIHZlcmlmeSB5b3VyIGVtYWlsIGFkZHJlc3MgYmVmb3JlIGxvZ2dpbmcgaW4uIENoZWNrIHlvdXIgZW1haWwgZm9yIHRoZSB2ZXJpZmljYXRpb24gY29kZS4nKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgY29nbml0b1N1YiA9IGV4aXN0aW5nVXNlci5Vc2VybmFtZSE7XHJcbiAgICAgIGlzTmV3VXNlciA9IGZhbHNlO1xyXG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICBpZiAoZXJyb3IubmFtZSA9PT0gJ1VzZXJOb3RGb3VuZEV4Y2VwdGlvbicpIHtcclxuICAgICAgICAvLyBDcmVhdGUgbmV3IHVzZXIgLSB0aGlzIHdpbGwgcmVxdWlyZSBlbWFpbCB2ZXJpZmljYXRpb25cclxuICAgICAgICBpc05ld1VzZXIgPSB0cnVlO1xyXG4gICAgICAgIGNvZ25pdG9TdWIgPSBhd2FpdCB0aGlzLmNyZWF0ZUNvZ25pdG9Vc2VyKGVtYWlsLCB1c2VyTmFtZSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gVGhyb3cgZXJyb3IgdG8gaW5kaWNhdGUgdmVyaWZpY2F0aW9uIGlzIHJlcXVpcmVkXHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdFTUFJTF9WRVJJRklDQVRJT05fUkVRVUlSRUQ6IEFjY291bnQgY3JlYXRlZCBzdWNjZXNzZnVsbHkuIFBsZWFzZSBjaGVjayB5b3VyIGVtYWlsIGZvciB0aGUgdmVyaWZpY2F0aW9uIGNvZGUgdG8gY29tcGxldGUgcmVnaXN0cmF0aW9uLicpO1xyXG4gICAgICB9IGVsc2UgaWYgKGVycm9yLm1lc3NhZ2UuaW5jbHVkZXMoJ1VTRVJfTk9UX0NPTkZJUk1FRCcpKSB7XHJcbiAgICAgICAgLy8gUmUtdGhyb3cgY29uZmlybWF0aW9uIGVycm9yXHJcbiAgICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBDT0dOSVRPX0VSUk9SOiAke2Vycm9yLm1lc3NhZ2V9YCk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBHZXQgb3IgY3JlYXRlIHVzZXIgaW4gb3VyIER5bmFtb0RCXHJcbiAgICBjb25zdCB1c2VyID0gYXdhaXQgdGhpcy5nZXRPckNyZWF0ZVVzZXIoZW1haWwsIGNvZ25pdG9TdWIpO1xyXG5cclxuICAgIC8vIEdlbmVyYXRlIEpXVCB0b2tlbnMgd2l0aCAxLWhvdXIgZXhwaXJhdGlvblxyXG4gICAgY29uc3QgdG9rZW5QYWlyID0gYXdhaXQgdGhpcy5qd3RTZXJ2aWNlLmdlbmVyYXRlVG9rZW5QYWlyKHtcclxuICAgICAgdXNlcklkOiB1c2VyLnVzZXJJZCxcclxuICAgICAgZW1haWw6IHVzZXIuZW1haWwsXHJcbiAgICAgIG9yZ2FuaXphdGlvbklkOiB1c2VyLm9yZ2FuaXphdGlvbklkLFxyXG4gICAgICByb2xlOiB1c2VyLnJvbGVcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIGFjY2Vzc1Rva2VuOiB0b2tlblBhaXIuYWNjZXNzVG9rZW4sXHJcbiAgICAgIHJlZnJlc2hUb2tlbjogdG9rZW5QYWlyLnJlZnJlc2hUb2tlbixcclxuICAgICAgdXNlcjoge1xyXG4gICAgICAgIHVzZXJJZDogdXNlci51c2VySWQsXHJcbiAgICAgICAgZW1haWw6IHVzZXIuZW1haWwsXHJcbiAgICAgICAgbmFtZTogdXNlck5hbWUsXHJcbiAgICAgICAgb3JnYW5pemF0aW9uSWQ6IHVzZXIub3JnYW5pemF0aW9uSWQsXHJcbiAgICAgICAgcm9sZTogdXNlci5yb2xlXHJcbiAgICAgIH0sXHJcbiAgICAgIGV4cGlyZXNJbjogdG9rZW5QYWlyLmV4cGlyZXNJbixcclxuICAgICAgaXNOZXdVc2VyLFxyXG4gICAgICBtZXNzYWdlOiBpc05ld1VzZXIgXHJcbiAgICAgICAgPyAnQWNjb3VudCBjcmVhdGVkIHN1Y2Nlc3NmdWxseS4gU2Vzc2lvbiB2YWxpZCBmb3IgMSBob3VyLidcclxuICAgICAgICA6ICdXZWxjb21lIGJhY2shIFNlc3Npb24gdmFsaWQgZm9yIDEgaG91ci4nXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyBwZXJmb3JtTG9naW4oZW1haWw6IHN0cmluZywgcGFzc3dvcmQ6IHN0cmluZyk6IFByb21pc2U8QXV0aFJlc3VsdD4ge1xyXG4gICAgY29uc3QgY2xpZW50SWQgPSBwcm9jZXNzLmVudi5DT0dOSVRPX0NMSUVOVF9JRDtcclxuICAgIGlmICghY2xpZW50SWQpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDT05GSUdfRVJST1I6IENvZ25pdG8gY2xpZW50IG5vdCBjb25maWd1cmVkJyk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQXV0aGVudGljYXRlIGFnYWluc3QgQ29nbml0b1xyXG4gICAgbGV0IGNvZ25pdG9TdWI6IHN0cmluZztcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IGF1dGhSZXN1bHQgPSBhd2FpdCB0aGlzLmNvZ25pdG9DbGllbnQuc2VuZChuZXcgSW5pdGlhdGVBdXRoQ29tbWFuZCh7XHJcbiAgICAgICAgQXV0aEZsb3c6ICdVU0VSX1BBU1NXT1JEX0FVVEgnLFxyXG4gICAgICAgIENsaWVudElkOiBjbGllbnRJZCxcclxuICAgICAgICBBdXRoUGFyYW1ldGVyczoge1xyXG4gICAgICAgICAgVVNFUk5BTUU6IGVtYWlsLFxyXG4gICAgICAgICAgUEFTU1dPUkQ6IHBhc3N3b3JkLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0pKTtcclxuXHJcbiAgICAgIGlmICghYXV0aFJlc3VsdC5BdXRoZW50aWNhdGlvblJlc3VsdD8uSWRUb2tlbikge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignSU5WQUxJRF9DUkVERU5USUFMUzogSW52YWxpZCBlbWFpbCBvciBwYXNzd29yZCcpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBEZWNvZGUgQ29nbml0byBJRCB0b2tlbiB0byBnZXQgc3ViXHJcbiAgICAgIGNvbnN0IHBhcnRzID0gYXV0aFJlc3VsdC5BdXRoZW50aWNhdGlvblJlc3VsdC5JZFRva2VuLnNwbGl0KCcuJyk7XHJcbiAgICAgIGNvbnN0IHBheWxvYWQgPSBKU09OLnBhcnNlKEJ1ZmZlci5mcm9tKHBhcnRzWzFdLCAnYmFzZTY0dXJsJykudG9TdHJpbmcoJ3V0ZjgnKSk7XHJcbiAgICAgIGNvZ25pdG9TdWIgPSBwYXlsb2FkLnN1YjtcclxuICAgIH0gY2F0Y2ggKGNvZ25pdG9FcnJvcjogYW55KSB7XHJcbiAgICAgIGlmIChcclxuICAgICAgICBjb2duaXRvRXJyb3IubmFtZSA9PT0gJ05vdEF1dGhvcml6ZWRFeGNlcHRpb24nIHx8XHJcbiAgICAgICAgY29nbml0b0Vycm9yLm5hbWUgPT09ICdVc2VyTm90Rm91bmRFeGNlcHRpb24nXHJcbiAgICAgICkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignSU5WQUxJRF9DUkVERU5USUFMUzogSW52YWxpZCBlbWFpbCBvciBwYXNzd29yZCcpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChjb2duaXRvRXJyb3IubmFtZSA9PT0gJ1VzZXJOb3RDb25maXJtZWRFeGNlcHRpb24nKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVU0VSX05PVF9DT05GSVJNRUQ6IFVzZXIgaXMgbm90IGNvbmZpcm1lZC4gUGxlYXNlIHZlcmlmeSB5b3VyIGVtYWlsLicpO1xyXG4gICAgICB9XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQVVUSF9FUlJPUjogJHtjb2duaXRvRXJyb3IubWVzc2FnZX1gKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBHZXQgb3IgY3JlYXRlIHVzZXIgaW4gb3VyIER5bmFtb0RCXHJcbiAgICBjb25zdCB1c2VyID0gYXdhaXQgdGhpcy5nZXRPckNyZWF0ZVVzZXIoZW1haWwsIGNvZ25pdG9TdWIpO1xyXG5cclxuICAgIC8vIEdlbmVyYXRlIEpXVCB0b2tlbnMgd2l0aCAxLWhvdXIgZXhwaXJhdGlvblxyXG4gICAgY29uc3QgdG9rZW5QYWlyID0gYXdhaXQgdGhpcy5qd3RTZXJ2aWNlLmdlbmVyYXRlVG9rZW5QYWlyKHtcclxuICAgICAgdXNlcklkOiB1c2VyLnVzZXJJZCxcclxuICAgICAgZW1haWw6IHVzZXIuZW1haWwsXHJcbiAgICAgIG9yZ2FuaXphdGlvbklkOiB1c2VyLm9yZ2FuaXphdGlvbklkLFxyXG4gICAgICByb2xlOiB1c2VyLnJvbGVcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIGFjY2Vzc1Rva2VuOiB0b2tlblBhaXIuYWNjZXNzVG9rZW4sXHJcbiAgICAgIHJlZnJlc2hUb2tlbjogdG9rZW5QYWlyLnJlZnJlc2hUb2tlbixcclxuICAgICAgdXNlcjoge1xyXG4gICAgICAgIHVzZXJJZDogdXNlci51c2VySWQsXHJcbiAgICAgICAgZW1haWw6IHVzZXIuZW1haWwsXHJcbiAgICAgICAgbmFtZTogdXNlci5lbWFpbC5zcGxpdCgnQCcpWzBdLCAvLyBEZWZhdWx0IG5hbWUgZnJvbSBlbWFpbFxyXG4gICAgICAgIG9yZ2FuaXphdGlvbklkOiB1c2VyLm9yZ2FuaXphdGlvbklkLFxyXG4gICAgICAgIHJvbGU6IHVzZXIucm9sZVxyXG4gICAgICB9LFxyXG4gICAgICBleHBpcmVzSW46IHRva2VuUGFpci5leHBpcmVzSW4sXHJcbiAgICAgIGlzTmV3VXNlcjogZmFsc2UsXHJcbiAgICAgIG1lc3NhZ2U6ICdMb2dpbiBzdWNjZXNzZnVsLiBTZXNzaW9uIHZhbGlkIGZvciAxIGhvdXIuJ1xyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgYXN5bmMgY3JlYXRlQ29nbml0b1VzZXIoZW1haWw6IHN0cmluZywgdXNlck5hbWU6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XHJcbiAgICBjb25zdCB0ZW1wUGFzc3dvcmQgPSB0aGlzLmdlbmVyYXRlVGVtcFBhc3N3b3JkKCk7XHJcbiAgICBjb25zdCBwZXJtYW5lbnRQYXNzd29yZCA9IHRoaXMuZ2VuZXJhdGVTZWN1cmVQYXNzd29yZCgpO1xyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIC8vIENyZWF0ZSB1c2VyIGluIENvZ25pdG9cclxuICAgICAgYXdhaXQgdGhpcy5jb2duaXRvQ2xpZW50LnNlbmQobmV3IEFkbWluQ3JlYXRlVXNlckNvbW1hbmQoe1xyXG4gICAgICAgIFVzZXJQb29sSWQ6IHByb2Nlc3MuZW52LkNPR05JVE9fVVNFUl9QT09MX0lEISxcclxuICAgICAgICBVc2VybmFtZTogZW1haWwsXHJcbiAgICAgICAgVGVtcG9yYXJ5UGFzc3dvcmQ6IHRlbXBQYXNzd29yZCxcclxuICAgICAgICBNZXNzYWdlQWN0aW9uOiAnU1VQUFJFU1MnLCAvLyBEb24ndCBzZW5kIHdlbGNvbWUgZW1haWxcclxuICAgICAgICBVc2VyQXR0cmlidXRlczogW1xyXG4gICAgICAgICAgeyBOYW1lOiAnZW1haWwnLCBWYWx1ZTogZW1haWwgfSxcclxuICAgICAgICAgIHsgTmFtZTogJ2VtYWlsX3ZlcmlmaWVkJywgVmFsdWU6ICd0cnVlJyB9LFxyXG4gICAgICAgICAgeyBOYW1lOiAnbmFtZScsIFZhbHVlOiB1c2VyTmFtZSB9XHJcbiAgICAgICAgXVxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICAvLyBTZXQgcGVybWFuZW50IHBhc3N3b3JkIGZvciBzZWFtbGVzcyBleHBlcmllbmNlXHJcbiAgICAgIGF3YWl0IHRoaXMuY29nbml0b0NsaWVudC5zZW5kKG5ldyBBZG1pblNldFVzZXJQYXNzd29yZENvbW1hbmQoe1xyXG4gICAgICAgIFVzZXJQb29sSWQ6IHByb2Nlc3MuZW52LkNPR05JVE9fVVNFUl9QT09MX0lEISxcclxuICAgICAgICBVc2VybmFtZTogZW1haWwsXHJcbiAgICAgICAgUGFzc3dvcmQ6IHBlcm1hbmVudFBhc3N3b3JkLFxyXG4gICAgICAgIFBlcm1hbmVudDogdHJ1ZVxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICAvLyBHZXQgdGhlIENvZ25pdG8gc3ViIGZyb20gdGhlIGNyZWF0ZWQgdXNlclxyXG4gICAgICBjb25zdCBuZXdVc2VyID0gYXdhaXQgdGhpcy5jb2duaXRvQ2xpZW50LnNlbmQobmV3IEFkbWluR2V0VXNlckNvbW1hbmQoe1xyXG4gICAgICAgIFVzZXJQb29sSWQ6IHByb2Nlc3MuZW52LkNPR05JVE9fVVNFUl9QT09MX0lEISxcclxuICAgICAgICBVc2VybmFtZTogZW1haWxcclxuICAgICAgfSkpO1xyXG4gICAgICBcclxuICAgICAgY29uc3Qgc3ViQXR0cmlidXRlID0gbmV3VXNlci5Vc2VyQXR0cmlidXRlcz8uZmluZChhdHRyID0+IGF0dHIuTmFtZSA9PT0gJ3N1YicpO1xyXG4gICAgICByZXR1cm4gc3ViQXR0cmlidXRlPy5WYWx1ZSB8fCB1dWlkdjQoKTtcclxuXHJcbiAgICB9IGNhdGNoIChjcmVhdGVFcnJvcjogYW55KSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVVNFUl9DUkVBVElPTl9GQUlMRUQ6ICR7Y3JlYXRlRXJyb3IubWVzc2FnZX1gKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHByaXZhdGUgYXN5bmMgZ2V0T3JDcmVhdGVVc2VyKGVtYWlsOiBzdHJpbmcsIGNvZ25pdG9TdWI6IHN0cmluZyk6IFByb21pc2U8YW55PiB7XHJcbiAgICAvLyBDaGVjayBpZiB1c2VyIGV4aXN0cyBpbiBvdXIgRHluYW1vREJcclxuICAgIGxldCB1c2VyID0gYXdhaXQgdGhpcy51c2VyU2VydmljZS5nZXRVc2VyQnlFbWFpbChlbWFpbCk7XHJcblxyXG4gICAgaWYgKCF1c2VyKSB7XHJcbiAgICAgIC8vIENyZWF0ZSB1c2VyIGluIG91ciBzeXN0ZW1cclxuICAgICAgdHJ5IHtcclxuICAgICAgICB1c2VyID0gYXdhaXQgdGhpcy51c2VyU2VydmljZS5jcmVhdGVVc2VyKHtcclxuICAgICAgICAgIGVtYWlsLFxyXG4gICAgICAgICAgb3JnYW5pemF0aW9uSWQ6IGNvZ25pdG9TdWIsIC8vIFVzZSBDb2duaXRvIHN1YiBhcyBvcmdhbml6YXRpb24gSURcclxuICAgICAgICAgIHJvbGU6ICdkZXZlbG9wZXInLFxyXG4gICAgICAgICAgcHJlZmVyZW5jZXM6IHtcclxuICAgICAgICAgICAgdGhlbWU6ICdsaWdodCcsXHJcbiAgICAgICAgICAgIG5vdGlmaWNhdGlvbnM6IHtcclxuICAgICAgICAgICAgICBlbWFpbDogdHJ1ZSxcclxuICAgICAgICAgICAgICB3ZWJob29rOiBmYWxzZVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBkZWZhdWx0TWlzcmFSdWxlU2V0OiAnTUlTUkFfQ18yMDEyJ1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9IGNhdGNoICh1c2VyRXJyb3I6IGFueSkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVVNFUl9DUkVBVElPTl9GQUlMRUQ6ICR7dXNlckVycm9yLm1lc3NhZ2V9YCk7XHJcbiAgICAgIH1cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIC8vIFVwZGF0ZSBsYXN0IGxvZ2luIGZvciBleGlzdGluZyB1c2VyXHJcbiAgICAgIGF3YWl0IHRoaXMudXNlclNlcnZpY2UudXBkYXRlTGFzdExvZ2luKHVzZXIudXNlcklkKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdXNlcjtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgYXN5bmMgZXhlY3V0ZVdpdGhSZXRyeTxUPihcclxuICAgIG9wZXJhdGlvbjogKCkgPT4gUHJvbWlzZTxUPixcclxuICAgIGNvbmZpZzogUmV0cnlDb25maWcsXHJcbiAgICBvcGVyYXRpb25UeXBlOiBzdHJpbmdcclxuICApOiBQcm9taXNlPFQ+IHtcclxuICAgIGxldCBsYXN0RXJyb3I6IEVycm9yO1xyXG4gICAgXHJcbiAgICBmb3IgKGxldCBhdHRlbXB0ID0gMDsgYXR0ZW1wdCA8PSBjb25maWcubWF4UmV0cmllczsgYXR0ZW1wdCsrKSB7XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgcmV0dXJuIGF3YWl0IG9wZXJhdGlvbigpO1xyXG4gICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgICAgbGFzdEVycm9yID0gZXJyb3I7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gRG9uJ3QgcmV0cnkgb24gY2VydGFpbiBlcnJvciB0eXBlc1xyXG4gICAgICAgIGlmICh0aGlzLmlzTm9uUmV0cnlhYmxlRXJyb3IoZXJyb3IpKSB7XHJcbiAgICAgICAgICB0aHJvdyBlcnJvcjtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gSWYgdGhpcyB3YXMgdGhlIGxhc3QgYXR0ZW1wdCwgdGhyb3cgdGhlIGVycm9yXHJcbiAgICAgICAgaWYgKGF0dGVtcHQgPT09IGNvbmZpZy5tYXhSZXRyaWVzKSB7XHJcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYCR7b3BlcmF0aW9uVHlwZS50b1VwcGVyQ2FzZSgpfV9SRVRSWV9FWEhBVVNURUQ6IEZhaWxlZCBhZnRlciAke2NvbmZpZy5tYXhSZXRyaWVzICsgMX0gYXR0ZW1wdHMuIExhc3QgZXJyb3I6ICR7ZXJyb3IubWVzc2FnZX1gKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gQ2FsY3VsYXRlIGRlbGF5IHdpdGggZXhwb25lbnRpYWwgYmFja29mZlxyXG4gICAgICAgIGNvbnN0IGRlbGF5ID0gTWF0aC5taW4oXHJcbiAgICAgICAgICBjb25maWcuYmFzZURlbGF5ICogTWF0aC5wb3coMiwgYXR0ZW1wdCksXHJcbiAgICAgICAgICBjb25maWcubWF4RGVsYXlcclxuICAgICAgICApO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGNvbnNvbGUud2FybihgJHtvcGVyYXRpb25UeXBlfSBhdHRlbXB0ICR7YXR0ZW1wdCArIDF9IGZhaWxlZCwgcmV0cnlpbmcgaW4gJHtkZWxheX1tczpgLCBlcnJvci5tZXNzYWdlKTtcclxuICAgICAgICBhd2FpdCB0aGlzLnNsZWVwKGRlbGF5KTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgXHJcbiAgICB0aHJvdyBsYXN0RXJyb3IhO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBpc05vblJldHJ5YWJsZUVycm9yKGVycm9yOiBFcnJvcik6IGJvb2xlYW4ge1xyXG4gICAgY29uc3QgbWVzc2FnZSA9IGVycm9yLm1lc3NhZ2U7XHJcbiAgICBcclxuICAgIC8vIERvbid0IHJldHJ5IHZhbGlkYXRpb24gZXJyb3JzXHJcbiAgICBpZiAobWVzc2FnZS5pbmNsdWRlcygnSU5WQUxJRF9FTUFJTCcpIHx8IFxyXG4gICAgICAgIG1lc3NhZ2UuaW5jbHVkZXMoJ0lOVkFMSURfQ1JFREVOVElBTFMnKSB8fFxyXG4gICAgICAgIG1lc3NhZ2UuaW5jbHVkZXMoJ1VTRVJfTk9UX0NPTkZJUk1FRCcpIHx8XHJcbiAgICAgICAgbWVzc2FnZS5pbmNsdWRlcygnQ09ORklHX0VSUk9SJykpIHtcclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgc2xlZXAobXM6IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCBtcykpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBpc1ZhbGlkRW1haWwoZW1haWw6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gICAgY29uc3QgZW1haWxSZWdleCA9IC9eW15cXHNAXStAW15cXHNAXStcXC5bXlxcc0BdKyQvO1xyXG4gICAgcmV0dXJuIGVtYWlsUmVnZXgudGVzdChlbWFpbCk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGdlbmVyYXRlVGVtcFBhc3N3b3JkKCk6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc2xpY2UoLTEyKSArICdBMSEnO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBnZW5lcmF0ZVNlY3VyZVBhc3N3b3JkKCk6IHN0cmluZyB7XHJcbiAgICBjb25zdCBjaGFycyA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSFAIyQlXiYqJztcclxuICAgIGxldCBwYXNzd29yZCA9ICcnO1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAxNjsgaSsrKSB7XHJcbiAgICAgIHBhc3N3b3JkICs9IGNoYXJzLmNoYXJBdChNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBjaGFycy5sZW5ndGgpKTtcclxuICAgIH1cclxuICAgIHJldHVybiBwYXNzd29yZCArICdBMSEnOyAvLyBFbnN1cmUgaXQgbWVldHMgQ29nbml0byByZXF1aXJlbWVudHNcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENoZWNrIGlmIHVzZXIgZXhpc3RzIGluIENvZ25pdG9cclxuICAgKi9cclxuICBwcml2YXRlIGFzeW5jIGNoZWNrVXNlckV4aXN0cyhlbWFpbDogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XHJcbiAgICBjb25zdCBjb3JyZWxhdGlvbklkID0gdXVpZHY0KCk7XHJcbiAgICBcclxuICAgIHRoaXMubG9nZ2VyLmluZm8oJ0NoZWNraW5nIGlmIHVzZXIgZXhpc3RzJywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICBlbWFpbFxyXG4gICAgfSk7XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgYXdhaXQgdGhpcy5jb2duaXRvQ2xpZW50LnNlbmQobmV3IEFkbWluR2V0VXNlckNvbW1hbmQoe1xyXG4gICAgICAgIFVzZXJQb29sSWQ6IHByb2Nlc3MuZW52LkNPR05JVE9fVVNFUl9QT09MX0lEISxcclxuICAgICAgICBVc2VybmFtZTogZW1haWxcclxuICAgICAgfSkpO1xyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgaWYgKGVycm9yLm5hbWUgPT09ICdVc2VyTm90Rm91bmRFeGNlcHRpb24nKSB7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICB9XHJcbiAgICAgIHRoaXMubW9uaXRvcmluZ1NlcnZpY2Uub25FcnJvcihjb3JyZWxhdGlvbklkLCBlbWFpbCwgZXJyb3IubWVzc2FnZSwgJ3VzZXJfY2hlY2snKTtcclxuICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZW5lcmF0ZSBRUiBjb2RlIFVSTCBmb3IgT1RQIHNldHVwXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBnZW5lcmF0ZVFSQ29kZVVybChlbWFpbDogc3RyaW5nLCBzZWNyZXQ6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgICBjb25zdCBjb3JyZWxhdGlvbklkID0gdXVpZHY0KCk7XHJcbiAgICBcclxuICAgIHRoaXMubG9nZ2VyLmluZm8oJ0dlbmVyYXRpbmcgUVIgY29kZSBVUkwnLCB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIGVtYWlsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBpc3N1ZXIgPSAnTUlTUkEgUGxhdGZvcm0nO1xyXG4gICAgY29uc3QgbGFiZWwgPSBgJHtpc3N1ZXJ9OiR7ZW1haWx9YDtcclxuICAgIGNvbnN0IG90cEF1dGhVcmwgPSBgb3RwYXV0aDovL3RvdHAvJHtlbmNvZGVVUklDb21wb25lbnQobGFiZWwpfT9zZWNyZXQ9JHtzZWNyZXR9Jmlzc3Vlcj0ke2VuY29kZVVSSUNvbXBvbmVudChpc3N1ZXIpfWA7XHJcbiAgICBcclxuICAgIC8vIFJldHVybiBHb29nbGUgQ2hhcnRzIFFSIGNvZGUgVVJMXHJcbiAgICByZXR1cm4gYGh0dHBzOi8vY2hhcnQuZ29vZ2xlYXBpcy5jb20vY2hhcnQ/Y2hzPTIwMHgyMDAmY2hsZD1NfDAmY2h0PXFyJmNobD0ke2VuY29kZVVSSUNvbXBvbmVudChvdHBBdXRoVXJsKX1gO1xyXG4gIH1cclxufSJdfQ==