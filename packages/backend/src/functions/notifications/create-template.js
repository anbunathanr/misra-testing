"use strict";
/**
 * Create Notification Template Lambda
 *
 * Create new notification template (admin only).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const auth_util_1 = require("../../utils/auth-util");
const notification_template_service_1 = require("../../services/notification-template-service");
const handler = async (event) => {
    console.log('Create template request', { path: event.path });
    try {
        // Extract user from request context (populated by Lambda Authorizer)
        const user = await (0, auth_util_1.getUserFromContext)(event);
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
        const templateData = JSON.parse(event.body);
        // Validate required fields
        if (!templateData.eventType || !templateData.channel || !templateData.format || !templateData.body) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    error: {
                        code: 'INVALID_REQUEST',
                        message: 'Missing required fields: eventType, channel, format, body',
                        timestamp: new Date().toISOString(),
                    },
                }),
            };
        }
        // Create template (service handles validation)
        const createdTemplate = await notification_template_service_1.notificationTemplateService.createTemplate(templateData);
        return {
            statusCode: 201,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify(createdTemplate),
        };
    }
    catch (error) {
        console.error('Error creating template', { error });
        const errorMessage = error instanceof Error ? error.message : 'Failed to create template';
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
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlLXRlbXBsYXRlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY3JlYXRlLXRlbXBsYXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7OztHQUlHOzs7QUFHSCxxREFBMkQ7QUFDM0QsZ0dBQTJGO0FBR3BGLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxLQUEyQixFQUFrQyxFQUFFO0lBQzNGLE9BQU8sQ0FBQyxHQUFHLENBQUMseUJBQXlCLEVBQUUsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7SUFFN0QsSUFBSSxDQUFDO1FBQ0gscUVBQXFFO1FBQ3JFLE1BQU0sSUFBSSxHQUFHLE1BQU0sSUFBQSw4QkFBa0IsRUFBQyxLQUFLLENBQUMsQ0FBQztRQUU3QyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2pCLE9BQU87Z0JBQ0wsVUFBVSxFQUFFLEdBQUc7Z0JBQ2YsT0FBTyxFQUFFO29CQUNQLGNBQWMsRUFBRSxrQkFBa0I7b0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7aUJBQ25DO2dCQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO29CQUNuQixLQUFLLEVBQUU7d0JBQ0wsSUFBSSxFQUFFLGNBQWM7d0JBQ3BCLE9BQU8sRUFBRSx3QkFBd0I7d0JBQ2pDLFNBQVMsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTtxQkFDcEM7aUJBQ0YsQ0FBQzthQUNILENBQUM7UUFDSixDQUFDO1FBRUQsbUJBQW1CO1FBQ25CLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxPQUFPLEVBQUUsQ0FBQztZQUMxQixPQUFPO2dCQUNMLFVBQVUsRUFBRSxHQUFHO2dCQUNmLE9BQU8sRUFBRTtvQkFDUCxjQUFjLEVBQUUsa0JBQWtCO29CQUNsQyw2QkFBNkIsRUFBRSxHQUFHO2lCQUNuQztnQkFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztvQkFDbkIs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QUNwQzthQUNGLENBQUM7U0FDSCxDQUFDO0lBQ0osQ0FBQztBQUNILENBQUMsQ0FBQztBQWhIVyxRQUFBLE9BQU8sV0FnSGxCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIENyZWF0ZSBOb3RpZmljYXRpb24gVGVtcGxhdGUgTGFtYmRhXHJcbiAqIFxyXG4gKiBDcmVhdGUgbmV3IG5vdGlmaWNhdGlvbiB0ZW1wbGF0ZSAoYWRtaW4gb25seSkuXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBnZXRVc2VyRnJvbUNvbnRleHQgfSBmcm9tICcuLi8uLi91dGlscy9hdXRoLXV0aWwnO1xyXG5pbXBvcnQgeyBub3RpZmljYXRpb25UZW1wbGF0ZVNlcnZpY2UgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9ub3RpZmljYXRpb24tdGVtcGxhdGUtc2VydmljZSc7XHJcbmltcG9ydCB7IE5vdGlmaWNhdGlvblRlbXBsYXRlIH0gZnJvbSAnLi4vLi4vdHlwZXMvbm90aWZpY2F0aW9uJztcclxuXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XHJcbiAgY29uc29sZS5sb2coJ0NyZWF0ZSB0ZW1wbGF0ZSByZXF1ZXN0JywgeyBwYXRoOiBldmVudC5wYXRoIH0pO1xyXG5cclxuICB0cnkge1xyXG4gICAgLy8gRXh0cmFjdCB1c2VyIGZyb20gcmVxdWVzdCBjb250ZXh0IChwb3B1bGF0ZWQgYnkgTGFtYmRhIEF1dGhvcml6ZXIpXHJcbiAgICBjb25zdCB1c2VyID0gYXdhaXQgZ2V0VXNlckZyb21Db250ZXh0KGV2ZW50KTtcclxuXHJcbiAgICBpZiAoIXVzZXIudXNlcklkKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNDAxLFxyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgZXJyb3I6IHtcclxuICAgICAgICAgICAgY29kZTogJ1VOQVVUSE9SSVpFRCcsXHJcbiAgICAgICAgICAgIG1lc3NhZ2U6ICdVc2VyIGNvbnRleHQgbm90IGZvdW5kJyxcclxuICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0pLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENoZWNrIGFkbWluIHJvbGVcclxuICAgIGlmICh1c2VyLnJvbGUgIT09ICdhZG1pbicpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDMsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBlcnJvcjoge1xyXG4gICAgICAgICAgICBjb2RlOiAnRk9SQklEREVOJyxcclxuICAgICAgICAgICAgbWVzc2FnZTogJ0FkbWluIHJvbGUgcmVxdWlyZWQnLFxyXG4gICAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSksXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gUGFyc2UgcmVxdWVzdCBib2R5XHJcbiAgICBpZiAoIWV2ZW50LmJvZHkpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDAsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBlcnJvcjoge1xyXG4gICAgICAgICAgICBjb2RlOiAnSU5WQUxJRF9SRVFVRVNUJyxcclxuICAgICAgICAgICAgbWVzc2FnZTogJ1JlcXVlc3QgYm9keSBpcyByZXF1aXJlZCcsXHJcbiAgICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCB0ZW1wbGF0ZURhdGEgPSBKU09OLnBhcnNlKGV2ZW50LmJvZHkpIGFzIE9taXQ8Tm90aWZpY2F0aW9uVGVtcGxhdGUsICd0ZW1wbGF0ZUlkJyB8ICdjcmVhdGVkQXQnIHwgJ3VwZGF0ZWRBdCc+O1xyXG5cclxuICAgIC8vIFZhbGlkYXRlIHJlcXVpcmVkIGZpZWxkc1xyXG4gICAgaWYgKCF0ZW1wbGF0ZURhdGEuZXZlbnRUeXBlIHx8ICF0ZW1wbGF0ZURhdGEuY2hhbm5lbCB8fCAhdGVtcGxhdGVEYXRhLmZvcm1hdCB8fCAhdGVtcGxhdGVEYXRhLmJvZHkpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDAsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBlcnJvcjoge1xyXG4gICAgICAgICAgICBjb2RlOiAnSU5WQUxJRF9SRVFVRVNUJyxcclxuICAgICAgICAgICAgbWVzc2FnZTogJ01pc3NpbmcgcmVxdWlyZWQgZmllbGRzOiBldmVudFR5cGUsIGNoYW5uZWwsIGZvcm1hdCwgYm9keScsXHJcbiAgICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDcmVhdGUgdGVtcGxhdGUgKHNlcnZpY2UgaGFuZGxlcyB2YWxpZGF0aW9uKVxyXG4gICAgY29uc3QgY3JlYXRlZFRlbXBsYXRlID0gYXdhaXQgbm90aWZpY2F0aW9uVGVtcGxhdGVTZXJ2aWNlLmNyZWF0ZVRlbXBsYXRlKHRlbXBsYXRlRGF0YSk7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogMjAxLFxyXG4gICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShjcmVhdGVkVGVtcGxhdGUpLFxyXG4gICAgfTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgY3JlYXRpbmcgdGVtcGxhdGUnLCB7IGVycm9yIH0pO1xyXG4gICAgXHJcbiAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdGYWlsZWQgdG8gY3JlYXRlIHRlbXBsYXRlJztcclxuICAgIGNvbnN0IHN0YXR1c0NvZGUgPSBlcnJvck1lc3NhZ2UuaW5jbHVkZXMoJ0ludmFsaWQnKSB8fCBlcnJvck1lc3NhZ2UuaW5jbHVkZXMoJ3N5bnRheCcpID8gNDAwIDogNTAwO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGUsXHJcbiAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgIH0sXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICBlcnJvcjoge1xyXG4gICAgICAgICAgY29kZTogc3RhdHVzQ29kZSA9PT0gNDAwID8gJ0lOVkFMSURfUkVRVUVTVCcgOiAnSU5URVJOQUxfRVJST1InLFxyXG4gICAgICAgICAgbWVzc2FnZTogZXJyb3JNZXNzYWdlLFxyXG4gICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgfSxcclxuICAgICAgfSksXHJcbiAgICB9O1xyXG4gIH1cclxufTtcclxuIl19