/**
 * Get Workflow Progress Lambda
 * 
 * GET /workflow/progress/{workflowId}
 * Retrieves real-time progress of the autonomous workflow
 * 
 * Response:
 * {
 *   "workflowId": "workflow-xxx",
 *   "status": "ANALYSIS_TRIGGERED",
 *   "progress": 75,
 *   "currentStep": "🧠 AI Analysis Triggered (Lambda)",
 *   "timestamp": 1234567890
 * }
 */

import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { createLogger } from '../../utils/logger';

const logger = createLogger('GetProgressFunction');
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });

interface ProgressResponse {
  workflowId: string;
  status: string;
  progress: number;
  currentStep: string;
  timestamp: number;
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    logger.info('Get progress request received', { pathParameters: event.pathParameters });

    // Extract workflowId from path
    const workflowId = event.pathParameters?.workflowId;

    if (!workflowId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Workflow ID is required' }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      };
    }

    logger.info('Fetching progress for workflow', { workflowId });

    try {
      // Get workflow progress from DynamoDB
      const getCommand = new GetItemCommand({
        TableName: 'AnalysisProgress',
        Key: {
          analysisId: { S: workflowId }
        }
      });

      const response = await dynamoClient.send(getCommand);

      if (!response.Item) {
        logger.warn('Workflow not found', { workflowId });
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'Workflow not found' }),
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        };
      }

      const progressResponse: ProgressResponse = {
        workflowId: response.Item.analysisId?.S || workflowId,
        status: response.Item.status?.S || 'UNKNOWN',
        progress: parseInt(response.Item.progress?.N || '0'),
        currentStep: response.Item.currentStep?.S || 'Processing...',
        timestamp: parseInt(response.Item.timestamp?.N || '0')
      };

      logger.info('Progress retrieved successfully', { workflowId, progress: progressResponse.progress });

      return {
        statusCode: 200,
        body: JSON.stringify(progressResponse),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      };
    } catch (error: any) {
      logger.error('Failed to fetch progress', { error: error.message, workflowId });
      return {
        statusCode: 500,
        body: JSON.stringify({ error: `Failed to fetch progress: ${error.message}` }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      };
    }
  } catch (error: any) {
    logger.error('Unexpected error', { error: error.message });
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    };
  }
};
