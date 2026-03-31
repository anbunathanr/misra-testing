/**
 * Update Notification Preferences Lambda
 * 
 * Updates user notification preferences with validation.
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getUserFromContext } from '../../utils/auth-util';
import { notificationPreferencesService } from '../../services/notification-preferences-service';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Update preferences request', { path: event.path });

  try {
    // Extract user from request context (populated by Lambda Authorizer)
    const user = getUserFromContext(event);

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

    // Parse request body
    if (!event.body) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            code: 'BAD_REQUEST',
            message: 'Request body is required',
            timestamp: new Date().toISOString(),
          },
        }),
      };
    }

    const updates = JSON.parse(event.body);

    // Update preferences (service handles validation)
    const updatedPreferences = await notificationPreferencesService.updatePreferences(user.userId, updates);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(updatedPreferences),
    };
  } catch (error) {
    console.error('Error updating preferences', { error });
    
    // Check for validation errors
    const errorMessage = error instanceof Error ? error.message : 'Failed to update preferences';
    const statusCode = errorMessage.includes('Invalid') || errorMessage.includes('validation') ? 400 : 500;

    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: {
          code: statusCode === 400 ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR',
          message: errorMessage,
          timestamp: new Date().toISOString(),
        },
      }),
    };
  }
};
