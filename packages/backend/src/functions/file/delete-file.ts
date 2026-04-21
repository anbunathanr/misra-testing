/**
 * Lambda handler for deleting files
 * DELETE /files/:fileId
 * 
 * Requirements: 15.7
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getUserFromContext } from '../../utils/auth-util';
import { FileMetadataService } from '../../services/file-metadata-service';
import { DynamoDBClientWrapper } from '../../database/dynamodb-client';

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const environment = process.env.ENVIRONMENT || 'dev';
const dbClient = new DynamoDBClientWrapper(environment);
const fileMetadataService = new FileMetadataService(dbClient);
const bucketName = process.env.FILE_STORAGE_BUCKET_NAME || `misra-platform-files-${environment}`;

/**
 * Handler for DELETE /files/:fileId
 * Deletes file from S3 and DynamoDB
 * 
 * Requirements:
 * - 15.7: Support file deletion by users
 * - 15.3: Enforce user isolation (users can only delete their own files)
 * - 15.4: Enforce organization isolation
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('DELETE /files/:fileId invoked');

  try {
    // Extract user from Lambda Authorizer context (Requirement 15.3)
    const user = await getUserFromContext(event);
    if (!user.userId) {
      console.error('User not authenticated');
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString(),
          },
        }),
      };
    }

    // Extract fileId from path parameters
    const fileId = event.pathParameters?.fileId;
    if (!fileId) {
      console.error('Missing fileId parameter');
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            code: 'INVALID_REQUEST',
            message: 'fileId parameter is required',
            timestamp: new Date().toISOString(),
          },
        }),
      };
    }

    console.log(`Deleting file: ${fileId} for user: ${user.userId}`);

    // Get file metadata to verify ownership and get S3 key
    const fileMetadata = await fileMetadataService.getFileMetadata(fileId);
    
    if (!fileMetadata) {
      console.log(`File not found: ${fileId}`);
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            code: 'FILE_NOT_FOUND',
            message: 'File not found',
            timestamp: new Date().toISOString(),
          },
        }),
      };
    }

    // Verify user ownership (Requirement 15.3)
    if (fileMetadata.user_id !== user.userId) {
      // Admins can delete files in their organization (Requirement 15.4)
      if (user.role === 'admin' && (fileMetadata as any).organization_id === user.organizationId) {
        console.log('Admin deleting file in their organization');
      } else {
        console.log(`Access denied: User ${user.userId} does not own file ${fileId}`);
        return {
          statusCode: 403,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have permission to delete this file',
              timestamp: new Date().toISOString(),
            },
          }),
        };
      }
    }

    // Delete from S3 (Requirement 15.7)
    try {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: fileMetadata.s3_key,
      });
      
      await s3Client.send(deleteCommand);
      console.log(`Deleted file from S3: ${fileMetadata.s3_key}`);
    } catch (s3Error) {
      console.error('Error deleting file from S3:', s3Error);
      // Continue with DynamoDB deletion even if S3 deletion fails
      // This prevents orphaned metadata records
    }

    // Delete from DynamoDB (Requirement 15.7)
    try {
      await fileMetadataService.deleteFileMetadata(fileId, user.userId);
      console.log(`Deleted file metadata from DynamoDB: ${fileId}`);
    } catch (dbError) {
      console.error('Error deleting file metadata:', dbError);
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to delete file metadata',
            timestamp: new Date().toISOString(),
          },
        }),
      };
    }

    console.log(`Successfully deleted file: ${fileId}`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'File deleted successfully',
        fileId,
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error('Error deleting file:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete file',
          timestamp: new Date().toISOString(),
        },
      }),
    };
  }
};
