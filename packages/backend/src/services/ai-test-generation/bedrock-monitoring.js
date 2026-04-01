"use strict";
/**
 * Bedrock Monitoring Service
 *
 * Provides CloudWatch metrics, X-Ray tracing, and detailed logging for Bedrock operations.
 *
 * **Validates: Requirements 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7**
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BedrockMonitoring = void 0;
exports.getBedrockMonitoring = getBedrockMonitoring;
const client_cloudwatch_1 = require("@aws-sdk/client-cloudwatch");
// ============================================================================
// Bedrock Monitoring Service
// ============================================================================
class BedrockMonitoring {
    cloudWatchClient;
    namespace;
    enabled;
    constructor(region = 'us-east-1') {
        this.cloudWatchClient = new client_cloudwatch_1.CloudWatchClient({ region });
        this.namespace = 'AIBTS/Bedrock';
        this.enabled = process.env.ENABLE_BEDROCK_MONITORING !== 'false';
        if (!this.enabled) {
            console.log('[BedrockMonitoring] Monitoring disabled via ENABLE_BEDROCK_MONITORING');
        }
    }
    /**
     * Emit CloudWatch metrics for Bedrock operation
     */
    async emitMetrics(data) {
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
                    Unit: 'Milliseconds',
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
                    Unit: 'Count',
                    Timestamp: timestamp,
                    Dimensions: [
                        { Name: 'Operation', Value: data.operation },
                    ],
                },
                // Cost metric
                {
                    MetricName: 'BedrockCost',
                    Value: data.cost,
                    Unit: 'None', // Cost in dollars
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
                    Unit: 'Count',
                    Timestamp: timestamp,
                    Dimensions: [
                        { Name: 'Operation', Value: data.operation },
                        { Name: 'ErrorType', Value: data.errorType || 'Unknown' },
                    ],
                });
            }
            const command = new client_cloudwatch_1.PutMetricDataCommand({
                Namespace: this.namespace,
                MetricData: metricData,
            });
            await this.cloudWatchClient.send(command);
        }
        catch (error) {
            // Don't fail the operation if metrics fail
            console.error('[BedrockMonitoring] Failed to emit metrics:', error);
        }
    }
    /**
     * Log detailed operation information
     * Logs to CloudWatch Logs via console.log (Lambda automatically captures)
     */
    logOperation(data) {
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
    startXRaySegment(operation) {
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
                addMetadata: (key, value) => {
                    subsegment.addMetadata(key, value);
                },
                addAnnotation: (key, value) => {
                    subsegment.addAnnotation(key, value);
                },
                close: (error) => {
                    if (error) {
                        subsegment.addError(error);
                    }
                    subsegment.close();
                },
            };
        }
        catch (error) {
            console.error('[BedrockMonitoring] Failed to start X-Ray segment:', error);
            return null;
        }
    }
    /**
     * Get X-Ray SDK if available
     * Returns null if X-Ray is not installed or not available
     */
    getXRaySDK() {
        try {
            // Try to require X-Ray SDK
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            return require('aws-xray-sdk-core');
        }
        catch (error) {
            // X-Ray SDK not installed
            return null;
        }
    }
}
exports.BedrockMonitoring = BedrockMonitoring;
// ============================================================================
// Singleton Instance
// ============================================================================
let monitoringInstance = null;
function getBedrockMonitoring(region) {
    if (!monitoringInstance) {
        monitoringInstance = new BedrockMonitoring(region);
    }
    return monitoringInstance;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmVkcm9jay1tb25pdG9yaW5nLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYmVkcm9jay1tb25pdG9yaW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7OztBQXdPSCxvREFLQztBQTNPRCxrRUFBb0Y7QUE4QnBGLCtFQUErRTtBQUMvRSw2QkFBNkI7QUFDN0IsK0VBQStFO0FBRS9FLE1BQWEsaUJBQWlCO0lBQ3BCLGdCQUFnQixDQUFtQjtJQUNuQyxTQUFTLENBQVM7SUFDbEIsT0FBTyxDQUFVO0lBRXpCLFlBQVksU0FBaUIsV0FBVztRQUN0QyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxvQ0FBZ0IsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7UUFDekQsSUFBSSxDQUFDLFNBQVMsR0FBRyxlQUFlLENBQUM7UUFDakMsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLHlCQUF5QixLQUFLLE9BQU8sQ0FBQztRQUVqRSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2xCLE9BQU8sQ0FBQyxHQUFHLENBQUMsdUVBQXVFLENBQUMsQ0FBQztRQUN2RixDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFnQjtRQUNoQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2xCLE9BQU87UUFDVCxDQUFDO1FBRUQsSUFBSSxDQUFDO1lBQ0gsTUFBTSxTQUFTLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztZQUU3QixNQUFNLFVBQVUsR0FBRztnQkFDakIsaUJBQWlCO2dCQUNqQjtvQkFDRSxVQUFVLEVBQUUsZ0JBQWdCO29CQUM1QixLQUFLLEVBQUUsSUFBSSxDQUFDLE9BQU87b0JBQ25CLElBQUksRUFBRSxjQUFjO29CQUNwQixTQUFTLEVBQUUsU0FBUztvQkFDcEIsVUFBVSxFQUFFO3dCQUNWLEVBQUUs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QkFDVixVQUFVLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO29CQUM3QixDQUFDO29CQUNELFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDckIsQ0FBQzthQUNGLENBQUM7UUFDSixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsb0RBQW9ELEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDM0UsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDO0lBQ0gsQ0FBQztJQUVEOzs7T0FHRztJQUNLLFVBQVU7UUFDaEIsSUFBSSxDQUFDO1lBQ0gsMkJBQTJCO1lBQzNCLDhEQUE4RDtZQUM5RCxPQUFPLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBQ3RDLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2YsMEJBQTBCO1lBQzFCLE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQztJQUNILENBQUM7Q0FDRjtBQWpMRCw4Q0FpTEM7QUFhRCwrRUFBK0U7QUFDL0UscUJBQXFCO0FBQ3JCLCtFQUErRTtBQUUvRSxJQUFJLGtCQUFrQixHQUE2QixJQUFJLENBQUM7QUFFeEQsU0FBZ0Isb0JBQW9CLENBQUMsTUFBZTtJQUNsRCxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztRQUN4QixrQkFBa0IsR0FBRyxJQUFJLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3JELENBQUM7SUFDRCxPQUFPLGtCQUFrQixDQUFDO0FBQzVCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogQmVkcm9jayBNb25pdG9yaW5nIFNlcnZpY2VcclxuICogXHJcbiAqIFByb3ZpZGVzIENsb3VkV2F0Y2ggbWV0cmljcywgWC1SYXkgdHJhY2luZywgYW5kIGRldGFpbGVkIGxvZ2dpbmcgZm9yIEJlZHJvY2sgb3BlcmF0aW9ucy5cclxuICogXHJcbiAqICoqVmFsaWRhdGVzOiBSZXF1aXJlbWVudHMgMTQuMSwgMTQuMiwgMTQuMywgMTQuNCwgMTQuNSwgMTQuNiwgMTQuNyoqXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgQ2xvdWRXYXRjaENsaWVudCwgUHV0TWV0cmljRGF0YUNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtY2xvdWR3YXRjaCc7XHJcblxyXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XHJcbi8vIFR5cGVzXHJcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgTWV0cmljRGF0YSB7XHJcbiAgb3BlcmF0aW9uOiBzdHJpbmc7XHJcbiAgbGF0ZW5jeTogbnVtYmVyO1xyXG4gIHRva2VuczogbnVtYmVyO1xyXG4gIGNvc3Q6IG51bWJlcjtcclxuICBzdWNjZXNzOiBib29sZWFuO1xyXG4gIGVycm9yVHlwZT86IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBMb2dEYXRhIHtcclxuICB0aW1lc3RhbXA6IHN0cmluZztcclxuICBvcGVyYXRpb246IHN0cmluZztcclxuICBtb2RlbDogc3RyaW5nO1xyXG4gIHJlZ2lvbjogc3RyaW5nO1xyXG4gIHJlcXVlc3RUb2tlbnM/OiBudW1iZXI7XHJcbiAgcmVzcG9uc2VUb2tlbnM/OiBudW1iZXI7XHJcbiAgdG90YWxUb2tlbnM/OiBudW1iZXI7XHJcbiAgY29zdD86IG51bWJlcjtcclxuICBsYXRlbmN5OiBudW1iZXI7XHJcbiAgc3RhdHVzOiAnc3VjY2VzcycgfCAnZmFpbHVyZSc7XHJcbiAgZXJyb3I/OiBzdHJpbmc7XHJcbiAgY2lyY3VpdFN0YXRlPzogc3RyaW5nO1xyXG59XHJcblxyXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XHJcbi8vIEJlZHJvY2sgTW9uaXRvcmluZyBTZXJ2aWNlXHJcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuXHJcbmV4cG9ydCBjbGFzcyBCZWRyb2NrTW9uaXRvcmluZyB7XHJcbiAgcHJpdmF0ZSBjbG91ZFdhdGNoQ2xpZW50OiBDbG91ZFdhdGNoQ2xpZW50O1xyXG4gIHByaXZhdGUgbmFtZXNwYWNlOiBzdHJpbmc7XHJcbiAgcHJpdmF0ZSBlbmFibGVkOiBib29sZWFuO1xyXG5cclxuICBjb25zdHJ1Y3RvcihyZWdpb246IHN0cmluZyA9ICd1cy1lYXN0LTEnKSB7XHJcbiAgICB0aGlzLmNsb3VkV2F0Y2hDbGllbnQgPSBuZXcgQ2xvdWRXYXRjaENsaWVudCh7IHJlZ2lvbiB9KTtcclxuICAgIHRoaXMubmFtZXNwYWNlID0gJ0FJQlRTL0JlZHJvY2snO1xyXG4gICAgdGhpcy5lbmFibGVkID0gcHJvY2Vzcy5lbnYuRU5BQkxFX0JFRFJPQ0tfTU9OSVRPUklORyAhPT0gJ2ZhbHNlJztcclxuXHJcbiAgICBpZiAoIXRoaXMuZW5hYmxlZCkge1xyXG4gICAgICBjb25zb2xlLmxvZygnW0JlZHJvY2tNb25pdG9yaW5nXSBNb25pdG9yaW5nIGRpc2FibGVkIHZpYSBFTkFCTEVfQkVEUk9DS19NT05JVE9SSU5HJyk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBFbWl0IENsb3VkV2F0Y2ggbWV0cmljcyBmb3IgQmVkcm9jayBvcGVyYXRpb25cclxuICAgKi9cclxuICBhc3luYyBlbWl0TWV0cmljcyhkYXRhOiBNZXRyaWNEYXRhKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBpZiAoIXRoaXMuZW5hYmxlZCkge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgdGltZXN0YW1wID0gbmV3IERhdGUoKTtcclxuXHJcbiAgICAgIGNvbnN0IG1ldHJpY0RhdGEgPSBbXHJcbiAgICAgICAgLy8gTGF0ZW5jeSBtZXRyaWNcclxuICAgICAgICB7XHJcbiAgICAgICAgICBNZXRyaWNOYW1lOiAnQmVkcm9ja0xhdGVuY3knLFxyXG4gICAgICAgICAgVmFsdWU6IGRhdGEubGF0ZW5jeSxcclxuICAgICAgICAgIFVuaXQ6ICdNaWxsaXNlY29uZHMnLFxyXG4gICAgICAgICAgVGltZXN0YW1wOiB0aW1lc3RhbXAsXHJcbiAgICAgICAgICBEaW1lbnNpb25zOiBbXHJcbiAgICAgICAgICAgIHsgTmFtZTogJ09wZXJhdGlvbicsIFZhbHVlOiBkYXRhLm9wZXJhdGlvbiB9LFxyXG4gICAgICAgICAgICB7IE5hbWU6ICdTdGF0dXMnLCBWYWx1ZTogZGF0YS5zdWNjZXNzID8gJ1N1Y2Nlc3MnIDogJ0ZhaWx1cmUnIH0sXHJcbiAgICAgICAgICBdLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgLy8gVG9rZW4gdXNhZ2UgbWV0cmljXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgTWV0cmljTmFtZTogJ0JlZHJvY2tUb2tlbnMnLFxyXG4gICAgICAgICAgVmFsdWU6IGRhdGEudG9rZW5zLFxyXG4gICAgICAgICAgVW5pdDogJ0NvdW50JyxcclxuICAgICAgICAgIFRpbWVzdGFtcDogdGltZXN0YW1wLFxyXG4gICAgICAgICAgRGltZW5zaW9uczogW1xyXG4gICAgICAgICAgICB7IE5hbWU6ICdPcGVyYXRpb24nLCBWYWx1ZTogZGF0YS5vcGVyYXRpb24gfSxcclxuICAgICAgICAgIF0sXHJcbiAgICAgICAgfSxcclxuICAgICAgICAvLyBDb3N0IG1ldHJpY1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIE1ldHJpY05hbWU6ICdCZWRyb2NrQ29zdCcsXHJcbiAgICAgICAgICBWYWx1ZTogZGF0YS5jb3N0LFxyXG4gICAgICAgICAgVW5pdDogJ05vbmUnLCAvLyBDb3N0IGluIGRvbGxhcnNcclxuICAgICAgICAgIFRpbWVzdGFtcDogdGltZXN0YW1wLFxyXG4gICAgICAgICAgRGltZW5zaW9uczogW1xyXG4gICAgICAgICAgICB7IE5hbWU6ICdPcGVyYXRpb24nLCBWYWx1ZTogZGF0YS5vcGVyYXRpb24gfSxcclxuICAgICAgICAgIF0sXHJcbiAgICAgICAgfSxcclxuICAgICAgXTtcclxuXHJcbiAgICAgIC8vIEFkZCBlcnJvciBtZXRyaWMgaWYgb3BlcmF0aW9uIGZhaWxlZFxyXG4gICAgICBpZiAoIWRhdGEuc3VjY2Vzcykge1xyXG4gICAgICAgIG1ldHJpY0RhdGEucHVzaCh7XHJcbiAgICAgICAgICBNZXRyaWNOYW1lOiAnQmVkcm9ja0Vycm9ycycsXHJcbiAgICAgICAgICBWYWx1ZTogMSxcclxuICAgICAgICAgIFVuaXQ6ICdDb3VudCcsXHJcbiAgICAgICAgICBUaW1lc3RhbXA6IHRpbWVzdGFtcCxcclxuICAgICAgICAgIERpbWVuc2lvbnM6IFtcclxuICAgICAgICAgICAgeyBOYW1lOiAnT3BlcmF0aW9uJywgVmFsdWU6IGRhdGEub3BlcmF0aW9uIH0sXHJcbiAgICAgICAgICAgIHsgTmFtZTogJ0Vycm9yVHlwZScsIFZhbHVlOiBkYXRhLmVycm9yVHlwZSB8fCAnVW5rbm93bicgfSxcclxuICAgICAgICAgIF0sXHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgUHV0TWV0cmljRGF0YUNvbW1hbmQoe1xyXG4gICAgICAgIE5hbWVzcGFjZTogdGhpcy5uYW1lc3BhY2UsXHJcbiAgICAgICAgTWV0cmljRGF0YTogbWV0cmljRGF0YSxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBhd2FpdCB0aGlzLmNsb3VkV2F0Y2hDbGllbnQuc2VuZChjb21tYW5kKTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIC8vIERvbid0IGZhaWwgdGhlIG9wZXJhdGlvbiBpZiBtZXRyaWNzIGZhaWxcclxuICAgICAgY29uc29sZS5lcnJvcignW0JlZHJvY2tNb25pdG9yaW5nXSBGYWlsZWQgdG8gZW1pdCBtZXRyaWNzOicsIGVycm9yKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIExvZyBkZXRhaWxlZCBvcGVyYXRpb24gaW5mb3JtYXRpb25cclxuICAgKiBMb2dzIHRvIENsb3VkV2F0Y2ggTG9ncyB2aWEgY29uc29sZS5sb2cgKExhbWJkYSBhdXRvbWF0aWNhbGx5IGNhcHR1cmVzKVxyXG4gICAqL1xyXG4gIGxvZ09wZXJhdGlvbihkYXRhOiBMb2dEYXRhKTogdm9pZCB7XHJcbiAgICBpZiAoIXRoaXMuZW5hYmxlZCkge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgbG9nRW50cnkgPSB7XHJcbiAgICAgIHRpbWVzdGFtcDogZGF0YS50aW1lc3RhbXAsXHJcbiAgICAgIHNlcnZpY2U6ICdCZWRyb2NrRW5naW5lJyxcclxuICAgICAgb3BlcmF0aW9uOiBkYXRhLm9wZXJhdGlvbixcclxuICAgICAgbW9kZWw6IGRhdGEubW9kZWwsXHJcbiAgICAgIHJlZ2lvbjogZGF0YS5yZWdpb24sXHJcbiAgICAgIG1ldHJpY3M6IHtcclxuICAgICAgICByZXF1ZXN0VG9rZW5zOiBkYXRhLnJlcXVlc3RUb2tlbnMsXHJcbiAgICAgICAgcmVzcG9uc2VUb2tlbnM6IGRhdGEucmVzcG9uc2VUb2tlbnMsXHJcbiAgICAgICAgdG90YWxUb2tlbnM6IGRhdGEudG90YWxUb2tlbnMsXHJcbiAgICAgICAgY29zdDogZGF0YS5jb3N0LFxyXG4gICAgICAgIGxhdGVuY3k6IGRhdGEubGF0ZW5jeSxcclxuICAgICAgfSxcclxuICAgICAgc3RhdHVzOiBkYXRhLnN0YXR1cyxcclxuICAgICAgZXJyb3I6IGRhdGEuZXJyb3IsXHJcbiAgICAgIGNpcmN1aXRTdGF0ZTogZGF0YS5jaXJjdWl0U3RhdGUsXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIExvZyBhcyBzdHJ1Y3R1cmVkIEpTT04gZm9yIENsb3VkV2F0Y2ggTG9ncyBJbnNpZ2h0c1xyXG4gICAgY29uc29sZS5sb2coJ1tCZWRyb2NrT3BlcmF0aW9uXScsIEpTT04uc3RyaW5naWZ5KGxvZ0VudHJ5KSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBTdGFydCBYLVJheSBzZWdtZW50IGZvciBCZWRyb2NrIG9wZXJhdGlvblxyXG4gICAqIE5vdGU6IFgtUmF5IFNESyBtdXN0IGJlIGluc3RhbGxlZCBhbmQgY29uZmlndXJlZCBzZXBhcmF0ZWx5XHJcbiAgICovXHJcbiAgc3RhcnRYUmF5U2VnbWVudChvcGVyYXRpb246IHN0cmluZyk6IFhSYXlTZWdtZW50IHwgbnVsbCB7XHJcbiAgICBpZiAoIXRoaXMuZW5hYmxlZCkge1xyXG4gICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICB0cnkge1xyXG4gICAgICAvLyBDaGVjayBpZiBYLVJheSBpcyBhdmFpbGFibGVcclxuICAgICAgY29uc3QgQVdTWFJheSA9IHRoaXMuZ2V0WFJheVNESygpO1xyXG4gICAgICBpZiAoIUFXU1hSYXkpIHtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc3Qgc2VnbWVudCA9IEFXU1hSYXkuZ2V0U2VnbWVudCgpO1xyXG4gICAgICBpZiAoIXNlZ21lbnQpIHtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc3Qgc3Vic2VnbWVudCA9IHNlZ21lbnQuYWRkTmV3U3Vic2VnbWVudChgQmVkcm9jay4ke29wZXJhdGlvbn1gKTtcclxuICAgICAgc3Vic2VnbWVudC5hZGRBbm5vdGF0aW9uKCdzZXJ2aWNlJywgJ0JlZHJvY2snKTtcclxuICAgICAgc3Vic2VnbWVudC5hZGRBbm5vdGF0aW9uKCdvcGVyYXRpb24nLCBvcGVyYXRpb24pO1xyXG5cclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdWJzZWdtZW50LFxyXG4gICAgICAgIGFkZE1ldGFkYXRhOiAoa2V5OiBzdHJpbmcsIHZhbHVlOiBhbnkpID0+IHtcclxuICAgICAgICAgIHN1YnNlZ21lbnQuYWRkTWV0YWRhdGEoa2V5LCB2YWx1ZSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBhZGRBbm5vdGF0aW9uOiAoa2V5OiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuKSA9PiB7XHJcbiAgICAgICAgICBzdWJzZWdtZW50LmFkZEFubm90YXRpb24oa2V5LCB2YWx1ZSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBjbG9zZTogKGVycm9yPzogRXJyb3IpID0+IHtcclxuICAgICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICBzdWJzZWdtZW50LmFkZEVycm9yKGVycm9yKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHN1YnNlZ21lbnQuY2xvc2UoKTtcclxuICAgICAgICB9LFxyXG4gICAgICB9O1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignW0JlZHJvY2tNb25pdG9yaW5nXSBGYWlsZWQgdG8gc3RhcnQgWC1SYXkgc2VnbWVudDonLCBlcnJvcik7XHJcbiAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IFgtUmF5IFNESyBpZiBhdmFpbGFibGVcclxuICAgKiBSZXR1cm5zIG51bGwgaWYgWC1SYXkgaXMgbm90IGluc3RhbGxlZCBvciBub3QgYXZhaWxhYmxlXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBnZXRYUmF5U0RLKCk6IGFueSB7XHJcbiAgICB0cnkge1xyXG4gICAgICAvLyBUcnkgdG8gcmVxdWlyZSBYLVJheSBTREtcclxuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby12YXItcmVxdWlyZXNcclxuICAgICAgcmV0dXJuIHJlcXVpcmUoJ2F3cy14cmF5LXNkay1jb3JlJyk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAvLyBYLVJheSBTREsgbm90IGluc3RhbGxlZFxyXG4gICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuICB9XHJcbn1cclxuXHJcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuLy8gWC1SYXkgU2VnbWVudCBJbnRlcmZhY2VcclxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBYUmF5U2VnbWVudCB7XHJcbiAgc3Vic2VnbWVudDogYW55O1xyXG4gIGFkZE1ldGFkYXRhOiAoa2V5OiBzdHJpbmcsIHZhbHVlOiBhbnkpID0+IHZvaWQ7XHJcbiAgYWRkQW5ub3RhdGlvbjogKGtleTogc3RyaW5nLCB2YWx1ZTogc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbikgPT4gdm9pZDtcclxuICBjbG9zZTogKGVycm9yPzogRXJyb3IpID0+IHZvaWQ7XHJcbn1cclxuXHJcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuLy8gU2luZ2xldG9uIEluc3RhbmNlXHJcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuXHJcbmxldCBtb25pdG9yaW5nSW5zdGFuY2U6IEJlZHJvY2tNb25pdG9yaW5nIHwgbnVsbCA9IG51bGw7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0QmVkcm9ja01vbml0b3JpbmcocmVnaW9uPzogc3RyaW5nKTogQmVkcm9ja01vbml0b3Jpbmcge1xyXG4gIGlmICghbW9uaXRvcmluZ0luc3RhbmNlKSB7XHJcbiAgICBtb25pdG9yaW5nSW5zdGFuY2UgPSBuZXcgQmVkcm9ja01vbml0b3JpbmcocmVnaW9uKTtcclxuICB9XHJcbiAgcmV0dXJuIG1vbml0b3JpbmdJbnN0YW5jZTtcclxufVxyXG4iXX0=