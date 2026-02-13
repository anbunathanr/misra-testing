/**
 * Get Execution Results Lambda
 * Returns complete execution details with pre-signed screenshot URLs
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { testExecutionDBService } from '../../services/test-execution-db-service';
import { TestExecution } from '../../types/test-execution';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
});

const SCREENSHOTS_BUCKET = process.env.SCREENSHOTS_BUCKET || 'test-screenshots';

export interface ExecutionResultsResponse {
  execution: TestExecution;
  screenshotUrls: string[];
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Get execution results request:', JSON.stringify(event));

    // Extract executionId from path parameters
    const executionId = event.pathParameters?.executionId;

    if (!executionId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          message: 'executionId is required',
        }),
      };
    }

    // Get execution from database
    const execution = await testExecutionDBService.getExecution(executionId);

    if (!execution) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          message: `Execution not found: ${executionId}`,
        }),
      };
    }

    // Generate pre-signed URLs for all screenshots
    const screenshotUrls: string[] = [];
    
    for (const screenshotKey of execution.screenshots) {
      try {
        const command = new GetObjectCommand({
          Bucket: SCREENSHOTS_BUCKET,
          Key: screenshotKey,
        });

        const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour
        screenshotUrls.push(url);
      } catch (error) {
        console.error(`Failed to generate pre-signed URL for ${screenshotKey}:`, error);
        // Continue with other screenshots even if one fails
      }
    }

    const response: ExecutionResultsResponse = {
      execution,
      screenshotUrls,
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Error getting execution results:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
