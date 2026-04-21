import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { StructuredLogger, LogContext } from '../utils/structured-logger';

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
export class CorrelationMiddleware {
  private logger: StructuredLogger;

  constructor() {
    this.logger = new StructuredLogger();
  }

  /**
   * Wrap Lambda handler with correlation ID injection
   */
  withCorrelation<T = APIGatewayProxyResult>(
    handler: (event: APIGatewayProxyEvent, context: Context, correlationContext: CorrelationContext) => Promise<T>
  ) {
    return async (event: APIGatewayProxyEvent, context: Context): Promise<T> => {
      const startTime = Date.now();
      
      // Extract or generate correlation ID
      const correlationId = this.extractCorrelationId(event);
      
      // Build correlation context
      const correlationContext: CorrelationContext = {
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
        this.logger.logPerformance(
          `${event.httpMethod} ${event.resource}`,
          duration,
          true,
          correlationContext
        );

        // Add correlation ID to response headers if it's an API Gateway response
        if (this.isApiGatewayResponse(result)) {
          result.headers = {
            ...result.headers,
            'X-Correlation-ID': correlationId,
          };
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        // Log error with correlation context
        this.logger.log('ERROR', 'Request failed', {
          ...correlationContext,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          duration,
        });

        // Log performance metric for failed request
        this.logger.logPerformance(
          `${event.httpMethod} ${event.resource}`,
          duration,
          false,
          correlationContext
        );

        throw error;
      }
    };
  }

  /**
   * Create correlation context for non-API Gateway Lambda functions
   */
  createCorrelationContext(
    context: Context,
    additionalContext: Partial<LogContext> = {}
  ): CorrelationContext {
    return {
      correlationId: StructuredLogger.generateCorrelationId(),
      requestId: context.awsRequestId,
      ...additionalContext,
    };
  }

  /**
   * Log workflow step with correlation context
   */
  logWorkflowStep(
    step: string,
    status: 'started' | 'completed' | 'failed',
    correlationContext: CorrelationContext,
    additionalContext: LogContext = {}
  ): void {
    this.logger.logWorkflowStep(step, status, {
      ...correlationContext,
      ...additionalContext,
    });
  }

  /**
   * Log analysis progress with correlation context
   */
  logAnalysisProgress(
    analysisId: string,
    progress: number,
    rulesProcessed: number,
    totalRules: number,
    correlationContext: CorrelationContext,
    additionalContext: LogContext = {}
  ): void {
    this.logger.logAnalysisProgress(
      analysisId,
      progress,
      rulesProcessed,
      totalRules,
      {
        ...correlationContext,
        ...additionalContext,
      }
    );
  }

  /**
   * Log authentication event with correlation context
   */
  logAuthEvent(
    event: string,
    success: boolean,
    correlationContext: CorrelationContext,
    additionalContext: LogContext = {}
  ): void {
    this.logger.logAuthEvent(event, success, {
      ...correlationContext,
      ...additionalContext,
    });
  }

  private extractCorrelationId(event: APIGatewayProxyEvent): string {
    // Try to get correlation ID from headers
    const headerName = process.env.CORRELATION_ID_HEADER || 'X-Correlation-ID';
    const correlationId = 
      event.headers[headerName] || 
      event.headers[headerName.toLowerCase()] ||
      event.headers['x-correlation-id'];

    // Generate new correlation ID if not provided
    return correlationId || StructuredLogger.generateCorrelationId();
  }

  private extractUserId(event: APIGatewayProxyEvent): string | undefined {
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

  private isApiGatewayResponse(result: any): result is APIGatewayProxyResult {
    return (
      result &&
      typeof result === 'object' &&
      typeof result.statusCode === 'number' &&
      (result.headers === undefined || typeof result.headers === 'object')
    );
  }
}

// Export singleton instance
export const correlationMiddleware = new CorrelationMiddleware();

/**
 * Decorator for Lambda handlers to automatically inject correlation context
 */
export function withCorrelation<T = APIGatewayProxyResult>(
  handler: (event: APIGatewayProxyEvent, context: Context, correlationContext: CorrelationContext) => Promise<T>
) {
  return correlationMiddleware.withCorrelation(handler);
}

/**
 * Utility function to create correlation context for non-API Gateway functions
 */
export function createCorrelationContext(
  context: Context,
  additionalContext: Partial<LogContext> = {}
): CorrelationContext {
  return correlationMiddleware.createCorrelationContext(context, additionalContext);
}