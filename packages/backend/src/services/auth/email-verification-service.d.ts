/**
 * Email Verification Service
 * Handles email verification codes and OTP generation
 */
export interface VerificationResult {
    success: boolean;
    message: string;
    requiresOTP?: boolean;
    otpSecret?: string;
    backupCodes?: string[];
}
export interface VerificationWithOTPResult extends VerificationResult {
    otpSetup: OTPSetupData;
    nextStep: AuthenticationState;
}
export interface VerificationState {
    isVerified: boolean;
    requiresVerification: boolean;
    canResend: boolean;
    lastSentAt?: Date;
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
export interface OTPSetupData {
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
    issuer: string;
    accountName: string;
}
export interface OTPSetupResult {
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
}
export declare class EmailVerificationService {
    private cognitoClient;
    private userPoolId;
    private errorHandler;
    private logger;
    constructor();
    /**
     * Verify email with confirmation code
     */
    verifyEmail(email: string, confirmationCode: string): Promise<VerificationResult>;
    /**
     * Enhanced verification with OTP setup
     */
    verifyEmailWithOTPSetup(email: string, code: string): Promise<VerificationWithOTPResult>;
    /**
     * Get verification state
     */
    getVerificationState(email: string): Promise<VerificationState>;
    /**
     * Resend verification code
     */
    resendVerificationCode(email: string): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Automatically set up OTP for verified user
     */
    private setupOTPForUser;
    /**
     * Generate OTP secret (32 characters, base32)
     */
    private generateOTPSecret;
    /**
     * Generate backup codes
     */
    private generateBackupCodes;
    /**
     * Generate QR code URL for authenticator apps
     */
    private generateQRCodeUrl;
    /**
     * Verify OTP code
     */
    verifyOTP(email: string, otpCode: string): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Verify TOTP code using time-based algorithm
     */
    private verifyTOTP;
    /**
     * Generate TOTP code
     */
    private generateTOTP;
    /**
     * Check if user has OTP enabled
     */
    isOTPEnabled(email: string): Promise<boolean>;
    /**
     * Check if user is verified
     */
    isEmailVerified(email: string): Promise<boolean>;
}
