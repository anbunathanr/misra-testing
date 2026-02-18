/**
 * Notification Template Service
 * 
 * Manages notification templates with variable substitution for different event types and channels.
 * Supports template CRUD operations, rendering, and validation.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { NotificationTemplate, TemplateRenderContext, NotificationChannel } from '../types/notification';
import { v4 as uuidv4 } from 'uuid';

export class NotificationTemplateService {
  private docClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor() {
    const client = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
    this.docClient = DynamoDBDocumentClient.from(client);
    this.tableName = process.env.NOTIFICATION_TEMPLATES_TABLE || 'NotificationTemplates';
  }

  /**
   * Get template by event type and channel
   * 
   * @param eventType - Event type (test_completion, test_failure, etc.)
   * @param channel - Notification channel (email, sms, slack, webhook)
   * @returns Notification template or null if not found
   */
  async getTemplate(eventType: string, channel: NotificationChannel): Promise<NotificationTemplate | null> {
    try {
      // Query using GSI (EventTypeChannelIndex)
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: 'EventTypeChannelIndex',
        KeyConditionExpression: 'eventType = :eventType AND channel = :channel',
        ExpressionAttributeValues: {
          ':eventType': eventType,
          ':channel': channel,
        },
        Limit: 1,
      });

      const response = await this.docClient.send(command);

      if (response.Items && response.Items.length > 0) {
        return response.Items[0] as NotificationTemplate;
      }

      return null;
    } catch (error) {
      console.error('Error getting template', { eventType, channel, error });
      throw error;
    }
  }

  /**
   * Render template with variable substitution
   * 
   * @param template - Notification template
   * @param context - Render context with variable values
   * @returns Rendered template string
   */
  async renderTemplate(template: NotificationTemplate, context: TemplateRenderContext): Promise<string> {
    let rendered = template.body;

    // Replace all {{variable}} placeholders with context values
    rendered = rendered.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
      const value = context[variable as keyof TemplateRenderContext];
      
      // Handle missing variables with default value (empty string)
      if (value === undefined || value === null) {
        console.warn(`Template variable '${variable}' not found in context, using empty string`);
        return '';
      }

      // Handle arrays (like screenshotUrls)
      if (Array.isArray(value)) {
        return value.join(', ');
      }

      // Handle objects (like reportData)
      if (typeof value === 'object') {
        return JSON.stringify(value);
      }

      return String(value);
    });

    return rendered;
  }

  /**
   * Create new template
   * 
   * @param template - Template data without ID and timestamps
   * @returns Created template with ID and timestamps
   */
  async createTemplate(
    template: Omit<NotificationTemplate, 'templateId' | 'createdAt' | 'updatedAt'>
  ): Promise<NotificationTemplate> {
    // Validate template syntax before creating
    const isValid = await this.validateTemplate(template as NotificationTemplate);
    if (!isValid) {
      throw new Error('Invalid template syntax');
    }

    const now = new Date().toISOString();
    const newTemplate: NotificationTemplate = {
      ...template,
      templateId: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };

    try {
      const command = new PutCommand({
        TableName: this.tableName,
        Item: newTemplate,
      });

      await this.docClient.send(command);
      return newTemplate;
    } catch (error) {
      console.error('Error creating template', { error });
      throw error;
    }
  }

  /**
   * Update existing template
   * 
   * @param templateId - Template ID
   * @param updates - Partial template updates
   * @returns Updated template
   */
  async updateTemplate(
    templateId: string,
    updates: Partial<NotificationTemplate>
  ): Promise<NotificationTemplate> {
    // If body is being updated, validate syntax
    if (updates.body) {
      const tempTemplate = { ...updates, body: updates.body } as NotificationTemplate;
      const isValid = await this.validateTemplate(tempTemplate);
      if (!isValid) {
        throw new Error('Invalid template syntax');
      }
    }

    const now = new Date().toISOString();

    try {
      // Build update expression
      const updateExpressions: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, any> = {};

      // Add updatedAt
      updateExpressions.push('#updatedAt = :updatedAt');
      expressionAttributeNames['#updatedAt'] = 'updatedAt';
      expressionAttributeValues[':updatedAt'] = now;

      // Add other fields
      Object.entries(updates).forEach(([key, value]) => {
        if (key !== 'templateId' && key !== 'createdAt' && key !== 'updatedAt') {
          updateExpressions.push(`#${key} = :${key}`);
          expressionAttributeNames[`#${key}`] = key;
          expressionAttributeValues[`:${key}`] = value;
        }
      });

      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: { templateId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      });

      const response = await this.docClient.send(command);
      return response.Attributes as NotificationTemplate;
    } catch (error) {
      console.error('Error updating template', { templateId, error });
      throw error;
    }
  }

  /**
   * Validate template syntax
   * 
   * @param template - Template to validate
   * @returns True if template is valid
   */
  async validateTemplate(template: NotificationTemplate): Promise<boolean> {
    try {
      // Check for required fields
      if (!template.body) {
        console.error('Template body is required');
        return false;
      }

      // Check for balanced braces in template variables
      const openBraces = (template.body.match(/\{\{/g) || []).length;
      const closeBraces = (template.body.match(/\}\}/g) || []).length;

      if (openBraces !== closeBraces) {
        console.error('Template has unbalanced braces', { openBraces, closeBraces });
        return false;
      }

      // Extract variables from template
      const variableMatches = template.body.match(/\{\{(\w+)\}\}/g);
      const extractedVariables = variableMatches
        ? variableMatches.map(match => match.replace(/\{\{|\}\}/g, ''))
        : [];

      // Check for invalid variable names (empty or with special characters)
      const invalidVariables = extractedVariables.filter(v => !/^\w+$/.test(v));
      if (invalidVariables.length > 0) {
        console.error('Template has invalid variable names', { invalidVariables });
        return false;
      }

      // Validate format matches channel
      if (template.channel === 'email' && template.format !== 'html' && template.format !== 'text') {
        console.error('Email templates must use html or text format');
        return false;
      }

      if (template.channel === 'sms' && template.format !== 'text') {
        console.error('SMS templates must use text format');
        return false;
      }

      if (template.channel === 'slack' && template.format !== 'slack_blocks') {
        console.error('Slack templates must use slack_blocks format');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating template', { error });
      return false;
    }
  }
}

// Export singleton instance
export const notificationTemplateService = new NotificationTemplateService();
