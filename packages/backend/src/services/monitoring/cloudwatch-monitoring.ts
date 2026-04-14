/**
 * CloudWatch Monitoring Service
 * Provides comprehensive monitoring and alerting for production error handling
 */

import { CloudWatchClient, PutMetricDataCommand, MetricDatum } from '@aws-sdk/client-cloudwatch';
import { Logger, createLogger } from '../../utils/logger';

export interface MetricData {
  metricName: string;
  value: number;
  unit: 'Count' | 'Seconds' | 'Milliseconds' | 'Bytes' | 'Percent' | 'None';
  dimensions?: Record<string, string>;
  timestamp?: Date;
}

export interface AlarmConfig {
  alarmName: string;
  metricName: string;
  threshold: number;
  comparisonOperator: 'GreaterThanThreshold' | 'LessThanThreshold' | 'GreaterThanOrEqualToThreshold' | 'LessThanOrEqualToThreshold';
  evaluationPeriods: number;
  period: number;
  statistic: 'Average' | 'Sum' | 'Maximum' | 'Minimum' | 'SampleCount';
}

/**
 * CloudWatch monitoring service for production error handling
 */
export class CloudWatchMonitoringService {
  private cloudWatchClient: CloudWatchClient;
  private logger: Logger;
  private namespace: string;

  constructor(region: string = 'us-east-1', namespace: string = 'MISRA/Production') {
    this.cloudWatchClient = new CloudWatchClient({ region });
    this.logger = createLogger('CloudWatchMonitoringService');
    this.namespace = namespace;
  }

  /**
   * Put custom metric to CloudWatch
   */
  async putMetric(metric: MetricData): Promise<void> {
    try {
      const metricDatum: MetricDatum = {
        MetricName: metric.metricName,
        Value: metric.value,
        Unit: metric.unit,
        Timestamp: metric.timestamp || new Date()
      };

      // Add dimensions if provided
      if (metric.dimensions) {
        metricDatum.Dimensions = Object.entries(metric.dimensions).map(([name, value]) => ({
          Name: name,
          Value: value
        }));
      }

      const command = new PutMetricDataCommand({
        Namespace: this.namespace,
        MetricData: [metricDatum]
      });

      await this.cloudWatchClient.send(command);
      
      this.logger.debug('Metric sent to CloudWatch', {
        metricName: metric.metricName,
        value: metric.value,
        unit: metric.unit,
        dimensions: metric.dimensions
      });
    } catch (error) {
      this.logger.error('Failed to send metric to CloudWatch', error as Error, {
        metricName: metric.metricName,
        value: metric.value
      });
      // Don't throw - monitoring failures shouldn't break the application
    }
  }

  /**
   * Put multiple metrics to CloudWatch
   */
  async putMetrics(metrics: MetricData[]): Promise<void> {
    try {
      const metricData: MetricDatum[] = metrics.map(metric => ({
        MetricName: metric.metricName,
        Value: metric.value,
        Unit: metric.unit,
        Timestamp: metric.timestamp || new Date(),
        Dimensions: metric.dimensions ? Object.entries(metric.dimensions).map(([name, value]) => ({
          Name: name,
          Value: value
        })) : undefined
      }));

      const command = new PutMetricDataCommand({
        Namespace: this.namespace,
        MetricData: metricData
      });

      await this.cloudWatchClient.send(command);
      
      this.logger.debug('Multiple metrics sent to CloudWatch', {
        count: metrics.length,
        metrics: metrics.map(m => m.metricName)
      });
    } catch (error) {
      this.logger.error('Failed to send metrics to CloudWatch', error as Error, {
        count: metrics.length
      });
    }
  }

  /**
   * Record error metrics
   */
  async recordError(
    errorType: string,
    serviceName: string,
    errorCode?: string,
    userId?: string
  ): Promise<void> {
    const metrics: MetricData[] = [
      {
        metricName: 'ErrorCount',
        value: 1,
        unit: 'Count',
        dimensions: {
          Service: serviceName,
          ErrorType: errorType,
          ...(errorCode && { ErrorCode: errorCode })
        }
      }
    ];

    // Add user-specific error metric if userId provided
    if (userId) {
      metrics.push({
        metricName: 'UserErrorCount',
        value: 1,
        unit: 'Count',
        dimensions: {
          Service: serviceName,
          ErrorType: errorType,
          UserId: userId
        }
      });
    }

    await this.putMetrics(metrics);
  }

  /**
   * Record performance metrics
   */
  async recordPerformance(
    operationName: string,
    duration: number,
    serviceName: string,
    success: boolean = true
  ): Promise<void> {
    const metrics: MetricData[] = [
      {
        metricName: 'OperationDuration',
        value: duration,
        unit: 'Milliseconds',
        dimensions: {
          Service: serviceName,
          Operation: operationName,
          Status: success ? 'Success' : 'Failure'
        }
      },
      {
        metricName: 'OperationCount',
        value: 1,
        unit: 'Count',
        dimensions: {
          Service: serviceName,
          Operation: operationName,
          Status: success ? 'Success' : 'Failure'
        }
      }
    ];

    await this.putMetrics(metrics);
  }

  /**
   * Record circuit breaker metrics
   */
  async recordCircuitBreakerState(
    serviceName: string,
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN',
    failureCount: number,
    successCount: number
  ): Promise<void> {
    const metrics: MetricData[] = [
      {
        metricName: 'CircuitBreakerState',
        value: state === 'CLOSED' ? 0 : state === 'HALF_OPEN' ? 1 : 2,
        unit: 'None',
        dimensions: {
          Service: serviceName,
          State: state
        }
      },
      {
        metricName: 'CircuitBreakerFailures',
        value: failureCount,
        unit: 'Count',
        dimensions: {
          Service: serviceName
        }
      },
      {
        metricName: 'CircuitBreakerSuccesses',
        value: successCount,
        unit: 'Count',
        dimensions: {
          Service: serviceName
        }
      }
    ];

    await this.putMetrics(metrics);
  }

