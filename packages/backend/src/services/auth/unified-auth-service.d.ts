export interface AuthFlowResult {
    state: AuthenticationState;
    requiresEmailVerification: boolean;
    requiresOTPSetup: boolean;
    message: string;
}
export interface OTPSetupResult {
    otpSetup: {
        secret: string;
        qrCodeUrl: string;
        backupCodes: string[];
        issuer: string;
        accountName: string;
    };
    nextStep: AuthenticationState;
    message: string;
}
export declare enum AuthenticationState {
    INITIAL = "initial",
    REGISTERING = "registering",
    EMAIL_VERIFICATION_REQUIRED = "email_verification_required",
    EMAIL_VERIFYING = "email_verifying",
    OTP_SETUP_REQUIRED = "otp_setup_required",
    OTP_VERIFYING = "otp_verifying",
    AUTHENTICATED = "authenticated",
    ERROR = "error"
}
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
    private emailVerificationService;
    private monitoringService;
    private errorHandler;
    private logger;
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
    /**
     * Enhanced authentication flow initiation
     */
    initiateAuthenticationFlow(email: string, name?: string): Promise<AuthFlowResult>;
    /**
     * Handle email verification completion with automatic OTP setup
     */
    handleEmailVerificationComplete(email: string, verificationCode: string): Promise<OTPSetupResult>;
    /**
     * Complete OTP setup and establish user session
     */
    completeOTPSetup(email: string, otpCode: string): Promise<AuthResult>;
    /**
     * Get authentication state for a user
     */
    getAuthenticationState(email: string): Promise<AuthenticationState>;
    /**
     * Validate authentication step
     */
    validateAuthenticationStep(email: string, step: AuthenticationState): Promise<boolean>;
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
    /**
     * Check if user exists in Cognito
     */
    private checkUserExists;
    /**
     * Generate QR code URL for OTP setup
     */
    private generateQRCodeUrl;
}
