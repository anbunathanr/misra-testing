/**
 * Authentication Monitoring Service
 * Provides comprehensive logging, error tracking with correlation IDs,
 * and monitoring hooks for authentication flow metrics
 */
export interface AuthEvent {
    eventId: string;
    timestamp: string;
    eventType: AuthEventType;
    correlationId: string;
    email?: string;
    userId?: string;
    step?: string;
    success: boolean;
    durationMs?: number;
    error?: {
        code: string;
        message: string;
        stack?: string;
    };
    metadata?: Record<string, any>;
}
export interface AuthMetrics {
    totalAuthentications: number;
    successfulAuthentications: number;
    failedAuthentications: number;
    emailVerificationRate: number;
    otpSetupRate: number;
    averageStepDuration: Record<string, number>;
    errorRatesByStep: Record<string, number>;
    errorRatesByType: Record<string, number>;
    sessionDuration: {
        average: number;
        min: number;
        max: number;
    };
}
export declare enum AuthEventType {
    AUTH_FLOW_INITIATED = "auth_flow_initiated",
    EMAIL_VERIFICATION_STARTED = "email_verification_started",
    EMAIL_VERIFICATION_COMPLETED = "email_verification_completed",
    EMAIL_VERIFICATION_FAILED = "email_verification_failed",
    OTP_SETUP_STARTED = "otp_setup_started",
    OTP_SETUP_COMPLETED = "otp_setup_completed",
    OTP_SETUP_FAILED = "otp_setup_failed",
    SESSION_CREATED = "session_created",
    SESSION_TERMINATED = "session_terminated",
    TOKEN_REFRESHED = "token_refreshed",
    TOKEN_REFRESH_FAILED = "token_refresh_failed",
    ERROR_OCCURRED = "error_occurred",
    RATE_LIMITED = "rate_limited",
    SERVICE_UNAVAILABLE = "service_unavailable"
}
export interface MonitoringHook {
    onAuthFlowInitiated: (correlationId: string, email: string) => void;
    onEmailVerificationStarted: (correlationId: string, email: string) => void;
    onEmailVerificationCompleted: (correlationId: string, email: string, durationMs: number) => void;
    onEmailVerificationFailed: (correlationId: string, email: string, error: string, durationMs: number) => void;
    onOTPSetupStarted: (correlationId: string, email: string) => void;
    onOTPSetupCompleted: (correlationId: string, email: string, durationMs: number) => void;
    onOTPSetupFailed: (correlationId: string, email: string, error: string, durationMs: number) => void;
    onSessionCreated: (correlationId: string, email: string, userId: string, durationMs: number) => void;
    onSessionTerminated: (correlationId: string, email: string, userId: string) => void;
    onError: (correlationId: string, email: string, error: string, step: string) => void;
}
export declare class AuthMonitoringService implements MonitoringHook {
    private logger;
    private metrics;
    private stepTimers;
    private sessionTimers;
    constructor();
    /**
     * Generate unique correlation ID for authentication session
     */
    generateCorrelationId(): string;
    /**
     * Start timing for an authentication step
     */
    startStepTimer(correlationId: string, step: string): void;
    /**
     * End timing for an authentication step and record duration
     */
    endStepTimer(correlationId: string, step: string, success: boolean, error?: string): number;
    /**
     * Start session timer
     */
    startSessionTimer(correlationId: string, email: string): void;
    /**
     * End session timer and record session metrics
     */
    endSessionTimer(correlationId: string, email: string, userId: string, success: boolean): number;
    /**
     * Log authentication event
     */
    logAuthEvent(eventType: AuthEventType, correlationId: string, email: string, step?: string, success?: boolean, durationMs?: number, error?: string, metadata?: Record<string, any>): void;
    /**
     * Log authentication event with full details
     */
    private logEvent;
    /**
     * Update step duration metrics
     */
    private updateStepDuration;
    /**
     * Update error rate metrics
     */
    private updateErrorRate;
    /**
     * Update session duration metrics
     */
    private updateSessionMetrics;
    /**
     * Get current metrics
     */
    getMetrics(): AuthMetrics;
    /**
     * Reset metrics
     */
    resetMetrics(): void;
    onAuthFlowInitiated(correlationId: string, email: string): void;
    onEmailVerificationStarted(correlationId: string, email: string): void;
    onEmailVerificationCompleted(correlationId: string, email: string, durationMs: number): void;
    onEmailVerificationFailed(correlationId: string, email: string, error: string, durationMs: number): void;
    onOTPSetupStarted(correlationId: string, email: string): void;
    onOTPSetupCompleted(correlationId: string, email: string, durationMs: number): void;
    onOTPSetupFailed(correlationId: string, email: string, error: string, durationMs: number): void;
    onSessionCreated(correlationId: string, email: string, userId: string, durationMs: number): void;
    onSessionTerminated(correlationId: string, email: string, userId: string): void;
    onError(correlationId: string, email: string, error: string, step: string): void;
}
/**
 * Create a singleton instance for the application
 */
export declare const authMonitoringService: AuthMonitoringService;
