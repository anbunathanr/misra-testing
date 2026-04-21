/**
 * Get Notification History Lambda
 * 
 * Query notification history with filters and pagination.
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getUserFromContext } from '../../utils/auth-util';
import { notificationHistoryService } from '../../services/notification-history-service';
import { NotificationHistoryQuery } from '../../types/notification';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Get notification history request', { path: event.path });

  try {
    // Extract user from request context (populated by Lambda Authorizer)
    const user = await getUserFromContext(event);

    if (!user.userId) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            code: 'UNAUTHORIZED',
            message: 'User context not found',
            timestamp: new Date().toISOString(),
          },
        }),
      };
    }

    // Extract query parameters
    const params = event.queryStringParameters || {};

    // Build query object - use authenticated user's userId
    const query: NotificationHistoryQuery = {
      userId: user.userId,
      startDate: params.startDate,
      endDate: params.endDate,
      eventType: params.eventType,
      channel: params.channel as any,
      deliveryStatus: params.deliveryStatus as any,
      limit: params.limit ? parseInt(params.limit, 10) : 50,
      nextToken: params.nextToken,
    };

    // Query history
    const result = await notificationHistoryService.queryHistory(query);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('Error querying notification history', { error });
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to query notification history',
          timestamp: new Date().toISOString(),
        },
      }),
    };
  }
};
