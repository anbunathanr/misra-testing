/**
 * Get File Status Lambda Function
 * 
 * Returns the current status of a file and its associated analysis
 * Used by the frontend to poll for analysis completion
 * 
 * Request:
 * GET /files/{fileId}/status
 * 
 * Response:
 * {
 *   "fileId": "file-123",
 *   "fileName": "sample.c",
 *   "uploadedAt": 1234567890,
 *   "analysisId": "analysis-456",
 *   "analysisStatus": "completed|pending|failed",
 *   "analysisProgress": 75,
 *   "analysisMessage": "Analyzing...",
 *   "errorMessage": null
 * }
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { corsHeaders } from '../../utils/cors';
import { createLogger } from '../../utils/logger';
import { getUserFromContext } from '../../utils/auth-util';

const logger = createLogger('GetFileStatus');
const dynamoClient = new DynamoDBClient({ 
  region: process.env.AWS_REGION || 'us-east-1' 
});

// Default table names for development
const DEFAULT_FILE_METADATA_TABLE = 'FileMetadata';
const DEFAULT_ANALYSIS_RESULTS_TABLE = 'AnalysisResults';

interface FileStatusResponse {
  fileId: string;
  fileName: string;
  uploadedAt: number;
  analysisId?: string;
  analysisStatus: 'pending' | 'in_progress' | 'completed' | 'failed';
  analysisProgress: number;
  analysisMessage: string;
  errorMessage?: string;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const correlationId = event.headers['X-Correlation-ID'] || Math.random().toString(36).substring(7);
  
  try {
    logger.info('Get file status request received', {
      correlationId,
      path: event.path,
      method: event.httpMethod,
      pathParameters: event.pathParameters
    });

    // Extract fileId from path
    const fileId = event.pathParameters?.fileId;
    if (!fileId) {
      return errorResponse(400, 'MISSING_FILE_ID', 'File ID is required', correlationId);
    }

    // Extract userId from authorizer context using the same utility as upload
    const user = await getUserFromContext(event);
    
    if (!user.userId) {
      logger.error('Missing userId in user context', { 
        correlationId, 
        fileId,
        authorizerContext: JSON.stringify(event.requestContext?.authorizer || {})
      });
      return errorResponse(401, 'UNAUTHORIZED', 'User authentication required', correlationId);
    }
    
    const userId = user.userId;

    logger.info('Fetching file status', {
      correlationId,
      fileId,
      userId
    });

    // Get file metadata - need both fileId (partition key) and userId (sort key)
    const fileMetadataTable = process.env.FILE_METADATA_TABLE || DEFAULT_FILE_METADATA_TABLE;
    const fileMetadata = await dynamoClient.send(new GetCommand({
      TableName: fileMetadataTable,
      Key: { fileId, userId }
    }));

    if (!fileMetadata.Item) {
      logger.warn('File not found', { correlationId, fileId, userId });
      return errorResponse(404, 'FILE_NOT_FOUND', 'File not found', correlationId);
    }

    const file = fileMetadata.Item;
    logger.info('File metadata retrieved', {
      correlationId,
      fileId,
      userId,
      fileName: file.fileName,
      hasAnalysisId: !!file.analysisId
    });

    // Get analysis status if analysisId exists
    let analysisStatus = 'pending';
    let analysisProgress = 0;
    let analysisMessage = 'Waiting for analysis to start...';
    let errorMessage: string | undefined;

    if (file.analysisId) {
      const analysisResultsTable = process.env.ANALYSIS_RESULTS_TABLE || DEFAULT_ANALYSIS_RESULTS_TABLE;
      logger.info('Checking analysis results', {
        correlationId,
        fileId,
        analysisId: file.analysisId,
        analysisResultsTable
      });
      
      const analysisResult = await dynamoClient.send(new GetCommand({
        TableName: analysisResultsTable,
        Key: { analysisId: file.analysisId }
      }));

      if (analysisResult.Item) {
        const analysis = analysisResult.Item;
        analysisStatus = analysis.status || 'pending';
        analysisProgress = analysis.progress || 0;
        analysisMessage = analysis.message || getDefaultMessage(analysisStatus);
        errorMessage = analysis.error;

        logger.info('Analysis status retrieved', {
          correlationId,
          fileId,
          analysisId: file.analysisId,
          status: analysisStatus,
          progress: analysisProgress
        });
      }
    }

    const response: FileStatusResponse = {
      fileId,
      fileName: file.fileName,
      uploadedAt: file.uploadedAt || Date.now(),
      analysisId: file.analysisId,
      analysisStatus: analysisStatus as any,
      analysisProgress,
      analysisMessage,
      errorMessage
    };

    logger.info('File status retrieved successfully', {
      correlationId,
      fileId,
      analysisStatus
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(response)
    };

  } catch (error: any) {
    logger.error('Get file status failed', {
      correlationId,
      error: error.message,
      stack: error.stack
    });

    // Return proper CORS headers even on error
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: {
          code: 'GET_STATUS_FAILED',
          message: error.message || 'Failed to get file status',
          timestamp: new Date().toISOString(),
          requestId: correlationId
        }
      })
    };
  }
};

/**
 * Get default message based on analysis status
 */
function getDefaultMessage(status: string): string {
  const messages: Record<string, string> = {
    'pending': 'Waiting for analysis to start...',
    'in_progress': 'Analysis in progress...',
    'completed': 'Analysis completed successfully',
    'failed': 'Analysis failed'
  };
  return messages[status] || 'Unknown status';
}

/**
 * Standard error response
 */
function errorResponse(
  statusCode: number,
  code: string,
  message: string,
  correlationId: string
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify({
      error: {
        code,
        message,
        timestamp: new Date().toISOString(),
        requestId: correlationId
      }
    })
  };
}
