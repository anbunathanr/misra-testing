"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggingUtils = exports.structuredLogger = exports.StructuredLogger = void 0;
const client_cloudwatch_1 = require("@aws-sdk/client-cloudwatch");
/**
 * Structured Logger with CloudWatch Integration
 *
 * Provides structured logging with correlation IDs and automatic CloudWatch metrics
 * for the MISRA Platform autonomous workflow monitoring.
 */
class StructuredLogger {
    cloudWatch;
    namespace;
    environment;
    enableMetrics;
    constructor(region = process.env.AWS_REGION || 'us-east-1', namespace = process.env.CLOUDWATCH_NAMESPACE || 'MISRA/Platform', environment = process.env.ENVIRONMENT || 'dev') {
        this.cloudWatch = new client_cloudwatch_1.CloudWatchClient({ region });
        this.namespace = namespace;
        this.environment = environment;
        this.enableMetrics = process.env.ENABLE_CUSTOM_METRICS === 'true';
    }
    /**
     * Generate correlation ID for request tracing
     */
    static generateCorrelationId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Log structured message with context
     */
    log(level, message, context = {}) {
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
    logWorkflowStep(step, status, context = {}) {
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
    logAnalysisProgress(analysisId, progress, rulesProcessed, totalRules, context = {}) {
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
    logAuthEvent(event, success, context = {}) {
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
    logFileOperation(operation, fileId, fileName, fileSize, duration, context = {}) {
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
    logPerformance(operation, duration, success, context = {}) {
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
    logSecurityEvent(event, severity, context = {}) {
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
    logComplianceScore(complianceScore, analysisId, violationCount, context = {}) {
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
    async recordMetric(metricData) {
        if (!this.enableMetrics)
            return;
        try {
            const metricDatum = {
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
            const command = new client_cloudwatch_1.PutMetricDataCommand({
                Namespace: this.namespace,
                MetricData: [metricDatum],
            });
            await this.cloudWatch.send(command);
        }
        catch (error) {
            console.error('Failed to record metric:', error);
        }
    }
    async recordLogMetric(level, context) {
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
    async recordWorkflowMetric(step, status, context) {
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
    async recordAnalysisProgressMetric(progress, rulesProcessed, totalRules) {
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
    async recordAuthMetric(event, success) {
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
    async recordFileMetric(operation, fileSize, duration) {
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
    async recordPerformanceMetric(operation, duration, success) {
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
    async recordSecurityMetric(event, severity) {
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
    async recordComplianceMetric(complianceScore, violationCount) {
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
exports.StructuredLogger = StructuredLogger;
// Export singleton instance for use across the application
exports.structuredLogger = new StructuredLogger();
// Export utility functions
exports.LoggingUtils = {
    generateCorrelationId: StructuredLogger.generateCorrelationId,
    logWorkflowStep: (step, status, context = {}) => {
        exports.structuredLogger.logWorkflowStep(step, status, context);
    },
    logAnalysisProgress: (analysisId, progress, rulesProcessed, totalRules, context = {}) => {
        exports.structuredLogger.logAnalysisProgress(analysisId, progress, rulesProcessed, totalRules, context);
    },
    logAuthEvent: (event, success, context = {}) => {
        exports.structuredLogger.logAuthEvent(event, success, context);
    },
    logFileOperation: (operation, fileId, fileName, fileSize, duration, context = {}) => {
        exports.structuredLogger.logFileOperation(operation, fileId, fileName, fileSize, duration, context);
    },
    logPerformance: (operation, duration, success, context = {}) => {
        exports.structuredLogger.logPerformance(operation, duration, success, context);
    },
    logSecurityEvent: (event, severity, context = {}) => {
        exports.structuredLogger.logSecurityEvent(event, severity, context);
    },
    logComplianceScore: (complianceScore, analysisId, violationCount, context = {}) => {
        exports.structuredLogger.logComplianceScore(complianceScore, analysisId, violationCount, context);
    },
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RydWN0dXJlZC1sb2dnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzdHJ1Y3R1cmVkLWxvZ2dlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxrRUFBaUc7QUFtQmpHOzs7OztHQUtHO0FBQ0gsTUFBYSxnQkFBZ0I7SUFDbkIsVUFBVSxDQUFtQjtJQUM3QixTQUFTLENBQVM7SUFDbEIsV0FBVyxDQUFTO0lBQ3BCLGFBQWEsQ0FBVTtJQUUvQixZQUNFLFNBQWlCLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLFdBQVcsRUFDdEQsWUFBb0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsSUFBSSxnQkFBZ0IsRUFDeEUsY0FBc0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLElBQUksS0FBSztRQUV0RCxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksb0NBQWdCLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQ25ELElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO1FBQzNCLElBQUksQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO1FBQy9CLElBQUksQ0FBQyxhQUFhLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsS0FBSyxNQUFNLENBQUM7SUFDcEUsQ0FBQztJQUVEOztPQUVHO0lBQ0gsTUFBTSxDQUFDLHFCQUFxQjtRQUMxQixPQUFPLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDO0lBQ3BFLENBQUM7SUFFRDs7T0FFRztJQUNILEdBQUcsQ0FBQyxLQUEwQyxFQUFFLE9BQWUsRUFBRSxVQUFzQixFQUFFO1FBQ3ZGLE1BQU0sUUFBUSxHQUFHO1lBQ2YsU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO1lBQ25DLEtBQUs7WUFDTCxPQUFPO1lBQ1AsV0FBVyxFQUFFLElBQUksQ0FBQyxXQUFXO1lBQzdCLEdBQUcsT0FBTztTQUNYLENBQUM7UUFFRix3QkFBd0I7UUFDeEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFFdEMsb0NBQW9DO1FBQ3BDLElBQUksSUFBSSxDQUFDLGFBQWEsSUFBSSxDQUFDLEtBQUssS0FBSyxPQUFPLElBQUksS0FBSyxLQUFLLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDbEUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFO2dCQUNqRCxPQUFPLENBQUMsS0FBSyxDQUFDLDhCQUE4QixFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ3ZELENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztJQUNILENBQUM7SUFFRDs7T0FFRztJQUNILGVBQWUsQ0FDYixJQUFZLEVBQ1osTUFBMEMsRUFDMUMsVUFBc0IsRUFBRTtRQUV4QixNQUFNLE9BQU8sR0FBRyxpQkFBaUIsSUFBSSxJQUFJLE1BQU0sRUFBRSxDQUFDO1FBQ2xELE1BQU0sS0FBSyxHQUFHLE1BQU0sS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO1FBRXJELElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRTtZQUN2QixHQUFHLE9BQU87WUFDVixJQUFJO1lBQ0osTUFBTTtZQUNOLFlBQVksRUFBRSxJQUFJO1NBQ25CLENBQUMsQ0FBQztRQUVILDBCQUEwQjtRQUMxQixJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN2QixJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQzdELE9BQU8sQ0FBQyxLQUFLLENBQUMsbUNBQW1DLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDNUQsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0gsbUJBQW1CLENBQ2pCLFVBQWtCLEVBQ2xCLFFBQWdCLEVBQ2hCLGNBQXNCLEVBQ3RCLFVBQWtCLEVBQ2xCLFVBQXNCLEVBQUU7UUFFeEIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsMEJBQTBCLEVBQUU7WUFDM0MsR0FBRyxPQUFPO1lBQ1YsVUFBVTtZQUNWLFFBQVE7WUFDUixjQUFjO1lBQ2QsVUFBVTtZQUNWLGdCQUFnQixFQUFFLElBQUk7U0FDdkIsQ0FBQyxDQUFDO1FBRUgsMEJBQTBCO1FBQzFCLElBQUksSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3ZCLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxRQUFRLEVBQUUsY0FBYyxFQUFFLFVBQVUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRTtnQkFDcEYsT0FBTyxDQUFDLEtBQUssQ0FBQyw0Q0FBNEMsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUNyRSxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxZQUFZLENBQ1YsS0FBYSxFQUNiLE9BQWdCLEVBQ2hCLFVBQXNCLEVBQUU7UUFFeEIsTUFBTSxPQUFPLEdBQUcsa0JBQWtCLEtBQUssSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDOUUsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztRQUV4QyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUU7WUFDdkIsR0FBRyxPQUFPO1lBQ1YsU0FBUyxFQUFFLEtBQUs7WUFDaEIsT0FBTztZQUNQLGFBQWEsRUFBRSxJQUFJO1NBQ3BCLENBQUMsQ0FBQztRQUVILHNCQUFzQjtRQUN0QixJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN2QixJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRTtnQkFDbEQsT0FBTyxDQUFDLEtBQUssQ0FBQywrQkFBK0IsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUN4RCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxnQkFBZ0IsQ0FDZCxTQUFpQixFQUNqQixNQUFjLEVBQ2QsUUFBaUIsRUFDakIsUUFBaUIsRUFDakIsUUFBaUIsRUFDakIsVUFBc0IsRUFBRTtRQUV4QixJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxRQUFRLFNBQVMsWUFBWSxFQUFFO1lBQzlDLEdBQUcsT0FBTztZQUNWLE1BQU07WUFDTixRQUFRO1lBQ1IsUUFBUTtZQUNSLFFBQVE7WUFDUixhQUFhLEVBQUUsU0FBUztTQUN6QixDQUFDLENBQUM7UUFFSCxzQkFBc0I7UUFDdEIsSUFBSSxJQUFJLENBQUMsYUFBYSxJQUFJLFFBQVEsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUMvQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQ2pFLE9BQU8sQ0FBQyxLQUFLLENBQUMsK0JBQStCLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDeEQsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0gsY0FBYyxDQUNaLFNBQWlCLEVBQ2pCLFFBQWdCLEVBQ2hCLE9BQWdCLEVBQ2hCLFVBQXNCLEVBQUU7UUFFeEIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsZ0JBQWdCLFNBQVMsU0FBUyxRQUFRLElBQUksRUFBRTtZQUMvRCxHQUFHLE9BQU87WUFDVixTQUFTO1lBQ1QsUUFBUTtZQUNSLE9BQU87WUFDUCxpQkFBaUIsRUFBRSxJQUFJO1NBQ3hCLENBQUMsQ0FBQztRQUVILDZCQUE2QjtRQUM3QixJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN2QixJQUFJLENBQUMsdUJBQXVCLENBQUMsU0FBUyxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQ3ZFLE9BQU8sQ0FBQyxLQUFLLENBQUMsc0NBQXNDLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDL0QsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0gsZ0JBQWdCLENBQ2QsS0FBYSxFQUNiLFFBQWdELEVBQ2hELFVBQXNCLEVBQUU7UUFFeEIsTUFBTSxLQUFLLEdBQUcsUUFBUSxLQUFLLFVBQVUsSUFBSSxRQUFRLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztRQUVoRixJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxtQkFBbUIsS0FBSyxFQUFFLEVBQUU7WUFDMUMsR0FBRyxPQUFPO1lBQ1YsYUFBYSxFQUFFLEtBQUs7WUFDcEIsUUFBUTtTQUNULENBQUMsQ0FBQztRQUVILDBCQUEwQjtRQUMxQixJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN2QixJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRTtnQkFDdkQsT0FBTyxDQUFDLEtBQUssQ0FBQyxtQ0FBbUMsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUM1RCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxrQkFBa0IsQ0FDaEIsZUFBdUIsRUFDdkIsVUFBa0IsRUFDbEIsY0FBc0IsRUFDdEIsVUFBc0IsRUFBRTtRQUV4QixJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxrQ0FBa0MsZUFBZSxTQUFTLEVBQUU7WUFDM0UsR0FBRyxPQUFPO1lBQ1YsVUFBVTtZQUNWLGVBQWU7WUFDZixjQUFjO1lBQ2QsZ0JBQWdCLEVBQUUsSUFBSTtTQUN2QixDQUFDLENBQUM7UUFFSCw0QkFBNEI7UUFDNUIsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDdkIsSUFBSSxDQUFDLHNCQUFzQixDQUFDLGVBQWUsRUFBRSxjQUFjLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQ3pFLE9BQU8sQ0FBQyxLQUFLLENBQUMscUNBQXFDLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDOUQsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLFlBQVksQ0FBQyxVQUFzQjtRQUN2QyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWE7WUFBRSxPQUFPO1FBRWhDLElBQUksQ0FBQztZQUNILE1BQU0sV0FBVyxHQUFnQjtnQkFDL0IsVUFBVSxFQUFFLFVBQVUsQ0FBQyxVQUFVO2dCQUNqQyxLQUFLLEVBQUUsVUFBVSxDQUFDLEtBQUs7Z0JBQ3ZCLElBQUksRUFBRSxVQUFVLENBQUMsSUFBSTtnQkFDckIsU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFO2FBQ3RCLENBQUM7WUFFRixJQUFJLFVBQVUsQ0FBQyxVQUFVLEVBQUUsQ0FBQztnQkFDMUIsV0FBVyxDQUFDLFVBQVUsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztvQkFDckYsSUFBSSxFQUFFLElBQUk7b0JBQ1YsS0FBSyxFQUFFLEtBQUs7aUJBQ2IsQ0FBQyxDQUFDLENBQUM7WUFDTixDQUFDO1lBRUQsTUFBTSxPQUFPLEdBQUcsSUFBSSx3Q0FBb0IsQ0FBQztnQkFDdkMsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTO2dCQUN6QixVQUFVLEVBQUUsQ0FBQyxXQUFXLENBQUM7YUFDMUIsQ0FBQyxDQUFDO1lBRUgsTUFBTSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN0QyxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsMEJBQTBCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDbkQsQ0FBQztJQUNILENBQUM7SUFFTyxLQUFLLENBQUMsZUFBZSxDQUFDLEtBQWEsRUFBRSxPQUFtQjtRQUM5RCxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUM7WUFDdEIsVUFBVSxFQUFFLFdBQVc7WUFDdkIsS0FBSyxFQUFFLENBQUM7WUFDUixJQUFJLEVBQUUsT0FBTztZQUNiLFVBQVUsRUFBRTtnQkFDVixLQUFLLEVBQUUsS0FBSztnQkFDWixXQUFXLEVBQUUsSUFBSSxDQUFDLFdBQVc7Z0JBQzdCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxJQUFJLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDM0MsR0FBRyxDQUFDLE9BQU8sQ0FBQyxTQUFTLElBQUksRUFBRSxTQUFTLEVBQUUsT0FBTyxDQUFDLFNBQVMsRUFBRSxDQUFDO2FBQzNEO1NBQ0YsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVPLEtBQUssQ0FBQyxvQkFBb0IsQ0FDaEMsSUFBWSxFQUNaLE1BQWMsRUFDZCxPQUFtQjtRQUVuQixNQUFNLElBQUksQ0FBQyxZQUFZLENBQUM7WUFDdEIsVUFBVSxFQUFFLFdBQVcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3pFLEtBQUssRUFBRSxDQUFDO1lBQ1IsSUFBSSxFQUFFLE9BQU87WUFDYixVQUFVLEVBQUU7Z0JBQ1YsSUFBSSxFQUFFLElBQUk7Z0JBQ1YsV0FBVyxFQUFFLElBQUksQ0FBQyxXQUFXO2FBQzlCO1NBQ0YsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVPLEtBQUssQ0FBQyw0QkFBNEIsQ0FDeEMsUUFBZ0IsRUFDaEIsY0FBc0IsRUFDdEIsVUFBa0I7UUFFbEIsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDO1lBQ2hCLElBQUksQ0FBQyxZQUFZLENBQUM7Z0JBQ2hCLFVBQVUsRUFBRSxrQkFBa0I7Z0JBQzlCLEtBQUssRUFBRSxRQUFRO2dCQUNmLElBQUksRUFBRSxTQUFTO2dCQUNmLFVBQVUsRUFBRSxFQUFFLFdBQVcsRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFO2FBQzlDLENBQUM7WUFDRixJQUFJLENBQUMsWUFBWSxDQUFDO2dCQUNoQixVQUFVLEVBQUUsZ0JBQWdCO2dCQUM1QixLQUFLLEVBQUUsY0FBYztnQkFDckIsSUFBSSxFQUFFLE9BQU87Z0JBQ2IsVUFBVSxFQUFFLEVBQUUsV0FBVyxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUU7YUFDOUMsQ0FBQztTQUNILENBQUMsQ0FBQztJQUNMLENBQUM7SUFFTyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsS0FBYSxFQUFFLE9BQWdCO1FBQzVELE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBQztZQUN0QixVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsdUJBQXVCO1lBQ3ZFLEtBQUssRUFBRSxDQUFDO1lBQ1IsSUFBSSxFQUFFLE9BQU87WUFDYixVQUFVLEVBQUU7Z0JBQ1YsS0FBSyxFQUFFLEtBQUs7Z0JBQ1osV0FBVyxFQUFFLElBQUksQ0FBQyxXQUFXO2FBQzlCO1NBQ0YsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVPLEtBQUssQ0FBQyxnQkFBZ0IsQ0FDNUIsU0FBaUIsRUFDakIsUUFBZ0IsRUFDaEIsUUFBZ0I7UUFFaEIsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDO1lBQ2hCLElBQUksQ0FBQyxZQUFZLENBQUM7Z0JBQ2hCLFVBQVUsRUFBRSxnQkFBZ0I7Z0JBQzVCLEtBQUssRUFBRSxDQUFDO2dCQUNSLElBQUksRUFBRSxPQUFPO2dCQUNiLFVBQVUsRUFBRTtvQkFDVixTQUFTLEVBQUUsU0FBUztvQkFDcEIsV0FBVyxFQUFFLElBQUksQ0FBQyxXQUFXO2lCQUM5QjthQUNGLENBQUM7WUFDRixJQUFJLENBQUMsWUFBWSxDQUFDO2dCQUNoQixVQUFVLEVBQUUsVUFBVTtnQkFDdEIsS0FBSyxFQUFFLFFBQVE7Z0JBQ2YsSUFBSSxFQUFFLE9BQU87Z0JBQ2IsVUFBVSxFQUFFO29CQUNWLFNBQVMsRUFBRSxTQUFTO29CQUNwQixXQUFXLEVBQUUsSUFBSSxDQUFDLFdBQVc7aUJBQzlCO2FBQ0YsQ0FBQztZQUNGLElBQUksQ0FBQyxZQUFZLENBQUM7Z0JBQ2hCLFVBQVUsRUFBRSx1QkFBdUI7Z0JBQ25DLEtBQUssRUFBRSxRQUFRO2dCQUNmLElBQUksRUFBRSxjQUFjO2dCQUNwQixVQUFVLEVBQUU7b0JBQ1YsU0FBUyxFQUFFLFNBQVM7b0JBQ3BCLFdBQVcsRUFBRSxJQUFJLENBQUMsV0FBVztpQkFDOUI7YUFDRixDQUFDO1NBQ0gsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVPLEtBQUssQ0FBQyx1QkFBdUIsQ0FDbkMsU0FBaUIsRUFDakIsUUFBZ0IsRUFDaEIsT0FBZ0I7UUFFaEIsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDO1lBQ3RCLFVBQVUsRUFBRSxtQkFBbUI7WUFDL0IsS0FBSyxFQUFFLFFBQVE7WUFDZixJQUFJLEVBQUUsY0FBYztZQUNwQixVQUFVLEVBQUU7Z0JBQ1YsU0FBUyxFQUFFLFNBQVM7Z0JBQ3BCLE9BQU8sRUFBRSxPQUFPLENBQUMsUUFBUSxFQUFFO2dCQUMzQixXQUFXLEVBQUUsSUFBSSxDQUFDLFdBQVc7YUFDOUI7U0FDRixDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU8sS0FBSyxDQUFDLG9CQUFvQixDQUFDLEtBQWEsRUFBRSxRQUFnQjtRQUNoRSxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUM7WUFDdEIsVUFBVSxFQUFFLGdCQUFnQjtZQUM1QixLQUFLLEVBQUUsQ0FBQztZQUNSLElBQUksRUFBRSxPQUFPO1lBQ2IsVUFBVSxFQUFFO2dCQUNWLEtBQUssRUFBRSxLQUFLO2dCQUNaLFFBQVEsRUFBRSxRQUFRO2dCQUNsQixXQUFXLEVBQUUsSUFBSSxDQUFDLFdBQVc7YUFDOUI7U0FDRixDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU8sS0FBSyxDQUFDLHNCQUFzQixDQUNsQyxlQUF1QixFQUN2QixjQUFzQjtRQUV0QixNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUM7WUFDaEIsSUFBSSxDQUFDLFlBQVksQ0FBQztnQkFDaEIsVUFBVSxFQUFFLGlCQUFpQjtnQkFDN0IsS0FBSyxFQUFFLGVBQWU7Z0JBQ3RCLElBQUksRUFBRSxTQUFTO2dCQUNmLFVBQVUsRUFBRSxFQUFFLFdBQVcsRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFO2FBQzlDLENBQUM7WUFDRixJQUFJLENBQUMsWUFBWSxDQUFDO2dCQUNoQixVQUFVLEVBQUUsb0JBQW9CO2dCQUNoQyxLQUFLLEVBQUUsY0FBYztnQkFDckIsSUFBSSxFQUFFLE9BQU87Z0JBQ2IsVUFBVSxFQUFFLEVBQUUsV0FBVyxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUU7YUFDOUMsQ0FBQztTQUNILENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQXhaRCw0Q0F3WkM7QUFFRCwyREFBMkQ7QUFDOUMsUUFBQSxnQkFBZ0IsR0FBRyxJQUFJLGdCQUFnQixFQUFFLENBQUM7QUFFdkQsMkJBQTJCO0FBQ2QsUUFBQSxZQUFZLEdBQUc7SUFDMUIscUJBQXFCLEVBQUUsZ0JBQWdCLENBQUMscUJBQXFCO0lBRTdELGVBQWUsRUFBRSxDQUFDLElBQVksRUFBRSxNQUEwQyxFQUFFLFVBQXNCLEVBQUUsRUFBRSxFQUFFO1FBQ3RHLHdCQUFnQixDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQzFELENBQUM7SUFFRCxtQkFBbUIsRUFBRSxDQUFDLFVBQWtCLEVBQUUsUUFBZ0IsRUFBRSxjQUFzQixFQUFFLFVBQWtCLEVBQUUsVUFBc0IsRUFBRSxFQUFFLEVBQUU7UUFDbEksd0JBQWdCLENBQUMsbUJBQW1CLENBQUMsVUFBVSxFQUFFLFFBQVEsRUFBRSxjQUFjLEVBQUUsVUFBVSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ2xHLENBQUM7SUFFRCxZQUFZLEVBQUUsQ0FBQyxLQUFhLEVBQUUsT0FBZ0IsRUFBRSxVQUFzQixFQUFFLEVBQUUsRUFBRTtRQUMxRSx3QkFBZ0IsQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztJQUN6RCxDQUFDO0lBRUQsZ0JBQWdCLEVBQUUsQ0FBQyxTQUFpQixFQUFFLE1BQWMsRUFBRSxRQUFpQixFQUFFLFFBQWlCLEVBQUUsUUFBaUIsRUFBRSxVQUFzQixFQUFFLEVBQUUsRUFBRTtRQUN6SSx3QkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQzlGLENBQUM7SUFFRCxjQUFjLEVBQUUsQ0FBQyxTQUFpQixFQUFFLFFBQWdCLEVBQUUsT0FBZ0IsRUFBRSxVQUFzQixFQUFFLEVBQUUsRUFBRTtRQUNsRyx3QkFBZ0IsQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDekUsQ0FBQztJQUVELGdCQUFnQixFQUFFLENBQUMsS0FBYSxFQUFFLFFBQWdELEVBQUUsVUFBc0IsRUFBRSxFQUFFLEVBQUU7UUFDOUcsd0JBQWdCLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUM5RCxDQUFDO0lBRUQsa0JBQWtCLEVBQUUsQ0FBQyxlQUF1QixFQUFFLFVBQWtCLEVBQUUsY0FBc0IsRUFBRSxVQUFzQixFQUFFLEVBQUUsRUFBRTtRQUNwSCx3QkFBZ0IsQ0FBQyxrQkFBa0IsQ0FBQyxlQUFlLEVBQUUsVUFBVSxFQUFFLGNBQWMsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUM1RixDQUFDO0NBQ0YsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENsb3VkV2F0Y2hDbGllbnQsIFB1dE1ldHJpY0RhdGFDb21tYW5kLCBNZXRyaWNEYXR1bSB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1jbG91ZHdhdGNoJztcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgTG9nQ29udGV4dCB7XHJcbiAgY29ycmVsYXRpb25JZD86IHN0cmluZztcclxuICB1c2VySWQ/OiBzdHJpbmc7XHJcbiAgYW5hbHlzaXNJZD86IHN0cmluZztcclxuICBmaWxlSWQ/OiBzdHJpbmc7XHJcbiAgc3RlcD86IHN0cmluZztcclxuICBvcGVyYXRpb24/OiBzdHJpbmc7XHJcbiAgW2tleTogc3RyaW5nXTogYW55O1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIE1ldHJpY0RhdGEge1xyXG4gIG1ldHJpY05hbWU6IHN0cmluZztcclxuICB2YWx1ZTogbnVtYmVyO1xyXG4gIHVuaXQ6ICdDb3VudCcgfCAnU2Vjb25kcycgfCAnTWlsbGlzZWNvbmRzJyB8ICdCeXRlcycgfCAnUGVyY2VudCcgfCAnTm9uZSc7XHJcbiAgZGltZW5zaW9ucz86IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBTdHJ1Y3R1cmVkIExvZ2dlciB3aXRoIENsb3VkV2F0Y2ggSW50ZWdyYXRpb25cclxuICogXHJcbiAqIFByb3ZpZGVzIHN0cnVjdHVyZWQgbG9nZ2luZyB3aXRoIGNvcnJlbGF0aW9uIElEcyBhbmQgYXV0b21hdGljIENsb3VkV2F0Y2ggbWV0cmljc1xyXG4gKiBmb3IgdGhlIE1JU1JBIFBsYXRmb3JtIGF1dG9ub21vdXMgd29ya2Zsb3cgbW9uaXRvcmluZy5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBTdHJ1Y3R1cmVkTG9nZ2VyIHtcclxuICBwcml2YXRlIGNsb3VkV2F0Y2g6IENsb3VkV2F0Y2hDbGllbnQ7XHJcbiAgcHJpdmF0ZSBuYW1lc3BhY2U6IHN0cmluZztcclxuICBwcml2YXRlIGVudmlyb25tZW50OiBzdHJpbmc7XHJcbiAgcHJpdmF0ZSBlbmFibGVNZXRyaWNzOiBib29sZWFuO1xyXG5cclxuICBjb25zdHJ1Y3RvcihcclxuICAgIHJlZ2lvbjogc3RyaW5nID0gcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJyxcclxuICAgIG5hbWVzcGFjZTogc3RyaW5nID0gcHJvY2Vzcy5lbnYuQ0xPVURXQVRDSF9OQU1FU1BBQ0UgfHwgJ01JU1JBL1BsYXRmb3JtJyxcclxuICAgIGVudmlyb25tZW50OiBzdHJpbmcgPSBwcm9jZXNzLmVudi5FTlZJUk9OTUVOVCB8fCAnZGV2J1xyXG4gICkge1xyXG4gICAgdGhpcy5jbG91ZFdhdGNoID0gbmV3IENsb3VkV2F0Y2hDbGllbnQoeyByZWdpb24gfSk7XHJcbiAgICB0aGlzLm5hbWVzcGFjZSA9IG5hbWVzcGFjZTtcclxuICAgIHRoaXMuZW52aXJvbm1lbnQgPSBlbnZpcm9ubWVudDtcclxuICAgIHRoaXMuZW5hYmxlTWV0cmljcyA9IHByb2Nlc3MuZW52LkVOQUJMRV9DVVNUT01fTUVUUklDUyA9PT0gJ3RydWUnO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2VuZXJhdGUgY29ycmVsYXRpb24gSUQgZm9yIHJlcXVlc3QgdHJhY2luZ1xyXG4gICAqL1xyXG4gIHN0YXRpYyBnZW5lcmF0ZUNvcnJlbGF0aW9uSWQoKTogc3RyaW5nIHtcclxuICAgIHJldHVybiBgJHtEYXRlLm5vdygpfS0ke01hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cigyLCA5KX1gO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogTG9nIHN0cnVjdHVyZWQgbWVzc2FnZSB3aXRoIGNvbnRleHRcclxuICAgKi9cclxuICBsb2cobGV2ZWw6ICdERUJVRycgfCAnSU5GTycgfCAnV0FSTicgfCAnRVJST1InLCBtZXNzYWdlOiBzdHJpbmcsIGNvbnRleHQ6IExvZ0NvbnRleHQgPSB7fSk6IHZvaWQge1xyXG4gICAgY29uc3QgbG9nRW50cnkgPSB7XHJcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICBsZXZlbCxcclxuICAgICAgbWVzc2FnZSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHRoaXMuZW52aXJvbm1lbnQsXHJcbiAgICAgIC4uLmNvbnRleHQsXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIE91dHB1dCBzdHJ1Y3R1cmVkIGxvZ1xyXG4gICAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkobG9nRW50cnkpKTtcclxuXHJcbiAgICAvLyBTZW5kIG1ldHJpY3MgZm9yIGltcG9ydGFudCBldmVudHNcclxuICAgIGlmICh0aGlzLmVuYWJsZU1ldHJpY3MgJiYgKGxldmVsID09PSAnRVJST1InIHx8IGxldmVsID09PSAnV0FSTicpKSB7XHJcbiAgICAgIHRoaXMucmVjb3JkTG9nTWV0cmljKGxldmVsLCBjb250ZXh0KS5jYXRjaChlcnJvciA9PiB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIHJlY29yZCBsb2cgbWV0cmljOicsIGVycm9yKTtcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBMb2cgd29ya2Zsb3cgc3RlcCB3aXRoIHByb2dyZXNzIHRyYWNraW5nXHJcbiAgICovXHJcbiAgbG9nV29ya2Zsb3dTdGVwKFxyXG4gICAgc3RlcDogc3RyaW5nLFxyXG4gICAgc3RhdHVzOiAnc3RhcnRlZCcgfCAnY29tcGxldGVkJyB8ICdmYWlsZWQnLFxyXG4gICAgY29udGV4dDogTG9nQ29udGV4dCA9IHt9XHJcbiAgKTogdm9pZCB7XHJcbiAgICBjb25zdCBtZXNzYWdlID0gYFdvcmtmbG93IHN0ZXAgJHtzdGVwfSAke3N0YXR1c31gO1xyXG4gICAgY29uc3QgbGV2ZWwgPSBzdGF0dXMgPT09ICdmYWlsZWQnID8gJ0VSUk9SJyA6ICdJTkZPJztcclxuICAgIFxyXG4gICAgdGhpcy5sb2cobGV2ZWwsIG1lc3NhZ2UsIHtcclxuICAgICAgLi4uY29udGV4dCxcclxuICAgICAgc3RlcCxcclxuICAgICAgc3RhdHVzLFxyXG4gICAgICB3b3JrZmxvd1N0ZXA6IHRydWUsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBSZWNvcmQgd29ya2Zsb3cgbWV0cmljc1xyXG4gICAgaWYgKHRoaXMuZW5hYmxlTWV0cmljcykge1xyXG4gICAgICB0aGlzLnJlY29yZFdvcmtmbG93TWV0cmljKHN0ZXAsIHN0YXR1cywgY29udGV4dCkuY2F0Y2goZXJyb3IgPT4ge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byByZWNvcmQgd29ya2Zsb3cgbWV0cmljOicsIGVycm9yKTtcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBMb2cgYW5hbHlzaXMgcHJvZ3Jlc3Mgd2l0aCBwZXJmb3JtYW5jZSBtZXRyaWNzXHJcbiAgICovXHJcbiAgbG9nQW5hbHlzaXNQcm9ncmVzcyhcclxuICAgIGFuYWx5c2lzSWQ6IHN0cmluZyxcclxuICAgIHByb2dyZXNzOiBudW1iZXIsXHJcbiAgICBydWxlc1Byb2Nlc3NlZDogbnVtYmVyLFxyXG4gICAgdG90YWxSdWxlczogbnVtYmVyLFxyXG4gICAgY29udGV4dDogTG9nQ29udGV4dCA9IHt9XHJcbiAgKTogdm9pZCB7XHJcbiAgICB0aGlzLmxvZygnSU5GTycsICdBbmFseXNpcyBwcm9ncmVzcyB1cGRhdGUnLCB7XHJcbiAgICAgIC4uLmNvbnRleHQsXHJcbiAgICAgIGFuYWx5c2lzSWQsXHJcbiAgICAgIHByb2dyZXNzLFxyXG4gICAgICBydWxlc1Byb2Nlc3NlZCxcclxuICAgICAgdG90YWxSdWxlcyxcclxuICAgICAgYW5hbHlzaXNQcm9ncmVzczogdHJ1ZSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFJlY29yZCBhbmFseXNpcyBtZXRyaWNzXHJcbiAgICBpZiAodGhpcy5lbmFibGVNZXRyaWNzKSB7XHJcbiAgICAgIHRoaXMucmVjb3JkQW5hbHlzaXNQcm9ncmVzc01ldHJpYyhwcm9ncmVzcywgcnVsZXNQcm9jZXNzZWQsIHRvdGFsUnVsZXMpLmNhdGNoKGVycm9yID0+IHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gcmVjb3JkIGFuYWx5c2lzIHByb2dyZXNzIG1ldHJpYzonLCBlcnJvcik7XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogTG9nIGF1dGhlbnRpY2F0aW9uIGV2ZW50cyB3aXRoIHNlY3VyaXR5IGNvbnRleHRcclxuICAgKi9cclxuICBsb2dBdXRoRXZlbnQoXHJcbiAgICBldmVudDogc3RyaW5nLFxyXG4gICAgc3VjY2VzczogYm9vbGVhbixcclxuICAgIGNvbnRleHQ6IExvZ0NvbnRleHQgPSB7fVxyXG4gICk6IHZvaWQge1xyXG4gICAgY29uc3QgbWVzc2FnZSA9IGBBdXRoZW50aWNhdGlvbiAke2V2ZW50fSAke3N1Y2Nlc3MgPyAnc3VjY2VlZGVkJyA6ICdmYWlsZWQnfWA7XHJcbiAgICBjb25zdCBsZXZlbCA9IHN1Y2Nlc3MgPyAnSU5GTycgOiAnV0FSTic7XHJcbiAgICBcclxuICAgIHRoaXMubG9nKGxldmVsLCBtZXNzYWdlLCB7XHJcbiAgICAgIC4uLmNvbnRleHQsXHJcbiAgICAgIGF1dGhFdmVudDogZXZlbnQsXHJcbiAgICAgIHN1Y2Nlc3MsXHJcbiAgICAgIHNlY3VyaXR5RXZlbnQ6IHRydWUsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBSZWNvcmQgYXV0aCBtZXRyaWNzXHJcbiAgICBpZiAodGhpcy5lbmFibGVNZXRyaWNzKSB7XHJcbiAgICAgIHRoaXMucmVjb3JkQXV0aE1ldHJpYyhldmVudCwgc3VjY2VzcykuY2F0Y2goZXJyb3IgPT4ge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byByZWNvcmQgYXV0aCBtZXRyaWM6JywgZXJyb3IpO1xyXG4gICAgICB9KTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIExvZyBmaWxlIG9wZXJhdGlvbnMgd2l0aCBzaXplIGFuZCBkdXJhdGlvblxyXG4gICAqL1xyXG4gIGxvZ0ZpbGVPcGVyYXRpb24oXHJcbiAgICBvcGVyYXRpb246IHN0cmluZyxcclxuICAgIGZpbGVJZDogc3RyaW5nLFxyXG4gICAgZmlsZU5hbWU/OiBzdHJpbmcsXHJcbiAgICBmaWxlU2l6ZT86IG51bWJlcixcclxuICAgIGR1cmF0aW9uPzogbnVtYmVyLFxyXG4gICAgY29udGV4dDogTG9nQ29udGV4dCA9IHt9XHJcbiAgKTogdm9pZCB7XHJcbiAgICB0aGlzLmxvZygnSU5GTycsIGBGaWxlICR7b3BlcmF0aW9ufSBvcGVyYXRpb25gLCB7XHJcbiAgICAgIC4uLmNvbnRleHQsXHJcbiAgICAgIGZpbGVJZCxcclxuICAgICAgZmlsZU5hbWUsXHJcbiAgICAgIGZpbGVTaXplLFxyXG4gICAgICBkdXJhdGlvbixcclxuICAgICAgZmlsZU9wZXJhdGlvbjogb3BlcmF0aW9uLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gUmVjb3JkIGZpbGUgbWV0cmljc1xyXG4gICAgaWYgKHRoaXMuZW5hYmxlTWV0cmljcyAmJiBmaWxlU2l6ZSAmJiBkdXJhdGlvbikge1xyXG4gICAgICB0aGlzLnJlY29yZEZpbGVNZXRyaWMob3BlcmF0aW9uLCBmaWxlU2l6ZSwgZHVyYXRpb24pLmNhdGNoKGVycm9yID0+IHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gcmVjb3JkIGZpbGUgbWV0cmljOicsIGVycm9yKTtcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBMb2cgcGVyZm9ybWFuY2UgbWV0cmljc1xyXG4gICAqL1xyXG4gIGxvZ1BlcmZvcm1hbmNlKFxyXG4gICAgb3BlcmF0aW9uOiBzdHJpbmcsXHJcbiAgICBkdXJhdGlvbjogbnVtYmVyLFxyXG4gICAgc3VjY2VzczogYm9vbGVhbixcclxuICAgIGNvbnRleHQ6IExvZ0NvbnRleHQgPSB7fVxyXG4gICk6IHZvaWQge1xyXG4gICAgdGhpcy5sb2coJ0lORk8nLCBgUGVyZm9ybWFuY2U6ICR7b3BlcmF0aW9ufSB0b29rICR7ZHVyYXRpb259bXNgLCB7XHJcbiAgICAgIC4uLmNvbnRleHQsXHJcbiAgICAgIG9wZXJhdGlvbixcclxuICAgICAgZHVyYXRpb24sXHJcbiAgICAgIHN1Y2Nlc3MsXHJcbiAgICAgIHBlcmZvcm1hbmNlTWV0cmljOiB0cnVlLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gUmVjb3JkIHBlcmZvcm1hbmNlIG1ldHJpY3NcclxuICAgIGlmICh0aGlzLmVuYWJsZU1ldHJpY3MpIHtcclxuICAgICAgdGhpcy5yZWNvcmRQZXJmb3JtYW5jZU1ldHJpYyhvcGVyYXRpb24sIGR1cmF0aW9uLCBzdWNjZXNzKS5jYXRjaChlcnJvciA9PiB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIHJlY29yZCBwZXJmb3JtYW5jZSBtZXRyaWM6JywgZXJyb3IpO1xyXG4gICAgICB9KTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIExvZyBzZWN1cml0eSBldmVudHNcclxuICAgKi9cclxuICBsb2dTZWN1cml0eUV2ZW50KFxyXG4gICAgZXZlbnQ6IHN0cmluZyxcclxuICAgIHNldmVyaXR5OiAnTE9XJyB8ICdNRURJVU0nIHwgJ0hJR0gnIHwgJ0NSSVRJQ0FMJyxcclxuICAgIGNvbnRleHQ6IExvZ0NvbnRleHQgPSB7fVxyXG4gICk6IHZvaWQge1xyXG4gICAgY29uc3QgbGV2ZWwgPSBzZXZlcml0eSA9PT0gJ0NSSVRJQ0FMJyB8fCBzZXZlcml0eSA9PT0gJ0hJR0gnID8gJ0VSUk9SJyA6ICdXQVJOJztcclxuICAgIFxyXG4gICAgdGhpcy5sb2cobGV2ZWwsIGBTZWN1cml0eSBldmVudDogJHtldmVudH1gLCB7XHJcbiAgICAgIC4uLmNvbnRleHQsXHJcbiAgICAgIHNlY3VyaXR5RXZlbnQ6IGV2ZW50LFxyXG4gICAgICBzZXZlcml0eSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFJlY29yZCBzZWN1cml0eSBtZXRyaWNzXHJcbiAgICBpZiAodGhpcy5lbmFibGVNZXRyaWNzKSB7XHJcbiAgICAgIHRoaXMucmVjb3JkU2VjdXJpdHlNZXRyaWMoZXZlbnQsIHNldmVyaXR5KS5jYXRjaChlcnJvciA9PiB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIHJlY29yZCBzZWN1cml0eSBtZXRyaWM6JywgZXJyb3IpO1xyXG4gICAgICB9KTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIExvZyBjb21wbGlhbmNlIHNjb3JlIHdpdGggYW5hbHlzaXMgZGV0YWlsc1xyXG4gICAqL1xyXG4gIGxvZ0NvbXBsaWFuY2VTY29yZShcclxuICAgIGNvbXBsaWFuY2VTY29yZTogbnVtYmVyLFxyXG4gICAgYW5hbHlzaXNJZDogc3RyaW5nLFxyXG4gICAgdmlvbGF0aW9uQ291bnQ6IG51bWJlcixcclxuICAgIGNvbnRleHQ6IExvZ0NvbnRleHQgPSB7fVxyXG4gICk6IHZvaWQge1xyXG4gICAgdGhpcy5sb2coJ0lORk8nLCBgQ29tcGxpYW5jZSBhbmFseXNpcyBjb21wbGV0ZWQ6ICR7Y29tcGxpYW5jZVNjb3JlfSUgc2NvcmVgLCB7XHJcbiAgICAgIC4uLmNvbnRleHQsXHJcbiAgICAgIGFuYWx5c2lzSWQsXHJcbiAgICAgIGNvbXBsaWFuY2VTY29yZSxcclxuICAgICAgdmlvbGF0aW9uQ291bnQsXHJcbiAgICAgIGNvbXBsaWFuY2VSZXN1bHQ6IHRydWUsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBSZWNvcmQgY29tcGxpYW5jZSBtZXRyaWNzXHJcbiAgICBpZiAodGhpcy5lbmFibGVNZXRyaWNzKSB7XHJcbiAgICAgIHRoaXMucmVjb3JkQ29tcGxpYW5jZU1ldHJpYyhjb21wbGlhbmNlU2NvcmUsIHZpb2xhdGlvbkNvdW50KS5jYXRjaChlcnJvciA9PiB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIHJlY29yZCBjb21wbGlhbmNlIG1ldHJpYzonLCBlcnJvcik7XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUmVjb3JkIGN1c3RvbSBtZXRyaWMgdG8gQ2xvdWRXYXRjaFxyXG4gICAqL1xyXG4gIGFzeW5jIHJlY29yZE1ldHJpYyhtZXRyaWNEYXRhOiBNZXRyaWNEYXRhKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBpZiAoIXRoaXMuZW5hYmxlTWV0cmljcykgcmV0dXJuO1xyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IG1ldHJpY0RhdHVtOiBNZXRyaWNEYXR1bSA9IHtcclxuICAgICAgICBNZXRyaWNOYW1lOiBtZXRyaWNEYXRhLm1ldHJpY05hbWUsXHJcbiAgICAgICAgVmFsdWU6IG1ldHJpY0RhdGEudmFsdWUsXHJcbiAgICAgICAgVW5pdDogbWV0cmljRGF0YS51bml0LFxyXG4gICAgICAgIFRpbWVzdGFtcDogbmV3IERhdGUoKSxcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGlmIChtZXRyaWNEYXRhLmRpbWVuc2lvbnMpIHtcclxuICAgICAgICBtZXRyaWNEYXR1bS5EaW1lbnNpb25zID0gT2JqZWN0LmVudHJpZXMobWV0cmljRGF0YS5kaW1lbnNpb25zKS5tYXAoKFtuYW1lLCB2YWx1ZV0pID0+ICh7XHJcbiAgICAgICAgICBOYW1lOiBuYW1lLFxyXG4gICAgICAgICAgVmFsdWU6IHZhbHVlLFxyXG4gICAgICAgIH0pKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBQdXRNZXRyaWNEYXRhQ29tbWFuZCh7XHJcbiAgICAgICAgTmFtZXNwYWNlOiB0aGlzLm5hbWVzcGFjZSxcclxuICAgICAgICBNZXRyaWNEYXRhOiBbbWV0cmljRGF0dW1dLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGF3YWl0IHRoaXMuY2xvdWRXYXRjaC5zZW5kKGNvbW1hbmQpO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIHJlY29yZCBtZXRyaWM6JywgZXJyb3IpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyByZWNvcmRMb2dNZXRyaWMobGV2ZWw6IHN0cmluZywgY29udGV4dDogTG9nQ29udGV4dCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgYXdhaXQgdGhpcy5yZWNvcmRNZXRyaWMoe1xyXG4gICAgICBtZXRyaWNOYW1lOiAnTG9nRXZlbnRzJyxcclxuICAgICAgdmFsdWU6IDEsXHJcbiAgICAgIHVuaXQ6ICdDb3VudCcsXHJcbiAgICAgIGRpbWVuc2lvbnM6IHtcclxuICAgICAgICBMZXZlbDogbGV2ZWwsXHJcbiAgICAgICAgRW52aXJvbm1lbnQ6IHRoaXMuZW52aXJvbm1lbnQsXHJcbiAgICAgICAgLi4uKGNvbnRleHQuc3RlcCAmJiB7IFN0ZXA6IGNvbnRleHQuc3RlcCB9KSxcclxuICAgICAgICAuLi4oY29udGV4dC5vcGVyYXRpb24gJiYgeyBPcGVyYXRpb246IGNvbnRleHQub3BlcmF0aW9uIH0pLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFzeW5jIHJlY29yZFdvcmtmbG93TWV0cmljKFxyXG4gICAgc3RlcDogc3RyaW5nLFxyXG4gICAgc3RhdHVzOiBzdHJpbmcsXHJcbiAgICBjb250ZXh0OiBMb2dDb250ZXh0XHJcbiAgKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBhd2FpdCB0aGlzLnJlY29yZE1ldHJpYyh7XHJcbiAgICAgIG1ldHJpY05hbWU6IGBXb3JrZmxvdyR7c3RhdHVzLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgc3RhdHVzLnNsaWNlKDEpfWAsXHJcbiAgICAgIHZhbHVlOiAxLFxyXG4gICAgICB1bml0OiAnQ291bnQnLFxyXG4gICAgICBkaW1lbnNpb25zOiB7XHJcbiAgICAgICAgU3RlcDogc3RlcCxcclxuICAgICAgICBFbnZpcm9ubWVudDogdGhpcy5lbnZpcm9ubWVudCxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyByZWNvcmRBbmFseXNpc1Byb2dyZXNzTWV0cmljKFxyXG4gICAgcHJvZ3Jlc3M6IG51bWJlcixcclxuICAgIHJ1bGVzUHJvY2Vzc2VkOiBudW1iZXIsXHJcbiAgICB0b3RhbFJ1bGVzOiBudW1iZXJcclxuICApOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGF3YWl0IFByb21pc2UuYWxsKFtcclxuICAgICAgdGhpcy5yZWNvcmRNZXRyaWMoe1xyXG4gICAgICAgIG1ldHJpY05hbWU6ICdBbmFseXNpc1Byb2dyZXNzJyxcclxuICAgICAgICB2YWx1ZTogcHJvZ3Jlc3MsXHJcbiAgICAgICAgdW5pdDogJ1BlcmNlbnQnLFxyXG4gICAgICAgIGRpbWVuc2lvbnM6IHsgRW52aXJvbm1lbnQ6IHRoaXMuZW52aXJvbm1lbnQgfSxcclxuICAgICAgfSksXHJcbiAgICAgIHRoaXMucmVjb3JkTWV0cmljKHtcclxuICAgICAgICBtZXRyaWNOYW1lOiAnUnVsZXNQcm9jZXNzZWQnLFxyXG4gICAgICAgIHZhbHVlOiBydWxlc1Byb2Nlc3NlZCxcclxuICAgICAgICB1bml0OiAnQ291bnQnLFxyXG4gICAgICAgIGRpbWVuc2lvbnM6IHsgRW52aXJvbm1lbnQ6IHRoaXMuZW52aXJvbm1lbnQgfSxcclxuICAgICAgfSksXHJcbiAgICBdKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgYXN5bmMgcmVjb3JkQXV0aE1ldHJpYyhldmVudDogc3RyaW5nLCBzdWNjZXNzOiBib29sZWFuKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBhd2FpdCB0aGlzLnJlY29yZE1ldHJpYyh7XHJcbiAgICAgIG1ldHJpY05hbWU6IHN1Y2Nlc3MgPyAnQXV0aGVudGljYXRpb25TdWNjZXNzJyA6ICdBdXRoZW50aWNhdGlvbkZhaWx1cmUnLFxyXG4gICAgICB2YWx1ZTogMSxcclxuICAgICAgdW5pdDogJ0NvdW50JyxcclxuICAgICAgZGltZW5zaW9uczoge1xyXG4gICAgICAgIEV2ZW50OiBldmVudCxcclxuICAgICAgICBFbnZpcm9ubWVudDogdGhpcy5lbnZpcm9ubWVudCxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyByZWNvcmRGaWxlTWV0cmljKFxyXG4gICAgb3BlcmF0aW9uOiBzdHJpbmcsXHJcbiAgICBmaWxlU2l6ZTogbnVtYmVyLFxyXG4gICAgZHVyYXRpb246IG51bWJlclxyXG4gICk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgYXdhaXQgUHJvbWlzZS5hbGwoW1xyXG4gICAgICB0aGlzLnJlY29yZE1ldHJpYyh7XHJcbiAgICAgICAgbWV0cmljTmFtZTogJ0ZpbGVPcGVyYXRpb25zJyxcclxuICAgICAgICB2YWx1ZTogMSxcclxuICAgICAgICB1bml0OiAnQ291bnQnLFxyXG4gICAgICAgIGRpbWVuc2lvbnM6IHtcclxuICAgICAgICAgIE9wZXJhdGlvbjogb3BlcmF0aW9uLFxyXG4gICAgICAgICAgRW52aXJvbm1lbnQ6IHRoaXMuZW52aXJvbm1lbnQsXHJcbiAgICAgICAgfSxcclxuICAgICAgfSksXHJcbiAgICAgIHRoaXMucmVjb3JkTWV0cmljKHtcclxuICAgICAgICBtZXRyaWNOYW1lOiAnRmlsZVNpemUnLFxyXG4gICAgICAgIHZhbHVlOiBmaWxlU2l6ZSxcclxuICAgICAgICB1bml0OiAnQnl0ZXMnLFxyXG4gICAgICAgIGRpbWVuc2lvbnM6IHtcclxuICAgICAgICAgIE9wZXJhdGlvbjogb3BlcmF0aW9uLFxyXG4gICAgICAgICAgRW52aXJvbm1lbnQ6IHRoaXMuZW52aXJvbm1lbnQsXHJcbiAgICAgICAgfSxcclxuICAgICAgfSksXHJcbiAgICAgIHRoaXMucmVjb3JkTWV0cmljKHtcclxuICAgICAgICBtZXRyaWNOYW1lOiAnRmlsZU9wZXJhdGlvbkR1cmF0aW9uJyxcclxuICAgICAgICB2YWx1ZTogZHVyYXRpb24sXHJcbiAgICAgICAgdW5pdDogJ01pbGxpc2Vjb25kcycsXHJcbiAgICAgICAgZGltZW5zaW9uczoge1xyXG4gICAgICAgICAgT3BlcmF0aW9uOiBvcGVyYXRpb24sXHJcbiAgICAgICAgICBFbnZpcm9ubWVudDogdGhpcy5lbnZpcm9ubWVudCxcclxuICAgICAgICB9LFxyXG4gICAgICB9KSxcclxuICAgIF0pO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyByZWNvcmRQZXJmb3JtYW5jZU1ldHJpYyhcclxuICAgIG9wZXJhdGlvbjogc3RyaW5nLFxyXG4gICAgZHVyYXRpb246IG51bWJlcixcclxuICAgIHN1Y2Nlc3M6IGJvb2xlYW5cclxuICApOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGF3YWl0IHRoaXMucmVjb3JkTWV0cmljKHtcclxuICAgICAgbWV0cmljTmFtZTogJ09wZXJhdGlvbkR1cmF0aW9uJyxcclxuICAgICAgdmFsdWU6IGR1cmF0aW9uLFxyXG4gICAgICB1bml0OiAnTWlsbGlzZWNvbmRzJyxcclxuICAgICAgZGltZW5zaW9uczoge1xyXG4gICAgICAgIE9wZXJhdGlvbjogb3BlcmF0aW9uLFxyXG4gICAgICAgIFN1Y2Nlc3M6IHN1Y2Nlc3MudG9TdHJpbmcoKSxcclxuICAgICAgICBFbnZpcm9ubWVudDogdGhpcy5lbnZpcm9ubWVudCxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyByZWNvcmRTZWN1cml0eU1ldHJpYyhldmVudDogc3RyaW5nLCBzZXZlcml0eTogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBhd2FpdCB0aGlzLnJlY29yZE1ldHJpYyh7XHJcbiAgICAgIG1ldHJpY05hbWU6ICdTZWN1cml0eUV2ZW50cycsXHJcbiAgICAgIHZhbHVlOiAxLFxyXG4gICAgICB1bml0OiAnQ291bnQnLFxyXG4gICAgICBkaW1lbnNpb25zOiB7XHJcbiAgICAgICAgRXZlbnQ6IGV2ZW50LFxyXG4gICAgICAgIFNldmVyaXR5OiBzZXZlcml0eSxcclxuICAgICAgICBFbnZpcm9ubWVudDogdGhpcy5lbnZpcm9ubWVudCxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyByZWNvcmRDb21wbGlhbmNlTWV0cmljKFxyXG4gICAgY29tcGxpYW5jZVNjb3JlOiBudW1iZXIsXHJcbiAgICB2aW9sYXRpb25Db3VudDogbnVtYmVyXHJcbiAgKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBhd2FpdCBQcm9taXNlLmFsbChbXHJcbiAgICAgIHRoaXMucmVjb3JkTWV0cmljKHtcclxuICAgICAgICBtZXRyaWNOYW1lOiAnQ29tcGxpYW5jZVNjb3JlJyxcclxuICAgICAgICB2YWx1ZTogY29tcGxpYW5jZVNjb3JlLFxyXG4gICAgICAgIHVuaXQ6ICdQZXJjZW50JyxcclxuICAgICAgICBkaW1lbnNpb25zOiB7IEVudmlyb25tZW50OiB0aGlzLmVudmlyb25tZW50IH0sXHJcbiAgICAgIH0pLFxyXG4gICAgICB0aGlzLnJlY29yZE1ldHJpYyh7XHJcbiAgICAgICAgbWV0cmljTmFtZTogJ1Zpb2xhdGlvbnNEZXRlY3RlZCcsXHJcbiAgICAgICAgdmFsdWU6IHZpb2xhdGlvbkNvdW50LFxyXG4gICAgICAgIHVuaXQ6ICdDb3VudCcsXHJcbiAgICAgICAgZGltZW5zaW9uczogeyBFbnZpcm9ubWVudDogdGhpcy5lbnZpcm9ubWVudCB9LFxyXG4gICAgICB9KSxcclxuICAgIF0pO1xyXG4gIH1cclxufVxyXG5cclxuLy8gRXhwb3J0IHNpbmdsZXRvbiBpbnN0YW5jZSBmb3IgdXNlIGFjcm9zcyB0aGUgYXBwbGljYXRpb25cclxuZXhwb3J0IGNvbnN0IHN0cnVjdHVyZWRMb2dnZXIgPSBuZXcgU3RydWN0dXJlZExvZ2dlcigpO1xyXG5cclxuLy8gRXhwb3J0IHV0aWxpdHkgZnVuY3Rpb25zXHJcbmV4cG9ydCBjb25zdCBMb2dnaW5nVXRpbHMgPSB7XHJcbiAgZ2VuZXJhdGVDb3JyZWxhdGlvbklkOiBTdHJ1Y3R1cmVkTG9nZ2VyLmdlbmVyYXRlQ29ycmVsYXRpb25JZCxcclxuICBcclxuICBsb2dXb3JrZmxvd1N0ZXA6IChzdGVwOiBzdHJpbmcsIHN0YXR1czogJ3N0YXJ0ZWQnIHwgJ2NvbXBsZXRlZCcgfCAnZmFpbGVkJywgY29udGV4dDogTG9nQ29udGV4dCA9IHt9KSA9PiB7XHJcbiAgICBzdHJ1Y3R1cmVkTG9nZ2VyLmxvZ1dvcmtmbG93U3RlcChzdGVwLCBzdGF0dXMsIGNvbnRleHQpO1xyXG4gIH0sXHJcbiAgXHJcbiAgbG9nQW5hbHlzaXNQcm9ncmVzczogKGFuYWx5c2lzSWQ6IHN0cmluZywgcHJvZ3Jlc3M6IG51bWJlciwgcnVsZXNQcm9jZXNzZWQ6IG51bWJlciwgdG90YWxSdWxlczogbnVtYmVyLCBjb250ZXh0OiBMb2dDb250ZXh0ID0ge30pID0+IHtcclxuICAgIHN0cnVjdHVyZWRMb2dnZXIubG9nQW5hbHlzaXNQcm9ncmVzcyhhbmFseXNpc0lkLCBwcm9ncmVzcywgcnVsZXNQcm9jZXNzZWQsIHRvdGFsUnVsZXMsIGNvbnRleHQpO1xyXG4gIH0sXHJcbiAgXHJcbiAgbG9nQXV0aEV2ZW50OiAoZXZlbnQ6IHN0cmluZywgc3VjY2VzczogYm9vbGVhbiwgY29udGV4dDogTG9nQ29udGV4dCA9IHt9KSA9PiB7XHJcbiAgICBzdHJ1Y3R1cmVkTG9nZ2VyLmxvZ0F1dGhFdmVudChldmVudCwgc3VjY2VzcywgY29udGV4dCk7XHJcbiAgfSxcclxuICBcclxuICBsb2dGaWxlT3BlcmF0aW9uOiAob3BlcmF0aW9uOiBzdHJpbmcsIGZpbGVJZDogc3RyaW5nLCBmaWxlTmFtZT86IHN0cmluZywgZmlsZVNpemU/OiBudW1iZXIsIGR1cmF0aW9uPzogbnVtYmVyLCBjb250ZXh0OiBMb2dDb250ZXh0ID0ge30pID0+IHtcclxuICAgIHN0cnVjdHVyZWRMb2dnZXIubG9nRmlsZU9wZXJhdGlvbihvcGVyYXRpb24sIGZpbGVJZCwgZmlsZU5hbWUsIGZpbGVTaXplLCBkdXJhdGlvbiwgY29udGV4dCk7XHJcbiAgfSxcclxuICBcclxuICBsb2dQZXJmb3JtYW5jZTogKG9wZXJhdGlvbjogc3RyaW5nLCBkdXJhdGlvbjogbnVtYmVyLCBzdWNjZXNzOiBib29sZWFuLCBjb250ZXh0OiBMb2dDb250ZXh0ID0ge30pID0+IHtcclxuICAgIHN0cnVjdHVyZWRMb2dnZXIubG9nUGVyZm9ybWFuY2Uob3BlcmF0aW9uLCBkdXJhdGlvbiwgc3VjY2VzcywgY29udGV4dCk7XHJcbiAgfSxcclxuICBcclxuICBsb2dTZWN1cml0eUV2ZW50OiAoZXZlbnQ6IHN0cmluZywgc2V2ZXJpdHk6ICdMT1cnIHwgJ01FRElVTScgfCAnSElHSCcgfCAnQ1JJVElDQUwnLCBjb250ZXh0OiBMb2dDb250ZXh0ID0ge30pID0+IHtcclxuICAgIHN0cnVjdHVyZWRMb2dnZXIubG9nU2VjdXJpdHlFdmVudChldmVudCwgc2V2ZXJpdHksIGNvbnRleHQpO1xyXG4gIH0sXHJcbiAgXHJcbiAgbG9nQ29tcGxpYW5jZVNjb3JlOiAoY29tcGxpYW5jZVNjb3JlOiBudW1iZXIsIGFuYWx5c2lzSWQ6IHN0cmluZywgdmlvbGF0aW9uQ291bnQ6IG51bWJlciwgY29udGV4dDogTG9nQ29udGV4dCA9IHt9KSA9PiB7XHJcbiAgICBzdHJ1Y3R1cmVkTG9nZ2VyLmxvZ0NvbXBsaWFuY2VTY29yZShjb21wbGlhbmNlU2NvcmUsIGFuYWx5c2lzSWQsIHZpb2xhdGlvbkNvdW50LCBjb250ZXh0KTtcclxuICB9LFxyXG59OyJdfQ==