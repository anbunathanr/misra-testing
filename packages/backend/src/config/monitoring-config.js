"use strict";
/**
 * Monitoring Configuration for MISRA Platform
 *
 * Defines monitoring thresholds, alert configurations, and dashboard settings
 * for different environments (dev, staging, production).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DASHBOARD_WIDGETS = exports.CUSTOM_METRICS = exports.LOG_INSIGHTS_QUERIES = exports.MONITORING_CONFIG = void 0;
exports.getMonitoringConfig = getMonitoringConfig;
exports.getLogRetentionDays = getLogRetentionDays;
exports.shouldEnableAlerts = shouldEnableAlerts;
exports.getThresholds = getThresholds;
exports.getAlertConfig = getAlertConfig;
/**
 * Environment-specific monitoring configurations
 */
exports.MONITORING_CONFIG = {
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
exports.LOG_INSIGHTS_QUERIES = {
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
exports.CUSTOM_METRICS = {
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
exports.DASHBOARD_WIDGETS = {
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
function getMonitoringConfig(environment) {
    return exports.MONITORING_CONFIG[environment] || exports.MONITORING_CONFIG.dev;
}
/**
 * Get log retention days for environment
 */
function getLogRetentionDays(environment) {
    const config = getMonitoringConfig(environment);
    return config.logRetention;
}
/**
 * Check if alerts should be enabled for environment
 */
function shouldEnableAlerts(environment) {
    const config = getMonitoringConfig(environment);
    return config.alerts.enabled;
}
/**
 * Get threshold values for environment
 */
function getThresholds(environment) {
    const config = getMonitoringConfig(environment);
    return config.thresholds;
}
/**
 * Get alert configuration for environment
 */
function getAlertConfig(environment) {
    const config = getMonitoringConfig(environment);
    return config.alerts;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9uaXRvcmluZy1jb25maWcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJtb25pdG9yaW5nLWNvbmZpZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7O0dBS0c7OztBQThRSCxrREFFQztBQUtELGtEQUdDO0FBS0QsZ0RBR0M7QUFLRCxzQ0FHQztBQUtELHdDQUdDO0FBclJEOztHQUVHO0FBQ1UsUUFBQSxpQkFBaUIsR0FBc0M7SUFDbEUsVUFBVSxFQUFFO1FBQ1YsVUFBVSxFQUFFO1lBQ1YsU0FBUyxFQUFFLENBQUMsRUFBRSwwQkFBMEI7WUFDeEMsbUJBQW1CLEVBQUUsRUFBRSxFQUFFLDRCQUE0QjtZQUNyRCxnQkFBZ0IsRUFBRSxLQUFLLEVBQUUsYUFBYTtZQUN0QyxVQUFVLEVBQUUsSUFBSSxFQUFFLFlBQVk7WUFDOUIsY0FBYyxFQUFFLEtBQUssRUFBRSxnREFBZ0Q7WUFDdkUsWUFBWSxFQUFFLEVBQUUsRUFBRSxrQ0FBa0M7U0FDckQ7UUFDRCxNQUFNLEVBQUU7WUFDTixPQUFPLEVBQUUsSUFBSTtZQUNiLGlCQUFpQixFQUFFLENBQUM7WUFDcEIsTUFBTSxFQUFFLEdBQUcsRUFBRSxZQUFZO1lBQ3pCLGdCQUFnQixFQUFFLGNBQWM7U0FDakM7UUFDRCxZQUFZLEVBQUUsRUFBRSxFQUFFLFVBQVU7UUFDNUIsZ0JBQWdCLEVBQUUsRUFBRSxFQUFFLFVBQVU7UUFDaEMsd0JBQXdCLEVBQUUsSUFBSTtRQUM5QixpQkFBaUIsRUFBRSxJQUFJO0tBQ3hCO0lBQ0QsT0FBTyxFQUFFO1FBQ1AsVUFBVSxFQUFFO1lBQ1YsU0FBUyxFQUFFLEVBQUUsRUFBRSwyQkFBMkI7WUFDMUMsbUJBQW1CLEVBQUUsRUFBRSxFQUFFLDRCQUE0QjtZQUNyRCxnQkFBZ0IsRUFBRSxLQUFLLEVBQUUsYUFBYTtZQUN0QyxVQUFVLEVBQUUsS0FBSyxFQUFFLGFBQWE7WUFDaEMsY0FBYyxFQUFFLEtBQUssRUFBRSxhQUFhO1lBQ3BDLFlBQVksRUFBRSxF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LCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogTW9uaXRvcmluZyBDb25maWd1cmF0aW9uIGZvciBNSVNSQSBQbGF0Zm9ybVxyXG4gKiBcclxuICogRGVmaW5lcyBtb25pdG9yaW5nIHRocmVzaG9sZHMsIGFsZXJ0IGNvbmZpZ3VyYXRpb25zLCBhbmQgZGFzaGJvYXJkIHNldHRpbmdzXHJcbiAqIGZvciBkaWZmZXJlbnQgZW52aXJvbm1lbnRzIChkZXYsIHN0YWdpbmcsIHByb2R1Y3Rpb24pLlxyXG4gKi9cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgTW9uaXRvcmluZ1RocmVzaG9sZHMge1xyXG4gIGVycm9yUmF0ZTogbnVtYmVyO1xyXG4gIHdvcmtmbG93RmFpbHVyZVJhdGU6IG51bWJlcjtcclxuICBhbmFseXNpc0R1cmF0aW9uOiBudW1iZXI7IC8vIG1pbGxpc2Vjb25kc1xyXG4gIGFwaUxhdGVuY3k6IG51bWJlcjsgLy8gbWlsbGlzZWNvbmRzXHJcbiAgbGFtYmRhRHVyYXRpb246IG51bWJlcjsgLy8gbWlsbGlzZWNvbmRzXHJcbiAgYXV0aEZhaWx1cmVzOiBudW1iZXI7IC8vIGNvdW50IHBlciBwZXJpb2RcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBBbGVydENvbmZpZ3VyYXRpb24ge1xyXG4gIGVuYWJsZWQ6IGJvb2xlYW47XHJcbiAgZXZhbHVhdGlvblBlcmlvZHM6IG51bWJlcjtcclxuICBwZXJpb2Q6IG51bWJlcjsgLy8gc2Vjb25kc1xyXG4gIHRyZWF0TWlzc2luZ0RhdGE6ICdicmVhY2hpbmcnIHwgJ25vdEJyZWFjaGluZycgfCAnaWdub3JlJyB8ICdtaXNzaW5nJztcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBFbnZpcm9ubWVudENvbmZpZyB7XHJcbiAgdGhyZXNob2xkczogTW9uaXRvcmluZ1RocmVzaG9sZHM7XHJcbiAgYWxlcnRzOiBBbGVydENvbmZpZ3VyYXRpb247XHJcbiAgbG9nUmV0ZW50aW9uOiBudW1iZXI7IC8vIGRheXNcclxuICBtZXRyaWNzUmV0ZW50aW9uOiBudW1iZXI7IC8vIGRheXNcclxuICBlbmFibGVEZXRhaWxlZE1vbml0b3Jpbmc6IGJvb2xlYW47XHJcbiAgZW5hYmxlWFJheVRyYWNpbmc6IGJvb2xlYW47XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBFbnZpcm9ubWVudC1zcGVjaWZpYyBtb25pdG9yaW5nIGNvbmZpZ3VyYXRpb25zXHJcbiAqL1xyXG5leHBvcnQgY29uc3QgTU9OSVRPUklOR19DT05GSUc6IFJlY29yZDxzdHJpbmcsIEVudmlyb25tZW50Q29uZmlnPiA9IHtcclxuICBwcm9kdWN0aW9uOiB7XHJcbiAgICB0aHJlc2hvbGRzOiB7XHJcbiAgICAgIGVycm9yUmF0ZTogNSwgLy8gNSUgZXJyb3IgcmF0ZSB0aHJlc2hvbGRcclxuICAgICAgd29ya2Zsb3dGYWlsdXJlUmF0ZTogMTAsIC8vIDEwJSB3b3JrZmxvdyBmYWlsdXJlIHJhdGVcclxuICAgICAgYW5hbHlzaXNEdXJhdGlvbjogNjAwMDAsIC8vIDYwIHNlY29uZHNcclxuICAgICAgYXBpTGF0ZW5jeTogNTAwMCwgLy8gNSBzZWNvbmRzXHJcbiAgICAgIGxhbWJkYUR1cmF0aW9uOiAzMDAwMCwgLy8gMzAgc2Vjb25kcyAoYW5hbHlzaXMgZnVuY3Rpb25zIGdldCBtb3JlIHRpbWUpXHJcbiAgICAgIGF1dGhGYWlsdXJlczogMTAsIC8vIDEwIGZhaWx1cmVzIHBlciA1LW1pbnV0ZSBwZXJpb2RcclxuICAgIH0sXHJcbiAgICBhbGVydHM6IHtcclxuICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDIsXHJcbiAgICAgIHBlcmlvZDogMzAwLCAvLyA1IG1pbnV0ZXNcclxuICAgICAgdHJlYXRNaXNzaW5nRGF0YTogJ25vdEJyZWFjaGluZycsXHJcbiAgICB9LFxyXG4gICAgbG9nUmV0ZW50aW9uOiAzMCwgLy8gMzAgZGF5c1xyXG4gICAgbWV0cmljc1JldGVudGlvbjogOTAsIC8vIDkwIGRheXNcclxuICAgIGVuYWJsZURldGFpbGVkTW9uaXRvcmluZzogdHJ1ZSxcclxuICAgIGVuYWJsZVhSYXlUcmFjaW5nOiB0cnVlLFxyXG4gIH0sXHJcbiAgc3RhZ2luZzoge1xyXG4gICAgdGhyZXNob2xkczoge1xyXG4gICAgICBlcnJvclJhdGU6IDEwLCAvLyAxMCUgZXJyb3IgcmF0ZSB0aHJlc2hvbGRcclxuICAgICAgd29ya2Zsb3dGYWlsdXJlUmF0ZTogMjAsIC8vIDIwJSB3b3JrZmxvdyBmYWlsdXJlIHJhdGVcclxuICAgICAgYW5hbHlzaXNEdXJhdGlvbjogOTAwMDAsIC8vIDkwIHNlY29uZHNcclxuICAgICAgYXBpTGF0ZW5jeTogMTAwMDAsIC8vIDEwIHNlY29uZHNcclxuICAgICAgbGFtYmRhRHVyYXRpb246IDQ1MDAwLCAvLyA0NSBzZWNvbmRzXHJcbiAgICAgIGF1dGhGYWlsdXJlczogMjAsIC8vIDIwIGZhaWx1cmVzIHBlciA1LW1pbnV0ZSBwZXJpb2RcclxuICAgIH0sXHJcbiAgICBhbGVydHM6IHtcclxuICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDMsXHJcbiAgICAgIHBlcmlvZDogMzAwLCAvLyA1IG1pbnV0ZXNcclxuICAgICAgdHJlYXRNaXNzaW5nRGF0YTogJ25vdEJyZWFjaGluZycsXHJcbiAgICB9LFxyXG4gICAgbG9nUmV0ZW50aW9uOiAxNCwgLy8gMTQgZGF5c1xyXG4gICAgbWV0cmljc1JldGVudGlvbjogMzAsIC8vIDMwIGRheXNcclxuICAgIGVuYWJsZURldGFpbGVkTW9uaXRvcmluZzogdHJ1ZSxcclxuICAgIGVuYWJsZVhSYXlUcmFjaW5nOiBmYWxzZSxcclxuICB9LFxyXG4gIGRldjoge1xyXG4gICAgdGhyZXNob2xkczoge1xyXG4gICAgICBlcnJvclJhdGU6IDIwLCAvLyAyMCUgZXJyb3IgcmF0ZSB0aHJlc2hvbGQgKG1vcmUgbGVuaWVudCBmb3IgZGV2KVxyXG4gICAgICB3b3JrZmxvd0ZhaWx1cmVSYXRlOiAzMCwgLy8gMzAlIHdvcmtmbG93IGZhaWx1cmUgcmF0ZVxyXG4gICAgICBhbmFseXNpc0R1cmF0aW9uOiAxMjAwMDAsIC8vIDEyMCBzZWNvbmRzXHJcbiAgICAgIGFwaUxhdGVuY3k6IDE1MDAwLCAvLyAxNSBzZWNvbmRzXHJcbiAgICAgIGxhbWJkYUR1cmF0aW9uOiA2MDAwMCwgLy8gNjAgc2Vjb25kc1xyXG4gICAgICBhdXRoRmFpbHVyZXM6IDUwLCAvLyA1MCBmYWlsdXJlcyBwZXIgNS1taW51dGUgcGVyaW9kXHJcbiAgICB9LFxyXG4gICAgYWxlcnRzOiB7XHJcbiAgICAgIGVuYWJsZWQ6IGZhbHNlLCAvLyBEaXNhYmxlIGFsZXJ0cyBpbiBkZXZcclxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDMsXHJcbiAgICAgIHBlcmlvZDogMzAwLCAvLyA1IG1pbnV0ZXNcclxuICAgICAgdHJlYXRNaXNzaW5nRGF0YTogJ2lnbm9yZScsXHJcbiAgICB9LFxyXG4gICAgbG9nUmV0ZW50aW9uOiA3LCAvLyA3IGRheXNcclxuICAgIG1ldHJpY3NSZXRlbnRpb246IDE0LCAvLyAxNCBkYXlzXHJcbiAgICBlbmFibGVEZXRhaWxlZE1vbml0b3Jpbmc6IGZhbHNlLFxyXG4gICAgZW5hYmxlWFJheVRyYWNpbmc6IGZhbHNlLFxyXG4gIH0sXHJcbn07XHJcblxyXG4vKipcclxuICogQ2xvdWRXYXRjaCBJbnNpZ2h0cyBxdWVyaWVzIGZvciBjb21tb24gZGVidWdnaW5nIHNjZW5hcmlvc1xyXG4gKi9cclxuZXhwb3J0IGNvbnN0IExPR19JTlNJR0hUU19RVUVSSUVTID0ge1xyXG4gIHdvcmtmbG93RXJyb3JzOiB7XHJcbiAgICBuYW1lOiAnV29ya2Zsb3cgRXJyb3JzJyxcclxuICAgIGRlc2NyaXB0aW9uOiAnRmluZCB3b3JrZmxvdyBlcnJvcnMgd2l0aCBjb3JyZWxhdGlvbiBJRHMgZm9yIGRlYnVnZ2luZycsXHJcbiAgICBxdWVyeTogYFxyXG4gICAgICBmaWVsZHMgQHRpbWVzdGFtcCwgQG1lc3NhZ2UsIGNvcnJlbGF0aW9uSWQsIHN0ZXAsIGVycm9yLCB1c2VySWRcclxuICAgICAgfCBmaWx0ZXIgQG1lc3NhZ2UgbGlrZSAvRVJST1IvXHJcbiAgICAgIHwgZmlsdGVyIHN0ZXAgZXhpc3RzXHJcbiAgICAgIHwgc29ydCBAdGltZXN0YW1wIGRlc2NcclxuICAgICAgfCBsaW1pdCAxMDBcclxuICAgIGAsXHJcbiAgfSxcclxuICBhbmFseXNpc1BlcmZvcm1hbmNlOiB7XHJcbiAgICBuYW1lOiAnQW5hbHlzaXMgUGVyZm9ybWFuY2UnLFxyXG4gICAgZGVzY3JpcHRpb246ICdBbmFseXplIE1JU1JBIGFuYWx5c2lzIHBlcmZvcm1hbmNlIG1ldHJpY3MnLFxyXG4gICAgcXVlcnk6IGBcclxuICAgICAgZmllbGRzIEB0aW1lc3RhbXAsIEBtZXNzYWdlLCBhbmFseXNpc0lkLCBkdXJhdGlvbiwgY29tcGxpYW5jZVNjb3JlLCBydWxlc1Byb2Nlc3NlZFxyXG4gICAgICB8IGZpbHRlciBAbWVzc2FnZSBsaWtlIC9BbmFseXNpcyBjb21wbGV0ZWQvIG9yIEBtZXNzYWdlIGxpa2UgL0FuYWx5c2lzIHByb2dyZXNzL1xyXG4gICAgICB8IHN0YXRzIGF2ZyhkdXJhdGlvbiksIG1pbihkdXJhdGlvbiksIG1heChkdXJhdGlvbiksIGNvdW50KCkgYnkgYmluKDVtKVxyXG4gICAgICB8IHNvcnQgQHRpbWVzdGFtcCBkZXNjXHJcbiAgICBgLFxyXG4gIH0sXHJcbiAgYXV0aGVudGljYXRpb25Jc3N1ZXM6IHtcclxuICAgIG5hbWU6ICdBdXRoZW50aWNhdGlvbiBJc3N1ZXMnLFxyXG4gICAgZGVzY3JpcHRpb246ICdUcmFjayBhdXRoZW50aWNhdGlvbiBmYWlsdXJlcyBhbmQgc2VjdXJpdHkgZXZlbnRzJyxcclxuICAgIHF1ZXJ5OiBgXHJcbiAgICAgIGZpZWxkcyBAdGltZXN0YW1wLCBAbWVzc2FnZSwgdXNlcklkLCBlbWFpbCwgY29ycmVsYXRpb25JZCwgYXV0aEV2ZW50LCBzdWNjZXNzXHJcbiAgICAgIHwgZmlsdGVyIEBtZXNzYWdlIGxpa2UgL0F1dGhlbnRpY2F0aW9uLyBhbmQgc3VjY2VzcyA9IGZhbHNlXHJcbiAgICAgIHwgc29ydCBAdGltZXN0YW1wIGRlc2NcclxuICAgICAgfCBsaW1pdCA1MFxyXG4gICAgYCxcclxuICB9LFxyXG4gIG90cFZlcmlmaWNhdGlvblRyYWNraW5nOiB7XHJcbiAgICBuYW1lOiAnT1RQIFZlcmlmaWNhdGlvbiBUcmFja2luZycsXHJcbiAgICBkZXNjcmlwdGlvbjogJ01vbml0b3IgYXV0b21hdGljIE9UUCB2ZXJpZmljYXRpb24gcHJvY2VzcycsXHJcbiAgICBxdWVyeTogYFxyXG4gICAgICBmaWVsZHMgQHRpbWVzdGFtcCwgQG1lc3NhZ2UsIHVzZXJJZCwgY29ycmVsYXRpb25JZCwgc3VjY2Vzcywgc3RlcFxyXG4gICAgICB8IGZpbHRlciBAbWVzc2FnZSBsaWtlIC9PVFAvIG9yIHN0ZXAgbGlrZSAvb3RwL1xyXG4gICAgICB8IHNvcnQgQHRpbWVzdGFtcCBkZXNjXHJcbiAgICAgIHwgbGltaXQgMTAwXHJcbiAgICBgLFxyXG4gIH0sXHJcbiAgZmlsZVVwbG9hZElzc3Vlczoge1xyXG4gICAgbmFtZTogJ0ZpbGUgVXBsb2FkIElzc3VlcycsXHJcbiAgICBkZXNjcmlwdGlvbjogJ0RlYnVnIGZpbGUgdXBsb2FkIHByb2JsZW1zIGFuZCBwZXJmb3JtYW5jZScsXHJcbiAgICBxdWVyeTogYFxyXG4gICAgICBmaWVsZHMgQHRpbWVzdGFtcCwgQG1lc3NhZ2UsIGZpbGVJZCwgZmlsZU5hbWUsIGZpbGVTaXplLCBkdXJhdGlvbiwgZXJyb3JcclxuICAgICAgfCBmaWx0ZXIgQG1lc3NhZ2UgbGlrZSAvdXBsb2FkLyBhbmQgKEBtZXNzYWdlIGxpa2UgL2Vycm9yLyBvciBAbWVzc2FnZSBsaWtlIC9mYWlsZWQvIG9yIGR1cmF0aW9uID4gMTAwMDApXHJcbiAgICAgIHwgc29ydCBAdGltZXN0YW1wIGRlc2NcclxuICAgICAgfCBsaW1pdCA1MFxyXG4gICAgYCxcclxuICB9LFxyXG4gIGNvbXBsaWFuY2VTY29yZUFuYWx5c2lzOiB7XHJcbiAgICBuYW1lOiAnQ29tcGxpYW5jZSBTY29yZSBBbmFseXNpcycsXHJcbiAgICBkZXNjcmlwdGlvbjogJ0FuYWx5emUgY29tcGxpYW5jZSBzY29yZSBkaXN0cmlidXRpb24gYW5kIHRyZW5kcycsXHJcbiAgICBxdWVyeTogYFxyXG4gICAgICBmaWVsZHMgQHRpbWVzdGFtcCwgY29tcGxpYW5jZVNjb3JlLCB2aW9sYXRpb25Db3VudCwgYW5hbHlzaXNJZFxyXG4gICAgICB8IGZpbHRlciBjb21wbGlhbmNlU2NvcmUgZXhpc3RzXHJcbiAgICAgIHwgc3RhdHMgYXZnKGNvbXBsaWFuY2VTY29yZSksIG1pbihjb21wbGlhbmNlU2NvcmUpLCBtYXgoY29tcGxpYW5jZVNjb3JlKSwgY291bnQoKSBieSBiaW4oMWgpXHJcbiAgICAgIHwgc29ydCBAdGltZXN0YW1wIGRlc2NcclxuICAgIGAsXHJcbiAgfSxcclxuICBjb3JyZWxhdGlvblRyYWNpbmc6IHtcclxuICAgIG5hbWU6ICdDb3JyZWxhdGlvbiBJRCBUcmFjaW5nJyxcclxuICAgIGRlc2NyaXB0aW9uOiAnVHJhY2UgY29tcGxldGUgcmVxdWVzdCBmbG93IHVzaW5nIGNvcnJlbGF0aW9uIElEJyxcclxuICAgIHF1ZXJ5OiBgXHJcbiAgICAgIGZpZWxkcyBAdGltZXN0YW1wLCBAbWVzc2FnZSwgY29ycmVsYXRpb25JZCwgc3RlcCwgb3BlcmF0aW9uLCBkdXJhdGlvblxyXG4gICAgICB8IGZpbHRlciBjb3JyZWxhdGlvbklkID0gXCJSRVBMQUNFX1dJVEhfQ09SUkVMQVRJT05fSURcIlxyXG4gICAgICB8IHNvcnQgQHRpbWVzdGFtcCBhc2NcclxuICAgIGAsXHJcbiAgfSxcclxuICBzZWN1cml0eUV2ZW50czoge1xyXG4gICAgbmFtZTogJ1NlY3VyaXR5IEV2ZW50cycsXHJcbiAgICBkZXNjcmlwdGlvbjogJ01vbml0b3Igc2VjdXJpdHkgZXZlbnRzIGFuZCBwb3RlbnRpYWwgdGhyZWF0cycsXHJcbiAgICBxdWVyeTogYFxyXG4gICAgICBmaWVsZHMgQHRpbWVzdGFtcCwgQG1lc3NhZ2UsIHNlY3VyaXR5RXZlbnQsIHNldmVyaXR5LCB1c2VySWQsIHNvdXJjZUlwXHJcbiAgICAgIHwgZmlsdGVyIHNlY3VyaXR5RXZlbnQgZXhpc3RzXHJcbiAgICAgIHwgZmlsdGVyIHNldmVyaXR5IGluIFtcIkhJR0hcIiwgXCJDUklUSUNBTFwiXVxyXG4gICAgICB8IHNvcnQgQHRpbWVzdGFtcCBkZXNjXHJcbiAgICAgIHwgbGltaXQgMTAwXHJcbiAgICBgLFxyXG4gIH0sXHJcbn07XHJcblxyXG4vKipcclxuICogQ3VzdG9tIG1ldHJpYyBkZWZpbml0aW9ucyBmb3IgdGhlIE1JU1JBIFBsYXRmb3JtXHJcbiAqL1xyXG5leHBvcnQgY29uc3QgQ1VTVE9NX01FVFJJQ1MgPSB7XHJcbiAgd29ya2Zsb3c6IFtcclxuICAgICdXb3JrZmxvd1N0YXJ0ZWQnLFxyXG4gICAgJ1dvcmtmbG93Q29tcGxldGVkJyxcclxuICAgICdXb3JrZmxvd0ZhaWxlZCcsXHJcbiAgICAnV29ya2Zsb3dEdXJhdGlvbicsXHJcbiAgXSxcclxuICBhbmFseXNpczogW1xyXG4gICAgJ0FuYWx5c2lzU3RhcnRlZCcsXHJcbiAgICAnQW5hbHlzaXNDb21wbGV0ZWQnLFxyXG4gICAgJ0FuYWx5c2lzRmFpbGVkJyxcclxuICAgICdBbmFseXNpc0R1cmF0aW9uJyxcclxuICAgICdDb21wbGlhbmNlU2NvcmUnLFxyXG4gICAgJ1Zpb2xhdGlvbnNEZXRlY3RlZCcsXHJcbiAgICAnUnVsZXNQcm9jZXNzZWQnLFxyXG4gIF0sXHJcbiAgYXV0aGVudGljYXRpb246IFtcclxuICAgICdBdXRoZW50aWNhdGlvbkF0dGVtcHRzJyxcclxuICAgICdBdXRoZW50aWNhdGlvblN1Y2Nlc3MnLFxyXG4gICAgJ0F1dGhlbnRpY2F0aW9uRmFpbHVyZScsXHJcbiAgICAnT1RQVmVyaWZpY2F0aW9uU3VjY2VzcycsXHJcbiAgICAnT1RQVmVyaWZpY2F0aW9uRmFpbHVyZScsXHJcbiAgXSxcclxuICBmaWxlT3BlcmF0aW9uczogW1xyXG4gICAgJ0ZpbGVVcGxvYWRzJyxcclxuICAgICdGaWxlVXBsb2FkU2l6ZScsXHJcbiAgICAnRmlsZVVwbG9hZER1cmF0aW9uJyxcclxuICAgICdGaWxlRG93bmxvYWRzJyxcclxuICBdLFxyXG4gIHN5c3RlbTogW1xyXG4gICAgJ1N5c3RlbUhlYWx0aCcsXHJcbiAgICAnRXJyb3JSYXRlJyxcclxuICAgICdPcGVyYXRpb25EdXJhdGlvbicsXHJcbiAgICAnU2VjdXJpdHlFdmVudHMnLFxyXG4gIF0sXHJcbn07XHJcblxyXG4vKipcclxuICogRGFzaGJvYXJkIHdpZGdldCBjb25maWd1cmF0aW9uc1xyXG4gKi9cclxuZXhwb3J0IGNvbnN0IERBU0hCT0FSRF9XSURHRVRTID0ge1xyXG4gIHdvcmtmbG93T3ZlcnZpZXc6IHtcclxuICAgIHRpdGxlOiAnV29ya2Zsb3cgT3ZlcnZpZXcnLFxyXG4gICAgdHlwZTogJ21ldHJpYycsXHJcbiAgICBtZXRyaWNzOiBbJ1dvcmtmbG93U3RhcnRlZCcsICdXb3JrZmxvd0NvbXBsZXRlZCcsICdXb3JrZmxvd0ZhaWxlZCddLFxyXG4gICAgcGVyaW9kOiAzMDAsXHJcbiAgICBzdGF0OiAnU3VtJyxcclxuICB9LFxyXG4gIHdvcmtmbG93U3VjY2Vzc1JhdGU6IHtcclxuICAgIHRpdGxlOiAnV29ya2Zsb3cgU3VjY2VzcyBSYXRlJyxcclxuICAgIHR5cGU6ICdzaW5nbGVWYWx1ZScsXHJcbiAgICBleHByZXNzaW9uOiAnKGNvbXBsZXRlZCAvIHN0YXJ0ZWQpICogMTAwJyxcclxuICAgIG1ldHJpY3M6IHsgc3RhcnRlZDogJ1dvcmtmbG93U3RhcnRlZCcsIGNvbXBsZXRlZDogJ1dvcmtmbG93Q29tcGxldGVkJyB9LFxyXG4gIH0sXHJcbiAgYW5hbHlzaXNQZXJmb3JtYW5jZToge1xyXG4gICAgdGl0bGU6ICdBbmFseXNpcyBQZXJmb3JtYW5jZScsXHJcbiAgICB0eXBlOiAnbWV0cmljJyxcclxuICAgIG1ldHJpY3M6IFsnQW5hbHlzaXNTdGFydGVkJywgJ0FuYWx5c2lzQ29tcGxldGVkJywgJ0FuYWx5c2lzRmFpbGVkJywgJ0FuYWx5c2lzRHVyYXRpb24nXSxcclxuICAgIHBlcmlvZDogMzAwLFxyXG4gICAgc3RhdDogJ0F2ZXJhZ2UnLFxyXG4gIH0sXHJcbiAgY29tcGxpYW5jZVNjb3Jlczoge1xyXG4gICAgdGl0bGU6ICdDb21wbGlhbmNlIFNjb3JlcycsXHJcbiAgICB0eXBlOiAnbWV0cmljJyxcclxuICAgIG1ldHJpY3M6IFsnQ29tcGxpYW5jZVNjb3JlJywgJ1Zpb2xhdGlvbnNEZXRlY3RlZCddLFxyXG4gICAgcGVyaW9kOiAzMDAsXHJcbiAgICBzdGF0OiAnQXZlcmFnZScsXHJcbiAgfSxcclxuICBhdXRoZW50aWNhdGlvbk1ldHJpY3M6IHtcclxuICAgIHRpdGxlOiAnQXV0aGVudGljYXRpb24gTWV0cmljcycsXHJcbiAgICB0eXBlOiAnbWV0cmljJyxcclxuICAgIG1ldHJpY3M6IFsnQXV0aGVudGljYXRpb25BdHRlbXB0cycsICdBdXRoZW50aWNhdGlvblN1Y2Nlc3MnLCAnQXV0aGVudGljYXRpb25GYWlsdXJlJ10sXHJcbiAgICBwZXJpb2Q6IDMwMCxcclxuICAgIHN0YXQ6ICdTdW0nLFxyXG4gIH0sXHJcbiAgc3lzdGVtSGVhbHRoOiB7XHJcbiAgICB0aXRsZTogJ1N5c3RlbSBIZWFsdGgnLFxyXG4gICAgdHlwZTogJ3NpbmdsZVZhbHVlJyxcclxuICAgIG1ldHJpY3M6IFsnU3lzdGVtSGVhbHRoJywgJ0Vycm9yUmF0ZSddLFxyXG4gICAgcGVyaW9kOiAzMDAsXHJcbiAgICBzdGF0OiAnQXZlcmFnZScsXHJcbiAgfSxcclxufTtcclxuXHJcbi8qKlxyXG4gKiBHZXQgbW9uaXRvcmluZyBjb25maWd1cmF0aW9uIGZvciBlbnZpcm9ubWVudFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGdldE1vbml0b3JpbmdDb25maWcoZW52aXJvbm1lbnQ6IHN0cmluZyk6IEVudmlyb25tZW50Q29uZmlnIHtcclxuICByZXR1cm4gTU9OSVRPUklOR19DT05GSUdbZW52aXJvbm1lbnRdIHx8IE1PTklUT1JJTkdfQ09ORklHLmRldjtcclxufVxyXG5cclxuLyoqXHJcbiAqIEdldCBsb2cgcmV0ZW50aW9uIGRheXMgZm9yIGVudmlyb25tZW50XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0TG9nUmV0ZW50aW9uRGF5cyhlbnZpcm9ubWVudDogc3RyaW5nKTogbnVtYmVyIHtcclxuICBjb25zdCBjb25maWcgPSBnZXRNb25pdG9yaW5nQ29uZmlnKGVudmlyb25tZW50KTtcclxuICByZXR1cm4gY29uZmlnLmxvZ1JldGVudGlvbjtcclxufVxyXG5cclxuLyoqXHJcbiAqIENoZWNrIGlmIGFsZXJ0cyBzaG91bGQgYmUgZW5hYmxlZCBmb3IgZW52aXJvbm1lbnRcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBzaG91bGRFbmFibGVBbGVydHMoZW52aXJvbm1lbnQ6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gIGNvbnN0IGNvbmZpZyA9IGdldE1vbml0b3JpbmdDb25maWcoZW52aXJvbm1lbnQpO1xyXG4gIHJldHVybiBjb25maWcuYWxlcnRzLmVuYWJsZWQ7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBHZXQgdGhyZXNob2xkIHZhbHVlcyBmb3IgZW52aXJvbm1lbnRcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRUaHJlc2hvbGRzKGVudmlyb25tZW50OiBzdHJpbmcpOiBNb25pdG9yaW5nVGhyZXNob2xkcyB7XHJcbiAgY29uc3QgY29uZmlnID0gZ2V0TW9uaXRvcmluZ0NvbmZpZyhlbnZpcm9ubWVudCk7XHJcbiAgcmV0dXJuIGNvbmZpZy50aHJlc2hvbGRzO1xyXG59XHJcblxyXG4vKipcclxuICogR2V0IGFsZXJ0IGNvbmZpZ3VyYXRpb24gZm9yIGVudmlyb25tZW50XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWxlcnRDb25maWcoZW52aXJvbm1lbnQ6IHN0cmluZyk6IEFsZXJ0Q29uZmlndXJhdGlvbiB7XHJcbiAgY29uc3QgY29uZmlnID0gZ2V0TW9uaXRvcmluZ0NvbmZpZyhlbnZpcm9ubWVudCk7XHJcbiAgcmV0dXJuIGNvbmZpZy5hbGVydHM7XHJcbn0iXX0=