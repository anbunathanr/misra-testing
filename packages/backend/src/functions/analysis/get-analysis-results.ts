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
    if (fileMetadata.userId !== user.userId) {
      // Admins can access files in their organization
      if (user.role === 'admin' && fileMetadata.organizationId === user.organizationId) {
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

    // Check if results are available - if not, analysis is still running
    if (!analysisResults || analysisResults.length === 0) {
      console.log(`No analysis results found for file: ${fileId} - analysis may still be processing`);
      return {
        statusCode: 202, // 202 Accepted - processing in progress
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          status: 'processing',
          message: 'Analysis is still processing. Please try again in a few seconds.',
          fileId: fileId,
          timestamp: new Date().toISOString(),
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
    console.error('DB Error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : 'No stack trace',
    });

    // Return 202 instead of 500 - analysis may still be processing
    // This prevents frontend from failing when backend encounters errors
    return {
      statusCode: 202,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        status: 'processing',
        message: 'Analysis is still processing. Please try again in a few seconds.',
        timestamp: new Date().toISOString(),
      }),
    };
  }
};

/**
 * Get file metadata from DynamoDB
 */
async function getFileMetadata(fileId: string): Promise<any | null> {
  try {
    console.log(`Getting file metadata for fileId: ${fileId}`);
    console.log(`Using table: ${fileMetadataTable}`);
    
    const command = new GetItemCommand({
      TableName: fileMetadataTable,
      Key: marshall({ fileId: fileId }),
    });

    console.log(`Executing GetItem command for table: ${fileMetadataTable}`);
    
    const response = await dynamoClient.send(command);

    // Check for null results - file metadata not found
    if (!response.Item) {
      console.log(`File metadata not found for fileId: ${fileId}`);
      return null;
    }

    const metadata = unmarshall(response.Item);
    console.log(`File metadata retrieved successfully:`, {
      fileId,
      userId: metadata.userId,
      organizationId: metadata.organizationId,
    });
    
    return metadata;
  } catch (error) {
    console.error('DB Error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : 'No stack trace',
    });
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
    console.log(`✅ [QUERY] Querying analysis results for fileId: ${fileId}`);
    console.log(`✅ [QUERY] Using table: ${analysisResultsTable}`);
    
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

    console.log(`✅ [QUERY] Executing query on FileIndex GSI`);
    console.log(`✅ [QUERY] Query parameters:`, {
      table: analysisResultsTable,
      index: 'FileIndex',
      fileId: fileId,
    });
    
    const response = await dynamoClient.send(command);

    console.log(`✅ [QUERY] Query response received`);
    console.log(`✅ [QUERY] Items count: ${response.Items?.length || 0}`);
    console.log(`✅ [QUERY] Count: ${response.Count}`);
    console.log(`✅ [QUERY] ScannedCount: ${response.ScannedCount}`);

    // Check for null or empty results - analysis may still be running
    if (!response.Items || response.Items.length === 0) {
      console.log(`⚠️ [QUERY] No analysis results found for fileId: ${fileId}`);
      console.log(`⚠️ [QUERY] Analysis may still be running or results not yet propagated`);
      return [];
    }

    // Safely unmarshall items with error handling
    const results: AnalysisResult[] = [];
    for (const item of response.Items) {
      try {
        const unmarshalled = unmarshall(item) as AnalysisResult;
        
        console.log(`✅ [QUERY] Unmarshalled result:`, {
          analysisId: unmarshalled.analysisId,
          fileId: unmarshalled.fileId,
          timestamp: unmarshalled.timestamp,
          timestampType: typeof unmarshalled.timestamp,
          violations: unmarshalled.violations?.length || 0,
          compliance: unmarshalled.summary?.compliancePercentage || 0,
        });
        
        // Validate timestamp is a number
        if (typeof unmarshalled.timestamp !== 'number') {
          console.warn(`⚠️ [QUERY] Skipping result with invalid timestamp type: ${typeof unmarshalled.timestamp}`, {
            analysisId: unmarshalled.analysisId,
            timestamp: unmarshalled.timestamp,
          });
          continue;
        }
        
        results.push(unmarshalled);
      } catch (itemError) {
        console.error('❌ [QUERY] Error unmarshalling item:', itemError);
        continue; // Skip bad items
      }
    }
    
    console.log(`✅ [QUERY] Successfully retrieved ${results.length} valid analysis results`);
    return results;
  } catch (error) {
    console.error('❌ [QUERY] DB Error:', error);
    console.error('❌ [QUERY] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown',
      code: (error as any)?.Code,
      statusCode: (error as any)?.statusCode,
    });
    throw error;
  }
}
