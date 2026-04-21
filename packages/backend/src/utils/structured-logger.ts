import { CloudWatchClient, PutMetricDataCommand, MetricDatum } from '@aws-sdk/client-cloudwatch';

export interface LogContext {
  correlationId?: string;
  userId?: string;
  analysisId?: string;
  fileId?: string;
  step?: string;
  operation?: string;
  [key: string]: any;
}

export interface MetricData {
  metricName: string;
  value: number;
  unit: 'Count' | 'Seconds' | 'Milliseconds' | 'Bytes' | 'Percent' | 'None';
  dimensions?: Record<string, string>;
}

/**
 * Structured Logger with CloudWatch Integration
 * 
 * Provides structured logging with correlation IDs and automatic CloudWatch metrics
 * for the MISRA Platform autonomous workflow monitoring.
 */
export class StructuredLogger {
  private cloudWatch: CloudWatchClient;
  private namespace: string;
  private environment: string;
  private enableMetrics: boolean;

  constructor(
    region: string = process.env.AWS_REGION || 'us-east-1',
    namespace: string = process.env.CLOUDWATCH_NAMESPACE || 'MISRA/Platform',
    environment: string = process.env.ENVIRONMENT || 'dev'
  ) {
    this.cloudWatch = new CloudWatchClient({ region });
    this.namespace = namespace;
    this.environment = environment;
    this.enableMetrics = process.env.ENABLE_CUSTOM_METRICS === 'true';
  }

  /**
   * Generate correlation ID for request tracing
   */
  static generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log structured message with context
   */
  log(level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR', message: string, context: LogContext = {}): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      environment: this.environment,
      ...context,
    };

    // Output structured log
    console.log(JSON.stringify(logEntry));