  /**
   * Record retry metrics
   */
  async recordRetryAttempt(
    operationName: string,
    attemptNumber: number,
    success: boolean,
    serviceName: string
  ): Promise<void> {
    const metrics: MetricData[] = [
      {
        metricName: 'RetryAttempts',
        value: attemptNumber,
        unit: 'Count',
        dimensions: {
          Service: serviceName,
          Operation: operationName,
          Success: success.toString()
        }
      }
    ];

    if (success && attemptNumber > 1) {
      metrics.push({
        metricName: 'RetrySuccess',
        value: 1,
        unit: 'Count',
        dimensions: {
          Service: serviceName,
          Operation: operationName,
          AttemptNumber: attemptNumber.toString()
        }
      });
    }

    await this.putMetrics(metrics);
  }

  /**
   * Record user activity metrics
   */
  async recordUserActivity(
    activityType: string,
    userId: string,
    organizationId?: string
  ): Promise<void> {
    const metrics: MetricData[] = [
      {
        metricName: 'UserActivity',
        value: 1,
        unit: 'Count',
        dimensions: {
          ActivityType: activityType,
          UserId: userId,
          ...(organizationId && { OrganizationId: organizationId })
        }
      }
    ];

    await this.putMetrics(metrics);
  }

  /**
   * Record system health metrics
   */
  async recordSystemHealth(
    serviceName: string,
    isHealthy: boolean,
    responseTime?: number
  ): Promise<void> {
    const metrics: MetricData[] = [
      {
        metricName: 'ServiceHealth',
        value: isHealthy ? 1 : 0,
        unit: 'None',
        dimensions: {
          Service: serviceName
        }
      }
    ];

    if (responseTime !== undefined) {
      metrics.push({
        metricName: 'HealthCheckDuration',
        value: responseTime,
        unit: 'Milliseconds',
        dimensions: {
          Service: serviceName
        }
      });
    }

    await this.putMetrics(metrics);
  }

  /**
   * Create custom dashboard for monitoring
   */
  getDashboardConfig(): any {
    return {
      widgets: [
        {
          type: 'metric',
          properties: {
            metrics: [
              [this.namespace, 'ErrorCount', 'Service', 'analysis-service'],
              [this.namespace, 'ErrorCount', 'Service', 'file-upload-service'],
              [this.namespace, 'ErrorCount', 'Service', 'auth-service']
            ],
            period: 300,
            stat: 'Sum',
            region: 'us-east-1',
            title: 'Error Count by Service'
          }
        },
        {
          type: 'metric',
          properties: {
            metrics: [
              [this.namespace, 'OperationDuration', 'Service', 'analysis-service'],
              [this.namespace, 'OperationDuration', 'Service', 'file-upload-service'],
              [this.namespace, 'OperationDuration', 'Service', 'auth-service']
            ],
            period: 300,
            stat: 'Average',
            region: 'us-east-1',
            title: 'Average Response Time by Service'
          }
        },
        {
          type: 'metric',
          properties: {
            metrics: [
              [this.namespace, 'CircuitBreakerState', 'Service', 'analysis-service'],
              [this.namespace, 'CircuitBreakerState', 'Service', 'file-upload-service'],
              [this.namespace, 'CircuitBreakerState', 'Service', 'auth-service']
            ],
            period: 300,
            stat: 'Maximum',
            region: 'us-east-1',
            title: 'Circuit Breaker States'
          }
        },
        {
          type: 'metric',
          properties: {
            metrics: [
              [this.namespace, 'ServiceHealth', 'Service', 'analysis-service'],
              [this.namespace, 'ServiceHealth', 'Service', 'file-upload-service'],
              [this.namespace, 'ServiceHealth', 'Service', 'auth-service']
            ],
            period: 300,
            stat: 'Average',
            region: 'us-east-1',
            title: 'Service Health Status'
          }
        }
      ]
    };
  }

  /**
   * Get recommended alarms configuration
   */
  getRecommendedAlarms(): AlarmConfig[] {
    return [
      {
        alarmName: 'HighErrorRate',
        metricName: 'ErrorCount',
        threshold: 10,
        comparisonOperator: 'GreaterThanThreshold',
        evaluationPeriods: 2,
        period: 300,
        statistic: 'Sum'
      },
      {
        alarmName: 'HighResponseTime',
        metricName: 'OperationDuration',
        threshold: 5000,
        comparisonOperator: 'GreaterThanThreshold',
        evaluationPeriods: 3,
        period: 300,
        statistic: 'Average'
      },
      {
        alarmName: 'CircuitBreakerOpen',
        metricName: 'CircuitBreakerState',
        threshold: 1.5,
        comparisonOperator: 'GreaterThanThreshold',
        evaluationPeriods: 1,
        period: 300,
        statistic: 'Maximum'
      },
      {
        alarmName: 'ServiceUnhealthy',
        metricName: 'ServiceHealth',
        threshold: 0.5,
        comparisonOperator: 'LessThanThreshold',
        evaluationPeriods: 2,
        period: 300,
        statistic: 'Average'
      }
    ];
  }
}

// Global CloudWatch monitoring service instance
export const cloudWatchMonitoringService = new CloudWatchMonitoringService();