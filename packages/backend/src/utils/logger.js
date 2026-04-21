"use strict";
/**
 * Enhanced Structured Logger Utility
 * Provides consistent logging across all Lambda functions with CloudWatch Insights support
 * Enhanced for production deployment with correlation IDs, performance timing, and custom metrics
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = exports.LogLevel = void 0;
exports.createLogger = createLogger;
exports.generateCorrelationId = generateCorrelationId;
exports.extractCorrelationId = extractCorrelationId;
exports.createLoggerWithCorrelation = createLoggerWithCorrelation;
exports.recordCustomMetric = recordCustomMetric;
var LogLevel;
(function (LogLevel) {
    LogLevel["DEBUG"] = "DEBUG";
    LogLevel["INFO"] = "INFO";
    LogLevel["WARN"] = "WARN";
    LogLevel["ERROR"] = "ERROR";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class Logger {
    context;
    defaultMetadata;
    correlationId;
    performanceTimers = new Map();
    constructor(context, defaultMetadata = {}) {
        this.context = context;
        this.defaultMetadata = {
            functionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
            functionVersion: process.env.AWS_LAMBDA_FUNCTION_VERSION,
            environment: process.env.ENVIRONMENT || 'unknown',
            ...defaultMetadata,
        };
        this.correlationId = defaultMetadata.correlationId;
    }
    /**
     * Set correlation ID for request tracing
     */
    setCorrelationId(correlationId) {
        this.correlationId = correlationId;
    }
    /**
     * Get current correlation ID
     */
    getCorrelationId() {
        return this.correlationId;
    }
    /**
     * Log a message with the specified level
     */
    log(level, message, meta) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            context: this.context,
            message,
            requestId: process.env.AWS_REQUEST_ID,
            correlationId: this.correlationId,
            functionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
            functionVersion: process.env.AWS_LAMBDA_FUNCTION_VERSION,
            environment: process.env.ENVIRONMENT,
            ...this.defaultMetadata,
            ...meta,
        };
        // Output as JSON for CloudWatch Insights
        console.log(JSON.stringify(logEntry));
    }
    /**
     * Log debug message (verbose information for development)
     */
    debug(message, meta) {
        if (process.env.LOG_LEVEL === 'DEBUG') {
            this.log(LogLevel.DEBUG, message, meta);
        }
    }
    /**
     * Log info message (general information about application flow)
     */
    info(message, meta) {
        this.log(LogLevel.INFO, message, meta);
    }
    /**
     * Log warning message (potentially harmful situations)
     */
    warn(message, meta) {
        this.log(LogLevel.WARN, message, meta);
    }
    /**
     * Log error message (error events that might still allow the application to continue)
     */
    error(message, error, meta) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: LogLevel.ERROR,
            context: this.context,
            message,
            requestId: process.env.AWS_REQUEST_ID,
            correlationId: this.correlationId,
            functionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
            functionVersion: process.env.AWS_LAMBDA_FUNCTION_VERSION,
            environment: process.env.ENVIRONMENT,
            ...this.defaultMetadata,
            ...meta,
            error: error
                ? {
                    message: error.message,
                    stack: error.stack,
                    name: error.name,
                    code: error.code,
                }
                : undefined,
        };
        console.error(JSON.stringify(logEntry));
    }
    /**
     * Create a child logger with additional context
     */
    child(additionalContext, additionalMetadata = {}) {
        return new Logger(`${this.context}.${additionalContext}`, {
            ...this.defaultMetadata,
            ...additionalMetadata,
            correlationId: this.correlationId,
        });
    }
    /**
     * Start a performance timer
     */
    startTimer(label) {
        this.performanceTimers.set(label, Date.now());
        this.debug(`Timer started: ${label}`);
    }
    /**
     * End a performance timer and log the duration
     */
    endTimer(label, meta) {
        const startTime = this.performanceTimers.get(label);
        if (!startTime) {
            this.warn(`Timer not found: ${label}`);
            return 0;
        }
        const endTime = Date.now();
        const duration = endTime - startTime;
        this.performanceTimers.delete(label);
        this.info(`Timer completed: ${label}`, {
            ...meta,
            performance: {
                startTime,
                endTime,
                duration,
                memoryUsed: process.memoryUsage().heapUsed,
            },
        });
        return duration;
    }
    /**
     * Log execution timing (legacy method for backward compatibility)
     */
    time(label) {
        const start = Date.now();
        return () => {
            const duration = Date.now() - start;
            this.info(`${label} completed`, {
                duration,
                performance: {
                    startTime: start,
                    endTime: Date.now(),
                    duration,
                    memoryUsed: process.memoryUsage().heapUsed,
                },
            });
        };
    }
    /**
     * Log security events
     */
    security(message, meta) {
        this.log(LogLevel.WARN, `[SECURITY] ${message}`, {
            ...meta,
            securityEvent: true,
        });
    }
    /**
     * Log business metrics
     */
    metric(metricName, value, unit = 'Count', meta) {
        this.info(`[METRIC] ${metricName}`, {
            ...meta,
            metric: {
                name: metricName,
                value,
                unit,
                timestamp: new Date().toISOString(),
            },
        });
    }
    /**
     * Log API request/response
     */
    apiCall(method, path, statusCode, duration, meta) {
        this.info(`[API] ${method} ${path} - ${statusCode}`, {
            ...meta,
            api: {
                method,
                path,
                statusCode,
                duration,
                success: statusCode >= 200 && statusCode < 400,
            },
        });
    }
}
exports.Logger = Logger;
/**
 * Create a logger instance for a specific context
 */
