import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { LogContext } from '../utils/structured-logger';
export interface CorrelationContext extends LogContext {
    correlationId: string;
    requestId: string;
    userId?: string;
    userAgent?: string;
    sourceIp?: string;
}
/**
 * Correlation Middleware for Lambda Functions
 *
 * Automatically injects correlation IDs into Lambda function context
 * and provides structured logging capabilities for request tracing.
 */
export declare class CorrelationMiddleware {
    private logger;
    constructor();
    /**
     * Wrap Lambda handler with correlation ID injection
     */
    withCorrelation<T = APIGatewayProxyResult>(handler: (event: APIGatewayProxyEvent, context: Context, correlationContext: CorrelationContext) => Promise<T>): (event: APIGatewayProxyEvent, context: Context) => Promise<T>;
    /**
     * Create correlation context for non-API Gateway Lambda functions
     */
    createCorrelationContext(context: Context, additionalContext?: Partial<LogContext>): CorrelationContext;
    /**
     * Log workflow step with correlation context
     */
    logWorkflowStep(step: string, status: 'started' | 'completed' | 'failed', correlationContext: CorrelationContext, additionalContext?: LogContext): void;
    /**
     * Log analysis progress with correlation context
     */
    logAnalysisProgress(analysisId: string, progress: number, rulesProcessed: number, totalRules: number, correlationContext: CorrelationContext, additionalContext?: LogContext): void;
    /**
     * Log authentication event with correlation context
     */
    logAuthEvent(event: string, success: boolean, correlationContext: CorrelationContext, additionalContext?: LogContext): void;
    private extractCorrelationId;
    private extractUserId;
    private isApiGatewayResponse;
}
export declare const correlationMiddleware: CorrelationMiddleware;
/**
 * Decorator for Lambda handlers to automatically inject correlation context
 */
export declare function withCorrelation<T = APIGatewayProxyResult>(handler: (event: APIGatewayProxyEvent, context: Context, correlationContext: CorrelationContext) => Promise<T>): (event: APIGatewayProxyEvent, context: Context) => Promise<T>;
/**
 * Utility function to create correlation context for non-API Gateway functions
 */
export declare function createCorrelationContext(context: Context, additionalContext?: Partial<LogContext>): CorrelationContext;
