"use strict";
/**
 * Template Seeding Lambda
 *
 * Seeds default notification templates into DynamoDB.
 * Can be triggered manually or during stack deployment via custom resource.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const notification_template_service_1 = require("../../services/notification-template-service");
const default_notification_templates_1 = require("../../data/default-notification-templates");
/**
 * Lambda handler for seeding default templates
 */
const handler = async (event) => {
    console.log('Starting template seeding', { templateCount: default_notification_templates_1.defaultTemplates.length });
    const result = {
        success: true,
        templatesCreated: 0,
        templatesSkipped: 0,
        errors: [],
    };
    for (const template of default_notification_templates_1.defaultTemplates) {
        try {
            // Check if template already exists
            const existing = await notification_template_service_1.notificationTemplateService.getTemplate(template.eventType, template.channel);
            if (existing) {
                console.log('Template already exists, skipping', {
                    eventType: template.eventType,
                    channel: template.channel,
                });
                result.templatesSkipped++;
                continue;
            }
            // Create new template
            await notification_template_service_1.notificationTemplateService.createTemplate(template);
            console.log('Template created successfully', {
                eventType: template.eventType,
                channel: template.channel,
            });
            result.templatesCreated++;
        }
        catch (error) {
            const errorMessage = `Failed to create template for ${template.eventType}/${template.channel}: ${error}`;
            console.error(errorMessage, { error });
            result.errors.push(errorMessage);
            result.success = false;
        }
    }
    console.log('Template seeding completed', result);
    return result;
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VlZC10ZW1wbGF0ZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzZWVkLXRlbXBsYXRlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7O0dBS0c7OztBQUdILGdHQUEyRjtBQUMzRiw4RkFBNkU7QUFTN0U7O0dBRUc7QUFDSSxNQUFNLE9BQU8sR0FBWSxLQUFLLEVBQUUsS0FBSyxFQUF1QixFQUFFO0lBQ25FLE9BQU8sQ0FBQyxHQUFHLENBQUMsMkJBQTJCLEVBQUUsRUFBRSxhQUFhLEVBQUUsaURBQWdCLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztJQUVyRixNQUFNLE1BQU0sR0FBZTtRQUN6QixPQUFPLEVBQUUsSUFBSTtRQUNiLGdCQUFnQixFQUFFLENBQUM7UUFDbkIsZ0JBQWdCLEVBQUUsQ0FBQztRQUNuQixNQUFNLEVBQUUsRUFBRTtLQUNYLENBQUM7SUFFRixLQUFLLE1BQU0sUUFBUSxJQUFJLGlEQUFnQixFQUFFLENBQUM7UUFDeEMsSUFBSSxDQUFDO1lBQ0gsbUNBQW1DO1lBQ25DLE1BQU0sUUFBUSxHQUFHLE1BQU0sMkRBQTJCLENBQUMsV0FBVyxDQUM1RCxRQUFRLENBQUMsU0FBUyxFQUNsQixRQUFRLENBQUMsT0FBTyxDQUNqQixDQUFDO1lBRUYsSUFBSSxRQUFRLEVBQUUsQ0FBQztnQkFDYixPQUFPLENBQUMsR0FBRyxDQUFDLG1DQUFtQyxFQUFFO29CQUMvQyxTQUFTLEVBQUUsUUFBUSxDQUFDLFNBQVM7b0JBQzdCLE9BQU8sRUFBRSxRQUFRLENBQUMsT0FBTztpQkFDMUIsQ0FBQyxDQUFDO2dCQUNILE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO2dCQUMxQixTQUFTO1lBQ1gsQ0FBQztZQUVELHNCQUFzQjtZQUN0QixNQUFNLDJEQUEyQixDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUMzRCxPQUFPLENBQUMsR0FBRyxDQUFDLCtCQUErQixFQUFFO2dCQUMzQyxTQUFTLEVBQUUsUUFBUSxDQUFDLFNBQVM7Z0JBQzdCLE9BQU8sRUFBRSxRQUFRLENBQUMsT0FBTzthQUMxQixDQUFDLENBQUM7WUFDSCxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUM1QixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNmLE1BQU0sWUFBWSxHQUFHLGlDQUFpQyxRQUFRLENBQUMsU0FBUyxJQUFJLFFBQVEsQ0FBQyxPQUFPLEtBQUssS0FBSyxFQUFFLENBQUM7WUFDekcsT0FBTyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1lBQ3ZDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQ2pDLE1BQU0sQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDO1FBQ3pCLENBQUM7SUFDSCxDQUFDO0lBRUQsT0FBTyxDQUFDLEdBQUcsQ0FBQyw0QkFBNEIsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUVsRCxPQUFPLE1BQU0sQ0FBQztBQUNoQixDQUFDLENBQUM7QUE3Q1csUUFBQSxPQUFPLFdBNkNsQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBUZW1wbGF0ZSBTZWVkaW5nIExhbWJkYVxyXG4gKiBcclxuICogU2VlZHMgZGVmYXVsdCBub3RpZmljYXRpb24gdGVtcGxhdGVzIGludG8gRHluYW1vREIuXHJcbiAqIENhbiBiZSB0cmlnZ2VyZWQgbWFudWFsbHkgb3IgZHVyaW5nIHN0YWNrIGRlcGxveW1lbnQgdmlhIGN1c3RvbSByZXNvdXJjZS5cclxuICovXHJcblxyXG5pbXBvcnQgeyBIYW5kbGVyIH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IG5vdGlmaWNhdGlvblRlbXBsYXRlU2VydmljZSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL25vdGlmaWNhdGlvbi10ZW1wbGF0ZS1zZXJ2aWNlJztcclxuaW1wb3J0IHsgZGVmYXVsdFRlbXBsYXRlcyB9IGZyb20gJy4uLy4uL2RhdGEvZGVmYXVsdC1ub3RpZmljYXRpb24tdGVtcGxhdGVzJztcclxuXHJcbmludGVyZmFjZSBTZWVkUmVzdWx0IHtcclxuICBzdWNjZXNzOiBib29sZWFuO1xyXG4gIHRlbXBsYXRlc0NyZWF0ZWQ6IG51bWJlcjtcclxuICB0ZW1wbGF0ZXNTa2lwcGVkOiBudW1iZXI7XHJcbiAgZXJyb3JzOiBzdHJpbmdbXTtcclxufVxyXG5cclxuLyoqXHJcbiAqIExhbWJkYSBoYW5kbGVyIGZvciBzZWVkaW5nIGRlZmF1bHQgdGVtcGxhdGVzXHJcbiAqL1xyXG5leHBvcnQgY29uc3QgaGFuZGxlcjogSGFuZGxlciA9IGFzeW5jIChldmVudCk6IFByb21pc2U8U2VlZFJlc3VsdD4gPT4ge1xyXG4gIGNvbnNvbGUubG9nKCdTdGFydGluZyB0ZW1wbGF0ZSBzZWVkaW5nJywgeyB0ZW1wbGF0ZUNvdW50OiBkZWZhdWx0VGVtcGxhdGVzLmxlbmd0aCB9KTtcclxuXHJcbiAgY29uc3QgcmVzdWx0OiBTZWVkUmVzdWx0ID0ge1xyXG4gICAgc3VjY2VzczogdHJ1ZSxcclxuICAgIHRlbXBsYXRlc0NyZWF0ZWQ6IDAsXHJcbiAgICB0ZW1wbGF0ZXNTa2lwcGVkOiAwLFxyXG4gICAgZXJyb3JzOiBbXSxcclxuICB9O1xyXG5cclxuICBmb3IgKGNvbnN0IHRlbXBsYXRlIG9mIGRlZmF1bHRUZW1wbGF0ZXMpIHtcclxuICAgIHRyeSB7XHJcbiAgICAgIC8vIENoZWNrIGlmIHRlbXBsYXRlIGFscmVhZHkgZXhpc3RzXHJcbiAgICAgIGNvbnN0IGV4aXN0aW5nID0gYXdhaXQgbm90aWZpY2F0aW9uVGVtcGxhdGVTZXJ2aWNlLmdldFRlbXBsYXRlKFxyXG4gICAgICAgIHRlbXBsYXRlLmV2ZW50VHlwZSxcclxuICAgICAgICB0ZW1wbGF0ZS5jaGFubmVsXHJcbiAgICAgICk7XHJcblxyXG4gICAgICBpZiAoZXhpc3RpbmcpIHtcclxuICAgICAgICBjb25zb2xlLmxvZygnVGVtcGxhdGUgYWxyZWFkeSBleGlzdHMsIHNraXBwaW5nJywge1xyXG4gICAgICAgICAgZXZlbnRUeXBlOiB0ZW1wbGF0ZS5ldmVudFR5cGUsXHJcbiAgICAgICAgICBjaGFubmVsOiB0ZW1wbGF0ZS5jaGFubmVsLFxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHJlc3VsdC50ZW1wbGF0ZXNTa2lwcGVkKys7XHJcbiAgICAgICAgY29udGludWU7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIENyZWF0ZSBuZXcgdGVtcGxhdGVcclxuICAgICAgYXdhaXQgbm90aWZpY2F0aW9uVGVtcGxhdGVTZXJ2aWNlLmNyZWF0ZVRlbXBsYXRlKHRlbXBsYXRlKTtcclxuICAgICAgY29uc29sZS5sb2coJ1RlbXBsYXRlIGNyZWF0ZWQgc3VjY2Vzc2Z1bGx5Jywge1xyXG4gICAgICAgIGV2ZW50VHlwZTogdGVtcGxhdGUuZXZlbnRUeXBlLFxyXG4gICAgICAgIGNoYW5uZWw6IHRlbXBsYXRlLmNoYW5uZWwsXHJcbiAgICAgIH0pO1xyXG4gICAgICByZXN1bHQudGVtcGxhdGVzQ3JlYXRlZCsrO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gYEZhaWxlZCB0byBjcmVhdGUgdGVtcGxhdGUgZm9yICR7dGVtcGxhdGUuZXZlbnRUeXBlfS8ke3RlbXBsYXRlLmNoYW5uZWx9OiAke2Vycm9yfWA7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3JNZXNzYWdlLCB7IGVycm9yIH0pO1xyXG4gICAgICByZXN1bHQuZXJyb3JzLnB1c2goZXJyb3JNZXNzYWdlKTtcclxuICAgICAgcmVzdWx0LnN1Y2Nlc3MgPSBmYWxzZTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGNvbnNvbGUubG9nKCdUZW1wbGF0ZSBzZWVkaW5nIGNvbXBsZXRlZCcsIHJlc3VsdCk7XHJcblxyXG4gIHJldHVybiByZXN1bHQ7XHJcbn07XHJcbiJdfQ==