"use strict";
/**
 * Get Notification Templates Lambda
 *
 * List all templates with optional filtering by event type or channel.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const auth_util_1 = require("../../utils/auth-util");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client = new client_dynamodb_1.DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const tableName = process.env.NOTIFICATION_TEMPLATES_TABLE || 'NotificationTemplates';
const handler = async (event) => {
    console.log('Get templates request', { path: event.path });
    try {
        // Extract user from request context (populated by Lambda Authorizer)
        const user = (0, auth_util_1.getUserFromContext)(event);
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
        const params = event.queryStringParameters || {};
        const eventType = params.eventType;
        const channel = params.channel;
        let templates;
        // If eventType is provided, use GSI to query
        if (eventType) {
            const keyConditionExpression = channel
                ? 'eventType = :eventType AND channel = :channel'
                : 'eventType = :eventType';
            const expressionAttributeValues = {
                ':eventType': eventType,
            };
            if (channel) {
                expressionAttributeValues[':channel'] = channel;
            }
            const command = new lib_dynamodb_1.QueryCommand({
                TableName: tableName,
                IndexName: 'EventTypeChannelIndex',
                KeyConditionExpression: keyConditionExpression,
                ExpressionAttributeValues: expressionAttributeValues,
            });
            const response = await docClient.send(command);
            templates = (response.Items || []);
        }
        else {
            // Otherwise, scan the table
            const filterExpression = channel ? 'channel = :channel' : undefined;
            const expressionAttributeValues = channel ? { ':channel': channel } : undefined;
            const command = new lib_dynamodb_1.ScanCommand({
                TableName: tableName,
                FilterExpression: filterExpression,
                ExpressionAttributeValues: expressionAttributeValues,
            });
            const response = await docClient.send(command);
            templates = (response.Items || []);
        }
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ templates }),
        };
    }
    catch (error) {
        console.error('Error getting templates', { error });
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to get templates',
                    timestamp: new Date().toISOString(),
                },
            }),
        };
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LXRlbXBsYXRlcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImdldC10ZW1wbGF0ZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7O0dBSUc7OztBQUdILHFEQUEyRDtBQUMzRCw4REFBMEQ7QUFDMUQsd0RBQTBGO0FBRzFGLE1BQU0sTUFBTSxHQUFHLElBQUksZ0NBQWMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXLEVBQUUsQ0FBQyxDQUFDO0FBQ3JGLE1BQU0sU0FBUyxHQUFHLHFDQUFzQixDQUFDLElBQUksQ0FBQyxNQUFhLENBQUMsQ0FBQztBQUM3RCxNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLDRCQUE0QixJQUFJLHVCQUF1QixDQUFDO0FBRS9FLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxLQUEyQixFQUFrQyxFQUFFO0lBQzNGLE9BQU8sQ0FBQyxHQUFHLENBQUMsdUJBQXVCLEVBQUUsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7SUFFM0QsSUFBSSxDQUFDO1FBQ0gscUVBQXFFO1FBQ3JFLE1BQU0sSUFBSSxHQUFHLElBQUEsOEJBQWtCLEVBQUMsS0FBSyxDQUFDLENBQUM7UUFFdkMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNqQixPQUFPO2dCQUNMLFVBQVUsRUFBRSxHQUFHO2dCQUNmLE9BQU8sRUFBRTtvQkFDUCxjQUFjLEVBQUUsa0JBQWtCO29CQUNsQyw2QkFBNkIsRUFBRSxHQUFHO2lCQUNuQztnQkFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztvQkFDbkIsS0FBSyxFQUFFO3dCQUNMLElBQUksRUFBRSxjQUFjO3dCQUNwQixPQUFPLEVBQUUsd0JBQXdCO3dCQUNqQyxTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7cUJBQ3BDO2lCQUNG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bWJkYVxyXG4gKiBcclxuICogTGlzdCBhbGwgdGVtcGxhdGVzIHdpdGggb3B0aW9uYWwgZmlsdGVyaW5nIGJ5IGV2ZW50IHR5cGUgb3IgY2hhbm5lbC5cclxuICovXHJcblxyXG5pbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IGdldFVzZXJGcm9tQ29udGV4dCB9IGZyb20gJy4uLy4uL3V0aWxzL2F1dGgtdXRpbCc7XHJcbmltcG9ydCB7IER5bmFtb0RCQ2xpZW50IH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWR5bmFtb2RiJztcclxuaW1wb3J0IHsgRHluYW1vREJEb2N1bWVudENsaWVudCwgU2NhbkNvbW1hbmQsIFF1ZXJ5Q29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2xpYi1keW5hbW9kYic7XHJcbmltcG9ydCB7IE5vdGlmaWNhdGlvblRlbXBsYXRlIH0gZnJvbSAnLi4vLi4vdHlwZXMvbm90aWZpY2F0aW9uJztcclxuXHJcbmNvbnN0IGNsaWVudCA9IG5ldyBEeW5hbW9EQkNsaWVudCh7IHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJyB9KTtcclxuY29uc3QgZG9jQ2xpZW50ID0gRHluYW1vREJEb2N1bWVudENsaWVudC5mcm9tKGNsaWVudCBhcyBhbnkpO1xyXG5jb25zdCB0YWJsZU5hbWUgPSBwcm9jZXNzLmVudi5OT1RJRklDQVRJT05fVEVNUExBVEVTX1RBQkxFIHx8ICdOb3RpZmljYXRpb25UZW1wbGF0ZXMnO1xyXG5cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcclxuICBjb25zb2xlLmxvZygnR2V0IHRlbXBsYXRlcyByZXF1ZXN0JywgeyBwYXRoOiBldmVudC5wYXRoIH0pO1xyXG5cclxuICB0cnkge1xyXG4gICAgLy8gRXh0cmFjdCB1c2VyIGZyb20gcmVxdWVzdCBjb250ZXh0IChwb3B1bGF0ZWQgYnkgTGFtYmRhIEF1dGhvcml6ZXIpXHJcbiAgICBjb25zdCB1c2VyID0gZ2V0VXNlckZyb21Db250ZXh0KGV2ZW50KTtcclxuXHJcbiAgICBpZiAoIXVzZXIudXNlcklkKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNDAxLFxyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgZXJyb3I6IHtcclxuICAgICAgICAgICAgY29kZTogJ1VOQVVUSE9SSVpFRCcsXHJcbiAgICAgICAgICAgIG1lc3NhZ2U6ICdVc2VyIGNvbnRleHQgbm90IGZvdW5kJyxcclxuICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0pLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHBhcmFtcyA9IGV2ZW50LnF1ZXJ5U3RyaW5nUGFyYW1ldGVycyB8fCB7fTtcclxuICAgIGNvbnN0IGV2ZW50VHlwZSA9IHBhcmFtcy5ldmVudFR5cGU7XHJcbiAgICBjb25zdCBjaGFubmVsID0gcGFyYW1zLmNoYW5uZWw7XHJcblxyXG4gICAgbGV0IHRlbXBsYXRlczogTm90aWZpY2F0aW9uVGVtcGxhdGVbXTtcclxuXHJcbiAgICAvLyBJZiBldmVudFR5cGUgaXMgcHJvdmlkZWQsIHVzZSBHU0kgdG8gcXVlcnlcclxuICAgIGlmIChldmVudFR5cGUpIHtcclxuICAgICAgY29uc3Qga2V5Q29uZGl0aW9uRXhwcmVzc2lvbiA9IGNoYW5uZWxcclxuICAgICAgICA/ICdldmVudFR5cGUgPSA6ZXZlbnRUeXBlIEFORCBjaGFubmVsID0gOmNoYW5uZWwnXHJcbiAgICAgICAgOiAnZXZlbnRUeXBlID0gOmV2ZW50VHlwZSc7XHJcblxyXG4gICAgICBjb25zdCBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiBSZWNvcmQ8c3RyaW5nLCBhbnk+ID0ge1xyXG4gICAgICAgICc6ZXZlbnRUeXBlJzogZXZlbnRUeXBlLFxyXG4gICAgICB9O1xyXG5cclxuICAgICAgaWYgKGNoYW5uZWwpIHtcclxuICAgICAgICBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzWyc6Y2hhbm5lbCddID0gY2hhbm5lbDtcclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBRdWVyeUNvbW1hbmQoe1xyXG4gICAgICAgIFRhYmxlTmFtZTogdGFibGVOYW1lLFxyXG4gICAgICAgIEluZGV4TmFtZTogJ0V2ZW50VHlwZUNoYW5uZWxJbmRleCcsXHJcbiAgICAgICAgS2V5Q29uZGl0aW9uRXhwcmVzc2lvbjoga2V5Q29uZGl0aW9uRXhwcmVzc2lvbixcclxuICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZG9jQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcbiAgICAgIHRlbXBsYXRlcyA9IChyZXNwb25zZS5JdGVtcyB8fCBbXSkgYXMgTm90aWZpY2F0aW9uVGVtcGxhdGVbXTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIC8vIE90aGVyd2lzZSwgc2NhbiB0aGUgdGFibGVcclxuICAgICAgY29uc3QgZmlsdGVyRXhwcmVzc2lvbiA9IGNoYW5uZWwgPyAnY2hhbm5lbCA9IDpjaGFubmVsJyA6IHVuZGVmaW5lZDtcclxuICAgICAgY29uc3QgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlcyA9IGNoYW5uZWwgPyB7ICc6Y2hhbm5lbCc6IGNoYW5uZWwgfSA6IHVuZGVmaW5lZDtcclxuXHJcbiAgICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgU2NhbkNvbW1hbmQoe1xyXG4gICAgICAgIFRhYmxlTmFtZTogdGFibGVOYW1lLFxyXG4gICAgICAgIEZpbHRlckV4cHJlc3Npb246IGZpbHRlckV4cHJlc3Npb24sXHJcbiAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczogZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlcyxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGRvY0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG4gICAgICB0ZW1wbGF0ZXMgPSAocmVzcG9uc2UuSXRlbXMgfHwgW10pIGFzIE5vdGlmaWNhdGlvblRlbXBsYXRlW107XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IHRlbXBsYXRlcyB9KSxcclxuICAgIH07XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGdldHRpbmcgdGVtcGxhdGVzJywgeyBlcnJvciB9KTtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDUwMCxcclxuICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgICBjb2RlOiAnSU5URVJOQUxfRVJST1InLFxyXG4gICAgICAgICAgbWVzc2FnZTogJ0ZhaWxlZCB0byBnZXQgdGVtcGxhdGVzJyxcclxuICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0pLFxyXG4gICAgfTtcclxuICB9XHJcbn07XHJcbiJdfQ==