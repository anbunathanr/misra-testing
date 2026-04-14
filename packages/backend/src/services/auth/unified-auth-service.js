"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnifiedAuthService = void 0;
const client_cognito_identity_provider_1 = require("@aws-sdk/client-cognito-identity-provider");
const jwt_service_1 = require("./jwt-service");
const user_service_1 = require("../user/user-service");
const uuid_1 = require("uuid");
class UnifiedAuthService {
    cognitoClient;
    jwtService;
    userService;
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
            // User exists, get their Cognito sub
            const subAttribute = existingUser.UserAttributes?.find(attr => attr.Name === 'sub');
            cognitoSub = subAttribute?.Value || (0, uuid_1.v4)();
        }
        catch (cognitoError) {
            if (cognitoError.name === 'UserNotFoundException') {
                // User doesn't exist, create new user
                isNewUser = true;
                cognitoSub = await this.createCognitoUser(email, userName);
            }
            else {
                throw new Error(`COGNITO_ERROR: ${cognitoError.message}`);
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
}
exports.UnifiedAuthService = UnifiedAuthService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW5pZmllZC1hdXRoLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1bmlmaWVkLWF1dGgtc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxnR0FPbUQ7QUFDbkQsK0NBQTJDO0FBQzNDLHVEQUFtRDtBQUNuRCwrQkFBb0M7QUE2QnBDLE1BQWEsa0JBQWtCO0lBQ3JCLGFBQWEsQ0FBZ0M7SUFDN0MsVUFBVSxDQUFhO0lBQ3ZCLFdBQVcsQ0FBYztJQUN6QixrQkFBa0IsR0FBZ0I7UUFDeEMsVUFBVSxFQUFFLENBQUM7UUFDYixTQUFTLEVBQUUsSUFBSSxFQUFFLFdBQVc7UUFDNUIsUUFBUSxFQUFFLElBQUksQ0FBRyxZQUFZO0tBQzlCLENBQUM7SUFFRjtRQUNFLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxnRUFBNkIsQ0FBQztZQUNyRCxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksV0FBVztTQUM5QyxDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksd0JBQVUsRUFBRSxDQUFDO1FBQ25DLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSwwQkFBVyxFQUFFLENBQUM7SUFDdkMsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLFlBQVksQ0FBQyxPQUFvQixFQUFFLFdBQWtDO1FBQ3pFLE1BQU0sTUFBTSxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxXQUFXLEVBQUUsQ0FBQztRQUU5RCxPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FDMUIsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLE9BQU8sQ0FBQyxFQUN6QyxNQUFNLEVBQ04sZ0JBQWdCLENBQ2pCLENBQUM7SUFDSixDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsYUFBYSxDQUFDLEtBQWEsRUFBRSxJQUFhLEVBQUUsV0FBa0M7UUFDbEYsTUFBTSxN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Q0FBQztZQUN0QyxPQUFPLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUM7WUFDckMsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDO0lBRU8sS0FBSyxDQUFDLEVBQVU7UUFDdEIsT0FBTyxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUN6RCxDQUFDO0lBRU8sWUFBWSxDQUFDLEtBQWE7UUFDaEMsTUFBTSxVQUFVLEdBQUcsNEJBQTRCLENBQUM7UUFDaEQsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2hDLENBQUM7SUFFTyxvQkFBb0I7UUFDMUIsT0FBTyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQztJQUN2RCxDQUFDO0lBRU8sc0JBQXNCO1FBQzVCLE1BQU0sS0FBSyxHQUFHLHdFQUF3RSxDQUFDO1FBQ3ZGLElBQUksUUFBUSxHQUFHLEVBQUUsQ0FBQztRQUNsQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDNUIsUUFBUSxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDckUsQ0FBQztRQUNELE9BQU8sUUFBUSxHQUFHLEtBQUssQ0FBQyxDQUFDLHVDQUF1QztJQUNsRSxDQUFDO0NBQ0Y7QUEvVUQsZ0RBK1VDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgXHJcbiAgQ29nbml0b0lkZW50aXR5UHJvdmlkZXJDbGllbnQsIFxyXG4gIEFkbWluQ3JlYXRlVXNlckNvbW1hbmQsIFxyXG4gIEFkbWluU2V0VXNlclBhc3N3b3JkQ29tbWFuZCxcclxuICBBZG1pbkluaXRpYXRlQXV0aENvbW1hbmQsXHJcbiAgQWRtaW5HZXRVc2VyQ29tbWFuZCxcclxuICBJbml0aWF0ZUF1dGhDb21tYW5kXHJcbn0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWNvZ25pdG8taWRlbnRpdHktcHJvdmlkZXInO1xyXG5pbXBvcnQgeyBKV1RTZXJ2aWNlIH0gZnJvbSAnLi9qd3Qtc2VydmljZSc7XHJcbmltcG9ydCB7IFVzZXJTZXJ2aWNlIH0gZnJvbSAnLi4vdXNlci91c2VyLXNlcnZpY2UnO1xyXG5pbXBvcnQgeyB2NCBhcyB1dWlkdjQgfSBmcm9tICd1dWlkJztcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQXV0aFJlcXVlc3Qge1xyXG4gIGVtYWlsOiBzdHJpbmc7XHJcbiAgcGFzc3dvcmQ/OiBzdHJpbmc7IC8vIE9wdGlvbmFsIGZvciBxdWljayByZWdpc3RyYXRpb25cclxuICBuYW1lPzogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEF1dGhSZXN1bHQge1xyXG4gIGFjY2Vzc1Rva2VuOiBzdHJpbmc7XHJcbiAgcmVmcmVzaFRva2VuOiBzdHJpbmc7XHJcbiAgdXNlcjoge1xyXG4gICAgdXNlcklkOiBzdHJpbmc7XHJcbiAgICBlbWFpbDogc3RyaW5nO1xyXG4gICAgbmFtZTogc3RyaW5nO1xyXG4gICAgb3JnYW5pemF0aW9uSWQ6IHN0cmluZztcclxuICAgIHJvbGU6IHN0cmluZztcclxuICB9O1xyXG4gIGV4cGlyZXNJbjogbnVtYmVyO1xyXG4gIGlzTmV3VXNlcjogYm9vbGVhbjtcclxuICBtZXNzYWdlOiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgUmV0cnlDb25maWcge1xyXG4gIG1heFJldHJpZXM6IG51bWJlcjtcclxuICBiYXNlRGVsYXk6IG51bWJlcjsgLy8gbWlsbGlzZWNvbmRzXHJcbiAgbWF4RGVsYXk6IG51bWJlcjsgLy8gbWlsbGlzZWNvbmRzXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBVbmlmaWVkQXV0aFNlcnZpY2Uge1xyXG4gIHByaXZhdGUgY29nbml0b0NsaWVudDogQ29nbml0b0lkZW50aXR5UHJvdmlkZXJDbGllbnQ7XHJcbiAgcHJpdmF0ZSBqd3RTZXJ2aWNlOiBKV1RTZXJ2aWNlO1xyXG4gIHByaXZhdGUgdXNlclNlcnZpY2U6IFVzZXJTZXJ2aWNlO1xyXG4gIHByaXZhdGUgZGVmYXVsdFJldHJ5Q29uZmlnOiBSZXRyeUNvbmZpZyA9IHtcclxuICAgIG1heFJldHJpZXM6IDMsXHJcbiAgICBiYXNlRGVsYXk6IDEwMDAsIC8vIDEgc2Vjb25kXHJcbiAgICBtYXhEZWxheTogNTAwMCAgIC8vIDUgc2Vjb25kc1xyXG4gIH07XHJcblxyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgdGhpcy5jb2duaXRvQ2xpZW50ID0gbmV3IENvZ25pdG9JZGVudGl0eVByb3ZpZGVyQ2xpZW50KHsgXHJcbiAgICAgIHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJyBcclxuICAgIH0pO1xyXG4gICAgdGhpcy5qd3RTZXJ2aWNlID0gbmV3IEpXVFNlcnZpY2UoKTtcclxuICAgIHRoaXMudXNlclNlcnZpY2UgPSBuZXcgVXNlclNlcnZpY2UoKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFVuaWZpZWQgYXV0aGVudGljYXRpb24gbWV0aG9kIHRoYXQgaGFuZGxlcyBib3RoIHF1aWNrIHJlZ2lzdHJhdGlvbiBhbmQgZXhpc3RpbmcgdXNlciBsb2dpblxyXG4gICAqL1xyXG4gIGFzeW5jIGF1dGhlbnRpY2F0ZShyZXF1ZXN0OiBBdXRoUmVxdWVzdCwgcmV0cnlDb25maWc/OiBQYXJ0aWFsPFJldHJ5Q29uZmlnPik6IFByb21pc2U8QXV0aFJlc3VsdD4ge1xyXG4gICAgY29uc3QgY29uZmlnID0geyAuLi50aGlzLmRlZmF1bHRSZXRyeUNvbmZpZywgLi4ucmV0cnlDb25maWcgfTtcclxuICAgIFxyXG4gICAgcmV0dXJuIHRoaXMuZXhlY3V0ZVdpdGhSZXRyeShcclxuICAgICAgKCkgPT4gdGhpcy5wZXJmb3JtQXV0aGVudGljYXRpb24ocmVxdWVzdCksXHJcbiAgICAgIGNvbmZpZyxcclxuICAgICAgJ2F1dGhlbnRpY2F0aW9uJ1xyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFF1aWNrIHJlZ2lzdHJhdGlvbiBmbG93IC0gY3JlYXRlcyB1c2VyIGlmIGRvZXNuJ3QgZXhpc3QsIGxvZ3MgaW4gaWYgZXhpc3RzXHJcbiAgICovXHJcbiAgYXN5bmMgcXVpY2tSZWdpc3RlcihlbWFpbDogc3RyaW5nLCBuYW1lPzogc3RyaW5nLCByZXRyeUNvbmZpZz86IFBhcnRpYWw8UmV0cnlDb25maWc+KTogUHJvbWlzZTxBdXRoUmVzdWx0PiB7XHJcbiAgICBjb25zdCBjb25maWcgPSB7IC4uLnRoaXMuZGVmYXVsdFJldHJ5Q29uZmlnLCAuLi5yZXRyeUNvbmZpZyB9O1xyXG4gICAgXHJcbiAgICByZXR1cm4gdGhpcy5leGVjdXRlV2l0aFJldHJ5KFxyXG4gICAgICAoKSA9PiB0aGlzLnBlcmZvcm1RdWlja1JlZ2lzdHJhdGlvbihlbWFpbCwgbmFtZSksXHJcbiAgICAgIGNvbmZpZyxcclxuICAgICAgJ3F1aWNrIHJlZ2lzdHJhdGlvbidcclxuICAgICk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBTdGFuZGFyZCBsb2dpbiBmbG93IC0gcmVxdWlyZXMgcGFzc3dvcmRcclxuICAgKi9cclxuICBhc3luYyBsb2dpbihlbWFpbDogc3RyaW5nLCBwYXNzd29yZDogc3RyaW5nLCByZXRyeUNvbmZpZz86IFBhcnRpYWw8UmV0cnlDb25maWc+KTogUHJvbWlzZTxBdXRoUmVzdWx0PiB7XHJcbiAgICBjb25zdCBjb25maWcgPSB7IC4uLnRoaXMuZGVmYXVsdFJldHJ5Q29uZmlnLCAuLi5yZXRyeUNvbmZpZyB9O1xyXG4gICAgXHJcbiAgICByZXR1cm4gdGhpcy5leGVjdXRlV2l0aFJldHJ5KFxyXG4gICAgICAoKSA9PiB0aGlzLnBlcmZvcm1Mb2dpbihlbWFpbCwgcGFzc3dvcmQpLFxyXG4gICAgICBjb25maWcsXHJcbiAgICAgICdsb2dpbidcclxuICAgICk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFzeW5jIHBlcmZvcm1BdXRoZW50aWNhdGlvbihyZXF1ZXN0OiBBdXRoUmVxdWVzdCk6IFByb21pc2U8QXV0aFJlc3VsdD4ge1xyXG4gICAgaWYgKCF0aGlzLmlzVmFsaWRFbWFpbChyZXF1ZXN0LmVtYWlsKSkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0lOVkFMSURfRU1BSUw6IFZhbGlkIGVtYWlsIGFkZHJlc3MgaXMgcmVxdWlyZWQnKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBJZiBwYXNzd29yZCBpcyBwcm92aWRlZCwgdXNlIHN0YW5kYXJkIGxvZ2luIGZsb3dcclxuICAgIGlmIChyZXF1ZXN0LnBhc3N3b3JkKSB7XHJcbiAgICAgIHJldHVybiB0aGlzLnBlcmZvcm1Mb2dpbihyZXF1ZXN0LmVtYWlsLCByZXF1ZXN0LnBhc3N3b3JkKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBPdGhlcndpc2UsIHVzZSBxdWljayByZWdpc3RyYXRpb24gZmxvd1xyXG4gICAgcmV0dXJuIHRoaXMucGVyZm9ybVF1aWNrUmVnaXN0cmF0aW9uKHJlcXVlc3QuZW1haWwsIHJlcXVlc3QubmFtZSk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFzeW5jIHBlcmZvcm1RdWlja1JlZ2lzdHJhdGlvbihlbWFpbDogc3RyaW5nLCBuYW1lPzogc3RyaW5nKTogUHJvbWlzZTxBdXRoUmVzdWx0PiB7XHJcbiAgICBjb25zdCB1c2VyTmFtZSA9IG5hbWUgfHwgZW1haWwuc3BsaXQoJ0AnKVswXTtcclxuICAgIGxldCBjb2duaXRvU3ViOiBzdHJpbmc7XHJcbiAgICBsZXQgaXNOZXdVc2VyID0gZmFsc2U7XHJcblxyXG4gICAgLy8gQ2hlY2sgaWYgdXNlciBhbHJlYWR5IGV4aXN0cyBpbiBDb2duaXRvXHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBleGlzdGluZ1VzZXIgPSBhd2FpdCB0aGlzLmNvZ25pdG9DbGllbnQuc2VuZChuZXcgQWRtaW5HZXRVc2VyQ29tbWFuZCh7XHJcbiAgICAgICAgVXNlclBvb2xJZDogcHJvY2Vzcy5lbnYuQ09HTklUT19VU0VSX1BPT0xfSUQhLFxyXG4gICAgICAgIFVzZXJuYW1lOiBlbWFpbFxyXG4gICAgICB9KSk7XHJcbiAgICAgIFxyXG4gICAgICAvLyBVc2VyIGV4aXN0cywgZ2V0IHRoZWlyIENvZ25pdG8gc3ViXHJcbiAgICAgIGNvbnN0IHN1YkF0dHJpYnV0ZSA9IGV4aXN0aW5nVXNlci5Vc2VyQXR0cmlidXRlcz8uZmluZChhdHRyID0+IGF0dHIuTmFtZSA9PT0gJ3N1YicpO1xyXG4gICAgICBjb2duaXRvU3ViID0gc3ViQXR0cmlidXRlPy5WYWx1ZSB8fCB1dWlkdjQoKTtcclxuICAgICAgXHJcbiAgICB9IGNhdGNoIChjb2duaXRvRXJyb3I6IGFueSkge1xyXG4gICAgICBpZiAoY29nbml0b0Vycm9yLm5hbWUgPT09ICdVc2VyTm90Rm91bmRFeGNlcHRpb24nKSB7XHJcbiAgICAgICAgLy8gVXNlciBkb2Vzbid0IGV4aXN0LCBjcmVhdGUgbmV3IHVzZXJcclxuICAgICAgICBpc05ld1VzZXIgPSB0cnVlO1xyXG4gICAgICAgIGNvZ25pdG9TdWIgPSBhd2FpdCB0aGlzLmNyZWF0ZUNvZ25pdG9Vc2VyKGVtYWlsLCB1c2VyTmFtZSk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBDT0dOSVRPX0VSUk9SOiAke2NvZ25pdG9FcnJvci5tZXNzYWdlfWApO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gR2V0IG9yIGNyZWF0ZSB1c2VyIGluIG91ciBEeW5hbW9EQlxyXG4gICAgY29uc3QgdXNlciA9IGF3YWl0IHRoaXMuZ2V0T3JDcmVhdGVVc2VyKGVtYWlsLCBjb2duaXRvU3ViKTtcclxuXHJcbiAgICAvLyBHZW5lcmF0ZSBKV1QgdG9rZW5zIHdpdGggMS1ob3VyIGV4cGlyYXRpb25cclxuICAgIGNvbnN0IHRva2VuUGFpciA9IGF3YWl0IHRoaXMuand0U2VydmljZS5nZW5lcmF0ZVRva2VuUGFpcih7XHJcbiAgICAgIHVzZXJJZDogdXNlci51c2VySWQsXHJcbiAgICAgIGVtYWlsOiB1c2VyLmVtYWlsLFxyXG4gICAgICBvcmdhbml6YXRpb25JZDogdXNlci5vcmdhbml6YXRpb25JZCxcclxuICAgICAgcm9sZTogdXNlci5yb2xlXHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBhY2Nlc3NUb2tlbjogdG9rZW5QYWlyLmFjY2Vzc1Rva2VuLFxyXG4gICAgICByZWZyZXNoVG9rZW46IHRva2VuUGFpci5yZWZyZXNoVG9rZW4sXHJcbiAgICAgIHVzZXI6IHtcclxuICAgICAgICB1c2VySWQ6IHVzZXIudXNlcklkLFxyXG4gICAgICAgIGVtYWlsOiB1c2VyLmVtYWlsLFxyXG4gICAgICAgIG5hbWU6IHVzZXJOYW1lLFxyXG4gICAgICAgIG9yZ2FuaXphdGlvbklkOiB1c2VyLm9yZ2FuaXphdGlvbklkLFxyXG4gICAgICAgIHJvbGU6IHVzZXIucm9sZVxyXG4gICAgICB9LFxyXG4gICAgICBleHBpcmVzSW46IHRva2VuUGFpci5leHBpcmVzSW4sXHJcbiAgICAgIGlzTmV3VXNlcixcclxuICAgICAgbWVzc2FnZTogaXNOZXdVc2VyIFxyXG4gICAgICAgID8gJ0FjY291bnQgY3JlYXRlZCBzdWNjZXNzZnVsbHkuIFNlc3Npb24gdmFsaWQgZm9yIDEgaG91ci4nXHJcbiAgICAgICAgOiAnV2VsY29tZSBiYWNrISBTZXNzaW9uIHZhbGlkIGZvciAxIGhvdXIuJ1xyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgYXN5bmMgcGVyZm9ybUxvZ2luKGVtYWlsOiBzdHJpbmcsIHBhc3N3b3JkOiBzdHJpbmcpOiBQcm9taXNlPEF1dGhSZXN1bHQ+IHtcclxuICAgIGNvbnN0IGNsaWVudElkID0gcHJvY2Vzcy5lbnYuQ09HTklUT19DTElFTlRfSUQ7XHJcbiAgICBpZiAoIWNsaWVudElkKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ09ORklHX0VSUk9SOiBDb2duaXRvIGNsaWVudCBub3QgY29uZmlndXJlZCcpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEF1dGhlbnRpY2F0ZSBhZ2FpbnN0IENvZ25pdG9cclxuICAgIGxldCBjb2duaXRvU3ViOiBzdHJpbmc7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBhdXRoUmVzdWx0ID0gYXdhaXQgdGhpcy5jb2duaXRvQ2xpZW50LnNlbmQobmV3IEluaXRpYXRlQXV0aENvbW1hbmQoe1xyXG4gICAgICAgIEF1dGhGbG93OiAnVVNFUl9QQVNTV09SRF9BVVRIJyxcclxuICAgICAgICBDbGllbnRJZDogY2xpZW50SWQsXHJcbiAgICAgICAgQXV0aFBhcmFtZXRlcnM6IHtcclxuICAgICAgICAgIFVTRVJOQU1FOiBlbWFpbCxcclxuICAgICAgICAgIFBBU1NXT1JEOiBwYXNzd29yZCxcclxuICAgICAgICB9LFxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICBpZiAoIWF1dGhSZXN1bHQuQXV0aGVudGljYXRpb25SZXN1bHQ/LklkVG9rZW4pIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0lOVkFMSURfQ1JFREVOVElBTFM6IEludmFsaWQgZW1haWwgb3IgcGFzc3dvcmQnKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gRGVjb2RlIENvZ25pdG8gSUQgdG9rZW4gdG8gZ2V0IHN1YlxyXG4gICAgICBjb25zdCBwYXJ0cyA9IGF1dGhSZXN1bHQuQXV0aGVudGljYXRpb25SZXN1bHQuSWRUb2tlbi5zcGxpdCgnLicpO1xyXG4gICAgICBjb25zdCBwYXlsb2FkID0gSlNPTi5wYXJzZShCdWZmZXIuZnJvbShwYXJ0c1sxXSwgJ2Jhc2U2NHVybCcpLnRvU3RyaW5nKCd1dGY4JykpO1xyXG4gICAgICBjb2duaXRvU3ViID0gcGF5bG9hZC5zdWI7XHJcbiAgICB9IGNhdGNoIChjb2duaXRvRXJyb3I6IGFueSkge1xyXG4gICAgICBpZiAoXHJcbiAgICAgICAgY29nbml0b0Vycm9yLm5hbWUgPT09ICdOb3RBdXRob3JpemVkRXhjZXB0aW9uJyB8fFxyXG4gICAgICAgIGNvZ25pdG9FcnJvci5uYW1lID09PSAnVXNlck5vdEZvdW5kRXhjZXB0aW9uJ1xyXG4gICAgICApIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0lOVkFMSURfQ1JFREVOVElBTFM6IEludmFsaWQgZW1haWwgb3IgcGFzc3dvcmQnKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoY29nbml0b0Vycm9yLm5hbWUgPT09ICdVc2VyTm90Q29uZmlybWVkRXhjZXB0aW9uJykge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVVNFUl9OT1RfQ09ORklSTUVEOiBVc2VyIGlzIG5vdCBjb25maXJtZWQuIFBsZWFzZSB2ZXJpZnkgeW91ciBlbWFpbC4nKTtcclxuICAgICAgfVxyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEFVVEhfRVJST1I6ICR7Y29nbml0b0Vycm9yLm1lc3NhZ2V9YCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gR2V0IG9yIGNyZWF0ZSB1c2VyIGluIG91ciBEeW5hbW9EQlxyXG4gICAgY29uc3QgdXNlciA9IGF3YWl0IHRoaXMuZ2V0T3JDcmVhdGVVc2VyKGVtYWlsLCBjb2duaXRvU3ViKTtcclxuXHJcbiAgICAvLyBHZW5lcmF0ZSBKV1QgdG9rZW5zIHdpdGggMS1ob3VyIGV4cGlyYXRpb25cclxuICAgIGNvbnN0IHRva2VuUGFpciA9IGF3YWl0IHRoaXMuand0U2VydmljZS5nZW5lcmF0ZVRva2VuUGFpcih7XHJcbiAgICAgIHVzZXJJZDogdXNlci51c2VySWQsXHJcbiAgICAgIGVtYWlsOiB1c2VyLmVtYWlsLFxyXG4gICAgICBvcmdhbml6YXRpb25JZDogdXNlci5vcmdhbml6YXRpb25JZCxcclxuICAgICAgcm9sZTogdXNlci5yb2xlXHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBhY2Nlc3NUb2tlbjogdG9rZW5QYWlyLmFjY2Vzc1Rva2VuLFxyXG4gICAgICByZWZyZXNoVG9rZW46IHRva2VuUGFpci5yZWZyZXNoVG9rZW4sXHJcbiAgICAgIHVzZXI6IHtcclxuICAgICAgICB1c2VySWQ6IHVzZXIudXNlcklkLFxyXG4gICAgICAgIGVtYWlsOiB1c2VyLmVtYWlsLFxyXG4gICAgICAgIG5hbWU6IHVzZXIuZW1haWwuc3BsaXQoJ0AnKVswXSwgLy8gRGVmYXVsdCBuYW1lIGZyb20gZW1haWxcclxuICAgICAgICBvcmdhbml6YXRpb25JZDogdXNlci5vcmdhbml6YXRpb25JZCxcclxuICAgICAgICByb2xlOiB1c2VyLnJvbGVcclxuICAgICAgfSxcclxuICAgICAgZXhwaXJlc0luOiB0b2tlblBhaXIuZXhwaXJlc0luLFxyXG4gICAgICBpc05ld1VzZXI6IGZhbHNlLFxyXG4gICAgICBtZXNzYWdlOiAnTG9naW4gc3VjY2Vzc2Z1bC4gU2Vzc2lvbiB2YWxpZCBmb3IgMSBob3VyLidcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFzeW5jIGNyZWF0ZUNvZ25pdG9Vc2VyKGVtYWlsOiBzdHJpbmcsIHVzZXJOYW1lOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xyXG4gICAgY29uc3QgdGVtcFBhc3N3b3JkID0gdGhpcy5nZW5lcmF0ZVRlbXBQYXNzd29yZCgpO1xyXG4gICAgY29uc3QgcGVybWFuZW50UGFzc3dvcmQgPSB0aGlzLmdlbmVyYXRlU2VjdXJlUGFzc3dvcmQoKTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICAvLyBDcmVhdGUgdXNlciBpbiBDb2duaXRvXHJcbiAgICAgIGF3YWl0IHRoaXMuY29nbml0b0NsaWVudC5zZW5kKG5ldyBBZG1pbkNyZWF0ZVVzZXJDb21tYW5kKHtcclxuICAgICAgICBVc2VyUG9vbElkOiBwcm9jZXNzLmVudi5DT0dOSVRPX1VTRVJfUE9PTF9JRCEsXHJcbiAgICAgICAgVXNlcm5hbWU6IGVtYWlsLFxyXG4gICAgICAgIFRlbXBvcmFyeVBhc3N3b3JkOiB0ZW1wUGFzc3dvcmQsXHJcbiAgICAgICAgTWVzc2FnZUFjdGlvbjogJ1NVUFBSRVNTJywgLy8gRG9uJ3Qgc2VuZCB3ZWxjb21lIGVtYWlsXHJcbiAgICAgICAgVXNlckF0dHJpYnV0ZXM6IFtcclxuICAgICAgICAgIHsgTmFtZTogJ2VtYWlsJywgVmFsdWU6IGVtYWlsIH0sXHJcbiAgICAgICAgICB7IE5hbWU6ICdlbWFpbF92ZXJpZmllZCcsIFZhbHVlOiAndHJ1ZScgfSxcclxuICAgICAgICAgIHsgTmFtZTogJ25hbWUnLCBWYWx1ZTogdXNlck5hbWUgfVxyXG4gICAgICAgIF1cclxuICAgICAgfSkpO1xyXG5cclxuICAgICAgLy8gU2V0IHBlcm1hbmVudCBwYXNzd29yZCBmb3Igc2VhbWxlc3MgZXhwZXJpZW5jZVxyXG4gICAgICBhd2FpdCB0aGlzLmNvZ25pdG9DbGllbnQuc2VuZChuZXcgQWRtaW5TZXRVc2VyUGFzc3dvcmRDb21tYW5kKHtcclxuICAgICAgICBVc2VyUG9vbElkOiBwcm9jZXNzLmVudi5DT0dOSVRPX1VTRVJfUE9PTF9JRCEsXHJcbiAgICAgICAgVXNlcm5hbWU6IGVtYWlsLFxyXG4gICAgICAgIFBhc3N3b3JkOiBwZXJtYW5lbnRQYXNzd29yZCxcclxuICAgICAgICBQZXJtYW5lbnQ6IHRydWVcclxuICAgICAgfSkpO1xyXG5cclxuICAgICAgLy8gR2V0IHRoZSBDb2duaXRvIHN1YiBmcm9tIHRoZSBjcmVhdGVkIHVzZXJcclxuICAgICAgY29uc3QgbmV3VXNlciA9IGF3YWl0IHRoaXMuY29nbml0b0NsaWVudC5zZW5kKG5ldyBBZG1pbkdldFVzZXJDb21tYW5kKHtcclxuICAgICAgICBVc2VyUG9vbElkOiBwcm9jZXNzLmVudi5DT0dOSVRPX1VTRVJfUE9PTF9JRCEsXHJcbiAgICAgICAgVXNlcm5hbWU6IGVtYWlsXHJcbiAgICAgIH0pKTtcclxuICAgICAgXHJcbiAgICAgIGNvbnN0IHN1YkF0dHJpYnV0ZSA9IG5ld1VzZXIuVXNlckF0dHJpYnV0ZXM/LmZpbmQoYXR0ciA9PiBhdHRyLk5hbWUgPT09ICdzdWInKTtcclxuICAgICAgcmV0dXJuIHN1YkF0dHJpYnV0ZT8uVmFsdWUgfHwgdXVpZHY0KCk7XHJcblxyXG4gICAgfSBjYXRjaCAoY3JlYXRlRXJyb3I6IGFueSkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFVTRVJfQ1JFQVRJT05fRkFJTEVEOiAke2NyZWF0ZUVycm9yLm1lc3NhZ2V9YCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFzeW5jIGdldE9yQ3JlYXRlVXNlcihlbWFpbDogc3RyaW5nLCBjb2duaXRvU3ViOiBzdHJpbmcpOiBQcm9taXNlPGFueT4ge1xyXG4gICAgLy8gQ2hlY2sgaWYgdXNlciBleGlzdHMgaW4gb3VyIER5bmFtb0RCXHJcbiAgICBsZXQgdXNlciA9IGF3YWl0IHRoaXMudXNlclNlcnZpY2UuZ2V0VXNlckJ5RW1haWwoZW1haWwpO1xyXG5cclxuICAgIGlmICghdXNlcikge1xyXG4gICAgICAvLyBDcmVhdGUgdXNlciBpbiBvdXIgc3lzdGVtXHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgdXNlciA9IGF3YWl0IHRoaXMudXNlclNlcnZpY2UuY3JlYXRlVXNlcih7XHJcbiAgICAgICAgICBlbWFpbCxcclxuICAgICAgICAgIG9yZ2FuaXphdGlvbklkOiBjb2duaXRvU3ViLCAvLyBVc2UgQ29nbml0byBzdWIgYXMgb3JnYW5pemF0aW9uIElEXHJcbiAgICAgICAgICByb2xlOiAnZGV2ZWxvcGVyJyxcclxuICAgICAgICAgIHByZWZlcmVuY2VzOiB7XHJcbiAgICAgICAgICAgIHRoZW1lOiAnbGlnaHQnLFxyXG4gICAgICAgICAgICBub3RpZmljYXRpb25zOiB7XHJcbiAgICAgICAgICAgICAgZW1haWw6IHRydWUsXHJcbiAgICAgICAgICAgICAgd2ViaG9vazogZmFsc2VcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZGVmYXVsdE1pc3JhUnVsZVNldDogJ01JU1JBX0NfMjAxMidcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgfSBjYXRjaCAodXNlckVycm9yOiBhbnkpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVTRVJfQ1JFQVRJT05fRkFJTEVEOiAke3VzZXJFcnJvci5tZXNzYWdlfWApO1xyXG4gICAgICB9XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAvLyBVcGRhdGUgbGFzdCBsb2dpbiBmb3IgZXhpc3RpbmcgdXNlclxyXG4gICAgICBhd2FpdCB0aGlzLnVzZXJTZXJ2aWNlLnVwZGF0ZUxhc3RMb2dpbih1c2VyLnVzZXJJZCk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHVzZXI7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFzeW5jIGV4ZWN1dGVXaXRoUmV0cnk8VD4oXHJcbiAgICBvcGVyYXRpb246ICgpID0+IFByb21pc2U8VD4sXHJcbiAgICBjb25maWc6IFJldHJ5Q29uZmlnLFxyXG4gICAgb3BlcmF0aW9uVHlwZTogc3RyaW5nXHJcbiAgKTogUHJvbWlzZTxUPiB7XHJcbiAgICBsZXQgbGFzdEVycm9yOiBFcnJvcjtcclxuICAgIFxyXG4gICAgZm9yIChsZXQgYXR0ZW1wdCA9IDA7IGF0dGVtcHQgPD0gY29uZmlnLm1heFJldHJpZXM7IGF0dGVtcHQrKykge1xyXG4gICAgICB0cnkge1xyXG4gICAgICAgIHJldHVybiBhd2FpdCBvcGVyYXRpb24oKTtcclxuICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICAgIGxhc3RFcnJvciA9IGVycm9yO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIERvbid0IHJldHJ5IG9uIGNlcnRhaW4gZXJyb3IgdHlwZXNcclxuICAgICAgICBpZiAodGhpcy5pc05vblJldHJ5YWJsZUVycm9yKGVycm9yKSkge1xyXG4gICAgICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIElmIHRoaXMgd2FzIHRoZSBsYXN0IGF0dGVtcHQsIHRocm93IHRoZSBlcnJvclxyXG4gICAgICAgIGlmIChhdHRlbXB0ID09PSBjb25maWcubWF4UmV0cmllcykge1xyXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGAke29wZXJhdGlvblR5cGUudG9VcHBlckNhc2UoKX1fUkVUUllfRVhIQVVTVEVEOiBGYWlsZWQgYWZ0ZXIgJHtjb25maWcubWF4UmV0cmllcyArIDF9IGF0dGVtcHRzLiBMYXN0IGVycm9yOiAke2Vycm9yLm1lc3NhZ2V9YCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIENhbGN1bGF0ZSBkZWxheSB3aXRoIGV4cG9uZW50aWFsIGJhY2tvZmZcclxuICAgICAgICBjb25zdCBkZWxheSA9IE1hdGgubWluKFxyXG4gICAgICAgICAgY29uZmlnLmJhc2VEZWxheSAqIE1hdGgucG93KDIsIGF0dGVtcHQpLFxyXG4gICAgICAgICAgY29uZmlnLm1heERlbGF5XHJcbiAgICAgICAgKTtcclxuICAgICAgICBcclxuICAgICAgICBjb25zb2xlLndhcm4oYCR7b3BlcmF0aW9uVHlwZX0gYXR0ZW1wdCAke2F0dGVtcHQgKyAxfSBmYWlsZWQsIHJldHJ5aW5nIGluICR7ZGVsYXl9bXM6YCwgZXJyb3IubWVzc2FnZSk7XHJcbiAgICAgICAgYXdhaXQgdGhpcy5zbGVlcChkZWxheSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIFxyXG4gICAgdGhyb3cgbGFzdEVycm9yITtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgaXNOb25SZXRyeWFibGVFcnJvcihlcnJvcjogRXJyb3IpOiBib29sZWFuIHtcclxuICAgIGNvbnN0IG1lc3NhZ2UgPSBlcnJvci5tZXNzYWdlO1xyXG4gICAgXHJcbiAgICAvLyBEb24ndCByZXRyeSB2YWxpZGF0aW9uIGVycm9yc1xyXG4gICAgaWYgKG1lc3NhZ2UuaW5jbHVkZXMoJ0lOVkFMSURfRU1BSUwnKSB8fCBcclxuICAgICAgICBtZXNzYWdlLmluY2x1ZGVzKCdJTlZBTElEX0NSRURFTlRJQUxTJykgfHxcclxuICAgICAgICBtZXNzYWdlLmluY2x1ZGVzKCdVU0VSX05PVF9DT05GSVJNRUQnKSB8fFxyXG4gICAgICAgIG1lc3NhZ2UuaW5jbHVkZXMoJ0NPTkZJR19FUlJPUicpKSB7XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIHNsZWVwKG1zOiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgbXMpKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgaXNWYWxpZEVtYWlsKGVtYWlsOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICAgIGNvbnN0IGVtYWlsUmVnZXggPSAvXlteXFxzQF0rQFteXFxzQF0rXFwuW15cXHNAXSskLztcclxuICAgIHJldHVybiBlbWFpbFJlZ2V4LnRlc3QoZW1haWwpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBnZW5lcmF0ZVRlbXBQYXNzd29yZCgpOiBzdHJpbmcge1xyXG4gICAgcmV0dXJuIE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnNsaWNlKC0xMikgKyAnQTEhJztcclxuICB9XHJcblxyXG4gIHByaXZhdGUgZ2VuZXJhdGVTZWN1cmVQYXNzd29yZCgpOiBzdHJpbmcge1xyXG4gICAgY29uc3QgY2hhcnMgPSAnQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkhQCMkJV4mKic7XHJcbiAgICBsZXQgcGFzc3dvcmQgPSAnJztcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMTY7IGkrKykge1xyXG4gICAgICBwYXNzd29yZCArPSBjaGFycy5jaGFyQXQoTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogY2hhcnMubGVuZ3RoKSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcGFzc3dvcmQgKyAnQTEhJzsgLy8gRW5zdXJlIGl0IG1lZXRzIENvZ25pdG8gcmVxdWlyZW1lbnRzXHJcbiAgfVxyXG59Il19