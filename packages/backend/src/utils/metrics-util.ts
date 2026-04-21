/**
 * Custom Metrics Utility for Production Lambda Functions
 * Provides CloudWatch custom metrics integration and performance monitoring
 */

import { CloudWatch } from 'aws-sdk';
import { Logger, createLogger } from './logger';

export interface MetricData {
  name: string;
  value: number;
  unit: string;
  dimensions?: { [key: string]: string };
  timestamp?: Date;
}

export interface PerformanceMetrics {
  functionName: string;
  duration: number;
  memoryUsed: number;
  coldStart: boolean;
  correlationId?: string;
}

export class MetricsCollector {
  private cloudWatch: CloudWatch;
  private logger: Logger;
  private namespace: string;
  private metricsBuffer: MetricData[] = [];
  private bufferSize: number;
  private flushInterval: number;
  private flushTimer?: NodeJS.Timeout;

  constructor(
    namespace: string = 'MISRA/Platform',
    bufferSize: number = 10,
    flushInterval: number = 30000 // 30 seconds
  ) {
    this.cloudWatch = new CloudWatch({ region: process.env.AWS_REGION || 'us-east-1' });
    this.logger = createLogger('metrics-collector');
    this.namespace = namespace;
    this.bufferSize = bufferSize;
    this.flushInterval = flushInterval;

    // Start auto-flush timer
    this.startAutoFlush();
  }

  /**
   * Record a custom metric
   */
  async recordMetric(
    name: string,
    value: number,
    unit: string = 'Count',
    dimensions?: { [key: string]: string }
  ): Promise<void> {
    const metric: MetricData = {
      name,
      value,
      unit,
      dimensions,
      timestamp: new Date(),
    };

    this.metricsBuffer.push(metric);
    
    this.logger.debug(`Metric recorded: ${name}`, {
      metric,
      bufferSize: this.metricsBuffer.length,
    });

    // Flush if buffer is full
    if (this.metricsBuffer.length >= this.bufferSize) {
      await this.flush();
    }
  }

  /**
   * Record performance metrics for Lambda function
   */
  async recordPerformanceMetrics(metrics: PerformanceMetrics): Promise<void> {
    const dimensions = {
      FunctionName: metrics.functionName,
      Environment: process.env.ENVIRONMENT || 'unknown',
    };

    await Promise.all([
      this.recordMetric('FunctionDuration', metrics.duration, 'Milliseconds', dimensions),
      this.recordMetric('MemoryUsed', metrics.memoryUsed, 'Bytes', dimensions),
      this.recordMetric('ColdStart', metrics.coldStart ? 1 : 0, 'Count', dimensions),
    ]);

    this.logger.info('Performance metrics recorded', {
      functionName: metrics.functionName,
      duration: metrics.duration,
      memoryUsed: metrics.memoryUsed,
      coldStart: metrics.coldStart,
      correlationId: metrics.correlationId,
    });
  }

  /**
   * Record business metrics
   */
  async recordBusinessMetric(
    operation: string,
    success: boolean,
    duration?: number,
    additionalDimensions?: { [key: string]: string }
  ): Promise<void> {
    const dimensions = {
      Operation: operation,
      Environment: process.env.ENVIRONMENT || 'unknown',
      ...additionalDimensions,
    };

    await Promise.all([
      this.recordMetric(`${operation}Count`, 1, 'Count', dimensions),
      this.recordMetric(`${operation}Success`, success ? 1 : 0, 'Count', dimensions),
      ...(duration ? [this.recordMetric(`${operation}Duration`, duration, 'Milliseconds', dimensions)] : []),
    ]);
  }

  /**
   * Record API metrics
   */
  async recordApiMetrics(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    correlationId?: string
  ): Promise<void> {
    const dimensions = {
      Method: method,
      Path: path.replace(/\/[0-9a-f-]{36}/g, '/{id}'), // Replace UUIDs with placeholder
      StatusCode: statusCode.toString(),
      Environment: process.env.ENVIRONMENT || 'unknown',
    };

    const success = statusCode >= 200 && statusCode < 400;

    await Promise.all([
      this.recordMetric('ApiRequests', 1, 'Count', dimensions),
      this.recordMetric('ApiLatency', duration, 'Milliseconds', dimensions),
      this.recordMetric('ApiSuccess', success ? 1 : 0, 'Count', dimensions),
      this.recordMetric('ApiErrors', success ? 0 : 1, 'Count', dimensions),
    ]);

    this.logger.apiCall(method, path, statusCode, duration, { correlationId });
  }

  /**
   * Record MISRA analysis specific metrics
   */
  async recordAnalysisMetrics(
    fileType: string,
    rulesChecked: number,
    violationsFound: number,
    complianceScore: number,
    duration: number,
    correlationId?: string
  ): Promise<void> {
    const dimensions = {
      FileType: fileType,
      Environment: process.env.ENVIRONMENT || 'unknown',
    };

    await Promise.all([
      this.recordMetric('AnalysisCompleted', 1, 'Count', dimensions),
      this.recordMetric('RulesChecked', rulesChecked, 'Count', dimensions),
      this.recordMetric('ViolationsFound', violationsFound, 'Count', dimensions),
      this.recordMetric('ComplianceScore', complianceScore, 'Percent', dimensions),
      this.recordMetric('AnalysisDuration', duration, 'Milliseconds', dimensions),
    ]);

    this.logger.info('Analysis metrics recorded', {
      fileType,
      rulesChecked,
      violationsFound,
      complianceScore,
      duration,
      correlationId,
    });
  }

