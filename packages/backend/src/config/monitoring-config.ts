/**
 * Monitoring Configuration for MISRA Platform
 * 
 * Defines monitoring thresholds, alert configurations, and dashboard settings
 * for different environments (dev, staging, production).
 */

export interface MonitoringThresholds {
  errorRate: number;
  workflowFailureRate: number;
  analysisDuration: number; // milliseconds
  apiLatency: number; // milliseconds
  lambdaDuration: number; // milliseconds
  authFailures: number; // count per period
}

export interface AlertConfiguration {
  enabled: boolean;
  evaluationPeriods: number;
  period: number; // seconds
  treatMissingData: 'breaching' | 'notBreaching' | 'ignore' | 'missing';
}

export interface EnvironmentConfig {
  thresholds: MonitoringThresholds;
  alerts: AlertConfiguration;
  logRetention: number; // days
  metricsRetention: number; // days
  enableDetailedMonitoring: boolean;
  enableXRayTracing: boolean;
}

/**
 * Environment-specific monitoring configurations
 */
export const MONITORING_CONFIG: Record<string, EnvironmentConfig> = {
  production: {
    thresholds: {
      errorRate: 5, // 5% error rate threshold
      workflowFailureRate: 10, // 10% workflow failure rate
      analysisDuration: 60000, // 60 seconds
      apiLatency: 5000, // 5 seconds
      lambdaDuration: 30000, // 30 seconds (analysis functions get more time)
      authFailures: 10, // 10 failures per 5-minute period
    },
    alerts: {
      enabled: true,
      evaluationPeriods: 2,
      period: 300, // 5 minutes
      treatMissingData: 'notBreaching',
    },
    logRetention: 30, // 30 days
    metricsRetention: 90, // 90 days
    enableDetailedMonitoring: true,
    enableXRayTracing: true,
  },
  staging: {
    thresholds: {
      errorRate: 10, // 10% error rate threshold
      workflowFailureRate: 20, // 20% workflow failure rate
      analysisDuration: 90000, // 90 seconds
      apiLatency: 10000, // 10 seconds
      lambdaDuration: 45000, // 45 seconds
      authFailures: 20, // 20 failures per 5-minute period
    },
    alerts: {
      enabled: true,
      evaluationPeriods: 3,
      period: 300, // 5 minutes
      treatMissingData: 'notBreaching',
    },
    logRetention: 14, // 14 days
    metricsRetention: 30, // 30 days
    enableDetailedMonitoring: true,
    enableXRayTracing: false,
  },
  dev: {
    thresholds: {
      errorRate: 20, // 20% error rate threshold (more lenient for dev)
      workflowFailureRate: 30, // 30% workflow failure rate
      analysisDuration: 120000, // 120 seconds
      apiLatency: 15000, // 15 seconds
      lambdaDuration: 60000, // 60 seconds
      authFailures: 50, // 50 failures per 5-minute period
    },
    alerts: {
      enabled: false, // Disable alerts in dev
      evaluationPeriods: 3,
      period: 300, // 5 minutes
      treatMissingData: 'ignore',
    },
    logRetention: 7, // 7 days
    metricsRetention: 14, // 14 days
    enableDetailedMonitoring: false,
    enableXRayTracing: false,
  },
};

/**
 * CloudWatch Insights queries for common debugging scenarios
 */
export const LOG_INSIGHTS_QUERIES = {
  workflowErrors: {
    name: 'Workflow Errors',
    description: 'Find workflow errors with correlation IDs for debugging',
    query: `
      fields @timestamp, @message, correlationId, step, error, userId
      | filter @message like /ERROR/
      | filter step exists
      | sort @timestamp desc
      | limit 100
    `,
  },
  analysisPerformance: {
    name: 'Analysis Performance',
    description: 'Analyze MISRA analysis performance metrics',
    query: `
      fields @timestamp, @message, analysisId, duration, complianceScore, rulesProcessed
      | filter @message like /Analysis completed/ or @message like /Analysis progress/
      | stats avg(duration), min(duration), max(duration), count() by bin(5m)
      | sort @timestamp desc
    `,
  },
  authenticationIssues: {
    name: 'Authentication Issues',
    description: 'Track authentication failures and security events',
    query: `
      fields @timestamp, @message, userId, email, correlationId, authEvent, success
      | filter @message like /Authentication/ and success = false
      | sort @timestamp desc
      | limit 50
    `,
  },
  otpVerificationTracking: {
    name: 'OTP Verification Tracking',
    description: 'Monitor automatic OTP verification process',
    query: `
      fields @timestamp, @message, userId, correlationId, success, step
      | filter @message like /OTP/ or step like /otp/
      | sort @timestamp desc
      | limit 100
    `,
  },
  fileUploadIssues: {
    name: 'File Upload Issues',
    description: 'Debug file upload problems and performance',
    query: `
      fields @timestamp, @message, fileId, fileName, fileSize, duration, error
      | filter @message like /upload/ and (@message like /error/ or @message like /failed/ or duration > 10000)
      | sort @timestamp desc
      | limit 50
    `,
  },
  complianceScoreAnalysis: {
    name: 'Compliance Score Analysis',
    description: 'Analyze compliance score distribution and trends',
    query: `
      fields @timestamp, complianceScore, violationCount, analysisId
      | filter complianceScore exists
      | stats avg(complianceScore), min(complianceScore), max(complianceScore), count() by bin(1h)
      | sort @timestamp desc
    `,
  },
  correlationTracing: {
    name: 'Correlation ID Tracing',
    description: 'Trace complete request flow using correlation ID',
    query: `
      fields @timestamp, @message, correlationId, step, operation, duration
      | filter correlationId = "REPLACE_WITH_CORRELATION_ID"
      | sort @timestamp asc
    `,
  },
  securityEvents: {
    name: 'Security Events',
    description: 'Monitor security events and potential threats',
    query: `
      fields @timestamp, @message, securityEvent, severity, userId, sourceIp
      | filter securityEvent exists
      | filter severity in ["HIGH", "CRITICAL"]
      | sort @timestamp desc
      | limit 100
    `,
  },
};

