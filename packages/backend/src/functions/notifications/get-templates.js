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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LXRlbXBsYXRlcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImdldC10ZW1wbGF0ZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7O0dBSUc7OztBQUdILHFEQUEyRDtBQUMzRCw4REFBMEQ7QUFDMUQsd0RBQTBGO0FBRzFGLE1BQU0sTUFBTSxHQUFHLElBQUksZ0NBQWMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXLEVBQUUsQ0FBQyxDQUFDO0FBQ3JGLE1BQU0sU0FBUyxHQUFHLHFDQUFzQixDQUFDLElBQUksQ0FBQyxNQUFhLENBQUMsQ0FBQztBQUM3RCxNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLDRCQUE0QixJQUFJLHVCQUF1QixDQUFDO0FBRS9FLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxLQUEyQixFQUFrQyxFQUFFO0lBQzNGLE9BQU8sQ0FBQyxHQUFHLENBQUMsdUJBQXVCLEVBQUUsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7SUFFM0QsSUFBSSxDQUFDO1FBQ0gscUVBQXFFO1FBQ3JFLE1BQU0sSUFBSSxHQUFHLE1BQU0sSUFBQSw4QkFBa0IsRUFBQyxLQUFLLENBQUMsQ0FBQztRQUU3QyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2pCLE9BQU87Z0JBQ0wsVUFBVSxFQUFFLEdBQUc7Z0JBQ2YsT0FBTyxFQUFFO29CQUNQLGNBQWMsRUFBRSxrQkFBa0I7b0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7aUJBQ25DO2dCQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO29CQUNuQixLQUFLLEVBQUU7d0JBQ0wsSUFBSSxFQUFFLGNBQWM7d0JBQ3BCLE9BQU8sRUFBRSx3QkFBd0I7d0JBQ2pDLFNBQVMsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTtxQkFDcEM7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ZXMgTGFtYmRhXHJcbiAqIFxyXG4gKiBMaXN0IGFsbCB0ZW1wbGF0ZXMgd2l0aCBvcHRpb25hbCBmaWx0ZXJpbmcgYnkgZXZlbnQgdHlwZSBvciBjaGFubmVsLlxyXG4gKi9cclxuXHJcbmltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgZ2V0VXNlckZyb21Db250ZXh0IH0gZnJvbSAnLi4vLi4vdXRpbHMvYXV0aC11dGlsJztcclxuaW1wb3J0IHsgRHluYW1vREJDbGllbnQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtZHluYW1vZGInO1xyXG5pbXBvcnQgeyBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LCBTY2FuQ29tbWFuZCwgUXVlcnlDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvbGliLWR5bmFtb2RiJztcclxuaW1wb3J0IHsgTm90aWZpY2F0aW9uVGVtcGxhdGUgfSBmcm9tICcuLi8uLi90eXBlcy9ub3RpZmljYXRpb24nO1xyXG5cclxuY29uc3QgY2xpZW50ID0gbmV3IER5bmFtb0RCQ2xpZW50KHsgcmVnaW9uOiBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIHx8ICd1cy1lYXN0LTEnIH0pO1xyXG5jb25zdCBkb2NDbGllbnQgPSBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LmZyb20oY2xpZW50IGFzIGFueSk7XHJcbmNvbnN0IHRhYmxlTmFtZSA9IHByb2Nlc3MuZW52Lk5PVElGSUNBVElPTl9URU1QTEFURVNfVEFCTEUgfHwgJ05vdGlmaWNhdGlvblRlbXBsYXRlcyc7XHJcblxyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xyXG4gIGNvbnNvbGUubG9nKCdHZXQgdGVtcGxhdGVzIHJlcXVlc3QnLCB7IHBhdGg6IGV2ZW50LnBhdGggfSk7XHJcblxyXG4gIHRyeSB7XHJcbiAgICAvLyBFeHRyYWN0IHVzZXIgZnJvbSByZXF1ZXN0IGNvbnRleHQgKHBvcHVsYXRlZCBieSBMYW1iZGEgQXV0aG9yaXplcilcclxuICAgIGNvbnN0IHVzZXIgPSBhd2FpdCBnZXRVc2VyRnJvbUNvbnRleHQoZXZlbnQpO1xyXG5cclxuICAgIGlmICghdXNlci51c2VySWQpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDEsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBlcnJvcjoge1xyXG4gICAgICAgICAgICBjb2RlOiAnVU5BVVRIT1JJWkVEJyxcclxuICAgICAgICAgICAgbWVzc2FnZTogJ1VzZXIgY29udGV4dCBub3QgZm91bmQnLFxyXG4gICAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSksXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgcGFyYW1zID0gZXZlbnQucXVlcnlTdHJpbmdQYXJhbWV0ZXJzIHx8IHt9O1xyXG4gICAgY29uc3QgZXZlbnRUeXBlID0gcGFyYW1zLmV2ZW50VHlwZTtcclxuICAgIGNvbnN0IGNoYW5uZWwgPSBwYXJhbXMuY2hhbm5lbDtcclxuXHJcbiAgICBsZXQgdGVtcGxhdGVzOiBOb3RpZmljYXRpb25UZW1wbGF0ZVtdO1xyXG5cclxuICAgIC8vIElmIGV2ZW50VHlwZSBpcyBwcm92aWRlZCwgdXNlIEdTSSB0byBxdWVyeVxyXG4gICAgaWYgKGV2ZW50VHlwZSkge1xyXG4gICAgICBjb25zdCBrZXlDb25kaXRpb25FeHByZXNzaW9uID0gY2hhbm5lbFxyXG4gICAgICAgID8gJ2V2ZW50VHlwZSA9IDpldmVudFR5cGUgQU5EIGNoYW5uZWwgPSA6Y2hhbm5lbCdcclxuICAgICAgICA6ICdldmVudFR5cGUgPSA6ZXZlbnRUeXBlJztcclxuXHJcbiAgICAgIGNvbnN0IGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IFJlY29yZDxzdHJpbmcsIGFueT4gPSB7XHJcbiAgICAgICAgJzpldmVudFR5cGUnOiBldmVudFR5cGUsXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBpZiAoY2hhbm5lbCkge1xyXG4gICAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNbJzpjaGFubmVsJ10gPSBjaGFubmVsO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zdCBjb21tYW5kID0gbmV3IFF1ZXJ5Q29tbWFuZCh7XHJcbiAgICAgICAgVGFibGVOYW1lOiB0YWJsZU5hbWUsXHJcbiAgICAgICAgSW5kZXhOYW1lOiAnRXZlbnRUeXBlQ2hhbm5lbEluZGV4JyxcclxuICAgICAgICBLZXlDb25kaXRpb25FeHByZXNzaW9uOiBrZXlDb25kaXRpb25FeHByZXNzaW9uLFxyXG4gICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXMsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBkb2NDbGllbnQuc2VuZChjb21tYW5kKTtcclxuICAgICAgdGVtcGxhdGVzID0gKHJlc3BvbnNlLkl0ZW1zIHx8IFtdKSBhcyBOb3RpZmljYXRpb25UZW1wbGF0ZVtdO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgLy8gT3RoZXJ3aXNlLCBzY2FuIHRoZSB0YWJsZVxyXG4gICAgICBjb25zdCBmaWx0ZXJFeHByZXNzaW9uID0gY2hhbm5lbCA/ICdjaGFubmVsID0gOmNoYW5uZWwnIDogdW5kZWZpbmVkO1xyXG4gICAgICBjb25zdCBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzID0gY2hhbm5lbCA/IHsgJzpjaGFubmVsJzogY2hhbm5lbCB9IDogdW5kZWZpbmVkO1xyXG5cclxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBTY2FuQ29tbWFuZCh7XHJcbiAgICAgICAgVGFibGVOYW1lOiB0YWJsZU5hbWUsXHJcbiAgICAgICAgRmlsdGVyRXhwcmVzc2lvbjogZmlsdGVyRXhwcmVzc2lvbixcclxuICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZG9jQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcbiAgICAgIHRlbXBsYXRlcyA9IChyZXNwb25zZS5JdGVtcyB8fCBbXSkgYXMgTm90aWZpY2F0aW9uVGVtcGxhdGVbXTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgIH0sXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgdGVtcGxhdGVzIH0pLFxyXG4gICAgfTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgZ2V0dGluZyB0ZW1wbGF0ZXMnLCB7IGVycm9yIH0pO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogNTAwLFxyXG4gICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgZXJyb3I6IHtcclxuICAgICAgICAgIGNvZGU6ICdJTlRFUk5BTF9FUlJPUicsXHJcbiAgICAgICAgICBtZXNzYWdlOiAnRmFpbGVkIHRvIGdldCB0ZW1wbGF0ZXMnLFxyXG4gICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgfSxcclxuICAgICAgfSksXHJcbiAgICB9O1xyXG4gIH1cclxufTtcclxuIl19