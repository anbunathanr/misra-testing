import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall, marshall } from '@aws-sdk/util-dynamodb';
import { getUserFromContext } from '../../utils/auth-util';

/**
 * Lambda function for monitoring file upload progress
 * Task 4.2: Build file upload progress monitoring
 * 
 * Features:
 * - Real-time upload progress percentage display
 * - Upload status tracking (starting, uploading, completed, failed)
 * - Error handling for upload failures
 * - User authorization and access control
 */

interface UploadProgress {
  file_id: string;
  user_id: string;
  file_name: string;
  file_size: number;
  progress_percentage: number;
  status: 'starting' | 'uploading' | 'completed' | 'failed';
  message: string;
  created_at: number;
  updated_at: number;
  error_message?: string;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
  };

  try {
    console.log('[UPLOAD-PROGRESS] Getting upload progress');

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: '',
      };
    }

    // Extract user from Lambda Authorizer context
    const user = await getUserFromContext(event);
    if (!user.userId) {
      console.warn('[UPLOAD-PROGRESS] ✗ Unauthorized: No user in context');
      return errorResponse(401, 'UNAUTHORIZED', 'User not authenticated');
    }

    // Extract fileId from path parameters
    const fileId = event.pathParameters?.fileId;
    if (!fileId) {
      console.error('[UPLOAD-PROGRESS] ✗ Missing fileId parameter');
      return errorResponse(400, 'MISSING_FILE_ID', 'fileId parameter is required');
    }

    console.log(`[UPLOAD-PROGRESS] Getting progress for file: ${fileId}, user: ${user.userId}`);

    // Get upload progress from DynamoDB
    const progressData = await getUploadProgress(fileId);

    if (!progressData) {
      console.log(`[UPLOAD-PROGRESS] ✗ Upload progress not found: ${fileId}`);
      return errorResponse(404, 'PROGRESS_NOT_FOUND', 'Upload progress not found');
    }

    // Verify user owns the upload
    if (progressData.user_id !== user.userId) {
      // Admins can access uploads in their organization
      if (user.role !== 'admin') {
        console.log(`[UPLOAD-PROGRESS] ✗ Access denied: User ${user.userId} does not own upload ${fileId}`);
        return errorResponse(403, 'FORBIDDEN', 'You do not have permission to access this upload');
      }
    }

    console.log(`[UPLOAD-PROGRESS] ✓ Progress retrieved: ${progressData.progress_percentage}% - ${progressData.status}`);

    // Calculate estimated time remaining based on progress
    const estimatedTimeRemaining = calculateEstimatedTimeRemaining(progressData);

    // Return progress information
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        fileId: progressData.file_id,
        fileName: progressData.file_name,
        fileSize: progressData.file_size,
        progress: {
          percentage: progressData.progress_percentage,
          status: progressData.status,
          message: progressData.message,
          estimatedTimeRemaining,
        },
        timestamps: {
          createdAt: progressData.created_at,
          updatedAt: progressData.updated_at,
        },
        error: progressData.error_message ? {
          message: progressData.error_message,
        } : undefined,
      }),
    };
  } catch (error) {
    console.error('[UPLOAD-PROGRESS] ✗ Error getting upload progress:', error);
    
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to retrieve upload progress');
  }
};

/**
 * Get upload progress from DynamoDB
 */
async function getUploadProgress(fileId: string): Promise<UploadProgress | null> {
  const dynamoClient = new DynamoDBClient({});
  const progressTable = process.env.UPLOAD_PROGRESS_TABLE || 'UploadProgress';

  try {
    const command = new GetItemCommand({
      TableName: progressTable,
      Key: marshall({ file_id: fileId }),
    });

    const response = await dynamoClient.send(command);

    if (!response.Item) {
      return null;
    }

    return unmarshall(response.Item) as UploadProgress;
  } catch (error) {
    console.error('[UPLOAD-PROGRESS] Error querying DynamoDB:', error);
    throw error;
  }
}

/**
 * Calculate estimated time remaining based on progress
 */
function calculateEstimatedTimeRemaining(progressData: UploadProgress): number {
  const now = Date.now();
  const elapsedTime = now - progressData.created_at;
  const progressPercentage = progressData.progress_percentage;

  // If upload is complete or failed, no time remaining
  if (progressData.status === 'completed' || progressData.status === 'failed') {
    return 0;
  }

  // If no progress yet, estimate based on file size
  if (progressPercentage <= 0) {
    // Estimate 1 second per MB for small files, longer for larger files
    const fileSizeMB = progressData.file_size / (1024 * 1024);
    return Math.max(5, Math.min(60, fileSizeMB * 2)); // Between 5-60 seconds
  }

  // Calculate based on current progress rate
  const progressRate = progressPercentage / elapsedTime; // percentage per millisecond
  const remainingPercentage = 100 - progressPercentage;
  const estimatedRemainingTime = remainingPercentage / progressRate;

  // Convert to seconds and cap at reasonable limits
  const estimatedSeconds = Math.round(estimatedRemainingTime / 1000);
  return Math.max(0, Math.min(300, estimatedSeconds)); // Cap at 5 minutes
}

/**
 * Generate error response
 */
function errorResponse(
  statusCode: number,
  code: string,
  message: string
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    },
    body: JSON.stringify({
      success: false,
      error: {
        code,
        message,
        timestamp: new Date().toISOString(),
        requestId: Math.random().toString(36).substring(7),
      },
    }),
  };
}