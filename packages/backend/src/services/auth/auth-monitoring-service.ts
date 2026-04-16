/**
 * Authentication Monitoring Service
 * Provides comprehensive logging, error tracking with correlation IDs,
 * and monitoring hooks for authentication flow metrics
 */

import { v4 as uuidv4 } from 'uuid';
import { Logger, createLogger, LogLevel } from '../../utils/logger';

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

export class AuthMonitoringService implements MonitoringHook {
  private logger: Logger;
  private metrics: AuthMetrics;
  private stepTimers: Map<string, number>;
  private sessionTimers: Map<string, number>;

  constructor() {
    this.logger = createLogger('AuthMonitoringService');
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
   * Generate unique correlation ID for authentication session
   */
  generateCorrelationId(): string {
    return `auth-${uuidv4()}`;
  }

  /**
   * Start timing for an authentication step
   */
  startStepTimer(correlationId: string, step: string): void {
    this.stepTimers.set(`${correlationId}-${step}`, Date.now());
  }

  /**
   * End timing for an authentication step and record duration
   */
  endStepTimer(correlationId: string, step: string, success: boolean, error?: string): number {
    const startTime = this.stepTimers.get(`${correlationId}-${step}`);
    if (!startTime) {
      return 0;
    }

    const durationMs = Date.now() - startTime;
    this.stepTimers.delete(`${correlationId}-${step}`);

    // Update metrics
    this.updateStepDuration(step, durationMs, success);
    if (!success && error) {
      this.updateErrorRate(step, error);
    }

    return durationMs;
  }

  /**
   * Start session timer
   */
  startSessionTimer(correlationId: string, email: string): void {
    this.sessionTimers.set(correlationId, Date.now());
    this.metrics.totalAuthentications++;
  }

  /**
   * End session timer and record session metrics
   */
  endSessionTimer(correlationId: string, email: string, userId: string, success: boolean): number {
    const startTime = this.sessionTimers.get(correlationId);
    if (!startTime) {
      return 0;
    }

    const durationMs = Date.now() - startTime;
    this.sessionTimers.delete(correlationId);

    // Update session metrics
    this.updateSessionMetrics(durationMs, success);

    if (success) {
      this.metrics.successfulAuthentications++;
    } else {
      this.metrics.failedAuthentications++;
    }

    return durationMs;
  }

  /**
   * Log authentication event
   */
  logAuthEvent(eventType: AuthEventType, correlationId: string, email: string, step?: string, success: boolean = true, durationMs?: number, error?: string, metadata?: Record<string, any>): void {
    const event: AuthEvent = {
      eventId: uuidv4(),
      timestamp: new Date().toISOString(),
      eventType,
      correlationId,
      email,
      step,
      success,
      durationMs,
      error: error ? { code: eventType, message: error } : undefined,
      metadata
    };

    this.logEvent(event);
  }

  /**
   * Log authentication event with full details
   */
  private logEvent(event: AuthEvent): void {
    const logLevel = event.success ? LogLevel.INFO : LogLevel.ERROR;
    const message = `Auth event: ${event.eventType}`;

    this.logger.log(logLevel, message, {
      correlationId: event.correlationId,
      eventType: event.eventType,
      email: event.email,
      userId: event.userId,
      step: event.step,
      success: event.success,
      durationMs: event.durationMs,
      error: event.error,
      metadata: event.metadata
    });
  }

  /**
   * Update step duration metrics
   */
  private updateStepDuration(step: string, durationMs: number, success: boolean): void {
    if (!this.metrics.averageStepDuration[step]) {
      this.metrics.averageStepDuration[step] = {
        sum: 0,
        count: 0,
        min: Infinity,
        max: 0
      };
    }

    const stats = this.metrics.averageStepDuration[step];
    stats.sum += durationMs;
    stats.count++;
    stats.min = Math.min(stats.min, durationMs);
    stats.max = Math.max(stats.max, durationMs);

    // Update error rates by step
    if (!success) {
      if (!this.metrics.errorRatesByStep[step]) {
        this.metrics.errorRatesByStep[step] = 0;
      }
      this.metrics.errorRatesByStep[step]++;
    }
  }

  /**
   * Update error rate metrics
   */
  private updateErrorRate(step: string, error: string): void {
    if (!this.metrics.errorRatesByType[error]) {
      this.metrics.errorRatesByType[error] = 0;
    }
    this.metrics.errorRatesByType[error]++;
  }

  /**
   * Update session duration metrics
   */
  private updateSessionMetrics(durationMs: number, success: boolean): void {
    const { sessionDuration } = this.metrics;
    
    // Update average
    const totalDuration = sessionDuration.average * (sessionDuration.count || 0);
    sessionDuration.count = (sessionDuration.count || 0) + 1;
    sessionDuration.average = totalDuration + durationMs / sessionDuration.count;

    // Update min/max
    if (sessionDuration.min === 0 || durationMs < sessionDuration.min) {
      sessionDuration.min = durationMs;
    }
    if (durationMs > sessionDuration.max) {
      sessionDuration.max = durationMs;
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): AuthMetrics {
    // Calculate rates
    const total = this.metrics.totalAuthentications || 1;
    this.metrics.emailVerificationRate = this.metrics.successfulAuthentications / total;
    this.metrics.otpSetupRate = this.metrics.successfulAuthentications / total;

    // Convert step duration stats to averages
    const averageStepDuration: Record<string, number> = {};
    for (const [step, stats] of Object.entries(this.metrics.averageStepDuration)) {
      averageStepDuration[step] = stats.count > 0 ? stats.sum / stats.count : 0;
    }

    return {
      ...this.metrics,
      averageStepDuration
    };
  }

  /**
   * Reset metrics
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

  // Monitoring hook implementations
  onAuthFlowInitiated(correlationId: string, email: string): void {
    this.startSessionTimer(correlationId, email);
    this.logAuthEvent(AuthEventType.AUTH_FLOW_INITIATED, correlationId, email, 'initiation', true);
  }

  onEmailVerificationStarted(correlationId: string, email: string): void {
    this.startStepTimer(correlationId, 'email_verification');
    this.logAuthEvent(AuthEventType.EMAIL_VERIFICATION_STARTED, correlationId, email, 'email_verification', true);
  }

  onEmailVerificationCompleted(correlationId: string, email: string, durationMs: number): void {
    this.endStepTimer(correlationId, 'email_verification', true);
    this.logAuthEvent(AuthEventType.EMAIL_VERIFICATION_COMPLETED, correlationId, email, 'email_verification', true, durationMs);
  }

  onEmailVerificationFailed(correlationId: string, email: string, error: string, durationMs: number): void {
    this.endStepTimer(correlationId, 'email_verification', false, error);
    this.logAuthEvent(AuthEventType.EMAIL_VERIFICATION_FAILED, correlationId, email, 'email_verification', false, durationMs, error);
  }

  onOTPSetupStarted(correlationId: string, email: string): void {
    this.startStepTimer(correlationId, 'otp_setup');
    this.logAuthEvent(AuthEventType.OTP_SETUP_STARTED, correlationId, email, 'otp_setup', true);
  }

  onOTPSetupCompleted(correlationId: string, email: string, durationMs: number): void {
    this.endStepTimer(correlationId, 'otp_setup', true);
    this.logAuthEvent(AuthEventType.OTP_SETUP_COMPLETED, correlationId, email, 'otp_setup', true, durationMs);
  }

  onOTPSetupFailed(correlationId: string, email: string, error: string, durationMs: number): void {
    this.endStepTimer(correlationId, 'otp_setup', false, error);
    this.logAuthEvent(AuthEventType.OTP_SETUP_FAILED, correlationId, email, 'otp_setup', false, durationMs, error);
  }

  onSessionCreated(correlationId: string, email: string, userId: string, durationMs: number): void {
    this.endSessionTimer(correlationId, email, userId, true);
    this.logAuthEvent(AuthEventType.SESSION_CREATED, correlationId, email, 'session_creation', true, durationMs, undefined, { userId });
  }

  onSessionTerminated(correlationId: string, email: string, userId: string): void {
    this.logAuthEvent(AuthEventType.SESSION_TERMINATED, correlationId, email, 'session_termination', true, undefined, undefined, { userId });
  }

  onError(correlationId: string, email: string, error: string, step: string): void {
    this.logAuthEvent(AuthEventType.ERROR_OCCURRED, correlationId, email, step, false, undefined, error);
  }
}

/**
 * Create a singleton instance for the application
 */
export const authMonitoringService = new AuthMonitoringService();