    // Send metrics for important events
    if (this.enableMetrics && (level === 'ERROR' || level === 'WARN')) {
      this.recordLogMetric(level, context).catch(error => {
        console.error('Failed to record log metric:', error);
      });
    }
  }

  /**
   * Log workflow step with progress tracking
   */
  logWorkflowStep(
    step: string,
    status: 'started' | 'completed' | 'failed',
    context: LogContext = {}
  ): void {
    const message = `Workflow step ${step} ${status}`;
    const level = status === 'failed' ? 'ERROR' : 'INFO';
    
    this.log(level, message, {
      ...context,
      step,
      status,
      workflowStep: true,
    });

    // Record workflow metrics
    if (this.enableMetrics) {
      this.recordWorkflowMetric(step, status, context).catch(error => {
        console.error('Failed to record workflow metric:', error);
      });
    }
  }

  /**
   * Log analysis progress with performance metrics
   */
  logAnalysisProgress(
    analysisId: string,
    progress: number,
    rulesProcessed: number,
    totalRules: number,
    context: LogContext = {}
  ): void {
    this.log('INFO', 'Analysis progress update', {
      ...context,
      analysisId,
      progress,
      rulesProcessed,
      totalRules,
      analysisProgress: true,
    });

    // Record analysis metrics
    if (this.enableMetrics) {
      this.recordAnalysisProgressMetric(progress, rulesProcessed, totalRules).catch(error => {
        console.error('Failed to record analysis progress metric:', error);
      });
    }
  }

  /**
   * Log authentication events with security context
   */
  logAuthEvent(
    event: string,
    success: boolean,
    context: LogContext = {}
  ): void {
    const message = `Authentication ${event} ${success ? 'succeeded' : 'failed'}`;
    const level = success ? 'INFO' : 'WARN';
    
    this.log(level, message, {
      ...context,
      authEvent: event,
      success,
      securityEvent: true,
    });

    // Record auth metrics
    if (this.enableMetrics) {
      this.recordAuthMetric(event, success).catch(error => {
        console.error('Failed to record auth metric:', error);
      });
    }
  }

  /**
   * Log file operations with size and duration
   */
  logFileOperation(
    operation: string,
    fileId: string,
    fileName?: string,
    fileSize?: number,
    duration?: number,
    context: LogContext = {}
  ): void {
    this.log('INFO', `File ${operation} operation`, {
      ...context,
      fileId,
      fileName,
      fileSize,
      duration,
      fileOperation: operation,
    });

    // Record file metrics
    if (this.enableMetrics && fileSize && duration) {
      this.recordFileMetric(operation, fileSize, duration).catch(error => {
        console.error('Failed to record file metric:', error);
      });
    }
  }

  /**
   * Log performance metrics
   */
  logPerformance(
    operation: string,
    duration: number,
    success: boolean,
    context: LogContext = {}
  ): void {
    this.log('INFO', `Performance: ${operation} took ${duration}ms`, {
      ...context,
      operation,
      duration,
      success,
      performanceMetric: true,
    });

    // Record performance metrics
    if (this.enableMetrics) {
      this.recordPerformanceMetric(operation, duration, success).catch(error => {
        console.error('Failed to record performance metric:', error);
      });
    }
  }

  /**
   * Log security events
   */
  logSecurityEvent(
    event: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    context: LogContext = {}
  ): void {
    const level = severity === 'CRITICAL' || severity === 'HIGH' ? 'ERROR' : 'WARN';
    
    this.log(level, `Security event: ${event}`, {
      ...context,
      securityEvent: event,
      severity,
    });

    // Record security metrics
    if (this.enableMetrics) {
      this.recordSecurityMetric(event, severity).catch(error => {
        console.error('Failed to record security metric:', error);
      });
    }
  }

  /**
   * Log compliance score with analysis details
   */
  logComplianceScore(
    complianceScore: number,
    analysisId: string,
    violationCount: number,
    context: LogContext = {}
  ): void {
    this.log('INFO', `Compliance analysis completed: ${complianceScore}% score`, {
      ...context,
      analysisId,
      complianceScore,
      violationCount,
      complianceResult: true,
    });

    // Record compliance metrics
    if (this.enableMetrics) {
      this.recordComplianceMetric(complianceScore, violationCount).catch(error => {
        console.error('Failed to record compliance metric:', error);
      });
    }
  }

  /**
   * Record custom metric to CloudWatch
   */
  async recordMetric(metricData: MetricData): Promise<void> {
    if (!this.enableMetrics) return;

    try {
      const metricDatum: MetricDatum = {
        MetricName: metricData.metricName,
        Value: metricData.value,
        Unit: metricData.unit,
        Timestamp: new Date(),
      };

      if (metricData.dimensions) {
        metricDatum.Dimensions = Object.entries(metricData.dimensions).map(([name, value]) => ({
          Name: name,
          Value: value,
        }));
      }

      const command = new PutMetricDataCommand({
        Namespace: this.namespace,
        MetricData: [metricDatum],
      });

      await this.cloudWatch.send(command);
    } catch (error) {
      console.error('Failed to record metric:', error);
    }
  }

  private async recordLogMetric(level: string, context: LogContext): Promise<void> {
    await this.recordMetric({
      metricName: 'LogEvents',
      value: 1,
      unit: 'Count',
      dimensions: {
        Level: level,
        Environment: this.environment,
        ...(context.step && { Step: context.step }),
        ...(context.operation && { Operation: context.operation }),
      },
    });
  }

  private async recordWorkflowMetric(
    step: string,
    status: string,
    context: LogContext
  ): Promise<void> {
    await this.recordMetric({
      metricName: `Workflow${status.charAt(0).toUpperCase() + status.slice(1)}`,
      value: 1,
      unit: 'Count',
      dimensions: {
        Step: step,
        Environment: this.environment,
      },
    });
  }

  private async recordAnalysisProgressMetric(
    progress: number,
    rulesProcessed: number,
    totalRules: number
  ): Promise<void> {
    await Promise.all([
      this.recordMetric({
        metricName: 'AnalysisProgress',
        value: progress,
        unit: 'Percent',
        dimensions: { Environment: this.environment },
      }),
      this.recordMetric({
        metricName: 'RulesProcessed',
        value: rulesProcessed,
        unit: 'Count',
        dimensions: { Environment: this.environment },
      }),
    ]);
  }

  private async recordAuthMetric(event: string, success: boolean): Promise<void> {
    await this.recordMetric({
      metricName: success ? 'AuthenticationSuccess' : 'AuthenticationFailure',
      value: 1,
      unit: 'Count',
      dimensions: {
        Event: event,
        Environment: this.environment,
      },
    });
  }

  private async recordFileMetric(
    operation: string,
    fileSize: number,
    duration: number
  ): Promise<void> {
    await Promise.all([
      this.recordMetric({
        metricName: 'FileOperations',
        value: 1,
        unit: 'Count',
        dimensions: {
          Operation: operation,
          Environment: this.environment,
        },
      }),
      this.recordMetric({
        metricName: 'FileSize',
        value: fileSize,
        unit: 'Bytes',
        dimensions: {
          Operation: operation,
          Environment: this.environment,
        },
      }),
      this.recordMetric({
        metricName: 'FileOperationDuration',
        value: duration,
        unit: 'Milliseconds',
        dimensions: {
          Operation: operation,
          Environment: this.environment,
        },
      }),
    ]);
  }

  private async recordPerformanceMetric(
    operation: string,
    duration: number,
    success: boolean
  ): Promise<void> {
    await this.recordMetric({
      metricName: 'OperationDuration',
      value: duration,
      unit: 'Milliseconds',
      dimensions: {
        Operation: operation,
        Success: success.toString(),
        Environment: this.environment,
      },
    });
  }

  private async recordSecurityMetric(event: string, severity: string): Promise<void> {
    await this.recordMetric({
      metricName: 'SecurityEvents',
      value: 1,
      unit: 'Count',
      dimensions: {
        Event: event,
        Severity: severity,
        Environment: this.environment,
      },
    });
  }

  private async recordComplianceMetric(
    complianceScore: number,
    violationCount: number
  ): Promise<void> {
    await Promise.all([
      this.recordMetric({
        metricName: 'ComplianceScore',
        value: complianceScore,
        unit: 'Percent',
        dimensions: { Environment: this.environment },
      }),
      this.recordMetric({
        metricName: 'ViolationsDetected',
        value: violationCount,
        unit: 'Count',
        dimensions: { Environment: this.environment },
      }),
    ]);
  }
}

