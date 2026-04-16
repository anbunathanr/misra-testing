"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.LoggingUtils = exports.CentralizedLogger = void 0;
exports.withCorrelationId = withCorrelationId;
exports.expressCorrelationMiddleware = expressCorrelationMiddleware;
const uuid_1 = require("uuid");
/**
 * Centralized Logger with Correlation ID Support
 *
 * Implements structured logging for request tracing across the MISRA Platform.
 * All logs include correlation IDs for end-to-end request tracking.
 *
 * Features:
 * - Correlation ID generation and propagation
 * - Structured JSON logging
 * - CloudWatch integration
 * - Performance metrics tracking
 * - Security event logging
 * - Business metrics collection
 */
class CentralizedLogger {
    context;
    static instance;
    constructor(initialContext) {
        this.context = {
            correlationId: initialContext?.correlationId || (0, uuid_1.v4)(),
            userId: initialContext?.userId,
            requestId: initialContext?.requestId,
            functionName: initialContext?.functionName || process.env.AWS_LAMBDA_FUNCTION_NAME,
            environment: initialContext?.environment || process.env.ENVIRONMENT || 'dev',
            timestamp: new Date().toISOString(),
        };
    }
    /**
     * Get or create singleton logger instance
     */
    static getInstance(context) {
        if (!CentralizedLogger.instance || context) {
            CentralizedLogger.instance = new CentralizedLogger(context);
        }
        return CentralizedLogger.instance;
    }
    /**
     * Create a new logger with updated context
     */
    withContext(updates) {
        return new CentralizedLogger({
            ...this.context,
            ...updates,
            timestamp: new Date().toISOString(),
        });
    }
    /**
     * Set correlation ID for request tracing
     */
    setCorrelationId(correlationId) {
        this.context.correlationId = correlationId;
    }
    /**
     * Get current correlation ID
     */
    getCorrelationId() {
        return this.context.correlationId;
    }
    /**
     * Set user ID for user-specific logging
     */
    setUserId(userId) {
        this.context.userId = userId;
    }
    /**
     * Log debug message
     */
    debug(message, metadata) {
        this.log('DEBUG', message, metadata);
    }
    /**
     * Log info message
     */
    info(message, metadata) {
        this.log('INFO', message, metadata);
    }
    /**
     * Log warning message
     */
    warn(message, metadata) {
        this.log('WARN', message, metadata);
    }
    /**
     * Log error message
     */
    error(message, error, metadata) {
        this.log('ERROR', message, metadata, error);
    }
    /**
     * Log business metrics
     */
    logBusinessMetric(metricName, value, unit = 'Count', metadata) {
        this.info(`Business metric: ${metricName}`, {
            metricType: 'business',
            metricName,
            value,
            unit,
            ...metadata,
        });
    }
    /**
     * Log performance metrics
     */
    logPerformanceMetric(operation, duration, metadata) {
        this.info(`Performance metric: ${operation}`, {
            metricType: 'performance',
            operation,
            duration,
            unit: 'milliseconds',
            ...metadata,
        });
    }
    /**
     * Log security events
     */
    logSecurityEvent(event, severity, metadata) {
        this.warn(`Security event: ${event}`, {
            eventType: 'security',
            event,
            severity,
            ...metadata,
        });
    }
    /**
     * Log user journey events
     */
    logUserJourney(step, status, metadata) {
        this.info(`User journey: ${step} - ${status}`, {
            eventType: 'userJourney',
            step,
            status,
            ...metadata,
        });
    }
    /**
     * Log analysis events
     */
    logAnalysisEvent(event, fileId, analysisId, metadata) {
        this.info(`Analysis event: ${event}`, {
            eventType: 'analysis',
            event,
            fileId,
            analysisId,
            ...metadata,
        });
    }
    /**
     * Core logging method
     */
    log(level, message, metadata, error) {
        const logEntry = {
            level,
            message,
            context: {
                ...this.context,
                timestamp: new Date().toISOString(),
            },
            metadata,
            error: error ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
            } : undefined,
        };
        // Output structured JSON log
        const logOutput = JSON.stringify(logEntry, null, 0);
        // Use appropriate console method based on level
        switch (level) {
            case 'DEBUG':
                console.debug(logOutput);
                break;
            case 'INFO':
                console.info(logOutput);
                break;
            case 'WARN':
                console.warn(logOutput);
                break;
            case 'ERROR':
                console.error(logOutput);
                break;
        }
        // Send to CloudWatch if in AWS environment
        if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
            this.sendToCloudWatch(logEntry);
        }
    }
    /**
     * Send log entry to CloudWatch for centralized logging
     */
    async sendToCloudWatch(logEntry) {
        try {
            // In Lambda, console.log automatically goes to CloudWatch
            // For additional processing, we could use CloudWatch Logs SDK
            // This is a placeholder for future CloudWatch integration
            // Example: Send custom metrics to CloudWatch
            if (logEntry.metadata?.metricType) {
                await this.sendCustomMetric(logEntry);
            }
        }
        catch (error) {
            // Avoid infinite logging loops
            console.error('Failed to send log to CloudWatch:', error);
        }
    }
    /**
     * Send custom metrics to CloudWatch
     */
    async sendCustomMetric(logEntry) {
        // This would integrate with CloudWatch Metrics API
        // For now, we'll use structured logging that can be parsed by metric filters
        if (logEntry.metadata?.metricType === 'business') {
            console.log(JSON.stringify({
                MetricType: 'Business',
                MetricName: logEntry.metadata.metricName,
                Value: logEntry.metadata.value,
                Unit: logEntry.metadata.unit,
                Timestamp: logEntry.context.timestamp,
                CorrelationId: logEntry.context.correlationId,
            }));
        }
        if (logEntry.metadata?.metricType === 'performance') {
            console.log(JSON.stringify({
                MetricType: 'Performance',
                Operation: logEntry.metadata.operation,
                Duration: logEntry.metadata.duration,
                Unit: 'Milliseconds',
                Timestamp: logEntry.context.timestamp,
                CorrelationId: logEntry.context.correlationId,
            }));
        }
    }
}
exports.CentralizedLogger = CentralizedLogger;
/**
 * Lambda middleware for automatic correlation ID handling
 */
