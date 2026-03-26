/**
 * Create Notification Template Lambda
 * 
 * Create new notification template (admin only).
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { notificationTemplateService } from '../../services/notification-template-service';
import { NotificationTemplate } from '../../types/notification';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Create template request', { path: event.path });

  try {
    // TODO: Add admin role check from JWT token
    // For now, assuming authorized

    // Parse request body
    if (!event.body) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Request body is required' }),
      };
    }

    const templateData = JSON.parse(event.body) as Omit<NotificationTemplate, 'templateId' | 'createdAt' | 'updatedAt'>;

    // Validate required fields
    if (!templateData.eventType || !templateData.channel || !templateData.format || !templateData.body) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing required fields: eventType, channel, format, body' }),
      };
    }

    // Create template (service handles validation)
    const createdTemplate = await notificationTemplateService.createTemplate(templateData);

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createdTemplate),
    };
  } catch (error) {
    console.error('Error creating template', { error });
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to create template';
    const statusCode = errorMessage.includes('Invalid') || errorMessage.includes('syntax') ? 400 : 500;

    return {
      statusCode,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: errorMessage }),
    };
  }
};
