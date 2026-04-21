"use strict";
/**
 * Custom Metrics Utility for Production Lambda Functions
 * Provides CloudWatch custom metrics integration and performance monitoring
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsCollector = void 0;
exports.getMetricsCollector = getMetricsCollector;
exports.recordMetric = recordMetric;
exports.withPerformanceMonitoring = withPerformanceMonitoring;
const aws_sdk_1 = require("aws-sdk");
const logger_1 = require("./logger");
class MetricsCollector {
    cloudWatch;
    logger;
    namespace;
    metricsBuffer = [];
    bufferSize;
    flushInterval;
    flushTimer;
    constructor(namespace = 'MISRA/Platform', bufferSize = 10, flushInterval = 30000 // 30 seconds
    ) {
        this.cloudWatch = new aws_sdk_1.CloudWatch({ region: process.env.AWS_REGION || 'us-east-1' });
        this.logger = (0, logger_1.createLogger)('metrics-collector');
        this.namespace = namespace;
        this.bufferSize = bufferSize;
        this.flushInterval = flushInterval;
        // Start auto-flush timer
        this.startAutoFlush();
    }
    /**
     * Record a custom metric
     */
    async recordMetric(name, value, unit = 'Count', dimensions) {
        const metric = {
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
    async recordPerformanceMetrics(metrics) {
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
    async recordBusinessMetric(operation, success, duration, additionalDimensions) {
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
    async recordApiMetrics(method, path, statusCode, duration, correlationId) {
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
    async recordAnalysisMetrics(fileType, rulesChecked, violationsFound, complianceScore, duration, correlationId) {
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
    async recordAuthMetrics(operation, success, mfaEnabled, correlationId) {
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
    async flush() {
        if (this.metricsBuffer.length === 0) {
            return;
        }
        const metricsToFlush = [...this.metricsBuffer];
        this.metricsBuffer = [];
        try {
            // Group metrics by name for batch processing
            const metricsByName = new Map();
            for (const metric of metricsToFlush) {
                if (!metricsByName.has(metric.name)) {
                    metricsByName.set(metric.name, []);
                }
                metricsByName.get(metric.name).push(metric);
            }
            // Send metrics in batches (CloudWatch limit is 20 metrics per request)
            const batches = [];
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
            await Promise.all(batches.map(batch => this.cloudWatch.putMetricData(batch).promise()));
            this.logger.debug(`Flushed ${metricsToFlush.length} metrics to CloudWatch`, {
                namespace: this.namespace,
                batchCount: batches.length,
            });
        }
        catch (error) {
            this.logger.error('Failed to flush metrics to CloudWatch', error, {
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
    startAutoFlush() {
        this.flushTimer = setInterval(async () => {
            await this.flush();
        }, this.flushInterval);
    }
    /**
     * Stop auto-flush timer and flush remaining metrics
     */
    async shutdown() {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = undefined;
        }
        await this.flush();
        this.logger.info('Metrics collector shutdown complete');
    }
}
exports.MetricsCollector = MetricsCollector;
// Global metrics collector instance
let globalMetricsCollector;
/**
 * Get or create global metrics collector
 */
function getMetricsCollector() {
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
async function recordMetric(name, value, unit = 'Count', dimensions) {
    const collector = getMetricsCollector();
    await collector.recordMetric(name, value, unit, dimensions);
}
/**
 * Decorator for automatic performance monitoring
 */
function withPerformanceMonitoring(functionName) {
    return function (target, propertyName, descriptor) {
        const method = descriptor.value;
        descriptor.value = async function (...args) {
            const startTime = Date.now();
            const startMemory = process.memoryUsage().heapUsed;
            const coldStart = !global.lambdaWarmStart;
            global.lambdaWarmStart = true;
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
            }
            catch (error) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0cmljcy11dGlsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibWV0cmljcy11dGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O0dBR0c7OztBQXFUSCxrREFVQztBQUtELG9DQVFDO0FBS0QsOERBMkNDO0FBMVhELHFDQUFxQztBQUNyQyxxQ0FBZ0Q7QUFrQmhELE1BQWEsZ0JBQWdCO0lBQ25CLFVBQVUsQ0FBYTtJQUN2QixNQUFNLENBQVM7SUFDZixTQUFTLENBQVM7SUFDbEIsYUFBYSxHQUFpQixFQUFFLENBQUM7SUFDakMsVUFBVSxDQUFTO0lBQ25CLGFBQWEsQ0FBUztJQUN0QixVQUFVLENBQWtCO0lBRXBDLFlBQ0UsWUFBb0IsZ0JBQWdCLEVBQ3BDLGFBQXFCLEVBQUUsRUFDdkIsZ0JBQXdCLEtBQUssQ0FBQyxhQUFhOztRQUUzQyxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksb0JBQVUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXLEVBQUUsQ0FBQyxDQUFDO1FBQ3BGLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBQSxxQkFBWSxFQUFDLG1CQUFtQixDQUFDLENBQUM7UUFDaEQsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7UUFDM0IsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7UUFDN0IsSUFBSSxDQUFDLGFBQWEsR0FBRyxhQUFhLENBQUM7UUFFbkMseUJBQXlCO1FBQ3pCLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztJQUN4QixDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsWUFBWSxDQUNoQixJQUFZLEVBQ1osS0FBYSxFQUNiLE9BQWUsT0FBTyxFQUN0QixVQUFzQztRQUV0QyxNQUFNLE1BQU0sR0FBZTtZQUN6QixJQUFJO1lBQ0osS0FBSztZQUNMLElBQUk7WUFDSixVQUFVO1lBQ1YsU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFO1NBQ3RC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QUMsWUFBWSxFQUFFLEtBQUssSUFBSSxFQUFFO0lBQ2xDLElBQUksc0JBQXNCLEVBQUUsQ0FBQztRQUMzQixNQUFNLHNCQUFzQixDQUFDLFFBQVEsRUFBRSxDQUFDO0lBQzFDLENBQUM7QUFDSCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBDdXN0b20gTWV0cmljcyBVdGlsaXR5IGZvciBQcm9kdWN0aW9uIExhbWJkYSBGdW5jdGlvbnNcclxuICogUHJvdmlkZXMgQ2xvdWRXYXRjaCBjdXN0b20gbWV0cmljcyBpbnRlZ3JhdGlvbiBhbmQgcGVyZm9ybWFuY2UgbW9uaXRvcmluZ1xyXG4gKi9cclxuXHJcbmltcG9ydCB7IENsb3VkV2F0Y2ggfSBmcm9tICdhd3Mtc2RrJztcclxuaW1wb3J0IHsgTG9nZ2VyLCBjcmVhdGVMb2dnZXIgfSBmcm9tICcuL2xvZ2dlcic7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIE1ldHJpY0RhdGEge1xyXG4gIG5hbWU6IHN0cmluZztcclxuICB2YWx1ZTogbnVtYmVyO1xyXG4gIHVuaXQ6IHN0cmluZztcclxuICBkaW1lbnNpb25zPzogeyBba2V5OiBzdHJpbmddOiBzdHJpbmcgfTtcclxuICB0aW1lc3RhbXA/OiBEYXRlO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFBlcmZvcm1hbmNlTWV0cmljcyB7XHJcbiAgZnVuY3Rpb25OYW1lOiBzdHJpbmc7XHJcbiAgZHVyYXRpb246IG51bWJlcjtcclxuICBtZW1vcnlVc2VkOiBudW1iZXI7XHJcbiAgY29sZFN0YXJ0OiBib29sZWFuO1xyXG4gIGNvcnJlbGF0aW9uSWQ/OiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBNZXRyaWNzQ29sbGVjdG9yIHtcclxuICBwcml2YXRlIGNsb3VkV2F0Y2g6IENsb3VkV2F0Y2g7XHJcbiAgcHJpdmF0ZSBsb2dnZXI6IExvZ2dlcjtcclxuICBwcml2YXRlIG5hbWVzcGFjZTogc3RyaW5nO1xyXG4gIHByaXZhdGUgbWV0cmljc0J1ZmZlcjogTWV0cmljRGF0YVtdID0gW107XHJcbiAgcHJpdmF0ZSBidWZmZXJTaXplOiBudW1iZXI7XHJcbiAgcHJpdmF0ZSBmbHVzaEludGVydmFsOiBudW1iZXI7XHJcbiAgcHJpdmF0ZSBmbHVzaFRpbWVyPzogTm9kZUpTLlRpbWVvdXQ7XHJcblxyXG4gIGNvbnN0cnVjdG9yKFxyXG4gICAgbmFtZXNwYWNlOiBzdHJpbmcgPSAnTUlTUkEvUGxhdGZvcm0nLFxyXG4gICAgYnVmZmVyU2l6ZTogbnVtYmVyID0gMTAsXHJcbiAgICBmbHVzaEludGVydmFsOiBudW1iZXIgPSAzMDAwMCAvLyAzMCBzZWNvbmRzXHJcbiAgKSB7XHJcbiAgICB0aGlzLmNsb3VkV2F0Y2ggPSBuZXcgQ2xvdWRXYXRjaCh7IHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJyB9KTtcclxuICAgIHRoaXMubG9nZ2VyID0gY3JlYXRlTG9nZ2VyKCdtZXRyaWNzLWNvbGxlY3RvcicpO1xyXG4gICAgdGhpcy5uYW1lc3BhY2UgPSBuYW1lc3BhY2U7XHJcbiAgICB0aGlzLmJ1ZmZlclNpemUgPSBidWZmZXJTaXplO1xyXG4gICAgdGhpcy5mbHVzaEludGVydmFsID0gZmx1c2hJbnRlcnZhbDtcclxuXHJcbiAgICAvLyBTdGFydCBhdXRvLWZsdXNoIHRpbWVyXHJcbiAgICB0aGlzLnN0YXJ0QXV0b0ZsdXNoKCk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBSZWNvcmQgYSBjdXN0b20gbWV0cmljXHJcbiAgICovXHJcbiAgYXN5bmMgcmVjb3JkTWV0cmljKFxyXG4gICAgbmFtZTogc3RyaW5nLFxyXG4gICAgdmFsdWU6IG51bWJlcixcclxuICAgIHVuaXQ6IHN0cmluZyA9ICdDb3VudCcsXHJcbiAgICBkaW1lbnNpb25zPzogeyBba2V5OiBzdHJpbmddOiBzdHJpbmcgfVxyXG4gICk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgY29uc3QgbWV0cmljOiBNZXRyaWNEYXRhID0ge1xyXG4gICAgICBuYW1lLFxyXG4gICAgICB2YWx1ZSxcclxuICAgICAgdW5pdCxcclxuICAgICAgZGltZW5zaW9ucyxcclxuICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLFxyXG4gICAgfTtcclxuXHJcbiAgICB0aGlzLm1ldHJpY3NCdWZmZXIucHVzaChtZXRyaWMpO1xyXG4gICAgXHJcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZyhgTWV0cmljIHJlY29yZGVkOiAke25hbWV9YCwge1xyXG4gICAgICBtZXRyaWMsXHJcbiAgICAgIGJ1ZmZlclNpemU6IHRoaXMubWV0cmljc0J1ZmZlci5sZW5ndGgsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBGbHVzaCBpZiBidWZmZXIgaXMgZnVsbFxyXG4gICAgaWYgKHRoaXMubWV0cmljc0J1ZmZlci5sZW5ndGggPj0gdGhpcy5idWZmZXJTaXplKSB7XHJcbiAgICAgIGF3YWl0IHRoaXMuZmx1c2goKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFJlY29yZCBwZXJmb3JtYW5jZSBtZXRyaWNzIGZvciBMYW1iZGEgZnVuY3Rpb25cclxuICAgKi9cclxuICBhc3luYyByZWNvcmRQZXJmb3JtYW5jZU1ldHJpY3MobWV0cmljczogUGVyZm9ybWFuY2VNZXRyaWNzKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBjb25zdCBkaW1lbnNpb25zID0ge1xyXG4gICAgICBGdW5jdGlvbk5hbWU6IG1ldHJpY3MuZnVuY3Rpb25OYW1lLFxyXG4gICAgICBFbnZpcm9ubWVudDogcHJvY2Vzcy5lbnYuRU5WSVJPTk1FTlQgfHwgJ3Vua25vd24nLFxyXG4gICAgfTtcclxuXHJcbiAgICBhd2FpdCBQcm9taXNlLmFsbChbXHJcbiAgICAgIHRoaXMucmVjb3JkTWV0cmljKCdGdW5jdGlvbkR1cmF0aW9uJywgbWV0cmljcy5kdXJhdGlvbiwgJ01pbGxpc2Vjb25kcycsIGRpbWVuc2lvbnMpLFxyXG4gICAgICB0aGlzLnJlY29yZE1ldHJpYygnTWVtb3J5VXNlZCcsIG1ldHJpY3MubWVtb3J5VXNlZCwgJ0J5dGVzJywgZGltZW5zaW9ucyksXHJcbiAgICAgIHRoaXMucmVjb3JkTWV0cmljKCdDb2xkU3RhcnQnLCBtZXRyaWNzLmNvbGRTdGFydCA/IDEgOiAwLCAnQ291bnQnLCBkaW1lbnNpb25zKSxcclxuICAgIF0pO1xyXG5cclxuICAgIHRoaXMubG9nZ2VyLmluZm8oJ1BlcmZvcm1hbmNlIG1ldHJpY3MgcmVjb3JkZWQnLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogbWV0cmljcy5mdW5jdGlvbk5hbWUsXHJcbiAgICAgIGR1cmF0aW9uOiBtZXRyaWNzLmR1cmF0aW9uLFxyXG4gICAgICBtZW1vcnlVc2VkOiBtZXRyaWNzLm1lbW9yeVVzZWQsXHJcbiAgICAgIGNvbGRTdGFydDogbWV0cmljcy5jb2xkU3RhcnQsXHJcbiAgICAgIGNvcnJlbGF0aW9uSWQ6IG1ldHJpY3MuY29ycmVsYXRpb25JZCxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUmVjb3JkIGJ1c2luZXNzIG1ldHJpY3NcclxuICAgKi9cclxuICBhc3luYyByZWNvcmRCdXNpbmVzc01ldHJpYyhcclxuICAgIG9wZXJhdGlvbjogc3RyaW5nLFxyXG4gICAgc3VjY2VzczogYm9vbGVhbixcclxuICAgIGR1cmF0aW9uPzogbnVtYmVyLFxyXG4gICAgYWRkaXRpb25hbERpbWVuc2lvbnM/OiB7IFtrZXk6IHN0cmluZ106IHN0cmluZyB9XHJcbiAgKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBjb25zdCBkaW1lbnNpb25zID0ge1xyXG4gICAgICBPcGVyYXRpb246IG9wZXJhdGlvbixcclxuICAgICAgRW52aXJvbm1lbnQ6IHByb2Nlc3MuZW52LkVOVklST05NRU5UIHx8ICd1bmtub3duJyxcclxuICAgICAgLi4uYWRkaXRpb25hbERpbWVuc2lvbnMsXHJcbiAgICB9O1xyXG5cclxuICAgIGF3YWl0IFByb21pc2UuYWxsKFtcclxuICAgICAgdGhpcy5yZWNvcmRNZXRyaWMoYCR7b3BlcmF0aW9ufUNvdW50YCwgMSwgJ0NvdW50JywgZGltZW5zaW9ucyksXHJcbiAgICAgIHRoaXMucmVjb3JkTWV0cmljKGAke29wZXJhdGlvbn1TdWNjZXNzYCwgc3VjY2VzcyA/IDEgOiAwLCAnQ291bnQnLCBkaW1lbnNpb25zKSxcclxuICAgICAgLi4uKGR1cmF0aW9uID8gW3RoaXMucmVjb3JkTWV0cmljKGAke29wZXJhdGlvbn1EdXJhdGlvbmAsIGR1cmF0aW9uLCAnTWlsbGlzZWNvbmRzJywgZGltZW5zaW9ucyldIDogW10pLFxyXG4gICAgXSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBSZWNvcmQgQVBJIG1ldHJpY3NcclxuICAgKi9cclxuICBhc3luYyByZWNvcmRBcGlNZXRyaWNzKFxyXG4gICAgbWV0aG9kOiBzdHJpbmcsXHJcbiAgICBwYXRoOiBzdHJpbmcsXHJcbiAgICBzdGF0dXNDb2RlOiBudW1iZXIsXHJcbiAgICBkdXJhdGlvbjogbnVtYmVyLFxyXG4gICAgY29ycmVsYXRpb25JZD86IHN0cmluZ1xyXG4gICk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgY29uc3QgZGltZW5zaW9ucyA9IHtcclxuICAgICAgTWV0aG9kOiBtZXRob2QsXHJcbiAgICAgIFBhdGg6IHBhdGgucmVwbGFjZSgvXFwvWzAtOWEtZi1dezM2fS9nLCAnL3tpZH0nKSwgLy8gUmVwbGFjZSBVVUlEcyB3aXRoIHBsYWNlaG9sZGVyXHJcbiAgICAgIFN0YXR1c0NvZGU6IHN0YXR1c0NvZGUudG9TdHJpbmcoKSxcclxuICAgICAgRW52aXJvbm1lbnQ6IHByb2Nlc3MuZW52LkVOVklST05NRU5UIHx8ICd1bmtub3duJyxcclxuICAgIH07XHJcblxyXG4gICAgY29uc3Qgc3VjY2VzcyA9IHN0YXR1c0NvZGUgPj0gMjAwICYmIHN0YXR1c0NvZGUgPCA0MDA7XHJcblxyXG4gICAgYXdhaXQgUHJvbWlzZS5hbGwoW1xyXG4gICAgICB0aGlzLnJlY29yZE1ldHJpYygnQXBpUmVxdWVzdHMnLCAxLCAnQ291bnQnLCBkaW1lbnNpb25zKSxcclxuICAgICAgdGhpcy5yZWNvcmRNZXRyaWMoJ0FwaUxhdGVuY3knLCBkdXJhdGlvbiwgJ01pbGxpc2Vjb25kcycsIGRpbWVuc2lvbnMpLFxyXG4gICAgICB0aGlzLnJlY29yZE1ldHJpYygnQXBpU3VjY2VzcycsIHN1Y2Nlc3MgPyAxIDogMCwgJ0NvdW50JywgZGltZW5zaW9ucyksXHJcbiAgICAgIHRoaXMucmVjb3JkTWV0cmljKCdBcGlFcnJvcnMnLCBzdWNjZXNzID8gMCA6IDEsICdDb3VudCcsIGRpbWVuc2lvbnMpLFxyXG4gICAgXSk7XHJcblxyXG4gICAgdGhpcy5sb2dnZXIuYXBpQ2FsbChtZXRob2QsIHBhdGgsIHN0YXR1c0NvZGUsIGR1cmF0aW9uLCB7IGNvcnJlbGF0aW9uSWQgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBSZWNvcmQgTUlTUkEgYW5hbHlzaXMgc3BlY2lmaWMgbWV0cmljc1xyXG4gICAqL1xyXG4gIGFzeW5jIHJlY29yZEFuYWx5c2lzTWV0cmljcyhcclxuICAgIGZpbGVUeXBlOiBzdHJpbmcsXHJcbiAgICBydWxlc0NoZWNrZWQ6IG51bWJlcixcclxuICAgIHZpb2xhdGlvbnNGb3VuZDogbnVtYmVyLFxyXG4gICAgY29tcGxpYW5jZVNjb3JlOiBudW1iZXIsXHJcbiAgICBkdXJhdGlvbjogbnVtYmVyLFxyXG4gICAgY29ycmVsYXRpb25JZD86IHN0cmluZ1xyXG4gICk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgY29uc3QgZGltZW5zaW9ucyA9IHtcclxuICAgICAgRmlsZVR5cGU6IGZpbGVUeXBlLFxyXG4gICAgICBFbnZpcm9ubWVudDogcHJvY2Vzcy5lbnYuRU5WSVJPTk1FTlQgfHwgJ3Vua25vd24nLFxyXG4gICAgfTtcclxuXHJcbiAgICBhd2FpdCBQcm9taXNlLmFsbChbXHJcbiAgICAgIHRoaXMucmVjb3JkTWV0cmljKCdBbmFseXNpc0NvbXBsZXRlZCcsIDEsICdDb3VudCcsIGRpbWVuc2lvbnMpLFxyXG4gICAgICB0aGlzLnJlY29yZE1ldHJpYygnUnVsZXNDaGVja2VkJywgcnVsZXNDaGVja2VkLCAnQ291bnQnLCBkaW1lbnNpb25zKSxcclxuICAgICAgdGhpcy5yZWNvcmRNZXRyaWMoJ1Zpb2xhdGlvbnNGb3VuZCcsIHZpb2xhdGlvbnNGb3VuZCwgJ0NvdW50JywgZGltZW5zaW9ucyksXHJcbiAgICAgIHRoaXMucmVjb3JkTWV0cmljKCdDb21wbGlhbmNlU2NvcmUnLCBjb21wbGlhbmNlU2NvcmUsICdQZXJjZW50JywgZGltZW5zaW9ucyksXHJcbiAgICAgIHRoaXMucmVjb3JkTWV0cmljKCdBbmFseXNpc0R1cmF0aW9uJywgZHVyYXRpb24sICdNaWxsaXNlY29uZHMnLCBkaW1lbnNpb25zKSxcclxuICAgIF0pO1xyXG5cclxuICAgIHRoaXMubG9nZ2VyLmluZm8oJ0FuYWx5c2lzIG1ldHJpY3MgcmVjb3JkZWQnLCB7XHJcbiAgICAgIGZpbGVUeXBlLFxyXG4gICAgICBydWxlc0NoZWNrZWQsXHJcbiAgICAgIHZpb2xhdGlvbnNGb3VuZCxcclxuICAgICAgY29tcGxpYW5jZVNjb3JlLFxyXG4gICAgICBkdXJhdGlvbixcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUmVjb3JkIGF1dGhlbnRpY2F0aW9uIG1ldHJpY3NcclxuICAgKi9cclxuICBhc3luYyByZWNvcmRBdXRoTWV0cmljcyhcclxuICAgIG9wZXJhdGlvbjogJ2xvZ2luJyB8ICdyZWdpc3RlcicgfCAncmVmcmVzaCcgfCAnbG9nb3V0JyxcclxuICAgIHN1Y2Nlc3M6IGJvb2xlYW4sXHJcbiAgICBtZmFFbmFibGVkPzogYm9vbGVhbixcclxuICAgIGNvcnJlbGF0aW9uSWQ/OiBzdHJpbmdcclxuICApOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGNvbnN0IGRpbWVuc2lvbnMgPSB7XHJcbiAgICAgIE9wZXJhdGlvbjogb3BlcmF0aW9uLFxyXG4gICAgICBFbnZpcm9ubWVudDogcHJvY2Vzcy5lbnYuRU5WSVJPTk1FTlQgfHwgJ3Vua25vd24nLFxyXG4gICAgICAuLi4obWZhRW5hYmxlZCAhPT0gdW5kZWZpbmVkICYmIHsgTWZhRW5hYmxlZDogbWZhRW5hYmxlZC50b1N0cmluZygpIH0pLFxyXG4gICAgfTtcclxuXHJcbiAgICBhd2FpdCBQcm9taXNlLmFsbChbXHJcbiAgICAgIHRoaXMucmVjb3JkTWV0cmljKCdBdXRoQXR0ZW1wdHMnLCAxLCAnQ291bnQnLCBkaW1lbnNpb25zKSxcclxuICAgICAgdGhpcy5yZWNvcmRNZXRyaWMoJ0F1dGhTdWNjZXNzJywgc3VjY2VzcyA/IDEgOiAwLCAnQ291bnQnLCBkaW1lbnNpb25zKSxcclxuICAgICAgdGhpcy5yZWNvcmRNZXRyaWMoJ0F1dGhGYWlsdXJlcycsIHN1Y2Nlc3MgPyAwIDogMSwgJ0NvdW50JywgZGltZW5zaW9ucyksXHJcbiAgICBdKTtcclxuXHJcbiAgICB0aGlzLmxvZ2dlci5pbmZvKCdBdXRoIG1ldHJpY3MgcmVjb3JkZWQnLCB7XHJcbiAgICAgIG9wZXJhdGlvbixcclxuICAgICAgc3VjY2VzcyxcclxuICAgICAgbWZhRW5hYmxlZCxcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRmx1c2ggbWV0cmljcyBidWZmZXIgdG8gQ2xvdWRXYXRjaFxyXG4gICAqL1xyXG4gIGFzeW5jIGZsdXNoKCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgaWYgKHRoaXMubWV0cmljc0J1ZmZlci5sZW5ndGggPT09IDApIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IG1ldHJpY3NUb0ZsdXNoID0gWy4uLnRoaXMubWV0cmljc0J1ZmZlcl07XHJcbiAgICB0aGlzLm1ldHJpY3NCdWZmZXIgPSBbXTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICAvLyBHcm91cCBtZXRyaWNzIGJ5IG5hbWUgZm9yIGJhdGNoIHByb2Nlc3NpbmdcclxuICAgICAgY29uc3QgbWV0cmljc0J5TmFtZSA9IG5ldyBNYXA8c3RyaW5nLCBNZXRyaWNEYXRhW10+KCk7XHJcbiAgICAgIFxyXG4gICAgICBmb3IgKGNvbnN0IG1ldHJpYyBvZiBtZXRyaWNzVG9GbHVzaCkge1xyXG4gICAgICAgIGlmICghbWV0cmljc0J5TmFtZS5oYXMobWV0cmljLm5hbWUpKSB7XHJcbiAgICAgICAgICBtZXRyaWNzQnlOYW1lLnNldChtZXRyaWMubmFtZSwgW10pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBtZXRyaWNzQnlOYW1lLmdldChtZXRyaWMubmFtZSkhLnB1c2gobWV0cmljKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gU2VuZCBtZXRyaWNzIGluIGJhdGNoZXMgKENsb3VkV2F0Y2ggbGltaXQgaXMgMjAgbWV0cmljcyBwZXIgcmVxdWVzdClcclxuICAgICAgY29uc3QgYmF0Y2hlczogYW55W10gPSBbXTtcclxuICAgICAgXHJcbiAgICAgIGZvciAoY29uc3QgW21ldHJpY05hbWUsIG1ldHJpY3NdIG9mIG1ldHJpY3NCeU5hbWUpIHtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG1ldHJpY3MubGVuZ3RoOyBpICs9IDIwKSB7XHJcbiAgICAgICAgICBjb25zdCBiYXRjaCA9IG1ldHJpY3Muc2xpY2UoaSwgaSArIDIwKTtcclxuICAgICAgICAgIGJhdGNoZXMucHVzaCh7XHJcbiAgICAgICAgICAgIE5hbWVzcGFjZTogdGhpcy5uYW1lc3BhY2UsXHJcbiAgICAgICAgICAgIE1ldHJpY0RhdGE6IGJhdGNoLm1hcChtZXRyaWMgPT4gKHtcclxuICAgICAgICAgICAgICBNZXRyaWNOYW1lOiBtZXRyaWMubmFtZSxcclxuICAgICAgICAgICAgICBWYWx1ZTogbWV0cmljLnZhbHVlLFxyXG4gICAgICAgICAgICAgIFVuaXQ6IG1ldHJpYy51bml0LFxyXG4gICAgICAgICAgICAgIFRpbWVzdGFtcDogbWV0cmljLnRpbWVzdGFtcCxcclxuICAgICAgICAgICAgICBEaW1lbnNpb25zOiBtZXRyaWMuZGltZW5zaW9ucyA/IE9iamVjdC5lbnRyaWVzKG1ldHJpYy5kaW1lbnNpb25zKS5tYXAoKFtrZXksIHZhbHVlXSkgPT4gKHtcclxuICAgICAgICAgICAgICAgIE5hbWU6IGtleSxcclxuICAgICAgICAgICAgICAgIFZhbHVlOiB2YWx1ZSxcclxuICAgICAgICAgICAgICB9KSkgOiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgIH0pKSxcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gU2VuZCBhbGwgYmF0Y2hlc1xyXG4gICAgICBhd2FpdCBQcm9taXNlLmFsbChcclxuICAgICAgICBiYXRjaGVzLm1hcChiYXRjaCA9PiB0aGlzLmNsb3VkV2F0Y2gucHV0TWV0cmljRGF0YShiYXRjaCkucHJvbWlzZSgpKVxyXG4gICAgICApO1xyXG5cclxuICAgICAgdGhpcy5sb2dnZXIuZGVidWcoYEZsdXNoZWQgJHttZXRyaWNzVG9GbHVzaC5sZW5ndGh9IG1ldHJpY3MgdG8gQ2xvdWRXYXRjaGAsIHtcclxuICAgICAgICBuYW1lc3BhY2U6IHRoaXMubmFtZXNwYWNlLFxyXG4gICAgICAgIGJhdGNoQ291bnQ6IGJhdGNoZXMubGVuZ3RoLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcignRmFpbGVkIHRvIGZsdXNoIG1ldHJpY3MgdG8gQ2xvdWRXYXRjaCcsIGVycm9yIGFzIEVycm9yLCB7XHJcbiAgICAgICAgbWV0cmljc0NvdW50OiBtZXRyaWNzVG9GbHVzaC5sZW5ndGgsXHJcbiAgICAgICAgbmFtZXNwYWNlOiB0aGlzLm5hbWVzcGFjZSxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBSZS1hZGQgbWV0cmljcyB0byBidWZmZXIgZm9yIHJldHJ5ICh3aXRoIGxpbWl0IHRvIHByZXZlbnQgbWVtb3J5IGlzc3VlcylcclxuICAgICAgaWYgKHRoaXMubWV0cmljc0J1ZmZlci5sZW5ndGggPCB0aGlzLmJ1ZmZlclNpemUgKiAyKSB7XHJcbiAgICAgICAgdGhpcy5tZXRyaWNzQnVmZmVyLnVuc2hpZnQoLi4ubWV0cmljc1RvRmx1c2gpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBTdGFydCBhdXRvLWZsdXNoIHRpbWVyXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBzdGFydEF1dG9GbHVzaCgpOiB2b2lkIHtcclxuICAgIHRoaXMuZmx1c2hUaW1lciA9IHNldEludGVydmFsKGFzeW5jICgpID0+IHtcclxuICAgICAgYXdhaXQgdGhpcy5mbHVzaCgpO1xyXG4gICAgfSwgdGhpcy5mbHVzaEludGVydmFsKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFN0b3AgYXV0by1mbHVzaCB0aW1lciBhbmQgZmx1c2ggcmVtYWluaW5nIG1ldHJpY3NcclxuICAgKi9cclxuICBhc3luYyBzaHV0ZG93bigpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGlmICh0aGlzLmZsdXNoVGltZXIpIHtcclxuICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLmZsdXNoVGltZXIpO1xyXG4gICAgICB0aGlzLmZsdXNoVGltZXIgPSB1bmRlZmluZWQ7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIGF3YWl0IHRoaXMuZmx1c2goKTtcclxuICAgIHRoaXMubG9nZ2VyLmluZm8oJ01ldHJpY3MgY29sbGVjdG9yIHNodXRkb3duIGNvbXBsZXRlJyk7XHJcbiAgfVxyXG59XHJcblxyXG4vLyBHbG9iYWwgbWV0cmljcyBjb2xsZWN0b3IgaW5zdGFuY2VcclxubGV0IGdsb2JhbE1ldHJpY3NDb2xsZWN0b3I6IE1ldHJpY3NDb2xsZWN0b3IgfCB1bmRlZmluZWQ7XHJcblxyXG4vKipcclxuICogR2V0IG9yIGNyZWF0ZSBnbG9iYWwgbWV0cmljcyBjb2xsZWN0b3JcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRNZXRyaWNzQ29sbGVjdG9yKCk6IE1ldHJpY3NDb2xsZWN0b3Ige1xyXG4gIGlmICghZ2xvYmFsTWV0cmljc0NvbGxlY3Rvcikge1xyXG4gICAgY29uc3QgbmFtZXNwYWNlID0gcHJvY2Vzcy5lbnYuQ0xPVURXQVRDSF9OQU1FU1BBQ0UgfHwgJ01JU1JBL1BsYXRmb3JtJztcclxuICAgIGNvbnN0IGJ1ZmZlclNpemUgPSBwYXJzZUludChwcm9jZXNzLmVudi5NRVRSSUNTX0JVRkZFUl9TSVpFIHx8ICcxMCcpO1xyXG4gICAgY29uc3QgZmx1c2hJbnRlcnZhbCA9IHBhcnNlSW50KHByb2Nlc3MuZW52Lk1FVFJJQ1NfRkxVU0hfSU5URVJWQUwgfHwgJzMwMDAwJyk7XHJcbiAgICBcclxuICAgIGdsb2JhbE1ldHJpY3NDb2xsZWN0b3IgPSBuZXcgTWV0cmljc0NvbGxlY3RvcihuYW1lc3BhY2UsIGJ1ZmZlclNpemUsIGZsdXNoSW50ZXJ2YWwpO1xyXG4gIH1cclxuICBcclxuICByZXR1cm4gZ2xvYmFsTWV0cmljc0NvbGxlY3RvcjtcclxufVxyXG5cclxuLyoqXHJcbiAqIENvbnZlbmllbmNlIGZ1bmN0aW9uIHRvIHJlY29yZCBhIG1ldHJpY1xyXG4gKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlY29yZE1ldHJpYyhcclxuICBuYW1lOiBzdHJpbmcsXHJcbiAgdmFsdWU6IG51bWJlcixcclxuICB1bml0OiBzdHJpbmcgPSAnQ291bnQnLFxyXG4gIGRpbWVuc2lvbnM/OiB7IFtrZXk6IHN0cmluZ106IHN0cmluZyB9XHJcbik6IFByb21pc2U8dm9pZD4ge1xyXG4gIGNvbnN0IGNvbGxlY3RvciA9IGdldE1ldHJpY3NDb2xsZWN0b3IoKTtcclxuICBhd2FpdCBjb2xsZWN0b3IucmVjb3JkTWV0cmljKG5hbWUsIHZhbHVlLCB1bml0LCBkaW1lbnNpb25zKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIERlY29yYXRvciBmb3IgYXV0b21hdGljIHBlcmZvcm1hbmNlIG1vbml0b3JpbmdcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiB3aXRoUGVyZm9ybWFuY2VNb25pdG9yaW5nKGZ1bmN0aW9uTmFtZTogc3RyaW5nKSB7XHJcbiAgcmV0dXJuIGZ1bmN0aW9uICh0YXJnZXQ6IGFueSwgcHJvcGVydHlOYW1lOiBzdHJpbmcsIGRlc2NyaXB0b3I6IFByb3BlcnR5RGVzY3JpcHRvcikge1xyXG4gICAgY29uc3QgbWV0aG9kID0gZGVzY3JpcHRvci52YWx1ZTtcclxuXHJcbiAgICBkZXNjcmlwdG9yLnZhbHVlID0gYXN5bmMgZnVuY3Rpb24gKC4uLmFyZ3M6IGFueVtdKSB7XHJcbiAgICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XHJcbiAgICAgIGNvbnN0IHN0YXJ0TWVtb3J5ID0gcHJvY2Vzcy5tZW1vcnlVc2FnZSgpLmhlYXBVc2VkO1xyXG4gICAgICBjb25zdCBjb2xkU3RhcnQgPSAhKGdsb2JhbCBhcyBhbnkpLmxhbWJkYVdhcm1TdGFydDtcclxuICAgICAgKGdsb2JhbCBhcyBhbnkpLmxhbWJkYVdhcm1TdGFydCA9IHRydWU7XHJcblxyXG4gICAgICB0cnkge1xyXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IG1ldGhvZC5hcHBseSh0aGlzLCBhcmdzKTtcclxuICAgICAgICBcclxuICAgICAgICBjb25zdCBkdXJhdGlvbiA9IERhdGUubm93KCkgLSBzdGFydFRpbWU7XHJcbiAgICAgICAgY29uc3QgbWVtb3J5VXNlZCA9IHByb2Nlc3MubWVtb3J5VXNhZ2UoKS5oZWFwVXNlZCAtIHN0YXJ0TWVtb3J5O1xyXG5cclxuICAgICAgICBjb25zdCBjb2xsZWN0b3IgPSBnZXRNZXRyaWNzQ29sbGVjdG9yKCk7XHJcbiAgICAgICAgYXdhaXQgY29sbGVjdG9yLnJlY29yZFBlcmZvcm1hbmNlTWV0cmljcyh7XHJcbiAgICAgICAgICBmdW5jdGlvbk5hbWUsXHJcbiAgICAgICAgICBkdXJhdGlvbixcclxuICAgICAgICAgIG1lbW9yeVVzZWQsXHJcbiAgICAgICAgICBjb2xkU3RhcnQsXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgY29uc3QgZHVyYXRpb24gPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lO1xyXG4gICAgICAgIGNvbnN0IG1lbW9yeVVzZWQgPSBwcm9jZXNzLm1lbW9yeVVzYWdlKCkuaGVhcFVzZWQgLSBzdGFydE1lbW9yeTtcclxuXHJcbiAgICAgICAgY29uc3QgY29sbGVjdG9yID0gZ2V0TWV0cmljc0NvbGxlY3RvcigpO1xyXG4gICAgICAgIGF3YWl0IGNvbGxlY3Rvci5yZWNvcmRQZXJmb3JtYW5jZU1ldHJpY3Moe1xyXG4gICAgICAgICAgZnVuY3Rpb25OYW1lLFxyXG4gICAgICAgICAgZHVyYXRpb24sXHJcbiAgICAgICAgICBtZW1vcnlVc2VkLFxyXG4gICAgICAgICAgY29sZFN0YXJ0LFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB0aHJvdyBlcnJvcjtcclxuICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICByZXR1cm4gZGVzY3JpcHRvcjtcclxuICB9O1xyXG59XHJcblxyXG4vLyBFbnN1cmUgbWV0cmljcyBhcmUgZmx1c2hlZCBvbiBMYW1iZGEgc2h1dGRvd25cclxucHJvY2Vzcy5vbignYmVmb3JlRXhpdCcsIGFzeW5jICgpID0+IHtcclxuICBpZiAoZ2xvYmFsTWV0cmljc0NvbGxlY3Rvcikge1xyXG4gICAgYXdhaXQgZ2xvYmFsTWV0cmljc0NvbGxlY3Rvci5zaHV0ZG93bigpO1xyXG4gIH1cclxufSk7Il19