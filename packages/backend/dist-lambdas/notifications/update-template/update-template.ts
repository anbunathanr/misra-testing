/**
 * Update Notification Template Lambda
 * 
 * Update existing notification template (admin only).
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getUserFromContext } from '../../utils/auth-util';
import { notificationTemplateService } from '../../services/notification-template-service';
import { NotificationTemplate } from '../../types/notification';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Update template request', { path: event.path });

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

    // Check admin role
    if (user.role !== 'admin') {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            code: 'FORBIDDEN',
            message: 'Admin role required',
            timestamp: new Date().toISOString(),
          },
        }),
      };
    }

    // Extract templateId from path parameters
    const templateId = event.pathParameters?.templateId;

    if (!templateId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            code: 'INVALID_REQUEST',
            message: 'templateId is required',
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
            code: 'INVALID_REQUEST',
            message: 'Request body is required',
            timestamp: new Date().toISOString(),
          },
        }),
      };
    }

    const updates = JSON.parse(event.body) as Partial<NotificationTemplate>;

    // Update template (service handles validation)
    const updatedTemplate = await notificationTemplateService.updateTemplate(templateId, updates);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(updatedTemplate),
    };
  } catch (error) {
    console.error('Error updating template', { error });
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to update template';
    const statusCode = errorMessage.includes('Invalid') || errorMessage.includes('syntax') ? 400 : 500;

    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: {
          code: statusCode === 400 ? 'INVALID_REQUEST' : 'INTERNAL_ERROR',
          message: errorMessage,
          timestamp: new Date().toISOString(),
        },
      }),
    };
  }
};
