import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { getUserFromContext } from '../../utils/auth-util';
import { centralizedErrorHandler } from '../../services/error-handling/centralized-error-handler';
import { enhancedRetryService } from '../../services/error-handling/enhanced-retry';
import { cloudWatchMonitoringService } from '../../services/monitoring/cloudwatch-monitoring';
import { createLogger } from '../../utils/logger';

const sqsClient = new SQSClient({});
const logger = createLogger('QueueAnalysisFunction');

interface QueueAnalysisRequest {
  fileId: string;
  fileName: string;
  s3Key: string;
  language: 'C' | 'CPP';
}

/**
 * Queue analysis after S3 upload completes
 * This endpoint is called by the frontend AFTER uploading file to S3
 * This ensures S3 eventual consistency before Lambda tries to download
 * 
 * Requirements: 6.1, 6.3, 8.1
 */
export const handler = centralizedErrorHandler.wrapLambdaHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const startTime = Date.now();
    
    try {
      logger.info('Queue analysis request started', { 
        path: event.path,
        hasBody: !!event.body,
      });
      
      // Extract user from Lambda Authorizer context
      const user = await getUserFromContext(event);
      
      if (!user.userId) {
        logger.warn('Unauthorized queue analysis attempt');
        await cloudWatchMonitoringService.recordError('UNAUTHORIZED', 'queue-analysis-service', 'MISSING_USER');
        throw new Error('User not authenticated');
      }

      logger.info('User authenticated for queue analysis', { 
        userId: user.userId, 
        organizationId: user.organizationId,
      });

      // Parse and validate request body
      if (!event.body) {
        logger.warn('Queue analysis request missing body');
        await cloudWatchMonitoringService.recordError('VALIDATION_ERROR', 'queue-analysis-service', 'MISSING_BODY');
        throw new Error('Request body is required');
      }

      const queueRequest: QueueAnalysisRequest = JSON.parse(event.body);
      logger.info('Queue analysis request parsed', { 
        fileId: queueRequest.fileId, 
        s3Key: queueRequest.s3Key,
        language: queueRequest.language
      });

      // Validate input
      if (!queueRequest.fileId || !queueRequest.s3Key || !queueRequest.language) {
        logger.warn('Queue analysis request missing required fields');
        await cloudWatchMonitoringService.recordError('VALIDATION_ERROR', 'queue-analysis-service', 'MISSING_FIELDS');
        throw new Error('fileId, s3Key, and language are required');
      }

      // Queue analysis with retry
      await queueAnalysisWithRetry(queueRequest, user);

      // Record success metrics
      const duration = Date.now() - startTime;
      await cloudWatchMonitoringService.recordPerformance('queue-analysis', duration, 'queue-analysis-service', true);

      logger.info('Analysis queued successfully', { 
        fileId: queueRequest.fileId, 
        duration 
      });
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        },
        body: JSON.stringify({
          success: true,
          fileId: queueRequest.fileId,
          message: 'Analysis queued successfully'
        }),
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      await cloudWatchMonitoringService.recordPerformance('queue-analysis', duration, 'queue-analysis-service', false);
      
      logger.error('Queue analysis failed', error as Error);
      throw error; // Let centralized error handler manage this
    }
  },
  'queue-analysis-service'
);

/**
 * Queue analysis with retry and graceful failure
 */
async function queueAnalysisWithRetry(
  queueRequest: QueueAnalysisRequest,
  user: any
): Promise<void> {
  const analysisQueueUrl = process.env.ANALYSIS_QUEUE_URL;
  
  if (!analysisQueueUrl) {
    logger.warn('ANALYSIS_QUEUE_URL not configured - analysis will not be triggered');
    throw new Error('Analysis queue not configured');
  }

  try {
    await enhancedRetryService.executeWithRetry(
      async () => {
        logger.info('Queuing analysis', { 
          fileId: queueRequest.fileId, 
          language: queueRequest.language,
          s3Key: queueRequest.s3Key
        });

        await sqsClient.send(new SendMessageCommand({
          QueueUrl: analysisQueueUrl,
          MessageBody: JSON.stringify({
            fileId: queueRequest.fileId,
            fileName: queueRequest.fileName,
            s3Key: queueRequest.s3Key,
            language: queueRequest.language,
            userId: user.userId,
            organizationId: user.organizationId || 'default-org',
          }),
        }));

        logger.info('Analysis queued successfully', { 
          fileId: queueRequest.fileId,
          s3Key: queueRequest.s3Key
        });
      },
      { 
        maxAttempts: 3, 
        initialDelayMs: 500,
        retryableErrors: ['timeout', 'SERVICE_UNAVAILABLE', 'ThrottlingException']
      }
    );

  } catch (error) {
    logger.error('Failed to queue analysis', {
      fileId: queueRequest.fileId,
      error: (error as Error).message
    });

    await cloudWatchMonitoringService.recordError('QUEUE_FAILED', 'queue-analysis-service', 'SQS_ANALYSIS');
    
    throw error;
  }
}