// Export singleton instance for use across the application
export const structuredLogger = new StructuredLogger();

// Export utility functions
export const LoggingUtils = {
  generateCorrelationId: StructuredLogger.generateCorrelationId,
  
  logWorkflowStep: (step: string, status: 'started' | 'completed' | 'failed', context: LogContext = {}) => {
    structuredLogger.logWorkflowStep(step, status, context);
  },
  
  logAnalysisProgress: (analysisId: string, progress: number, rulesProcessed: number, totalRules: number, context: LogContext = {}) => {
    structuredLogger.logAnalysisProgress(analysisId, progress, rulesProcessed, totalRules, context);
  },
  
  logAuthEvent: (event: string, success: boolean, context: LogContext = {}) => {
    structuredLogger.logAuthEvent(event, success, context);
  },
  
  logFileOperation: (operation: string, fileId: string, fileName?: string, fileSize?: number, duration?: number, context: LogContext = {}) => {
    structuredLogger.logFileOperation(operation, fileId, fileName, fileSize, duration, context);
  },
  
  logPerformance: (operation: string, duration: number, success: boolean, context: LogContext = {}) => {
    structuredLogger.logPerformance(operation, duration, success, context);
  },
  
  logSecurityEvent: (event: string, severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL', context: LogContext = {}) => {
    structuredLogger.logSecurityEvent(event, severity, context);
  },
  
  logComplianceScore: (complianceScore: number, analysisId: string, violationCount: number, context: LogContext = {}) => {
    structuredLogger.logComplianceScore(complianceScore, analysisId, violationCount, context);
  },
};