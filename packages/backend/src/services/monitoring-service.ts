import { CloudWatch } from 'aws-sdk';
import { CentralizedLogger, LoggingUtils } from '../utils/centralized-logger';

export interface MetricData {
  MetricName: string;
  Value: number;
  Unit: string;
  Timestamp?: Date;
  Dimensions?: Array<{
    Name: string;
    Value: string;
  }>;
}

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  details?: Record<string, any>;
  timestamp: Date;
}

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  success: boolean;
  errorType?: string;
  metadata?: Record<string, any>;
}

/**
 * Comprehensive Monitoring Service for MISRA Platform
 * 
 * Provides centralized monitoring, metrics collection, and health checking
 * for all platform components. Integrates with CloudWatch for alerting
 * and dashboard visualization.
 * 
 * Features:
 * - Custom metrics publishing to CloudWatch
 * - Health check monitoring for all services
 * - Performance metrics collection and analysis
 * - Business KPI tracking
 * - Security event monitoring
 * - Anomaly detection and alerting
 */
export class MonitoringService {
  private cloudWatch: CloudWatch;
  private logger: CentralizedLogger;
  private namespace: string;

  constructor(region: string = 'us-east-1', namespace: string = 'MISRA/Platform') {
    this.cloudWatch = new CloudWatch({ region });
    this.logger = CentralizedLogger.getInstance();
    this.namespace = namespace;
  }

  /**
   * Publish custom metric to CloudWatch
   */
  async publishMetric(metricData: MetricData): Promise<void> {
    try {
      const params = {
        Namespace: this.namespace,
        MetricData: [{
          MetricName: metricData.MetricName,
          Value: metricData.Value,
          Unit: metricData.Unit,
          Timestamp: metricData.Timestamp || new Date(),
          Dimensions: metricData.Dimensions || [],
        }],
      };

      await this.cloudWatch.putMetricData(params).promise();
      
      this.logger.debug('Metric published to CloudWatch', {
        metricName: metricData.MetricName,
        value: metricData.Value,
        unit: metricData.Unit,
      });
    } catch (error) {
      this.logger.error('Failed to publish metric to CloudWatch', error as Error, {
        metricName: metricData.MetricName,
      });
    }
  }

  /**
   * Publish multiple metrics in batch
   */
  async publishMetrics(metrics: MetricData[]): Promise<void> {
    try {
      const params = {
        Namespace: this.namespace,
        MetricData: metrics.map(metric => ({
          MetricName: metric.MetricName,
          Value: metric.Value,
          Unit: metric.Unit,
          Timestamp: metric.Timestamp || new Date(),
          Dimensions: metric.Dimensions || [],
        })),
      };

      await this.cloudWatch.putMetricData(params).promise();
      
      this.logger.debug('Batch metrics published to CloudWatch', {
        count: metrics.length,
        metrics: metrics.map(m => m.MetricName),
      });
    } catch (error) {
      this.logger.error('Failed to publish batch metrics to CloudWatch', error as Error, {
        count: metrics.length,
      });
    }
  }

  /**
   * Record business metrics
   */
  async recordBusinessMetric(name: string, value: number, dimensions?: Record<string, string>): Promise<void> {
    const metricData: MetricData = {
      MetricName: name,
      Value: value,
      Unit: 'Count',
      Dimensions: dimensions ? Object.entries(dimensions).map(([key, val]) => ({
        Name: key,
        Value: val,
      })) : undefined,
    };

    await this.publishMetric(metricData);
    this.logger.logBusinessMetric(name, value, 'Count', dimensions);
  }

