"use strict";
/**
 * CloudWatch Monitoring Service
 * Provides comprehensive monitoring and alerting for production error handling
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloudWatchMonitoringService = exports.CloudWatchMonitoringService = void 0;
const client_cloudwatch_1 = require("@aws-sdk/client-cloudwatch");
const logger_1 = require("../../utils/logger");
/**
 * CloudWatch monitoring service for production error handling
 */
class CloudWatchMonitoringService {
    cloudWatchClient;
    logger;
    namespace;
    constructor(region = 'us-east-1', namespace = 'MISRA/Production') {
        this.cloudWatchClient = new client_cloudwatch_1.CloudWatchClient({ region });
        this.logger = (0, logger_1.createLogger)('CloudWatchMonitoringService');
        this.namespace = namespace;
    }
    /**
     * Put custom metric to CloudWatch
     */
    async putMetric(metric) {
        try {
            const metricDatum = {
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
            const command = new client_cloudwatch_1.PutMetricDataCommand({
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
        }
        catch (error) {
            this.logger.error('Failed to send metric to CloudWatch', error, {
                metricName: metric.metricName,
                value: metric.value
            });
            // Don't throw - monitoring failures shouldn't break the application
        }
    }
    /**
     * Put multiple metrics to CloudWatch
     */
    async putMetrics(metrics) {
        try {
            const metricData = metrics.map(metric => ({
                MetricName: metric.metricName,
                Value: metric.value,
                Unit: metric.unit,
                Timestamp: metric.timestamp || new Date(),
                Dimensions: metric.dimensions ? Object.entries(metric.dimensions).map(([name, value]) => ({
                    Name: name,
                    Value: value
                })) : undefined
            }));
            const command = new client_cloudwatch_1.PutMetricDataCommand({
                Namespace: this.namespace,
                MetricData: metricData
            });
            await this.cloudWatchClient.send(command);
            this.logger.debug('Multiple metrics sent to CloudWatch', {
                count: metrics.length,
                metrics: metrics.map(m => m.metricName)
            });
        }
        catch (error) {
            this.logger.error('Failed to send metrics to CloudWatch', error, {
                count: metrics.length
            });
        }
    }
    /**
     * Record error metrics
     */
    async recordError(errorType, serviceName, errorCode, userId) {
        const metrics = [
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
    async recordPerformance(operationName, duration, serviceName, success = true) {
        const metrics = [
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
    async recordCircuitBreakerState(serviceName, state, failureCount, successCount) {
        const metrics = [
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
    async recordRetryAttempt(operationName, attemptNumber, success, serviceName) {
        const metrics = [
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
    async recordUserActivity(activityType, userId, organizationId) {
        const metrics = [
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
    async recordSystemHealth(serviceName, isHealthy, responseTime) {
        const metrics = [
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
    getDashboardConfig() {
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
    getRecommendedAlarms() {
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
exports.CloudWatchMonitoringService = CloudWatchMonitoringService;
// Global CloudWatch monitoring service instance
exports.cloudWatchMonitoringService = new CloudWatchMonitoringService();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xvdWR3YXRjaC1tb25pdG9yaW5nLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xvdWR3YXRjaC1tb25pdG9yaW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O0dBR0c7OztBQUVILGtFQUFpRztBQUNqRywrQ0FBMEQ7QUFvQjFEOztHQUVHO0FBQ0gsTUFBYSwyQkFBMkI7SUFDOUIsZ0JBQWdCLENBQW1CO0lBQ25DLE1BQU0sQ0FBUztJQUNmLFNBQVMsQ0FBUztJQUUxQixZQUFZLFNBQWlCLFdBQVcsRUFBRSxZQUFvQixrQkFBa0I7UUFDOUUsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksb0NBQWdCLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQ3pELElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBQSxxQkFBWSxFQUFDLDZCQUE2QixDQUFDLENBQUM7UUFDMUQsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7SUFDN0IsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFrQjtRQUNoQyxJQUFJLENBQUM7WUFDSCxNQUFNLFdBQVcsR0FBZ0I7Z0JBQy9CLFVBQVUsRUFBRSxNQUFNLENBQUMsVUFBVTtnQkFDN0IsS0FBSyxFQUFFLE1BQU0sQ0FBQyxLQUFLO2dCQUNuQixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUk7Z0JBQ2pCLFNBQVMsRUFBRSxNQUFNLENBQUMsU0FBUyxJQUFJLElBQUksSUFBSSxFQUFFO2FBQzFDLENBQUM7WUFFRiw2QkFBNkI7WUFDN0IsSUFBSSxNQUFNLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQ3RCLFdBQVcsQ0FBQyxVQUFVLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7b0JBQ2pGLElBQUksRUFBRSxJQUFJ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LENBQUM7Q0FDRjtBQXJaRCxrRUFxWkM7QUFFRCxnREFBZ0Q7QUFDbkMsUUFBQSwyQkFBMkIsR0FBRyxJQUFJLDJCQUEyQixFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogQ2xvdWRXYXRjaCBNb25pdG9yaW5nIFNlcnZpY2VcclxuICogUHJvdmlkZXMgY29tcHJlaGVuc2l2ZSBtb25pdG9yaW5nIGFuZCBhbGVydGluZyBmb3IgcHJvZHVjdGlvbiBlcnJvciBoYW5kbGluZ1xyXG4gKi9cclxuXHJcbmltcG9ydCB7IENsb3VkV2F0Y2hDbGllbnQsIFB1dE1ldHJpY0RhdGFDb21tYW5kLCBNZXRyaWNEYXR1bSB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1jbG91ZHdhdGNoJztcclxuaW1wb3J0IHsgTG9nZ2VyLCBjcmVhdGVMb2dnZXIgfSBmcm9tICcuLi8uLi91dGlscy9sb2dnZXInO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBNZXRyaWNEYXRhIHtcclxuICBtZXRyaWNOYW1lOiBzdHJpbmc7XHJcbiAgdmFsdWU6IG51bWJlcjtcclxuICB1bml0OiAnQ291bnQnIHwgJ1NlY29uZHMnIHwgJ01pbGxpc2Vjb25kcycgfCAnQnl0ZXMnIHwgJ1BlcmNlbnQnIHwgJ05vbmUnO1xyXG4gIGRpbWVuc2lvbnM/OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+O1xyXG4gIHRpbWVzdGFtcD86IERhdGU7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQWxhcm1Db25maWcge1xyXG4gIGFsYXJtTmFtZTogc3RyaW5nO1xyXG4gIG1ldHJpY05hbWU6IHN0cmluZztcclxuICB0aHJlc2hvbGQ6IG51bWJlcjtcclxuICBjb21wYXJpc29uT3BlcmF0b3I6ICdHcmVhdGVyVGhhblRocmVzaG9sZCcgfCAnTGVzc1RoYW5UaHJlc2hvbGQnIHwgJ0dyZWF0ZXJUaGFuT3JFcXVhbFRvVGhyZXNob2xkJyB8ICdMZXNzVGhhbk9yRXF1YWxUb1RocmVzaG9sZCc7XHJcbiAgZXZhbHVhdGlvblBlcmlvZHM6IG51bWJlcjtcclxuICBwZXJpb2Q6IG51bWJlcjtcclxuICBzdGF0aXN0aWM6ICdBdmVyYWdlJyB8ICdTdW0nIHwgJ01heGltdW0nIHwgJ01pbmltdW0nIHwgJ1NhbXBsZUNvdW50JztcclxufVxyXG5cclxuLyoqXHJcbiAqIENsb3VkV2F0Y2ggbW9uaXRvcmluZyBzZXJ2aWNlIGZvciBwcm9kdWN0aW9uIGVycm9yIGhhbmRsaW5nXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgQ2xvdWRXYXRjaE1vbml0b3JpbmdTZXJ2aWNlIHtcclxuICBwcml2YXRlIGNsb3VkV2F0Y2hDbGllbnQ6IENsb3VkV2F0Y2hDbGllbnQ7XHJcbiAgcHJpdmF0ZSBsb2dnZXI6IExvZ2dlcjtcclxuICBwcml2YXRlIG5hbWVzcGFjZTogc3RyaW5nO1xyXG5cclxuICBjb25zdHJ1Y3RvcihyZWdpb246IHN0cmluZyA9ICd1cy1lYXN0LTEnLCBuYW1lc3BhY2U6IHN0cmluZyA9ICdNSVNSQS9Qcm9kdWN0aW9uJykge1xyXG4gICAgdGhpcy5jbG91ZFdhdGNoQ2xpZW50ID0gbmV3IENsb3VkV2F0Y2hDbGllbnQoeyByZWdpb24gfSk7XHJcbiAgICB0aGlzLmxvZ2dlciA9IGNyZWF0ZUxvZ2dlcignQ2xvdWRXYXRjaE1vbml0b3JpbmdTZXJ2aWNlJyk7XHJcbiAgICB0aGlzLm5hbWVzcGFjZSA9IG5hbWVzcGFjZTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFB1dCBjdXN0b20gbWV0cmljIHRvIENsb3VkV2F0Y2hcclxuICAgKi9cclxuICBhc3luYyBwdXRNZXRyaWMobWV0cmljOiBNZXRyaWNEYXRhKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBtZXRyaWNEYXR1bTogTWV0cmljRGF0dW0gPSB7XHJcbiAgICAgICAgTWV0cmljTmFtZTogbWV0cmljLm1ldHJpY05hbWUsXHJcbiAgICAgICAgVmFsdWU6IG1ldHJpYy52YWx1ZSxcclxuICAgICAgICBVbml0OiBtZXRyaWMudW5pdCxcclxuICAgICAgICBUaW1lc3RhbXA6IG1ldHJpYy50aW1lc3RhbXAgfHwgbmV3IERhdGUoKVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgLy8gQWRkIGRpbWVuc2lvbnMgaWYgcHJvdmlkZWRcclxuICAgICAgaWYgKG1ldHJpYy5kaW1lbnNpb25zKSB7XHJcbiAgICAgICAgbWV0cmljRGF0dW0uRGltZW5zaW9ucyA9IE9iamVjdC5lbnRyaWVzKG1ldHJpYy5kaW1lbnNpb25zKS5tYXAoKFtuYW1lLCB2YWx1ZV0pID0+ICh7XHJcbiAgICAgICAgICBOYW1lOiBuYW1lLFxyXG4gICAgICAgICAgVmFsdWU6IHZhbHVlXHJcbiAgICAgICAgfSkpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zdCBjb21tYW5kID0gbmV3IFB1dE1ldHJpY0RhdGFDb21tYW5kKHtcclxuICAgICAgICBOYW1lc3BhY2U6IHRoaXMubmFtZXNwYWNlLFxyXG4gICAgICAgIE1ldHJpY0RhdGE6IFttZXRyaWNEYXR1bV1cclxuICAgICAgfSk7XHJcblxyXG4gICAgICBhd2FpdCB0aGlzLmNsb3VkV2F0Y2hDbGllbnQuc2VuZChjb21tYW5kKTtcclxuICAgICAgXHJcbiAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdNZXRyaWMgc2VudCB0byBDbG91ZFdhdGNoJywge1xyXG4gICAgICAgIG1ldHJpY05hbWU6IG1ldHJpYy5tZXRyaWNOYW1lLFxyXG4gICAgICAgIHZhbHVlOiBtZXRyaWMudmFsdWUsXHJcbiAgICAgICAgdW5pdDogbWV0cmljLnVuaXQsXHJcbiAgICAgICAgZGltZW5zaW9uczogbWV0cmljLmRpbWVuc2lvbnNcclxuICAgICAgfSk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcignRmFpbGVkIHRvIHNlbmQgbWV0cmljIHRvIENsb3VkV2F0Y2gnLCBlcnJvciBhcyBFcnJvciwge1xyXG4gICAgICAgIG1ldHJpY05hbWU6IG1ldHJpYy5tZXRyaWNOYW1lLFxyXG4gICAgICAgIHZhbHVlOiBtZXRyaWMudmFsdWVcclxuICAgICAgfSk7XHJcbiAgICAgIC8vIERvbid0IHRocm93IC0gbW9uaXRvcmluZyBmYWlsdXJlcyBzaG91bGRuJ3QgYnJlYWsgdGhlIGFwcGxpY2F0aW9uXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBQdXQgbXVsdGlwbGUgbWV0cmljcyB0byBDbG91ZFdhdGNoXHJcbiAgICovXHJcbiAgYXN5bmMgcHV0TWV0cmljcyhtZXRyaWNzOiBNZXRyaWNEYXRhW10pOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IG1ldHJpY0RhdGE6IE1ldHJpY0RhdHVtW10gPSBtZXRyaWNzLm1hcChtZXRyaWMgPT4gKHtcclxuICAgICAgICBNZXRyaWNOYW1lOiBtZXRyaWMubWV0cmljTmFtZSxcclxuICAgICAgICBWYWx1ZTogbWV0cmljLnZhbHVlLFxyXG4gICAgICAgIFVuaXQ6IG1ldHJpYy51bml0LFxyXG4gICAgICAgIFRpbWVzdGFtcDogbWV0cmljLnRpbWVzdGFtcCB8fCBuZXcgRGF0ZSgpLFxyXG4gICAgICAgIERpbWVuc2lvbnM6IG1ldHJpYy5kaW1lbnNpb25zID8gT2JqZWN0LmVudHJpZXMobWV0cmljLmRpbWVuc2lvbnMpLm1hcCgoW25hbWUsIHZhbHVlXSkgPT4gKHtcclxuICAgICAgICAgIE5hbWU6IG5hbWUsXHJcbiAgICAgICAgICBWYWx1ZTogdmFsdWVcclxuICAgICAgICB9KSkgOiB1bmRlZmluZWRcclxuICAgICAgfSkpO1xyXG5cclxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBQdXRNZXRyaWNEYXRhQ29tbWFuZCh7XHJcbiAgICAgICAgTmFtZXNwYWNlOiB0aGlzLm5hbWVzcGFjZSxcclxuICAgICAgICBNZXRyaWNEYXRhOiBtZXRyaWNEYXRhXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgYXdhaXQgdGhpcy5jbG91ZFdhdGNoQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcbiAgICAgIFxyXG4gICAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnTXVsdGlwbGUgbWV0cmljcyBzZW50IHRvIENsb3VkV2F0Y2gnLCB7XHJcbiAgICAgICAgY291bnQ6IG1ldHJpY3MubGVuZ3RoLFxyXG4gICAgICAgIG1ldHJpY3M6IG1ldHJpY3MubWFwKG0gPT4gbS5tZXRyaWNOYW1lKVxyXG4gICAgICB9KTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdGYWlsZWQgdG8gc2VuZCBtZXRyaWNzIHRvIENsb3VkV2F0Y2gnLCBlcnJvciBhcyBFcnJvciwge1xyXG4gICAgICAgIGNvdW50OiBtZXRyaWNzLmxlbmd0aFxyXG4gICAgICB9KTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFJlY29yZCBlcnJvciBtZXRyaWNzXHJcbiAgICovXHJcbiAgYXN5bmMgcmVjb3JkRXJyb3IoXHJcbiAgICBlcnJvclR5cGU6IHN0cmluZyxcclxuICAgIHNlcnZpY2VOYW1lOiBzdHJpbmcsXHJcbiAgICBlcnJvckNvZGU/OiBzdHJpbmcsXHJcbiAgICB1c2VySWQ/OiBzdHJpbmdcclxuICApOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGNvbnN0IG1ldHJpY3M6IE1ldHJpY0RhdGFbXSA9IFtcclxuICAgICAge1xyXG4gICAgICAgIG1ldHJpY05hbWU6ICdFcnJvckNvdW50JyxcclxuICAgICAgICB2YWx1ZTogMSxcclxuICAgICAgICB1bml0OiAnQ291bnQnLFxyXG4gICAgICAgIGRpbWVuc2lvbnM6IHtcclxuICAgICAgICAgIFNlcnZpY2U6IHNlcnZpY2VOYW1lLFxyXG4gICAgICAgICAgRXJyb3JUeXBlOiBlcnJvclR5cGUsXHJcbiAgICAgICAgICAuLi4oZXJyb3JDb2RlICYmIHsgRXJyb3JDb2RlOiBlcnJvckNvZGUgfSlcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIF07XHJcblxyXG4gICAgLy8gQWRkIHVzZXItc3BlY2lmaWMgZXJyb3IgbWV0cmljIGlmIHVzZXJJZCBwcm92aWRlZFxyXG4gICAgaWYgKHVzZXJJZCkge1xyXG4gICAgICBtZXRyaWNzLnB1c2goe1xyXG4gICAgICAgIG1ldHJpY05hbWU6ICdVc2VyRXJyb3JDb3VudCcsXHJcbiAgICAgICAgdmFsdWU6IDEsXHJcbiAgICAgICAgdW5pdDogJ0NvdW50JyxcclxuICAgICAgICBkaW1lbnNpb25zOiB7XHJcbiAgICAgICAgICBTZXJ2aWNlOiBzZXJ2aWNlTmFtZSxcclxuICAgICAgICAgIEVycm9yVHlwZTogZXJyb3JUeXBlLFxyXG4gICAgICAgICAgVXNlcklkOiB1c2VySWRcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGF3YWl0IHRoaXMucHV0TWV0cmljcyhtZXRyaWNzKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFJlY29yZCBwZXJmb3JtYW5jZSBtZXRyaWNzXHJcbiAgICovXHJcbiAgYXN5bmMgcmVjb3JkUGVyZm9ybWFuY2UoXHJcbiAgICBvcGVyYXRpb25OYW1lOiBzdHJpbmcsXHJcbiAgICBkdXJhdGlvbjogbnVtYmVyLFxyXG4gICAgc2VydmljZU5hbWU6IHN0cmluZyxcclxuICAgIHN1Y2Nlc3M6IGJvb2xlYW4gPSB0cnVlXHJcbiAgKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBjb25zdCBtZXRyaWNzOiBNZXRyaWNEYXRhW10gPSBbXHJcbiAgICAgIHtcclxuICAgICAgICBtZXRyaWNOYW1lOiAnT3BlcmF0aW9uRHVyYXRpb24nLFxyXG4gICAgICAgIHZhbHVlOiBkdXJhdGlvbixcclxuICAgICAgICB1bml0OiAnTWlsbGlzZWNvbmRzJyxcclxuICAgICAgICBkaW1lbnNpb25zOiB7XHJcbiAgICAgICAgICBTZXJ2aWNlOiBzZXJ2aWNlTmFtZSxcclxuICAgICAgICAgIE9wZXJhdGlvbjogb3BlcmF0aW9uTmFtZSxcclxuICAgICAgICAgIFN0YXR1czogc3VjY2VzcyA/ICdTdWNjZXNzJyA6ICdGYWlsdXJlJ1xyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIG1ldHJpY05hbWU6ICdPcGVyYXRpb25Db3VudCcsXHJcbiAgICAgICAgdmFsdWU6IDEsXHJcbiAgICAgICAgdW5pdDogJ0NvdW50JyxcclxuICAgICAgICBkaW1lbnNpb25zOiB7XHJcbiAgICAgICAgICBTZXJ2aWNlOiBzZXJ2aWNlTmFtZSxcclxuICAgICAgICAgIE9wZXJhdGlvbjogb3BlcmF0aW9uTmFtZSxcclxuICAgICAgICAgIFN0YXR1czogc3VjY2VzcyA/ICdTdWNjZXNzJyA6ICdGYWlsdXJlJ1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgXTtcclxuXHJcbiAgICBhd2FpdCB0aGlzLnB1dE1ldHJpY3MobWV0cmljcyk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBSZWNvcmQgY2lyY3VpdCBicmVha2VyIG1ldHJpY3NcclxuICAgKi9cclxuICBhc3luYyByZWNvcmRDaXJjdWl0QnJlYWtlclN0YXRlKFxyXG4gICAgc2VydmljZU5hbWU6IHN0cmluZyxcclxuICAgIHN0YXRlOiAnQ0xPU0VEJyB8ICdPUEVOJyB8ICdIQUxGX09QRU4nLFxyXG4gICAgZmFpbHVyZUNvdW50OiBudW1iZXIsXHJcbiAgICBzdWNjZXNzQ291bnQ6IG51bWJlclxyXG4gICk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgY29uc3QgbWV0cmljczogTWV0cmljRGF0YVtdID0gW1xyXG4gICAgICB7XHJcbiAgICAgICAgbWV0cmljTmFtZTogJ0NpcmN1aXRCcmVha2VyU3RhdGUnLFxyXG4gICAgICAgIHZhbHVlOiBzdGF0ZSA9PT0gJ0NMT1NFRCcgPyAwIDogc3RhdGUgPT09ICdIQUxGX09QRU4nID8gMSA6IDIsXHJcbiAgICAgICAgdW5pdDogJ05vbmUnLFxyXG4gICAgICAgIGRpbWVuc2lvbnM6IHtcclxuICAgICAgICAgIFNlcnZpY2U6IHNlcnZpY2VOYW1lLFxyXG4gICAgICAgICAgU3RhdGU6IHN0YXRlXHJcbiAgICAgICAgfVxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgbWV0cmljTmFtZTogJ0NpcmN1aXRCcmVha2VyRmFpbHVyZXMnLFxyXG4gICAgICAgIHZhbHVlOiBmYWlsdXJlQ291bnQsXHJcbiAgICAgICAgdW5pdDogJ0NvdW50JyxcclxuICAgICAgICBkaW1lbnNpb25zOiB7XHJcbiAgICAgICAgICBTZXJ2aWNlOiBzZXJ2aWNlTmFtZVxyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIG1ldHJpY05hbWU6ICdDaXJjdWl0QnJlYWtlclN1Y2Nlc3NlcycsXHJcbiAgICAgICAgdmFsdWU6IHN1Y2Nlc3NDb3VudCxcclxuICAgICAgICB1bml0OiAnQ291bnQnLFxyXG4gICAgICAgIGRpbWVuc2lvbnM6IHtcclxuICAgICAgICAgIFNlcnZpY2U6IHNlcnZpY2VOYW1lXHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICBdO1xyXG5cclxuICAgIGF3YWl0IHRoaXMucHV0TWV0cmljcyhtZXRyaWNzKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFJlY29yZCByZXRyeSBtZXRyaWNzXHJcbiAgICovXHJcbiAgYXN5bmMgcmVjb3JkUmV0cnlBdHRlbXB0KFxyXG4gICAgb3BlcmF0aW9uTmFtZTogc3RyaW5nLFxyXG4gICAgYXR0ZW1wdE51bWJlcjogbnVtYmVyLFxyXG4gICAgc3VjY2VzczogYm9vbGVhbixcclxuICAgIHNlcnZpY2VOYW1lOiBzdHJpbmdcclxuICApOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGNvbnN0IG1ldHJpY3M6IE1ldHJpY0RhdGFbXSA9IFtcclxuICAgICAge1xyXG4gICAgICAgIG1ldHJpY05hbWU6ICdSZXRyeUF0dGVtcHRzJyxcclxuICAgICAgICB2YWx1ZTogYXR0ZW1wdE51bWJlcixcclxuICAgICAgICB1bml0OiAnQ291bnQnLFxyXG4gICAgICAgIGRpbWVuc2lvbnM6IHtcclxuICAgICAgICAgIFNlcnZpY2U6IHNlcnZpY2VOYW1lLFxyXG4gICAgICAgICAgT3BlcmF0aW9uOiBvcGVyYXRpb25OYW1lLFxyXG4gICAgICAgICAgU3VjY2Vzczogc3VjY2Vzcy50b1N0cmluZygpXHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICBdO1xyXG5cclxuICAgIGlmIChzdWNjZXNzICYmIGF0dGVtcHROdW1iZXIgPiAxKSB7XHJcbiAgICAgIG1ldHJpY3MucHVzaCh7XHJcbiAgICAgICAgbWV0cmljTmFtZTogJ1JldHJ5U3VjY2VzcycsXHJcbiAgICAgICAgdmFsdWU6IDEsXHJcbiAgICAgICAgdW5pdDogJ0NvdW50JyxcclxuICAgICAgICBkaW1lbnNpb25zOiB7XHJcbiAgICAgICAgICBTZXJ2aWNlOiBzZXJ2aWNlTmFtZSxcclxuICAgICAgICAgIE9wZXJhdGlvbjogb3BlcmF0aW9uTmFtZSxcclxuICAgICAgICAgIEF0dGVtcHROdW1iZXI6IGF0dGVtcHROdW1iZXIudG9TdHJpbmcoKVxyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgYXdhaXQgdGhpcy5wdXRNZXRyaWNzKG1ldHJpY3MpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUmVjb3JkIHVzZXIgYWN0aXZpdHkgbWV0cmljc1xyXG4gICAqL1xyXG4gIGFzeW5jIHJlY29yZFVzZXJBY3Rpdml0eShcclxuICAgIGFjdGl2aXR5VHlwZTogc3RyaW5nLFxyXG4gICAgdXNlcklkOiBzdHJpbmcsXHJcbiAgICBvcmdhbml6YXRpb25JZD86IHN0cmluZ1xyXG4gICk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgY29uc3QgbWV0cmljczogTWV0cmljRGF0YVtdID0gW1xyXG4gICAgICB7XHJcbiAgICAgICAgbWV0cmljTmFtZTogJ1VzZXJBY3Rpdml0eScsXHJcbiAgICAgICAgdmFsdWU6IDEsXHJcbiAgICAgICAgdW5pdDogJ0NvdW50JyxcclxuICAgICAgICBkaW1lbnNpb25zOiB7XHJcbiAgICAgICAgICBBY3Rpdml0eVR5cGU6IGFjdGl2aXR5VHlwZSxcclxuICAgICAgICAgIFVzZXJJZDogdXNlcklkLFxyXG4gICAgICAgICAgLi4uKG9yZ2FuaXphdGlvbklkICYmIHsgT3JnYW5pemF0aW9uSWQ6IG9yZ2FuaXphdGlvbklkIH0pXHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICBdO1xyXG5cclxuICAgIGF3YWl0IHRoaXMucHV0TWV0cmljcyhtZXRyaWNzKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFJlY29yZCBzeXN0ZW0gaGVhbHRoIG1ldHJpY3NcclxuICAgKi9cclxuICBhc3luYyByZWNvcmRTeXN0ZW1IZWFsdGgoXHJcbiAgICBzZXJ2aWNlTmFtZTogc3RyaW5nLFxyXG4gICAgaXNIZWFsdGh5OiBib29sZWFuLFxyXG4gICAgcmVzcG9uc2VUaW1lPzogbnVtYmVyXHJcbiAgKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBjb25zdCBtZXRyaWNzOiBNZXRyaWNEYXRhW10gPSBbXHJcbiAgICAgIHtcclxuICAgICAgICBtZXRyaWNOYW1lOiAnU2VydmljZUhlYWx0aCcsXHJcbiAgICAgICAgdmFsdWU6IGlzSGVhbHRoeSA/IDEgOiAwLFxyXG4gICAgICAgIHVuaXQ6ICdOb25lJyxcclxuICAgICAgICBkaW1lbnNpb25zOiB7XHJcbiAgICAgICAgICBTZXJ2aWNlOiBzZXJ2aWNlTmFtZVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgXTtcclxuXHJcbiAgICBpZiAocmVzcG9uc2VUaW1lICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgbWV0cmljcy5wdXNoKHtcclxuICAgICAgICBtZXRyaWNOYW1lOiAnSGVhbHRoQ2hlY2tEdXJhdGlvbicsXHJcbiAgICAgICAgdmFsdWU6IHJlc3BvbnNlVGltZSxcclxuICAgICAgICB1bml0OiAnTWlsbGlzZWNvbmRzJyxcclxuICAgICAgICBkaW1lbnNpb25zOiB7XHJcbiAgICAgICAgICBTZXJ2aWNlOiBzZXJ2aWNlTmFtZVxyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgYXdhaXQgdGhpcy5wdXRNZXRyaWNzKG1ldHJpY3MpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ3JlYXRlIGN1c3RvbSBkYXNoYm9hcmQgZm9yIG1vbml0b3JpbmdcclxuICAgKi9cclxuICBnZXREYXNoYm9hcmRDb25maWcoKTogYW55IHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHdpZGdldHM6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICB0eXBlOiAnbWV0cmljJyxcclxuICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgbWV0cmljczogW1xyXG4gICAgICAgICAgICAgIFt0aGlzLm5hbWVzcGFjZSwgJ0Vycm9yQ291bnQnLCAnU2VydmljZScsICdhbmFseXNpcy1zZXJ2aWNlJ10sXHJcbiAgICAgICAgICAgICAgW3RoaXMubmFtZXNwYWNlLCAnRXJyb3JDb3VudCcsICdTZXJ2aWNlJywgJ2ZpbGUtdXBsb2FkLXNlcnZpY2UnXSxcclxuICAgICAgICAgICAgICBbdGhpcy5uYW1lc3BhY2UsICdFcnJvckNvdW50JywgJ1NlcnZpY2UnLCAnYXV0aC1zZXJ2aWNlJ11cclxuICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgcGVyaW9kOiAzMDAsXHJcbiAgICAgICAgICAgIHN0YXQ6ICdTdW0nLFxyXG4gICAgICAgICAgICByZWdpb246ICd1cy1lYXN0LTEnLFxyXG4gICAgICAgICAgICB0aXRsZTogJ0Vycm9yIENvdW50IGJ5IFNlcnZpY2UnXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICB0eXBlOiAnbWV0cmljJyxcclxuICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgbWV0cmljczogW1xyXG4gICAgICAgICAgICAgIFt0aGlzLm5hbWVzcGFjZSwgJ09wZXJhdGlvbkR1cmF0aW9uJywgJ1NlcnZpY2UnLCAnYW5hbHlzaXMtc2VydmljZSddLFxyXG4gICAgICAgICAgICAgIFt0aGlzLm5hbWVzcGFjZSwgJ09wZXJhdGlvbkR1cmF0aW9uJywgJ1NlcnZpY2UnLCAnZmlsZS11cGxvYWQtc2VydmljZSddLFxyXG4gICAgICAgICAgICAgIFt0aGlzLm5hbWVzcGFjZSwgJ09wZXJhdGlvbkR1cmF0aW9uJywgJ1NlcnZpY2UnLCAnYXV0aC1zZXJ2aWNlJ11cclxuICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgcGVyaW9kOiAzMDAsXHJcbiAgICAgICAgICAgIHN0YXQ6ICdBdmVyYWdlJyxcclxuICAgICAgICAgICAgcmVnaW9uOiAndXMtZWFzdC0xJyxcclxuICAgICAgICAgICAgdGl0bGU6ICdBdmVyYWdlIFJlc3BvbnNlIFRpbWUgYnkgU2VydmljZSdcclxuICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIHR5cGU6ICdtZXRyaWMnLFxyXG4gICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICBtZXRyaWNzOiBbXHJcbiAgICAgICAgICAgICAgW3RoaXMubmFtZXNwYWNlLCAnQ2lyY3VpdEJyZWFrZXJTdGF0ZScsICdTZXJ2aWNlJywgJ2FuYWx5c2lzLXNlcnZpY2UnXSxcclxuICAgICAgICAgICAgICBbdGhpcy5uYW1lc3BhY2UsICdDaXJjdWl0QnJlYWtlclN0YXRlJywgJ1NlcnZpY2UnLCAnZmlsZS11cGxvYWQtc2VydmljZSddLFxyXG4gICAgICAgICAgICAgIFt0aGlzLm5hbWVzcGFjZSwgJ0NpcmN1aXRCcmVha2VyU3RhdGUnLCAnU2VydmljZScsICdhdXRoLXNlcnZpY2UnXVxyXG4gICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IDMwMCxcclxuICAgICAgICAgICAgc3RhdDogJ01heGltdW0nLFxyXG4gICAgICAgICAgICByZWdpb246ICd1cy1lYXN0LTEnLFxyXG4gICAgICAgICAgICB0aXRsZTogJ0NpcmN1aXQgQnJlYWtlciBTdGF0ZXMnXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICB0eXBlOiAnbWV0cmljJyxcclxuICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgbWV0cmljczogW1xyXG4gICAgICAgICAgICAgIFt0aGlzLm5hbWVzcGFjZSwgJ1NlcnZpY2VIZWFsdGgnLCAnU2VydmljZScsICdhbmFseXNpcy1zZXJ2aWNlJ10sXHJcbiAgICAgICAgICAgICAgW3RoaXMubmFtZXNwYWNlLCAnU2VydmljZUhlYWx0aCcsICdTZXJ2aWNlJywgJ2ZpbGUtdXBsb2FkLXNlcnZpY2UnXSxcclxuICAgICAgICAgICAgICBbdGhpcy5uYW1lc3BhY2UsICdTZXJ2aWNlSGVhbHRoJywgJ1NlcnZpY2UnLCAnYXV0aC1zZXJ2aWNlJ11cclxuICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgcGVyaW9kOiAzMDAsXHJcbiAgICAgICAgICAgIHN0YXQ6ICdBdmVyYWdlJyxcclxuICAgICAgICAgICAgcmVnaW9uOiAndXMtZWFzdC0xJyxcclxuICAgICAgICAgICAgdGl0bGU6ICdTZXJ2aWNlIEhlYWx0aCBTdGF0dXMnXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICBdXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IHJlY29tbWVuZGVkIGFsYXJtcyBjb25maWd1cmF0aW9uXHJcbiAgICovXHJcbiAgZ2V0UmVjb21tZW5kZWRBbGFybXMoKTogQWxhcm1Db25maWdbXSB7XHJcbiAgICByZXR1cm4gW1xyXG4gICAgICB7XHJcbiAgICAgICAgYWxhcm1OYW1lOiAnSGlnaEVycm9yUmF0ZScsXHJcbiAgICAgICAgbWV0cmljTmFtZTogJ0Vycm9yQ291bnQnLFxyXG4gICAgICAgIHRocmVzaG9sZDogMTAsXHJcbiAgICAgICAgY29tcGFyaXNvbk9wZXJhdG9yOiAnR3JlYXRlclRoYW5UaHJlc2hvbGQnLFxyXG4gICAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAyLFxyXG4gICAgICAgIHBlcmlvZDogMzAwLFxyXG4gICAgICAgIHN0YXRpc3RpYzogJ1N1bSdcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIGFsYXJtTmFtZTogJ0hpZ2hSZXNwb25zZVRpbWUnLFxyXG4gICAgICAgIG1ldHJpY05hbWU6ICdPcGVyYXRpb25EdXJhdGlvbicsXHJcbiAgICAgICAgdGhyZXNob2xkOiA1MDAwLFxyXG4gICAgICAgIGNvbXBhcmlzb25PcGVyYXRvcjogJ0dyZWF0ZXJUaGFuVGhyZXNob2xkJyxcclxuICAgICAgICBldmFsdWF0aW9uUGVyaW9kczogMyxcclxuICAgICAgICBwZXJpb2Q6IDMwMCxcclxuICAgICAgICBzdGF0aXN0aWM6ICdBdmVyYWdlJ1xyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgYWxhcm1OYW1lOiAnQ2lyY3VpdEJyZWFrZXJPcGVuJyxcclxuICAgICAgICBtZXRyaWNOYW1lOiAnQ2lyY3VpdEJyZWFrZXJTdGF0ZScsXHJcbiAgICAgICAgdGhyZXNob2xkOiAxLjUsXHJcbiAgICAgICAgY29tcGFyaXNvbk9wZXJhdG9yOiAnR3JlYXRlclRoYW5UaHJlc2hvbGQnLFxyXG4gICAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAxLFxyXG4gICAgICAgIHBlcmlvZDogMzAwLFxyXG4gICAgICAgIHN0YXRpc3RpYzogJ01heGltdW0nXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBhbGFybU5hbWU6ICdTZXJ2aWNlVW5oZWFsdGh5JyxcclxuICAgICAgICBtZXRyaWNOYW1lOiAnU2VydmljZUhlYWx0aCcsXHJcbiAgICAgICAgdGhyZXNob2xkOiAwLjUsXHJcbiAgICAgICAgY29tcGFyaXNvbk9wZXJhdG9yOiAnTGVzc1RoYW5UaHJlc2hvbGQnLFxyXG4gICAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAyLFxyXG4gICAgICAgIHBlcmlvZDogMzAwLFxyXG4gICAgICAgIHN0YXRpc3RpYzogJ0F2ZXJhZ2UnXHJcbiAgICAgIH1cclxuICAgIF07XHJcbiAgfVxyXG59XHJcblxyXG4vLyBHbG9iYWwgQ2xvdWRXYXRjaCBtb25pdG9yaW5nIHNlcnZpY2UgaW5zdGFuY2VcclxuZXhwb3J0IGNvbnN0IGNsb3VkV2F0Y2hNb25pdG9yaW5nU2VydmljZSA9IG5ldyBDbG91ZFdhdGNoTW9uaXRvcmluZ1NlcnZpY2UoKTsiXX0=