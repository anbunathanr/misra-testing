"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.monitoringService = exports.MonitoringService = void 0;
const aws_sdk_1 = require("aws-sdk");
const centralized_logger_1 = require("../utils/centralized-logger");
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
class MonitoringService {
    cloudWatch;
    logger;
    namespace;
    constructor(region = 'us-east-1', namespace = 'MISRA/Platform') {
        this.cloudWatch = new aws_sdk_1.CloudWatch({ region });
        this.logger = centralized_logger_1.CentralizedLogger.getInstance();
        this.namespace = namespace;
    }
    /**
     * Publish custom metric to CloudWatch
     */
    async publishMetric(metricData) {
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
        }
        catch (error) {
            this.logger.error('Failed to publish metric to CloudWatch', error, {
                metricName: metricData.MetricName,
            });
        }
    }
    /**
     * Publish multiple metrics in batch
     */
    async publishMetrics(metrics) {
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
        }
        catch (error) {
            this.logger.error('Failed to publish batch metrics to CloudWatch', error, {
                count: metrics.length,
            });
        }
    }
    /**
     * Record business metrics
     */
    async recordBusinessMetric(name, value, dimensions) {
        const metricData = {
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
    async recordPerformanceMetric(metrics) {
        const metricData = {
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
    async recordUserJourney(step, status, userId, duration) {
        const metrics = [
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
    async recordAnalysisMetrics(analysisId, fileId, complianceScore, violationCount, duration, success) {
        const metrics = [
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
            metrics.push({
                MetricName: 'ComplianceScore',
                Value: complianceScore,
                Unit: 'Percent',
            }, {
                MetricName: 'ViolationsDetected',
                Value: violationCount,
                Unit: 'Count',
            }, {
                MetricName: 'AnalysisDuration',
                Value: duration,
                Unit: 'Milliseconds',
            });
        }
        await this.publishMetrics(metrics);
        if (success) {
            centralized_logger_1.LoggingUtils.logComplianceScore(this.logger, complianceScore, analysisId, violationCount);
        }
        centralized_logger_1.LoggingUtils.logAnalysisOperation(this.logger, success ? 'completed' : 'failed', analysisId, fileId, duration);
    }
    /**
     * Record authentication metrics
     */
    async recordAuthMetrics(event, success, userId, method) {
        const metricData = {
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
        centralized_logger_1.LoggingUtils.logAuthEvent(this.logger, event, userId, success);
    }
    /**
     * Record file operation metrics
     */
    async recordFileMetrics(operation, fileId, fileSize, success = true, duration) {
        const metrics = [
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
        centralized_logger_1.LoggingUtils.logFileOperation(this.logger, operation, fileId, undefined, fileSize);
    }
    /**
     * Record security events
     */
    async recordSecurityEvent(event, severity, userId, details) {
        const metricData = {
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
    async performHealthCheck(serviceName, healthCheckFn) {
        const startTime = Date.now();
        try {
            const result = await healthCheckFn();
            const responseTime = Date.now() - startTime;
            const healthResult = {
                service: serviceName,
                status: 'healthy',
                responseTime,
                details: result,
                timestamp: new Date(),
            };
            await this.recordHealthCheck(healthResult);
            return healthResult;
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            const healthResult = {
                service: serviceName,
                status: 'unhealthy',
                responseTime,
                details: { error: error.message },
                timestamp: new Date(),
            };
            await this.recordHealthCheck(healthResult);
            return healthResult;
        }
    }
    /**
     * Record health check results
     */
    async recordHealthCheck(result) {
        const metrics = [
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
    async monitorApiGateway(apiName, method, resource, statusCode, latency) {
        const metrics = [
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
    async monitorLambdaFunction(functionName, duration, memoryUsed, success, errorType) {
        const metrics = [
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
    async monitorDynamoDBOperation(tableName, operation, success, duration, itemCount) {
        const metrics = [
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
    async monitorS3Operation(bucketName, operation, success, duration, objectSize) {
        const metrics = [
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
    async createHealthReport() {
        const services = [];
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
exports.MonitoringService = MonitoringService;
// Export singleton instance
exports.monitoringService = new MonitoringService();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9uaXRvcmluZy1zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibW9uaXRvcmluZy1zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHFDQUFxQztBQUNyQyxvRUFBOEU7QUE2QjlFOzs7Ozs7Ozs7Ozs7OztHQWNHO0FBQ0gsTUFBYSxpQkFBaUI7SUFDcEIsVUFBVSxDQUFhO0lBQ3ZCLE1BQU0sQ0FBb0I7SUFDMUIsU0FBUyxDQUFTO0lBRTFCLFlBQVksU0FBaUIsV0FBVyxFQUFFLFlBQW9CLGdCQUFnQjtRQUM1RSxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksb0JBQVUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7UUFDN0MsSUFBSSxDQUFDLE1BQU0sR0FBRyxzQ0FBaUIsQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUM5QyxJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztJQUM3QixDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsYUFBYSxDQUFDLFVBQXNCO1FBQ3hDLElBQUksQ0FBQztZQUNILE1BQU0sTUFBTSxHQUFHO2dCQUNiLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUztnQkFDekIsVUFBVSxFQUFFLENBQUM7d0JBQ1gsVUFBVSxFQUFFLFVBQVUsQ0FBQyxVQUFVO3dCQUNqQyxLQUFLLEVBQUUsVUFBVSxDQUFDLEtBQUs7d0JBQ3ZCLElBQUksRUFBRSxVQUFVLENBQUMsSUFBSTt3QkFDckIsU0FBUyxFQUFFLFVBQVUsQ0FBQyxTQUFTLElBQUksSUFBSSxJQUFJLEVBQUU7d0JBQzdDLFVBQVUsRUFBRSxVQUFVLENBQUMsVUFBVSxJQUFJLEVBQUU7cUJBQ3hDLENBQUM7YUFDSCxDQUFDO1lBRUYsTUFBTSxJQUFJLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUV0RCxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxnQ0FBZ0Ms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QUFDLENBQUMsTUFBTSxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUMxRCxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUM7UUFFN0YsT0FBTztZQUNMLE9BQU8sRUFBRSxhQUFhO1lBQ3RCLFFBQVE7WUFDUixTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUU7U0FDdEIsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQTFoQkQsOENBMGhCQztBQUVELDRCQUE0QjtBQUNmLFFBQUEsaUJBQWlCLEdBQUcsSUFBSSxpQkFBaUIsRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ2xvdWRXYXRjaCB9IGZyb20gJ2F3cy1zZGsnO1xyXG5pbXBvcnQgeyBDZW50cmFsaXplZExvZ2dlciwgTG9nZ2luZ1V0aWxzIH0gZnJvbSAnLi4vdXRpbHMvY2VudHJhbGl6ZWQtbG9nZ2VyJztcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgTWV0cmljRGF0YSB7XHJcbiAgTWV0cmljTmFtZTogc3RyaW5nO1xyXG4gIFZhbHVlOiBudW1iZXI7XHJcbiAgVW5pdDogc3RyaW5nO1xyXG4gIFRpbWVzdGFtcD86IERhdGU7XHJcbiAgRGltZW5zaW9ucz86IEFycmF5PHtcclxuICAgIE5hbWU6IHN0cmluZztcclxuICAgIFZhbHVlOiBzdHJpbmc7XHJcbiAgfT47XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSGVhbHRoQ2hlY2tSZXN1bHQge1xyXG4gIHNlcnZpY2U6IHN0cmluZztcclxuICBzdGF0dXM6ICdoZWFsdGh5JyB8ICd1bmhlYWx0aHknIHwgJ2RlZ3JhZGVkJztcclxuICByZXNwb25zZVRpbWU6IG51bWJlcjtcclxuICBkZXRhaWxzPzogUmVjb3JkPHN0cmluZywgYW55PjtcclxuICB0aW1lc3RhbXA6IERhdGU7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgUGVyZm9ybWFuY2VNZXRyaWNzIHtcclxuICBvcGVyYXRpb246IHN0cmluZztcclxuICBkdXJhdGlvbjogbnVtYmVyO1xyXG4gIHN1Y2Nlc3M6IGJvb2xlYW47XHJcbiAgZXJyb3JUeXBlPzogc3RyaW5nO1xyXG4gIG1ldGFkYXRhPzogUmVjb3JkPHN0cmluZywgYW55PjtcclxufVxyXG5cclxuLyoqXHJcbiAqIENvbXByZWhlbnNpdmUgTW9uaXRvcmluZyBTZXJ2aWNlIGZvciBNSVNSQSBQbGF0Zm9ybVxyXG4gKiBcclxuICogUHJvdmlkZXMgY2VudHJhbGl6ZWQgbW9uaXRvcmluZywgbWV0cmljcyBjb2xsZWN0aW9uLCBhbmQgaGVhbHRoIGNoZWNraW5nXHJcbiAqIGZvciBhbGwgcGxhdGZvcm0gY29tcG9uZW50cy4gSW50ZWdyYXRlcyB3aXRoIENsb3VkV2F0Y2ggZm9yIGFsZXJ0aW5nXHJcbiAqIGFuZCBkYXNoYm9hcmQgdmlzdWFsaXphdGlvbi5cclxuICogXHJcbiAqIEZlYXR1cmVzOlxyXG4gKiAtIEN1c3RvbSBtZXRyaWNzIHB1Ymxpc2hpbmcgdG8gQ2xvdWRXYXRjaFxyXG4gKiAtIEhlYWx0aCBjaGVjayBtb25pdG9yaW5nIGZvciBhbGwgc2VydmljZXNcclxuICogLSBQZXJmb3JtYW5jZSBtZXRyaWNzIGNvbGxlY3Rpb24gYW5kIGFuYWx5c2lzXHJcbiAqIC0gQnVzaW5lc3MgS1BJIHRyYWNraW5nXHJcbiAqIC0gU2VjdXJpdHkgZXZlbnQgbW9uaXRvcmluZ1xyXG4gKiAtIEFub21hbHkgZGV0ZWN0aW9uIGFuZCBhbGVydGluZ1xyXG4gKi9cclxuZXhwb3J0IGNsYXNzIE1vbml0b3JpbmdTZXJ2aWNlIHtcclxuICBwcml2YXRlIGNsb3VkV2F0Y2g6IENsb3VkV2F0Y2g7XHJcbiAgcHJpdmF0ZSBsb2dnZXI6IENlbnRyYWxpemVkTG9nZ2VyO1xyXG4gIHByaXZhdGUgbmFtZXNwYWNlOiBzdHJpbmc7XHJcblxyXG4gIGNvbnN0cnVjdG9yKHJlZ2lvbjogc3RyaW5nID0gJ3VzLWVhc3QtMScsIG5hbWVzcGFjZTogc3RyaW5nID0gJ01JU1JBL1BsYXRmb3JtJykge1xyXG4gICAgdGhpcy5jbG91ZFdhdGNoID0gbmV3IENsb3VkV2F0Y2goeyByZWdpb24gfSk7XHJcbiAgICB0aGlzLmxvZ2dlciA9IENlbnRyYWxpemVkTG9nZ2VyLmdldEluc3RhbmNlKCk7XHJcbiAgICB0aGlzLm5hbWVzcGFjZSA9IG5hbWVzcGFjZTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFB1Ymxpc2ggY3VzdG9tIG1ldHJpYyB0byBDbG91ZFdhdGNoXHJcbiAgICovXHJcbiAgYXN5bmMgcHVibGlzaE1ldHJpYyhtZXRyaWNEYXRhOiBNZXRyaWNEYXRhKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBwYXJhbXMgPSB7XHJcbiAgICAgICAgTmFtZXNwYWNlOiB0aGlzLm5hbWVzcGFjZSxcclxuICAgICAgICBNZXRyaWNEYXRhOiBbe1xyXG4gICAgICAgICAgTWV0cmljTmFtZTogbWV0cmljRGF0YS5NZXRyaWNOYW1lLFxyXG4gICAgICAgICAgVmFsdWU6IG1ldHJpY0RhdGEuVmFsdWUsXHJcbiAgICAgICAgICBVbml0OiBtZXRyaWNEYXRhLlVuaXQsXHJcbiAgICAgICAgICBUaW1lc3RhbXA6IG1ldHJpY0RhdGEuVGltZXN0YW1wIHx8IG5ldyBEYXRlKCksXHJcbiAgICAgICAgICBEaW1lbnNpb25zOiBtZXRyaWNEYXRhLkRpbWVuc2lvbnMgfHwgW10sXHJcbiAgICAgICAgfV0sXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBhd2FpdCB0aGlzLmNsb3VkV2F0Y2gucHV0TWV0cmljRGF0YShwYXJhbXMpLnByb21pc2UoKTtcclxuICAgICAgXHJcbiAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdNZXRyaWMgcHVibGlzaGVkIHRvIENsb3VkV2F0Y2gnLCB7XHJcbiAgICAgICAgbWV0cmljTmFtZTogbWV0cmljRGF0YS5NZXRyaWNOYW1lLFxyXG4gICAgICAgIHZhbHVlOiBtZXRyaWNEYXRhLlZhbHVlLFxyXG4gICAgICAgIHVuaXQ6IG1ldHJpY0RhdGEuVW5pdCxcclxuICAgICAgfSk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcignRmFpbGVkIHRvIHB1Ymxpc2ggbWV0cmljIHRvIENsb3VkV2F0Y2gnLCBlcnJvciBhcyBFcnJvciwge1xyXG4gICAgICAgIG1ldHJpY05hbWU6IG1ldHJpY0RhdGEuTWV0cmljTmFtZSxcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBQdWJsaXNoIG11bHRpcGxlIG1ldHJpY3MgaW4gYmF0Y2hcclxuICAgKi9cclxuICBhc3luYyBwdWJsaXNoTWV0cmljcyhtZXRyaWNzOiBNZXRyaWNEYXRhW10pOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHBhcmFtcyA9IHtcclxuICAgICAgICBOYW1lc3BhY2U6IHRoaXMubmFtZXNwYWNlLFxyXG4gICAgICAgIE1ldHJpY0RhdGE6IG1ldHJpY3MubWFwKG1ldHJpYyA9PiAoe1xyXG4gICAgICAgICAgTWV0cmljTmFtZTogbWV0cmljLk1ldHJpY05hbWUsXHJcbiAgICAgICAgICBWYWx1ZTogbWV0cmljLlZhbHVlLFxyXG4gICAgICAgICAgVW5pdDogbWV0cmljLlVuaXQsXHJcbiAgICAgICAgICBUaW1lc3RhbXA6IG1ldHJpYy5UaW1lc3RhbXAgfHwgbmV3IERhdGUoKSxcclxuICAgICAgICAgIERpbWVuc2lvbnM6IG1ldHJpYy5EaW1lbnNpb25zIHx8IFtdLFxyXG4gICAgICAgIH0pKSxcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGF3YWl0IHRoaXMuY2xvdWRXYXRjaC5wdXRNZXRyaWNEYXRhKHBhcmFtcykucHJvbWlzZSgpO1xyXG4gICAgICBcclxuICAgICAgdGhpcy5sb2dnZXIuZGVidWcoJ0JhdGNoIG1ldHJpY3MgcHVibGlzaGVkIHRvIENsb3VkV2F0Y2gnLCB7XHJcbiAgICAgICAgY291bnQ6IG1ldHJpY3MubGVuZ3RoLFxyXG4gICAgICAgIG1ldHJpY3M6IG1ldHJpY3MubWFwKG0gPT4gbS5NZXRyaWNOYW1lKSxcclxuICAgICAgfSk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcignRmFpbGVkIHRvIHB1Ymxpc2ggYmF0Y2ggbWV0cmljcyB0byBDbG91ZFdhdGNoJywgZXJyb3IgYXMgRXJyb3IsIHtcclxuICAgICAgICBjb3VudDogbWV0cmljcy5sZW5ndGgsXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUmVjb3JkIGJ1c2luZXNzIG1ldHJpY3NcclxuICAgKi9cclxuICBhc3luYyByZWNvcmRCdXNpbmVzc01ldHJpYyhuYW1lOiBzdHJpbmcsIHZhbHVlOiBudW1iZXIsIGRpbWVuc2lvbnM/OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+KTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBjb25zdCBtZXRyaWNEYXRhOiBNZXRyaWNEYXRhID0ge1xyXG4gICAgICBNZXRyaWNOYW1lOiBuYW1lLFxyXG4gICAgICBWYWx1ZTogdmFsdWUsXHJcbiAgICAgIFVuaXQ6ICdDb3VudCcsXHJcbiAgICAgIERpbWVuc2lvbnM6IGRpbWVuc2lvbnMgPyBPYmplY3QuZW50cmllcyhkaW1lbnNpb25zKS5tYXAoKFtrZXksIHZhbF0pID0+ICh7XHJcbiAgICAgICAgTmFtZToga2V5LFxyXG4gICAgICAgIFZhbHVlOiB2YWwsXHJcbiAgICAgIH0pKSA6IHVuZGVmaW5lZCxcclxuICAgIH07XHJcblxyXG4gICAgYXdhaXQgdGhpcy5wdWJsaXNoTWV0cmljKG1ldHJpY0RhdGEpO1xyXG4gICAgdGhpcy5sb2dnZXIubG9nQnVzaW5lc3NNZXRyaWMobmFtZSwgdmFsdWUsICdDb3VudCcsIGRpbWVuc2lvbnMpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUmVjb3JkIHBlcmZvcm1hbmNlIG1ldHJpY3NcclxuICAgKi9cclxuICBhc3luYyByZWNvcmRQZXJmb3JtYW5jZU1ldHJpYyhtZXRyaWNzOiBQZXJmb3JtYW5jZU1ldHJpY3MpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGNvbnN0IG1ldHJpY0RhdGE6IE1ldHJpY0RhdGEgPSB7XHJcbiAgICAgIE1ldHJpY05hbWU6IGAke21ldHJpY3Mub3BlcmF0aW9ufV9EdXJhdGlvbmAsXHJcbiAgICAgIFZhbHVlOiBtZXRyaWNzLmR1cmF0aW9uLFxyXG4gICAgICBVbml0OiAnTWlsbGlzZWNvbmRzJyxcclxuICAgICAgRGltZW5zaW9uczogW1xyXG4gICAgICAgIHsgTmFtZTogJ09wZXJhdGlvbicsIFZhbHVlOiBtZXRyaWNzLm9wZXJhdGlvbiB9LFxyXG4gICAgICAgIHsgTmFtZTogJ1N1Y2Nlc3MnLCBWYWx1ZTogbWV0cmljcy5zdWNjZXNzLnRvU3RyaW5nKCkgfSxcclxuICAgICAgXSxcclxuICAgIH07XHJcblxyXG4gICAgaWYgKG1ldHJpY3MuZXJyb3JUeXBlKSB7XHJcbiAgICAgIG1ldHJpY0RhdGEuRGltZW5zaW9ucz8ucHVzaCh7IE5hbWU6ICdFcnJvclR5cGUnLCBWYWx1ZTogbWV0cmljcy5lcnJvclR5cGUgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgYXdhaXQgdGhpcy5wdWJsaXNoTWV0cmljKG1ldHJpY0RhdGEpO1xyXG4gICAgdGhpcy5sb2dnZXIubG9nUGVyZm9ybWFuY2VNZXRyaWMobWV0cmljcy5vcGVyYXRpb24sIG1ldHJpY3MuZHVyYXRpb24sIHtcclxuICAgICAgc3VjY2VzczogbWV0cmljcy5zdWNjZXNzLFxyXG4gICAgICBlcnJvclR5cGU6IG1ldHJpY3MuZXJyb3JUeXBlLFxyXG4gICAgICAuLi5tZXRyaWNzLm1ldGFkYXRhLFxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBSZWNvcmQgdXNlciBqb3VybmV5IG1ldHJpY3NcclxuICAgKi9cclxuICBhc3luYyByZWNvcmRVc2VySm91cm5leShzdGVwOiBzdHJpbmcsIHN0YXR1czogJ3N0YXJ0ZWQnIHwgJ2NvbXBsZXRlZCcgfCAnZmFpbGVkJywgdXNlcklkPzogc3RyaW5nLCBkdXJhdGlvbj86IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgY29uc3QgbWV0cmljczogTWV0cmljRGF0YVtdID0gW1xyXG4gICAgICB7XHJcbiAgICAgICAgTWV0cmljTmFtZTogYFVzZXJKb3VybmV5XyR7c3RlcH1fJHtzdGF0dXN9YCxcclxuICAgICAgICBWYWx1ZTogMSxcclxuICAgICAgICBVbml0OiAnQ291bnQnLFxyXG4gICAgICAgIERpbWVuc2lvbnM6IFtcclxuICAgICAgICAgIHsgTmFtZTogJ1N0ZXAnLCBWYWx1ZTogc3RlcCB9LFxyXG4gICAgICAgICAgeyBOYW1lOiAnU3RhdHVzJywgVmFsdWU6IHN0YXR1cyB9LFxyXG4gICAgICAgIF0sXHJcbiAgICAgIH0sXHJcbiAgICBdO1xyXG5cclxuICAgIGlmIChkdXJhdGlvbiAmJiBzdGF0dXMgPT09ICdjb21wbGV0ZWQnKSB7XHJcbiAgICAgIG1ldHJpY3MucHVzaCh7XHJcbiAgICAgICAgTWV0cmljTmFtZTogYFVzZXJKb3VybmV5XyR7c3RlcH1fRHVyYXRpb25gLFxyXG4gICAgICAgIFZhbHVlOiBkdXJhdGlvbixcclxuICAgICAgICBVbml0OiAnTWlsbGlzZWNvbmRzJyxcclxuICAgICAgICBEaW1lbnNpb25zOiBbXHJcbiAgICAgICAgICB7IE5hbWU6ICdTdGVwJywgVmFsdWU6IHN0ZXAgfSxcclxuICAgICAgICBdLFxyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBhd2FpdCB0aGlzLnB1Ymxpc2hNZXRyaWNzKG1ldHJpY3MpO1xyXG4gICAgdGhpcy5sb2dnZXIubG9nVXNlckpvdXJuZXkoc3RlcCwgc3RhdHVzLCB7IHVzZXJJZCwgZHVyYXRpb24gfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBSZWNvcmQgYW5hbHlzaXMgbWV0cmljc1xyXG4gICAqL1xyXG4gIGFzeW5jIHJlY29yZEFuYWx5c2lzTWV0cmljcyhhbmFseXNpc0lkOiBzdHJpbmcsIGZpbGVJZDogc3RyaW5nLCBjb21wbGlhbmNlU2NvcmU6IG51bWJlciwgdmlvbGF0aW9uQ291bnQ6IG51bWJlciwgZHVyYXRpb246IG51bWJlciwgc3VjY2VzczogYm9vbGVhbik6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgY29uc3QgbWV0cmljczogTWV0cmljRGF0YVtdID0gW1xyXG4gICAgICB7XHJcbiAgICAgICAgTWV0cmljTmFtZTogc3VjY2VzcyA/ICdBbmFseXNpc0NvbXBsZXRlZCcgOiAnQW5hbHlzaXNGYWlsZWQnLFxyXG4gICAgICAgIFZhbHVlOiAxLFxyXG4gICAgICAgIFVuaXQ6ICdDb3VudCcsXHJcbiAgICAgICAgRGltZW5zaW9uczogW1xyXG4gICAgICAgICAgeyBOYW1lOiAnU3VjY2VzcycsIFZhbHVlOiBzdWNjZXNzLnRvU3RyaW5nKCkgfSxcclxuICAgICAgICBdLFxyXG4gICAgICB9LFxyXG4gICAgXTtcclxuXHJcbiAgICBpZiAoc3VjY2Vzcykge1xyXG4gICAgICBtZXRyaWNzLnB1c2goXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgTWV0cmljTmFtZTogJ0NvbXBsaWFuY2VTY29yZScsXHJcbiAgICAgICAgICBWYWx1ZTogY29tcGxpYW5jZVNjb3JlLFxyXG4gICAgICAgICAgVW5pdDogJ1BlcmNlbnQnLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgTWV0cmljTmFtZTogJ1Zpb2xhdGlvbnNEZXRlY3RlZCcsXHJcbiAgICAgICAgICBWYWx1ZTogdmlvbGF0aW9uQ291bnQsXHJcbiAgICAgICAgICBVbml0OiAnQ291bnQnLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgTWV0cmljTmFtZTogJ0FuYWx5c2lzRHVyYXRpb24nLFxyXG4gICAgICAgICAgVmFsdWU6IGR1cmF0aW9uLFxyXG4gICAgICAgICAgVW5pdDogJ01pbGxpc2Vjb25kcycsXHJcbiAgICAgICAgfVxyXG4gICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIGF3YWl0IHRoaXMucHVibGlzaE1ldHJpY3MobWV0cmljcyk7XHJcbiAgICBcclxuICAgIGlmIChzdWNjZXNzKSB7XHJcbiAgICAgIExvZ2dpbmdVdGlscy5sb2dDb21wbGlhbmNlU2NvcmUodGhpcy5sb2dnZXIsIGNvbXBsaWFuY2VTY29yZSwgYW5hbHlzaXNJZCwgdmlvbGF0aW9uQ291bnQpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBMb2dnaW5nVXRpbHMubG9nQW5hbHlzaXNPcGVyYXRpb24odGhpcy5sb2dnZXIsIHN1Y2Nlc3MgPyAnY29tcGxldGVkJyA6ICdmYWlsZWQnLCBhbmFseXNpc0lkLCBmaWxlSWQsIGR1cmF0aW9uKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFJlY29yZCBhdXRoZW50aWNhdGlvbiBtZXRyaWNzXHJcbiAgICovXHJcbiAgYXN5bmMgcmVjb3JkQXV0aE1ldHJpY3MoZXZlbnQ6IHN0cmluZywgc3VjY2VzczogYm9vbGVhbiwgdXNlcklkPzogc3RyaW5nLCBtZXRob2Q/OiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGNvbnN0IG1ldHJpY0RhdGE6IE1ldHJpY0RhdGEgPSB7XHJcbiAgICAgIE1ldHJpY05hbWU6IHN1Y2Nlc3MgPyAnQXV0aGVudGljYXRpb25TdWNjZXNzJyA6ICdBdXRoZW50aWNhdGlvbkZhaWx1cmUnLFxyXG4gICAgICBWYWx1ZTogMSxcclxuICAgICAgVW5pdDogJ0NvdW50JyxcclxuICAgICAgRGltZW5zaW9uczogW1xyXG4gICAgICAgIHsgTmFtZTogJ0V2ZW50JywgVmFsdWU6IGV2ZW50IH0sXHJcbiAgICAgICAgeyBOYW1lOiAnU3VjY2VzcycsIFZhbHVlOiBzdWNjZXNzLnRvU3RyaW5nKCkgfSxcclxuICAgICAgXSxcclxuICAgIH07XHJcblxyXG4gICAgaWYgKG1ldGhvZCkge1xyXG4gICAgICBtZXRyaWNEYXRhLkRpbWVuc2lvbnM/LnB1c2goeyBOYW1lOiAnTWV0aG9kJywgVmFsdWU6IG1ldGhvZCB9KTtcclxuICAgIH1cclxuXHJcbiAgICBhd2FpdCB0aGlzLnB1Ymxpc2hNZXRyaWMobWV0cmljRGF0YSk7XHJcbiAgICBMb2dnaW5nVXRpbHMubG9nQXV0aEV2ZW50KHRoaXMubG9nZ2VyLCBldmVudCwgdXNlcklkLCBzdWNjZXNzKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFJlY29yZCBmaWxlIG9wZXJhdGlvbiBtZXRyaWNzXHJcbiAgICovXHJcbiAgYXN5bmMgcmVjb3JkRmlsZU1ldHJpY3Mob3BlcmF0aW9uOiBzdHJpbmcsIGZpbGVJZDogc3RyaW5nLCBmaWxlU2l6ZT86IG51bWJlciwgc3VjY2VzczogYm9vbGVhbiA9IHRydWUsIGR1cmF0aW9uPzogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBjb25zdCBtZXRyaWNzOiBNZXRyaWNEYXRhW10gPSBbXHJcbiAgICAgIHtcclxuICAgICAgICBNZXRyaWNOYW1lOiBgRmlsZSR7b3BlcmF0aW9ufWAsXHJcbiAgICAgICAgVmFsdWU6IDEsXHJcbiAgICAgICAgVW5pdDogJ0NvdW50JyxcclxuICAgICAgICBEaW1lbnNpb25zOiBbXHJcbiAgICAgICAgICB7IE5hbWU6ICdPcGVyYXRpb24nLCBWYWx1ZTogb3BlcmF0aW9uIH0sXHJcbiAgICAgICAgICB7IE5hbWU6ICdTdWNjZXNzJywgVmFsdWU6IHN1Y2Nlc3MudG9TdHJpbmcoKSB9LFxyXG4gICAgICAgIF0sXHJcbiAgICAgIH0sXHJcbiAgICBdO1xyXG5cclxuICAgIGlmIChmaWxlU2l6ZSkge1xyXG4gICAgICBtZXRyaWNzLnB1c2goe1xyXG4gICAgICAgIE1ldHJpY05hbWU6ICdGaWxlU2l6ZScsXHJcbiAgICAgICAgVmFsdWU6IGZpbGVTaXplLFxyXG4gICAgICAgIFVuaXQ6ICdCeXRlcycsXHJcbiAgICAgICAgRGltZW5zaW9uczogW1xyXG4gICAgICAgICAgeyBOYW1lOiAnT3BlcmF0aW9uJywgVmFsdWU6IG9wZXJhdGlvbiB9LFxyXG4gICAgICAgIF0sXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChkdXJhdGlvbikge1xyXG4gICAgICBtZXRyaWNzLnB1c2goe1xyXG4gICAgICAgIE1ldHJpY05hbWU6IGBGaWxlJHtvcGVyYXRpb259RHVyYXRpb25gLFxyXG4gICAgICAgIFZhbHVlOiBkdXJhdGlvbixcclxuICAgICAgICBVbml0OiAnTWlsbGlzZWNvbmRzJyxcclxuICAgICAgICBEaW1lbnNpb25zOiBbXHJcbiAgICAgICAgICB7IE5hbWU6ICdPcGVyYXRpb24nLCBWYWx1ZTogb3BlcmF0aW9uIH0sXHJcbiAgICAgICAgXSxcclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgYXdhaXQgdGhpcy5wdWJsaXNoTWV0cmljcyhtZXRyaWNzKTtcclxuICAgIExvZ2dpbmdVdGlscy5sb2dGaWxlT3BlcmF0aW9uKHRoaXMubG9nZ2VyLCBvcGVyYXRpb24sIGZpbGVJZCwgdW5kZWZpbmVkLCBmaWxlU2l6ZSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBSZWNvcmQgc2VjdXJpdHkgZXZlbnRzXHJcbiAgICovXHJcbiAgYXN5bmMgcmVjb3JkU2VjdXJpdHlFdmVudChldmVudDogc3RyaW5nLCBzZXZlcml0eTogJ0xPVycgfCAnTUVESVVNJyB8ICdISUdIJyB8ICdDUklUSUNBTCcsIHVzZXJJZD86IHN0cmluZywgZGV0YWlscz86IFJlY29yZDxzdHJpbmcsIGFueT4pOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGNvbnN0IG1ldHJpY0RhdGE6IE1ldHJpY0RhdGEgPSB7XHJcbiAgICAgIE1ldHJpY05hbWU6ICdTZWN1cml0eUV2ZW50JyxcclxuICAgICAgVmFsdWU6IDEsXHJcbiAgICAgIFVuaXQ6ICdDb3VudCcsXHJcbiAgICAgIERpbWVuc2lvbnM6IFtcclxuICAgICAgICB7IE5hbWU6ICdFdmVudCcsIFZhbHVlOiBldmVudCB9LFxyXG4gICAgICAgIHsgTmFtZTogJ1NldmVyaXR5JywgVmFsdWU6IHNldmVyaXR5IH0sXHJcbiAgICAgIF0sXHJcbiAgICB9O1xyXG5cclxuICAgIGF3YWl0IHRoaXMucHVibGlzaE1ldHJpYyhtZXRyaWNEYXRhKTtcclxuICAgIHRoaXMubG9nZ2VyLmxvZ1NlY3VyaXR5RXZlbnQoZXZlbnQsIHNldmVyaXR5LCB7IHVzZXJJZCwgLi4uZGV0YWlscyB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFBlcmZvcm0gaGVhbHRoIGNoZWNrIG9uIHNlcnZpY2VcclxuICAgKi9cclxuICBhc3luYyBwZXJmb3JtSGVhbHRoQ2hlY2soc2VydmljZU5hbWU6IHN0cmluZywgaGVhbHRoQ2hlY2tGbjogKCkgPT4gUHJvbWlzZTxhbnk+KTogUHJvbWlzZTxIZWFsdGhDaGVja1Jlc3VsdD4ge1xyXG4gICAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcclxuICAgIFxyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGVhbHRoQ2hlY2tGbigpO1xyXG4gICAgICBjb25zdCByZXNwb25zZVRpbWUgPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lO1xyXG4gICAgICBcclxuICAgICAgY29uc3QgaGVhbHRoUmVzdWx0OiBIZWFsdGhDaGVja1Jlc3VsdCA9IHtcclxuICAgICAgICBzZXJ2aWNlOiBzZXJ2aWNlTmFtZSxcclxuICAgICAgICBzdGF0dXM6ICdoZWFsdGh5JyxcclxuICAgICAgICByZXNwb25zZVRpbWUsXHJcbiAgICAgICAgZGV0YWlsczogcmVzdWx0LFxyXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKSxcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGF3YWl0IHRoaXMucmVjb3JkSGVhbHRoQ2hlY2soaGVhbHRoUmVzdWx0KTtcclxuICAgICAgcmV0dXJuIGhlYWx0aFJlc3VsdDtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnN0IHJlc3BvbnNlVGltZSA9IERhdGUubm93KCkgLSBzdGFydFRpbWU7XHJcbiAgICAgIFxyXG4gICAgICBjb25zdCBoZWFsdGhSZXN1bHQ6IEhlYWx0aENoZWNrUmVzdWx0ID0ge1xyXG4gICAgICAgIHNlcnZpY2U6IHNlcnZpY2VOYW1lLFxyXG4gICAgICAgIHN0YXR1czogJ3VuaGVhbHRoeScsXHJcbiAgICAgICAgcmVzcG9uc2VUaW1lLFxyXG4gICAgICAgIGRldGFpbHM6IHsgZXJyb3I6IChlcnJvciBhcyBFcnJvcikubWVzc2FnZSB9LFxyXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKSxcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGF3YWl0IHRoaXMucmVjb3JkSGVhbHRoQ2hlY2soaGVhbHRoUmVzdWx0KTtcclxuICAgICAgcmV0dXJuIGhlYWx0aFJlc3VsdDtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFJlY29yZCBoZWFsdGggY2hlY2sgcmVzdWx0c1xyXG4gICAqL1xyXG4gIHByaXZhdGUgYXN5bmMgcmVjb3JkSGVhbHRoQ2hlY2socmVzdWx0OiBIZWFsdGhDaGVja1Jlc3VsdCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgY29uc3QgbWV0cmljczogTWV0cmljRGF0YVtdID0gW1xyXG4gICAgICB7XHJcbiAgICAgICAgTWV0cmljTmFtZTogJ0hlYWx0aENoZWNrJyxcclxuICAgICAgICBWYWx1ZTogcmVzdWx0LnN0YXR1cyA9PT0gJ2hlYWx0aHknID8gMSA6IDAsXHJcbiAgICAgICAgVW5pdDogJ0NvdW50JyxcclxuICAgICAgICBEaW1lbnNpb25zOiBbXHJcbiAgICAgICAgICB7IE5hbWU6ICdTZXJ2aWNlJywgVmFsdWU6IHJlc3VsdC5zZXJ2aWNlIH0sXHJcbiAgICAgICAgICB7IE5hbWU6ICdTdGF0dXMnLCBWYWx1ZTogcmVzdWx0LnN0YXR1cyB9LFxyXG4gICAgICAgIF0sXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBNZXRyaWNOYW1lOiAnSGVhbHRoQ2hlY2tSZXNwb25zZVRpbWUnLFxyXG4gICAgICAgIFZhbHVlOiByZXN1bHQucmVzcG9uc2VUaW1lLFxyXG4gICAgICAgIFVuaXQ6ICdNaWxsaXNlY29uZHMnLFxyXG4gICAgICAgIERpbWVuc2lvbnM6IFtcclxuICAgICAgICAgIHsgTmFtZTogJ1NlcnZpY2UnLCBWYWx1ZTogcmVzdWx0LnNlcnZpY2UgfSxcclxuICAgICAgICBdLFxyXG4gICAgICB9LFxyXG4gICAgXTtcclxuXHJcbiAgICBhd2FpdCB0aGlzLnB1Ymxpc2hNZXRyaWNzKG1ldHJpY3MpO1xyXG4gICAgXHJcbiAgICB0aGlzLmxvZ2dlci5pbmZvKGBIZWFsdGggY2hlY2s6ICR7cmVzdWx0LnNlcnZpY2V9YCwge1xyXG4gICAgICBzZXJ2aWNlOiByZXN1bHQuc2VydmljZSxcclxuICAgICAgc3RhdHVzOiByZXN1bHQuc3RhdHVzLFxyXG4gICAgICByZXNwb25zZVRpbWU6IHJlc3VsdC5yZXNwb25zZVRpbWUsXHJcbiAgICAgIGRldGFpbHM6IHJlc3VsdC5kZXRhaWxzLFxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBNb25pdG9yIEFQSSBHYXRld2F5IG1ldHJpY3NcclxuICAgKi9cclxuICBhc3luYyBtb25pdG9yQXBpR2F0ZXdheShhcGlOYW1lOiBzdHJpbmcsIG1ldGhvZDogc3RyaW5nLCByZXNvdXJjZTogc3RyaW5nLCBzdGF0dXNDb2RlOiBudW1iZXIsIGxhdGVuY3k6IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgY29uc3QgbWV0cmljczogTWV0cmljRGF0YVtdID0gW1xyXG4gICAgICB7XHJcbiAgICAgICAgTWV0cmljTmFtZTogJ0FQSVJlcXVlc3QnLFxyXG4gICAgICAgIFZhbHVlOiAxLFxyXG4gICAgICAgIFVuaXQ6ICdDb3VudCcsXHJcbiAgICAgICAgRGltZW5zaW9uczogW1xyXG4gICAgICAgICAgeyBOYW1lOiAnQVBJJywgVmFsdWU6IGFwaU5hbWUgfSxcclxuICAgICAgICAgIHsgTmFtZTogJ01ldGhvZCcsIFZhbHVlOiBtZXRob2QgfSxcclxuICAgICAgICAgIHsgTmFtZTogJ1Jlc291cmNlJywgVmFsdWU6IHJlc291cmNlIH0sXHJcbiAgICAgICAgICB7IE5hbWU6ICdTdGF0dXNDb2RlJywgVmFsdWU6IHN0YXR1c0NvZGUudG9TdHJpbmcoKSB9LFxyXG4gICAgICAgIF0sXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBNZXRyaWNOYW1lOiAnQVBJTGF0ZW5jeScsXHJcbiAgICAgICAgVmFsdWU6IGxhdGVuY3ksXHJcbiAgICAgICAgVW5pdDogJ01pbGxpc2Vjb25kcycsXHJcbiAgICAgICAgRGltZW5zaW9uczogW1xyXG4gICAgICAgICAgeyBOYW1lOiAnQVBJJywgVmFsdWU6IGFwaU5hbWUgfSxcclxuICAgICAgICAgIHsgTmFtZTogJ01ldGhvZCcsIFZhbHVlOiBtZXRob2QgfSxcclxuICAgICAgICAgIHsgTmFtZTogJ1Jlc291cmNlJywgVmFsdWU6IHJlc291cmNlIH0sXHJcbiAgICAgICAgXSxcclxuICAgICAgfSxcclxuICAgIF07XHJcblxyXG4gICAgLy8gUmVjb3JkIGVycm9yIG1ldHJpY3MgZm9yIDR4eCBhbmQgNXh4IHJlc3BvbnNlc1xyXG4gICAgaWYgKHN0YXR1c0NvZGUgPj0gNDAwKSB7XHJcbiAgICAgIG1ldHJpY3MucHVzaCh7XHJcbiAgICAgICAgTWV0cmljTmFtZTogc3RhdHVzQ29kZSA+PSA1MDAgPyAnQVBJNVhYRXJyb3InIDogJ0FQSTRYWEVycm9yJyxcclxuICAgICAgICBWYWx1ZTogMSxcclxuICAgICAgICBVbml0OiAnQ291bnQnLFxyXG4gICAgICAgIERpbWVuc2lvbnM6IFtcclxuICAgICAgICAgIHsgTmFtZTogJ0FQSScsIFZhbHVlOiBhcGlOYW1lIH0sXHJcbiAgICAgICAgICB7IE5hbWU6ICdNZXRob2QnLCBWYWx1ZTogbWV0aG9kIH0sXHJcbiAgICAgICAgICB7IE5hbWU6ICdSZXNvdXJjZScsIFZhbHVlOiByZXNvdXJjZSB9LFxyXG4gICAgICAgICAgeyBOYW1lOiAnU3RhdHVzQ29kZScsIFZhbHVlOiBzdGF0dXNDb2RlLnRvU3RyaW5nKCkgfSxcclxuICAgICAgICBdLFxyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBhd2FpdCB0aGlzLnB1Ymxpc2hNZXRyaWNzKG1ldHJpY3MpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogTW9uaXRvciBMYW1iZGEgZnVuY3Rpb24gbWV0cmljc1xyXG4gICAqL1xyXG4gIGFzeW5jIG1vbml0b3JMYW1iZGFGdW5jdGlvbihmdW5jdGlvbk5hbWU6IHN0cmluZywgZHVyYXRpb246IG51bWJlciwgbWVtb3J5VXNlZDogbnVtYmVyLCBzdWNjZXNzOiBib29sZWFuLCBlcnJvclR5cGU/OiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGNvbnN0IG1ldHJpY3M6IE1ldHJpY0RhdGFbXSA9IFtcclxuICAgICAge1xyXG4gICAgICAgIE1ldHJpY05hbWU6ICdMYW1iZGFJbnZvY2F0aW9uJyxcclxuICAgICAgICBWYWx1ZTogMSxcclxuICAgICAgICBVbml0OiAnQ291bnQnLFxyXG4gICAgICAgIERpbWVuc2lvbnM6IFtcclxuICAgICAgICAgIHsgTmFtZTogJ0Z1bmN0aW9uTmFtZScsIFZhbHVlOiBmdW5jdGlvbk5hbWUgfSxcclxuICAgICAgICAgIHsgTmFtZTogJ1N1Y2Nlc3MnLCBWYWx1ZTogc3VjY2Vzcy50b1N0cmluZygpIH0sXHJcbiAgICAgICAgXSxcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIE1ldHJpY05hbWU6ICdMYW1iZGFEdXJhdGlvbicsXHJcbiAgICAgICAgVmFsdWU6IGR1cmF0aW9uLFxyXG4gICAgICAgIFVuaXQ6ICdNaWxsaXNlY29uZHMnLFxyXG4gICAgICAgIERpbWVuc2lvbnM6IFtcclxuICAgICAgICAgIHsgTmFtZTogJ0Z1bmN0aW9uTmFtZScsIFZhbHVlOiBmdW5jdGlvbk5hbWUgfSxcclxuICAgICAgICBdLFxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgTWV0cmljTmFtZTogJ0xhbWJkYU1lbW9yeVVzZWQnLFxyXG4gICAgICAgIFZhbHVlOiBtZW1vcnlVc2VkLFxyXG4gICAgICAgIFVuaXQ6ICdNZWdhYnl0ZXMnLFxyXG4gICAgICAgIERpbWVuc2lvbnM6IFtcclxuICAgICAgICAgIHsgTmFtZTogJ0Z1bmN0aW9uTmFtZScsIFZhbHVlOiBmdW5jdGlvbk5hbWUgfSxcclxuICAgICAgICBdLFxyXG4gICAgICB9LFxyXG4gICAgXTtcclxuXHJcbiAgICBpZiAoIXN1Y2Nlc3MgJiYgZXJyb3JUeXBlKSB7XHJcbiAgICAgIG1ldHJpY3MucHVzaCh7XHJcbiAgICAgICAgTWV0cmljTmFtZTogJ0xhbWJkYUVycm9yJyxcclxuICAgICAgICBWYWx1ZTogMSxcclxuICAgICAgICBVbml0OiAnQ291bnQnLFxyXG4gICAgICAgIERpbWVuc2lvbnM6IFtcclxuICAgICAgICAgIHsgTmFtZTogJ0Z1bmN0aW9uTmFtZScsIFZhbHVlOiBmdW5jdGlvbk5hbWUgfSxcclxuICAgICAgICAgIHsgTmFtZTogJ0Vycm9yVHlwZScsIFZhbHVlOiBlcnJvclR5cGUgfSxcclxuICAgICAgICBdLFxyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBhd2FpdCB0aGlzLnB1Ymxpc2hNZXRyaWNzKG1ldHJpY3MpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogTW9uaXRvciBEeW5hbW9EQiBvcGVyYXRpb25zXHJcbiAgICovXHJcbiAgYXN5bmMgbW9uaXRvckR5bmFtb0RCT3BlcmF0aW9uKHRhYmxlTmFtZTogc3RyaW5nLCBvcGVyYXRpb246IHN0cmluZywgc3VjY2VzczogYm9vbGVhbiwgZHVyYXRpb246IG51bWJlciwgaXRlbUNvdW50PzogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBjb25zdCBtZXRyaWNzOiBNZXRyaWNEYXRhW10gPSBbXHJcbiAgICAgIHtcclxuICAgICAgICBNZXRyaWNOYW1lOiAnRHluYW1vREJPcGVyYXRpb24nLFxyXG4gICAgICAgIFZhbHVlOiAxLFxyXG4gICAgICAgIFVuaXQ6ICdDb3VudCcsXHJcbiAgICAgICAgRGltZW5zaW9uczogW1xyXG4gICAgICAgICAgeyBOYW1lOiAnVGFibGVOYW1lJywgVmFsdWU6IHRhYmxlTmFtZSB9LFxyXG4gICAgICAgICAgeyBOYW1lOiAnT3BlcmF0aW9uJywgVmFsdWU6IG9wZXJhdGlvbiB9LFxyXG4gICAgICAgICAgeyBOYW1lOiAnU3VjY2VzcycsIFZhbHVlOiBzdWNjZXNzLnRvU3RyaW5nKCkgfSxcclxuICAgICAgICBdLFxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgTWV0cmljTmFtZTogJ0R5bmFtb0RCT3BlcmF0aW9uRHVyYXRpb24nLFxyXG4gICAgICAgIFZhbHVlOiBkdXJhdGlvbixcclxuICAgICAgICBVbml0OiAnTWlsbGlzZWNvbmRzJyxcclxuICAgICAgICBEaW1lbnNpb25zOiBbXHJcbiAgICAgICAgICB7IE5hbWU6ICdUYWJsZU5hbWUnLCBWYWx1ZTogdGFibGVOYW1lIH0sXHJcbiAgICAgICAgICB7IE5hbWU6ICdPcGVyYXRpb24nLCBWYWx1ZTogb3BlcmF0aW9uIH0sXHJcbiAgICAgICAgXSxcclxuICAgICAgfSxcclxuICAgIF07XHJcblxyXG4gICAgaWYgKGl0ZW1Db3VudCAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIG1ldHJpY3MucHVzaCh7XHJcbiAgICAgICAgTWV0cmljTmFtZTogJ0R5bmFtb0RCSXRlbUNvdW50JyxcclxuICAgICAgICBWYWx1ZTogaXRlbUNvdW50LFxyXG4gICAgICAgIFVuaXQ6ICdDb3VudCcsXHJcbiAgICAgICAgRGltZW5zaW9uczogW1xyXG4gICAgICAgICAgeyBOYW1lOiAnVGFibGVOYW1lJywgVmFsdWU6IHRhYmxlTmFtZSB9LFxyXG4gICAgICAgICAgeyBOYW1lOiAnT3BlcmF0aW9uJywgVmFsdWU6IG9wZXJhdGlvbiB9LFxyXG4gICAgICAgIF0sXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGF3YWl0IHRoaXMucHVibGlzaE1ldHJpY3MobWV0cmljcyk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBNb25pdG9yIFMzIG9wZXJhdGlvbnNcclxuICAgKi9cclxuICBhc3luYyBtb25pdG9yUzNPcGVyYXRpb24oYnVja2V0TmFtZTogc3RyaW5nLCBvcGVyYXRpb246IHN0cmluZywgc3VjY2VzczogYm9vbGVhbiwgZHVyYXRpb246IG51bWJlciwgb2JqZWN0U2l6ZT86IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgY29uc3QgbWV0cmljczogTWV0cmljRGF0YVtdID0gW1xyXG4gICAgICB7XHJcbiAgICAgICAgTWV0cmljTmFtZTogJ1MzT3BlcmF0aW9uJyxcclxuICAgICAgICBWYWx1ZTogMSxcclxuICAgICAgICBVbml0OiAnQ291bnQnLFxyXG4gICAgICAgIERpbWVuc2lvbnM6IFtcclxuICAgICAgICAgIHsgTmFtZTogJ0J1Y2tldE5hbWUnLCBWYWx1ZTogYnVja2V0TmFtZSB9LFxyXG4gICAgICAgICAgeyBOYW1lOiAnT3BlcmF0aW9uJywgVmFsdWU6IG9wZXJhdGlvbiB9LFxyXG4gICAgICAgICAgeyBOYW1lOiAnU3VjY2VzcycsIFZhbHVlOiBzdWNjZXNzLnRvU3RyaW5nKCkgfSxcclxuICAgICAgICBdLFxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgTWV0cmljTmFtZTogJ1MzT3BlcmF0aW9uRHVyYXRpb24nLFxyXG4gICAgICAgIFZhbHVlOiBkdXJhdGlvbixcclxuICAgICAgICBVbml0OiAnTWlsbGlzZWNvbmRzJyxcclxuICAgICAgICBEaW1lbnNpb25zOiBbXHJcbiAgICAgICAgICB7IE5hbWU6ICdCdWNrZXROYW1lJywgVmFsdWU6IGJ1Y2tldE5hbWUgfSxcclxuICAgICAgICAgIHsgTmFtZTogJ09wZXJhdGlvbicsIFZhbHVlOiBvcGVyYXRpb24gfSxcclxuICAgICAgICBdLFxyXG4gICAgICB9LFxyXG4gICAgXTtcclxuXHJcbiAgICBpZiAob2JqZWN0U2l6ZSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIG1ldHJpY3MucHVzaCh7XHJcbiAgICAgICAgTWV0cmljTmFtZTogJ1MzT2JqZWN0U2l6ZScsXHJcbiAgICAgICAgVmFsdWU6IG9iamVjdFNpemUsXHJcbiAgICAgICAgVW5pdDogJ0J5dGVzJyxcclxuICAgICAgICBEaW1lbnNpb25zOiBbXHJcbiAgICAgICAgICB7IE5hbWU6ICdCdWNrZXROYW1lJywgVmFsdWU6IGJ1Y2tldE5hbWUgfSxcclxuICAgICAgICAgIHsgTmFtZTogJ09wZXJhdGlvbicsIFZhbHVlOiBvcGVyYXRpb24gfSxcclxuICAgICAgICBdLFxyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBhd2FpdCB0aGlzLnB1Ymxpc2hNZXRyaWNzKG1ldHJpY3MpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ3JlYXRlIGNvbXByZWhlbnNpdmUgc3lzdGVtIGhlYWx0aCByZXBvcnRcclxuICAgKi9cclxuICBhc3luYyBjcmVhdGVIZWFsdGhSZXBvcnQoKTogUHJvbWlzZTx7XHJcbiAgICBvdmVyYWxsOiAnaGVhbHRoeScgfCAnZGVncmFkZWQnIHwgJ3VuaGVhbHRoeSc7XHJcbiAgICBzZXJ2aWNlczogSGVhbHRoQ2hlY2tSZXN1bHRbXTtcclxuICAgIHRpbWVzdGFtcDogRGF0ZTtcclxuICB9PiB7XHJcbiAgICBjb25zdCBzZXJ2aWNlczogSGVhbHRoQ2hlY2tSZXN1bHRbXSA9IFtdO1xyXG4gICAgXHJcbiAgICAvLyBBZGQgaGVhbHRoIGNoZWNrcyBmb3IgYWxsIHNlcnZpY2VzXHJcbiAgICAvLyBUaGlzIHdvdWxkIGJlIGV4cGFuZGVkIGJhc2VkIG9uIGFjdHVhbCBzZXJ2aWNlIGRlcGVuZGVuY2llc1xyXG4gICAgXHJcbiAgICBjb25zdCBvdmVyYWxsU3RhdHVzID0gc2VydmljZXMuZXZlcnkocyA9PiBzLnN0YXR1cyA9PT0gJ2hlYWx0aHknKSA/ICdoZWFsdGh5JyA6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICBzZXJ2aWNlcy5zb21lKHMgPT4gcy5zdGF0dXMgPT09ICd1bmhlYWx0aHknKSA/ICd1bmhlYWx0aHknIDogJ2RlZ3JhZGVkJztcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBvdmVyYWxsOiBvdmVyYWxsU3RhdHVzLFxyXG4gICAgICBzZXJ2aWNlcyxcclxuICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLFxyXG4gICAgfTtcclxuICB9XHJcbn1cclxuXHJcbi8vIEV4cG9ydCBzaW5nbGV0b24gaW5zdGFuY2VcclxuZXhwb3J0IGNvbnN0IG1vbml0b3JpbmdTZXJ2aWNlID0gbmV3IE1vbml0b3JpbmdTZXJ2aWNlKCk7Il19