/**
 * Custom metric definitions for the MISRA Platform
 */
export const CUSTOM_METRICS = {
  workflow: [
    'WorkflowStarted',
    'WorkflowCompleted',
    'WorkflowFailed',
    'WorkflowDuration',
  ],
  analysis: [
    'AnalysisStarted',
    'AnalysisCompleted',
    'AnalysisFailed',
    'AnalysisDuration',
    'ComplianceScore',
    'ViolationsDetected',
    'RulesProcessed',
  ],
  authentication: [
    'AuthenticationAttempts',
    'AuthenticationSuccess',
    'AuthenticationFailure',
    'OTPVerificationSuccess',
    'OTPVerificationFailure',
  ],
  fileOperations: [
    'FileUploads',
    'FileUploadSize',
    'FileUploadDuration',
    'FileDownloads',
  ],
  system: [
    'SystemHealth',
    'ErrorRate',
    'OperationDuration',
    'SecurityEvents',
  ],
};

/**
 * Dashboard widget configurations
 */
export const DASHBOARD_WIDGETS = {
  workflowOverview: {
    title: 'Workflow Overview',
    type: 'metric',
    metrics: ['WorkflowStarted', 'WorkflowCompleted', 'WorkflowFailed'],
    period: 300,
    stat: 'Sum',
  },
  workflowSuccessRate: {
    title: 'Workflow Success Rate',
    type: 'singleValue',
    expression: '(completed / started) * 100',
    metrics: { started: 'WorkflowStarted', completed: 'WorkflowCompleted' },
  },
  analysisPerformance: {
    title: 'Analysis Performance',
    type: 'metric',
    metrics: ['AnalysisStarted', 'AnalysisCompleted', 'AnalysisFailed', 'AnalysisDuration'],
    period: 300,
    stat: 'Average',
  },
  complianceScores: {
    title: 'Compliance Scores',
    type: 'metric',
    metrics: ['ComplianceScore', 'ViolationsDetected'],
    period: 300,
    stat: 'Average',
  },
  authenticationMetrics: {
    title: 'Authentication Metrics',
    type: 'metric',
    metrics: ['AuthenticationAttempts', 'AuthenticationSuccess', 'AuthenticationFailure'],
    period: 300,
    stat: 'Sum',
  },
  systemHealth: {
    title: 'System Health',
    type: 'singleValue',
    metrics: ['SystemHealth', 'ErrorRate'],
    period: 300,
    stat: 'Average',
  },
};

/**
 * Get monitoring configuration for environment
 */
export function getMonitoringConfig(environment: string): EnvironmentConfig {
  return MONITORING_CONFIG[environment] || MONITORING_CONFIG.dev;
}

/**
 * Get log retention days for environment
 */
export function getLogRetentionDays(environment: string): number {
  const config = getMonitoringConfig(environment);
  return config.logRetention;
}

/**
 * Check if alerts should be enabled for environment
 */
export function shouldEnableAlerts(environment: string): boolean {
  const config = getMonitoringConfig(environment);
  return config.alerts.enabled;
}

/**
 * Get threshold values for environment
 */
export function getThresholds(environment: string): MonitoringThresholds {
  const config = getMonitoringConfig(environment);
  return config.thresholds;
}

/**
 * Get alert configuration for environment
 */
export function getAlertConfig(environment: string): AlertConfiguration {
  const config = getMonitoringConfig(environment);
  return config.alerts;
}