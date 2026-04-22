"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.correlationMiddleware = exports.CorrelationMiddleware = void 0;
exports.withCorrelation = withCorrelation;
exports.createCorrelationContext = createCorrelationContext;
const structured_logger_1 = require("../utils/structured-logger");
/**
 * Correlation Middleware for Lambda Functions
 *
 * Automatically injects correlation IDs into Lambda function context
 * and provides structured logging capabilities for request tracing.
 */
class CorrelationMiddleware {
    logger;
    constructor() {
        this.logger = new structured_logger_1.StructuredLogger();
    }
    /**
     * Wrap Lambda handler with correlation ID injection
     */
    withCorrelation(handler) {
        return async (event, context) => {
            const startTime = Date.now();
            // Extract or generate correlation ID
            const correlationId = this.extractCorrelationId(event);
            // Build correlation context
            const correlationContext = {
                correlationId,
                requestId: context.awsRequestId,
                userId: this.extractUserId(event),
                userAgent: event.headers['User-Agent'] || event.headers['user-agent'],
                sourceIp: event.requestContext?.identity?.sourceIp,
            };
            // Log request start
            this.logger.log('INFO', 'Request started', {
                ...correlationContext,
                httpMethod: event.httpMethod,
                path: event.path,
                resource: event.resource,
            });
            try {
                // Execute handler with correlation context
                const result = await handler(event, context, correlationContext);
                const duration = Date.now() - startTime;
                // Log successful completion
                this.logger.logPerformance(`${event.httpMethod} ${event.resource}`, duration, true, correlationContext);
                // Add correlation ID to response headers if it's an API Gateway response
                if (this.isApiGatewayResponse(result)) {
                    result.headers = {
                        ...result.headers,
                        'X-Correlation-ID': correlationId,
                    };
                }
                return result;
            }
            catch (error) {
                const duration = Date.now() - startTime;
                // Log error with correlation context
                this.logger.log('ERROR', 'Request failed', {
                    ...correlationContext,
                    error: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined,
                    duration,
                });
                // Log performance metric for failed request
                this.logger.logPerformance(`${event.httpMethod} ${event.resource}`, duration, false, correlationContext);
                throw error;
            }
        };
    }
    /**
     * Create correlation context for non-API Gateway Lambda functions
     */
    createCorrelationContext(context, additionalContext = {}) {
        return {
            correlationId: structured_logger_1.StructuredLogger.generateCorrelationId(),
            requestId: context.awsRequestId,
            ...additionalContext,
        };
    }
    /**
     * Log workflow step with correlation context
     */
    logWorkflowStep(step, status, correlationContext, additionalContext = {}) {
        this.logger.logWorkflowStep(step, status, {
            ...correlationContext,
            ...additionalContext,
        });
    }
    /**
     * Log analysis progress with correlation context
     */
    logAnalysisProgress(analysisId, progress, rulesProcessed, totalRules, correlationContext, additionalContext = {}) {
        this.logger.logAnalysisProgress(analysisId, progress, rulesProcessed, totalRules, {
            ...correlationContext,
            ...additionalContext,
        });
    }
    /**
     * Log authentication event with correlation context
     */
    logAuthEvent(event, success, correlationContext, additionalContext = {}) {
        this.logger.logAuthEvent(event, success, {
            ...correlationContext,
            ...additionalContext,
        });
    }
    extractCorrelationId(event) {
        // Try to get correlation ID from headers
        const headerName = process.env.CORRELATION_ID_HEADER || 'X-Correlation-ID';
        const correlationId = event.headers[headerName] ||
            event.headers[headerName.toLowerCase()] ||
            event.headers['x-correlation-id'];
        // Generate new correlation ID if not provided
        return correlationId || structured_logger_1.StructuredLogger.generateCorrelationId();
    }
    extractUserId(event) {
        // Try to extract user ID from JWT token in authorizer context
        const authorizerContext = event.requestContext?.authorizer;
        if (authorizerContext && typeof authorizerContext === 'object') {
            return authorizerContext.userId || authorizerContext.sub;
        }
        // Try to extract from path parameters
        if (event.pathParameters?.userId) {
            return event.pathParameters.userId;
        }
        return undefined;
    }
    isApiGatewayResponse(result) {
        return (result &&
            typeof result === 'object' &&
            typeof result.statusCode === 'number' &&
            (result.headers === undefined || typeof result.headers === 'object'));
    }
}
exports.CorrelationMiddleware = CorrelationMiddleware;
// Export singleton instance
exports.correlationMiddleware = new CorrelationMiddleware();
/**
 * Decorator for Lambda handlers to automatically inject correlation context
 */
