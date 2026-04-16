"use strict";
/**
 * Centralized Error Handler Service
 * Coordinates all error handling components for production error handling
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.centralizedErrorHandler = exports.CentralizedErrorHandler = void 0;
const logger_1 = require("../../utils/logger");
const app_error_1 = require("../../utils/app-error");
const circuit_breaker_1 = require("./circuit-breaker");
const graceful_degradation_1 = require("./graceful-degradation");
const user_friendly_errors_1 = require("./user-friendly-errors");
const enhanced_retry_1 = require("./enhanced-retry");
/**
 * Centralized error handler that coordinates all error handling components
 */
class CentralizedErrorHandler {
    logger;
    defaultConfig = {
        enableCircuitBreaker: true,
        enableGracefulDegradation: true,
        enableUserFriendlyMessages: true,
        enableRetry: true,
        enableCorrelationIds: true,
        enableErrorLogging: true,
        retryConfig: {
            maxAttempts: 3,
            initialDelayMs: 1000,
            maxDelayMs: 10000,
            backoffMultiplier: 2,
            jitterEnabled: true
        }
    };
    constructor(config) {
        this.logger = (0, logger_1.createLogger)('CentralizedErrorHandler');
        this.defaultConfig = { ...this.defaultConfig, ...config };
    }
    /**
     * Execute operation with comprehensive error handling
     */
    async executeWithErrorHandling(operation, serviceName, context, config) {
        const finalConfig = { ...this.defaultConfig, ...config };
        const correlationId = this.generateCorrelationId();
        // Add correlation ID to context
        const enhancedContext = {
            ...context,
            requestId: correlationId
        };
        try {
            // Execute with circuit breaker and graceful degradation
            if (finalConfig.enableCircuitBreaker && finalConfig.enableGracefulDegradation) {
                return await graceful_degradation_1.gracefulDegradationService.executeWithFallback(serviceName, () => circuit_breaker_1.circuitBreakerManager.executeWithBreaker(serviceName, operation), undefined, // No custom fallback function
                { enableCaching: true, enableMockData: true });
            }
            // Execute with circuit breaker only
            if (finalConfig.enableCircuitBreaker) {
                return await circuit_breaker_1.circuitBreakerManager.executeWithBreaker(serviceName, operation);
            }
            // Execute with retry only
            if (finalConfig.enableRetry) {
                return await enhanced_retry_1.enhancedRetryService.executeWithRetry(operation, finalConfig.retryConfig);
            }
            // Execute without protection
            return await operation();
        }
        catch (error) {
            // Handle and transform error
            return this.handleError(error, enhancedContext, finalConfig);
        }
    }
    /**
     * Handle error and apply transformations
     */
    async handleError(error, context, config) {
        const correlationId = context.requestId || this.generateCorrelationId();
        // Log error if enabled
        if (config.enableErrorLogging) {
            this.logError(error, context, correlationId);
        }
        // Convert to user-friendly error if enabled
        let userFriendlyError;
        if (config.enableUserFriendlyMessages) {
            userFriendlyError = user_friendly_errors_1.userFriendlyErrorService.getUserFriendlyError(error, context);
        }
        else {
            // Fallback to basic error
            userFriendlyError = {
                title: 'Error',
                message: error instanceof Error ? error.message : String(error),
                suggestion: 'Please try again or contact support.',
                recoverable: true,
                retryable: false,
                contactSupport: true,
                errorCode: 'UNKNOWN_ERROR'
            };
        }
        // Create enhanced app error
        const appError = new app_error_1.AppError(userFriendlyError.message, this.getHttpStatusCode(userFriendlyError.errorCode), userFriendlyError.errorCode, userFriendlyError.recoverable, {
            userFriendlyError,
            correlationId,
            context
        });
        throw appError;
    }
    /**
     * Convert error to API Gateway response
     */
    handleApiError(error, context, config) {
        const finalConfig = { ...this.defaultConfig, ...config };
        const correlationId = context?.requestId || this.generateCorrelationId();
        try {
            // Log error
            if (finalConfig.enableErrorLogging) {
                this.logError(error, context, correlationId);
            }
            // Get user-friendly error
            let userFriendlyError;
            if (finalConfig.enableUserFriendlyMessages) {
                userFriendlyError = user_friendly_errors_1.userFriendlyErrorService.getUserFriendlyError(error, context);
            }
            else {
                userFriendlyError = {
                    title: 'Error',
                    message: error instanceof Error ? error.message : String(error),
                    suggestion: 'Please try again or contact support.',
                    recoverable: true,
                    retryable: false,
                    contactSupport: true,
                    errorCode: 'UNKNOWN_ERROR'
                };
            }
            // Build error response
            const errorResponse = {
                error: {
                    code: userFriendlyError.errorCode,
                    message: error instanceof Error ? error.message : String(error),
                    userMessage: userFriendlyError.message,
                    suggestion: userFriendlyError.suggestion,
                    recoverable: userFriendlyError.recoverable,
                    retryable: userFriendlyError.retryable,
                    contactSupport: userFriendlyError.contactSupport,
                    correlationId,
                    timestamp: new Date().toISOString(),
                    requestId: process.env.AWS_REQUEST_ID
                }
            };
            const statusCode = this.getHttpStatusCode(userFriendlyError.errorCode);
            return {
                statusCode,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'X-Correlation-ID': correlationId
                },
                body: JSON.stringify(errorResponse)
            };
        }
        catch (handlingError) {
            // Fallback error response if error handling itself fails
            this.logger.error('Error handling failed', handlingError);
            return {
                statusCode: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'X-Correlation-ID': correlationId
                },
                body: JSON.stringify({
                    error: {
                        code: 'ERROR_HANDLING_FAILED',
                        message: 'An error occurred while processing the error',
                        userMessage: 'We encountered an unexpected issue. Please try again.',
                        suggestion: 'Please try again. If the problem persists, contact support.',
                        recoverable: true,
                        retryable: true,
                        contactSupport: true,
                        correlationId,
                        timestamp: new Date().toISOString(),
                        requestId: process.env.AWS_REQUEST_ID
                    }
                })
            };
        }
    }
    /**
     * Wrap Lambda handler with comprehensive error handling
     */
    wrapLambdaHandler(handler, serviceName, config) {
        return async (event, context) => {
            const correlationId = this.generateCorrelationId();
            const errorContext = {
                operation: serviceName,
                requestId: correlationId,
                timestamp: new Date().toISOString()
            };
            try {
                // Execute handler with error handling
                return await this.executeWithErrorHandling(() => handler(event, context), serviceName, errorContext, config);
            }
            catch (error) {
                // Convert to API response
                return this.handleApiError(error, errorContext, config);
            }
        };
    }
    /**
     * Log error with correlation ID and context
     */
    logError(error, context, correlationId) {
        const errorInfo = {
            correlationId: correlationId || this.generateCorrelationId(),
            context,
            errorType: error?.constructor?.name || 'Unknown',
            errorMessage: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString()
        };
        if (error instanceof app_error_1.AppError) {
            this.logger.warn('Application error occurred', errorInfo);
        }
        else {
            this.logger.error('Unexpected error occurred', error, errorInfo);
        }
    }
    /**
     * Generate correlation ID for request tracking
     */
    generateCorrelationId() {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    }
    /**
     * Get HTTP status code for error code
     */
    getHttpStatusCode(errorCode) {
        const statusCodeMap = {
            'UNAUTHORIZED': 401,
            'FORBIDDEN': 403,
            'NOT_FOUND': 404,
            'VALIDATION_ERROR': 400,
            'INVALID_INPUT': 400,
            'MISSING_REQUIRED_FIELD': 400,
            'INVALID_FORMAT': 400,
            'FILE_TOO_LARGE': 400,
            'INVALID_FILE_TYPE': 400,
            'CONFLICT': 409,
            'RATE_LIMIT_EXCEEDED': 429,
            'QUOTA_EXCEEDED': 429,
            'INTERNAL_ERROR': 500,
            'DATABASE_ERROR': 500,
            'EXTERNAL_SERVICE_ERROR': 503,
            'SERVICE_UNAVAILABLE': 503,
            'CIRCUIT_BREAKER_OPEN': 503,
            'TIMEOUT_ERROR': 504,
            'NETWORK_ERROR': 502
        };
        return statusCodeMap[errorCode] || 500;
    }
    /**
     * Get system health status
     */
    async getSystemHealth() {
        const circuitBreakerMetrics = circuit_breaker_1.circuitBreakerManager.getAllMetrics();
        const serviceHealth = await graceful_degradation_1.gracefulDegradationService.performHealthCheck();
        const unhealthyServices = Object.values(serviceHealth).filter(healthy => !healthy).length;
        const totalServices = Object.keys(serviceHealth).length;
        let status;
        if (unhealthyServices === 0) {
            status = 'healthy';
        }
        else if (unhealthyServices < totalServices / 2) {
            status = 'degraded';
        }
        else {
            status = 'unhealthy';
        }
        return {
            status,
            services: serviceHealth,
            circuitBreakers: circuitBreakerMetrics,
            timestamp: new Date().toISOString()
        };
    }
    /**
     * Reset all error handling components
     */
    resetAll() {
        circuit_breaker_1.circuitBreakerManager.resetAll();
        graceful_degradation_1.gracefulDegradationService.clearCache();
    }
}
exports.CentralizedErrorHandler = CentralizedErrorHandler;
// Global centralized error handler instance
exports.centralizedErrorHandler = new CentralizedErrorHandler();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VudHJhbGl6ZWQtZXJyb3ItaGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNlbnRyYWxpemVkLWVycm9yLWhhbmRsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7R0FHRzs7O0FBR0gsK0NBQTBEO0FBQzFELHFEQUE0RDtBQUM1RCx1REFBMEQ7QUFDMUQsaUVBQW9FO0FBQ3BFLGlFQUFtRztBQUNuRyxxREFBcUU7QUEyQnJFOztHQUVHO0FBQ0gsTUFBYSx1QkFBdUI7SUFDMUIsTUFBTSxDQUFTO0lBQ2YsYUFBYSxHQUF3QjtRQUMzQyxvQkFBb0IsRUFBRSxJQUFJO1FBQzFCLHlCQUF5QixFQUFFLElBQUk7UUFDL0IsMEJBQTBCLEVBQUUsSUFBSTtRQUNoQyxXQUFXLEVBQUUsSUFBSTtRQUNqQixvQkFBb0IsRUFBRSxJQUFJO1FBQzFCLGtCQUFrQixFQUFFLElBQUk7UUFDeEIsV0FBVyxFQUFFO1lBQ1gsV0FBVyxFQUFFLENBQUM7WUFDZCxjQUFjLEVBQUUsSUFBSTtZQUNwQixVQUFVLEVBQUUsS0FBSztZQUNqQixpQkFBaUIsRUFBRSxDQUFDO1lBQ3BCLGFBQWEsRUFBRSxJQUFJO1NBQ3BCO0tBQ0YsQ0FBQztJQUVGLFlBQVksTUFBcUM7UUFDL0MsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFBLHFCQUFZLEVBQUMseUJBQXlCLENBQUMsQ0FBQztRQUN0RCxJQUFJLENBQUMsYUFBYSxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsYUFBYSxFQUFFLEdBQUcsTUFBTSxFQUFFLENBQUM7SUFDNUQsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLHdCQUF3QixDQUM1QixTQUEyQixFQUMzQixXQUFtQixFQUNuQixPQUFzQixFQUN0QixNQUFxQztRQUVyQyxNQUFNLFdBQVcsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLGFBQWEsRUFBRSxHQUFHLE1BQU0sRUFBRSxDQUFDO1FBQ3pELE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1FBRW5ELGdDQUFnQztRQUNoQyxNQUFNLGVBQWUsR0FBRztZQUN0QixHQUFHLE9BQU87WUFDVixTQUFTLEVBQUUsYUFBYTtTQUN6QixDQUFDO1FBRUYsSUFBSSxDQUFDO1lBQ0gsd0RBQXdEO1lBQ3hELElBQUksV0FBVyxDQUFDLG9CQUFvQixJQUFJLFdBQVcsQ0FBQyx5QkFBeUIsRUFBRSxDQUFDO2dCQUM5RSxPQUFPLE1BQU0saURBQTBCLENBQUMsbUJBQW1CLENBQ3pELFdBQVcsRUFDWCxHQUFHLEVBQUUsQ0FBQyx1Q0FBcUIsQ0FBQyxrQkFBa0IsQ0FBQyxXQUFXLEVBQUUsU0FBUyxDQUFDLEVBQ3RFLFNBQVMsRUFBRSw4QkFBOEI7Z0JBQ3pDLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFLENBQzlDLENBQUM7WUFDSixDQUFDO1lBRUQsb0NBQW9DO1lBQ3BDLElBQUksV0FBVyxDQUFDLG9CQUFvQixFQUFFLENBQUM7Z0JBQ3JDLE9BQU8sTUFBTSx1Q0FBcUIsQ0FBQyxrQkFBa0IsQ0FBQyxXQUFXLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDaEYsQ0FBQztZQUVELDBCQUEwQjtZQUMxQixJQUFJLFdBQVcsQ0FBQyxXQUFXLEVBQUUsQ0FBQztnQkFDNUIsT0FBTyxNQUFNLHFDQUFvQixDQUFDLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxXQUFXLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDekYsQ0FBQztZQUVELDZCQUE2QjtZQUM3QixPQUFPLE1BQU0sU0FBUyxFQUFFLENBQUM7UUFFM0IsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZiw2QkFBNkI7WUFDN0IsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxlQUFlLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDL0QsQ0FBQztJQUNILENBQUM7SUFFRDs7T0FFRztJQUNLLEtBQUssQ0FBQyxXQUFXLENBQ3ZCLEtBQVUsRUFDVixPQUFxQixFQUNyQixNQUEyQjtRQUUzQixNQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1FBRXhFLHVCQUF1QjtRQUN2QixJQUFJLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1lBQzlCLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxhQUFhLENBQUMsQ0FBQztRQUMvQyxDQUFDO1FBRUQsNENBQTRDO1FBQzVDLElBQUksaUJBQW9DLENBQUM7UUFDekMsSUFBSSxNQUFNLENBQUMsMEJBQTBCLEVBQUUsQ0FBQztZQUN0QyxpQkFBaUIsR0FBRywrQ0FBd0IsQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDcEYsQ0FBQzthQUFNLENBQUM7WUFDTiwwQkFBMEI7WUFDMUIsaUJBQWlCLEdBQUc7Z0JBQ2xCLEtBQUssRUFBRSxPQUFPO2dCQUNkLE9BQU8sRUFBRSxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDO2dCQUMvRCxVQUFVLEVBQUUsc0NBQXNDO2dCQUNsRCxXQUFXLEVBQUUsSUFBSTtnQkFDakIsU0FBUyxFQUFFLEtBQUs7Z0JBQ2hCLGNBQWMsRUFBRSxJQUFJO2dCQUNwQixTQUFTLEVBQUUsZUFBZTthQUMzQixDQUFDO1FBQ0osQ0FBQztRQUVELDRCQUE0QjtRQUM1QixNQUFNLFFBQVEsR0FBRyxJQUFJLG9CQUFRLENBQzNCLGlCQUFpQixDQUFDLE9BQU8sRUFDekIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxFQUNuRCxpQkFBaUIsQ0FBQyxTQUFzQixFQUN4QyxpQkFBaUIsQ0FBQyxXQUFXLEVBQzdCO1lBQ0UsaUJBQWlCO1lBQ2pCLGFBQWE7WUFDYixPQUFPO1NBQ1IsQ0FDRixDQUFDO1FBRUYsTUFBTSxRQUFRLENBQUM7SUFDakIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsY0FBYyxDQUNaLEtBQVUsRUFDVixPQUFzQixFQUN0QixNQUFxQztRQUVyQyxNQUFNLFdBQVcsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLGFBQWEsRUFBRSxHQUFHLE1BQU0sRUFBRSxDQUFDO1FBQ3pELE1BQU0sYUFBYSxHQUFHLE9BQU8sRUFBRSxTQUFTLElBQUksSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUM7UUFFekUsSUFBSSxDQUFDO1lBQ0gsWUFBWTtZQUNaLElBQUksV0FBVyxDQUFDLGtCQUFrQixFQUFFLENBQUM7Z0JBQ25DLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxhQUFhLENBQUMsQ0FBQztZQUMvQyxDQUFDO1lBRUQsMEJBQTBCO1lBQzFCLElBQUksaUJBQW9DLENBQUM7WUFDekMsSUFBSSxXQUFXLENBQUMsMEJBQTBCLEVBQUUsQ0FBQztnQkFDM0MsaUJBQWlCLEdBQUcsK0NBQXdCLENBQUMsb0JBQW9CLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ3BGLENBQUM7aUJBQU0sQ0FBQztnQkFDTixpQkFBaUIsR0FBRztvQkFDbEIsS0FBSyxFQUFFLE9BQU87b0JBQ2QsT0FBTyxFQUFFLEtBQUssWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUM7b0JBQy9ELFVBQVUsRUFBRSxzQ0FBc0M7b0JBQ2xELFdBQVcsRUFBRSxJQUFJO29CQUNqQixTQUFTLEVBQUUsS0FBSztvQkFDaEIsY0FBYyxFQUFFLElBQUk7b0JBQ3BCLFNBQVMsRUFBRSxlQUFlO2lCQUMzQixDQUFDO1lBQ0osQ0FBQztZQUVELHVCQUF1QjtZQUN2QixNQUFNLGFBQWEsR0FBa0I7Z0JBQ25DLEtBQUssRUFBRTtvQkFDTCxJQUFJLEVBQUUsaUJBQWlCLENBQUMsU0FBUztvQkFDakMsT0FBTyxFQUFFLEtBQUssWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUM7b0JBQy9ELFdBQVcsRUFBRSxpQkFBaUIsQ0FBQyxPQUFPO29CQUN0QyxVQUFVLEVBQUUsaUJBQWlCLENBQUMsVUFBVTtvQkFDeEMsV0FBVyxFQUFFLGlCQUFpQixDQUFDLFdBQVc7b0JBQzFDLFNBQVMsRUFBRSxpQkFBaUIsQ0FBQyxTQUFTO29CQUN0QyxjQUFjLEVBQUUsaUJBQWlCLENBQUMsY0FBYztvQkFDaEQsYUFBYTtvQkFDYixTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7b0JBQ25DLFNBQVMsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWM7aUJBQ3RDO2FBQ0YsQ0FBQztZQUVGLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUV2RSxPQUFPO2dCQUNMLFVBQVU7Z0JBQ1YsT0FBTyxFQUFFO29CQUNQLGNBQWMsRUFBRSxrQkFBa0I7b0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7b0JBQ2xDLDhCQUE4QixFQUFFLDRCQUE0QjtvQkFDNUQsa0JBQWtCLEVBQUUsYUFBYTtpQkFDbEM7Z0JBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDO2FBQ3BDLENBQUM7UUFFSixDQUFDO1FBQUMsT0FBTyxhQUFhLEVBQUUsQ0FBQztZQUN2Qix5REFBeUQ7WUFDekQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsdUJBQXVCLEVBQUUsYUFBc0IsQ0FBQyxDQUFDO1lBRW5FLE9BQU87Z0JBQ0wsVUFBVSxFQUFFLEdBQUc7Z0JBQ2YsT0FBTyxFQUFFO29CQUNQLGNBQWMsRUFBRSxrQkFBa0I7b0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7b0JBQ2xDLDhCQUE4QixFQUFFLDRCQUE0QjtvQkFDNUQsa0JBQWtCLEVBQUUsYUFBYTtpQkFDbEM7Z0JBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7b0JBQ25CLEtBQUssRUFBRTt3QkFDTCxJQUFJLEVBQUUsdUJBQXVCO3dCQUM3QixPQUFPLEVBQUUsOENBQThDO3dCQUN2RCxXQUFXLEVBQUUsdURBQXVEO3dCQUNwRSxVQUFVLEVBQUUsNkRBQTZEO3dCQUN6RSxXQUFXLEVBQUUsSUFBSTt3QkFDakIsU0FBUyxFQUFFLElBQUk7d0JBQ2YsY0FBYyxFQUFFLElBQUk7d0JBQ3BCLGFBQWE7d0JBQ2IsU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO3dCQUNuQyxTQUFTLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjO3FCQUN0QztpQkFDRixDQUFDO2FBQ0gsQ0FBQztRQUNKLENBQUM7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxpQkFBaUIsQ0FDZixPQUF3RSxFQUN4RSxXQUFtQixFQUNuQixNQUFxQztRQUVyQyxPQUFPLEtBQUssRUFBRSxLQUFhLEVBQUUsT0FBWSxFQUFrQyxFQUFFO1lBQzNFLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1lBQ25ELE1BQU0sWUFBWSxHQUFpQjtnQkFDakMsU0FBUyxFQUFFLFdBQVc7Z0JBQ3RCLFNBQVMsRUFBRSxhQUFhO2dCQUN4QixTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7YUFDcEMsQ0FBQztZQUVGLElBQUksQ0FBQztnQkFDSCxzQ0FBc0M7Z0JBQ3RDLE9BQU8sTUFBTSxJQUFJLENBQUMsd0JBQXdCLENBQ3hDLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLEVBQzdCLFdBQVcsRUFDWCxZQUFZLEVBQ1osTUFBTSxDQUNQLENBQUM7WUFDSixDQUFDO1lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztnQkFDZiwwQkFBMEI7Z0JBQzFCLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLEVBQUUsWUFBWSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQzFELENBQUM7UUFDSCxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQ7O09BRUc7SUFDSyxRQUFRLENBQUMsS0FBVSxFQUFFLE9BQXNCLEVBQUUsYUFBc0I7UUFDekUsTUFBTSxTQUFTLEdBQUc7WUFDaEIsYUFBYSxFQUFFLGFBQWEsSUFBSSxJQUFJLENBQUMscUJBQXFCLEVBQUU7WUFDNUQsT0FBTztZQUNQLFNBQVMsRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLElBQUksSUFBSSxTQUFTO1lBQ2hELFlBQVksRUFBRSxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDO1lBQ3BFLEtBQUssRUFBRSxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxTQUFTO1lBQ3ZELFNBQVMsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTtTQUNwQyxDQUFDO1FBRUYsSUFBSSxLQUFLLFlBQVksb0JBQVEsRUFBRSxDQUFDO1lBQzlCLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLDRCQUE0QixFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQzVELENBQUM7YUFBTSxDQUFDO1lBQ04sSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsMkJBQTJCLEVBQUUsS0FBYyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQzVFLENBQUM7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDSyxxQkFBcUI7UUFDM0IsT0FBTyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQztJQUN4RSxDQUFDO0lBRUQ7O09BRUc7SUFDSyxpQkFBaUIsQ0FBQyxTQUFpQjtRQUN6QyxNQUFNLGFBQWEsR0FBMkI7WUFDNUMsY0FBYyxFQUFFLEdBQUc7WUFDbkIsV0FBVyxFQUFFLEdBQUc7WUFDaEIsV0FBVyxFQUFFLEdBQUc7WUFDaEIsa0JBQWtCLEVBQUUsR0FBRztZQUN2QixlQUFlLEVBQUUsR0FBRztZQUNwQix3QkFBd0IsRUFBRSxHQUFHO1lBQzdCLGdCQUFnQixFQUFFLEdBQUc7WUFDckIsZ0JBQWdCLEVBQUUsR0FBRztZQUNyQixtQkFBbUIsRUFBRSxHQUFHO1lBQ3hCLFVBQVUsRUFBRSxHQUFHO1lBQ2YscUJBQXFCLEVBQUUsR0FBRztZQUMxQixnQkFBZ0IsRUFBRSxHQUFHO1lBQ3JCLGdCQUFnQixFQUFFLEdBQUc7WUFDckIsZ0JBQWdCLEVBQUUsR0FBRztZQUNyQix3QkFBd0IsRUFBRSxHQUFHO1lBQzdCLHFCQUFxQixFQUFFLEdBQUc7WUFDMUIsc0JBQXNCLEVBQUUsR0FBRztZQUMzQixlQUFlLEVBQUUsR0FBRztZQUNwQixlQUFlLEVBQUUsR0FBRztTQUNyQixDQUFDO1FBRUYsT0FBTyxhQUFhLENBQUMsU0FBUyxDQUFDLElBQUksR0FBRyxDQUFDO0lBQ3pDLENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxlQUFlO1FBTW5CLE1BQU0scUJBQXFCLEdBQUcsdUNBQXFCLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDcEUsTUFBTSxhQUFhLEdBQUcsTUFBTSxpREFBMEIsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1FBRTVFLE1BQU0saUJBQWlCLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQztRQUMxRixNQUFNLGFBQWEsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLE1BQU0sQ0FBQztRQUV4RCxJQUFJLE1BQTRDLENBQUM7UUFDakQsSUFBSSxpQkFBaUIsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUM1QixNQUFNLEdBQUcsU0FBUyxDQUFDO1FBQ3JCLENBQUM7YUFBTSxJQUFJLGlCQUFpQixHQUFHLGFBQWEsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNqRCxNQUFNLEdBQUcsVUFBVSxDQUFDO1FBQ3RCLENBQUM7YUFBTSxDQUFDO1lBQ04sTUFBTSxHQUFHLFdBQVcsQ0FBQztRQUN2QixDQUFDO1FBRUQsT0FBTztZQUNMLE1BQU07WUFDTixRQUFRLEVBQUUsYUFBYTtZQUN2QixlQUFlLEVBQUUscUJBQXFCO1lBQ3RDLFNBQVMsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTtTQUNwQyxDQUFDO0lBQ0osQ0FBQztJQUVEOztPQUVHO0lBQ0gsUUFBUTtRQUNOLHVDQUFxQixDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ2pDLGlEQUEwQixDQUFDLFVBQVUsRUFBRSxDQUFDO0lBQzFDLENBQUM7Q0FDRjtBQWpWRCwwREFpVkM7QUFFRCw0Q0FBNEM7QUFDL0IsUUFBQSx1QkFBdUIsR0FBRyxJQUFJLHVCQUF1QixFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogQ2VudHJhbGl6ZWQgRXJyb3IgSGFuZGxlciBTZXJ2aWNlXHJcbiAqIENvb3JkaW5hdGVzIGFsbCBlcnJvciBoYW5kbGluZyBjb21wb25lbnRzIGZvciBwcm9kdWN0aW9uIGVycm9yIGhhbmRsaW5nXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IExvZ2dlciwgY3JlYXRlTG9nZ2VyIH0gZnJvbSAnLi4vLi4vdXRpbHMvbG9nZ2VyJztcclxuaW1wb3J0IHsgQXBwRXJyb3IsIEVycm9yQ29kZSB9IGZyb20gJy4uLy4uL3V0aWxzL2FwcC1lcnJvcic7XHJcbmltcG9ydCB7IGNpcmN1aXRCcmVha2VyTWFuYWdlciB9IGZyb20gJy4vY2lyY3VpdC1icmVha2VyJztcclxuaW1wb3J0IHsgZ3JhY2VmdWxEZWdyYWRhdGlvblNlcnZpY2UgfSBmcm9tICcuL2dyYWNlZnVsLWRlZ3JhZGF0aW9uJztcclxuaW1wb3J0IHsgdXNlckZyaWVuZGx5RXJyb3JTZXJ2aWNlLCBVc2VyRnJpZW5kbHlFcnJvciwgRXJyb3JDb250ZXh0IH0gZnJvbSAnLi91c2VyLWZyaWVuZGx5LWVycm9ycyc7XHJcbmltcG9ydCB7IGVuaGFuY2VkUmV0cnlTZXJ2aWNlLCBSZXRyeUNvbmZpZyB9IGZyb20gJy4vZW5oYW5jZWQtcmV0cnknO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBFcnJvckhhbmRsaW5nQ29uZmlnIHtcclxuICBlbmFibGVDaXJjdWl0QnJlYWtlcjogYm9vbGVhbjtcclxuICBlbmFibGVHcmFjZWZ1bERlZ3JhZGF0aW9uOiBib29sZWFuO1xyXG4gIGVuYWJsZVVzZXJGcmllbmRseU1lc3NhZ2VzOiBib29sZWFuO1xyXG4gIGVuYWJsZVJldHJ5OiBib29sZWFuO1xyXG4gIGVuYWJsZUNvcnJlbGF0aW9uSWRzOiBib29sZWFuO1xyXG4gIGVuYWJsZUVycm9yTG9nZ2luZzogYm9vbGVhbjtcclxuICByZXRyeUNvbmZpZz86IFBhcnRpYWw8UmV0cnlDb25maWc+O1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEVycm9yUmVzcG9uc2Uge1xyXG4gIGVycm9yOiB7XHJcbiAgICBjb2RlOiBzdHJpbmc7XHJcbiAgICBtZXNzYWdlOiBzdHJpbmc7XHJcbiAgICB1c2VyTWVzc2FnZTogc3RyaW5nO1xyXG4gICAgc3VnZ2VzdGlvbjogc3RyaW5nO1xyXG4gICAgcmVjb3ZlcmFibGU6IGJvb2xlYW47XHJcbiAgICByZXRyeWFibGU6IGJvb2xlYW47XHJcbiAgICBjb250YWN0U3VwcG9ydDogYm9vbGVhbjtcclxuICAgIGNvcnJlbGF0aW9uSWQ6IHN0cmluZztcclxuICAgIHRpbWVzdGFtcDogc3RyaW5nO1xyXG4gICAgcmVxdWVzdElkPzogc3RyaW5nO1xyXG4gIH07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDZW50cmFsaXplZCBlcnJvciBoYW5kbGVyIHRoYXQgY29vcmRpbmF0ZXMgYWxsIGVycm9yIGhhbmRsaW5nIGNvbXBvbmVudHNcclxuICovXHJcbmV4cG9ydCBjbGFzcyBDZW50cmFsaXplZEVycm9ySGFuZGxlciB7XHJcbiAgcHJpdmF0ZSBsb2dnZXI6IExvZ2dlcjtcclxuICBwcml2YXRlIGRlZmF1bHRDb25maWc6IEVycm9ySGFuZGxpbmdDb25maWcgPSB7XHJcbiAgICBlbmFibGVDaXJjdWl0QnJlYWtlcjogdHJ1ZSxcclxuICAgIGVuYWJsZUdyYWNlZnVsRGVncmFkYXRpb246IHRydWUsXHJcbiAgICBlbmFibGVVc2VyRnJpZW5kbHlNZXNzYWdlczogdHJ1ZSxcclxuICAgIGVuYWJsZVJldHJ5OiB0cnVlLFxyXG4gICAgZW5hYmxlQ29ycmVsYXRpb25JZHM6IHRydWUsXHJcbiAgICBlbmFibGVFcnJvckxvZ2dpbmc6IHRydWUsXHJcbiAgICByZXRyeUNvbmZpZzoge1xyXG4gICAgICBtYXhBdHRlbXB0czogMyxcclxuICAgICAgaW5pdGlhbERlbGF5TXM6IDEwMDAsXHJcbiAgICAgIG1heERlbGF5TXM6IDEwMDAwLFxyXG4gICAgICBiYWNrb2ZmTXVsdGlwbGllcjogMixcclxuICAgICAgaml0dGVyRW5hYmxlZDogdHJ1ZVxyXG4gICAgfVxyXG4gIH07XHJcblxyXG4gIGNvbnN0cnVjdG9yKGNvbmZpZz86IFBhcnRpYWw8RXJyb3JIYW5kbGluZ0NvbmZpZz4pIHtcclxuICAgIHRoaXMubG9nZ2VyID0gY3JlYXRlTG9nZ2VyKCdDZW50cmFsaXplZEVycm9ySGFuZGxlcicpO1xyXG4gICAgdGhpcy5kZWZhdWx0Q29uZmlnID0geyAuLi50aGlzLmRlZmF1bHRDb25maWcsIC4uLmNvbmZpZyB9O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRXhlY3V0ZSBvcGVyYXRpb24gd2l0aCBjb21wcmVoZW5zaXZlIGVycm9yIGhhbmRsaW5nXHJcbiAgICovXHJcbiAgYXN5bmMgZXhlY3V0ZVdpdGhFcnJvckhhbmRsaW5nPFQ+KFxyXG4gICAgb3BlcmF0aW9uOiAoKSA9PiBQcm9taXNlPFQ+LFxyXG4gICAgc2VydmljZU5hbWU6IHN0cmluZyxcclxuICAgIGNvbnRleHQ/OiBFcnJvckNvbnRleHQsXHJcbiAgICBjb25maWc/OiBQYXJ0aWFsPEVycm9ySGFuZGxpbmdDb25maWc+XHJcbiAgKTogUHJvbWlzZTxUPiB7XHJcbiAgICBjb25zdCBmaW5hbENvbmZpZyA9IHsgLi4udGhpcy5kZWZhdWx0Q29uZmlnLCAuLi5jb25maWcgfTtcclxuICAgIGNvbnN0IGNvcnJlbGF0aW9uSWQgPSB0aGlzLmdlbmVyYXRlQ29ycmVsYXRpb25JZCgpO1xyXG4gICAgXHJcbiAgICAvLyBBZGQgY29ycmVsYXRpb24gSUQgdG8gY29udGV4dFxyXG4gICAgY29uc3QgZW5oYW5jZWRDb250ZXh0ID0ge1xyXG4gICAgICAuLi5jb250ZXh0LFxyXG4gICAgICByZXF1ZXN0SWQ6IGNvcnJlbGF0aW9uSWRcclxuICAgIH07XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gRXhlY3V0ZSB3aXRoIGNpcmN1aXQgYnJlYWtlciBhbmQgZ3JhY2VmdWwgZGVncmFkYXRpb25cclxuICAgICAgaWYgKGZpbmFsQ29uZmlnLmVuYWJsZUNpcmN1aXRCcmVha2VyICYmIGZpbmFsQ29uZmlnLmVuYWJsZUdyYWNlZnVsRGVncmFkYXRpb24pIHtcclxuICAgICAgICByZXR1cm4gYXdhaXQgZ3JhY2VmdWxEZWdyYWRhdGlvblNlcnZpY2UuZXhlY3V0ZVdpdGhGYWxsYmFjayhcclxuICAgICAgICAgIHNlcnZpY2VOYW1lLFxyXG4gICAgICAgICAgKCkgPT4gY2lyY3VpdEJyZWFrZXJNYW5hZ2VyLmV4ZWN1dGVXaXRoQnJlYWtlcihzZXJ2aWNlTmFtZSwgb3BlcmF0aW9uKSxcclxuICAgICAgICAgIHVuZGVmaW5lZCwgLy8gTm8gY3VzdG9tIGZhbGxiYWNrIGZ1bmN0aW9uXHJcbiAgICAgICAgICB7IGVuYWJsZUNhY2hpbmc6IHRydWUsIGVuYWJsZU1vY2tEYXRhOiB0cnVlIH1cclxuICAgICAgICApO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICAvLyBFeGVjdXRlIHdpdGggY2lyY3VpdCBicmVha2VyIG9ubHlcclxuICAgICAgaWYgKGZpbmFsQ29uZmlnLmVuYWJsZUNpcmN1aXRCcmVha2VyKSB7XHJcbiAgICAgICAgcmV0dXJuIGF3YWl0IGNpcmN1aXRCcmVha2VyTWFuYWdlci5leGVjdXRlV2l0aEJyZWFrZXIoc2VydmljZU5hbWUsIG9wZXJhdGlvbik7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIC8vIEV4ZWN1dGUgd2l0aCByZXRyeSBvbmx5XHJcbiAgICAgIGlmIChmaW5hbENvbmZpZy5lbmFibGVSZXRyeSkge1xyXG4gICAgICAgIHJldHVybiBhd2FpdCBlbmhhbmNlZFJldHJ5U2VydmljZS5leGVjdXRlV2l0aFJldHJ5KG9wZXJhdGlvbiwgZmluYWxDb25maWcucmV0cnlDb25maWcpO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICAvLyBFeGVjdXRlIHdpdGhvdXQgcHJvdGVjdGlvblxyXG4gICAgICByZXR1cm4gYXdhaXQgb3BlcmF0aW9uKCk7XHJcbiAgICAgIFxyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgLy8gSGFuZGxlIGFuZCB0cmFuc2Zvcm0gZXJyb3JcclxuICAgICAgcmV0dXJuIHRoaXMuaGFuZGxlRXJyb3IoZXJyb3IsIGVuaGFuY2VkQ29udGV4dCwgZmluYWxDb25maWcpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogSGFuZGxlIGVycm9yIGFuZCBhcHBseSB0cmFuc2Zvcm1hdGlvbnNcclxuICAgKi9cclxuICBwcml2YXRlIGFzeW5jIGhhbmRsZUVycm9yKFxyXG4gICAgZXJyb3I6IGFueSxcclxuICAgIGNvbnRleHQ6IEVycm9yQ29udGV4dCxcclxuICAgIGNvbmZpZzogRXJyb3JIYW5kbGluZ0NvbmZpZ1xyXG4gICk6IFByb21pc2U8bmV2ZXI+IHtcclxuICAgIGNvbnN0IGNvcnJlbGF0aW9uSWQgPSBjb250ZXh0LnJlcXVlc3RJZCB8fCB0aGlzLmdlbmVyYXRlQ29ycmVsYXRpb25JZCgpO1xyXG4gICAgXHJcbiAgICAvLyBMb2cgZXJyb3IgaWYgZW5hYmxlZFxyXG4gICAgaWYgKGNvbmZpZy5lbmFibGVFcnJvckxvZ2dpbmcpIHtcclxuICAgICAgdGhpcy5sb2dFcnJvcihlcnJvciwgY29udGV4dCwgY29ycmVsYXRpb25JZCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ29udmVydCB0byB1c2VyLWZyaWVuZGx5IGVycm9yIGlmIGVuYWJsZWRcclxuICAgIGxldCB1c2VyRnJpZW5kbHlFcnJvcjogVXNlckZyaWVuZGx5RXJyb3I7XHJcbiAgICBpZiAoY29uZmlnLmVuYWJsZVVzZXJGcmllbmRseU1lc3NhZ2VzKSB7XHJcbiAgICAgIHVzZXJGcmllbmRseUVycm9yID0gdXNlckZyaWVuZGx5RXJyb3JTZXJ2aWNlLmdldFVzZXJGcmllbmRseUVycm9yKGVycm9yLCBjb250ZXh0KTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIC8vIEZhbGxiYWNrIHRvIGJhc2ljIGVycm9yXHJcbiAgICAgIHVzZXJGcmllbmRseUVycm9yID0ge1xyXG4gICAgICAgIHRpdGxlOiAnRXJyb3InLFxyXG4gICAgICAgIG1lc3NhZ2U6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKSxcclxuICAgICAgICBzdWdnZXN0aW9uOiAnUGxlYXNlIHRyeSBhZ2FpbiBvciBjb250YWN0IHN1cHBvcnQuJyxcclxuICAgICAgICByZWNvdmVyYWJsZTogdHJ1ZSxcclxuICAgICAgICByZXRyeWFibGU6IGZhbHNlLFxyXG4gICAgICAgIGNvbnRhY3RTdXBwb3J0OiB0cnVlLFxyXG4gICAgICAgIGVycm9yQ29kZTogJ1VOS05PV05fRVJST1InXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ3JlYXRlIGVuaGFuY2VkIGFwcCBlcnJvclxyXG4gICAgY29uc3QgYXBwRXJyb3IgPSBuZXcgQXBwRXJyb3IoXHJcbiAgICAgIHVzZXJGcmllbmRseUVycm9yLm1lc3NhZ2UsXHJcbiAgICAgIHRoaXMuZ2V0SHR0cFN0YXR1c0NvZGUodXNlckZyaWVuZGx5RXJyb3IuZXJyb3JDb2RlKSxcclxuICAgICAgdXNlckZyaWVuZGx5RXJyb3IuZXJyb3JDb2RlIGFzIEVycm9yQ29kZSxcclxuICAgICAgdXNlckZyaWVuZGx5RXJyb3IucmVjb3ZlcmFibGUsXHJcbiAgICAgIHtcclxuICAgICAgICB1c2VyRnJpZW5kbHlFcnJvcixcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGNvbnRleHRcclxuICAgICAgfVxyXG4gICAgKTtcclxuXHJcbiAgICB0aHJvdyBhcHBFcnJvcjtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENvbnZlcnQgZXJyb3IgdG8gQVBJIEdhdGV3YXkgcmVzcG9uc2VcclxuICAgKi9cclxuICBoYW5kbGVBcGlFcnJvcihcclxuICAgIGVycm9yOiBhbnksXHJcbiAgICBjb250ZXh0PzogRXJyb3JDb250ZXh0LFxyXG4gICAgY29uZmlnPzogUGFydGlhbDxFcnJvckhhbmRsaW5nQ29uZmlnPlxyXG4gICk6IEFQSUdhdGV3YXlQcm94eVJlc3VsdCB7XHJcbiAgICBjb25zdCBmaW5hbENvbmZpZyA9IHsgLi4udGhpcy5kZWZhdWx0Q29uZmlnLCAuLi5jb25maWcgfTtcclxuICAgIGNvbnN0IGNvcnJlbGF0aW9uSWQgPSBjb250ZXh0Py5yZXF1ZXN0SWQgfHwgdGhpcy5nZW5lcmF0ZUNvcnJlbGF0aW9uSWQoKTtcclxuICAgIFxyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gTG9nIGVycm9yXHJcbiAgICAgIGlmIChmaW5hbENvbmZpZy5lbmFibGVFcnJvckxvZ2dpbmcpIHtcclxuICAgICAgICB0aGlzLmxvZ0Vycm9yKGVycm9yLCBjb250ZXh0LCBjb3JyZWxhdGlvbklkKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gR2V0IHVzZXItZnJpZW5kbHkgZXJyb3JcclxuICAgICAgbGV0IHVzZXJGcmllbmRseUVycm9yOiBVc2VyRnJpZW5kbHlFcnJvcjtcclxuICAgICAgaWYgKGZpbmFsQ29uZmlnLmVuYWJsZVVzZXJGcmllbmRseU1lc3NhZ2VzKSB7XHJcbiAgICAgICAgdXNlckZyaWVuZGx5RXJyb3IgPSB1c2VyRnJpZW5kbHlFcnJvclNlcnZpY2UuZ2V0VXNlckZyaWVuZGx5RXJyb3IoZXJyb3IsIGNvbnRleHQpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHVzZXJGcmllbmRseUVycm9yID0ge1xyXG4gICAgICAgICAgdGl0bGU6ICdFcnJvcicsXHJcbiAgICAgICAgICBtZXNzYWdlOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvciksXHJcbiAgICAgICAgICBzdWdnZXN0aW9uOiAnUGxlYXNlIHRyeSBhZ2FpbiBvciBjb250YWN0IHN1cHBvcnQuJyxcclxuICAgICAgICAgIHJlY292ZXJhYmxlOiB0cnVlLFxyXG4gICAgICAgICAgcmV0cnlhYmxlOiBmYWxzZSxcclxuICAgICAgICAgIGNvbnRhY3RTdXBwb3J0OiB0cnVlLFxyXG4gICAgICAgICAgZXJyb3JDb2RlOiAnVU5LTk9XTl9FUlJPUidcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBCdWlsZCBlcnJvciByZXNwb25zZVxyXG4gICAgICBjb25zdCBlcnJvclJlc3BvbnNlOiBFcnJvclJlc3BvbnNlID0ge1xyXG4gICAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgICBjb2RlOiB1c2VyRnJpZW5kbHlFcnJvci5lcnJvckNvZGUsXHJcbiAgICAgICAgICBtZXNzYWdlOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvciksXHJcbiAgICAgICAgICB1c2VyTWVzc2FnZTogdXNlckZyaWVuZGx5RXJyb3IubWVzc2FnZSxcclxuICAgICAgICAgIHN1Z2dlc3Rpb246IHVzZXJGcmllbmRseUVycm9yLnN1Z2dlc3Rpb24sXHJcbiAgICAgICAgICByZWNvdmVyYWJsZTogdXNlckZyaWVuZGx5RXJyb3IucmVjb3ZlcmFibGUsXHJcbiAgICAgICAgICByZXRyeWFibGU6IHVzZXJGcmllbmRseUVycm9yLnJldHJ5YWJsZSxcclxuICAgICAgICAgIGNvbnRhY3RTdXBwb3J0OiB1c2VyRnJpZW5kbHlFcnJvci5jb250YWN0U3VwcG9ydCxcclxuICAgICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICAgIHJlcXVlc3RJZDogcHJvY2Vzcy5lbnYuQVdTX1JFUVVFU1RfSURcclxuICAgICAgICB9XHJcbiAgICAgIH07XHJcblxyXG4gICAgICBjb25zdCBzdGF0dXNDb2RlID0gdGhpcy5nZXRIdHRwU3RhdHVzQ29kZSh1c2VyRnJpZW5kbHlFcnJvci5lcnJvckNvZGUpO1xyXG5cclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlLFxyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiAnQ29udGVudC1UeXBlLEF1dGhvcml6YXRpb24nLFxyXG4gICAgICAgICAgJ1gtQ29ycmVsYXRpb24tSUQnOiBjb3JyZWxhdGlvbklkXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShlcnJvclJlc3BvbnNlKVxyXG4gICAgICB9O1xyXG5cclxuICAgIH0gY2F0Y2ggKGhhbmRsaW5nRXJyb3IpIHtcclxuICAgICAgLy8gRmFsbGJhY2sgZXJyb3IgcmVzcG9uc2UgaWYgZXJyb3IgaGFuZGxpbmcgaXRzZWxmIGZhaWxzXHJcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdFcnJvciBoYW5kbGluZyBmYWlsZWQnLCBoYW5kbGluZ0Vycm9yIGFzIEVycm9yKTtcclxuICAgICAgXHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNTAwLFxyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiAnQ29udGVudC1UeXBlLEF1dGhvcml6YXRpb24nLFxyXG4gICAgICAgICAgJ1gtQ29ycmVsYXRpb24tSUQnOiBjb3JyZWxhdGlvbklkXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBlcnJvcjoge1xyXG4gICAgICAgICAgICBjb2RlOiAnRVJST1JfSEFORExJTkdfRkFJTEVEJyxcclxuICAgICAgICAgICAgbWVzc2FnZTogJ0FuIGVycm9yIG9jY3VycmVkIHdoaWxlIHByb2Nlc3NpbmcgdGhlIGVycm9yJyxcclxuICAgICAgICAgICAgdXNlck1lc3NhZ2U6ICdXZSBlbmNvdW50ZXJlZCBhbiB1bmV4cGVjdGVkIGlzc3VlLiBQbGVhc2UgdHJ5IGFnYWluLicsXHJcbiAgICAgICAgICAgIHN1Z2dlc3Rpb246ICdQbGVhc2UgdHJ5IGFnYWluLiBJZiB0aGUgcHJvYmxlbSBwZXJzaXN0cywgY29udGFjdCBzdXBwb3J0LicsXHJcbiAgICAgICAgICAgIHJlY292ZXJhYmxlOiB0cnVlLFxyXG4gICAgICAgICAgICByZXRyeWFibGU6IHRydWUsXHJcbiAgICAgICAgICAgIGNvbnRhY3RTdXBwb3J0OiB0cnVlLFxyXG4gICAgICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICAgICAgcmVxdWVzdElkOiBwcm9jZXNzLmVudi5BV1NfUkVRVUVTVF9JRFxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICAgIH07XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBXcmFwIExhbWJkYSBoYW5kbGVyIHdpdGggY29tcHJlaGVuc2l2ZSBlcnJvciBoYW5kbGluZ1xyXG4gICAqL1xyXG4gIHdyYXBMYW1iZGFIYW5kbGVyPFRFdmVudCA9IGFueSwgVFJlc3VsdCA9IGFueT4oXHJcbiAgICBoYW5kbGVyOiAoZXZlbnQ6IFRFdmVudCwgY29udGV4dDogYW55KSA9PiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4sXHJcbiAgICBzZXJ2aWNlTmFtZTogc3RyaW5nLFxyXG4gICAgY29uZmlnPzogUGFydGlhbDxFcnJvckhhbmRsaW5nQ29uZmlnPlxyXG4gICk6IChldmVudDogVEV2ZW50LCBjb250ZXh0OiBhbnkpID0+IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiB7XHJcbiAgICByZXR1cm4gYXN5bmMgKGV2ZW50OiBURXZlbnQsIGNvbnRleHQ6IGFueSk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XHJcbiAgICAgIGNvbnN0IGNvcnJlbGF0aW9uSWQgPSB0aGlzLmdlbmVyYXRlQ29ycmVsYXRpb25JZCgpO1xyXG4gICAgICBjb25zdCBlcnJvckNvbnRleHQ6IEVycm9yQ29udGV4dCA9IHtcclxuICAgICAgICBvcGVyYXRpb246IHNlcnZpY2VOYW1lLFxyXG4gICAgICAgIHJlcXVlc3RJZDogY29ycmVsYXRpb25JZCxcclxuICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgdHJ5IHtcclxuICAgICAgICAvLyBFeGVjdXRlIGhhbmRsZXIgd2l0aCBlcnJvciBoYW5kbGluZ1xyXG4gICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmV4ZWN1dGVXaXRoRXJyb3JIYW5kbGluZyhcclxuICAgICAgICAgICgpID0+IGhhbmRsZXIoZXZlbnQsIGNvbnRleHQpLFxyXG4gICAgICAgICAgc2VydmljZU5hbWUsXHJcbiAgICAgICAgICBlcnJvckNvbnRleHQsXHJcbiAgICAgICAgICBjb25maWdcclxuICAgICAgICApO1xyXG4gICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgIC8vIENvbnZlcnQgdG8gQVBJIHJlc3BvbnNlXHJcbiAgICAgICAgcmV0dXJuIHRoaXMuaGFuZGxlQXBpRXJyb3IoZXJyb3IsIGVycm9yQ29udGV4dCwgY29uZmlnKTtcclxuICAgICAgfVxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIExvZyBlcnJvciB3aXRoIGNvcnJlbGF0aW9uIElEIGFuZCBjb250ZXh0XHJcbiAgICovXHJcbiAgcHJpdmF0ZSBsb2dFcnJvcihlcnJvcjogYW55LCBjb250ZXh0PzogRXJyb3JDb250ZXh0LCBjb3JyZWxhdGlvbklkPzogc3RyaW5nKTogdm9pZCB7XHJcbiAgICBjb25zdCBlcnJvckluZm8gPSB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQ6IGNvcnJlbGF0aW9uSWQgfHwgdGhpcy5nZW5lcmF0ZUNvcnJlbGF0aW9uSWQoKSxcclxuICAgICAgY29udGV4dCxcclxuICAgICAgZXJyb3JUeXBlOiBlcnJvcj8uY29uc3RydWN0b3I/Lm5hbWUgfHwgJ1Vua25vd24nLFxyXG4gICAgICBlcnJvck1lc3NhZ2U6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKSxcclxuICAgICAgc3RhY2s6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5zdGFjayA6IHVuZGVmaW5lZCxcclxuICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcclxuICAgIH07XHJcblxyXG4gICAgaWYgKGVycm9yIGluc3RhbmNlb2YgQXBwRXJyb3IpIHtcclxuICAgICAgdGhpcy5sb2dnZXIud2FybignQXBwbGljYXRpb24gZXJyb3Igb2NjdXJyZWQnLCBlcnJvckluZm8pO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ1VuZXhwZWN0ZWQgZXJyb3Igb2NjdXJyZWQnLCBlcnJvciBhcyBFcnJvciwgZXJyb3JJbmZvKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdlbmVyYXRlIGNvcnJlbGF0aW9uIElEIGZvciByZXF1ZXN0IHRyYWNraW5nXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBnZW5lcmF0ZUNvcnJlbGF0aW9uSWQoKTogc3RyaW5nIHtcclxuICAgIHJldHVybiBgJHtEYXRlLm5vdygpfS0ke01hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cmluZygyLCAxNSl9YDtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCBIVFRQIHN0YXR1cyBjb2RlIGZvciBlcnJvciBjb2RlXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBnZXRIdHRwU3RhdHVzQ29kZShlcnJvckNvZGU6IHN0cmluZyk6IG51bWJlciB7XHJcbiAgICBjb25zdCBzdGF0dXNDb2RlTWFwOiBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+ID0ge1xyXG4gICAgICAnVU5BVVRIT1JJWkVEJzogNDAxLFxyXG4gICAgICAnRk9SQklEREVOJzogNDAzLFxyXG4gICAgICAnTk9UX0ZPVU5EJzogNDA0LFxyXG4gICAgICAnVkFMSURBVElPTl9FUlJPUic6IDQwMCxcclxuICAgICAgJ0lOVkFMSURfSU5QVVQnOiA0MDAsXHJcbiAgICAgICdNSVNTSU5HX1JFUVVJUkVEX0ZJRUxEJzogNDAwLFxyXG4gICAgICAnSU5WQUxJRF9GT1JNQVQnOiA0MDAsXHJcbiAgICAgICdGSUxFX1RPT19MQVJHRSc6IDQwMCxcclxuICAgICAgJ0lOVkFMSURfRklMRV9UWVBFJzogNDAwLFxyXG4gICAgICAnQ09ORkxJQ1QnOiA0MDksXHJcbiAgICAgICdSQVRFX0xJTUlUX0VYQ0VFREVEJzogNDI5LFxyXG4gICAgICAnUVVPVEFfRVhDRUVERUQnOiA0MjksXHJcbiAgICAgICdJTlRFUk5BTF9FUlJPUic6IDUwMCxcclxuICAgICAgJ0RBVEFCQVNFX0VSUk9SJzogNTAwLFxyXG4gICAgICAnRVhURVJOQUxfU0VSVklDRV9FUlJPUic6IDUwMyxcclxuICAgICAgJ1NFUlZJQ0VfVU5BVkFJTEFCTEUnOiA1MDMsXHJcbiAgICAgICdDSVJDVUlUX0JSRUFLRVJfT1BFTic6IDUwMyxcclxuICAgICAgJ1RJTUVPVVRfRVJST1InOiA1MDQsXHJcbiAgICAgICdORVRXT1JLX0VSUk9SJzogNTAyXHJcbiAgICB9O1xyXG5cclxuICAgIHJldHVybiBzdGF0dXNDb2RlTWFwW2Vycm9yQ29kZV0gfHwgNTAwO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IHN5c3RlbSBoZWFsdGggc3RhdHVzXHJcbiAgICovXHJcbiAgYXN5bmMgZ2V0U3lzdGVtSGVhbHRoKCk6IFByb21pc2U8e1xyXG4gICAgc3RhdHVzOiAnaGVhbHRoeScgfCAnZGVncmFkZWQnIHwgJ3VuaGVhbHRoeSc7XHJcbiAgICBzZXJ2aWNlczogUmVjb3JkPHN0cmluZywgYm9vbGVhbj47XHJcbiAgICBjaXJjdWl0QnJlYWtlcnM6IFJlY29yZDxzdHJpbmcsIGFueT47XHJcbiAgICB0aW1lc3RhbXA6IHN0cmluZztcclxuICB9PiB7XHJcbiAgICBjb25zdCBjaXJjdWl0QnJlYWtlck1ldHJpY3MgPSBjaXJjdWl0QnJlYWtlck1hbmFnZXIuZ2V0QWxsTWV0cmljcygpO1xyXG4gICAgY29uc3Qgc2VydmljZUhlYWx0aCA9IGF3YWl0IGdyYWNlZnVsRGVncmFkYXRpb25TZXJ2aWNlLnBlcmZvcm1IZWFsdGhDaGVjaygpO1xyXG4gICAgXHJcbiAgICBjb25zdCB1bmhlYWx0aHlTZXJ2aWNlcyA9IE9iamVjdC52YWx1ZXMoc2VydmljZUhlYWx0aCkuZmlsdGVyKGhlYWx0aHkgPT4gIWhlYWx0aHkpLmxlbmd0aDtcclxuICAgIGNvbnN0IHRvdGFsU2VydmljZXMgPSBPYmplY3Qua2V5cyhzZXJ2aWNlSGVhbHRoKS5sZW5ndGg7XHJcbiAgICBcclxuICAgIGxldCBzdGF0dXM6ICdoZWFsdGh5JyB8ICdkZWdyYWRlZCcgfCAndW5oZWFsdGh5JztcclxuICAgIGlmICh1bmhlYWx0aHlTZXJ2aWNlcyA9PT0gMCkge1xyXG4gICAgICBzdGF0dXMgPSAnaGVhbHRoeSc7XHJcbiAgICB9IGVsc2UgaWYgKHVuaGVhbHRoeVNlcnZpY2VzIDwgdG90YWxTZXJ2aWNlcyAvIDIpIHtcclxuICAgICAgc3RhdHVzID0gJ2RlZ3JhZGVkJztcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHN0YXR1cyA9ICd1bmhlYWx0aHknO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1cyxcclxuICAgICAgc2VydmljZXM6IHNlcnZpY2VIZWFsdGgsXHJcbiAgICAgIGNpcmN1aXRCcmVha2VyczogY2lyY3VpdEJyZWFrZXJNZXRyaWNzLFxyXG4gICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFJlc2V0IGFsbCBlcnJvciBoYW5kbGluZyBjb21wb25lbnRzXHJcbiAgICovXHJcbiAgcmVzZXRBbGwoKTogdm9pZCB7XHJcbiAgICBjaXJjdWl0QnJlYWtlck1hbmFnZXIucmVzZXRBbGwoKTtcclxuICAgIGdyYWNlZnVsRGVncmFkYXRpb25TZXJ2aWNlLmNsZWFyQ2FjaGUoKTtcclxuICB9XHJcbn1cclxuXHJcbi8vIEdsb2JhbCBjZW50cmFsaXplZCBlcnJvciBoYW5kbGVyIGluc3RhbmNlXHJcbmV4cG9ydCBjb25zdCBjZW50cmFsaXplZEVycm9ySGFuZGxlciA9IG5ldyBDZW50cmFsaXplZEVycm9ySGFuZGxlcigpOyJdfQ==