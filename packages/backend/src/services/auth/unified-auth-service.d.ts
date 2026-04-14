export interface AuthRequest {
    email: string;
    password?: string;
    name?: string;
}
export interface AuthResult {
    accessToken: string;
    refreshToken: string;
    user: {
        userId: string;
        email: string;
        name: string;
        organizationId: string;
        role: string;
    };
    expiresIn: number;
    isNewUser: boolean;
    message: string;
}
export interface RetryConfig {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
}
export declare class UnifiedAuthService {
    private cognitoClient;
    private jwtService;
    private userService;
    private defaultRetryConfig;
    constructor();
    /**
     * Unified authentication method that handles both quick registration and existing user login
     */
    authenticate(request: AuthRequest, retryConfig?: Partial<RetryConfig>): Promise<AuthResult>;
    /**
     * Quick registration flow - creates user if doesn't exist, logs in if exists
     */
    quickRegister(email: string, name?: string, retryConfig?: Partial<RetryConfig>): Promise<AuthResult>;
    /**
     * Standard login flow - requires password
     */
    login(email: string, password: string, retryConfig?: Partial<RetryConfig>): Promise<AuthResult>;
    private performAuthentication;
    private performQuickRegistration;
    private performLogin;
    private createCognitoUser;
    private getOrCreateUser;
    private executeWithRetry;
    private isNonRetryableError;
    private sleep;
    private isValidEmail;
    private generateTempPassword;
    private generateSecurePassword;
}