  /**
   * Record performance metrics
   */
  async recordPerformanceMetric(metrics: PerformanceMetrics): Promise<void> {
    const metricData: MetricData = {
      MetricName: `${metrics.operation}_Duration`,
      Value: metrics.duration,
      Unit: 'Milliseconds',
      Dimensions: [
        { Name: 'Operation', Value: metrics.operation },
        { Name: 'Success', Value: metrics.success.toString() },
      ],
    };

    if (metrics.errorType) {
      metricData.Dimensions?.push({ Name: 'ErrorType', Value: metrics.errorType });
    }

    await this.publishMetric(metricData);
    this.logger.logPerformanceMetric(metrics.operation, metrics.duration, {
      success: metrics.success,
      errorType: metrics.errorType,
      ...metrics.metadata,
    });
  }

  /**
   * Record user journey metrics
   */
  async recordUserJourney(step: string, status: 'started' | 'completed' | 'failed', userId?: string, duration?: number): Promise<void> {
    const metrics: MetricData[] = [
      {
        MetricName: `UserJourney_${step}_${status}`,
        Value: 1,
        Unit: 'Count',
        Dimensions: [
          { Name: 'Step', Value: step },
          { Name: 'Status', Value: status },
        ],
      },
    ];

    if (duration && status === 'completed') {
      metrics.push({
        MetricName: `UserJourney_${step}_Duration`,
        Value: duration,
        Unit: 'Milliseconds',
        Dimensions: [
          { Name: 'Step', Value: step },
        ],
      });
    }

    await this.publishMetrics(metrics);
    this.logger.logUserJourney(step, status, { userId, duration });
  }

  /**
   * Record analysis metrics
   */
  async recordAnalysisMetrics(analysisId: string, fileId: string, complianceScore: number, violationCount: number, duration: number, success: boolean): Promise<void> {
    const metrics: MetricData[] = [
      {
        MetricName: success ? 'AnalysisCompleted' : 'AnalysisFailed',
        Value: 1,
        Unit: 'Count',
        Dimensions: [
          { Name: 'Success', Value: success.toString() },
        ],
      },
    ];

    if (success) {
      metrics.push(
        {
          MetricName: 'ComplianceScore',
          Value: complianceScore,
          Unit: 'Percent',
        },
        {
          MetricName: 'ViolationsDetected',
          Value: violationCount,
          Unit: 'Count',
        },
        {
          MetricName: 'AnalysisDuration',
          Value: duration,
          Unit: 'Milliseconds',
        }
      );
    }

    await this.publishMetrics(metrics);
    
    if (success) {
      LoggingUtils.logComplianceScore(this.logger, complianceScore, analysisId, violationCount);
    }
    
    LoggingUtils.logAnalysisOperation(this.logger, success ? 'completed' : 'failed', analysisId, fileId, duration);
  }

  /**
   * Record authentication metrics
   */
  async recordAuthMetrics(event: string, success: boolean, userId?: string, method?: string): Promise<void> {
    const metricData: MetricData = {
      MetricName: success ? 'AuthenticationSuccess' : 'AuthenticationFailure',
      Value: 1,
      Unit: 'Count',
      Dimensions: [
        { Name: 'Event', Value: event },
        { Name: 'Success', Value: success.toString() },
      ],
    };

    if (method) {
      metricData.Dimensions?.push({ Name: 'Method', Value: method });
    }

    await this.publishMetric(metricData);
    LoggingUtils.logAuthEvent(this.logger, event, userId, success);
  }

  /**
   * Record file operation metrics
   */
  async recordFileMetrics(operation: string, fileId: string, fileSize?: number, success: boolean = true, duration?: number): Promise<void> {
    const metrics: MetricData[] = [
      {
        MetricName: `File${operation}`,
        Value: 1,
        Unit: 'Count',
        Dimensions: [
          { Name: 'Operation', Value: operation },
          { Name: 'Success', Value: success.toString() },
        ],
      },
    ];

    if (fileSize) {
      metrics.push({
        MetricName: 'FileSize',
        Value: fileSize,
        Unit: 'Bytes',
        Dimensions: [
          { Name: 'Operation', Value: operation },
        ],
      });
    }

    if (duration) {
      metrics.push({
        MetricName: `File${operation}Duration`,
        Value: duration,
        Unit: 'Milliseconds',
        Dimensions: [
          { Name: 'Operation', Value: operation },
        ],
      });
    }

    await this.publishMetrics(metrics);
    LoggingUtils.logFileOperation(this.logger, operation, fileId, undefined, fileSize);
  }

