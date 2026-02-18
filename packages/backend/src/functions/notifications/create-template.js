"use strict";
/**
 * Create Notification Template Lambda
 *
 * Create new notification template (admin only).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const notification_template_service_1 = require("../../services/notification-template-service");
const handler = async (event) => {
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
        const templateData = JSON.parse(event.body);
        // Validate required fields
        if (!templateData.eventType || !templateData.channel || !templateData.format || !templateData.body) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Missing required fields: eventType, channel, format, body' }),
            };
        }
        // Create template (service handles validation)
        const createdTemplate = await notification_template_service_1.notificationTemplateService.createTemplate(templateData);
        return {
            statusCode: 201,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(createdTemplate),
        };
    }
    catch (error) {
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
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlLXRlbXBsYXRlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY3JlYXRlLXRlbXBsYXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7OztHQUlHOzs7QUFHSCxnR0FBMkY7QUFHcEYsTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUFFLEtBQTJCLEVBQWtDLEVBQUU7SUFDM0YsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsRUFBRSxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUU3RCxJQUFJLENBQUM7UUFDSCw0Q0FBNEM7UUFDNUMsK0JBQStCO1FBRS9CLHFCQUFxQjtRQUNyQixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2hCLE9BQU87Z0JBQ0wsVUFBVSxFQUFFLEdBQUc7Z0JBQ2YsT0FBTyxFQUFFLEVBQUUsY0FBYyxFQUFFLGtCQUFrQixFQUFFO2dCQUMvQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEtBQUssRUFBRSwwQkFBMEIsRUFBRSxDQUFDO2FBQzVELENBQUM7UUFDSixDQUFDO1FBRUQsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUF5RSxDQUFDO1FBRXBILDJCQUEyQjtRQUMzQixJQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ25HLE9BQU87Z0JBQ0wsVUFBVSxFQUFFLEdBQUc7Z0JBQ2YsT0FBTyxFQUFFLEVBQUUsY0FBYyxFQUFFLGtCQUFrQixFQUFFO2dCQUMvQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEtBQUssRUFBRSwyREFBMkQsRUFBRSxDQUFDO2FBQzdGLENBQUM7UUFDSixDQUFDO1FBRUQsK0NBQStDO1FBQy9DLE1BQU0sZUFBZSxHQUFHLE1BQU0sMkRBQTJCLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBRXZGLE9BQU87WUFDTCxVQUFVLEVBQUUsR0FBRztZQUNmLE9BQU8sRUFBRSxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBRTtZQUMvQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUM7U0FDdEMsQ0FBQztJQUNKLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyx5QkFBeUIsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7UUFFcEQsTUFBTSxZQUFZLEdBQUcsS0FBSyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsMkJBQTJCLENBQUM7UUFDMUYsTUFBTSxVQUFVLEdBQUcsWUFBWSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsSUFBSSxZQUFZLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztRQUVuRyxPQUFPO1lBQ0wsVUFBVTtZQUNWLE9BQU8sRUFBRSxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBRTtZQUMvQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEtBQUssRUFBRSxZQUFZLEVBQUUsQ0FBQztTQUM5QyxDQUFDO0lBQ0osQ0FBQztBQUNILENBQUMsQ0FBQztBQS9DVyxRQUFBLE9BQU8sV0ErQ2xCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIENyZWF0ZSBOb3RpZmljYXRpb24gVGVtcGxhdGUgTGFtYmRhXHJcbiAqIFxyXG4gKiBDcmVhdGUgbmV3IG5vdGlmaWNhdGlvbiB0ZW1wbGF0ZSAoYWRtaW4gb25seSkuXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBub3RpZmljYXRpb25UZW1wbGF0ZVNlcnZpY2UgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9ub3RpZmljYXRpb24tdGVtcGxhdGUtc2VydmljZSc7XHJcbmltcG9ydCB7IE5vdGlmaWNhdGlvblRlbXBsYXRlIH0gZnJvbSAnLi4vLi4vdHlwZXMvbm90aWZpY2F0aW9uJztcclxuXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XHJcbiAgY29uc29sZS5sb2coJ0NyZWF0ZSB0ZW1wbGF0ZSByZXF1ZXN0JywgeyBwYXRoOiBldmVudC5wYXRoIH0pO1xyXG5cclxuICB0cnkge1xyXG4gICAgLy8gVE9ETzogQWRkIGFkbWluIHJvbGUgY2hlY2sgZnJvbSBKV1QgdG9rZW5cclxuICAgIC8vIEZvciBub3csIGFzc3VtaW5nIGF1dGhvcml6ZWRcclxuXHJcbiAgICAvLyBQYXJzZSByZXF1ZXN0IGJvZHlcclxuICAgIGlmICghZXZlbnQuYm9keSkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcclxuICAgICAgICBoZWFkZXJzOiB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnUmVxdWVzdCBib2R5IGlzIHJlcXVpcmVkJyB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCB0ZW1wbGF0ZURhdGEgPSBKU09OLnBhcnNlKGV2ZW50LmJvZHkpIGFzIE9taXQ8Tm90aWZpY2F0aW9uVGVtcGxhdGUsICd0ZW1wbGF0ZUlkJyB8ICdjcmVhdGVkQXQnIHwgJ3VwZGF0ZWRBdCc+O1xyXG5cclxuICAgIC8vIFZhbGlkYXRlIHJlcXVpcmVkIGZpZWxkc1xyXG4gICAgaWYgKCF0ZW1wbGF0ZURhdGEuZXZlbnRUeXBlIHx8ICF0ZW1wbGF0ZURhdGEuY2hhbm5lbCB8fCAhdGVtcGxhdGVEYXRhLmZvcm1hdCB8fCAhdGVtcGxhdGVEYXRhLmJvZHkpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDAsXHJcbiAgICAgICAgaGVhZGVyczogeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ01pc3NpbmcgcmVxdWlyZWQgZmllbGRzOiBldmVudFR5cGUsIGNoYW5uZWwsIGZvcm1hdCwgYm9keScgfSksXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ3JlYXRlIHRlbXBsYXRlIChzZXJ2aWNlIGhhbmRsZXMgdmFsaWRhdGlvbilcclxuICAgIGNvbnN0IGNyZWF0ZWRUZW1wbGF0ZSA9IGF3YWl0IG5vdGlmaWNhdGlvblRlbXBsYXRlU2VydmljZS5jcmVhdGVUZW1wbGF0ZSh0ZW1wbGF0ZURhdGEpO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDIwMSxcclxuICAgICAgaGVhZGVyczogeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0sXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KGNyZWF0ZWRUZW1wbGF0ZSksXHJcbiAgICB9O1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBjcmVhdGluZyB0ZW1wbGF0ZScsIHsgZXJyb3IgfSk7XHJcbiAgICBcclxuICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ0ZhaWxlZCB0byBjcmVhdGUgdGVtcGxhdGUnO1xyXG4gICAgY29uc3Qgc3RhdHVzQ29kZSA9IGVycm9yTWVzc2FnZS5pbmNsdWRlcygnSW52YWxpZCcpIHx8IGVycm9yTWVzc2FnZS5pbmNsdWRlcygnc3ludGF4JykgPyA0MDAgOiA1MDA7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZSxcclxuICAgICAgaGVhZGVyczogeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0sXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6IGVycm9yTWVzc2FnZSB9KSxcclxuICAgIH07XHJcbiAgfVxyXG59O1xyXG4iXX0=