function withCorrelation(handler) {
    return exports.correlationMiddleware.withCorrelation(handler);
}
/**
 * Utility function to create correlation context for non-API Gateway functions
 */
function createCorrelationContext(context, additionalContext = {}) {
    return exports.correlationMiddleware.createCorrelationContext(context, additionalContext);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29ycmVsYXRpb24tbWlkZGxld2FyZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNvcnJlbGF0aW9uLW1pZGRsZXdhcmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBa05BLDBDQUlDO0FBS0QsNERBS0M7QUEvTkQsa0VBQTBFO0FBVTFFOzs7OztHQUtHO0FBQ0gsTUFBYSxxQkFBcUI7SUFDeEIsTUFBTSxDQUFtQjtJQUVqQztRQUNFLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxvQ0FBZ0IsRUFBRSxDQUFDO0lBQ3ZDLENBQUM7SUFFRDs7T0FFRztJQUNILGVBQWUsQ0FDYixPQUE4RztRQUU5RyxPQUFPLEtBQUssRUFBRSxLQUEyQixFQUFFLE9BQWdCLEVBQWMsRUFBRTtZQUN6RSxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7WUFFN0IscUNBQXFDO1lBQ3JDLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUV2RCw0QkFBNEI7WUFDNUIsTUFBTSxrQkFBa0IsR0FBdUI7Z0JBQzdDLGFBQWE7Z0JBQ2IsU0FBUyxFQUFFLE9BQU8sQ0FBQyxZQUFZO2dCQUMvQixNQUFNLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUM7Z0JBQ2pDLFNBQVMsRUFBRSxLQUFLLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDO2dCQUNyRSxRQUFRLEVBQUUsS0FBSyxDQUFDLGNBQWMsRUFBRSxRQUFRLEVBQUUsUUFBUTthQUNuRCxDQUFDO1lBRUYsb0JBQW9CO1lBQ3BCLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxpQkFBaUIsRUFBRTtnQkFDekMsR0FBRyxrQkFBa0I7Z0JBQ3JCLFVBQVUsRUFBRSxLQUFLLENBQUMsVUFBVTtnQkFDNUIsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJ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LENBQUMsTUFBTSxDQUFDLE9BQU8sS0FBSyxTQUFTLElBQUksT0FBTyxNQUFNLENBQUMsT0FBTyxLQUFLLFFBQVEsQ0FBQyxDQUNyRSxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBekxELHNEQXlMQztBQUVELDRCQUE0QjtBQUNmLFFBQUEscUJBQXFCLEdBQUcsSUFBSSxxQkFBcUIsRUFBRSxDQUFDO0FBRWpFOztHQUVHO0FBQ0gsU0FBZ0IsZUFBZSxDQUM3QixPQUE4RztJQUU5RyxPQUFPLDZCQUFxQixDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUN4RCxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxTQUFnQix3QkFBd0IsQ0FDdEMsT0FBZ0IsRUFDaEIsb0JBQXlDLEVBQUU7SUFFM0MsT0FBTyw2QkFBcUIsQ0FBQyx3QkFBd0IsQ0FBQyxPQUFPLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztBQUNwRixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCwgQ29udGV4dCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBTdHJ1Y3R1cmVkTG9nZ2VyLCBMb2dDb250ZXh0IH0gZnJvbSAnLi4vdXRpbHMvc3RydWN0dXJlZC1sb2dnZXInO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBDb3JyZWxhdGlvbkNvbnRleHQgZXh0ZW5kcyBMb2dDb250ZXh0IHtcclxuICBjb3JyZWxhdGlvbklkOiBzdHJpbmc7XHJcbiAgcmVxdWVzdElkOiBzdHJpbmc7XHJcbiAgdXNlcklkPzogc3RyaW5nO1xyXG4gIHVzZXJBZ2VudD86IHN0cmluZztcclxuICBzb3VyY2VJcD86IHN0cmluZztcclxufVxyXG5cclxuLyoqXHJcbiAqIENvcnJlbGF0aW9uIE1pZGRsZXdhcmUgZm9yIExhbWJkYSBGdW5jdGlvbnNcclxuICogXHJcbiAqIEF1dG9tYXRpY2FsbHkgaW5qZWN0cyBjb3JyZWxhdGlvbiBJRHMgaW50byBMYW1iZGEgZnVuY3Rpb24gY29udGV4dFxyXG4gKiBhbmQgcHJvdmlkZXMgc3RydWN0dXJlZCBsb2dnaW5nIGNhcGFiaWxpdGllcyBmb3IgcmVxdWVzdCB0cmFjaW5nLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIENvcnJlbGF0aW9uTWlkZGxld2FyZSB7XHJcbiAgcHJpdmF0ZSBsb2dnZXI6IFN0cnVjdHVyZWRMb2dnZXI7XHJcblxyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgdGhpcy5sb2dnZXIgPSBuZXcgU3RydWN0dXJlZExvZ2dlcigpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogV3JhcCBMYW1iZGEgaGFuZGxlciB3aXRoIGNvcnJlbGF0aW9uIElEIGluamVjdGlvblxyXG4gICAqL1xyXG4gIHdpdGhDb3JyZWxhdGlvbjxUID0gQVBJR2F0ZXdheVByb3h5UmVzdWx0PihcclxuICAgIGhhbmRsZXI6IChldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQsIGNvbnRleHQ6IENvbnRleHQsIGNvcnJlbGF0aW9uQ29udGV4dDogQ29ycmVsYXRpb25Db250ZXh0KSA9PiBQcm9taXNlPFQ+XHJcbiAgKSB7XHJcbiAgICByZXR1cm4gYXN5bmMgKGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCwgY29udGV4dDogQ29udGV4dCk6IFByb21pc2U8VD4gPT4ge1xyXG4gICAgICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xyXG4gICAgICBcclxuICAgICAgLy8gRXh0cmFjdCBvciBnZW5lcmF0ZSBjb3JyZWxhdGlvbiBJRFxyXG4gICAgICBjb25zdCBjb3JyZWxhdGlvbklkID0gdGhpcy5leHRyYWN0Q29ycmVsYXRpb25JZChldmVudCk7XHJcbiAgICAgIFxyXG4gICAgICAvLyBCdWlsZCBjb3JyZWxhdGlvbiBjb250ZXh0XHJcbiAgICAgIGNvbnN0IGNvcnJlbGF0aW9uQ29udGV4dDogQ29ycmVsYXRpb25Db250ZXh0ID0ge1xyXG4gICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgcmVxdWVzdElkOiBjb250ZXh0LmF3c1JlcXVlc3RJZCxcclxuICAgICAgICB1c2VySWQ6IHRoaXMuZXh0cmFjdFVzZXJJZChldmVudCksXHJcbiAgICAgICAgdXNlckFnZW50OiBldmVudC5oZWFkZXJzWydVc2VyLUFnZW50J10gfHwgZXZlbnQuaGVhZGVyc1sndXNlci1hZ2VudCddLFxyXG4gICAgICAgIHNvdXJjZUlwOiBldmVudC5yZXF1ZXN0Q29udGV4dD8uaWRlbnRpdHk/LnNvdXJjZUlwLFxyXG4gICAgICB9O1xyXG5cclxuICAgICAgLy8gTG9nIHJlcXVlc3Qgc3RhcnRcclxuICAgICAgdGhpcy5sb2dnZXIubG9nKCdJTkZPJywgJ1JlcXVlc3Qgc3RhcnRlZCcsIHtcclxuICAgICAgICAuLi5jb3JyZWxhdGlvbkNvbnRleHQsXHJcbiAgICAgICAgaHR0cE1ldGhvZDogZXZlbnQuaHR0cE1ldGhvZCxcclxuICAgICAgICBwYXRoOiBldmVudC5wYXRoLFxyXG4gICAgICAgIHJlc291cmNlOiBldmVudC5yZXNvdXJjZSxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICB0cnkge1xyXG4gICAgICAgIC8vIEV4ZWN1dGUgaGFuZGxlciB3aXRoIGNvcnJlbGF0aW9uIGNvbnRleHRcclxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50LCBjb250ZXh0LCBjb3JyZWxhdGlvbkNvbnRleHQpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGNvbnN0IGR1cmF0aW9uID0gRGF0ZS5ub3coKSAtIHN0YXJ0VGltZTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBMb2cgc3VjY2Vzc2Z1bCBjb21wbGV0aW9uXHJcbiAgICAgICAgdGhpcy5sb2dnZXIubG9nUGVyZm9ybWFuY2UoXHJcbiAgICAgICAgICBgJHtldmVudC5odHRwTWV0aG9kfSAke2V2ZW50LnJlc291cmNlfWAsXHJcbiAgICAgICAgICBkdXJhdGlvbixcclxuICAgICAgICAgIHRydWUsXHJcbiAgICAgICAgICBjb3JyZWxhdGlvbkNvbnRleHRcclxuICAgICAgICApO1xyXG5cclxuICAgICAgICAvLyBBZGQgY29ycmVsYXRpb24gSUQgdG8gcmVzcG9uc2UgaGVhZGVycyBpZiBpdCdzIGFuIEFQSSBHYXRld2F5IHJlc3BvbnNlXHJcbiAgICAgICAgaWYgKHRoaXMuaXNBcGlHYXRld2F5UmVzcG9uc2UocmVzdWx0KSkge1xyXG4gICAgICAgICAgcmVzdWx0LmhlYWRlcnMgPSB7XHJcbiAgICAgICAgICAgIC4uLnJlc3VsdC5oZWFkZXJzLFxyXG4gICAgICAgICAgICAnWC1Db3JyZWxhdGlvbi1JRCc6IGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICBjb25zdCBkdXJhdGlvbiA9IERhdGUubm93KCkgLSBzdGFydFRpbWU7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gTG9nIGVycm9yIHdpdGggY29ycmVsYXRpb24gY29udGV4dFxyXG4gICAgICAgIHRoaXMubG9nZ2VyLmxvZygnRVJST1InLCAnUmVxdWVzdCBmYWlsZWQnLCB7XHJcbiAgICAgICAgICAuLi5jb3JyZWxhdGlvbkNvbnRleHQsXHJcbiAgICAgICAgICBlcnJvcjogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpLFxyXG4gICAgICAgICAgc3RhY2s6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5zdGFjayA6IHVuZGVmaW5lZCxcclxuICAgICAgICAgIGR1cmF0aW9uLFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBMb2cgcGVyZm9ybWFuY2UgbWV0cmljIGZvciBmYWlsZWQgcmVxdWVzdFxyXG4gICAgICAgIHRoaXMubG9nZ2VyLmxvZ1BlcmZvcm1hbmNlKFxyXG4gICAgICAgICAgYCR7ZXZlbnQuaHR0cE1ldGhvZH0gJHtldmVudC5yZXNvdXJjZX1gLFxyXG4gICAgICAgICAgZHVyYXRpb24sXHJcbiAgICAgICAgICBmYWxzZSxcclxuICAgICAgICAgIGNvcnJlbGF0aW9uQ29udGV4dFxyXG4gICAgICAgICk7XHJcblxyXG4gICAgICAgIHRocm93IGVycm9yO1xyXG4gICAgICB9XHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ3JlYXRlIGNvcnJlbGF0aW9uIGNvbnRleHQgZm9yIG5vbi1BUEkgR2F0ZXdheSBMYW1iZGEgZnVuY3Rpb25zXHJcbiAgICovXHJcbiAgY3JlYXRlQ29ycmVsYXRpb25Db250ZXh0KFxyXG4gICAgY29udGV4dDogQ29udGV4dCxcclxuICAgIGFkZGl0aW9uYWxDb250ZXh0OiBQYXJ0aWFsPExvZ0NvbnRleHQ+ID0ge31cclxuICApOiBDb3JyZWxhdGlvbkNvbnRleHQge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgY29ycmVsYXRpb25JZDogU3RydWN0dXJlZExvZ2dlci5nZW5lcmF0ZUNvcnJlbGF0aW9uSWQoKSxcclxuICAgICAgcmVxdWVzdElkOiBjb250ZXh0LmF3c1JlcXVlc3RJZCxcclxuICAgICAgLi4uYWRkaXRpb25hbENvbnRleHQsXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogTG9nIHdvcmtmbG93IHN0ZXAgd2l0aCBjb3JyZWxhdGlvbiBjb250ZXh0XHJcbiAgICovXHJcbiAgbG9nV29ya2Zsb3dTdGVwKFxyXG4gICAgc3RlcDogc3RyaW5nLFxyXG4gICAgc3RhdHVzOiAnc3RhcnRlZCcgfCAnY29tcGxldGVkJyB8ICdmYWlsZWQnLFxyXG4gICAgY29ycmVsYXRpb25Db250ZXh0OiBDb3JyZWxhdGlvbkNvbnRleHQsXHJcbiAgICBhZGRpdGlvbmFsQ29udGV4dDogTG9nQ29udGV4dCA9IHt9XHJcbiAgKTogdm9pZCB7XHJcbiAgICB0aGlzLmxvZ2dlci5sb2dXb3JrZmxvd1N0ZXAoc3RlcCwgc3RhdHVzLCB7XHJcbiAgICAgIC4uLmNvcnJlbGF0aW9uQ29udGV4dCxcclxuICAgICAgLi4uYWRkaXRpb25hbENvbnRleHQsXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIExvZyBhbmFseXNpcyBwcm9ncmVzcyB3aXRoIGNvcnJlbGF0aW9uIGNvbnRleHRcclxuICAgKi9cclxuICBsb2dBbmFseXNpc1Byb2dyZXNzKFxyXG4gICAgYW5hbHlzaXNJZDogc3RyaW5nLFxyXG4gICAgcHJvZ3Jlc3M6IG51bWJlcixcclxuICAgIHJ1bGVzUHJvY2Vzc2VkOiBudW1iZXIsXHJcbiAgICB0b3RhbFJ1bGVzOiBudW1iZXIsXHJcbiAgICBjb3JyZWxhdGlvbkNvbnRleHQ6IENvcnJlbGF0aW9uQ29udGV4dCxcclxuICAgIGFkZGl0aW9uYWxDb250ZXh0OiBMb2dDb250ZXh0ID0ge31cclxuICApOiB2b2lkIHtcclxuICAgIHRoaXMubG9nZ2VyLmxvZ0FuYWx5c2lzUHJvZ3Jlc3MoXHJcbiAgICAgIGFuYWx5c2lzSWQsXHJcbiAgICAgIHByb2dyZXNzLFxyXG4gICAgICBydWxlc1Byb2Nlc3NlZCxcclxuICAgICAgdG90YWxSdWxlcyxcclxuICAgICAge1xyXG4gICAgICAgIC4uLmNvcnJlbGF0aW9uQ29udGV4dCxcclxuICAgICAgICAuLi5hZGRpdGlvbmFsQ29udGV4dCxcclxuICAgICAgfVxyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIExvZyBhdXRoZW50aWNhdGlvbiBldmVudCB3aXRoIGNvcnJlbGF0aW9uIGNvbnRleHRcclxuICAgKi9cclxuICBsb2dBdXRoRXZlbnQoXHJcbiAgICBldmVudDogc3RyaW5nLFxyXG4gICAgc3VjY2VzczogYm9vbGVhbixcclxuICAgIGNvcnJlbGF0aW9uQ29udGV4dDogQ29ycmVsYXRpb25Db250ZXh0LFxyXG4gICAgYWRkaXRpb25hbENvbnRleHQ6IExvZ0NvbnRleHQgPSB7fVxyXG4gICk6IHZvaWQge1xyXG4gICAgdGhpcy5sb2dnZXIubG9nQXV0aEV2ZW50KGV2ZW50LCBzdWNjZXNzLCB7XHJcbiAgICAgIC4uLmNvcnJlbGF0aW9uQ29udGV4dCxcclxuICAgICAgLi4uYWRkaXRpb25hbENvbnRleHQsXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgZXh0cmFjdENvcnJlbGF0aW9uSWQoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogc3RyaW5nIHtcclxuICAgIC8vIFRyeSB0byBnZXQgY29ycmVsYXRpb24gSUQgZnJvbSBoZWFkZXJzXHJcbiAgICBjb25zdCBoZWFkZXJOYW1lID0gcHJvY2Vzcy5lbnYuQ09SUkVMQVRJT05fSURfSEVBREVSIHx8ICdYLUNvcnJlbGF0aW9uLUlEJztcclxuICAgIGNvbnN0IGNvcnJlbGF0aW9uSWQgPSBcclxuICAgICAgZXZlbnQuaGVhZGVyc1toZWFkZXJOYW1lXSB8fCBcclxuICAgICAgZXZlbnQuaGVhZGVyc1toZWFkZXJOYW1lLnRvTG93ZXJDYXNlKCldIHx8XHJcbiAgICAgIGV2ZW50LmhlYWRlcnNbJ3gtY29ycmVsYXRpb24taWQnXTtcclxuXHJcbiAgICAvLyBHZW5lcmF0ZSBuZXcgY29ycmVsYXRpb24gSUQgaWYgbm90IHByb3ZpZGVkXHJcbiAgICByZXR1cm4gY29ycmVsYXRpb25JZCB8fCBTdHJ1Y3R1cmVkTG9nZ2VyLmdlbmVyYXRlQ29ycmVsYXRpb25JZCgpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBleHRyYWN0VXNlcklkKGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XHJcbiAgICAvLyBUcnkgdG8gZXh0cmFjdCB1c2VyIElEIGZyb20gSldUIHRva2VuIGluIGF1dGhvcml6ZXIgY29udGV4dFxyXG4gICAgY29uc3QgYXV0aG9yaXplckNvbnRleHQgPSBldmVudC5yZXF1ZXN0Q29udGV4dD8uYXV0aG9yaXplcjtcclxuICAgIGlmIChhdXRob3JpemVyQ29udGV4dCAmJiB0eXBlb2YgYXV0aG9yaXplckNvbnRleHQgPT09ICdvYmplY3QnKSB7XHJcbiAgICAgIHJldHVybiBhdXRob3JpemVyQ29udGV4dC51c2VySWQgfHwgYXV0aG9yaXplckNvbnRleHQuc3ViO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFRyeSB0byBleHRyYWN0IGZyb20gcGF0aCBwYXJhbWV0ZXJzXHJcbiAgICBpZiAoZXZlbnQucGF0aFBhcmFtZXRlcnM/LnVzZXJJZCkge1xyXG4gICAgICByZXR1cm4gZXZlbnQucGF0aFBhcmFtZXRlcnMudXNlcklkO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGlzQXBpR2F0ZXdheVJlc3BvbnNlKHJlc3VsdDogYW55KTogcmVzdWx0IGlzIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB7XHJcbiAgICByZXR1cm4gKFxyXG4gICAgICByZXN1bHQgJiZcclxuICAgICAgdHlwZW9mIHJlc3VsdCA9PT0gJ29iamVjdCcgJiZcclxuICAgICAgdHlwZW9mIHJlc3VsdC5zdGF0dXNDb2RlID09PSAnbnVtYmVyJyAmJlxyXG4gICAgICAocmVzdWx0LmhlYWRlcnMgPT09IHVuZGVmaW5lZCB8fCB0eXBlb2YgcmVzdWx0LmhlYWRlcnMgPT09ICdvYmplY3QnKVxyXG4gICAgKTtcclxuICB9XHJcbn1cclxuXHJcbi8vIEV4cG9ydCBzaW5nbGV0b24gaW5zdGFuY2VcclxuZXhwb3J0IGNvbnN0IGNvcnJlbGF0aW9uTWlkZGxld2FyZSA9IG5ldyBDb3JyZWxhdGlvbk1pZGRsZXdhcmUoKTtcclxuXHJcbi8qKlxyXG4gKiBEZWNvcmF0b3IgZm9yIExhbWJkYSBoYW5kbGVycyB0byBhdXRvbWF0aWNhbGx5IGluamVjdCBjb3JyZWxhdGlvbiBjb250ZXh0XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gd2l0aENvcnJlbGF0aW9uPFQgPSBBUElHYXRld2F5UHJveHlSZXN1bHQ+KFxyXG4gIGhhbmRsZXI6IChldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQsIGNvbnRleHQ6IENvbnRleHQsIGNvcnJlbGF0aW9uQ29udGV4dDogQ29ycmVsYXRpb25Db250ZXh0KSA9PiBQcm9taXNlPFQ+XHJcbikge1xyXG4gIHJldHVybiBjb3JyZWxhdGlvbk1pZGRsZXdhcmUud2l0aENvcnJlbGF0aW9uKGhhbmRsZXIpO1xyXG59XHJcblxyXG4vKipcclxuICogVXRpbGl0eSBmdW5jdGlvbiB0byBjcmVhdGUgY29ycmVsYXRpb24gY29udGV4dCBmb3Igbm9uLUFQSSBHYXRld2F5IGZ1bmN0aW9uc1xyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUNvcnJlbGF0aW9uQ29udGV4dChcclxuICBjb250ZXh0OiBDb250ZXh0LFxyXG4gIGFkZGl0aW9uYWxDb250ZXh0OiBQYXJ0aWFsPExvZ0NvbnRleHQ+ID0ge31cclxuKTogQ29ycmVsYXRpb25Db250ZXh0IHtcclxuICByZXR1cm4gY29ycmVsYXRpb25NaWRkbGV3YXJlLmNyZWF0ZUNvcnJlbGF0aW9uQ29udGV4dChjb250ZXh0LCBhZGRpdGlvbmFsQ29udGV4dCk7XHJcbn0iXX0=