function withCorrelationId(handler) {
    return async (event, context) => {
        // Extract correlation ID from headers or generate new one
        const correlationId = event.headers?.['x-correlation-id'] ||
            event.headers?.['X-Correlation-ID'] ||
            (0, uuid_1.v4)();
        // Extract user ID from JWT token if available
        const userId = event.requestContext?.authorizer?.userId;
        const requestId = context.awsRequestId;
        // Create logger with context
        const logger = new CentralizedLogger({
            correlationId,
            userId,
            requestId,
            functionName: context.functionName,
            environment: process.env.ENVIRONMENT,
        });
        // Add correlation ID to response headers
        const originalHandler = handler;
        const wrappedHandler = async (event, context) => {
            try {
                logger.info('Lambda function invoked', {
                    functionName: context.functionName,
                    requestId: context.awsRequestId,
                    remainingTimeInMillis: context.getRemainingTimeInMillis(),
                });
                const startTime = Date.now();
                const result = await originalHandler(event, context);
                const duration = Date.now() - startTime;
                logger.logPerformanceMetric('lambda_execution', duration, {
                    functionName: context.functionName,
                    success: true,
                });
                logger.info('Lambda function completed successfully', {
                    duration,
                    statusCode: result?.statusCode,
                });
                // Add correlation ID to response headers
                if (result && typeof result === 'object' && result.headers) {
                    result.headers['X-Correlation-ID'] = correlationId;
                }
                else if (result && typeof result === 'object') {
                    result.headers = {
                        ...result.headers,
                        'X-Correlation-ID': correlationId,
                    };
                }
                return result;
            }
            catch (error) {
                const duration = Date.now() - Date.now();
                logger.logPerformanceMetric('lambda_execution', duration, {
                    functionName: context.functionName,
                    success: false,
                });
                logger.error('Lambda function failed', error, {
                    functionName: context.functionName,
                    requestId: context.awsRequestId,
                });
                throw error;
            }
        };
        return wrappedHandler(event, context);
    };
}
/**
 * Express middleware for correlation ID handling
 */
function expressCorrelationMiddleware(req, res, next) {
    const correlationId = req.headers['x-correlation-id'] ||
        req.headers['X-Correlation-ID'] ||
        (0, uuid_1.v4)();
    // Set correlation ID in response headers
    res.setHeader('X-Correlation-ID', correlationId);
    // Create logger and attach to request
    req.logger = new CentralizedLogger({
        correlationId,
        userId: req.user?.id,
        requestId: req.id || (0, uuid_1.v4)(),
    });
    req.logger.info('HTTP request received', {
        method: req.method,
        url: req.url,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
    });
    next();
}
/**
 * Utility functions for common logging patterns
 */
