/**
 * Email Service - Sends emails via AWS SES or SendGrid
 * Used for OTP delivery, welcome emails, and notifications
 */
export declare class EmailService {
    private ses;
    private fromEmail;
    private useSES;
    constructor();
    /**
     * Send OTP to user's email
     */
    sendOTP(email: string, otp: string, userName: string): Promise<void>;
    /**
     * Send welcome email after successful registration
     */
    sendWelcomeEmail(email: string, userName: string): Promise<void>;
    /**
     * Send email via AWS SES
     */
    private sendViaSES;
    /**
     * Send email via SendGrid
     */
    private sendViaSendGrid;
}
export declare const emailService: EmailService;
