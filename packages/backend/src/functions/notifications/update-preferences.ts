/**
 * Update Notification Preferences Lambda
 * 
 * Updates user notification preferences with validation.
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { notificationPreferencesService } from '../../services/notification-preferences-service';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Update preferences request', { path: event.path });

  try {
    // Extract userId from path parameters or JWT token
    const userId = event.queryStringParameters?.userId;

    if (!userId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'userId is required' }),
      };
    }

    // Parse request body
    if (!event.body) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Request body is required' }),
      };
    }

    const updates = JSON.parse(event.body);

    // Update preferences (service handles validation)
    const updatedPreferences = await notificationPreferencesService.updatePreferences(userId, updates);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedPreferences),
    };
  } catch (error) {
    console.error('Error updating preferences', { error });
    
    // Check for validation errors
    const errorMessage = error instanceof Error ? error.message : 'Failed to update preferences';
    const statusCode = errorMessage.includes('Invalid') || errorMessage.includes('validation') ? 400 : 500;

    return {
      statusCode,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: errorMessage }),
    };
  }
};
