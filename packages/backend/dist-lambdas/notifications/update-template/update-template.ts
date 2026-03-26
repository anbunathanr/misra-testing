/**
 * Update Notification Template Lambda
 * 
 * Update existing notification template (admin only).
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { notificationTemplateService } from '../../services/notification-template-service';
import { NotificationTemplate } from '../../types/notification';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Update template request', { path: event.path });

  try {
    // TODO: Add admin role check from JWT token
    // For now, assuming authorized

    // Extract templateId from path parameters
    const templateId = event.pathParameters?.templateId;

    if (!templateId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'templateId is required' }),
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

    const updates = JSON.parse(event.body) as Partial<NotificationTemplate>;

    // Update template (service handles validation)
    const updatedTemplate = await notificationTemplateService.updateTemplate(templateId, updates);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedTemplate),
    };
  } catch (error) {
    console.error('Error updating template', { error });
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to update template';
    const statusCode = errorMessage.includes('Invalid') || errorMessage.includes('syntax') ? 400 : 500;

    return {
      statusCode,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: errorMessage }),
    };
  }
};
