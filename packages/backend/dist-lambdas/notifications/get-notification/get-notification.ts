/**
 * Get Notification Lambda
 * 
 * Get single notification by ID.
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { notificationHistoryService } from '../../services/notification-history-service';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Get notification request', { path: event.path });

  try {
    // Extract notificationId from path parameters
    const notificationId = event.pathParameters?.notificationId;

    if (!notificationId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'notificationId is required' }),
      };
    }

    // Get notification by ID
    const notification = await notificationHistoryService.getNotificationById(notificationId);

    if (!notification) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Notification not found' }),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notification),
    };
  } catch (error) {
    console.error('Error getting notification', { error });
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to get notification' }),
    };
  }
};
