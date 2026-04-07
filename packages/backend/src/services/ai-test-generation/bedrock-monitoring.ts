/**
 * Bedrock Monitoring Service
 * 
 * Provides CloudWatch metrics, X-Ray tracing, and detailed logging for Bedrock operations.
 * 
 * **Validates: Requirements 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7**
 */

import { CloudWatchClient, PutMetricDataCommand, StandardUnit } from '@aws-sdk/client-cloudwatch';

// ============================================================================
// Types
// ============================================================================

export interface MetricData {
  operation: string;
  latency: number;
  tokens: number;
  cost: number;
  success: boolean;
  errorType?: string;
}

export interface LogData {
  timestamp: string;
  operation: string;
  model: string;
  region: string;
  requestTokens?: number;
  responseTokens?: number;
  totalTokens?: number;
  cost?: number;
  latency: number;
  status: 'success' | 'failure';
  error?: string;
  circuitState?: string;
}

// ============================================================================
// Bedrock Monitoring Service
// ============================================================================

export class BedrockMonitoring {
  private cloudWatchClient: CloudWatchClient;
  private namespace: string;
  private enabled: boolean;

  constructor(region: string = 'us-east-1') {
    this.cloudWatchClient = new CloudWatchClient({ region });
    this.namespace = 'AIBTS/Bedrock';
    this.enabled = process.env.ENABLE_BEDROCK_MONITORING !== 'false';

    if (!this.enabled) {
      console.log('[BedrockMonitoring] Monitoring disabled via ENABLE_BEDROCK_MONITORING');
    }
  }

  /**
   * Emit CloudWatch metrics for Bedrock operation
   */
  async emitMetrics(data: MetricData): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      const timestamp = new Date();

      const metricData = [
        // Latency metric
        {
          MetricName: 'BedrockLatency',
          Value: data.latency,
          Unit: 'Milliseconds' as StandardUnit,
          Timestamp: timestamp,
          Dimensions: [
            { Name: 'Operation', Value: data.operation },
            { Name: 'Status', Value: data.success ? 'Success' : 'Failure' },
          ],
        },
        // Token usage metric
        {
          MetricName: 'BedrockTokens',
          Value: data.tokens,
          Unit: 'Count' as StandardUnit,
          Timestamp: timestamp,
          Dimensions: [
            { Name: 'Operation', Value: data.operation },
          ],
        },
        // Cost metric
        {
          MetricName: 'BedrockCost',
          Value: data.cost,
          Unit: 'None' as StandardUnit, // Cost in dollars
          Timestamp: timestamp,
          Dimensions: [
            { Name: 'Operation', Value: data.operation },
          ],
        },
      ];

      // Add error metric if operation failed
      if (!data.success) {
        metricData.push({
          MetricName: 'BedrockErrors',
          Value: 1,
          Unit: 'Count' as StandardUnit,
          Timestamp: timestamp,
          Dimensions: [
            { Name: 'Operation', Value: data.operation },
            { Name: 'ErrorType', Value: data.errorType || 'Unknown' },
          ],
        });
      }

      const command = new PutMetricDataCommand({
        Namespace: this.namespace,
        MetricData: metricData,
      });

      await this.cloudWatchClient.send(command);
    } catch (error) {
      // Don't fail the operation if metrics fail
      console.error('[BedrockMonitoring] Failed to emit metrics:', error);
    }
  }

  /**
   * Log detailed operation information
   * Logs to CloudWatch Logs via console.log (Lambda automatically captures)
   */
  logOperation(data: LogData): void {
    if (!this.enabled) {
      return;
    }

    const logEntry = {
      timestamp: data.timestamp,
      service: 'BedrockEngine',
      operation: data.operation,
      model: data.model,
      region: data.region,
      metrics: {
        requestTokens: data.requestTokens,
        responseTokens: data.responseTokens,
        totalTokens: data.totalTokens,
        cost: data.cost,
        latency: data.latency,
      },
      status: data.status,
      error: data.error,
      circuitState: data.circuitState,
    };

    // Log as structured JSON for CloudWatch Logs Insights
    console.log('[BedrockOperation]', JSON.stringify(logEntry));
  }

  /**
   * Start X-Ray segment for Bedrock operation
   * Note: X-Ray SDK must be installed and configured separately
   */
  startXRaySegment(operation: string): XRaySegment | null {
    if (!this.enabled) {
      return null;
    }

    try {
      // Check if X-Ray is available
      const AWSXRay = this.getXRaySDK();
      if (!AWSXRay) {
        return null;
      }

      const segment = AWSXRay.getSegment();
      if (!segment) {
        return null;
      }

      const subsegment = segment.addNewSubsegment(`Bedrock.${operation}`);
      subsegment.addAnnotation('service', 'Bedrock');
      subsegment.addAnnotation('operation', operation);

      return {
        subsegment,
        addMetadata: (key: string, value: any) => {
          subsegment.addMetadata(key, value);
        },
        addAnnotation: (key: string, value: string | number | boolean) => {
          subsegment.addAnnotation(key, value);
        },
        close: (error?: Error) => {
          if (error) {
            subsegment.addError(error);
          }
          subsegment.close();
        },
      };
    } catch (error) {
      console.error('[BedrockMonitoring] Failed to start X-Ray segment:', error);
      return null;
    }
  }

  /**
   * Get X-Ray SDK if available
   * Returns null if X-Ray is not installed or not available
   */
  private getXRaySDK(): any {
    try {
      // Try to require X-Ray SDK
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require('aws-xray-sdk-core');
    } catch (error) {
      // X-Ray SDK not installed
      return null;
    }
  }
}

// ============================================================================
// X-Ray Segment Interface
// ============================================================================

export interface XRaySegment {
  subsegment: any;
  addMetadata: (key: string, value: any) => void;
  addAnnotation: (key: string, value: string | number | boolean) => void;
  close: (error?: Error) => void;
}

// ============================================================================
// Singleton Instance
// ============================================================================

let monitoringInstance: BedrockMonitoring | null = null;

export function getBedrockMonitoring(region?: string): BedrockMonitoring {
  if (!monitoringInstance) {
    monitoringInstance = new BedrockMonitoring(region);
  }
  return monitoringInstance;
}
