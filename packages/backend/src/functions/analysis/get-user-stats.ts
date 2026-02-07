/**
 * Lambda function to get user analysis statistics
 * Provides summary statistics for a user's analysis history
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { AnalysisResultsService } from '../../services/analysis-results-service';
import { DynamoDBClientWrapper } from '../../database/dynamodb-client';

const environment = process.env.ENVIRONMENT || 'dev';
const dbClient = new DynamoDBClientWrapper(environment);
const resultsService = new AnalysisResultsService(dbClient);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Get user stats request:', JSON.stringify(event, null, 2));

  try {
    const userId = event.pathParameters?.userId;

    if (!userId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'User ID is required' })
      };
    }

    // Get user statistics
    const stats = await resultsService.getUserAnalysisStats(userId);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        statistics: stats
      })
    };

  } catch (error) {
    console.error('Error getting user statistics:', error);
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Failed to get user statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