  /**
   * Record authentication metrics
   */
  async recordAuthMetrics(
    operation: 'login' | 'register' | 'refresh' | 'logout',
    success: boolean,
    mfaEnabled?: boolean,
    correlationId?: string
  ): Promise<void> {
    const dimensions = {
      Operation: operation,
      Environment: process.env.ENVIRONMENT || 'unknown',
      ...(mfaEnabled !== undefined && { MfaEnabled: mfaEnabled.toString() }),
    };

    await Promise.all([
      this.recordMetric('AuthAttempts', 1, 'Count', dimensions),
      this.recordMetric('AuthSuccess', success ? 1 : 0, 'Count', dimensions),
      this.recordMetric('AuthFailures', success ? 0 : 1, 'Count', dimensions),
    ]);

    this.logger.info('Auth metrics recorded', {
      operation,
      success,
      mfaEnabled,
      correlationId,
    });
  }

  /**
   * Flush metrics buffer to CloudWatch
   */
  async flush(): Promise<void> {
    if (this.metricsBuffer.length === 0) {
      return;
    }

    const metricsToFlush = [...this.metricsBuffer];
    this.metricsBuffer = [];

    try {
      // Group metrics by name for batch processing
      const metricsByName = new Map<string, MetricData[]>();
      
      for (const metric of metricsToFlush) {
        if (!metricsByName.has(metric.name)) {
          metricsByName.set(metric.name, []);
        }
        metricsByName.get(metric.name)!.push(metric);
      }

      // Send metrics in batches (CloudWatch limit is 20 metrics per request)
      const batches: any[] = [];
      
      for (const [metricName, metrics] of metricsByName) {
        for (let i = 0; i < metrics.length; i += 20) {
          const batch = metrics.slice(i, i + 20);
          batches.push({
            Namespace: this.namespace,
            MetricData: batch.map(metric => ({
              MetricName: metric.name,
              Value: metric.value,
              Unit: metric.unit,
              Timestamp: metric.timestamp,
              Dimensions: metric.dimensions ? Object.entries(metric.dimensions).map(([key, value]) => ({
                Name: key,
                Value: value,
              })) : undefined,
            })),
          });
        }
      }

      // Send all batches
      await Promise.all(
        batches.map(batch => this.cloudWatch.putMetricData(batch).promise())
      );

      this.logger.debug(`Flushed ${metricsToFlush.length} metrics to CloudWatch`, {
        namespace: this.namespace,
        batchCount: batches.length,
      });

    } catch (error) {
      this.logger.error('Failed to flush metrics to CloudWatch', error as Error, {
        metricsCount: metricsToFlush.length,
        namespace: this.namespace,
      });

      // Re-add metrics to buffer for retry (with limit to prevent memory issues)
      if (this.metricsBuffer.length < this.bufferSize * 2) {
        this.metricsBuffer.unshift(...metricsToFlush);
      }
    }
  }

  /**
   * Start auto-flush timer
   */
  private startAutoFlush(): void {
    this.flushTimer = setInterval(async () => {
      await this.flush();
    }, this.flushInterval);
  }

  /**
   * Stop auto-flush timer and flush remaining metrics
   */
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
    
    await this.flush();
    this.logger.info('Metrics collector shutdown complete');
  }
}

// Global metrics collector instance
let globalMetricsCollector: MetricsCollector | undefined;

/**
 * Get or create global metrics collector
 */
export function getMetricsCollector(): MetricsCollector {
  if (!globalMetricsCollector) {
    const namespace = process.env.CLOUDWATCH_NAMESPACE || 'MISRA/Platform';
    const bufferSize = parseInt(process.env.METRICS_BUFFER_SIZE || '10');
    const flushInterval = parseInt(process.env.METRICS_FLUSH_INTERVAL || '30000');
    
    globalMetricsCollector = new MetricsCollector(namespace, bufferSize, flushInterval);
  }
  
  return globalMetricsCollector;
}

/**
 * Convenience function to record a metric
 */
export async function recordMetric(
  name: string,
  value: number,
  unit: string = 'Count',
  dimensions?: { [key: string]: string }
): Promise<void> {
  const collector = getMetricsCollector();
  await collector.recordMetric(name, value, unit, dimensions);
}

/**
 * Decorator for automatic performance monitoring
 */
export function withPerformanceMonitoring(functionName: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed;
      const coldStart = !(global as any).lambdaWarmStart;
      (global as any).lambdaWarmStart = true;

      try {
        const result = await method.apply(this, args);
        
        const duration = Date.now() - startTime;
        const memoryUsed = process.memoryUsage().heapUsed - startMemory;

        const collector = getMetricsCollector();
        await collector.recordPerformanceMetrics({
          functionName,
          duration,
          memoryUsed,
          coldStart,
        });

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        const memoryUsed = process.memoryUsage().heapUsed - startMemory;

        const collector = getMetricsCollector();
        await collector.recordPerformanceMetrics({
          functionName,
          duration,
          memoryUsed,
          coldStart,
        });

        throw error;
      }
    };

    return descriptor;
  };
}

// Ensure metrics are flushed on Lambda shutdown
process.on('beforeExit', async () => {
  if (globalMetricsCollector) {
    await globalMetricsCollector.shutdown();
  }
});