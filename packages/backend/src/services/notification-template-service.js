"use strict";
/**
 * Notification Template Service
 *
 * Manages notification templates with variable substitution for different event types and channels.
 * Supports template CRUD operations, rendering, and validation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationTemplateService = exports.NotificationTemplateService = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const uuid_1 = require("uuid");
class NotificationTemplateService {
    docClient;
    tableName;
    constructor() {
        const client = new client_dynamodb_1.DynamoDBClient({
            region: process.env.AWS_REGION || 'us-east-1',
        });
        this.docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
        this.tableName = process.env.NOTIFICATION_TEMPLATES_TABLE || 'NotificationTemplates';
    }
    /**
     * Get template by event type and channel
     *
     * @param eventType - Event type (test_completion, test_failure, etc.)
     * @param channel - Notification channel (email, sms, slack, webhook)
     * @returns Notification template or null if not found
     */
    async getTemplate(eventType, channel) {
        try {
            // Query using GSI (EventTypeChannelIndex)
            const command = new lib_dynamodb_1.QueryCommand({
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
                return response.Items[0];
            }
            return null;
        }
        catch (error) {
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
    async renderTemplate(template, context) {
        let rendered = template.body;
        // Replace all {{variable}} placeholders with context values
        rendered = rendered.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
            const value = context[variable];
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
    async createTemplate(template) {
        // Validate template syntax before creating
        const isValid = await this.validateTemplate(template);
        if (!isValid) {
            throw new Error('Invalid template syntax');
        }
        const now = new Date().toISOString();
        const newTemplate = {
            ...template,
            templateId: (0, uuid_1.v4)(),
            createdAt: now,
            updatedAt: now,
        };
        try {
            const command = new lib_dynamodb_1.PutCommand({
                TableName: this.tableName,
                Item: newTemplate,
            });
            await this.docClient.send(command);
            return newTemplate;
        }
        catch (error) {
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
    async updateTemplate(templateId, updates) {
        // If body is being updated, validate syntax
        if (updates.body) {
            const tempTemplate = { ...updates, body: updates.body };
            const isValid = await this.validateTemplate(tempTemplate);
            if (!isValid) {
                throw new Error('Invalid template syntax');
            }
        }
        const now = new Date().toISOString();
        try {
            // Build update expression
            const updateExpressions = [];
            const expressionAttributeNames = {};
            const expressionAttributeValues = {};
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
            const command = new lib_dynamodb_1.UpdateCommand({
                TableName: this.tableName,
                Key: { templateId },
                UpdateExpression: `SET ${updateExpressions.join(', ')}`,
                ExpressionAttributeNames: expressionAttributeNames,
                ExpressionAttributeValues: expressionAttributeValues,
                ReturnValues: 'ALL_NEW',
            });
            const response = await this.docClient.send(command);
            return response.Attributes;
        }
        catch (error) {
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
    async validateTemplate(template) {
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
        }
        catch (error) {
            console.error('Error validating template', { error });
            return false;
        }
    }
}
exports.NotificationTemplateService = NotificationTemplateService;
// Export singleton instance
exports.notificationTemplateService = new NotificationTemplateService();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9uLXRlbXBsYXRlLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJub3RpZmljYXRpb24tdGVtcGxhdGUtc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7O0dBS0c7OztBQUVILDhEQUEwRDtBQUMxRCx3REFBb0g7QUFFcEgsK0JBQW9DO0FBRXBDLE1BQWEsMkJBQTJCO0lBQzlCLFNBQVMsQ0FBeUI7SUFDbEMsU0FBUyxDQUFTO0lBRTFCO1FBQ0UsTUFBTSxNQUFNLEdBQUcsSUFBSSxnQ0FBYyxDQUFDO1lBQ2hDLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXO1NBQzlDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxTQUFTLEdBQUcscUNBQXNCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3JELElBQUksQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyw0QkFBNEIsSUFBSSx1QkFBdUIsQ0FBQztJQUN2RixDQUFDO0lBRUQ7Ozs7OztPQU1HO0lBQ0gsS0FBSyxDQUFDLFdBQVcsQ0FBQyxTQUFpQixFQUFFLE9BQTRCO1FBQy9ELElBQUksQ0FBQztZQUNILDBDQUEwQztZQUMxQyxNQUFNLE9BQU8sR0FBRyxJQUFJLDJCQUFZLENBQUM7Z0JBQy9CLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUztnQkFDekIsU0FBUyxFQUFFLHVCQUF1QjtnQkFDbEMsc0JBQXNCLEVBQUUsK0NBQStDO2dCQUN2RSx5QkFBeUIsRUFBRTtvQkFDekIsWUFBWSxFQUFFLFNBQVM7b0JBQ3ZCLFVBQVUsRUFBRSxPQUFPO2lCQUNwQjtnQkFDRCxLQUFLLEVBQUUsQ0FBQzthQUNULENBQUMsQ0FBQztZQUVILE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFcEQsSUFBSSxRQUFRLENBQUMs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LENBQUM7WUFDZixDQUFDO1lBRUQsSUFBSSxRQUFRLENBQUMsT0FBTyxLQUFLLEtBQUssSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLE1BQU0sRUFBRSxDQUFDO2dCQUM3RCxPQUFPLENBQUMsS0FBSyxDQUFDLG9DQUFvQyxDQUFDLENBQUM7Z0JBQ3BELE9BQU8sS0FBSyxDQUFDO1lBQ2YsQ0FBQztZQUVELElBQUksUUFBUSxDQUFDLE9BQU8sS0FBSyxPQUFPLElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxjQUFjLEVBQUUsQ0FBQztnQkFDdkUsT0FBTyxDQUFDLEtBQUssQ0FBQyw4Q0FBOEMsQ0FBQyxDQUFDO2dCQUM5RCxPQUFPLEtBQUssQ0FBQztZQUNmLENBQUM7WUFFRCxPQUFPLElBQUksQ0FBQztRQUNkLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQywyQkFBMkIsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7WUFDdEQsT0FBTyxLQUFLLENBQUM7UUFDZixDQUFDO0lBQ0gsQ0FBQztDQUNGO0FBNU9ELGtFQTRPQztBQUVELDRCQUE0QjtBQUNmLFFBQUEsMkJBQTJCLEdBQUcsSUFBSSwyQkFBMkIsRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIE5vdGlmaWNhdGlvbiBUZW1wbGF0ZSBTZXJ2aWNlXHJcbiAqIFxyXG4gKiBNYW5hZ2VzIG5vdGlmaWNhdGlvbiB0ZW1wbGF0ZXMgd2l0aCB2YXJpYWJsZSBzdWJzdGl0dXRpb24gZm9yIGRpZmZlcmVudCBldmVudCB0eXBlcyBhbmQgY2hhbm5lbHMuXHJcbiAqIFN1cHBvcnRzIHRlbXBsYXRlIENSVUQgb3BlcmF0aW9ucywgcmVuZGVyaW5nLCBhbmQgdmFsaWRhdGlvbi5cclxuICovXHJcblxyXG5pbXBvcnQgeyBEeW5hbW9EQkNsaWVudCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYic7XHJcbmltcG9ydCB7IER5bmFtb0RCRG9jdW1lbnRDbGllbnQsIEdldENvbW1hbmQsIFB1dENvbW1hbmQsIFVwZGF0ZUNvbW1hbmQsIFF1ZXJ5Q29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2xpYi1keW5hbW9kYic7XHJcbmltcG9ydCB7IE5vdGlmaWNhdGlvblRlbXBsYXRlLCBUZW1wbGF0ZVJlbmRlckNvbnRleHQsIE5vdGlmaWNhdGlvbkNoYW5uZWwgfSBmcm9tICcuLi90eXBlcy9ub3RpZmljYXRpb24nO1xyXG5pbXBvcnQgeyB2NCBhcyB1dWlkdjQgfSBmcm9tICd1dWlkJztcclxuXHJcbmV4cG9ydCBjbGFzcyBOb3RpZmljYXRpb25UZW1wbGF0ZVNlcnZpY2Uge1xyXG4gIHByaXZhdGUgZG9jQ2xpZW50OiBEeW5hbW9EQkRvY3VtZW50Q2xpZW50O1xyXG4gIHByaXZhdGUgdGFibGVOYW1lOiBzdHJpbmc7XHJcblxyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgY29uc3QgY2xpZW50ID0gbmV3IER5bmFtb0RCQ2xpZW50KHtcclxuICAgICAgcmVnaW9uOiBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIHx8ICd1cy1lYXN0LTEnLFxyXG4gICAgfSk7XHJcbiAgICB0aGlzLmRvY0NsaWVudCA9IER5bmFtb0RCRG9jdW1lbnRDbGllbnQuZnJvbShjbGllbnQpO1xyXG4gICAgdGhpcy50YWJsZU5hbWUgPSBwcm9jZXNzLmVudi5OT1RJRklDQVRJT05fVEVNUExBVEVTX1RBQkxFIHx8ICdOb3RpZmljYXRpb25UZW1wbGF0ZXMnO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IHRlbXBsYXRlIGJ5IGV2ZW50IHR5cGUgYW5kIGNoYW5uZWxcclxuICAgKiBcclxuICAgKiBAcGFyYW0gZXZlbnRUeXBlIC0gRXZlbnQgdHlwZSAodGVzdF9jb21wbGV0aW9uLCB0ZXN0X2ZhaWx1cmUsIGV0Yy4pXHJcbiAgICogQHBhcmFtIGNoYW5uZWwgLSBOb3RpZmljYXRpb24gY2hhbm5lbCAoZW1haWwsIHNtcywgc2xhY2ssIHdlYmhvb2spXHJcbiAgICogQHJldHVybnMgTm90aWZpY2F0aW9uIHRlbXBsYXRlIG9yIG51bGwgaWYgbm90IGZvdW5kXHJcbiAgICovXHJcbiAgYXN5bmMgZ2V0VGVtcGxhdGUoZXZlbnRUeXBlOiBzdHJpbmcsIGNoYW5uZWw6IE5vdGlmaWNhdGlvbkNoYW5uZWwpOiBQcm9taXNlPE5vdGlmaWNhdGlvblRlbXBsYXRlIHwgbnVsbD4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gUXVlcnkgdXNpbmcgR1NJIChFdmVudFR5cGVDaGFubmVsSW5kZXgpXHJcbiAgICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgUXVlcnlDb21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IHRoaXMudGFibGVOYW1lLFxyXG4gICAgICAgIEluZGV4TmFtZTogJ0V2ZW50VHlwZUNoYW5uZWxJbmRleCcsXHJcbiAgICAgICAgS2V5Q29uZGl0aW9uRXhwcmVzc2lvbjogJ2V2ZW50VHlwZSA9IDpldmVudFR5cGUgQU5EIGNoYW5uZWwgPSA6Y2hhbm5lbCcsXHJcbiAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xyXG4gICAgICAgICAgJzpldmVudFR5cGUnOiBldmVudFR5cGUsXHJcbiAgICAgICAgICAnOmNoYW5uZWwnOiBjaGFubmVsLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgTGltaXQ6IDEsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLmRvY0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG5cclxuICAgICAgaWYgKHJlc3BvbnNlLkl0ZW1zICYmIHJlc3BvbnNlLkl0ZW1zLmxlbmd0aCA+IDApIHtcclxuICAgICAgICByZXR1cm4gcmVzcG9uc2UuSXRlbXNbMF0gYXMgTm90aWZpY2F0aW9uVGVtcGxhdGU7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgZ2V0dGluZyB0ZW1wbGF0ZScsIHsgZXZlbnRUeXBlLCBjaGFubmVsLCBlcnJvciB9KTtcclxuICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBSZW5kZXIgdGVtcGxhdGUgd2l0aCB2YXJpYWJsZSBzdWJzdGl0dXRpb25cclxuICAgKiBcclxuICAgKiBAcGFyYW0gdGVtcGxhdGUgLSBOb3RpZmljYXRpb24gdGVtcGxhdGVcclxuICAgKiBAcGFyYW0gY29udGV4dCAtIFJlbmRlciBjb250ZXh0IHdpdGggdmFyaWFibGUgdmFsdWVzXHJcbiAgICogQHJldHVybnMgUmVuZGVyZWQgdGVtcGxhdGUgc3RyaW5nXHJcbiAgICovXHJcbiAgYXN5bmMgcmVuZGVyVGVtcGxhdGUodGVtcGxhdGU6IE5vdGlmaWNhdGlvblRlbXBsYXRlLCBjb250ZXh0OiBUZW1wbGF0ZVJlbmRlckNvbnRleHQpOiBQcm9taXNlPHN0cmluZz4ge1xyXG4gICAgbGV0IHJlbmRlcmVkID0gdGVtcGxhdGUuYm9keTtcclxuXHJcbiAgICAvLyBSZXBsYWNlIGFsbCB7e3ZhcmlhYmxlfX0gcGxhY2Vob2xkZXJzIHdpdGggY29udGV4dCB2YWx1ZXNcclxuICAgIHJlbmRlcmVkID0gcmVuZGVyZWQucmVwbGFjZSgvXFx7XFx7KFxcdyspXFx9XFx9L2csIChtYXRjaCwgdmFyaWFibGUpID0+IHtcclxuICAgICAgY29uc3QgdmFsdWUgPSBjb250ZXh0W3ZhcmlhYmxlIGFzIGtleW9mIFRlbXBsYXRlUmVuZGVyQ29udGV4dF07XHJcbiAgICAgIFxyXG4gICAgICAvLyBIYW5kbGUgbWlzc2luZyB2YXJpYWJsZXMgd2l0aCBkZWZhdWx0IHZhbHVlIChlbXB0eSBzdHJpbmcpXHJcbiAgICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSBudWxsKSB7XHJcbiAgICAgICAgY29uc29sZS53YXJuKGBUZW1wbGF0ZSB2YXJpYWJsZSAnJHt2YXJpYWJsZX0nIG5vdCBmb3VuZCBpbiBjb250ZXh0LCB1c2luZyBlbXB0eSBzdHJpbmdgKTtcclxuICAgICAgICByZXR1cm4gJyc7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIEhhbmRsZSBhcnJheXMgKGxpa2Ugc2NyZWVuc2hvdFVybHMpXHJcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xyXG4gICAgICAgIHJldHVybiB2YWx1ZS5qb2luKCcsICcpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBIYW5kbGUgb2JqZWN0cyAobGlrZSByZXBvcnREYXRhKVxyXG4gICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnb2JqZWN0Jykge1xyXG4gICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeSh2YWx1ZSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiBTdHJpbmcodmFsdWUpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHJlbmRlcmVkO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ3JlYXRlIG5ldyB0ZW1wbGF0ZVxyXG4gICAqIFxyXG4gICAqIEBwYXJhbSB0ZW1wbGF0ZSAtIFRlbXBsYXRlIGRhdGEgd2l0aG91dCBJRCBhbmQgdGltZXN0YW1wc1xyXG4gICAqIEByZXR1cm5zIENyZWF0ZWQgdGVtcGxhdGUgd2l0aCBJRCBhbmQgdGltZXN0YW1wc1xyXG4gICAqL1xyXG4gIGFzeW5jIGNyZWF0ZVRlbXBsYXRlKFxyXG4gICAgdGVtcGxhdGU6IE9taXQ8Tm90aWZpY2F0aW9uVGVtcGxhdGUsICd0ZW1wbGF0ZUlkJyB8ICdjcmVhdGVkQXQnIHwgJ3VwZGF0ZWRBdCc+XHJcbiAgKTogUHJvbWlzZTxOb3RpZmljYXRpb25UZW1wbGF0ZT4ge1xyXG4gICAgLy8gVmFsaWRhdGUgdGVtcGxhdGUgc3ludGF4IGJlZm9yZSBjcmVhdGluZ1xyXG4gICAgY29uc3QgaXNWYWxpZCA9IGF3YWl0IHRoaXMudmFsaWRhdGVUZW1wbGF0ZSh0ZW1wbGF0ZSBhcyBOb3RpZmljYXRpb25UZW1wbGF0ZSk7XHJcbiAgICBpZiAoIWlzVmFsaWQpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHRlbXBsYXRlIHN5bnRheCcpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcclxuICAgIGNvbnN0IG5ld1RlbXBsYXRlOiBOb3RpZmljYXRpb25UZW1wbGF0ZSA9IHtcclxuICAgICAgLi4udGVtcGxhdGUsXHJcbiAgICAgIHRlbXBsYXRlSWQ6IHV1aWR2NCgpLFxyXG4gICAgICBjcmVhdGVkQXQ6IG5vdyxcclxuICAgICAgdXBkYXRlZEF0OiBub3csXHJcbiAgICB9O1xyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgUHV0Q29tbWFuZCh7XHJcbiAgICAgICAgVGFibGVOYW1lOiB0aGlzLnRhYmxlTmFtZSxcclxuICAgICAgICBJdGVtOiBuZXdUZW1wbGF0ZSxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBhd2FpdCB0aGlzLmRvY0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG4gICAgICByZXR1cm4gbmV3VGVtcGxhdGU7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBjcmVhdGluZyB0ZW1wbGF0ZScsIHsgZXJyb3IgfSk7XHJcbiAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogVXBkYXRlIGV4aXN0aW5nIHRlbXBsYXRlXHJcbiAgICogXHJcbiAgICogQHBhcmFtIHRlbXBsYXRlSWQgLSBUZW1wbGF0ZSBJRFxyXG4gICAqIEBwYXJhbSB1cGRhdGVzIC0gUGFydGlhbCB0ZW1wbGF0ZSB1cGRhdGVzXHJcbiAgICogQHJldHVybnMgVXBkYXRlZCB0ZW1wbGF0ZVxyXG4gICAqL1xyXG4gIGFzeW5jIHVwZGF0ZVRlbXBsYXRlKFxyXG4gICAgdGVtcGxhdGVJZDogc3RyaW5nLFxyXG4gICAgdXBkYXRlczogUGFydGlhbDxOb3RpZmljYXRpb25UZW1wbGF0ZT5cclxuICApOiBQcm9taXNlPE5vdGlmaWNhdGlvblRlbXBsYXRlPiB7XHJcbiAgICAvLyBJZiBib2R5IGlzIGJlaW5nIHVwZGF0ZWQsIHZhbGlkYXRlIHN5bnRheFxyXG4gICAgaWYgKHVwZGF0ZXMuYm9keSkge1xyXG4gICAgICBjb25zdCB0ZW1wVGVtcGxhdGUgPSB7IC4uLnVwZGF0ZXMsIGJvZHk6IHVwZGF0ZXMuYm9keSB9IGFzIE5vdGlmaWNhdGlvblRlbXBsYXRlO1xyXG4gICAgICBjb25zdCBpc1ZhbGlkID0gYXdhaXQgdGhpcy52YWxpZGF0ZVRlbXBsYXRlKHRlbXBUZW1wbGF0ZSk7XHJcbiAgICAgIGlmICghaXNWYWxpZCkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCB0ZW1wbGF0ZSBzeW50YXgnKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICAvLyBCdWlsZCB1cGRhdGUgZXhwcmVzc2lvblxyXG4gICAgICBjb25zdCB1cGRhdGVFeHByZXNzaW9uczogc3RyaW5nW10gPSBbXTtcclxuICAgICAgY29uc3QgZXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge307XHJcbiAgICAgIGNvbnN0IGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IFJlY29yZDxzdHJpbmcsIGFueT4gPSB7fTtcclxuXHJcbiAgICAgIC8vIEFkZCB1cGRhdGVkQXRcclxuICAgICAgdXBkYXRlRXhwcmVzc2lvbnMucHVzaCgnI3VwZGF0ZWRBdCA9IDp1cGRhdGVkQXQnKTtcclxuICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzWycjdXBkYXRlZEF0J10gPSAndXBkYXRlZEF0JztcclxuICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOnVwZGF0ZWRBdCddID0gbm93O1xyXG5cclxuICAgICAgLy8gQWRkIG90aGVyIGZpZWxkc1xyXG4gICAgICBPYmplY3QuZW50cmllcyh1cGRhdGVzKS5mb3JFYWNoKChba2V5LCB2YWx1ZV0pID0+IHtcclxuICAgICAgICBpZiAoa2V5ICE9PSAndGVtcGxhdGVJZCcgJiYga2V5ICE9PSAnY3JlYXRlZEF0JyAmJiBrZXkgIT09ICd1cGRhdGVkQXQnKSB7XHJcbiAgICAgICAgICB1cGRhdGVFeHByZXNzaW9ucy5wdXNoKGAjJHtrZXl9ID0gOiR7a2V5fWApO1xyXG4gICAgICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzW2AjJHtrZXl9YF0gPSBrZXk7XHJcbiAgICAgICAgICBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzW2A6JHtrZXl9YF0gPSB2YWx1ZTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBVcGRhdGVDb21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IHRoaXMudGFibGVOYW1lLFxyXG4gICAgICAgIEtleTogeyB0ZW1wbGF0ZUlkIH0sXHJcbiAgICAgICAgVXBkYXRlRXhwcmVzc2lvbjogYFNFVCAke3VwZGF0ZUV4cHJlc3Npb25zLmpvaW4oJywgJyl9YCxcclxuICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlTmFtZXM6IGV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lcyxcclxuICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzLFxyXG4gICAgICAgIFJldHVyblZhbHVlczogJ0FMTF9ORVcnLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5kb2NDbGllbnQuc2VuZChjb21tYW5kKTtcclxuICAgICAgcmV0dXJuIHJlc3BvbnNlLkF0dHJpYnV0ZXMgYXMgTm90aWZpY2F0aW9uVGVtcGxhdGU7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciB1cGRhdGluZyB0ZW1wbGF0ZScsIHsgdGVtcGxhdGVJZCwgZXJyb3IgfSk7XHJcbiAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogVmFsaWRhdGUgdGVtcGxhdGUgc3ludGF4XHJcbiAgICogXHJcbiAgICogQHBhcmFtIHRlbXBsYXRlIC0gVGVtcGxhdGUgdG8gdmFsaWRhdGVcclxuICAgKiBAcmV0dXJucyBUcnVlIGlmIHRlbXBsYXRlIGlzIHZhbGlkXHJcbiAgICovXHJcbiAgYXN5bmMgdmFsaWRhdGVUZW1wbGF0ZSh0ZW1wbGF0ZTogTm90aWZpY2F0aW9uVGVtcGxhdGUpOiBQcm9taXNlPGJvb2xlYW4+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIC8vIENoZWNrIGZvciByZXF1aXJlZCBmaWVsZHNcclxuICAgICAgaWYgKCF0ZW1wbGF0ZS5ib2R5KSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcignVGVtcGxhdGUgYm9keSBpcyByZXF1aXJlZCcpO1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gQ2hlY2sgZm9yIGJhbGFuY2VkIGJyYWNlcyBpbiB0ZW1wbGF0ZSB2YXJpYWJsZXNcclxuICAgICAgY29uc3Qgb3BlbkJyYWNlcyA9ICh0ZW1wbGF0ZS5ib2R5Lm1hdGNoKC9cXHtcXHsvZykgfHwgW10pLmxlbmd0aDtcclxuICAgICAgY29uc3QgY2xvc2VCcmFjZXMgPSAodGVtcGxhdGUuYm9keS5tYXRjaCgvXFx9XFx9L2cpIHx8IFtdKS5sZW5ndGg7XHJcblxyXG4gICAgICBpZiAob3BlbkJyYWNlcyAhPT0gY2xvc2VCcmFjZXMpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKCdUZW1wbGF0ZSBoYXMgdW5iYWxhbmNlZCBicmFjZXMnLCB7IG9wZW5CcmFjZXMsIGNsb3NlQnJhY2VzIH0pO1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gRXh0cmFjdCB2YXJpYWJsZXMgZnJvbSB0ZW1wbGF0ZVxyXG4gICAgICBjb25zdCB2YXJpYWJsZU1hdGNoZXMgPSB0ZW1wbGF0ZS5ib2R5Lm1hdGNoKC9cXHtcXHsoXFx3KylcXH1cXH0vZyk7XHJcbiAgICAgIGNvbnN0IGV4dHJhY3RlZFZhcmlhYmxlcyA9IHZhcmlhYmxlTWF0Y2hlc1xyXG4gICAgICAgID8gdmFyaWFibGVNYXRjaGVzLm1hcChtYXRjaCA9PiBtYXRjaC5yZXBsYWNlKC9cXHtcXHt8XFx9XFx9L2csICcnKSlcclxuICAgICAgICA6IFtdO1xyXG5cclxuICAgICAgLy8gQ2hlY2sgZm9yIGludmFsaWQgdmFyaWFibGUgbmFtZXMgKGVtcHR5IG9yIHdpdGggc3BlY2lhbCBjaGFyYWN0ZXJzKVxyXG4gICAgICBjb25zdCBpbnZhbGlkVmFyaWFibGVzID0gZXh0cmFjdGVkVmFyaWFibGVzLmZpbHRlcih2ID0+ICEvXlxcdyskLy50ZXN0KHYpKTtcclxuICAgICAgaWYgKGludmFsaWRWYXJpYWJsZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ1RlbXBsYXRlIGhhcyBpbnZhbGlkIHZhcmlhYmxlIG5hbWVzJywgeyBpbnZhbGlkVmFyaWFibGVzIH0pO1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gVmFsaWRhdGUgZm9ybWF0IG1hdGNoZXMgY2hhbm5lbFxyXG4gICAgICBpZiAodGVtcGxhdGUuY2hhbm5lbCA9PT0gJ2VtYWlsJyAmJiB0ZW1wbGF0ZS5mb3JtYXQgIT09ICdodG1sJyAmJiB0ZW1wbGF0ZS5mb3JtYXQgIT09ICd0ZXh0Jykge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0VtYWlsIHRlbXBsYXRlcyBtdXN0IHVzZSBodG1sIG9yIHRleHQgZm9ybWF0Jyk7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAodGVtcGxhdGUuY2hhbm5lbCA9PT0gJ3NtcycgJiYgdGVtcGxhdGUuZm9ybWF0ICE9PSAndGV4dCcpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKCdTTVMgdGVtcGxhdGVzIG11c3QgdXNlIHRleHQgZm9ybWF0Jyk7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAodGVtcGxhdGUuY2hhbm5lbCA9PT0gJ3NsYWNrJyAmJiB0ZW1wbGF0ZS5mb3JtYXQgIT09ICdzbGFja19ibG9ja3MnKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcignU2xhY2sgdGVtcGxhdGVzIG11c3QgdXNlIHNsYWNrX2Jsb2NrcyBmb3JtYXQnKTtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgdmFsaWRhdGluZyB0ZW1wbGF0ZScsIHsgZXJyb3IgfSk7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICB9XHJcbn1cclxuXHJcbi8vIEV4cG9ydCBzaW5nbGV0b24gaW5zdGFuY2VcclxuZXhwb3J0IGNvbnN0IG5vdGlmaWNhdGlvblRlbXBsYXRlU2VydmljZSA9IG5ldyBOb3RpZmljYXRpb25UZW1wbGF0ZVNlcnZpY2UoKTtcclxuIl19