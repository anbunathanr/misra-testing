/**
 * Template Seeding Lambda
 * 
 * Seeds default notification templates into DynamoDB.
 * Can be triggered manually or during stack deployment via custom resource.
 */

import { Handler } from 'aws-lambda';
import { notificationTemplateService } from '../../services/notification-template-service';
import { defaultTemplates } from '../../data/default-notification-templates';

interface SeedResult {
  success: boolean;
  templatesCreated: number;
  templatesSkipped: number;
  errors: string[];
}

/**
 * Lambda handler for seeding default templates
 */
export const handler: Handler = async (event): Promise<SeedResult> => {
  console.log('Starting template seeding', { templateCount: defaultTemplates.length });

  const result: SeedResult = {
    success: true,
    templatesCreated: 0,
    templatesSkipped: 0,
    errors: [],
  };

  for (const template of defaultTemplates) {
    try {
      // Check if template already exists
      const existing = await notificationTemplateService.getTemplate(
        template.eventType,
        template.channel
      );

      if (existing) {
        console.log('Template already exists, skipping', {
          eventType: template.eventType,
          channel: template.channel,
        });
        result.templatesSkipped++;
        continue;
      }

      // Create new template
      await notificationTemplateService.createTemplate(template);
      console.log('Template created successfully', {
        eventType: template.eventType,
        channel: template.channel,
      });
      result.templatesCreated++;
    } catch (error) {
      const errorMessage = `Failed to create template for ${template.eventType}/${template.channel}: ${error}`;
      console.error(errorMessage, { error });
      result.errors.push(errorMessage);
      result.success = false;
    }
  }

  console.log('Template seeding completed', result);

  return result;
};
