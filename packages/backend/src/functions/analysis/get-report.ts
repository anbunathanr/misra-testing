/**
 * Lambda handler for generating and retrieving MISRA analysis PDF reports
 * GET /reports/:fileId
 * 
 * Requirements: 8.6, 8.7
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, QueryCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { unmarshall, marshall } from '@aws-sdk/util-dynamodb';
import { getUserFromContext } from '../../utils/auth-util';
import { ReportGenerator } from '../../services/misra-analysis/report-generator';
import { AnalysisResult } from '../../types/misra-analysis';

const region = process.env.AWS_REGION || 'us-east-1';
const analysisResultsTable = process.env.ANALYSIS_RESULTS_TABLE || 'AnalysisResults-dev';
const fileMetadataTable = process.env.FILE_METADATA_TABLE || 'misra-platform-file-metadata-dev';
const bucketName = process.env.FILE_STORAGE_BUCKET || 'misra-platform-files-dev';

const dynamoClient = new DynamoDBClient({ region });
const s3Client = new S3Client({ region });
const reportGenerator = new ReportGenerator();

/**
 * Handler for GET /reports/:fileId
 * Generates PDF report and returns presigned download URL
 * 
 * Requirements:
 * - 8.6: Generate PDF report using ReportGenerator
 * - 8.6: Store PDF in S3 bucket
 * - 8.7: Return presigned download URL (expires in 1 hour)
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('GET /reports/:fileId invoked');

  try {
    // Extract user from Lambda Authorizer context
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

    console.log(`Generating report for file: ${fileId}`);
    console.log(`User: ${user.userId}, Organization: ${user.organizationId}`);

    // Verify user owns the file
    const fileMetadata = await getFileMetadata(fileId);
    
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

    // Check ownership
    if (fileMetadata.user_id !== user.userId) {
      // Admins can access files in their organization
      if (user.role === 'admin' && fileMetadata.organization_id === user.organizationId) {
        console.log('Admin accessing file in their organization');
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
              message: 'You do not have permission to access this file',
              timestamp: new Date().toISOString(),
            },
          }),
        };
      }
    }

    // Get analysis results
    const analysisResults = await queryAnalysisResultsByFileId(fileId);

    if (!analysisResults || analysisResults.length === 0) {
      console.log(`No analysis results found for file: ${fileId}`);
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            code: 'ANALYSIS_NOT_FOUND',
            message: 'No analysis results found for this file',
            timestamp: new Date().toISOString(),
          },
        }),
      };
    }

    const latestResult = analysisResults[0];

    // Check if report already exists in S3
    const reportKey = `reports/${fileId}/${latestResult.analysisId}.pdf`;
    let reportExists = false;

    try {
      await s3Client.send(
        new GetObjectCommand({
          Bucket: bucketName,
          Key: reportKey,
        })
      );
      reportExists = true;
      console.log(`Report already exists: ${reportKey}`);
    } catch (error: any) {
      if (error.name !== 'NoSuchKey') {
        console.error('Error checking report existence:', error);
      }
    }

    // Generate PDF if it doesn't exist (Requirement 8.6)
    if (!reportExists) {
      console.log('Generating new PDF report...');
      
      const pdfBuffer = await reportGenerator.generatePDF(
        latestResult,
        fileMetadata.filename || 'unknown.c'
      );

      // Store PDF in S3 (Requirement 8.6)
      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: reportKey,
          Body: pdfBuffer,
          ContentType: 'application/pdf',
          Metadata: {
            fileId: fileId,
            analysisId: latestResult.analysisId,
            userId: user.userId,
            generatedAt: new Date().toISOString(),
          },
        })
      );

      console.log(`Report stored in S3: ${reportKey}`);
    }

    // Generate presigned URL (expires in 1 hour) (Requirement 8.7)
    const downloadUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: bucketName,
        Key: reportKey,
      }),
      { expiresIn: 3600 } // 1 hour
    );

    console.log('Presigned URL generated successfully');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        reportUrl: downloadUrl,
        expiresIn: 3600,
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
        fileId: fileId,
        analysisId: latestResult.analysisId,
        fileName: `${fileMetadata.filename || 'report'}_misra_report.pdf`,
      }),
    };
  } catch (error) {
    console.error('Error generating report:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate report',
          timestamp: new Date().toISOString(),
        },
      }),
    };
  }
};

/**
 * Get file metadata from DynamoDB
 */
async function getFileMetadata(fileId: string): Promise<any | null> {
  try {
    const command = new GetItemCommand({
      TableName: fileMetadataTable,
      Key: marshall({ file_id: fileId }),
    });

    const response = await dynamoClient.send(command);

    if (!response.Item) {
      return null;
    }

    return unmarshall(response.Item);
  } catch (error) {
    console.error('Error getting file metadata:', error);
    throw error;
  }
}

/**
 * Query analysis results by fileId using FileIndex GSI
 */
async function queryAnalysisResultsByFileId(
  fileId: string
): Promise<AnalysisResult[]> {
  try {
    const command = new QueryCommand({
      TableName: analysisResultsTable,
      IndexName: 'FileIndex',
      KeyConditionExpression: 'fileId = :fileId',
      ExpressionAttributeValues: marshall({
        ':fileId': fileId,
      }),
      ScanIndexForward: false, // Sort by timestamp descending (most recent first)
      Limit: 1, // Only need the most recent result
    });

    const response = await dynamoClient.send(command);

    if (!response.Items || response.Items.length === 0) {
      return [];
    }

    return response.Items.map((item) => unmarshall(item) as AnalysisResult);
  } catch (error) {
    console.error('Error querying analysis results:', error);
    throw error;
  }
}
