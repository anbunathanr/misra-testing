/**
 * Frontend Authentication Monitoring Service
 * Provides logging and monitoring hooks for frontend authentication flow
 */

export enum AuthEventType {
  AUTH_FLOW_INITIATED = 'auth_flow_initiated',
  EMAIL_VERIFICATION_STARTED = 'email_verification_started',
  EMAIL_VERIFICATION_COMPLETED = 'email_verification_completed',
  EMAIL_VERIFICATION_FAILED = 'email_verification_failed',
  OTP_SETUP_STARTED = 'otp_setup_started',
  OTP_SETUP_COMPLETED = 'otp_setup_completed',
  OTP_SETUP_FAILED = 'otp_setup_failed',
  SESSION_CREATED = 'session_created',
  SESSION_TERMINATED = 'session_terminated',
  TOKEN_REFRESHED = 'token_refreshed',
  TOKEN_REFRESH_FAILED = 'token_refresh_failed',
  ERROR_OCCURRED = 'error_occurred',
  RATE_LIMITED = 'rate_limited',
  SERVICE_UNAVAILABLE = 'service_unavailable'
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

export class FrontendAuthMonitoringService {
  private metrics: AuthMetrics;
  private stepTimers: Map<string, number>;
  private sessionTimers: Map<string, number>;

  constructor() {
    this.metrics = {
      totalAuthentications: 0,
      successfulAuthentications: 0,
      failedAuthentications: 0,
      emailVerificationRate: 0,
      otpSetupRate: 0,
      averageStepDuration: {},
      errorRatesByStep: {},
      errorRatesByType: {},
      sessionDuration: {
        average: 0,
        min: 0,
        max: 0
      }
    };
    this.stepTimers = new Map();
    this.sessionTimers = new Map();
  }

  /**
   * Log frontend authentication event
   */
  logAuthEvent(eventType: AuthEventType, email: string, step?: string, success: boolean = true, durationMs?: number, error?: string): void {
    const correlationId = this.generateCorrelationId();
    
    console.log(`[AuthMonitor] ${eventType}:`, {
      correlationId,
      email,
      step,
      success,
      durationMs,
      error,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Generate unique correlation ID for frontend session
   */
  private generateCorrelationId(): string {
    return `frontend-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log authentication state change
   */
  logStateChange(fromState: string, toState: string, email: string): void {
    const durationMs = this.calculateStateDuration(fromState, toState);
    
    this.logAuthEvent(
      AuthEventType.AUTH_FLOW_INITIATED,
      email,
      `state_change:${fromState}->${toState}`,
      true,
      durationMs
    );
  }

  /**
   * Calculate duration between state changes
   */
  private calculateStateDuration(fromState: string, toState: string): number {
    // This would track actual time between state changes
    // For now, return a placeholder value
    return 0;
  }

  /**
   * Log API call success/failure with timing
   */
  logAPICall(endpoint: string, success: boolean, durationMs: number, email?: string): void {
    const eventType = success 
      ? AuthEventType.AUTH_FLOW_INITIATED 
      : AuthEventType.ERROR_OCCURRED;
    
    this.logAuthEvent(
      eventType,
      email || 'unknown',
      `api:${endpoint}`,
      success,
      durationMs,
      success ? undefined : `API call failed: ${endpoint}`
    );
  }

  /**
   * Log session creation
   */
  logSessionCreated(email: string, userId: string, durationMs: number): void {
    this.logAuthEvent(
      AuthEventType.SESSION_CREATED,
      email,
      'session_creation',
      true,
      durationMs
    );
  }

  /**
   * Log session termination
   */
  logSessionTerminated(email: string, userId: string): void {
    this.logAuthEvent(
      AuthEventType.SESSION_TERMINATED,
      email,
      'session_termination',
      true
    );
  }

  /**
   * Log error with correlation ID
   */
  logError(email: string, error: string, step: string): void {
    this.logAuthEvent(
      AuthEventType.ERROR_OCCURRED,
      email,
      step,
      false,
      undefined,
      error
    );
  }

  /**
   * Get monitoring metrics
   */
  getMetrics() {
    return this.metrics;
  }

  /**
   * Reset monitoring metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalAuthentications: 0,
      successfulAuthentications: 0,
      failedAuthentications: 0,
      emailVerificationRate: 0,
      otpSetupRate: 0,
      averageStepDuration: {},
      errorRatesByStep: {},
      errorRatesByType: {},
      sessionDuration: {
        average: 0,
        min: 0,
        max: 0
      }
    };
  }
}

/**
 * Create a singleton instance for the application
 */
export const frontendAuthMonitoringService = new FrontendAuthMonitoringService();
