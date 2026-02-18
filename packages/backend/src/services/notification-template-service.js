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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9uLXRlbXBsYXRlLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJub3RpZmljYXRpb24tdGVtcGxhdGUtc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7O0dBS0c7OztBQUVILDhEQUEwRDtBQUMxRCx3REFBb0g7QUFFcEgsK0JBQW9DO0FBRXBDLE1BQWEsMkJBQTJCO0lBQzlCLFNBQVMsQ0FBeUI7SUFDbEMsU0FBUyxDQUFTO0lBRTFCO1FBQ0UsTUFBTSxNQUFNLEdBQUcsSUFBSSxnQ0FBYyxDQUFDO1lBQ2hDLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXO1NBQzlDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxTQUFTLEdBQUcscUNBQXNCLENBQUMsSUFBSSxDQUFDLE1BQWEsQ0FBQyxDQUFDO1FBQzVELElBQUksQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyw0QkFBNEIsSUFBSSx1QkFBdUIsQ0FBQztJQUN2RixDQUFDO0lBRUQ7Ozs7OztPQU1HO0lBQ0gsS0FBSyxDQUFDLFdBQVcsQ0FBQyxTQUFpQixFQUFFLE9BQTRCO1FBQy9ELElBQUksQ0FBQztZQUNILDBDQUEwQztZQUMxQyxNQUFNLE9BQU8sR0FBRyxJQUFJLDJCQUFZLENBQUM7Z0JBQy9CLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUztnQkFDekIsU0FBUyxFQUFFLHVCQUF1QjtnQkFDbEMsc0JBQXNCLEVBQUUsK0NBQStDO2dCQUN2RSx5QkFBeUIsRUFBRTtvQkFDekIsWUFBWSxFQUFFLFNBQVM7b0JBQ3ZCLFVBQVUsRUFBRSxPQUFPO2lCQUNwQjtnQkFDRCxLQUFLLEVBQUUsQ0FBQzthQUNULENBQUMsQ0FBQztZQUVILE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFcEQsSUFBSSxRQUFRLENBQUMs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LENBQUM7WUFDZixDQUFDO1lBRUQsSUFBSSxRQUFRLENBQUMsT0FBTyxLQUFLLEtBQUssSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLE1BQU0sRUFBRSxDQUFDO2dCQUM3RCxPQUFPLENBQUMsS0FBSyxDQUFDLG9DQUFvQyxDQUFDLENBQUM7Z0JBQ3BELE9BQU8sS0FBSyxDQUFDO1lBQ2YsQ0FBQztZQUVELElBQUksUUFBUSxDQUFDLE9BQU8sS0FBSyxPQUFPLElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxjQUFjLEVBQUUsQ0FBQztnQkFDdkUsT0FBTyxDQUFDLEtBQUssQ0FBQyw4Q0FBOEMsQ0FBQyxDQUFDO2dCQUM5RCxPQUFPLEtBQUssQ0FBQztZQUNmLENBQUM7WUFFRCxPQUFPLElBQUksQ0FBQztRQUNkLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQywyQkFBMkIsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7WUFDdEQsT0FBTyxLQUFLLENBQUM7UUFDZixDQUFDO0lBQ0gsQ0FBQztDQUNGO0FBNU9ELGtFQTRPQztBQUVELDRCQUE0QjtBQUNmLFFBQUEsMkJBQTJCLEdBQUcsSUFBSSwyQkFBMkIsRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIE5vdGlmaWNhdGlvbiBUZW1wbGF0ZSBTZXJ2aWNlXHJcbiAqIFxyXG4gKiBNYW5hZ2VzIG5vdGlmaWNhdGlvbiB0ZW1wbGF0ZXMgd2l0aCB2YXJpYWJsZSBzdWJzdGl0dXRpb24gZm9yIGRpZmZlcmVudCBldmVudCB0eXBlcyBhbmQgY2hhbm5lbHMuXHJcbiAqIFN1cHBvcnRzIHRlbXBsYXRlIENSVUQgb3BlcmF0aW9ucywgcmVuZGVyaW5nLCBhbmQgdmFsaWRhdGlvbi5cclxuICovXHJcblxyXG5pbXBvcnQgeyBEeW5hbW9EQkNsaWVudCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYic7XHJcbmltcG9ydCB7IER5bmFtb0RCRG9jdW1lbnRDbGllbnQsIEdldENvbW1hbmQsIFB1dENvbW1hbmQsIFVwZGF0ZUNvbW1hbmQsIFF1ZXJ5Q29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2xpYi1keW5hbW9kYic7XHJcbmltcG9ydCB7IE5vdGlmaWNhdGlvblRlbXBsYXRlLCBUZW1wbGF0ZVJlbmRlckNvbnRleHQsIE5vdGlmaWNhdGlvbkNoYW5uZWwgfSBmcm9tICcuLi90eXBlcy9ub3RpZmljYXRpb24nO1xyXG5pbXBvcnQgeyB2NCBhcyB1dWlkdjQgfSBmcm9tICd1dWlkJztcclxuXHJcbmV4cG9ydCBjbGFzcyBOb3RpZmljYXRpb25UZW1wbGF0ZVNlcnZpY2Uge1xyXG4gIHByaXZhdGUgZG9jQ2xpZW50OiBEeW5hbW9EQkRvY3VtZW50Q2xpZW50O1xyXG4gIHByaXZhdGUgdGFibGVOYW1lOiBzdHJpbmc7XHJcblxyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgY29uc3QgY2xpZW50ID0gbmV3IER5bmFtb0RCQ2xpZW50KHtcclxuICAgICAgcmVnaW9uOiBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIHx8ICd1cy1lYXN0LTEnLFxyXG4gICAgfSk7XHJcbiAgICB0aGlzLmRvY0NsaWVudCA9IER5bmFtb0RCRG9jdW1lbnRDbGllbnQuZnJvbShjbGllbnQgYXMgYW55KTtcclxuICAgIHRoaXMudGFibGVOYW1lID0gcHJvY2Vzcy5lbnYuTk9USUZJQ0FUSU9OX1RFTVBMQVRFU19UQUJMRSB8fCAnTm90aWZpY2F0aW9uVGVtcGxhdGVzJztcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCB0ZW1wbGF0ZSBieSBldmVudCB0eXBlIGFuZCBjaGFubmVsXHJcbiAgICogXHJcbiAgICogQHBhcmFtIGV2ZW50VHlwZSAtIEV2ZW50IHR5cGUgKHRlc3RfY29tcGxldGlvbiwgdGVzdF9mYWlsdXJlLCBldGMuKVxyXG4gICAqIEBwYXJhbSBjaGFubmVsIC0gTm90aWZpY2F0aW9uIGNoYW5uZWwgKGVtYWlsLCBzbXMsIHNsYWNrLCB3ZWJob29rKVxyXG4gICAqIEByZXR1cm5zIE5vdGlmaWNhdGlvbiB0ZW1wbGF0ZSBvciBudWxsIGlmIG5vdCBmb3VuZFxyXG4gICAqL1xyXG4gIGFzeW5jIGdldFRlbXBsYXRlKGV2ZW50VHlwZTogc3RyaW5nLCBjaGFubmVsOiBOb3RpZmljYXRpb25DaGFubmVsKTogUHJvbWlzZTxOb3RpZmljYXRpb25UZW1wbGF0ZSB8IG51bGw+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIC8vIFF1ZXJ5IHVzaW5nIEdTSSAoRXZlbnRUeXBlQ2hhbm5lbEluZGV4KVxyXG4gICAgICBjb25zdCBjb21tYW5kID0gbmV3IFF1ZXJ5Q29tbWFuZCh7XHJcbiAgICAgICAgVGFibGVOYW1lOiB0aGlzLnRhYmxlTmFtZSxcclxuICAgICAgICBJbmRleE5hbWU6ICdFdmVudFR5cGVDaGFubmVsSW5kZXgnLFxyXG4gICAgICAgIEtleUNvbmRpdGlvbkV4cHJlc3Npb246ICdldmVudFR5cGUgPSA6ZXZlbnRUeXBlIEFORCBjaGFubmVsID0gOmNoYW5uZWwnLFxyXG4gICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcclxuICAgICAgICAgICc6ZXZlbnRUeXBlJzogZXZlbnRUeXBlLFxyXG4gICAgICAgICAgJzpjaGFubmVsJzogY2hhbm5lbCxcclxuICAgICAgICB9LFxyXG4gICAgICAgIExpbWl0OiAxLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5kb2NDbGllbnQuc2VuZChjb21tYW5kKTtcclxuXHJcbiAgICAgIGlmIChyZXNwb25zZS5JdGVtcyAmJiByZXNwb25zZS5JdGVtcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlLkl0ZW1zWzBdIGFzIE5vdGlmaWNhdGlvblRlbXBsYXRlO1xyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm4gbnVsbDtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGdldHRpbmcgdGVtcGxhdGUnLCB7IGV2ZW50VHlwZSwgY2hhbm5lbCwgZXJyb3IgfSk7XHJcbiAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUmVuZGVyIHRlbXBsYXRlIHdpdGggdmFyaWFibGUgc3Vic3RpdHV0aW9uXHJcbiAgICogXHJcbiAgICogQHBhcmFtIHRlbXBsYXRlIC0gTm90aWZpY2F0aW9uIHRlbXBsYXRlXHJcbiAgICogQHBhcmFtIGNvbnRleHQgLSBSZW5kZXIgY29udGV4dCB3aXRoIHZhcmlhYmxlIHZhbHVlc1xyXG4gICAqIEByZXR1cm5zIFJlbmRlcmVkIHRlbXBsYXRlIHN0cmluZ1xyXG4gICAqL1xyXG4gIGFzeW5jIHJlbmRlclRlbXBsYXRlKHRlbXBsYXRlOiBOb3RpZmljYXRpb25UZW1wbGF0ZSwgY29udGV4dDogVGVtcGxhdGVSZW5kZXJDb250ZXh0KTogUHJvbWlzZTxzdHJpbmc+IHtcclxuICAgIGxldCByZW5kZXJlZCA9IHRlbXBsYXRlLmJvZHk7XHJcblxyXG4gICAgLy8gUmVwbGFjZSBhbGwge3t2YXJpYWJsZX19IHBsYWNlaG9sZGVycyB3aXRoIGNvbnRleHQgdmFsdWVzXHJcbiAgICByZW5kZXJlZCA9IHJlbmRlcmVkLnJlcGxhY2UoL1xce1xceyhcXHcrKVxcfVxcfS9nLCAobWF0Y2gsIHZhcmlhYmxlKSA9PiB7XHJcbiAgICAgIGNvbnN0IHZhbHVlID0gY29udGV4dFt2YXJpYWJsZSBhcyBrZXlvZiBUZW1wbGF0ZVJlbmRlckNvbnRleHRdO1xyXG4gICAgICBcclxuICAgICAgLy8gSGFuZGxlIG1pc3NpbmcgdmFyaWFibGVzIHdpdGggZGVmYXVsdCB2YWx1ZSAoZW1wdHkgc3RyaW5nKVxyXG4gICAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gbnVsbCkge1xyXG4gICAgICAgIGNvbnNvbGUud2FybihgVGVtcGxhdGUgdmFyaWFibGUgJyR7dmFyaWFibGV9JyBub3QgZm91bmQgaW4gY29udGV4dCwgdXNpbmcgZW1wdHkgc3RyaW5nYCk7XHJcbiAgICAgICAgcmV0dXJuICcnO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBIYW5kbGUgYXJyYXlzIChsaWtlIHNjcmVlbnNob3RVcmxzKVxyXG4gICAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcclxuICAgICAgICByZXR1cm4gdmFsdWUuam9pbignLCAnKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gSGFuZGxlIG9iamVjdHMgKGxpa2UgcmVwb3J0RGF0YSlcclxuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcpIHtcclxuICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkodmFsdWUpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm4gU3RyaW5nKHZhbHVlKTtcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiByZW5kZXJlZDtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENyZWF0ZSBuZXcgdGVtcGxhdGVcclxuICAgKiBcclxuICAgKiBAcGFyYW0gdGVtcGxhdGUgLSBUZW1wbGF0ZSBkYXRhIHdpdGhvdXQgSUQgYW5kIHRpbWVzdGFtcHNcclxuICAgKiBAcmV0dXJucyBDcmVhdGVkIHRlbXBsYXRlIHdpdGggSUQgYW5kIHRpbWVzdGFtcHNcclxuICAgKi9cclxuICBhc3luYyBjcmVhdGVUZW1wbGF0ZShcclxuICAgIHRlbXBsYXRlOiBPbWl0PE5vdGlmaWNhdGlvblRlbXBsYXRlLCAndGVtcGxhdGVJZCcgfCAnY3JlYXRlZEF0JyB8ICd1cGRhdGVkQXQnPlxyXG4gICk6IFByb21pc2U8Tm90aWZpY2F0aW9uVGVtcGxhdGU+IHtcclxuICAgIC8vIFZhbGlkYXRlIHRlbXBsYXRlIHN5bnRheCBiZWZvcmUgY3JlYXRpbmdcclxuICAgIGNvbnN0IGlzVmFsaWQgPSBhd2FpdCB0aGlzLnZhbGlkYXRlVGVtcGxhdGUodGVtcGxhdGUgYXMgTm90aWZpY2F0aW9uVGVtcGxhdGUpO1xyXG4gICAgaWYgKCFpc1ZhbGlkKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCB0ZW1wbGF0ZSBzeW50YXgnKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XHJcbiAgICBjb25zdCBuZXdUZW1wbGF0ZTogTm90aWZpY2F0aW9uVGVtcGxhdGUgPSB7XHJcbiAgICAgIC4uLnRlbXBsYXRlLFxyXG4gICAgICB0ZW1wbGF0ZUlkOiB1dWlkdjQoKSxcclxuICAgICAgY3JlYXRlZEF0OiBub3csXHJcbiAgICAgIHVwZGF0ZWRBdDogbm93LFxyXG4gICAgfTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBjb21tYW5kID0gbmV3IFB1dENvbW1hbmQoe1xyXG4gICAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXHJcbiAgICAgICAgSXRlbTogbmV3VGVtcGxhdGUsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgYXdhaXQgdGhpcy5kb2NDbGllbnQuc2VuZChjb21tYW5kKTtcclxuICAgICAgcmV0dXJuIG5ld1RlbXBsYXRlO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgY3JlYXRpbmcgdGVtcGxhdGUnLCB7IGVycm9yIH0pO1xyXG4gICAgICB0aHJvdyBlcnJvcjtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFVwZGF0ZSBleGlzdGluZyB0ZW1wbGF0ZVxyXG4gICAqIFxyXG4gICAqIEBwYXJhbSB0ZW1wbGF0ZUlkIC0gVGVtcGxhdGUgSURcclxuICAgKiBAcGFyYW0gdXBkYXRlcyAtIFBhcnRpYWwgdGVtcGxhdGUgdXBkYXRlc1xyXG4gICAqIEByZXR1cm5zIFVwZGF0ZWQgdGVtcGxhdGVcclxuICAgKi9cclxuICBhc3luYyB1cGRhdGVUZW1wbGF0ZShcclxuICAgIHRlbXBsYXRlSWQ6IHN0cmluZyxcclxuICAgIHVwZGF0ZXM6IFBhcnRpYWw8Tm90aWZpY2F0aW9uVGVtcGxhdGU+XHJcbiAgKTogUHJvbWlzZTxOb3RpZmljYXRpb25UZW1wbGF0ZT4ge1xyXG4gICAgLy8gSWYgYm9keSBpcyBiZWluZyB1cGRhdGVkLCB2YWxpZGF0ZSBzeW50YXhcclxuICAgIGlmICh1cGRhdGVzLmJvZHkpIHtcclxuICAgICAgY29uc3QgdGVtcFRlbXBsYXRlID0geyAuLi51cGRhdGVzLCBib2R5OiB1cGRhdGVzLmJvZHkgfSBhcyBOb3RpZmljYXRpb25UZW1wbGF0ZTtcclxuICAgICAgY29uc3QgaXNWYWxpZCA9IGF3YWl0IHRoaXMudmFsaWRhdGVUZW1wbGF0ZSh0ZW1wVGVtcGxhdGUpO1xyXG4gICAgICBpZiAoIWlzVmFsaWQpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgdGVtcGxhdGUgc3ludGF4Jyk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gQnVpbGQgdXBkYXRlIGV4cHJlc3Npb25cclxuICAgICAgY29uc3QgdXBkYXRlRXhwcmVzc2lvbnM6IHN0cmluZ1tdID0gW107XHJcbiAgICAgIGNvbnN0IGV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xyXG4gICAgICBjb25zdCBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiBSZWNvcmQ8c3RyaW5nLCBhbnk+ID0ge307XHJcblxyXG4gICAgICAvLyBBZGQgdXBkYXRlZEF0XHJcbiAgICAgIHVwZGF0ZUV4cHJlc3Npb25zLnB1c2goJyN1cGRhdGVkQXQgPSA6dXBkYXRlZEF0Jyk7XHJcbiAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lc1snI3VwZGF0ZWRBdCddID0gJ3VwZGF0ZWRBdCc7XHJcbiAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNbJzp1cGRhdGVkQXQnXSA9IG5vdztcclxuXHJcbiAgICAgIC8vIEFkZCBvdGhlciBmaWVsZHNcclxuICAgICAgT2JqZWN0LmVudHJpZXModXBkYXRlcykuZm9yRWFjaCgoW2tleSwgdmFsdWVdKSA9PiB7XHJcbiAgICAgICAgaWYgKGtleSAhPT0gJ3RlbXBsYXRlSWQnICYmIGtleSAhPT0gJ2NyZWF0ZWRBdCcgJiYga2V5ICE9PSAndXBkYXRlZEF0Jykge1xyXG4gICAgICAgICAgdXBkYXRlRXhwcmVzc2lvbnMucHVzaChgIyR7a2V5fSA9IDoke2tleX1gKTtcclxuICAgICAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lc1tgIyR7a2V5fWBdID0ga2V5O1xyXG4gICAgICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1tgOiR7a2V5fWBdID0gdmFsdWU7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgVXBkYXRlQ29tbWFuZCh7XHJcbiAgICAgICAgVGFibGVOYW1lOiB0aGlzLnRhYmxlTmFtZSxcclxuICAgICAgICBLZXk6IHsgdGVtcGxhdGVJZCB9LFxyXG4gICAgICAgIFVwZGF0ZUV4cHJlc3Npb246IGBTRVQgJHt1cGRhdGVFeHByZXNzaW9ucy5qb2luKCcsICcpfWAsXHJcbiAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzOiBleHByZXNzaW9uQXR0cmlidXRlTmFtZXMsXHJcbiAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczogZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlcyxcclxuICAgICAgICBSZXR1cm5WYWx1ZXM6ICdBTExfTkVXJyxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMuZG9jQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcbiAgICAgIHJldHVybiByZXNwb25zZS5BdHRyaWJ1dGVzIGFzIE5vdGlmaWNhdGlvblRlbXBsYXRlO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgdXBkYXRpbmcgdGVtcGxhdGUnLCB7IHRlbXBsYXRlSWQsIGVycm9yIH0pO1xyXG4gICAgICB0aHJvdyBlcnJvcjtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFZhbGlkYXRlIHRlbXBsYXRlIHN5bnRheFxyXG4gICAqIFxyXG4gICAqIEBwYXJhbSB0ZW1wbGF0ZSAtIFRlbXBsYXRlIHRvIHZhbGlkYXRlXHJcbiAgICogQHJldHVybnMgVHJ1ZSBpZiB0ZW1wbGF0ZSBpcyB2YWxpZFxyXG4gICAqL1xyXG4gIGFzeW5jIHZhbGlkYXRlVGVtcGxhdGUodGVtcGxhdGU6IE5vdGlmaWNhdGlvblRlbXBsYXRlKTogUHJvbWlzZTxib29sZWFuPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICAvLyBDaGVjayBmb3IgcmVxdWlyZWQgZmllbGRzXHJcbiAgICAgIGlmICghdGVtcGxhdGUuYm9keSkge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ1RlbXBsYXRlIGJvZHkgaXMgcmVxdWlyZWQnKTtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIENoZWNrIGZvciBiYWxhbmNlZCBicmFjZXMgaW4gdGVtcGxhdGUgdmFyaWFibGVzXHJcbiAgICAgIGNvbnN0IG9wZW5CcmFjZXMgPSAodGVtcGxhdGUuYm9keS5tYXRjaCgvXFx7XFx7L2cpIHx8IFtdKS5sZW5ndGg7XHJcbiAgICAgIGNvbnN0IGNsb3NlQnJhY2VzID0gKHRlbXBsYXRlLmJvZHkubWF0Y2goL1xcfVxcfS9nKSB8fCBbXSkubGVuZ3RoO1xyXG5cclxuICAgICAgaWYgKG9wZW5CcmFjZXMgIT09IGNsb3NlQnJhY2VzKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcignVGVtcGxhdGUgaGFzIHVuYmFsYW5jZWQgYnJhY2VzJywgeyBvcGVuQnJhY2VzLCBjbG9zZUJyYWNlcyB9KTtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIEV4dHJhY3QgdmFyaWFibGVzIGZyb20gdGVtcGxhdGVcclxuICAgICAgY29uc3QgdmFyaWFibGVNYXRjaGVzID0gdGVtcGxhdGUuYm9keS5tYXRjaCgvXFx7XFx7KFxcdyspXFx9XFx9L2cpO1xyXG4gICAgICBjb25zdCBleHRyYWN0ZWRWYXJpYWJsZXMgPSB2YXJpYWJsZU1hdGNoZXNcclxuICAgICAgICA/IHZhcmlhYmxlTWF0Y2hlcy5tYXAobWF0Y2ggPT4gbWF0Y2gucmVwbGFjZSgvXFx7XFx7fFxcfVxcfS9nLCAnJykpXHJcbiAgICAgICAgOiBbXTtcclxuXHJcbiAgICAgIC8vIENoZWNrIGZvciBpbnZhbGlkIHZhcmlhYmxlIG5hbWVzIChlbXB0eSBvciB3aXRoIHNwZWNpYWwgY2hhcmFjdGVycylcclxuICAgICAgY29uc3QgaW52YWxpZFZhcmlhYmxlcyA9IGV4dHJhY3RlZFZhcmlhYmxlcy5maWx0ZXIodiA9PiAhL15cXHcrJC8udGVzdCh2KSk7XHJcbiAgICAgIGlmIChpbnZhbGlkVmFyaWFibGVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKCdUZW1wbGF0ZSBoYXMgaW52YWxpZCB2YXJpYWJsZSBuYW1lcycsIHsgaW52YWxpZFZhcmlhYmxlcyB9KTtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFZhbGlkYXRlIGZvcm1hdCBtYXRjaGVzIGNoYW5uZWxcclxuICAgICAgaWYgKHRlbXBsYXRlLmNoYW5uZWwgPT09ICdlbWFpbCcgJiYgdGVtcGxhdGUuZm9ybWF0ICE9PSAnaHRtbCcgJiYgdGVtcGxhdGUuZm9ybWF0ICE9PSAndGV4dCcpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKCdFbWFpbCB0ZW1wbGF0ZXMgbXVzdCB1c2UgaHRtbCBvciB0ZXh0IGZvcm1hdCcpO1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKHRlbXBsYXRlLmNoYW5uZWwgPT09ICdzbXMnICYmIHRlbXBsYXRlLmZvcm1hdCAhPT0gJ3RleHQnKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcignU01TIHRlbXBsYXRlcyBtdXN0IHVzZSB0ZXh0IGZvcm1hdCcpO1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKHRlbXBsYXRlLmNoYW5uZWwgPT09ICdzbGFjaycgJiYgdGVtcGxhdGUuZm9ybWF0ICE9PSAnc2xhY2tfYmxvY2tzJykge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ1NsYWNrIHRlbXBsYXRlcyBtdXN0IHVzZSBzbGFja19ibG9ja3MgZm9ybWF0Jyk7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHZhbGlkYXRpbmcgdGVtcGxhdGUnLCB7IGVycm9yIH0pO1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG4vLyBFeHBvcnQgc2luZ2xldG9uIGluc3RhbmNlXHJcbmV4cG9ydCBjb25zdCBub3RpZmljYXRpb25UZW1wbGF0ZVNlcnZpY2UgPSBuZXcgTm90aWZpY2F0aW9uVGVtcGxhdGVTZXJ2aWNlKCk7XHJcbiJdfQ==