class LoggingUtils {
    /**
     * Log API request start
     */
    static logApiRequestStart(logger, method, path, userId) {
        logger.logUserJourney('api_request_start', 'started', {
            method,
            path,
            userId,
        });
    }
    /**
     * Log API request completion
     */
    static logApiRequestComplete(logger, method, path, statusCode, duration) {
        logger.logUserJourney('api_request_complete', 'completed', {
            method,
            path,
            statusCode,
            duration,
        });
        logger.logPerformanceMetric('api_request', duration, {
            method,
            path,
            statusCode,
        });
    }
    /**
     * Log authentication events
     */
    static logAuthEvent(logger, event, userId, success = true) {
        if (success) {
            logger.info(`Authentication event: ${event}`, {
                eventType: 'authentication',
                event,
                userId,
                success,
            });
        }
        else {
            logger.logSecurityEvent(`Authentication failed: ${event}`, 'MEDIUM', {
                event,
                userId,
                success,
            });
        }
    }
    /**
     * Log file operations
     */
    static logFileOperation(logger, operation, fileId, fileName, fileSize) {
        logger.logAnalysisEvent(`File ${operation}`, fileId, undefined, {
            operation,
            fileName,
            fileSize,
        });
    }
    /**
     * Log analysis operations
     */
    static logAnalysisOperation(logger, operation, analysisId, fileId, duration) {
        logger.logAnalysisEvent(`Analysis ${operation}`, fileId, analysisId, {
            operation,
            duration,
        });
        if (duration) {
            logger.logPerformanceMetric('analysis_operation', duration, {
                operation,
                analysisId,
                fileId,
            });
        }
    }
    /**
     * Log business metrics
     */
    static logComplianceScore(logger, score, analysisId, violationCount) {
        logger.logBusinessMetric('compliance_score', score, 'Percent', {
            analysisId,
            violationCount,
        });
    }
    /**
     * Log error with context
     */
    static logErrorWithContext(logger, error, operation, context) {
        logger.error(`Error in ${operation}`, error, {
            operation,
            errorName: error.name,
            ...context,
        });
    }
}
exports.LoggingUtils = LoggingUtils;
// Export singleton instance for convenience
exports.logger = CentralizedLogger.getInstance();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VudHJhbGl6ZWQtbG9nZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2VudHJhbGl6ZWQtbG9nZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQXNSQSw4Q0EwRUM7QUFLRCxvRUF1QkM7QUE1WEQsK0JBQW9DO0FBbUJwQzs7Ozs7Ozs7Ozs7OztHQWFHO0FBQ0gsTUFBYSxpQkFBaUI7SUFDcEIsT0FBTyxDQUFhO0lBQ3BCLE1BQU0sQ0FBQyxRQUFRLENBQW9CO0lBRTNDLFlBQVksY0FBb0M7UUFDOUMsSUFBSSxDQUFDLE9BQU8sR0FBRztZQUNiLGFBQWEsRUFBRSxjQUFjLEVBQUUsYUFBYSxJQUFJLElBQUEsU0FBTSxHQUFFO1lBQ3hELE1BQU0sRUFBRSxjQUFjLEVBQUUsTUFBTTtZQUM5QixTQUFTLEVBQUUsY0FBYyxFQUFFLFNBQVM7WUFDcEMsWUFBWSxFQUFFLGNBQWMsRUFBRSxZQUFZLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0I7WUFDbEYsV0FBVyxFQUFFLGNBQWMsRUFBRSxXQUFXLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLElBQUksS0FBSztZQUM1RSxTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7U0FDcEMsQ0FBQztJQUNKLENBQUM7SUFFRDs7T0FFRztJQUNJLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBNkI7UUFDckQsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUMzQyxpQkFBaUIsQ0FBQyxRQUFRLEdBQUcsSUFBSSxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM5RCxDQUFDO1FBQ0QsT0FBTyxpQkFBaUIsQ0FBQyxRQUFRLENBQUM7SUFDcEMsQ0FBQztJQUVEOztPQUVHO0lBQ0ksV0FBVyxDQUFDLE9BQTRCO1FBQzdDLE9BQU8sSUFBSSxpQkFBaUIsQ0FBQztZQUMzQixHQUFHLElBQUksQ0FBQyxPQUFPO1lBQ2Ys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QW1CLENBQUMsTUFBeUIsRUFBRSxLQUFZLEVBQUUsU0FBaUIsRUFBRSxPQUE2QjtRQUNsSCxNQUFNLENBQUMsS0FBSyxDQUFDLFlBQVksU0FBUyxFQUFFLEVBQUUsS0FBSyxFQUFFO1lBQzNDLFNBQVM7WUFDVCxTQUFTLEVBQUUsS0FBSyxDQUFDLElBQUk7WUFDckIsR0FBRyxPQUFPO1NBQ1gsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBbkdELG9DQW1HQztBQUVELDRDQUE0QztBQUMvQixRQUFBLE1BQU0sR0FBRyxpQkFBaUIsQ0FBQyxXQUFXLEVBQUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHY0IGFzIHV1aWR2NCB9IGZyb20gJ3V1aWQnO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBMb2dDb250ZXh0IHtcclxuICBjb3JyZWxhdGlvbklkOiBzdHJpbmc7XHJcbiAgdXNlcklkPzogc3RyaW5nO1xyXG4gIHJlcXVlc3RJZD86IHN0cmluZztcclxuICBmdW5jdGlvbk5hbWU/OiBzdHJpbmc7XHJcbiAgZW52aXJvbm1lbnQ/OiBzdHJpbmc7XHJcbiAgdGltZXN0YW1wOiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgTG9nRW50cnkge1xyXG4gIGxldmVsOiAnREVCVUcnIHwgJ0lORk8nIHwgJ1dBUk4nIHwgJ0VSUk9SJztcclxuICBtZXNzYWdlOiBzdHJpbmc7XHJcbiAgY29udGV4dDogTG9nQ29udGV4dDtcclxuICBtZXRhZGF0YT86IFJlY29yZDxzdHJpbmcsIGFueT47XHJcbiAgZXJyb3I/OiBFcnJvcjtcclxufVxyXG5cclxuLyoqXHJcbiAqIENlbnRyYWxpemVkIExvZ2dlciB3aXRoIENvcnJlbGF0aW9uIElEIFN1cHBvcnRcclxuICogXHJcbiAqIEltcGxlbWVudHMgc3RydWN0dXJlZCBsb2dnaW5nIGZvciByZXF1ZXN0IHRyYWNpbmcgYWNyb3NzIHRoZSBNSVNSQSBQbGF0Zm9ybS5cclxuICogQWxsIGxvZ3MgaW5jbHVkZSBjb3JyZWxhdGlvbiBJRHMgZm9yIGVuZC10by1lbmQgcmVxdWVzdCB0cmFja2luZy5cclxuICogXHJcbiAqIEZlYXR1cmVzOlxyXG4gKiAtIENvcnJlbGF0aW9uIElEIGdlbmVyYXRpb24gYW5kIHByb3BhZ2F0aW9uXHJcbiAqIC0gU3RydWN0dXJlZCBKU09OIGxvZ2dpbmdcclxuICogLSBDbG91ZFdhdGNoIGludGVncmF0aW9uXHJcbiAqIC0gUGVyZm9ybWFuY2UgbWV0cmljcyB0cmFja2luZ1xyXG4gKiAtIFNlY3VyaXR5IGV2ZW50IGxvZ2dpbmdcclxuICogLSBCdXNpbmVzcyBtZXRyaWNzIGNvbGxlY3Rpb25cclxuICovXHJcbmV4cG9ydCBjbGFzcyBDZW50cmFsaXplZExvZ2dlciB7XHJcbiAgcHJpdmF0ZSBjb250ZXh0OiBMb2dDb250ZXh0O1xyXG4gIHByaXZhdGUgc3RhdGljIGluc3RhbmNlOiBDZW50cmFsaXplZExvZ2dlcjtcclxuXHJcbiAgY29uc3RydWN0b3IoaW5pdGlhbENvbnRleHQ/OiBQYXJ0aWFsPExvZ0NvbnRleHQ+KSB7XHJcbiAgICB0aGlzLmNvbnRleHQgPSB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQ6IGluaXRpYWxDb250ZXh0Py5jb3JyZWxhdGlvbklkIHx8IHV1aWR2NCgpLFxyXG4gICAgICB1c2VySWQ6IGluaXRpYWxDb250ZXh0Py51c2VySWQsXHJcbiAgICAgIHJlcXVlc3RJZDogaW5pdGlhbENvbnRleHQ/LnJlcXVlc3RJZCxcclxuICAgICAgZnVuY3Rpb25OYW1lOiBpbml0aWFsQ29udGV4dD8uZnVuY3Rpb25OYW1lIHx8IHByb2Nlc3MuZW52LkFXU19MQU1CREFfRlVOQ1RJT05fTkFNRSxcclxuICAgICAgZW52aXJvbm1lbnQ6IGluaXRpYWxDb250ZXh0Py5lbnZpcm9ubWVudCB8fCBwcm9jZXNzLmVudi5FTlZJUk9OTUVOVCB8fCAnZGV2JyxcclxuICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IG9yIGNyZWF0ZSBzaW5nbGV0b24gbG9nZ2VyIGluc3RhbmNlXHJcbiAgICovXHJcbiAgcHVibGljIHN0YXRpYyBnZXRJbnN0YW5jZShjb250ZXh0PzogUGFydGlhbDxMb2dDb250ZXh0Pik6IENlbnRyYWxpemVkTG9nZ2VyIHtcclxuICAgIGlmICghQ2VudHJhbGl6ZWRMb2dnZXIuaW5zdGFuY2UgfHwgY29udGV4dCkge1xyXG4gICAgICBDZW50cmFsaXplZExvZ2dlci5pbnN0YW5jZSA9IG5ldyBDZW50cmFsaXplZExvZ2dlcihjb250ZXh0KTtcclxuICAgIH1cclxuICAgIHJldHVybiBDZW50cmFsaXplZExvZ2dlci5pbnN0YW5jZTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENyZWF0ZSBhIG5ldyBsb2dnZXIgd2l0aCB1cGRhdGVkIGNvbnRleHRcclxuICAgKi9cclxuICBwdWJsaWMgd2l0aENvbnRleHQodXBkYXRlczogUGFydGlhbDxMb2dDb250ZXh0Pik6IENlbnRyYWxpemVkTG9nZ2VyIHtcclxuICAgIHJldHVybiBuZXcgQ2VudHJhbGl6ZWRMb2dnZXIoe1xyXG4gICAgICAuLi50aGlzLmNvbnRleHQsXHJcbiAgICAgIC4uLnVwZGF0ZXMsXHJcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBTZXQgY29ycmVsYXRpb24gSUQgZm9yIHJlcXVlc3QgdHJhY2luZ1xyXG4gICAqL1xyXG4gIHB1YmxpYyBzZXRDb3JyZWxhdGlvbklkKGNvcnJlbGF0aW9uSWQ6IHN0cmluZyk6IHZvaWQge1xyXG4gICAgdGhpcy5jb250ZXh0LmNvcnJlbGF0aW9uSWQgPSBjb3JyZWxhdGlvbklkO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IGN1cnJlbnQgY29ycmVsYXRpb24gSURcclxuICAgKi9cclxuICBwdWJsaWMgZ2V0Q29ycmVsYXRpb25JZCgpOiBzdHJpbmcge1xyXG4gICAgcmV0dXJuIHRoaXMuY29udGV4dC5jb3JyZWxhdGlvbklkO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogU2V0IHVzZXIgSUQgZm9yIHVzZXItc3BlY2lmaWMgbG9nZ2luZ1xyXG4gICAqL1xyXG4gIHB1YmxpYyBzZXRVc2VySWQodXNlcklkOiBzdHJpbmcpOiB2b2lkIHtcclxuICAgIHRoaXMuY29udGV4dC51c2VySWQgPSB1c2VySWQ7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBMb2cgZGVidWcgbWVzc2FnZVxyXG4gICAqL1xyXG4gIHB1YmxpYyBkZWJ1ZyhtZXNzYWdlOiBzdHJpbmcsIG1ldGFkYXRhPzogUmVjb3JkPHN0cmluZywgYW55Pik6IHZvaWQge1xyXG4gICAgdGhpcy5sb2coJ0RFQlVHJywgbWVzc2FnZSwgbWV0YWRhdGEpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogTG9nIGluZm8gbWVzc2FnZVxyXG4gICAqL1xyXG4gIHB1YmxpYyBpbmZvKG1lc3NhZ2U6IHN0cmluZywgbWV0YWRhdGE/OiBSZWNvcmQ8c3RyaW5nLCBhbnk+KTogdm9pZCB7XHJcbiAgICB0aGlzLmxvZygnSU5GTycsIG1lc3NhZ2UsIG1ldGFkYXRhKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIExvZyB3YXJuaW5nIG1lc3NhZ2VcclxuICAgKi9cclxuICBwdWJsaWMgd2FybihtZXNzYWdlOiBzdHJpbmcsIG1ldGFkYXRhPzogUmVjb3JkPHN0cmluZywgYW55Pik6IHZvaWQge1xyXG4gICAgdGhpcy5sb2coJ1dBUk4nLCBtZXNzYWdlLCBtZXRhZGF0YSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBMb2cgZXJyb3IgbWVzc2FnZVxyXG4gICAqL1xyXG4gIHB1YmxpYyBlcnJvcihtZXNzYWdlOiBzdHJpbmcsIGVycm9yPzogRXJyb3IsIG1ldGFkYXRhPzogUmVjb3JkPHN0cmluZywgYW55Pik6IHZvaWQge1xyXG4gICAgdGhpcy5sb2coJ0VSUk9SJywgbWVzc2FnZSwgbWV0YWRhdGEsIGVycm9yKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIExvZyBidXNpbmVzcyBtZXRyaWNzXHJcbiAgICovXHJcbiAgcHVibGljIGxvZ0J1c2luZXNzTWV0cmljKG1ldHJpY05hbWU6IHN0cmluZywgdmFsdWU6IG51bWJlciwgdW5pdDogc3RyaW5nID0gJ0NvdW50JywgbWV0YWRhdGE/OiBSZWNvcmQ8c3RyaW5nLCBhbnk+KTogdm9pZCB7XHJcbiAgICB0aGlzLmluZm8oYEJ1c2luZXNzIG1ldHJpYzogJHttZXRyaWNOYW1lfWAsIHtcclxuICAgICAgbWV0cmljVHlwZTogJ2J1c2luZXNzJyxcclxuICAgICAgbWV0cmljTmFtZSxcclxuICAgICAgdmFsdWUsXHJcbiAgICAgIHVuaXQsXHJcbiAgICAgIC4uLm1ldGFkYXRhLFxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBMb2cgcGVyZm9ybWFuY2UgbWV0cmljc1xyXG4gICAqL1xyXG4gIHB1YmxpYyBsb2dQZXJmb3JtYW5jZU1ldHJpYyhvcGVyYXRpb246IHN0cmluZywgZHVyYXRpb246IG51bWJlciwgbWV0YWRhdGE/OiBSZWNvcmQ8c3RyaW5nLCBhbnk+KTogdm9pZCB7XHJcbiAgICB0aGlzLmluZm8oYFBlcmZvcm1hbmNlIG1ldHJpYzogJHtvcGVyYXRpb259YCwge1xyXG4gICAgICBtZXRyaWNUeXBlOiAncGVyZm9ybWFuY2UnLFxyXG4gICAgICBvcGVyYXRpb24sXHJcbiAgICAgIGR1cmF0aW9uLFxyXG4gICAgICB1bml0OiAnbWlsbGlzZWNvbmRzJyxcclxuICAgICAgLi4ubWV0YWRhdGEsXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIExvZyBzZWN1cml0eSBldmVudHNcclxuICAgKi9cclxuICBwdWJsaWMgbG9nU2VjdXJpdHlFdmVudChldmVudDogc3RyaW5nLCBzZXZlcml0eTogJ0xPVycgfCAnTUVESVVNJyB8ICdISUdIJyB8ICdDUklUSUNBTCcsIG1ldGFkYXRhPzogUmVjb3JkPHN0cmluZywgYW55Pik6IHZvaWQge1xyXG4gICAgdGhpcy53YXJuKGBTZWN1cml0eSBldmVudDogJHtldmVudH1gLCB7XHJcbiAgICAgIGV2ZW50VHlwZTogJ3NlY3VyaXR5JyxcclxuICAgICAgZXZlbnQsXHJcbiAgICAgIHNldmVyaXR5LFxyXG4gICAgICAuLi5tZXRhZGF0YSxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogTG9nIHVzZXIgam91cm5leSBldmVudHNcclxuICAgKi9cclxuICBwdWJsaWMgbG9nVXNlckpvdXJuZXkoc3RlcDogc3RyaW5nLCBzdGF0dXM6ICdzdGFydGVkJyB8ICdjb21wbGV0ZWQnIHwgJ2ZhaWxlZCcsIG1ldGFkYXRhPzogUmVjb3JkPHN0cmluZywgYW55Pik6IHZvaWQge1xyXG4gICAgdGhpcy5pbmZvKGBVc2VyIGpvdXJuZXk6ICR7c3RlcH0gLSAke3N0YXR1c31gLCB7XHJcbiAgICAgIGV2ZW50VHlwZTogJ3VzZXJKb3VybmV5JyxcclxuICAgICAgc3RlcCxcclxuICAgICAgc3RhdHVzLFxyXG4gICAgICAuLi5tZXRhZGF0YSxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogTG9nIGFuYWx5c2lzIGV2ZW50c1xyXG4gICAqL1xyXG4gIHB1YmxpYyBsb2dBbmFseXNpc0V2ZW50KGV2ZW50OiBzdHJpbmcsIGZpbGVJZD86IHN0cmluZywgYW5hbHlzaXNJZD86IHN0cmluZywgbWV0YWRhdGE/OiBSZWNvcmQ8c3RyaW5nLCBhbnk+KTogdm9pZCB7XHJcbiAgICB0aGlzLmluZm8oYEFuYWx5c2lzIGV2ZW50OiAke2V2ZW50fWAsIHtcclxuICAgICAgZXZlbnRUeXBlOiAnYW5hbHlzaXMnLFxyXG4gICAgICBldmVudCxcclxuICAgICAgZmlsZUlkLFxyXG4gICAgICBhbmFseXNpc0lkLFxyXG4gICAgICAuLi5tZXRhZGF0YSxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ29yZSBsb2dnaW5nIG1ldGhvZFxyXG4gICAqL1xyXG4gIHByaXZhdGUgbG9nKGxldmVsOiBMb2dFbnRyeVsnbGV2ZWwnXSwgbWVzc2FnZTogc3RyaW5nLCBtZXRhZGF0YT86IFJlY29yZDxzdHJpbmcsIGFueT4sIGVycm9yPzogRXJyb3IpOiB2b2lkIHtcclxuICAgIGNvbnN0IGxvZ0VudHJ5OiBMb2dFbnRyeSA9IHtcclxuICAgICAgbGV2ZWwsXHJcbiAgICAgIG1lc3NhZ2UsXHJcbiAgICAgIGNvbnRleHQ6IHtcclxuICAgICAgICAuLi50aGlzLmNvbnRleHQsXHJcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgIH0sXHJcbiAgICAgIG1ldGFkYXRhLFxyXG4gICAgICBlcnJvcjogZXJyb3IgPyB7XHJcbiAgICAgICAgbmFtZTogZXJyb3IubmFtZSxcclxuICAgICAgICBtZXNzYWdlOiBlcnJvci5tZXNzYWdlLFxyXG4gICAgICAgIHN0YWNrOiBlcnJvci5zdGFjayxcclxuICAgICAgfSBhcyBhbnkgOiB1bmRlZmluZWQsXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIE91dHB1dCBzdHJ1Y3R1cmVkIEpTT04gbG9nXHJcbiAgICBjb25zdCBsb2dPdXRwdXQgPSBKU09OLnN0cmluZ2lmeShsb2dFbnRyeSwgbnVsbCwgMCk7XHJcbiAgICBcclxuICAgIC8vIFVzZSBhcHByb3ByaWF0ZSBjb25zb2xlIG1ldGhvZCBiYXNlZCBvbiBsZXZlbFxyXG4gICAgc3dpdGNoIChsZXZlbCkge1xyXG4gICAgICBjYXNlICdERUJVRyc6XHJcbiAgICAgICAgY29uc29sZS5kZWJ1Zyhsb2dPdXRwdXQpO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBjYXNlICdJTkZPJzpcclxuICAgICAgICBjb25zb2xlLmluZm8obG9nT3V0cHV0KTtcclxuICAgICAgICBicmVhaztcclxuICAgICAgY2FzZSAnV0FSTic6XHJcbiAgICAgICAgY29uc29sZS53YXJuKGxvZ091dHB1dCk7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIGNhc2UgJ0VSUk9SJzpcclxuICAgICAgICBjb25zb2xlLmVycm9yKGxvZ091dHB1dCk7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gU2VuZCB0byBDbG91ZFdhdGNoIGlmIGluIEFXUyBlbnZpcm9ubWVudFxyXG4gICAgaWYgKHByb2Nlc3MuZW52LkFXU19MQU1CREFfRlVOQ1RJT05fTkFNRSkge1xyXG4gICAgICB0aGlzLnNlbmRUb0Nsb3VkV2F0Y2gobG9nRW50cnkpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogU2VuZCBsb2cgZW50cnkgdG8gQ2xvdWRXYXRjaCBmb3IgY2VudHJhbGl6ZWQgbG9nZ2luZ1xyXG4gICAqL1xyXG4gIHByaXZhdGUgYXN5bmMgc2VuZFRvQ2xvdWRXYXRjaChsb2dFbnRyeTogTG9nRW50cnkpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIC8vIEluIExhbWJkYSwgY29uc29sZS5sb2cgYXV0b21hdGljYWxseSBnb2VzIHRvIENsb3VkV2F0Y2hcclxuICAgICAgLy8gRm9yIGFkZGl0aW9uYWwgcHJvY2Vzc2luZywgd2UgY291bGQgdXNlIENsb3VkV2F0Y2ggTG9ncyBTREtcclxuICAgICAgLy8gVGhpcyBpcyBhIHBsYWNlaG9sZGVyIGZvciBmdXR1cmUgQ2xvdWRXYXRjaCBpbnRlZ3JhdGlvblxyXG4gICAgICBcclxuICAgICAgLy8gRXhhbXBsZTogU2VuZCBjdXN0b20gbWV0cmljcyB0byBDbG91ZFdhdGNoXHJcbiAgICAgIGlmIChsb2dFbnRyeS5tZXRhZGF0YT8ubWV0cmljVHlwZSkge1xyXG4gICAgICAgIGF3YWl0IHRoaXMuc2VuZEN1c3RvbU1ldHJpYyhsb2dFbnRyeSk7XHJcbiAgICAgIH1cclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIC8vIEF2b2lkIGluZmluaXRlIGxvZ2dpbmcgbG9vcHNcclxuICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIHNlbmQgbG9nIHRvIENsb3VkV2F0Y2g6JywgZXJyb3IpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogU2VuZCBjdXN0b20gbWV0cmljcyB0byBDbG91ZFdhdGNoXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBhc3luYyBzZW5kQ3VzdG9tTWV0cmljKGxvZ0VudHJ5OiBMb2dFbnRyeSk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgLy8gVGhpcyB3b3VsZCBpbnRlZ3JhdGUgd2l0aCBDbG91ZFdhdGNoIE1ldHJpY3MgQVBJXHJcbiAgICAvLyBGb3Igbm93LCB3ZSdsbCB1c2Ugc3RydWN0dXJlZCBsb2dnaW5nIHRoYXQgY2FuIGJlIHBhcnNlZCBieSBtZXRyaWMgZmlsdGVyc1xyXG4gICAgXHJcbiAgICBpZiAobG9nRW50cnkubWV0YWRhdGE/Lm1ldHJpY1R5cGUgPT09ICdidXNpbmVzcycpIHtcclxuICAgICAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIE1ldHJpY1R5cGU6ICdCdXNpbmVzcycsXHJcbiAgICAgICAgTWV0cmljTmFtZTogbG9nRW50cnkubWV0YWRhdGEubWV0cmljTmFtZSxcclxuICAgICAgICBWYWx1ZTogbG9nRW50cnkubWV0YWRhdGEudmFsdWUsXHJcbiAgICAgICAgVW5pdDogbG9nRW50cnkubWV0YWRhdGEudW5pdCxcclxuICAgICAgICBUaW1lc3RhbXA6IGxvZ0VudHJ5LmNvbnRleHQudGltZXN0YW1wLFxyXG4gICAgICAgIENvcnJlbGF0aW9uSWQ6IGxvZ0VudHJ5LmNvbnRleHQuY29ycmVsYXRpb25JZCxcclxuICAgICAgfSkpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBpZiAobG9nRW50cnkubWV0YWRhdGE/Lm1ldHJpY1R5cGUgPT09ICdwZXJmb3JtYW5jZScpIHtcclxuICAgICAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIE1ldHJpY1R5cGU6ICdQZXJmb3JtYW5jZScsXHJcbiAgICAgICAgT3BlcmF0aW9uOiBsb2dFbnRyeS5tZXRhZGF0YS5vcGVyYXRpb24sXHJcbiAgICAgICAgRHVyYXRpb246IGxvZ0VudHJ5Lm1ldGFkYXRhLmR1cmF0aW9uLFxyXG4gICAgICAgIFVuaXQ6ICdNaWxsaXNlY29uZHMnLFxyXG4gICAgICAgIFRpbWVzdGFtcDogbG9nRW50cnkuY29udGV4dC50aW1lc3RhbXAsXHJcbiAgICAgICAgQ29ycmVsYXRpb25JZDogbG9nRW50cnkuY29udGV4dC5jb3JyZWxhdGlvbklkLFxyXG4gICAgICB9KSk7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogTGFtYmRhIG1pZGRsZXdhcmUgZm9yIGF1dG9tYXRpYyBjb3JyZWxhdGlvbiBJRCBoYW5kbGluZ1xyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHdpdGhDb3JyZWxhdGlvbklkKGhhbmRsZXI6IGFueSkge1xyXG4gIHJldHVybiBhc3luYyAoZXZlbnQ6IGFueSwgY29udGV4dDogYW55KSA9PiB7XHJcbiAgICAvLyBFeHRyYWN0IGNvcnJlbGF0aW9uIElEIGZyb20gaGVhZGVycyBvciBnZW5lcmF0ZSBuZXcgb25lXHJcbiAgICBjb25zdCBjb3JyZWxhdGlvbklkID0gZXZlbnQuaGVhZGVycz8uWyd4LWNvcnJlbGF0aW9uLWlkJ10gfHwgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICBldmVudC5oZWFkZXJzPy5bJ1gtQ29ycmVsYXRpb24tSUQnXSB8fCBcclxuICAgICAgICAgICAgICAgICAgICAgICAgIHV1aWR2NCgpO1xyXG5cclxuICAgIC8vIEV4dHJhY3QgdXNlciBJRCBmcm9tIEpXVCB0b2tlbiBpZiBhdmFpbGFibGVcclxuICAgIGNvbnN0IHVzZXJJZCA9IGV2ZW50LnJlcXVlc3RDb250ZXh0Py5hdXRob3JpemVyPy51c2VySWQ7XHJcbiAgICBjb25zdCByZXF1ZXN0SWQgPSBjb250ZXh0LmF3c1JlcXVlc3RJZDtcclxuXHJcbiAgICAvLyBDcmVhdGUgbG9nZ2VyIHdpdGggY29udGV4dFxyXG4gICAgY29uc3QgbG9nZ2VyID0gbmV3IENlbnRyYWxpemVkTG9nZ2VyKHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgdXNlcklkLFxyXG4gICAgICByZXF1ZXN0SWQsXHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogY29udGV4dC5mdW5jdGlvbk5hbWUsXHJcbiAgICAgIGVudmlyb25tZW50OiBwcm9jZXNzLmVudi5FTlZJUk9OTUVOVCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBjb3JyZWxhdGlvbiBJRCB0byByZXNwb25zZSBoZWFkZXJzXHJcbiAgICBjb25zdCBvcmlnaW5hbEhhbmRsZXIgPSBoYW5kbGVyO1xyXG4gICAgY29uc3Qgd3JhcHBlZEhhbmRsZXIgPSBhc3luYyAoZXZlbnQ6IGFueSwgY29udGV4dDogYW55KSA9PiB7XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgbG9nZ2VyLmluZm8oJ0xhbWJkYSBmdW5jdGlvbiBpbnZva2VkJywge1xyXG4gICAgICAgICAgZnVuY3Rpb25OYW1lOiBjb250ZXh0LmZ1bmN0aW9uTmFtZSxcclxuICAgICAgICAgIHJlcXVlc3RJZDogY29udGV4dC5hd3NSZXF1ZXN0SWQsXHJcbiAgICAgICAgICByZW1haW5pbmdUaW1lSW5NaWxsaXM6IGNvbnRleHQuZ2V0UmVtYWluaW5nVGltZUluTWlsbGlzKCksXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XHJcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgb3JpZ2luYWxIYW5kbGVyKGV2ZW50LCBjb250ZXh0KTtcclxuICAgICAgICBjb25zdCBkdXJhdGlvbiA9IERhdGUubm93KCkgLSBzdGFydFRpbWU7XHJcblxyXG4gICAgICAgIGxvZ2dlci5sb2dQZXJmb3JtYW5jZU1ldHJpYygnbGFtYmRhX2V4ZWN1dGlvbicsIGR1cmF0aW9uLCB7XHJcbiAgICAgICAgICBmdW5jdGlvbk5hbWU6IGNvbnRleHQuZnVuY3Rpb25OYW1lLFxyXG4gICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgbG9nZ2VyLmluZm8oJ0xhbWJkYSBmdW5jdGlvbiBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5Jywge1xyXG4gICAgICAgICAgZHVyYXRpb24sXHJcbiAgICAgICAgICBzdGF0dXNDb2RlOiByZXN1bHQ/LnN0YXR1c0NvZGUsXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIEFkZCBjb3JyZWxhdGlvbiBJRCB0byByZXNwb25zZSBoZWFkZXJzXHJcbiAgICAgICAgaWYgKHJlc3VsdCAmJiB0eXBlb2YgcmVzdWx0ID09PSAnb2JqZWN0JyAmJiByZXN1bHQuaGVhZGVycykge1xyXG4gICAgICAgICAgcmVzdWx0LmhlYWRlcnNbJ1gtQ29ycmVsYXRpb24tSUQnXSA9IGNvcnJlbGF0aW9uSWQ7XHJcbiAgICAgICAgfSBlbHNlIGlmIChyZXN1bHQgJiYgdHlwZW9mIHJlc3VsdCA9PT0gJ29iamVjdCcpIHtcclxuICAgICAgICAgIHJlc3VsdC5oZWFkZXJzID0ge1xyXG4gICAgICAgICAgICAuLi5yZXN1bHQuaGVhZGVycyxcclxuICAgICAgICAgICAgJ1gtQ29ycmVsYXRpb24tSUQnOiBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgICAgfTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgY29uc3QgZHVyYXRpb24gPSBEYXRlLm5vdygpIC0gRGF0ZS5ub3coKTtcclxuICAgICAgICBcclxuICAgICAgICBsb2dnZXIubG9nUGVyZm9ybWFuY2VNZXRyaWMoJ2xhbWJkYV9leGVjdXRpb24nLCBkdXJhdGlvbiwge1xyXG4gICAgICAgICAgZnVuY3Rpb25OYW1lOiBjb250ZXh0LmZ1bmN0aW9uTmFtZSxcclxuICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBsb2dnZXIuZXJyb3IoJ0xhbWJkYSBmdW5jdGlvbiBmYWlsZWQnLCBlcnJvciBhcyBFcnJvciwge1xyXG4gICAgICAgICAgZnVuY3Rpb25OYW1lOiBjb250ZXh0LmZ1bmN0aW9uTmFtZSxcclxuICAgICAgICAgIHJlcXVlc3RJZDogY29udGV4dC5hd3NSZXF1ZXN0SWQsXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRocm93IGVycm9yO1xyXG4gICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIHJldHVybiB3cmFwcGVkSGFuZGxlcihldmVudCwgY29udGV4dCk7XHJcbiAgfTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEV4cHJlc3MgbWlkZGxld2FyZSBmb3IgY29ycmVsYXRpb24gSUQgaGFuZGxpbmdcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBleHByZXNzQ29ycmVsYXRpb25NaWRkbGV3YXJlKHJlcTogYW55LCByZXM6IGFueSwgbmV4dDogYW55KSB7XHJcbiAgY29uc3QgY29ycmVsYXRpb25JZCA9IHJlcS5oZWFkZXJzWyd4LWNvcnJlbGF0aW9uLWlkJ10gfHwgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgcmVxLmhlYWRlcnNbJ1gtQ29ycmVsYXRpb24tSUQnXSB8fCBcclxuICAgICAgICAgICAgICAgICAgICAgICB1dWlkdjQoKTtcclxuXHJcbiAgLy8gU2V0IGNvcnJlbGF0aW9uIElEIGluIHJlc3BvbnNlIGhlYWRlcnNcclxuICByZXMuc2V0SGVhZGVyKCdYLUNvcnJlbGF0aW9uLUlEJywgY29ycmVsYXRpb25JZCk7XHJcblxyXG4gIC8vIENyZWF0ZSBsb2dnZXIgYW5kIGF0dGFjaCB0byByZXF1ZXN0XHJcbiAgcmVxLmxvZ2dlciA9IG5ldyBDZW50cmFsaXplZExvZ2dlcih7XHJcbiAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgdXNlcklkOiByZXEudXNlcj8uaWQsXHJcbiAgICByZXF1ZXN0SWQ6IHJlcS5pZCB8fCB1dWlkdjQoKSxcclxuICB9KTtcclxuXHJcbiAgcmVxLmxvZ2dlci5pbmZvKCdIVFRQIHJlcXVlc3QgcmVjZWl2ZWQnLCB7XHJcbiAgICBtZXRob2Q6IHJlcS5tZXRob2QsXHJcbiAgICB1cmw6IHJlcS51cmwsXHJcbiAgICB1c2VyQWdlbnQ6IHJlcS5oZWFkZXJzWyd1c2VyLWFnZW50J10sXHJcbiAgICBpcDogcmVxLmlwLFxyXG4gIH0pO1xyXG5cclxuICBuZXh0KCk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBVdGlsaXR5IGZ1bmN0aW9ucyBmb3IgY29tbW9uIGxvZ2dpbmcgcGF0dGVybnNcclxuICovXHJcbmV4cG9ydCBjbGFzcyBMb2dnaW5nVXRpbHMge1xyXG4gIC8qKlxyXG4gICAqIExvZyBBUEkgcmVxdWVzdCBzdGFydFxyXG4gICAqL1xyXG4gIHN0YXRpYyBsb2dBcGlSZXF1ZXN0U3RhcnQobG9nZ2VyOiBDZW50cmFsaXplZExvZ2dlciwgbWV0aG9kOiBzdHJpbmcsIHBhdGg6IHN0cmluZywgdXNlcklkPzogc3RyaW5nKTogdm9pZCB7XHJcbiAgICBsb2dnZXIubG9nVXNlckpvdXJuZXkoJ2FwaV9yZXF1ZXN0X3N0YXJ0JywgJ3N0YXJ0ZWQnLCB7XHJcbiAgICAgIG1ldGhvZCxcclxuICAgICAgcGF0aCxcclxuICAgICAgdXNlcklkLFxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBMb2cgQVBJIHJlcXVlc3QgY29tcGxldGlvblxyXG4gICAqL1xyXG4gIHN0YXRpYyBsb2dBcGlSZXF1ZXN0Q29tcGxldGUobG9nZ2VyOiBDZW50cmFsaXplZExvZ2dlciwgbWV0aG9kOiBzdHJpbmcsIHBhdGg6IHN0cmluZywgc3RhdHVzQ29kZTogbnVtYmVyLCBkdXJhdGlvbjogbnVtYmVyKTogdm9pZCB7XHJcbiAgICBsb2dnZXIubG9nVXNlckpvdXJuZXkoJ2FwaV9yZXF1ZXN0X2NvbXBsZXRlJywgJ2NvbXBsZXRlZCcsIHtcclxuICAgICAgbWV0aG9kLFxyXG4gICAgICBwYXRoLFxyXG4gICAgICBzdGF0dXNDb2RlLFxyXG4gICAgICBkdXJhdGlvbixcclxuICAgIH0pO1xyXG5cclxuICAgIGxvZ2dlci5sb2dQZXJmb3JtYW5jZU1ldHJpYygnYXBpX3JlcXVlc3QnLCBkdXJhdGlvbiwge1xyXG4gICAgICBtZXRob2QsXHJcbiAgICAgIHBhdGgsXHJcbiAgICAgIHN0YXR1c0NvZGUsXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIExvZyBhdXRoZW50aWNhdGlvbiBldmVudHNcclxuICAgKi9cclxuICBzdGF0aWMgbG9nQXV0aEV2ZW50KGxvZ2dlcjogQ2VudHJhbGl6ZWRMb2dnZXIsIGV2ZW50OiBzdHJpbmcsIHVzZXJJZD86IHN0cmluZywgc3VjY2VzczogYm9vbGVhbiA9IHRydWUpOiB2b2lkIHtcclxuICAgIGlmIChzdWNjZXNzKSB7XHJcbiAgICAgIGxvZ2dlci5pbmZvKGBBdXRoZW50aWNhdGlvbiBldmVudDogJHtldmVudH1gLCB7XHJcbiAgICAgICAgZXZlbnRUeXBlOiAnYXV0aGVudGljYXRpb24nLFxyXG4gICAgICAgIGV2ZW50LFxyXG4gICAgICAgIHVzZXJJZCxcclxuICAgICAgICBzdWNjZXNzLFxyXG4gICAgICB9KTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGxvZ2dlci5sb2dTZWN1cml0eUV2ZW50KGBBdXRoZW50aWNhdGlvbiBmYWlsZWQ6ICR7ZXZlbnR9YCwgJ01FRElVTScsIHtcclxuICAgICAgICBldmVudCxcclxuICAgICAgICB1c2VySWQsXHJcbiAgICAgICAgc3VjY2VzcyxcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBMb2cgZmlsZSBvcGVyYXRpb25zXHJcbiAgICovXHJcbiAgc3RhdGljIGxvZ0ZpbGVPcGVyYXRpb24obG9nZ2VyOiBDZW50cmFsaXplZExvZ2dlciwgb3BlcmF0aW9uOiBzdHJpbmcsIGZpbGVJZDogc3RyaW5nLCBmaWxlTmFtZT86IHN0cmluZywgZmlsZVNpemU/OiBudW1iZXIpOiB2b2lkIHtcclxuICAgIGxvZ2dlci5sb2dBbmFseXNpc0V2ZW50KGBGaWxlICR7b3BlcmF0aW9ufWAsIGZpbGVJZCwgdW5kZWZpbmVkLCB7XHJcbiAgICAgIG9wZXJhdGlvbixcclxuICAgICAgZmlsZU5hbWUsXHJcbiAgICAgIGZpbGVTaXplLFxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBMb2cgYW5hbHlzaXMgb3BlcmF0aW9uc1xyXG4gICAqL1xyXG4gIHN0YXRpYyBsb2dBbmFseXNpc09wZXJhdGlvbihsb2dnZXI6IENlbnRyYWxpemVkTG9nZ2VyLCBvcGVyYXRpb246IHN0cmluZywgYW5hbHlzaXNJZDogc3RyaW5nLCBmaWxlSWQ/OiBzdHJpbmcsIGR1cmF0aW9uPzogbnVtYmVyKTogdm9pZCB7XHJcbiAgICBsb2dnZXIubG9nQW5hbHlzaXNFdmVudChgQW5hbHlzaXMgJHtvcGVyYXRpb259YCwgZmlsZUlkLCBhbmFseXNpc0lkLCB7XHJcbiAgICAgIG9wZXJhdGlvbixcclxuICAgICAgZHVyYXRpb24sXHJcbiAgICB9KTtcclxuXHJcbiAgICBpZiAoZHVyYXRpb24pIHtcclxuICAgICAgbG9nZ2VyLmxvZ1BlcmZvcm1hbmNlTWV0cmljKCdhbmFseXNpc19vcGVyYXRpb24nLCBkdXJhdGlvbiwge1xyXG4gICAgICAgIG9wZXJhdGlvbixcclxuICAgICAgICBhbmFseXNpc0lkLFxyXG4gICAgICAgIGZpbGVJZCxcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBMb2cgYnVzaW5lc3MgbWV0cmljc1xyXG4gICAqL1xyXG4gIHN0YXRpYyBsb2dDb21wbGlhbmNlU2NvcmUobG9nZ2VyOiBDZW50cmFsaXplZExvZ2dlciwgc2NvcmU6IG51bWJlciwgYW5hbHlzaXNJZDogc3RyaW5nLCB2aW9sYXRpb25Db3VudDogbnVtYmVyKTogdm9pZCB7XHJcbiAgICBsb2dnZXIubG9nQnVzaW5lc3NNZXRyaWMoJ2NvbXBsaWFuY2Vfc2NvcmUnLCBzY29yZSwgJ1BlcmNlbnQnLCB7XHJcbiAgICAgIGFuYWx5c2lzSWQsXHJcbiAgICAgIHZpb2xhdGlvbkNvdW50LFxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBMb2cgZXJyb3Igd2l0aCBjb250ZXh0XHJcbiAgICovXHJcbiAgc3RhdGljIGxvZ0Vycm9yV2l0aENvbnRleHQobG9nZ2VyOiBDZW50cmFsaXplZExvZ2dlciwgZXJyb3I6IEVycm9yLCBvcGVyYXRpb246IHN0cmluZywgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIGFueT4pOiB2b2lkIHtcclxuICAgIGxvZ2dlci5lcnJvcihgRXJyb3IgaW4gJHtvcGVyYXRpb259YCwgZXJyb3IsIHtcclxuICAgICAgb3BlcmF0aW9uLFxyXG4gICAgICBlcnJvck5hbWU6IGVycm9yLm5hbWUsXHJcbiAgICAgIC4uLmNvbnRleHQsXHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuXHJcbi8vIEV4cG9ydCBzaW5nbGV0b24gaW5zdGFuY2UgZm9yIGNvbnZlbmllbmNlXHJcbmV4cG9ydCBjb25zdCBsb2dnZXIgPSBDZW50cmFsaXplZExvZ2dlci5nZXRJbnN0YW5jZSgpOyJdfQ==