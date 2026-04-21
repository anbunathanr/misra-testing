/**
 * Lambda handler for retrieving MISRA analysis results
 * GET /analysis/results/:fileId
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, QueryCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall, marshall } from '@aws-sdk/util-dynamodb';
import { getUserFromContext } from '../../utils/auth-util';

const region = process.env.AWS_REGION || 'us-east-1';
const analysisResultsTable = process.env.ANALYSIS_RESULTS_TABLE || 'AnalysisResults-dev';
const fileMetadataTable = process.env.FILE_METADATA_TABLE || 'misra-platform-file-metadata-dev';

const dynamoClient = new DynamoDBClient({ region });

interface AnalysisResult {
  analysisId: string;
  fileId: string;
  userId: string;
  organizationId: string;
  language: string;
  violations: any[];
  summary: {
    totalViolations: number;
    violationsBySeverity: {
      mandatory: number;
      required: number;
      advisory: number;
    };
    compliancePercentage: number;
    rulesChecked: number;
  };
  status: string;
  createdAt: number;
  timestamp: number;
}

/**
 * Handler for GET /analysis/results/:fileId
 * Returns analysis results for a specific file
 * 
 * Requirements:
 * - 7.1: Provide GET /analysis/results/{fileId} endpoint
 * - 7.2: Return analysis results in JSON format
 * - 7.3: Include all violations with details
 * - 7.4: Include compliance percentage
 * - 7.5: Include analysis metadata
 * - 7.6: Return 404 if analysis not found
 * - 7.7: Return 403 if user doesn't own the file
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('GET /analysis/results/:fileId invoked');

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

    // Extract fileId from path parameters (Requirement 7.1)
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

    console.log(`Retrieving analysis results for file: ${fileId}`);
    console.log(`User: ${user.userId}, Organization: ${user.organizationId}`);

    // Verify user owns the file (Requirement 7.7)
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

    // Check ownership (Requirement 7.7)
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

    // Query analysis results by fileId (Requirement 7.2)
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

    // Return the most recent analysis result
    const latestResult = analysisResults[0];

    console.log(`Returning analysis result: ${latestResult.analysisId}`);
    console.log(`Violations: ${latestResult.violations?.length || 0}`);
    console.log(`Compliance: ${latestResult.summary?.compliancePercentage || 0}%`);

    // Return analysis results in JSON format (Requirements 7.2, 7.3, 7.4, 7.5)
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        analysisId: latestResult.analysisId,
        fileId: latestResult.fileId,
        language: latestResult.language,
        violations: latestResult.violations || [], // Requirement 7.3
        summary: latestResult.summary || {
          totalViolations: 0,
          violationsBySeverity: {
            mandatory: 0,
            required: 0,
            advisory: 0,
          },
          compliancePercentage: 0, // Requirement 7.4
          rulesChecked: 0,
        },
        status: latestResult.status,
        metadata: {
          // Requirement 7.5
          analysisId: latestResult.analysisId,
          timestamp: latestResult.timestamp,
          createdAt: latestResult.createdAt,
          userId: latestResult.userId,
          organizationId: latestResult.organizationId,
        },
      }),
    };
  } catch (error) {
    console.error('Error retrieving analysis results:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve analysis results',
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
      Limit: 10, // Return up to 10 most recent results
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
