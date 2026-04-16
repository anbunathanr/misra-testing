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
                return {
                    otpSetup: {
                        secret: verificationResult.otpSecret,
                        qrCodeUrl: this.generateQRCodeUrl(email, verificationResult.otpSecret),
                        backupCodes: verificationResult.backupCodes,
                        issuer: 'MISRA Platform',
                        accountName: email
                    },
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW5pZmllZC1hdXRoLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1bmlmaWVkLWF1dGgtc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxnR0FPbUQ7QUFDbkQsK0NBQTJDO0FBQzNDLHVEQUFtRDtBQUNuRCw2RUFBd0U7QUFDeEUsdUVBQXlGO0FBQ3pGLCtCQUFvQztBQUNwQyx1RUFBa0U7QUFDbEUsK0NBQWtEO0FBcUJsRCxJQUFZLG1CQVNYO0FBVEQsV0FBWSxtQkFBbUI7SUFDN0IsMENBQW1CLENBQUE7SUFDbkIsa0RBQTJCLENBQUE7SUFDM0Isa0ZBQTJELENBQUE7SUFDM0QsMERBQW1DLENBQUE7SUFDbkMsZ0VBQXlDLENBQUE7SUFDekMsc0RBQStCLENBQUE7SUFDL0Isc0RBQStCLENBQUE7SUFDL0Isc0NBQWUsQ0FBQTtBQUNqQixDQUFDLEVBVFcsbUJBQW1CLG1DQUFuQixtQkFBbUIsUUFTOUI7QUE2QkQsTUFBYSxrQkFBa0I7SUFDckIsYUFBYSxDQUFnQztJQUM3QyxVQUFVLENBQWE7SUFDdkIsV0FBVyxDQUFjO0lBQ3pCLHdCQUF3QixDQUEyQjtJQUNuRCxpQkFBaUIsQ0FBd0I7SUFDekMsWUFBWSxDQUFtQjtJQUMvQixNQUFNLENBQWtDO0lBQ3hDLGtCQUFrQixHQUFnQjtRQUN4QyxVQUFVLEVBQUUsQ0FBQztRQUNiLFNBQVMsRUFBRSxJQUFJLEVBQUUsV0FBVztRQUM1QixRQUFRLEVBQUUsSUFBSSxDQUFHLFlBQVk7S0FDOUIsQ0FBQztJQUVGO1FBQ0UsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLGdFQUE2QixDQUFDO1lBQ3JELE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXO1NBQzlDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSx3QkFBVSxFQUFFLENBQUM7UUFDbkMsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLDBCQUFXLEVB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Q0FBQztRQUV2SCxtQ0FBbUM7UUFDbkMsT0FBTyxzRUFBc0Usa0JBQWtCLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztJQUNoSCxDQUFDO0NBQ0Y7QUF4dUJELGdEQXd1QkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBcclxuICBDb2duaXRvSWRlbnRpdHlQcm92aWRlckNsaWVudCwgXHJcbiAgQWRtaW5DcmVhdGVVc2VyQ29tbWFuZCwgXHJcbiAgQWRtaW5TZXRVc2VyUGFzc3dvcmRDb21tYW5kLFxyXG4gIEFkbWluSW5pdGlhdGVBdXRoQ29tbWFuZCxcclxuICBBZG1pbkdldFVzZXJDb21tYW5kLFxyXG4gIEluaXRpYXRlQXV0aENvbW1hbmRcclxufSBmcm9tICdAYXdzLXNkay9jbGllbnQtY29nbml0by1pZGVudGl0eS1wcm92aWRlcic7XHJcbmltcG9ydCB7IEpXVFNlcnZpY2UgfSBmcm9tICcuL2p3dC1zZXJ2aWNlJztcclxuaW1wb3J0IHsgVXNlclNlcnZpY2UgfSBmcm9tICcuLi91c2VyL3VzZXItc2VydmljZSc7XHJcbmltcG9ydCB7IEVtYWlsVmVyaWZpY2F0aW9uU2VydmljZSB9IGZyb20gJy4vZW1haWwtdmVyaWZpY2F0aW9uLXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBBdXRoTW9uaXRvcmluZ1NlcnZpY2UsIGF1dGhNb25pdG9yaW5nU2VydmljZSB9IGZyb20gJy4vYXV0aC1tb25pdG9yaW5nLXNlcnZpY2UnO1xyXG5pbXBvcnQgeyB2NCBhcyB1dWlkdjQgfSBmcm9tICd1dWlkJztcclxuaW1wb3J0IHsgQXV0aEVycm9ySGFuZGxlciB9IGZyb20gJy4uLy4uL3V0aWxzL2F1dGgtZXJyb3ItaGFuZGxlcic7XHJcbmltcG9ydCB7IGNyZWF0ZUxvZ2dlciB9IGZyb20gJy4uLy4uL3V0aWxzL2xvZ2dlcic7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEF1dGhGbG93UmVzdWx0IHtcclxuICBzdGF0ZTogQXV0aGVudGljYXRpb25TdGF0ZTtcclxuICByZXF1aXJlc0VtYWlsVmVyaWZpY2F0aW9uOiBib29sZWFuO1xyXG4gIHJlcXVpcmVzT1RQU2V0dXA6IGJvb2xlYW47XHJcbiAgbWVzc2FnZTogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIE9UUFNldHVwUmVzdWx0IHtcclxuICBvdHBTZXR1cDoge1xyXG4gICAgc2VjcmV0OiBzdHJpbmc7XHJcbiAgICBxckNvZGVVcmw6IHN0cmluZztcclxuICAgIGJhY2t1cENvZGVzOiBzdHJpbmdbXTtcclxuICAgIGlzc3Vlcjogc3RyaW5nO1xyXG4gICAgYWNjb3VudE5hbWU6IHN0cmluZztcclxuICB9O1xyXG4gIG5leHRTdGVwOiBBdXRoZW50aWNhdGlvblN0YXRlO1xyXG4gIG1lc3NhZ2U6IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGVudW0gQXV0aGVudGljYXRpb25TdGF0ZSB7XHJcbiAgSU5JVElBTCA9ICdpbml0aWFsJyxcclxuICBSRUdJU1RFUklORyA9ICdyZWdpc3RlcmluZycsXHJcbiAgRU1BSUxfVkVSSUZJQ0FUSU9OX1JFUVVJUkVEID0gJ2VtYWlsX3ZlcmlmaWNhdGlvbl9yZXF1aXJlZCcsXHJcbiAgRU1BSUxfVkVSSUZZSU5HID0gJ2VtYWlsX3ZlcmlmeWluZycsXHJcbiAgT1RQX1NFVFVQX1JFUVVJUkVEID0gJ290cF9zZXR1cF9yZXF1aXJlZCcsXHJcbiAgT1RQX1ZFUklGWUlORyA9ICdvdHBfdmVyaWZ5aW5nJyxcclxuICBBVVRIRU5USUNBVEVEID0gJ2F1dGhlbnRpY2F0ZWQnLFxyXG4gIEVSUk9SID0gJ2Vycm9yJ1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEF1dGhSZXF1ZXN0IHtcclxuICBlbWFpbDogc3RyaW5nO1xyXG4gIHBhc3N3b3JkPzogc3RyaW5nOyAvLyBPcHRpb25hbCBmb3IgcXVpY2sgcmVnaXN0cmF0aW9uXHJcbiAgbmFtZT86IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBBdXRoUmVzdWx0IHtcclxuICBhY2Nlc3NUb2tlbjogc3RyaW5nO1xyXG4gIHJlZnJlc2hUb2tlbjogc3RyaW5nO1xyXG4gIHVzZXI6IHtcclxuICAgIHVzZXJJZDogc3RyaW5nO1xyXG4gICAgZW1haWw6IHN0cmluZztcclxuICAgIG5hbWU6IHN0cmluZztcclxuICAgIG9yZ2FuaXphdGlvbklkOiBzdHJpbmc7XHJcbiAgICByb2xlOiBzdHJpbmc7XHJcbiAgfTtcclxuICBleHBpcmVzSW46IG51bWJlcjtcclxuICBpc05ld1VzZXI6IGJvb2xlYW47XHJcbiAgbWVzc2FnZTogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFJldHJ5Q29uZmlnIHtcclxuICBtYXhSZXRyaWVzOiBudW1iZXI7XHJcbiAgYmFzZURlbGF5OiBudW1iZXI7IC8vIG1pbGxpc2Vjb25kc1xyXG4gIG1heERlbGF5OiBudW1iZXI7IC8vIG1pbGxpc2Vjb25kc1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgVW5pZmllZEF1dGhTZXJ2aWNlIHtcclxuICBwcml2YXRlIGNvZ25pdG9DbGllbnQ6IENvZ25pdG9JZGVudGl0eVByb3ZpZGVyQ2xpZW50O1xyXG4gIHByaXZhdGUgand0U2VydmljZTogSldUU2VydmljZTtcclxuICBwcml2YXRlIHVzZXJTZXJ2aWNlOiBVc2VyU2VydmljZTtcclxuICBwcml2YXRlIGVtYWlsVmVyaWZpY2F0aW9uU2VydmljZTogRW1haWxWZXJpZmljYXRpb25TZXJ2aWNlO1xyXG4gIHByaXZhdGUgbW9uaXRvcmluZ1NlcnZpY2U6IEF1dGhNb25pdG9yaW5nU2VydmljZTtcclxuICBwcml2YXRlIGVycm9ySGFuZGxlcjogQXV0aEVycm9ySGFuZGxlcjtcclxuICBwcml2YXRlIGxvZ2dlcjogUmV0dXJuVHlwZTx0eXBlb2YgY3JlYXRlTG9nZ2VyPjtcclxuICBwcml2YXRlIGRlZmF1bHRSZXRyeUNvbmZpZzogUmV0cnlDb25maWcgPSB7XHJcbiAgICBtYXhSZXRyaWVzOiAzLFxyXG4gICAgYmFzZURlbGF5OiAxMDAwLCAvLyAxIHNlY29uZFxyXG4gICAgbWF4RGVsYXk6IDUwMDAgICAvLyA1IHNlY29uZHNcclxuICB9O1xyXG5cclxuICBjb25zdHJ1Y3RvcigpIHtcclxuICAgIHRoaXMuY29nbml0b0NsaWVudCA9IG5ldyBDb2duaXRvSWRlbnRpdHlQcm92aWRlckNsaWVudCh7IFxyXG4gICAgICByZWdpb246IHByb2Nlc3MuZW52LkFXU19SRUdJT04gfHwgJ3VzLWVhc3QtMScgXHJcbiAgICB9KTtcclxuICAgIHRoaXMuand0U2VydmljZSA9IG5ldyBKV1RTZXJ2aWNlKCk7XHJcbiAgICB0aGlzLnVzZXJTZXJ2aWNlID0gbmV3IFVzZXJTZXJ2aWNlKCk7XHJcbiAgICB0aGlzLmVtYWlsVmVyaWZpY2F0aW9uU2VydmljZSA9IG5ldyBFbWFpbFZlcmlmaWNhdGlvblNlcnZpY2UoKTtcclxuICAgIHRoaXMubW9uaXRvcmluZ1NlcnZpY2UgPSBhdXRoTW9uaXRvcmluZ1NlcnZpY2U7XHJcbiAgICB0aGlzLmVycm9ySGFuZGxlciA9IG5ldyBBdXRoRXJyb3JIYW5kbGVyKCdVbmlmaWVkQXV0aFNlcnZpY2UnKTtcclxuICAgIHRoaXMubG9nZ2VyID0gY3JlYXRlTG9nZ2VyKCdVbmlmaWVkQXV0aFNlcnZpY2UnKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFVuaWZpZWQgYXV0aGVudGljYXRpb24gbWV0aG9kIHRoYXQgaGFuZGxlcyBib3RoIHF1aWNrIHJlZ2lzdHJhdGlvbiBhbmQgZXhpc3RpbmcgdXNlciBsb2dpblxyXG4gICAqL1xyXG4gIGFzeW5jIGF1dGhlbnRpY2F0ZShyZXF1ZXN0OiBBdXRoUmVxdWVzdCwgcmV0cnlDb25maWc/OiBQYXJ0aWFsPFJldHJ5Q29uZmlnPik6IFByb21pc2U8QXV0aFJlc3VsdD4ge1xyXG4gICAgY29uc3QgY29uZmlnID0geyAuLi50aGlzLmRlZmF1bHRSZXRyeUNvbmZpZywgLi4ucmV0cnlDb25maWcgfTtcclxuICAgIFxyXG4gICAgcmV0dXJuIHRoaXMuZXhlY3V0ZVdpdGhSZXRyeShcclxuICAgICAgKCkgPT4gdGhpcy5wZXJmb3JtQXV0aGVudGljYXRpb24ocmVxdWVzdCksXHJcbiAgICAgIGNvbmZpZyxcclxuICAgICAgJ2F1dGhlbnRpY2F0aW9uJ1xyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFF1aWNrIHJlZ2lzdHJhdGlvbiBmbG93IC0gY3JlYXRlcyB1c2VyIGlmIGRvZXNuJ3QgZXhpc3QsIGxvZ3MgaW4gaWYgZXhpc3RzXHJcbiAgICovXHJcbiAgYXN5bmMgcXVpY2tSZWdpc3RlcihlbWFpbDogc3RyaW5nLCBuYW1lPzogc3RyaW5nLCByZXRyeUNvbmZpZz86IFBhcnRpYWw8UmV0cnlDb25maWc+KTogUHJvbWlzZTxBdXRoUmVzdWx0PiB7XHJcbiAgICBjb25zdCBjb25maWcgPSB7IC4uLnRoaXMuZGVmYXVsdFJldHJ5Q29uZmlnLCAuLi5yZXRyeUNvbmZpZyB9O1xyXG4gICAgXHJcbiAgICByZXR1cm4gdGhpcy5leGVjdXRlV2l0aFJldHJ5KFxyXG4gICAgICAoKSA9PiB0aGlzLnBlcmZvcm1RdWlja1JlZ2lzdHJhdGlvbihlbWFpbCwgbmFtZSksXHJcbiAgICAgIGNvbmZpZyxcclxuICAgICAgJ3F1aWNrIHJlZ2lzdHJhdGlvbidcclxuICAgICk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBTdGFuZGFyZCBsb2dpbiBmbG93IC0gcmVxdWlyZXMgcGFzc3dvcmRcclxuICAgKi9cclxuICBhc3luYyBsb2dpbihlbWFpbDogc3RyaW5nLCBwYXNzd29yZDogc3RyaW5nLCByZXRyeUNvbmZpZz86IFBhcnRpYWw8UmV0cnlDb25maWc+KTogUHJvbWlzZTxBdXRoUmVzdWx0PiB7XHJcbiAgICBjb25zdCBjb25maWcgPSB7IC4uLnRoaXMuZGVmYXVsdFJldHJ5Q29uZmlnLCAuLi5yZXRyeUNvbmZpZyB9O1xyXG4gICAgXHJcbiAgICByZXR1cm4gdGhpcy5leGVjdXRlV2l0aFJldHJ5KFxyXG4gICAgICAoKSA9PiB0aGlzLnBlcmZvcm1Mb2dpbihlbWFpbCwgcGFzc3dvcmQpLFxyXG4gICAgICBjb25maWcsXHJcbiAgICAgICdsb2dpbidcclxuICAgICk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBFbmhhbmNlZCBhdXRoZW50aWNhdGlvbiBmbG93IGluaXRpYXRpb25cclxuICAgKi9cclxuICBhc3luYyBpbml0aWF0ZUF1dGhlbnRpY2F0aW9uRmxvdyhlbWFpbDogc3RyaW5nLCBuYW1lPzogc3RyaW5nKTogUHJvbWlzZTxBdXRoRmxvd1Jlc3VsdD4ge1xyXG4gICAgY29uc3QgY29ycmVsYXRpb25JZCA9IHV1aWR2NCgpO1xyXG4gICAgXHJcbiAgICB0aGlzLmxvZ2dlci5pbmZvKCdJbml0aWF0aW5nIGF1dGhlbnRpY2F0aW9uIGZsb3cnLCB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIGVtYWlsLFxyXG4gICAgICBoYXNOYW1lOiAhIW5hbWVcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIE1vbml0b3IgZmxvdyBpbml0aWF0aW9uXHJcbiAgICB0aGlzLm1vbml0b3JpbmdTZXJ2aWNlLm9uQXV0aEZsb3dJbml0aWF0ZWQoY29ycmVsYXRpb25JZCwgZW1haWwpO1xyXG5cclxuICAgIGlmICghdGhpcy5pc1ZhbGlkRW1haWwoZW1haWwpKSB7XHJcbiAgICAgIGNvbnN0IGVycm9yID0gbmV3IEVycm9yKCdJTlZBTElEX0VNQUlMOiBWYWxpZCBlbWFpbCBhZGRyZXNzIGlzIHJlcXVpcmVkJyk7XHJcbiAgICAgIHRoaXMuZXJyb3JIYW5kbGVyLmhhbmRsZUVycm9yKGVycm9yLCB7XHJcbiAgICAgICAgb3BlcmF0aW9uOiAnaW5pdGlhdGVBdXRoZW50aWNhdGlvbkZsb3cnLFxyXG4gICAgICAgIGVtYWlsLFxyXG4gICAgICAgIHN0ZXA6ICd2YWxpZGF0aW9uJ1xyXG4gICAgICB9KTtcclxuICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICB9XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gQ2hlY2sgaWYgdXNlciBleGlzdHMgYW5kIHRoZWlyIHZlcmlmaWNhdGlvbiBzdGF0dXNcclxuICAgICAgY29uc3QgdXNlckV4aXN0cyA9IGF3YWl0IHRoaXMuY2hlY2tVc2VyRXhpc3RzKGVtYWlsKTtcclxuICAgICAgXHJcbiAgICAgIGlmICghdXNlckV4aXN0cykge1xyXG4gICAgICAgIC8vIENyZWF0ZSBuZXcgdXNlciAtIHRoaXMgd2lsbCByZXF1aXJlIGVtYWlsIHZlcmlmaWNhdGlvblxyXG4gICAgICAgIGF3YWl0IHRoaXMuY3JlYXRlQ29nbml0b1VzZXIoZW1haWwsIG5hbWUgfHwgZW1haWwuc3BsaXQoJ0AnKVswXSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgdGhpcy5lcnJvckhhbmRsZXIubG9nQXV0aEV2ZW50KCd1c2VyX2NyZWF0ZWQnLCB7XHJcbiAgICAgICAgICBvcGVyYXRpb246ICdpbml0aWF0ZUF1dGhlbnRpY2F0aW9uRmxvdycsXHJcbiAgICAgICAgICBlbWFpbCxcclxuICAgICAgICAgIHN0ZXA6ICdyZWdpc3RyYXRpb24nXHJcbiAgICAgICAgfSwgdHJ1ZSwgeyBjb3JyZWxhdGlvbklkIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBzdGF0ZTogQXV0aGVudGljYXRpb25TdGF0ZS5FTUFJTF9WRVJJRklDQVRJT05fUkVRVUlSRUQsXHJcbiAgICAgICAgICByZXF1aXJlc0VtYWlsVmVyaWZpY2F0aW9uOiB0cnVlLFxyXG4gICAgICAgICAgcmVxdWlyZXNPVFBTZXR1cDogZmFsc2UsXHJcbiAgICAgICAgICBtZXNzYWdlOiAnQWNjb3VudCBjcmVhdGVkIHN1Y2Nlc3NmdWxseS4gUGxlYXNlIGNoZWNrIHlvdXIgZW1haWwgZm9yIHRoZSB2ZXJpZmljYXRpb24gY29kZS4nXHJcbiAgICAgICAgfTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gVXNlciBleGlzdHMsIGNoZWNrIHRoZWlyIHN0YXR1c1xyXG4gICAgICBjb25zdCBpc0VtYWlsVmVyaWZpZWQgPSBhd2FpdCB0aGlzLmVtYWlsVmVyaWZpY2F0aW9uU2VydmljZS5pc0VtYWlsVmVyaWZpZWQoZW1haWwpO1xyXG4gICAgICBjb25zdCBpc09UUEVuYWJsZWQgPSBhd2FpdCB0aGlzLmVtYWlsVmVyaWZpY2F0aW9uU2VydmljZS5pc09UUEVuYWJsZWQoZW1haWwpO1xyXG5cclxuICAgICAgdGhpcy5sb2dnZXIuaW5mbygnVXNlciBhdXRoZW50aWNhdGlvbiBzdGF0ZSBjaGVja2VkJywge1xyXG4gICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgZW1haWwsXHJcbiAgICAgICAgaXNFbWFpbFZlcmlmaWVkLFxyXG4gICAgICAgIGlzT1RQRW5hYmxlZFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGlmICghaXNFbWFpbFZlcmlmaWVkKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIHN0YXRlOiBBdXRoZW50aWNhdGlvblN0YXRlLkVNQUlMX1ZFUklGSUNBVElPTl9SRVFVSVJFRCxcclxuICAgICAgICAgIHJlcXVpcmVzRW1haWxWZXJpZmljYXRpb246IHRydWUsXHJcbiAgICAgICAgICByZXF1aXJlc09UUFNldHVwOiBmYWxzZSxcclxuICAgICAgICAgIG1lc3NhZ2U6ICdQbGVhc2UgdmVyaWZ5IHlvdXIgZW1haWwgYWRkcmVzcyB0byBjb250aW51ZS4nXHJcbiAgICAgICAgfTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKCFpc09UUEVuYWJsZWQpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgc3RhdGU6IEF1dGhlbnRpY2F0aW9uU3RhdGUuT1RQX1NFVFVQX1JFUVVJUkVELFxyXG4gICAgICAgICAgcmVxdWlyZXNFbWFpbFZlcmlmaWNhdGlvbjogZmFsc2UsXHJcbiAgICAgICAgICByZXF1aXJlc09UUFNldHVwOiB0cnVlLFxyXG4gICAgICAgICAgbWVzc2FnZTogJ1BsZWFzZSBjb21wbGV0ZSBPVFAgc2V0dXAgZm9yIGVuaGFuY2VkIHNlY3VyaXR5LidcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBVc2VyIGlzIGZ1bGx5IHNldCB1cFxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXRlOiBBdXRoZW50aWNhdGlvblN0YXRlLkFVVEhFTlRJQ0FURUQsXHJcbiAgICAgICAgcmVxdWlyZXNFbWFpbFZlcmlmaWNhdGlvbjogZmFsc2UsXHJcbiAgICAgICAgcmVxdWlyZXNPVFBTZXR1cDogZmFsc2UsXHJcbiAgICAgICAgbWVzc2FnZTogJ1VzZXIgaXMgcmVhZHkgZm9yIGF1dGhlbnRpY2F0aW9uLidcclxuICAgICAgfTtcclxuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgdGhpcy5tb25pdG9yaW5nU2VydmljZS5vbkVycm9yKGNvcnJlbGF0aW9uSWQsIGVtYWlsLCBlcnJvci5tZXNzYWdlLCAnZmxvd19pbml0aWF0aW9uJyk7XHJcbiAgICAgIHRoaXMuZXJyb3JIYW5kbGVyLmhhbmRsZUVycm9yKGVycm9yLCB7XHJcbiAgICAgICAgb3BlcmF0aW9uOiAnaW5pdGlhdGVBdXRoZW50aWNhdGlvbkZsb3cnLFxyXG4gICAgICAgIGVtYWlsLFxyXG4gICAgICAgIHN0ZXA6ICdmbG93X2luaXRpYXRpb24nXHJcbiAgICAgIH0pO1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEFVVEhfRkxPV19FUlJPUjogJHtlcnJvci5tZXNzYWdlfWApO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogSGFuZGxlIGVtYWlsIHZlcmlmaWNhdGlvbiBjb21wbGV0aW9uIHdpdGggYXV0b21hdGljIE9UUCBzZXR1cFxyXG4gICAqL1xyXG4gIGFzeW5jIGhhbmRsZUVtYWlsVmVyaWZpY2F0aW9uQ29tcGxldGUoZW1haWw6IHN0cmluZywgdmVyaWZpY2F0aW9uQ29kZTogc3RyaW5nKTogUHJvbWlzZTxPVFBTZXR1cFJlc3VsdD4ge1xyXG4gICAgY29uc3QgY29ycmVsYXRpb25JZCA9IHV1aWR2NCgpO1xyXG4gICAgXHJcbiAgICB0aGlzLmxvZ2dlci5pbmZvKCdIYW5kbGluZyBlbWFpbCB2ZXJpZmljYXRpb24gY29tcGxldGlvbicsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZW1haWxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIE1vbml0b3IgZW1haWwgdmVyaWZpY2F0aW9uIHN0YXJ0XHJcbiAgICB0aGlzLm1vbml0b3JpbmdTZXJ2aWNlLm9uRW1haWxWZXJpZmljYXRpb25TdGFydGVkKGNvcnJlbGF0aW9uSWQsIGVtYWlsKTtcclxuICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gVmVyaWZ5IGVtYWlsIHVzaW5nIEVtYWlsVmVyaWZpY2F0aW9uU2VydmljZVxyXG4gICAgICBjb25zdCB2ZXJpZmljYXRpb25SZXN1bHQgPSBhd2FpdCB0aGlzLmVtYWlsVmVyaWZpY2F0aW9uU2VydmljZS52ZXJpZnlFbWFpbChlbWFpbCwgdmVyaWZpY2F0aW9uQ29kZSk7XHJcblxyXG4gICAgICBpZiAoIXZlcmlmaWNhdGlvblJlc3VsdC5zdWNjZXNzKSB7XHJcbiAgICAgICAgY29uc3QgZXJyb3IgPSBuZXcgRXJyb3IoYEVNQUlMX1ZFUklGSUNBVElPTl9GQUlMRUQ6ICR7dmVyaWZpY2F0aW9uUmVzdWx0Lm1lc3NhZ2V9YCk7XHJcbiAgICAgICAgY29uc3QgZHVyYXRpb25NcyA9IERhdGUubm93KCkgLSBzdGFydFRpbWU7XHJcbiAgICAgICAgdGhpcy5tb25pdG9yaW5nU2VydmljZS5vbkVtYWlsVmVyaWZpY2F0aW9uRmFpbGVkKGNvcnJlbGF0aW9uSWQsIGVtYWlsLCB2ZXJpZmljYXRpb25SZXN1bHQubWVzc2FnZSwgZHVyYXRpb25Ncyk7XHJcbiAgICAgICAgdGhpcy5lcnJvckhhbmRsZXIuaGFuZGxlRXJyb3IoZXJyb3IsIHtcclxuICAgICAgICAgIG9wZXJhdGlvbjogJ2hhbmRsZUVtYWlsVmVyaWZpY2F0aW9uQ29tcGxldGUnLFxyXG4gICAgICAgICAgZW1haWwsXHJcbiAgICAgICAgICBzdGVwOiAnZW1haWxfdmVyaWZpY2F0aW9uJ1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHRocm93IGVycm9yO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB0aGlzLmVycm9ySGFuZGxlci5sb2dBdXRoRXZlbnQoJ2VtYWlsX3ZlcmlmaWVkJywge1xyXG4gICAgICAgIG9wZXJhdGlvbjogJ2hhbmRsZUVtYWlsVmVyaWZpY2F0aW9uQ29tcGxldGUnLFxyXG4gICAgICAgIGVtYWlsLFxyXG4gICAgICAgIHN0ZXA6ICdlbWFpbF92ZXJpZmljYXRpb24nXHJcbiAgICAgIH0sIHRydWUsIHsgY29ycmVsYXRpb25JZCB9KTtcclxuXHJcbiAgICAgIC8vIE1vbml0b3IgZW1haWwgdmVyaWZpY2F0aW9uIGNvbXBsZXRpb25cclxuICAgICAgY29uc3QgZHVyYXRpb25NcyA9IERhdGUubm93KCkgLSBzdGFydFRpbWU7XHJcbiAgICAgIHRoaXMubW9uaXRvcmluZ1NlcnZpY2Uub25FbWFpbFZlcmlmaWNhdGlvbkNvbXBsZXRlZChjb3JyZWxhdGlvbklkLCBlbWFpbCwgZHVyYXRpb25Ncyk7XHJcblxyXG4gICAgICAvLyBFbWFpbCB2ZXJpZmljYXRpb24gYXV0b21hdGljYWxseSBzZXRzIHVwIE9UUCwgc28gcmV0dXJuIHRoZSBzZXR1cCBkYXRhXHJcbiAgICAgIGlmICh2ZXJpZmljYXRpb25SZXN1bHQub3RwU2VjcmV0ICYmIHZlcmlmaWNhdGlvblJlc3VsdC5iYWNrdXBDb2Rlcykge1xyXG4gICAgICAgIHRoaXMubG9nZ2VyLmluZm8oJ09UUCBzZXR1cCBkYXRhIGdlbmVyYXRlZCcsIHtcclxuICAgICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgICBlbWFpbCxcclxuICAgICAgICAgIGhhc1NlY3JldDogISF2ZXJpZmljYXRpb25SZXN1bHQub3RwU2VjcmV0LFxyXG4gICAgICAgICAgYmFja3VwQ29kZXNDb3VudDogdmVyaWZpY2F0aW9uUmVzdWx0LmJhY2t1cENvZGVzLmxlbmd0aFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgb3RwU2V0dXA6IHtcclxuICAgICAgICAgICAgc2VjcmV0OiB2ZXJpZmljYXRpb25SZXN1bHQub3RwU2VjcmV0LFxyXG4gICAgICAgICAgICBxckNvZGVVcmw6IHRoaXMuZ2VuZXJhdGVRUkNvZGVVcmwoZW1haWwsIHZlcmlmaWNhdGlvblJlc3VsdC5vdHBTZWNyZXQpLFxyXG4gICAgICAgICAgICBiYWNrdXBDb2RlczogdmVyaWZpY2F0aW9uUmVzdWx0LmJhY2t1cENvZGVzLFxyXG4gICAgICAgICAgICBpc3N1ZXI6ICdNSVNSQSBQbGF0Zm9ybScsXHJcbiAgICAgICAgICAgIGFjY291bnROYW1lOiBlbWFpbFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIG5leHRTdGVwOiBBdXRoZW50aWNhdGlvblN0YXRlLk9UUF9TRVRVUF9SRVFVSVJFRCxcclxuICAgICAgICAgIG1lc3NhZ2U6ICdFbWFpbCB2ZXJpZmllZCBzdWNjZXNzZnVsbHkuIFBsZWFzZSBjb21wbGV0ZSBPVFAgc2V0dXAuJ1xyXG4gICAgICAgIH07XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnN0IGVycm9yID0gbmV3IEVycm9yKCdPVFBfU0VUVVBfRkFJTEVEOiBGYWlsZWQgdG8gZ2VuZXJhdGUgT1RQIHNldHVwIGRhdGEnKTtcclxuICAgICAgdGhpcy5lcnJvckhhbmRsZXIuaGFuZGxlRXJyb3IoZXJyb3IsIHtcclxuICAgICAgICBvcGVyYXRpb246ICdoYW5kbGVFbWFpbFZlcmlmaWNhdGlvbkNvbXBsZXRlJyxcclxuICAgICAgICBlbWFpbCxcclxuICAgICAgICBzdGVwOiAnb3RwX2dlbmVyYXRpb24nXHJcbiAgICAgIH0pO1xyXG4gICAgICB0aHJvdyBlcnJvcjtcclxuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgdGhpcy5tb25pdG9yaW5nU2VydmljZS5vbkVycm9yKGNvcnJlbGF0aW9uSWQsIGVtYWlsLCBlcnJvci5tZXNzYWdlLCAnZW1haWxfdmVyaWZpY2F0aW9uX2NvbXBsZXRlJyk7XHJcbiAgICAgIHRoaXMuZXJyb3JIYW5kbGVyLmhhbmRsZUVycm9yKGVycm9yLCB7XHJcbiAgICAgICAgb3BlcmF0aW9uOiAnaGFuZGxlRW1haWxWZXJpZmljYXRpb25Db21wbGV0ZScsXHJcbiAgICAgICAgZW1haWwsXHJcbiAgICAgICAgc3RlcDogJ2VtYWlsX3ZlcmlmaWNhdGlvbl9jb21wbGV0ZSdcclxuICAgICAgfSk7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgRU1BSUxfVkVSSUZJQ0FUSU9OX0VSUk9SOiAke2Vycm9yLm1lc3NhZ2V9YCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDb21wbGV0ZSBPVFAgc2V0dXAgYW5kIGVzdGFibGlzaCB1c2VyIHNlc3Npb25cclxuICAgKi9cclxuICBhc3luYyBjb21wbGV0ZU9UUFNldHVwKGVtYWlsOiBzdHJpbmcsIG90cENvZGU6IHN0cmluZyk6IFByb21pc2U8QXV0aFJlc3VsdD4ge1xyXG4gICAgY29uc3QgY29ycmVsYXRpb25JZCA9IHV1aWR2NCgpO1xyXG4gICAgXHJcbiAgICB0aGlzLmxvZ2dlci5pbmZvKCdDb21wbGV0aW5nIE9UUCBzZXR1cCcsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZW1haWxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIE1vbml0b3IgT1RQIHNldHVwIHN0YXJ0XHJcbiAgICB0aGlzLm1vbml0b3JpbmdTZXJ2aWNlLm9uT1RQU2V0dXBTdGFydGVkKGNvcnJlbGF0aW9uSWQsIGVtYWlsKTtcclxuICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gVmVyaWZ5IE9UUCBjb2RlXHJcbiAgICAgIGNvbnN0IG90cFJlc3VsdCA9IGF3YWl0IHRoaXMuZW1haWxWZXJpZmljYXRpb25TZXJ2aWNlLnZlcmlmeU9UUChlbWFpbCwgb3RwQ29kZSk7XHJcblxyXG4gICAgICBpZiAoIW90cFJlc3VsdC5zdWNjZXNzKSB7XHJcbiAgICAgICAgY29uc3QgZXJyb3IgPSBuZXcgRXJyb3IoYE9UUF9WRVJJRklDQVRJT05fRkFJTEVEOiAke290cFJlc3VsdC5tZXNzYWdlfWApO1xyXG4gICAgICAgIGNvbnN0IGR1cmF0aW9uTXMgPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lO1xyXG4gICAgICAgIHRoaXMubW9uaXRvcmluZ1NlcnZpY2Uub25PVFBTZXR1cEZhaWxlZChjb3JyZWxhdGlvbklkLCBlbWFpbCwgb3RwUmVzdWx0Lm1lc3NhZ2UsIGR1cmF0aW9uTXMpO1xyXG4gICAgICAgIHRoaXMuZXJyb3JIYW5kbGVyLmhhbmRsZUVycm9yKGVycm9yLCB7XHJcbiAgICAgICAgICBvcGVyYXRpb246ICdjb21wbGV0ZU9UUFNldHVwJyxcclxuICAgICAgICAgIGVtYWlsLFxyXG4gICAgICAgICAgc3RlcDogJ290cF92ZXJpZmljYXRpb24nXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHRoaXMuZXJyb3JIYW5kbGVyLmxvZ0F1dGhFdmVudCgnb3RwX3ZlcmlmaWVkJywge1xyXG4gICAgICAgIG9wZXJhdGlvbjogJ2NvbXBsZXRlT1RQU2V0dXAnLFxyXG4gICAgICAgIGVtYWlsLFxyXG4gICAgICAgIHN0ZXA6ICdvdHBfdmVyaWZpY2F0aW9uJ1xyXG4gICAgICB9LCB0cnVlLCB7IGNvcnJlbGF0aW9uSWQgfSk7XHJcblxyXG4gICAgICAvLyBNb25pdG9yIE9UUCBzZXR1cCBjb21wbGV0aW9uXHJcbiAgICAgIGNvbnN0IGR1cmF0aW9uTXMgPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lO1xyXG4gICAgICB0aGlzLm1vbml0b3JpbmdTZXJ2aWNlLm9uT1RQU2V0dXBDb21wbGV0ZWQoY29ycmVsYXRpb25JZCwgZW1haWwsIGR1cmF0aW9uTXMpO1xyXG5cclxuICAgICAgLy8gR2V0IHVzZXIgaW5mb3JtYXRpb25cclxuICAgICAgY29uc3QgY29nbml0b1VzZXIgPSBhd2FpdCB0aGlzLmNvZ25pdG9DbGllbnQuc2VuZChuZXcgQWRtaW5HZXRVc2VyQ29tbWFuZCh7XHJcbiAgICAgICAgVXNlclBvb2xJZDogcHJvY2Vzcy5lbnYuQ09HTklUT19VU0VSX1BPT0xfSUQhLFxyXG4gICAgICAgIFVzZXJuYW1lOiBlbWFpbFxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICBjb25zdCBzdWJBdHRyaWJ1dGUgPSBjb2duaXRvVXNlci5Vc2VyQXR0cmlidXRlcz8uZmluZChhdHRyID0+IGF0dHIuTmFtZSA9PT0gJ3N1YicpO1xyXG4gICAgICBjb25zdCBjb2duaXRvU3ViID0gc3ViQXR0cmlidXRlPy5WYWx1ZSB8fCB1dWlkdjQoKTtcclxuXHJcbiAgICAgIC8vIEdldCBvciBjcmVhdGUgdXNlciBpbiBvdXIgc3lzdGVtXHJcbiAgICAgIGNvbnN0IHVzZXIgPSBhd2FpdCB0aGlzLmdldE9yQ3JlYXRlVXNlcihlbWFpbCwgY29nbml0b1N1Yik7XHJcblxyXG4gICAgICB0aGlzLmxvZ2dlci5pbmZvKCdVc2VyIHJldHJpZXZlZCBmb3Igc2Vzc2lvbiBjcmVhdGlvbicsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIHVzZXJJZDogdXNlci51c2VySWQsXHJcbiAgICAgICAgZW1haWw6IHVzZXIuZW1haWxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBHZW5lcmF0ZSBKV1QgdG9rZW5zXHJcbiAgICAgIGNvbnN0IHRva2VuUGFpciA9IGF3YWl0IHRoaXMuand0U2VydmljZS5nZW5lcmF0ZVRva2VuUGFpcih7XHJcbiAgICAgICAgdXNlcklkOiB1c2VyLnVzZXJJZCxcclxuICAgICAgICBlbWFpbDogdXNlci5lbWFpbCxcclxuICAgICAgICBvcmdhbml6YXRpb25JZDogdXNlci5vcmdhbml6YXRpb25JZCxcclxuICAgICAgICByb2xlOiB1c2VyLnJvbGVcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBNb25pdG9yIHNlc3Npb24gY3JlYXRpb25cclxuICAgICAgdGhpcy5tb25pdG9yaW5nU2VydmljZS5vblNlc3Npb25DcmVhdGVkKGNvcnJlbGF0aW9uSWQsIGVtYWlsLCB1c2VyLnVzZXJJZCwgZHVyYXRpb25Ncyk7XHJcblxyXG4gICAgICB0aGlzLmVycm9ySGFuZGxlci5sb2dBdXRoRXZlbnQoJ3Nlc3Npb25fY3JlYXRlZCcsIHtcclxuICAgICAgICBvcGVyYXRpb246ICdjb21wbGV0ZU9UUFNldHVwJyxcclxuICAgICAgICBlbWFpbCxcclxuICAgICAgICB1c2VySWQ6IHVzZXIudXNlcklkLFxyXG4gICAgICAgIHN0ZXA6ICdzZXNzaW9uX2NyZWF0aW9uJ1xyXG4gICAgICB9LCB0cnVlLCB7IGNvcnJlbGF0aW9uSWQgfSk7XHJcblxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIGFjY2Vzc1Rva2VuOiB0b2tlblBhaXIuYWNjZXNzVG9rZW4sXHJcbiAgICAgICAgcmVmcmVzaFRva2VuOiB0b2tlblBhaXIucmVmcmVzaFRva2VuLFxyXG4gICAgICAgIHVzZXI6IHtcclxuICAgICAgICAgIHVzZXJJZDogdXNlci51c2VySWQsXHJcbiAgICAgICAgICBlbWFpbDogdXNlci5lbWFpbCxcclxuICAgICAgICAgIG5hbWU6IHVzZXIuZW1haWwuc3BsaXQoJ0AnKVswXSxcclxuICAgICAgICAgIG9yZ2FuaXphdGlvbklkOiB1c2VyLm9yZ2FuaXphdGlvbklkLFxyXG4gICAgICAgICAgcm9sZTogdXNlci5yb2xlXHJcbiAgICAgICAgfSxcclxuICAgICAgICBleHBpcmVzSW46IHRva2VuUGFpci5leHBpcmVzSW4sXHJcbiAgICAgICAgaXNOZXdVc2VyOiBmYWxzZSxcclxuICAgICAgICBtZXNzYWdlOiAnT1RQIHNldHVwIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHkuIFlvdSBhcmUgbm93IGxvZ2dlZCBpbi4nXHJcbiAgICAgIH07XHJcbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgIHRoaXMubW9uaXRvcmluZ1NlcnZpY2Uub25FcnJvcihjb3JyZWxhdGlvbklkLCBlbWFpbCwgZXJyb3IubWVzc2FnZSwgJ290cF9zZXR1cF9jb21wbGV0ZScpO1xyXG4gICAgICB0aGlzLmVycm9ySGFuZGxlci5oYW5kbGVFcnJvcihlcnJvciwge1xyXG4gICAgICAgIG9wZXJhdGlvbjogJ2NvbXBsZXRlT1RQU2V0dXAnLFxyXG4gICAgICAgIGVtYWlsLFxyXG4gICAgICAgIHN0ZXA6ICdvdHBfc2V0dXBfY29tcGxldGUnXHJcbiAgICAgIH0pO1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE9UUF9TRVRVUF9FUlJPUjogJHtlcnJvci5tZXNzYWdlfWApO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IGF1dGhlbnRpY2F0aW9uIHN0YXRlIGZvciBhIHVzZXJcclxuICAgKi9cclxuICBhc3luYyBnZXRBdXRoZW50aWNhdGlvblN0YXRlKGVtYWlsOiBzdHJpbmcpOiBQcm9taXNlPEF1dGhlbnRpY2F0aW9uU3RhdGU+IHtcclxuICAgIGNvbnN0IGNvcnJlbGF0aW9uSWQgPSB1dWlkdjQoKTtcclxuICAgIFxyXG4gICAgdGhpcy5sb2dnZXIuaW5mbygnR2V0dGluZyBhdXRoZW50aWNhdGlvbiBzdGF0ZScsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZW1haWxcclxuICAgIH0pO1xyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHVzZXJFeGlzdHMgPSBhd2FpdCB0aGlzLmNoZWNrVXNlckV4aXN0cyhlbWFpbCk7XHJcbiAgICAgIFxyXG4gICAgICBpZiAoIXVzZXJFeGlzdHMpIHtcclxuICAgICAgICByZXR1cm4gQXV0aGVudGljYXRpb25TdGF0ZS5JTklUSUFMO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zdCBpc0VtYWlsVmVyaWZpZWQgPSBhd2FpdCB0aGlzLmVtYWlsVmVyaWZpY2F0aW9uU2VydmljZS5pc0VtYWlsVmVyaWZpZWQoZW1haWwpO1xyXG4gICAgICBjb25zdCBpc09UUEVuYWJsZWQgPSBhd2FpdCB0aGlzLmVtYWlsVmVyaWZpY2F0aW9uU2VydmljZS5pc09UUEVuYWJsZWQoZW1haWwpO1xyXG5cclxuICAgICAgaWYgKCFpc0VtYWlsVmVyaWZpZWQpIHtcclxuICAgICAgICByZXR1cm4gQXV0aGVudGljYXRpb25TdGF0ZS5FTUFJTF9WRVJJRklDQVRJT05fUkVRVUlSRUQ7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmICghaXNPVFBFbmFibGVkKSB7XHJcbiAgICAgICAgcmV0dXJuIEF1dGhlbnRpY2F0aW9uU3RhdGUuT1RQX1NFVFVQX1JFUVVJUkVEO1xyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm4gQXV0aGVudGljYXRpb25TdGF0ZS5BVVRIRU5USUNBVEVEO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgdGhpcy5tb25pdG9yaW5nU2VydmljZS5vbkVycm9yKGNvcnJlbGF0aW9uSWQsIGVtYWlsLCBlcnJvci5tZXNzYWdlLCAnc3RhdGVfY2hlY2snKTtcclxuICAgICAgcmV0dXJuIEF1dGhlbnRpY2F0aW9uU3RhdGUuRVJST1I7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBWYWxpZGF0ZSBhdXRoZW50aWNhdGlvbiBzdGVwXHJcbiAgICovXHJcbiAgYXN5bmMgdmFsaWRhdGVBdXRoZW50aWNhdGlvblN0ZXAoZW1haWw6IHN0cmluZywgc3RlcDogQXV0aGVudGljYXRpb25TdGF0ZSk6IFByb21pc2U8Ym9vbGVhbj4ge1xyXG4gICAgY29uc3QgY29ycmVsYXRpb25JZCA9IHV1aWR2NCgpO1xyXG4gICAgXHJcbiAgICB0aGlzLmxvZ2dlci5pbmZvKCdWYWxpZGF0aW5nIGF1dGhlbnRpY2F0aW9uIHN0ZXAnLCB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIGVtYWlsLFxyXG4gICAgICBzdGVwXHJcbiAgICB9KTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBjdXJyZW50U3RhdGUgPSBhd2FpdCB0aGlzLmdldEF1dGhlbnRpY2F0aW9uU3RhdGUoZW1haWwpO1xyXG4gICAgICBcclxuICAgICAgLy8gRGVmaW5lIHZhbGlkIHN0YXRlIHRyYW5zaXRpb25zXHJcbiAgICAgIGNvbnN0IHZhbGlkVHJhbnNpdGlvbnM6IFJlY29yZDxBdXRoZW50aWNhdGlvblN0YXRlLCBBdXRoZW50aWNhdGlvblN0YXRlW10+ID0ge1xyXG4gICAgICAgIFtBdXRoZW50aWNhdGlvblN0YXRlLklOSVRJQUxdOiBbQXV0aGVudGljYXRpb25TdGF0ZS5SRUdJU1RFUklOR10sXHJcbiAgICAgICAgW0F1dGhlbnRpY2F0aW9uU3RhdGUuUkVHSVNURVJJTkddOiBbQXV0aGVudGljYXRpb25TdGF0ZS5FTUFJTF9WRVJJRklDQVRJT05fUkVRVUlSRURdLFxyXG4gICAgICAgIFtBdXRoZW50aWNhdGlvblN0YXRlLkVNQUlMX1ZFUklGSUNBVElPTl9SRVFVSVJFRF06IFtBdXRoZW50aWNhdGlvblN0YXRlLkVNQUlMX1ZFUklGWUlOR10sXHJcbiAgICAgICAgW0F1dGhlbnRpY2F0aW9uU3RhdGUuRU1BSUxfVkVSSUZZSU5HXTogW0F1dGhlbnRpY2F0aW9uU3RhdGUuT1RQX1NFVFVQX1JFUVVJUkVEXSxcclxuICAgICAgICBbQXV0aGVudGljYXRpb25TdGF0ZS5PVFBfU0VUVVBfUkVRVUlSRURdOiBbQXV0aGVudGljYXRpb25TdGF0ZS5PVFBfVkVSSUZZSU5HXSxcclxuICAgICAgICBbQXV0aGVudGljYXRpb25TdGF0ZS5PVFBfVkVSSUZZSU5HXTogW0F1dGhlbnRpY2F0aW9uU3RhdGUuQVVUSEVOVElDQVRFRF0sXHJcbiAgICAgICAgW0F1dGhlbnRpY2F0aW9uU3RhdGUuQVVUSEVOVElDQVRFRF06IFtdLFxyXG4gICAgICAgIFtBdXRoZW50aWNhdGlvblN0YXRlLkVSUk9SXTogW0F1dGhlbnRpY2F0aW9uU3RhdGUuSU5JVElBTCwgQXV0aGVudGljYXRpb25TdGF0ZS5FTUFJTF9WRVJJRklDQVRJT05fUkVRVUlSRUQsIEF1dGhlbnRpY2F0aW9uU3RhdGUuT1RQX1NFVFVQX1JFUVVJUkVEXVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgcmV0dXJuIHZhbGlkVHJhbnNpdGlvbnNbY3VycmVudFN0YXRlXT8uaW5jbHVkZXMoc3RlcCkgfHwgY3VycmVudFN0YXRlID09PSBzdGVwO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgdGhpcy5tb25pdG9yaW5nU2VydmljZS5vbkVycm9yKGNvcnJlbGF0aW9uSWQsIGVtYWlsLCBlcnJvci5tZXNzYWdlLCAnc3RlcF92YWxpZGF0aW9uJyk7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHByaXZhdGUgYXN5bmMgcGVyZm9ybUF1dGhlbnRpY2F0aW9uKHJlcXVlc3Q6IEF1dGhSZXF1ZXN0KTogUHJvbWlzZTxBdXRoUmVzdWx0PiB7XHJcbiAgICBpZiAoIXRoaXMuaXNWYWxpZEVtYWlsKHJlcXVlc3QuZW1haWwpKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignSU5WQUxJRF9FTUFJTDogVmFsaWQgZW1haWwgYWRkcmVzcyBpcyByZXF1aXJlZCcpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIElmIHBhc3N3b3JkIGlzIHByb3ZpZGVkLCB1c2Ugc3RhbmRhcmQgbG9naW4gZmxvd1xyXG4gICAgaWYgKHJlcXVlc3QucGFzc3dvcmQpIHtcclxuICAgICAgcmV0dXJuIHRoaXMucGVyZm9ybUxvZ2luKHJlcXVlc3QuZW1haWwsIHJlcXVlc3QucGFzc3dvcmQpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIE90aGVyd2lzZSwgdXNlIHF1aWNrIHJlZ2lzdHJhdGlvbiBmbG93XHJcbiAgICByZXR1cm4gdGhpcy5wZXJmb3JtUXVpY2tSZWdpc3RyYXRpb24ocmVxdWVzdC5lbWFpbCwgcmVxdWVzdC5uYW1lKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgYXN5bmMgcGVyZm9ybVF1aWNrUmVnaXN0cmF0aW9uKGVtYWlsOiBzdHJpbmcsIG5hbWU/OiBzdHJpbmcpOiBQcm9taXNlPEF1dGhSZXN1bHQ+IHtcclxuICAgIGNvbnN0IHVzZXJOYW1lID0gbmFtZSB8fCBlbWFpbC5zcGxpdCgnQCcpWzBdO1xyXG4gICAgbGV0IGNvZ25pdG9TdWI6IHN0cmluZztcclxuICAgIGxldCBpc05ld1VzZXIgPSBmYWxzZTtcclxuXHJcbiAgICAvLyBDaGVjayBpZiB1c2VyIGFscmVhZHkgZXhpc3RzIGluIENvZ25pdG9cclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IGV4aXN0aW5nVXNlciA9IGF3YWl0IHRoaXMuY29nbml0b0NsaWVudC5zZW5kKG5ldyBBZG1pbkdldFVzZXJDb21tYW5kKHtcclxuICAgICAgICBVc2VyUG9vbElkOiBwcm9jZXNzLmVudi5DT0dOSVRPX1VTRVJfUE9PTF9JRCEsXHJcbiAgICAgICAgVXNlcm5hbWU6IGVtYWlsXHJcbiAgICAgIH0pKTtcclxuXHJcbiAgICAgIC8vIENoZWNrIGlmIHVzZXIgaXMgY29uZmlybWVkIChlbWFpbCB2ZXJpZmllZClcclxuICAgICAgaWYgKGV4aXN0aW5nVXNlci5Vc2VyU3RhdHVzICE9PSAnQ09ORklSTUVEJykge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVVNFUl9OT1RfQ09ORklSTUVEOiBQbGVhc2UgdmVyaWZ5IHlvdXIgZW1haWwgYWRkcmVzcyBiZWZvcmUgbG9nZ2luZyBpbi4gQ2hlY2sgeW91ciBlbWFpbCBmb3IgdGhlIHZlcmlmaWNhdGlvbiBjb2RlLicpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjb2duaXRvU3ViID0gZXhpc3RpbmdVc2VyLlVzZXJuYW1lITtcclxuICAgICAgaXNOZXdVc2VyID0gZmFsc2U7XHJcbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgIGlmIChlcnJvci5uYW1lID09PSAnVXNlck5vdEZvdW5kRXhjZXB0aW9uJykge1xyXG4gICAgICAgIC8vIENyZWF0ZSBuZXcgdXNlciAtIHRoaXMgd2lsbCByZXF1aXJlIGVtYWlsIHZlcmlmaWNhdGlvblxyXG4gICAgICAgIGlzTmV3VXNlciA9IHRydWU7XHJcbiAgICAgICAgY29nbml0b1N1YiA9IGF3YWl0IHRoaXMuY3JlYXRlQ29nbml0b1VzZXIoZW1haWwsIHVzZXJOYW1lKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBUaHJvdyBlcnJvciB0byBpbmRpY2F0ZSB2ZXJpZmljYXRpb24gaXMgcmVxdWlyZWRcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0VNQUlMX1ZFUklGSUNBVElPTl9SRVFVSVJFRDogQWNjb3VudCBjcmVhdGVkIHN1Y2Nlc3NmdWxseS4gUGxlYXNlIGNoZWNrIHlvdXIgZW1haWwgZm9yIHRoZSB2ZXJpZmljYXRpb24gY29kZSB0byBjb21wbGV0ZSByZWdpc3RyYXRpb24uJyk7XHJcbiAgICAgIH0gZWxzZSBpZiAoZXJyb3IubWVzc2FnZS5pbmNsdWRlcygnVVNFUl9OT1RfQ09ORklSTUVEJykpIHtcclxuICAgICAgICAvLyBSZS10aHJvdyBjb25maXJtYXRpb24gZXJyb3JcclxuICAgICAgICB0aHJvdyBlcnJvcjtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENPR05JVE9fRVJST1I6ICR7ZXJyb3IubWVzc2FnZX1gKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIEdldCBvciBjcmVhdGUgdXNlciBpbiBvdXIgRHluYW1vREJcclxuICAgIGNvbnN0IHVzZXIgPSBhd2FpdCB0aGlzLmdldE9yQ3JlYXRlVXNlcihlbWFpbCwgY29nbml0b1N1Yik7XHJcblxyXG4gICAgLy8gR2VuZXJhdGUgSldUIHRva2VucyB3aXRoIDEtaG91ciBleHBpcmF0aW9uXHJcbiAgICBjb25zdCB0b2tlblBhaXIgPSBhd2FpdCB0aGlzLmp3dFNlcnZpY2UuZ2VuZXJhdGVUb2tlblBhaXIoe1xyXG4gICAgICB1c2VySWQ6IHVzZXIudXNlcklkLFxyXG4gICAgICBlbWFpbDogdXNlci5lbWFpbCxcclxuICAgICAgb3JnYW5pemF0aW9uSWQ6IHVzZXIub3JnYW5pemF0aW9uSWQsXHJcbiAgICAgIHJvbGU6IHVzZXIucm9sZVxyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgYWNjZXNzVG9rZW46IHRva2VuUGFpci5hY2Nlc3NUb2tlbixcclxuICAgICAgcmVmcmVzaFRva2VuOiB0b2tlblBhaXIucmVmcmVzaFRva2VuLFxyXG4gICAgICB1c2VyOiB7XHJcbiAgICAgICAgdXNlcklkOiB1c2VyLnVzZXJJZCxcclxuICAgICAgICBlbWFpbDogdXNlci5lbWFpbCxcclxuICAgICAgICBuYW1lOiB1c2VyTmFtZSxcclxuICAgICAgICBvcmdhbml6YXRpb25JZDogdXNlci5vcmdhbml6YXRpb25JZCxcclxuICAgICAgICByb2xlOiB1c2VyLnJvbGVcclxuICAgICAgfSxcclxuICAgICAgZXhwaXJlc0luOiB0b2tlblBhaXIuZXhwaXJlc0luLFxyXG4gICAgICBpc05ld1VzZXIsXHJcbiAgICAgIG1lc3NhZ2U6IGlzTmV3VXNlciBcclxuICAgICAgICA/ICdBY2NvdW50IGNyZWF0ZWQgc3VjY2Vzc2Z1bGx5LiBTZXNzaW9uIHZhbGlkIGZvciAxIGhvdXIuJ1xyXG4gICAgICAgIDogJ1dlbGNvbWUgYmFjayEgU2Vzc2lvbiB2YWxpZCBmb3IgMSBob3VyLidcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFzeW5jIHBlcmZvcm1Mb2dpbihlbWFpbDogc3RyaW5nLCBwYXNzd29yZDogc3RyaW5nKTogUHJvbWlzZTxBdXRoUmVzdWx0PiB7XHJcbiAgICBjb25zdCBjbGllbnRJZCA9IHByb2Nlc3MuZW52LkNPR05JVE9fQ0xJRU5UX0lEO1xyXG4gICAgaWYgKCFjbGllbnRJZCkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NPTkZJR19FUlJPUjogQ29nbml0byBjbGllbnQgbm90IGNvbmZpZ3VyZWQnKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBBdXRoZW50aWNhdGUgYWdhaW5zdCBDb2duaXRvXHJcbiAgICBsZXQgY29nbml0b1N1Yjogc3RyaW5nO1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgYXV0aFJlc3VsdCA9IGF3YWl0IHRoaXMuY29nbml0b0NsaWVudC5zZW5kKG5ldyBJbml0aWF0ZUF1dGhDb21tYW5kKHtcclxuICAgICAgICBBdXRoRmxvdzogJ1VTRVJfUEFTU1dPUkRfQVVUSCcsXHJcbiAgICAgICAgQ2xpZW50SWQ6IGNsaWVudElkLFxyXG4gICAgICAgIEF1dGhQYXJhbWV0ZXJzOiB7XHJcbiAgICAgICAgICBVU0VSTkFNRTogZW1haWwsXHJcbiAgICAgICAgICBQQVNTV09SRDogcGFzc3dvcmQsXHJcbiAgICAgICAgfSxcclxuICAgICAgfSkpO1xyXG5cclxuICAgICAgaWYgKCFhdXRoUmVzdWx0LkF1dGhlbnRpY2F0aW9uUmVzdWx0Py5JZFRva2VuKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJTlZBTElEX0NSRURFTlRJQUxTOiBJbnZhbGlkIGVtYWlsIG9yIHBhc3N3b3JkJyk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIERlY29kZSBDb2duaXRvIElEIHRva2VuIHRvIGdldCBzdWJcclxuICAgICAgY29uc3QgcGFydHMgPSBhdXRoUmVzdWx0LkF1dGhlbnRpY2F0aW9uUmVzdWx0LklkVG9rZW4uc3BsaXQoJy4nKTtcclxuICAgICAgY29uc3QgcGF5bG9hZCA9IEpTT04ucGFyc2UoQnVmZmVyLmZyb20ocGFydHNbMV0sICdiYXNlNjR1cmwnKS50b1N0cmluZygndXRmOCcpKTtcclxuICAgICAgY29nbml0b1N1YiA9IHBheWxvYWQuc3ViO1xyXG4gICAgfSBjYXRjaCAoY29nbml0b0Vycm9yOiBhbnkpIHtcclxuICAgICAgaWYgKFxyXG4gICAgICAgIGNvZ25pdG9FcnJvci5uYW1lID09PSAnTm90QXV0aG9yaXplZEV4Y2VwdGlvbicgfHxcclxuICAgICAgICBjb2duaXRvRXJyb3IubmFtZSA9PT0gJ1VzZXJOb3RGb3VuZEV4Y2VwdGlvbidcclxuICAgICAgKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJTlZBTElEX0NSRURFTlRJQUxTOiBJbnZhbGlkIGVtYWlsIG9yIHBhc3N3b3JkJyk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGNvZ25pdG9FcnJvci5uYW1lID09PSAnVXNlck5vdENvbmZpcm1lZEV4Y2VwdGlvbicpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VTRVJfTk9UX0NPTkZJUk1FRDogVXNlciBpcyBub3QgY29uZmlybWVkLiBQbGVhc2UgdmVyaWZ5IHlvdXIgZW1haWwuJyk7XHJcbiAgICAgIH1cclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBBVVRIX0VSUk9SOiAke2NvZ25pdG9FcnJvci5tZXNzYWdlfWApO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEdldCBvciBjcmVhdGUgdXNlciBpbiBvdXIgRHluYW1vREJcclxuICAgIGNvbnN0IHVzZXIgPSBhd2FpdCB0aGlzLmdldE9yQ3JlYXRlVXNlcihlbWFpbCwgY29nbml0b1N1Yik7XHJcblxyXG4gICAgLy8gR2VuZXJhdGUgSldUIHRva2VucyB3aXRoIDEtaG91ciBleHBpcmF0aW9uXHJcbiAgICBjb25zdCB0b2tlblBhaXIgPSBhd2FpdCB0aGlzLmp3dFNlcnZpY2UuZ2VuZXJhdGVUb2tlblBhaXIoe1xyXG4gICAgICB1c2VySWQ6IHVzZXIudXNlcklkLFxyXG4gICAgICBlbWFpbDogdXNlci5lbWFpbCxcclxuICAgICAgb3JnYW5pemF0aW9uSWQ6IHVzZXIub3JnYW5pemF0aW9uSWQsXHJcbiAgICAgIHJvbGU6IHVzZXIucm9sZVxyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgYWNjZXNzVG9rZW46IHRva2VuUGFpci5hY2Nlc3NUb2tlbixcclxuICAgICAgcmVmcmVzaFRva2VuOiB0b2tlblBhaXIucmVmcmVzaFRva2VuLFxyXG4gICAgICB1c2VyOiB7XHJcbiAgICAgICAgdXNlcklkOiB1c2VyLnVzZXJJZCxcclxuICAgICAgICBlbWFpbDogdXNlci5lbWFpbCxcclxuICAgICAgICBuYW1lOiB1c2VyLmVtYWlsLnNwbGl0KCdAJylbMF0sIC8vIERlZmF1bHQgbmFtZSBmcm9tIGVtYWlsXHJcbiAgICAgICAgb3JnYW5pemF0aW9uSWQ6IHVzZXIub3JnYW5pemF0aW9uSWQsXHJcbiAgICAgICAgcm9sZTogdXNlci5yb2xlXHJcbiAgICAgIH0sXHJcbiAgICAgIGV4cGlyZXNJbjogdG9rZW5QYWlyLmV4cGlyZXNJbixcclxuICAgICAgaXNOZXdVc2VyOiBmYWxzZSxcclxuICAgICAgbWVzc2FnZTogJ0xvZ2luIHN1Y2Nlc3NmdWwuIFNlc3Npb24gdmFsaWQgZm9yIDEgaG91ci4nXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyBjcmVhdGVDb2duaXRvVXNlcihlbWFpbDogc3RyaW5nLCB1c2VyTmFtZTogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcclxuICAgIGNvbnN0IHRlbXBQYXNzd29yZCA9IHRoaXMuZ2VuZXJhdGVUZW1wUGFzc3dvcmQoKTtcclxuICAgIGNvbnN0IHBlcm1hbmVudFBhc3N3b3JkID0gdGhpcy5nZW5lcmF0ZVNlY3VyZVBhc3N3b3JkKCk7XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gQ3JlYXRlIHVzZXIgaW4gQ29nbml0b1xyXG4gICAgICBhd2FpdCB0aGlzLmNvZ25pdG9DbGllbnQuc2VuZChuZXcgQWRtaW5DcmVhdGVVc2VyQ29tbWFuZCh7XHJcbiAgICAgICAgVXNlclBvb2xJZDogcHJvY2Vzcy5lbnYuQ09HTklUT19VU0VSX1BPT0xfSUQhLFxyXG4gICAgICAgIFVzZXJuYW1lOiBlbWFpbCxcclxuICAgICAgICBUZW1wb3JhcnlQYXNzd29yZDogdGVtcFBhc3N3b3JkLFxyXG4gICAgICAgIE1lc3NhZ2VBY3Rpb246ICdTVVBQUkVTUycsIC8vIERvbid0IHNlbmQgd2VsY29tZSBlbWFpbFxyXG4gICAgICAgIFVzZXJBdHRyaWJ1dGVzOiBbXHJcbiAgICAgICAgICB7IE5hbWU6ICdlbWFpbCcsIFZhbHVlOiBlbWFpbCB9LFxyXG4gICAgICAgICAgeyBOYW1lOiAnZW1haWxfdmVyaWZpZWQnLCBWYWx1ZTogJ3RydWUnIH0sXHJcbiAgICAgICAgICB7IE5hbWU6ICduYW1lJywgVmFsdWU6IHVzZXJOYW1lIH1cclxuICAgICAgICBdXHJcbiAgICAgIH0pKTtcclxuXHJcbiAgICAgIC8vIFNldCBwZXJtYW5lbnQgcGFzc3dvcmQgZm9yIHNlYW1sZXNzIGV4cGVyaWVuY2VcclxuICAgICAgYXdhaXQgdGhpcy5jb2duaXRvQ2xpZW50LnNlbmQobmV3IEFkbWluU2V0VXNlclBhc3N3b3JkQ29tbWFuZCh7XHJcbiAgICAgICAgVXNlclBvb2xJZDogcHJvY2Vzcy5lbnYuQ09HTklUT19VU0VSX1BPT0xfSUQhLFxyXG4gICAgICAgIFVzZXJuYW1lOiBlbWFpbCxcclxuICAgICAgICBQYXNzd29yZDogcGVybWFuZW50UGFzc3dvcmQsXHJcbiAgICAgICAgUGVybWFuZW50OiB0cnVlXHJcbiAgICAgIH0pKTtcclxuXHJcbiAgICAgIC8vIEdldCB0aGUgQ29nbml0byBzdWIgZnJvbSB0aGUgY3JlYXRlZCB1c2VyXHJcbiAgICAgIGNvbnN0IG5ld1VzZXIgPSBhd2FpdCB0aGlzLmNvZ25pdG9DbGllbnQuc2VuZChuZXcgQWRtaW5HZXRVc2VyQ29tbWFuZCh7XHJcbiAgICAgICAgVXNlclBvb2xJZDogcHJvY2Vzcy5lbnYuQ09HTklUT19VU0VSX1BPT0xfSUQhLFxyXG4gICAgICAgIFVzZXJuYW1lOiBlbWFpbFxyXG4gICAgICB9KSk7XHJcbiAgICAgIFxyXG4gICAgICBjb25zdCBzdWJBdHRyaWJ1dGUgPSBuZXdVc2VyLlVzZXJBdHRyaWJ1dGVzPy5maW5kKGF0dHIgPT4gYXR0ci5OYW1lID09PSAnc3ViJyk7XHJcbiAgICAgIHJldHVybiBzdWJBdHRyaWJ1dGU/LlZhbHVlIHx8IHV1aWR2NCgpO1xyXG5cclxuICAgIH0gY2F0Y2ggKGNyZWF0ZUVycm9yOiBhbnkpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBVU0VSX0NSRUFUSU9OX0ZBSUxFRDogJHtjcmVhdGVFcnJvci5tZXNzYWdlfWApO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyBnZXRPckNyZWF0ZVVzZXIoZW1haWw6IHN0cmluZywgY29nbml0b1N1Yjogc3RyaW5nKTogUHJvbWlzZTxhbnk+IHtcclxuICAgIC8vIENoZWNrIGlmIHVzZXIgZXhpc3RzIGluIG91ciBEeW5hbW9EQlxyXG4gICAgbGV0IHVzZXIgPSBhd2FpdCB0aGlzLnVzZXJTZXJ2aWNlLmdldFVzZXJCeUVtYWlsKGVtYWlsKTtcclxuXHJcbiAgICBpZiAoIXVzZXIpIHtcclxuICAgICAgLy8gQ3JlYXRlIHVzZXIgaW4gb3VyIHN5c3RlbVxyXG4gICAgICB0cnkge1xyXG4gICAgICAgIHVzZXIgPSBhd2FpdCB0aGlzLnVzZXJTZXJ2aWNlLmNyZWF0ZVVzZXIoe1xyXG4gICAgICAgICAgZW1haWwsXHJcbiAgICAgICAgICBvcmdhbml6YXRpb25JZDogY29nbml0b1N1YiwgLy8gVXNlIENvZ25pdG8gc3ViIGFzIG9yZ2FuaXphdGlvbiBJRFxyXG4gICAgICAgICAgcm9sZTogJ2RldmVsb3BlcicsXHJcbiAgICAgICAgICBwcmVmZXJlbmNlczoge1xyXG4gICAgICAgICAgICB0aGVtZTogJ2xpZ2h0JyxcclxuICAgICAgICAgICAgbm90aWZpY2F0aW9uczoge1xyXG4gICAgICAgICAgICAgIGVtYWlsOiB0cnVlLFxyXG4gICAgICAgICAgICAgIHdlYmhvb2s6IGZhbHNlXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGRlZmF1bHRNaXNyYVJ1bGVTZXQ6ICdNSVNSQV9DXzIwMTInXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0gY2F0Y2ggKHVzZXJFcnJvcjogYW55KSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVU0VSX0NSRUFUSU9OX0ZBSUxFRDogJHt1c2VyRXJyb3IubWVzc2FnZX1gKTtcclxuICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgLy8gVXBkYXRlIGxhc3QgbG9naW4gZm9yIGV4aXN0aW5nIHVzZXJcclxuICAgICAgYXdhaXQgdGhpcy51c2VyU2VydmljZS51cGRhdGVMYXN0TG9naW4odXNlci51c2VySWQpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB1c2VyO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyBleGVjdXRlV2l0aFJldHJ5PFQ+KFxyXG4gICAgb3BlcmF0aW9uOiAoKSA9PiBQcm9taXNlPFQ+LFxyXG4gICAgY29uZmlnOiBSZXRyeUNvbmZpZyxcclxuICAgIG9wZXJhdGlvblR5cGU6IHN0cmluZ1xyXG4gICk6IFByb21pc2U8VD4ge1xyXG4gICAgbGV0IGxhc3RFcnJvcjogRXJyb3I7XHJcbiAgICBcclxuICAgIGZvciAobGV0IGF0dGVtcHQgPSAwOyBhdHRlbXB0IDw9IGNvbmZpZy5tYXhSZXRyaWVzOyBhdHRlbXB0KyspIHtcclxuICAgICAgdHJ5IHtcclxuICAgICAgICByZXR1cm4gYXdhaXQgb3BlcmF0aW9uKCk7XHJcbiAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgICBsYXN0RXJyb3IgPSBlcnJvcjtcclxuICAgICAgICBcclxuICAgICAgICAvLyBEb24ndCByZXRyeSBvbiBjZXJ0YWluIGVycm9yIHR5cGVzXHJcbiAgICAgICAgaWYgKHRoaXMuaXNOb25SZXRyeWFibGVFcnJvcihlcnJvcikpIHtcclxuICAgICAgICAgIHRocm93IGVycm9yO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICAvLyBJZiB0aGlzIHdhcyB0aGUgbGFzdCBhdHRlbXB0LCB0aHJvdyB0aGUgZXJyb3JcclxuICAgICAgICBpZiAoYXR0ZW1wdCA9PT0gY29uZmlnLm1heFJldHJpZXMpIHtcclxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgJHtvcGVyYXRpb25UeXBlLnRvVXBwZXJDYXNlKCl9X1JFVFJZX0VYSEFVU1RFRDogRmFpbGVkIGFmdGVyICR7Y29uZmlnLm1heFJldHJpZXMgKyAxfSBhdHRlbXB0cy4gTGFzdCBlcnJvcjogJHtlcnJvci5tZXNzYWdlfWApO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICAvLyBDYWxjdWxhdGUgZGVsYXkgd2l0aCBleHBvbmVudGlhbCBiYWNrb2ZmXHJcbiAgICAgICAgY29uc3QgZGVsYXkgPSBNYXRoLm1pbihcclxuICAgICAgICAgIGNvbmZpZy5iYXNlRGVsYXkgKiBNYXRoLnBvdygyLCBhdHRlbXB0KSxcclxuICAgICAgICAgIGNvbmZpZy5tYXhEZWxheVxyXG4gICAgICAgICk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgY29uc29sZS53YXJuKGAke29wZXJhdGlvblR5cGV9IGF0dGVtcHQgJHthdHRlbXB0ICsgMX0gZmFpbGVkLCByZXRyeWluZyBpbiAke2RlbGF5fW1zOmAsIGVycm9yLm1lc3NhZ2UpO1xyXG4gICAgICAgIGF3YWl0IHRoaXMuc2xlZXAoZGVsYXkpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHRocm93IGxhc3RFcnJvciE7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGlzTm9uUmV0cnlhYmxlRXJyb3IoZXJyb3I6IEVycm9yKTogYm9vbGVhbiB7XHJcbiAgICBjb25zdCBtZXNzYWdlID0gZXJyb3IubWVzc2FnZTtcclxuICAgIFxyXG4gICAgLy8gRG9uJ3QgcmV0cnkgdmFsaWRhdGlvbiBlcnJvcnNcclxuICAgIGlmIChtZXNzYWdlLmluY2x1ZGVzKCdJTlZBTElEX0VNQUlMJykgfHwgXHJcbiAgICAgICAgbWVzc2FnZS5pbmNsdWRlcygnSU5WQUxJRF9DUkVERU5USUFMUycpIHx8XHJcbiAgICAgICAgbWVzc2FnZS5pbmNsdWRlcygnVVNFUl9OT1RfQ09ORklSTUVEJykgfHxcclxuICAgICAgICBtZXNzYWdlLmluY2x1ZGVzKCdDT05GSUdfRVJST1InKSkge1xyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBzbGVlcChtczogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIG1zKSk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGlzVmFsaWRFbWFpbChlbWFpbDogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgICBjb25zdCBlbWFpbFJlZ2V4ID0gL15bXlxcc0BdK0BbXlxcc0BdK1xcLlteXFxzQF0rJC87XHJcbiAgICByZXR1cm4gZW1haWxSZWdleC50ZXN0KGVtYWlsKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgZ2VuZXJhdGVUZW1wUGFzc3dvcmQoKTogc3RyaW5nIHtcclxuICAgIHJldHVybiBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zbGljZSgtMTIpICsgJ0ExISc7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGdlbmVyYXRlU2VjdXJlUGFzc3dvcmQoKTogc3RyaW5nIHtcclxuICAgIGNvbnN0IGNoYXJzID0gJ0FCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5IUAjJCVeJionO1xyXG4gICAgbGV0IHBhc3N3b3JkID0gJyc7XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDE2OyBpKyspIHtcclxuICAgICAgcGFzc3dvcmQgKz0gY2hhcnMuY2hhckF0KE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGNoYXJzLmxlbmd0aCkpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHBhc3N3b3JkICsgJ0ExISc7IC8vIEVuc3VyZSBpdCBtZWV0cyBDb2duaXRvIHJlcXVpcmVtZW50c1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ2hlY2sgaWYgdXNlciBleGlzdHMgaW4gQ29nbml0b1xyXG4gICAqL1xyXG4gIHByaXZhdGUgYXN5bmMgY2hlY2tVc2VyRXhpc3RzKGVtYWlsOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcclxuICAgIGNvbnN0IGNvcnJlbGF0aW9uSWQgPSB1dWlkdjQoKTtcclxuICAgIFxyXG4gICAgdGhpcy5sb2dnZXIuaW5mbygnQ2hlY2tpbmcgaWYgdXNlciBleGlzdHMnLCB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIGVtYWlsXHJcbiAgICB9KTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICBhd2FpdCB0aGlzLmNvZ25pdG9DbGllbnQuc2VuZChuZXcgQWRtaW5HZXRVc2VyQ29tbWFuZCh7XHJcbiAgICAgICAgVXNlclBvb2xJZDogcHJvY2Vzcy5lbnYuQ09HTklUT19VU0VSX1BPT0xfSUQhLFxyXG4gICAgICAgIFVzZXJuYW1lOiBlbWFpbFxyXG4gICAgICB9KSk7XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICBpZiAoZXJyb3IubmFtZSA9PT0gJ1VzZXJOb3RGb3VuZEV4Y2VwdGlvbicpIHtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgIH1cclxuICAgICAgdGhpcy5tb25pdG9yaW5nU2VydmljZS5vbkVycm9yKGNvcnJlbGF0aW9uSWQsIGVtYWlsLCBlcnJvci5tZXNzYWdlLCAndXNlcl9jaGVjaycpO1xyXG4gICAgICB0aHJvdyBlcnJvcjtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdlbmVyYXRlIFFSIGNvZGUgVVJMIGZvciBPVFAgc2V0dXBcclxuICAgKi9cclxuICBwcml2YXRlIGdlbmVyYXRlUVJDb2RlVXJsKGVtYWlsOiBzdHJpbmcsIHNlY3JldDogc3RyaW5nKTogc3RyaW5nIHtcclxuICAgIGNvbnN0IGNvcnJlbGF0aW9uSWQgPSB1dWlkdjQoKTtcclxuICAgIFxyXG4gICAgdGhpcy5sb2dnZXIuaW5mbygnR2VuZXJhdGluZyBRUiBjb2RlIFVSTCcsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZW1haWxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGlzc3VlciA9ICdNSVNSQSBQbGF0Zm9ybSc7XHJcbiAgICBjb25zdCBsYWJlbCA9IGAke2lzc3Vlcn06JHtlbWFpbH1gO1xyXG4gICAgY29uc3Qgb3RwQXV0aFVybCA9IGBvdHBhdXRoOi8vdG90cC8ke2VuY29kZVVSSUNvbXBvbmVudChsYWJlbCl9P3NlY3JldD0ke3NlY3JldH0maXNzdWVyPSR7ZW5jb2RlVVJJQ29tcG9uZW50KGlzc3Vlcil9YDtcclxuICAgIFxyXG4gICAgLy8gUmV0dXJuIEdvb2dsZSBDaGFydHMgUVIgY29kZSBVUkxcclxuICAgIHJldHVybiBgaHR0cHM6Ly9jaGFydC5nb29nbGVhcGlzLmNvbS9jaGFydD9jaHM9MjAweDIwMCZjaGxkPU18MCZjaHQ9cXImY2hsPSR7ZW5jb2RlVVJJQ29tcG9uZW50KG90cEF1dGhVcmwpfWA7XHJcbiAgfVxyXG59Il19