function createLogger(context, metadata) {
    return new Logger(context, metadata);
}
/**
 * Generate a correlation ID for request tracing
 */
function generateCorrelationId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
/**
 * Extract correlation ID from API Gateway event headers
 */
function extractCorrelationId(event) {
    // Try to get from headers (case insensitive)
    const headers = event.headers || {};
    const correlationId = headers['X-Correlation-ID'] ||
        headers['x-correlation-id'] ||
        headers['X-CORRELATION-ID'] ||
        headers['correlation-id'] ||
        generateCorrelationId();
    return correlationId;
}
/**
 * Create a logger with correlation ID from API Gateway event
 */
function createLoggerWithCorrelation(context, event, metadata) {
    const correlationId = extractCorrelationId(event);
    return new Logger(context, {
        ...metadata,
        correlationId,
    });
}
/**
 * Utility function to record custom CloudWatch metrics
 */
async function recordCustomMetric(namespace, metricName, value, unit = 'Count', dimensions) {
    try {
        // In a real implementation, this would use AWS SDK CloudWatch
        // For now, we'll log it in a structured way that can be picked up by CloudWatch Insights
        const logger = createLogger('metrics');
        logger.metric(metricName, value, unit, {
            namespace,
            dimensions,
            cloudwatchMetric: true,
        });
    }
    catch (error) {
        console.error('Failed to record custom metric:', error);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibG9nZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7OztHQUlHOzs7QUFrUUgsb0NBRUM7QUFLRCxzREFFQztBQUtELG9EQVdDO0FBS0Qsa0VBTUM7QUFLRCxnREFtQkM7QUE1VEQsSUFBWSxRQUtYO0FBTEQsV0FBWSxRQUFRO0lBQ2xCLDJCQUFlLENBQUE7SUFDZix5QkFBYSxDQUFBO0lBQ2IseUJBQWEsQ0FBQTtJQUNiLDJCQUFlLENBQUE7QUFDakIsQ0FBQyxFQUxXLFFBQVEsd0JBQVIsUUFBUSxRQUtuQjtBQWlDRCxNQUFhLE1BQU07SUFDVCxPQUFPLENBQVM7SUFDaEIsZUFBZSxDQUFjO0lBQzdCLGFBQWEsQ0FBVTtJQUN2QixpQkFBaUIsR0FBd0IsSUFBSSxHQUFHLEVBQUUsQ0FBQztJQUUzRCxZQUFZLE9BQWUsRUFBRSxrQkFBK0IsRUFBRTtRQUM1RCxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztRQUN2QixJQUFJLENBQUMsZUFBZSxHQUFHO1lBQ3JCLFlBQVksRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLHdCQUF3QjtZQUNsRCxlQUFlLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQywyQkFBMkI7WUFDeEQsV0FBVyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxJQUFJLFNBQVM7WUFDakQsR0FBRyxlQUFlO1NBQ25CLENBQUM7UUFDRixJQUFJLENBQUMsYUFBYSxHQUFHLGVBQWUsQ0FBQyxhQUFhLENBQUM7SUFDckQsQ0FBQztJQUVEOztPQUVHO0lBQ0gsZ0JBQWdCLENBQUMsYUFBcUI7UUFDcEMsSUFBSSxDQUFDLGFBQWEsR0FBRyxhQUFhLENBQUM7SUFDckMsQ0FBQztJQUVEOztPQUVHO0lBQ0gsZ0JBQWdCO1FBQ2QsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDO0lBQzVCLENBQUM7SUFFRDs7T0FFRztJQUNLLEdBQUcsQ0FBQyxLQUFlLEVBQUUsT0FBZSxFQUFFLElBQWtCO1FBQzlELE1BQU0sUUFBUSxHQUFhO1lBQ3pCLFNBQVMsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTtZQUNuQyxLQUFLO1lBQ0wsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPO1lBQ3JCLE9BQU87WUFDUCxTQUFTLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjO1lBQ3JDLGFBQWEsRUFBRSxJQUFJLENBQUMsYUFBYTtZQUNqQyxZQUFZLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0I7WUFDbEQsZUFBZSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsMkJBQTJCO1lBQ3hELFdBQVcsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVc7WUFDcEMsR0FBRyxJQUFJLENBQUMsZUFBZTtZQUN2QixHQUFHLElBQUk7U0FDUixDQUFDO1FBRUYseUNBQXlDO1FBQ3pDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBQ3hDLENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxPQUFlLEVBQUUsSUFBa0I7UUFDdkMsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsS0FBSyxPQUFPLEVBQUUsQ0FBQztZQUN0QyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzFDLENBQUM7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxJQUFJLENBQUMsT0FBZSxFQUFFLElBQWtCO1FBQ3RDLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDekMsQ0FBQztJQUVEOztPQUVHO0lBQ0gsSUFBSSxDQUFDLE9BQWUsRUFBRSxJQUFrQjtRQUN0QyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3pDLENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxPQUFlLEVBQUUsS0FBYSxFQUFFLElBQWtCO1FBQ3RELE1BQU0sUUFBUSxHQUFhO1lBQ3pCLFNBQVMsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTtZQUNuQyxLQUFLLEVBQUUsUUFBUSxDQUFDLEtBQUs7WUFDckIsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPO1lBQ3JCLE9BQU87WUFDUCxTQUFTLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjO1lBQ3JDLGFBQWEsRUFBRSxJQUFJLENBQUMsYUFBYTtZQUNqQyxZQUFZLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0I7WUFDbEQsZUFBZSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsMkJBQTJCO1lBQ3hELFdBQVcsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVc7WUFDcEMsR0FBRyxJQUFJLENBQUMsZUFBZTtZQUN2QixHQUFHLElBQUk7WUFDUCxLQUFLLEVBQUUsS0FBSztnQkFDVixDQUFDLENBQUM7b0JBQ0UsT0FBTyxFQUFFLEtBQUssQ0FBQyxPQUFPO29CQUN0QixLQUFLLEVBQUUsS0FBSyxDQUFDLEtBQUs7b0JBQ2xCLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSTtvQkFDaEIsSUFBSSxFQUFHLEtBQWEsQ0FBQyxJQUFJO2lCQUMxQjtnQkFDSCxDQUFDLENBQUMsU0FBUztTQUNkLENBQUM7UUFFRixPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztJQUMxQyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsaUJBQXlCLEVBQUUscUJBQWtDLEVBQUU7UUFDbkUsT0FBTyxJQUFJLE1BQU0sQ0FDZixHQUFHLElBQUksQ0FBQyxPQUFPLElBQUksaUJBQWlCLEVBQUUsRUFDdEM7WUFDRSxHQUFHLElBQUksQ0FBQyxlQUFlO1lBQ3ZCLEdBQUcsa0JBQWtCO1lBQ3JCLGFBQWEsRUFBRSxJQUFJLENBQUMsYUFBYTtTQUNsQyxDQUNGLENBQUM7SUFDSixDQUFDO0lBRUQ7O09BRUc7SUFDSCxVQUFVLENBQUMsS0FBYTtRQUN0QixJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztRQUM5QyxJQUFJLENBQUMsS0FBSyxDQUFDLGtCQUFrQixLQUFLLEVBQUUsQ0FBQyxDQUFDO0lBQ3hDLENBQUM7SUFFRDs7T0FFRztJQUNILFFBQVEsQ0FBQyxLQUFhLEVBQUUsSUFBa0I7UUFDeEMsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNwRCxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDZixJQUFJLENBQUMsSUFBSSxDQUFDLG9CQUFvQixLQUFLLEVBQUUsQ0FBQyxDQUFDO1lBQ3ZDLE9BQU8sQ0FBQyxDQUFDO1FBQ1gsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUMzQixNQUFNLFFBQVEsR0FBRyxPQUFPLEdBQUcsU0FBUyxDQUFDO1FBQ3JDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFckMsSUFBSSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsS0FBSyxFQUFFLEVBQUU7WUFDckMsR0FBRyxJQUFJO1lBQ1AsV0FBVyxFQUFFO2dCQUNYLFNBQVM7Z0JBQ1QsT0FBTztnQkFDUCxRQUFRO2dCQUNSLFVBQVUsRUFBRSxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUMsUUFBUTthQUMzQztTQUNGLENBQUMsQ0FBQztRQUVILE9BQU8sUUFBUSxDQUFDO0lBQ2xCLENBQUM7SUFFRDs7T0FFRztJQUNILElBQUksQ0FBQyxLQUFhO1FBQ2hCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUN6QixPQUFPLEdBQUcsRUFBRTtZQUNWLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxLQUFLLENBQUM7WUFDcEMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUssWUFBWSxFQUFFO2dCQUM5QixRQUFRO2dCQUNSLFdBQVcsRUFBRTtvQkFDWCxTQUFTLEVBQUUsS0FBSztvQkFDaEIsT0FBTyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUU7b0JBQ25CLFFBQVE7b0JBQ1IsVUFBVSxFQUFFLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQyxRQUFRO2lCQUMzQzthQUNGLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRDs7T0FFRztJQUNILFFBQVEsQ0FBQyxPQUFlLEVBQUUsSUFBa0I7UUFDMUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLGNBQWMsT0FBTyxFQUFFLEVBQUU7WUFDL0MsR0FBRyxJQUFJO1lBQ1AsYUFBYSxFQUFFLElBQUk7U0FDcEIsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVEOztPQUVHO0lBQ0gsTUFBTSxDQUFDLFVBQWtCLEVBQUUsS0FBYSxFQUFFLE9BQWUsT0FBTyxFQUFFLElBQWtCO1FBQ2xGLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxVQUFVLEVBQUUsRUFBRTtZQUNsQyxHQUFHLElBQUk7WUFDUCxNQUFNLEVBQUU7Z0JBQ04sSUFBSSxFQUFFLFVBQVU7Z0JBQ2hCLEtBQUs7Z0JBQ0wsSUFBSTtnQkFDSixTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7YUFDcEM7U0FDRixDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxPQUFPLENBQUMsTUFBYyxFQUFFLElBQVksRUFBRSxVQUFrQixFQUFFLFFBQWdCLEVBQUUsSUFBa0I7UUFDNUYsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLE1BQU0sSUFBSSxJQUFJLE1BQU0sVUFBVSxFQUFFLEVBQUU7WUFDbkQsR0FBRyxJQUFJO1lBQ1AsR0FBRyxFQUFFO2dCQUNILE1BQU07Z0JBQ04sSUFBSTtnQkFDSixVQUFVO2dCQUNWLFFBQVE7Z0JBQ1IsT0FBTyxFQUFFLFVBQVUsSUFBSSxHQUFHLElBQUksVUFBVSxHQUFHLEdBQUc7YUFDL0M7U0FDRixDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUFyTkQsd0JBcU5DO0FBRUQ7O0dBRUc7QUFDSCxTQUFnQixZQUFZLENBQUMsT0FBZSxFQUFFLFFBQXNCO0lBQ2xFLE9BQU8sSUFBSSxNQUFNLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0FBQ3ZDLENBQUM7QUFFRDs7R0FFRztBQUNILFNBQWdCLHFCQUFxQjtJQUNuQyxPQUFPLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDO0FBQ3BFLENBQUM7QUFFRDs7R0FFRztBQUNILFNBQWdCLG9CQUFvQixDQUFDLEtBQVU7SUFDN0MsNkNBQTZDO0lBQzdDLE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxPQUFPLElBQUksRUFBRSxDQUFDO0lBQ3BDLE1BQU0sYUFBYSxHQUNqQixPQUFPLENBQUMsa0JBQWtCLENBQUM7UUFDM0IsT0FBTyxDQUFDLGtCQUFrQixDQUFDO1FBQzNCLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQztRQUMzQixPQUFPLENBQUMsZ0JBQWdCLENBQUM7UUFDekIscUJBQXFCLEVBQUUsQ0FBQztJQUUxQixPQUFPLGFBQWEsQ0FBQztBQUN2QixDQUFDO0FBRUQ7O0dBRUc7QUFDSCxTQUFnQiwyQkFBMkIsQ0FBQyxPQUFlLEVBQUUsS0FBVSxFQUFFLFFBQXNCO0lBQzdGLE1BQU0sYUFBYSxHQUFHLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2xELE9BQU8sSUFBSSxNQUFNLENBQUMsT0FBTyxFQUFFO1FBQ3pCLEdBQUcsUUFBUTtRQUNYLGFBQWE7S0FDZCxDQUFDLENBQUM7QUFDTCxDQUFDO0FBRUQ7O0dBRUc7QUFDSSxLQUFLLFVBQVUsa0JBQWtCLENBQ3RDLFNBQWlCLEVBQ2pCLFVBQWtCLEVBQ2xCLEtBQWEsRUFDYixPQUFlLE9BQU8sRUFDdEIsVUFBc0M7SUFFdEMsSUFBSSxDQUFDO1FBQ0gsOERBQThEO1FBQzlELHlGQUF5RjtRQUN6RixNQUFNLE1BQU0sR0FBRyxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDdkMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRTtZQUNyQyxTQUFTO1lBQ1QsVUFBVTtZQUNWLGdCQUFnQixFQUFFLElBQUk7U0FDdkIsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLGlDQUFpQyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQzFELENBQUM7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIEVuaGFuY2VkIFN0cnVjdHVyZWQgTG9nZ2VyIFV0aWxpdHlcclxuICogUHJvdmlkZXMgY29uc2lzdGVudCBsb2dnaW5nIGFjcm9zcyBhbGwgTGFtYmRhIGZ1bmN0aW9ucyB3aXRoIENsb3VkV2F0Y2ggSW5zaWdodHMgc3VwcG9ydFxyXG4gKiBFbmhhbmNlZCBmb3IgcHJvZHVjdGlvbiBkZXBsb3ltZW50IHdpdGggY29ycmVsYXRpb24gSURzLCBwZXJmb3JtYW5jZSB0aW1pbmcsIGFuZCBjdXN0b20gbWV0cmljc1xyXG4gKi9cclxuXHJcbmV4cG9ydCBlbnVtIExvZ0xldmVsIHtcclxuICBERUJVRyA9ICdERUJVRycsXHJcbiAgSU5GTyA9ICdJTkZPJyxcclxuICBXQVJOID0gJ1dBUk4nLFxyXG4gIEVSUk9SID0gJ0VSUk9SJyxcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBMb2dNZXRhZGF0YSB7XHJcbiAgW2tleTogc3RyaW5nXTogYW55O1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIExvZ0VudHJ5IHtcclxuICB0aW1lc3RhbXA6IHN0cmluZztcclxuICBsZXZlbDogTG9nTGV2ZWw7XHJcbiAgY29udGV4dDogc3RyaW5nO1xyXG4gIG1lc3NhZ2U6IHN0cmluZztcclxuICByZXF1ZXN0SWQ/OiBzdHJpbmc7XHJcbiAgY29ycmVsYXRpb25JZD86IHN0cmluZztcclxuICB1c2VySWQ/OiBzdHJpbmc7XHJcbiAgZnVuY3Rpb25OYW1lPzogc3RyaW5nO1xyXG4gIGZ1bmN0aW9uVmVyc2lvbj86IHN0cmluZztcclxuICBlbnZpcm9ubWVudD86IHN0cmluZztcclxuICBkdXJhdGlvbj86IG51bWJlcjtcclxuICBtZXRhZGF0YT86IExvZ01ldGFkYXRhO1xyXG4gIGVycm9yPzoge1xyXG4gICAgbWVzc2FnZTogc3RyaW5nO1xyXG4gICAgc3RhY2s/OiBzdHJpbmc7XHJcbiAgICBuYW1lOiBzdHJpbmc7XHJcbiAgICBjb2RlPzogc3RyaW5nO1xyXG4gIH07XHJcbiAgcGVyZm9ybWFuY2U/OiB7XHJcbiAgICBzdGFydFRpbWU/OiBudW1iZXI7XHJcbiAgICBlbmRUaW1lPzogbnVtYmVyO1xyXG4gICAgZHVyYXRpb24/OiBudW1iZXI7XHJcbiAgICBtZW1vcnlVc2VkPzogbnVtYmVyO1xyXG4gIH07XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBMb2dnZXIge1xyXG4gIHByaXZhdGUgY29udGV4dDogc3RyaW5nO1xyXG4gIHByaXZhdGUgZGVmYXVsdE1ldGFkYXRhOiBMb2dNZXRhZGF0YTtcclxuICBwcml2YXRlIGNvcnJlbGF0aW9uSWQ/OiBzdHJpbmc7XHJcbiAgcHJpdmF0ZSBwZXJmb3JtYW5jZVRpbWVyczogTWFwPHN0cmluZywgbnVtYmVyPiA9IG5ldyBNYXAoKTtcclxuXHJcbiAgY29uc3RydWN0b3IoY29udGV4dDogc3RyaW5nLCBkZWZhdWx0TWV0YWRhdGE6IExvZ01ldGFkYXRhID0ge30pIHtcclxuICAgIHRoaXMuY29udGV4dCA9IGNvbnRleHQ7XHJcbiAgICB0aGlzLmRlZmF1bHRNZXRhZGF0YSA9IHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiBwcm9jZXNzLmVudi5BV1NfTEFNQkRBX0ZVTkNUSU9OX05BTUUsXHJcbiAgICAgIGZ1bmN0aW9uVmVyc2lvbjogcHJvY2Vzcy5lbnYuQVdTX0xBTUJEQV9GVU5DVElPTl9WRVJTSU9OLFxyXG4gICAgICBlbnZpcm9ubWVudDogcHJvY2Vzcy5lbnYuRU5WSVJPTk1FTlQgfHwgJ3Vua25vd24nLFxyXG4gICAgICAuLi5kZWZhdWx0TWV0YWRhdGEsXHJcbiAgICB9O1xyXG4gICAgdGhpcy5jb3JyZWxhdGlvbklkID0gZGVmYXVsdE1ldGFkYXRhLmNvcnJlbGF0aW9uSWQ7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBTZXQgY29ycmVsYXRpb24gSUQgZm9yIHJlcXVlc3QgdHJhY2luZ1xyXG4gICAqL1xyXG4gIHNldENvcnJlbGF0aW9uSWQoY29ycmVsYXRpb25JZDogc3RyaW5nKTogdm9pZCB7XHJcbiAgICB0aGlzLmNvcnJlbGF0aW9uSWQgPSBjb3JyZWxhdGlvbklkO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IGN1cnJlbnQgY29ycmVsYXRpb24gSURcclxuICAgKi9cclxuICBnZXRDb3JyZWxhdGlvbklkKCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XHJcbiAgICByZXR1cm4gdGhpcy5jb3JyZWxhdGlvbklkO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogTG9nIGEgbWVzc2FnZSB3aXRoIHRoZSBzcGVjaWZpZWQgbGV2ZWxcclxuICAgKi9cclxuICBwcml2YXRlIGxvZyhsZXZlbDogTG9nTGV2ZWwsIG1lc3NhZ2U6IHN0cmluZywgbWV0YT86IExvZ01ldGFkYXRhKTogdm9pZCB7XHJcbiAgICBjb25zdCBsb2dFbnRyeTogTG9nRW50cnkgPSB7XHJcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICBsZXZlbCxcclxuICAgICAgY29udGV4dDogdGhpcy5jb250ZXh0LFxyXG4gICAgICBtZXNzYWdlLFxyXG4gICAgICByZXF1ZXN0SWQ6IHByb2Nlc3MuZW52LkFXU19SRVFVRVNUX0lELFxyXG4gICAgICBjb3JyZWxhdGlvbklkOiB0aGlzLmNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogcHJvY2Vzcy5lbnYuQVdTX0xBTUJEQV9GVU5DVElPTl9OQU1FLFxyXG4gICAgICBmdW5jdGlvblZlcnNpb246IHByb2Nlc3MuZW52LkFXU19MQU1CREFfRlVOQ1RJT05fVkVSU0lPTixcclxuICAgICAgZW52aXJvbm1lbnQ6IHByb2Nlc3MuZW52LkVOVklST05NRU5ULFxyXG4gICAgICAuLi50aGlzLmRlZmF1bHRNZXRhZGF0YSxcclxuICAgICAgLi4ubWV0YSxcclxuICAgIH07XHJcblxyXG4gICAgLy8gT3V0cHV0IGFzIEpTT04gZm9yIENsb3VkV2F0Y2ggSW5zaWdodHNcclxuICAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGxvZ0VudHJ5KSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBMb2cgZGVidWcgbWVzc2FnZSAodmVyYm9zZSBpbmZvcm1hdGlvbiBmb3IgZGV2ZWxvcG1lbnQpXHJcbiAgICovXHJcbiAgZGVidWcobWVzc2FnZTogc3RyaW5nLCBtZXRhPzogTG9nTWV0YWRhdGEpOiB2b2lkIHtcclxuICAgIGlmIChwcm9jZXNzLmVudi5MT0dfTEVWRUwgPT09ICdERUJVRycpIHtcclxuICAgICAgdGhpcy5sb2coTG9nTGV2ZWwuREVCVUcsIG1lc3NhZ2UsIG1ldGEpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogTG9nIGluZm8gbWVzc2FnZSAoZ2VuZXJhbCBpbmZvcm1hdGlvbiBhYm91dCBhcHBsaWNhdGlvbiBmbG93KVxyXG4gICAqL1xyXG4gIGluZm8obWVzc2FnZTogc3RyaW5nLCBtZXRhPzogTG9nTWV0YWRhdGEpOiB2b2lkIHtcclxuICAgIHRoaXMubG9nKExvZ0xldmVsLklORk8sIG1lc3NhZ2UsIG1ldGEpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogTG9nIHdhcm5pbmcgbWVzc2FnZSAocG90ZW50aWFsbHkgaGFybWZ1bCBzaXR1YXRpb25zKVxyXG4gICAqL1xyXG4gIHdhcm4obWVzc2FnZTogc3RyaW5nLCBtZXRhPzogTG9nTWV0YWRhdGEpOiB2b2lkIHtcclxuICAgIHRoaXMubG9nKExvZ0xldmVsLldBUk4sIG1lc3NhZ2UsIG1ldGEpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogTG9nIGVycm9yIG1lc3NhZ2UgKGVycm9yIGV2ZW50cyB0aGF0IG1pZ2h0IHN0aWxsIGFsbG93IHRoZSBhcHBsaWNhdGlvbiB0byBjb250aW51ZSlcclxuICAgKi9cclxuICBlcnJvcihtZXNzYWdlOiBzdHJpbmcsIGVycm9yPzogRXJyb3IsIG1ldGE/OiBMb2dNZXRhZGF0YSk6IHZvaWQge1xyXG4gICAgY29uc3QgbG9nRW50cnk6IExvZ0VudHJ5ID0ge1xyXG4gICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgbGV2ZWw6IExvZ0xldmVsLkVSUk9SLFxyXG4gICAgICBjb250ZXh0OiB0aGlzLmNvbnRleHQsXHJcbiAgICAgIG1lc3NhZ2UsXHJcbiAgICAgIHJlcXVlc3RJZDogcHJvY2Vzcy5lbnYuQVdTX1JFUVVFU1RfSUQsXHJcbiAgICAgIGNvcnJlbGF0aW9uSWQ6IHRoaXMuY29ycmVsYXRpb25JZCxcclxuICAgICAgZnVuY3Rpb25OYW1lOiBwcm9jZXNzLmVudi5BV1NfTEFNQkRBX0ZVTkNUSU9OX05BTUUsXHJcbiAgICAgIGZ1bmN0aW9uVmVyc2lvbjogcHJvY2Vzcy5lbnYuQVdTX0xBTUJEQV9GVU5DVElPTl9WRVJTSU9OLFxyXG4gICAgICBlbnZpcm9ubWVudDogcHJvY2Vzcy5lbnYuRU5WSVJPTk1FTlQsXHJcbiAgICAgIC4uLnRoaXMuZGVmYXVsdE1ldGFkYXRhLFxyXG4gICAgICAuLi5tZXRhLFxyXG4gICAgICBlcnJvcjogZXJyb3JcclxuICAgICAgICA/IHtcclxuICAgICAgICAgICAgbWVzc2FnZTogZXJyb3IubWVzc2FnZSxcclxuICAgICAgICAgICAgc3RhY2s6IGVycm9yLnN0YWNrLFxyXG4gICAgICAgICAgICBuYW1lOiBlcnJvci5uYW1lLFxyXG4gICAgICAgICAgICBjb2RlOiAoZXJyb3IgYXMgYW55KS5jb2RlLFxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIDogdW5kZWZpbmVkLFxyXG4gICAgfTtcclxuXHJcbiAgICBjb25zb2xlLmVycm9yKEpTT04uc3RyaW5naWZ5KGxvZ0VudHJ5KSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDcmVhdGUgYSBjaGlsZCBsb2dnZXIgd2l0aCBhZGRpdGlvbmFsIGNvbnRleHRcclxuICAgKi9cclxuICBjaGlsZChhZGRpdGlvbmFsQ29udGV4dDogc3RyaW5nLCBhZGRpdGlvbmFsTWV0YWRhdGE6IExvZ01ldGFkYXRhID0ge30pOiBMb2dnZXIge1xyXG4gICAgcmV0dXJuIG5ldyBMb2dnZXIoXHJcbiAgICAgIGAke3RoaXMuY29udGV4dH0uJHthZGRpdGlvbmFsQ29udGV4dH1gLFxyXG4gICAgICB7IFxyXG4gICAgICAgIC4uLnRoaXMuZGVmYXVsdE1ldGFkYXRhLCBcclxuICAgICAgICAuLi5hZGRpdGlvbmFsTWV0YWRhdGEsXHJcbiAgICAgICAgY29ycmVsYXRpb25JZDogdGhpcy5jb3JyZWxhdGlvbklkLFxyXG4gICAgICB9XHJcbiAgICApO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogU3RhcnQgYSBwZXJmb3JtYW5jZSB0aW1lclxyXG4gICAqL1xyXG4gIHN0YXJ0VGltZXIobGFiZWw6IHN0cmluZyk6IHZvaWQge1xyXG4gICAgdGhpcy5wZXJmb3JtYW5jZVRpbWVycy5zZXQobGFiZWwsIERhdGUubm93KCkpO1xyXG4gICAgdGhpcy5kZWJ1ZyhgVGltZXIgc3RhcnRlZDogJHtsYWJlbH1gKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEVuZCBhIHBlcmZvcm1hbmNlIHRpbWVyIGFuZCBsb2cgdGhlIGR1cmF0aW9uXHJcbiAgICovXHJcbiAgZW5kVGltZXIobGFiZWw6IHN0cmluZywgbWV0YT86IExvZ01ldGFkYXRhKTogbnVtYmVyIHtcclxuICAgIGNvbnN0IHN0YXJ0VGltZSA9IHRoaXMucGVyZm9ybWFuY2VUaW1lcnMuZ2V0KGxhYmVsKTtcclxuICAgIGlmICghc3RhcnRUaW1lKSB7XHJcbiAgICAgIHRoaXMud2FybihgVGltZXIgbm90IGZvdW5kOiAke2xhYmVsfWApO1xyXG4gICAgICByZXR1cm4gMDtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBlbmRUaW1lID0gRGF0ZS5ub3coKTtcclxuICAgIGNvbnN0IGR1cmF0aW9uID0gZW5kVGltZSAtIHN0YXJ0VGltZTtcclxuICAgIHRoaXMucGVyZm9ybWFuY2VUaW1lcnMuZGVsZXRlKGxhYmVsKTtcclxuXHJcbiAgICB0aGlzLmluZm8oYFRpbWVyIGNvbXBsZXRlZDogJHtsYWJlbH1gLCB7XHJcbiAgICAgIC4uLm1ldGEsXHJcbiAgICAgIHBlcmZvcm1hbmNlOiB7XHJcbiAgICAgICAgc3RhcnRUaW1lLFxyXG4gICAgICAgIGVuZFRpbWUsXHJcbiAgICAgICAgZHVyYXRpb24sXHJcbiAgICAgICAgbWVtb3J5VXNlZDogcHJvY2Vzcy5tZW1vcnlVc2FnZSgpLmhlYXBVc2VkLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIGR1cmF0aW9uO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogTG9nIGV4ZWN1dGlvbiB0aW1pbmcgKGxlZ2FjeSBtZXRob2QgZm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHkpXHJcbiAgICovXHJcbiAgdGltZShsYWJlbDogc3RyaW5nKTogKCkgPT4gdm9pZCB7XHJcbiAgICBjb25zdCBzdGFydCA9IERhdGUubm93KCk7XHJcbiAgICByZXR1cm4gKCkgPT4ge1xyXG4gICAgICBjb25zdCBkdXJhdGlvbiA9IERhdGUubm93KCkgLSBzdGFydDtcclxuICAgICAgdGhpcy5pbmZvKGAke2xhYmVsfSBjb21wbGV0ZWRgLCB7IFxyXG4gICAgICAgIGR1cmF0aW9uLFxyXG4gICAgICAgIHBlcmZvcm1hbmNlOiB7XHJcbiAgICAgICAgICBzdGFydFRpbWU6IHN0YXJ0LFxyXG4gICAgICAgICAgZW5kVGltZTogRGF0ZS5ub3coKSxcclxuICAgICAgICAgIGR1cmF0aW9uLFxyXG4gICAgICAgICAgbWVtb3J5VXNlZDogcHJvY2Vzcy5tZW1vcnlVc2FnZSgpLmhlYXBVc2VkLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0pO1xyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIExvZyBzZWN1cml0eSBldmVudHNcclxuICAgKi9cclxuICBzZWN1cml0eShtZXNzYWdlOiBzdHJpbmcsIG1ldGE/OiBMb2dNZXRhZGF0YSk6IHZvaWQge1xyXG4gICAgdGhpcy5sb2coTG9nTGV2ZWwuV0FSTiwgYFtTRUNVUklUWV0gJHttZXNzYWdlfWAsIHtcclxuICAgICAgLi4ubWV0YSxcclxuICAgICAgc2VjdXJpdHlFdmVudDogdHJ1ZSxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogTG9nIGJ1c2luZXNzIG1ldHJpY3NcclxuICAgKi9cclxuICBtZXRyaWMobWV0cmljTmFtZTogc3RyaW5nLCB2YWx1ZTogbnVtYmVyLCB1bml0OiBzdHJpbmcgPSAnQ291bnQnLCBtZXRhPzogTG9nTWV0YWRhdGEpOiB2b2lkIHtcclxuICAgIHRoaXMuaW5mbyhgW01FVFJJQ10gJHttZXRyaWNOYW1lfWAsIHtcclxuICAgICAgLi4ubWV0YSxcclxuICAgICAgbWV0cmljOiB7XHJcbiAgICAgICAgbmFtZTogbWV0cmljTmFtZSxcclxuICAgICAgICB2YWx1ZSxcclxuICAgICAgICB1bml0LFxyXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBMb2cgQVBJIHJlcXVlc3QvcmVzcG9uc2VcclxuICAgKi9cclxuICBhcGlDYWxsKG1ldGhvZDogc3RyaW5nLCBwYXRoOiBzdHJpbmcsIHN0YXR1c0NvZGU6IG51bWJlciwgZHVyYXRpb246IG51bWJlciwgbWV0YT86IExvZ01ldGFkYXRhKTogdm9pZCB7XHJcbiAgICB0aGlzLmluZm8oYFtBUEldICR7bWV0aG9kfSAke3BhdGh9IC0gJHtzdGF0dXNDb2RlfWAsIHtcclxuICAgICAgLi4ubWV0YSxcclxuICAgICAgYXBpOiB7XHJcbiAgICAgICAgbWV0aG9kLFxyXG4gICAgICAgIHBhdGgsXHJcbiAgICAgICAgc3RhdHVzQ29kZSxcclxuICAgICAgICBkdXJhdGlvbixcclxuICAgICAgICBzdWNjZXNzOiBzdGF0dXNDb2RlID49IDIwMCAmJiBzdGF0dXNDb2RlIDwgNDAwLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogQ3JlYXRlIGEgbG9nZ2VyIGluc3RhbmNlIGZvciBhIHNwZWNpZmljIGNvbnRleHRcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVMb2dnZXIoY29udGV4dDogc3RyaW5nLCBtZXRhZGF0YT86IExvZ01ldGFkYXRhKTogTG9nZ2VyIHtcclxuICByZXR1cm4gbmV3IExvZ2dlcihjb250ZXh0LCBtZXRhZGF0YSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBHZW5lcmF0ZSBhIGNvcnJlbGF0aW9uIElEIGZvciByZXF1ZXN0IHRyYWNpbmdcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZUNvcnJlbGF0aW9uSWQoKTogc3RyaW5nIHtcclxuICByZXR1cm4gYCR7RGF0ZS5ub3coKX0tJHtNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHIoMiwgOSl9YDtcclxufVxyXG5cclxuLyoqXHJcbiAqIEV4dHJhY3QgY29ycmVsYXRpb24gSUQgZnJvbSBBUEkgR2F0ZXdheSBldmVudCBoZWFkZXJzXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdENvcnJlbGF0aW9uSWQoZXZlbnQ6IGFueSk6IHN0cmluZyB7XHJcbiAgLy8gVHJ5IHRvIGdldCBmcm9tIGhlYWRlcnMgKGNhc2UgaW5zZW5zaXRpdmUpXHJcbiAgY29uc3QgaGVhZGVycyA9IGV2ZW50LmhlYWRlcnMgfHwge307XHJcbiAgY29uc3QgY29ycmVsYXRpb25JZCA9IFxyXG4gICAgaGVhZGVyc1snWC1Db3JyZWxhdGlvbi1JRCddIHx8XHJcbiAgICBoZWFkZXJzWyd4LWNvcnJlbGF0aW9uLWlkJ10gfHxcclxuICAgIGhlYWRlcnNbJ1gtQ09SUkVMQVRJT04tSUQnXSB8fFxyXG4gICAgaGVhZGVyc1snY29ycmVsYXRpb24taWQnXSB8fFxyXG4gICAgZ2VuZXJhdGVDb3JyZWxhdGlvbklkKCk7XHJcbiAgXHJcbiAgcmV0dXJuIGNvcnJlbGF0aW9uSWQ7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDcmVhdGUgYSBsb2dnZXIgd2l0aCBjb3JyZWxhdGlvbiBJRCBmcm9tIEFQSSBHYXRld2F5IGV2ZW50XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlTG9nZ2VyV2l0aENvcnJlbGF0aW9uKGNvbnRleHQ6IHN0cmluZywgZXZlbnQ6IGFueSwgbWV0YWRhdGE/OiBMb2dNZXRhZGF0YSk6IExvZ2dlciB7XHJcbiAgY29uc3QgY29ycmVsYXRpb25JZCA9IGV4dHJhY3RDb3JyZWxhdGlvbklkKGV2ZW50KTtcclxuICByZXR1cm4gbmV3IExvZ2dlcihjb250ZXh0LCB7XHJcbiAgICAuLi5tZXRhZGF0YSxcclxuICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgfSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBVdGlsaXR5IGZ1bmN0aW9uIHRvIHJlY29yZCBjdXN0b20gQ2xvdWRXYXRjaCBtZXRyaWNzXHJcbiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVjb3JkQ3VzdG9tTWV0cmljKFxyXG4gIG5hbWVzcGFjZTogc3RyaW5nLFxyXG4gIG1ldHJpY05hbWU6IHN0cmluZyxcclxuICB2YWx1ZTogbnVtYmVyLFxyXG4gIHVuaXQ6IHN0cmluZyA9ICdDb3VudCcsXHJcbiAgZGltZW5zaW9ucz86IHsgW2tleTogc3RyaW5nXTogc3RyaW5nIH1cclxuKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgdHJ5IHtcclxuICAgIC8vIEluIGEgcmVhbCBpbXBsZW1lbnRhdGlvbiwgdGhpcyB3b3VsZCB1c2UgQVdTIFNESyBDbG91ZFdhdGNoXHJcbiAgICAvLyBGb3Igbm93LCB3ZSdsbCBsb2cgaXQgaW4gYSBzdHJ1Y3R1cmVkIHdheSB0aGF0IGNhbiBiZSBwaWNrZWQgdXAgYnkgQ2xvdWRXYXRjaCBJbnNpZ2h0c1xyXG4gICAgY29uc3QgbG9nZ2VyID0gY3JlYXRlTG9nZ2VyKCdtZXRyaWNzJyk7XHJcbiAgICBsb2dnZXIubWV0cmljKG1ldHJpY05hbWUsIHZhbHVlLCB1bml0LCB7XHJcbiAgICAgIG5hbWVzcGFjZSxcclxuICAgICAgZGltZW5zaW9ucyxcclxuICAgICAgY2xvdWR3YXRjaE1ldHJpYzogdHJ1ZSxcclxuICAgIH0pO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gcmVjb3JkIGN1c3RvbSBtZXRyaWM6JywgZXJyb3IpO1xyXG4gIH1cclxufVxyXG4iXX0=