  /**
   * Record security events
   */
  async recordSecurityEvent(event: string, severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL', userId?: string, details?: Record<string, any>): Promise<void> {
    const metricData: MetricData = {
      MetricName: 'SecurityEvent',
      Value: 1,
      Unit: 'Count',
      Dimensions: [
        { Name: 'Event', Value: event },
        { Name: 'Severity', Value: severity },
      ],
    };

    await this.publishMetric(metricData);
    this.logger.logSecurityEvent(event, severity, { userId, ...details });
  }

  /**
   * Perform health check on service
   */
  async performHealthCheck(serviceName: string, healthCheckFn: () => Promise<any>): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const result = await healthCheckFn();
      const responseTime = Date.now() - startTime;
      
      const healthResult: HealthCheckResult = {
        service: serviceName,
        status: 'healthy',
        responseTime,
        details: result,
        timestamp: new Date(),
      };

      await this.recordHealthCheck(healthResult);
      return healthResult;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      const healthResult: HealthCheckResult = {
        service: serviceName,
        status: 'unhealthy',
        responseTime,
        details: { error: (error as Error).message },
        timestamp: new Date(),
      };

      await this.recordHealthCheck(healthResult);
      return healthResult;
    }
  }

  /**
   * Record health check results
   */
  private async recordHealthCheck(result: HealthCheckResult): Promise<void> {
    const metrics: MetricData[] = [
      {
        MetricName: 'HealthCheck',
        Value: result.status === 'healthy' ? 1 : 0,
        Unit: 'Count',
        Dimensions: [
          { Name: 'Service', Value: result.service },
          { Name: 'Status', Value: result.status },
        ],
      },
      {
        MetricName: 'HealthCheckResponseTime',
        Value: result.responseTime,
        Unit: 'Milliseconds',
        Dimensions: [
          { Name: 'Service', Value: result.service },
        ],
      },
    ];

    await this.publishMetrics(metrics);
    
    this.logger.info(`Health check: ${result.service}`, {
      service: result.service,
      status: result.status,
      responseTime: result.responseTime,
      details: result.details,
    });
  }

  /**
   * Monitor API Gateway metrics
   */
  async monitorApiGateway(apiName: string, method: string, resource: string, statusCode: number, latency: number): Promise<void> {
    const metrics: MetricData[] = [
      {
        MetricName: 'APIRequest',
        Value: 1,
        Unit: 'Count',
        Dimensions: [
          { Name: 'API', Value: apiName },
          { Name: 'Method', Value: method },
          { Name: 'Resource', Value: resource },
          { Name: 'StatusCode', Value: statusCode.toString() },
        ],
      },
      {
        MetricName: 'APILatency',
        Value: latency,
        Unit: 'Milliseconds',
        Dimensions: [
          { Name: 'API', Value: apiName },
          { Name: 'Method', Value: method },
          { Name: 'Resource', Value: resource },
        ],
      },
    ];

    // Record error metrics for 4xx and 5xx responses
    if (statusCode >= 400) {
      metrics.push({
        MetricName: statusCode >= 500 ? 'API5XXError' : 'API4XXError',
        Value: 1,
        Unit: 'Count',
        Dimensions: [
          { Name: 'API', Value: apiName },
          { Name: 'Method', Value: method },
          { Name: 'Resource', Value: resource },
          { Name: 'StatusCode', Value: statusCode.toString() },
        ],
      });
    }

    await this.publishMetrics(metrics);
  }

  /**
   * Monitor Lambda function metrics
   */
  async monitorLambdaFunction(functionName: string, duration: number, memoryUsed: number, success: boolean, errorType?: string): Promise<void> {
    const metrics: MetricData[] = [
      {
        MetricName: 'LambdaInvocation',
        Value: 1,
        Unit: 'Count',
        Dimensions: [
          { Name: 'FunctionName', Value: functionName },
          { Name: 'Success', Value: success.toString() },
        ],
      },
      {
        MetricName: 'LambdaDuration',
        Value: duration,
        Unit: 'Milliseconds',
        Dimensions: [
          { Name: 'FunctionName', Value: functionName },
        ],
      },
      {
        MetricName: 'LambdaMemoryUsed',
        Value: memoryUsed,
        Unit: 'Megabytes',
        Dimensions: [
          { Name: 'FunctionName', Value: functionName },
        ],
      },
    ];

    if (!success && errorType) {
      metrics.push({
        MetricName: 'LambdaError',
        Value: 1,
        Unit: 'Count',
        Dimensions: [
          { Name: 'FunctionName', Value: functionName },
          { Name: 'ErrorType', Value: errorType },
        ],
      });
    }

    await this.publishMetrics(metrics);
  }

  /**
   * Monitor DynamoDB operations
   */
  async monitorDynamoDBOperation(tableName: string, operation: string, success: boolean, duration: number, itemCount?: number): Promise<void> {
    const metrics: MetricData[] = [
      {
        MetricName: 'DynamoDBOperation',
        Value: 1,
        Unit: 'Count',
        Dimensions: [
          { Name: 'TableName', Value: tableName },
          { Name: 'Operation', Value: operation },
          { Name: 'Success', Value: success.toString() },
        ],
      },
      {
        MetricName: 'DynamoDBOperationDuration',
        Value: duration,
        Unit: 'Milliseconds',
        Dimensions: [
          { Name: 'TableName', Value: tableName },
          { Name: 'Operation', Value: operation },
        ],
      },
    ];

    if (itemCount !== undefined) {
      metrics.push({
        MetricName: 'DynamoDBItemCount',
        Value: itemCount,
        Unit: 'Count',
        Dimensions: [
          { Name: 'TableName', Value: tableName },
          { Name: 'Operation', Value: operation },
        ],
      });
    }

    await this.publishMetrics(metrics);
  }

  /**
   * Monitor S3 operations
   */
  async monitorS3Operation(bucketName: string, operation: string, success: boolean, duration: number, objectSize?: number): Promise<void> {
    const metrics: MetricData[] = [
      {
        MetricName: 'S3Operation',
        Value: 1,
        Unit: 'Count',
        Dimensions: [
          { Name: 'BucketName', Value: bucketName },
          { Name: 'Operation', Value: operation },
          { Name: 'Success', Value: success.toString() },
        ],
      },
      {
        MetricName: 'S3OperationDuration',
        Value: duration,
        Unit: 'Milliseconds',
        Dimensions: [
          { Name: 'BucketName', Value: bucketName },
          { Name: 'Operation', Value: operation },
        ],
      },
    ];

    if (objectSize !== undefined) {
      metrics.push({
        MetricName: 'S3ObjectSize',
        Value: objectSize,
        Unit: 'Bytes',
        Dimensions: [
          { Name: 'BucketName', Value: bucketName },
          { Name: 'Operation', Value: operation },
        ],
      });
    }

    await this.publishMetrics(metrics);
  }

  /**
   * Create comprehensive system health report
   */
  async createHealthReport(): Promise<{
    overall: 'healthy' | 'degraded' | 'unhealthy';
    services: HealthCheckResult[];
    timestamp: Date;
  }> {
    const services: HealthCheckResult[] = [];
    
    // Add health checks for all services
    // This would be expanded based on actual service dependencies
    
    const overallStatus = services.every(s => s.status === 'healthy') ? 'healthy' :
                         services.some(s => s.status === 'unhealthy') ? 'unhealthy' : 'degraded';

    return {
      overall: overallStatus,
      services,
      timestamp: new Date(),
    };
  }
}

// Export singleton instance
export const monitoringService = new MonitoringService();