/**
 * OTP Service
 * Handles OTP generation, storage, and verification
 * Uses DynamoDB for OTP storage with TTL expiration
 */
export interface OTPData {
    email: string;
    otp: string;
    createdAt: number;
    expiresAt: number;
    attempts: number;
    verified: boolean;
}
export declare class OTPService {
    private dynamoClient;
    private sesClient;
    private readonly OTP_TABLE;
    private readonly OTP_EXPIRY_MINUTES;
    private readonly MAX_ATTEMPTS;
    private readonly SES_FROM_EMAIL;
    constructor();
    /**
     * Generate a new OTP and send it via email
     * Generates a fresh OTP every time - no reuse
     */
    generateAndSendOTP(email: string): Promise<{
        success: boolean;
        message: string;
        otpId?: string;
    }>;
    /**
     * Verify OTP
     */
    verifyOTP(email: string, otp: string): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Send OTP via email using AWS SES
     */
    private sendOTPEmail;
    /**
     * Generate a random 6-digit OTP
     */
    private generateOTP;
    /**
     * Clean up expired OTPs (can be called periodically)
     */
    cleanupExpiredOTPs(): Promise<void>;
}
export declare const otpService: OTPService;
