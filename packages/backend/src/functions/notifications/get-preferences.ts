/**
 * Get Notification Preferences Lambda
 * 
 * Retrieves user notification preferences.
 * Returns default preferences if none configured.
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { notificationPreferencesService } from '../../services/notification-preferences-service';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Get preferences request', { path: event.path });

  try {
    // Extract userId from path parameters or JWT token
    // For now, using query parameter (should be from JWT in production)
    const userId = event.queryStringParameters?.userId;

    if (!userId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'userId is required' }),
      };
    }

    // Get user preferences (returns defaults if none configured)
    const preferences = await notificationPreferencesService.getPreferences(userId);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preferences),
    };
  } catch (error) {
    console.error('Error getting preferences', { error });
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to get preferences' }),
    };
  }
};
